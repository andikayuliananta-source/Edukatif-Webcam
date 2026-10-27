# GerakPintar 🧠✨

**Aplikasi Permainan Edukatif Soal Benar & Salah Berbasis Deteksi Gerak Webcam Real-Time**

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web_Audio_API-emerald)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

---

## 📖 Tentang Aplikasi

**GerakPintar** adalah aplikasi web edukatif interaktif yang menggabungkan kuis pengetahuan umum berbasis pernyataan **Benar atau Salah** dengan teknologi pengenalan gerak kamera (*Computer Vision via HTML5 Canvas Frame Differencing*). 

Pemain menjawab soal bukan sekadar mengklik mouse, melainkan dengan melompat atau menggerakkan tubuh/tangan ke zona layar secara kinestetik:
- 👈 **Lompat / Geser ke Sisi Kiri** = Menjawab **SALAH (❌)**
- 👉 **Lompat / Geser ke Sisi Kanan** = Menjawab **BENAR (✔️)**

Metode pembelajaran kinestetik ini dirancang untuk meningkatkan fokus, aktivitas fisik sehat, dan daya ingat pemain baik anak-anak maupun dewasa.

---

## 🚀 Fitur Unggulan

### 1. 📷 Deteksi Gerak Webcam Cerdas (60 FPS)
- **Tampilan Cermin Real-Time**: Umpan webcam yang disinkronkan langsung dengan zona interaktif.
- **Centroid & Heat Tracking**: Titik pelacak gerak tubuh/tangan dinamis di layar.
- **Konfirmasi Dwell Progress Meter**: Bar pengisi durasi tahan posisi sebelum jawaban terkunci otomatis.
- **Kalibrasi & Sensitivitas**: Pengaturan sensitivitas gerakan (Rendah, Sedang, Tinggi) dan kalibrasi posisi netral latar belakang.
- **Aksesibilitas Ganda**: Mendukung tombol keyboard (`⬅️` / `A` untuk Salah, `➡️` / `D` untuk Benar) dan tombol klik langsung jika kamera tidak tersedia.

### 2. ⚡ Skor Dinamis & Animasi Visual Menarik
- **Floating Points Badge**: Animasi skor melayang dinamis di layar setiap jawaban benar (`+150 Poin!`, `Streak x1.5`, `Bonus Kecepatan`).
- **Efek Konfeti Selebrasi**: Ledakan partikel konfeti (`canvas-confetti`) saat meraih jawaban tepat dan combo panjang.
- **Feedback Visual & Audio Khusus**:
  - **Benar**: Flash hijau, konfeti, arpeggio nada major ceria, serta kartu edukasi penjelasan ilmiah.
  - **Salah**: Efek getar layar merah (*shake pulse*), buzzer audio disonan, dan pembahasan koreksi jawaban.

### 3. 🔊 Suara Notifikasi Sintetis (Web Audio API)
- Bebas ketergantungan file audio eksternal (100% menggunakan osilator frekuensi Web Audio API native tanpa latency).
- Dilengkapi efek suara metronom hitung mundur darurat dan kontrol bisu (*Mute / Unmute*) di bilah navigasi.

### 4. 🎚️ Pilihan Tingkat Kesulitan
| Tingkat | Waktu per Soal | Pengali Poin | Ambang Tahan Zona |
| :--- | :--- | :--- | :--- |
| **Mudah** | 14 detik | 1.0x | Relaks (santai) |
| **Sedang** | 10 detik | 1.5x | Standar |
| **Sulit** | 6 detik | 2.0x | Cepat & Refleks Kilat |

### 5. 🏆 Papan Peringkat Juara (Leaderboard)
- Podium 3 Besar dengan lencana Emas (#1), Perak (#2), dan Perunggu (#3).
- Filter berdasarkan tingkat kesulitan (*Semua, Mudah, Sedang, Sulit*) dan kotak pencarian nama pemain.
- Menampilkan metrik: Nama, Skor Tertinggi, Persentase Akurasi, dan Max Combo Streak.

### 6. 👤 Profil Pemain & Riwayat Statistik
- Kustomisasi nama pemain dan pemilihan emoji avatar interaktif.
- Total sesi kuis yang telah diselesaikan.
- Persentase akurasi keseluruhan (*overall accuracy*).
- Riwayat pertandingan kronologis lengkap beserta waktu, durasi, dan rincian perolehan nilai.

### 7. 🔐 Portal Khusus Administrator & Unggah Massal (CSV/Excel)
- **Diproteksi Login Administrator**:
  - **Email**: `andika.yuliananta@gmail.com`
  - **Password**: `Andika06071996`
- **Manajemen Soal (CRUD)**: Tambah, edit, filter, dan hapus soal manual.
- **Unggah Massal (Bulk Upload CSV)**:
  - Dukungan file format CSV yang kompatibel dengan Microsoft Excel dan Google Sheets.
  - Validasi baris per baris dengan deteksi error sebelum disimpan.
  - Tombol **Unduh Template CSV** contoh dan tombol **Ekspor Seluruh Bank Soal**.

### 8. 📊 Dashboard Analitik Pembelajaran
- Pemantauan performa pemain rata-rata di tiap kategori (*Sains & Alam, Sejarah & Budaya, Teknologi & Komputer, Matematika & Logika, Kesehatan & Tubuh, Pengetahuan Umum*).
- Rata-rata kecepatan reaksi gerakan menjawab (detik/soal).
- Daftar **Soal yang Paling Sering Salah Dijawab** (*Most Missed Questions*) untuk memudahkan guru/evaluator materi dalam melakukan pengayaan materi.

---

## 🛠️ Panduan Format File CSV Impor Massal

Gunakan format kolom berikut pada baris pertama file CSV Anda:

```csv
pertanyaan,jawaban,kategori,kesulitan,penjelasan
"Merkurius adalah planet terdekat dari Matahari di tata surya.",BENAR,Sains & Alam,mudah,"Merkurius mengorbit paling dekat dengan matahari dengan periode 88 hari."
"Monas di Jakarta diresmikan oleh Presiden B.J. Habibie.",SALAH,Sejarah & Budaya,sedang,"Monas diresmikan oleh Presiden Soekarno."
"Kabel serat optik mentransmisikan data menggunakan gelombang cahaya.",BENAR,Teknologi & Komputer,sedang,"Fiber optic memanfaatkan pantulan internal total pulsa cahaya."
```

*Catatan:*
- Kolom `jawaban` menerima nilai: `BENAR` / `SALAH` (atau `TRUE` / `FALSE`).
- Kolom `kesulitan` menerima nilai: `mudah`, `sedang`, atau `sulit`.

---

## 💻 Cara Menjalankan Proyek Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih tinggi
- NPM atau PNPM / Yarn

### Langkah Instalasi

1. **Clone repositori dari GitHub**:
   ```bash
   git clone https://github.com/username/gerakpintar.git
   cd gerakpintar
   ```

2. **Instal seluruh dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan development server**:
   ```bash
   npm run dev
   ```
   Buka peramban di `http://localhost:3000` (atau port yang ditampilkan di terminal).

4. **Kompilasi produksi (Build)**:
   ```bash
   npm run build
   ```

---

## 📂 Struktur Direktori Proyek

```
├── public/                 # Aset statis publik
├── src/
│   ├── components/
│   │   ├── AdminQuestionsView.tsx    # Portal Admin & autentikasi & bulk CSV
│   │   ├── AnalyticsDashboardView.tsx # Dashboard performa & evaluasi
│   │   ├── GameScreen.tsx            # Panggung kuis & visual webcam HUD
│   │   ├── LeaderboardView.tsx       # Papan peringkat & podium
│   │   ├── Navbar.tsx                # Navigasi & kontrol audio
│   │   └── ProfileView.tsx           # Profil pemain & riwayat statistik
│   ├── hooks/
│   │   └── useWebcamTracker.ts       # Algoritma Computer Vision deteksi gerak
│   ├── services/
│   │   ├── csvParser.ts              # Pengolah impor/ekspor CSV & template
│   │   ├── sound.ts                  # Web Audio API synthesizer efek suara
│   │   └── storage.ts                # Penyimpanan lokal & bank soal default
│   ├── types.ts                      # Definisi tipe data TypeScript
│   ├── App.tsx                       # Komponen root aplikasi
│   ├── index.css                     # Tailwind CSS v4 styling
│   └── main.tsx                      # Entry point React 19
├── metadata.json           # Metadata aplikasi AI Studio
├── package.json            # Daftar dependensi dan scripts
├── tsconfig.json           # Konfigurasi TypeScript
├── vite.config.ts          # Konfigurasi Vite
└── README.md               # Dokumentasi proyek
```

---

## 🛡️ Lisensi & Kontribusi

Proyek ini dilisensikan di bawah lisensi [Apache-2.0](LICENSE). 
Dibuat dengan dedikasi untuk edukasi interaktif dan kinestetik masa depan. Silakan buat *pull request* atau ajukan *issue* untuk perbaikan dan penambahan fitur materi kuis!
