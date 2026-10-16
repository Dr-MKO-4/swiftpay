// Tableau de bord, transactions, portefeuille, notifications, bénéficiaires, paramètres
import { useMemo, useState } from 'react';
import { Icon } from '../icons';
import { useNav } from '../nav';
import { DEMO_USER, TRANSFER_LIMITS, fmt, isCredit, remaining, useStore } from '../store';
import { Footer, Header, Screen, TxRow } from './common';

export function Dashboard() {
  const { navigate } = useNav();
  const { s, active } = useStore();
  const [mode, setMode] = useState<'send' | 'receive'>('send');
  const recent = s.transactions.filter((t) => t.wallet_id === active.wallet_id).sort((a, b) => b.created_at - a.created_at).slice(0, 5);
  const rem = remaining(s);
  return (
    <Screen>
      <Header title="SwiftPay" />
      <div className="scroll">
        <section className="balance-card" aria-label="Solde">
          <div className="bc-title">Solde actuel</div>
          <div className="bc-balance">{fmt(active.balance)} {active.currency}</div>
          <div className="bc-meta">ID {DEMO_USER.id} · reste aujourd'hui {fmt(rem.daily)}</div>
        </section>

        <div className="actions">
          <button className={'action a-send' + (mode === 'send' ? ' sel' : '')} onClick={() => setMode('send')} aria-pressed={mode === 'send'}>
            <Icon name="send" size={24} color="#000" /><span>Envoyer</span>
          </button>
          <button className={'action a-recv' + (mode === 'receive' ? ' sel' : '')} onClick={() => setMode('receive')} aria-pressed={mode === 'receive'}>
            <Icon name="download" size={24} color="#000" /><span>Recevoir</span>
          </button>
          <button className="action a-hist" onClick={() => navigate('Transactions')}>
            <Icon name="time" size={24} color="#fff" /><span>Historique</span>
          </button>
        </div>

        <p className="instruction">{mode === 'send' ? 'Approchez pour envoyer' : 'Approchez pour recevoir'}</p>

        <div className="nfc-area">
          <span className="ripple r1" aria-hidden="true" />
          <span className="ripple r2" aria-hidden="true" />
          <button
            className={'nfc-btn ' + (mode === 'send' ? 'send' : 'recv')}
            onClick={() => navigate(mode === 'send' ? 'SenderRead' : 'ReceiverEmulator')}
            aria-label={mode === 'send' ? 'Lancer un envoi NFC' : 'Se mettre en réception NFC'}
          >
            <Icon name={mode === 'send' ? 'send' : 'download'} size={40} color="#fff" />
          </button>
        </div>

        <h2 className="section-h">Transactions récentes</h2>
        <ul className="tx-list">{recent.map((t) => <TxRow key={t.id} t={t} />)}</ul>
      </div>
      <Footer current="Dashboard" />
    </Screen>
  );
}

export function Transactions() {
  const { s } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const list = useMemo(() => s.transactions
    .filter((t) => t.wallet_id === s.ownWalletId)
    .filter((t) => filter === 'all' || (filter === 'credit' ? isCredit(t.type) : !isCredit(t.type)))
    .filter((t) => !q || (t.description + ' ' + t.channel).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.created_at - a.created_at), [s.transactions, s.ownWalletId, filter, q]);
  const totIn = list.filter((t) => isCredit(t.type)).reduce((a, t) => a + t.amount, 0);
  const totOut = list.filter((t) => !isCredit(t.type)).reduce((a, t) => a + t.amount, 0);
  const cur = s.wallets.find((w) => w.wallet_id === s.ownWalletId)!.currency;
  return (
    <Screen>
      <Header title="Transactions" />
      <div className="controls">
        <label className="sr-only" htmlFor="tx-q">Rechercher</label>
        <input id="tx-q" className="search" type="search" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filters" role="group" aria-label="Filtrer par sens">
          {(['all', 'credit', 'debit'] as const).map((f) => (
            <button key={f} className={'chip' + (filter === f ? ' on' : '')} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Toutes' : f === 'credit' ? 'Entrées' : 'Sorties'}
            </button>
          ))}
        </div>
        <div className="totals"><span className="in">Entrées +{fmt(totIn)} {cur}</span><span className="out">Sorties -{fmt(totOut)} {cur}</span></div>
      </div>
      <div className="scroll">
        {list.length ? <ul className="tx-list">{list.map((t) => <TxRow key={t.id} t={t} year />)}</ul> : <p className="empty">Aucune transaction</p>}
      </div>
      <Footer current="Transactions" />
    </Screen>
  );
}

export function Wallet() {
  const { s, dispatch, active } = useStore();
  const { alert } = useNav();
  const [amt, setAmt] = useState('');
  const [cur, setCur] = useState('');
  const deposit = () => {
    const a = parseFloat(amt.replace(',', '.'));
    if (isNaN(a) || a <= 0) return alert({ title: 'Erreur', message: 'Veuillez saisir un montant valide' });
    dispatch({ type: 'deposit', amount: a });
    setAmt('');
    alert({ title: 'Succès', message: `+${fmt(a)} ${active.currency}` });
  };
  const create = () => {
    const c = cur.trim().toUpperCase();
    if (!c) return alert({ title: 'Erreur', message: 'Entrez un code de devise (ex: USD)' });
    if (!/^[A-Z]{3}$/.test(c)) return alert({ title: 'Erreur', message: 'Code de devise sur 3 lettres (ex: EUR)' });
    if (s.wallets.some((w) => w.currency === c)) return alert({ title: 'Erreur', message: 'La création a échoué : ce portefeuille existe déjà' });
    dispatch({ type: 'createWallet', currency: c });
    setCur('');
    alert({ title: 'Succès', message: `Portefeuille ${c} créé` });
  };
  return (
    <Screen>
      <Header title="Portefeuille" />
      <div className="scroll">
        <section className="balance-card">
          <div className="bc-title">Solde du portefeuille actif</div>
          <div className="bc-balance">{fmt(active.balance)} {active.currency}</div>
        </section>
        <div className="row-ctrl">
          <label className="sr-only" htmlFor="dep">Montant à ajouter</label>
          <input id="dep" inputMode="decimal" placeholder="Montant à ajouter" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <button className="btn-accent" onClick={deposit}>Ajouter</button>
        </div>
        <div className="row-ctrl">
          <label className="sr-only" htmlFor="cur">Nouvelle devise</label>
          <input id="cur" placeholder="Nouvelle devise (ex: GBP)" maxLength={3} value={cur} onChange={(e) => setCur(e.target.value)} />
          <button className="btn-primary" onClick={create}>Créer</button>
        </div>
        <h2 className="section-h">Mes portefeuilles</h2>
        <ul className="wallet-list">
          {s.wallets.map((w) => {
            const on = w.wallet_id === s.ownWalletId;
            return (
              <li key={w.wallet_id}>
                <button className={'wallet-row' + (on ? ' on' : '')} onClick={() => dispatch({ type: 'select', id: w.wallet_id })} aria-pressed={on}>
                  <span>{w.currency} · {fmt(w.balance)}</span>
                  {on && <Icon name="check" size={20} color="var(--accent)" stroke={2.6} />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="limits">
          <div className="limits-h"><Icon name="shield" size={18} color="var(--primary)" /> Limites de transfert</div>
          <div className="limits-g">
            <div><b>{fmt(TRANSFER_LIMITS.single)}</b><span>par envoi</span></div>
            <div><b>{fmt(TRANSFER_LIMITS.daily)}</b><span>par jour</span></div>
            <div><b>{fmt(TRANSFER_LIMITS.monthly)}</b><span>par mois</span></div>
          </div>
        </div>
      </div>
      <Footer current="Wallet" />
    </Screen>
  );
}

export function Notifications() {
  const { s, dispatch } = useStore();
  return (
    <Screen>
      <Header title="Notifications" back />
      <div className="controls">
        <button className="btn-outline" onClick={() => dispatch({ type: 'readAll' })}>Tout marquer comme lu</button>
      </div>
      <div className="scroll">
        <ul className="notif-list">
          {s.notifications.map((n) => (
            <li key={n.id} className={'notif' + (n.read ? '' : ' unread')}>
              <Icon name={n.kind === 'tx' ? 'swap' : n.kind === 'security' ? 'shield' : 'info'} size={22} color="var(--primary)" />
              <div>
                <div className="n-title">{n.title}{!n.read && <span className="sr-only"> (non lue)</span>}</div>
                <div className="n-body">{n.body}</div>
                <div className="n-date">{new Date(n.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Screen>
  );
}

export function Beneficiaries() {
  const { s, dispatch } = useStore();
  const { alert } = useNav();
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState('');
  const [nick, setNick] = useState('');
  const add = () => {
    const id = uid.trim().toUpperCase();
    if (!id) return alert({ title: 'Erreur', message: "Entrez l'ID utilisateur" });
    if (id === DEMO_USER.id) return alert({ title: 'Erreur', message: 'Vous ne pouvez pas vous ajouter vous-même' });
    if (s.beneficiaries.some((b) => b.userId === id)) return alert({ title: 'Erreur', message: 'Bénéficiaire déjà enregistré' });
    dispatch({ type: 'addBenef', userId: id, nickname: nick.trim() });
    setUid(''); setNick(''); setOpen(false);
  };
  return (
    <Screen>
      <Header title="Bénéficiaires" back />
      <div className="controls"><button className="btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={18} color="#fff" /> Ajouter</button></div>
      <div className="scroll">
        {s.beneficiaries.length === 0 && <p className="empty">Aucun bénéficiaire</p>}
        <ul className="benef-list">
          {s.beneficiaries.map((b) => (
            <li key={b.id} className="benef">
              <div className="avatar" aria-hidden="true">{(b.nickname || b.userId).slice(0, 1)}</div>
              <div className="b-info"><div className="b-name">{b.nickname || 'Sans surnom'}</div><div className="b-id">{b.userId}</div></div>
              <button className="icon-btn danger" aria-label={`Supprimer ${b.nickname || b.userId}`} onClick={() => alert({ title: 'Supprimer', message: `Retirer ${b.nickname || b.userId} de vos bénéficiaires ?`, buttons: [{ text: 'Annuler' }, { text: 'Supprimer', primary: true, onPress: () => dispatch({ type: 'delBenef', id: b.id }) }] })}>
                <Icon name="trash" size={20} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {open && (
        <div className="sheet-wrap" role="dialog" aria-modal="true" aria-labelledby="add-b">
          <div className="sheet">
            <div className="sheet-h"><h2 id="add-b">Nouveau bénéficiaire</h2><button className="icon-btn" aria-label="Fermer" onClick={() => setOpen(false)}><Icon name="close" /></button></div>
            <label className="lbl" htmlFor="b-id">ID du bénéficiaire</label>
            <input id="b-id" className="field" placeholder="Entrez l'ID utilisateur" value={uid} onChange={(e) => setUid(e.target.value)} autoFocus />
            <label className="lbl" htmlFor="b-n">Surnom (optionnel)</label>
            <input id="b-n" className="field" placeholder="Ex: Mon collègue" value={nick} onChange={(e) => setNick(e.target.value)} />
            <button className="btn-primary wide" onClick={add}>Ajouter</button>
          </div>
        </div>
      )}
    </Screen>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={'switch' + (on ? ' on' : '')} onClick={onChange}><span /></button>;
}

export function Settings() {
  const { s, dispatch } = useStore();
  const { reset, alert, navigate } = useNav();
  return (
    <Screen>
      <Header title="Paramètres" />
      <div className="scroll settings">
        <h2 className="set-h">Profil</h2>
        <div className="set-row"><span>Nom d'utilisateur</span><span className="set-v">{DEMO_USER.username}</span></div>
        <div className="set-row"><span>Email</span><span className="set-v">{DEMO_USER.email}</span></div>
        <div className="set-row"><span>Téléphone</span><span className="set-v">{DEMO_USER.phone}</span></div>
        <div className="set-row"><span>ID SwiftPay</span><span className="set-v">{DEMO_USER.id}</span></div>
        <h2 className="set-h">Sécurité</h2>
        <button className="set-row btnrow" onClick={() => alert({ title: 'Changer le mot de passe', message: 'Non simulé dans la démo.' })}><span>Changer le mot de passe</span><Icon name="back" size={16} /></button>
        <div className="set-row"><span>Authentification biométrique</span><Toggle on={s.biometrics} label="Authentification biométrique" onChange={() => dispatch({ type: 'toggle', key: 'biometrics' })} /></div>
        <button className="set-row btnrow" onClick={() => navigate('Beneficiaries')}><span>Bénéficiaires</span><Icon name="back" size={16} /></button>
        <h2 className="set-h">Préférences</h2>
        <div className="set-row"><span>Langue</span><span className="set-v">Français</span></div>
        <div className="set-row"><span>Thème sombre</span><Toggle on={s.dark} label="Thème sombre" onChange={() => dispatch({ type: 'toggle', key: 'dark' })} /></div>
        <div className="set-row"><span>Notifications</span><Toggle on={s.pushEnabled} label="Notifications" onChange={() => dispatch({ type: 'toggle', key: 'pushEnabled' })} /></div>
        <h2 className="set-h">À propos</h2>
        <div className="set-row"><span>Version</span><span className="set-v">1.0.0</span></div>
        <button className="set-row btnrow" onClick={() => { dispatch({ type: 'reset' }); alert({ title: 'Démo réinitialisée', message: 'Soldes et historique fictifs restaurés.' }); }}><span>Réinitialiser les données de démo</span><Icon name="back" size={16} /></button>
        <button className="btn-primary wide mt12" onClick={() => reset('Login')}><Icon name="logout" size={20} color="#fff" /> Déconnexion</button>
      </div>
      <Footer current="Settings" />
    </Screen>
  );
}
