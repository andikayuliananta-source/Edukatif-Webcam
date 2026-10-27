import Papa from 'papaparse';
import { Question, DifficultyLevel } from '../types';

export interface CSVParseResult {
  validQuestions: Omit<Question, 'id'>[];
  errors: string[];
  totalRows: number;
}

export const CSVService = {
  // Generate downloadable sample CSV template
  generateSampleCSV(): string {
    const headers = ['pertanyaan', 'jawaban', 'kategori', 'kesulitan', 'penjelasan'];
    const sampleRows = [
      [
        'Merkurius adalah planet terdekat dari Matahari di tata surya.',
        'BENAR',
        'Sains & Alam',
        'mudah',
        'Merkurius mengorbit paling dekat dengan matahari dengan periode 88 hari.'
      ],
      [
        'Monas di Jakarta diresmikan oleh Presiden B.J. Habibie.',
        'SALAH',
        'Sejarah & Budaya',
        'sedang',
        'Monas diresmikan oleh Presiden Soekarno dan dibuka untuk umum oleh Presiden Soeharto.'
      ],
      [
        'Kecepatan cahaya di ruang hampa adalah sekitar 300.000 km per detik.',
        'BENAR',
        'Sains & Alam',
        'sedang',
        'Tepatnya sekitar 299.792 kilometer per detik.'
      ],
      [
        'Segitiga sama sisi memiliki sudut dalam yang masing-masing bernilai 90 derajat.',
        'SALAH',
        'Matematika & Logika',
        'mudah',
        'Setiap sudut segitiga sama sisi adalah 60 derajat (total 180 derajat).'
      ]
    ];

    return Papa.unparse({
      fields: headers,
      data: sampleRows
    });
  },

  downloadSampleCSVFile() {
    const csvContent = this.generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_soal_gerakpintar.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportQuestionsToCSV(questions: Question[]) {
    const rows = questions.map((q) => [
      q.statement,
      q.isCorrect ? 'BENAR' : 'SALAH',
      q.category,
      q.difficulty,
      q.explanation || ''
    ]);

    const csvContent = Papa.unparse({
      fields: ['pertanyaan', 'jawaban', 'kategori', 'kesulitan', 'penjelasan'],
      data: rows
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bank_soal_gerakpintar_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Parse and validate uploaded CSV file content
  parseQuestionsCSV(fileContent: string): Promise<CSVParseResult> {
    return new Promise((resolve) => {
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
        complete: (results) => {
          const validQuestions: Omit<Question, 'id'>[] = [];
          const errors: string[] = [];

          const rows = results.data as Record<string, string>[];

          rows.forEach((row, index) => {
            const rowNumber = index + 2; // +1 for 0-index, +1 for header

            // Check field names (support indonesian and english aliases)
            const statement = row['pertanyaan'] || row['soal'] || row['statement'] || row['question'];
            const answerRaw = (row['jawaban'] || row['answer'] || row['kunci'] || '').trim().toLowerCase();
            const category = (row['kategori'] || row['category'] || 'Pengetahuan Umum').trim();
            const difficultyRaw = (row['kesulitan'] || row['difficulty'] || 'sedang').trim().toLowerCase();
            const explanation = (row['penjelasan'] || row['pembahasan'] || row['explanation'] || '').trim();

            if (!statement || statement.trim().length < 5) {
              errors.push(`Baris ${rowNumber}: Pertanyaan kosong atau terlalu pendek.`);
              return;
            }

            // Determine answer (true / false)
            let isCorrect: boolean;
            if (['benar', 'true', '1', 'b', 't', 'ya', 'yes'].includes(answerRaw)) {
              isCorrect = true;
            } else if (['salah', 'false', '0', 's', 'f', 'tidak', 'no'].includes(answerRaw)) {
              isCorrect = false;
            } else {
              errors.push(`Baris ${rowNumber}: Format jawaban '${row['jawaban']}' tidak valid. Gunakan 'BENAR' atau 'SALAH'.`);
              return;
            }

            // Normalize difficulty
            let difficulty: DifficultyLevel = 'sedang';
            if (['mudah', 'easy'].includes(difficultyRaw)) difficulty = 'mudah';
            else if (['sulit', 'hard'].includes(difficultyRaw)) difficulty = 'sulit';
            else difficulty = 'sedang';

            validQuestions.push({
              statement: statement.trim(),
              isCorrect,
              category: category || 'Pengetahuan Umum',
              difficulty,
              explanation: explanation || (isCorrect ? 'Jawaban yang tepat adalah Benar.' : 'Jawaban yang tepat adalah Salah.')
            });
          });

          resolve({
            validQuestions,
            errors,
            totalRows: rows.length
          });
        },
        error: (err: Error) => {
          resolve({
            validQuestions: [],
            errors: [`Gagal memproses file CSV: ${err.message}`],
            totalRows: 0
          });
        }
      });
    });
  }
};
