export type DifficultyLevel = 'mudah' | 'sedang' | 'sulit';

export type QuestionCategory =
  | 'Sains & Alam'
  | 'Sejarah & Budaya'
  | 'Teknologi & Komputer'
  | 'Matematika & Logika'
  | 'Pengetahuan Umum'
  | 'Kesehatan & Tubuh';

export interface Question {
  id: string;
  statement: string;
  isCorrect: boolean; // true for "Benar", false for "Salah"
  category: QuestionCategory | string;
  difficulty: DifficultyLevel;
  explanation: string;
}

export interface PlayerAnswerRecord {
  questionId: string;
  statement: string;
  category: string;
  playerAnswer: boolean;
  correctAnswer: boolean;
  isRight: boolean;
  timeSpentSeconds: number;
}

export interface GameSessionResult {
  id: string;
  playerId: string;
  playerName: string;
  score: number;
  maxStreak: number;
  totalQuestions: number;
  correctCount: number;
  accuracy: number; // percentage (0 - 100)
  difficulty: DifficultyLevel;
  categoryFilter?: string;
  timestamp: number;
  answers: PlayerAnswerRecord[];
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string; // emoji or avatar id
  totalGames: number;
  totalScore: number;
  highestScore: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  longestStreak: number;
  createdAt: number;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  playerAvatar: string;
  score: number;
  accuracy: number;
  difficulty: DifficultyLevel;
  maxStreak: number;
  date: string;
  timestamp: number;
}

export interface CategoryStat {
  category: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracyPercentage: number;
  avgTimeSeconds: number;
}

export interface MotionDetectionState {
  zone: 'left' | 'right' | 'center' | 'none'; // left = Salah, right = Benar
  zoneHoldProgress: number; // 0 to 1 (fill bar to confirm)
  isDetected: boolean;
  confidence: number;
  motionEnergyLeft: number;
  motionEnergyRight: number;
  centroidX: number; // 0 to 1
  centroidY: number; // 0 to 1
}

export type GameMode = 'solo' | 'duel';

export interface DuelPlayerState {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  totalAnswers: number;
  answers: PlayerAnswerRecord[];
}

export interface DuelSessionResult {
  id: string;
  player1: DuelPlayerState;
  player2: DuelPlayerState;
  winnerId: string | 'draw';
  difficulty: DifficultyLevel;
  timestamp: number;
  totalRounds: number;
}

