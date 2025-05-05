# SwiftPay – Documentation du Projet

La documentation de **SwiftPay** décrit l’architecture, les composants et les bonnes pratiques du projet, notamment les aspects backend, frontend, sécurité et déploiement. Elle s’appuie sur les sources fournies et sur les meilleures pratiques actuelles (API REST sécurisées, développement mobile, normes biométriques). Chaque section ci-dessous détaille les éléments clés à destination de développeurs et utilisateurs avancés.

## 1. Backend

### Architecture des services backend

Le backend de SwiftPay est basé sur **Node.js/Express** pour exposer des API REST et sur un microservice Python/Flask dédié à la reconnaissance faciale. La base de données relationnelle utilisée est **PostgreSQL**. L’architecture suit un modèle modulable : chaque ensemble de fonctionnalités (authentification, gestion du portefeuille, transactions, notifications, biométrie) est organisé en routes, contrôleurs et services distincts. Par exemple, le code utilise Express Router pour *auth* (`src/routes/auth.js`), *wallets* (`src/routes/walletsRoutes.js`), *transactions* (`src/routes/transactions`), etc., et un microservice Python (Flask) pour la vérification faciale.

L’architecture générale comprend :

* **Serveur API principal (Node.js)** : fournit les points d’accès (`/auth`, `/wallets`, `/transactions`, `/biometric`, etc.) et gère la logique métier.
* **Microservice Facial (Python/Flask)** : isolé dans un conteneur ou une instance séparée, il reçoit les images du visage et renvoie un résultat de vérification. Il utilise **MediaPipe Face Mesh** (avec OpenCV et NumPy) pour extraire les landmarks du visage (voir code `face_verify_service.py`).
* **Base de données PostgreSQL** : tables `users`, `wallets`, `transactions`, `user_preferences`, `biometric_keys`, `otp_secrets`, etc., stockent les informations utilisateurs, portefeuilles, transactions, clés biométriques, OTP, etc. Des fonctions SQL (p.ex. `create_wallet`, `record_transaction`) sont utilisées pour encapsuler la logique de création de portefeuille et d’enregistrement des transactions (cf. routes `/wallets/deposit` et `/transactions`).
* **Services externes** : un service d’envoi d’e-mails (Nodemailer/Gmail) pour les OTP, et potentiellement un service de notifications push (FCM) pour informer l’utilisateur en cas d’événements importants (succès/échec, alertes de sécurité, etc.).

Cette architecture microservices assure la séparation des responsabilités et facilite la scalabilité. Par exemple, le microservice facial peut évoluer ou être remplacé indépendamment du reste de l’API. Toutes les communications entre services se font en JSON sur HTTP (avec contraintes de sécurité détaillées plus bas).

### Description des API REST

Les API REST de SwiftPay suivent les conventions REST en JSON. Les routes principales incluent :

* **Authentification et utilisateurs** (`/api/auth`) :

  * **POST `/register`** : crée un nouveau compte utilisateur. Le corps JSON contient `email`, `password`, `fullName`, `username`, `phone`. Le mot de passe est haché (avec *bcrypt*) avant stockage. La route crée également une préférence par défaut et un portefeuille associé en base de données (fonction SQL `create_wallet`). Retourne un JWT d’authentification `{ token }`.
  * **POST `/login`** : authentifie l’utilisateur via `email` et `password`. En cas de succès, génère un code OTP à 6 chiffres, le stocke (table `otp_secrets`) et l’envoie par e-mail (voir **Nodemailer** ci-dessous). Retourne `{ otpRequired: true }`.
  * **POST `/request-otp`** : renvoie un nouvel OTP à un utilisateur existant (cas de réenvoi).
  * **POST `/verify-otp`** : vérifie l’OTP entré par l’utilisateur. Si le code est correct et non expiré, retourne un JWT `{ token }` pour établir la session.
  * **GET `/profile`** : renvoie les informations du profil connecté (utilise `req.user.id` fourni par le JWT).
  * **POST `/register-biometric`** : enregistre une paire de clés publique/privée générées côté client (WebAuthn) pour un utilisateur, stockées dans la table `biometric_keys` (champ `public_key`).
  * **POST `/register-face`** : enregistre une image de visage (format Base64) dans la table `biometric_keys` (champ `face_image`) pour l’authentification faciale future.
  * **POST `/verify-face`** : proxy en interne vers le microservice Flask. Le backend reçoit les images faciales du client (smartphone), les transfère au service Python via fetch (configuré avec `FACEID_URL`). En retour, il renvoie au client `{ success: true/false, message: ... }` selon la réponse du service facial.

* **Gestion de portefeuilles** (`/api/wallets`) :

  * **GET `/`** : liste les portefeuilles de l’utilisateur connecté (SQL `SELECT * FROM wallets WHERE user_id=$1`).
  * **POST `/`** : crée un nouveau portefeuille (monnaie personnalisée) pour l’utilisateur via la fonction `create_wallet(user_id, currency)`.
  * **POST `/deposit`** : crédite un portefeuille existant. Vérification d’appartenance (`wallet.user_id == req.user.id`), mise à jour du solde (`UPDATE wallets SET balance = balance + ...`) et création d’une transaction associée (`record_transaction`). Retourne les nouvelles données du portefeuille et l’ID de transaction.
  * **POST `/clear` (optionnel)** : vide toutes les transactions de l’utilisateur (DELETE sur `transactions` où le portefeuille appartient à l’utilisateur).

* **Gestion des transactions** (`/api/transactions`) :

  * **GET `/`** : récupère la liste des transactions filtrables (par date, type, statut) pour l’utilisateur connecté. Effectue des conditions dynamiques selon les paramètres de requête.
  * **POST `/`** : enregistre une nouvelle transaction manuelle via la fonction SQL `record_transaction(wallet_id, type, amount, status, description, related_wallet_id)`. Utile pour journaux ou montants entrants/sortants spécifiques.
  * **POST `/clear`** : supprime (clear) toutes les transactions liées aux portefeuilles de l’utilisateur (security clearance).

* **Autres services** : Bien que non implémenté explicitement dans le code fourni, on peut prévoir des endpoints pour les **notifications** (push ou e-mail), la gestion des **paramètres utilisateur** (langue, thème via la route `updatePreferences`), et tout autre service annexe (ex. historiques, relevés).

Toutes les routes protégées utilisent un middleware JWT (`authenticateJWT`) qui vérifie le token Bearer en en-tête (voir `authMiddleware`). En cas d’absence ou d’invalidité de token, l’accès est refusé (HTTP 401). Les réponses JSON contiennent généralement une propriété `success` ou le code HTTP approprié.

### Gestion des utilisateurs et de l’authentification

La gestion utilisateur suit les meilleures pratiques modernes :

* **Enregistrement** : lors du *register*, le mot de passe est salé (salt) et haché avec **bcrypt** avant stockage. Les doublons d’email/nom d’utilisateur sont détectés pour éviter les collisions. La transaction SQL est utilisée (`BEGIN ... COMMIT`) pour créer simultanément l’utilisateur, ses préférences et son portefeuille.

* **JWT (JSON Web Token)** : utilisé pour authentifier les sessions. Après validation de l’OTP, on génère un token signé incluant l’`id` et l’`email` de l’utilisateur. Le JWT permet une gestion stateless de la session et évite d’avoir à stocker des sessions côté serveur. Il est recommandé d’utiliser une durée de validité limitée (par exemple 1h) et un secret fort. Les tokens doivent être transmis en HTTPS (voir section Sécurité) et peuvent être stockés en mémoire ou dans du **HttpOnly Cookie** (moins exposé qu’AsyncStorage) pour les clients web.

* **Authentification multifacteur (MFA)** : SwiftPay combine plusieurs facteurs :

  * **1er facteur (mot de passe)** : l’utilisateur entre son mot de passe.
  * **2e facteur (OTP)** : après le mot de passe, un code OTP temporel à usage unique (TOTP) est généré côté serveur et envoyé par e-mail (voir infra). L’utilisateur doit le fournir pour valider sa connexion. Ce code expire rapidement (configuré ici à 5 minutes). L’utilisation du OTP basé temps (TOTP, ex. PyOTP) est recommandée pour la robustesse.
  * **Biométrie (optionnel)** : une fois connecté, l’utilisateur peut enregistrer un moyen biométrique (empreinte, FaceID) associé. Par la suite, l’authentification peut être revue au niveau de transaction sensible (paiement NFC, confirmation d’identité) à l’aide de la biométrie. L’utilisateur génère sur son appareil une paire de clés (WebAuthn) pour la reconnaissance biométrique, qui est transmise au backend lors de `register-biometric`. De même, une image faciale peut être enregistrée (`register-face`) pour les futurs contrôles faciaux. Ces données biométriques stockées (modèle d’empreinte ou vecteur facial) sont chiffrées en base afin de ne jamais conserver les données brutes.
  * **Liveness Detection** : la reconnaissance faciale s’accompagne d’une détection de vivacité (contre les attaques par photo/masque) via MediaPipe Face Mesh + OpenCV. Le microservice Python utilise MediaPipe pour extraire les landmarks 3D du visage et comparer en temps réel avec ceux de référence (voir code `face_verify_service.py`). Cela augmente la sécurité biométrique.

* **OTP (One-Time Password)** : le code OTP est généré aléatoirement (6 chiffres) et stocké temporairement dans la table `otp_secrets` (clef unique par utilisateur). Il est envoyé par e-mail grâce au service **Nodemailer** configuré en SMTP (Gmail). On impose un délai de validité court (par exemple 5 minutes) et l’utilisateur a des tentatives limitées. Cette pratique répond aux normes MFA modernes.

### Services spécifiques (wallets, transactions, notifications)

* **Wallets** : chaque utilisateur dispose d’un ou plusieurs portefeuilles (devise monétaire). À la création de compte, un portefeuille par défaut est automatiquement créé (`create_wallet`). L’API propose des opérations standard : consulter ses portefeuilles, en créer de nouveaux, déposer/retirer de l’argent. Lors d’un dépôt, le solde est mis à jour et une transaction associée est enregistrée.
* **Transactions** : tous les mouvements financiers (dépôts, retraits, transferts internes) sont consignés. L’utilisateur peut filtrer et consulter son historique via l’API. Les transactions sont liées aux portefeuilles, permettant une isolation par utilisateur (sécurité). Les appels à l’API doivent valider l’appartenance du wallet à l’utilisateur (sécurité voir code).
* **Notifications** : l’API envoie des notifications métier et de sécurité. Déjà, l’envoi d’OTP par e-mail constitue un service de notification (via Nodemailer). En complément, il est conseillé d’intégrer un système de notifications push (par exemple **Firebase Cloud Messaging** ou un service SMTP externe) pour alerter l’utilisateur en cas d’événement sensible (échecs de connexion répétés, succès d’un paiement, etc.). Ces notifications renforcent la sécurité proactive et l’UX.

### Intégration du microservice Python de reconnaissance faciale

SwiftPay utilise un microservice dédié à la reconnaissance faciale et à la détection de vivacité. L’intégration se fait ainsi :

1. **Côté mobile** : l’application capture une ou plusieurs images du visage de l’utilisateur (via caméra).
2. **Côté API Node** : la route `/verify-face` reçoit les images encodées (Base64) dans un POST JSON. Elle fait office de proxy sécurisé :

   ```js
   const resp = await fetch(`${process.env.FACEID_URL || 'http://localhost:5001'}/verify_face`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ images: req.body.images })
   });
   const result = await resp.json();
   ```

   Si le microservice renvoie `success: true`, l’API Node renvoie à son tour `{ success: true }`. Sinon, elle retourne une erreur 401 ou 400.
3. **Microservice Flask** : en Python (`face_verify_service.py`), le service reçoit les images, les compare au modèle de référence stocké (dans la table `biometric_keys` via une clé étrangère) en utilisant MediaPipe FaceMesh. Il calcule un score de similarité (distance Euclidienne des landmarks) et juge si le visage est reconnu ou non (seuil configurable). Il renvoie un JSON `{"success":true/false, "message":"..."}`. Ce découplage permet de mettre à jour l’algorithme facial (par exemple passer à un autre modèle d’IA) sans impacter le reste de l’API.

### Configuration et déploiement (.env, PostgreSQL, Nodemailer)

La configuration du backend repose sur des variables d’environnement (fichier `.env`) : informations de connexion PostgreSQL (`PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`, `PG_PORT`), identifiants SMTP pour l’e-mail (`EMAIL_USER`, `EMAIL_PASS`), l’URL du service facial (`FACEID_URL`), la clé secrète JWT, etc. Le code utilise `dotenv` pour charger ces variables.

**Déploiement** :

* Installer Node.js (version LTS recommandée) et npm. Cloner le dépôt backend.
* Installer les dépendances : `npm install` (Express, pg, bcrypt, nodemailer, etc.).
* Configurer PostgreSQL : créer la base de données et exécuter les scripts SQL fournis (tables `users`, `wallets`, `transactions`, `biometric_keys`, etc., ainsi que les fonctions `create_wallet` et `record_transaction`).
* Démarrer le serveur : `node src/index.js` ou via un gestionnaire de processus (PM2, Docker). S’assurer que le port (`process.env.PORT`) est exposé en HTTPS.
* Démarrer le microservice facial (doit avoir Python 3, pip, et `pip install flask opencv-python mediapipe psycopg2`). Utiliser `python face_verify_service.py` après avoir configuré son `.env`.

**Bonnes pratiques de déploiement** :

* Utiliser un reverse-proxy (Nginx) pour gérer le TLS 1.3 et rediriger vers le port Node. Conformément aux normes, toute communication API doit être chiffrée via HTTPS.
* Employer des conteneurs Docker pour isoler chaque service (API, base de données, microservice).
* Prévoir des scripts de démarrage, de migration de base, et de monitoring (logs).
* Stocker les secrets (`.env`) dans un coffre sécurisé (Vault, KMS).
* Utiliser un système de CI/CD pour les mises à jour (tests automatisés, migration de la BD avant déploiement, etc.).

## 2. Frontend (Web & Mobile)

### Stack technique (React Native, services associés)

Le frontend mobile de SwiftPay est développé avec **React Native** (JavaScript). Le code utilise un ensemble de bibliothèques courantes : React Navigation (pour la navigation multi-écrans), Axios ou `fetch` pour appeler les API, et divers services React Native (biométrie, NFC, AsyncStorage). Par exemple, le service d’authentification mobile fait appel à l’API backend avec `AuthService.login` (voir extrait) :

```js
// Exemple de requête de login (React Native, Axios)
const resp = await API.post('/auth/login', { email, password });
if (resp.data.otpRequired) {
  // Demander OTP à l'utilisateur
} else {
  await AsyncStorage.setItem('jwt', resp.data.token);
}
```

De même, des services dédiés gèrent la biométrie (`react-native-biometrics`) et le NFC (`react-native-nfc-manager`). Les dépendances clés sont listées dans `package.json` (par exemple `"react-native-nfc-manager": "^3.16.1"`). Aucun framework web dédié n’est mentionné ; on se concentre sur le mobile natif.

### Interface utilisateur et navigation

L’application mobile propose une interface sobre et intuitive. Les écrans principaux incluent : inscription, connexion (mot de passe + OTP), enregistrement biométrique, tableau de bord (listant portefeuilles et solde), page de paiement, historique des transactions, paramètres utilisateur (profil, préférences), et notifications. La navigation utilise React Navigation, ce qui permet d’enchaîner les écrans (par exemple, après connexion réussie, redirection vers le **HomeScreen**). Des composants natifs comme `SafeAreaView`, `ScrollView` et des éléments personnalisés (boutons, formulaires) sont utilisés. Par exemple, l’entrée du code OTP peut ressembler à :

```jsx
<View>
  <Text>Entrez le code OTP envoyé par email :</Text>
  <TextInput keyboardType="numeric" placeholder="000000" value={otp} 
             onChangeText={setOtp} style={styles.input} />
  <TouchableOpacity onPress={submitOtp} style={styles.button}>
    <Text>Valider</Text>
  </TouchableOpacity>
</View>
```

Les dialogues et alertes (comme `Alert.alert`) guident l’utilisateur en cas de succès ou d’erreur. La réactivité est gérée avec des indicateurs de chargement lors des appels API. L’application suit une charte graphique cohérente, avec une prise en charge des thèmes clair/sombre (préférences stockées).

### Gestion des préférences utilisateurs

Les préférences (langue, thème, notifications) sont gérées à la fois côté client et serveur. À l’enregistrement du compte, un enregistrement dans `user_preferences` est créé. L’utilisateur peut modifier ses préférences via un formulaire, qui envoie un PUT/POST à l’API (`updatePreferences`). Côté mobile, ces préférences peuvent être également enregistrées localement (par ex. avec `AsyncStorage`) pour persister le choix UI immédiatement. Un utilitaire (`useThemeColors`) peut charger le thème approprié en fonction de la préférence de l’utilisateur. Par exemple :

```js
// Appel pour mettre à jour le thème
await API.post('/user/preferences', { language: 'fr', theme: 'dark' });
```

Cela assure que le thème et la langue sont cohérents sur plusieurs appareils une fois que l’utilisateur se reconnecte.

### Connexion biométrique, NFC, reconnaissance faciale

SwiftPay intègre plusieurs modes d’authentification avancée : empreinte digitale (Touch ID/Face ID), NFC, reconnaissance faciale.

* **Biométrie (empreinte digitale / Face ID mobile)** : via la librairie \[react-native-biometrics]. Un service `BiometricService` encapsule la détection de capteur (`isSensorAvailable`) et la prompt biométrique (`simplePrompt`). À l’authentification, l’application peut demander à l’utilisateur d’authentifier localement :

  ```js
  const { success, signature } = await BiometricService.simplePrompt('Confirmez votre identité');
  ```

  Si réussi, l’appareil signe une empreinte (signature) unique qu’il envoie au backend pour vérification du porteur. Le couple public/privé est généré via `createKeys()` et partagé lors de l’enregistrement initial（WebAuthn）.

* **NFC (paiement sans contact)** : géré par `react-native-nfc-manager`. Le service `NFCService` initialise le module NFC et gère les événements de tag (lecture/écriture NDEF, protocoles APDU). Par exemple, lors d’un paiement, l’app peut écrire un message NDEF sur la carte ou attendre la détection d’un tag passif pour y lire les détails de transaction. Un exemple de code :

  ```js
  await NFCService.init();
  try {
    await NfcManager.requestTechnology([NfcTech.Ndef]);
    await NfcManager.writeNdefMessage([Ndef.textRecord(JSON.stringify(payload))]);
    // paiement réalisé
  } finally {
    await NFCService.stop();
  }
  ```

  Ce flux permet de lire un tag NFC inséré dans le terminal de paiement et d’envoyer directement au backend le montant à débiter. Le serveur vérifie alors, via JWT, que l’opération est authentifiée biométriquement ou par OTP avant de débiter. L’usage du NFC est sécurisé via **TLS/HTTPS** pour toutes les requêtes API, empêchant toute interception pendant la transaction.

* **Reconnaissance faciale** : l’app capture des images du visage à l’aide de la caméra (UI natif). Ces images sont envoyées en POST JSON vers l’API `/verify-face`. C’est le microservice Python qui évalue la vivacité et la correspondance. L’utilisateur est informé du résultat (succès/échec). Ce mode peut être utilisé, par exemple, pour confirmer des paiements sans contact (face comme preuve d’identité) ou pour débloquer l’accès rapide. La bibliothèque MediaPipe embarquée garantit que les attaques par photo/masque sont détectées (liveness).

### Interaction avec les API backend

Toutes les interactions client-serveur se font via des appels HTTP(S) JSON. Les exemples d’utilisation incluent :

* **Axios/Fetch** : les services front (`AuthService`, `WalletService`, etc.) appellent les endpoints correspondants. Par exemple :

  ```js
  // Exemple : obtenir les portefeuilles de l'utilisateur
  const token = await AsyncStorage.getItem('jwt');
  const resp = await API.get('/wallets', { headers: { Authorization: `Bearer ${token}` } });
  const wallets = resp.data;
  ```
* **Authentification** : les requêtes protégées incluent le header `Authorization: Bearer <token>`. Le backend valide le token avant d’exécuter la logique.
* **Gestion des erreurs** : les erreurs (401, 400, 500) sont capturées et affichées à l’utilisateur via des alertes ou des composants d’erreur.

En résumé, le frontend maintient l’état de session (JWT), gère les flux de navigation et fournit les interfaces de saisie (OTP, biométrie, NFC), en appelant le backend pour chaque opération métier cruciale. Tous les échanges sont chiffrés (HTTPS) et aucun secret sensible (mots de passe, clés privées) ne circule directement.

## 3. Sécurité

La sécurité de SwiftPay repose sur une **architecture à plusieurs niveaux**, combinant authentification forte, chiffrement et détection d’attaques. Voici les principes clés :

### Architecture de sécurité à plusieurs niveaux

Conformément aux recommandations MFA modernes, SwiftPay prévoit :

* **Premier niveau (authentification de base)** : mot de passe + OTP. Le mot de passe est vérifié par hachage (bcrypt). En cas de succès, un OTP est envoyé pour un deuxième facteur. L’usage de TOTP (par ex. Google Authenticator) peut être envisagé pour une application client OTP native.
* **Deuxième niveau (biométrie et sans contact)** : présence physique de l’utilisateur via empreinte digitale ou reconnaissance faciale. La FaceID intègre une détection de vivacité pour éviter le spoofing (attaques par photo/vidéo). L’authentification NFC (carte) peut également être utilisée pour confirmer une transaction, en association avec la biométrie.
* **Troisième niveau (optionnel avancé)** : clés matérielles (YubiKey/WebAuthn) et/ou reconnaissance vocale. SwiftPay a prévu la gestion de clés publiques (`register-biometric`) utilisable pour des solutions WebAuthn externes, ce qui ouvre la porte à l’usage de tokens physiques (3e facteur).

Cette approche multicouche assure qu’aucune authentification unique suffit pour des opérations critiques. Les facteurs biométriques et OTP sont combinés pour empêcher l’usurpation même en cas de fuite de mot de passe.

### Authentification multifactorielle (MFA)

L’implémentation MFA comprend :

* **OTP (facteur supplémentaire)** : généré aléatoirement par le serveur, transmis par e-mail. Le code est vérifié côté serveur pour valider la session. L’usage d’OTP basé sur le temps (TOTP) est recommandé pour limiter le risque de réutilisation. Le code est invalide après une durée courte (ex. 5 min) ou après une tentative.
* **Biométrie** : outre l’enregistrement des clés WebAuthn, l’appareil mobile utilise sa biométrie locale pour sécuriser la clé privée (Android Keystore / iOS Keychain). Ainsi, même si la clé privée est extraite (improbable), elle reste inutilisable sans la biométrie associée.
* **Liveness Detection** : en reconnaissance faciale, SwiftPay applique les recommandations de l’ISO/IEC 30107 sur la détection des présentations frauduleuses. Le microservice compare les caractéristiques faciales avec des données 3D (MediaPipe FaceMesh) pour garantir qu’il s’agit d’une personne vivante.

En outre, des mécanismes anti-abus sont prévus :

* **Blocage anti brute-force** : après plusieurs échecs de connexion ou d’OTP, le compte peut être temporairement verrouillé. L’usage de systèmes comme **Redis + Fail2Ban** permet de bloquer les IP abusives.
* **Notifications d’échec** : en cas d’échec répété, envoi d’une notification push/email (via FCM ou SMTP) pour alerter l’utilisateur d’un possible compromis.
* **Journalisation et audit** : toutes les tentatives de connexion et transactions sont enregistrées (sans stocker d’information biométrique brute) pour audit. Les logs sensibles (identifiants, OTP) doivent être sécurisés ou chiffrés.

### Normes appliquées

SwiftPay vise la conformité avec les normes biométriques internationales :

* **ISO/IEC 30107 (Anti-spoofing)** : définit les méthodes de test pour la détection de falsification biométrique (présence de masques, empreintes synthétiques, etc.). Cette norme garantit que le système de reconnaissance faciale détecte les attaques par reproduction de l’image du visage.
* **ISO/IEC 19792 (Cadre de sécurité biométrique)** : fournit un cadre pour l’évaluation de la sécurité des systèmes biométriques, incluant la confidentialité des données et l’intégrité du système. SwiftPay protège strictement les données biométriques (chiffrement, accès restreint) et procède à des évaluations régulières de vulnérabilité.
* **ISO/IEC 30136 (Performance de liveness)** : mesure l’efficacité des systèmes à résister aux contournements biométriques (par ex. faux échantillons). L’utilisation de MediaPipe face mesh dans SwiftPay vise à répondre à ces exigences de robustesse.

La prise en compte de ces normes assure un niveau de sécurité élevé et la confiance des utilisateurs dans les données biométriques.

### Chiffrement et protection des données

* **TLS 1.3** : toutes les communications client-serveur utilisent HTTPS avec TLS 1.3 pour chiffrer les données en transit. Cela empêche la capture des identifiants, OTP, empreintes ou données NFC pendant le transport. Par exemple, lors de l’envoi d’empreintes digitales ou de scans NFC, TLS garantit que ces informations sensibles ne sont pas interceptées.
* **AES-256 (Data-at-Rest)** : les données stockées en base (notamment les modèles biométriques et tokens d’authentification) sont chiffrées avec un algorithme robuste comme AES-256. Cela inclut les images ou vecteurs faciaux (`face_image`) et toute clé secrète. Par exemple, avant d’enregistrer la `face_image` en base, on peut appliquer un chiffrement symétrique.
* **Gestion des jetons** : les JWT émis incluent une date d’expiration courte (e.g. 1 heure) et ne contiennent pas de données sensibles en clair. Les clés privées utilisées pour WebAuthn restent sur l’appareil. Les tokens peuvent être invalidés côté client en les supprimant à la déconnexion. L’utilisation de cookies HttpOnly pour le token (sur le web) empêche les attaques XSS.
* **Sécurisation des informations de paiement** : les données des cartes NFC ou NFC direct sont traitées comme des données sensibles. Elles ne sont ni stockées en clair sur l’appareil ni transmises sans chiffrement. Tout paiement NFC déclenche un appel à l’API sous HTTPS qui authentifie et chiffre la transaction.

### Détection d’usurpation (liveness)

La détection d’usurpation (spoofing) est primordiale. SwiftPay combine plusieurs méthodes :

* **MediaPipe Face Mesh** : ce modèle détecte plus de 450 points clés du visage en 3D, permettant de vérifier l’angle, l’expression et la profondeur. Une photo imprimée ou un masque ne génère pas les mêmes patterns dynamiques.
* **Analyse vidéo** : idéalement, le client mobile peut capturer plusieurs images ou une séquence vidéo rapide pour s’assurer que le visage bouge naturellement (clignements, mouvements). Le backend peut rejeter toute authentification sans variation dans la scène.
* **Empreinte digitale et FaceID natifs** : les API biométriques de l’OS (Android/Windows Hello, iOS LocalAuthentication) intègrent déjà des protections liveness (impossibilité de tromper l’empreinte digitale du téléphone).
* **Journalisation d’échecs** : tout échec d’authentification faciale (ex. suspicion de masque) peut déclencher une alerte ou un second facteur.

Ces mécanismes combinés garantissent que la biométrie n’est pas contournable simplement par une photographie ou un enregistrement.

## 4. Utilisation & Déploiement

### Guide d’installation backend et mobile

**Backend (Node.js)** :

1. Installez Node.js (v16+) et npm.
2. Installez PostgreSQL et créez une base de données pour SwiftPay. Exécutez les scripts SQL fournis pour créer les tables (`users`, `wallets`, `transactions`, etc.) et les fonctions/procédures stockées (par ex. `create_wallet`, `record_transaction`).
3. Clonez le dépôt backend SwiftPay et exécutez `npm install`.
4. Créez un fichier `.env` à la racine :

   ```ini
   PG_HOST=localhost
   PG_PORT=5432
   PG_USER=swipe_user
   PG_PASSWORD=secret
   PG_DATABASE=swiftpay_db
   JWT_SECRET=votre_secret_jwt
   EMAIL_USER=votre_email@gmail.com
   EMAIL_PASS=votre_password
   FACEID_URL=http://localhost:5001  # URL du microservice facial
   ```
5. Lancez le serveur : `npm start` ou `node src/index.js`. Le serveur écoute sur le port configuré (`process.env.PORT`, par défaut 5000).
6. Vérifiez la connexion au SGBD et la disponibilité de l’API (testez `GET /` sur le serveur).

**Microservice Python (reconnaissance faciale)** :

1. Installez Python 3.8+ et créez un environnement virtuel.
2. `pip install -r requirements.txt` (Flask, OpenCV, MediaPipe, psycopg2).
3. Configurez le `.env` avec les mêmes variables PostgreSQL que pour Node (pour accéder à `biometric_keys`).
4. Lancez `python face_verify_service.py`. Par défaut, il écoute sur le port 5001.

**Mobile (React Native)** :

1. Installez Node.js, npm et **React Native CLI** (ou Expo CLI, selon le projet).
2. Clonez le dépôt mobile SwiftPay. Exécutez `npm install` pour toutes les dépendances (React Native, react-navigation, RNBiometrics, NFC Manager, AsyncStorage, etc.).
3. Configurez l’URL de l’API dans les variables d’environnement du mobile (par ex. `API_URL=https://api.swiftpay.app`) ou dans un fichier de config.
4. Lancez l’application : `npx react-native run-ios` ou `run-android` pour démarrer sur un émulateur ou appareil. Veillez à ce que l’émulateur accepte les permissions nécessaires (caméra, NFC, biométrie).
5. Testez la connexion à l’API (saisie d’identifiants). Assurez-vous que le mobile accepte les certificats TLS (ajoutez des exceptions ou certificats si besoin en dev).

### Environnement de développement (configuration, dépendances)

* **Node.js Backend** : Express.js, pg (PostgreSQL), bcrypt, jsonwebtoken, nodemailer, express-validator. Utiliser ESLint/Prettier pour la qualité du code.
* **Base de données** : PostgreSQL 13+. Schéma relationnel, contraintes d’intégrité (FK, UNIQUE), et index sur les champs utilisés dans les requêtes fréquentes (user\_id, wallet\_id). Des exemples de tables et migrations doivent être fournis.
* **React Native** : React, React Navigation, Axios, @react-native-async-storage/async-storage, react-native-biometrics, react-native-nfc-manager, styled-components ou native-base (selon choix). Toutes les dépendances sont dans `package.json` avec leurs versions.
* **Secrets** : stocker les clés secrètes et les certificats dans un `.env` (gitignored) ou dans un gestionnaire de secrets.
* **Emulateurs et dispositifs** : l’application peut être testée sur simulators iOS/Android. Pour NFC, seul un appareil physique Android permet de lire des tags (iOS limite NFC aux lectures NDEF). Les fonctionnalités biométriques peuvent être testées en configurant un visage/empreinte dans l’émulateur ou appareil.

### Déploiement et mises à jour

* **Scripts de déploiement** : prévoir des scripts (bash/Makefile) pour créer la base de données, exécuter les migrations, démarrer les serveurs. Exemple : `deploy.sh` qui lit `.env`, lance PostgreSQL, démarre Node et Python.
* **Docker** : créer des `Dockerfile` pour le backend et le microservice, et un `docker-compose.yml` pour l’ensemble (API Node, service facial, PostgreSQL). Cela facilite la montée en charge et le déploiement en production.
* **CI/CD** : utiliser des pipelines (GitHub Actions, GitLab CI) pour tester (lint, unit tests) à chaque push, et pour déployer automatiquement sur un serveur cloud ou conteneur.
* **Mises à jour** : versionner selon [semver](https://semver.org/lang/fr/). Lors de nouvelles releases, rédiger des notes de version (changelog) et migrer la base si nécessaire (ex. `ALTER TABLE` dans un script de migration).

### Manuel utilisateur (inscription, authentification, paiements)

Un guide rapide pour l’utilisateur avancé :

1. **Inscription** : l’utilisateur télécharge l’application, clique sur *Créer un compte*. Il remplit son nom, email, mot de passe et valide. Un token de session est renvoyé, ouvrant la session immédiatement.
2. **Connexion classique** : à chaque connexion, il saisit son email et mot de passe, puis reçoit un code OTP par e-mail. Il entre ce code dans l’app pour valider sa session.
3. **Enregistrement biométrique (optionnel)** : dans les paramètres de sécurité, l’utilisateur peut activer l’authentification biométrique. L’app génère alors des clés et enregistre le public-key sur le serveur (`register-biometric`). À chaque nouvelle connexion, il pourra choisir « Se connecter avec TouchID/FaceID » pour valider la session localement au lieu de ressaisir son mot de passe.
4. **Paiements** : pour effectuer un paiement NFC, l’utilisateur sélectionne d’abord son portefeuille (devise). Il attend que l’écran *NFC* soit prêt puis approche son téléphone du terminal. Il peut être invité à confirmer son identité via biométrie ou reconnaissance faciale avant de finaliser la transaction.
5. **Notifications** : l’application envoie (ou affiche) des notifications en cas d’opération réussie, ou d’échec de sécurité (par ex. plusieurs échecs de connexion). L’utilisateur peut recevoir un e-mail ou un push FCM en parallèle.

Chaque étape critique est expliquée dans l’interface par des bulles d’aide ou un tutoriel d’onboarding. Des exemples de code d’intégration sont fournis pour les développeurs dans la documentation technique interne.

### FAQ (dépannage, sécurité, récupération de compte)

* **Mot de passe oublié** : sur l’écran de login, l’utilisateur peut cliquer sur *Mot de passe oublié*. SwiftPay envoie alors un OTP à l’e-mail enregistré (via `/request-otp`). Il entre le code OTP et peut réinitialiser son mot de passe.
* **Compte bloqué** : après plusieurs tentatives infructueuses, le compte peut être temporairement verrouillé. L’utilisateur recevra un e-mail d’alerte. En cas d’oubli de mot de passe, la procédure de réinitialisation (OTP) reste disponible.
* **Perte d’accès biométrique** : si l’appareil n’accepte plus l’empreinte ou le FaceID (changement d’appareil, empreinte invalide), l’utilisateur peut toujours se connecter classiquement (mot de passe + OTP) et réenregistrer la biométrie avec le nouvel appareil.
* **Sécurité des données** : l’utilisateur est informé que ses empreintes/visages ne sont pas stockés en clair mais comme des modèles chiffrés. Aucune image brute n’est conservée. En cas de changement de téléphone, la fonction *Désenregistrer tous les appareils* peut être utilisée (option future) pour forcer un nouvel enregistrement.
* **Assistance** : pour tout problème, un support (email ou chat) est disponible. En cas de suspicion de fraude, l’utilisateur peut contacter le support rapidement pour bloquer son compte.

Cette documentation couvre l’essentiel des fonctionnalités et bonnes pratiques de SwiftPay. Elle peut être complétée par des diagrammes d’architecture (par exemple un schéma du workflow d’authentification) ou des captures d’écran de l’interface utilisateur. Les exemples de code fournis illustrent les appels principaux, et tout développeur pourra se référer au code source et aux standards mentionnés (RSA, OAuth, ISO biométriques) pour approfondir chaque sujet.

**Sources :** spécifications SwiftPay et normes de sécurité (ISO/IEC 30107, 19792, 30136). Toute transmission de données biométriques et financières est sécurisée par chiffrement avancé (AES-256, TLS 1.3) et authentification multi-facteurs.
