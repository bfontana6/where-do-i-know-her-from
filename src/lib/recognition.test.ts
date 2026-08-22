import { describe, expect, it } from 'vitest';

import {
  findExactPersonMatch,
  findExactPersonMatches,
  parseRecognitionResult,
} from './recognition';

describe('parseRecognitionResult', () => {
  it('accepts one structured, identified candidate', () => {
    expect(parseRecognitionResult(JSON.stringify({
      status: 'identified',
      candidates: [{ name: '  Bryan Cranston  ' }],
      sceneTitle: 'Breaking Bad',
    }))).toEqual({
      status: 'identified',
      candidates: [{ name: 'Bryan Cranston' }],
      sceneTitle: 'Breaking Bad',
    });
  });

  it('deduplicates candidates within a valid ambiguous response', () => {
    expect(parseRecognitionResult(JSON.stringify({
      status: 'ambiguous',
      candidates: [
        { name: 'Pedro Pascal' },
        { name: '  pedro pascal ' },
        { name: 'Oscar Isaac' },
        { name: 'A fourth candidate' },
      ],
      sceneTitle: '',
    }))).toEqual({
      status: 'ambiguous',
      candidates: [{ name: 'Pedro Pascal' }, { name: 'Oscar Isaac' }, { name: 'A fourth candidate' }],
      sceneTitle: null,
    });
  });

  it('fails closed when the provider response is malformed', () => {
    expect(parseRecognitionResult('Bryan Cranston')).toEqual({
      status: 'unknown',
      candidates: [],
      sceneTitle: null,
    });
  });

  it('discards candidates when the provider reports unknown', () => {
    expect(parseRecognitionResult(JSON.stringify({
      status: 'unknown',
      candidates: [{ name: 'A guess that must not escape' }],
      sceneTitle: 'Maybe a title',
    }))).toEqual({
      status: 'unknown',
      candidates: [],
      sceneTitle: 'Maybe a title',
    });
  });

  it('fails closed for a missing or invalid status', () => {
    expect(parseRecognitionResult(JSON.stringify({ candidates: [{ name: 'Pedro Pascal' }] })).status)
      .toBe('unknown');
    expect(parseRecognitionResult(JSON.stringify({
      status: 'confident-ish',
      candidates: [{ name: 'Pedro Pascal' }],
    })).status).toBe('unknown');
  });

  it('fails closed when status and candidate count disagree', () => {
    expect(parseRecognitionResult(JSON.stringify({
      status: 'ambiguous',
      candidates: [{ name: 'Pedro Pascal' }],
    })).status).toBe('unknown');
    expect(parseRecognitionResult(JSON.stringify({
      status: 'identified',
      candidates: [{ name: 'Pedro Pascal' }, { name: 'Oscar Isaac' }],
    })).status).toBe('unknown');
  });
});

describe('findExactPersonMatch', () => {
  const people = [
    { id: 1, name: 'John Smith' },
    { id: 2, name: 'Pedro Pascal' },
    { id: 3, name: 'Renée Zellweger' },
  ];

  it('does not trust the first TMDB search result', () => {
    expect(findExactPersonMatch('Pedro Pascal', people)).toEqual(people[1]);
  });

  it('matches harmless punctuation and diacritic differences', () => {
    expect(findExactPersonMatch('Renee Zellweger', people)).toEqual(people[2]);
  });

  it('returns null when TMDB has no exact name match', () => {
    expect(findExactPersonMatch('Pedro Pascale', people)).toBeNull();
  });

  it('does not silently choose between exact-name duplicates', () => {
    const namesakes = [{ id: 4, name: 'Alex Smith' }, { id: 5, name: 'Alex Smith' }];
    expect(findExactPersonMatches('Alex Smith', namesakes)).toEqual(namesakes);
    expect(findExactPersonMatch('Alex Smith', namesakes)).toBeNull();
  });
});
