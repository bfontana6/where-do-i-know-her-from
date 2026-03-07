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
        const searchResult = await tmdb.search.persons({ query: actorName });

        if (!searchResult.results || searchResult.results.length === 0) {
            return NextResponse.json({ error: 'Actor not found in TMDB' }, { status: 404 });
        }

        const personId = searchResult.results[0].id;
        const currentName = searchResult.results[0].name;

        // 2. Get the actor's combined credits (movies + TV)
        const credits = await tmdb.people.combinedCredits(personId);

        // 3. Cross-reference with watch history
        // For MVP, we'll do a simple lowercase exact or partial match.
        const normalizedHistory = (watchHistory || []).map((t: string) => t.toLowerCase());

        const matches = [];

        // Cast will contain movies and tv shows
        for (const credit of credits.cast || []) {
            // TMDB uses 'title' for movies and 'name' for TV shows
            const title = ('title' in credit ? credit.title : credit.name) as string;
            const releaseDate = ('release_date' in credit ? credit.release_date : credit.first_air_date) as string;

            if (!title) continue;

            const normalizedTitle = title.toLowerCase();

            // Check if the title exists in the user's watch history
            // Netflix titles are often formatted like "The Office: Season 1: Pilot", so partial match is better
            const isMatch = normalizedHistory.some((historyItem: string) =>
                historyItem.includes(normalizedTitle) || normalizedTitle.includes(historyItem)
            );

            if (isMatch) {
                matches.push({
                    id: credit.id,
                    title: title,
                    character: credit.character,
                    mediaType: credit.media_type,
                    posterPath: credit.poster_path ? `https://image.tmdb.org/t/p/w500${credit.poster_path}` : null,
                    releaseYear: releaseDate ? releaseDate.split('-')[0] : 'Unknown'
                });
            }
        }

        // Deduplicate matches (e.g., an actor appeared in multiple episodes of a show)
        const uniqueMatches = Array.from(new Map(matches.map(item => [item.title, item])).values());

        return NextResponse.json({
            success: true,
            actorId: personId,
            actorName: currentName,
            matches: uniqueMatches
        });

    } catch (error) {
        console.error('Error cross-referencing data:', error);
        return NextResponse.json({ error: 'Failed to cross-reference data' }, { status: 500 });
    }
}
