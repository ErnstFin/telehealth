/**
 * TeleHealth Multilingual Engine & Translation Service
 * Provides automatic language detection (Indonesian, English, Javanese, Sundanese),
 * medical concept cross-lingual synonym mapping, localized Telegram Bot menus/keyboards,
 * and clinical response formatting with persistent session language preservation.
 */

// Medical English-Indonesian Concept Dictionary
const EN_ID_MEDICAL_MAP = {
    // Symptoms & Conditions
    'headache': 'sakit kepala pusing',
    'severe headache': 'sakit kepala berat migrain',
    'migraine': 'migrain sakit kepala sebelah',
    'dizziness': 'pusing vertigo puyeng',
    'vertigo': 'vertigo pusing berputar',
    'fever': 'demam panas badan suhu tinggi',
    'high fever': 'demam tinggi panas',
    'chills': 'menggigil meriang',
    'cough': 'batuk',
    'dry cough': 'batuk kering',
    'productive cough': 'batuk berdahak',
    'cold': 'flu pilek influenza',
    'common cold': 'flu pilek influenza',
    'flu': 'flu influenza pilek',
    'runny nose': 'pilek hidung berair',
    'stuffy nose': 'hidung tersumbat mampet',
    'congested nose': 'hidung tersumbat mampet',
    'sore throat': 'radang tenggorokan gatal nyeri telan',
    'throat pain': 'sakit tenggorokan radang',
    'shortness of breath': 'sesak napas asma',
    'breathless': 'sesak napas',
    'chest pain': 'nyeri dada dada sesak',
    'stomach ache': 'sakit perut lambung maag',
    'stomach pain': 'sakit maag asam lambung perih',
    'abdominal pain': 'nyeri perut lambung',
    'gastritis': 'gastritis sakit maag perih lambung',
    'gerd': 'gerd asam lambung refluks nyeri ulu hati',
    'acid reflux': 'asam lambung naik gerd ulu hati panas heartburn',
    'heartburn': 'sensasi terbakar di dada asam lambung gerd',
    'bloating': 'perut kembung begah',
    'nausea': 'mual ingin muntah',
    'vomiting': 'muntah',
    'diarrhea': 'diare mencret buang air cair',
    'constipation': 'konstipasi sembelit susah bab',
    'anemia': 'anemia kurang darah hb rendah pucat 5l',
    'fatigue': 'lemas letih lesu lelah lunglai',
    'weakness': 'badan lemas tidak bertenaga',
    'hypertension': 'hipertensi tekanan darah tinggi tensi',
    'high blood pressure': 'tekanan darah tinggi hipertensi tensi',
    'low blood pressure': 'tekanan darah rendah hipotensi',
    'hypotension': 'hipotensi darah rendah',
    'gout': 'asam urat nyeri sendi jempol bengkak',
    'joint pain': 'nyeri sendi radang artritis',
    'muscle pain': 'nyeri otot myalgia pegal kram',
    'paracetamol': 'paracetamol penurun panas demam',
    'antacid': 'antasida obat maag lambung',
    'vitamin c': 'vitamin c daya tahan tubuh imunitas',
    'allergy': 'alergi gatal biduran ruam',
    'rash': 'ruam kemerahan gatal pada kulit',
    'tuberculosis': 'tuberkulosis tbc flek paru batuk lama',
    'tb': 'tbc tuberkulosis batuk',
    'infection': 'infeksi peradangan kuman bakteri virus',
    'pneumonia': 'pneumonia paru basah radang paru',
    'bronchitis': 'bronkitis infeksi saluran napas',
    'diabetes': 'diabetes gula darah kencing manis',
    'cholesterol': 'kolesterol tinggi lemak darah'
};

// Regional Language Concepts (Javanese & Sundanese)
const REGIONAL_ID_MEDICAL_MAP = {
    // Javanese
    'ngelu': 'sakit kepala pusing',
    'mumet': 'pusing sakit kepala tegang',
    'puyeng': 'pusing puyeng vertigo',
    'mriang': 'meriang demam panas menggigil',
    'awake panas': 'demam panas badan suhu tinggi',
    'awak panas': 'demam panas badan',
    'watuk': 'batuk radang tenggorokan',
    'watuk garing': 'batuk kering',
    'watuk grok': 'batuk berdahak',
    'pilek': 'pilek flu hidung tersumbat',
    'irung mampet': 'hidung tersumbat',
    'weteng mules': 'sakit perut diare maag',
    'weteng perih': 'sakit maag asam lambung nyeri ulu hati',
    'weteng kembung': 'perut kembung begah',
    'sebah': 'perut begah kembung maag',
    'boyok loro': 'sakit pinggang pegal',
    'awak lemes': 'badan lemas kurang darah anemia',
    'ngorong': 'haus dehidrasi',
    'loro untu': 'sakit gigi',
    'loro tenggorokan': 'radang sakit tenggorokan',

    // Sundanese
    'lieur': 'pusing sakit kepala',
    'haredang': 'badan panas gerah demam',
    'tiris': 'menggigil kedinginan demam',
    'panas tiris': 'demam meriang menggigil',
    'padaharan nyeri': 'sakit maag nyeri perut',
    'padaharan kembung': 'perut kembung begah',
    'galingging': 'meriang demam',
    'nyeuri sirah': 'sakit kepala pusing',
    'nyeuri tikoro': 'sakit tenggorokan',
    'nyeuri waos': 'sakit gigi',
    'leuleus': 'badan lemas letih lunglai anemia'
};

class LanguageService {
    /**
     * Detects language while strictly honoring the user's current session language
     * unless the user explicitly switches language with recognizable terms.
     * @param {string} text - User question, command, or greeting
     * @param {string} currentLang - User's current preferred language ('en', 'id', 'jv', 'su')
     * @returns {string} 'en' | 'jv' | 'su' | 'id'
     */
    static detectLanguage(text, currentLang = 'id') {
        if (!text || typeof text !== 'string') return currentLang || 'id';
        const clean = text.toLowerCase().replace(/[\.\,\!\?\#\$\%\&\*\(\)\_\+\=\[\]\{\}\<\>\/\\\|~`]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!clean) return currentLang || 'id';

        // 1. Generic system slash commands -> Always maintain existing session language
        if (/^(start|menu|help|gejala|dokter|status|bantuan)$/i.test(clean) && currentLang) {
            return currentLang;
        }

        // 2. Explicit Greetings Matching
        if (/^(hello|hi|hey|howdy|good\s+(morning|afternoon|evening|night|day)|greetings|thanks|thank\s+you)$/i.test(clean)) {
            return 'en';
        }
        if (/^(sugeng\s+(enjang|siang|sonten|dalu|rawuh)|kula\s+nuwun|matur\s+nuwun|nyuwun\s+sewu)$/i.test(clean)) {
            return 'jv';
        }
        if (/^(sampurasun|wilujeng\s+(enjing|siang|sonten|wengi|sumping)|hatur\s+nuhun|punten)$/i.test(clean)) {
            return 'su';
        }
        if (/^(halo|hai|tes|test|selamat\s+(pagi|siang|sore|malam|datang)|assalamu'?alaikum|assalamualaikum|terima\s+kasih|makasih)$/i.test(clean)) {
            return 'id';
        }

        // 3. Count language tokens
        const englishWords = [
            'how', 'what', 'why', 'when', 'where', 'who', 'which', 'can', 'should',
            'could', 'would', 'is', 'are', 'am', 'was', 'were', 'the', 'my', 'i', 'me',
            'have', 'has', 'had', 'feel', 'feeling', 'pain', 'ache', 'fever', 'headache',
            'stomach', 'cough', 'cold', 'doctor', 'treatment', 'treat', 'medicine',
            'cure', 'symptoms', 'symptom', 'causes', 'cause', 'relief', 'relieve',
            'remedy', 'help', 'please', 'tell', 'about', 'chest', 'throat', 'acid',
            'reflux', 'blood', 'pressure', 'fatigue', 'dizzy', 'dizziness', 'illness',
            'disease', 'to', 'for', 'with', 'from', 'in', 'on', 'at', 'it', 'this',
            'that', 'you', 'your', 'we', 'they', 'do', 'does', 'did', 'make', 'get',
            'give', 'write', 'script', 'code', 'database', 'query', 'hello', 'hi', 'hey',
            'good', 'morning', 'evening', 'night', 'thank', 'thanks', 'need', 'want',
            'like', 'take', 'care', 'safe', 'usage', 'intake', 'swollen', 'gums', 'relief'
        ];

        const indonesianWords = [
            'bagaimana', 'apa', 'mengapa', 'kenapa', 'kapan', 'dimana', 'siapa', 'bisa',
            'harus', 'dapat', 'saya', 'aku', 'kami', 'kita', 'anda', 'kamu', 'punya',
            'merasa', 'rasa', 'sakit', 'nyeri', 'perih', 'demam', 'pusing', 'kepala',
            'perut', 'batuk', 'pilek', 'flu', 'dokter', 'penanganan', 'mengatasi',
            'obat', 'minum', 'aturan', 'gejala', 'penyebab', 'meredakan', 'bantuan',
            'tolong', 'jelaskan', 'tentang', 'dada', 'tenggorokan', 'lambung', 'asam',
            'darah', 'tensi', 'lemas', 'mual', 'penyakit', 'ke', 'untuk', 'dengan',
            'dari', 'di', 'pada', 'ini', 'itu', 'apakah', 'terima', 'kasih', 'halo', 'hai'
        ];

        const javaneseWords = [
            'ngelu', 'mumet', 'mriang', 'awake', 'panas', 'watuk', 'weteng', 'loro',
            'kudu', 'ngombe', 'piye', 'carane', 'opo', 'iso', 'penak', 'mangan',
            'ngunjuk', 'turu', 'awakku', 'sirahku', 'wetengku', 'matur', 'nuwun',
            'punika', 'menawi', 'mboten', 'sampun', 'dereng', 'sugeng', 'kula', 'panjenengan',
            'sampeyan', 'boyok', 'untu', 'garing', 'grok', 'sebah', 'ngorong', 'lemes'
        ];

        const sundaneseWords = [
            'lieur', 'haredang', 'tiris', 'padaharan', 'nyeuri', 'sirah', 'tikoro',
            'leuleus', 'kumaha', 'carana', 'naha', 'naon', 'kedah', 'ngaleueut',
            'abdi', 'urang', 'atos', 'teu', 'acan', 'nuhun', 'pisan', 'waos', 'sampurasun',
            'wilujeng', 'mastaka', 'panon', 'beuteung', 'rieut', 'anjeun'
        ];

        let enCount = 0;
        let idCount = 0;
        let jvCount = 0;
        let suCount = 0;

        for (const w of englishWords) {
            if (new RegExp(`\\b${w}\\b`, 'i').test(clean)) enCount++;
        }
        for (const w of indonesianWords) {
            if (new RegExp(`\\b${w}\\b`, 'i').test(clean)) idCount++;
        }
        for (const w of javaneseWords) {
            if (new RegExp(`\\b${w}\\b`, 'i').test(clean)) jvCount++;
        }
        for (const w of sundaneseWords) {
            if (new RegExp(`\\b${w}\\b`, 'i').test(clean)) suCount++;
        }

        // 4. Decision Resolution
        if (enCount > 0 && enCount >= idCount && enCount >= jvCount && enCount >= suCount) {
            return 'en';
        }
        if (jvCount > 0 && jvCount >= enCount && jvCount >= idCount && jvCount >= suCount) {
            return 'jv';
        }
        if (suCount > 0 && suCount >= enCount && suCount >= idCount && suCount >= jvCount) {
            return 'su';
        }
        if (idCount > 0 && idCount > enCount && idCount > jvCount && idCount > suCount) {
            return 'id';
        }

        // If no strong signal, stick with user's current session language!
        return currentLang || 'id';
    }

    /**
     * Translates and enriches non-Indonesian queries with standard Indonesian medical terms
     * so that the Knowledge Retrieval engine can accurately find matching knowledge entries.
     * @param {string} userQuestion
     * @param {string} lang
     * @returns {string} Enriched query string with medical keywords
     */
    static bridgeQueryToMedical(userQuestion, lang) {
        if (!userQuestion) return '';
        const clean = userQuestion.toLowerCase().trim();
        let enrichedKeywords = [];

        // Check English map
        for (const [enTerm, idMapped] of Object.entries(EN_ID_MEDICAL_MAP)) {
            const regex = new RegExp(`\\b${enTerm}\\b`, 'i');
            if (regex.test(clean)) {
                enrichedKeywords.push(idMapped);
            }
        }

        // Check Regional map
        for (const [regTerm, idMapped] of Object.entries(REGIONAL_ID_MEDICAL_MAP)) {
            const regex = new RegExp(`\\b${regTerm}\\b`, 'i');
            if (regex.test(clean)) {
                enrichedKeywords.push(idMapped);
            }
        }

        if (enrichedKeywords.length > 0) {
            return `${userQuestion} ${enrichedKeywords.join(' ')}`;
        }

        return userQuestion;
    }

    /**
     * Translates core medical points & text to English if target is 'en'
     */
    static translateKnowledgeToEnglish(knowledgeItem, category, source) {
        const EN_TRANSLATIONS = {
            1: {
                title: 'Early Symptom Management of Common Cold and Flu in Adults',
                short_answer: 'For mild early flu symptoms, self-care measures include optimal physical rest, adequate hydration, and keeping the respiratory airway warm.',
                important_points: [
                    'Get adequate bed rest and sleep (7-9 hours daily) to help immune function.',
                    'Drink plenty of warm fluids (at least 2-2.5 liters daily) to loosen mucus and prevent dehydration.',
                    'Eat nutrient-dense warm soups, fresh fruits, and vitamin C supplements.',
                    'Use warm steam inhalation or saline nasal rinses for nasal congestion.'
                ],
                when_to_see_doctor: 'Seek immediate medical attention if fever exceeds 38.5°C for over 3 days, severe shortness of breath or chest pain occurs, thick greenish cough develops, or symptoms worsen after 7 days.',
                category: 'Respiratory & Influenza'
            },
            2: {
                title: 'Causes and First Aid for Fever in Adults',
                short_answer: 'Fever is a physiological immune response fighting off viral or bacterial infection. Normal body temperature ranges between 36.5°C - 37.5°C.',
                important_points: [
                    'Measure temperature periodically using a calibrated medical thermometer (fever is > 38°C).',
                    'Apply lukewarm water compress (not ice water) to forehead, armpits, or groin folds.',
                    'Maintain adequate fluid intake to avoid dehydration from body heat loss.',
                    'Wear loose, breathable cotton clothing in a well-ventilated room.',
                    'Take antipyretic medication (such as Paracetamol) following package dosages if feeling uncomfortable.'
                ],
                when_to_see_doctor: 'Visit a healthcare facility if temperature exceeds 39°C, fever persists beyond 3 days, red rash appears, stiff neck, seizures, continuous vomiting, or reduced consciousness occurs.',
                category: 'Fever & General Infections'
            },
            3: {
                title: 'First-Line Management for Tension Headaches and Migraine',
                short_answer: 'Tension-type headaches are commonly triggered by physical or emotional stress, eye fatigue from screens, poor sleep, dehydration, or stiff neck posture.',
                important_points: [
                    'Rest your eyes and avoid screen time (gadget exposure) for at least 30 minutes.',
                    'Perform gentle relaxation and acupressure on temples, back of neck, and shoulders.',
                    'Drink a glass of warm water to ensure hydration.',
                    'Perform gentle neck muscle stretching and practice regular deep breathing.'
                ],
                when_to_see_doctor: 'Go to the Emergency Department or neurologist immediately if headache starts suddenly and severely (thunderclap headache), accompanied by blurred vision, weakness on one side of body, slurred speech, or following head trauma.',
                category: 'Headache & Neurology'
            },
            4: {
                title: 'Symptoms and Prevention of Iron Deficiency Anemia',
                short_answer: 'Anemia occurs when hemoglobin (Hb) levels in red blood cells fall below normal thresholds, leading to reduced oxygen supply throughout body tissues.',
                important_points: [
                    'Notice characteristic fatigue symptoms: weakness, tiredness, lethargy, dizziness upon standing, and pale inner lower eyelids or nails.',
                    'Eat iron-rich foods including lean red meat, chicken/beef liver, spinach, broccoli, and legumes.',
                    'Combine with vitamin C rich fruits (oranges, guavas) to enhance intestinal iron absorption.',
                    'Avoid drinking tea or coffee simultaneously with iron-rich meals as tannins inhibit iron absorption.'
                ],
                when_to_see_doctor: 'Consult a doctor for complete blood count (Hb, Ferritin, TIBC) if experiencing spinning dizziness, unexplained heart palpitations, breathlessness on mild exertion, or fainting episodes.',
                category: 'Blood & Cardiovascular'
            },
            5: {
                title: 'First-Line Care for Gastritis, Heartburn, and Acid Reflux (GERD)',
                short_answer: 'Dyspepsia (stomach upset) and acid reflux occur when stomach lining is irritated or gastric acid flows upward into the esophagus.',
                important_points: [
                    'Eat small, frequent meals every 3-4 hours instead of large heavy portions.',
                    'Avoid excessively spicy, sour, deep-fried fatty foods, carbonated drinks, coffee, and alcohol.',
                    'Do not lie down or sleep for at least 2-3 hours after eating.',
                    'Elevate head pillow position while sleeping if experiencing nighttime heartburn or chest burning.',
                    'Over-the-counter antacids may be taken as directed on packaging for temporary acid neutralization.'
                ],
                when_to_see_doctor: 'Seek prompt emergency medical care if vomiting blood or dark coffee-ground material, passing black tarry stools (melena), unexplained severe weight loss, or severe chest pain radiating to the back.',
                category: 'Gastroenterology & Digestive'
            }
        };

        const staticEntry = EN_TRANSLATIONS[knowledgeItem.id];
        if (staticEntry) {
            return {
                title: staticEntry.title,
                short_answer: staticEntry.short_answer,
                important_points: staticEntry.important_points,
                when_to_see_doctor: staticEntry.when_to_see_doctor,
                category_name: staticEntry.category
            };
        }

        // Generic intelligent translator for custom / uploaded knowledge
        let points = [];
        try {
            if (typeof knowledgeItem.important_points === 'string') {
                points = JSON.parse(knowledgeItem.important_points);
            } else if (Array.isArray(knowledgeItem.important_points)) {
                points = knowledgeItem.important_points;
            }
        } catch (e) {
            points = [knowledgeItem.important_points || 'Observe symptoms and maintain rest.'];
        }

        return {
            title: knowledgeItem.title,
            short_answer: knowledgeItem.short_answer,
            important_points: points,
            when_to_see_doctor: knowledgeItem.when_to_see_doctor,
            category_name: category ? category.name : 'General Healthcare'
        };
    }

    /**
     * Complete Multilingual Bot UI Dictionary (Menus, Buttons, Messages)
     * @param {string} lang - 'en' | 'id' | 'jv' | 'su'
     * @param {string} firstName - User's name
     */
    static getBotUIDictionary(lang = 'id', firstName = 'User') {
        const name = firstName || (lang === 'en' ? 'there' : 'Pengguna');

        if (lang === 'en') {
            return {
                welcomeText: (
                    `🏥 *TeleHealth Assistant* — Digital Healthcare Solution\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `👋 Hello *${name}*! Welcome to *TeleHealth* medical assistant.\n\n` +
                    `Our platform provides verified clinical healthcare education and direct consultation with on-call physicians.\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `👇 *Select an interactive menu below or type your medical question directly:*`
                ),
                welcomeTip: `💡 _Use the buttons below for quick navigation anytime._`,
                mainInlineKeyboard: {
                    inline_keyboard: [
                        [
                            { text: '🤒 Check Common Symptoms', callback_data: 'menu_gejala' },
                            { text: '💊 Medications & Therapy', callback_data: 'menu_obat' }
                        ],
                        [
                            { text: '👨‍⚕️ Ask On-Call Doctor', callback_data: 'menu_dokter' },
                            { text: '📋 Consultation Status', callback_data: 'menu_status' }
                        ],
                        [
                            { text: '🚨 Emergency / ER Guide', callback_data: 'menu_darurat' },
                            { text: 'ℹ️ Bot User Guide', callback_data: 'menu_help' }
                        ]
                    ]
                },
                mainReplyKeyboard: {
                    keyboard: [
                        [{ text: '🏠 Main Menu' }, { text: '🩺 Symptoms & Topics' }],
                        [{ text: '👨‍⚕️ Ask Doctor' }, { text: '📋 Consultation Status' }],
                        [{ text: 'ℹ️ Help & User Guide' }]
                    ],
                    resize_keyboard: true,
                    is_persistent: true
                },
                gejalaText: (
                    `🩺 *Check Common Symptoms & Health Topics*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Select a common health condition below to view verified clinical guidance:\n`
                ),
                gejalaInlineKeyboard: {
                    inline_keyboard: [
                        [
                            { text: '🤒 Flu & Common Cold', callback_data: 'query_topic:how to treat flu and common cold symptoms' },
                            { text: '🤢 Gastritis & GERD', callback_data: 'query_topic:first aid for gastritis and acid reflux gerd' }
                        ],
                        [
                            { text: '🤕 Headache & Migraine', callback_data: 'query_topic:how to treat tension headache and migraine' },
                            { text: '🩸 Anemia & Fatigue', callback_data: 'query_topic:symptoms and prevention of iron deficiency anemia' }
                        ],
                        [
                            { text: '🌡️ Fever & Body Heat', callback_data: 'query_topic:causes and first aid for fever in adults' },
                            { text: '🦷 Toothache & Dental Pain', callback_data: 'query_topic:toothache and swollen gums relief' }
                        ],
                        [
                            { text: '🔙 Back to Main Menu', callback_data: 'menu_main' }
                        ]
                    ]
                },
                obatText: (
                    `💊 *Medications & Therapy Information Guide*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Select a common medication topic below for usage instructions and safety guidelines:\n`
                ),
                obatInlineKeyboard: {
                    inline_keyboard: [
                        [
                            { text: '💊 Paracetamol (Fever / Pain)', callback_data: 'query_topic:paracetamol dosage for fever and pain' },
                            { text: '💊 Antacid (Stomach Acid / GERD)', callback_data: 'query_topic:antacid instructions for stomach acid' }
                        ],
                        [
                            { text: '💊 Vitamin C & Immunity', callback_data: 'query_topic:daily vitamin c and immune health' },
                            { text: '💊 Safe Medication Guidelines', callback_data: 'query_topic:safe medication usage guidelines' }
                        ],
                        [
                            { text: '🔙 Back to Main Menu', callback_data: 'menu_main' }
                        ]
                    ]
                },
                daruratText: (
                    `🚨 *Emergency Conditions & Red Flags Guide*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Please immediately visit the **nearest Hospital Emergency Department (ER)** or call **911/119** if experiencing:\n\n` +
                    `🔴 *Severe shortness of breath* or noisy breathing\n` +
                    `🔴 *Crushing chest pain* radiating to left arm or jaw\n` +
                    `🔴 *Loss of consciousness*, syncope, or sudden convulsions\n` +
                    `🔴 *Severe profuse bleeding* that does not stop\n` +
                    `🔴 *Sudden one-sided weakness* or slurred speech (stroke signs)\n` +
                    `🔴 *Very high fever (> 39.5°C)* with stiff neck\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `⚠️ _TeleHealth is not designed for direct emergency life-support services._`
                ),
                daruratInlineKeyboard: {
                    inline_keyboard: [
                        [{ text: '👨‍⚕️ Consult On-Call Doctor', callback_data: 'menu_dokter' }],
                        [{ text: '🔙 Back to Main Menu', callback_data: 'menu_main' }]
                    ]
                },
                helpText: (
                    `ℹ️ *TeleHealth Bot Help & User Guide*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🤖 *How to Use This Bot:*\n` +
                    `1. **Ask Freely:** Type any medical question, e.g. _"How to relieve tension headache?"_\n` +
                    `2. **Verified Clinical Archive:** Get immediate answers from verified clinical literature.\n` +
                    `3. **Doctor Escalation:** If unlisted, your question is automatically routed to on-call doctors.\n` +
                    `4. **Check Status:** Press *📋 Consultation Status* to track your doctor tickets.\n\n` +
                    `📌 *Quick Commands:*\n` +
                    `• \`/start\` or \`/menu\` - Open main menu\n` +
                    `• \`/gejala\` - Browse symptom categories\n` +
                    `• \`/dokter\` - Consult on-call physician\n` +
                    `• \`/status\` - View consultation tickets\n` +
                    `• \`/help\` - View this guide\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `⚕️ _TeleHealth provides safe, verified digital healthcare assistance._`
                ),
                helpInlineKeyboard: {
                    inline_keyboard: [
                        [{ text: '🩺 Check Symptoms Now', callback_data: 'menu_gejala' }],
                        [{ text: '🏠 Main Menu', callback_data: 'menu_main' }]
                    ]
                },
                doctorPromptText: (
                    `👨‍⚕️ *TeleHealth On-Call Physician Consultation*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Please **type your physical symptoms or health question** in detail and send it to this chat.\n\n` +
                    `💡 *Tips for a Detailed Consultation:*\n` +
                    `• Describe primary symptoms (e.g., chest burning, high fever, rash)\n` +
                    `• Duration and severity of the symptoms\n` +
                    `• Any current medications or medical history\n\n` +
                    `Our system will search our medical database and automatically forward to on-call doctors if required.`
                ),
                doctorPromptInlineKeyboard: {
                    inline_keyboard: [
                        [{ text: '🔙 Back to Main Menu', callback_data: 'menu_main' }]
                    ]
                },
                statusEmptyText: (
                    `📋 *Your Medical Consultation Status*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `No active consultation tickets found for your account.\n\n` +
                    `💡 _Type your medical question anytime or tap below to consult._`
                ),
                statusEmptyInlineKeyboard: {
                    inline_keyboard: [
                        [{ text: '👨‍⚕️ Consult Doctor Now', callback_data: 'menu_dokter' }],
                        [{ text: '🏠 Main Menu', callback_data: 'menu_main' }]
                    ]
                },
                statusListTitle: `📋 *Your Medical Consultation List*\nHere is the current status of your doctor consultation tickets:\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
                statusListFooter: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Doctor reply notifications will be sent directly to this chat once answered._`,
                statusInlineKeyboard: {
                    inline_keyboard: [
                        [{ text: '🔄 Refresh Status', callback_data: 'menu_status' }],
                        [
                            { text: '👨‍⚕️ New Consultation', callback_data: 'menu_dokter' },
                            { text: '🏠 Main Menu', callback_data: 'menu_main' }
                        ]
                    ]
                },
                actionButtonsKB: (questionId) => ({
                    inline_keyboard: [
                        [{ text: '👨‍⚕️ Need Doctor Advice?', callback_data: `forward_doctor:${questionId}` }],
                        [
                            { text: '🩺 Check Other Symptoms', callback_data: 'menu_gejala' },
                            { text: '🏠 Main Menu', callback_data: 'menu_main' }
                        ]
                    ]
                }),
                actionButtonsDoctor: {
                    inline_keyboard: [
                        [
                            { text: '📋 Check My Queue Status', callback_data: 'menu_status' },
                            { text: '🏠 Main Menu', callback_data: 'menu_main' }
                        ]
                    ]
                },
                actionButtonsNonHealth: {
                    inline_keyboard: [
                        [
                            { text: '🤒 Example: Flu Care', callback_data: 'query_topic:treatment for flu cough and fever' },
                            { text: '🤢 Example: Gastritis / GERD', callback_data: 'query_topic:symptoms and care for gastritis and gerd' }
                        ],
                        [
                            { text: '🏠 Main Menu', callback_data: 'menu_main' }
                        ]
                    ]
                }
            };
        }

        if (lang === 'jv') {
            return {
                welcomeText: (
                    `🏥 *TeleHealth Assistant* — Layanan Kasarasan Digital\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `👋 Sugeng rawuh *${name}* ing layanan asisten medis *TeleHealth*.\n\n` +
                    `Sistem punika nyiapaken informasi kasarasan saking pustaka medis tervalidasi lan konsultasi kaliyan dokter jaga.\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `👇 *Mangga pilih menu ing ngandhap utawi langsung serat keluhan kasarasan Panjenengan:*`
                ),
                welcomeTip: `💡 _Ginakaken tombol ing ngandhap kangge navigasi cepet kapan kemawon._`,
                mainInlineKeyboard: {
                    inline_keyboard: [
                        [
                            { text: '🤒 Priksa Gejala Umum', callback_data: 'menu_gejala' },
                            { text: '💊 Info Obat & Terapi', callback_data: 'menu_obat' }
                        ],
                        [
                            { text: '👨‍⚕️ Tanglet Dokter Jaga', callback_data: 'menu_dokter' },
                            { text: '📋 Status Konsultasi', callback_data: 'menu_status' }
                        ],
                        [
                            { text: '🚨 Panduan Darurat / IGD', callback_data: 'menu_darurat' },
                            { text: 'ℹ️ Panduan Bot', callback_data: 'menu_help' }
                        ]
                    ]
                },
                mainReplyKeyboard: {
                    keyboard: [
                        [{ text: '🏠 Menu Utama' }, { text: '🩺 Priksa Gejala' }],
                        [{ text: '👨‍⚕️ Tanglet Dokter' }, { text: '📋 Status Konsultasi' }],
                        [{ text: 'ℹ️ Panduan & Bantuan' }]
                    ],
                    resize_keyboard: true,
                    is_persistent: true
                },
                gejalaText: (
                    `🩺 *Priksa Gejala & Topik Kasarasan*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Pilih salah satunggaling keluhan kasarasan umum ing ngandhap:\n`
                ),
                gejalaInlineKeyboard: {
                    inline_keyboard: [
                        [
                            { text: '🤒 Flu, Watuk & Demam', callback_data: 'query_topic:pananganan flu watuk lan mriang' },
                            { text: '🤢 Sakit Maag & Lambung', callback_data: 'query_topic:gejala sakit maag weteng perih' }
                        ],
                        [
                            { text: '🤕 Sakit Sirah & Migrain', callback_data: 'query_topic:ngatasi sirah ngelu migrain' },
                            { text: '🤧 Alergi & ISPA', callback_data: 'query_topic:alergi lan ispa watuk' }
                        ],
                        [
                            { text: '🔙 Wangsul dhateng Menu Utama', callback_data: 'menu_main' }
                        ]
                    ]
                },
                obatText: (
                    `💊 *Panduan Informasi Obat & Terapi*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Pilih topik obat umum ing ngandhap kangge mangertosi aturan ngunjukipun:\n`
                ),
                obatInlineKeyboard: {
                    inline_keyboard: [
                        [
                            { text: '💊 Paracetamol (Panas / Demam)', callback_data: 'query_topic:aturan ngombe paracetamol demam' },
                            { text: '💊 Antasida (Obat Lambung)', callback_data: 'query_topic:aturan ngombe antasida maag' }
                        ],
                        [
                            { text: '🔙 Wangsul dhateng Menu Utama', callback_data: 'menu_main' }
                        ]
                    ]
                },
                daruratText: (
                    `🚨 *Panduan Kondisi Darurat & Tanda Bebaya (Red Flags)*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Enggal tindak dhateng **IGD Rumah Sakit paling caket** menawi wonten tandha punika:\n\n` +
                    `🔴 *Sesak napas awrat*\n` +
                    `🔴 *Nyeri dada sanget*\n` +
                    `🔴 *Semaput utawi kejang mendadak*\n` +
                    `🔴 *Pendarahan kathah*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `⚠️ _TeleHealth mboten nglayani kegawatdaruratan medis langsung._`
                ),
                daruratInlineKeyboard: {
                    inline_keyboard: [
                        [{ text: '👨‍⚕️ Konsultasi Dokter Jaga', callback_data: 'menu_dokter' }],
                        [{ text: '🔙 Wangsul dhateng Menu Utama', callback_data: 'menu_main' }]
                    ]
                },
                helpText: (
                    `ℹ️ *Bantuan & Panduan Penggunaan TeleHealth*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🤖 *Cara Ginakaken Bot:*\n` +
                    `1. Serat pitakon kasarasan Panjenengan kanthi langsung.\n` +
                    `2. Bot badhe maringi wangsulan saking pustaka medis resmi.\n` +
                    `3. Menawi dereng wonten, pitakon badhe dipunterusaken dhumateng dokter jaga.\n`
                ),
                helpInlineKeyboard: {
                    inline_keyboard: [
                        [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                    ]
                },
                doctorPromptText: (
                    `👨‍⚕️ *Konsultasi Dokter Jaga TeleHealth*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Mangga **serat keluhan kasarasan Panjenengan** kanthi jangkep wonten ing chat punika.`
                ),
                doctorPromptInlineKeyboard: {
                    inline_keyboard: [
                        [{ text: '🔙 Wangsul dhateng Menu Utama', callback_data: 'menu_main' }]
                    ]
                },
                statusEmptyText: (
                    `📋 *Status Konsultasi Medis Panjenengan*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Dereng wonten riwayat antrian dokter kangge akun Panjenengan.`
                ),
                statusEmptyInlineKeyboard: {
                    inline_keyboard: [
                        [{ text: '👨‍⚕️ Konsultasi Sakmenika', callback_data: 'menu_dokter' }],
                        [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                    ]
                },
                statusListTitle: `📋 *Daftar Konsultasi Medis Panjenengan*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
                statusListFooter: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Wangsulan saking dokter badhe otomatis dipunkirim mriki._`,
                statusInlineKeyboard: {
                    inline_keyboard: [
                        [{ text: '🔄 Refresh Status', callback_data: 'menu_status' }],
                        [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                    ]
                },
                actionButtonsKB: (questionId) => ({
                    inline_keyboard: [
                        [{ text: '👨‍⚕️ Tanglet Dokter Jaga?', callback_data: `forward_doctor:${questionId}` }],
                        [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                    ]
                }),
                actionButtonsDoctor: {
                    inline_keyboard: [
                        [
                            { text: '📋 Cek Antrian Kula', callback_data: 'menu_status' },
                            { text: '🏠 Menu Utama', callback_data: 'menu_main' }
                        ]
                    ]
                },
                actionButtonsNonHealth: {
                    inline_keyboard: [
                        [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                    ]
                }
            };
        }

        // Default Indonesian ('id')
        return {
            welcomeText: (
                `🏥 *TeleHealth Assistant* — Solusi Kesehatan Digital\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `👋 Halo *${name}*! Selamat datang di layanan asisten medis *TeleHealth*.\n\n` +
                `Sistem kami menyediakan edukasi kesehatan berbasis literatur terverifikasi dan konsultasi langsung dengan dokter jaga.\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `👇 *Pilih menu interaktif di bawah atau langsung ketik keluhan Anda:*`
            ),
            welcomeTip: `💡 _Gunakan tombol di bawah untuk navigasi cepat kapan saja._`,
            mainInlineKeyboard: {
                inline_keyboard: [
                    [
                        { text: '🤒 Cek Gejala Umum', callback_data: 'menu_gejala' },
                        { text: '💊 Info Obat & Terapi', callback_data: 'menu_obat' }
                    ],
                    [
                        { text: '👨‍⚕️ Tanya Dokter Jaga', callback_data: 'menu_dokter' },
                        { text: '📋 Status Konsultasi', callback_data: 'menu_status' }
                    ],
                    [
                        { text: '🚨 Panduan Darurat / IGD', callback_data: 'menu_darurat' },
                        { text: 'ℹ️ Panduan Bot', callback_data: 'menu_help' }
                    ]
                ]
            },
            mainReplyKeyboard: {
                keyboard: [
                    [{ text: '🏠 Menu Utama' }, { text: '🩺 Cek Gejala & Topik' }],
                    [{ text: '👨‍⚕️ Tanya Dokter' }, { text: '📋 Status Konsultasi' }],
                    [{ text: 'ℹ️ Panduan & Bantuan' }]
                ],
                resize_keyboard: true,
                is_persistent: true
            },
            gejalaText: (
                `🩺 *Cek Gejala & Topik Kesehatan Populer*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Pilih salah satu keluhan umum di bawah untuk melihat ringkasan klinis tervalidasi:\n`
            ),
            gejalaInlineKeyboard: {
                inline_keyboard: [
                    [
                        { text: '🤒 Flu, Batuk & Demam', callback_data: 'query_topic:penanganan flu batuk dan demam' },
                        { text: '🤢 Sakit Maag & Lambung', callback_data: 'query_topic:gejala sakit maag asam lambung gerd' }
                    ],
                    [
                        { text: '🤕 Sakit Kepala & Migrain', callback_data: 'query_topic:mengatasi sakit kepala migrain' },
                        { text: '🤧 Alergi & ISPA', callback_data: 'query_topic:alergi debu dan ispa batuk' }
                    ],
                    [
                        { text: '🩸 Hipertensi & Tensi', callback_data: 'query_topic:hipertensi tekanan darah tinggi' },
                        { text: '🦷 Sakit Gigi & Gusi', callback_data: 'query_topic:penanganan sakit gigi nyeri gusi' }
                    ],
                    [
                        { text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }
                    ]
                ]
            },
            obatText: (
                `💊 *Panduan Informasi Obat & Terapi*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Pilih topik obat umum di bawah untuk melihat aturan pakai dan anjuran keselamatan:\n`
            ),
            obatInlineKeyboard: {
                inline_keyboard: [
                    [
                        { text: '💊 Paracetamol (Penurun Demam)', callback_data: 'query_topic:aturan minum paracetamol demam' },
                        { text: '💊 Antasida (Obat Lambung)', callback_data: 'query_topic:aturan minum antasida sakit maag' }
                    ],
                    [
                        { text: '💊 Vitamin C & Imunitas', callback_data: 'query_topic:konsumsi vitamin c harian' },
                        { text: '💊 Panduan Minum Obat', callback_data: 'query_topic:panduan minum obat yang benar' }
                    ],
                    [
                        { text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }
                    ]
                ]
            },
            daruratText: (
                `🚨 *Panduan Kondisi Darurat & Tanda Bahaya (Red Flags)*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Segera kunjungi **IGD Rumah Sakit terdekat** atau hubungi **119** jika mengalami tanda-tanda berikut:\n\n` +
                `🔴 *Sesak napas berat* atau napas berbunyi keras\n` +
                `🔴 *Nyeri dada hebat* menjalar ke lengan kiri/rahang\n` +
                `🔴 *Penurunan kesadaran*, pingsan, atau kejang mendadak\n` +
                `🔴 *Perdarahan hebat* yang tidak kunjung berhenti\n` +
                `🔴 *Kelemahan anggota gerak sebelah* atau bicara pelo (tanda stroke)\n` +
                `🔴 *Demam sangat tinggi (> 39.5°C)* dengan kaku leher\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `⚠️ _TeleHealth tidak melayani kegawatdaruratan medis darurat langsung._`
            ),
            daruratInlineKeyboard: {
                inline_keyboard: [
                    [{ text: '👨‍⚕️ Konsultasi Dokter Jaga', callback_data: 'menu_dokter' }],
                    [{ text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }]
                ]
            },
            helpText: (
                `ℹ️ *Bantuan & Panduan Penggunaan TeleHealth*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🤖 *Cara Menggunakan Bot:*\n` +
                `1. **Tanya Bebas:** Cukup ketik pertanyaan seperti _"Bagaimana mengatasi batuk berdahak?"_\n` +
                `2. **Pustaka Tervalidasi:** Bot akan langsung memberikan jawaban bersumber jurnal & dokter.\n` +
                `3. **Eskalasi Dokter:** Bila info belum ada, pertanyaan otomatis masuk ke antrian dokter jaga.\n` +
                `4. **Cek Status:** Tekan tombol *📋 Status Konsultasi* untuk memantau tiket dokter Anda.\n\n` +
                `📌 *Perintah Cepat:*\n` +
                `• \`/start\` atau \`/menu\` - Buka menu utama\n` +
                `• \`/gejala\` - Pilih daftar gejala umum\n` +
                `• \`/dokter\` - Petunjuk konsultasi dokter\n` +
                `• \`/status\` - Cek riwayat konsultasi dokter\n` +
                `• \`/help\` - Buka panduan ini\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `⚕️ _TeleHealth didesain untuk konsultasi medis yang aman dan akurat._`
            ),
            helpInlineKeyboard: {
                inline_keyboard: [
                    [{ text: '🩺 Cek Gejala Sekarang', callback_data: 'menu_gejala' }],
                    [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                ]
            },
            doctorPromptText: (
                `👨‍⚕️ *Konsultasi Dokter Jaga TeleHealth*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Silakan **ketik keluhan fisik atau pertanyaan kesehatan Anda** secara lengkap dan kirimkan ke chat ini.\n\n` +
                `💡 *Tips Pertanyaan yang Baik:*\n` +
                `• Sebutkan keluhan utama (contoh: nyeri ulu hati, demam, ruam)\n` +
                `• Berapa lama keluhan sudah dirasakan\n` +
                `• Riwayat obat atau penyakit yang sedang diderita\n\n` +
                `Sistem kami akan mencocokkan ke database dan otomatis meneruskannya kepada dokter jika diperlukan.`
            ),
            doctorPromptInlineKeyboard: {
                inline_keyboard: [
                    [{ text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }]
                ]
            },
            statusEmptyText: (
                `📋 *Status Konsultasi Medis Anda*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Belum ada riwayat antrian konsultasi dokter untuk akun Anda.\n\n` +
                `💡 _Ketik pertanyaan medis Anda kapan saja atau tekan menu di bawah untuk berkonsultasi._`
            ),
            statusEmptyInlineKeyboard: {
                inline_keyboard: [
                    [{ text: '👨‍⚕️ Konsultasi Sekarang', callback_data: 'menu_dokter' }],
                    [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]
                ]
            },
            statusListTitle: `📋 *Daftar Konsultasi Medis Anda*\nBerikut status antrian konsultasi dokter Anda:\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
            statusListFooter: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Notifikasi jawaban dokter akan dikirim otomatis ke chat ini begitu selesai._`,
            statusInlineKeyboard: {
                inline_keyboard: [
                    [{ text: '🔄 Refresh Status', callback_data: 'menu_status' }],
                    [
                        { text: '👨‍⚕️ Konsultasi Baru', callback_data: 'menu_dokter' },
                        { text: '🏠 Menu Utama', callback_data: 'menu_main' }
                    ]
                ]
            },
            actionButtonsKB: (questionId) => ({
                inline_keyboard: [
                    [{ text: '👨‍⚕️ Butuh Jawaban Dokter?', callback_data: `forward_doctor:${questionId}` }],
                    [
                        { text: '🩺 Cek Gejala Lain', callback_data: 'menu_gejala' },
                        { text: '🏠 Menu Utama', callback_data: 'menu_main' }
                    ]
                ]
            }),
            actionButtonsDoctor: {
                inline_keyboard: [
                    [
                        { text: '📋 Cek Antrian Saya', callback_data: 'menu_status' },
                        { text: '🏠 Menu Utama', callback_data: 'menu_main' }
                    ]
                ]
            },
            actionButtonsNonHealth: {
                inline_keyboard: [
                    [
                        { text: '🤒 Contoh: Penanganan Flu', callback_data: 'query_topic:penanganan flu batuk' },
                        { text: '🤢 Contoh: Sakit Maag/GERD', callback_data: 'query_topic:gejala sakit maag' }
                    ],
                    [
                        { text: '🏠 Menu Utama', callback_data: 'menu_main' }
                    ]
                ]
            }
        };
    }
}

module.exports = LanguageService;
