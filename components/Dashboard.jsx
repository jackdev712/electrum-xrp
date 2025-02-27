import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AiOutlineFolderOpen,
  AiOutlineUnlock,
  AiOutlineLock,
  AiOutlineEye,
  AiOutlineFile,
  AiOutlineCreditCard,
  AiOutlineExpand,
  AiOutlineInfoCircle,
  AiOutlineHome,
  AiOutlineSwap,
  AiOutlineExport,
  AiOutlineImport,
  AiOutlineTags,
  AiOutlineFileText,
  AiOutlineFileDone,
  AiOutlineExperiment,
  AiFillSetting,
  AiOutlineShopping,
  AiFillLock,
  AiFillUnlock,
  AiOutlineKey,
  AiOutlineSun,
  AiOutlineMoon,
  AiOutlineRight,
} from 'react-icons/ai';
import { useWallet } from '../context/WalletContext';
import { useThemeContext } from '../context/ThemeContext';
import BalancePanel from './dashboard-panels/BalancePanel';
import TransactionsPanel from './dashboard-panels/TransactionsPanel';
import SendPanel from './dashboard-panels/SendPanel';
import ReceivePanel from './dashboard-panels/ReceivePanel';
import TokensPanel from './dashboard-panels/TokensPanel';
import NotesPanel from './dashboard-panels/NotesPanel';
import SignPanel from './dashboard-panels/SignPanel';
import AdvancedPanel from './dashboard-panels/AdvancedPanel';
import SettingsPanel from './dashboard-panels/SettingsPanel';
import BuyPanel from './dashboard-panels/BuyPanel';
import OfflineIndicator from './dashboard-panels/OfflineIndicator';

function ShowSeedModal({ onClose, wallet, theme }) {
  const isDark = theme.name === 'dark';
  let displaySeed = 'No seed to show';
  if (wallet) {
    if (wallet.seed) {
      displaySeed = wallet.seed;
    } else if (wallet.mnemonic) {
      displaySeed = wallet.mnemonic;
    }
  }
  return (
    <div style={modalStyles.overlay}>
      <div
        style={{
          ...modalStyles.content,
          backgroundColor: theme.panelBg,
          color: theme.color,
          boxShadow: isDark
            ? '0 0 12px rgba(0,0,0,0.7)'
            : '0 0 12px rgba(0,0,0,0.2)',
        }}
      >
        <div style={modalStyles.titleRow}>
          <AiOutlineEye size={20} style={{ marginRight: '0.5rem' }} />
          <h3 style={modalStyles.title}>Show Seed</h3>
        </div>
        <p style={modalStyles.paragraph}>Your wallet seed or mnemonic:</p>
        <div
          style={{
            ...modalStyles.seedBox,
            backgroundColor: isDark ? '#333' : '#f9f9f9',
          }}
        >
          {displaySeed}
        </div>
        <div style={modalStyles.btnRow}>
          <button
            style={{
              ...modalStyles.btn,
              backgroundColor: isDark ? '#444' : '#eee',
              color: isDark ? '#fff' : '#000',
            }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function LockModal({ onClose, onUnlock, theme }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const isDark = theme.name === 'dark';
  function handleUnlock() {
    if (!pwd.trim()) {
      setError('Please enter a password.');
      return;
    }
    const ok = onUnlock(pwd.trim());
    if (!ok) {
      setError('Wrong password.');
    } else {
      onClose();
    }
  }
  return (
    <div style={modalStyles.overlay}>
      <div
        style={{
          ...modalStyles.content,
          backgroundColor: theme.panelBg,
          color: theme.color,
          boxShadow: isDark
            ? '0 0 12px rgba(0,0,0,0.7)'
            : '0 0 12px rgba(0,0,0,0.2)',
        }}
      >
        <div style={modalStyles.titleRow}>
          <AiOutlineUnlock size={20} style={{ marginRight: '0.5rem' }} />
          <h3 style={modalStyles.title}>Unlock Wallet</h3>
        </div>
        {error && <div style={modalStyles.errorBox}>{error}</div>}
        <input
          type="password"
          style={{
            ...modalStyles.input,
            backgroundColor: isDark ? '#333' : '#fff',
            color: isDark ? '#fff' : '#000',
          }}
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Enter password"
        />
        <div style={modalStyles.btnRow}>
          <button
            style={{
              ...modalStyles.btn,
              backgroundColor: isDark ? '#444' : '#eee',
              color: isDark ? '#fff' : '#000',
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{
              ...modalStyles.btn,
              backgroundColor: isDark ? '#2291DC' : '#258FE6',
              color: '#fff',
            }}
            onClick={handleUnlock}
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}

function DecryptWalletModal({ filePath, onClose, onDecrypted, theme }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const isDark = theme.name === 'dark';
  async function handleDecrypt() {
    if (!pwd.trim()) {
      setError('Please enter password');
      return;
    }
    try {
      const resp = await window.electronAPI.decryptWalletFile(filePath, pwd.trim());
      if (!resp.ok) {
        setError(resp.error || 'Decryption failed.');
        return;
      }
      onDecrypted(resp.wallet, pwd.trim());
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <div style={modalStyles.overlay}>
      <div
        style={{
          ...modalStyles.content,
          backgroundColor: theme.panelBg,
          color: theme.color,
          boxShadow: isDark
            ? '0 0 12px rgba(0,0,0,0.7)'
            : '0 0 12px rgba(0,0,0,0.2)',
        }}
      >
        <div style={modalStyles.titleRow}>
          <AiOutlineFolderOpen size={20} style={{ marginRight: '0.5rem' }} />
          <h3 style={modalStyles.title}>Decrypt Wallet</h3>
        </div>
        <p style={modalStyles.paragraph}>
          Wallet file: <b>{filePath}</b>
        </p>
        <p style={modalStyles.paragraph}>Enter the password to decrypt:</p>
        {error && <div style={modalStyles.errorBox}>{error}</div>}
        <input
          type="password"
          style={{
            ...modalStyles.input,
            backgroundColor: isDark ? '#333' : '#fff',
            color: isDark ? '#fff' : '#000',
          }}
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Enter password..."
        />
        <div style={modalStyles.btnRow}>
          <button
            style={{
              ...modalStyles.btn,
              backgroundColor: isDark ? '#444' : '#eee',
              color: isDark ? '#fff' : '#000',
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{
              ...modalStyles.btn,
              backgroundColor: isDark ? '#2291DC' : '#258FE6',
              color: '#fff',
            }}
            onClick={handleDecrypt}
          >
            Decrypt
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    wallet,
    locked,
    lockWallet,
    unlockWallet,
    recentWallets,
    balance,
    setWalletWithPath,
    setMasterPassword,
    fiatCurrency,
    xrpPriceFiat,
  } = useWallet();
  const { theme, toggleTheme } = useThemeContext();
  const isDark = theme.name === 'dark';
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [decryptFilePath, setDecryptFilePath] = useState(null);
  const [activeTab, setActiveTab] = useState('Home');
  const [hoveredTab, setHoveredTab] = useState(null);
  const [pressedTab, setPressedTab] = useState(null);
  const [draggingTabIndex, setDraggingTabIndex] = useState(null);
  const [dragOverTabIndex, setDragOverTabIndex] = useState(null);
  const [tabs, setTabs] = useState([
    { key: 'Home', label: 'Home', icon: <AiOutlineHome size={16} /> },
    { key: 'Transactions', label: 'Transactions', icon: <AiOutlineSwap size={16} /> },
    { key: 'Send', label: 'Send', icon: <AiOutlineExport size={16} /> },
    { key: 'Receive', label: 'Receive', icon: <AiOutlineImport size={16} /> },
    { key: 'Tokens', label: 'Tokens', icon: <AiOutlineTags size={16} /> },
    { key: 'Notes', label: 'Notes', icon: <AiOutlineFileText size={16} /> },
    { key: 'Sign', label: 'Sign', icon: <AiOutlineFileDone size={16} /> },
    { key: 'Advanced', label: 'Advanced', icon: <AiOutlineExperiment size={16} /> },
    { key: 'Settings', label: 'Settings', icon: <AiFillSetting size={16} /> },
    { key: 'Buy', label: 'Buy', icon: <AiOutlineShopping size={16} /> },
  ]);
  const [openMenu, setOpenMenu] = useState(null);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!wallet) {
      navigate('/');
    }
  }, [wallet, navigate]);
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
        setOpenSubmenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    function handleMouseUp() {
      setPressedTab(null);
    }
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);
  const xrpBalance = balance ? balance / 1000000 : 0;
  const totalFiat = xrpBalance * xrpPriceFiat;
  function handleLockOrUnlock() {
    if (!locked) {
      lockWallet();
    } else {
      setLockModalOpen(true);
    }
    setOpenMenu(null);
  }
  function handleToggleFullscreen() {
    if (window.electronAPI?.toggleFullscreen) {
      window.electronAPI.toggleFullscreen();
    }
    setOpenMenu(null);
  }
  function handleOpenRecent(filePath) {
    setOpenMenu(null);
    if (!window.electronAPI) {
      alert('No electronAPI');
      return;
    }
    window.electronAPI.openFileByPath(filePath).then((resp) => {
      if (resp.error) {
        alert('Error open: ' + resp.error);
        return;
      }
      if (!resp.fileData) {
        alert('No file data returned');
        return;
      }
      const jdata = JSON.parse(resp.fileData);
      if (jdata.encrypted && jdata.cipherText) {
        setDecryptFilePath(filePath);
      } else {
        setWalletWithPath(jdata, filePath);
        setMasterPassword(jdata.masterPassword || '');
      }
    });
  }
  function handleRemoveRecent(filePath) {
    alert('Removing recent file is not implemented in this code snippet.');
  }
  function handleCreateRestore() {
    navigate('/?fromCreateRestore=1');
    setOpenMenu(null);
  }
  function handleExitApp() {
    if (window.electronAPI?.appQuit) {
      window.electronAPI.appQuit();
    }
    setOpenMenu(null);
  }
  function handleHelp() {
    alert('Help not implemented');
    setOpenMenu(null);
  }
  function handleAbout() {
    alert('XRP Desktop Wallet — About Info');
    setOpenMenu(null);
  }
  function handleToggleTheme() {
    toggleTheme();
    setOpenMenu(null);
  }
  function onTabDragStart(e, dragIndex) {
    setDraggingTabIndex(dragIndex);
    const clone = e.currentTarget.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.opacity = '0.8';
    clone.style.transform = 'scale(1)';
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, 0, 0);
    e.dataTransfer.setData('text/plain', dragIndex.toString());
  }
  function onTabDragEnd() {
    setDraggingTabIndex(null);
    setDragOverTabIndex(null);
  }
  function onTabDragOver(e) {
    e.preventDefault();
  }
  function onTabDragEnter(e, overIndex) {
    if (overIndex !== draggingTabIndex) {
      setDragOverTabIndex(overIndex);
    }
  }
  function onTabDrop(e, dropIndex) {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData('text/plain');
    if (!dragIndexStr) return;
    const dragIndex = parseInt(dragIndexStr, 10);
    if (isNaN(dragIndex)) return;
    reorderTabs(dragIndex, dropIndex);
    setDraggingTabIndex(null);
    setDragOverTabIndex(null);
  }
  function reorderTabs(fromIndex, toIndex) {
    setTabs((prev) => {
      const newTabs = [...prev];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return newTabs;
    });
    if (tabs[fromIndex].key === activeTab) {
      const newIndex = toIndex;
      const newActiveTab = tabs[newIndex] ? tabs[newIndex].key : tabs[fromIndex].key;
      setActiveTab(newActiveTab);
    }
  }
  const topMenuItems = [
    {
      id: 'file',
      label: 'File',
      icon: <AiOutlineFile style={{ marginRight: 4 }} />,
      submenu: [
        {
          label: 'Recently opened...',
          hasSubmenu: true,
          items: (recentWallets || []).map((rw) => ({
            label: rw.filePath,
            onClick: () => handleOpenRecent(rw.filePath),
            remove: () => handleRemoveRecent(rw.filePath),
          })),
        },
        { label: 'Create/Restore', onClick: handleCreateRestore },
        { label: 'Exit', onClick: handleExitApp },
      ],
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: <AiOutlineCreditCard style={{ marginRight: 4 }} />,
      submenu: [
        {
          label: locked ? 'Unlock Wallet' : 'Lock Wallet',
          onClick: handleLockOrUnlock,
        },
        { label: 'Show Seed', onClick: () => setShowSeedModal(true) },
      ],
    },
    {
      id: 'view',
      label: 'View',
      icon: <AiOutlineExpand style={{ marginRight: 4 }} />,
      submenu: [
        { label: 'Toggle Fullscreen', onClick: handleToggleFullscreen },
        {
          label: isDark ? 'Switch to Light' : 'Switch to Dark',
          onClick: handleToggleTheme,
        },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      icon: <AiOutlineInfoCircle style={{ marginRight: 4 }} />,
      submenu: [
        { label: 'Help', onClick: handleHelp },
        { label: 'About', onClick: handleAbout },
      ],
    },
  ];
  const hoverBgColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const activeBgColor = isDark ? '#2291DC' : '#258FE6';
  const underlineColor = '#87DDFD';
  function renderActiveTab() {
    switch (activeTab) {
      case 'Home':
        return <BalancePanel theme={theme} />;
      case 'Transactions':
        return <TransactionsPanel theme={theme} />;
      case 'Send':
        return <SendPanel theme={theme} />;
      case 'Receive':
        return <ReceivePanel theme={theme} />;
      case 'Tokens':
        return <TokensPanel theme={theme} />;
      case 'Notes':
        return <NotesPanel theme={theme} />;
      case 'Sign':
        return <SignPanel theme={theme} />;
      case 'Advanced':
        return <AdvancedPanel theme={theme} />;
      case 'Settings':
        return <SettingsPanel theme={theme} />;
      case 'Buy':
        return <BuyPanel theme={theme} />;
      default:
        return <div style={{ padding: '1rem' }}>No tab selected</div>;
    }
  }
  function renderSubSubmenu(items) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '100%',
          minWidth: 200,
          backgroundColor: theme.menubarBg,
          color: theme.color,
          border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #ccc',
          borderRadius: 4,
          boxShadow: isDark
            ? '0 4px 10px rgba(0,0,0,0.7)'
            : '0 4px 10px rgba(0,0,0,0.2)',
          zIndex: 10000,
        }}
      >
        {items.map((sub, i2) => (
          <div
            key={i2}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom:
                i2 === items.length - 1
                  ? 'none'
                  : isDark
                  ? '1px solid #555'
                  : '1px solid #eee',
              transition: 'background-color 0.15s ease',
            }}
            onClick={(ev) => {
              ev.stopPropagation();
              sub.onClick && sub.onClick();
              setOpenSubmenu(null);
              setOpenMenu(null);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 130,
              }}
            >
              {sub.label}
            </div>
            {sub.remove && (
              <div
                style={{ marginLeft: 8, cursor: 'pointer' }}
                onClick={(evt) => {
                  evt.stopPropagation();
                  sub.remove();
                  setOpenSubmenu(null);
                  setOpenMenu(null);
                }}
              >
                x
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  function renderDropdownMenu(submenu) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          minWidth: 160,
          zIndex: 9999,
          backgroundColor: theme.menubarBg,
          color: theme.color,
          border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #ccc',
          borderRadius: 4,
          boxShadow: isDark
            ? '0 4px 10px rgba(0,0,0,0.7)'
            : '0 4px 10px rgba(0,0,0,0.2)',
        }}
      >
        {submenu.map((item, idx) => {
          if (item.hasSubmenu && item.items) {
            const isSubOpen = openSubmenu === item.label;
            return (
              <div
                key={idx}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  position: 'relative',
                  borderBottom:
                    idx === submenu.length - 1
                      ? 'none'
                      : isDark
                      ? '1px solid #555'
                      : '1px solid #eee',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={() => setOpenSubmenu(item.label)}
                onMouseLeave={() => setOpenSubmenu(null)}
              >
                <div style={{ display: 'flex' }}>
                  <span>{item.label}</span>
                  <AiOutlineRight style={{ marginLeft: 'auto' }} />
                </div>
                {isSubOpen && renderSubSubmenu(item.items)}
              </div>
            );
          } else {
            return (
              <div
                key={idx}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  borderBottom:
                    idx === submenu.length - 1
                      ? 'none'
                      : isDark
                      ? '1px solid #555'
                      : '1px solid #eee',
                  transition: 'background-color 0.15s ease',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick && item.onClick();
                  setOpenMenu(null);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {item.label}
              </div>
            );
          }
        })}
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        backgroundColor: isDark ? '#1F1F1F' : '#F6F7F8',
        backgroundImage: isDark ? 'url("./images/xrpback.png")' : 'none',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      {lockModalOpen && locked && (
        <LockModal
          onClose={() => setLockModalOpen(false)}
          onUnlock={(pwd) => unlockWallet(pwd)}
          theme={theme}
        />
      )}
      {showSeedModal && (
        <ShowSeedModal
          onClose={() => setShowSeedModal(false)}
          wallet={wallet}
          theme={theme}
        />
      )}
      {decryptFilePath && (
        <DecryptWalletModal
          filePath={decryptFilePath}
          onClose={() => setDecryptFilePath(null)}
          onDecrypted={(decWallet, pwdUsed) => {
            setWalletWithPath(decWallet, decryptFilePath);
            setMasterPassword(pwdUsed);
            setDecryptFilePath(null);
          }}
          theme={theme}
        />
      )}
      <div
        ref={menuRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '2px 4px',
          userSelect: 'none',
          position: 'relative',
          zIndex: 999,
          background: isDark
            ? 'linear-gradient(90deg, #2F2F2F, #3F3F3F)'
            : 'linear-gradient(90deg, #FFFFFF, #EAEAEA)',
          borderBottom: isDark ? '1px solid #444' : '1px solid #ccc',
          boxShadow: isDark
            ? '0 2px 6px rgba(0,0,0,0.6)'
            : '0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        {topMenuItems.map((menu) => {
          const isOpen = openMenu === menu.id;
          const isHover = hoveredMenu === menu.id;
          const bgc = isOpen || isHover ? (isDark ? '#2291DC' : '#2291DC') : 'transparent';
          const clr = isOpen || isHover ? '#fff' : theme.color;
          return (
            <div
              key={menu.id}
              style={{
                marginRight: 4,
                padding: '4px 8px',
                cursor: 'pointer',
                position: 'relative',
                borderRadius: 4,
                fontSize: '0.9rem',
                backgroundColor: bgc,
                color: clr,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={() => {
                if (openMenu && openMenu !== menu.id) {
                  setOpenMenu(menu.id);
                  setOpenSubmenu(null);
                }
                setHoveredMenu(menu.id);
              }}
              onMouseLeave={() => setHoveredMenu(null)}
              onClick={() => {
                setOpenMenu((prev) => (prev === menu.id ? null : menu.id));
                setOpenSubmenu(null);
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {menu.icon}
                <span>{menu.label}</span>
              </div>
              {isOpen && renderDropdownMenu(menu.submenu)}
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          borderBottom: isDark ? '1px solid #444' : '1px solid #ccc',
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)',
          boxShadow: isDark
            ? 'inset 0 -1px 0 rgba(255,255,255,0.1)'
            : 'inset 0 -1px 0 rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease',
        }}
      >
        {tabs.map((tb, index) => {
          const active = tb.key === activeTab;
          const hovered = tb.key === hoveredTab;
          const pressed = tb.key === pressedTab;
          const dragging = index === draggingTabIndex;
          const dragOver = index === dragOverTabIndex;
          let bgColor = 'transparent';
          let txtColor = theme.color;
          if (active) {
            bgColor = activeBgColor;
            txtColor = '#fff';
            if (pressed) {
              bgColor = hoverBgColor;
            }
          } else {
            if (hovered || pressed) {
              bgColor = hoverBgColor;
            }
          }
          let tabOpacity = dragging ? 0.5 : 1.0;
          let scale = dragging ? 1.05 : 1.0;
          let outline = dragOver ? '2px dashed #87DDFD' : 'none';
          return (
            <div
              key={tb.key}
              draggable
              onDragStart={(e) => onTabDragStart(e, index)}
              onDragEnd={onTabDragEnd}
              onDragOver={onTabDragOver}
              onDragEnter={(e) => onTabDragEnter(e, index)}
              onDrop={(e) => onTabDrop(e, index)}
              onClick={() => setActiveTab(tb.key)}
              onMouseEnter={() => setHoveredTab(tb.key)}
              onMouseLeave={() => {
                setHoveredTab(null);
                setPressedTab(null);
              }}
              onMouseDown={() => setPressedTab(tb.key)}
              onMouseUp={() => setPressedTab(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 42,
                padding: '0 14px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                userSelect: 'none',
                color: txtColor,
                backgroundColor: bgColor,
                borderBottom: active ? `3px solid ${underlineColor}` : '3px solid transparent',
                transition: 'background-color 0.2s ease, border-bottom 0.2s ease, transform 0.2s ease',
                opacity: tabOpacity,
                transform: `scale(${scale})`,
                outline: outline,
              }}
            >
              {tb.icon}
              <span style={{ marginLeft: 6 }}>{tb.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{renderActiveTab()}</div>
      <div
        style={{
          height: 38,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          background: isDark
            ? 'linear-gradient(90deg, #2F2F2F, #3F3F3F)'
            : 'linear-gradient(90deg, #FFFFFF, #EAEAEA)',
          color: theme.color,
          borderTop: isDark ? '1px solid #444' : '1px solid #ccc',
          boxShadow: isDark
            ? '0 -2px 6px rgba(0,0,0,0.6)'
            : '0 -2px 6px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
          <img
            src="./images/xrp.webp"
            alt="XRP"
            style={{ width: 18, height: 18, marginRight: 6 }}
          />
          <span style={{ marginRight: 10 }}>{xrpBalance.toFixed(4)} XRP</span>
          <span style={{ marginRight: 10 }}>
            (~{totalFiat.toFixed(2)} {fiatCurrency})
          </span>
          <span>
            1 XRP ~ {xrpPriceFiat?.toFixed(4)} {fiatCurrency}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={iconBtnStyle}
            title="Show seed"
            onClick={() => setShowSeedModal(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'scale(1.07)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <AiOutlineKey size={16} />
          </div>
          <div
            style={iconBtnStyle}
            title={locked ? 'Unlock wallet' : 'Lock wallet'}
            onClick={handleLockOrUnlock}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'scale(1.07)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {locked ? <AiFillUnlock size={16} /> : <AiFillLock size={16} />}
          </div>
          <div
            style={iconBtnStyle}
            onClick={handleToggleTheme}
            title="Switch Theme"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'scale(1.07)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isDark ? <AiOutlineSun size={16} /> : <AiOutlineMoon size={16} />}
          </div>
          <div
            style={iconBtnStyle}
            onClick={() => setActiveTab('Settings')}
            title="Settings"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'scale(1.07)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <AiFillSetting size={16} />
          </div>
          <OfflineIndicator />
        </div>
      </div>
    </div>
  );
}

const iconBtnStyle = {
  width: 30,
  height: 30,
  borderRadius: 4,
  backgroundColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, transform 0.15s ease',
  boxShadow: 'inset 0 0 2px rgba(0,0,0,0.1)',
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 99999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: 360,
    minHeight: 150,
    padding: '1rem',
    borderRadius: 6,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
  },
  paragraph: {
    margin: 0,
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    marginTop: '0.8rem',
  },
  btn: {
    padding: '0.3rem 0.8rem',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.85rem',
    border: 'none',
  },
  seedBox: {
    whiteSpace: 'pre-wrap',
    padding: '0.5rem',
    borderRadius: 4,
    minHeight: '2rem',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
  },
  errorBox: {
    backgroundColor: '#fdd',
    color: '#900',
    padding: '0.4rem',
    marginBottom: '0.4rem',
    borderRadius: 4,
  },
  input: {
    width: '100%',
    marginBottom: '0.5rem',
    borderRadius: 4,
    padding: '0.3rem 0.6rem',
    border: '1px solid #999',
    fontSize: '0.9rem',
    outline: 'none',
  },
};
