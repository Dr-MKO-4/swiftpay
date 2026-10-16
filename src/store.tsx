// État en mémoire de la démo : reproduit les entités du backend SwiftPay
// (wallets, transactions, beneficiaries, notifications) et ses règles métier
// (backend/src/services/transferService.js), sans aucun appel réseau.
import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

export type TxType = 'transfer' | 'transfer_received' | 'receive' | 'deposit';
export interface Wallet { wallet_id: number; currency: string; balance: number }
export interface Transaction {
  id: number;
  wallet_id: number;
  type: TxType;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  related: string | null;
  channel: 'NFC' | 'Dépôt' | 'Transfert';
  created_at: number;
}
export interface Beneficiary { id: number; userId: string; nickname: string; added_at: number }
export interface Notif { id: number; title: string; body: string; read: boolean; created_at: number; kind: 'tx' | 'security' | 'info' }

// Limites reprises telles quelles de transferService.js (TRANSFER_LIMITS)
export const TRANSFER_LIMITS = { single: 1000, daily: 5000, monthly: 50000 };

export const DEMO_USER = {
  id: 'SP-1024',
  username: 'utilisateur.demo',
  fullName: 'Utilisateur Démo',
  email: 'demo@exemple.org',
  phone: '6XX XXX XXX',
};

// Correspondants fictifs (identifiants SwiftPay inventés)
export const PEERS = [
  { userId: 'SP-4821', label: 'Boutique Exemple' },
  { userId: 'SP-3307', label: 'Client démo B' },
  { userId: 'SP-5590', label: 'Marché fictif C' },
  { userId: 'SP-2716', label: 'Collègue démo' },
];

export const isCredit = (t: TxType) => t !== 'transfer';

interface State {
  wallets: Wallet[];
  ownWalletId: number;
  transactions: Transaction[];
  beneficiaries: Beneficiary[];
  notifications: Notif[];
  dark: boolean;
  biometrics: boolean;
  pushEnabled: boolean;
  nextId: number;
}

const H = 3600_000;
const D = 24 * H;

function seed(): State {
  const now = Date.now();
  const raw: Array<[number, TxType, number, string, string | null, Transaction['channel']]> = [
    [2 * H, 'transfer', 45, 'Envoi à SP-4821', 'SP-4821', 'NFC'],
    [7 * H, 'receive', 120, 'Réception NFC de SP-3307', 'SP-3307', 'NFC'],
    [1 * D + 3 * H, 'transfer', 18.5, 'Envoi à SP-5590', 'SP-5590', 'NFC'],
    [2 * D + 5 * H, 'deposit', 500, 'Dépôt sur le portefeuille', null, 'Dépôt'],
    [3 * D + 1 * H, 'transfer', 72, 'Envoi à SP-2716', 'SP-2716', 'NFC'],
    [4 * D + 9 * H, 'transfer_received', 35, 'Transfert reçu de SP-2716', 'SP-2716', 'Transfert'],
    [6 * D + 2 * H, 'transfer', 230, 'Envoi à SP-4821', 'SP-4821', 'NFC'],
    [8 * D + 4 * H, 'receive', 64, 'Réception NFC de SP-5590', 'SP-5590', 'NFC'],
    [11 * D, 'transfer', 15, 'Envoi à SP-3307', 'SP-3307', 'NFC'],
    [13 * D + 6 * H, 'deposit', 800, 'Dépôt sur le portefeuille', null, 'Dépôt'],
    [17 * D + 2 * H, 'transfer', 140, 'Envoi à SP-2716', 'SP-2716', 'NFC'],
    [22 * D, 'receive', 90, 'Réception NFC de SP-4821', 'SP-4821', 'NFC'],
  ];
  const transactions: Transaction[] = raw.map(([ago, type, amount, description, related, channel], i) => ({
    id: i + 1, wallet_id: 1, type, amount, currency: 'USD', status: 'completed', description, related, channel,
    created_at: now - ago,
  }));
  transactions.push({
    id: 50, wallet_id: 2, type: 'deposit', amount: 25000, currency: 'XAF', status: 'completed',
    description: 'Dépôt sur le portefeuille', related: null, channel: 'Dépôt', created_at: now - 9 * D,
  });
  return {
    wallets: [
      { wallet_id: 1, currency: 'USD', balance: 1248.5 },
      { wallet_id: 2, currency: 'XAF', balance: 85000 },
      { wallet_id: 3, currency: 'EUR', balance: 60 },
    ],
    ownWalletId: 1,
    transactions,
    beneficiaries: [
      { id: 1, userId: 'SP-4821', nickname: 'Boutique Exemple', added_at: now - 20 * D },
      { id: 2, userId: 'SP-2716', nickname: 'Collègue démo', added_at: now - 12 * D },
    ],
    notifications: [
      { id: 1, kind: 'tx', title: 'Paiement envoyé', body: '45,00 USD envoyés à SP-4821 par NFC.', read: false, created_at: now - 2 * H },
      { id: 2, kind: 'tx', title: 'Paiement reçu', body: '120,00 USD reçus de SP-3307.', read: false, created_at: now - 7 * H },
      { id: 3, kind: 'security', title: 'Nouvelle connexion', body: 'Connexion validée par biométrie, code OTP et Face ID.', read: true, created_at: now - 1 * D },
      { id: 4, kind: 'info', title: 'Limites de transfert', body: '1 000 par envoi, 5 000 par jour, 50 000 par mois.', read: true, created_at: now - 5 * D },
    ],
    dark: false,
    biometrics: true,
    pushEnabled: true,
    nextId: 100,
  };
}

type Action =
  | { type: 'select'; id: number }
  | { type: 'deposit'; amount: number }
  | { type: 'createWallet'; currency: string }
  | { type: 'send'; to: string; amount: number }
  | { type: 'receive'; from: string; amount: number }
  | { type: 'addBenef'; userId: string; nickname: string }
  | { type: 'delBenef'; id: number }
  | { type: 'readAll' }
  | { type: 'notif'; title: string; body: string; kind: Notif['kind'] }
  | { type: 'toggle'; key: 'dark' | 'biometrics' | 'pushEnabled' }
  | { type: 'reset' };

const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function reducer(s: State, a: Action): State {
  const active = s.wallets.find((w) => w.wallet_id === s.ownWalletId)!;
  const now = Date.now();
  switch (a.type) {
    case 'select': return { ...s, ownWalletId: a.id };
    case 'deposit': {
      const tx: Transaction = { id: s.nextId, wallet_id: active.wallet_id, type: 'deposit', amount: a.amount, currency: active.currency, status: 'completed', description: 'Dépôt sur le portefeuille', related: null, channel: 'Dépôt', created_at: now };
      return { ...s, nextId: s.nextId + 1, transactions: [tx, ...s.transactions], wallets: s.wallets.map((w) => w.wallet_id === active.wallet_id ? { ...w, balance: w.balance + a.amount } : w) };
    }
    case 'createWallet': {
      const id = Math.max(...s.wallets.map((w) => w.wallet_id)) + 1;
      return { ...s, wallets: [...s.wallets, { wallet_id: id, currency: a.currency, balance: 0 }] };
    }
    case 'send': {
      // Débit atomique du portefeuille actif + écriture de la transaction (équivalent BEGIN/COMMIT)
      const tx: Transaction = { id: s.nextId, wallet_id: active.wallet_id, type: 'transfer', amount: a.amount, currency: active.currency, status: 'completed', description: `Envoi à ${a.to}`, related: a.to, channel: 'NFC', created_at: now };
      const n: Notif = { id: s.nextId, kind: 'tx', title: 'Paiement envoyé', body: `${fmt(a.amount)} ${active.currency} envoyés à ${a.to} par NFC.`, read: false, created_at: now };
      return { ...s, nextId: s.nextId + 1, transactions: [tx, ...s.transactions], notifications: [n, ...s.notifications], wallets: s.wallets.map((w) => w.wallet_id === active.wallet_id ? { ...w, balance: w.balance - a.amount } : w) };
    }
    case 'receive': {
      const tx: Transaction = { id: s.nextId, wallet_id: active.wallet_id, type: 'receive', amount: a.amount, currency: active.currency, status: 'completed', description: `Réception NFC de ${a.from}`, related: a.from, channel: 'NFC', created_at: now };
      const n: Notif = { id: s.nextId, kind: 'tx', title: 'Paiement reçu', body: `${fmt(a.amount)} ${active.currency} reçus de ${a.from}.`, read: false, created_at: now };
      return { ...s, nextId: s.nextId + 1, transactions: [tx, ...s.transactions], notifications: [n, ...s.notifications], wallets: s.wallets.map((w) => w.wallet_id === active.wallet_id ? { ...w, balance: w.balance + a.amount } : w) };
    }
    case 'addBenef': return { ...s, nextId: s.nextId + 1, beneficiaries: [...s.beneficiaries, { id: s.nextId, userId: a.userId, nickname: a.nickname, added_at: now }] };
    case 'delBenef': return { ...s, beneficiaries: s.beneficiaries.filter((b) => b.id !== a.id) };
    case 'readAll': return { ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) };
    case 'notif': return { ...s, nextId: s.nextId + 1, notifications: [{ id: s.nextId, kind: a.kind, title: a.title, body: a.body, read: false, created_at: now }, ...s.notifications] };
    case 'toggle': return { ...s, [a.key]: !s[a.key] };
    case 'reset': return seed();
  }
}

/** Contrôles de transferService.checkTransferLimits + transferFunds (solde, auto-envoi, montant). */
export function checkTransfer(s: State, to: string, amount: number): string[] {
  const errors: string[] = [];
  const active = s.wallets.find((w) => w.wallet_id === s.ownWalletId)!;
  if (to === DEMO_USER.id) errors.push('Impossible de transférer vers votre propre compte');
  if (!(amount > 0)) errors.push('Montant invalide');
  if (amount > TRANSFER_LIMITS.single) errors.push(`Montant max par transfert : ${TRANSFER_LIMITS.single}`);
  const startDay = new Date(); startDay.setHours(0, 0, 0, 0);
  const startMonth = new Date(startDay); startMonth.setDate(1);
  const sent = (from: number) => s.transactions.filter((t) => t.type === 'transfer' && t.status === 'completed' && t.created_at >= from).reduce((a, t) => a + t.amount, 0);
  const daily = sent(startDay.getTime());
  const monthly = sent(startMonth.getTime());
  if (daily + amount > TRANSFER_LIMITS.daily) errors.push(`Limite quotidienne dépassée. Restant : ${fmt(TRANSFER_LIMITS.daily - daily)}`);
  if (monthly + amount > TRANSFER_LIMITS.monthly) errors.push(`Limite mensuelle dépassée. Restant : ${fmt(TRANSFER_LIMITS.monthly - monthly)}`);
  if (amount > active.balance) errors.push('Solde insuffisant');
  return errors;
}

export function remaining(s: State) {
  const startDay = new Date(); startDay.setHours(0, 0, 0, 0);
  const daily = s.transactions.filter((t) => t.type === 'transfer' && t.created_at >= startDay.getTime()).reduce((a, t) => a + t.amount, 0);
  return { daily: Math.max(0, TRANSFER_LIMITS.daily - daily), used: daily };
}

interface Ctx { s: State; dispatch: (a: Action) => void; active: Wallet }
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, seed);
  const active = s.wallets.find((w) => w.wallet_id === s.ownWalletId)!;
  const v = useMemo(() => ({ s, dispatch, active }), [s, active]);
  return <StoreCtx.Provider value={v}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider manquant');
  return c;
}

export { fmt };
