'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';

export default function HistoryUploader({ onHistoryLoaded }: { onHistoryLoaded: (history: string[]) => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        setSuccess(false);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    // Netflix CSV usually has 'Title' column
                    const newTitles = results.data
                        .map((row: any) => row.Title)
                        .filter((title: string) => title && title.trim().length > 0);

                    if (newTitles.length === 0) {
                        setError('Could not find any titles in the CSV. Make sure it is a Netflix ViewingActivity.csv format.');
                        setLoading(false);
                        return;
                    }

                    const storedHistory = localStorage.getItem('watchHistory');
                    let currentTitles: string[] = [];
                    if (storedHistory) {
                        try {
                            currentTitles = JSON.parse(storedHistory);
                        } catch (e) {
                            console.error('Failed to parse existing history for merging', e);
                        }
                    }

                    const combinedSet = new Set([...currentTitles, ...newTitles]);
                    const combinedTitles = Array.from(combinedSet);

                    // Save to local storage for persistence across reloads
                    localStorage.setItem('watchHistory', JSON.stringify(combinedTitles));
                    onHistoryLoaded(combinedTitles);
                    setSuccess(true);
                    setLoading(false);
                } catch (err) {
                    setError('Failed to parse the CSV file.');
                    setLoading(false);
                }
            },
            error: (err) => {
                setError(err.message);
                setLoading(false);
            }
        });
    };

    return (
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 border border-zinc-800 shadow-xl transition-all">
            <h3 className="text-xl font-semibold text-white mb-2">Upload Watch History</h3>
            <div className="text-zinc-400 text-sm mb-6 space-y-3">
                <p>
                    <strong>How to get your Netflix history:</strong> Go to Netflix Account settings on your browser → Profile & Parental Controls → Viewing activity → <strong>Download all</strong> at the bottom.
                </p>
                <p>
                    You can upload multiple files (e.g., from different profiles or other services that use a "Title" column). We will merge them securely on your device.
                </p>
            </div>

            <div className="relative">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                    id="csv-upload"
                />
                <label
                    htmlFor="csv-upload"
                    className="cursor-pointer flex items-center justify-center w-full py-4 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors border border-zinc-700 hover:border-zinc-500 border-dashed"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Parsing CSV...
                        </span>
                    ) : (
                        <span>Select CSV File</span>
                    )}
                </label>
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="mt-4 p-3 bg-green-900/30 border border-green-800 text-green-400 rounded-lg text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    History loaded successfully!
                </div>
            )}
        </div>
    );
}
