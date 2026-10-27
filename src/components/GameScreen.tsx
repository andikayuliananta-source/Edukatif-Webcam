import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  CameraOff,
  Flame,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Play,
  Award,
  Clock
} from 'lucide-react';
import {
  Question,
  DifficultyLevel,
  PlayerProfile,
  GameSessionResult,
  PlayerAnswerRecord
} from '../types';
import { sound } from '../services/sound';
import { StorageService } from '../services/storage';
import { useWebcamTracker } from '../hooks/useWebcamTracker';

interface GameScreenProps {
  player: PlayerProfile;
  onFinishGame: () => void;
  onViewLeaderboard: () => void;
}

export const GameScreen = ({ player, onFinishGame, onViewLeaderboard }: GameScreenProps) => {
  // Game Setup State
  const [gameState, setGameState] = useState<'lobby' | 'countdown' | 'playing' | 'revealing' | 'finished'>('lobby');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('sedang');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [questionCount, setQuestionCount] = useState<number>(8);

  // Active Game State
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [maxTime, setMaxTime] = useState<number>(10);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  // Answer feedback
  const [lastAnswer, setLastAnswer] = useState<{
    playerChoice: boolean;
    isRight: boolean;
    pointsEarned: number;
    explanation: string;
  } | null>(null);

  const [floatingScores, setFloatingScores] = useState<{ id: number; text: string; isPositive: boolean }[]>([]);
  const [answerHistory, setAnswerHistory] = useState<PlayerAnswerRecord[]>([]);

  // Webcam Settings
  const [sensitivity, setSensitivity] = useState<'rendah' | 'sedang' | 'tinggi'>('sedang');
  const [showWebcamSettings, setShowWebcamSettings] = useState<boolean>(false);
  const [lobbyCountdown, setLobbyCountdown] = useState<number>(3);

  // Difficulty configurations
  const getDifficultyConfig = useCallback((diff: DifficultyLevel) => {
    switch (diff) {
      case 'mudah':
        return { time: 14, multiplier: 1.0, holdTime: 650, basePoints: 100, label: 'Mudah' };
      case 'sedang':
        return { time: 10, multiplier: 1.5, holdTime: 500, basePoints: 150, label: 'Sedang' };
      case 'sulit':
        return { time: 6, multiplier: 2.0, holdTime: 380, basePoints: 220, label: 'Sulit' };
    }
  }, []);

  // Forward declaration of submitAnswer ref to avoid stale closures
  const submitAnswerRef = useRef<(answer: boolean, timedOut?: boolean) => void>(() => {});

  // Webcam Tracker Hook
  const {
    videoRef,
    canvasRef,
    isCameraActive,
    cameraError,
    motionState,
    startCamera,
    stopCamera,
    calibrateBaseline,
    resetTrigger
  } = useWebcamTracker({
    enabled: gameState === 'playing',
    sensitivity,
    holdDurationMs: getDifficultyConfig(difficulty).holdTime,
    onConfirmAnswer: (confirmedChoice) => {
      if (gameState === 'playing') {
        submitAnswerRef.current(confirmedChoice, false);
      }
    }
  });

  // Submit Answer Logic
  const handleAnswerSubmit = useCallback((playerChoice: boolean, timedOut = false) => {
    if (gameState !== 'playing') return;

    const currentQ = activeQuestions[currentIdx];
    if (!currentQ) return;

    const timeSpent = Math.max(0.5, Number(((performance.now() - questionStartTime) / 1000).toFixed(1)));
    const isRight = !timedOut && playerChoice === currentQ.isCorrect;
    const config = getDifficultyConfig(difficulty);

    let pointsEarned = 0;
    let newStreak = streak;

    if (isRight) {
      newStreak = streak + 1;
      const speedBonus = Math.max(0, Math.round((timeLeft / maxTime) * 60));
      const streakBonus = Math.min(2.5, 1 + newStreak * 0.15);
      pointsEarned = Math.round((config.basePoints + speedBonus) * streakBonus);

      setScore((prev) => prev + pointsEarned);
      setStreak(newStreak);
      if (newStreak > maxStreak) {
        setMaxStreak(newStreak);
      }

      // Visual and Sound effects
      sound.playCorrect();
      if (newStreak >= 3) {
        sound.playStreak();
      }

      // Confetti burst
      confetti({
        particleCount: 50 + Math.min(60, newStreak * 10),
        spread: 70,
        origin: { y: 0.6 }
      });

      // Floating score badge
      const floatId = Date.now();
      setFloatingScores((prev) => [
        ...prev,
        {
          id: floatId,
          text: `+${pointsEarned} Poin! ${newStreak > 1 ? `(${newStreak}x Streak 🔥)` : ''}`,
          isPositive: true
        }
      ]);
      setTimeout(() => {
        setFloatingScores((prev) => prev.filter((item) => item.id !== floatId));
      }, 1500);

    } else {
      newStreak = 0;
      setStreak(0);
      sound.playWrong();

      const floatId = Date.now();
      setFloatingScores((prev) => [
        ...prev,
        {
          id: floatId,
          text: timedOut ? 'Waktu Habis! ⌛' : 'Jawaban Kurang Tepat ❌',
          isPositive: false
        }
      ]);
      setTimeout(() => {
        setFloatingScores((prev) => prev.filter((item) => item.id !== floatId));
      }, 1500);
    }

    // Save answer record
    setAnswerHistory((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        statement: currentQ.statement,
        category: currentQ.category,
        playerAnswer: timedOut ? !currentQ.isCorrect : playerChoice,
        correctAnswer: currentQ.isCorrect,
        isRight,
        timeSpentSeconds: timeSpent
      }
    ]);

    // Show explanation card
    setLastAnswer({
      playerChoice: timedOut ? false : playerChoice,
      isRight,
      pointsEarned,
      explanation: currentQ.explanation
    });

    setGameState('revealing');

    // Auto proceed to next question after explanation
    const revealTimeout = setTimeout(() => {
      proceedToNextQuestion();
    }, 2800);

    return () => clearTimeout(revealTimeout);
  }, [
    gameState,
    activeQuestions,
    currentIdx,
    questionStartTime,
    difficulty,
    getDifficultyConfig,
    streak,
    timeLeft,
    maxTime,
    maxStreak
  ]);

  // Keep ref updated
  useEffect(() => {
    submitAnswerRef.current = handleAnswerSubmit;
  }, [handleAnswerSubmit]);

  // Move to next question or end game
  const proceedToNextQuestion = useCallback(() => {
    setLastAnswer(null);
    resetTrigger();

    if (currentIdx + 1 < activeQuestions.length) {
      setCurrentIdx((prev) => prev + 1);
      const config = getDifficultyConfig(difficulty);
      setTimeLeft(config.time);
      setMaxTime(config.time);
      setQuestionStartTime(performance.now());
      setGameState('playing');
    } else {
      // Game Complete!
      sound.playGameOver();
      setGameState('finished');
    }
  }, [currentIdx, activeQuestions.length, difficulty, getDifficultyConfig, resetTrigger]);

  // Save session when finished
  useEffect(() => {
    if (gameState === 'finished' && answerHistory.length > 0) {
      const correctCount = answerHistory.filter((a) => a.isRight).length;
      const accuracy = Number(((correctCount / answerHistory.length) * 100).toFixed(1));

      const sessionResult: GameSessionResult = {
        id: 'session_' + Date.now(),
        playerId: player.id,
        playerName: player.name,
        score,
        maxStreak,
        totalQuestions: answerHistory.length,
        correctCount,
        accuracy,
        difficulty,
        categoryFilter: selectedCategory,
        timestamp: Date.now(),
        answers: answerHistory
      };

      StorageService.recordGameSession(sessionResult);
    }
  }, [gameState, answerHistory, player, score, maxStreak, difficulty, selectedCategory]);

  // Countdown timer for question
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Time out!
          handleAnswerSubmit(false, true);
          return 0;
        }

        // Metronome audio
        if (prev <= 4) {
          sound.playTick(true);
        } else if (prev <= 6) {
          sound.playTick(false);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, handleAnswerSubmit]);

  // Keyboard shortcut listener (Accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        // Left is SALAH (false)
        handleAnswerSubmit(false, false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        // Right is BENAR (true)
        handleAnswerSubmit(true, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleAnswerSubmit]);

  // Start game session flow
  const startGame = () => {
    const allQuestions = StorageService.getQuestions();
    let filtered = allQuestions;

    if (selectedCategory !== 'Semua') {
      filtered = filtered.filter((q) => q.category === selectedCategory);
    }

    // Match difficulty or shuffle fallback
    let matched = filtered.filter((q) => q.difficulty === difficulty);
    if (matched.length < questionCount) {
      matched = filtered;
    }

    // Shuffle
    const shuffled = [...matched].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, questionCount);

    setActiveQuestions(selected);
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setAnswerHistory([]);
    setLastAnswer(null);

    const config = getDifficultyConfig(difficulty);
    setTimeLeft(config.time);
    setMaxTime(config.time);

    // Initial countdown 3, 2, 1
    setLobbyCountdown(3);
    setGameState('countdown');

    const countdownTimer = setInterval(() => {
      setLobbyCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          setGameState('playing');
          setGameStartTime(performance.now());
          setQuestionStartTime(performance.now());
          startCamera();
          return 0;
        }
        sound.playTick(false);
        return prev - 1;
      });
    }, 900);
  };

  const currentQ = activeQuestions[currentIdx];

  // ==========================================
  // RENDER: LOBBY / SETUP SCREEN
  // ==========================================
  if (gameState === 'lobby') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Kontrol Gerakan Webcam Cerdas
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Kuis Interaktif <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Benar & Salah
              </span>
            </h1>

            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
              Jawab soal edukasi dengan gerakan tubuh atau tanganmu di depan webcam!
            </p>

            {/* Gesture Legend Cards */}
            <div className="grid grid-cols-2 gap-4 mt-8 text-left">
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-2xl flex-shrink-0">
                  👈
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-rose-300 font-bold text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    LOMPAT KIRI
                  </div>
                  <div className="text-white font-extrabold text-base">SALAH ❌</div>
                  <div className="text-[11px] text-slate-400">Geser atau angkat tangan ke sisi kiri</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-2xl flex-shrink-0">
                  👉
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-sm">
                    LOMPAT KANAN
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="text-white font-extrabold text-base">BENAR ✔️</div>
                  <div className="text-[11px] text-slate-400">Geser atau angkat tangan ke sisi kanan</div>
                </div>
              </div>
            </div>

            {/* Settings Selection */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-6">
              {/* Difficulty selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                  Pilih Tingkat Kesulitan
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['mudah', 'sedang', 'sulit'] as DifficultyLevel[]).map((level) => {
                    const cfg = getDifficultyConfig(level);
                    const isSelected = difficulty === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/25 scale-[1.02]'
                            : 'bg-slate-800/70 text-slate-300 border-slate-700/80 hover:bg-slate-750'
                        }`}
                      >
                        <div className="text-sm font-black capitalize">{cfg.label}</div>
                        <div className="text-[11px] opacity-80 mt-0.5">{cfg.time} detik • {cfg.multiplier}x Poin</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category & Question Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Kategori Soal
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Semua">Semua Kategori (Acak)</option>
                    <option value="Sains & Alam">Sains & Alam</option>
                    <option value="Sejarah & Budaya">Sejarah & Budaya</option>
                    <option value="Teknologi & Komputer">Teknologi & Komputer</option>
                    <option value="Matematika & Logika">Matematika & Logika</option>
                    <option value="Kesehatan & Tubuh">Kesehatan & Tubuh</option>
                    <option value="Pengetahuan Umum">Pengetahuan Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Jumlah Soal
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 8, 12].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuestionCount(num)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          questionCount === num
                            ? 'bg-slate-700 text-emerald-400 border-emerald-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {num} Soal
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={startGame}
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mx-auto"
                >
                  <Play className="w-6 h-6 fill-white" />
                  Mulai Kuis Sekarang!
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Webcam akan otomatis aktif saat permainan dimulai.</span>
                <span className="text-slate-500">•</span>
                <span>(Keyboard ⬅️ dan ➡️ tetap tersedia sebagai alternatif)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: COUNTDOWN 3, 2, 1
  // ==========================================
  if (gameState === 'countdown') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-3">
            Bersiap di Depan Kamera!
          </p>
          <div className="w-32 h-32 rounded-full bg-emerald-500/20 border-4 border-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 animate-pulse">
            <span className="text-7xl font-black text-emerald-400">{lobbyCountdown}</span>
          </div>
          <p className="mt-6 text-slate-300 font-medium">
            Ingat: <span className="text-rose-400 font-bold">Kiri = Salah</span> &bull;{' '}
            <span className="text-emerald-400 font-bold">Kanan = Benar</span>
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: FINISHED / RESULT SCREEN
  // ==========================================
  if (gameState === 'finished') {
    const totalAns = answerHistory.length;
    const correctCount = answerHistory.filter((a) => a.isRight).length;
    const accuracy = totalAns > 0 ? Math.round((correctCount / totalAns) * 100) : 0;

    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-lg shadow-amber-500/20">
            <Award className="w-10 h-10" />
          </div>

          <h2 className="text-3xl font-black text-white">Kuis Selesai!</h2>
          <p className="text-slate-400 text-sm mt-1">
            Kerja bagus, <span className="text-emerald-400 font-bold">{player.name}</span>! Rekor barumu telah tercatat.
          </p>

          {/* Big Score Card */}
          <div className="my-6 p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-850 border border-slate-700/60 max-w-md mx-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Skor Didapatkan</div>
            <div className="text-5xl font-black text-emerald-400 mt-1 tracking-tight">
              {score.toLocaleString()}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold mt-2">
              <Zap className="w-3.5 h-3.5" />
              Tingkat: <span className="capitalize">{difficulty}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] text-slate-400 font-medium">Akurasi</div>
              <div className="text-2xl font-black text-white mt-0.5">{accuracy}%</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">{correctCount}/{totalAns} Benar</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] text-slate-400 font-medium">Streak Terbaik</div>
              <div className="text-2xl font-black text-amber-400 mt-0.5">
                {maxStreak}x 🔥
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Beruntun</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] text-slate-400 font-medium">Waktu Main</div>
              <div className="text-2xl font-black text-cyan-400 mt-0.5">
                {Math.round((performance.now() - gameStartTime) / 1000)}s
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Total Durasi</div>
            </div>
          </div>

          {/* Question Breakdown Accordion */}
          <div className="text-left mb-8 max-w-xl mx-auto">
            <h3 className="text-sm font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              Rincian Jawaban Soal:
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {answerHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                    item.isRight
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <span className="font-bold">{idx + 1}.</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-200 leading-snug">{item.statement}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                      <span>Jawaban Benar: <strong className="text-white">{item.correctAnswer ? 'BENAR' : 'SALAH'}</strong></span>
                      <span>Respon: <strong>{item.playerAnswer ? 'BENAR' : 'SALAH'}</strong></span>
                      <span className="text-slate-400">({item.timeSpentSeconds}s)</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {item.isRight ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setGameState('lobby');
                stopCamera();
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Main Lagi
            </button>

            <button
              onClick={onViewLeaderboard}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <Award className="w-4 h-4 text-amber-400" />
              Lihat Peringkat Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: PLAYING & REVEALING HUD
  // ==========================================
  const progressPercentage = ((currentIdx + 1) / activeQuestions.length) * 100;
  const timePercentage = (timeLeft / maxTime) * 100;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Top Header Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-2xl shadow-md">
        {/* Question Counter & Progress */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-white">
            {currentIdx + 1}/{activeQuestions.length}
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {currentQ?.category || 'Kategori'}
            </div>
            <div className="w-28 sm:w-36 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Floating animated points badges */}
        <div className="relative flex items-center gap-4">
          {floatingScores.map((float) => (
            <div
              key={float.id}
              className={`absolute -top-7 right-0 text-xs sm:text-sm font-black px-3 py-1 rounded-full shadow-lg pointer-events-none animate-bounce z-50 whitespace-nowrap ${
                float.isPositive
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/50'
                  : 'bg-rose-500 text-white shadow-rose-500/50'
              }`}
            >
              {float.text}
            </div>
          ))}

          {/* Current Streak */}
          {streak > 1 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black animate-pulse">
              <Flame className="w-4 h-4 fill-amber-400" />
              {streak}x Combo!
            </div>
          )}

          {/* Current Score Display */}
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Skor</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 leading-tight">
              {score.toLocaleString()}
            </div>
          </div>

          {/* Settings button */}
          <button
            onClick={() => setShowWebcamSettings(!showWebcamSettings)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition"
            title="Pengaturan Webcam & Sensitivitas"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            timeLeft <= 3 ? 'bg-rose-500 animate-pulse' : timeLeft <= 5 ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${timePercentage}%` }}
        />
      </div>

      {/* Main Interactive Stage: Webcam Canvas & Zone Overlays */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl aspect-[4/3] sm:aspect-[16/9] max-h-[500px] w-full flex items-center justify-center">
        {/* Mirrored Video element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-70"
        />

        {/* Hidden Canvas for Frame Differencing Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera Permission Error Overlay */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/90 z-30 flex flex-col items-center justify-center p-6 text-center">
            <CameraOff className="w-12 h-12 text-rose-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Akses Kamera Diperlukan</h3>
            <p className="text-slate-400 text-xs max-w-sm mb-4">
              Izinkan akses webcam agar permainan bisa mendeteksi gerakan lompatanmu secara real-time.
            </p>
            <div className="flex gap-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                Coba Sambungkan Ulang
              </button>
            </div>
            <p className="text-[11px] text-amber-300 mt-4">
              Tip: Kamu juga bisa menggunakan tombol keyboard ⬅️ (Salah) dan ➡️ (Benar).
            </p>
          </div>
        )}

        {/* Motion Reticle & Heat Centroid Indicator */}
        {isCameraActive && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75 ease-out"
            style={{
              left: `${motionState.centroidX * 100}%`,
              top: `${motionState.centroidY * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400 bg-cyan-400/20 animate-ping absolute" />
            <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/80 border border-white" />
          </div>
        )}

        {/* Interactive Zone Overlays */}
        {/* LEFT ZONE: SALAH */}
        <div
          onClick={() => handleAnswerSubmit(false, false)}
          className={`absolute top-0 bottom-0 left-0 w-[42%] z-10 flex flex-col justify-between p-4 sm:p-6 transition-all duration-150 cursor-pointer select-none ${
            motionState.zone === 'left'
              ? 'bg-rose-600/35 border-r-4 border-rose-500 shadow-[inset_0_0_50px_rgba(244,63,94,0.4)]'
              : 'bg-rose-950/20 hover:bg-rose-950/30 border-r border-rose-500/20'
          }`}
        >
          {/* Top Label */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-rose-600/80 text-white text-[11px] sm:text-xs font-black shadow flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              LOMPAT KIRI
            </span>
          </div>

          {/* Center Graphic */}
          <div className="text-center my-auto">
            <div
              className={`w-16 h-16 sm:w-24 sm:h-24 rounded-2xl mx-auto flex items-center justify-center font-black transition-transform duration-150 ${
                motionState.zone === 'left'
                  ? 'bg-rose-600 text-white scale-110 shadow-2xl shadow-rose-600/50'
                  : 'bg-rose-900/60 border border-rose-500/40 text-rose-300'
              }`}
            >
              <span className="text-3xl sm:text-5xl">❌</span>
            </div>
            <div className="mt-2 font-black text-xl sm:text-3xl text-rose-300 tracking-tight drop-shadow-md">
              SALAH
            </div>

            {/* Dwell Progress Bar */}
            {motionState.zone === 'left' && (
              <div className="w-32 sm:w-44 h-3 bg-slate-900/80 rounded-full mx-auto mt-3 overflow-hidden border border-rose-400/60 p-0.5">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-75"
                  style={{ width: `${motionState.zoneHoldProgress * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="text-[10px] sm:text-xs text-rose-300/80 font-medium">
            Tahan posisi di kiri untuk mengonfirmasi
          </div>
        </div>

        {/* CENTER NEUTRAL ZONE */}
        <div className="absolute top-0 bottom-0 left-[42%] right-[42%] z-10 pointer-events-none flex flex-col items-center justify-between py-4 text-center">
          <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-[10px] font-bold text-slate-300 flex items-center gap-1 backdrop-blur-sm">
            <Clock className="w-3 h-3 text-amber-400" />
            Sisa Waktu: <strong className="text-white text-xs">{timeLeft}s</strong>
          </div>

          <div className="text-center">
            <div className="text-[11px] font-bold text-slate-300/70 uppercase tracking-widest">
              Posisi Netral
            </div>
          </div>

          <div className="text-[10px] text-slate-400/80 bg-slate-900/70 px-2 py-0.5 rounded-full">
            Kamera Mengawasi
          </div>
        </div>

        {/* RIGHT ZONE: BENAR */}
        <div
          onClick={() => handleAnswerSubmit(true, false)}
          className={`absolute top-0 bottom-0 right-0 w-[42%] z-10 flex flex-col justify-between p-4 sm:p-6 transition-all duration-150 cursor-pointer select-none text-right ${
            motionState.zone === 'right'
              ? 'bg-emerald-600/35 border-l-4 border-emerald-500 shadow-[inset_0_0_50px_rgba(16,185,129,0.4)]'
              : 'bg-emerald-950/20 hover:bg-emerald-950/30 border-l border-emerald-500/20'
          }`}
        >
          {/* Top Label */}
          <div className="flex items-center justify-end gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-600/80 text-white text-[11px] sm:text-xs font-black shadow flex items-center gap-1">
              LOMPAT KANAN
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Center Graphic */}
          <div className="text-center my-auto">
            <div
              className={`w-16 h-16 sm:w-24 sm:h-24 rounded-2xl mx-auto flex items-center justify-center font-black transition-transform duration-150 ${
                motionState.zone === 'right'
                  ? 'bg-emerald-600 text-white scale-110 shadow-2xl shadow-emerald-600/50'
                  : 'bg-emerald-900/60 border border-emerald-500/40 text-emerald-300'
              }`}
            >
              <span className="text-3xl sm:text-5xl">✔️</span>
            </div>
            <div className="mt-2 font-black text-xl sm:text-3xl text-emerald-300 tracking-tight drop-shadow-md">
              BENAR
            </div>

            {/* Dwell Progress Bar */}
            {motionState.zone === 'right' && (
              <div className="w-32 sm:w-44 h-3 bg-slate-900/80 rounded-full mx-auto mt-3 overflow-hidden border border-emerald-400/60 p-0.5">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ width: `${motionState.zoneHoldProgress * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="text-[10px] sm:text-xs text-emerald-300/80 font-medium">
            Tahan posisi di kanan untuk mengonfirmasi
          </div>
        </div>

        {/* REVEAL / EXPLANATION MODAL OVERLAY */}
        {gameState === 'revealing' && lastAnswer && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xl ${
                lastAnswer.isRight
                  ? 'bg-emerald-500 text-white shadow-emerald-500/40'
                  : 'bg-rose-500 text-white shadow-rose-500/40'
              }`}
            >
              {lastAnswer.isRight ? (
                <CheckCircle2 className="w-10 h-10" />
              ) : (
                <XCircle className="w-10 h-10" />
              )}
            </div>

            <div className="text-2xl sm:text-3xl font-black text-white">
              {lastAnswer.isRight ? 'Jawaban Kamu Tepat!' : 'Jawaban Kurang Tepat!'}
            </div>

            {lastAnswer.isRight && (
              <div className="text-emerald-400 font-extrabold text-lg mt-1">
                +{lastAnswer.pointsEarned} Poin
              </div>
            )}

            <div className="mt-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 max-w-lg text-slate-200 text-sm leading-relaxed shadow-lg">
              <span className="font-bold text-emerald-400 block mb-1">Penjelasan Edukasi:</span>
              {lastAnswer.explanation}
            </div>

            <button
              onClick={proceedToNextQuestion}
              className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center gap-1.5"
            >
              Lanjut Soal Berikutnya &rarr;
            </button>
          </div>
        )}
      </div>

      {/* QUESTION CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
            {currentQ?.category}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Tingkat: <span className="text-emerald-400 font-bold capitalize">{difficulty}</span>
          </span>
        </div>

        <p className="text-lg sm:text-2xl font-bold text-white text-center sm:text-left leading-relaxed">
          &ldquo;{currentQ?.statement}&rdquo;
        </p>

        {/* Quick Accessibility Button Controls */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-300">⬅️ / A</span>
            <span>atau</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-300">➡️ / D</span>
            <span>di keyboard</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAnswerSubmit(false, false)}
              className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold transition flex items-center gap-1.5"
            >
              ❌ Klik SALAH
            </button>
            <button
              onClick={() => handleAnswerSubmit(true, false)}
              className="px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold transition flex items-center gap-1.5"
            >
              ✔️ Klik BENAR
            </button>
          </div>
        </div>
      </div>

      {/* WEBCAM SETTINGS DRAWER / MODAL */}
      {showWebcamSettings && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl text-xs text-slate-300 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Kalibrasi & Sensitivitas Deteksi Gerak
            </h4>
            <button
              onClick={() => setShowWebcamSettings(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕ Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Tingkat Sensitivitas Gerakan:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['rendah', 'sedang', 'tinggi'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSensitivity(lvl)}
                    className={`py-1.5 rounded-lg border font-bold capitalize transition ${
                      sensitivity === lvl
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Kalibrasi Latar Belakang:</label>
              <button
                type="button"
                onClick={calibrateBaseline}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-slate-200 font-semibold transition"
              >
                Reset Posisi Tengah / Kalibrasi Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
