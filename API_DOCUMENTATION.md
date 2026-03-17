# 📚 SwiftPay API Documentation

**Base URL:** `http://localhost:3000/api`

**Version:** 1.0.0  
**Dernière mise à jour:** 17 mars 2026

---

## 🔐 Authentification

Toutes les routes protégées requièrent un **JWT Bearer Token** dans l'en-tête :

```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Endpoints

### 🔑 Authentification (`/auth`)

#### POST `/register`
Créer un nouveau compte utilisateur.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "fullName": "John Doe",
  "username": "johndoe",
  "phone": "+33612345678"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Validations:**
- Email: format email valide
- Password: min 6 caractères
- fullName: non vide
- username: non vide
- phone: optionnel, format téléphone

---

#### POST `/login`
Authentifier un utilisateur et envoyer un OTP.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "otpRequired": true,
  "message": "OTP envoyé",
  "email": "user@example.com"
}
```

---

#### POST `/request-otp`
Renvoyer un OTP.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "OTP renvoyé"
}
```

---

#### POST `/verify-otp`
Vérifier l'OTP et obtenir un JWT.

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### POST `/forgot-password`
Demander la réinitialisation du mot de passe (envoie un email avec un lien).

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Email de réinitialisation envoyé"
}
```

---

#### POST `/reset-password`
Réinitialiser le mot de passe avec un token.

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewPassword123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé avec succès"
}
```

**Validations password:**
- Min 8 caractères
- Au moins 1 majuscule
- Au moins 1 chiffre
- Au moins 1 caractère spécial (!@#$%^&*)

---

#### GET `/profile`
Obtenir le profil de l'utilisateur connecté. ⚠️ **Authentification requise**

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "johndoe",
    "full_name": "John Doe",
    "email": "user@example.com",
    "phone_number": "+33612345678",
    "created_at": "2026-03-17T10:00:00Z"
  }
}
```

---

### 💳 Portefeuilles (`/wallets`)

⚠️ **Authentification requise pour tous les endpoints**

#### GET `/`
Obtenir tous les portefeuilles de l'utilisateur.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "wallet_id": 1,
      "user_id": 1,
      "currency": "USD",
      "balance": 1500.50,
      "created_at": "2026-03-17T10:00:00Z"
    }
  ]
}
```

---

#### POST `/`
Créer un nouveau portefeuille.

**Request:**
```json
{
  "currency": "EUR"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "wallet_id": 2,
    "currency": "EUR",
    "balance": 0
  }
}
```

---

#### POST `/deposit`
Déposer de l'argent dans un portefeuille.

**Request:**
```json
{
  "wallet_id": 1,
  "amount": 500,
  "description": "Dépôt initialisationnel"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "wallet_id": 1,
    "balance": 2000.50,
    "transaction_id": 123
  }
}
```

---

### 💸 Transferts (`/transfers`)

⚠️ **Authentification requise pour tous les endpoints**

#### POST `/`
Effectuer un transfert vers un autre utilisateur.

**Request:**
```json
{
  "recipientId": 2,
  "amount": 250,
  "description": "Remboursement diner"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Transfert effectué avec succès",
  "transactionId": 125,
  "timestamp": "2026-03-17T14:30:00Z"
}
```

**Erreurs possibles:**
- `Solde insuffisant` (400)
- `Limite quotidienne dépassée` (400)
- `Limite mensuelle dépassée` (400)
- `Destinataire introuvable` (404)

---

#### GET `/limits`
Obtenir les limites de transfert restantes.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "daily": {
      "limit": 5000,
      "used": 250,
      "remaining": 4750
    },
    "monthly": {
      "limit": 50000,
      "used": 2000,
      "remaining": 48000
    },
    "singleTransferMax": 1000
  }
}
```

---

### 👥 Bénéficiaires (`/beneficiaries`)

⚠️ **Authentification requise pour tous les endpoints**

#### GET `/`
Obtenir tous les bénéficiaires.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "beneficiary_id": 1,
      "beneficiary_user_id": 2,
      "nickname": "Mon collègue",
      "username": "alice",
      "email": "alice@example.com",
      "full_name": "Alice Smith",
      "created_at": "2026-03-17T10:00:00Z"
    }
  ]
}
```

---

#### POST `/`
Ajouter un bénéficiaire.

**Request:**
```json
{
  "beneficiaryUserId": 2,
  "nickname": "Mon collègue"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Bénéficiaire ajouté",
  "beneficiary": {
    "beneficiary_id": 1,
    "created_at": "2026-03-17T14:30:00Z"
  }
}
```

---

#### PUT `/:beneficiaryId`
Mettre à jour le surnom d'un bénéficiaire.

**Request:**
```json
{
  "nickname": "Alice (collègue)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Bénéficiaire mis à jour"
}
```

---

#### DELETE `/:beneficiaryId`
Supprimer un bénéficiaire.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Bénéficiaire supprimé"
}
```

---

### 📊 Transactions (`/transactions`)

⚠️ **Authentification requise pour tous les endpoints**

#### GET `/`
Obtenir l'historique des transactions.

**Query Parameters:**
- `type`: `deposit`, `withdraw`, `transfer`, `transfer_received`
- `status`: `completed`, `pending`, `failed`
- `startDate`: ISO date
- `endDate`: ISO date

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "transaction_id": 125,
      "wallet_id": 1,
      "type": "transfer",
      "amount": 250,
      "status": "completed",
      "description": "Remboursement diner",
      "created_at": "2026-03-17T14:30:00Z"
    }
  ]
}
```

---

#### POST `/`
Créer une transaction manuelle.

**Request:**
```json
{
  "wallet_id": 1,
  "type": "deposit",
  "amount": 100,
  "status": "completed",
  "description": "Dépôt manuel"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "transaction_id": 126,
    "created_at": "2026-03-17T14:35:00Z"
  }
}
```

---

### 🔐 Rate Limiting

Les endpoints suivants ont des limites strictes:

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| `/auth/login` | 5 requêtes | 15 minutes |
| `/auth/verify-otp` | 5 requêtes | 15 minutes |
| `/auth/request-otp` | 5 requêtes | 15 minutes |
| Autres endpoints | 100 requêtes | 15 minutes |

**Réponse au dépassement:** `429 Too Many Requests`

---

## ⚠️ Code d'Erreurs

| Code | Description |
|------|-------------|
| `200` | Succès |
| `201` | Créé |
| `400` | Requête invalide ou validation échouée |
| `401` | Non authentifié ou token invalide |
| `403` | Non autorisé |
| `404` | Ressource non trouvée |
| `409` | Conflit (ex: email déjà utilisé) |
| `429` | Trop de requêtes |
| `500` | Erreur serveur |

---

## 🔒 Sécurité

- **HTTPS:** Obligatoire en production
- **JWT:** Tokens valides 24h par défaut
- **CORS:** Configuré pour le domaine frontend
- **Validation:** Express-validator sur tous les inputs
- **Rate limiting:** Activé par défaut

---

## 🧪 Exemples cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

### Transfert
```bash
curl -X POST http://localhost:3000/api/transfers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": 2,
    "amount": 250,
    "description": "Remboursement"
  }'
```

---

## 📝 Notes

- Les dates are en format ISO 8601
- Les montants sont en format décimal (ex: 250.50)
- Les erreurs renvoient toujours un message `message` ou `errors[]`

---

**Pour plus d'infos:** Consulter la section "Frontend" pour les appels API depuis React Native.
