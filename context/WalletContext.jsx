import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  getXrpBalance,
  getXrpTransactions,
  sendXrpTransaction,
  pingNetwork
} from '../services/walletService';

const WalletContext = createContext(null);

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }) {
  const BASE_RESERVE_XRP = 10;
  const [wallet, setWallet] = useState(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [locked, setLocked] = useState(false);
  const [walletFileNameState, setWalletFileNameState] = useState(() => {
    try {
      const lw = localStorage.getItem('lastUsedWalletFile');
      return lw || '';
    } catch {
      return '';
    }
  });
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [unfunded, setUnfunded] = useState(false);
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [xrpPriceFiat, setXrpPriceFiat] = useState(0);
  const SETTINGS_KEY = 'xrp_user_settings_v1';
  const defaultSettings = {
    autoLockMinutes: 15,
    autoRefreshTx: true,
    showFiat: true,
    txMaxLedgerOffset: 200,
    preferredNode: 'wss://s2.ripple.com'
  };
  const [userSettings, setUserSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaultSettings, ...parsed };
      }
    } catch {}
    return defaultSettings;
  });
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
    } catch {}
  }, [userSettings]);
  useEffect(() => {
    if (locked) return;
    if (!userSettings.autoLockMinutes || userSettings.autoLockMinutes <= 0) return;
    const ms = userSettings.autoLockMinutes * 60 * 1000;
    const timer = setTimeout(() => {
      setLocked(true);
    }, ms);
    return () => clearTimeout(timer);
  }, [locked, userSettings.autoLockMinutes]);
  const skipInitialTxsRef = useRef(true);
  const knownIncomingTxsRef = useRef(new Set());
  useEffect(() => {
    if (!fiatCurrency) return;
    async function fetchPrice() {
      try {
        const lower = fiatCurrency.toLowerCase();
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=${lower}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data && data.ripple && data.ripple[lower]) {
          setXrpPriceFiat(data.ripple[lower]);
        } else {
          setXrpPriceFiat(0);
        }
      } catch {
        setXrpPriceFiat(0);
      }
    }
    fetchPrice();
  }, [fiatCurrency]);
  async function refreshBalanceAndTx() {
    if (!wallet || !wallet.address || locked) return;
    try {
      setUnfunded(false);
      const serverUrl = wallet.serverUrl || 'wss://s2.ripple.com';
      const balDrops = await getXrpBalance(serverUrl, wallet.address);
      setBalance(balDrops);
      const xrpBal = balDrops / 1000000;
      if (xrpBal < BASE_RESERVE_XRP) {
        setUnfunded(true);
      } else {
        setUnfunded(false);
      }
      const rawTxs = await getXrpTransactions(serverUrl, wallet.address);
      const parsedTxs = rawTxs.map(item => {
        const t = item.tx || {};
        const meta = item.meta || {};
        const type = t.TransactionType;
        const date = t.date;
        const fee = t.Fee;
        const result = meta.TransactionResult;
        const txHash = t.hash;
        let fromAddress = null;
        let toAddress = null;
        let deliveredAmountDrops = null;
        let direction = 'unknown';
        let destinationTag = null;
        let memos = [];
        if (type === 'Payment') {
          fromAddress = t.Account;
          toAddress = t.Destination;
          if (typeof meta.delivered_amount !== 'undefined') {
            deliveredAmountDrops = meta.delivered_amount;
          } else if (typeof t.Amount !== 'undefined') {
            deliveredAmountDrops = t.Amount;
          }
          if (fromAddress === wallet.address) {
            direction = 'outgoing';
          } else if (toAddress === wallet.address) {
            direction = 'incoming';
          }
          if (typeof t.DestinationTag === 'number') {
            destinationTag = t.DestinationTag;
          }
          if (Array.isArray(t.Memos)) {
            memos = t.Memos.map(m => {
              const md = m && m.Memo && m.Memo.MemoData;
              if (!md) return '';
              try {
                return hexToString(md);
              } catch {
                return md;
              }
            });
          }
        }
        return {
          txHash,
          type,
          date,
          fee,
          result,
          fromAddress,
          toAddress,
          deliveredAmountDrops,
          direction,
          destinationTag,
          memos
        };
      });
      const incomingTxs = parsedTxs.filter(tx => tx.direction === 'incoming');
      const newIncoming = incomingTxs.filter(tx => !knownIncomingTxsRef.current.has(tx.txHash));
      if (!skipInitialTxsRef.current) {
        for (const tx of newIncoming) {
          if (tx.deliveredAmountDrops) {
            const xrpAmount = Number(tx.deliveredAmountDrops) / 1000000;
            if (window.electronAPI && window.electronAPI.notifyIncomingTransaction) {
              window.electronAPI.notifyIncomingTransaction({
                address: wallet.address,
                txid: tx.txHash,
                amount: xrpAmount
              });
            }
          }
        }
      }
      for (const tx of incomingTxs) {
        knownIncomingTxsRef.current.add(tx.txHash);
      }
      setTransactions(parsedTxs);
      if (skipInitialTxsRef.current) {
        skipInitialTxsRef.current = false;
      }
    } catch (err) {
      if (err.message && err.message.includes('Account not found')) {
        setBalance(0);
        setTransactions([]);
        setUnfunded(true);
      }
    }
  }
  useEffect(() => {
    if (!userSettings.autoRefreshTx) return;
    const t = setInterval(() => {
      refreshBalanceAndTx();
    }, 30000);
    return () => clearInterval(t);
  }, [wallet, locked, userSettings.autoRefreshTx]);
  useEffect(() => {
    refreshBalanceAndTx();
  }, [wallet, locked]);
  const [recentWallets, setRecentWallets] = useState(() => {
    try {
      const raw = localStorage.getItem('xrp_recentWallets');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  function addRecentWallet(fp) {
    if (!fp) return;
    const exist = recentWallets.find(x => x.filePath === fp);
    if (!exist) {
      const newList = [{ filePath: fp, time: Date.now() }, ...recentWallets];
      setRecentWallets(newList);
      localStorage.setItem('xrp_recentWallets', JSON.stringify(newList));
    }
  }
  function removeRecentWallet(fp) {
    const newList = recentWallets.filter(x => x.filePath !== fp);
    setRecentWallets(newList);
    localStorage.setItem('xrp_recentWallets', JSON.stringify(newList));
  }
  function hexToString(hex) {
    const clean = hex.replace(/^0x/, '');
    const bytes = [];
    for (let c = 0; c < clean.length; c += 2) {
      bytes.push(parseInt(clean.substr(c, 2), 16));
    }
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  }
  const [notes, setNotes] = useState(() => {
    try {
      const raw = localStorage.getItem('xrp_notes_context');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('xrp_notes_context', JSON.stringify(notes));
    } catch {}
  }, [notes]);
  function addNote(note) {
    setNotes(prev => [...prev, note]);
  }
  function removeNote(noteId) {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }
  function updateNote(updated) {
    setNotes(prev => prev.map(n => (n.id === updated.id ? { ...n, ...updated } : n)));
  }
  const SIGN_HISTORY_KEY = 'xrp_sign_history_v1';
  const [signedMessages, setSignedMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(SIGN_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SIGN_HISTORY_KEY, JSON.stringify(signedMessages));
    } catch {}
  }, [signedMessages]);
  function addSignedMessage(record) {
    setSignedMessages(prev => [record, ...prev]);
  }
  function removeSignedMessage(id) {
    setSignedMessages(prev => prev.filter(x => x.id !== id));
  }
  const ADVANCED_REC_KEY = 'xrp_advanced_records_v1';
  const [advancedRecords, setAdvancedRecords] = useState(() => {
    try {
      const raw = localStorage.getItem(ADVANCED_REC_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(ADVANCED_REC_KEY, JSON.stringify(advancedRecords));
    } catch {}
  }, [advancedRecords]);
  function addAdvancedRecord(record) {
    setAdvancedRecords(prev => [record, ...prev]);
  }
  function removeAdvancedRecord(id) {
    setAdvancedRecords(prev => prev.filter(x => x.id !== id));
  }
  function updateUserSettings(newPart) {
    setUserSettings(prev => ({ ...prev, ...newPart }));
  }
  function resetUserSettings() {
    setUserSettings(defaultSettings);
  }
  function lockWallet() {
    setLocked(true);
  }
  function unlockWallet(pwd) {
    if (pwd === masterPassword) {
      setLocked(false);
      return true;
    }
    return false;
  }
  function setWalletFileName(name) {
    setWalletFileNameState(name);
    try {
      localStorage.setItem('lastUsedWalletFile', name);
    } catch {}
  }
  function setWalletWithPath(wObj, filePath) {
    setWallet(wObj);
    setWalletFileName(filePath || '');
    setTransactions([]);
    knownIncomingTxsRef.current.clear();
    skipInitialTxsRef.current = true;
    if (filePath) {
      addRecentWallet(filePath);
    }
  }
  async function doPingNetwork() {
    try {
      return await pingNetwork();
    } catch {
      return false;
    }
  }
  async function doSendXrpTransaction(opts) {
    try {
      const txResult = await sendXrpTransaction(opts);
      if (txResult && txResult.meta && txResult.meta.TransactionResult === 'tesSUCCESS') {
        if (window.electronAPI && window.electronAPI.notifyOutgoingTransaction) {
          window.electronAPI.notifyOutgoingTransaction({
            txid: txResult.hash || '',
            amountXrp: opts.amountXrp,
            to: opts.toAddress
          });
        }
      }
      return txResult;
    } catch (err) {
      throw err;
    }
  }
  const value = {
    wallet,
    setWallet,
    walletFileName: walletFileNameState,
    setWalletFileName,
    setWalletWithPath,
    masterPassword,
    setMasterPassword,
    locked,
    lockWallet,
    unlockWallet,
    balance,
    transactions,
    unfunded,
    refreshBalanceAndTx,
    fiatCurrency,
    setFiatCurrency,
    xrpPriceFiat,
    recentWallets,
    addRecentWallet,
    removeRecentWallet,
    notes,
    addNote,
    removeNote,
    updateNote,
    signedMessages,
    addSignedMessage,
    removeSignedMessage,
    advancedRecords,
    addAdvancedRecord,
    removeAdvancedRecord,
    userSettings,
    updateUserSettings,
    resetUserSettings,
    doPingNetwork,
    doSendXrpTransaction
  };
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
