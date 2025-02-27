import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeContext } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import CreateSeed from './Create';
import ImportSeed from './Import';

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useThemeContext();
  const {
    walletFileName,
    setWalletFileName,
    setWalletWithPath,
    masterPassword,
    setMasterPassword,
    addRecentWallet
  } = useWallet();
  const [step, setStep] = useState(1);
  const [filePath, setFilePath] = useState(walletFileName || '');
  const [fileExists, setFileExists] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [decryptionError, setDecryptionError] = useState('');
  const [keyChoice, setKeyChoice] = useState('new_seed');
  const createSeedRef = useRef(null);
  const importSeedRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('resetFile') === '1') {
      setFilePath('');
      setWalletFileName('');
    }
  }, [location, setWalletFileName]);

  useEffect(() => {
    checkFileStatus(filePath);
  }, [filePath, step]);

  async function checkFileStatus(fp) {
    setDecryptionError('');
    setUserPassword('');
    if (!fp) {
      setFileExists(false);
      setIsEncrypted(false);
      return;
    }
    if (window.electronAPI?.checkWalletFileEncryption) {
      try {
        const result = await window.electronAPI.checkWalletFileEncryption(fp);
        if (!result) {
          setFileExists(false);
          setIsEncrypted(false);
        } else {
          setFileExists(result.exists);
          setIsEncrypted(result.encrypted);
        }
      } catch {
        setFileExists(false);
        setIsEncrypted(false);
      }
    } else {
      setFileExists(false);
      setIsEncrypted(false);
    }
  }

  async function handleBrowse() {
    setDecryptionError('');
    setUserPassword('');
    if (window.electronAPI?.openWalletFileDialog) {
      const selectedPath = await window.electronAPI.openWalletFileDialog();
      if (selectedPath) {
        setFilePath(selectedPath);
      }
    }
  }

  function handleBack() {
    if (step === 1) {
      if (window.electronAPI?.appQuit) {
        window.electronAPI.appQuit();
      } else {
        window.close();
      }
      return;
    }
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 3) {
      if (keyChoice === 'new_seed' && createSeedRef.current) {
        const r = createSeedRef.current.handleBack();
        if (r === 'go-previous-step') {
          setStep(2);
        }
      } else if (keyChoice === 'existing_seed' && importSeedRef.current) {
        const r = importSeedRef.current.handleBack();
        if (r === 'go-previous-step') {
          setStep(2);
        }
      } else {
        setStep(2);
      }
    }
  }

  async function handleNext() {
    if (step === 1) {
      if (!filePath.trim()) {
        return;
      }
      setWalletFileName(filePath);
      if (!fileExists) {
        setStep(2);
      } else {
        if (!isEncrypted) {
          try {
            const resp = await window.electronAPI.openFileByPath(filePath);
            if (resp.error) {
              setDecryptionError('Open file error: ' + resp.error);
              return;
            }
            if (!resp.fileData) {
              setDecryptionError('No file data returned');
              return;
            }
            const jdata = JSON.parse(resp.fileData);
            setMasterPassword('');
            setWalletWithPath(jdata, filePath);
            addRecentWallet(filePath);
            navigate('/dashboard');
          } catch (err) {
            setDecryptionError('Open file error: ' + err.message);
          }
        } else {
          if (!userPassword.trim()) {
            setDecryptionError('Please enter password');
            return;
          }
          const resp = await window.electronAPI.decryptWalletFile(filePath, userPassword);
          if (!resp.ok) {
            setDecryptionError('Decrypt error: ' + (resp.error || 'Wrong password?'));
            return;
          }
          setMasterPassword(userPassword);
          setWalletWithPath(resp.wallet, filePath);
          addRecentWallet(filePath);
          navigate('/dashboard');
        }
      }
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      if (keyChoice === 'new_seed' && createSeedRef.current) {
        const res = await createSeedRef.current.handleNext();
        if (res === 'finish') {
          navigate('/dashboard');
        }
      } else if (keyChoice === 'existing_seed' && importSeedRef.current) {
        const res = await importSeedRef.current.handleNext();
        if (res === 'finish') {
          navigate('/dashboard');
        }
      }
    }
  }

  const s = getStyles(theme);

  return (
    <div style={s.root}>
      <div style={s.centeredLogoArea}>
        <img src="images/electrum_logo.png" alt="XRP Logo" style={s.centeredLogo} />
      </div>
      <div style={s.card}>
        {step === 1 && (
          <Step1FileSelect
            theme={theme}
            filePath={filePath}
            setFilePath={setFilePath}
            fileExists={fileExists}
            isEncrypted={isEncrypted}
            userPassword={userPassword}
            setUserPassword={setUserPassword}
            decryptionError={decryptionError}
            onBrowse={handleBrowse}
          />
        )}
        {step === 2 && (
          <Step2Choice
            theme={theme}
            keyChoice={keyChoice}
            setKeyChoice={setKeyChoice}
          />
        )}
        {step === 3 &&
          (keyChoice === 'new_seed' ? (
            <CreateSeed ref={createSeedRef} />
          ) : (
            <ImportSeed ref={importSeedRef} />
          ))}
        <div style={s.buttonRow}>
          {step > 1 && (
            <button style={s.backBtn} onClick={handleBack}>
              Back
            </button>
          )}
          <button style={s.nextBtn} onClick={handleNext}>
            {step === 3 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1FileSelect({
  theme,
  filePath,
  setFilePath,
  fileExists,
  isEncrypted,
  userPassword,
  setUserPassword,
  decryptionError,
  onBrowse
}) {
  const s = getStyles(theme);
  return (
    <div style={s.stepContainer}>
      <h2 style={s.stepTitle}>Select or Create a Wallet File</h2>
      <div style={s.fieldBlock}>
        <label style={s.fieldLabel}>Wallet file path:</label>
        <div style={s.fieldRow}>
          <input
            type="text"
            style={s.inputLine}
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
          />
          <button style={s.browseBtn} onClick={onBrowse}>
            Browse
          </button>
        </div>
      </div>
      {!fileExists && (
        <p style={s.infoLine}>
          File does not exist. Press <strong>Next</strong> to create a new wallet.
        </p>
      )}
      {fileExists && !isEncrypted && (
        <p style={s.infoLine}>
          This file is not encrypted. Press <strong>Next</strong> to open it.
        </p>
      )}
      {fileExists && isEncrypted && (
        <div style={s.encryptedArea}>
          <p style={s.infoLine}>
            This wallet file is <strong>encrypted</strong>.<br />
            Enter password:
          </p>
          <input
            type="password"
            style={s.inputLine}
            placeholder="•••••••"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
          />
          {decryptionError && <p style={s.errorLine}>{decryptionError}</p>}
        </div>
      )}
      {!fileExists && decryptionError && <p style={s.errorLine}>{decryptionError}</p>}
    </div>
  );
}

function Step2Choice({ theme, keyChoice, setKeyChoice }) {
  const s = getStyles(theme);
  return (
    <div style={s.stepContainer}>
      <h2 style={s.stepTitle}>Create or Import Keys</h2>
      <p style={s.infoLine}>
        Do you want to generate a new XRPL seed or import an existing one?
      </p>
      <div style={s.radioBox}>
        <label style={s.radioLabel}>
          <input
            type="radio"
            name="keyChoice"
            value="new_seed"
            checked={keyChoice === 'new_seed'}
            onChange={() => setKeyChoice('new_seed')}
          />
          Create new seed
        </label>
        <label style={s.radioLabel}>
          <input
            type="radio"
            name="keyChoice"
            value="existing_seed"
            checked={keyChoice === 'existing_seed'}
            onChange={() => setKeyChoice('existing_seed')}
          />
          Import existing seed
        </label>
      </div>
    </div>
  );
}

function getStyles(theme) {
  const dark = theme.name === 'dark';
  const color = theme.color || (dark ? '#eee' : '#333');
  const borderColor = theme.inputBorder || (dark ? 'rgba(255,255,255,0.2)' : '#ccc');
  return {
    root: {
      width: '100vw',
      height: '100vh',
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: dark
        ? 'radial-gradient(circle at center,rgb(18,14,16), #161625)'
        : 'radial-gradient(circle at center, #fafafa, #eaeaea)',
      overflow: 'hidden'
    },
    centeredLogoArea: {
      position: 'absolute',
      top: '6%',
      left: '50%',
      transform: 'translateX(-50%)'
    },
    centeredLogo: {
      width: 120,
      height: 120,
      opacity: 0.9
    },
    card: {
      width: '360px',
      minHeight: '170px',
      maxHeight: '60vh',
      background: dark ? 'rgba(25,25,35,0.85)' : 'rgba(255,255,255,0.9)',
      borderRadius: 12,
      boxShadow: dark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.2)',
      padding: '1rem',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'stretch'
    },
    stepContainer: {
      flex: 1,
      overflowY: 'auto'
    },
    stepTitle: {
      margin: 0,
      marginBottom: '0.6rem',
      fontSize: '1.1rem',
      fontWeight: 600,
      color
    },
    fieldBlock: {
      marginBottom: '0.8rem'
    },
    fieldLabel: {
      display: 'block',
      fontSize: '0.9rem',
      marginBottom: '0.3rem',
      color
    },
    fieldRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    },
    inputLine: {
      flex: 1,
      border: `1px solid ${borderColor}`,
      backgroundColor: 'transparent',
      borderRadius: 4,
      color,
      fontSize: '0.85rem',
      padding: '0.3rem 0.5rem',
      outline: 'none'
    },
    browseBtn: {
      border: `1px solid ${borderColor}`,
      borderRadius: 4,
      fontSize: '0.8rem',
      padding: '0.3rem 0.6rem',
      background: 'transparent',
      color,
      cursor: 'pointer'
    },
    infoLine: {
      fontSize: '0.85rem',
      lineHeight: 1.4,
      color,
      marginBottom: '0.5rem'
    },
    encryptedArea: {
      marginTop: '0.5rem'
    },
    errorLine: {
      fontSize: '0.8rem',
      color: 'red',
      marginTop: '0.5rem'
    },
    radioBox: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      marginTop: '1rem'
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: '0.9rem',
      color
    },
    buttonRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '1rem'
    },
    backBtn: {
      border: `1px solid ${borderColor}`,
      background: 'transparent',
      borderRadius: 4,
      color,
      padding: '0.3rem 0.7rem',
      fontSize: '0.85rem',
      cursor: 'pointer'
    },
    nextBtn: {
      border: `1px solid ${borderColor}`,
      background: 'transparent',
      borderRadius: 4,
      color,
      padding: '0.3rem 0.7rem',
      fontSize: '0.85rem',
      cursor: 'pointer'
    }
  };
}
