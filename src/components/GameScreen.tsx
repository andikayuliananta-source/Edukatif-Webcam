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
  Clock,
  Swords,
  User,
  Trophy,
  Crown,
  RefreshCw
} from 'lucide-react';
import {
  Question,
  DifficultyLevel,
  PlayerProfile,
  GameSessionResult,
  PlayerAnswerRecord,
  GameMode,
  DuelSessionResult
} from '../types';
import { sound } from '../services/sound';
import { StorageService } from '../services/storage';
import { useWebcamTracker } from '../hooks/useWebcamTracker';

interface GameScreenProps {
  player: PlayerProfile;
  onFinishGame: () => void;
  onViewLeaderboard: () => void;
}

const AVATAR_PRESETS_P1 = ['🦁', '⚡', '🚀', '👑', '🌟', '🎯'];
const AVATAR_PRESETS_P2 = ['🦊', '🔥', '🤖', '🌸', '🦉', '🐱'];

export const GameScreen = ({ player, onFinishGame, onViewLeaderboard }: GameScreenProps) => {
  // Game Mode: Solo or Duel
  const [gameMode, setGameMode] = useState<GameMode>('solo');

  // Game Setup State
  const [gameState, setGameState] = useState<'lobby' | 'countdown' | 'turn_switch' | 'playing' | 'revealing' | 'finished'>('lobby');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('sedang');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [questionCount, setQuestionCount] = useState<number>(8);
  const [duelRounds, setDuelRounds] = useState<number>(3); // 3 rounds = 6 questions

  // Duel Players Info
  const [p1Name, setP1Name] = useState<string>(player.name || 'Pemain 1');
  const [p1Avatar, setP1Avatar] = useState<string>(player.avatar || '🦁');
  const [p2Name, setP2Name] = useState<string>('Pemain 2');
  const [p2Avatar, setP2Avatar] = useState<string>('🦊');

  // Duel Scores & Stats
  const [p1Score, setP1Score] = useState<number>(0);
  const [p1Streak, setP1Streak] = useState<number>(0);
  const [p1MaxStreak, setP1MaxStreak] = useState<number>(0);
  const [p1Correct, setP1Correct] = useState<number>(0);
  const [p1Answers, setP1Answers] = useState<PlayerAnswerRecord[]>([]);

  const [p2Score, setP2Score] = useState<number>(0);
  const [p2Streak, setP2Streak] = useState<number>(0);
  const [p2MaxStreak, setP2MaxStreak] = useState<number>(0);
  const [p2Correct, setP2Correct] = useState<number>(0);
  const [p2Answers, setP2Answers] = useState<PlayerAnswerRecord[]>([]);

  // Active Game State
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0); // Solo mode score
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [maxTime, setMaxTime] = useState<number>(10);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  // Turn Switch Countdown
  const [switchCountdown, setSwitchCountdown] = useState<number>(3);

  // Answer feedback
  const [lastAnswer, setLastAnswer] = useState<{
    playerChoice: boolean;
    isRight: boolean;
    pointsEarned: number;
    explanation: string;
    answeredByPlayerNumber?: 1 | 2;
  } | null>(null);

  const [floatingScores, setFloatingScores] = useState<{ id: number; text: string; isPositive: boolean }[]>([]);
  const [answerHistory, setAnswerHistory] = useState<PlayerAnswerRecord[]>([]);

  // Webcam & Hold Time Settings
  const [sensitivity, setSensitivity] = useState<'rendah' | 'sedang' | 'tinggi'>('sedang');
  const [holdSpeedPreference, setHoldSpeedPreference] = useState<'santai' | 'standar' | 'cepat'>('standar');
  const [showWebcamSettings, setShowWebcamSettings] = useState<boolean>(false);
  const [lobbyCountdown, setLobbyCountdown] = useState<number>(3);
  const [previewCameraInLobby, setPreviewCameraInLobby] = useState<boolean>(false);

  // Active Duel Player (1 or 2)
  const currentDuelPlayer: 1 | 2 = currentIdx % 2 === 0 ? 1 : 2;
  const currentRoundNumber = Math.floor(currentIdx / 2) + 1;

  // Sync P1 with current player profile if updated
  useEffect(() => {
    if (player.name && p1Name === 'Pemain 1') {
      setP1Name(player.name);
      setP1Avatar(player.avatar || '🦁');
    }
  }, [player, p1Name]);

  // Difficulty configurations (calibrated comfortable hold times so user has time to confirm)
  const getDifficultyConfig = useCallback((diff: DifficultyLevel) => {
    let baseHold = 750; // default 0.75s (deliberate & natural)
    if (diff === 'mudah') baseHold = 1000; // 1.0s (calm and relaxed)
    else if (diff === 'sulit') baseHold = 550; // 0.55s (brisk)

    if (holdSpeedPreference === 'santai') baseHold = Math.round(baseHold * 1.3); // up to ~1.0s - 1.3s
    else if (holdSpeedPreference === 'cepat') baseHold = Math.round(baseHold * 0.8); // ~0.45s - 0.6s

    switch (diff) {
      case 'mudah':
        return { time: 14, multiplier: 1.0, holdTime: baseHold, basePoints: 100, label: 'Mudah' };
      case 'sedang':
        return { time: 10, multiplier: 1.5, holdTime: baseHold, basePoints: 150, label: 'Sedang' };
      case 'sulit':
        return { time: 6, multiplier: 2.0, holdTime: baseHold, basePoints: 220, label: 'Sulit' };
    }
  }, [holdSpeedPreference]);

  // Forward declaration of submitAnswer ref to avoid stale closures
  const submitAnswerRef = useRef<(answer: boolean, timedOut?: boolean) => void>(() => {});

  // Webcam Tracker Hook (enabled whenever in active game or lobby preview)
  const isWebcamEnabled = gameState === 'playing' || gameState === 'countdown' || gameState === 'turn_switch' || previewCameraInLobby;

  const {
    videoRef,
    canvasRef,
    isCameraActive,
    isCameraLoading,
    cameraError,
    motionState,
    startCamera,
    stopCamera,
    calibrateBaseline,
    resetTrigger
  } = useWebcamTracker({
    enabled: isWebcamEnabled,
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

    const activeTurn = currentIdx % 2 === 0 ? 1 : 2;
    let pointsEarned = 0;

    if (gameMode === 'solo') {
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

        sound.playCorrect();
        if (newStreak >= 3) {
          sound.playStreak();
        }

        confetti({
          particleCount: 50 + Math.min(60, newStreak * 10),
          spread: 70,
          origin: { y: 0.6 }
        });

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
    } else {
      // DUEL MODE SCORING
      const currentActiveStreak = activeTurn === 1 ? p1Streak : p2Streak;
      const currentActiveName = activeTurn === 1 ? p1Name : p2Name;

      let newStreak = currentActiveStreak;

      if (isRight) {
        newStreak = currentActiveStreak + 1;
        const speedBonus = Math.max(0, Math.round((timeLeft / maxTime) * 60));
        const streakBonus = Math.min(2.5, 1 + newStreak * 0.15);
        pointsEarned = Math.round((config.basePoints + speedBonus) * streakBonus);

        if (activeTurn === 1) {
          setP1Score((prev) => prev + pointsEarned);
          setP1Streak(newStreak);
          setP1Correct((prev) => prev + 1);
          setP1MaxStreak((prev) => Math.max(prev, newStreak));
          setP1Answers((prev) => [
            ...prev,
            {
              questionId: currentQ.id,
              statement: currentQ.statement,
              category: currentQ.category,
              playerAnswer: timedOut ? !currentQ.isCorrect : playerChoice,
              correctAnswer: currentQ.isCorrect,
              isRight: true,
              timeSpentSeconds: timeSpent
            }
          ]);
        } else {
          setP2Score((prev) => prev + pointsEarned);
          setP2Streak(newStreak);
          setP2Correct((prev) => prev + 1);
          setP2MaxStreak((prev) => Math.max(prev, newStreak));
          setP2Answers((prev) => [
            ...prev,
            {
              questionId: currentQ.id,
              statement: currentQ.statement,
              category: currentQ.category,
              playerAnswer: timedOut ? !currentQ.isCorrect : playerChoice,
              correctAnswer: currentQ.isCorrect,
              isRight: true,
              timeSpentSeconds: timeSpent
            }
          ]);
        }

        sound.playCorrect();
        if (newStreak >= 2) sound.playStreak();

        confetti({
          particleCount: 50 + Math.min(50, newStreak * 10),
          spread: 70,
          origin: { y: 0.6 }
        });

        const floatId = Date.now();
        setFloatingScores((prev) => [
          ...prev,
          {
            id: floatId,
            text: `${currentActiveName}: +${pointsEarned} Poin! 🔥`,
            isPositive: true
          }
        ]);
        setTimeout(() => {
          setFloatingScores((prev) => prev.filter((item) => item.id !== floatId));
        }, 1600);
      } else {
        if (activeTurn === 1) {
          setP1Streak(0);
          setP1Answers((prev) => [
            ...prev,
            {
              questionId: currentQ.id,
              statement: currentQ.statement,
              category: currentQ.category,
              playerAnswer: timedOut ? !currentQ.isCorrect : playerChoice,
              correctAnswer: currentQ.isCorrect,
              isRight: false,
              timeSpentSeconds: timeSpent
            }
          ]);
        } else {
          setP2Streak(0);
          setP2Answers((prev) => [
            ...prev,
            {
              questionId: currentQ.id,
              statement: currentQ.statement,
              category: currentQ.category,
              playerAnswer: timedOut ? !currentQ.isCorrect : playerChoice,
              correctAnswer: currentQ.isCorrect,
              isRight: false,
              timeSpentSeconds: timeSpent
            }
          ]);
        }

        sound.playWrong();

        const floatId = Date.now();
        setFloatingScores((prev) => [
          ...prev,
          {
            id: floatId,
            text: timedOut ? `${currentActiveName}: Waktu Habis! ⌛` : `${currentActiveName}: Kurang Tepat ❌`,
            isPositive: false
          }
        ]);
        setTimeout(() => {
          setFloatingScores((prev) => prev.filter((item) => item.id !== floatId));
        }, 1600);
      }
    }

    // Show explanation card
    setLastAnswer({
      playerChoice: timedOut ? false : playerChoice,
      isRight,
      pointsEarned,
      explanation: currentQ.explanation,
      answeredByPlayerNumber: gameMode === 'duel' ? activeTurn : undefined
    });

    setGameState('revealing');

    // Auto proceed
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
    gameMode,
    streak,
    timeLeft,
    maxTime,
    maxStreak,
    p1Streak,
    p2Streak,
    p1Name,
    p2Name
  ]);

  // Keep ref updated
  useEffect(() => {
    submitAnswerRef.current = handleAnswerSubmit;
  }, [handleAnswerSubmit]);

  // Start the next turn with a smooth turn switch countdown if Duel mode
  const startTurn = useCallback(() => {
    const config = getDifficultyConfig(difficulty);
    setTimeLeft(config.time);
    setMaxTime(config.time);
    setQuestionStartTime(performance.now());
    setGameState('playing');
  }, [difficulty, getDifficultyConfig]);

  // Move to next question or end game
  const proceedToNextQuestion = useCallback(() => {
    setLastAnswer(null);
    resetTrigger();

    if (currentIdx + 1 < activeQuestions.length) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);

      // If duel mode, show turn switch transition screen so player can step in
      if (gameMode === 'duel') {
        setSwitchCountdown(3);
        setGameState('turn_switch');

        const switchTimer = setInterval(() => {
          setSwitchCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(switchTimer);
              startTurn();
              return 0;
            }
            sound.playTick(false);
            return prev - 1;
          });
        }, 900);
      } else {
        startTurn();
      }
    } else {
      // Game Complete!
      sound.playGameOver();
      setGameState('finished');
    }
  }, [currentIdx, activeQuestions.length, gameMode, resetTrigger, startTurn]);

  // Save session when finished
  useEffect(() => {
    if (gameState === 'finished') {
      if (gameMode === 'solo' && answerHistory.length > 0) {
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
        onFinishGame();
      } else if (gameMode === 'duel') {
        let winnerId: string | 'draw' = 'draw';
        if (p1Score > p2Score) winnerId = 'player1';
        else if (p2Score > p1Score) winnerId = 'player2';

        const duelResult: DuelSessionResult = {
          id: 'duel_' + Date.now(),
          player1: {
            id: 'p1_' + Date.now(),
            name: p1Name.trim() || 'Pemain 1',
            avatar: p1Avatar,
            score: p1Score,
            streak: p1Streak,
            maxStreak: p1MaxStreak,
            correctCount: p1Correct,
            totalAnswers: p1Answers.length,
            answers: p1Answers
          },
          player2: {
            id: 'p2_' + Date.now(),
            name: p2Name.trim() || 'Pemain 2',
            avatar: p2Avatar,
            score: p2Score,
            streak: p2Streak,
            maxStreak: p2MaxStreak,
            correctCount: p2Correct,
            totalAnswers: p2Answers.length,
            answers: p2Answers
          },
          winnerId,
          difficulty,
          timestamp: Date.now(),
          totalRounds: duelRounds
        };

        StorageService.recordDuelSession(duelResult);
        onFinishGame();
      }
    }
  }, [
    gameState,
    gameMode,
    answerHistory,
    player,
    score,
    maxStreak,
    difficulty,
    selectedCategory,
    p1Score,
    p2Score,
    p1Name,
    p1Avatar,
    p1Streak,
    p1MaxStreak,
    p1Correct,
    p1Answers,
    p2Name,
    p2Avatar,
    p2Streak,
    p2MaxStreak,
    p2Correct,
    p2Answers,
    duelRounds,
    onFinishGame
  ]);

  // Countdown timer for active question
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAnswerSubmit(false, true);
          return 0;
        }

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
        handleAnswerSubmit(false, false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
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

    const totalQuestionsNeeded = gameMode === 'duel' ? duelRounds * 2 : questionCount;

    let matched = filtered.filter((q) => q.difficulty === difficulty);
    if (matched.length < totalQuestionsNeeded) {
      matched = filtered;
    }

    const shuffled = [...matched].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, totalQuestionsNeeded);

    setActiveQuestions(selected);
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setAnswerHistory([]);
    setLastAnswer(null);

    // Reset Duel scores
    setP1Score(0);
    setP1Streak(0);
    setP1MaxStreak(0);
    setP1Correct(0);
    setP1Answers([]);

    setP2Score(0);
    setP2Streak(0);
    setP2MaxStreak(0);
    setP2Correct(0);
    setP2Answers([]);

    const config = getDifficultyConfig(difficulty);
    setTimeLeft(config.time);
    setMaxTime(config.time);

    // Turn camera ON immediately so it is initialized and playing during countdown!
    startCamera();

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
          return 0;
        }
        sound.playTick(false);
        return prev - 1;
      });
    }, 900);
  };

  const currentQ = activeQuestions[currentIdx];

  // Active player in current duel turn
  const activePlayerName = currentDuelPlayer === 1 ? (p1Name.trim() || 'Pemain 1') : (p2Name.trim() || 'Pemain 2');
  const activePlayerAvatar = currentDuelPlayer === 1 ? p1Avatar : p2Avatar;

  // ==========================================
  // RENDER: LOBBY / SETUP SCREEN
  // ==========================================
  if (gameState === 'lobby') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
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

            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-center gap-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-700/80 max-w-md mx-auto mt-6 shadow-inner">
              <button
                type="button"
                onClick={() => setGameMode('solo')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  gameMode === 'solo'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <User className="w-4 h-4" />
                Mode Solo (1 Pemain)
              </button>

              <button
                type="button"
                onClick={() => setGameMode('duel')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  gameMode === 'duel'
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Swords className="w-4 h-4 text-cyan-300" />
                Mode Duel (2 Pemain)
              </button>
            </div>

            {/* DUEL MODE PLAYERS CONFIGURATION */}
            {gameMode === 'duel' && (
              <div className="mt-6 p-5 rounded-3xl bg-slate-900/80 border-2 border-indigo-500/40 text-left space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Konfigurasi Pertarungan Duel</h3>
                      <p className="text-[11px] text-slate-400">Dua pemain berkompetisi bergantian dalam satu sesi webcam</p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Head to Head
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pemain 1 */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-cyan-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        Pemain 1 (Giliran Ganjil)
                      </span>
                      <span className="text-2xl">{p1Avatar}</span>
                    </div>

                    <input
                      type="text"
                      value={p1Name}
                      onChange={(e) => setP1Name(e.target.value)}
                      placeholder="Nama Pemain 1"
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
                    />

                    <div>
                      <div className="text-[10px] text-slate-400 mb-1">Pilih Avatar:</div>
                      <div className="flex gap-1.5">
                        {AVATAR_PRESETS_P1.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setP1Avatar(item)}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition ${
                              p1Avatar === item
                                ? 'bg-cyan-500/40 border border-cyan-400 scale-110'
                                : 'bg-slate-700/60 hover:bg-slate-700'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pemain 2 */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-purple-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        Pemain 2 (Giliran Genap)
                      </span>
                      <span className="text-2xl">{p2Avatar}</span>
                    </div>

                    <input
                      type="text"
                      value={p2Name}
                      onChange={(e) => setP2Name(e.target.value)}
                      placeholder="Nama Pemain 2"
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-purple-400"
                    />

                    <div>
                      <div className="text-[10px] text-slate-400 mb-1">Pilih Avatar:</div>
                      <div className="flex gap-1.5">
                        {AVATAR_PRESETS_P2.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setP2Avatar(item)}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition ${
                              p2Avatar === item
                                ? 'bg-purple-500/40 border border-purple-400 scale-110'
                                : 'bg-slate-700/60 hover:bg-slate-700'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Jumlah Ronde Duel */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Jumlah Ronde Duel (Masing-masing menjawab 1 soal per ronde):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 5, 7].map((rounds) => (
                      <button
                        key={rounds}
                        type="button"
                        onClick={() => setDuelRounds(rounds)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          duelRounds === rounds
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {rounds} Ronde ({rounds * 2} Soal)
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Gesture Legend Cards */}
            <div className="grid grid-cols-2 gap-4 mt-6 text-left">
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
            <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-6">
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

              {/* Category selector */}
              <div className="text-left">
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

              {/* Solo mode question count selector */}
              {gameMode === 'solo' && (
                <div className="text-left">
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
              )}

              {/* Webcam Test & Status in Lobby */}
              <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Camera className={`w-4 h-4 ${isCameraActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="text-slate-300">
                    Status Kamera:{' '}
                    <strong className={isCameraActive ? 'text-emerald-400' : 'text-amber-400'}>
                      {isCameraActive ? 'Tersambung & Siap' : isCameraLoading ? 'Menghubungkan...' : 'Belum Aktif'}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!isCameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-650 text-white rounded-lg font-semibold transition flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      Tes Nyalakan Kamera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewCameraInLobby(!previewCameraInLobby)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-650 text-slate-300 hover:text-white rounded-lg font-semibold transition"
                    >
                      {previewCameraInLobby ? 'Sembunyikan Pratinjau' : 'Lihat Pratinjau'}
                    </button>
                  )}
                </div>
              </div>

              {/* Lobby Camera Preview Drawer */}
              {previewCameraInLobby && isCameraActive && (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 aspect-[16/9] max-w-sm mx-auto shadow-lg">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover -scale-x-100"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] text-emerald-300 font-bold">
                    Webcam Preview OK
                  </div>
                </div>
              )}

              {/* Start Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={startGame}
                  className={`w-full sm:w-auto px-10 py-4 rounded-2xl text-white font-extrabold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mx-auto ${
                    gameMode === 'duel'
                      ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 shadow-indigo-500/30'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-emerald-500/30'
                  }`}
                >
                  {gameMode === 'duel' ? <Swords className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white" />}
                  {gameMode === 'duel' ? 'Mulai Pertarungan Duel!' : 'Mulai Kuis Solo Sekarang!'}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Webcam langsung aktif di awal permainan.</span>
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
  // RENDER: FINISHED / RESULT SCREEN
  // ==========================================
  if (gameState === 'finished') {
    // DUEL MODE PODIUM
    if (gameMode === 'duel') {
      const p1Total = p1Answers.length;
      const p1Acc = p1Total > 0 ? Math.round((p1Correct / p1Total) * 100) : 0;

      const p2Total = p2Answers.length;
      const p2Acc = p2Total > 0 ? Math.round((p2Correct / p2Total) * 100) : 0;

      const isP1Winner = p1Score > p2Score;
      const isP2Winner = p2Score > p1Score;
      const isDraw = p1Score === p2Score;

      return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center mx-auto mb-3 text-amber-400 shadow-xl shadow-amber-500/20">
              <Crown className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-black uppercase tracking-wider mb-2">
              <Swords className="w-4 h-4" /> Hasil Akhir Pertarungan Duel
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white">
              {isDraw ? (
                <span>Pertarungan Sengit: <span className="text-amber-400">HASIL SERI!</span></span>
              ) : isP1Winner ? (
                <span>👑 <span className="text-cyan-400">{p1Name}</span> Adalah Juara Duel!</span>
              ) : (
                <span>👑 <span className="text-purple-400">{p2Name}</span> Adalah Juara Duel!</span>
              )}
            </h2>

            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
              {isDraw
                ? 'Kedua pemain sama-sama tangkas dan berpengetahuan luas! Skor keduanya tercatat di Leaderboard.'
                : `Selamat kepada ${isP1Winner ? p1Name : p2Name}! Rekor skor kedua pemain telah tersimpan di Papan Peringkat (Leaderboard) lokal.`}
            </p>

            {/* Side-by-side Dual Scoreboards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8 max-w-2xl mx-auto">
              {/* Player 1 Card */}
              <div className={`p-5 rounded-2xl border text-center transition-all ${
                isP1Winner
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-xl shadow-cyan-500/20 scale-[1.02]'
                  : 'bg-slate-800/60 border-slate-700/80 opacity-90'
              }`}>
                {isP1Winner && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-2">
                    👑 Pemenang Duel
                  </span>
                )}
                <div className="text-4xl mb-1">{p1Avatar}</div>
                <div className="font-black text-white text-lg">{p1Name}</div>
                <div className="text-3xl font-black text-cyan-400 mt-1">{p1Score.toLocaleString()}</div>
                <div className="text-xs text-slate-400">Total Skor</div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Akurasi</span>
                    <strong className="text-emerald-400 font-bold">{p1Acc}%</strong> ({p1Correct}/{p1Total})
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Max Streak</span>
                    <strong className="text-amber-400 font-bold">{p1MaxStreak}x 🔥</strong>
                  </div>
                </div>
              </div>

              {/* Player 2 Card */}
              <div className={`p-5 rounded-2xl border text-center transition-all ${
                isP2Winner
                  ? 'bg-purple-950/40 border-purple-400 shadow-xl shadow-purple-500/20 scale-[1.02]'
                  : 'bg-slate-800/60 border-slate-700/80 opacity-90'
              }`}>
                {isP2Winner && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-2">
                    👑 Pemenang Duel
                  </span>
                )}
                <div className="text-4xl mb-1">{p2Avatar}</div>
                <div className="font-black text-white text-lg">{p2Name}</div>
                <div className="text-3xl font-black text-purple-400 mt-1">{p2Score.toLocaleString()}</div>
                <div className="text-xs text-slate-400">Total Skor</div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Akurasi</span>
                    <strong className="text-emerald-400 font-bold">{p2Acc}%</strong> ({p2Correct}/{p2Total})
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Max Streak</span>
                    <strong className="text-amber-400 font-bold">{p2MaxStreak}x 🔥</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setGameState('lobby');
                  stopCamera();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
              >
                <Swords className="w-4 h-4" />
                Duel Ulang
              </button>

              <button
                onClick={onViewLeaderboard}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                Lihat Papan Skor (Leaderboard)
              </button>
            </div>
          </div>
        </div>
      );
    }

    // SOLO MODE FINISH SCREEN
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
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition"
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
  // RENDER: PLAYING / COUNTDOWN / TURN SWITCH / REVEAL
  // ==========================================
  // The video element is kept persistently mounted here!
  const progressPercentage = ((currentIdx + 1) / Math.max(1, activeQuestions.length)) * 100;
  const timePercentage = (timeLeft / maxTime) * 100;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Top Header Stats: Dual HUD in Duel Mode OR Single HUD in Solo Mode */}
      {gameMode === 'duel' ? (
        <div className="grid grid-cols-3 items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 sm:px-4 py-2.5 rounded-2xl shadow-md">
          {/* Player 1 Card */}
          <div className={`p-2 rounded-xl border flex items-center gap-2 sm:gap-3 transition-all ${
            currentDuelPlayer === 1
              ? 'bg-cyan-950/50 border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
              : 'bg-slate-800/40 border-slate-700/60 opacity-70'
          }`}>
            <span className="text-2xl sm:text-3xl">{p1Avatar}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-sm text-white truncate">{p1Name}</span>
                {currentDuelPlayer === 1 && (
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500 text-slate-950 text-[9px] font-black uppercase">
                    Main
                  </span>
                )}
              </div>
              <div className="text-sm sm:text-lg font-black text-cyan-400 leading-tight">
                {p1Score.toLocaleString()}
                {p1Streak > 1 && <span className="text-[10px] text-amber-400 ml-1">({p1Streak}x 🔥)</span>}
              </div>
            </div>
          </div>

          {/* Center VS & Round Indicator */}
          <div className="text-center">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] sm:text-xs font-black">
              <Swords className="w-3 h-3 text-cyan-400" />
              Ronde {currentRoundNumber}/{duelRounds}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
              {currentQ?.category}
            </div>
          </div>

          {/* Player 2 Card */}
          <div className={`p-2 rounded-xl border flex items-center justify-end gap-2 sm:gap-3 transition-all text-right ${
            currentDuelPlayer === 2
              ? 'bg-purple-950/50 border-purple-400 shadow-md shadow-purple-500/20 ring-1 ring-purple-400'
              : 'bg-slate-800/40 border-slate-700/60 opacity-70'
          }`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-end gap-1.5">
                {currentDuelPlayer === 2 && (
                  <span className="px-1.5 py-0.2 rounded bg-purple-500 text-white text-[9px] font-black uppercase">
                    Main
                  </span>
                )}
                <span className="font-black text-xs sm:text-sm text-white truncate">{p2Name}</span>
              </div>
              <div className="text-sm sm:text-lg font-black text-purple-400 leading-tight">
                {p2Score.toLocaleString()}
                {p2Streak > 1 && <span className="text-[10px] text-amber-400 mr-1">({p2Streak}x 🔥)</span>}
              </div>
            </div>
            <span className="text-2xl sm:text-3xl">{p2Avatar}</span>
          </div>
        </div>
      ) : (
        /* SOLO MODE TOP HEADER */
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-2xl shadow-md">
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

          <div className="relative flex items-center gap-4">
            {streak > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black animate-pulse">
                <Flame className="w-4 h-4 fill-amber-400" />
                {streak}x Combo!
              </div>
            )}

            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Skor</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 leading-tight">
                {score.toLocaleString()}
              </div>
            </div>

            {/* Camera Status Badge */}
            <div className="flex items-center gap-2">
              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition flex items-center gap-1"
                  title="Hubungkan Kamera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Hubungkan Kamera
                </button>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Kamera Aktif
                </span>
              )}

              <button
                onClick={() => setShowWebcamSettings(!showWebcamSettings)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition"
                title="Pengaturan Webcam & Sensitivitas"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating animated points badges */}
      <div className="relative">
        {floatingScores.map((float) => (
          <div
            key={float.id}
            className={`absolute -top-4 right-4 text-xs sm:text-sm font-black px-3.5 py-1 rounded-full shadow-lg pointer-events-none animate-bounce z-50 whitespace-nowrap ${
              float.isPositive
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/50'
                : 'bg-rose-500 text-white shadow-rose-500/50'
            }`}
          >
            {float.text}
          </div>
        ))}
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

      {/* Main Interactive Stage: PERSISTENT Webcam Canvas & Zone Overlays */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl aspect-[4/3] sm:aspect-[16/9] max-h-[500px] w-full flex items-center justify-center">
        {/* Mirrored Video element - Stays mounted across playing, countdown, and turn_switch */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-75"
        />

        {/* Hidden Canvas for Frame Differencing Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Loading Indicator when starting camera */}
        {isCameraLoading && (
          <div className="absolute inset-0 bg-slate-950/70 z-20 flex flex-col items-center justify-center text-center p-4">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
            <div className="text-white text-xs font-bold">Mengaktifkan webcam...</div>
          </div>
        )}

        {/* Camera Permission / Error Overlay */}
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                Coba Sambungkan Ulang
              </button>
            </div>
            <p className="text-[11px] text-amber-300 mt-4">
              Tip: Kamu juga bisa menggunakan tombol keyboard ⬅️ (Salah) dan ➡️ (Benar).
            </p>
          </div>
        )}

        {/* Motion Reticle & Body Centroid Indicator (Changes color dynamically based on detected zone) */}
        {isCameraActive && gameState === 'playing' && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75 ease-out"
            style={{
              left: `${motionState.centroidX * 100}%`,
              top: `${motionState.centroidY * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div
              className={`w-9 h-9 rounded-full border-2 animate-ping absolute ${
                motionState.zone === 'left'
                  ? 'border-rose-400 bg-rose-400/30'
                  : motionState.zone === 'right'
                  ? 'border-emerald-400 bg-emerald-400/30'
                  : 'border-cyan-400 bg-cyan-400/20'
              }`}
            />
            <div
              className={`w-5 h-5 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-[10px] ${
                motionState.zone === 'left'
                  ? 'bg-rose-500 shadow-rose-500/80 text-white'
                  : motionState.zone === 'right'
                  ? 'bg-emerald-500 shadow-emerald-500/80 text-white'
                  : 'bg-cyan-400 shadow-cyan-400/80'
              }`}
            />
          </div>
        )}

        {/* Live Detected Zone Feedback Pill */}
        {isCameraActive && gameState === 'playing' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            {motionState.zone === 'left' ? (
              <span className="px-3 py-1 rounded-full bg-rose-600/90 text-white text-xs font-black shadow-lg shadow-rose-600/40 border border-rose-400 flex items-center gap-1.5 animate-pulse">
                <span>👈</span> Terdeteksi di Sisi KIRI (SALAH) &bull; {Math.round(motionState.zoneHoldProgress * 100)}%
              </span>
            ) : motionState.zone === 'right' ? (
              <span className="px-3 py-1 rounded-full bg-emerald-600/90 text-white text-xs font-black shadow-lg shadow-emerald-600/40 border border-emerald-400 flex items-center gap-1.5 animate-pulse">
                <span>👉</span> Terdeteksi di Sisi KANAN (BENAR) &bull; {Math.round(motionState.zoneHoldProgress * 100)}%
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 text-slate-300 text-[10px] font-bold border border-slate-700/80">
                Posisi Tengah (Netral)
              </span>
            )}
          </div>
        )}

        {/* OVERLAY: COUNTDOWN 3, 2, 1 (Rendered on top of active webcam) */}
        {gameState === 'countdown' && (
          <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 animate-in fade-in">
            <p className="text-slate-300 text-xs sm:text-sm font-semibold uppercase tracking-widest mb-2">
              {gameMode === 'duel' ? `⚔️ Giliran Pertama: ${p1Name}` : 'Bersiap di Depan Kamera!'}
            </p>
            <div className="w-28 h-28 rounded-full bg-emerald-500/20 border-4 border-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 animate-pulse">
              <span className="text-6xl font-black text-emerald-400">{lobbyCountdown}</span>
            </div>
            <p className="mt-4 text-slate-200 text-xs sm:text-sm font-medium">
              Posisi Kiri = <span className="text-rose-400 font-bold">SALAH ❌</span> &bull; Posisi Kanan = <span className="text-emerald-400 font-bold">BENAR ✔️</span>
            </p>
          </div>
        )}

        {/* OVERLAY: TURN SWITCH (DUEL MODE) (Rendered on top of active webcam) */}
        {gameState === 'turn_switch' && (
          <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 animate-in fade-in">
            <div className="bg-slate-900/90 border border-indigo-500/50 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider mb-3">
                <Swords className="w-3.5 h-3.5" /> Pergantian Giliran
              </div>
              <div className="text-4xl mb-1">{activePlayerAvatar}</div>
              <div className="text-xs text-slate-400 uppercase tracking-widest">Giliran Sekarang:</div>
              <div className="text-2xl font-black text-white mt-0.5">{activePlayerName}</div>
              <p className="text-slate-300 text-xs mt-2">
                Berdiri di depan kamera dalam:
              </p>
              <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400 flex items-center justify-center mx-auto text-2xl font-black text-indigo-300 shadow my-3 animate-pulse">
                {switchCountdown}
              </div>
              <button
                onClick={startTurn}
                className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow transition"
              >
                Mulai Giliran Sekarang
              </button>
            </div>
          </div>
        )}

        {/* Interactive Zone Overlays */}
        {/* LEFT ZONE: SALAH */}
        <div
          onClick={() => handleAnswerSubmit(false, false)}
          className={`absolute top-0 bottom-0 left-0 w-[42%] z-10 flex flex-col justify-between p-4 sm:p-6 transition-all duration-150 cursor-pointer select-none ${
            motionState.zone === 'left' && gameState === 'playing'
              ? 'bg-rose-600/35 border-r-4 border-rose-500 shadow-[inset_0_0_50px_rgba(244,63,94,0.4)]'
              : 'bg-rose-950/20 hover:bg-rose-950/30 border-r border-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-rose-600/80 text-white text-[11px] sm:text-xs font-black shadow flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              LOMPAT KIRI
            </span>
          </div>

          <div className="text-center my-auto">
            <div
              className={`w-16 h-16 sm:w-24 sm:h-24 rounded-2xl mx-auto flex items-center justify-center font-black transition-transform duration-150 ${
                motionState.zone === 'left' && gameState === 'playing'
                  ? 'bg-rose-600 text-white scale-110 shadow-2xl shadow-rose-600/50'
                  : 'bg-rose-900/60 border border-rose-500/40 text-rose-300'
              }`}
            >
              <span className="text-3xl sm:text-5xl">❌</span>
            </div>
            <div className="mt-2 font-black text-xl sm:text-3xl text-rose-300 tracking-tight drop-shadow-md">
              SALAH
            </div>

            {motionState.zone === 'left' && gameState === 'playing' && (
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
            {gameMode === 'duel' && (
              <div className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700 mb-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Giliran:</div>
                <div className="text-xs font-black text-cyan-300 flex items-center gap-1 justify-center">
                  <span>{activePlayerAvatar}</span>
                  <span>{activePlayerName}</span>
                </div>
              </div>
            )}
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
            motionState.zone === 'right' && gameState === 'playing'
              ? 'bg-emerald-600/35 border-l-4 border-emerald-500 shadow-[inset_0_0_50px_rgba(16,185,129,0.4)]'
              : 'bg-emerald-950/20 hover:bg-emerald-950/30 border-l border-emerald-500/20'
          }`}
        >
          <div className="flex items-center justify-end gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-600/80 text-white text-[11px] sm:text-xs font-black shadow flex items-center gap-1">
              LOMPAT KANAN
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="text-center my-auto">
            <div
              className={`w-16 h-16 sm:w-24 sm:h-24 rounded-2xl mx-auto flex items-center justify-center font-black transition-transform duration-150 ${
                motionState.zone === 'right' && gameState === 'playing'
                  ? 'bg-emerald-600 text-white scale-110 shadow-2xl shadow-emerald-600/50'
                  : 'bg-emerald-900/60 border border-emerald-500/40 text-emerald-300'
              }`}
            >
              <span className="text-3xl sm:text-5xl">✔️</span>
            </div>
            <div className="mt-2 font-black text-xl sm:text-3xl text-emerald-300 tracking-tight drop-shadow-md">
              BENAR
            </div>

            {motionState.zone === 'right' && gameState === 'playing' && (
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
              {lastAnswer.isRight ? 'Jawaban Tepat!' : 'Jawaban Kurang Tepat!'}
            </div>

            {gameMode === 'duel' && (
              <div className="text-xs text-slate-300 font-bold mt-1">
                Respon dari <span className="text-cyan-400 font-black">{activePlayerName}</span>
              </div>
            )}

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
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              {currentQ?.category}
            </span>
            {gameMode === 'duel' && (
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-xs font-extrabold border border-cyan-500/30 flex items-center gap-1">
                <span>{activePlayerAvatar}</span>
                <span>Giliran: {activePlayerName}</span>
              </span>
            )}
          </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <label className="block font-semibold mb-1">Waktu Tahan Konfirmasi (Hold Time):</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'santai', label: 'Santai (1.0s)' },
                  { id: 'standar', label: 'Standar (0.75s)' },
                  { id: 'cepat', label: 'Cepat (0.55s)' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setHoldSpeedPreference(item.id as 'santai' | 'standar' | 'cepat')}
                    className={`py-1.5 px-1 rounded-lg border font-bold text-[10px] transition ${
                      holdSpeedPreference === item.id
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Kalibrasi & Sambungan Kamera:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={calibrateBaseline}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-slate-200 font-semibold transition"
                >
                  Kalibrasi
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 py-2 bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500 rounded-lg text-white font-semibold transition flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Hubungkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
