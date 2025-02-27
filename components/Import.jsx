
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react';
import { useThemeContext } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import {
  importFromFamilySeed,
  importFromMnemonicXrp
} from '../services/walletService';


function ImportSeed(props, ref) {
  const { onSubStepChanged } = props;
  const { theme } = useThemeContext();
  const {
    walletFileName,
    setWalletWithPath,
    setMasterPassword,
    addRecentWallet
  } = useWallet();

  const [subStep, setSubStep] = useState(1);
  const [typed, setTyped] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    onSubStepChanged && onSubStepChanged(subStep);
  }, [subStep, onSubStepChanged]);

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      setError('');
      if (subStep === 1) {
        return 'go-previous-step';
      } else {
        setPwd('');
        setPwd2('');
        setSubStep(1);
        return null;
      }
    },
    handleNext: async () => {
      setError('');
      if (subStep === 1) {
        if (!typed.trim()) {
          setError('Please enter an XRPL seed (sEd...) or 12-word mnemonic');
          return null;
        }
        setSubStep(2);
        return null;
      }
      if (subStep === 2) {
        if (!pwd.trim() || !pwd2.trim()) {
          setError('Password is required in both fields');
          return null;
        }
        if (pwd !== pwd2) {
          setError('Passwords do not match');
          return null;
        }
        try {
          let walletObj;
          const input = typed.trim();
          if (input.startsWith('s')) {
            walletObj = importFromFamilySeed(input);
          } else {
            walletObj = importFromMnemonicXrp(input);
          }

          let finalFile = walletFileName;
          if (!finalFile) {
            finalFile = `XRPImport_${Date.now()}.json`;
          }

          const resp = await window.electronAPI.saveWalletFile(walletObj, pwd, finalFile);
          if (!resp.success) {
            setError('Failed to save wallet: ' + (resp.error || 'Unknown'));
            return null;
          }
          setMasterPassword(pwd);
          setWalletWithPath(walletObj, finalFile);
          addRecentWallet(finalFile);

          return 'finish';
        } catch (err) {
          setError('Import failed: ' + err.message);
          return null;
        }
      }
      return null;
    },
    getSubStep: () => subStep
  }));

  const s = getStyles(theme);

  let content;
  if (subStep === 1) {
    content = (
      <div style={s.block}>
        <h2 style={s.title}>Import an existing Key</h2>
        <p style={s.desc}>
          Enter your XRPL seed (sEd...) or 12-word mnemonic to import:
        </p>
        <textarea
          style={s.textArea}
          rows={3}
          placeholder="Paste seed or mnemonic..."
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </div>
    );
  } else {
    content = (
      <div style={s.block}>
        <h2 style={s.title}>Encrypt Wallet</h2>
        <p style={s.desc}>
          Set a password to protect your imported wallet file:
        </p>
        <div style={s.labelRow}>
          <label style={s.label}>Password:</label>
          <input
            type="password"
            style={s.inputLine}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
        </div>
        <div style={s.labelRow}>
          <label style={s.label}>Confirm:</label>
          <input
            type="password"
            style={s.inputLine}
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {content}
      {error && <p style={s.errorLine}>{error}</p>}
    </div>
  );
}

export default forwardRef(ImportSeed);

function getStyles(theme) {
  const dark = (theme.name === 'dark');
  const color = theme.color || (dark ? '#eee' : '#333');
  const borderColor = theme.inputBorder || (dark ? 'rgba(255,255,255,0.2)' : '#ccc');

  return {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    block: {
      marginBottom: '0.8rem'
    },
    title: {
      margin: 0,
      fontSize: '1rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      color
    },
    desc: {
      margin: 0,
      marginBottom: '0.7rem',
      fontSize: '0.9rem',
      color
    },
    textArea: {
      width: '100%',
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      padding: '0.4rem',
      backgroundColor: 'transparent',
      color,
      resize: 'none',
      fontSize: '0.9rem',
      outline: 'none'
    },
    labelRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: '0.6rem'
    },
    label: {
      width: 80,
      fontSize: '0.9rem',
      color
    },
    inputLine: {
      flex: 1,
      border: `1px solid ${borderColor}`,
      borderRadius: 4,
      backgroundColor: 'transparent',
      color,
      fontSize: '0.9rem',
      padding: '0.3rem 0.5rem',
      outline: 'none'
    },
    errorLine: {
      marginTop: '0.4rem',
      color: 'red',
      fontSize: '0.85rem'
    }
  };
}
