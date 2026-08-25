const MAX_EDGE = 960;
const QUALITY = 0.68;

export async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  return {
    id: crypto.randomUUID(),
    name: file.name || "house.jpg",
    dataUrl,
    width,
    height,
  };
}

export function isImageFile(file) {
  return file && file.type.startsWith("image/");
}
