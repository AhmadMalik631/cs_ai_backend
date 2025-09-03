const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testPagination() {
  try {
    console.log('Testing pagination...\n');

    // Test page 1 with 10 items
    console.log('1. Testing page 1 with limit 10:');
    const response1 = await axios.get(`${BASE_URL}/tickets/fetch-tickets?page=1&limit=10`);
    console.log(`   Status: ${response1.status}`);
    console.log(`   Tickets returned: ${response1.data.data.length}`);
    console.log(`   Total count: ${response1.data.pagination.totalCount}`);
    console.log(`   Current page: ${response1.data.pagination.currentPage}`);
    console.log(`   Total pages: ${response1.data.pagination.totalPages}`);
    console.log(`   Has next: ${response1.data.pagination.hasNextPage}`);
    console.log(`   Has prev: ${response1.data.pagination.hasPrevPage}\n`);

    // Test page 2 with 10 items
    console.log('2. Testing page 2 with limit 10:');
    const response2 = await axios.get(`${BASE_URL}/tickets/fetch-tickets?page=2&limit=10`);
    console.log(`   Status: ${response2.status}`);
    console.log(`   Tickets returned: ${response2.data.data.length}`);
    console.log(`   Current page: ${response2.data.pagination.currentPage}`);
    console.log(`   Has next: ${response2.data.pagination.hasNextPage}`);
    console.log(`   Has prev: ${response2.data.pagination.hasPrevPage}\n`);

    // Test with different limit
    console.log('3. Testing page 1 with limit 25:');
    const response3 = await axios.get(`${BASE_URL}/tickets/fetch-tickets?page=1&limit=25`);
    console.log(`   Status: ${response3.status}`);
    console.log(`   Tickets returned: ${response3.data.data.length}`);
    console.log(`   Total pages: ${response3.data.pagination.totalPages}\n`);

    // Test with sorting
    console.log('4. Testing with sorting and pagination:');
    const query = JSON.stringify({ sort: { date: -1 } });
    const response4 = await axios.get(`${BASE_URL}/tickets/fetch-tickets?page=1&limit=10&query=${encodeURIComponent(query)}`);
    console.log(`   Status: ${response4.status}`);
    console.log(`   Tickets returned: ${response4.data.data.length}`);
    console.log(`   Total pages: ${response4.data.pagination.totalPages}\n`);

    console.log('✅ Pagination test completed successfully!');

  } catch (error) {
    console.error('❌ Pagination test failed:', error.response?.data || error.message);
  }
}

// Run the test
testPagination();
