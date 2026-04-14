// SETUP_FRONTEND_PHASE2.md

# Phase 2 Frontend - Setup Instructions

## Dependencies à installer

```bash
cd swiftpay

# Notifications
expo install expo-notifications expo-device

# Storage (AsyncStorage - déjà installé probablement)
# expo install @react-native-async-storage/async-storage

# Permissions (pour notifications)
# expo install expo-permissions
```

## Configuration des Notifications Push

### 1. Expo Setup
```bash
cd swiftpay
eas build --platform ios
eas build --platform android
```

### 2. Firebase Cloud Messaging (FCM)

**Backend:**
- Créer un projet Firebase: https://console.firebase.google.com
- Télécharger: Project Settings → Service Accounts → Generate New Private Key
- Sauvegarder comme `serviceAccountKey.json` 
- Ajouter au backend: `backend/config/serviceAccountKey.json`
- Dans `.env`: `FIREBASE_CONFIG_PATH=./config/serviceAccountKey.json`

**Installation:**
```bash
cd backend
npm install firebase-admin
```

## Intégration des Écrans

### 1. Dark Mode
Tous les écrans doivent import useTheme:
```jsx
import { useTheme } from '../contexts/ThemeContext';

function MyScreen() {
  const { colors, isDarkMode } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      {/* Utiliser colors.* pour le styling */}
    </View>
  );
}
```

### 2. Loading States
Utiliser les composants:
```jsx
import { LoadingSpinner, LoadingOverlay } from '../components/Loading';

<LoadingSpinner message="Chargement..." />
<LoadingOverlay visible={loading} />
```

### 3. Empty States
```jsx
import { EmptyState } from '../components/Empty';

<EmptyState 
  icon="🔔"
  title="Aucune notification"
  message="Vous êtes à jour!"
/>
```

## Routes Ajoutées

1. **CurrencyConverterScreen** - Convertisseur de devises
   - GET /api/currencies/rates?base=USD
   - POST /api/currencies/convert
   - GET /api/currencies/supported

2. **NotificationsScreen** - Notifications push
   - GET /api/notifications
   - POST /api/notifications/register-token
   - PUT /api/notifications/:id/read
   - DELETE /api/notifications/token/:token

## Navigation

Ajouter au menu drawer:
```jsx
<DrawerItem
  label="Convertisseur"
  onPress={() => navigation.navigate('CurrencyConverterScreen')}
/>
<DrawerItem
  label="Notifications"
  onPress={() => navigation.navigate('NotificationsScreen')}
/>
```

## Environment Variables (.env)

```
# Firebase
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# EAS
EXPO_PUBLIC_EAS_PROJECT_ID=your_eas_project_id
```

## Testing

### Test Local Notifications
```jsx
import pushNotificationService from '../services/pushNotificationService';

pushNotificationService.sendLocalNotification(
  'Test',
  'Si vous voyez ça, les notifications marchent!'
);
```

### Test API Currency Conversion
```bash
curl -X POST http://localhost:3000/api/currencies/convert \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "from": "USD",
    "to": "EUR"
  }'
```

## Status Check

Avant de continuer, vérifier:
- [ ] npm packages installés (frontend + backend)
- [ ] Migrations SQL exécutées
- [ ] Firebase configuré
- [ ] Variables d'environnement définies
- [ ] Écrans compilent sans erreurs
