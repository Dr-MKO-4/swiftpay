// test-express.js
const axios = require('axios');
const fs    = require('fs');

(async () => {
  try {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk1MWNlZWI2LWYwYmItNDQ3OC05MmIwLWQyMDdlY2QwMTgxZiIsImVtYWlsIjoibWtvQGV4YW1wbGUuY29tIiwiaWF0IjoxNzQ1ODcxNjIzLCJleHAiOjE3NDU4NzUyMjN9.shk5AAMWcnH-S2o4v7LTx4Bcv7z8srypik6P9vSW2kc';
    const img = fs.readFileSync('face_open1.jpg');
    // retirer le préfixe data-uri
    const rawBase64 = img.toString('base64');

    const resp = await axios.post(
      'http://localhost:3000/api/auth/register-face',
      { image: rawBase64 },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      }
    );
    console.log('✅ Express status:', resp.status, resp.data);
  } catch (err) {
    console.error('❌ Express error:', err.response?.status, err.response?.data || err.message);
  }
})();
