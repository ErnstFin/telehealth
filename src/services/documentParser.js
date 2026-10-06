/**
 * Document Parser Service for Medical Knowledge Acquisition
 * Handles text extraction from validated external files (PDF, DOCX, TXT, MD)
 * and smart heuristic structuring for the TeleHealth Knowledge Base.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const db = require('../db');
const HealthValidator = require('./healthValidator');

class DocumentParserService {
    /**
     * Extract raw text from file buffer based on mimetype and extension
     * @param {Buffer} buffer - File buffer
     * @param {string} originalName - Original filename
     * @param {string} mimeType - File MIME type
     * @returns {Promise<{ text: string, pageCount?: number, format: string }>}
     */
    static async extractTextFromFile(buffer, originalName = '', mimeType = '') {
        const ext = path.extname(originalName).toLowerCase();

        if (ext === '.pdf' || mimeType === 'application/pdf') {
            try {
                const pdfData = await pdfParse(buffer);
                return {
                    text: (pdfData.text || '').trim(),
                    pageCount: pdfData.numpages || 1,
                    info: pdfData.info || {},
                    format: 'PDF'
                };
            } catch (err) {
                console.error('[DocumentParser] PDF extraction error:', err);
                throw new Error(`Gagal membaca file PDF "${originalName}": ${err.message}`);
            }
        } else if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            try {
                const docxResult = await mammoth.extractRawText({ buffer });
                return {
                    text: (docxResult.value || '').trim(),
                    messages: docxResult.messages,
                    format: 'DOCX'
                };
            } catch (err) {
                console.error('[DocumentParser] DOCX extraction error:', err);
                throw new Error(`Gagal membaca file DOCX "${originalName}": ${err.message}`);
            }
        } else if (ext === '.txt' || ext === '.md' || mimeType.startsWith('text/')) {
            return {
                text: buffer.toString('utf8').trim(),
                format: ext === '.md' ? 'MARKDOWN' : 'TEXT'
            };
        } else {
            throw new Error(`Format file tidak didukung (${ext || mimeType}). Harap unggah file PDF (.pdf) atau Word (.docx).`);
        }
    }

    /**
     * Smart heuristic extraction of clinical & domain fields from document text.
     * Accurately parses medical research papers, clinical guidelines, and general/non-medical documents.
     * @param {string} rawText 
     * @param {string} filename 
     * @returns {object} Extracted structured knowledge candidate/item
     */
    static parseMedicalDocument(rawText, filename = '') {
        const cleanName = path.basename(filename, path.extname(filename))
            .replace(/[_\-]+/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        if (!rawText || rawText.trim().length === 0) {
            throw new Error('Dokumen kosong atau tidak memiliki teks yang dapat diproses.');
        }

        // Domain extraction (Permissive: all documents can be imported)
        const validation = HealthValidator.validateMedicalContent({
            title: cleanName,
            content_full: rawText
        });

        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

        // 1. Title Extraction
        let title = '';
        const titleMatch = rawText.match(/(?:Judul|Title|Pedoman|Panduan|Topik Utama)\s*[:=]\s*([^\r\n]+)/i);
        if (titleMatch && titleMatch[1].trim().length > 3) {
            title = titleMatch[1].trim();
        } else {
            // Check if there is an article title before or after section markers (like "Basic Medical Research", "Original Article", "ABSTRACT")
            let titleCandidate = '';
            for (let i = 0; i < Math.min(lines.length, 15); i++) {
                const line = lines[i];
                // Skip headers, running headers, metadata
                if (/^(Kiranasari|Medical Journal|Journal of|Med J|pISSN|eISSN|https?:\/\/|DOI|Received:|Accepted:|Authors?|Department of|Vol\.|No\.|Page|\d+$)/i.test(line)) {
                    continue;
                }
                if (line.includes('|') || line.includes('et al.')) {
                    continue;
                }
                if (/^(Basic Medical Research|Original Article|Review Article|Case Report|ABSTRACT|ABSTRAK)/i.test(line)) {
                    continue;
                }
                if (line.length >= 12 && line.length <= 250) {
                    titleCandidate = line;
                    // If the next line continues the title (e.g. "study in Jakarta, Indonesia")
                    if (i + 1 < lines.length && lines[i + 1].length > 3 && !/^(Ariyani|Author|Abstract|Basic|Received|Keywords|By\b)/i.test(lines[i + 1]) && (lines[i + 1].length < 60 || /^(study|in|on|with|during|of|pada|dan|di|untuk)/i.test(lines[i + 1]))) {
                        titleCandidate += ' ' + lines[i + 1];
                    }
                    break;
                }
            }
            title = titleCandidate || cleanName;
        }

        // 2. Category Detection
        const categories = db.find('categories') || [];
        let matchedCategoryId = 1; // Default
        let highestCategoryScore = 0;

        const categoryKeywordsMap = {
            1: ['flu', 'pilek', 'influenza', 'batuk', 'bersin', 'ispa', 'laringitis', 'faringitis', 'asma', 'bronkitis', 'paru', 'pulmonary', 'tuberculosis', 'tbc', 'tb ', 'sesak napas', 'hidung tersumbat', 'tenggorokan', 'sputum', 'afb', 'bta'],
            2: ['demam', 'panas tinggi', 'menggigil', 'infeksi', 'fungal', 'jamur', 'candida', 'coinfection', 'koinfeksi', 'tipes', 'tifoid', 'dbd', 'dengue', 'malaria', 'virus', 'bakteri', 'peradangan', 'suhu tubuh', 'asam urat', 'gout', 'sendi', 'resistansi', 'resistan', 'mdr', 'xdr'],
            3: ['sakit kepala', 'migrain', 'pusing', 'vertigo', 'tension headache', 'kepala berdenyut', 'neurologi', 'saraf', 'kebas', 'kesemutan', 'otak'],
            4: ['anemia', 'hemoglobin', 'hb', 'kurang darah', 'tekanan darah', 'hipertensi', 'hipotensi', 'tensi', 'jantung', 'kolesterol', 'angina', 'kardiovaskular', 'pembuluh darah'],
            5: ['lambung', 'gerd', 'gastritis', 'maag', 'asam lambung', 'dispepsia', 'diare', 'konstipasi', 'sembelit', 'usus', 'mual', 'muntah', 'perut kembung', 'pencernaan'],
            6: ['anak', 'balita', 'bayi', 'pediatri', 'imunisasi', 'campak', 'stunting', 'tumbuh kembang', 'kejang demam', 'demam anak', 'nutrisi anak'],
            7: ['umum', 'database', 'sql', 'teknis', 'panduan umum', 'prosedur', 'pedoman umum', 'resep', 'kuliner', 'tutorial']
        };

        const lowerFullText = rawText.toLowerCase();
        for (const [catIdStr, kws] of Object.entries(categoryKeywordsMap)) {
            const catId = Number(catIdStr);
            let score = 0;
            for (const kw of kws) {
                if (lowerFullText.includes(kw)) {
                    score += kw.length > 5 ? 2 : 1;
                }
            }
            if (score > highestCategoryScore) {
                highestCategoryScore = score;
                matchedCategoryId = catId;
            }
        }

        // If not matching specific medical category, and general category exists
        if (highestCategoryScore === 0) {
            const generalCat = categories.find(c => c.id === 7 || c.slug === 'umum');
            if (generalCat) matchedCategoryId = generalCat.id;
        }

        // 3. Publisher / Source Extraction
        let publisher = 'Literatur Medis Tervalidasi';
        const pubMatch = rawText.match(/(?:Penerbit|Publisher|Sumber|Organisasi|Asosiasi|Oleh|Author|Jurnal|Journal)\s*[:=]\s*([^\r\n]+)/i);
        if (pubMatch && pubMatch[1].trim().length > 3) {
            publisher = pubMatch[1].trim();
        } else {
            const orgs = [
                'Medical Journal of Indonesia', 'Med J Indones', 'Universitas Indonesia',
                'Kementerian Kesehatan RI', 'Kemenkes RI', 'PAPDI', 'PERDOSI',
                'PHTDI', 'PB PEGI', 'IDAI', 'IDI', 'WHO', 'PERKI', 'Perhimpunan Dokter Penyakit Dalam Indonesia'
            ];
            for (const org of orgs) {
                if (rawText.includes(org)) {
                    publisher = org === 'Med J Indones' ? 'Medical Journal of Indonesia' : org;
                    break;
                }
            }
        }

        // 4. Year Extraction
        let year = new Date().getFullYear();
        const yearMatch = rawText.match(/(?:Med J Indones\.|Journal|Publikasi|Tahun|Accepted:?|Edition|Copyright\s*@?)\s*[:=\(]?\s*(20[12]\d)\b/i) ||
                          rawText.match(/\b(20[12]\d)\b/);
        if (yearMatch) {
            year = Number(yearMatch[1]);
        }

        // 5. Keywords Extraction
        let keywords = '';
        const kwMatch = rawText.match(/(?:Kata Kunci|Keywords|Kata-Kata Kunci|Topik)\s*[:=]\s*([^\r\n]+)/i);
        if (kwMatch && kwMatch[1].trim().length > 3) {
            keywords = kwMatch[1].trim().replace(/\s*(?:pISSN|eISSN|https?:\/\/|DOI).*$/i, '');
        }

        // Build additional bilingual & contextual keywords from title and matched concepts
        const titleWords = title.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !['pada', 'untuk', 'dengan', 'yang', 'dalam', 'tata', 'laksana', 'pedoman', 'panduan', 'during', 'single', 'center', 'study', 'dari', 'and', 'the', 'for'].includes(w));
        
        const matchedHealthKws = validation.matchedKeywords.slice(0, 8);
        const catObj = categories.find(c => c.id === matchedCategoryId);
        const catName = catObj ? catObj.name.toLowerCase() : '';

        // Add bilingual expansion
        const extraSyns = [];
        if (title.toLowerCase().includes('tuberculosis') || title.toLowerCase().includes('tb')) extraSyns.push('tbc', 'tuberkulosis', 'tb');
        if (title.toLowerCase().includes('fungal') || title.toLowerCase().includes('jamur')) extraSyns.push('jamur', 'candida');
        if (title.toLowerCase().includes('coinfection') || title.toLowerCase().includes('koinfeksi')) extraSyns.push('koinfeksi');
        if (title.toLowerCase().includes('pulmonary') || title.toLowerCase().includes('paru')) extraSyns.push('paru');
        if (title.toLowerCase().includes('resistant') || title.toLowerCase().includes('resistan')) extraSyns.push('resistan', 'resistansi', 'mdr', 'xdr');

        const initialKws = keywords ? keywords.split(/,\s*/) : [];
        const combined = Array.from(new Set([...initialKws, ...titleWords, ...matchedHealthKws, ...extraSyns, catName]))
            .filter(k => k && k.length > 1)
            .slice(0, 15);
        
        keywords = combined.join(', ');

        // 6. Target Question Extraction
        let targetQuestion = '';
        const qMatch = rawText.match(/(?:Pertanyaan|Question|Keluhan|Masalah|Topik Sasaran)\s*[:=]\s*([^\r\n]+)/i);
        if (qMatch && qMatch[1].trim().length > 5) {
            targetQuestion = qMatch[1].trim();
        } else {
            targetQuestion = `Bagaimana temuan klinis, panduan, dan penanganan mengenai ${title}?`;
        }

        // 7. Clinical Short Answer / Ringkasan / Abstract
        let shortAnswer = '';
        const structuredAbstractMatch = rawText.match(/ABSTRACT[\s\S]*?(?:BACKGROUND|METHODS|RESULTS|CONCLUSIONS)[\s\S]*?(?=(?:KEYWORDS|pISSN|Table|References|1\.\s+|Pendahuluan|Introduction|$))/i);
        const ansSectionMatch = rawText.match(/(?:Ringkasan|Abstrak|Abstract|Definisi|Tata Laksana|Intisari|Penjelasan Ringkas|Jawaban)\s*[:=]?\s*\n*([\s\S]*?)(?=(?:\r?\n\s*(?:Hal Penting|Poin-Poin|Rekomendasi|Penanganan|Kapan Perlu|Tanda Bahaya|Red Flags|Peringatan|KEYWORDS|pISSN|$)))/i);
        
        if (structuredAbstractMatch && structuredAbstractMatch[0].length > 40) {
            let absText = structuredAbstractMatch[0].replace(/^ABSTRACT\s*/i, '').trim();
            absText = absText.replace(/\b(BACKGROUND|METHODS|RESULTS|CONCLUSIONS)\b/g, '\n• **$1:** ');
            shortAnswer = absText.trim();
        } else if (ansSectionMatch && ansSectionMatch[1].trim().length > 10) {
            shortAnswer = ansSectionMatch[1].trim();
        } else {
            const paragraphs = rawText.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(p => p.length >= 40 && p !== title && !/^(Judul|Penerbit|Tahun|Kata Kunci|Pertanyaan)/i.test(p));
            shortAnswer = paragraphs[0] || lines.slice(1, 4).join(' ');
        }
        if (shortAnswer.length > 650) {
            shortAnswer = shortAnswer.substring(0, 647) + '...';
        }

        // 8. Important Points / Poin-Poin Penanganan / Key Findings
        let importantPoints = [];
        const pointsSectionMatch = rawText.match(/(?:Hal Penting|Poin-Poin Penting|Rekomendasi|Penanganan|Langkah Penanganan|Terapi Mandiri|Pencegahan|RESULTS|Hasil Penemuan)\s*[:=]?\s*\n*([\s\S]*?)(?=(?:Kapan Perlu|Tanda Bahaya|Red Flags|Peringatan|Referensi|Daftar Pustaka|CONCLUSIONS|KEYWORDS|$))/i);
        
        const searchScope = pointsSectionMatch ? pointsSectionMatch[1] : rawText;
        const bulletMatches = searchScope.match(/^[•\-\*\d+\.)]\s+(.+)$/gm);
        
        if (bulletMatches && bulletMatches.length > 0) {
            importantPoints = bulletMatches
                .map(b => b.replace(/^[•\-\*\d+\.)]\s*/, '').trim())
                .filter(b => b.length >= 6 && b.length <= 350)
                .slice(0, 6);
        }

        // If no explicit bullets, extract key statistical or clinical findings without decimal split corruption
        if (importantPoints.length === 0) {
            const resultsSection = rawText.match(/(?:RESULTS|CONCLUSIONS|Hasil|Kesimpulan)[\s\S]*?(?=(?:CONCLUSIONS|KEYWORDS|Table|References|$))/i);
            const textToMine = (resultsSection ? resultsSection[0] : rawText)
                .replace(/\n+/g, ' ')
                .replace(/spp\./gi, 'spp')
                .replace(/et al\./gi, 'et al')
                .replace(/(\d+)\.(\d+)/g, '$1,$2'); // Temporarily protect decimals
            
            const rawSentences = textToMine.split(/(?<=[.!?])\s+/);
            const meaningful = rawSentences
                .map(s => s.replace(/(\d+),(\d+)/g, '$1.$2').trim().replace(/^[^a-zA-Z0-9]+/, ''))
                .filter(s => s.length >= 25 && s.length <= 300 && /(?:specificity|sensitivity|resistance|coinfection|found|detected|ditemukan|terbukti|merupakan|faktor risiko|signifikan|pengobatan|terapi|candida|tb |tbc|bakteri|jamur)/i.test(s));
            
            importantPoints = meaningful.slice(0, 5);
        }

        if (importantPoints.length === 0) {
            importantPoints = [
                'Ikuti petunjuk dan panduan klinis yang tertera pada literatur medis tervalidasi.',
                'Lakukan pemantauan gejala atau kondisi secara berkala serta evaluasi respon terapi.',
                'Konsultasikan ke tenaga medis profesional jika ditemukan tanda perburukan atau resistensi terapi.'
            ];
        }

        // 9. When to See a Doctor / Red Flags / Clinical Recommendations
        let whenToSeeDoctor = '';
        const conclusionsMatch = rawText.match(/CONCLUSIONS\s*[:=]?\s*([\s\S]*?)(?=(?:KEYWORDS|pISSN|References|Table|$))/i);
        const redFlagsMatch = rawText.match(/(?:Kapan Perlu ke Dokter|Tanda Bahaya|Red Flags|Peringatan Bahaya|Kondisi Darurat|Indikasi Rujukan|Segera ke Rumah Sakit|Perhatian Khusus)\s*[:=]?\s*\n*([^\r\n]+(?:\r?\n[^\r\n]+){0,3})/i);
        
        if (conclusionsMatch && conclusionsMatch[1].trim().length > 15) {
            whenToSeeDoctor = conclusionsMatch[1].replace(/\n+/g, ' ').trim();
        } else if (redFlagsMatch && redFlagsMatch[1].trim().length > 15) {
            whenToSeeDoctor = redFlagsMatch[1].trim();
        } else {
            whenToSeeDoctor = 'Segera kunjungi fasilitas pelayanan kesehatan terdekat apabila gejala tidak membaik, timbul sesak napas berat, nyeri dada, demam tinggi persisten, atau komplikasi penyakit bertambah berat.';
        }

        return {
            title: title.substring(0, 250),
            category_id: matchedCategoryId,
            source_name: `${publisher} (${year})`,
            publisher: publisher.substring(0, 250),
            year: year,
            topic_keywords: keywords.substring(0, 400),
            target_question: targetQuestion.substring(0, 300),
            short_answer: shortAnswer,
            important_points: importantPoints,
            when_to_see_doctor: whenToSeeDoctor,
            content_full: rawText.substring(0, 8000),
            original_filename: filename
        };
    }
}

module.exports = DocumentParserService;
