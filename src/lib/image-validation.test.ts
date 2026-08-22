import { describe, expect, it } from 'vitest';

import { detectSupportedImageMimeType } from './image-validation';

describe('detectSupportedImageMimeType', () => {
  it('detects JPEG bytes instead of trusting the upload header', () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectSupportedImageMimeType(bytes)).toBe('image/jpeg');
  });

  it('detects PNG and WebP signatures', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const webp = new TextEncoder().encode('RIFF0000WEBP');

    expect(detectSupportedImageMimeType(png)).toBe('image/png');
    expect(detectSupportedImageMimeType(webp)).toBe('image/webp');
  });

  it('rejects files without a supported image signature', () => {
    expect(detectSupportedImageMimeType(new TextEncoder().encode('not an image'))).toBeNull();
  });
});
