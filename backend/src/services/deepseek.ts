// backend/src/services/deepseek.ts
import axios from 'axios';
import sharp from 'sharp';
import FormData from 'form-data';
import fileType from 'file-type';
import Tesseract from 'tesseract.js';
import config from '../utils/config';
import { getOcrWorker } from '../utils/ocrWorker';

// ✅ load SQLite to read user dictionary
import db from '../models/db';

// ------------------------- ENV -------------------------
const BASE_URL = config.deepseek.baseUrl;
const API_KEY = config.deepseek.apiKey;
const TEXT_MODEL = config.deepseek.textModel;

const CLOUDINARY_CLOUD = config.cloudinary.cloudName;
const CLOUDINARY_PRESET = config.cloudinary.preset;

// ------------------------- Types -------------------------

export type ExtractPayload = {
  text?: string; // optional user text
  imageBase64?: string; // optional base64 (with/without data URL prefix)
  imageUrl?: string; // optional http/https url
  user_id?: string; // optional user id for personalization
};

export type ExtractResult = {
  FOOD_ITEM: string[];
  DRINK_ITEM: string[];
  raw: string; // model raw output (for debugging)
  ocr?: string; // OCR text (for visibility)
  image_url?: string; // uploaded Cloudinary URL if available
};

// ------------------------- User Dictionary (Personalization) -------------------------

type DictRow = {
  phrase: string;
  canonical_food_id: string | null;
  canonical_food_name: string | null;
};

/** Escape regex meta characters */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Load global mappings from SQLite (shared by all users) */
function loadGlobalDict(): DictRow[] {
  return db
    .prepare<unknown[], DictRow>(
      `SELECT phrase, canonical_food_id, canonical_food_name FROM user_dict`
    )
    .all();
}


/** Build system prompt with mappings at highest priority */
function buildSystemPromptWithDict(dict: DictRow[]) {
  const lines = dict.map(e => {
    const to = e.canonical_food_name || e.canonical_food_id || 'UNKNOWN';
    return `- "${e.phrase}" => "${to}"`;
  });

  return [
    'You are a food & drink extraction assistant for Malaysian context.',
    'When interpreting colloquial inputs, APPLY user-defined mappings with the highest priority:',
    ...lines,
    '',
    'Then continue normal extraction/classification.',
    'Output JSON only: { "FOOD_ITEM": [...], "DRINK_ITEM": [...] }',
    'Use lowercase names and deduplicate.',
  ].join('\n');
}

/** Fallback system prompt (no user dictionary available) */
function buildFallbackSystemPrompt() {
  return [
    'You are a food & drink extraction assistant. Output JSON only:',
    '{ "FOOD_ITEM": [...], "DRINK_ITEM": [...] }',
    'No extra text. Use lowercase names and deduplicate.',
  ].join('\n');
}

/** Expand user text by dict BEFORE sending to the model */
function expandTextByDict(text: string | undefined, dict: DictRow[]) {
  if (!text || dict.length === 0) return text || '';
  let t = text;
  for (const e of dict) {
    if (!e.phrase) continue;
    const target = e.canonical_food_name || e.canonical_food_id;
    if (!target) continue;
    const re = new RegExp(`\\b${escapeRegExp(e.phrase)}\\b`, 'ig');
    t = t.replace(re, target);
  }
  return t;
}

// ------------------------- Helpers -------------------------

function stripDataUrl(b64: string) {
  return b64.replace(/^data:[^;]+;base64,/, '');
}

async function httpGetBuffer(url: string): Promise<Buffer> {
  const resp = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 30_000,
  });
  return Buffer.from(resp.data);
}

/**
 * Prepare image for OCR:
 * - accept any common format, auto-rotate
 * - grayscale + normalize
 * - resize to ~1600 max side if too small (or keep size if already large)
 * - output PNG (lossless) for better OCR quality
 */
async function toOcrPngBuffer(input: {
  imageBase64?: string;
  imageUrl?: string;
}): Promise<Buffer> {
  let buf: Buffer;

  if (input.imageBase64) {
    buf = Buffer.from(stripDataUrl(input.imageBase64), 'base64');
  } else if (input.imageUrl) {
    buf = await httpGetBuffer(input.imageUrl);
  } else {
    throw new Error('No image provided');
  }

  
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  if (buf.length > MAX_SIZE_BYTES) {
    throw new Error(
      `Image too large (${(buf.length / 1024 / 1024).toFixed(1)} MB). Limit is 5 MB.`
    );
  }

  const ft = await fileType.fromBuffer(buf);
  if (!ft || !ft.mime.startsWith('image/')) {
    throw new Error('Provided data is not an image');
  }

  const img = sharp(buf, { animated: false }).rotate().grayscale().normalise();
  const meta = await img.metadata();
  const w = meta.width || 0,
    h = meta.height || 0;

  const resized =
    Math.max(w, h) > 1600
      ? img.resize({
          width: w >= h ? 1600 : undefined,
          height: h > w ? 1600 : undefined,
          fit: 'inside',
        })
      : img;

  return await resized.png({ compressionLevel: 9 }).toBuffer();
}

/** Optional: upload processed PNG to Cloudinary for an https URL (useful for debugging) */
async function maybeUploadToCloudinary(
  png: Buffer
): Promise<string | undefined> {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) return undefined;
  const form = new FormData();
  form.append('file', `data:image/png;base64,${png.toString('base64')}`);
  form.append('upload_preset', CLOUDINARY_PRESET);
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;
  const resp = await axios.post(url, form, {
    headers: form.getHeaders(),
    timeout: 30_000,
  });
  return resp.data?.secure_url as string | undefined;
}

/** OCR to text with tesseract.js (default: English). For Chinese add 'eng+chi_sim'. */
async function ocrImageToText(png: Buffer): Promise<string> {
  const worker = await getOcrWorker('eng'); 
  const { data } = await worker.recognize(png);
  return (data?.text || '').trim();
}

async function callChat(payload: any) {
  const url = `${BASE_URL}/chat/completions`;
  return axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 60_000,
  });
}

/** Extract JSON safely even if model wraps it in prose or code fences */
function safeParseJSON(s: string): ExtractResult {
  const match = s.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : s;
  let obj: any;
  try {
    obj = JSON.parse(jsonStr);
  } catch {
    obj = { FOOD_ITEM: [], DRINK_ITEM: [] };
  }
  obj.FOOD_ITEM = Array.from(
    new Set(
      (obj.FOOD_ITEM || []).map((x: string) => String(x).toLowerCase().trim())
    )
  );
  obj.DRINK_ITEM = Array.from(
    new Set(
      (obj.DRINK_ITEM || []).map((x: string) => String(x).toLowerCase().trim())
    )
  );
  return { ...obj, raw: s };
}

// ------------------------- Public API (Personalized) -------------------------

/**
 * Personalized extractor:
 * - loads user dictionary from SQLite
 * - expands user text (and OCR text) with mappings first
 * - injects mappings into system prompt (highest priority)
 * - falls back to generic prompt if no dict
 */
export async function extractWithDeepSeek(
  input: ExtractPayload
): Promise<ExtractResult> {
  const { text, imageBase64, imageUrl} = input;

  // Load dict and build prompts
  const dict = loadGlobalDict();
  const systemPrompt =
    dict.length > 0
      ? buildSystemPromptWithDict(dict)
      : buildFallbackSystemPrompt();

  // Expand user text by dict first (improves recall)
  const expandedUserText = expandTextByDict(text, dict);

  // Text-only path
  if (!imageBase64 && !imageUrl) {
    const resp = await callChat({
      model: TEXT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: expandedUserText || '' },
      ],
    });
    const content = resp.data?.choices?.[0]?.message?.content || '';
    return safeParseJSON(content);
  }

  // Image path: OCR then merge, and expand merged text by dict
  const png = await toOcrPngBuffer({ imageBase64, imageUrl });
  const publicUrl = await maybeUploadToCloudinary(png); // optional
  const ocrText = await ocrImageToText(png);

  const mergedTextRaw = [
    expandedUserText?.trim(),
    ocrText ? `OCR text:\n${ocrText}` : undefined,
    'Please extract FOOD_ITEM and DRINK_ITEM from the text above and output JSON only.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const mergedText = expandTextByDict(mergedTextRaw, dict);

  const resp = await callChat({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: mergedText },
    ],
  });

  const content = resp.data?.choices?.[0]?.message?.content || '';
  const parsed = safeParseJSON(content);
  return { ...parsed, ocr: ocrText, image_url: publicUrl };
}
