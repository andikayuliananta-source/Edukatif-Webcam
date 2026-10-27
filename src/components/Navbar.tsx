import { useState } from 'react';
import { Volume2, VolumeX, Trophy, User, BarChart3, Settings, Play, Video } from 'lucide-react';
import { PlayerProfile } from '../types';
import { sound } from '../services/sound';

interface NavbarProps {
  currentTab: 'game' | 'leaderboard' | 'profile' | 'analytics' | 'admin';
  onSelectTab: (tab: 'game' | 'leaderboard' | 'profile' | 'analytics' | 'admin') => void;
  player: PlayerProfile;
  onEditProfile: () => void;
}

export const Navbar = ({ currentTab, onSelectTab, player, onEditProfile }: NavbarProps) => {
  const [isMuted, setIsMuted] = useState(sound.getIsMuted());

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const navItems = [
    { id: 'game', label: 'Main Kuis', icon: Play },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'profile', label: 'Profil Saya', icon: User },
    { id: 'analytics', label: 'Dashboard Analitik', icon: BarChart3 },
    { id: 'admin', label: 'Kelola Soal (Admin)', icon: Settings },
  ] as const;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div 
            onClick={() => onSelectTab('game')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-xl tracking-tight">
                <span className="text-white">Gerak</span>
                <span className="text-emerald-400">Pintar</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                  AI CAM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Kuis Benar & Salah Deteksi Webcam Real-Time
              </p>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Sound & Active Player */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSound}
              title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              aria-label="Toggle Sound"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-rose-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              )}
            </button>

            {/* Player Pill */}
            <button
              onClick={onEditProfile}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-full transition text-left group"
            >
              <span className="text-xl bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center border border-slate-600 shadow-inner">
                {player.avatar}
              </span>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight group-hover:text-emerald-400 transition-colors">
                  {player.name}
                </p>
                <p className="text-[10px] text-emerald-400 font-semibold">
                  Skor: {player.highestScore.toLocaleString()}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800/60 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
