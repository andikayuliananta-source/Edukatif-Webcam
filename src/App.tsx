import { useState, useEffect, useCallback } from 'react';
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
  const [isGameActive, setIsGameActive] = useState<boolean>(false);

  // Listen to profile updates
  useEffect(() => {
    const updated = StorageService.getCurrentPlayer();
    setPlayer(updated);
  }, [currentTab]);

  const handleFinishGame = useCallback(() => {
    setIsGameActive(false);
    setPlayer(StorageService.getCurrentPlayer());
  }, []);

  const handleViewLeaderboard = useCallback(() => {
    setIsGameActive(false);
    setCurrentTab('leaderboard');
  }, []);

  const handleActiveStateChange = useCallback((active: boolean) => {
    setIsGameActive((prev) => (prev !== active ? active : prev));
  }, []);

  const handleEditProfile = useCallback(() => {
    setCurrentTab('profile');
  }, []);

  const handleUpdatePlayer = useCallback((updated: PlayerProfile) => {
    setPlayer(updated);
  }, []);

  const handlePlayNow = useCallback(() => {
    setCurrentTab('game');
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden">
      {/* Top Navigation - Automatically hidden when active game is in Fullscreen mode */}
      {!isGameActive && (
        <Navbar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          player={player}
          onEditProfile={handleEditProfile}
        />
      )}

      {/* Main View Router */}
      <main className={`flex-1 ${!isGameActive ? 'pb-16' : ''}`}>
        {currentTab === 'game' && (
          <GameScreen
            player={player}
            onFinishGame={handleFinishGame}
            onViewLeaderboard={handleViewLeaderboard}
            onActiveStateChange={handleActiveStateChange}
          />
        )}

        {currentTab === 'leaderboard' && (
          <LeaderboardView onPlayNow={handlePlayNow} />
        )}

        {currentTab === 'profile' && (
          <ProfileView
            player={player}
            onUpdatePlayer={handleUpdatePlayer}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsDashboardView />
        )}

        {currentTab === 'admin' && (
          <AdminQuestionsView />
        )}
      </main>

      {/* Footer - Hidden during active game play */}
      {!isGameActive && (
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
      )}
    </div>
  );
}
