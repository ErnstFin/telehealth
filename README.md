# 🏥 TeleHealth - Sistem Chatbot Kesehatan & Knowledge Acquisition

**TeleHealth** adalah sistem tanya jawab kesehatan cerdas yang terintegrasi langsung dengan **Telegram Bot**, **n8n Workflow Automation**, **Database (PostgreSQL / Auto-Persistent Store)**, dan **Web Administrator Dashboard**.

TeleHealth menerapkan arsitektur **Knowledge Acquisition & Administrator Validation Pipeline** dengan prinsip utama:

> 🛡️ **Chatbot hanya boleh menggunakan pengetahuan kesehatan yang telah divalidasi oleh Administrator atau diimpor dari file eksternal tervalidasi (PDF, DOCX).**

---

## 🌟 Fitur Utama & Pembaruan Sistem

1. **Integrasi Bot Telegram Resmi**:
   - Pengguna berinteraksi langsung melalui aplikasi Telegram.
   - Menjawab pertanyaan seputar keluhan kesehatan, gejala penyakit, pertolongan pertama, dan pencegahan.
   - Dilengkapi **Health Guardrail Classifier** yang menolak pertanyaan di luar topik kesehatan secara sopan (politik, coding, perbaikan teknis, hiburan, dll).
   - Format respon terstruktur: **Jawaban Singkat**, **Hal Penting**, **Kapan Perlu ke Dokter**, **Sumber Terpercaya**, dan **Medical Disclaimer**.

2. **Input & Import Data Pengetahuan dari File Eksternal (PDF, DOCX, TXT)**:
   - **Upload Dokumen**: Mendukung file pedoman klinis, SOP rumah sakit, artikel jurnal, atau pedoman kesehatan dalam format `.pdf`, `.docx`, `.doc`, `.txt`, dan `.md`.
   - **Smart Medical Heuristic Extractor**: Mengekstrak otomatis judul, kategori medis, penerbit/organisasi, kata kunci pencarian bot, ringkasan jawaban klinis, poin-poin penanganan, dan tanda bahaya (red flags).
   - **Pilihan Jalur Validasi**:
     - *Simpan Langsung ke Knowledge Base Tervalidasi (`ACTIVE`)*: Untuk dokumen resmi yang sudah tervalidasi sehingga chatbot Telegram langsung dapat menggunakannya.
     - *Kirim ke Antrian Review Candidates (`PENDING`)*: Untuk ditinjau terlebih dahulu oleh tim dokter/administrator.
   - **Batch Import**: Kemampuan mengunggah banyak file dokumen sekaligus dengan 1-klik proses.
   - **Form Input Manual**: Formulir terstruktur untuk input pedoman medis secara manual.

3. **Fallback ke Dokter (Doctor Queue)**:
   - Jika pertanyaan pengguna belum tersedia di Knowledge Base (skor relevansi < 58%), sistem tidak mengarang jawaban.
   - Pertanyaan otomatis masuk ke **Antrian Dokter** (`WAITING`).
   - Dokter memberikan respon klinis dan saran medis melalui dashboard Web Admin.
   - Jawaban dokter langsung diteruskan ke Telegram pengguna.

4. **Knowledge Acquisition & Administrator Validation**:
   - Setiap respon dokter otomatis menjadi **Knowledge Candidate** berstatus `PENDING`.
   - Administrator mereview kandidat:
     - **VALIDATE**: Dipromosikan ke Knowledge Base aktif (`ACTIVE`) sehingga bot dapat menjawab pertanyaan serupa secara mandiri.
     - **REJECT**: Ditolak dengan alasan wajib (dicatat dalam audit trail).
   - Semua riwayat terekam dalam **Validation Logs**.

5. **Web Administrator Dashboard**:
   - **Dashboard Overview**: Ringkasan KPI, grafik distribusi kategori medis, grafik resolusi pertanyaan, dan log audit.
   - **Knowledge Base**: Manajemen data, pencarian kata kunci, filter kategori, aktivasi/deaktivasi status.
   - **Knowledge Validator**: Antarmuka peninjauan kandidat pengetahuan dari dokter & literatur.
   - **Doctor Questions**: Antrian pertanyaan pengguna Telegram yang menunggu jawaban dokter.
   - **Input & Import Dokumen**: Antarmuka komprehensif untuk upload file PDF/DOCX dan input jurnal.
   - **Validation Logs**: Jejak audit kronologis setiap aksi persetujuan dan penolakan.
   - **Kategori & Sumber**: Manajemen taksonomi medis dan sumber terpercaya.
   - **Bot Telegram & Settings**: Status koneksi bot Telegram, diagnosa sistem, dan integrasi n8n.

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
