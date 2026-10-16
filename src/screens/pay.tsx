// Parcours de paiement NFC pair-à-pair et vérification faciale.
// Reprend l'enchaînement des écrans React Native :
//   envoi    : SenderRead -> SendForm -> (biométrie) -> FaceIDAuth -> EmitterEmulator -> SenderSuccess
//   réception: ReceiverEmulator -> ReceiverConfirm
// NFC (react-native-nfc-manager, NDEF + HCE/APDU) et caméra (vision-camera) sont simulés :
// l'échange de charges utiles JSON est reproduit à l'identique, sans matériel.
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { useNav } from '../nav';
import { DEMO_USER, PEERS, checkTransfer, fmt, useStore } from '../store';
import { Header, Screen } from './common';

function Phones({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={'phones' + (active ? ' touch' : '')} aria-hidden="true">
      <div className="ph a"><span className="ph-l">Vous</span></div>
      <div className="waves"><span /><span /><span /></div>
      <div className="ph b"><span className="ph-l">{label}</span></div>
    </div>
  );
}

function Payload({ data, dir }: { data: unknown; dir: string }) {
  return (
    <div className="payload">
      <div className="payload-h">{dir}</div>
      <code>{JSON.stringify(data)}</code>
    </div>
  );
}

export function SenderRead() {
  const { replace, goBack } = useNav();
  const [peer] = useState(() => PEERS[Math.floor(Math.random() * PEERS.length)]);
  const [reading, setReading] = useState(false);
  const [data, setData] = useState<{ userId: string } | null>(null);
  const tap = () => {
    setReading(true);
    window.setTimeout(() => setData({ userId: peer.userId }), 900);
    window.setTimeout(() => replace('SendForm', { receiverId: peer.userId, label: peer.label }), 2100);
  };
  return (
    <Screen>
      <Header title="Envoyer" back />
      <div className="flow">
        <Phones active={reading} label={peer.label} />
        <p className="flow-t">{data ? 'Destinataire lu' : 'Approchez pour lire le destinataire…'}</p>
        <p className="muted small center-t">Lecture d'un message NDEF diffusé par le téléphone du destinataire (émulation de carte HCE).</p>
        {data && <Payload dir="NDEF reçu" data={data} />}
        {!reading && <button className="btn-accent wide" onClick={tap}><Icon name="nfc" size={20} color="#000" /> Approcher le téléphone du destinataire (simulé)</button>}
        {!reading && <button className="link" onClick={goBack}>Annuler</button>}
      </div>
    </Screen>
  );
}

export function SendForm() {
  const { route, navigate, alert, biometric, goBack } = useNav();
  const { s, active } = useStore();
  const receiverId = route.params?.receiverId as string;
  const [inputId, setInputId] = useState(receiverId);
  const [amount, setAmount] = useState('25');
  const onValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputId.trim().toUpperCase() !== receiverId) return alert({ title: 'ID non reconnu', message: "Vérifiez l'identifiant" });
    const a = parseFloat(amount.replace(',', '.'));
    const errs = checkTransfer(s, receiverId, a);
    if (errs.length) return alert({ title: 'Paiement refusé', message: errs.join(' ; ') });
    biometric({
      message: 'Validez le paiement',
      onResult: (ok) => {
        if (ok) navigate('FaceIDAuth', { receiverId, amount: a });
        else { alert({ title: 'Échec auth', message: 'Paiement annulé' }); goBack(); }
      },
    });
  };
  return (
    <Screen>
      <Header title="Paiement" back />
      <form className="flow form" onSubmit={onValidate}>
        <div className="recv-card"><Icon name="person" size={22} color="var(--primary)" /><div><div className="b-name">{(route.params?.label as string) ?? 'Destinataire'}</div><div className="b-id">lu par NFC · {receiverId}</div></div></div>
        <label className="lbl" htmlFor="sf-id">ID bénéficiaire</label>
        <input id="sf-id" className="field" value={inputId} onChange={(e) => setInputId(e.target.value)} placeholder="ID bénéficiaire" />
        <label className="lbl" htmlFor="sf-a">Montant ({active.currency})</label>
        <input id="sf-a" className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant" />
        <p className="muted small">Solde {fmt(active.balance)} {active.currency} · max 1 000 par envoi, 5 000 par jour, 50 000 par mois.</p>
        <button type="submit" className="btn-primary wide">Valider</button>
      </form>
    </Screen>
  );
}

// Points 2D simulés de l'œil (ordre MediaPipe : p1 coin, p2/p3 haut, p4 coin, p5/p6 bas)
function eyePoints(open: number, cx: number) {
  const h = 9 * open;
  return [[cx - 15, 0], [cx - 6, -h], [cx + 6, -h], [cx + 15, 0], [cx + 6, h], [cx - 6, h]].map(([x, y]) => [x, y + 92]);
}
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** EAR = (|p2-p6| + |p3-p5|) / (2 |p1-p4|), comme eye_aspect_ratio() du service Flask. */
function ear(p: number[][]) { return (dist(p[1], p[5]) + dist(p[2], p[4])) / (2 * dist(p[0], p[3])); }

const EAR_THRESHOLD = 0.25;
const BLINK_REQUIRED = 1;
const MATCH_THRESHOLD = 0.03;

function Face({ open, scanning }: { open: number; scanning: boolean }) {
  const L = eyePoints(open, 72), R = eyePoints(open, 128);
  const path = (p: number[][]) => `M${p[0][0]},${p[0][1]} Q${p[1][0] + 6},${p[1][1] - 4} ${p[3][0]},${p[3][1]} Q${p[4][0] - 6},${p[4][1] + 4} ${p[0][0]},${p[0][1]}Z`;
  return (
    <svg viewBox="0 0 200 200" className="face-svg" role="img" aria-label="Visage de synthèse (aucune caméra utilisée)">
      <rect width="200" height="200" fill="#2b2140" />
      <ellipse cx="100" cy="108" rx="58" ry="72" fill="#c99a76" />
      <path d="M42 92c0-46 22-62 58-62s58 16 58 62c-8-22-26-34-58-34S50 70 42 92Z" fill="#2a1d14" />
      <path d={path(L)} fill="#fff" /><path d={path(R)} fill="#fff" />
      {open > 0.3 && <><circle cx="72" cy="92" r={4.5 * open} fill="#3b2a1d" /><circle cx="128" cy="92" r={4.5 * open} fill="#3b2a1d" /></>}
      <path d="M100 100v24l-6 4" stroke="#a87b5a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M82 146q18 12 36 0" stroke="#8a4b3d" strokeWidth="4" fill="none" strokeLinecap="round" />
      {scanning && [...L, ...R].map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.2" fill="#9ee37d" />)}
      {scanning && <rect className="scanline" x="30" width="140" height="3" fill="#9ee37d" opacity=".7" />}
    </svg>
  );
}

type Frame = { i: number; ear: number };

export function FaceIDAuth() {
  const { route, replace, alert, goBack } = useNav();
  const receiverId = route.params?.receiverId as string;
  const amount = route.params?.amount as number;
  const [phase, setPhase] = useState<'idle' | 'capture' | 'verify'>('idle');
  const [open, setOpen] = useState(1);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [noBlink, setNoBlink] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const start = () => {
    setPhase('capture'); setFrames([]);
    // 10 captures espacées de 300 ms, comme captureAndVerify()
    const openness = Array.from({ length: 10 }, (_, i) => (noBlink ? 1 : i === 4 || i === 5 ? 0.18 : i === 6 ? 0.6 : 1) * (0.94 + Math.random() * 0.1));
    openness.forEach((o, i) => {
      timers.current.push(window.setTimeout(() => {
        setOpen(o);
        const e = (ear(eyePoints(o, 72)) + ear(eyePoints(o, 128))) / 2;
        setFrames((f) => [...f, { i, ear: e }]);
      }, 300 * (i + 1)));
    });
    timers.current.push(window.setTimeout(() => {
      setOpen(1); setPhase('verify');
      const ears = openness.map((o) => (ear(eyePoints(o, 72)) + ear(eyePoints(o, 128))) / 2);
      let blinks = 0, wasClosed = false;
      for (const e of ears) { if (e < EAR_THRESHOLD) wasClosed = true; else if (wasClosed) { blinks++; wasClosed = false; } }
      const d = unknown ? 0.05 + Math.random() * 0.02 : 0.011 + Math.random() * 0.008;
      timers.current.push(window.setTimeout(() => {
        setPhase('idle');
        if (blinks < BLINK_REQUIRED) return alert({ title: 'Face ID', message: `Seulement ${blinks} clignements détectés, échec de la vérification.` });
        if (d >= MATCH_THRESHOLD) return alert({ title: 'Face ID', message: `Visage non reconnu (distance moyenne des repères ${d.toFixed(3)} ≥ ${MATCH_THRESHOLD}).` });
        replace('Emitter', { receiverId, amount, blinks, d });
      }, 1300));
    }, 300 * 11));
  };

  const busy = phase !== 'idle';
  const last = frames[frames.length - 1];
  return (
    <Screen>
      <div className="hdr hdr-solid"><button className="icon-btn" onClick={goBack} aria-label="Annuler" disabled={busy}><Icon name="close" size={26} color="#fff" /></button><span className="hdr-logo">SwiftPay</span><span style={{ width: 36 }} /></div>
      <div className="flow">
        <h2 className="face-title">Face ID · Vérification</h2>
        <div className="face-frame">
          <Face open={open} scanning={phase === 'capture'} />
          {busy && <div className={'face-overlay' + (phase === 'capture' ? ' cap' : '')}><div className="spinner light" /><span>{phase === 'capture' ? 'Clignez…' : 'Vérification…'}</span></div>}
        </div>
        <div className="ear-box" aria-live="polite">
          <div className="ear-h"><span>EAR {last ? last.ear.toFixed(3) : '-'}</span><span>seuil {EAR_THRESHOLD}</span><span>{frames.length}/10 images</span></div>
          <div className="ear-bars" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => { const f = frames[i]; const h = f ? Math.min(1, f.ear / 0.4) : 0; return <span key={i} className={f && f.ear < EAR_THRESHOLD ? 'closed' : ''} style={{ height: `${h * 100}%` }} />; })}
            <i style={{ bottom: `${(EAR_THRESHOLD / 0.4) * 100}%` }} />
          </div>
        </div>
        <button className="btn-face" onClick={start} disabled={busy}><Icon name="camera" size={22} color="#fff" /> {busy ? 'Patientez…' : 'Démarrer'}</button>
        <fieldset className="sim-opts" disabled={busy}>
          <legend>Scénarios de test</legend>
          <label><input type="checkbox" checked={noBlink} onChange={(e) => setNoBlink(e.target.checked)} /> Ne pas cligner (photo figée)</label>
          <label><input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} /> Visage différent de la référence</label>
        </fieldset>
        <p className="muted small center-t">Visage de synthèse animé : aucune caméra n'est utilisée. Le calcul EAR et la règle « 1 clignement » reprennent le service Flask/MediaPipe.</p>
      </div>
    </Screen>
  );
}

export function Emitter() {
  const { route, replace } = useNav();
  const { dispatch, active } = useStore();
  const receiverId = route.params?.receiverId as string;
  const amount = route.params?.amount as number;
  const [ack, setAck] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setAck(true), 1800);
    return () => window.clearTimeout(t1);
  }, []);
  useEffect(() => {
    if (!ack || done.current) return;
    done.current = true;
    dispatch({ type: 'send', to: receiverId, amount });
    const t = window.setTimeout(() => replace('SenderSuccess', { receiverId, amount, currency: active.currency }), 900);
    return () => window.clearTimeout(t);
  }, [ack, dispatch, receiverId, amount, replace, active.currency]);
  return (
    <Screen>
      <div className="flow center-flow">
        <Phones active label={receiverId} />
        <p className="flow-t">{ack ? 'Accusé de réception reçu' : 'Envoi en cours…'}</p>
        <Payload dir="APDU émis (HCE)" data={{ userId: receiverId, amount }} />
        {ack && <Payload dir="NDEF reçu" data={{ ack: true }} />}
      </div>
    </Screen>
  );
}

export function SenderSuccess() {
  const { route, reset } = useNav();
  const p = route.params as { receiverId: string; amount: number; currency: string };
  return (
    <Screen>
      <div className="flow center-flow">
        <div className="ok-badge"><Icon name="check" size={48} color="#fff" stroke={3} /></div>
        <p className="success-t">Paiement réussi</p>
        <div className="receipt">
          <div><span>Montant</span><b>{fmt(p.amount)} {p.currency}</b></div>
          <div><span>Destinataire</span><b>{p.receiverId}</b></div>
          <div><span>Canal</span><b>NFC + Face ID</b></div>
          <div><span>Date</span><b>{new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</b></div>
        </div>
        <button className="btn-primary wide" onClick={() => reset('Dashboard')}>Accueil</button>
      </div>
    </Screen>
  );
}

export function ReceiverEmulator() {
  const { replace, goBack } = useNav();
  const [peer] = useState(() => PEERS[Math.floor(Math.random() * PEERS.length)]);
  const [amount] = useState(() => Math.round((5 + Math.random() * 145) * 100) / 100);
  const [touch, setTouch] = useState(false);
  const approach = () => {
    setTouch(true);
    window.setTimeout(() => replace('ReceiverConfirm', { amount, from: peer.userId }), 2000);
  };
  return (
    <Screen>
      <Header title="Recevoir" back />
      <div className="flow">
        <Phones active={touch} label={peer.label} />
        <p className="flow-t">Prêt à recevoir…</p>
        <Payload dir="Message diffusé (HCE)" data={{ userId: DEMO_USER.id }} />
        {touch && <Payload dir="NDEF reçu" data={{ userId: DEMO_USER.id, amount }} />}
        {!touch && <button className="btn-recv wide" onClick={approach}><Icon name="nfc" size={20} color="#000" /> Simuler un payeur qui approche</button>}
        {!touch && <button className="link" onClick={goBack}>Annuler</button>}
      </div>
    </Screen>
  );
}

export function ReceiverConfirm() {
  const { route, reset } = useNav();
  const { dispatch, active } = useStore();
  const amount = route.params?.amount as number;
  const from = route.params?.from as string;
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    dispatch({ type: 'receive', from, amount });
  }, [dispatch, from, amount]);
  return (
    <Screen>
      <div className="flow center-flow">
        <div className="ok-badge green"><Icon name="downc" size={48} color="#000" stroke={2.2} /></div>
        <p className="success-t">Montant reçu : {fmt(amount)} {active.currency}</p>
        <p className="muted">de {from} · accusé de réception renvoyé</p>
        <Payload dir="APDU renvoyé" data={{ ack: true }} />
        <button className="btn-primary wide" onClick={() => reset('Dashboard')}>Terminer</button>
      </div>
    </Screen>
  );
}
