'use client';

// TODO: Explore allowing the user to tap/select a specific person when multiple
// people appear in the submitted scene image.
// TODO: Support identifying all people in a scene simultaneously (batch results).

import React, { useRef, useState } from 'react';

interface ActorResult {
    actorName: string;
    actorId: number;
    actorProfilePath?: string | null;
    imdbUrl?: string | null;
    matches: Array<{
        id: number;
        title: string;
        character: string;
        mediaType: string;
        posterPath: string | null;
        releaseYear: string;
        popularity?: number;
    }>;
    topFilmography?: Array<{
        id: number;
        title: string;
        character: string;
        mediaType: string;
        posterPath: string | null;
        releaseYear: string;
    }>;
}

export default function CameraCapture({ watchHistory }: { watchHistory: string[] }) {
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loadingState, setLoadingState] = useState<'idle' | 'recognizing' | 'cross-referencing'>('idle');
    const [result, setResult] = useState<ActorResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
    const [showCorrectionInput, setShowCorrectionInput] = useState(false);
    const [correctionName, setCorrectionName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError(null);
        setFeedback(null);
        setShowCorrectionInput(false);
        setCorrectionName('');

        await processImage(file);
    };

    const processImage = async (file: File) => {
        try {
            setLoadingState('recognizing');

            // Step 1: Recognize Actor
            const formData = new FormData();
            formData.append('image', file);

            const recognitionRes = await fetch('/api/recognize', {
                method: 'POST',
                body: formData,
            });

            const recognitionData = await recognitionRes.json();

            if (!recognitionRes.ok) {
                throw new Error(recognitionData.error || 'Failed to recognize actor');
            }

            const actorName = recognitionData.actor.name;

            // Step 2: Cross Reference
            setLoadingState('cross-referencing');

            const crossRefRes = await fetch('/api/cross-reference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actorName, watchHistory }),
            });

            const crossRefData = await crossRefRes.json();

            if (!crossRefRes.ok) {
                throw new Error(crossRefData.error || 'Failed to cross reference');
            }

            setResult({
                actorName: crossRefData.actorName,
                actorId: crossRefData.actorId,
                actorProfilePath: crossRefData.actorProfilePath || null,
                imdbUrl: crossRefData.imdbUrl || null,
                matches: crossRefData.matches || [],
                topFilmography: crossRefData.topFilmography || [],
            });

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoadingState('idle');
        }
    };

    // Used when the user corrects a misidentified actor by name.
    // TODO: Also allow the user to enter the show/episode title they're watching
    // and surface a list of likely cast candidates to choose from.
    const lookupActor = async (actorName: string) => {
        setShowCorrectionInput(false);
        setCorrectionName('');
        setResult(null);
        setError(null);
        setFeedback(null);
        try {
            setLoadingState('cross-referencing');
            const crossRefRes = await fetch('/api/cross-reference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actorName, watchHistory }),
            });
            const crossRefData = await crossRefRes.json();
            if (!crossRefRes.ok) throw new Error(crossRefData.error || 'Failed to cross reference');
            setResult({
                actorName: crossRefData.actorName,
                actorId: crossRefData.actorId,
                actorProfilePath: crossRefData.actorProfilePath || null,
                imdbUrl: crossRefData.imdbUrl || null,
                matches: crossRefData.matches || [],
                topFilmography: crossRefData.topFilmography || [],
            });
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoadingState('idle');
        }
    };

    return (
        <div className="w-full max-w-md mx-auto relative flex flex-col items-center gap-6">

            {/* Camera Button */}
            {!previewUrl && (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-48 h-48 bg-indigo-600 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:bg-indigo-500 hover:scale-105 transition-all outline-none border-4 border-zinc-900"
                >
                    <svg className="w-12 h-12 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span className="text-white font-medium text-lg">Tap to Scan</span>
                </button>
            )}

            {/* Hidden File Input */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleCapture}
            />

            {/* States: Loading, Error, Result */}
            {previewUrl && (
                <div className="w-full flex justify-between items-center mb-4">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-zinc-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
                    </div>
                    <button
                        onClick={() => {
                            setPreviewUrl(null);
                            setResult(null);
                            setError(null);
                            setFeedback(null);
                            setShowCorrectionInput(false);
                            setCorrectionName('');
                            setTimeout(() => fileInputRef.current?.click(), 100);
                        }}
                        className="px-4 py-2 bg-zinc-800 text-sm font-medium text-white rounded-full hover:bg-zinc-700 transition"
                    >
                        Scan Again
                    </button>
                </div>
            )}

            {loadingState !== 'idle' && (
                <div className="w-full p-6 bg-zinc-900/80 rounded-2xl flex flex-col items-center justify-center border border-zinc-800">
                    <svg className="animate-spin h-10 w-10 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-white font-medium">
                        {loadingState === 'recognizing' ? 'Identifying actor...' : 'Checking your watch history...'}
                    </p>
                </div>
            )}

            {error && (
                <div className="w-full p-4 bg-red-900/30 border border-red-800 text-red-400 rounded-xl text-center">
                    {error}
                </div>
            )}

            {result && (
                <div className="w-full bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 bg-gradient-to-b from-indigo-900/40 to-transparent border-b border-zinc-800/50">
                        <p className="text-zinc-400 text-sm uppercase tracking-wider mb-3">Actor Identified!</p>
                        <div className="flex items-center gap-4">
                            {result.actorProfilePath && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={result.actorProfilePath}
                                    alt={result.actorName}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/60 shadow-lg flex-shrink-0"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-3xl font-bold text-white leading-tight">{result.actorName}</h2>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    {result.imdbUrl && (
                                        <a
                                            href={result.imdbUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 3v2h-4V3H6v18h4v-2h4v2h4V3h-4zm-4 14v-2h4v2h-4zm0-10h4v2h-4V7z"/></svg>
                                            IMDb
                                        </a>
                                    )}
                                    {!showCorrectionInput ? (
                                        <button
                                            onClick={() => setShowCorrectionInput(true)}
                                            className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors underline underline-offset-2"
                                        >
                                            Wrong person?
                                        </button>
                                    ) : (
                                        <form
                                            onSubmit={(e) => { e.preventDefault(); if (correctionName.trim()) lookupActor(correctionName.trim()); }}
                                            className="flex items-center gap-2 mt-2 w-full"
                                        >
                                            <input
                                                autoFocus
                                                type="text"
                                                value={correctionName}
                                                onChange={(e) => setCorrectionName(e.target.value)}
                                                placeholder="Enter correct actor name"
                                                className="flex-1 bg-zinc-800 border border-zinc-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-500"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!correctionName.trim()}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                                            >
                                                Look up
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowCorrectionInput(false); setCorrectionName(''); }}
                                                className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium rounded-lg transition"
                                            >
                                                Cancel
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-zinc-200 mb-4">You&apos;ve seen them in:</h3>

                        {result.matches.length > 0 ? (
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {result.matches.map((item, idx) => (
                                    <div key={`match-${item.id}-${idx}`} className="flex gap-4 p-3 bg-zinc-800/40 rounded-xl border border-zinc-800/50 hover:bg-zinc-800 transition">
                                        {item.posterPath ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={item.posterPath} alt={item.title} className="w-16 h-24 object-cover rounded-lg shadow" />
                                        ) : (
                                            <div className="w-16 h-24 bg-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-500 text-center p-1">No Image</div>
                                        )}
                                        <div className="flex-1 py-1">
                                            <h4 className="font-semibold text-white text-lg leading-tight mb-1">{item.title}</h4>
                                            <p className="text-zinc-400 text-sm mb-1">{item.releaseYear}</p>
                                            {item.character && (
                                                <p className="text-sm text-indigo-300">as {item.character}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 bg-zinc-800/50 rounded-xl text-center border border-zinc-700/50">
                                    <p className="text-zinc-300">We couldn&apos;t find an exact match between their roles and your uploaded watch history.</p>
                                </div>
                                
                                {result.topFilmography && result.topFilmography.length > 0 && (
                                    <div>
                                        <h3 className="text-md font-medium text-zinc-400 mb-3 uppercase tracking-wider text-sm">Top Filmography</h3>
                                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {result.topFilmography.map((item, idx) => (
                                                <div key={`top-${item.id}-${idx}`} className="flex gap-4 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/30">
                                                    {item.posterPath ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={item.posterPath} alt={item.title} className="w-12 h-18 object-cover rounded-md shadow-sm opacity-80" />
                                                    ) : (
                                                        <div className="w-12 h-18 bg-zinc-800 rounded-md flex items-center justify-center text-[10px] text-zinc-600 text-center p-1">No Image</div>
                                                    )}
                                                    <div className="flex-1 py-1">
                                                        <h4 className="font-medium text-zinc-200 text-base leading-tight mb-1">{item.title}</h4>
                                                        <p className="text-zinc-500 text-xs mb-1">{item.releaseYear}</p>
                                                        {item.character && (
                                                            <p className="text-xs text-zinc-400">as {item.character}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Feedback Section */}
                        <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-col items-center">
                            <p className="text-zinc-400 text-sm mb-3">Was this identification correct?</p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setFeedback('up')}
                                    className={`p-3 rounded-full transition-all ${feedback === 'up' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path></svg>
                                </button>
                                <button 
                                    onClick={() => setFeedback('down')}
                                    className={`p-3 rounded-full transition-all ${feedback === 'down' ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"></path></svg>
                                </button>
                            </div>
                            {feedback && (
                                <p className="text-xs text-zinc-500 mt-2">Thanks for the feedback!</p>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setPreviewUrl(null);
                                setResult(null);
                                setError(null);
                                setFeedback(null);
                                setTimeout(() => fileInputRef.current?.click(), 100);
                            }}
                            className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            Scan Another Face
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
