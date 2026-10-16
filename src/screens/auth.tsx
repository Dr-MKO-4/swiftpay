// Splash, Connexion, Biométrie, OTP : chaîne d'authentification de l'app
// (LoginScreen -> FingerprintScreen -> OTPEnterScreen), simulée en local.
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { useNav } from '../nav';
import { DEMO_USER } from '../store';

export function Splash() {
  const { replace } = useNav();
  useEffect(() => {
    const t = window.setTimeout(() => replace('Login'), 2300);
    return () => window.clearTimeout(t);
  }, [replace]);
  return (
    <div className="screen splash" onClick={() => replace('Login')}>
      <img src="/logo.webp" alt="SwiftPay" className="splash-logo" />
      <p className="splash-sub">Paiement sans contact pair-à-pair</p>
    </div>
  );
}

export function Login() {
  const { navigate, alert } = useNav();
  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) return alert({ title: 'Erreur', message: 'Tous les champs sont requis' });
    setLoading(true);
    // Le backend renvoie otpRequired: true -> passage par l'empreinte puis l'OTP
    window.setTimeout(() => { setLoading(false); navigate('Fingerprint', { email }); }, 700);
  };

  return (
    <form className="screen login" onSubmit={handleLogin}>
      <div className="login-anim" aria-hidden="true">
        <div className="login-circle"><Icon name="lock" size={54} color="#552594" stroke={1.6} /></div>
      </div>
      <h1 className="login-title"><Icon name="login" size={30} color="var(--violet)" /> Connexion</h1>
      <label className="input-row">
        <Icon name="mail" size={20} color="var(--violet)" />
        <span className="sr-only">E-mail</span>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      </label>
      <label className="input-row">
        <Icon name="lock" size={20} color="var(--violet)" />
        <span className="sr-only">Mot de passe</span>
        <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </label>
      <button type="submit" className="btn-primary wide" disabled={loading}>
        <Icon name="login" size={20} color="#fff" /> {loading ? 'Chargement...' : 'Se connecter'}
      </button>
      <button type="button" className="link" onClick={() => alert({ title: 'Inscription', message: "L'inscription (nom, e-mail, mot de passe, capture du visage de référence) n'est pas ouverte dans la démo : utilisez le compte de démonstration." })}>
        Pas de compte ? Inscription
      </button>
      <button type="button" className="link small" onClick={() => alert({ title: 'Mot de passe oublié', message: 'Dans l\'app, un code de réinitialisation est envoyé par e-mail (PasswordResetScreen). Fonction non simulée ici.' })}>
        Mot de passe oublié ?
      </button>
      <p className="hint">Compte de démonstration prérempli : aucun identifiant réel n'est utilisé.</p>
    </form>
  );
}

export function Fingerprint() {
  const { route, replace, biometric, alert } = useNav();
  const email = (route.params?.email as string) ?? DEMO_USER.email;
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    biometric({
      message: 'Confirmez votre identité',
      onResult: (ok) => {
        if (ok) replace('OTP', { email });
        else alert({ title: 'Erreur', message: 'Authentification échouée', buttons: [{ text: 'Retour', onPress: () => replace('Login') }] });
      },
    });
  }, [biometric, replace, alert, email]);
  return (
    <div className="screen center">
      <div className="spinner" role="status" aria-label="Chargement" />
      <p className="muted mt12">Vérification biométrique…</p>
    </div>
  );
}

const newCode = () => String(Math.floor(100000 + Math.random() * 900000));

export function OTP() {
  const { route, reset, alert, toast } = useNav();
  const email = (route.params?.email as string) ?? DEMO_USER.email;
  const [sent, setSent] = useState(newCode);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { toast(`E-mail simulé · Votre code SwiftPay : ${sent}`); }, [sent, toast]);

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return alert({ title: 'Erreur', message: 'Entrez le code OTP' });
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      if (code.trim() === sent) reset('Dashboard');
      else alert({ title: 'Erreur', message: 'OTP invalide' });
    }, 500);
  };

  return (
    <form className="screen otp" onSubmit={verify}>
      <p className="otp-label">Code OTP envoyé à {email}</p>
      <label className="sr-only" htmlFor="otp">Code OTP</label>
      <input id="otp" className="otp-input" inputMode="numeric" maxLength={6} placeholder="Entrez le code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
      <button type="submit" className="btn-primary wide" disabled={loading}>{loading ? '…' : 'Vérifier'}</button>
      <button type="button" className="btn-outline wide" disabled={loading} onClick={() => { const c = newCode(); setSent(c); setCode(''); alert({ title: 'Succès', message: 'Le code OTP a été renvoyé à ' + email }); }}>
        Renvoyer le code
      </button>
      <button type="button" className="link small" onClick={() => setCode(sent)}>Remplir avec le code reçu (démo)</button>
    </form>
  );
}
