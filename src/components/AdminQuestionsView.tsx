import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  FileText,
  RotateCcw,
  Search,
  AlertCircle,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { Question, DifficultyLevel } from '../types';
import { StorageService } from '../services/storage';
import { CSVService, CSVParseResult } from '../services/csvParser';

// Official Admin Credentials requested by User
const ADMIN_CREDENTIALS = {
  email: 'andika.yuliananta@gmail.com',
  password: 'Andika06071996'
};

const ADMIN_STORAGE_KEY = 'gerakpintar_admin_auth_v1';

export const AdminQuestionsView = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Questions State
  const [questions, setQuestions] = useState<Question[]>(() => StorageService.getQuestions());
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterDifficulty, setFilterDifficulty] = useState<DifficultyLevel | 'all'>('all');

  // Add Question Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStatement, setNewStatement] = useState('');
  const [newIsCorrect, setNewIsCorrect] = useState<boolean>(true);
  const [newCategory, setNewCategory] = useState<string>('Sains & Alam');
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>('sedang');
  const [newExplanation, setNewExplanation] = useState('');
  const [formError, setFormError] = useState('');

  // Bulk Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<CSVParseResult | null>(null);
  const [bulkFileName, setBulkFileName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = [
    'Sains & Alam',
    'Sejarah & Budaya',
    'Teknologi & Komputer',
    'Matematika & Logika',
    'Kesehatan & Tubuh',
    'Pengetahuan Umum'
  ];

  // Sync auth state
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
  }, [isAuthenticated]);

  // Handle Login Submit
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const trimmedEmail = loginEmail.trim().toLowerCase();
    const trimmedPassword = loginPassword.trim();

    if (
      trimmedEmail === ADMIN_CREDENTIALS.email.toLowerCase() &&
      trimmedPassword === ADMIN_CREDENTIALS.password
    ) {
      setIsAuthenticated(true);
      setLoginPassword('');
      showMessage('Selamat datang kembali, Administrator Andika!', 'success');
    } else {
      setAuthError('Email atau Password administrator salah. Pastikan kredensial benar.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    if (confirm('Keluar dari sesi Administrator?')) {
      setIsAuthenticated(false);
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      showMessage('Anda telah keluar dari sesi Admin.', 'success');
    }
  };

  // Quick autofill for convenience
  const handleQuickFill = () => {
    setLoginEmail(ADMIN_CREDENTIALS.email);
    setLoginPassword(ADMIN_CREDENTIALS.password);
  };

  // Filtered list
  const filteredQuestions = questions.filter((q) => {
    const matchSearch = q.statement.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'Semua' || q.category === filterCategory;
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    return matchSearch && matchCategory && matchDiff;
  });

  // Handle single question creation
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatement.trim() || newStatement.trim().length < 5) {
      setFormError('Pernyataan soal harus diisi minimal 5 karakter.');
      return;
    }

    const created = StorageService.addQuestion({
      statement: newStatement.trim(),
      isCorrect: newIsCorrect,
      category: newCategory,
      difficulty: newDifficulty,
      explanation: newExplanation.trim() || (newIsCorrect ? 'Pernyataan ini adalah Benar.' : 'Pernyataan ini adalah Salah.')
    });

    setQuestions((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
    setNewStatement('');
    setNewExplanation('');
    setFormError('');
    showMessage('Soal baru berhasil ditambahkan ke bank soal!', 'success');
  };

  // Handle single question deletion
  const handleDeleteQuestion = (id: string) => {
    if (confirm('Yakin ingin menghapus soal ini?')) {
      StorageService.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      showMessage('Soal berhasil dihapus.', 'success');
    }
  };

  // Handle CSV file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setIsUploading(true);

    try {
      const text = await file.text();
      const result = await CSVService.parseQuestionsCSV(text);
      setBulkResult(result);
    } catch {
      showMessage('Gagal membaca file CSV.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Confirm bulk import
  const handleConfirmBulkImport = () => {
    if (!bulkResult || bulkResult.validQuestions.length === 0) return;

    const count = StorageService.bulkAddQuestions(bulkResult.validQuestions);
    setQuestions(StorageService.getQuestions());
    setBulkResult(null);
    setBulkFileName('');
    showMessage(`Berhasil mengimpor ${count} soal baru secara massal!`, 'success');
  };

  // Reset to default questions
  const handleResetDefaults = () => {
    if (confirm('Kembalikan bank soal ke paket default bawaan aplikasi?')) {
      StorageService.resetQuestionsToDefault();
      setQuestions(StorageService.getQuestions());
      showMessage('Bank soal telah dikembalikan ke kondisi default.', 'success');
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // ==========================================
  // RENDER: LOGIN GATE IF NOT AUTHENTICATED
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 text-indigo-400 shadow-lg shadow-indigo-500/10">
            <Lock className="w-8 h-8" />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-white">Login Portal Administrator</h1>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Halaman kelola soal dilindungi khusus untuk Administrator resmi aplikasi.
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Administrator:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="andika.yuliananta@gmail.com"
                  required
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password:
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Masuk ke Portal Admin
            </button>
          </form>

          {/* Quick Fill Credentials Helper */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
            >
              Klik di sini untuk mengisi otomatis kredensial Pak Andika
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: AUTHENTICATED ADMIN PORTAL
  // ==========================================
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header & Logged-in Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Admin Terautentikasi
            </span>
            <span className="text-xs text-slate-400">
              Masuk sebagai: <strong className="text-white">{ADMIN_CREDENTIALS.email}</strong>
            </span>
          </div>
          <h1 className="text-3xl font-black text-white">Manajemen Bank Soal</h1>
          <p className="text-slate-400 text-sm mt-1">
            Kelola, tambah, atau unggah soal kuis Benar & Salah secara massal via file CSV/Excel.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Soal Baru
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition"
          >
            <Upload className="w-4 h-4" />
            Unggah Massal (CSV)
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv,text/csv"
            className="hidden"
          />

          <button
            onClick={() => CSVService.exportQuestionsToCSV(questions)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
            title="Ekspor Seluruh Bank Soal ke CSV"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition"
            title="Keluar dari Akun Admin"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          {statusMessage.text}
        </div>
      )}

      {/* Bulk Upload Preview Box */}
      {bulkResult && (
        <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Pratinjau Impor Massal File: {bulkFileName}
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {bulkResult.validQuestions.length} Soal Valid Terdeteksi
                {bulkResult.errors.length > 0 && ` (${bulkResult.errors.length} Baris Bermasalah)`}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmBulkImport}
                disabled={bulkResult.validQuestions.length === 0}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Simpan {bulkResult.validQuestions.length} Soal ke Bank Data
              </button>
              <button
                onClick={() => setBulkResult(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Batal
              </button>
            </div>
          </div>

          {/* Errors list if any */}
          {bulkResult.errors.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-xs text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Peringatan Validasi Baris:
              </div>
              {bulkResult.errors.slice(0, 4).map((err, i) => (
                <div key={i} className="text-[11px] opacity-90">• {err}</div>
              ))}
              {bulkResult.errors.length > 4 && (
                <div className="text-[10px] text-rose-400">...dan {bulkResult.errors.length - 4} baris lainnya.</div>
              )}
            </div>
          )}

          {/* Preview rows */}
          <div className="mt-4 overflow-x-auto max-h-56">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[10px] uppercase text-slate-400">
                <tr>
                  <th className="p-2">Pertanyaan</th>
                  <th className="p-2">Kunci</th>
                  <th className="p-2">Kategori</th>
                  <th className="p-2">Kesulitan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {bulkResult.validQuestions.slice(0, 5).map((q, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-medium max-w-sm truncate">{q.statement}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded font-bold ${q.isCorrect ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-300'}`}>
                        {q.isCorrect ? 'BENAR' : 'SALAH'}
                      </span>
                    </td>
                    <td className="p-2 text-slate-400">{q.category}</td>
                    <td className="p-2 capitalize">{q.difficulty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Template Download & Instruction Box */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white">Butuh Format File CSV atau Excel?</div>
            <div className="text-slate-400 text-[11px]">
              Gunakan template resmi dengan kolom: <code>pertanyaan, jawaban (BENAR/SALAH), kategori, kesulitan, penjelasan</code>
            </div>
          </div>
        </div>

        <button
          onClick={() => CSVService.downloadSampleCSVFile()}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-emerald-400 font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Unduh Template CSV
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari teks soal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="Semua">Semua Kategori ({questions.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value as DifficultyLevel | 'all')}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="all">Semua Kesulitan</option>
            <option value="mudah">Mudah</option>
            <option value="sedang">Sedang</option>
            <option value="sulit">Sulit</option>
          </select>
        </div>
      </div>

      {/* Questions Bank Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300">
            Menampilkan {filteredQuestions.length} dari {questions.length} Total Soal
          </div>
          <button
            onClick={handleResetDefaults}
            className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            Reset ke Default
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Pernyataan Soal</th>
                <th className="py-3 px-4 text-center w-24">Kunci Jawaban</th>
                <th className="py-3 px-4 w-36">Kategori</th>
                <th className="py-3 px-4 text-center w-24">Tingkat</th>
                <th className="py-3 px-4 text-right w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Tidak ada soal yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{q.statement}</div>
                      {q.explanation && (
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 italic">
                          💡 {q.explanation}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-[10px] ${
                          q.isCorrect
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {q.isCorrect ? 'BENAR' : 'SALAH'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-medium">{q.category}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold">
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                        title="Hapus Soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD QUESTION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Tambah Soal Kuis Baru
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Pernyataan Soal: *
                </label>
                <textarea
                  rows={3}
                  value={newStatement}
                  onChange={(e) => setNewStatement(e.target.value)}
                  placeholder="Contoh: Planet Jupiter merupakan planet terbesar di tata surya kita."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Kunci Jawaban (Benar / Salah) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Kunci Jawaban yang Benar: *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewIsCorrect(false)}
                    className={`p-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition ${
                      !newIsCorrect
                        ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    SALAH (Palsu)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewIsCorrect(true)}
                    className={`p-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition ${
                      newIsCorrect
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    BENAR (Fakta)
                  </button>
                </div>
              </div>

              {/* Category & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Kategori:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Tingkat Kesulitan:
                  </label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="mudah">Mudah</option>
                    <option value="sedang">Sedang</option>
                    <option value="sulit">Sulit</option>
                  </select>
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Penjelasan Edukatif:
                </label>
                <textarea
                  rows={2}
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  placeholder="Beri penjelasan singkat mengapa pernyataan tersebut Benar atau Salah..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
