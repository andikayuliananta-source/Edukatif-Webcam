import { useState, useMemo } from 'react';
import { Trophy, Medal, Search, Flame, Target, Play } from 'lucide-react';
import { LeaderboardEntry, DifficultyLevel } from '../types';
import { StorageService } from '../services/storage';

interface LeaderboardViewProps {
  onPlayNow: () => void;
}

export const LeaderboardView = ({ onPlayNow }: LeaderboardViewProps) => {
  const [filterDifficulty, setFilterDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const leaderboardData: LeaderboardEntry[] = useMemo(() => {
    return StorageService.getLeaderboard();
  }, []);

  const filteredData = useMemo(() => {
    return leaderboardData.filter((entry) => {
      const matchDiff = filterDifficulty === 'all' || entry.difficulty === filterDifficulty;
      const matchSearch = entry.playerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDiff && matchSearch;
    });
  }, [leaderboardData, filterDifficulty, searchQuery]);

  const topThree = filteredData.slice(0, 3);
  const remaining = filteredData.slice(3);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
            <Trophy className="w-3.5 h-3.5" />
            Papan Peringkat Juara
          </div>
          <h1 className="text-3xl font-black text-white">Leaderboard Tertinggi</h1>
          <p className="text-slate-400 text-sm mt-1">
            Rekor skor tertinggi dari para pemain kuis gerak paling lincah & berpengetahuan luas!
          </p>
        </div>

        <button
          onClick={onPlayNow}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 self-start sm:self-auto transition"
        >
          <Play className="w-4 h-4 fill-white" />
          Tantang Skor Sekarang
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'mudah', label: 'Mudah' },
            { id: 'sedang', label: 'Sedang' },
            { id: 'sulit', label: 'Sulit' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterDifficulty(item.id as DifficultyLevel | 'all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                filterDifficulty === item.id
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama pemain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Top 3 Podium (If available) */}
      {topThree.length >= 3 && !searchQuery && (
        <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-6 pb-2 items-end">
          {/* Rank 2 (Silver) */}
          <div className="bg-slate-900/90 border border-slate-700/60 rounded-3xl p-4 sm:p-6 text-center shadow-lg relative order-1">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-400/20 border-2 border-slate-400 flex items-center justify-center mx-auto text-2xl sm:text-3xl shadow-md">
              {topThree[1].playerAvatar}
            </div>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-900 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
              <Medal className="w-3 h-3" /> #2 Perak
            </div>
            <div className="font-extrabold text-white text-sm sm:text-base mt-3 truncate">
              {topThree[1].playerName}
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-200 mt-1">
              {topThree[1].score.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1">
              {topThree[1].accuracy}% Akurasi
            </div>
          </div>

          {/* Rank 1 (Gold - Center & Elevated) */}
          <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-7 text-center shadow-2xl relative order-2 -translate-y-3 sm:-translate-y-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-3xl sm:text-4xl shadow-xl shadow-amber-500/20">
              {topThree[0].playerAvatar}
            </div>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> #1 Emas
            </div>
            <div className="font-black text-white text-base sm:text-lg mt-3 truncate">
              {topThree[0].playerName}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {topThree[0].score.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-400 font-bold mt-1">
              {topThree[0].accuracy}% Akurasi &bull; {topThree[0].maxStreak}x 🔥
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="bg-slate-900/90 border border-slate-700/60 rounded-3xl p-4 sm:p-6 text-center shadow-lg relative order-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-800/20 border-2 border-amber-700 flex items-center justify-center mx-auto text-2xl sm:text-3xl shadow-md">
              {topThree[2].playerAvatar}
            </div>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-700 text-amber-100 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
              <Medal className="w-3 h-3" /> #3 Perunggu
            </div>
            <div className="font-extrabold text-white text-sm sm:text-base mt-3 truncate">
              {topThree[2].playerName}
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              {topThree[2].score.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1">
              {topThree[2].accuracy}% Akurasi
            </div>
          </div>
        </div>
      )}

      {/* Main Ranking Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 text-center w-16">Peringkat</th>
                <th className="py-3 px-4">Pemain</th>
                <th className="py-3 px-4">Tingkat</th>
                <th className="py-3 px-4 text-center">Akurasi</th>
                <th className="py-3 px-4 text-center">Max Combo</th>
                <th className="py-3 px-4 text-right">Skor Total</th>
                <th className="py-3 px-4 text-right hidden sm:table-cell">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Belum ada data skor yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center font-black">
                        {rank === 1 ? (
                          <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 inline-flex items-center justify-center text-xs shadow">1</span>
                        ) : rank === 2 ? (
                          <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-900 inline-flex items-center justify-center text-xs shadow">2</span>
                        ) : rank === 3 ? (
                          <span className="w-7 h-7 rounded-full bg-amber-700 text-white inline-flex items-center justify-center text-xs shadow">3</span>
                        ) : (
                          <span className="text-slate-400 text-xs">#{rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                            {entry.playerAvatar || '👤'}
                          </span>
                          <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {entry.playerName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                          {entry.difficulty}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400 text-xs">
                          <Target className="w-3 h-3" />
                          {entry.accuracy}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-400 text-xs">
                          <Flame className="w-3 h-3 fill-amber-400" />
                          {entry.maxStreak}x
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-white text-base">
                        {entry.score.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-slate-500 hidden sm:table-cell">
                        {entry.date}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
