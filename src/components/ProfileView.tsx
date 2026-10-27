import { useState } from 'react';
import {
  User,
  Check,
  Flame,
  Target,
  Trophy,
  History,
  Calendar,
  Gamepad2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { PlayerProfile, GameSessionResult } from '../types';
import { StorageService } from '../services/storage';

interface ProfileViewProps {
  player: PlayerProfile;
  onUpdatePlayer: (updated: PlayerProfile) => void;
}

const AVATAR_OPTIONS = ['🌟', '🦁', '🚀', '⚡', '🌸', '👑', '🦊', '🎯', '🦉', '🔥', '🤖', '🐱'];

export const ProfileView = ({ player, onUpdatePlayer }: ProfileViewProps) => {
  const [name, setName] = useState(player.name);
  const [avatar, setAvatar] = useState(player.avatar);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const matchHistory: GameSessionResult[] = StorageService.getMatchHistory();
  const playerMatches = matchHistory.filter((m) => m.playerId === player.id || m.playerName === player.name);

  // Calculate detailed accuracy
  const overallAccuracy = player.totalQuestionsAnswered > 0
    ? Math.round((player.totalCorrect / player.totalQuestionsAnswered) * 100)
    : 0;

  const handleSave = () => {
    if (!name.trim()) return;
    const updated: PlayerProfile = {
      ...player,
      name: name.trim(),
      avatar
    };
    StorageService.saveCurrentPlayer(updated);
    onUpdatePlayer(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Player Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar Icon */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-800/90 border-2 border-emerald-500/50 flex items-center justify-center text-5xl sm:text-6xl shadow-2xl shadow-emerald-500/20">
              {avatar}
            </div>
            {isEditing && (
              <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 p-1 rounded-full text-xs font-bold">
                Pilih
              </span>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 text-center sm:text-left">
            {isEditing ? (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nama Pemain:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={25}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-base focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Pilih Emoji Avatar:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setAvatar(item)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition ${
                          avatar === item
                            ? 'bg-emerald-600 border-2 border-emerald-400 scale-110 shadow'
                            : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition"
                  >
                    <Check className="w-4 h-4" />
                    Simpan Perubahan
                  </button>
                  <button
                    onClick={() => {
                      setName(player.name);
                      setAvatar(player.avatar);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold mb-2">
                  <User className="w-3.5 h-3.5" /> Profil Atlet Kuis
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white">{player.name}</h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  Bergabung sejak {new Date(player.createdAt || Date.now()).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
                  >
                    ✏️ Edit Profil & Avatar
                  </button>
                  {saveSuccess && (
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Tersimpan!
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Games */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Permainan</div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
              {player.totalGames}
            </div>
            <div className="text-[10px] text-slate-400">Sesi kuis selesai</div>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Akurasi Rata-rata</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">
              {overallAccuracy}%
            </div>
            <div className="text-[10px] text-slate-400">
              {player.totalCorrect}/{player.totalQuestionsAnswered} Soal Benar
            </div>
          </div>
        </div>

        {/* Highest Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Skor Tertinggi</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-0.5">
              {player.highestScore.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">Rekor personal terbaik</div>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
            <Flame className="w-6 h-6 fill-rose-400" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Combo Maksimal</div>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-0.5">
              {player.longestStreak}x 🔥
            </div>
            <div className="text-[10px] text-slate-400">Jawaban benar beruntun</div>
          </div>
        </div>
      </div>

      {/* Match History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Riwayat Permainan Terakhir</h2>
          </div>
          <span className="text-xs text-slate-400">
            {playerMatches.length} Catatan Riwayat
          </span>
        </div>

        {playerMatches.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Belum ada riwayat permainan. Mulai kuis untuk mencatatkan rekor pertamamu!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Tingkat</th>
                  <th className="py-2.5 px-3 text-center">Soal Terjawab</th>
                  <th className="py-2.5 px-3 text-center">Akurasi</th>
                  <th className="py-2.5 px-3 text-center">Max Combo</th>
                  <th className="py-2.5 px-3 text-right">Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {playerMatches.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 text-xs">
                    <td className="py-3 px-3 text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(m.timestamp).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-[11px]">
                        {m.difficulty}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-medium">
                      <span className="text-emerald-400 font-bold">{m.correctCount}</span> / {m.totalQuestions}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold ${m.accuracy >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {m.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-amber-400 font-semibold">{m.maxStreak}x 🔥</span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-white text-sm">
                      {m.score.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
