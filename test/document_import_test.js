/**
 * Test Suite for External Document Parsing and Knowledge Acquisition (PDF, DOCX, TXT)
 */

process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const fs = require('fs');
const app = require('../src/server');
const db = require('../src/db');
const DocumentParserService = require('../src/services/documentParser');

const PORT = 3998;
let server;

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body && typeof body === 'object' && !(body instanceof Buffer) ? JSON.stringify(body) : body;
        const options = {
            hostname: '127.0.0.1',
            port: PORT,
            path: path,
            method: method,
            headers: {
                ...(typeof body === 'object' && !(body instanceof Buffer) ? { 'Content-Type': 'application/json' } : {}),
                ...headers,
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runDocTests() {
    console.log('===========================================================');
    console.log('📄 TESTING EXTERNAL DOCUMENT PARSING & KNOWLEDGE BASE IMPORT');
    console.log('===========================================================\n');

    // Clean only test-specific artifacts
    const initialKnowledge = db.find('knowledge');
    for (const k of initialKnowledge) {
        if (k.title && k.title.startsWith('[TEST]')) {
            db.delete('knowledge', k.id);
        }
    }

    server = app.listen(PORT);
    await new Promise(r => setTimeout(r, 600));

    let passed = 0;
    let failed = 0;

    function assert(name, condition, details = '') {
        if (condition) {
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${name} -> ${details}`);
            failed++;
        }
    }

    try {
        // TEST 1: Heuristic Parsing of Clinical Document Text
        console.log('\n--- TEST 1: Smart Heuristic Medical Parser ---');
        const sampleText = `
Judul: Tata Laksana Terkini Hipertensi Primer pada Layanan Kesehatan Primer
Penerbit: Perhimpunan Dokter Spesialis Kardiovaskular Indonesia (PERKI)
Tahun: 2024
Kata Kunci: hipertensi, tekanan darah tinggi, tensi, kardiovaskular, diet rendah garam
Pertanyaan: Bagaimana langkah penanganan awal hipertensi stadium 1?

Ringkasan:
Hipertensi stadium 1 (tekanan darah sistolik 130-139 mmHg atau diastolik 80-89 mmHg) pada tahap awal diprioritaskan untuk modifikasi gaya hidup sehat selama 3 hingga 6 bulan sebelum terapi medikamentosa.

Hal Penting:
• Batasi asupan natrium / garam maksimal 1 sendok teh (kurang dari 2 gram natrium) per hari.
• Lakukan aktivitas fisik aerobik intensitas sedang 150 menit per minggu (misal: jalan cepat, berenang).
• Terapkan pola makan DASH yang kaya sayuran, buah, dan biji-bijian serta rendah lemak jenuh.
• Hentikan kebiasaan merokok dan batasi konsumsi kafein berlebihan.

Kapan Perlu ke Dokter:
Segera ke fasilitas gawat darurat apabila tekanan darah mencapai > 180/120 mmHg (Krisis Hipertensi) atau disertai gejala nyeri dada hebat, sesak napas berat, sakit kepala luar biasa, dan pandangan kabur.
        `.trim();

        const parsed = DocumentParserService.parseMedicalDocument(sampleText, 'Pedoman_Hipertensi_2024.pdf');

        assert('Title correctly extracted', parsed.title.includes('Tata Laksana Terkini Hipertensi'));
        assert('Category matched to Darah & Kardiovaskular (ID 4)', parsed.category_id === 4);
        assert('Publisher extracted as PERKI', parsed.publisher.includes('PERKI'));
        assert('Year extracted as 2024', parsed.year === 2024);
        assert('Keywords extracted', parsed.topic_keywords.includes('hipertensi'));
        assert('Short answer extracted', parsed.short_answer.includes('modifikasi gaya hidup'));
        assert('Important points extracted as list', Array.isArray(parsed.important_points) && parsed.important_points.length >= 3);
        assert('Red flags warning extracted', parsed.when_to_see_doctor.includes('Krisis Hipertensi'));

        // TEST 2: Direct Import Validated Document into Knowledge Base (ACTIVE)
        console.log('\n--- TEST 2: Direct Import Validated Document into Knowledge Base ---');
        const importRes = await makeRequest('POST', '/api/knowledge/import-document', {
            title: parsed.title,
            category_id: parsed.category_id,
            source_name: parsed.source_name,
            publisher: parsed.publisher,
            year: parsed.year,
            topic_keywords: parsed.topic_keywords,
            target_question: parsed.target_question,
            short_answer: parsed.short_answer,
            important_points: parsed.important_points,
            when_to_see_doctor: parsed.when_to_see_doctor,
            content_full: parsed.content_full,
            original_filename: 'Pedoman_Hipertensi_2024.pdf',
            validated_by: 'dr. Budi Setiawan, Sp.JP',
            target_status: 'ACTIVE'
        });

        assert('Import API returns 201', importRes.status === 201);
        assert('Mode is KNOWLEDGE_BASE', importRes.data.mode === 'KNOWLEDGE_BASE');
        assert('Knowledge item created with ACTIVE status', importRes.data.data.status === 'ACTIVE');

        // TEST 3: Telegram Chatbot Answers Question from the Newly Imported Document
        console.log('\n--- TEST 3: Telegram Chatbot Answers from Imported Document ---');
        const chatRes = await makeRequest('POST', '/api/chat/ask', {
            text: 'Bagaimana penanganan tensi tinggi dan hipertensi?',
            telegramChatId: 'tg-user-999'
        });

        assert('Chatbot returns ANSWERED_BY_KB', chatRes.data.data.status === 'ANSWERED_BY_KB');
        assert('Matched Knowledge contains Hipertensi topic', chatRes.data.data.matchedKnowledge.title.includes('Hipertensi'));
        assert('Response contains PERKI source', chatRes.data.data.responseMessage.includes('PERKI'));

        // TEST 4: Import Document into Candidate Queue (PENDING)
        console.log('\n--- TEST 4: Import Document as Candidate for Review (PENDING) ---');
        const candImportRes = await makeRequest('POST', '/api/knowledge/import-document', {
            title: 'Pedoman Klinis Gastritis Akut dan Diet Lambung',
            category_id: 5,
            source_name: 'PB PEGI',
            publisher: 'Perhimpunan Gastroenterologi Indonesia',
            year: 2024,
            topic_keywords: 'gastritis, maag akut, radang lambung, diet lambung',
            short_answer: 'Gastritis akut membutuhkan penanganan antasida dan diet lunak.',
            important_points: ['Makan teratur', 'Hindari kopi dan asam'],
            when_to_see_doctor: 'Segera ke dokter jika muntah darah.',
            target_status: 'PENDING'
        });

        assert('Candidate import returns 201', candImportRes.status === 201);
        assert('Mode is CANDIDATE', candImportRes.data.mode === 'CANDIDATE');
        assert('Candidate created with PENDING status', candImportRes.data.data.status === 'PENDING');

    } catch (err) {
        console.error('Unexpected test error:', err);
        failed++;
    } finally {
        const allK = db.find('knowledge');
        for (const k of allK) {
            if (k.title && k.title.startsWith('[TEST]')) {
                db.delete('knowledge', k.id);
            }
        }
        server.close();
        console.log('\n===========================================================');
        console.log(`📊 DOCUMENT IMPORT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('===========================================================');
        process.exit(failed > 0 ? 1 : 0);
    }
}

runDocTests();
