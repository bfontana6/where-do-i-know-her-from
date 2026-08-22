import { NextResponse } from 'next/server';
import { TMDB } from 'tmdb-ts';

import { findExactPersonMatches } from '@/lib/recognition';
import { supabase } from '@/lib/supabase';

interface CrossReferenceRequest {
  actorName?: unknown;
  actorId?: unknown;
  actorCandidates?: unknown;
  profileId?: unknown;
  resolveOnly?: unknown;
  watchHistory?: unknown;
}

interface CombinedCredit {
  id: number;
  character?: string;
  media_type?: 'movie' | 'tv';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  popularity?: number;
  vote_average?: number;
}

interface CreditInfo {
  title: string;
  mediaType: 'movie' | 'tv';
  releaseDate?: string;
}

let tmdb: TMDB | null = null;

function getTMDB(): TMDB {
  const accessToken = process.env.TMDB_ACCESS_TOKEN;
  if (!accessToken) throw new Error('TMDB_ACCESS_TOKEN is not configured');
  if (!tmdb) tmdb = new TMDB(accessToken);
  return tmdb;
}

function getCreditInfo(credit: CombinedCredit): CreditInfo | null {
  if (credit.media_type === 'movie' && credit.title) {
    return { title: credit.title, mediaType: 'movie', releaseDate: credit.release_date };
  }

  if (credit.media_type === 'tv' && credit.name) {
    return { title: credit.name, mediaType: 'tv', releaseDate: credit.first_air_date };
  }

  return null;
}

async function resolveCandidates(names: string[]) {
  const candidateGroups = await Promise.all(names.map(async (name) => {
    const searchResult = await getTMDB().search.people({ query: name });
    return findExactPersonMatches(name, searchResult.results ?? []).map((person) => ({
      id: person.id,
      name: person.name,
      profilePath: person.profile_path
        ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
        : null,
    }));
  }));
  const candidates = candidateGroups.flat();

  return Array.from(new Map(
    candidates
      .map((candidate) => [candidate.id, candidate]),
  ).values());
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CrossReferenceRequest;
    const actorName = typeof body.actorName === 'string' ? body.actorName.trim() : '';
    const actorId = typeof body.actorId === 'number' && Number.isInteger(body.actorId) && body.actorId > 0
      ? body.actorId
      : null;

    if (body.resolveOnly === true) {
      const actorCandidates = Array.isArray(body.actorCandidates)
        ? body.actorCandidates
          .filter((name): name is string => typeof name === 'string' && Boolean(name.trim()))
          .map((name) => name.trim())
          .slice(0, 3)
        : [];

      if (actorCandidates.length < 2) {
        return NextResponse.json({ error: 'At least two actor candidates are required' }, { status: 400 });
      }

      const candidates = await resolveCandidates(actorCandidates);
      return NextResponse.json({ success: true, ambiguous: true, candidates });
    }

    if (!actorId && !actorName) {
      return NextResponse.json({ error: 'actorName or actorId is required' }, { status: 400 });
    }

    let personId: number;
    let currentName: string;
    let profilePath: string | null;

    if (actorId) {
      const person = await getTMDB().people.details(actorId);
      personId = person.id;
      currentName = person.name;
      profilePath = person.profile_path || null;
    } else {
      const searchResult = await getTMDB().search.people({ query: actorName });
      const people = findExactPersonMatches(actorName, searchResult.results ?? []);

      if (people.length === 0) {
        return NextResponse.json({ error: 'No exact actor match was found in TMDB' }, { status: 404 });
      }

      if (people.length > 1) {
        const candidates = people.map((person) => ({
          id: person.id,
          name: person.name,
          profilePath: person.profile_path
            ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
            : null,
        }));
        return NextResponse.json({ success: true, ambiguous: true, candidates });
      }

      const [person] = people;
      personId = person.id;
      currentName = person.name;
      profilePath = person.profile_path || null;
    }

    const submittedHistory: unknown[] | null = Array.isArray(body.watchHistory)
      ? body.watchHistory
      : null;
    const hasClientHistory = submittedHistory !== null;
    const fallbackHistory = submittedHistory
      ? submittedHistory
        .filter((title): title is string => typeof title === 'string' && Boolean(title.trim()))
        .map((title) => title.trim())
        .slice(0, 25_000)
      : [];
    let watchHistory = fallbackHistory;

    if (!hasClientHistory && typeof body.profileId === 'string' && body.profileId) {
      const { data: historyRows, error: historyError } = await supabase
        .from('watch_history')
        .select('title')
        .eq('profile_id', body.profileId);

      if (historyError) {
        console.error('Watch history lookup failed', historyError);
        return NextResponse.json(
          { error: 'Watch history is temporarily unavailable. Please try again.' },
          { status: 503 },
        );
      } else {
        watchHistory = historyRows?.map((row) => row.title) ?? [];
      }
    }

    const [credits, personDetails] = await Promise.all([
      getTMDB().people.combinedCredits(personId),
      getTMDB().people.details(personId),
    ]);
    const cast = credits.cast as unknown as CombinedCredit[];
    const normalizedHistory = watchHistory.map((title) => title.toLocaleLowerCase('en-US'));
    const exactMatches = [];
    const fuzzyMatches = [];

    for (const credit of cast) {
      const info = getCreditInfo(credit);
      if (!info) continue;

      const normalizedTitle = info.title.toLocaleLowerCase('en-US');
      const match = {
        id: credit.id,
        title: info.title,
        character: credit.character,
        mediaType: info.mediaType,
        posterPath: credit.poster_path
          ? `https://image.tmdb.org/t/p/w500${credit.poster_path}`
          : null,
        releaseYear: info.releaseDate?.split('-')[0] || 'Unknown',
        popularity: credit.popularity || 0,
      };

      if (normalizedHistory.includes(normalizedTitle)) {
        exactMatches.push(match);
        continue;
      }

      if (normalizedTitle.length < 4) continue;
      const matchedHistoryItem = normalizedHistory.find((historyItem) => (
        historyItem.startsWith(`${normalizedTitle}:`)
        || historyItem.startsWith(`${normalizedTitle} :`)
      ));
      if (!matchedHistoryItem) continue;

      const originalItem = watchHistory.find(
        (historyItem) => historyItem.toLocaleLowerCase('en-US') === matchedHistoryItem,
      ) ?? matchedHistoryItem;
      fuzzyMatches.push({ ...match, matchedFrom: originalItem });
    }

    const uniqueExactMatches = Array.from(
      new Map(exactMatches.map((item) => [`${item.mediaType}:${item.title}`, item])).values(),
    ).sort((a, b) => b.popularity - a.popularity);
    const uniqueFuzzyMatches = Array.from(
      new Map(fuzzyMatches.map((item) => [`${item.mediaType}:${item.title}`, item])).values(),
    ).sort((a, b) => b.popularity - a.popularity);

    const topFilmography = cast
      .map((credit) => ({ credit, info: getCreditInfo(credit) }))
      .filter((item): item is { credit: CombinedCredit; info: CreditInfo } => (
        Boolean(item.info && item.credit.poster_path)
      ))
      .sort((a, b) => (
        (b.credit.vote_average || 0) - (a.credit.vote_average || 0)
        || (b.credit.popularity || 0) - (a.credit.popularity || 0)
      ))
      .map(({ credit, info }) => ({
        id: credit.id,
        title: info.title,
        character: credit.character,
        mediaType: info.mediaType,
        posterPath: `https://image.tmdb.org/t/p/w500${credit.poster_path}`,
        poster_path: credit.poster_path || null,
        releaseYear: info.releaseDate?.split('-')[0] || 'Unknown',
        vote_average: credit.vote_average || 0,
        popularity: credit.popularity || 0,
      }));
    const uniqueTopFilmography = Array.from(
      new Map(topFilmography.map((item) => [`${item.mediaType}:${item.title}`, item])).values(),
    ).slice(0, 12);

    return NextResponse.json({
      success: true,
      actorId: personId,
      actorName: currentName,
      actorProfilePath: profilePath
        ? `https://image.tmdb.org/t/p/w185${profilePath}`
        : null,
      imdbUrl: personDetails.imdb_id
        ? `https://www.imdb.com/name/${personDetails.imdb_id}`
        : null,
      matches: uniqueExactMatches,
      fuzzyMatches: uniqueFuzzyMatches,
      topFilmography: uniqueTopFilmography,
    });
  } catch (error: unknown) {
    console.error('Cross-reference failed', error);
    return NextResponse.json({ error: 'Failed to cross-reference actor data' }, { status: 500 });
  }
}
