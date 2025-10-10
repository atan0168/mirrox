import axios from 'axios';

export function stripDataUrl(b64: string) {
  return b64.replace(/^data:[^;]+;base64,/, '');
}

export async function httpGetBuffer(url: string): Promise<Buffer> {
  const resp = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 30_000,
  });
  return Buffer.from(resp.data);
}
