import { NextResponse } from 'next/server';
import { TMDB } from 'tmdb-ts';

// Initialize TMDB Client
const tmdb = new TMDB(process.env.TMDB_ACCESS_TOKEN || '');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { actorName, watchHistory } = body;

        // watchHistory should be an array of strings (e.g., ["The Office", "Stranger Things"])

        if (!actorName) {
            return NextResponse.json({ error: 'Actor name is required' }, { status: 400 });
        }

        // 1. Search for the actor by name
        const searchResult = await tmdb.search.people({ query: actorName });

        if (!searchResult.results || searchResult.results.length === 0) {
            return NextResponse.json({ error: 'Actor not found in TMDB' }, { status: 404 });
        }

        const personId = searchResult.results[0].id;
        const currentName = searchResult.results[0].name;
        const profilePath = searchResult.results[0].profile_path;

        // 2. Fetch credits and person details (for imdb_id) in parallel
        const [credits, personDetails] = await Promise.all([
            tmdb.people.combinedCredits(personId),
            tmdb.people.details(personId),
        ]);

        // 3. Cross-reference with watch history
        // For MVP, we'll do a simple lowercase exact or partial match.
        const normalizedHistory = (watchHistory || []).map((t: string) => t.toLowerCase());

        const matches = [];

        // Cast will contain movies and tv shows
        for (const credit of credits.cast || []) {
            // TMDB uses 'title' for movies and 'name' for TV shows
            const isMovie = (credit as any).media_type === 'movie';
            
            // Apply correct typing manually since the SDK returns a union type that TypeScript struggles with
            const title = isMovie ? (credit as any).title : (credit as any).name;
            const releaseDate = isMovie ? (credit as any).release_date : (credit as any).first_air_date;

            if (!title) continue;

            const normalizedTitle = title.toLowerCase();

            // Check if the title exists in the user's watch history
            // Use word boundary regex to avoid partial matches (e.g. "hunter" matching inside "the deer hunter")
            // We want exact title matches against elements in the watch history
            const escapedTitle = normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            let isMatch = false;
            try {
                const titleRegex = new RegExp(`\\b${escapedTitle}\\b`);
                isMatch = normalizedHistory.some((historyItem: string) => {
                    return titleRegex.test(historyItem) || historyItem === normalizedTitle;
                });
            } catch (err) {
                // Fallback to simple matching if regex fails for some weird title edge case
                isMatch = normalizedHistory.some((historyItem: string) =>
                    historyItem.includes(normalizedTitle) || normalizedTitle.includes(historyItem)
                );
            }

            if (isMatch) {
                matches.push({
                    id: credit.id,
                    title: title as string,
                    character: credit.character,
                    mediaType: (credit as any).media_type,
                    posterPath: credit.poster_path ? `https://image.tmdb.org/t/p/w500${credit.poster_path}` : null,
                    releaseYear: releaseDate ? releaseDate.split('-')[0] : 'Unknown',
                    popularity: credit.popularity || 0
                });
            }
        }

        // Deduplicate matches (e.g., an actor appeared in multiple episodes of a show)
        const uniqueMatches = Array.from(new Map(matches.map(item => [item.title, item])).values())
            .sort((a, b) => b.popularity - a.popularity);

        // Also prepare top ~10 filmography items to show if there are no/few matches, sorting by popularity
        const allCredits = credits.cast || [];
        const topFilmography = allCredits
            .filter(c => c.poster_path) // only items with posters look good
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 10)
            .map(credit => {
                const isMovie = (credit as any).media_type === 'movie';
                const title = isMovie ? (credit as any).title : (credit as any).name;
                const releaseDate = isMovie ? (credit as any).release_date : (credit as any).first_air_date;

                return {
                    id: credit.id,
                    title: title as string,
                    character: credit.character,
                    mediaType: (credit as any).media_type,
                    posterPath: `https://image.tmdb.org/t/p/w500${credit.poster_path}`,
                    releaseYear: releaseDate ? releaseDate.split('-')[0] : 'Unknown'
                };
            });

        // Deduplicate top filmography
        const uniqueTopFilmography = Array.from(new Map(topFilmography.map(item => [item.title, item])).values());

        return NextResponse.json({
            success: true,
            actorId: personId,
            actorName: currentName,
            actorProfilePath: profilePath ? `https://image.tmdb.org/t/p/w185${profilePath}` : null,
            imdbUrl: (personDetails as any).imdb_id ? `https://www.imdb.com/name/${(personDetails as any).imdb_id}` : null,
            matches: uniqueMatches,
            topFilmography: uniqueTopFilmography
        });

    } catch (error) {
        console.error('Error cross-referencing data:', error);
        return NextResponse.json({ error: 'Failed to cross-reference data' }, { status: 500 });
    }
}
