'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';

/**
 * Netflix CSV episode entries look like "Show Name: Season 4: Chapter Nine".
 * This extracts the base show name so it can match against TMDB credits.
 */
function extractTitles(rawTitle: string): string[] {
    const titles: string[] = [rawTitle];
    const match = rawTitle.match(/^(.+?):\s*Season\s+\d/i);
    if (match) titles.push(match[1].trim());
    return titles;
}

interface HamburgerMenuProps {
    watchHistory: string[] | null;
    onHistoryUpdate: (newHistory: string[] | null) => void;
}

export default function HamburgerMenu({ watchHistory, onHistoryUpdate }: HamburgerMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showSingleTitleInput, setShowSingleTitleInput] = useState(false);
    const [singleTitle, setSingleTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const newTitles = results.data
                        .map((row: any) => row.Title)
                        .filter((title: string) => title && title.trim().length > 0)
                        .flatMap((title: string) => extractTitles(title));

                    if (newTitles.length > 0) {
                        const currentTitles = watchHistory || [];
                        const combinedSet = new Set([...currentTitles, ...newTitles]);
                        const combinedTitles = Array.from(combinedSet);

                        localStorage.setItem('watchHistory', JSON.stringify(combinedTitles));
                        onHistoryUpdate(combinedTitles);
                        setIsOpen(false);
                    } else {
                        alert("No titles found in the uploaded CSV.");
                    }
                } catch (err) {
                    alert("Failed to parse the CSV file.");
                } finally {
                    setLoading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            },
            error: (err) => {
                alert(err.message);
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        });
    };

    const handleAddSingleTitle = (e: React.FormEvent) => {
        e.preventDefault();
        if (!singleTitle.trim()) return;

        const currentTitles = watchHistory || [];
        const combinedSet = new Set([...currentTitles, singleTitle.trim()]);
        const combinedTitles = Array.from(combinedSet);

        localStorage.setItem('watchHistory', JSON.stringify(combinedTitles));
        onHistoryUpdate(combinedTitles);
        setSingleTitle('');
        setShowSingleTitleInput(false);
        setIsOpen(false);
    };

    const handleClearHistory = () => {
        if (window.confirm("Are you sure you want to clear your uploaded watch history?")) {
            localStorage.removeItem('watchHistory');
            onHistoryUpdate(null);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative z-50">
            {/* Hamburger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg backdrop-blur-md border border-zinc-700 transition shadow-lg"
                aria-label="Menu"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>

            {/* Hidden CSV Input */}
            <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
            />

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 space-y-1">
                        {!showSingleTitleInput ? (
                            <>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={loading}
                                    className="w-full text-left px-4 py-3 text-sm font-medium text-indigo-300 hover:bg-zinc-800 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                    {loading ? 'Uploading...' : 'Upload CSV List'}
                                </button>
                                
                                <button
                                    onClick={() => setShowSingleTitleInput(true)}
                                    className="w-full text-left px-4 py-3 text-sm font-medium text-emerald-300 hover:bg-zinc-800 rounded-lg transition flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    Add Single Title
                                </button>

                                {watchHistory && watchHistory.length > 0 && (
                                    <>
                                        <div className="h-px bg-zinc-800 my-1 mx-2"></div>
                                        <button
                                            onClick={handleClearHistory}
                                            className="w-full text-left px-4 py-3 text-sm font-medium text-red-400 hover:bg-zinc-800 rounded-lg transition flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            Clear History
                                        </button>
                                    </>
                                )}
                            </>
                        ) : (
                            <form onSubmit={handleAddSingleTitle} className="p-2 animate-in fade-in duration-200">
                                <label className="block text-xs text-zinc-400 mb-2 px-1">Enter a movie or show title:</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={singleTitle}
                                    onChange={(e) => setSingleTitle(e.target.value)}
                                    placeholder="e.g. Forrest Gump"
                                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2 placeholder-zinc-500"
                                />
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowSingleTitleInput(false)}
                                        className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={!singleTitle.trim()}
                                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
            
            {/* Click away overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[-1]" 
                    onClick={() => { setIsOpen(false); setShowSingleTitleInput(false); }}
                ></div>
            )}
        </div>
    );
}
