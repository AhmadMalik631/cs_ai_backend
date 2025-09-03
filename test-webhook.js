const axios = require('axios');
require('dotenv').config();

// Test webhook functionality
async function testWebhook() {
  try {
    console.log('🧪 Testing Webhook System...\n');
    
    // Check if WEBHOOK_URL is set
    if (!process.env.WEBHOOK_URL) {
      console.log('❌ WEBHOOK_URL not set in environment variables');
      console.log('Please set WEBHOOK_URL in your .env file');
      return;
    }
    
    console.log(`✅ WEBHOOK_URL: ${process.env.WEBHOOK_URL}`);
    
    // Test webhook endpoint
    console.log('\n📡 Testing webhook endpoint...');
    
    const testData = {
      _id: 'test-ticket-123',
      subject: 'Test Customer Issue',
      from: 'testcustomer@example.com',
      body: 'This is a test customer email to verify webhook functionality',
      messageId: 'test-message-456',
      source: 'customer',
      channel: 'email',
      date: new Date()
    };
    
    try {
      const response = await axios.post(process.env.WEBHOOK_URL, testData, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Webhook endpoint is accessible!');
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      
    } catch (webhookError) {
      if (webhookError.code === 'ECONNREFUSED') {
        console.log('❌ Webhook endpoint is not accessible');
        console.log('Python service might not be running or wrong URL');
        console.log('Make sure Python service is listening on the webhook URL');
      } else if (webhookError.code === 'ENOTFOUND') {
        console.log('❌ Webhook URL not found');
        console.log('Check if the URL is correct and accessible');
      } else {
        console.log('❌ Webhook error:', webhookError.message);
      }
    }
    
    // Test internal notes endpoint
    console.log('\n📝 Testing Internal Notes endpoint...');
    
    try {
      const internalNotesResponse = await axios.post(
        'http://localhost:5000/api/internal-notes/ai-suggestion',
        {
          ticketId: 'test-ticket-123',
          customerEmail: 'testcustomer@example.com',
          aiSuggestion: 'Thank you for contacting us. We are looking into your issue.',
          responseTime: 2500
        }
      );
      
      console.log('✅ Internal Notes endpoint is working!');
      console.log(`Status: ${internalNotesResponse.status}`);
      console.log(`Response: ${JSON.stringify(internalNotesResponse.data, null, 2)}`);
      
    } catch (internalNotesError) {
      if (internalNotesError.code === 'ECONNREFUSED') {
        console.log('❌ Internal Notes endpoint not accessible');
        console.log('Make sure your Node.js backend is running on port 5000');
      } else {
        console.log('❌ Internal Notes error:', internalNotesError.message);
      }
    }
    
    console.log('\n📋 Testing Summary:');
    console.log('1. ✅ Environment variables checked');
    console.log('2. 📡 Webhook endpoint tested');
    console.log('3. 📝 Internal Notes endpoint tested');
    console.log('\n🎯 Next Steps:');
    console.log('- Make sure Python service is running and listening on webhook URL');
    console.log('- Send a real customer email to test the complete flow');
    console.log('- Check Node.js logs for webhook triggers');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testWebhook();
