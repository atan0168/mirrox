// backend/src/utils/ocrWorker.ts
import { createWorker, Worker } from 'tesseract.js';

let worker: Worker | null = null;
let initializing = false;


export async function getOcrWorker(lang: string = 'eng'): Promise<Worker> {
  if (worker) return worker;

  if (!initializing) {
    initializing = true;
    worker = await createWorker(lang);
    initializing = false;
  }

  return worker!;
}
