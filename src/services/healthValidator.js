/**
 * Health Domain Validator & Guardrails Service
 * Strictly enforces that questions and ingested documents are healthcare/medical related.
 * Supports Multilingual detection (Indonesian, English, Javanese, Sundanese) and localized refusal messages.
 */

// Medical & Health Keywords Lexicon (Indonesian, English, and Regional terms)
const HEALTH_LEXICON = [
    // Bagian Tubuh & Anatomi Umum (ID & EN)
    'kepala', 'leher', 'tengkuk', 'pundak', 'bahu', 'dada', 'perut', 'lambung',
    'ulu hati', 'pinggang', 'punggung', 'tulang belakang', 'sendi', 'tulang',
    'otot', 'kulit', 'mata', 'telinga', 'hidung', 'tenggorokan', 'amandel',
    'mulut', 'gigi', 'gusi', 'bibir', 'lidah', 'paru', 'jantung', 'hati',
    'lever', 'empedu', 'ginjal', 'usus', 'rahim', 'kaki', 'tangan', 'lutut',
    'tumit', 'pergelangan', 'jempol', 'jari',
    // English anatomy
    'head', 'neck', 'chest', 'stomach', 'abdomen', 'belly', 'back', 'spine', 'joint', 'bone',
    'muscle', 'skin', 'eye', 'eyes', 'ear', 'ears', 'nose', 'throat', 'mouth', 'teeth', 'tooth',
    'gums', 'lung', 'lungs', 'heart', 'liver', 'kidney', 'kidneys', 'bowel', 'uterus', 'leg',
    'foot', 'feet', 'arm', 'hand', 'knee', 'shoulder',
    // Regional anatomy
    'sirah', 'sirahku', 'weteng', 'wetengku', 'boyok', 'awak', 'awakku', 'tikoro', 'padaharan', 'waos',

    // Gejala & Tanda (ID, EN, Regional)
    'demam', 'panas', 'suhu', 'pusing', 'sakit kepala', 'migrain', 'puyeng', 'vertigo',
    'flu', 'pilek', 'batuk', 'bersin', 'radang', 'sesak', 'asma', 'napas',
    'nyeri', 'perih', 'ngilu', 'linu', 'pegal', 'kram', 'kaku', 'tegang', 'berdenyut',
    'lemas', 'letih', 'lesu', 'lelah', 'lunglai', 'pucat', 'anemia', 'mual', 'muntah',
    'diare', 'mencret', 'konstipasi', 'sembelit', 'maag', 'gerd', 'begah', 'kembung',
    'gatal', 'ruam', 'bengkak', 'memar', 'luka', 'darah', 'perdarahan', 'haid', 'menstruasi',
    'kejang', 'pingsan', 'sinkop', 'berdebar', 'tensi', 'tekanan darah', 'kolesterol',
    'gula darah', 'diabetes', 'asam urat', 'sprain', 'keseleo', 'dislokasi', 'kebas', 'kesemutan',
    // English symptoms
    'fever', 'headache', 'dizziness', 'migraine', 'chills', 'cough', 'coughing', 'sneeze', 'sneezing',
    'congestion', 'shortness of breath', 'breathless', 'chest pain', 'stomach ache', 'stomach pain',
    'acid reflux', 'heartburn', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'bloating',
    'fatigue', 'weakness', 'tiredness', 'sore throat', 'rash', 'itching', 'swelling', 'cramp', 'ache',
    'pain', 'hypertension', 'hypotension', 'gout', 'palpitation', 'fainting', 'seizure', 'cold',
    // Regional symptoms
    'ngelu', 'mumet', 'mriang', 'watuk', 'loro', 'sebah', 'lieur', 'haredang', 'tiris', 'leuleus', 'nyeuri',

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
    // English conditions
    'disease', 'illness', 'infection', 'bacterial', 'viral', 'allergy', 'eczema', 'dermatitis',
    'cancer', 'cyst', 'anxiety', 'depression', 'insomnia', 'stress', 'arthritis', 'dyspepsia',
    'sinusitis', 'pharyngitis', 'tonsillitis', 'asthma', 'heart attack', 'stroke',

    // Pengobatan & Tindakan Medis
    'obat', 'resep', 'dosis', 'paracetamol', 'ibuprofen', 'antibiotik', 'antivirus', 'antifungal',
    'antasida', 'vitamin', 'suplemen', 'vaksin', 'imunisasi', 'infus', 'operasi',
    'rawat inap', 'rawat jalan', 'dokter', 'spesialis', 'puskesmas', 'klinik', 'rumah sakit',
    'igd', 'paramedis', 'perawat', 'bidan', 'laboratorium', 'rontgen', 'usg', 'mri',
    'tensimeter', 'termometer', 'oksigen', 'saturasi', 'fisioterapi', 'diet', 'pantangan',
    'nutrisi', 'gizi', 'asi', 'bayi', 'balita', 'lansia', 'ibu hamil', 'kehamilan', 'persalinan',
    'klinis', 'terapi', 'diagnosis', 'profilaksis', 'anamnesis', 'etiologi', 'prognosis',
    'ramuan', 'herbal', 'uji klinis', 'pewarnaan', 'kultur', 'antimikroba', 'antimicrobial',
    // English treatments
    'medicine', 'medication', 'drug', 'prescription', 'dose', 'dosage', 'antacid', 'antibiotic',
    'vaccine', 'vaccination', 'doctor', 'physician', 'hospital', 'clinic', 'emergency room',
    'nurse', 'treatment', 'therapy', 'diagnosis', 'nutrition', 'infant', 'pregnancy', 'clinical'
];

// Explicit Non-Health Topics & Blacklist Patterns
const NON_HEALTH_PATTERNS = [
    { regex: /\b(presiden|menteri|dpr|mpr|pemilu|pilpres|pilkada|partai politik|kpu|bawaslu|president|prime minister|election|parliament)\b/i, category: 'Politik & Pemilu' },
    { regex: /\b(python|javascript|typescript|coding|c\+\+|sql query|primary key|foreign key|relational database|normalisasi tabel|komputer|laptop|windows|linux|scripting|framework backend|mysql|postgresql|oracle|nosql|write a code|debug|html css)\b/i, category: 'Ilmu Komputer & Basis Data' },
    { regex: /\b(film|movie|sinopsis|aktor|aktris|artis|lagu|musik|chord gitar|lirik lagu|gaming|playstation|xbox|anime|manga|netflix|drakor|hollywood)\b/i, category: 'Hiburan & Media' },
    { regex: /\b(motor|mobil|bengkel|mesin kendaraan|oli mesin|ban bocor|servis hp|gadget|iphone|android|samsung|car repair|motorcycle engine)\b/i, category: 'Otomotif & Gadget' },
    { regex: /\b(harga saham|crypto|bitcoin|investasi saham|trading forex|rekening bank|pinjol|reksadana|akuntansi pajak|stock market|cryptocurrency)\b/i, category: 'Keuangan & Finansial' },
    { regex: /\b(ramalan zodiak|horoskop|jodoh zodiak|tiket pesawat|travel pariwisata|flight tickets|hotel booking)\b/i, category: 'Pariwisata & Astrologi' },
    { regex: /\b(resep masakan|cara memasak|bumbu rendang|kue kering|kuliner masakan|gorengan resep|recipe for cooking|how to bake)\b/i, category: 'Kuliner & Resep Makanan' },
    { regex: /\b(soal ujian matematika|rumus fisika|aljabar linear|integral kalkulus|trigonometri|tata buku|physics formula|calculus equation)\b/i, category: 'Akademik Non-Medis' }
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
                rejectReason: 'Pesan kosong / Empty message.'
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

        // 2. Health Context Indicators (Indonesian & English & Regional)
        const healthQuestionPatterns = [
            /mengatasi|mengobati|penyebab|gejala|pertolongan|sembuh|meredakan|kapan ke dokter|efek samping|aturan minum|cara merawat/i,
            /how to treat|how to cure|how to relieve|symptoms of|causes of|when to see a doctor|side effects|dosage of|treatment for/i,
            /apakah normal|apakah berbahaya|kenapa (saya|anak|badan|perut|kepala|mata|kaki|tangan|leher|pinggang)/i,
            /is it normal|is it dangerous|why does my (head|stomach|chest|throat|back|body)/i,
            /(saya|badan|tubuh|kepala|perut|leher|pinggang|mata|kaki|tangan)\s+(merasa|mengalami|terasa|sakit|pusing|nyeri|perih|mual|kaku|panas|demam|gatal|lemas)/i,
            /i have (a|an)?\s+(headache|fever|cough|cold|stomach pain|chest pain|sore throat|rash|dizziness)/i,
            /i feel (sick|dizzy|nauseous|feverish|pain|weak|tired|breathless)/i,
            /(kudu|ngombe|piye|carane|ngelu|mumet|mriang|weteng|watuk|loro|lieur|haredang|tiris|padaharan)/i,
            /keluhan|merasakan|terasa|tubuh|fisik|kesehatan|klinis|medis|penyakit|coinfection|tuberculosis|tbc|infeksi|health|medical/i
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
                const isIncidentalMention = (matchedKeywords.length >= 2 || (hasHealthIntent && matchedKeywords.length >= 1));
                
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
     * @param {object} payload
     * @returns {object}
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
     * Standard Non-Health Polite Refusal Message formatted in the user's detected language
     * @param {string} lang - 'id' | 'en' | 'jv' | 'su'
     */
    static getNonHealthResponse(lang = 'id') {
        if (lang === 'en') {
            return (
                `🩺 *TeleHealth Specialized Medical Assistant*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Sorry, **TeleHealth** is an assistant exclusively dedicated to **healthcare and clinical inquiries**.\n\n` +
                `Our service is designed to answer questions regarding:\n` +
                `• 🌡️ *Disease symptoms, first aid & self-care*\n` +
                `• 🩺 *Clinical condition explanations & medication guides*\n` +
                `• 💊 *Preventive healthcare & healthy lifestyle guidelines*\n` +
                `• 👨‍⚕️ *Direct consultation with on-call physicians*\n\n` +
                `Please ask a health-related question (e.g. "How to relieve headache and fever?") or choose a topic from the menu. 🌿`
            );
        }

        if (lang === 'jv') {
            return (
                `🩺 *Layanan Khusus Kesehatan TeleHealth*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Nyuwun pangapunten, **TeleHealth** punika asisten mirunggan kagem babagan **kesehatan lan medis**.\n\n` +
                `Sistem saged maringi katrangan babagan:\n` +
                `• 🌡️ *Gejala penyakit lan pitulungan kapisan*\n` +
                `• 🩺 *Katerangan medis lan aturan obat*\n` +
                `• 👨‍⚕️ *Konsultasi kaliyan dokter jaga*\n\n` +
                `Mangga ketikaken keluhan kasarasan ingkang panjenengan raosaken. 🌿`
            );
        }

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
