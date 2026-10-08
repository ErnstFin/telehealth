/**
 * Knowledge Base Retrieval Engine
 * Strictly searches ONLY VALID/ACTIVE knowledge entries.
 * Evaluates semantic relevance, medical phrase matches, specificity weights, and category affinity.
 */

const db = require('../db');
const LanguageService = require('./languageService');

// Important multi-word medical concepts & phrases
const MEDICAL_PHRASES = [
    'sakit kepala', 'kepala berdenyut', 'migrain tegang', 'tension headache',
    'asam lambung', 'nyeri ulu hati', 'sakit maag', 'asam lambung naik', 'gerd kambuh',
    'tekanan darah', 'darah tinggi', 'tensi tinggi', 'hipertensi primer',
    'batuk kering', 'batuk berdahak', 'radang tenggorokan', 'tenggorokan gatal', 'hidung tersumbat',
    'sesak napas', 'nyeri dada', 'dada sesak', 'jantung berdebar',
    'demam tinggi', 'panas tinggi', 'menggigil meriang', 'suhu tubuh',
    'asam urat', 'nyeri sendi', 'sendi jempol', 'gout akut', 'radang sendi',
    'kurang darah', 'anemia defisiensi', 'lemah letih lesu', 'lemas letih lesu', 'hb rendah',
    'aturan minum obat', 'paracetamol demam', 'antasida maag', 'efek samping'
];

// Specificity weightings
const HIGH_SPECIFICITY_TERMS = new Set([
    'migrain', 'vertigo', 'hipertensi', 'hipotensi', 'gerd', 'gastritis', 'anemia',
    'paracetamol', 'ibuprofen', 'antasida', 'gout', 'ispa', 'tonsilitis', 'influenza',
    'batuk', 'demam', 'lambung', 'jantung', 'tensi', 'kolesterol', 'diabetes',
    'amandel', 'bronkitis', 'asma', 'hemoglobin', 'diare', 'konstipasi', 'sembelit',
    'sendi', 'urat', 'myalgia', 'pucat', 'dispepsia', 'apendisitis', 'sinusitis',
    'lemas', 'letih', 'lesu', 'puyeng', 'meriang', 'menggigil', 'kembung', 'perih',
    'tuberculosis', 'tbc', 'tb', 'fungal', 'jamur', 'candida', 'coinfection', 'koinfeksi',
    'sputum', 'mdr', 'xdr', 'resistan', 'resistansi',
    'database', 'sql', 'programming', 'design', 'normalisasi', 'tabel', 'rendang', 'resep'
]);

const LOW_SPECIFICITY_TERMS = new Set([
    'gejala', 'mengatasi', 'panduan', 'obat', 'sakit', 'pertolongan', 'badan',
    'cara', 'langkah', 'tips', 'awal', 'tata', 'laksana', 'kondisi', 'merasa',
    'rasa', 'terasa', 'kapan', 'perlu', 'dokter', 'bantuan', 'rekomendasi', 'sering',
    'how', 'what', 'guide', 'steps'
]);

const CATEGORY_KEYWORDS_MAP = {
    1: ['flu', 'pilek', 'influenza', 'batuk', 'bersin', 'ispa', 'laringitis', 'faringitis', 'asma', 'bronkitis', 'paru', 'pulmonary', 'sesak napas', 'hidung tersumbat', 'tenggorokan', 'sputum'],
    2: ['demam', 'panas tinggi', 'menggigil', 'infeksi', 'fungal', 'jamur', 'candida', 'coinfection', 'koinfeksi', 'tipes', 'tifoid', 'dbd', 'dengue', 'malaria', 'suhu', 'meriang', 'asam urat', 'gout', 'sendi', 'tuberculosis', 'tbc', 'resistan'],
    3: ['sakit kepala', 'migrain', 'pusing', 'vertigo', 'tension headache', 'kepala berdenyut', 'neurologi', 'saraf', 'kebas', 'kesemutan', 'otak'],
    4: ['anemia', 'hemoglobin', 'hb', 'kurang darah', 'tekanan darah', 'hipertensi', 'hipotensi', 'tensi', 'jantung', 'kolesterol', 'angina', 'kardiovaskular', 'pembuluh darah', 'pucat', 'lemas letih lesu'],
    5: ['lambung', 'gerd', 'gastritis', 'maag', 'asam lambung', 'dispepsia', 'diare', 'konstipasi', 'sembelit', 'usus', 'mual', 'muntah', 'perut kembung', 'pencernaan', 'ulu hati', 'perih'],
    6: ['anak', 'balita', 'bayi', 'pediatri', 'imunisasi', 'campak', 'stunting', 'tumbuh kembang', 'kejang demam', 'demam anak', 'nutrisi anak']
};

// Bilingual & Medical Concept Synonyms
const BILINGUAL_SYNONYMS = {
    'tuberkulosis': ['tuberculosis', 'tbc', 'tb'],
    'tuberculosis': ['tuberkulosis', 'tbc', 'tb'],
    'tbc': ['tuberculosis', 'tuberkulosis', 'tb'],
    'tb': ['tuberculosis', 'tuberkulosis', 'tbc'],
    'koinfeksi': ['coinfection', 'coinfections'],
    'coinfection': ['koinfeksi', 'coinfections'],
    'coinfections': ['koinfeksi', 'coinfection'],
    'jamur': ['fungal', 'fungi', 'candida', 'mycosis'],
    'fungal': ['jamur', 'fungi', 'candida'],
    'fungi': ['jamur', 'fungal', 'candida'],
    'candida': ['jamur', 'fungal', 'fungi'],
    'paru': ['pulmonary', 'lung', 'lungs'],
    'pulmonary': ['paru', 'lung', 'lungs'],
    'resistan': ['resistant', 'resistance', 'resistansi', 'mdr', 'xdr'],
    'resistansi': ['resistant', 'resistance', 'resistan', 'mdr', 'xdr'],
    'resistance': ['resistan', 'resistansi', 'resistant', 'mdr', 'xdr'],
    'resistant': ['resistan', 'resistansi', 'resistance', 'mdr', 'xdr'],
    'hipertensi': ['hypertension', 'tensi', 'tekanan darah'],
    'database': ['basis data', 'sql', 'tabel', 'table'],
    'normalisasi': ['normalization', '1nf', '2nf', '3nf']
};

class KnowledgeRetriever {
    /**
     * Searches the active knowledge base for the most relevant answer
     * @param {string} userQuestion - The user's query
     * @param {number} minThreshold - Minimum confidence score (default 0.58)
     * @returns {object} { found: boolean, score: number, knowledge: object | null, source: object | null, category: object | null }
     */
    static async search(userQuestion, minThreshold = 0.58) {
        if (!userQuestion || typeof userQuestion !== 'string' || userQuestion.trim().length === 0) {
            return { found: false, score: 0, knowledge: null, lang: 'id' };
        }

        const lang = LanguageService.detectLanguage(userQuestion);
        const bridgedQuestion = LanguageService.bridgeQueryToMedical(userQuestion, lang);

        // 1. Fetch only ACTIVE knowledge items
        const activeKnowledge = db.find('knowledge', item => item.status === 'ACTIVE');
        if (!activeKnowledge || activeKnowledge.length === 0) {
            return { found: false, score: 0, knowledge: null, lang };
        }

        const cleanQuestion = bridgedQuestion.toLowerCase().trim();
        const questionTokens = this.tokenize(cleanQuestion);
        const questionPhrases = this.extractPhrases(cleanQuestion);
        const detectedCategory = this.detectCategory(cleanQuestion);

        if (questionTokens.length === 0) {
            return { found: false, score: 0, knowledge: null, lang };
        }

        let bestMatch = null;
        let highestScore = 0;
        let highestCoverage = 0;

        for (const item of activeKnowledge) {
            const { score, coverage } = this.calculateRelevance(cleanQuestion, questionTokens, questionPhrases, detectedCategory, item);
            if (score > highestScore) {
                highestScore = score;
                highestCoverage = coverage;
                bestMatch = item;
            }
        }

        // Must meet confidence score AND key concept coverage
        const isConfident = bestMatch && highestScore >= minThreshold && (highestCoverage >= 0.30 || highestScore >= 0.65);

        if (isConfident) {
            const source = bestMatch.source_id ? db.findById('sources', bestMatch.source_id) : null;
            const category = bestMatch.category_id ? db.findById('categories', bestMatch.category_id) : null;

            return {
                found: true,
                score: Math.min(1.0, Number(highestScore.toFixed(2))),
                coverage: Number(highestCoverage.toFixed(2)),
                knowledge: bestMatch,
                source,
                category,
                lang
            };
        }

        return {
            found: false,
            score: Math.min(1.0, Number(highestScore.toFixed(2))),
            coverage: Number(highestCoverage.toFixed(2)),
            knowledge: null,
            candidateMatch: bestMatch,
            lang
        };
    }

    /**
     * Tokenizes and cleans a text string, removing stopwords (Indonesian & English)
     */
    static tokenize(text) {
        if (!text) return [];
        return text
            .toLowerCase()
            .replace(/[^\w\s]/gi, ' ')
            .split(/\s+/)
            .map(token => this.normalizeToken(token))
            .filter(token => token.length >= 2 && !this.isStopword(token));
    }

    /**
     * Normalizes morphological word forms without corrupting roots
     */
    static normalizeToken(token) {
        if (!token || token.length < 4) return token;
        
        let word = token;
        // Strip trailing suffixes: -nya, -lah, -kah, -pun
        word = word.replace(/(?:nya|lah|kah|pun)$/, '');
        
        // Strip prefixes if word is sufficiently long (>= 6 chars)
        if (word.length >= 6) {
            word = word.replace(/^(?:meng|meny|men|mem|me|ber|ter|di)/, '');
        }

        return word;
    }

    /**
     * Common Indonesian & English stopwords that carry minimal topical value
     */
    static isStopword(word) {
        const stopwords = new Set([
            // Indonesian stopwords
            'yang', 'untuk', 'pada', 'ke', 'dari', 'di', 'dan', 'atau', 'ini', 'itu',
            'dengan', 'adalah', 'yaitu', 'yakni', 'saya', 'kamu', 'dia', 'mereka',
            'kita', 'kami', 'apa', 'siapa', 'kapan', 'dimana', 'bagaimana', 'mengapa',
            'kenapa', 'bisa', 'dapat', 'akan', 'sudah', 'telah', 'sedang', 'ingin',
            'mohon', 'tolong', 'tanya', 'mau', 'dong', 'kah', 'lah', 'pun', 'apakah',
            'ada', 'saja', 'jika', 'bila', 'apabila', 'secara', 'harus', 'agar', 'supaya',
            'seperti', 'oleh', 'karena', 'tentang', 'mengenai', 'bagi', 'saat', 'ketika',
            'setelah', 'sebelum', 'lebih', 'kurang', 'sangat', 'terlalu', 'menurut',
            'pasien', 'risiko', 'kasus', 'studi', 'penelitian', 'terkait', 'berapa',
            'mengalami', 'keluhan', 'merasakan', 'terasa', 'respon',
            // English common stopwords
            'how', 'to', 'what', 'where', 'when', 'who', 'why', 'is', 'are', 'the',
            'a', 'an', 'in', 'on', 'of', 'for', 'with', 'do', 'does', 'did', 'can',
            'could', 'should', 'would', 'please', 'help', 'tell', 'me', 'about',
            'and', 'or', 'it', 'its', 'from', 'by', 'as', 'at', 'be'
        ]);
        return stopwords.has(word);
    }

    /**
     * Helper to test token match including bilingual synonyms
     */
    static matchesToken(targetList, queryToken) {
        if (!targetList || targetList.length === 0) return false;
        const syns = BILINGUAL_SYNONYMS[queryToken] || [];
        return targetList.some(t => {
            if (t === queryToken) return true;
            if (queryToken.length >= 4 && (t.startsWith(queryToken) || queryToken.startsWith(t))) return true;
            for (const s of syns) {
                if (t === s || (s.length >= 4 && (t.startsWith(s) || s.startsWith(t)))) return true;
            }
            return false;
        });
    }

    /**
     * Extracts multi-word clinical phrases from text
     */
    static extractPhrases(text) {
        const matched = [];
        for (const phrase of MEDICAL_PHRASES) {
            if (text.includes(phrase)) {
                matched.push(phrase);
            }
        }
        return matched;
    }

    /**
     * Detects probable medical category from text
     */
    static detectCategory(cleanText) {
        let bestCatId = null;
        let bestScore = 0;

        for (const [catIdStr, kws] of Object.entries(CATEGORY_KEYWORDS_MAP)) {
            const catId = Number(catIdStr);
            let score = 0;
            for (const kw of kws) {
                if (cleanText.includes(kw)) {
                    score += kw.includes(' ') ? 3 : 1;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestCatId = catId;
            }
        }

        return bestScore >= 1 ? bestCatId : null;
    }

    /**
     * Calculates precision relevance between query and knowledge item
     */
    static calculateRelevance(questionText, questionTokens, questionPhrases, detectedCategory, knowledgeItem) {
        if (questionTokens.length === 0) return { score: 0, coverage: 0 };

        const titleText = (knowledgeItem.title || '').toLowerCase();
        const keywordsText = (knowledgeItem.topic_keywords || '').toLowerCase();
        const shortAnswerText = (knowledgeItem.short_answer || '').toLowerCase();
        const contentText = (knowledgeItem.content_full || '').toLowerCase();

        const titleTokens = this.tokenize(titleText);
        const keywordTokens = this.tokenize(keywordsText);
        const answerTokens = this.tokenize(shortAnswerText);
        const contentTokens = this.tokenize(contentText);

        let totalQueryWeight = 0;
        let matchedScoreTotal = 0;
        let matchedCount = 0;

        for (const token of questionTokens) {
            let tokenWeight = 1.0;
            if (HIGH_SPECIFICITY_TERMS.has(token)) {
                tokenWeight = 2.0;
            } else if (LOW_SPECIFICITY_TERMS.has(token)) {
                tokenWeight = 0.4;
            }
            totalQueryWeight += tokenWeight;

            // Check match across Title, Keywords, Answer, and Content (using synonyms)
            let bestTokenMatch = 0;

            if (this.matchesToken(titleTokens, token)) bestTokenMatch = Math.max(bestTokenMatch, 1.0);
            if (this.matchesToken(keywordTokens, token)) bestTokenMatch = Math.max(bestTokenMatch, 0.95);
            if (this.matchesToken(answerTokens, token)) bestTokenMatch = Math.max(bestTokenMatch, 0.70);
            if (this.matchesToken(contentTokens, token)) bestTokenMatch = Math.max(bestTokenMatch, 0.50);

            if (bestTokenMatch > 0) {
                matchedCount++;
                matchedScoreTotal += (tokenWeight * bestTokenMatch);
            }
        }

        const coverage = totalQueryWeight > 0 ? (matchedScoreTotal / totalQueryWeight) : 0;

        // 1. Phrase Match Bonus (Significant boost for exact clinical phrases)
        let phraseBonus = 0;
        for (const phrase of questionPhrases) {
            if (titleText.includes(phrase)) {
                phraseBonus += 0.35;
            } else if (keywordsText.includes(phrase)) {
                phraseBonus += 0.25;
            } else if (shortAnswerText.includes(phrase)) {
                phraseBonus += 0.15;
            }
        }
        phraseBonus = Math.min(0.40, phraseBonus);

        // 2. Category Affinity Bonus / Penalty
        let categoryModifier = 0;
        if (detectedCategory && knowledgeItem.category_id) {
            if (knowledgeItem.category_id === detectedCategory) {
                categoryModifier = 0.15; // Category alignment bonus
            } else if (knowledgeItem.category_id !== 7 && detectedCategory !== 7) {
                // Category mismatch penalty
                categoryModifier = -0.20;
            }
        }

        // 3. Title Match Bonus (Additive for specific topical keywords in title)
        let titleBonus = 0;
        const specificTitleMatches = questionTokens.filter(q => this.matchesToken(titleTokens, q) && !LOW_SPECIFICITY_TERMS.has(q) && q.length > 3);
        if (specificTitleMatches.length >= 1) {
            titleBonus = Math.min(0.25, specificTitleMatches.length * 0.12);
        }

        // 4. Aggregate Final Score
        let finalScore = (coverage * 0.70) + phraseBonus + categoryModifier + titleBonus;

        return {
            score: Math.max(0, Math.min(1.0, finalScore)),
            coverage: matchedCount / questionTokens.length
        };
    }
}

module.exports = KnowledgeRetriever;
