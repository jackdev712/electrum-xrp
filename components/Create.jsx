import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FiAlertTriangle, FiKey, FiShield } from 'react-icons/fi';
import { useThemeContext } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { generateDirectFamilySeed, generateMnemonicXrp } from '../services/walletService';

function CreateSeed(props, ref) {
  const { onSubStepChanged } = props;
  const { theme } = useThemeContext();
  const { walletFileName, setWalletWithPath, setMasterPassword, addRecentWallet } = useWallet();
  const [subStep, setSubStep] = useState(1);
  const [userChoice, setUserChoice] = useState('direct');
  const [generatedSeed, setGeneratedSeed] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [generatedAddress, setGeneratedAddress] = useState('');
  const [typedCheck, setTypedCheck] = useState('');
  const [typedMnemonic, setTypedMnemonic] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [error, setError] = useState('');
  const [bip39Words, setBip39Words] = useState([]);

  useEffect(() => {
    if (onSubStepChanged) {
      onSubStepChanged(subStep);
    }
  }, [subStep, onSubStepChanged]);

  useEffect(() => {
    fetch('./bip39.txt')
      .then(res => res.text())
      .then(data => {
        const lines = data
          .split('\n')
          .map(line => line.trim())
          .filter(line => line);
        setBip39Words(lines);
      })
      .catch(err => console.error('Error loading BIP39 words:', err));
  }, []);

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      setError('');
      switch (subStep) {
        case 1:
          return 'go-previous-step';
        case 2:
          setGeneratedSeed('');
          setGeneratedMnemonic('');
          setGeneratedAddress('');
          setSubStep(1);
          return null;
        case 3:
          if (userChoice === 'direct') {
            setTypedCheck('');
          } else {
            setTypedMnemonic('');
          }
          setSubStep(2);
          return null;
        case 4:
          setPwd('');
          setPwd2('');
          setSubStep(3);
          return null;
        default:
          return null;
      }
    },
    handleNext: async () => {
      setError('');
      if (subStep === 1) {
        if (userChoice === 'direct') {
          const w = generateDirectFamilySeed();
          setGeneratedSeed(w.seed);
          setGeneratedAddress(w.address);
          setGeneratedMnemonic('');
        } else {
          const w = generateMnemonicXrp();
          setGeneratedSeed(w.seed);
          setGeneratedAddress(w.address);
          setGeneratedMnemonic(w.mnemonic);
        }
        setSubStep(2);
        return null;
      }
      if (subStep === 2) {
        if (userChoice === 'mnemonic') {
          setTypedMnemonic('');
        } else {
          setTypedCheck('');
        }
        setSubStep(3);
        return null;
      }
      if (subStep === 3) {
        if (userChoice === 'direct') {
          if (!typedCheck.trim()) {
            setError('Please re-type the XRPL seed (sEd...)');
            return null;
          }
          if (typedCheck.trim() !== generatedSeed.trim()) {
            setError('Seed does not match');
            return null;
          }
        } else {
          const originalWords = generatedMnemonic.split(' ');
          const typedWords = typedMnemonic.trim().split(/\s+/);
          if (typedWords.length !== 12) {
            setError('You must type exactly 12 words');
            return null;
          }
          for (let i = 0; i < 12; i++) {
            if (typedWords[i] !== originalWords[i]) {
              setError(`Word #${i + 1} does not match`);
              return null;
            }
          }
        }
        setSubStep(4);
        return null;
      }
      if (subStep === 4) {
        if (!pwd.trim() || !pwd2.trim()) {
          setError('Password is required');
          return null;
        }
        if (pwd !== pwd2) {
          setError('Passwords do not match');
          return null;
        }
        let finalFile = walletFileName;
        if (!finalFile) {
          finalFile = `XRPWallet_${Date.now()}.json`;
        }
        try {
          const walletObj = {
            seed: generatedSeed,
            address: generatedAddress
          };
          if (userChoice === 'mnemonic') {
            walletObj.mnemonic = generatedMnemonic;
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
          setError('Error saving file: ' + err.message);
          return null;
        }
      }
      return null;
    },
    getSubStep: () => subStep
  }));

  function handleMnemonicChange(e) {
    const val = e.target.value.toLowerCase();
    setTypedMnemonic(val);
    const parts = val.trim().split(/\s+/);
    if (!parts.length) {
      setSuggestions([]);
      return;
    }
    const lastWord = parts[parts.length - 1];
    if (!lastWord || parts.length > 12) {
      setSuggestions([]);
      return;
    }
    const sugs = bip39Words
      .filter(word => word.startsWith(lastWord))
      .slice(0, 5);
    setSuggestions(sugs);
  }

  function handleWordPick(sug) {
    const parts = typedMnemonic.trim().split(/\s+/);
    parts[parts.length - 1] = sug;
    const replaced = parts.join(' ') + ' ';
    setTypedMnemonic(replaced);
    setSuggestions([]);
  }

  const s = getStyles(theme);

  let content;
  if (subStep === 1) {
    content = (
      <div style={s.block}>
        <h2 style={s.title}>
          <FiKey style={s.icon} />
          Choose Generation Method
        </h2>
        <p style={s.desc}>
          Select how you want to generate your XRPL key:
        </p>
        <div style={s.radioGroup}>
          <label style={s.radioLabel}>
            <input
              type="radio"
              name="genChoice"
              value="direct"
              checked={userChoice === 'direct'}
              onChange={() => setUserChoice('direct')}
            />
            Simple family seed (sEd...)
          </label>
          <label style={s.radioLabel}>
            <input
              type="radio"
              name="genChoice"
              value="mnemonic"
              checked={userChoice === 'mnemonic'}
              onChange={() => setUserChoice('mnemonic')}
            />
            12-word mnemonic
          </label>
        </div>
        <div style={s.tipBox}>
          <FiAlertTriangle style={{ ...s.tipIcon, color: s.iconColor }} />
          <p style={s.tipText}>
            The family seed (sEd...) is shorter, while the 12-word mnemonic is more commonly used in many wallets. Choose whichever you prefer.
          </p>
        </div>
      </div>
    );
  } else if (subStep === 2) {
    if (userChoice === 'direct') {
      content = (
        <div style={s.block}>
          <h2 style={s.title}>
            <FiShield style={{ ...s.icon, color: s.iconColor }} />
            Your new XRPL Seed
          </h2>
          <p style={s.desc}>
            Below is your newly generated <strong>family seed (sEd...)</strong>.<br />Write it down in a safe place. Never share it with anyone!
          </p>
          <div style={s.seedBox}>{generatedSeed}</div>
        </div>
      );
    } else {
      content = (
        <div style={s.block}>
          <h2 style={s.title}>
            <FiShield style={{ ...s.icon, color: s.iconColor }} />
            Your 12-word Mnemonic
          </h2>
          <p style={s.desc}>
            Below is your newly generated <strong>12-word mnemonic</strong>.<br />Write it down carefully. It can restore your wallet at any time.
          </p>
          <div style={s.seedBox}>{generatedMnemonic}</div>
        </div>
      );
    }
  } else if (subStep === 3) {
    if (userChoice === 'direct') {
      content = (
        <div style={s.block}>
          <h2 style={s.title}>Confirm your Seed</h2>
          <p style={s.desc}>
            Please re-type your seed (sEd...) to confirm you wrote it down:
          </p>
          <div style={s.seedBox}>
            <textarea
              style={s.textArea}
              rows={2}
              value={typedCheck}
              onChange={(e) => setTypedCheck(e.target.value)}
            />
          </div>
        </div>
      );
    } else {
      content = (
        <div style={s.block}>
          <h2 style={s.title}>Confirm your 12 Words</h2>
          <p style={s.desc}>
            Enter your 12-word mnemonic below. Paste is disabled to ensure you type them yourself.
          </p>
          <div style={{ ...s.seedBox, position: 'relative' }}>
            <textarea
              style={{ ...s.textArea, marginBottom: 0 }}
              rows={4}
              value={typedMnemonic}
              onChange={handleMnemonicChange}
              onPaste={(e) => e.preventDefault()}
            />
            {suggestions.length > 0 && (
              <div style={s.suggestionBox}>
                {suggestions.map(sug => (
                  <div
                    key={sug}
                    style={s.suggestionItem}
                    onMouseDown={() => handleWordPick(sug)}
                  >
                    {sug}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
  } else {
    content = (
      <div style={s.block}>
        <h2 style={s.title}>Encrypt your Wallet</h2>
        <p style={s.desc}>Set a password to protect your new wallet file:</p>
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

export default forwardRef(CreateSeed);

function getStyles(theme) {
  const dark = theme.name === 'dark';
  const borderColor = theme.inputBorder || (dark ? 'rgba(255,255,255,0.4)' : '#ccc');
  const color = theme.color || (dark ? '#fff' : '#333');

  return {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    },
    iconColor: color,
    block: {
      marginBottom: '1rem'
    },
    title: {
      margin: 0,
      fontSize: '1rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      color
    },
    icon: {
      marginRight: 5,
      verticalAlign: 'text-bottom'
    },
    desc: {
      margin: 0,
      marginBottom: '0.7rem',
      fontSize: '0.9rem',
      lineHeight: 1.4,
      color
    },
    radioGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      marginTop: '0.5rem'
    },
    radioLabel: {
      fontSize: '0.9rem',
      color,
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem'
    },
    tipBox: {
      marginTop: '0.8rem',
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      padding: '0.6rem',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: '0.5rem'
    },
    tipIcon: {
      fontSize: '1.2rem',
      flexShrink: 0
    },
    tipText: {
      margin: 0,
      fontSize: '0.85rem',
      color
    },
    seedBox: {
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      padding: '0.5rem',
      background: 'transparent',
      fontFamily: 'monospace',
      fontSize: '0.9rem',
      color,
      lineHeight: 1.4
    },
    textArea: {
      width: '100%',
      border: 'none',
      backgroundColor: 'transparent',
      color,
      resize: 'none',
      fontSize: '0.9rem',
      outline: 'none'
    },
    suggestionBox: {
      position: 'absolute',
      left: 0,
      bottom: '-130px',
      width: '100%',
      border: `1px solid ${borderColor}`,
      borderRadius: 4,
      backgroundColor: dark ? 'rgba(40,40,60,0.95)' : 'rgba(255,255,255,0.95)',
      zIndex: 999,
      maxHeight: '130px',
      overflowY: 'auto'
    },
    suggestionItem: {
      padding: '0.3rem 0.5rem',
      fontSize: '0.85rem',
      cursor: 'pointer',
      color
    },
    labelRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
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
      marginTop: '0.5rem',
      color: 'red',
      fontSize: '0.85rem'
    }
  };
}
