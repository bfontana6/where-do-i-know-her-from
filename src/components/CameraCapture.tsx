'use client';

import React, { useRef, useState } from 'react';

interface ActorResult {
    actorName: string;
    actorId: number;
    matches: Array<{
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

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError(null);

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
                matches: crossRefData.matches,
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
                        <p className="text-zinc-400 text-sm uppercase tracking-wider mb-1">Actor Identified!</p>
                        <h2 className="text-3xl font-bold text-white">{result.actorName}</h2>
                    </div>

                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-zinc-200 mb-4">You&apos;ve seen them in:</h3>

                        {result.matches.length > 0 ? (
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {result.matches.map((item, idx) => (
                                    <div key={`${item.id}-${idx}`} className="flex gap-4 p-3 bg-zinc-800/40 rounded-xl border border-zinc-800/50 hover:bg-zinc-800 transition">
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
                            <div className="p-4 bg-zinc-800/50 rounded-xl text-center">
                                <p className="text-zinc-400">We couldn&apos;t find any overlaps between their filmography and your uploaded watch history.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
