# 🚀 SwiftPay - Guide d'Installation et Configuration

## 📋 Prérequis

### Backend
- Node.js v18+ et npm
- PostgreSQL 13+
- Python 3.8+ (pour le service de reconnaissance faciale)

### Frontend
- React Native 0.79+
- Expo ou React Native CLI

---

## 🔧 Installation Backend

### 1. Cloner et installer les dépendances

```bash
cd backend
npm install
```

### 2. Configuration des variables d'environnement

Créer un fichier `.env` à la racine du dossier `backend/` :

```env
# Serveur
PORT=3000
NODE_ENV=development

# Base de données PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=swiftpay

# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# JWT
JWT_SECRET=your_very_secure_secret_key_min_32_chars

# Services externes
FACEID_URL=http://localhost:5001
FRONTEND_URL=http://localhost:3000

# Rate limiting
RATE_LIMIT_ENABLED=true
```

### 3. Créer la base de données PostgreSQL

```bash
createdb -U postgres swiftpay
psql -U postgres -d swiftpay
```

Puis exécuter les migrations SQL :

```bash
psql -U postgres -d swiftpay -f migrations.sql
```

Ou exécuter manuellement les commandes dans `migrations.sql`.

### 4. Démarrer le serveur backend

```bash
npm start
```

Le serveur devrait écouter sur `http://localhost:3000`

---

## 🐍 Installation du Service Python (Reconnaissance Faciale)

### 1. Installer Python et les dépendances

```bash
cd backend/faceid-service
pip install -r requirement.txt
```

### 2. Configuration

Créer un fichier `.env` dans `faceid-service/` :

```env
FLASK_ENV=development
FLASK_HOST=0.0.0.0
FLASK_PORT=5001
```

### 3. Démarrer le service

```bash
python faceid_backend.py
```

Le service écoute sur `http://localhost:5001/verify_face`

---

## 📱 Installation Frontend

### 1. Installer les dépendances

```bash
cd swiftpay
npm install
# ou
yarn install
```

### 2. Configuration des variables d'environnement

Créer un fichier `.env` dans le dossier `swiftpay/` :

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_API_TIMEOUT=10000
```

### 3. Démarrer l'application

#### Avec Expo

```bash
npx expo start
```

Puis:
- Appuyer sur `i` pour iOS
- Appuyer sur `a` pour Android
- Appuyer sur `w` pour Web

#### Avec React Native CLI

**Android:**
```bash
npx react-native run-android
```

**iOS:**
```bash
npx react-native run-ios
```

---

## 📦 Variables d'Environnement Détaillées

### Backend (`backend/.env`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `PORT` | Port du serveur API | `3000` |
| `NODE_ENV` | Environnement | `development`, `production` |
| `PG_HOST` | Host PostgreSQL | `localhost` |
| `PG_PORT` | Port PostgreSQL | `5432` |
| `PG_USER` | Utilisateur DB | `postgres` |
| `PG_PASSWORD` | Mot de passe DB | `password123` |
| `PG_DATABASE` | Nom de la DB | `swiftpay` |
| `EMAIL_USER` | Email expéditeur (Gmail) | `app@gmail.com` |
| `EMAIL_PASS` | App Password Gmail | *(voir authentification Gmail)* |
| `JWT_SECRET` | Secret JWT (min 32 chars) | `your_secret_key...` |
| `FACEID_URL` | URL du service facial | `http://localhost:5001` |
| `FRONTEND_URL` | URL frontend (pour les liens) | `http://localhost:3000` |

### Frontend (`swiftpay/.env`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | URL de l'API backend | `http://localhost:3000/api` |
| `EXPO_PUBLIC_API_TIMEOUT` | Timeout requêtes (ms) | `10000` |

---

## 🔐 Authentification Gmail pour l'Email

1. Activer l'authentification 2FA sur votre compte Gmail
2. Générer une "App Password":
   - Aller à https://myaccount.google.com/apppasswords
   - Sélectionner "Mail" et "Windows Computer"
   - Copier le mot de passe généré
   - Le coller dans `EMAIL_PASS` du `.env`

---

## 🗄️ Migrations Détaillées

Le fichier `backend/migrations.sql` crée:

1. **password_reset_tokens** - Tokens pour réinitialisation de mot de passe
2. **beneficiaries** - Gestion des bénéficiaires
3. **transaction_limits** - Limites de transaction par utilisateur
4. **audit_logs** - Logs d'audit pour la sécurité
5. **user_sessions** - Sessions utilisateur actives

Pour exécuter les migrations :

```bash
psql -U postgres -d swiftpay < backend/migrations.sql
```

---

## 🧪 Tests

### Backend

```bash
npm test
```

### Frontend

```bash
npm test
# ou
jest
```

---

## 🚀 Déploiement

### Backend (Service Production)

1. **Build Docker** (recommandé):
```bash
docker build -t swiftpay-backend .
docker run -p 3000:3000 --env-file .env swiftpay-backend
```

2. **Heroku/Railway/Render**:
   - Pousser le code vers GitHub
   - Connecter le repo au service de déploiement
   - Configurer les variables d'environnement
   - Déployer

### Frontend

1. **Expo Cloud Build**:
```bash
eas build --platform all
```

2. **Play Store/App Store**:
   - Utiliser `eas build --platform android` (APK)
   - Utiliser `eas build --platform ios` (IPA)
   - Télécharger via App Store Connect / Google Play Console

---

## 🐛 Troubleshooting

### "Cannot find module express-rate-limit"
```bash
npm install express-rate-limit
```

### "Connection refused" PostgreSQL
- Vérifier que PostgreSQL est démarré
- Vérifier les credentials dans `.env`

### CORS Error
- Vérifier que `FRONTEND_URL` est configuré correctement dans le backend

### Email ne s'envoie pas
- Vérifier les credentials Gmail
- Vérifier que "Less secure apps" est activé (ou utiliser App Password)
- Vérifier les logs du serveur

### Service facial non accessible
- Vérifier que le service Python est démarré
- Vérifier que `FACEID_URL` est correct dans `.env`

---

## 📚 Documentation Utile

- [Express.js Docs](https://expressjs.com/)
- [React Native Docs](https://reactnative.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)
- [MediaPipe](https://mediapipe.dev/)

---

## 🤝 Support

Pour les questions ou problèmes :
1. Consulter la documentation
2. Vérifier les logs des serveurs
3. Créer une issue sur GitHub

---

**Dernière mise à jour:** 17 mars 2026
