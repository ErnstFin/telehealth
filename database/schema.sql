-- ==========================================================
-- TELEHEALTH DATABASE SCHEMA (PostgreSQL)
-- ==========================================================
-- Sistem Chatbot Kesehatan & Knowledge Acquisition TeleHealth
-- ==========================================================

-- 1. Tabel Users (Data Pengguna Telegram)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    phone_number VARCHAR(50),
    preferred_lang VARCHAR(10) DEFAULT 'id',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Categories (Kategori Kesehatan)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'stethoscope',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Sources (Sumber Pengetahuan: Jurnal, Dokter, Panduan Medis)
CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('JOURNAL', 'LITERATURE', 'DOCTOR', 'OFFICIAL_GUIDELINE')),
    publisher VARCHAR(255),
    year INTEGER,
    url VARCHAR(500),
    is_trusted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Knowledge (Knowledge Base yang telah divalidasi)
CREATE TABLE IF NOT EXISTS knowledge (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    topic_keywords TEXT NOT NULL, -- Komma dipisah untuk indexing & pencarian
    short_answer TEXT NOT NULL,
    important_points TEXT NOT NULL, -- JSON String atau Bullet point list
    when_to_see_doctor TEXT NOT NULL,
    content_full TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    validated_by VARCHAR(100) DEFAULT 'Administrator',
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Knowledge Candidates (Kandidat Pengetahuan dari Respon Dokter atau Jurnal Baru)
CREATE TABLE IF NOT EXISTS knowledge_candidates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('DOCTOR_RESPONSE', 'JOURNAL', 'LITERATURE')),
    question_text TEXT,
    proposed_answer TEXT NOT NULL,
    important_points TEXT,
    when_to_see_doctor TEXT,
    source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
    doctor_name VARCHAR(150),
    doctor_id VARCHAR(100),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VALID', 'REJECTED')),
    rejection_reason TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by VARCHAR(100)
);

-- 6. Tabel Questions (Riwayat Pertanyaan Pengguna Telegram)
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    telegram_chat_id VARCHAR(100),
    telegram_message_id VARCHAR(100),
    question_text TEXT NOT NULL,
    is_health_topic BOOLEAN DEFAULT TRUE,
    relevance_score REAL DEFAULT 0.0,
    matched_knowledge_id INTEGER REFERENCES knowledge(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ANSWERED_BY_KB', 'FORWARDED_TO_DOCTOR', 'REJECTED_NON_HEALTH', 'ANSWERED_BY_DOCTOR')),
    bot_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Doctor Questions (Antrian Pertanyaan Pengguna untuk Dokter)
CREATE TABLE IF NOT EXISTS doctor_questions (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    telegram_chat_id VARCHAR(100),
    question_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ASSIGNED', 'ANSWERED', 'ARCHIVED')),
    assigned_doctor_id VARCHAR(100),
    assigned_doctor_name VARCHAR(150),
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel Doctor Responses (Jawaban dari Tenaga Medis)
CREATE TABLE IF NOT EXISTS doctor_responses (
    id SERIAL PRIMARY KEY,
    doctor_question_id INTEGER REFERENCES doctor_questions(id) ON DELETE CASCADE,
    doctor_id VARCHAR(100) NOT NULL,
    doctor_name VARCHAR(150) NOT NULL,
    response_text TEXT NOT NULL,
    medical_advice TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel Validation Logs (Riwayat Validasi Administrator)
CREATE TABLE IF NOT EXISTS validation_logs (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES knowledge_candidates(id) ON DELETE SET NULL,
    knowledge_id INTEGER REFERENCES knowledge(id) ON DELETE SET NULL,
    admin_user VARCHAR(100) NOT NULL DEFAULT 'Administrator',
    action VARCHAR(50) NOT NULL CHECK (action IN ('VALIDATED', 'REJECTED', 'EDITED_AND_VALIDATED', 'DEACTIVATED', 'REACTIVATED')),
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk optimasi query pencarian
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON knowledge_candidates(status);
CREATE INDEX IF NOT EXISTS idx_doctor_questions_status ON doctor_questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_user ON questions(user_id);
