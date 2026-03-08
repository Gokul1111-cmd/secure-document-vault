const axios = require('axios');

async function testAdminEndpoints() {
  const baseURL = 'http://localhost:5000/api';
  
  console.log('=== Testing Admin Endpoints ===\n');
  
  try {
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@securedocs.com',
      password: 'Admin@123'
    });
    
    const { accessToken, user } = loginResponse.data.data;
    console.log('✓ Login successful');
    console.log(`  User: ${user.name} (${user.email})`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Token: ${accessToken.substring(0, 20)}...`);
    
    // Step 2: Test /admin/stats
    console.log('\n2. Testing /admin/stats...');
    const statsResponse = await axios.get(`${baseURL}/admin/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✓ Stats endpoint working');
    console.log('  Data:', JSON.stringify(statsResponse.data.data, null, 2));
    
    // Step 3: Test /admin/logs
    console.log('\n3. Testing /admin/logs...');
    const logsResponse = await axios.get(`${baseURL}/admin/logs?limit=5`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✓ Logs endpoint working');
    console.log(`  Logs count: ${logsResponse.data.data.logs.length}`);
    console.log(`  Total logs: ${logsResponse.data.data.total}`);
    
    // Step 4: Test /admin/documents
    console.log('\n4. Testing /admin/documents...');
    const docsResponse = await axios.get(`${baseURL}/admin/documents?limit=1`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✓ Documents endpoint working');
    console.log(`  Documents count: ${docsResponse.data.data.documents.length}`);
    console.log(`  Total docs: ${docsResponse.data.data.total}`);
    console.log(`  Total size: ${docsResponse.data.data.totalSize} bytes`);
    
    console.log('\n=== All endpoints working correctly! ===');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('  No response received from server');
      console.error('  Is the server running on port 5000?');
    }
  }
}

testAdminEndpoints();
