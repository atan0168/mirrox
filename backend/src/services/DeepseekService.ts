import axios from 'axios';
import sharp from 'sharp';
import FormData from 'form-data';
import fileType from 'file-type';
import { getOcrWorker } from '../utils/ocrWorker';
import { stripDataUrl, httpGetBuffer } from '../utils/binary';
import config from '../utils/config';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export type ExtractPayload = {
  text?: string; // optional user text
  imageBase64?: string; // optional base64 (with/without data URL prefix)
  imageUrl?: string; // optional http/https url
  user_id?: string; // optional user id for personalization
};

export type ExtractedItem = {
  name: string;
  portion?: string | null;
  modifiers?: string[];
};

export type ExtractResult = {
  FOOD_ITEM: ExtractedItem[];
  DRINK_ITEM: ExtractedItem[];
  raw: string; // model raw output (for debugging)
  ocr?: string; // OCR text (for visibility)
  image_url?: string; // uploaded Cloudinary URL if available
};

/** System prompt */
function buildSystemPrompt() {
  return [
    'You are a food & drink extraction assistant.',
    'Return JSON ONLY with the keys "FOOD_ITEM" and "DRINK_ITEM".',
    'Each value must be an array of objects like: { "name": "item name", "portion": "text or null", "modifiers": [] }.',
    'Rules:',
    '- use lowercase names and trim whitespace;',
    '- if portion is not mentioned, set it to null;',
    '- if no modifiers are present, use an empty array;',
    '- deduplicate by name, merging modifiers when needed;',
    '- do not add any extra commentary.',
  ].join('\n');
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
  if (!config.cloudinary.cloudName || !config.cloudinary.preset)
    return undefined;
  const form = new FormData();
  form.append('file', `data:image/png;base64,${png.toString('base64')}`);
  form.append('upload_preset', config.cloudinary.preset);
  const url = `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`;
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

async function callChat(payload: {
  model: string;
  messages: Array<{ role: string; content: string }>;
}) {
  const url = `${config.deepseek.baseUrl}/chat/completions`;
  return axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${config.deepseek.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 60_000,
  });
}

/** Extract JSON safely even if model wraps it in prose or code fences */
function normalizeExtractedList(input: unknown): ExtractedItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const deduped = new Map<string, ExtractedItem>();

  for (const entry of input) {
    let name: string | null = null;
    let portion: string | null = null;
    let modifiers: string[] = [];

    if (typeof entry === 'string') {
      name = entry;
    } else if (entry && typeof entry === 'object') {
      const rawName = (entry as Record<string, unknown>).name;
      if (typeof rawName === 'string') {
        name = rawName;
      }
      const rawPortion = (entry as Record<string, unknown>).portion;
      if (typeof rawPortion === 'string') {
        const trimmed = rawPortion.trim();
        portion = trimmed.length > 0 ? trimmed : null;
      }
      const rawModifiers = (entry as Record<string, unknown>).modifiers;
      if (Array.isArray(rawModifiers)) {
        modifiers = rawModifiers
          .filter((value): value is string => typeof value === 'string')
          .map(value => value.trim())
          .filter(Boolean);
      }
    }

    if (!name) {
      continue;
    }

    const normalizedName = name.toLowerCase().trim();
    if (!normalizedName) continue;

    const existing = deduped.get(normalizedName);
    if (existing) {
      if (!existing.portion && portion) {
        existing.portion = portion;
      }
      if (modifiers.length) {
        const merged = new Set([...(existing.modifiers ?? []), ...modifiers]);
        existing.modifiers = Array.from(merged);
      }
      continue;
    }

    deduped.set(normalizedName, {
      name: normalizedName,
      portion,
      modifiers: modifiers.length ? Array.from(new Set(modifiers)) : [],
    });
  }

  return Array.from(deduped.values());
}

function safeParseJSON(s: string): ExtractResult {
  const match = s.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : s;
  let obj: unknown;
  try {
    obj = JSON.parse(jsonStr);
  } catch {
    obj = { FOOD_ITEM: [], DRINK_ITEM: [] };
  }

  const asRecord =
    obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : {};

  const foodItems = normalizeExtractedList(asRecord.FOOD_ITEM);
  const drinkItems = normalizeExtractedList(asRecord.DRINK_ITEM);

  return {
    FOOD_ITEM: foodItems,
    DRINK_ITEM: drinkItems,
    raw: s,
  };
}

/**
 * Food Item extractor:
 * - expands user text (and OCR text) with mappings first
 * - injects mappings into system prompt
 */
export async function extractWithDeepSeek(
  input: ExtractPayload
): Promise<ExtractResult> {
  const { text, imageBase64, imageUrl } = input;

  const systemPrompt = buildSystemPrompt();

  if (!imageBase64 && !imageUrl) {
    const resp = await callChat({
      model: config.deepseek.textModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text || '' },
      ],
    });
    const content = resp.data?.choices?.[0]?.message?.content || '';

    console.log('[Deepseek] content: ', content);
    return safeParseJSON(content);
  }

  // Image path: OCR then merge
  const png = await toOcrPngBuffer({
    ...(imageBase64 && { imageBase64 }),
    ...(imageUrl && { imageUrl }),
  });
  const publicUrl = await maybeUploadToCloudinary(png);
  const ocrText = await ocrImageToText(png);

  const mergedText = [
    text?.trim(),
    ocrText ? `OCR text:\n${ocrText}` : undefined,
    'Please extract FOOD_ITEM and DRINK_ITEM from the text above and output JSON only.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const resp = await callChat({
    model: config.deepseek.textModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: mergedText },
    ],
  });

  const content = resp.data?.choices?.[0]?.message?.content || '';
  const parsed = safeParseJSON(content);
  return {
    ...parsed,
    ocr: ocrText,
    ...(publicUrl && { image_url: publicUrl }),
  };
}
