export type SupportedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectSupportedImageMimeType(bytes: Uint8Array): SupportedImageMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }

  const isRiff = startsWith(bytes, [0x52, 0x49, 0x46, 0x46]);
  const hasWebpMarker = bytes.length >= 12
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50;

  return isRiff && hasWebpMarker ? 'image/webp' : null;
}
