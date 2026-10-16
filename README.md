# SwiftPay : démo web

Démo web de l'application mobile SwiftPay (React Native) affichée dans un cadre de téléphone sur ordinateur et en plein écran sur mobile.

Tout fonctionne dans le navigateur, sans backend ni matériel :

- **Authentification en chaîne** : mot de passe, biométrie native (invite simulée), code à usage unique « reçu par e-mail » (notification simulée).
- **Paiement NFC pair-à-pair** : lecture NDEF de l'identifiant du destinataire, montant, biométrie, Face ID, émission APDU, accusé de réception. Les charges utiles JSON échangées sont celles de l'app.
- **Face ID** : visage de synthèse animé, aucune caméra. Le rapport d'ouverture des yeux (EAR) est calculé sur des repères simulés avec le seuil 0,25 et la règle « 1 clignement » du service Flask / MediaPipe.
- **Règles métier** reprises du backend : 1 000 par envoi, 5 000 par jour, 50 000 par mois, solde suffisant, pas d'envoi vers soi-même.
- **Historique, portefeuilles, bénéficiaires, notifications, thème sombre** : données fictives en mémoire.

```bash
npm ci
npm run dev
npm run build
node e2e.cjs http://localhost:4174   # parcours Playwright (Edge)
```
