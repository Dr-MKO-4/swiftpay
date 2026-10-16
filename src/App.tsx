import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './icons';
import { NavProvider, type AlertSpec, type PromptSpec, type Route } from './nav';
import { StoreProvider, useStore } from './store';
import { Fingerprint, Login, OTP, Splash } from './screens/auth';
import { Beneficiaries, Dashboard, Notifications, Settings, Transactions, Wallet } from './screens/main';
import { Emitter, FaceIDAuth, ReceiverConfirm, ReceiverEmulator, SendForm, SenderRead, SenderSuccess } from './screens/pay';

const SCREENS: Record<string, () => ReactNode> = {
  Splash, Login, Fingerprint, OTP, Dashboard, Transactions, Wallet, Notifications, Beneficiaries, Settings,
  SenderRead, SendForm, FaceIDAuth, Emitter, SenderSuccess, ReceiverEmulator, ReceiverConfirm,
};

function AlertBox({ a, close }: { a: AlertSpec; close: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const buttons = a.buttons ?? [{ text: 'OK', primary: true }];
  return (
    <div className="modal-wrap" role="alertdialog" aria-modal="true" aria-labelledby="al-t" aria-describedby="al-m">
      <div className="modal">
        <h2 id="al-t">{a.title}</h2>
        {a.message && <p id="al-m">{a.message}</p>}
        <div className="modal-btns">
          {buttons.map((b, i) => (
            <button key={b.text} ref={i === buttons.length - 1 ? ref : undefined} className={b.primary || buttons.length === 1 ? 'mb-primary' : 'mb'} onClick={() => { close(); b.onPress?.(); }}>{b.text}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BioPrompt({ p, close }: { p: PromptSpec; close: () => void }) {
  const [state, setState] = useState<'wait' | 'ok'>('wait');
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const ok = () => { setState('ok'); window.setTimeout(() => { close(); p.onResult(true); }, 650); };
  return (
    <div className="modal-wrap bottom" role="dialog" aria-modal="true" aria-labelledby="bio-t">
      <div className="bio">
        <h2 id="bio-t">{p.message}</h2>
        <p className="muted small">Biométrie native du téléphone (simulée)</p>
        <button ref={ref} className={'bio-btn' + (state === 'ok' ? ' ok' : '')} onClick={ok} aria-label="Toucher le capteur d'empreinte">
          <Icon name={state === 'ok' ? 'check' : 'finger'} size={46} color={state === 'ok' ? '#fff' : 'var(--primary)'} stroke={1.6} />
        </button>
        <p className="small">{state === 'ok' ? 'Empreinte reconnue' : 'Touchez le capteur'}</p>
        <button className="mb" onClick={() => { close(); p.onResult(false); }} disabled={state === 'ok'}>Annuler</button>
      </div>
    </div>
  );
}

function Phone({ route, overlays }: { route: Route; overlays: { alert: AlertSpec | null; prompt: PromptSpec | null; toast: string | null; closeAlert: () => void; closePrompt: () => void } }) {
  const { s } = useStore();
  const Cmp = SCREENS[route.name] ?? Dashboard;
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="device">
      <div className="device-screen" data-theme={s.dark ? 'dark' : 'light'}>
        <div className="statusbar" aria-hidden="true"><span>{time}</span><span className="notch" /><span className="sb-icons">NFC · 82 %</span></div>
        <div className="demo-ribbon">Démo · données simulées</div>
        <div className="viewport" key={route.name}><Cmp /></div>
        {overlays.toast && <div className="toast" role="status"><Icon name="mail" size={18} color="#fff" /> {overlays.toast}</div>}
        {overlays.prompt && <BioPrompt p={overlays.prompt} close={overlays.closePrompt} />}
        {overlays.alert && <AlertBox a={overlays.alert} close={overlays.closeAlert} />}
      </div>
    </div>
  );
}

function Side() {
  return (
    <aside className="side">
      <img src="/logo.webp" alt="SwiftPay" className="side-logo" />
      <p className="side-lead">Paiement mobile pair-à-pair sans contact : échange NFC direct, portefeuille interne et authentification en chaîne.</p>
      <ol className="side-steps">
        <li><b>Connexion</b> : mot de passe, empreinte, code à usage unique reçu par e-mail.</li>
        <li><b>Envoyer</b> : touchez le bouton NFC, approchez le téléphone du destinataire, saisissez le montant.</li>
        <li><b>Valider</b> : biométrie puis Face ID avec détection de clignement (vivacité).</li>
        <li><b>Accusé de réception</b> : le destinataire renvoie un ACK, le débit est enregistré.</li>
      </ol>
      <div className="side-note">
        <b>Ce qui est simulé.</b> NFC (NDEF/HCE), biométrie, caméra et e-mail OTP sont reproduits dans le navigateur. Les soldes, identifiants et transactions sont fictifs et restent en mémoire. Les limites de transfert (1 000 / 5 000 / 50 000) et le seuil EAR 0,25 viennent du code du projet.
      </div>
      <p className="side-stack">React Native · NFC · Node.js / Express · Flask · MediaPipe · PostgreSQL</p>
    </aside>
  );
}

export function App() {
  return (
    <StoreProvider>
      <div className="page">
        <NavProvider render={(route, overlays) => <Phone route={route} overlays={overlays} />} />
        <Side />
      </div>
    </StoreProvider>
  );
}
