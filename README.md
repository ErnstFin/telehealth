# 🏥 TeleHealth - Sistem Chatbot Kesehatan & Knowledge Acquisition

**TeleHealth** adalah sistem tanya jawab kesehatan cerdas yang terintegrasi langsung dengan **Telegram Bot**, **n8n Workflow Automation**, **Database (PostgreSQL / Auto-Persistent Store)**, dan **Web Administrator Dashboard**.

TeleHealth menerapkan arsitektur **Knowledge Acquisition & Administrator Validation Pipeline** dengan prinsip utama:

> 🛡️ **Chatbot hanya boleh menggunakan pengetahuan kesehatan yang telah divalidasi oleh Administrator atau diimpor dari file eksternal tervalidasi (PDF, DOCX).**

---

## 🌟 Fitur Utama & Pembaruan Sistem (v1.1.0)

1. **Integrasi Bot Telegram Resmi & Multi-Device Cross-Access**:
   - Pengguna berinteraksi langsung melalui aplikasi Telegram dari perangkat manapun (HP Android/iOS, Desktop, Tablet, Web).
   - Menjawab pertanyaan seputar keluhan kesehatan, gejala penyakit, pertolongan pertama, dan pencegahan.
   - Dilengkapi **Health Guardrail Classifier** yang menolak pertanyaan di luar topik kesehatan secara sopan.
   - **Auto-Recovery Polling Conflict (409)** dan dukungan **Webhook Receiver** (`POST /api/chat/telegram-webhook`) untuk kemudahan hosting di Railway/Cloud.

2. **Dukungan Akses Multi-Bahasa & Respon Adaptif (Multilingual Engine)**:
   - **Deteksi Bahasa Otomatis**: Mendeteksi bahasa pengguna secara instan (**English**, **Bahasa Indonesia**, **Basa Jawa**, **Basa Sunda**).
   - **Cross-Lingual Medical Concept Bridge**: Pertanyaan dalam bahasa Inggris atau bahasa daerah secara cerdas dicocokkan dengan basis pengetahuan medis.
   - **Model Response Sesuai Bahasa Pengguna**: Format jawaban bot (Ringkasan Klinis, Poin Penanganan, Kapan ke Dokter, Disclaimer) otomatis disajikan dalam bahasa yang digunakan pengguna.
   - **Language Switcher Web Admin**: Toggle bahasa (🇮🇩 ID / 🇬🇧 EN) di dashboard admin.

3. **CRUD Kategori Medis Lengkap (Create, Read, Update, Delete)**:
   - Menu manajemen taksonomi kategori kesehatan dengan penambahan, pengeditan slug/icon, dan penghapusan aman (safe deletion & reassign).

4. **Reset Pengetahuan Terproteksi Password Super Admin**:
   - Fitur keamanan tinggi untuk mereset Knowledge Base ke **Standar Pedoman Klinis (PAPDI/WHO/Kemenkes)** atau mengosongkan arsip data dengan verifikasi password Super Administrator.

5. **Input & Import Data Pengetahuan dari File Eksternal (PDF, DOCX, TXT)**:
   - **Upload Dokumen**: Mendukung file pedoman klinis, SOP rumah sakit, artikel jurnal dalam format `.pdf`, `.docx`, `.doc`, `.txt`, dan `.md`.
   - **Smart Medical Heuristic Extractor**: Ekstraksi otomatis judul, kategori medis, penerbit, kata kunci, ringkasan jawaban, dan tanda bahaya.
   - **Batch Import**: Unggah hingga 10 dokumen sekaligus dengan 1-klik proses.

6. **Fallback ke Dokter (Doctor Queue) & Validasi Admin**:
   - Pertanyaan yang belum ada di Knowledge Base otomatis diteruskan ke antrian dokter.
   - Dokter menjawab melalui Web Admin, dan jawaban otomatis menjadi Knowledge Candidate (PENDING) untuk divalidasi administrator.

---

## 🏗️ Alur Pipeline Sistem

```
[Pengguna di Telegram]
       │
       ▼ (Pesan Masuk)
[Health Guardrail Classifier] ──(Bukan Topik Medis)──► [Penolakan Sopan & Batasan Layanan]
       │
       ▼ (Topik Medis)
[Knowledge Retrieval]
       │
       ├─────────────────────────────────────────┐
       ▼ (Ditemukan di KB Aktif)                 ▼ (Tidak Ditemukan / Relevansi Rendah)
[Jawaban Terstruktur dari KB]             [Masuk Antrian Dokter (Doctor Queue)]
       │                                         │
       ▼ (Kirim ke User Telegram)                ▼
                                          [Dokter Menjawab di Web Admin]
                                                 │
                                                 ├─────────────────────────────────────────┐
                                                 ▼ (Kirim ke User Telegram)                ▼
                                          [Jawaban Diterima User]             [Otomatis Jadi Knowledge Candidate (PENDING)]
                                                                                           │
                                                                                           ▼
                                                                              [Review oleh Admin Validator]
                                                                                           │
                                                                   ┌───────────────────────┴───────────────────────┐
                                                                   ▼ (VALIDATE)                                    ▼ (REJECT)
                                                        [Masuk ke Knowledge Base (ACTIVE)]              [Ditolak & Dicatat di Audit Log]
                                                                   ▲
                                                                   │ (Import Langsung)
                                                        [File Eksternal: PDF / DOCX]
```

---

## 🚀 Cara Menjalankan

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Environment
Salin file `.env.example` menjadi `.env`:
```bash
copy .env.example .env
```
Pastikan token bot Telegram Anda terpasang pada `TELEGRAM_BOT_TOKEN`:
```env
PORT=3000
TELEGRAM_BOT_TOKEN=8993419097:AAF5V9PJBUv4zuC4a4LfAtVSzhj3roqMiKw
TELEGRAM_BOT_POLLING=true
```

### 3. Menjalankan Server
```bash
npm start
```
Akses antarmuka Web Administrator di browser:
👉 **http://localhost:3000**

### 4. Menjalankan Pengujian Otomatis
```bash
npm test
```
*Menjalankan seluruh unit test dan end-to-end test suite untuk validasi bot, fallback dokter, candidate review, serta parser dokumen PDF/DOCX.*

---

## 📁 Struktur Dokumen yang Direkomendasikan untuk PDF / DOCX

Sistem parser dokumen TeleHealth bekerja optimal jika dokumen eksternal memuat informasi berikut:
- **Judul Dokumen** (misal: `Judul: Tata Laksana Hipertensi`)
- **Penerbit / Asosiasi** (misal: `Penerbit: PAPDI / Kemenkes RI`)
- **Kata Kunci** (misal: `Kata Kunci: darah tinggi, tensi, hipertensi`)
- **Ringkasan / Abstrak** (penjelasan klinis ringkas)
- **Hal Penting / Rekomendasi** (dalam bentuk poin/bullet)
- **Kapan Perlu ke Dokter / Tanda Bahaya** (indikasi darurat / rujukan)

---

## 📄 Lisensi
Sistem ini dirancang untuk keperluan TeleHealth & Medical Knowledge Base Management.
