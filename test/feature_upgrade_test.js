process.env.NODE_ENV = 'test';

const assert = require('assert');
const db = require('../src/db');
const LanguageService = require('../src/services/languageService');
const HealthValidator = require('../src/services/healthValidator');
const KnowledgeRetriever = require('../src/services/knowledgeRetriever');
const ResponseGenerator = require('../src/services/responseGenerator');
const telegramBot = require('../src/services/telegramBot');

async function runTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING TELEHEALTH FEATURE UPGRADE TEST SUITE');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${err.message}\n`);
            failed++;
        }
    }

    async function testAsync(name, fn) {
        try {
            await fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${err.message}\n`);
            failed++;
        }
    }

    // -------------------------------------------------------------
    // 1. CATEGORY CRUD TESTS
    // -------------------------------------------------------------
    console.log('📁 [1] CATEGORY CRUD TESTS');
    test('Create new category', () => {
        const cat = db.insert('categories', {
            name: 'Kesehatan Mental & Psikologi',
            slug: 'kesehatan-mental-psikologi',
            description: 'Depresi, ansietas, gangguan tidur, dan stres.',
            icon: 'brain'
        });
        assert.ok(cat.id > 0, 'Category ID should be created');
        assert.strictEqual(cat.name, 'Kesehatan Mental & Psikologi');
    });

    test('Update existing category', () => {
        const cat = db.find('categories', c => c.name === 'Kesehatan Mental & Psikologi')[0];
        assert.ok(cat, 'Created category should exist');
        const updated = db.update('categories', cat.id, {
            name: 'Kesehatan Jiwa & Psikologi Terpadu',
            icon: 'brain'
        });
        assert.strictEqual(updated.name, 'Kesehatan Jiwa & Psikologi Terpadu');
    });

    test('Delete category with safe fallback', () => {
        const cat = db.find('categories', c => c.name === 'Kesehatan Jiwa & Psikologi Terpadu')[0];
        assert.ok(cat, 'Category should exist before deletion');
        const deleted = db.delete('categories', cat.id);
        assert.strictEqual(deleted, true, 'Category should be deleted successfully');
        const check = db.findById('categories', cat.id);
        assert.strictEqual(check, null, 'Deleted category should no longer exist');
    });

    // -------------------------------------------------------------
    // 2. MULTILINGUAL DETECTION & MEDICAL QUERY BRIDGING
    // -------------------------------------------------------------
    console.log('\n🌐 [2] MULTILINGUAL DETECTION & BRIDGING TESTS');
    test('Detect English language query', () => {
        const lang1 = LanguageService.detectLanguage('How to treat a severe headache and fever?');
        assert.strictEqual(lang1, 'en', 'Should detect English query');

        const lang2 = LanguageService.detectLanguage('What are the symptoms of acid reflux or gerd?');
        assert.strictEqual(lang2, 'en', 'Should detect English query');
    });

    test('Detect Javanese language query', () => {
        const lang = LanguageService.detectLanguage('Sirahku ngelu lan wetengku perih, kudu ngombe opo?');
        assert.strictEqual(lang, 'jv', 'Should detect Javanese query');
    });

    test('Detect Sundanese language query', () => {
        const lang = LanguageService.detectLanguage('Abdi lieur pisan sareng awak haredang panas tiris');
        assert.strictEqual(lang, 'su', 'Should detect Sundanese query');
    });

    test('Detect Indonesian language query', () => {
        const lang = LanguageService.detectLanguage('Bagaimana cara penanganan flu dan batuk berdahak?');
        assert.strictEqual(lang, 'id', 'Should detect Indonesian query');
    });

    test('Bridge English query with medical keywords', () => {
        const bridged = LanguageService.bridgeQueryToMedical('I have a severe headache and high fever', 'en');
        assert.ok(bridged.includes('sakit kepala') || bridged.includes('demam'), 'Bridged query should include Indonesian medical synonyms');
    });

    test('Bridge Javanese query with medical keywords', () => {
        const bridged = LanguageService.bridgeQueryToMedical('wetengku perih lan sebah', 'jv');
        assert.ok(bridged.includes('maag') || bridged.includes('lambung'), 'Bridged query should include medical terms');
    });

    // -------------------------------------------------------------
    // 3. MULTILINGUAL KNOWLEDGE RETRIEVAL & RESPONSE GENERATION
    // -------------------------------------------------------------
    console.log('\n🤖 [3] MULTILINGUAL RETRIEVAL & RESPONSE FORMATTING TESTS');
    await testAsync('Retrieve knowledge for English headache query and format in English', async () => {
        const search = await KnowledgeRetriever.search('How to treat tension headache and migraine?', 0.58);
        assert.strictEqual(search.found, true, 'Knowledge should be found for English query');
        assert.strictEqual(search.lang, 'en', 'Detected language should be en');

        const formatted = ResponseGenerator.formatKnowledgeResponse(search.knowledge, search.source, search.category, 'en');
        assert.ok(formatted.includes('VERIFIED MEDICAL INFORMATION'), 'Response should be formatted in English header');
        assert.ok(formatted.includes('Clinical Summary') || formatted.includes('Key Management Points'), 'Response should contain English sections');
    });

    await testAsync('Retrieve knowledge for Javanese flu query', async () => {
        const search = await KnowledgeRetriever.search('Awakku mriang lan watuk pilek, piye carane?', 0.58);
        assert.strictEqual(search.found, true, 'Knowledge should be found for Javanese flu query');
        assert.strictEqual(search.lang, 'jv', 'Detected language should be jv');

        const formatted = ResponseGenerator.formatKnowledgeResponse(search.knowledge, search.source, search.category, 'jv');
        assert.ok(formatted.includes('BASA JAWA'), 'Response should have Javanese localization');
    });

    test('Doctor fallback notice in English', () => {
        const notice = ResponseGenerator.formatDoctorFallbackNotice(99, 'My left knee is swelling after running', 'en');
        assert.ok(notice.includes('Consultation Forwarded to On-Call Doctor'), 'Notice should be in English');
        assert.ok(notice.includes('[#DQ-99]'), 'Notice should have question ID tag');
    });

    test('Non-health refusal in English', () => {
        const refusal = HealthValidator.getNonHealthResponse('en');
        assert.ok(refusal.includes('TeleHealth Specialized Medical Assistant'), 'Refusal should be in English');
    });

    // -------------------------------------------------------------
    // 4. FULL BOT PIPELINE MULTILINGUAL TEST
    // -------------------------------------------------------------
    console.log('\n💬 [4] END-TO-END PIPELINE MULTILINGUAL TESTS');
    await testAsync('Bot handles English health question end-to-end', async () => {
        const result = await telegramBot.handleIncomingMessage({
            telegramChatId: 'test-device-en',
            telegramUserId: 'test-user-en',
            text: 'How can I treat mild fever and body chills at home?'
        });

        assert.strictEqual(result.isHealth, true, 'Should be validated as health topic');
        assert.strictEqual(result.language, 'en', 'Should detect English language');
        assert.strictEqual(result.status, 'ANSWERED_BY_KB', 'Should be answered by KB');
        assert.ok(result.responseMessage.includes('VERIFIED MEDICAL INFORMATION'), 'Message should be in English');
    });

    await testAsync('Bot handles non-health question in English with polite refusal in English', async () => {
        const result = await telegramBot.handleIncomingMessage({
            telegramChatId: 'test-device-en',
            telegramUserId: 'test-user-en',
            text: 'How to write a Python script for database query?'
        });

        assert.strictEqual(result.status, 'REJECTED_NON_HEALTH', 'Should reject non-health');
        assert.strictEqual(result.language, 'en', 'Should detect English');
        assert.ok(result.responseMessage.includes('TeleHealth Specialized Medical Assistant'), 'Refusal should be in English');
    });

    // -------------------------------------------------------------
    // 5. SUPERADMIN KNOWLEDGE BASE RESET TESTS
    // -------------------------------------------------------------
    console.log('\n🛡️ [5] SUPERADMIN KNOWLEDGE BASE RESET TESTS');
    test('Reset Knowledge Base to DEFAULT baseline', () => {
        // Insert dummy custom knowledge first
        db.insert('knowledge', {
            title: 'Custom Test Knowledge Entry',
            topic_keywords: 'test',
            short_answer: 'Test short answer',
            status: 'ACTIVE'
        });

        const resetRes = db.resetKnowledgeStore('DEFAULT', 'Super Administrator Test');
        assert.strictEqual(resetRes.mode, 'DEFAULT');
        assert.ok(resetRes.count >= 5, 'Baseline knowledge should be restored');

        const kb = db.find('knowledge');
        assert.ok(kb.some(k => k.id === 1 && k.title.includes('Flu')), 'PAPDI/WHO Flu baseline should be present');
    });

    test('Reset Knowledge Base CLEAR_ALL mode', () => {
        const clearRes = db.resetKnowledgeStore('CLEAR_ALL', 'Super Administrator Test');
        assert.strictEqual(clearRes.mode, 'CLEAR_ALL');
        assert.strictEqual(clearRes.count, 0);

        const kb = db.find('knowledge');
        assert.strictEqual(kb.length, 0, 'Knowledge store should be empty');

        // Restore to default baseline for normal app usage
        db.resetKnowledgeStore('DEFAULT', 'Super Administrator');
        assert.ok(db.find('knowledge').length >= 5, 'Knowledge store restored to baseline');
    });

    console.log('\n====================================================');
    console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests();
