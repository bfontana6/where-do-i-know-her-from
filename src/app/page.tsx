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
    <main className="flex-1 flex flex-col max-w-lg w-full mx-auto px-4 min-h-screen">

      <div className="flex-1 flex flex-col">

        {/* Compact Header */}
        <header className="py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-tight">
              Where Do I Know Them From?
            </h1>
          </div>
          {watchHistory && watchHistory.length > 0 && (
            <HamburgerMenu watchHistory={watchHistory} onHistoryUpdate={setWatchHistory} />
          )}
        </header>

        {/* Dynamic Content — fills remaining height */}
        <div className="flex-1 flex flex-col pb-6">
          {!watchHistory || watchHistory.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <HistoryUploader onHistoryLoaded={setWatchHistory} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in duration-500">
              <CameraCapture watchHistory={watchHistory} />
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
