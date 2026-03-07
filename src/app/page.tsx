'use client';

import React, { useState, useEffect } from 'react';
import CameraCapture from '@/components/CameraCapture';
import HistoryUploader from '@/components/HistoryUploader';

export default function Home() {
  const [watchHistory, setWatchHistory] = useState<string[] | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedHistory = localStorage.getItem('watchHistory');
    if (storedHistory) {
      try {
        setWatchHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error('Failed to parse history from local storage');
      }
    }
  }, []);

  if (!isClient) return null; // Avoid hydration mismatch

  return (
    <main className="flex-1 flex flex-col max-w-lg w-full mx-auto relative px-4 py-8 sm:py-12 min-h-screen">

      {/* Background Glows */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-900/20 rounded-full blur-[100px] opacity-70"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-fuchsia-900/10 rounded-full blur-[100px] opacity-50"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col pt-8">

        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent mb-3 drop-shadow-sm">
            Where Do I<br />Know Her From?
          </h1>
          <p className="text-zinc-400 text-sm max-w-xs mx-auto">
            Scan an actor on your screen to cross-reference them with your viewing history.
          </p>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 flex flex-col justify-center w-full">
          {!watchHistory || watchHistory.length === 0 ? (
            <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <HistoryUploader onHistoryLoaded={setWatchHistory} />
            </div>
          ) : (
            <div className="w-full animate-in zoom-in fade-in duration-500">
              <CameraCapture watchHistory={watchHistory} />

              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear your uploaded watch history?")) {
                    localStorage.removeItem('watchHistory');
                    setWatchHistory(null);
                  }
                }}
                className="mt-12 mx-auto block text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition"
              >
                Clear Uploaded History
              </button>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
