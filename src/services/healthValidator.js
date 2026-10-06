/**
 * Health Domain Validator & Guardrails Service
 * Strictly enforces that questions and ingested documents are healthcare/medical related.
 * Filters out politics, programming, tech repairs, entertainment, math, general chat, database/IT files.
 */

// Medical & Health Keywords Lexicon (Indonesian & English common terms)
const HEALTH_LEXICON = [
    // Bagian Tubuh & Anatomi Umum
    'kepala', 'leher', 'tengkuk', 'pundak', 'bahu', 'dada', 'perut', 'lambung',
    'ulu hati', 'pinggang', 'punggung', 'tulang belakang', 'sendi', 'tulang',
    'otot', 'kulit', 'mata', 'telinga', 'hidung', 'tenggorokan', 'amandel',
    'mulut', 'gigi', 'gusi', 'bibir', 'lidah', 'paru', 'jantung', 'hati',
    'lever', 'empedu', 'ginjal', 'usus', 'rahim', 'kaki', 'tangan', 'lutut',
    'tumit', 'pergelangan', 'jempol', 'jari',

    // Gejala & Tanda
    'demam', 'panas', 'suhu', 'pusing', 'sakit kepala', 'migrain', 'puyeng', 'vertigo',
    'flu', 'pilek', 'batuk', 'bersin', 'radang', 'sesak', 'asma', 'napas',
    'nyeri', 'perih', 'ngilu', 'linu', 'pegal', 'kram', 'kaku', 'tegang', 'berdenyut',
    'lemas', 'letih', 'lesu', 'lelah', 'lunglai', 'pucat', 'anemia', 'mual', 'muntah',
    'diare', 'mencret', 'konstipasi', 'sembelit', 'maag', 'gerd', 'begah', 'kembung',
    'gatal', 'ruam', 'bengkak', 'memar', 'luka', 'darah', 'perdarahan', 'haid', 'menstruasi',
    'kejang', 'pingsan', 'sinkop', 'berdebar', 'tensi', 'tekanan darah', 'kolesterol',
    'gula darah', 'diabetes', 'asam urat', 'sprain', 'keseleo', 'dislokasi', 'kebas', 'kesemutan',

    // Penyakit & Kondisi Medis
    'penyakit', 'kondisi', 'keluhan', 'sakit', 'influenza', 'covid', 'korona', 'ispa',
    'bronkitis', 'pneumonia', 'tbc', 'tuberkulosis', 'tuberculosis', 'pulmonary', 'fungal',
    'jamur', 'candida', 'coinfection', 'koinfeksi', 'sputum', 'resistan', 'resistansi',
    'mdr', 'xdr', 'afb', 'bta', 'hipertensi', 'hipotensi', 'stroke',
    'jantung koroner', 'gastritis', 'usus buntu', 'hepatitis', 'tifus', 'tipes', 'dbd',
    'dengue', 'demam berdarah', 'chikungunya', 'malaria', 'cacar', 'campak', 'herpes',
    'alergi', 'biduran', 'eksim', 'dermatitis', 'infeksi', 'bakteri', 'virus',
    'parasit', 'tumor', 'kanker', 'kista', 'miom', 'depresi', 'anxiety', 'cemas',
    'insomnia', 'gangguan tidur', 'stres', 'myalgia', 'artritis', 'dispepsia', 'apendisitis',
    'kolik', 'sinusitis', 'faringitis', 'tonsilitis',

    // Pengobatan & Tindakan Medis
    'obat', 'resep', 'dosis', 'paracetamol', 'ibuprofen', 'antibiotik', 'antivirus', 'antifungal',
    'antasida', 'vitamin', 'suplemen', 'vaksin', 'imunisasi', 'infus', 'operasi',
    'rawat inap', 'rawat jalan', 'dokter', 'spesialis', 'puskesmas', 'klinik', 'rumah sakit',
    'igd', 'paramedis', 'perawat', 'bidan', 'laboratorium', 'rontgen', 'usg', 'mri',
    'tensimeter', 'termometer', 'oksigen', 'saturasi', 'fisioterapi', 'diet', 'pantangan',
    'nutrisi', 'gizi', 'asi', 'bayi', 'balita', 'lansia', 'ibu hamil', 'kehamilan', 'persalinan',
    'klinis', 'terapi', 'diagnosis', 'profilaksis', 'anamnesis', 'etiologi', 'prognosis',
    'ramuan', 'herbal', 'uji klinis', 'pewarnaan', 'kultur', 'antimikroba', 'antimicrobial'
];

// Explicit Non-Health Topics & Blacklist Patterns (Specific technical & non-health domains)
const NON_HEALTH_PATTERNS = [
    { regex: /\b(presiden|menteri|dpr|mpr|pemilu|pilpres|pilkada|partai politik|kpu|bawaslu)\b/i, category: 'Politik & Pemilu' },
    { regex: /\b(python|javascript|typescript|coding|c\+\+|sql query|primary key|foreign key|relational database|normalisasi tabel|komputer|laptop|windows|linux|scripting|framework backend|mysql|postgresql|oracle|nosql)\b/i, category: 'Ilmu Komputer & Basis Data' },
    { regex: /\b(film|movie|sinopsis|aktor|aktris|artis|lagu|musik|chord gitar|lirik lagu|gaming|playstation|xbox|anime|manga|netflix|drakor)\b/i, category: 'Hiburan & Media' },
    { regex: /\b(motor|mobil|bengkel|mesin kendaraan|oli mesin|ban bocor|servis hp|gadget|iphone|android|samsung)\b/i, category: 'Otomotif & Gadget' },
    { regex: /\b(harga saham|crypto|bitcoin|investasi saham|trading forex|rekening bank|pinjol|reksadana|akuntansi pajak)\b/i, category: 'Keuangan & Finansial' },
    { regex: /\b(ramalan zodiak|horoskop|jodoh zodiak|tiket pesawat|travel pariwisata)\b/i, category: 'Pariwisata & Astrologi' },
    { regex: /\b(resep masakan|cara memasak|bumbu rendang|kue kering|kuliner masakan|gorengan resep)\b/i, category: 'Kuliner & Resep Makanan' },
    { regex: /\b(soal ujian matematika|rumus fisika|aljabar linear|integral kalkulus|trigonometri|tata buku)\b/i, category: 'Akademik Non-Medis' }
];

class HealthValidator {
    /**
     * Evaluates if a query belongs strictly to the healthcare domain.
     * @param {string} text - The input question from the user
     * @returns {object} { isHealth: boolean, confidence: number, matchedKeywords: string[], rejectReason?: string }
     */
    static validateTopic(text) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return {
                isHealth: false,
                confidence: 0,
                matchedKeywords: [],
                rejectReason: 'Pesan kosong.'
            };
        }

        const cleanText = text.toLowerCase().trim();

        // 1. Count Health Domain Keywords
        const matchedKeywords = [];
        for (const keyword of HEALTH_LEXICON) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(cleanText)) {
                matchedKeywords.push(keyword);
            }
        }

        // 2. Health Context Indicators
        const healthQuestionPatterns = [
            /mengatasi|mengobati|penyebab|gejala|pertolongan|sembuh|meredakan|kapan ke dokter|efek samping|aturan minum|cara merawat/i,
            /apakah normal|apakah berbahaya|kenapa (saya|anak|badan|perut|kepala|mata|kaki|tangan|leher|pinggang)/i,
            /(saya|badan|tubuh|kepala|perut|leher|pinggang|mata|kaki|tangan)\s+(merasa|mengalami|terasa|sakit|pusing|nyeri|perih|mual|kaku|panas|demam|gatal|lemas)/i,
            /merasa (sakit|mual|pusing|nyeri|lemas|demam|gatal|kaku|tegang)/i,
            /keluhan|merasakan|terasa|tubuh|fisik|kesehatan|klinis|medis|penyakit|coinfection|tuberculosis|tbc|infeksi/i
        ];

        let hasHealthIntent = false;
        for (const p of healthQuestionPatterns) {
            if (p.test(cleanText)) {
                hasHealthIntent = true;
                break;
            }
        }

        // 3. Check against Explicit Non-Health Patterns
        for (const item of NON_HEALTH_PATTERNS) {
            if (item.regex.test(cleanText)) {
                // If user mentions an incidental device/workplace term while having strong health symptoms (e.g. "pusing dan leher kaku setelah bekerja di depan laptop")
                const isIncidentalMention = (matchedKeywords.length >= 2 || (hasHealthIntent && matchedKeywords.length >= 1));
                
                // If it's a pure non-health inquiry (e.g. "buatkan query database sql", "cara servis laptop", "siapa presiden")
                if (!isIncidentalMention) {
                    return {
                        isHealth: false,
                        confidence: 0.95,
                        matchedKeywords: [],
                        rejectReason: `Topik terdeteksi di luar ruang lingkup kesehatan (${item.category}). Sistem TeleHealth dikhususkan untuk konsultasi dan informasi medis.`
                    };
                }
            }
        }

        if (matchedKeywords.length >= 1 || (hasHealthIntent && matchedKeywords.length > 0)) {
            const score = Math.min(1.0, 0.4 + (matchedKeywords.length * 0.2) + (hasHealthIntent ? 0.3 : 0));
            return {
                isHealth: true,
                confidence: score,
                matchedKeywords,
                rejectReason: null
            };
        }

        return {
            isHealth: false,
            confidence: 0.85,
            matchedKeywords: [],
            rejectReason: 'Tidak ditemukan indikasi gejala atau topik kesehatan dalam pertanyaan.'
        };
    }

    /**
     * Evaluates and extracts domain information for documents and knowledge entries.
     * Allows all content (both medical and non-medical) to be ingested into the knowledge base.
     * @param {object} payload - { title, content_full, short_answer, proposed_answer, topic_keywords }
     * @returns {object} { isHealth: boolean, isMedicalTopic: boolean, score: number, matchedKeywords: string[], rejectReason: string | null }
     */
    static validateMedicalContent(payload = {}) {
        const title = payload.title || '';
        const content = payload.content_full || payload.content || '';
        const answer = payload.short_answer || payload.proposed_answer || '';
        const keywords = payload.topic_keywords || '';

        const combinedText = `${title}\n${keywords}\n${answer}\n${content}`.toLowerCase().trim();

        if (combinedText.length === 0) {
            return {
                isHealth: false,
                isMedicalTopic: false,
                score: 0,
                matchedKeywords: [],
                rejectReason: 'Konten dokumen atau pengetahuan kosong.'
            };
        }

        // Count genuine medical keywords
        const matchedKeywords = [];
        for (const kw of HEALTH_LEXICON) {
            const regex = new RegExp(`\\b${kw}\\b`, 'i');
            if (regex.test(combinedText)) {
                matchedKeywords.push(kw);
            }
        }

        const isMedical = matchedKeywords.length > 0;
        const score = isMedical ? Math.min(1.0, 0.5 + (matchedKeywords.length * 0.1)) : 0.85;

        return {
            isHealth: true,
            isMedicalTopic: isMedical,
            score: score,
            matchedKeywords,
            rejectReason: null
        };
    }

    /**
     * Standard Non-Health Polite Refusal Message
     */
    static getNonHealthResponse() {
        return (
            `🩺 *Layanan Khusus Kesehatan TeleHealth*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Maaf, **TeleHealth** adalah asisten informasi khusus seputar **kesehatan dan medis**.\n\n` +
            `Sistem kami hanya dapat menjawab pertanyaan terkait:\n` +
            `• 🌡️ *Gejala penyakit & pertolongan pertama*\n` +
            `• 🩺 *Penjelasan kondisi medis & istilah klinis*\n` +
            `• 💊 *Panduan pencegahan & gaya hidup sehat*\n` +
            `• 👨‍⚕️ *Konsultasi langsung dengan dokter jaga*\n\n` +
            `Silakan pilih contoh topik kesehatan di bawah atau ketik langsung keluhan yang Anda rasakan. 🌿`
        );
    }
}

module.exports = HealthValidator;
