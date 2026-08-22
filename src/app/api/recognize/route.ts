import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { NextResponse } from 'next/server';

import { detectSupportedImageMimeType } from '@/lib/image-validation';
import { parseRecognitionResult } from '@/lib/recognition';

const PRIMARY_MODEL = 'gemini-3.7-flash';
const FALLBACK_MODEL = 'gemini-3.6-flash';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const maxDuration = 60;

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  if (!ai) ai = new GoogleGenAI({ apiKey });
  return ai;
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const record = error as Record<string, unknown>;
  const nested = record.error && typeof record.error === 'object'
    ? record.error as Record<string, unknown>
    : null;
  const message = [record.message, nested?.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return record.status === 429
    || record.code === 429
    || nested?.status === 'RESOURCE_EXHAUSTED'
    || nested?.code === 429
    || message.includes('429')
    || message.includes('quota')
    || message.includes('rate limit');
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.toLowerCase() : '';
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : '';

  return name === 'aborterror'
    || name.includes('timeout')
    || message.includes('timed out')
    || message.includes('timeout');
}

function isUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const nested = record.error && typeof record.error === 'object'
    ? record.error as Record<string, unknown>
    : null;
  const message = [record.message, nested?.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return record.status === 503
    || record.code === 503
    || nested?.status === 'UNAVAILABLE'
    || nested?.code === 503
    || message.includes('high demand')
    || message.includes('unavailable');
}

async function generateRecognition(
  model: string,
  timeout: number,
  base64Image: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
) {
  return getAI().models.generateContent({
    model,
    contents: [{
      role: 'user',
      parts: [
        {
          text: `Identify the public professional actor whose face is most prominent in this TV, movie, or streaming-service image.

Return real actor names, never character names. Use visible facial evidence and scene context, but do not invent an identity.

- If one actor is a strong match, return status "identified" and one candidate.
- If two or three actors are genuinely plausible, return status "ambiguous" and those candidates in confidence order.
- If the face is unclear, the person is not a recognizable public actor, or identification would be a guess, return status "unknown" and no candidates.
- Return the production title in sceneTitle only when recognizable; otherwise use an empty string.`,
        },
        {
          inlineData: {
            data: base64Image,
            mimeType,
          },
        },
      ],
    }],
    config: {
      httpOptions: { timeout, retryOptions: { attempts: 1 } },
      maxOutputTokens: 256,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          status: { type: 'string', enum: ['identified', 'ambiguous', 'unknown'] },
          candidates: {
            type: 'array',
            minItems: 0,
            maxItems: 3,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: { name: { type: 'string' } },
              required: ['name'],
            },
          },
          sceneTitle: { type: 'string' },
        },
        required: ['status', 'candidates', 'sceneTitle'],
      },
    },
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: 'A non-empty image is required' }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be smaller than 5 MB' }, { status: 413 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const mimeType = detectSupportedImageMimeType(buffer);

    if (!mimeType) {
      return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are supported' }, { status: 415 });
    }

    const base64Image = buffer.toString('base64');
    let model = PRIMARY_MODEL;
    let response;

    try {
      response = await generateRecognition(PRIMARY_MODEL, 29_000, base64Image, mimeType);
    } catch (error: unknown) {
      if (!isUnavailableError(error) && !isTimeoutError(error)) throw error;
      console.warn(`${PRIMARY_MODEL} unavailable; trying ${FALLBACK_MODEL}`);
      model = FALLBACK_MODEL;
      response = await generateRecognition(FALLBACK_MODEL, 20_000, base64Image, mimeType);
    }

    const recognition = parseRecognitionResult(response.text ?? '');

    return NextResponse.json({
      success: true,
      recognition,
      model,
    });
  } catch (error: unknown) {
    console.error('Actor recognition failed', error);

    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: 'Recognition is temporarily busy. Please wait a moment and try again.' },
        { status: 429 },
      );
    }

    if (isTimeoutError(error)) {
      return NextResponse.json(
        { error: 'Recognition took too long. Please try again.' },
        { status: 504 },
      );
    }

    if (isUnavailableError(error)) {
      return NextResponse.json(
        { error: 'Recognition is temporarily unavailable. Please try again shortly.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: 'Recognition failed. Please try another image.' },
      { status: 500 },
    );
  }
}
