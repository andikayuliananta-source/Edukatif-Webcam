import {
  Question,
  DifficultyLevel,
  PlayerProfile,
  LeaderboardEntry,
  GameSessionResult,
  CategoryStat
} from '../types';

const STORAGE_KEYS = {
  QUESTIONS: 'gerakpintar_questions_v1',
  LEADERBOARD: 'gerakpintar_leaderboard_v1',
  CURRENT_PLAYER: 'gerakpintar_current_player_v1',
  PLAYERS: 'gerakpintar_players_v1',
  MATCH_HISTORY: 'gerakpintar_match_history_v1',
};

export const DEFAULT_QUESTIONS: Question[] = [
  // Sains & Alam
  {
    id: 's1',
    statement: 'Fotosintesis pada tumbuhan menghasilkan oksigen dan glukosa dari karbon dioksida dan air.',
    isCorrect: true,
    category: 'Sains & Alam',
    difficulty: 'mudah',
    explanation: 'Benar! Klorofil menyerap cahaya matahari untuk mengubah CO2 dan H2O menjadi glukosa dan O2.'
  },
  {
    id: 's2',
    statement: 'Planet Mars memiliki dua satelit alami bernama Phobos dan Deimos.',
    isCorrect: true,
    category: 'Sains & Alam',
    difficulty: 'sedang',
    explanation: 'Benar! Mars memiliki dua bulan kecil tak beraturan yaitu Phobos dan Deimos.'
  },
  {
    id: 's3',
    statement: 'Kelelawar adalah hewan mamalia yang buta total dan hanya mengandalkan suara.',
    isCorrect: false,
    category: 'Sains & Alam',
    difficulty: 'mudah',
    explanation: 'Salah! Kelelawar tidak buta sama sekali, banyak jenis yang memiliki penglihatan malam yang cukup tajam.'
  },
  {
    id: 's4',
    statement: 'Titik didih air selalu tepat 100°C di semua ketinggian bumi.',
    isCorrect: false,
    category: 'Sains & Alam',
    difficulty: 'sedang',
    explanation: 'Salah! Di dataran tinggi dengan tekanan udara lebih rendah (seperti pegunungan), air mendidih di bawah 100°C.'
  },
  {
    id: 's5',
    statement: 'Inti bumi bagian luar berwujud cairan logam terutama besi dan nikel.',
    isCorrect: true,
    category: 'Sains & Alam',
    difficulty: 'sulit',
    explanation: 'Benar! Inti luar bumi berwujud cair, sementara inti dalam berwujud padat karena tekanan ekstrem.'
  },

  // Sejarah & Budaya
  {
    id: 'h1',
    statement: 'Candi Borobudur dibangun pada abad ke-8 masehi oleh Wangsa Syailendra.',
    isCorrect: true,
    category: 'Sejarah & Budaya',
    difficulty: 'mudah',
    explanation: 'Benar! Candi Borobudur merupakan monumen Buddha Mahayana peninggalan Wangsa Syailendra.'
  },
  {
    id: 'h2',
    statement: 'Deklarasi Kemerdekaan Indonesia dibacakan di Istana Merdeka pada 17 Agustus 1945.',
    isCorrect: false,
    category: 'Sejarah & Budaya',
    difficulty: 'sedang',
    explanation: 'Salah! Naskah proklamasi dibacakan di kediaman Soekarno, Jalan Pegangsaan Timur No. 56, Jakarta.'
  },
  {
    id: 'h3',
    statement: 'Tari Saman yang diakui UNESCO sebagai Warisan Budaya Takbenda berasal dari suku Gayo di Aceh.',
    isCorrect: true,
    category: 'Sejarah & Budaya',
    difficulty: 'mudah',
    explanation: 'Benar! Tari Saman dikembangkan oleh Syekh Saman dari suku Gayo di dataran tinggi Aceh.'
  },
  {
    id: 'h4',
    statement: 'Perang Dunia I berakhir secara resmi pada tanggal 11 November 1918.',
    isCorrect: true,
    category: 'Sejarah & Budaya',
    difficulty: 'sulit',
    explanation: 'Benar! Gencatan senjata Compiègne ditandatangani pada pukul 11 pagi, tanggal 11 bulan 11 tahun 1918.'
  },

  // Teknologi & Komputer
  {
    id: 't1',
    statement: 'HTML (HyperText Markup Language) adalah sebuah bahasa pemrograman.',
    isCorrect: false,
    category: 'Teknologi & Komputer',
    difficulty: 'mudah',
    explanation: 'Salah! HTML adalah bahasa markah (markup language), bukan bahasa pemrograman karena tidak memiliki logika kondisional atau perulangan.'
  },
  {
    id: 't2',
    statement: 'Kabel serat optik (fiber optic) mentransmisikan data menggunakan gelombang cahaya.',
    isCorrect: true,
    category: 'Teknologi & Komputer',
    difficulty: 'sedang',
    explanation: 'Benar! Fiber optic memanfaatkan pantulan internal total pulsa cahaya untuk mengirim data berkecepatan tinggi.'
  },
  {
    id: 't3',
    statement: 'RAM (Random Access Memory) menyimpan data secara permanen bahkan saat komputer dimatikan.',
    isCorrect: false,
    category: 'Teknologi & Komputer',
    difficulty: 'mudah',
    explanation: 'Salah! RAM bersifat volatil, datanya akan terhapus seketika daya listrik terputus.'
  },
  {
    id: 't4',
    statement: 'Algoritma pencarian biner (Binary Search) memiliki kompleksitas waktu rata-rata O(log n).',
    isCorrect: true,
    category: 'Teknologi & Komputer',
    difficulty: 'sulit',
    explanation: 'Benar! Binary search membagi ruang pencarian menjadi setengah di setiap langkah pada data terurut.'
  },

  // Matematika & Logika
  {
    id: 'm1',
    statement: 'Bilangan 2 adalah satu-satunya bilangan prima yang bernilai genap.',
    isCorrect: true,
    category: 'Matematika & Logika',
    difficulty: 'mudah',
    explanation: 'Benar! Semua bilangan genap selain 2 selalu habis dibagi 2 sehingga memiliki lebih dari dua faktor.'
  },
  {
    id: 'm2',
    statement: 'Jumlah total sudut dalam bangun segitiga selalu sama dengan 180 derajat.',
    isCorrect: true,
    category: 'Matematika & Logika',
    difficulty: 'mudah',
    explanation: 'Benar! Pada geometri bidang datar Euclidean, jumlah sudut dalam segitiga selalu 180°.'
  },
  {
    id: 'm3',
    statement: 'Akar kuadrat dari bilangan 0,25 adalah 0,05.',
    isCorrect: false,
    category: 'Matematika & Logika',
    difficulty: 'sedang',
    explanation: 'Salah! Akar dari 0,25 adalah 0,5 (karena 0,5 x 0,5 = 0,25).'
  },
  {
    id: 'm4',
    statement: 'Bilangan Pi (π) dapat dinyatakan secara presisi sebagai pecahan rasional biasa.',
    isCorrect: false,
    category: 'Matematika & Logika',
    difficulty: 'sulit',
    explanation: 'Salah! Pi adalah bilangan irasional dan transendental, desimalnya tak berhingga dan tidak berulang (22/7 hanyalah aproksimasi).'
  },

  // Kesehatan & Tubuh
  {
    id: 'k1',
    statement: 'Jantung manusia memiliki empat ruang: dua serambi (atrium) dan dua bilik (ventrikel).',
    isCorrect: true,
    category: 'Kesehatan & Tubuh',
    difficulty: 'mudah',
    explanation: 'Benar! Jantung manusia terdiri dari atrium kanan-kiri dan ventrikel kanan-kiri.'
  },
  {
    id: 'k2',
    statement: 'Antibiotik sangat efektif untuk menyembuhkan penyakit flu yang disebabkan oleh virus.',
    isCorrect: false,
    category: 'Kesehatan & Tubuh',
    difficulty: 'sedang',
    explanation: 'Salah! Antibiotik hanya membunuh bakteri, bukan virus penyebab flu/selesma.'
  },
  {
    id: 'k3',
    statement: 'Tulang paha (femur) adalah tulang terpanjang sekaligus terkuat di dalam tubuh manusia.',
    isCorrect: true,
    category: 'Kesehatan & Tubuh',
    difficulty: 'mudah',
    explanation: 'Benar! Femur menopang sebagian besar bobot tubuh manusia saat berdiri dan berjalan.'
  },
  {
    id: 'k4',
    statement: 'Golongan darah AB positif dikenal sebagai donor darah universal untuk semua golongan darah.',
    isCorrect: false,
    category: 'Kesehatan & Tubuh',
    difficulty: 'sedang',
    explanation: 'Salah! O negatif adalah donor universal, sedangkan AB positif adalah resipien (penerima) universal.'
  },

  // Pengetahuan Umum
  {
    id: 'u1',
    statement: 'Danau Toba di Sumatera Utara merupakan danau vulkanik terbesar di dunia.',
    isCorrect: true,
    category: 'Pengetahuan Umum',
    difficulty: 'mudah',
    explanation: 'Benar! Danau Toba terbentuk akibat letusan gunung api super (supervolcano) ribuan tahun silam.'
  },
  {
    id: 'u2',
    statement: 'Benua Australia adalah benua terkecil di dunia berdasarkan luas daratannya.',
    isCorrect: true,
    category: 'Pengetahuan Umum',
    difficulty: 'mudah',
    explanation: 'Benar! Australia memiliki luas daratan terkecil dibandingkan 6 benua lainnya.'
  },
  {
    id: 'u3',
    statement: 'Sungai Amazon adalah sungai terpanjang di dunia melampaui Sungai Nil.',
    isCorrect: false,
    category: 'Pengetahuan Umum',
    difficulty: 'sedang',
    explanation: 'Salah! Secara konsensus geografis dunia, Sungai Nil di Afrika adalah sungai terpanjang (meski Amazon terbesar berdasarkan debit air).'
  },
  {
    id: 'u4',
    statement: 'Mata uang resmi negara Brasil dinamakan Real.',
    isCorrect: true,
    category: 'Pengetahuan Umum',
    difficulty: 'sulit',
    explanation: 'Benar! Mata uang Brasil adalah Brazilian Real (BRL).'
  }
];

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'lb-1',
    playerName: 'Bima Satria',
    playerAvatar: '🦁',
    score: 1850,
    accuracy: 95,
    difficulty: 'sulit',
    maxStreak: 12,
    date: '2026-10-25',
    timestamp: Date.now() - 172800000
  },
  {
    id: 'lb-2',
    playerName: 'Nadia Putri',
    playerAvatar: '🚀',
    score: 1520,
    accuracy: 90,
    difficulty: 'sedang',
    maxStreak: 9,
    date: '2026-10-26',
    timestamp: Date.now() - 86400000
  },
  {
    id: 'lb-3',
    playerName: 'Rian Pratama',
    playerAvatar: '⚡',
    score: 1280,
    accuracy: 85,
    difficulty: 'sedang',
    maxStreak: 7,
    date: '2026-10-26',
    timestamp: Date.now() - 43200000
  },
  {
    id: 'lb-4',
    playerName: 'Siti Rahma',
    playerAvatar: '🌸',
    score: 950,
    accuracy: 80,
    difficulty: 'mudah',
    maxStreak: 6,
    date: '2026-10-27',
    timestamp: Date.now() - 10800000
  }
];

export const StorageService = {
  // Questions Bank
  getQuestions(): Question[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(DEFAULT_QUESTIONS));
        return DEFAULT_QUESTIONS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_QUESTIONS;
    }
  },

  saveQuestions(questions: Question[]): void {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  },

  addQuestion(question: Omit<Question, 'id'>): Question {
    const questions = this.getQuestions();
    const newQ: Question = {
      ...question,
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    };
    questions.unshift(newQ);
    this.saveQuestions(questions);
    return newQ;
  },

  bulkAddQuestions(newQuestions: Omit<Question, 'id'>[]): number {
    const existing = this.getQuestions();
    const formatted: Question[] = newQuestions.map((q, idx) => ({
      ...q,
      id: `q_bulk_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`
    }));
    const combined = [...formatted, ...existing];
    this.saveQuestions(combined);
    return formatted.length;
  },

  deleteQuestion(id: string): void {
    const questions = this.getQuestions().filter((q) => q.id !== id);
    this.saveQuestions(questions);
  },

  resetQuestionsToDefault(): void {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(DEFAULT_QUESTIONS));
  },

  // Leaderboard
  getLeaderboard(): LeaderboardEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(DEFAULT_LEADERBOARD));
        return DEFAULT_LEADERBOARD;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_LEADERBOARD;
    }
  },

  addLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>): void {
    const list = this.getLeaderboard();
    const newEntry: LeaderboardEntry = {
      ...entry,
      id: 'lb_' + Date.now(),
      timestamp: Date.now()
    };
    list.push(newEntry);
    // Sort descending by score
    list.sort((a, b) => b.score - a.score);
    // Keep top 100
    const trimmed = list.slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(trimmed));
  },

  // Player Profile
  getCurrentPlayer(): PlayerProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYER);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }

    const defaultPlayer: PlayerProfile = {
      id: 'player_default',
      name: 'Pemain Hebat',
      avatar: '🌟',
      totalGames: 0,
      totalScore: 0,
      highestScore: 0,
      totalQuestionsAnswered: 0,
      totalCorrect: 0,
      longestStreak: 0,
      createdAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYER, JSON.stringify(defaultPlayer));
    return defaultPlayer;
  },

  saveCurrentPlayer(profile: PlayerProfile): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYER, JSON.stringify(profile));
  },

  // Match History & Analytics
  getMatchHistory(): GameSessionResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MATCH_HISTORY);
      if (!data) {
        // Seed some demo history for rich analytics out of the box
        const demoMatches: GameSessionResult[] = [
          {
            id: 'demo_m1',
            playerId: 'player_default',
            playerName: 'Pemain Hebat',
            score: 850,
            maxStreak: 5,
            totalQuestions: 8,
            correctCount: 7,
            accuracy: 87.5,
            difficulty: 'sedang',
            timestamp: Date.now() - 3600000 * 24,
            answers: [
              { questionId: 's1', statement: 'Fotosintesis menghasilkan oksigen...', category: 'Sains & Alam', playerAnswer: true, correctAnswer: true, isRight: true, timeSpentSeconds: 3.2 },
              { questionId: 'h1', statement: 'Candi Borobudur dibangun wangsa Syailendra...', category: 'Sejarah & Budaya', playerAnswer: true, correctAnswer: true, isRight: true, timeSpentSeconds: 4.1 },
              { questionId: 't1', statement: 'HTML adalah bahasa pemrograman...', category: 'Teknologi & Komputer', playerAnswer: false, correctAnswer: false, isRight: true, timeSpentSeconds: 2.8 },
              { questionId: 'm1', statement: 'Bilangan 2 adalah prima genap...', category: 'Matematika & Logika', playerAnswer: true, correctAnswer: true, isRight: true, timeSpentSeconds: 3.5 },
              { questionId: 's3', statement: 'Kelelawar buta total...', category: 'Sains & Alam', playerAnswer: true, correctAnswer: false, isRight: false, timeSpentSeconds: 6.2 },
              { questionId: 'k1', statement: 'Jantung memiliki 4 ruang...', category: 'Kesehatan & Tubuh', playerAnswer: true, correctAnswer: true, isRight: true, timeSpentSeconds: 2.5 },
              { questionId: 'u1', statement: 'Danau Toba danau vulkanik terbesar...', category: 'Pengetahuan Umum', playerAnswer: true, correctAnswer: true, isRight: true, timeSpentSeconds: 3.0 },
              { questionId: 't2', statement: 'Kabel optik menggunakan cahaya...', category: 'Teknologi & Komputer', playerAnswer: true, correctAnswer: true, isRight: true, timeSpentSeconds: 2.9 }
            ]
          }
        ];
        localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(demoMatches));
        return demoMatches;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  recordGameSession(session: GameSessionResult): void {
    const history = this.getMatchHistory();
    history.unshift(session);
    // Keep last 150 matches
    const trimmed = history.slice(0, 150);
    localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(trimmed));

    // Also update player profile stats
    const player = this.getCurrentPlayer();
    player.totalGames += 1;
    player.totalScore += session.score;
    if (session.score > player.highestScore) {
      player.highestScore = session.score;
    }
    player.totalQuestionsAnswered += session.totalQuestions;
    player.totalCorrect += session.correctCount;
    if (session.maxStreak > player.longestStreak) {
      player.longestStreak = session.maxStreak;
    }
    this.saveCurrentPlayer(player);

    // Also add to leaderboard
    const dateStr = new Date(session.timestamp).toISOString().split('T')[0];
    this.addLeaderboardEntry({
      playerName: session.playerName,
      playerAvatar: player.avatar,
      score: session.score,
      accuracy: Math.round(session.accuracy),
      difficulty: session.difficulty,
      maxStreak: session.maxStreak,
      date: dateStr
    });
  },

  // Calculate detailed analytics for dashboard
  getCategoryAnalytics(): CategoryStat[] {
    const history = this.getMatchHistory();
    const map = new Map<string, { total: number; correct: number; totalTime: number }>();

    history.forEach((session) => {
      session.answers.forEach((ans) => {
        const cat = ans.category || 'Lainnya';
        if (!map.has(cat)) {
          map.set(cat, { total: 0, correct: 0, totalTime: 0 });
        }
        const curr = map.get(cat)!;
        curr.total += 1;
        if (ans.isRight) curr.correct += 1;
        curr.totalTime += ans.timeSpentSeconds || 3;
      });
    });

    const results: CategoryStat[] = [];
    map.forEach((data, category) => {
      results.push({
        category,
        totalAttempts: data.total,
        correctAttempts: data.correct,
        accuracyPercentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        avgTimeSeconds: data.total > 0 ? Number((data.totalTime / data.total).toFixed(1)) : 0
      });
    });

    // Sort by total attempts descending
    return results.sort((a, b) => b.totalAttempts - a.totalAttempts);
  },

  // Get most missed questions
  getMostMissedQuestions(): { statement: string; category: string; wrongCount: number; totalCount: number; failRate: number }[] {
    const history = this.getMatchHistory();
    const map = new Map<string, { statement: string; category: string; wrong: number; total: number }>();

    history.forEach((session) => {
      session.answers.forEach((ans) => {
        const key = ans.statement;
        if (!map.has(key)) {
          map.set(key, { statement: ans.statement, category: ans.category, wrong: 0, total: 0 });
        }
        const curr = map.get(key)!;
        curr.total += 1;
        if (!ans.isRight) {
          curr.wrong += 1;
        }
      });
    });

    const list: { statement: string; category: string; wrongCount: number; totalCount: number; failRate: number }[] = [];
    map.forEach((item) => {
      if (item.total >= 1) {
        list.push({
          statement: item.statement,
          category: item.category,
          wrongCount: item.wrong,
          totalCount: item.total,
          failRate: Math.round((item.wrong / item.total) * 100)
        });
      }
    });

    return list.sort((a, b) => b.failRate - a.failRate).slice(0, 10);
  }
};
