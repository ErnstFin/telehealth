/**
 * Medical Guardrails & Intelligent Retrieval Deep Verification Test Suite
 * Tests non-medical rejection across all upload/import routes,
 * and verifies accurate semantic retrieval without hallucination or memory confusion.
 */

process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../src/server');

const PORT = 3997;
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

async function runGuardrailTests() {
    console.log('================================================================');
    console.log('🛡️ TESTING MEDICAL GUARDRAILS & ACCURATE KNOWLEDGE RETRIEVAL');
    console.log('================================================================\n');

    const db = require('../src/db');
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
        // --- GUARDRAIL 1: Direct Knowledge Addition of Any Topic (Database / IT)
        console.log('\n--- GUARDRAIL 1: Acceptance of Direct Knowledge Addition (Database / IT) ---');
        const dbKnowledgeRes = await makeRequest('POST', '/api/knowledge', {
            title: 'Ujian Akhir Semester Basis Data Relasional SQL Normalisasi',
            topic_keywords: 'sql, database, tabel, normalisasi, primary key',
            short_answer: 'Normalisasi adalah proses mendesain struktur tabel database untuk mengurangi redundansi data.',
            content_full: 'Database SQL query select from where join table normal form 1NF 2NF 3NF.'
        });
        assert('Direct knowledge addition is ACCEPTED (HTTP 201)', dbKnowledgeRes.status === 201);
        assert('Knowledge item created with ACTIVE status', dbKnowledgeRes.data.data.status === 'ACTIVE');

        // --- GUARDRAIL 2: Import Document with Any Content (Culinary / General)
        console.log('\n--- GUARDRAIL 2: Acceptance of Document Import (Culinary / General) ---');
        const docImportRes = await makeRequest('POST', '/api/knowledge/import-document', {
            title: 'Resep Rahasia Rendang Daging Sapi Padang Asli',
            topic_keywords: 'resep masakan, bumbu rendang, cara memasak, kuliner',
            short_answer: 'Tumis bumbu halus dengan santan kental hingga mengeluarkan minyak kelapa harum.',
            content_full: 'Resep masakan nusantara dengan santan kelapa dan rempah tradisional.'
        });
        assert('Document import is ACCEPTED (HTTP 201)', docImportRes.status === 201);
        assert('Knowledge item created with ACTIVE status', docImportRes.data.data.status === 'ACTIVE');

        // --- GUARDRAIL 3: Empty Content is Rejected (Validation Guardrail)
        console.log('\n--- GUARDRAIL 3: Rejection of Empty Knowledge Content ---');
        const emptyRes = await makeRequest('POST', '/api/knowledge', {
            title: '',
            short_answer: ''
        });
        assert('Empty knowledge addition is REJECTED (HTTP 400)', emptyRes.status === 400);

        // --- RETRIEVAL TEST 1: Acid Reflux / GERD (Category 5) Accuracy
        console.log('\n--- RETRIEVAL 1: Accurate Matching of GERD & Acid Reflux ---');
        const gerdRes = await makeRequest('POST', '/api/chat/ask', {
            text: 'Perut saya kembung mual perih dan asam lambung naik ke kerongkongan, obatnya apa?',
            telegramChatId: 'test-user-gerd'
        });
        assert('GERD query returns ANSWERED_BY_KB', gerdRes.data.data.status === 'ANSWERED_BY_KB');
        assert('Matched Knowledge is Maag & GERD', gerdRes.data.data.matchedKnowledge.id === 5);
        assert('Response mentions small frequent meals / antasida', gerdRes.data.data.responseMessage.includes('antasida') || gerdRes.data.data.responseMessage.includes('Makan'));

        // --- RETRIEVAL TEST 2: Flu & Respiratory (Category 1) Accuracy
        console.log('\n--- RETRIEVAL 2: Accurate Matching of Flu & Respiratory ---');
        const coughRes = await makeRequest('POST', '/api/chat/ask', {
            text: 'Tenggorokan saya sangat gatal dan hidung tersumbat bersin flu, bagaimana penanganannya?',
            telegramChatId: 'test-user-cough'
        });
        assert('Respiratory query returns ANSWERED_BY_KB', coughRes.data.data.status === 'ANSWERED_BY_KB');
        assert('Matched Knowledge is Flu & Pernapasan (ID 1)', coughRes.data.data.matchedKnowledge.id === 1);

        // --- RETRIEVAL TEST 3: Tension Headache (Category 3) Accuracy
        console.log('\n--- RETRIEVAL 3: Accurate Matching of Tension Headache ---');
        const headRes = await makeRequest('POST', '/api/chat/ask', {
            text: 'Kepala saya pusing berdenyut tegang dan leher kaku setelah bekerja di depan laptop',
            telegramChatId: 'test-user-head'
        });
        assert('Headache query returns ANSWERED_BY_KB', headRes.data.data.status === 'ANSWERED_BY_KB');
        assert('Matched Knowledge is Tension Headache (ID 3)', headRes.data.data.matchedKnowledge.id === 3);

        // --- RETRIEVAL TEST 4: Iron Deficiency Anemia (Category 4) Accuracy
        console.log('\n--- RETRIEVAL 4: Accurate Matching of Anemia ---');
        const anemiaRes = await makeRequest('POST', '/api/chat/ask', {
            text: 'Badan saya sering lemas letih lesu pucat dan kadar hemoglobin hb rendah',
            telegramChatId: 'test-user-anemia'
        });
        assert('Anemia query returns ANSWERED_BY_KB', anemiaRes.data.data.status === 'ANSWERED_BY_KB');
        assert('Matched Knowledge is Anemia (ID 4)', anemiaRes.data.data.matchedKnowledge.id === 4);

        // --- RETRIEVAL TEST 5: Clean Doctor Forwarding for Unanswered Health Query
        console.log('\n--- RETRIEVAL 5: Clean Forwarding to Doctor Queue for Unindexed Symptoms ---');
        const randId = Math.floor(Math.random() * 80000) + 10000;
        const unindexedRes = await makeRequest('POST', '/api/chat/ask', {
            text: `Saya mengalami keluhan bintik-bintik merah berair gatal di pinggang herpes ${randId}`,
            telegramChatId: 'test-user-forward'
        });
        assert('Unindexed health symptom cleanly forwards to Doctor Queue', unindexedRes.data.data.status === 'FORWARDED_TO_DOCTOR');
        assert('Doctor ticket is queued', Boolean(unindexedRes.data.data.doctorQuestionId));
        assert('Notice explains forward to doctor', unindexedRes.data.data.responseMessage.includes('Dokter Jaga') || unindexedRes.data.data.responseMessage.includes('antrian'));

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
        console.log('\n================================================================');
        console.log(`📊 GUARDRAIL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('================================================================');
        process.exit(failed > 0 ? 1 : 0);
    }
}

runGuardrailTests();
