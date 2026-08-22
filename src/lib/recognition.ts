export type RecognitionStatus = 'identified' | 'ambiguous' | 'unknown';

export interface RecognitionCandidate {
  name: string;
}

export interface RecognitionResult {
  status: RecognitionStatus;
  candidates: RecognitionCandidate[];
  sceneTitle: string | null;
}

interface PersonSearchResult {
  name: string;
}

const unknownResult = (): RecognitionResult => ({
  status: 'unknown',
  candidates: [],
  sceneTitle: null,
});

export function parseRecognitionResult(raw: string): RecognitionResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return unknownResult();
  }

  if (!parsed || typeof parsed !== 'object') return unknownResult();

  const record = parsed as Record<string, unknown>;
  const sceneTitle = typeof record.sceneTitle === 'string' && record.sceneTitle.trim()
    ? record.sceneTitle.trim()
    : null;

  if (record.status !== 'identified' && record.status !== 'ambiguous' && record.status !== 'unknown') {
    return unknownResult();
  }

  if (record.status === 'unknown') {
    return { status: 'unknown', candidates: [], sceneTitle };
  }

  if (!Array.isArray(record.candidates)) return unknownResult();

  const seen = new Set<string>();
  const candidates: RecognitionCandidate[] = [];

  for (const candidate of record.candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const name = (candidate as Record<string, unknown>).name;
    if (typeof name !== 'string' || !name.trim()) continue;

    const trimmedName = name.trim();
    const normalizedName = normalizePersonName(trimmedName);
    if (!normalizedName || seen.has(normalizedName)) continue;

    seen.add(normalizedName);
    candidates.push({ name: trimmedName });
    if (candidates.length === 3) break;
  }

  if (candidates.length === 0) {
    return { status: 'unknown', candidates: [], sceneTitle };
  }

  const hasConsistentCandidateCount = record.status === 'identified'
    ? candidates.length === 1
    : candidates.length >= 2;

  return hasConsistentCandidateCount
    ? { status: record.status, candidates, sceneTitle }
    : { status: 'unknown', candidates: [], sceneTitle };
}

export function normalizePersonName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function findExactPersonMatch<T extends PersonSearchResult>(
  query: string,
  results: readonly T[],
): T | null {
  const matches = findExactPersonMatches(query, results);
  return matches.length === 1 ? matches[0] : null;
}

export function findExactPersonMatches<T extends PersonSearchResult>(
  query: string,
  results: readonly T[],
): T[] {
  const normalizedQuery = normalizePersonName(query);
  if (!normalizedQuery) return [];

  return results.filter((person) => normalizePersonName(person.name) === normalizedQuery);
}
