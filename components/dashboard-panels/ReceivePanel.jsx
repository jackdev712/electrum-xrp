import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { createGlobalStyle, keyframes, css } from 'styled-components';
import { BiQrScan } from 'react-icons/bi';
import { QRCodeCanvas } from 'qrcode.react';
import { useWallet } from '../../context/WalletContext';
import { useThemeContext } from '../../context/ThemeContext';

const ApexGlobalStyle = createGlobalStyle`
  .apexcharts-menu {
    background-color: ${({ $isDark }) => ($isDark ? '#2a2a2a' : '#fff')} !important;
    color: ${({ $isDark }) => ($isDark ? '#e0e0e0' : '#333')} !important;
    border: ${({ $isDark }) => ($isDark ? '1px solid #444' : '1px solid #ccc')} !important;
    box-shadow: ${({ $isDark }) =>
      $isDark
        ? '0 3px 10px rgba(0,0,0,0.7)'
        : '0 3px 8px rgba(0,0,0,0.2)'} !important;
  }
  .apexcharts-menu-item {
    padding:6px 12px !important;
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

const copyHighlight = keyframes`
  0% { background-color: rgba(50,200,50,0.2); }
  100% { background-color: transparent; }
`;

export default function ReceivePanel() {
  const { wallet } = useWallet();
  const { theme } = useThemeContext();
  const [showQr, setShowQr] = useState(false);
  const [amountXrp, setAmountXrp] = useState('');
  const [destinationTag, setDestinationTag] = useState('');
  const [copied, setCopied] = useState(false);

  if (!wallet || !wallet.address) {
    return (
      <Container $isDark={theme.darkMode}>
        <GlassPanel
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          $isDark={theme.darkMode}
        >
          <Title>Receive XRP</Title>
          <NoWalletMsg>No wallet address loaded.</NoWalletMsg>
        </GlassPanel>
      </Container>
    );
  }

  const address = wallet.address;

  function buildXrpUri(addr, amount, dt) {
    let uri = `ripple:${addr}`;
    const params = [];
    if (amount) params.push(`amount=${amount}`);
    if (dt) params.push(`dt=${dt}`);
    if (params.length > 0) {
      uri += '?' + params.join('&');
    }
    return uri;
  }

  const xrpUri = buildXrpUri(address, amountXrp, destinationTag);

  function handleCopy() {
    navigator.clipboard.writeText(address)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error('Copy failed:', err));
  }

  return (
    <>
      <ApexGlobalStyle $isDark={theme.darkMode} />
      <Container $isDark={theme.darkMode}>
        <GlassPanel
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          $isDark={theme.darkMode}
        >
          <Title>Receive XRP</Title>
          <Hr $isDark={theme.darkMode} theme={theme} />
          <Label>XRP address:</Label>
          <AddressRow>
            <MonospaceAddress>{address}</MonospaceAddress>
            <CopyButton
              $isDark={theme.darkMode}
              onClick={handleCopy}
              $copied={copied}
            >
              Copy
            </CopyButton>
          </AddressRow>
          {copied && <CopiedMsg>Address copied!</CopiedMsg>}
          <Hr $isDark={theme.darkMode} theme={theme} />
          <FieldsRow>
            <FieldColumn>
              <Label>Amount (XRP):</Label>
              <Input
                $isDark={theme.darkMode}
                type="number"
                placeholder="e.g. 20"
                value={amountXrp}
                onChange={(e) => setAmountXrp(e.target.value)}
              />
            </FieldColumn>
            <FieldColumn>
              <Label>Destination Tag:</Label>
              <Input
                $isDark={theme.darkMode}
                type="number"
                placeholder="optional"
                value={destinationTag}
                onChange={(e) => setDestinationTag(e.target.value)}
              />
            </FieldColumn>
          </FieldsRow>
          <Hr $isDark={theme.darkMode} theme={theme} />
          <QrButton
            $isDark={theme.darkMode}
            onClick={() => setShowQr(!showQr)}
          >
            <BiQrScan size={16} style={{ marginRight: 6 }} />
            {showQr ? 'Hide QR' : 'Show QR'}
          </QrButton>
          <AnimatePresence>
            {showQr && (
              <QrWrapper
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <QRCodeCanvas
                  value={xrpUri}
                  size={170}
                  includeMargin
                />
              </QrWrapper>
            )}
          </AnimatePresence>
          <InfoText>
            Share this address (plus optional tag) to receive XRP.
          </InfoText>
        </GlassPanel>
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
      ? (theme.background || 'linear-gradient(135deg,rgba(26, 36, 47, 0),rgba(20, 26, 32, 0))')
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
      ? (theme.panelBg || 'linear-gradient(to right, rgba(255,0,0,0), rgba(255,255,255,0.05))')
      : (theme.panelBg || 'linear-gradient(to right, rgba(255,255,255,0.7), rgba(255,255,255,0.4))')};
  box-shadow: ${({ $isDark }) =>
    $isDark
      ? '0 2px 8px rgba(0,0,0,0)'
      : '0 2px 8px rgba(0,0,0,0)'}; 
  border: ${({ $isDark, theme }) =>
    $isDark
      ? `1px solid ${theme.borderColor || 'rgba(255,255,255,0.2)'}` 
      : `1px solid ${theme.borderColor || 'rgba(255,255,255,0.3)'}`};
  display: flex;
  flex-direction: column;
  min-height: 260px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const Hr = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  margin: 0.5rem 0 1rem;
  width: 100%;
`;

const Label = styled.label`
  margin-bottom: 0.2rem;
  font-size: 0.9rem;
  display: block;
  font-weight: 500;
`;

const AddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
  flex-wrap: wrap;
`;

const MonospaceAddress = styled.span`
  font-family: monospace;
  word-break: break-all;
  max-width: 70%;
`;

const CopyButton = styled.button`
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  padding: 0.3rem 0.7rem;
  background: ${({ $isDark, theme }) => $isDark ? (theme.buttonBg || 'rgba(255,255,255,0.07)') : (theme.buttonBg || '#eee')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.buttonColor || theme.color || '#333')};
  &:hover {
    background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.15)' : '#ddd'};
    color: ${({ $isDark, theme }) => $isDark ? '#fff' : '#000'};
  }
  animation: ${({ $copied }) =>
    $copied
      ? css`${copyHighlight} 0.6s`
      : 'none'};
`;

const CopiedMsg = styled.p`
  color: green;
  font-size: 0.85rem;
  margin: 0;
  margin-bottom: 0.5rem;
`;

const FieldsRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0.3rem;
  flex-wrap: wrap;
`;

const FieldColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Input = styled.input`
  border: 1px solid ${({ $isDark, theme }) => $isDark ? (theme.inputBorder || '#444') : (theme.inputBorder || '#ccc')};
  background: ${({ $isDark, theme }) => $isDark ? (theme.inputBg || 'rgba(255,255,255,0.07)') : (theme.inputBg || '#fff')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  border-radius: 4px;
  padding: 0.3rem;
`;

const QrButton = styled.button`
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  margin-bottom: 1rem;
  background: ${({ $isDark, theme }) => $isDark ? (theme.buttonBg || 'rgba(255,255,255,0.07)') : (theme.buttonBg || '#eee')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.buttonColor || theme.color || '#333')};
  display: inline-flex;
  align-items: center;
  &:hover {
    background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.15)' : '#ddd'};
    color: ${({ $isDark, theme }) => $isDark ? '#fff' : '#000'};
  }
`;

const QrWrapper = styled(motion.div)`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const InfoText = styled.p`
  font-size: 0.85rem;
  margin: 0;
  margin-top: auto;
`;

const NoWalletMsg = styled.p`
  color: red;
  margin-top: 0.5rem;
`;
