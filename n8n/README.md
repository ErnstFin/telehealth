# TeleHealth - n8n Workflow Automation Guide

Dokumen ini menjelaskan arsitektur integrasi antara **n8n Workflow Automation**, **Telegram Bot**, dan **TeleHealth Core Engine**.

---

## 1. Arsitektur Integrasi n8n

```
[Pengguna Telegram]
       │
       ▼ (Pesan Telegram)
[Telegram Trigger Node di n8n]
       │
       ▼ (Ekstraksi Pesan & Metadata)
[HTTP Request Node: POST /api/chat/ask]
       │
       ├─────────────────────────────────────────┐
       ▼ (Status: ANSWERED_BY_KB)                ▼ (Status: FORWARDED_TO_DOCTOR)
[Kirim Jawaban Valid ke Telegram]         [Kirim Info Antrian Dokter ke Telegram]
                                                 │
                                                 ▼
                                          [Dokter Menjawab di Web Admin]
                                                 │
                                                 ▼ (POST Webhook n8n)
                                          [Kirim Jawaban Dokter ke Telegram User]
                                                 │
                                                 ▼
                                          [Notifikasi Kandidat ke Admin]
```

---

## 2. File Workflow yang Tersedia

1. `telehealth_main_workflow.json`
   - **Tujuan:** Menangani pertanyaan masuk dari Telegram Bot secara otomatis.
   - **Fitur:**
     - Validasi topik kesehatan (Guardrails)
     - Pencarian Knowledge Base terverifikasi (Status: ACTIVE saja)
     - Percabangan: Jika ditemukan $\rightarrow$ Kirim jawaban terstruktur lengkap dengan sumber & disclaimer.
     - Percabangan: Jika tidak ditemukan $\rightarrow$ Masukkan ke antrian dokter (*Doctor Queue*) & kirim pemberitahuan kepada user.
     - Percabangan: Jika non-kesehatan $\rightarrow$ Kirim penolakan sopan mengenai batasan medis.

2. `telehealth_doctor_response_workflow.json`
   - **Tujuan:** Menangani pengiriman jawaban dari dokter kepada pengguna Telegram dan pembuatan kandidat pengetahuan (*Knowledge Candidate*).
   - **Fitur:**
     - Menerima webhook saat dokter menjawab pertanyaan.
     - Mengirimkan pesan Markdown jawaban dokter kepada pengguna yang bersangkutan.
     - Mengirimkan pesan alert ke channel/grup Admin Validator untuk meninjau kandidat pengetahuan baru.

---

## 3. Cara Mengimpor Workflow ke n8n

1. Buka dashboard n8n Anda (misalnya di `http://localhost:5678`).
2. Buat Workflow baru atau klik menu **Workflows $\rightarrow$ Import from File**.
3. Pilih salah satu file JSON di direktori ini:
   - `telehealth_main_workflow.json`
   - `telehealth_doctor_response_workflow.json`
4. Konfigurasikan kredensial Telegram:
   - Buat kredensial **Telegram Account** di n8n dengan memasukkan `Access Token` dari BotFather.
5. Simpan dan aktifkan (**Active: ON**) workflow tersebut.

---

## 4. Konfigurasi Endpoint Webhook & Environment

Pastikan TeleHealth server berjalan di `http://localhost:3000` (atau URL server Anda).

Variabel environment di `.env` TeleHealth:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
N8N_MAIN_WEBHOOK_URL=http://localhost:5678/webhook/telehealth-chat
N8N_DOCTOR_WEBHOOK_URL=http://localhost:5678/webhook/telehealth-doctor-answer
```

---

## 5. Uji Coba Payload Manual via cURL / Postman

### A. Uji Coba Chat (Pertanyaan Kesehatan):
```bash
curl -X POST http://localhost:3000/api/chat/ask \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bagaimana mengatasi gejala flu awal?",
    "telegramChatId": "12345678",
    "username": "budi_santoso",
    "firstName": "Budi"
  }'
```

### B. Uji Coba Chat (Pertanyaan Non-Kesehatan):
```bash
curl -X POST http://localhost:3000/api/chat/ask \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Siapa presiden Indonesia saat ini?",
    "telegramChatId": "12345678"
  }'
```

### C. Uji Coba Chat (Pertanyaan Belum Ada di KB $\rightarrow$ Masuk Doctor Queue):
```bash
curl -X POST http://localhost:3000/api/chat/ask \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Apakah nyeri dada tajam seperti ditusuk jarum saat menarik napas dalam berbahaya?",
    "telegramChatId": "12345678"
  }'
```
