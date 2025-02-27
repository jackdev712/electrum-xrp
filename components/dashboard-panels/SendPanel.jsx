import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle, keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSend,
  FiTrash2,
  FiCopy,
  FiLoader,
  FiLock
} from 'react-icons/fi';
import { useWallet } from '../../context/WalletContext';
import { useThemeContext } from '../../context/ThemeContext';
import { sendXrpTransaction } from '../../services/apiService';

const ApexGlobalStyle = createGlobalStyle`
  .apexcharts-menu {
    background-color: ${({ $isDark }) => ($isDark ? '#2a2a2a' : '#fff')} !important;
    color: ${({ $isDark }) => ($isDark ? '#e0e0e0' : '#333')} !important;
    border: ${({ $isDark }) => ($isDark ? '1px solid #444' : '1px solid #ccc')} !important;
    box-shadow: ${({ $isDark }) =>
      $isDark
        ? '0 3px 10px rgba(0, 0, 0, 0.7)'
        : '0 3px 8px rgba(0, 0, 0, 0.2)'} !important;
  }
  .apexcharts-menu-item {
    padding: 6px 12px !important;
  }
  .apexcharts-menu-item:hover {
    background-color: ${({ $isDark }) => ($isDark ? '#444' : '#eee')} !important;
    color: ${({ $isDark }) => ($isDark ? '#fff' : '#000')} !important;
  }
`;

const gradientAnim = keyframes`
  0% { background-position:0% 50% }
  50% { background-position:100% 50% }
  100% { background-position:0% 50% }
`;

const spinKeyframes = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const copyHighlight = keyframes`
  0% { background-color: rgba(50,200,50,0.2); }
  100% { background-color: transparent; }
`;

export default function SendPanel() {
  const { wallet, locked, unfunded, balance, xrpPriceFiat, fiatCurrency, transactions } = useWallet();
  const { theme } = useThemeContext();
  const xrpBalance = balance / 1_000_000;
  const BASE_RESERVE = 10;
  const [toAddress, setToAddress] = useState('');
  const [xrpAmount, setXrpAmount] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [tag, setTag] = useState('');
  const [memo, setMemo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [lockedMsg, setLockedMsg] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [copiedTxHash, setCopiedTxHash] = useState(null);
  const outgoingTxs = (transactions || []).filter(tx => tx.direction === 'outgoing');
  function addLog(msg) {
    setDebugLogs(prev => [...prev, msg]);
    console.log('[SendPanel]', msg);
  }
  useEffect(() => {
    if (!xrpAmount) {
      setFiatAmount('');
      return;
    }
    const val = parseFloat(xrpAmount);
    if (!val || val <= 0 || !xrpPriceFiat) {
      setFiatAmount('');
      return;
    }
    const fiatVal = val * xrpPriceFiat;
    setFiatAmount(fiatVal.toFixed(2));
  }, [xrpAmount, xrpPriceFiat]);
  function handleFiatChange(e) {
    const val = e.target.value;
    setFiatAmount(val);
    const num = parseFloat(val);
    if (!num || num <= 0 || !xrpPriceFiat) {
      setXrpAmount('');
      return;
    }
    const xVal = num / xrpPriceFiat;
    setXrpAmount(xVal.toFixed(6));
  }
  function handleMax() {
    const feeEstimate = 0.00002;
    const available = xrpBalance - BASE_RESERVE - feeEstimate;
    if (available <= 0) {
      setXrpAmount('');
      setFiatAmount('');
      return;
    }
    setXrpAmount(available.toFixed(6));
  }
  function handleClear() {
    setToAddress('');
    setXrpAmount('');
    setFiatAmount('');
    setTag('');
    setMemo('');
    setErrorMsg('');
    setSuccessMsg('');
    setDebugLogs([]);
    setShowAdvanced(false);
  }
  async function handleSend() {
    setErrorMsg('');
    setSuccessMsg('');
    setDebugLogs([]);
    setSending(true);
    try {
      if (!wallet?.seed || !wallet?.address) {
        throw new Error('No wallet loaded/unlocked.');
      }
      if (locked) {
        setLockedMsg(true);
        setTimeout(() => setLockedMsg(false), 2500);
        throw new Error('Wallet is locked.');
      }
      if (unfunded) {
        throw new Error('Account has less than 10 XRP; not activated.');
      }
      if (!toAddress.trim()) {
        throw new Error('Recipient address is required.');
      }
      const amtNum = parseFloat(xrpAmount);
      if (!amtNum || amtNum <= 0) {
        throw new Error('Invalid XRP amount.');
      }
      if (amtNum > xrpBalance) {
        throw new Error(`Insufficient balance. You have ${xrpBalance.toFixed(6)} XRP`);
      }
      addLog('--- SEND TRANSACTION START ---');
      const opts = {
        seed: wallet.seed,
        fromAddress: wallet.address,
        toAddress: toAddress.trim(),
        amountXrp: amtNum,
        onLog: addLog
      };
      if (tag.trim()) {
        const dt = parseInt(tag.trim(), 10);
        if (!Number.isNaN(dt)) {
          opts.destinationTag = dt;
        }
      }
      if (memo.trim()) {
        opts.memo = memo.trim();
      }
      const resp = await sendXrpTransaction(opts);
      addLog('--- SEND TRANSACTION END ---');
      addLog(JSON.stringify(resp, null, 2));
      if (resp?.meta?.TransactionResult === 'tesSUCCESS') {
        const txHash = resp.hash || resp.transaction?.hash || 'N/A';
        setSuccessMsg(`Transaction successful!\nHash: ${txHash}`);
      } else if (resp?.error === 'PENDING') {
        setErrorMsg('Transaction pending.');
      } else {
        const code = resp?.meta?.TransactionResult || resp?.error || 'Unknown';
        throw new Error(`Transaction failed: ${code}`);
      }
    } catch (err) {
      setErrorMsg(err.message);
      addLog(`ERROR => ${err.message}`);
    } finally {
      setSending(false);
      addLog('--- DONE ---');
    }
  }
  function renderOutgoingTable() {
    if (!outgoingTxs.length) {
      return <NoTxText theme={theme}>No outgoing transactions.</NoTxText>;
    }
    return (
      <TableWrapper>
        <TxTable $isDark={theme.darkMode} theme={theme}>
          <thead>
            <tr>
              <THCell>Date</THCell>
              <THCell>Amount (XRP)</THCell>
              <THCell>Fee (XRP)</THCell>
              <THCell>TxHash</THCell>
            </tr>
          </thead>
          <tbody>
            {outgoingTxs.map((tx, idx) => {
              let dateStr = '—';
              if (tx.date) {
                const rippleEpoch = 946684800;
                const d = new Date((tx.date + rippleEpoch) * 1000);
                dateStr = d.toLocaleString();
              }
              const amtXrp = tx.deliveredAmountDrops
                ? (parseInt(tx.deliveredAmountDrops, 10) / 1_000_000).toFixed(6)
                : '';
              const feeXrp = tx.fee
                ? (parseInt(tx.fee, 10) / 1_000_000).toFixed(6)
                : '';
              return (
                <TRow key={idx}>
                  <TDCell>{dateStr}</TDCell>
                  <TDCell>{amtXrp}</TDCell>
                  <TDCell>{feeXrp}</TDCell>
                  <TDCell>
                    <CopyTxButton txHash={tx.txHash} setCopiedTxHash={setCopiedTxHash} $isDark={theme.darkMode} />
                  </TDCell>
                </TRow>
              );
            })}
          </tbody>
        </TxTable>
      </TableWrapper>
    );
  }
  return (
    <>
      <ApexGlobalStyle $isDark={theme.darkMode} />
      <Container $isDark={theme.darkMode}>
        <AnimatePresence mode="wait">
          {sending ? (
            <GlassPanel
              key="spinner"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              $isDark={theme.darkMode}
            >
              <SpinnerWrapper>
                <SpinnerIcon>
                  <FiLoader />
                </SpinnerIcon>
                <SpinnerText theme={theme}>Sending Transaction...</SpinnerText>
              </SpinnerWrapper>
            </GlassPanel>
          ) : (
            <GlassPanel
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              $isDark={theme.darkMode}
            >
              <HeaderRow>
                <PanelTitle>Send XRP</PanelTitle>
                {lockedMsg && <LockedBox>Wallet is locked</LockedBox>}
              </HeaderRow>
              <FormRow>
                <Label>To:</Label>
                <FormInput
                  $isDark={theme.darkMode}
                  placeholder="Recipient address"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  disabled={sending}
                />
              </FormRow>
              <FormRow>
                <Label>XRP:</Label>
                <SmallInput
                  $isDark={theme.darkMode}
                  placeholder="0.0"
                  value={xrpAmount}
                  onChange={(e) => setXrpAmount(e.target.value)}
                  disabled={sending}
                />
                <MaxBtn $isDark={theme.darkMode} disabled={sending} onClick={handleMax}>
                  Max
                </MaxBtn>
                <Label style={{ width: 'auto' }}>{fiatCurrency}:</Label>
                <SmallInput
                  $isDark={theme.darkMode}
                  placeholder="0.00"
                  value={fiatAmount}
                  onChange={handleFiatChange}
                  disabled={sending}
                />
              </FormRow>
              <AdvToggle onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? 'Advanced ▲' : 'Advanced ▼'}
              </AdvToggle>
              <AdvBox style={{ maxHeight: showAdvanced ? '150px' : '0', transition: 'max-height 0.3s ease', overflow: 'hidden' }}>
                {showAdvanced && (
                  <>
                    <FormRow>
                      <Label>Tag:</Label>
                      <FormInput
                        $isDark={theme.darkMode}
                        placeholder="(optional)"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        disabled={sending}
                      />
                    </FormRow>
                    <FormRow>
                      <Label>Memo:</Label>
                      <FormInput
                        $isDark={theme.darkMode}
                        placeholder="(optional) note"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        disabled={sending}
                      />
                    </FormRow>
                  </>
                )}
              </AdvBox>
              {errorMsg && (
                <ErrorBox theme={theme}>
                  {errorMsg.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                </ErrorBox>
              )}
              {successMsg && (
                <SuccessBox theme={theme}>
                  {successMsg.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                </SuccessBox>
              )}
              <ButtonRow>
                <ClearBtn $isDark={theme.darkMode} disabled={sending} onClick={handleClear}>
                  <FiTrash2 style={{ marginRight: 4 }} />
                  Clear
                </ClearBtn>
                <SendBtn $isDark={theme.darkMode} disabled={sending || locked || unfunded} onClick={handleSend}>
                  <FiSend style={{ marginRight: 4 }} />
                  Send
                </SendBtn>
              </ButtonRow>
              <DebugToggle theme={theme} onClick={() => setShowDebug(!showDebug)}>
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </DebugToggle>
              {showDebug && (
                <DebugBox $isDark={theme.darkMode} theme={theme}>
                  {debugLogs.length === 0 ? (
                    <NoLogsMsg theme={theme}>No logs. Press "Send" to see details.</NoLogsMsg>
                  ) : (
                    debugLogs.map((line, idx) => <LogLine key={idx}>{line}</LogLine>)
                  )}
                </DebugBox>
              )}
              <HistorySection>
                <HistTitle>Outgoing History</HistTitle>
                {renderOutgoingTable()}
              </HistorySection>
            </GlassPanel>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {copiedTxHash && (
            <CopiedPopup
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              Copied!
            </CopiedPopup>
          )}
        </AnimatePresence>
      </Container>
    </>
  );
}

function CopyTxButton({ txHash, setCopiedTxHash, $isDark }) {
  const [highlight, setHighlight] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(txHash);
      setCopiedTxHash(txHash);
      setHighlight(true);
      setTimeout(() => setHighlight(false), 600);
      setTimeout(() => setCopiedTxHash(null), 1500);
    } catch (err) {
      console.error('Copy error:', err);
    }
  }
  return (
    <TxHashButton $highlight={highlight} $isDark={$isDark} onClick={handleCopy} title="Copy TxHash">
      {txHash.slice(0, 8) + '...'}
    </TxHashButton>
  );
}

const Container = styled(motion.div)`
  width: 100%;
  min-height: 340px;
  padding: 0.8rem;
  border-radius: 8px;
  box-sizing: border-box;
  color: ${({ $isDark, theme }) => ($isDark ? '#dfe1e2' : (theme.color || '#333'))};
  background: ${({ $isDark, theme }) =>
    $isDark
      ? (theme.background || 'linear-gradient(135deg,rgba(26,36,47,0),rgba(20,26,32,0))')
      : (theme.background || 'linear-gradient(135deg,#fafafa,#f5f5f5)')};
  background-size: 200% 200%;
  animation: ${gradientAnim} 10s ease infinite;
  position: relative;
`;

const GlassPanel = styled(motion.div)`
  border-radius: 10px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 1rem;
  background: ${({ $isDark, theme }) =>
    $isDark
      ? (theme.panelBg || 'linear-gradient(to right, rgba(255,0,0,0), rgba(255,255,255,0.05))')
      : (theme.panelBg || 'linear-gradient(to right, rgba(255,255,255,0.7), rgba(255,255,255,0.4))')};
  box-shadow: ${({ $isDark }) =>
    $isDark
      ? '0 2px 8px rgba(0,0,0,0)'
      : '0 2px 8px rgba(0,0,0,0)'}; 
  border: ${({ $isDark, theme }) =>
    $isDark
      ? `1px solid ${theme.borderColor || '#ccc'}`
      : `1px solid ${theme.borderColor || '#ccc'}`};
  display: flex;
  flex-direction: column;
  min-height: 260px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
`;

const PanelTitle = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const LockedBox = styled.div`
  background-color: rgba(255,56,56,0.12);
  color: #ff4d4d;
  font-size: 0.85rem;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
`;

const FormRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
`;

const Label = styled.label`
  width: 45px;
  text-align: right;
  font-weight: 600;
  font-size: 0.85rem;
`;

const FormInput = styled.input`
  flex: 1;
  padding: 0.4rem;
  border: 1px solid ${({ $isDark, theme }) => $isDark ? (theme.borderColor || '#444') : '#ccc'};
  border-radius: 4px;
  font-size: 0.85rem;
  background: ${({ $isDark, theme }) => $isDark ? (theme.inputBg || '#333') : '#fff'};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  ${({ disabled }) => disabled && css`opacity: 0.6; cursor: not-allowed;`}
`;

const SmallInput = styled(FormInput)`
  flex: 0 1 70px;
  text-align: right;
`;

const MaxBtn = styled.button`
  padding: 0.3rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  background: ${({ $isDark, theme }) => $isDark ? (theme.buttonBg || '#333') : (theme.buttonBg || '#eee')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.buttonColor || theme.color || '#333')};
  &:hover {
    background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.15)' : '#ddd'};
    color: ${({ $isDark, theme }) => $isDark ? '#fff' : '#000'};
  }
  ${({ disabled }) => disabled && css`opacity: 0.6; cursor: not-allowed;`}
`;

const AdvToggle = styled.div`
  margin-top: 0.6rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.linkColor || '#007bff'};
  cursor: pointer;
`;

const AdvBox = styled.div`
  overflow: hidden;
`;

const ErrorBox = styled.div`
  background-color: ${({ theme }) => theme.errorBg || 'rgba(255,0,0,0.1)'};
  color: red;
  padding: 0.4rem;
  border-radius: 4px;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
`;

const SuccessBox = styled.div`
  background-color: ${({ theme }) => theme.successBg || 'rgba(0,255,0,0.06)'};
  color: green;
  padding: 0.4rem;
  border-radius: 4px;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const ClearBtn = styled.button`
  padding: 0.4rem 0.8rem;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  background: ${({ $isDark, theme }) => $isDark ? (theme.buttonBg || '#333') : (theme.buttonBg || '#eee')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.buttonColor || theme.color || '#333')};
  &:hover {
    background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.15)' : '#ddd'};
    color: ${({ $isDark, theme }) => $isDark ? '#fff' : '#000'};
  }
  ${({ disabled }) => disabled && css`opacity: 0.6; cursor: not-allowed;`}
`;

const SendBtn = styled.button`
  padding: 0.4rem 0.8rem;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  background: ${({ $isDark, theme }) => $isDark ? (theme.buttonBg || '#333') : (theme.buttonBg || '#eee')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.buttonColor || theme.color || '#333')};
  &:hover {
    background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.15)' : '#ddd'};
    color: ${({ $isDark, theme }) => $isDark ? '#fff' : '#000'};
  }
  ${({ disabled }) => disabled && css`opacity: 0.6; cursor: not-allowed;`}
`;

const DebugToggle = styled.div`
  margin-top: 1rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.linkColor || '#007bff'};
  cursor: pointer;
`;

const DebugBox = styled.div`
  margin-top: 0.4rem;
  padding: 0.6rem;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  max-height: 180px;
  overflow-y: auto;
  font-size: 0.8rem;
  background: ${({ $isDark, theme }) => $isDark ? (theme.panelBg || 'rgba(255,255,255,0.07)') : (theme.panelBg || '#fff')};
  color: ${({ theme }) => theme.color || '#333'};
`;

const NoLogsMsg = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.color || '#333'};
`;

const LogLine = styled.div`
  white-space: pre-wrap;
  margin-bottom: 0.2rem;
`;

const HistorySection = styled.div`
  margin-top: 1rem;
`;

const HistTitle = styled.h4`
  margin: 0 0 0.4rem 0;
  font-size: 0.9rem;
  font-weight: 600;
`;

const NoTxText = styled.p`
  font-size: 0.85rem;
  margin-top: 4px;
  color: ${({ theme }) => theme.color || '#777'};
`;

const TableWrapper = styled.div`
  width:100%;
  overflow-x:auto;
  margin-top:0.4rem;
`;

const TxTable = styled.table`
  width:100%;
  border-collapse:collapse;
  font-size:0.8rem;
  border:1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  thead tr {
    background: ${({ $isDark, theme }) => $isDark ? 'rgba(255,255,255,0.08)' : theme.panelBg || '#f9f9f9'};
  }
  tbody tr:nth-child(even) {
    background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
  }
`;

const THCell = styled.th`
  padding:0.4rem;
  text-align:left;
  border-bottom:1px solid ${({ theme }) => theme.borderColor || '#ccc'};
`;

const TRow = styled.tr`
  border-bottom:1px solid ${({ theme }) => theme.borderColor || '#eee'};
`;

const TDCell = styled.td`
  padding:0.4rem;
  vertical-align:middle;
`;

const SpinnerWrapper = styled.div`
  flex:1;
  min-height:150px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:0.5rem;
`;

const SpinnerIcon = styled.div`
  font-size:1.6rem;
  animation:${spinKeyframes} 1s linear infinite;
  color:#299946;
`;

const SpinnerText = styled.div`
  font-size:0.9rem;
  font-weight:500;
  color: ${({ theme }) => theme.buttonColor || '#299946'};
`;

const TxHashButton = styled.button`
  cursor:pointer;
  border:1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius:4px;
  background:${({ $highlight }) => $highlight ? '#87DDFD' : 'transparent'};
  color:${({ $isDark, $highlight, theme }) => {
    if($highlight) return '#fff';
    return $isDark ? '#fff' : (theme.color || '#333');
  }};
  font-size:0.75rem;
  padding:0.2rem 0.4rem;
  &:hover {
    background:${({ $highlight }) => $highlight ? '#87DDFD' : '#ddd'};
    color:${({ $isDark, $highlight, theme }) => {
      if($highlight) return '#fff';
      return $isDark ? '#fff' : '#000';
    }};
  }
  transition: background 0.2s;
  animation:${({ $highlight }) => $highlight && css`${copyHighlight} 0.6s`};
`;

const CopiedPopup = styled(motion.div)`
  position:fixed;
  bottom:1rem;
  left:50%;
  transform:translateX(-50%);
  background-color:#34a853;
  color:#fff;
  padding:0.4rem 0.8rem;
  font-size:0.85rem;
  font-weight:500;
  border-radius:4px;
  box-shadow:0 2px 8px rgba(0,0,0,0.2);
`;
