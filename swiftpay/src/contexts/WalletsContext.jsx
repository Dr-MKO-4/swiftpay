// src/contexts/WalletsContext.js
import React, { createContext, useState, useEffect } from 'react';
import WalletService from '../services/walletService';

export const WalletsContext = createContext();

export function WalletsProvider({ children }) {
  const [wallets, setWallets] = useState([]);
  const [ownWalletId, setOwnWalletId] = useState(null);

  const refreshWallets = async () => {
    try {
      const list = await WalletService.list();
      const normalized = list.map(w => ({
        ...w,
        balance: typeof w.balance === 'string' ? parseFloat(w.balance) : w.balance
      }));
      setWallets(normalized);
      if (normalized.length > 0 && !ownWalletId) {
        setOwnWalletId(normalized[0].wallet_id);
      }
    } catch (err) {
      console.error('Erreur refreshWallets', err);
    }
  };

  const selectWallet = id => setOwnWalletId(id);

  const depositToActive = async amount => {
    if (!ownWalletId) throw new Error('No active wallet selected');
    await WalletService.deposit(ownWalletId, amount);
    await refreshWallets();
  };

  const createWallet = async currency => {
    await WalletService.create(currency);
    await refreshWallets();
  };

  useEffect(() => {
    refreshWallets();
  }, []);

  return (
    <WalletsContext.Provider value={{
      wallets,
      ownWalletId,
      refreshWallets,
      depositToActive,
      selectWallet,
      createWallet
    }}>
      {children}
    </WalletsContext.Provider>
  );
}
