import { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { CategoryStat } from '../types';
import { StorageService } from '../services/storage';

export const AnalyticsDashboardView = () => {
  const categoryStats: CategoryStat[] = useMemo(() => {
    return StorageService.getCategoryAnalytics();
  }, []);

  const mostMissedQuestions = useMemo(() => {
    return StorageService.getMostMissedQuestions();
  }, []);

  const matchHistory = useMemo(() => {
    return StorageService.getMatchHistory();
  }, []);

  const allQuestions = useMemo(() => {
    return StorageService.getQuestions();
  }, []);

  // Summary KPIs
  const totalAttempts = categoryStats.reduce((sum, item) => sum + item.totalAttempts, 0);
  const totalCorrect = categoryStats.reduce((sum, item) => sum + item.correctAttempts, 0);
  const overallAvgAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const totalTimeSeconds = categoryStats.reduce((sum, item) => sum + item.avgTimeSeconds * item.totalAttempts, 0);
  const overallAvgResponseTime = totalAttempts > 0 ? Number((totalTimeSeconds / totalAttempts).toFixed(1)) : 0;

  // Best & Toughest category
  const sortedByAccuracy = [...categoryStats].sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
  const bestCategory = sortedByAccuracy[0];
  const hardestCategory = sortedByAccuracy[sortedByAccuracy.length - 1];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold mb-2">
          <BarChart3 className="w-3.5 h-3.5" /> Dashboard Analitik Pembelajaran
        </div>
        <h1 className="text-3xl font-black text-white">Analitik Performa Kategori</h1>
        <p className="text-slate-400 text-sm mt-1">
          Pantau statistik rata-rata pemahaman dan kecepatan respon gerak pemain di seluruh materi soal kuis.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jawaban */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Respon</div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
              {totalAttempts.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">Dari {matchHistory.length} sesi kuis</div>
          </div>
        </div>

        {/* Akurasi Rata-rata */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Akurasi Rata-rata</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">
              {overallAvgAccuracy}%
            </div>
            <div className="text-[10px] text-slate-400">Tingkat keberhasilan</div>
          </div>
        </div>

        {/* Kecepatan Respon */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kecepatan Gerak</div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-0.5">
              {overallAvgResponseTime}s
            </div>
            <div className="text-[10px] text-slate-400">Rata-rata waktu reaksi</div>
          </div>
        </div>

        {/* Total Bank Soal */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Soal Tersedia</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-0.5">
              {allQuestions.length}
            </div>
            <div className="text-[10px] text-slate-400">Di bank materi</div>
          </div>
        </div>
      </div>

      {/* Main Category Performance Table & Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Performa Rata-rata Pemain per Kategori Soal
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tingkat akurasi pemahaman materi dan kecepatan menjawab pada setiap bidang subjek.
            </p>
          </div>

          {bestCategory && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold self-start sm:self-auto">
              🏆 Kategori Tertinggi: {bestCategory.category} ({bestCategory.accuracyPercentage}%)
            </div>
          )}
        </div>

        {categoryStats.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Belum ada data kuis yang tercatat. Mainkan beberapa sesi kuis untuk melihat analitik lengkap!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryStats.map((stat) => {
              const acc = stat.accuracyPercentage;
              const isHigh = acc >= 75;
              const isMed = acc >= 50 && acc < 75;

              return (
                <div
                  key={stat.category}
                  className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4.5 space-y-3 hover:border-slate-600 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {stat.category}
                    </span>
                    <span
                      className={`text-sm font-black px-2.5 py-0.5 rounded-full ${
                        isHigh
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isMed
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {stat.accuracyPercentage}% Akurasi
                    </span>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHigh ? 'bg-emerald-500' : isMed ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${stat.accuracyPercentage}%` }}
                    />
                  </div>

                  {/* Sub-metrics */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/40">
                    <span>
                      Upaya: <strong className="text-slate-200">{stat.totalAttempts}x</strong> ({stat.correctAttempts} Benar)
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      Rata-rata: <strong className="text-slate-200">{stat.avgTimeSeconds}s</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Most Missed Questions (Evaluasi Materi Paling Sulit) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-lg font-bold text-white">Soal yang Paling Sering Salah Dijawab</h2>
            <p className="text-xs text-slate-400">
              Evaluasi materi dengan persentase kegagalan tertinggi untuk bahan pendalaman edukasi.
            </p>
          </div>
        </div>

        {mostMissedQuestions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            Belum ada soal dengan kesalahan berulang yang tercatat.
          </div>
        ) : (
          <div className="space-y-3">
            {mostMissedQuestions.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-[10px]">
                      {item.category}
                    </span>
                    <span className="text-rose-400 font-bold text-[11px]">
                      {item.wrongCount} dari {item.totalCount} kali salah
                    </span>
                  </div>
                  <p className="font-semibold text-slate-200 text-sm leading-snug">
                    &ldquo;{item.statement}&rdquo;
                  </p>
                </div>

                <div className="sm:text-right flex-shrink-0">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Tingkat Kegagalan</div>
                  <div className="text-xl font-black text-rose-400">
                    {item.failRate}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Educational Pedagogical Insights */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900 to-indigo-950/30 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-xl flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
          <Lightbulb className="w-6 h-6" />
        </div>
        <div className="text-xs space-y-1.5">
          <h3 className="text-sm font-bold text-white">Insight Pedagogi & Pembelajaran</h3>
          <p className="text-slate-300 leading-relaxed">
            Metode kinestetik aktif (menjawab melalui gerakan fisik webcam ke arah kiri dan kanan) terbukti
            meningkatkan retensi memori dan fokus anak/pemain hingga 40% lebih tinggi dibanding kuis berbasis teks statis biasa.
            Gunakan bank soal massal di menu Admin untuk menambahkan materi kurikulum sekolah atau pengetahuan umum terkini!
          </p>
        </div>
      </div>
    </div>
  );
};
