import React, { useState, useMemo, useRef } from 'react';
import styled, { keyframes, css, createGlobalStyle } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiRefreshCw,
  FiFilter,
  FiSearch,
  FiCopy,
  FiExternalLink,
  FiLock,
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
} from 'react-icons/fi';
import { useWallet } from '../../context/WalletContext';
import { useThemeContext } from '../../context/ThemeContext';

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
  0% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
  100% { background-position: 0% 50% }
`;

const copyHighlight = keyframes`
  0% { background-color: rgba(50,200,50,0.2); }
  100% { background-color: transparent; }
`;

export default function TransactionsPanel() {
  const { transactions, refreshBalanceAndTx, locked, unfunded } = useWallet();
  const { theme } = useThemeContext();
  const [searchHash, setSearchHash] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [onlySuccess, setOnlySuccess] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);
  const [walletLockedMsg, setWalletLockedMsg] = useState(false);
  const [copiedTxHash, setCopiedTxHash] = useState(null);
  const [tooltip, setTooltip] = useState({
    show: false,
    x: 0,
    y: 0,
    fullHash: '',
  });
  const [refreshing, setRefreshing] = useState(false);
  const tableRef = useRef(null);

  const filteredTxs = useMemo(() => {
    let list = [...transactions];
    if (selectedType !== 'all') {
      list = list.filter((tx) => tx.type === selectedType);
    }
    if (onlySuccess) {
      list = list.filter((tx) => tx.result === 'tesSUCCESS');
    }
    const search = searchHash.trim().toLowerCase();
    if (search) {
      list = list.filter((tx) => tx.txHash.toLowerCase().includes(search));
    }
    list.sort((a, b) => {
      const aDate = a.date || 0;
      const bDate = b.date || 0;
      return sortDesc ? bDate - aDate : aDate - bDate;
    });
    return list;
  }, [transactions, selectedType, onlySuccess, searchHash, sortDesc]);

  async function handleRefresh() {
    if (locked) {
      setWalletLockedMsg(true);
      setTimeout(() => setWalletLockedMsg(false), 2500);
      return;
    }
    setRefreshing(true);
    await refreshBalanceAndTx();
    setRefreshing(false);
  }

  function copyHashToClipboard(hash) {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedTxHash(hash);
      setTimeout(() => setCopiedTxHash(null), 1500);
    });
  }

  function openInExplorer(txHash) {
    const url = `https://xrpscan.com/tx/${txHash}`;
    window.open(url, '_blank');
  }

  function handleMouseMove(e) {
    const offset = 12;
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX + offset,
      y: e.clientY + offset,
    }));
  }

  function handleHashMouseEnter(e, fullHash) {
    const offset = 12;
    setTooltip({
      show: true,
      x: e.clientX + offset,
      y: e.clientY + offset,
      fullHash,
    });
  }

  function handleHashMouseLeave() {
    setTooltip((prev) => ({ ...prev, show: false }));
  }

  if (unfunded) {
    return (
      <>
        <ApexGlobalStyle $isDark={theme.darkMode} />
        <Container
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          $isDark={theme.darkMode}
        >
          <GlassPanel
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            $isDark={theme.darkMode}
          >
            <PanelTitle>Transactions</PanelTitle>
            <UnfundedText>
              Account not activated (no transaction history yet).
            </UnfundedText>
            <SmallRefreshButton onClick={handleRefresh}>
              <FiRefreshCw size={14} />
              <span>Refresh</span>
            </SmallRefreshButton>
          </GlassPanel>
        </Container>
      </>
    );
  }

  return (
    <>
      <ApexGlobalStyle $isDark={theme.darkMode} />
      <Container
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        $isDark={theme.darkMode}
        onMouseMove={handleMouseMove}
      >
        <GlassPanel
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          $isDark={theme.darkMode}
        >
          <PanelTitleRow>
            <PanelTitle>Transactions</PanelTitle>
            {walletLockedMsg && <LockedMsg>Wallet is locked</LockedMsg>}
          </PanelTitleRow>
          <FiltersRow>
            <div>
              <RefreshButton onClick={handleRefresh}>
                {refreshing ? (
                  <FiLoader style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <FiRefreshCw style={{ marginRight: 4 }} />
                )}
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </RefreshButton>
            </div>
            <FilterItem>
              <FiFilter style={{ marginRight: 4 }} />
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="Payment">Payment</option>
                <option value="TrustSet">TrustSet</option>
                <option value="OfferCreate">OfferCreate</option>
                <option value="OfferCancel">OfferCancel</option>
                <option value="AccountSet">AccountSet</option>
                <option value="EscrowCreate">EscrowCreate</option>
                <option value="EscrowFinish">EscrowFinish</option>
              </Select>
            </FilterItem>
            <FilterItem>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={onlySuccess}
                  onChange={(e) => setOnlySuccess(e.target.checked)}
                />
                Only success
              </CheckboxLabel>
            </FilterItem>
            <FilterItem>
              <FiSearch style={{ marginRight: 4 }} />
              <SearchInput
                type="text"
                placeholder="Search Tx Hash..."
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
              />
            </FilterItem>
            <FilterItem>
              <label style={{ marginRight: 4 }}>Sort by Date:</label>
              <Select
                value={sortDesc ? 'desc' : 'asc'}
                onChange={(e) => setSortDesc(e.target.value === 'desc')}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </Select>
            </FilterItem>
          </FiltersRow>
          <AnimatePresence mode="wait">
            {refreshing ? (
              <SpinnerWrapper
                key="spinner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SpinnerIcon>
                  <FiLoader />
                </SpinnerIcon>
                <SpinnerText>Refreshing...</SpinnerText>
              </SpinnerWrapper>
            ) : (
              <TransactionsTableWrapper
                key="table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filteredTxs.length === 0 ? (
                  <NoDataMsg>No transactions found matching your criteria.</NoDataMsg>
                ) : (
                  <StyledTable ref={tableRef}>
                    <thead>
                      <tr>
                        <THCell>TX Hash</THCell>
                        <THCell>Type</THCell>
                        <THCell>Date</THCell>
                        <THCell>Amount</THCell>
                        <THCell>Fee</THCell>
                        <THCell>Result</THCell>
                        <THCell>Actions</THCell>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTxs.map((tx, idx) => (
                        <TRow key={idx}>
                          <TDCellMono
                            onMouseEnter={(e) => handleHashMouseEnter(e, tx.txHash)}
                            onMouseLeave={handleHashMouseLeave}
                          >
                            {shortHash(tx.txHash)}
                          </TDCellMono>
                          <TDCell>{renderType(tx.type, tx.direction)}</TDCell>
                          <TDCell>{formatTimestamp(tx.date)}</TDCell>
                          <TDCell>{renderAmount(tx)}</TDCell>
                          <TDCell>
                            {(parseFloat(tx.fee) / 1000000).toFixed(6)}
                          </TDCell>
                          <TDCell>{renderResult(tx.result)}</TDCell>
                          <TDCell>
                            <IconBtn
                              onClick={() => copyHashToClipboard(tx.txHash)}
                              title="Copy TX Hash"
                              $copied={copiedTxHash === tx.txHash}
                            >
                              <FiCopy />
                            </IconBtn>
                            <IconBtn
                              onClick={() => openInExplorer(tx.txHash)}
                              title="View on Explorer"
                            >
                              <FiExternalLink />
                            </IconBtn>
                          </TDCell>
                        </TRow>
                      ))}
                    </tbody>
                  </StyledTable>
                )}
              </TransactionsTableWrapper>
            )}
          </AnimatePresence>
        </GlassPanel>
        <AnimatePresence>
          {tooltip.show && (
            <Tooltip
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              {tooltip.fullHash}
            </Tooltip>
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

function shortHash(hash) {
  if (!hash) return '—';
  if (hash.length <= 12) return hash;
  return hash.slice(0, 6) + '...' + hash.slice(-6);
}

function formatTimestamp(rippleSeconds) {
  if (!rippleSeconds) return '—';
  const rippleEpoch = 946684800;
  const unixTime = rippleSeconds + rippleEpoch;
  return new Date(unixTime * 1000).toLocaleString();
}

function renderType(type, direction) {
  if (!type) return '—';
  if (type === 'Payment') {
    if (direction === 'incoming') {
      return (
        <PaymentType>
          <FiArrowDownCircle style={{ color: '#00c853', marginRight: 4 }} />
          IN
        </PaymentType>
      );
    } else if (direction === 'outgoing') {
      return (
        <PaymentType>
          <FiArrowUpCircle style={{ color: '#e53935', marginRight: 4 }} />
          OUT
        </PaymentType>
      );
    }
    return 'Payment';
  }
  return type;
}

function renderAmount(tx) {
  if (tx.type === 'Payment' && tx.deliveredAmountDrops) {
    const xrpVal = parseFloat(tx.deliveredAmountDrops) / 1000000;
    return `${xrpVal.toFixed(6)} XRP`;
  }
  return '—';
}

function renderResult(result) {
  if (!result) return '—';
  if (result === 'tesSUCCESS') {
    return (
      <SuccessSpan>
        <FiCheckCircle style={{ marginRight: 4 }} />
        Success
      </SuccessSpan>
    );
  }
  return (
    <FailSpan>
      <FiXCircle style={{ marginRight: 4 }} />
      Failed
    </FailSpan>
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

const PanelTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const PanelTitle = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const LockedMsg = styled.div`
  background-color: rgba(255,56,56,0.12);
  color: #ff4d4d;
  font-size: 0.85rem;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
`;

const UnfundedText = styled.p`
  font-size: 0.9rem;
  color: #ff4d4d;
  margin-bottom: 0.6rem;
`;

const FiltersRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  align-items: center;
`;

const FilterItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
`;

const Select = styled.select`
  padding: 0.2rem 0.4rem;
  font-size: 0.8rem;
`;

const SearchInput = styled.input`
  padding: 0.2rem 0.4rem;
  min-width: 140px;
  font-size: 0.8rem;
`;

const SmallRefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background-color: #34a853;
  color: #fff;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: background-color 0.3s;
  &:hover {
    background-color: #299946;
  }
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background-color: #34a853;
  color: #fff;
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: background-color 0.3s;
  outline: none;
  &:hover {
    background-color: #299946;
  }
`;

const SpinnerWrapper = styled(motion.div)`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  gap: 0.5rem;
`;

const SpinnerIcon = styled.div`
  font-size: 1.5rem;
  color: #299946;
  animation: spin 1s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SpinnerText = styled.div`
  font-size: 0.9rem;
  color: #299946;
`;

const TransactionsTableWrapper = styled(motion.div)`
  flex: 1;
  margin-top: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ $isDark }) => ($isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0')};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ $isDark }) => ($isDark ? '#666' : '#bbb')};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ $isDark }) => ($isDark ? '#555' : '#999')};
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`;

const THCell = styled.th`
  text-align: left;
  border-bottom: 1px solid #ccc;
  padding: 0.4rem;
  font-weight: 600;
`;

const TRow = styled.tr`
  border-bottom: 1px solid #eee;
`;

const TDCell = styled.td`
  padding: 0.4rem;
  vertical-align: middle;
`;

const TDCellMono = styled.td`
  padding: 0.4rem;
  vertical-align: middle;
  font-family: monospace;
  position: relative;
  cursor: default;
`;

const IconBtn = styled.button`
  padding: 0.3rem;
  cursor: pointer;
  margin-right: 0.3rem;
  border: none;
  background: none;
  color: inherit;
  font-size: 1rem;
  position: relative;
  animation: ${({ $copied }) =>
    $copied
      ? css`
          ${copyHighlight} 0.6s
        `
      : 'none'};
`;

const NoDataMsg = styled.p`
  margin-top: 0.5rem;
  font-size: 0.9rem;
`;

const PaymentType = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-weight: 500;
`;

const SuccessSpan = styled.span`
  color: #00c853;
  display: inline-flex;
  align-items: center;
`;

const FailSpan = styled.span`
  color: #e53935;
  display: inline-flex;
  align-items: center;
`;

const Tooltip = styled(motion.div)`
  position: fixed;
  z-index: 9999;
  background-color: ${({ theme }) => (theme.darkMode ? '#333' : '#fdfdfd')};
  color: ${({ theme }) => (theme.darkMode ? '#eee' : '#111')};
  padding: 0.3rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  white-space: nowrap;
  pointer-events: none;
`;

const CopiedPopup = styled(motion.div)`
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: #34a853;
  color: #fff;
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
`;
