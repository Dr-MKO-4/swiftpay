import { useState, type ReactNode } from 'react';
import { Icon } from '../icons';
import { useNav } from '../nav';
import { fmt, isCredit, useStore, type Transaction } from '../store';

export const FOOTER = [
  { label: 'Accueil', icon: 'home', to: 'Dashboard' },
  { label: 'Transactions', icon: 'swap', to: 'Transactions' },
  { label: 'Portefeuille', icon: 'wallet', to: 'Wallet' },
  { label: 'Profil', icon: 'person', to: 'Settings' },
];

const MENU = [
  ...FOOTER.slice(0, 3),
  { label: 'Envoyer / Recevoir', icon: 'nfc', to: 'SenderRead' },
  { label: 'Bénéficiaires', icon: 'people', to: 'Beneficiaries' },
  { label: 'Notifications', icon: 'bell', to: 'Notifications' },
  { label: 'Paramètres', icon: 'settings', to: 'Settings' },
];

export function Header({ title, back }: { title: string; back?: boolean }) {
  const { navigate, goBack } = useNav();
  const { s } = useStore();
  const [open, setOpen] = useState(false);
  const unread = s.notifications.filter((n) => !n.read).length;
  return (
    <>
      <header className="hdr">
        {back ? (
          <button className="icon-btn" onClick={goBack} aria-label="Retour"><Icon name="back" size={26} /></button>
        ) : (
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Icon name="menu" size={28} /></button>
        )}
        <h1 className="hdr-title">{title}</h1>
        <button className="icon-btn bell" onClick={() => navigate('Notifications')} aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}>
          <Icon name="bell" size={26} />
          {unread > 0 && <span className="badge">{unread}</span>}
        </button>
      </header>
      {open && <SideMenu close={() => setOpen(false)} />}
    </>
  );
}

export function SideMenu({ close }: { close: () => void }) {
  const { navigate, reset } = useNav();
  return (
    <div className="drawer-wrap" role="dialog" aria-modal="true" aria-label="Menu">
      <button className="drawer-backdrop" aria-label="Fermer le menu" onClick={close} />
      <nav className="drawer">
        <div className="drawer-logo"><img src="/logo.webp" alt="SwiftPay" /></div>
        <div className="drawer-items">
          {MENU.map((m) => (
            <button key={m.label} className="drawer-item" onClick={() => { close(); navigate(m.to); }}>
              <Icon name={m.icon} size={20} color="var(--primary)" /> {m.label}
            </button>
          ))}
        </div>
        <button className="drawer-logout" onClick={() => { close(); reset('Login'); }}>
          <Icon name="logout" size={20} color="#fff" /> Déconnexion
        </button>
      </nav>
    </div>
  );
}

export function Footer({ current }: { current: string }) {
  const { navigate } = useNav();
  return (
    <nav className="footer" aria-label="Navigation principale">
      {FOOTER.map((f) => (
        <button key={f.label} className={'footer-item' + (current === f.to ? ' on' : '')} onClick={() => navigate(f.to)} aria-current={current === f.to ? 'page' : undefined}>
          <Icon name={f.icon} size={22} color="#fff" />
          <span>{f.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function TxRow({ t, year }: { t: Transaction; year?: boolean }) {
  const c = isCredit(t.type);
  const d = new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', ...(year ? { year: 'numeric' } : {}) }).toUpperCase();
  return (
    <li className="tx-row">
      <Icon name={c ? 'downc' : 'up'} size={22} color={c ? 'var(--primary)' : 'var(--accent)'} />
      <div className="tx-info">
        <div className="tx-desc">{t.description}</div>
        <div className="tx-date">{d} · {t.channel}</div>
      </div>
      <div className={'tx-amount ' + (c ? 'in' : 'out')}>{c ? '+' : '-'}{fmt(t.amount)} {t.currency}</div>
    </li>
  );
}

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={'screen app ' + className}>{children}</div>;
}
