// test-flask.js
const axios = require('axios');
const fs    = require('fs');

(async () => {
  try {
    // Charge trois fichiers différents dans ton dossier de test :
    const imgOpen1   = fs.readFileSync('face_open1.jpg');
    const imgClosed  = fs.readFileSync('face_closed.jpg');
    const imgOpen2   = fs.readFileSync('face_open2.jpg');

    // Préfixe data URI
    const b64Open1  = 'data:image/jpeg;base64,' + imgOpen1.toString('base64');
    const b64Closed = 'data:image/jpeg;base64,' + imgClosed.toString('base64');
    const b64Open2  = 'data:image/jpeg;base64,' + imgOpen2.toString('base64');

    // Envoi la séquence open→closed→open
    const resp = await axios.post(
      'http://localhost:5000/verify_face',
      { images: [b64Open1, b64Closed, b64Open2] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('✅ Flask status:', resp.status, resp.data);
  } catch (err) {
    console.error('❌ Flask error status:', err.response?.status, err.response?.data || err.message);
  }
})();
