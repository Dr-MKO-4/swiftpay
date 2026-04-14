// swiftpay/src/config/firebase.js
/**
 * Firebase Configuration
 * 
 * Pour utiliser Firebase Cloud Messaging (FCM):
 * 1. Créer un projet Firebase: https://console.firebase.google.com
 * 2. Télécharger le fichier de configuration (serviceAccountKey.json)
 * 3. Ajouter la clé à .env: FIREBASE_CONFIG_PATH=/path/to/serviceAccountKey.json
 * 4. Installer firebase-admin: npm install firebase-admin
 * 
 * Pour le frontend (Expo):
 * 1. Installer: expo install expo-notifications expo-device
 * 2. Créer un projet EAS: eas build --platform android/ios
 * 3. Ajouter app.json avec EAS configuration
 */

const firebaseConfig = {
  // À remplir avec les données de votre projet Firebase
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

export default firebaseConfig;
