import React, { useState } from 'react';
import { useThemeContext } from '../../context/ThemeContext';

export default function ShowSeedModal({ onClose, wallet, locked, unlockWallet }) {
  const { theme } = useThemeContext();
  const [pwd, setPwd] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [revealed, setRevealed] = useState(false);

  React.useEffect(() => {
    if (!locked) {
      setRevealed(true);
    }
  }, [locked]);

  function handleConfirm() {
    setErrorMsg('');
    if (!pwd.trim()) {
      setErrorMsg('Please enter wallet password');
      return;
    }
    const ok = unlockWallet(pwd.trim());
    if (!ok) {
      setErrorMsg('Wrong password');
      return;
    }
    setRevealed(true);
  }

  let content;
  if (revealed) {
    const seed = wallet.seed || null;
    const mnemonic = wallet.mnemonic || null;
    if (!seed && !mnemonic) {
      content = (
        <div style={st(theme).revealedSection}>
          <p style={st(theme).text}>No seed to show (wallet might be incomplete).</p>
        </div>
      );
    } else {
      content = (
        <div style={st(theme).revealedSection}>
          {seed && (
            <>
              <p style={st(theme).text}>
                <b>XRPL seed:</b>
              </p>
              <div style={st(theme).seedBox}>{seed}</div>
            </>
          )}
          {mnemonic && (
            <>
              <p style={{ ...st(theme).text, marginTop: '1rem' }}>
                <b>Mnemonic (12 words):</b>
              </p>
              <div style={st(theme).seedBox}>{mnemonic}</div>
            </>
          )}
        </div>
      );
    }
  } else {
    content = (
      <div style={st(theme).lockedSection}>
        <p style={st(theme).text}>Wallet is locked. Enter password:</p>
        <input
          type="password"
          style={st(theme).input}
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
        />
        {errorMsg && <p style={st(theme).errorMsg}>{errorMsg}</p>}
        <div style={st(theme).buttonsRow}>
          <button style={st(theme).btn} onClick={handleConfirm}>Confirm</button>
        </div>
      </div>
    );
  }

  return (
    <div style={st(theme).overlay}>
      <div style={st(theme).modal}>
        <div style={st(theme).header}>
          <h3 style={st(theme).title}>Show Seed</h3>
          <button style={st(theme).closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>
        <div style={st(theme).body}>
          {content}
        </div>
      </div>
    </div>
  );
}

function st(theme) {
  const isDark = theme.darkMode;
  return {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modal: {
      backgroundColor: isDark ? 'rgb(25,35,45)' : '#fff',
      color: theme.color,
      border: isDark ? '1px solid #444' : '1px solid #ccc',
      borderRadius: 6,
      width: 420,
      maxWidth: '90%',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.8rem'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      margin: 0,
      fontSize: '1rem'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '1.2rem',
      cursor: 'pointer',
      color: theme.color
    },
    body: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.8rem'
    },
    lockedSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    text: {
      fontSize: '0.9rem',
      lineHeight: 1.3
    },
    input: {
      border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #ccc',
      borderRadius: 4,
      padding: '0.4rem',
      backgroundColor: isDark ? 'rgb(40,50,60)' : '#fff',
      color: theme.color,
      outline: 'none'
    },
    errorMsg: {
      margin: 0,
      color: isDark ? '#fbb' : '#900',
      fontSize: '0.85rem'
    },
    buttonsRow: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '0.5rem'
    },
    btn: {
      padding: '0.3rem 0.7rem',
      border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #999',
      borderRadius: 4,
      background: 'none',
      color: theme.color,
      cursor: 'pointer',
      fontSize: '0.85rem'
    },
    revealedSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem'
    },
    seedBox: {
      border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #ccc',
      backgroundColor: isDark ? 'rgb(40,50,60)' : '#fafafa',
      color: theme.color,
      borderRadius: 4,
      padding: '0.5rem',
      fontSize: '0.9rem',
      fontFamily: 'monospace',
      lineHeight: 1.4
    }
  };
}
