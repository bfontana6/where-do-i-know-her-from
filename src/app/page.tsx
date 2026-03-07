'use client';

import React, { useState, useEffect } from 'react';
import CameraCapture from '@/components/CameraCapture';
import HistoryUploader from '@/components/HistoryUploader';
import HamburgerMenu from '@/components/HamburgerMenu';

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

        {/* Header Bar */}
        <header className="mb-8 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 drop-shadow-md">
              Where Do I<br />Know Her From?
            </h1>
            <p className="text-zinc-300 text-sm max-w-[250px]">
              Scan an actor on your screen to cross-reference them with your viewing history.
            </p>
          </div>
          
          {/* Top Navigation Menu */}
          {watchHistory && watchHistory.length > 0 && (
            <div className="ml-4 mt-1">
              <HamburgerMenu watchHistory={watchHistory} onHistoryUpdate={setWatchHistory} />
            </div>
          )}
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
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
