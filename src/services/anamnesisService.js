/**
 * Anamnesis Service (The Sacred Seven Engine)
 * Implements conversational clinical anamnesis for Telegram Bot:
 * 1. Onset
 * 2. Location & Radiation
 * 3. Quality (Sifat Keluhan)
 * 4. Quantity / Severity (Skala Nyeri 1-10)
 * 5. Alleviating / Relieving Factors
 * 6. Aggravating Factors
 * 7. Gejala Penyerta (Associated Symptoms)
 *
 * Features:
 * - Real-time Red Flag & Emergency Detection with instant triage to IGD / 119.
 * - Adaptive Early Exit: Offers early solution when confident match found at Step 2/3.
 * - Seamless hand-off to Verified Knowledge Base or Doctor Queue.
 */

const db = require('../db');
const KnowledgeRetriever = require('./knowledgeRetriever');
const ResponseGenerator = require('./responseGenerator');
const DoctorService = require('./doctorService');
const LanguageService = require('./languageService');

// Daftar Pola Tanda Bahaya / Gejala Gawat Darurat Komprehensif (Red Flags)
const RED_FLAG_RULES = [
    {
        id: 'cardio',
        pattern: /(nyeri.*dada|dada.*nyeri|dada.*sesak|sesak.*dada|dada.*(tertekan|tertindih|diremas)|(tertekan|tertindih).*beban|tembus ke (belakang|punggung)|menjalar ke (leher|rahang|lengan)|keringat dingin|serangan jantung|infark miokard)/i,
        label: 'Kardiovaskular / Curiga Serangan Jantung Akut (Sindrom Koroner Akut)',
        firstAid: 'Posisikan tirah baring setengah duduk, longgarkan pakaian di area dada, jangan berikan makanan/minuman berlebih, dan segera evakuasi ke IGD Rumah Sakit terdekat.'
    },
    {
        id: 'neuro_stroke',
        pattern: /(bicara pelo|bibir mencong|mulut merot|mulut mencong|muka mencong|lumpuh separuh|lemah separuh|baal sebelah|lumpuh mendadak|sulit bicara mendadak|tangan.*kaki.*lemas tidak bisa diangkat|defisit neurologis)/i,
        label: 'Defisit Neurologis Akut / Indikasi Stroke Akut (Golden Period <4.5 Jam)',
        firstAid: 'Catat waktu pasti gejala muncul, baringkan penderita dengan kepala sedikit ditinggikan (30 derajat). JANGAN berikan makan/minum atau obat penurun tensi sembarangan karena risiko tersedak.'
    },
    {
        id: 'respiratory_failure',
        pattern: /(gagal napas|saturasi.*(<|dibawah|di bawah).*90|megap[- ]megap|kehabisan udara|bibir.*biru|ujung.*biru|sianosis|sesak napas (parah|berat|akut|mendadak)|tidak bisa (menarik udara|bicara|mengucapkan satu kalimat)|retraksi dinding dada|napas cuping hidung)/i,
        label: 'Gagal Napas Akut / Hipoksemia Berat (Respiratory Failure / Dispnea Akut)',
        firstAid: 'Bantu penderita duduk tegak (posisi Fowler) untuk memaksimalkan ekspansi rongga paru, buka sirkulasi udara bebas, dan segera bawa ke IGD untuk bantuan oksigenasi darurat.'
    },
    {
        id: 'acute_abdomen_bleeding',
        pattern: /(akut abdomen|perut kaku seperti papan|perut kaku papan|perut tidak bisa disentuh sama sekali|muntah darah|muntah.*hitam.*kopi|bab.*hitam.*aspal|melena|muntah faekal|nyeri perut hebat.*tembus ke punggung)/i,
        label: 'Akut Abdomen / Perdarahan Saluran Cerna Akut (Kegawatdaruratan Bedah)',
        firstAid: 'Puasakan pasien total (JANGAN diberi makan, minum, obat pereda nyeri tanpa resep, atau obat pencahar), baringkan tenang, dan segera bawa ke IGD RS untuk evaluasi Bedah.'
    },
    {
        id: 'neuro_critical_coma_seizure',
        pattern: /(koma|tidak bisa dibangunkan|tidak merespon (panggilan|rangsangan)|penurunan kesadaran|kejang[- ]kejang|mata mendelik|mulut berbusa|lidah tergigit|ayan|status epileptikus|kejang (berulang|lebih dari 5 menit)|pupil anisokor|pupil (tidak sama besar|besar sebelah))/i,
        label: 'Koma / Penurunan Kesadaran Akut / Status Konvulsi Kejang',
        firstAid: 'Amankan jalan napas (posisi miring mantap untuk mencegah aspirasi), JANGAN memasukkan sendok/benda ke mulut, amankan dari benda tajam, dan segera panggil ambulans/bawa ke IGD.'
    },
    {
        id: 'sepsis_shock',
        pattern: /(syok|tensi.*(<|dibawah|di bawah).*90|tekanan darah.*(<|dibawah|di bawah).*90|ujung jari.*dingin.*basah|nadi cepat.*lemah|kulit dingin pucat basah|tidak bisa berdiri lemas berat|sepsis|menggigil hebat demam tinggi.*(linglung|disorientasi|cepat)|anuria|tidak ada urin)/i,
        label: 'Syok Sirkulasi Akut / Sepsis Berat (Disfungsi Organ Mengancam Jiwa)',
        firstAid: 'Baringkan terlentang dengan posisi kaki lebih tinggi dari kepala (posisi Trendelenburg), selimuti tubuh, dan segera evakuasi ke IGD untuk resusitasi cairan intravena masif.'
    },
    {
        id: 'metabolic_emergency',
        pattern: /(hipoglikemia|gula darah.*(<|dibawah|di bawah).*70|keringat dingin.*(gemetar|linglung|diabetes)|ketoasidosis|kad|gula darah.*(>|diatas|di atas).*(250|300)|napas berbau (manis|buah|aseton)|napas kussmaul)/i,
        label: 'Kegawatdaruratan Metabolik Diabetes (Hipoglikemia Kritis / KAD)',
        firstAid: 'Jika penderita sadar: berikan teh manis/air gula segera (15-20 gram glukosa). Jika penderita TIDAK SADAR: JANGAN masukkan apapun ke mulut! Segera bawa ke IGD untuk IV Dextrose/Insulin.'
    },
    {
        id: 'head_trauma_crit',
        pattern: /(cedera kepala|jatuh membentur kepala.*pingsan|pingsan.*kecelakaan|muntah menyembur.*(kepala|benturan)|cairan bening.*(hidung|telinga)|darah.*(hidung|telinga).*benturan)/i,
        label: 'Cedera Kepala Berat / Perdarahan Intrakranial',
        firstAid: 'Imobilisasi leher dan tulang belakang (pasang cervical collar bila dicurigai fraktur servikal), jangan gerakkan kepala secara kasar, segera bawa ke IGD RS dengan CT Scan.'
    },
    {
        id: 'hypertensive_crisis',
        pattern: /(krisis hipertensi|tensi.*(>|diatas|di atas).*180|tensi.*(>|diatas|di atas).*120|tensi tinggi.*(sakit kepala hebat|pandangan kabur|nyeri dada))/i,
        label: 'Krisis Hipertensi (Risiko Kerusakan Organ Sasaran Jantung & Otak)',
        firstAid: 'Istirahat tirah baring di ruangan tenang, jangan menyetir sendiri, dan segera bawa ke IGD RS terdekat.'
    },
    {
        id: 'infectious_fever_crit',
        pattern: /(demam.*(>|diatas|di atas).*39.*(tidak turun|kejang|petechiae|bintik merah)|kaku kuduk|leher kaku.*demam|kulit melepuh luas|sjs)/i,
        label: 'Infeksi Kritis / Tanda Meningitis / Reaksi Kulit Akut Berat (SJS)',
        firstAid: 'Kompres hangat lipatan tubuh, jaga hidrasi, dan segera bawa ke IGD untuk penanganan antimikroba/terapi intensif.'
    },
    {
        id: 'airway_throat_crit',
        pattern: /(sulit membuka mulut|trismus|tidak bisa menelan (ludah|cairan)|abses leher|leher bengkak.*(sesak|tidak rata)|suara serak berat.*sulit bernapas)/i,
        label: 'Obstruksi Jalan Napas Atas / Infeksi Faring-Laring Berat',
        firstAid: 'Posisikan duduk condong ke depan, jangan paksa menelan, dan segera bawa ke IGD terdekat.'
    },
    {
        id: 'renal_critical',
        pattern: /(gagal ginjal akut|tidak bisa (pipis|kencing)|kencing tidak keluar.*bengkak|edem paru.*ginjal)/i,
        label: 'Gagal Ginjal Akut Kritis (Anuria / Risiko Hiperkalemia & Edema Paru)',
        firstAid: 'Batasi asupan cairan oral segera, jangan konsumsi makanan tinggi kalium (pisang, dll), dan segera bawa ke IGD RS untuk evaluasi fungsi ginjal.'
    }
];

// Konfigurasi 7 Dimensi Sacred Seven (Format Pertanyaan: "Bagaimana ...")
const SACRED_SEVEN_STEPS = {
    1: {
        key: 'onset',
        title: '1/7: Onset (Awitan & Durasi)',
        question: 'Bagaimana awal mula keluhan ini mulai Anda rasakan? Apakah muncul tiba-tiba atau bertahap, dan sudah berapa lama berlangsung?',
        options: [
            { text: '⏱️ Baru beberapa jam lalu', value: 'Baru beberapa jam terakhir (akut mendadak)' },
            { text: '📅 1 – 3 hari terakhir', value: '1 sampai 3 hari terakhir' },
            { text: '🗓️ Lebih dari 1 minggu', value: 'Lebih dari 1 minggu (subakut)' },
            { text: '🔄 Hilang-timbul / Sudah lama', value: 'Sudah berlangsung lama / hilang timbul (kronis)' }
        ]
    },
    2: {
        key: 'location',
        title: '2/7: Location (Lokasi & Penjalaran)',
        question: 'Bagaimana lokasi bagian tubuh yang dirasakan paling sakit atau tidak nyaman, dan apakah rasa sakit tersebut menjalar ke bagian lain?',
        options: [
            { text: '🤕 Area Kepala / Tengkuk / Leher', value: 'Area kepala, tengkuk, dan leher' },
            { text: '🫁 Area Dada / Punggung / Rusuk', value: 'Area dada, tulang rusuk, dan punggung' },
            { text: '🤢 Area Perut / Lambung / Ulu Hati', value: 'Area lambung, ulu hati, dan saluran cerna' },
            { text: '🦵 Pinggang / Lutut / Kaki / Sendi', value: 'Area pinggang, sendi lutut, dan tungkai kaki' },
            { text: '👁️ Area Mata / Wajah / Telinga', value: 'Area mata, wajah, dan kelopak mata' },
            { text: '🧴 Area Kulit / Seluruh Tubuh', value: 'Area permukaan kulit dan seluruh tubuh' }
        ]
    },
    3: {
        key: 'quality',
        title: '3/7: Quality (Sifat/Karakteristik Keluhan)',
        question: 'Bagaimana sifat atau karakteristik sensasi rasa sakit/keluhan yang Anda rasakan?',
        options: [
            { text: '⚡ Nyeri Berdenyut / Cekot-cekot', value: 'Nyeri berdenyut-denyut cekot-cekot' },
            { text: '🔪 Nyeri Tertusuk Tajam', value: 'Nyeri tajam seperti tertusuk' },
            { text: '🧱 Terasa Ditekan / Tertindih Berat', value: 'Terasa tertekan beban berat' },
            { text: '🔥 Perih / Panas Terbakar', value: 'Sensasi perih dan panas terbakar' },
            { text: '🪵 Pegal / Kaku Otot / Sendi Krek', value: 'Sensasi pegal linu, tegang kaku, atau bunyi krek sendi' },
            { text: '🪱 Kram Melilit / Mulas', value: 'Sensasi kram melilit dan mual mulas' },
            { text: '🤧 Hidung Tersumbat / Gatal Tenggorokan', value: 'Hidung tersumbat, bersin, dan tenggorokan gatal' }
        ]
    },
    4: {
        key: 'quantity',
        title: '4/7: Quantity (Tingkat Keparahan Skala 1-10)',
        question: 'Bagaimana tingkat keparahan keluhan ini dalam skala 1 – 10 dan bagaimana pengaruhnya terhadap aktivitas harian Anda?',
        options: [
            { text: '🟢 Ringan (Skala 1-3) - Masih beraktivitas biasa', value: 'Skala ringan (1-3), masih dapat beraktivitas biasa' },
            { text: '🟡 Sedang (Skala 4-6) - Cukup mengganggu aktivitas', value: 'Skala sedang (4-6), mengganggu konsentrasi dan aktivitas' },
            { text: '🔴 Berat (Skala 7-10) - Sangat nyeri / terbaring', value: 'Skala berat (7-10), sangat nyeri hingga tidak dapat beraktivitas' }
        ]
    },
    5: {
        key: 'elevating',
        title: '5/7: Elevating (Faktor yang Meringankan)',
        question: 'Bagaimana posisi, tindakan, atau hal tertentu yang membuat keluhan Anda terasa membaik atau lebih ringan?',
        options: [
            { text: '🛌 Istirahat / Berbaring Tidur', value: 'Membaik setelah istirahat atau berbaring tidur' },
            { text: '🧊 Diberi Kompres Hangat/Dingin', value: 'Membaik setelah dikompres hangat atau dingin' },
            { text: '💊 Minum Air Hangat / Minum Obat / Makan', value: 'Membaik setelah minum air hangat, makan teratur, atau minum obat' },
            { text: '❌ Belum Ada yang Meringankan', value: 'Belum ada hal yang meringankan keluhan' }
        ]
    },
    6: {
        key: 'aggregating',
        title: '6/7: Aggregating (Faktor yang Memperberat)',
        question: 'Bagaimana kondisi, gerakan, pemicu, atau aktivitas tertentu yang biasanya membuat keluhan bertambah berat atau kambuh?',
        options: [
            { text: '🏃 Saat Bergerak / Kerja Fisik / Berdiri Lama', value: 'Memberat saat beraktivitas fisik, bergerak, atau berdiri lama' },
            { text: '🤯 Saat Stres / Kurang Tidur', value: 'Memberat saat stres, lelah pikiran, atau kurang tidur' },
            { text: '🌶️ Telat Makan / Makanan Pedas & Asam', value: 'Memberat saat telat makan atau konsumsi pemicu asam/pedas' },
            { text: '⏱️ Terus Menerus Tanpa Pemicu', value: 'Terasa terus menerus konstan tanpa pemicu tertentu' }
        ]
    },
    7: {
        key: 'associated_symptoms',
        title: '7/7: Gejala Penyerta (Other Symptoms)',
        question: 'Bagaimana keluhan atau gejala penyerta lain yang Anda rasakan bersamaan dengan keluhan utama saat ini?',
        options: [
            { text: '🌡️ Demam / Tubuh Menggigil / Meriang', value: 'Disertai demam, meriang, dan menggigil' },
            { text: '🤢 Mual / Ingin Muntah / Perut Kembung', value: 'Disertai rasa mual, ingin muntah, atau begah' },
            { text: '😵 Pusing / Lemas / Keringat Dingin', value: 'Disertai pusing kliyengan, badan lemas, dan keringat dingin' },
            { text: '🫁 Batuk / Pilek / Nyeri Menelan', value: 'Disertai batuk, pilek, atau sakit saat menelan' },
            { text: '💧 Sering Kencing / Haus Terus Menerus', value: 'Disertai sering kencing malam dan haus berlebih' },
            { text: '✅ Tidak Ada Gejala Lain', value: 'Tidak ada gejala penyerta lain' }
        ]
    }
};

class AnamnesisService {
    constructor() {
        // Active sessions per Telegram Chat ID: Map<chatId, sessionData>
        this.sessions = new Map();
    }

    /**
     * Check if a chat has an active anamnesis session
     */
    hasActiveSession(chatId) {
        return this.sessions.has(String(chatId));
    }

    /**
     * Get active session
     */
    getSession(chatId) {
        return this.sessions.get(String(chatId));
    }

    /**
     * Cancel / reset session
     */
    cancelSession(chatId) {
        this.sessions.delete(String(chatId));
    }

    /**
     * Start a new Sacred Seven anamnesis session
     * @param {string|number} chatId
     * @param {string} initialComplaint - Optional keluhan awal pengguna
     * @param {string} lang - 'id' | 'en' | 'jv' | 'su'
     */
    startSession(chatId, initialComplaint = '', lang = 'id') {
        const strId = String(chatId);

        // Check if initial complaint already triggers red flags
        if (initialComplaint) {
            const redFlag = this.checkRedFlags(initialComplaint);
            if (redFlag) {
                return {
                    isEmergency: true,
                    emergencyInfo: redFlag,
                    renderedMessage: this.generateEmergencyMessage(redFlag, lang),
                    keyboard: this.getEmergencyKeyboard(lang)
                };
            }
        }

        const session = {
            chatId: strId,
            currentStep: 1,
            lang: lang || 'id',
            initialComplaint: initialComplaint || '',
            answers: {
                onset: '',
                location: '',
                quality: '',
                quantity: '',
                alleviating: '',
                aggravating: '',
                associated_symptoms: ''
            },
            earlyMatch: null,
            startedAt: new Date()
        };

        this.sessions.set(strId, session);

        return {
            isEmergency: false,
            step: 1,
            ...this.renderStepPrompt(session)
        };
    }

    /**
     * Scan any text for Red Flag triggers
     */
    checkRedFlags(text) {
        if (!text || typeof text !== 'string') return null;
        for (const rule of RED_FLAG_RULES) {
            if (rule.pattern.test(text)) {
                return rule;
            }
        }
        return null;
    }

    /**
     * Process user response in the active session
     * @param {string|number} chatId
     * @param {string} userInput - Answer value from button callback or manual typed text
     */
    async processAnswer(chatId, userInput) {
        const strId = String(chatId);
        const session = this.sessions.get(strId);

        if (!session) {
            return null;
        }

        const cleanInput = (userInput || '').trim();

        // 1. EVALUASI TANDA BAHAYA / RED FLAG PADA JAWABAN TERBARU
        const redFlag = this.checkRedFlags(cleanInput);
        if (redFlag) {
            this.cancelSession(strId);
            return {
                status: 'EMERGENCY_TRIGGERED',
                isEmergency: true,
                emergencyInfo: redFlag,
                renderedMessage: this.generateEmergencyMessage(redFlag, session.lang),
                keyboard: this.getEmergencyKeyboard(session.lang)
            };
        }

        // 2. Simpan jawaban untuk step saat ini
        const currentStepConfig = SACRED_SEVEN_STEPS[session.currentStep];
        if (currentStepConfig) {
            session.answers[currentStepConfig.key] = cleanInput;
            if (currentStepConfig.key === 'elevating') session.answers.alleviating = cleanInput;
            if (currentStepConfig.key === 'aggregating') session.answers.aggravating = cleanInput;
        }

        // 3. LOGIKA EVALUASI SACRED SEVEN (Jika beberapa langkah sudah menentukan jawaban)
        if (session.currentStep >= 2 && session.currentStep <= 6) {
            const combinedQuery = this.buildCombinedQuery(session);
            const kbSearch = await KnowledgeRetriever.search(combinedQuery, 0.65, session.lang);

            if (kbSearch.found && kbSearch.knowledge && kbSearch.score >= 0.68) {
                session.earlyMatch = {
                    knowledge: kbSearch.knowledge,
                    source: kbSearch.source,
                    category: kbSearch.category,
                    score: kbSearch.score
                };

                // Tampilkan indikasi awal yang sudah ditentukan
                return {
                    status: 'EARLY_EXIT_OFFERED',
                    isEarlyExitOffer: true,
                    earlyMatch: session.earlyMatch,
                    renderedMessage: this.generateEarlyOfferMessage(session),
                    keyboard: this.getEarlyOfferKeyboard(session.lang)
                };
            }
        }

        // 4. Lanjut ke langkah berikutnya
        if (session.currentStep < 7) {
            session.currentStep += 1;
            return {
                status: 'NEXT_STEP',
                step: session.currentStep,
                ...this.renderStepPrompt(session)
            };
        }

        // 5. SEMUA 7 LANGKAH SELESAI (Finalisasi Anamnesis Lengkap)
        return await this.finalizeAnamnesis(strId);
    }

    /**
     * User chooses to accept early answer (Early Exit Triggered)
     */
    async acceptEarlyExit(chatId) {
        const strId = String(chatId);
        const session = this.sessions.get(strId);
        if (!session || !session.earlyMatch) return null;

        const { knowledge, source, category } = session.earlyMatch;
        const formattedResponse = ResponseGenerator.formatKnowledgeResponse(
            knowledge,
            source,
            category,
            session.lang
        );

        const summaryCard = this.renderAnamnesisSummary(session);

        const fullMessage = (
            `⚡ *[HASIL KONSULTASI ADAPTIF - EARLY EXIT]*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Hasil evaluasi awal menunjukkan indikasi klinis yang jelas tanpa perlu melanjutkan sisa pertanyaan:\n\n` +
            `${summaryCard}\n\n` +
            `${formattedResponse}`
        );

        this.cancelSession(strId);

        return {
            status: 'COMPLETED_EARLY_EXIT',
            renderedMessage: fullMessage,
            keyboard: {
                inline_keyboard: [
                    [{ text: '👨‍⚕️ Konsultasikan ke Dokter Jaga', callback_data: 'menu_dokter' }],
                    [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                ]
            }
        };
    }

    /**
     * User chooses to continue anamnesis even though early answer is found
     */
    continueAnamnesis(chatId) {
        const strId = String(chatId);
        const session = this.sessions.get(strId);
        if (!session) return null;

        session.earlyMatch = null;
        session.currentStep += 1;

        return {
            status: 'NEXT_STEP',
            step: session.currentStep,
            ...this.renderStepPrompt(session)
        };
    }

    /**
     * Finalize full 7-step anamnesis
     */
    async finalizeAnamnesis(chatId) {
        const strId = String(chatId);
        const session = this.sessions.get(strId);
        if (!session) return null;

        const summaryCard = this.renderAnamnesisSummary(session);
        const combinedQuery = this.buildCombinedQuery(session);

        // Search Knowledge Base with complete profile
        const kbSearch = await KnowledgeRetriever.search(combinedQuery, 0.58, session.lang);

        let finalResponse = '';
        let replyMarkup = null;

        if (kbSearch.found && kbSearch.knowledge) {
            const kbFormatted = ResponseGenerator.formatKnowledgeResponse(
                kbSearch.knowledge,
                kbSearch.source,
                kbSearch.category,
                session.lang
            );

            finalResponse = (
                `📋 *[HASIL ANAMNESIS LENGKAP SACRED SEVEN]*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `${summaryCard}\n\n` +
                `${kbFormatted}`
            );

            replyMarkup = {
                inline_keyboard: [
                    [{ text: '👨‍⚕️ Tanyakan ke Dokter Jaga', callback_data: 'menu_dokter' }],
                    [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                ]
            };
        } else {
            // Forward to Doctor Queue with full anamnesis summary!
            const doctorQuestion = DoctorService.enqueueQuestion({
                telegramChatId: strId,
                questionText: `[SACRED SEVEN ANAMNESIS]\n${summaryCard}`
            });

            finalResponse = (
                `📋 *[HASIL ANAMNESIS LENGKAP SACRED SEVEN]*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `${summaryCard}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `👨‍⚕️ *Eskalasi ke Dokter Jaga [Tiket #DQ-${doctorQuestion.id}]:*\n` +
                `Data anamnesis lengkap Anda telah kami teruskan ke antrian dokter jaga untuk mendapatkan telaah klinis dan anjuran terapi yang lebih spesifik.\n\n` +
                `⏳ _Dokter kami akan merespon segera. Anda dapat mengecek status melalui tombol di bawah._`
            );

            replyMarkup = {
                inline_keyboard: [
                    [{ text: '📋 Cek Status Antrian Dokter', callback_data: 'menu_status' }],
                    [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                ]
            };
        }

        this.cancelSession(strId);

        return {
            status: 'COMPLETED_FULL',
            renderedMessage: finalResponse,
            keyboard: replyMarkup
        };
    }

    /**
     * Render the prompt and inline keyboard for a specific step
     */
    renderStepPrompt(session) {
        const stepConfig = SACRED_SEVEN_STEPS[session.currentStep];
        const stepNum = session.currentStep;

        const header = `🩺 *[KONSULTASI KLINIS - TAHAP ${stepConfig.title}]*`;
        const initialNote = session.initialComplaint && stepNum === 1
            ? `📌 *Keluhan Utama:* _"${session.initialComplaint}"_\n\n`
            : '';

        const text = (
            `${header}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `${initialNote}` +
            `❓ ${stepConfig.question}\n\n` +
            `💡 _Pilih jawaban pada tombol di bawah, atau ketik langsung jika ingin menjelaskan lebih rinci._`
        );

        // Build inline keyboard
        const keyboardRows = stepConfig.options.map(opt => ([{
            text: opt.text,
            callback_data: `anam_val:${stepNum}:${encodeURIComponent(opt.value)}`
        }]));

        keyboardRows.push([
            { text: '❌ Batalkan Konsultasi', callback_data: 'anam_cancel' }
        ]);

        return {
            renderedMessage: text,
            keyboard: { inline_keyboard: keyboardRows }
        };
    }

    /**
     * Build combined query string for Knowledge Retrieval
     */
    buildCombinedQuery(session) {
        const parts = [
            session.initialComplaint,
            session.answers.location,
            session.answers.quality,
            session.answers.associated_symptoms,
            session.answers.onset,
            session.answers.elevating || session.answers.alleviating,
            session.answers.aggregating || session.answers.aggravating
        ].filter(Boolean);

        return parts.join(' ');
    }

    /**
     * Render structured summary of answers
     */
    renderAnamnesisSummary(session) {
        const a = session.answers;
        return (
            `📝 *Profil Riwayat Keluhan Pasien (Sacred Seven):*\n` +
            `• *1. Onset (Awitan):* ${a.onset || '-'}\n` +
            `• *2. Location (Lokasi):* ${a.location || '-'}\n` +
            `• *3. Quality (Sifat/Karakteristik):* ${a.quality || '-'}\n` +
            `• *4. Quantity (Keparahan 1-10):* ${a.quantity || '-'}\n` +
            `• *5. Elevating (Meringankan):* ${a.elevating || a.alleviating || '-'}\n` +
            `• *6. Aggregating (Memperberat):* ${a.aggregating || a.aggravating || '-'}\n` +
            `• *7. Gejala Penyerta (Other Symptoms):* ${a.associated_symptoms || '-'}`
        );
    }

    /**
     * Generate Red Flag Emergency Message (Wajib Sarankan ke IGD Terdekat)
     */
    generateEmergencyMessage(redFlag, lang = 'id') {
        return (
            `🚨 *[PERINGATAN MEDIS: KONDISI GAWAT DARURAT]* 🚨\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚠️ *Terdeteksi Tanda Bahaya Medis Kritis (Red Flag):*\n` +
            `👉 *${redFlag.label}*\n\n` +
            `Gejala yang Anda laporkan memerlukan evaluasi fisik dan penanganan medis darurat SEGERA.\n\n` +
            `🏥 *SARAN TINDAKAN DARURAT SEGERA:*\n` +
            `1. **Segera menuju ke Instalasi Gawat Darurat (IGD) Rumah Sakit terdekat!** Jangan menunda atau menunggu gejala mereda.\n` +
            `2. **Hubungi Ambulans / Layanan Darurat 119 atau 112** apabila pasien tidak memungkinkan dipindahkan secara mandiri.\n\n` +
            `📌 *Pertolongan Pertama Sesaat Menuju IGD:*\n` +
            `• ${redFlag.firstAid}\n` +
            `• JANGAN menyetir kendaraan sendiri! Mintalah bantuan keluarga, tetangga, atau orang terdekat untuk mengantar ke IGD.\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⛔ _Anamnesis dihentikan demi keselamatan dan penanganan darurat pasien._`
        );
    }

    /**
     * Emergency Keyboard with Call & Maps link
     */
    getEmergencyKeyboard(lang = 'id') {
        return {
            inline_keyboard: [
                [
                    { text: '📍 Cari IGD Rumah Sakit Terdekat (Google Maps)', url: 'https://www.google.com/maps/search/IGD+Rumah+Sakit+Terdekat' }
                ],
                [
                    { text: '📞 Hubungi Ambulans (119)', url: 'tel:119' },
                    { text: '🏠 Menu Utama', callback_data: 'menu_main' }
                ]
            ]
        };
    }

    /**
     * Generate Early Exit Offer Message
     */
    generateEarlyOfferMessage(session) {
        const title = session.earlyMatch.knowledge.title;
        const confidence = Math.round(session.earlyMatch.score * 100);
        const shortAns = session.earlyMatch.knowledge.short_answer || '';

        return (
            `⚡ *[HASIL EVALUASI SACRED SEVEN - JAWABAN TERDETEKSI]*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Beberapa pertanyaan Sacred Seven yang Anda jawab telah cukup untuk menentukan indikasi kondisi klinis:\n\n` +
            `👉 *Kemungkinan Kondisi:* *${title}*\n` +
            `📊 *Tingkat Kecocokan:* *${confidence}%*\n` +
            `📋 *Ringkasan Klinis:* _${shortAns}_\n\n` +
            `💡 _Lebih ideal jika seluruh 7 pertanyaan dilengkapi. Namun, Anda dapat langsung melihat panduan lengkap sekarang atau memilih melanjutkan seluruh langkah Sacred Seven._`
        );
    }

    /**
     * Early Exit Offer Keyboard
     */
    getEarlyOfferKeyboard(lang = 'id') {
        return {
            inline_keyboard: [
                [
                    { text: '💡 Lihat Solusi & Penanganan Sekarang', callback_data: 'anam_early_accept' }
                ],
                [
                    { text: '📝 Lanjut Lengkapi Sisa Sacred Seven', callback_data: 'anam_early_continue' }
                ],
                [
                    { text: '❌ Batalkan Konsultasi', callback_data: 'anam_cancel' }
                ]
            ]
        };
    }
}

module.exports = new AnamnesisService();
