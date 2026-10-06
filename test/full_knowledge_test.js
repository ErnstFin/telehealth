/**
 * Comprehensive Test Suite for Medical Papers, Non-Medical Ingestion, and Model Knowledge Base Retrieval
 */

process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../src/server');
const db = require('../src/db');
const DocumentParserService = require('../src/services/documentParser');

const PORT = 3996;
let server;

function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: '127.0.0.1',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
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

async function runFullKnowledgeTests() {
    console.log('========================================================================');
    console.log('📚 TESTING UNIVERSAL KNOWLEDGE INGESTION & KNOWLEDGE BASE RETRIEVAL');
    console.log('========================================================================\n');

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
        // --- SCENARIO 1: Parsing and Ingesting the User's PDF Paper (Tuberculosis & Fungal Coinfection) ---
        console.log('\n--- SCENARIO 1: Ingesting Tuberculosis & Fungal Coinfection Research Paper ---');
        const tbPaperText = `
Kiranasari, et al. | Tuberculosis and fungal coinfection 163
Medical Journal of Indonesia
Pulmonary tuberculosis and fungal coinfection during 2018–2022: a single center 
study in Jakarta, Indonesia
Ariyani Kiranasari, Yeva Rosana, Conny Riana Tjampakasari, Ika Ningsih
Basic Medical Research
ABSTRACT
BACKGROUND Pulmonary tuberculosis (TB) is among the top 10 causes of death 
worldwide. Prolonged use and noncompliance with TB treatment have a potential risk 
for pulmonary fungal coinfection. This study aimed to evaluate fungal coinfection in 
pulmonary TB patients in Indonesia referred to the Clinical Microbiology Laboratory, 
Faculty of Medicine, Universitas Indonesia, Jakarta, during 2018–2022.
METHODS A cross-sectional study was conducted to compare 5 years of data collected 
at the Clinical Microbiology Laboratory, Faculty of Medicine, Universitas Indonesia. 
A total of 7,440 sputum specimens from various clinical sites were examined from 
2018 to 2022. Sputum specimens from TB patients were prepared for microscopic 
examination using ZN staining to detect AFB. Culture and antimicrobial susceptibility 
of TB were performed on LJ agar. Fungal detected on microscopic examination and 
culture were assessed as coinfections.
RESULTS ZN staining to detect M. tuberculosis in clinical specimens has high specificity 
(98.4%) but low sensitivity (60.6%). Drug resistance in TB patients remains a problem, 
which can increase the risk of fungal infections. In 2018–2019, TB and fungal coinfections 
were more common in polyresistant TB cases. In 2020–2021, TB and fungal coinfections 
were found in all resistant TB cases, most commonly in XDR-TB cases. In 2022, TB and 
fungal coinfections were found in monoresistant and polyresistant patients. Candida
spp. was found in 6.2% of positive TB cases, and all were found in resistant TB.
CONCLUSIONS Increasing MDR- and XDR-TB are risk factors for fungal coinfection and 
must be detected early for better TB management in Indonesia.
KEYWORDS antimicrobial susceptibility, culture, fungal infections, sputum, tuberculosis
pISSN: 0853-1773 • eISSN: 2252-8083
https://doi.org/10.13181/mji.oa.268349
Med J Indones. 2026;35:163–9
Received: July 30, 2025
Accepted: May 12, 2026

Table 1. Criteria of TB resistance
Table 2. Microscopic versus culture of TB patients
Table 3. Proportion of TB patients
Table 4. Characteristics of TB and fungal coinfections
`;

        const parsedTb = DocumentParserService.parseMedicalDocument(tbPaperText, 'Kiranasari_TB_Fungal_Coinfection_2026.pdf');
        
        assert('TB Paper title extracted accurately', parsedTb.title.includes('Pulmonary tuberculosis and fungal coinfection'));
        assert('Publisher extracted as Medical Journal of Indonesia', parsedTb.publisher.includes('Medical Journal of Indonesia'));
        assert('Year extracted as 2026', parsedTb.year === 2026);
        assert('Keywords extracted containing tuberculosis & fungal', parsedTb.topic_keywords.includes('tuberculosis') || parsedTb.topic_keywords.includes('fungal'));
        assert('Important findings extracted without errors', Array.isArray(parsedTb.important_points) && parsedTb.important_points.length >= 3);

        // Direct import into Knowledge Base
        const tbImportRes = await makeRequest('POST', '/api/knowledge/import-document', {
            title: parsedTb.title,
            category_id: parsedTb.category_id,
            source_name: parsedTb.source_name,
            publisher: parsedTb.publisher,
            year: parsedTb.year,
            topic_keywords: parsedTb.topic_keywords,
            target_question: parsedTb.target_question,
            short_answer: parsedTb.short_answer,
            important_points: parsedTb.important_points,
            when_to_see_doctor: parsedTb.when_to_see_doctor,
            content_full: parsedTb.content_full,
            original_filename: 'Kiranasari_TB_Fungal_Coinfection_2026.pdf',
            validated_by: 'dr. Yeva Rosana, Sp.MK',
            target_status: 'ACTIVE'
        });

        assert('TB Paper imported successfully (HTTP 201)', tbImportRes.status === 201);
        assert('TB Paper is ACTIVE in Knowledge Base', tbImportRes.data.data.status === 'ACTIVE');

        // Chatbot query matching TB paper
        console.log('\n--- SCENARIO 2: Chatbot Answers Questions from TB Paper ---');
        const tbChatRes = await makeRequest('POST', '/api/chat/ask', {
            text: 'Bagaimana risiko koinfeksi jamur pada pasien tuberkulosis paru TB resistan obat?',
            telegramChatId: 'tg-tb-researcher'
        });

        assert('Chatbot responds with ANSWERED_BY_KB', tbChatRes.data.data.status === 'ANSWERED_BY_KB');
        assert('Response matched TB & Fungal paper', tbChatRes.data.data.matchedKnowledge.title.includes('Pulmonary tuberculosis and fungal coinfection'));
        assert('Response references Medical Journal of Indonesia', tbChatRes.data.data.responseMessage.includes('Medical Journal of Indonesia'));

        // --- SCENARIO 3: Non-Medical Document Ingestion (Database SQL & Normalization) ---
        console.log('\n--- SCENARIO 3: Ingesting Non-Medical Content (Database / IT Guide) ---');
        const dbDocText = `
Judul: Panduan Arsitektur Database Relasional dan Normalisasi Tabel SQL
Penerbit: Divisi Rekayasa Perangkat Lunak
Tahun: 2024
Kata Kunci: database, sql, tabel, normalisasi, primary key, foreign key, query

Ringkasan:
Normalisasi basis data adalah teknik perancangan struktur tabel relasional guna mengeliminasi anomali penyisipan, pembaruan, dan redundansi data melalui tahapan 1NF, 2NF, dan 3NF.

Hal Penting:
• Tentukan primary key unik pada setiap entitas tabel.
• Pisahkan data multi-nilai ke dalam relasi tersendiri (1NF).
• Hilangkan ketergantungan parsial pada primary key komposit (2NF).
• Hilangkan ketergantungan transitif antar kolom non-kunci (3NF).
• Buat indeks pada foreign key untuk mempercepat performa join query.

Kapan Perlu Penyesuaian:
Lakukan denormalisasi terkontrol hanya pada tabel analitik atau reporting dengan beban pembacaan tinggi.
`;

        const parsedDbDoc = DocumentParserService.parseMedicalDocument(dbDocText, 'Panduan_Database_SQL.pdf');
        assert('Non-medical doc parsed without rejection', parsedDbDoc.title.includes('Panduan Arsitektur Database'));

        const dbImportRes = await makeRequest('POST', '/api/knowledge/import-document', {
            title: parsedDbDoc.title,
            category_id: parsedDbDoc.category_id,
            source_name: parsedDbDoc.source_name,
            publisher: parsedDbDoc.publisher,
            year: parsedDbDoc.year,
            topic_keywords: parsedDbDoc.topic_keywords,
            target_question: parsedDbDoc.target_question,
            short_answer: parsedDbDoc.short_answer,
            important_points: parsedDbDoc.important_points,
            when_to_see_doctor: parsedDbDoc.when_to_see_doctor,
            content_full: parsedDbDoc.content_full,
            original_filename: 'Panduan_Database_SQL.pdf',
            validated_by: 'Lead Database Engineer',
            target_status: 'ACTIVE'
        });

        assert('Non-medical doc imported into Knowledge Base (HTTP 201)', dbImportRes.status === 201);
        assert('Non-medical KB item is ACTIVE', dbImportRes.data.data.status === 'ACTIVE');

        // Chatbot query matching Non-Medical Knowledge Base entry
        console.log('\n--- SCENARIO 4: Chatbot Answers Non-Medical Query from Ingested KB ---');
        const dbChatRes = await makeRequest('POST', '/api/chat/ask', {
            text: 'Bagaimana prinsip normalisasi tabel database relasional?',
            telegramChatId: 'tg-dev-user'
        });

        assert('Chatbot answers non-medical query from KB (ANSWERED_BY_KB)', dbChatRes.data.data.status === 'ANSWERED_BY_KB');
        assert('Matched Knowledge is Database Architecture', dbChatRes.data.data.matchedKnowledge.title.includes('Database'));
        assert('Response contains normalisasi details', dbChatRes.data.data.responseMessage.includes('1NF') || dbChatRes.data.data.responseMessage.includes('redundansi'));

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
        console.log('\n========================================================================');
        console.log(`📊 FULL KNOWLEDGE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('========================================================================');
        process.exit(failed > 0 ? 1 : 0);
    }
}

runFullKnowledgeTests();
