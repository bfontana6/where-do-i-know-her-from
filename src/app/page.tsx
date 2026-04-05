'use client';

import React, { useState, useEffect } from 'react';
import CameraCapture from '@/components/CameraCapture';
import HistoryUploader from '@/components/HistoryUploader';
import HamburgerMenu from '@/components/HamburgerMenu';

export default function Home() {
  const [watchHistory, setWatchHistory] = useState<string[] | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [pendingHistorySearch, setPendingHistorySearch] = useState<string | null>(null);
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
    const storedName = localStorage.getItem('profileName');
    if (storedName) setProfileName(storedName);
  }, []);

  const handleProfileName = (name: string) => {
    localStorage.setItem('profileName', name);
    setProfileName(name);
  };

  if (!isClient) return null; // Avoid hydration mismatch

  return (
    <main
      className="flex-1 flex flex-col max-w-lg w-full mx-auto px-4 min-h-screen"
      style={{
        background: 'radial-gradient(ellipse at 15% 5%, rgba(79,22,130,0.45) 0%, transparent 55%), radial-gradient(ellipse at 85% 95%, rgba(6,78,59,0.35) 0%, transparent 50%)',
      }}
    >
      <div className="flex-1 flex flex-col">

        {/* Header — profile name + hamburger when history is loaded */}
        <header className="py-5 flex items-center justify-between min-h-[60px]">
          {profileName && watchHistory && watchHistory.length > 0 ? (
            <p className="text-zinc-500 text-sm">Welcome back, <span className="text-zinc-300 font-medium">{profileName}</span></p>
          ) : <div />}
          {watchHistory && watchHistory.length > 0 && (
            <HamburgerMenu
              watchHistory={watchHistory}
              onHistoryUpdate={setWatchHistory}
              pendingHistorySearch={pendingHistorySearch}
              onClearPendingSearch={() => setPendingHistorySearch(null)}
            />
          )}
        </header>

        {/* Dynamic Content — fills remaining height */}
        <div className="flex-1 flex flex-col pb-6">
          {!watchHistory || watchHistory.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <HistoryUploader onHistoryLoaded={setWatchHistory} onProfileName={handleProfileName} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in duration-500">
              <CameraCapture watchHistory={watchHistory} onHistoryUpdate={setWatchHistory} onDisputeTitle={setPendingHistorySearch} />
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
