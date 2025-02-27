import React, { useEffect, useState } from 'react';
import styled, { createGlobalStyle, keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw,
  FiTrash2,
  FiSettings,
  FiPlusCircle
} from 'react-icons/fi';
import { useWallet } from '../../context/WalletContext';
import { useThemeContext } from '../../context/ThemeContext';
import {
  getTrustLines,
  setTrustLine,
  deleteTrustLine
} from '../../services/xrplAdvancedService';

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

export default function TokensPanel() {
  const { wallet, locked, unfunded } = useWallet();
  const { theme } = useThemeContext();
  const isDark = theme.darkMode || theme.name === 'dark';
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [newCurrency, setNewCurrency] = useState('');
  const [newIssuer, setNewIssuer] = useState('');
  const [newLimit, setNewLimit] = useState('1000');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [ripplingEnabled, setRipplingEnabled] = useState(false);
  const [freezeEnabled, setFreezeEnabled] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [qualityIn, setQualityIn] = useState('');
  const [qualityOut, setQualityOut] = useState('');
  const [memoText, setMemoText] = useState('');

  async function loadTrustLines() {
    setError('');
    setSuccessMsg('');
    if (!wallet || !wallet.address) {
      setError('No wallet address loaded — cannot load trust lines.');
      return;
    }
    if (unfunded) {
      setError('Account not activated. Cannot have trust lines yet.');
      return;
    }
    try {
      setLoading(true);
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const resp = await getTrustLines(url, wallet.address);
      setLines(resp);
    } catch (err) {
      setError(`Failed to load trust lines: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  function validateTrustLineFields() {
    const currency = newCurrency.trim().toUpperCase();
    const issuer = newIssuer.trim();
    const limit = newLimit.trim();
    if (!wallet || !wallet.seed) {
      return 'No wallet seed (wallet not loaded).';
    }
    if (locked) {
      return 'Wallet is locked. Please unlock before adding/updating trust lines.';
    }
    if (unfunded) {
      return 'Account not activated (no 10 XRP). Cannot create trust lines.';
    }
    if (!currency) {
      return 'Currency is required. E.g. "USD" or "EUR".';
    }
    if (currency === 'XRP') {
      return 'Cannot create a trust line for the native XRP token.';
    }
    if (!issuer.startsWith('r')) {
      return 'Issuer must be a valid XRPL address starting with "r".';
    }
    if (issuer.length < 25 || issuer.length > 35) {
      return 'Issuer address length looks invalid (25-35 chars typical).';
    }
    if (!limit || isNaN(Number(limit))) {
      return 'Limit must be a valid number.';
    }
    const limitVal = parseFloat(limit);
    if (limitVal <= 0) {
      return 'Limit must be > 0.';
    }
    return null;
  }

  async function handleAddTrust() {
    setError('');
    setSuccessMsg('');
    const validationError = validateTrustLineFields();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const currency = newCurrency.trim().toUpperCase();
      const issuer = newIssuer.trim();
      const limit = newLimit.trim();
      const memos = memoText.trim() ? [memoText.trim()] : [];
      const noRipple = !ripplingEnabled;
      const freeze = freezeEnabled;
      const qIn = qualityIn ? parseInt(qualityIn, 10) : undefined;
      const qOut = qualityOut ? parseInt(qualityOut, 10) : undefined;
      const result = await setTrustLine({
        serverUrl: url,
        seed: wallet.seed,
        currency,
        issuer,
        limit,
        memos,
        noRipple,
        freeze,
        authorized,
        qualityIn: qIn,
        qualityOut: qOut
      });
      if (result?.error === 'PENDING') {
        setError('Transaction not validated in time. Possibly still pending...');
      } else {
        setSuccessMsg('Trust line successfully added/updated.');
      }
      await loadTrustLines();
    } catch (err) {
      setError(`Failed to set trust line: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(line) {
    setError('');
    setSuccessMsg('');
    if (!wallet || !wallet.seed) {
      setError('No wallet seed (wallet not loaded).');
      return;
    }
    if (locked) {
      setError('Wallet is locked. Please unlock before removing trust lines.');
      return;
    }
    if (unfunded) {
      setError('Account not activated. Cannot remove trust lines.');
      return;
    }
    const bal = parseFloat(line.balance);
    if (bal !== 0) {
      alert(`Cannot remove trust line if balance!=0 (current: ${line.balance}).`);
      return;
    }
    try {
      setLoading(true);
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const result = await deleteTrustLine({
        serverUrl: url,
        seed: wallet.seed,
        currency: line.currency,
        issuer: line.account
      });
      if (result?.error === 'PENDING') {
        setError('Removal not validated in time. Possibly still pending...');
      } else {
        setSuccessMsg('Trust line removed (limit=0).');
      }
      await loadTrustLines();
    } catch (err) {
      setError(`Failed to delete trust line: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrustLines();
  }, [wallet, locked, unfunded]);

  return (
    <>
      <ApexGlobalStyle $isDark={isDark} />
      <Container $isDark={isDark}>
        {!wallet || !wallet.address ? (
          <GlassPanel initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} $isDark={isDark}>
            <NoWalletMsg>No wallet loaded.</NoWalletMsg>
          </GlassPanel>
        ) : unfunded ? (
          <GlassPanel initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} $isDark={isDark}>
            <Title>Token Management (Trust Lines)</Title>
            <WarningText>
              This account is not activated (no 10 XRP). Cannot create or manage trust lines yet.
            </WarningText>
          </GlassPanel>
        ) : (
          <GlassPanel initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} $isDark={isDark}>
            <Title>Token Management (Trust Lines)</Title>
            {error && (
              <ErrorBox>
                <FiAlertCircle style={{ marginRight: 6 }} />
                {error}
              </ErrorBox>
            )}
            {successMsg && (
              <SuccessBox>
                <FiCheckCircle style={{ marginRight: 6 }} />
                {successMsg}
              </SuccessBox>
            )}
            <Row>
              <Button $isDark={isDark} onClick={loadTrustLines} disabled={loading}>
                <FiRefreshCw style={{ marginRight: 4 }} />
                {loading ? 'Loading...' : 'Refresh List'}
              </Button>
            </Row>
            <FormSection>
              <FormLabel>Currency:</FormLabel>
              <FormInput
                $isDark={isDark}
                type="text"
                placeholder="e.g. USD, EUR..."
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value)}
              />
              <FormLabel>Issuer:</FormLabel>
              <FormInput
                $isDark={isDark}
                type="text"
                placeholder="rXXXXXXXXXXXX..."
                value={newIssuer}
                onChange={(e) => setNewIssuer(e.target.value)}
                style={{ width: '180px' }}
              />
              <FormLabel>Limit:</FormLabel>
              <FormInput
                $isDark={isDark}
                type="text"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                style={{ width: '70px' }}
              />
              <Button $isDark={isDark} style={{ marginLeft: 8 }} onClick={handleAddTrust} disabled={loading}>
                <FiPlusCircle style={{ marginRight: 4 }} />
                Add/Update
              </Button>
            </FormSection>
            <AdvancedToggle $isDark={isDark} onClick={() => setAdvancedOpen(!advancedOpen)}>
              <FiSettings style={{ marginRight: 4 }} />
              {advancedOpen ? 'Hide Advanced Options ▲' : 'Show Advanced Options ▼'}
            </AdvancedToggle>
            <AnimatePresence>
              {advancedOpen && (
                <AdvancedBox
                  key="advanced"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  $isDark={isDark}
                >
                  <AdvRow>
                    <CheckboxLabel>
                      <input
                        type="checkbox"
                        checked={ripplingEnabled}
                        onChange={(e) => setRipplingEnabled(e.target.checked)}
                      />
                      Rippling?
                    </CheckboxLabel>
                    <CheckboxLabel>
                      <input
                        type="checkbox"
                        checked={freezeEnabled}
                        onChange={(e) => setFreezeEnabled(e.target.checked)}
                      />
                      Freeze?
                    </CheckboxLabel>
                    <CheckboxLabel>
                      <input
                        type="checkbox"
                        checked={authorized}
                        onChange={(e) => setAuthorized(e.target.checked)}
                      />
                      Authorized?
                    </CheckboxLabel>
                  </AdvRow>
                  <AdvRow>
                    <SmallLabel>QualityIn:</SmallLabel>
                    <FormInput
                      $isDark={isDark}
                      type="number"
                      style={{ width: '60px' }}
                      value={qualityIn}
                      onChange={(e) => setQualityIn(e.target.value)}
                      placeholder="0 or empty"
                    />
                    <SmallLabel>QualityOut:</SmallLabel>
                    <FormInput
                      $isDark={isDark}
                      type="number"
                      style={{ width: '60px' }}
                      value={qualityOut}
                      onChange={(e) => setQualityOut(e.target.value)}
                      placeholder="0 or empty"
                    />
                  </AdvRow>
                  <AdvRow>
                    <SmallLabel>Memo:</SmallLabel>
                    <FormInput
                      $isDark={isDark}
                      type="text"
                      style={{ width: '250px' }}
                      value={memoText}
                      onChange={(e) => setMemoText(e.target.value)}
                      placeholder="Optional memo"
                    />
                  </AdvRow>
                </AdvancedBox>
              )}
            </AnimatePresence>
            <TableWrapper>
              <LinesTable $isDark={isDark}>
                <thead>
                  <tr>
                    <THCell>Currency</THCell>
                    <THCell>Issuer</THCell>
                    <THCell>Balance</THCell>
                    <THCell>Limit</THCell>
                    <THCell>Flags</THCell>
                    <THCell></THCell>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const flagsArr = [];
                    if (line.no_ripple) flagsArr.push('NoRipple');
                    if (line.freeze) flagsArr.push('Freeze');
                    if (line.authorized) flagsArr.push('Authorized');
                    const flagsStr = flagsArr.join(', ');
                    const bal = parseFloat(line.balance);
                    return (
                      <TRow key={idx}>
                        <TDCell>{line.currency}</TDCell>
                        <TDCell>{line.account}</TDCell>
                        <TDCell>{line.balance}</TDCell>
                        <TDCell>{line.limit}</TDCell>
                        <TDCell>{flagsStr}</TDCell>
                        <TDCell>
                          <Button
                            $isDark={isDark}
                            onClick={() => handleRemove(line)}
                            disabled={loading || bal !== 0}
                          >
                            <FiTrash2 style={{ marginRight: 3 }} />
                            Remove
                          </Button>
                        </TDCell>
                      </TRow>
                    );
                  })}
                  {lines.length === 0 && (
                    <TRow>
                      <TDCell colSpan={6} style={{ textAlign: 'center', fontStyle: 'italic', color: '#777' }}>
                        No trust lines found.
                      </TDCell>
                    </TRow>
                  )}
                </tbody>
              </LinesTable>
            </TableWrapper>
          </GlassPanel>
        )}
      </Container>
    </>
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
      : (theme.background || 'linear-gradient(135deg, #fafafa, #f5f5f5)')};
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
      ? (theme.panelBg || 'linear-gradient(to right, rgba(255, 0, 0, 0), rgba(255, 255, 255, 0.05))')
      : (theme.panelBg || 'linear-gradient(to right, rgba(255,255,255,0.7), rgba(255,255,255,0.4))')};
  box-shadow: ${({ $isDark }) =>
    $isDark
      ? '0 2px 8px rgba(0, 0, 0, 0)'
      : '0 2px 8px rgba(0, 0, 0, 0)'};
  border: ${({ $isDark, theme }) =>
    $isDark
      ? `1px solid ${theme.borderColor || 'rgba(255,255,255,0.2)'}`
      : `1px solid ${theme.borderColor || 'rgba(255,255,255,0.3)'}`};
  display: flex;
  flex-direction: column;
  min-height: 260px;
`;

const NoWalletMsg = styled.p`
  margin-top: 0.5rem;
  color: red;
`;

const WarningText = styled.p`
  margin-top: 0.5rem;
  color: red;
  font-weight: 500;
`;

const Title = styled.h3`
  margin: 0 0 0.6rem 0;
  font-size: 1rem;
  font-weight: 600;
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  background-color: rgba(255,0,0,0.1);
  color: red;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid red;
  border-radius: 4px;
`;

const SuccessBox = styled.div`
  display: flex;
  align-items: center;
  background-color: rgba(0,255,0,0.1);
  color: green;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid green;
  border-radius: 4px;
`;

const Row = styled.div`
  margin-bottom: 0.5rem;
`;

const Button = styled.button`
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  background: ${({ $isDark, theme }) =>
    $isDark ? (theme.buttonBg || 'rgba(255,255,255,0.08)') : (theme.buttonBg || '#eee')};
  color: ${({ $isDark, theme }) =>
    $isDark ? '#fff' : (theme.buttonColor || theme.color || '#333')};
  font-size: 0.85rem;
  &:hover {
    background: ${({ $isDark }) => ($isDark ? 'rgba(255,255,255,0.15)' : '#ddd')};
    color: ${({ $isDark }) => ($isDark ? '#fff' : '#000')};
  }
  ${({ disabled }) =>
    disabled &&
    css`
      opacity: 0.6;
      cursor: not-allowed;
    `}
`;

const FormSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const FormLabel = styled.label`
  font-size: 0.85rem;
  min-width: 60px;
`;

const FormInput = styled.input`
  padding: 0.3rem;
  border: 1px solid
    ${({ $isDark, theme }) => ($isDark ? theme.inputBorder || '#444' : theme.inputBorder || '#ccc')};
  border-radius: 4px;
  font-size: 0.85rem;
  background: ${({ $isDark, theme }) =>
    $isDark ? theme.inputBg || 'rgba(255,255,255,0.07)' : theme.inputBg || '#fff'};
  color: ${({ $isDark, theme }) => ($isDark ? '#fff' : theme.color || '#333')};
  ${({ disabled }) =>
    disabled &&
    css`
      opacity: 0.6;
      cursor: not-allowed;
    `}
`;

const AdvancedToggle = styled.div`
  font-size: 0.85rem;
  color: ${({ $isDark, theme }) => ($isDark ? '#fff' : theme.linkColor || '#007bff')};
  text-decoration: underline;
  cursor: pointer;
  margin-bottom: 0.5rem;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
`;

const AdvancedBox = styled(motion.div)`
  border: 1px dashed ${({ theme }) => theme.borderColor || '#aaa'};
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  overflow: hidden;
`;

const AdvRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0.4rem 0;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  font-size: 0.85rem;
`;

const SmallLabel = styled.label`
  min-width: 70px;
  text-align: right;
  font-size: 0.8rem;
`;

const TableWrapper = styled.div`
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 300px;
  margin-top: 0.6rem;
`;

const LinesTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  thead tr {
    background: ${({ $isDark, theme }) =>
      $isDark ? 'rgba(255,255,255,0.08)' : theme.panelBg || '#f9f9f9'};
  }
  tbody tr:nth-child(even) {
    background: ${({ $isDark }) => ($isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')};
  }
`;

const THCell = styled.th`
  padding: 0.4rem;
  text-align: left;
  border-bottom: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  font-weight: 600;
`;

const TRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.borderColor || '#eee'};
`;

const TDCell = styled.td`
  padding: 0.4rem;
  vertical-align: middle;
`;
