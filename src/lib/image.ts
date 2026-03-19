export const MAX_BASE64_LENGTH = 3.5 * 1024 * 1024;
export const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;

export function compressImage(dataUrl: string): Promise<string> {
  if (dataUrl.length <= MAX_BASE64_LENGTH) return Promise.resolve(dataUrl);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w > h) { h = Math.round(h * MAX_DIMENSION / w); w = MAX_DIMENSION; }
        else        { w = Math.round(w * MAX_DIMENSION / h); h = MAX_DIMENSION; }
      }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let q = JPEG_QUALITY, result = c.toDataURL('image/jpeg', q);
      while (result.length > MAX_BASE64_LENGTH && q > 0.3) { q -= 0.1; result = c.toDataURL('image/jpeg', q); }
      resolve(result);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function urlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d'); if (!ctx) { reject(new Error('canvas failed')); return; }
      ctx.drawImage(img, 0, 0); resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('load failed')); img.src = url;
  });
}
