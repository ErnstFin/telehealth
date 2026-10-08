process.env.NODE_ENV = 'test';
const telegramBot = require('../src/services/telegramBot');
const db = require('../src/db');

async function testKnowledgeFirst() {
    console.log('Testing Knowledge Base First Logic...');

    // Test 1: Query that matches active knowledge item #22 (Database processing)
    const dbQuery = 'How to design database?';
    const res1 = await telegramBot.handleIncomingMessage({
        telegramChatId: 'test-db-user',
        text: dbQuery
    });
    console.log('\n--- TEST 1: Database Query (Knowledge #22 exists in DB) ---');
    console.log('Query:', dbQuery);
    console.log('Status:', res1.status);
    console.log('Knowledge Title:', res1.matchedKnowledge ? res1.matchedKnowledge.title : 'None');
    console.log('Score:', res1.relevanceScore);

    // Test 2: Random non-health query NOT in DB (e.g. cooking recipe or python programming)
    const randomNonHealth = 'Bagaimana cara memasak rendang daging sapi pedas?';
    const res2 = await telegramBot.handleIncomingMessage({
        telegramChatId: 'test-nonhealth-user',
        text: randomNonHealth
    });
    console.log('\n--- TEST 2: Out of Scope Non-Health Query NOT in DB ---');
    console.log('Query:', randomNonHealth);
    console.log('Status:', res2.status);
    console.log('Is Health:', res2.isHealth);

    // Test 3: Medical query NOT in DB -> Should forward to doctor
    const unindexedHealth = 'Telinga saya berdenging tinnitus sudah 3 hari setelah mendengar konser';
    const res3 = await telegramBot.handleIncomingMessage({
        telegramChatId: 'test-doctor-user',
        text: unindexedHealth
    });
    console.log('\n--- TEST 3: Unindexed Health Query NOT in DB ---');
    console.log('Query:', unindexedHealth);
    console.log('Status:', res3.status);
    console.log('Doctor Queued:', res3.doctorQueued);
}

testKnowledgeFirst().catch(console.error);
