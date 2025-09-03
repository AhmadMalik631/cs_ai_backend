const axios = require('axios');

// Test the AI regeneration flow
async function testAIRegeneration() {
  try {
    console.log('🧪 Testing AI Regeneration Flow...\n');

    // Step 1: Rate an AI suggestion below 8 (this would normally be done from frontend)
    console.log('1️⃣ Rating AI suggestion below 8...');
    
    // You'll need to replace these with actual values from your database
    const internalNoteId = 'YOUR_INTERNAL_NOTE_ID_HERE'; // Replace with actual ID
    const rating = 6;
    const feedback = 'Too formal, make it more casual and friendly';
    
    console.log(`   Rating: ${rating}`);
    console.log(`   Feedback: ${feedback}`);
    console.log(`   Internal Note ID: ${internalNoteId}`);
    console.log('   ⚠️  Please replace the internalNoteId with an actual ID from your database\n');

    // Step 2: Request AI regeneration
    console.log('2️⃣ Requesting AI regeneration...');
    console.log('   This would call: POST /api/internal-notes/request-redo/:internalNoteId');
    console.log('   With body: { rating, feedback }');
    console.log('   Backend will send to Python service: POST ${PYTHON_SERVICE_URL}/regenerate-reply');
    console.log('   Python service will call back: POST /api/internal-notes/ai-suggestion\n');

    // Step 3: Show the complete flow
    console.log('3️⃣ Complete Flow:');
    console.log('   Customer Email → Python Service → AI Suggestion → Internal Notes');
    console.log('   Agent Rates < 8 → Feedback Required → Redo Button → Regeneration Request');
    console.log('   Python Service → New AI Reply → Internal Notes → Agent Review Again\n');

    console.log('✅ Test script completed. To test with real data:');
    console.log('   1. Create an internal note with AI suggestion');
    console.log('   2. Rate it below 8 with feedback');
    console.log('   3. Call the regeneration endpoint');
    console.log('   4. Verify Python service receives the request');
    console.log('   5. Verify new AI suggestion appears in internal notes');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAIRegeneration();
