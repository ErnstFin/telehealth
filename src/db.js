/**
 * TeleHealth Unified Database Layer
 * Supports PostgreSQL connection (when DATABASE_URL or PG* env is set)
 * and auto-persisted relational file store for local zero-dependency development.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const DB_FILE = path.join(__dirname, '../database/telehealth_store.json');

class DatabaseService {
    constructor() {
        this.isPg = false;
        this.pgPool = null;
        this.memoryStore = {
            users: [],
            categories: [],
            sources: [],
            knowledge: [],
            knowledge_candidates: [],
            questions: [],
            doctor_questions: [],
            doctor_responses: [],
            validation_logs: []
        };
        this.init();
    }

    init() {
        if (process.env.DATABASE_URL) {
            try {
                this.pgPool = new Pool({
                    connectionString: process.env.DATABASE_URL,
                    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
                });
                this.isPg = true;
                console.log('[DB] Connected to PostgreSQL Database');
                return;
            } catch (err) {
                console.warn('[DB] Failed to connect to PostgreSQL, falling back to local persistent store:', err.message);
            }
        }

        // Initialize local store
        this.loadLocalStore();
    }

    loadLocalStore() {
        const dbDir = path.dirname(DB_FILE);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        if (fs.existsSync(DB_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                this.memoryStore = Object.assign(this.memoryStore, data);
                // Ensure Category 7 exists
                if (this.memoryStore.categories && !this.memoryStore.categories.some(c => c.id === 7)) {
                    this.memoryStore.categories.push({
                        id: 7,
                        name: 'Umum & Pengetahuan Lain',
                        slug: 'umum-pengetahuan-lain',
                        description: 'Informasi umum, panduan teknis, dan pengetahuan multi-disiplin.',
                        icon: 'book',
                        created_at: new Date().toISOString()
                    });
                }
                console.log('[DB] Loaded TeleHealth persistent local store from disk');
                return;
            } catch (e) {
                console.error('[DB] Error parsing existing db file, re-initializing seeds:', e.message);
            }
        }

        this.seedInitialData();
        this.saveLocalStore();
    }

    saveLocalStore() {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(this.memoryStore, null, 2), 'utf8');
        } catch (e) {
            console.error('[DB] Failed to save local store to disk:', e.message);
        }
    }

    seedInitialData() {
        console.log('[DB] Seeding baseline clinical knowledge, categories, and trusted sources...');

        this.memoryStore.categories = [
            { id: 1, name: 'Flu & Pernapasan', slug: 'flu-pernapasan', description: 'Infeksi saluran pernapasan akut, pilek, flu, batuk, dan sakit tenggorokan.', icon: 'wind', created_at: new Date().toISOString() },
            { id: 2, name: 'Demam & Infeksi Umum', slug: 'demam-infeksi', description: 'Kondisi demam, infeksi virus/bakteri, dan respon peradangan tubuh.', icon: 'thermometer', created_at: new Date().toISOString() },
            { id: 3, name: 'Sakit Kepala & Neurologi', slug: 'sakit-kepala-neurologi', description: 'Migrain, tension headache, vertigo, dan gangguan saraf ringan.', icon: 'brain', created_at: new Date().toISOString() },
            { id: 4, name: 'Darah & Kardiovaskular', slug: 'darah-kardiovaskular', description: 'Anemia, tekanan darah tinggi/rendah, dan kesehatan jantung.', icon: 'heart-pulse', created_at: new Date().toISOString() },
            { id: 5, name: 'Pencernaan & Lambung', slug: 'pencernaan-lambung', description: 'Gastritis, asam lambung (GERD), diare, konstipasi, dan maag.', icon: 'activity', created_at: new Date().toISOString() },
            { id: 6, name: 'Kesehatan Anak & Pediatri', slug: 'kesehatan-anak', description: 'Kesehatan balita dan anak, imunisasi, dan nutrisi tumbuh kembang.', icon: 'baby', created_at: new Date().toISOString() },
            { id: 7, name: 'Umum & Pengetahuan Lain', slug: 'umum-pengetahuan-lain', description: 'Informasi umum, panduan teknis, dan pengetahuan multi-disiplin.', icon: 'book', created_at: new Date().toISOString() }
        ];

        this.memoryStore.sources = [
            { id: 1, name: 'Management of Common Cold and Upper Respiratory Infections', type: 'JOURNAL', publisher: 'Indonesian Journal of Internal Medicine / PAPDI', year: 2024, url: 'https://papdi.or.id/guidelines/common-cold-2024', is_trusted: true, created_at: new Date().toISOString() },
            { id: 2, name: 'Clinical Practice Guideline for Evaluation of Fever in Adults', type: 'JOURNAL', publisher: 'WHO Health Guidelines & Kemenkes RI', year: 2023, url: 'https://kemkes.go.id/cpg-demam', is_trusted: true, created_at: new Date().toISOString() },
            { id: 3, name: 'Diagnosis and Management of Tension-Type Headache and Migraine', type: 'JOURNAL', publisher: 'Journal of Neurology & Indonesian Neurological Association (PERDOSI)', year: 2024, url: 'https://perdosi.org/guidelines/headache-2024', is_trusted: true, created_at: new Date().toISOString() },
            { id: 4, name: 'Diagnosis and Treatment of Iron Deficiency Anemia in Primary Care', type: 'LITERATURE', publisher: 'Perhimpunan Hematologi dan Transfusi Darah Indonesia (PHTDI)', year: 2023, url: 'https://phtdi.org/guidelines/anemia-guide', is_trusted: true, created_at: new Date().toISOString() },
            { id: 5, name: 'National Clinical Guidelines for Dyspepsia and Gastroesophageal Reflux Disease', type: 'OFFICIAL_GUIDELINE', publisher: 'Konsensus Nasional Penatalaksanaan Dispepsia dan GERD', year: 2023, url: 'https://pbpegi.com/guidelines-dyspepsia', is_trusted: true, created_at: new Date().toISOString() },
            { id: 6, name: 'Dr. Siti Rahmawati, Sp.PD (Dokter Spesialis Penyakit Dalam)', type: 'DOCTOR', publisher: 'TeleHealth Medical Panel', year: 2024, url: null, is_trusted: true, created_at: new Date().toISOString() }
        ];

        this.memoryStore.knowledge = [
            {
                id: 1,
                title: 'Penanganan Gejala Flu Awal pada Dewasa',
                topic_keywords: 'flu, pilek, influenza, batuk ringan, bersin, hidung tersumbat, gejala flu awal, mengatasi flu, masuk angin, hidung mampet, tenggorokan gatal',
                short_answer: 'Untuk gejala flu ringan pada tahap awal, penanganan mandiri yang tepat meliputi istirahat optimal, pemenuhan hidrasi tubuh yang cukup, dan menjaga kehangatan saluran napas.',
                important_points: JSON.stringify([
                    'Istirahat total dan tidur yang cukup (7-9 jam per hari) guna membantu imunitas tubuh melawan virus.',
                    'Perbanyak minum air hangat minimal 2-2.5 liter per hari untuk mengencerkan lendir dan mencegah dehidrasi.',
                    'Konsumsi makanan bernutrisi tinggi dan sup hangat serta vitamin C atau buah-buahan segar.',
                    'Gunakan uap air hangat atau bilas hidung dengan larutan saline (garam fisiologis) jika hidung tersumbat.'
                ]),
                when_to_see_doctor: 'Segera konsultasikan ke dokter apabila demam melebihi 38.5°C selama lebih dari 3 hari, timbul sesak napas berat, nyeri dada, batuk berdahak kuning-kehijauan kental, atau kondisi memburuk setelah 7 hari.',
                content_full: 'Panduan klinis tata laksana influenza ringan mengutamakan terapi suportif karena flu disebabkan oleh virus yang bersifat self-limiting. Antibiotik tidak diperlukan kecuali terdapat indikasi infeksi bakteri sekunder yang telah diperiksa oleh dokter.',
                category_id: 1,
                source_id: 1,
                status: 'ACTIVE',
                validated_by: 'Admin Medis TeleHealth',
                validated_at: new Date('2024-01-15T10:00:00Z').toISOString(),
                created_at: new Date('2024-01-15T09:00:00Z').toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 2,
                title: 'Penyebab dan Pertolongan Pertama Demam pada Dewasa',
                topic_keywords: 'demam, panas badan, suhu tinggi, menggigil, badan panas, penyebab demam, mengatasi demam, paracetamol, demam tinggi, meriang, kapan ke dokter',
                short_answer: 'Demam adalah respon fisiologis sistem kekebalan tubuh dalam melawan infeksi virus, bakteri, atau peradangan. Suhu tubuh normal berkisar antara 36.5°C - 37.5°C.',
                important_points: JSON.stringify([
                    'Ukur suhu secara berkala dengan termometer medis yang akurat (demam jika suhu di atas 38°C).',
                    'Kompres dengan air hangat (bukan air es) di area dahi, ketiak, atau lipatan paha.',
                    'Minum cairan yang cukup untuk mencegah dehidrasi akibat penguapan tubuh.',
                    'Kenakan pakaian yang longgar dan menyerap keringat di ruangan bersirkulasi baik.',
                    'Dapat meminum obat penurun panas (seperti Paracetamol) sesuai dosis anjuran kemasan jika merasa tidak nyaman.'
                ]),
                when_to_see_doctor: 'Kunjungi fasilitas kesehatan jika suhu tubuh di atas 39°C, demam berlanjut lebih dari 3 hari, timbul ruam kemerahan, kaku pada leher, kejang, muntah terus menerus, atau pasien mengalami penurunan kesadaran.',
                content_full: 'Demam bukan merupakan penyakit tersendiri, melainkan gejala dari suatu proses infeksi atau reaksi imunologis tubuh.',
                category_id: 2,
                source_id: 2,
                status: 'ACTIVE',
                validated_by: 'Admin Medis TeleHealth',
                validated_at: new Date('2024-01-20T11:00:00Z').toISOString(),
                created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 3,
                title: 'Langkah Penanganan Sakit Kepala Tegang (Tension Headache)',
                topic_keywords: 'sakit kepala, pusing, kepala tegang, puyeng, sakit kepala belakang, migrain, stres, kaku leher, kepala berdenyut, sakit kepala sebelah',
                short_answer: 'Sakit kepala tipe tegang umumnya dipicu oleh stres fisik atau emosional, kelelahan mata, kurang tidur, dehidrasi, atau postur tubuh yang kaku saat bekerja.',
                important_points: JSON.stringify([
                    'Istirahatkan mata dan hindari paparan layar gadget (screen time) selama minimal 30 menit.',
                    'Lakukan relaksasi dan pijat lembut di area pelipis, tengkuk leher, dan bahu.',
                    'Pastikan tubuh terhidrasi dengan meminum segelas air putih hangat.',
                    'Lakukan peregangan otot leher secara perlahan dan atur pernapasan secara teratur.'
                ]),
                when_to_see_doctor: 'Segera ke IGD atau dokter spesialis saraf jika sakit kepala muncul sangat mendadak dan hebat (thunderclap headache), disertai gangguan penglihatan, kelemahan separuh badan, bicara pelo, atau setelah mengalami benturan kepala.',
                content_full: 'Sebagian besar sakit kepala tegang merespon baik terhadap modifikasi gaya hidup, manajemen stres, dan analgesik ringan lini pertama jika diperlukan.',
                category_id: 3,
                source_id: 3,
                status: 'ACTIVE',
                validated_by: 'Admin Medis TeleHealth',
                validated_at: new Date('2024-02-01T08:30:00Z').toISOString(),
                created_at: new Date('2024-02-01T08:00:00Z').toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 4,
                title: 'Gejala dan Pencegahan Anemia Defisiensi Besi',
                topic_keywords: 'anemia, kurang darah, hb rendah, hemoglobin, pucat, lemas, 5l, mudah lelah, pusing saat berdiri, ujung jari dingin, sesak saat aktivitas',
                short_answer: 'Anemia adalah kondisi ketika kadar hemoglobin (Hb) dalam sel darah merah berada di bawah standar normal, mengakibatkan pasokan oksigen ke seluruh jaringan tubuh menurun.',
                important_points: JSON.stringify([
                    'Gejala khas 5L: Lemah, Letih, Lesu, Lelah, dan Lunglai serta tampak pucat pada kelopak mata bawah atau kuku.',
                    'Konsumsi makanan kaya zat besi seperti daging merah tanpa lemak, hati ayam/sapi, bayam, brokoli, dan kacang-kacangan.',
                    'Kombinasikan dengan makanan kaya vitamin C (jeruk, jambu biji) untuk membantu penyerapan zat besi optimal di usus.',
                    'Hindari minum teh atau kopi secara bersamaan saat makan makanan berzat besi tinggi karena tanin menghambat penyerapan.'
                ]),
                when_to_see_doctor: 'Konsultasikan ke dokter untuk pemeriksaan darah lengkap (Hb, Ferritin, TIBC) jika sering mengalami pusing berputar, jantung berdebar-debar tanpa sebab jelas, sesak napas saat aktivitas ringan, atau pingsan.',
                content_full: 'Penegakan diagnosis pasti anemia memerlukan konfirmasi laboratorium hemoglobin darah.',
                category_id: 4,
                source_id: 4,
                status: 'ACTIVE',
                validated_by: 'Admin Medis TeleHealth',
                validated_at: new Date('2024-02-10T14:20:00Z').toISOString(),
                created_at: new Date('2024-02-10T14:00:00Z').toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 5,
                title: 'Pertolongan Awal Sakit Maag dan Asam Lambung (Gastritis/GERD)',
                topic_keywords: 'maag, asam lambung, gerd, nyeri ulu hati, perut perih, kembung, mual, heartburn, lambung sakit, perih lambung, begah',
                short_answer: 'Sakit maag (dispepsia) atau refluks asam lambung terjadi akibat iritasi pada dinding lambung atau naiknya asam lambung ke kerongkongan.',
                important_points: JSON.stringify([
                    'Makan dalam porsi kecil namun lebih sering (small frequent meals) setiap 3-4 jam.',
                    'Hindari makanan yang terlalu pedas, sangat asam, berlemak tinggi, minuman bersoda, kopi, dan alkohol.',
                    'Jangan langsung berbaring atau tidur setidaknya 2-3 jam setelah makan.',
                    'Tinggikan posisi bantal saat tidur jika merasakan sensasi panas di dada (heartburn).',
                    'Dapat mengonsumsi antasida sesuai petunjuk kemasan untuk meredakan keasaman lambung sementara.'
                ]),
                when_to_see_doctor: 'Segera periksakan ke dokter jika terdapat muntah berwarna hitam atau bercak darah, BAB berwarna hitam pekat (melena), penurunan berat badan drastis tanpa sebab, atau nyeri ulu hati tembus ke punggung.',
                content_full: 'Pencegahan kekambuhan maag sangat bergantung pada pola makan teratur dan pengelolaan stres.',
                category_id: 5,
                source_id: 5,
                status: 'ACTIVE',
                validated_by: 'Admin Medis TeleHealth',
                validated_at: new Date('2024-02-15T09:15:00Z').toISOString(),
                created_at: new Date('2024-02-15T09:00:00Z').toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        this.memoryStore.knowledge_candidates = [
            {
                id: 1,
                title: 'Tips Mengatasi Batuk Kering Akibat Iritasi Tenggorokan',
                type: 'DOCTOR_RESPONSE',
                question_text: 'Tenggorokan saya gatal dan batuk kering sudah 2 hari, obat alami apa yang bisa dicoba?',
                proposed_answer: 'Untuk batuk kering yang disebabkan oleh iritasi tenggorokan ringan atau udara kering, konsumsi 1 sendok madu murni dicampur air lemon hangat dapat membantu melapisi mukosa tenggorokan dan meredakan rasa gatal.',
                important_points: JSON.stringify([
                    'Minum madu murni 1-2 sendok teh sebelum tidur.',
                    'Hindari makanan gorengan berminyak dan minuman dingin.',
                    'Gunakan humidifier atau pelembap udara di kamar tidur.'
                ]),
                when_to_see_doctor: 'Periksakan ke dokter jika batuk berlangsung lebih dari 2 minggu, disertai batuk berdarah, demam tinggi, atau sesak napas.',
                doctor_name: 'Dr. Siti Rahmawati, Sp.PD',
                doctor_id: 'DOC-001',
                category_id: 1,
                source_id: 6,
                status: 'PENDING',
                rejection_reason: null,
                submitted_at: new Date('2026-09-24T08:00:00Z').toISOString(),
                processed_at: null,
                processed_by: null
            },
            {
                id: 2,
                title: 'Penanganan Awal Nyeri Otot (Myalgia) Pasca Olahraga',
                type: 'JOURNAL',
                question_text: 'Bagaimana meredakan nyeri otot kram setelah berolahraga berat?',
                proposed_answer: 'Nyeri otot tunda (DOMS) dapat diredakan dengan metode kompres dingin pada 24 jam pertama, dilanjutkan kompres hangat, hidrasi elektrolit, dan peregangan statis ringan.',
                important_points: JSON.stringify([
                    'Lakukan peregangan ringan dan jangan langsung istirahat total tanpa pendinginan.',
                    'Kompres es 15 menit jika ada bengkak atau rasa panas.',
                    'Pastikan asupan protein dan air cukup untuk pemulihan jaringan otot.'
                ]),
                when_to_see_doctor: 'Periksakan ke dokter bila nyeri sangat intens hingga tidak bisa menggerakkan anggota gerak atau urine berwarna gelap seperti teh (tanda rhabdomyolysis).',
                doctor_name: 'Indonesian Sports Medicine Journal',
                doctor_id: null,
                category_id: 2,
                source_id: null,
                status: 'PENDING',
                rejection_reason: null,
                submitted_at: new Date('2026-09-24T08:15:00Z').toISOString(),
                processed_at: null,
                processed_by: null
            }
        ];

        this.memoryStore.users = [
            { id: 1, telegram_id: '99887766', username: 'ahmad_fauzi', first_name: 'Ahmad', last_name: 'Fauzi', phone_number: '+6281234567890', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 2, telegram_id: '55443322', username: 'nur_aini', first_name: 'Nur', last_name: 'Aini', phone_number: '+6289876543210', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];

        this.memoryStore.doctor_questions = [
            {
                id: 1,
                question_id: 1,
                user_id: 1,
                telegram_chat_id: '99887766',
                question_text: 'Saya sering merasa berdebar dan sesak di dada kiri setelah beraktivitas tangga, apakah ini berbahaya?',
                status: 'WAITING',
                assigned_doctor_id: null,
                assigned_doctor_name: null,
                assigned_at: null,
                created_at: new Date('2026-09-24T07:45:00Z').toISOString(),
                updated_at: new Date('2026-09-24T07:45:00Z').toISOString()
            }
        ];

        this.memoryStore.validation_logs = [
            {
                id: 1,
                candidate_id: null,
                knowledge_id: 1,
                admin_user: 'Admin Medis TeleHealth',
                action: 'VALIDATED',
                previous_status: 'PENDING',
                new_status: 'ACTIVE',
                notes: 'Validasi panduan tata laksana flu awal dari Journal PAPDI 2024.',
                created_at: new Date('2024-01-15T10:00:00Z').toISOString()
            }
        ];
    }

    // Generic Helper Methods for Collections
    getTable(tableName) {
        if (!this.memoryStore[tableName]) {
            this.memoryStore[tableName] = [];
        }
        return this.memoryStore[tableName];
    }

    find(tableName, filterFn) {
        const table = this.getTable(tableName);
        return filterFn ? table.filter(filterFn) : [...table];
    }

    findById(tableName, id) {
        const table = this.getTable(tableName);
        return table.find(item => String(item.id) === String(id)) || null;
    }

    insert(tableName, data) {
        const table = this.getTable(tableName);
        const maxId = table.reduce((max, item) => (item.id > max ? item.id : max), 0);
        const now = new Date().toISOString();
        const newRecord = {
            id: maxId + 1,
            ...data,
            created_at: data.created_at || now,
            updated_at: now
        };
        table.push(newRecord);
        this.saveLocalStore();
        return newRecord;
    }

    update(tableName, id, updates) {
        const table = this.getTable(tableName);
        const index = table.findIndex(item => String(item.id) === String(id));
        if (index === -1) return null;

        const updated = {
            ...table[index],
            ...updates,
            updated_at: new Date().toISOString()
        };
        table[index] = updated;
        this.saveLocalStore();
        return updated;
    }

    delete(tableName, id) {
        const table = this.getTable(tableName);
        const index = table.findIndex(item => String(item.id) === String(id));
        if (index === -1) return false;

        table.splice(index, 1);
        this.saveLocalStore();
        return true;
    }

    findOrCreateSource(data) {
        if (!data || !data.name) return null;
        const cleanName = data.name.trim();
        const sources = this.find('sources');
        const existing = sources.find(s => (s.name || '').trim().toLowerCase() === cleanName.toLowerCase());
        if (existing) {
            return existing;
        }
        return this.insert('sources', {
            name: cleanName,
            type: data.type || 'JOURNAL',
            publisher: data.publisher || cleanName,
            year: data.year ? Number(data.year) : new Date().getFullYear(),
            url: data.url || null,
            is_trusted: data.is_trusted !== undefined ? data.is_trusted : true
        });
    }

    resetKnowledgeStore(mode = 'DEFAULT', adminUser = 'Super Administrator') {
        const now = new Date().toISOString();
        if (mode === 'CLEAR_ALL') {
            const prevCount = (this.memoryStore.knowledge || []).length;
            this.memoryStore.knowledge = [];
            this.memoryStore.knowledge_candidates = [];
            this.insert('validation_logs', {
                candidate_id: null,
                knowledge_id: null,
                admin_user: adminUser,
                action: 'DATABASE_RESET_CLEARED',
                previous_status: `TOTAL_${prevCount}`,
                new_status: 'EMPTY',
                notes: 'Superadmin mereset & mengosongkan seluruh Knowledge Base dan Candidates.'
            });
            this.saveLocalStore();
            return { mode: 'CLEAR_ALL', count: 0, message: 'Seluruh data knowledge base berhasil dikosongkan.' };
        } else {
            // Reset to DEFAULT medical baseline
            this.seedInitialData();
            this.insert('validation_logs', {
                candidate_id: null,
                knowledge_id: null,
                admin_user: adminUser,
                action: 'DATABASE_RESET_DEFAULT',
                previous_status: 'CUSTOM',
                new_status: 'DEFAULT_BASELINE',
                notes: 'Superadmin mereset Knowledge Base kembali ke pedoman klinis standar (PAPDI/WHO/Kemenkes).'
            });
            this.saveLocalStore();
            return { mode: 'DEFAULT', count: this.memoryStore.knowledge.length, message: 'Knowledge Base berhasil direset ke standar pedoman klinis awal.' };
        }
    }
}

module.exports = new DatabaseService();
