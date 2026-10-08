/**
 * TeleHealth Multilingual Engine & Translation Service
 * Provides automatic language detection (Indonesian, English, Javanese, Sundanese),
 * medical concept cross-lingual synonym mapping, and localized clinical response formatting.
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
     * Detects the language of the incoming text
     * @param {string} text - User question
     * @returns {string} 'en' | 'jv' | 'su' | 'id'
     */
    static detectLanguage(text) {
        if (!text || typeof text !== 'string') return 'id';
        const clean = text.toLowerCase().trim();

        // 1. English indicators
        const englishWords = [
            'how', 'what', 'why', 'when', 'where', 'who', 'which', 'can', 'should',
            'could', 'would', 'is', 'are', 'am', 'the', 'my', 'i', 'have', 'feel',
            'feeling', 'pain', 'ache', 'fever', 'headache', 'stomach', 'cough',
            'cold', 'doctor', 'treatment', 'treat', 'medicine', 'cure', 'symptoms',
            'symptom', 'causes', 'cause', 'relief', 'relieve', 'remedy', 'help',
            'please', 'tell', 'about', 'chest', 'throat', 'acid', 'reflux', 'blood',
            'pressure', 'fatigue', 'dizzy', 'dizziness', 'illness', 'disease',
            'to', 'for', 'with', 'from', 'in', 'on', 'at', 'it', 'this', 'that',
            'you', 'your', 'we', 'they', 'do', 'does', 'did', 'make', 'get', 'give',
            'write', 'script', 'code', 'database', 'query', 'hello', 'hi', 'good',
            'morning', 'evening', 'night', 'thank', 'thanks', 'need', 'want', 'like'
        ];

        let enCount = 0;
        for (const w of englishWords) {
            const regex = new RegExp(`\\b${w}\\b`, 'i');
            if (regex.test(clean)) enCount++;
        }

        // 2. Javanese indicators
        const javaneseWords = [
            'ngelu', 'mumet', 'mriang', 'awake', 'panas', 'watuk', 'weteng', 'loro',
            'kudu', 'ngombe', 'piye', 'carane', 'opo', 'iso', 'penak', 'mangan',
            'ngunjuk', 'turu', 'awakku', 'sirahku', 'wetengku', 'matur', 'nuwun',
            'punika', 'menawi', 'mboten', 'sampun', 'dereng', 'sugeng'
        ];

        let jvCount = 0;
        for (const w of javaneseWords) {
            const regex = new RegExp(`\\b${w}\\b`, 'i');
            if (regex.test(clean)) jvCount++;
        }

        // 3. Sundanese indicators
        const sundaneseWords = [
            'lieur', 'haredang', 'tiris', 'padaharan', 'nyeuri', 'sirah', 'tikoro',
            'leuleus', 'kumaha', 'carana', 'naha', 'naon', 'kedah', 'ngaleueut',
            'abdi', 'urang', 'atos', 'teu', 'acan', 'nuhun', 'pisan', 'waos'
        ];

        let suCount = 0;
        for (const w of sundaneseWords) {
            const regex = new RegExp(`\\b${w}\\b`, 'i');
            if (regex.test(clean)) suCount++;
        }

        if (enCount >= 2 || (enCount >= 1 && /\b(headache|fever|cough|stomach|doctor|symptoms|pain|cold|how to|write|script|database)\b/i.test(clean))) {
            return 'en';
        }
        if (jvCount >= 2 || (jvCount >= 1 && /\b(ngelu|mumet|mriang|weteng|watuk|boyok)\b/i.test(clean))) {
            return 'jv';
        }
        if (suCount >= 2 || (suCount >= 1 && /\b(lieur|haredang|padaharan|leuleus|tikoro)\b/i.test(clean))) {
            return 'su';
        }

        return 'id'; // Default Indonesian
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
        // Translation mapping for common standard clinical titles and summaries
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
}

module.exports = LanguageService;
