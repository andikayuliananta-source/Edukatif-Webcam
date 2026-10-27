import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { GameScreen } from './components/GameScreen';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { AnalyticsDashboardView } from './components/AnalyticsDashboardView';
import { AdminQuestionsView } from './components/AdminQuestionsView';
import { PlayerProfile } from './types';
import { StorageService } from './services/storage';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'game' | 'leaderboard' | 'profile' | 'analytics' | 'admin'>('game');
  const [player, setPlayer] = useState<PlayerProfile>(() => StorageService.getCurrentPlayer());

  // Listen to profile updates
  useEffect(() => {
    const updated = StorageService.getCurrentPlayer();
    setPlayer(updated);
  }, [currentTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        player={player}
        onEditProfile={() => setCurrentTab('profile')}
      />

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {currentTab === 'game' && (
          <GameScreen
            player={player}
            onFinishGame={() => {
              // Refresh player stats
              setPlayer(StorageService.getCurrentPlayer());
            }}
            onViewLeaderboard={() => setCurrentTab('leaderboard')}
          />
        )}

        {currentTab === 'leaderboard' && (
          <LeaderboardView onPlayNow={() => setCurrentTab('game')} />
        )}

        {currentTab === 'profile' && (
          <ProfileView
            player={player}
            onUpdatePlayer={(updated) => setPlayer(updated)}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsDashboardView />
        )}

        {currentTab === 'admin' && (
          <AdminQuestionsView />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-400">GerakPintar</span> &bull; Kuis Edukatif Benar & Salah Webcam Real-Time
          </div>
          <div className="text-[11px] text-slate-500">
            👈 Lompat/Geser Kiri = SALAH &bull; 👉 Lompat/Geser Kanan = BENAR
          </div>
        </div>
      </footer>
    </div>
  );
}
