import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle, keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { useWallet } from '../../context/WalletContext';
import { useThemeContext } from '../../context/ThemeContext';
import {
  deriveKeypair,
  sign as rippleSign,
  verify as rippleVerify,
  deriveAddress
} from 'ripple-keypairs';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { QRCodeCanvas } from 'qrcode.react';

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

export default function SignPanel() {
  const { wallet, locked, unfunded } = useWallet();
  const { theme } = useThemeContext();
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('text');
  const [signature, setSignature] = useState('');
  const [pubKey, setPubKey] = useState('');
  const [verifyPubKey, setVerifyPubKey] = useState('');
  const [verifyResult, setVerifyResult] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [copiedSig, setCopiedSig] = useState(false);
  const [copiedPubKey, setCopiedPubKey] = useState(false);

  useEffect(() => {
    let t1, t2;
    if (copiedSig) {
      t1 = setTimeout(() => setCopiedSig(false), 2000);
    }
    if (copiedPubKey) {
      t2 = setTimeout(() => setCopiedPubKey(false), 2000);
    }
    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [copiedSig, copiedPubKey]);

  const handleSign = () => {
    setError('');
    setVerifyResult('');
    setSignature('');
    setPubKey('');
    setAddress('');
    if (!wallet || !wallet.seed) {
      setError('No wallet loaded. Please load or unlock a wallet in order to sign messages.');
      return;
    }
    if (locked) {
      setError('Wallet is locked. Please unlock first.');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a message to sign.');
      return;
    }
    try {
      const kp = deriveKeypair(wallet.seed);
      const pubK = kp.publicKey;
      const classicAddr = deriveAddress(pubK);
      let msgHex = '';
      if (mode === 'text') {
        msgHex = Buffer.from(message, 'utf8').toString('hex');
      } else if (mode === 'hex') {
        let input = message.trim().replace(/^0x/, '');
        if (!/^[0-9A-Fa-f]*$/.test(input)) {
          throw new Error('Invalid HEX input format.');
        }
        msgHex = input.toLowerCase();
      } else {
        const parsed = JSON.parse(message);
        const asString = JSON.stringify(parsed);
        msgHex = Buffer.from(asString, 'utf8').toString('hex');
      }
      const sig = rippleSign(msgHex, kp.privateKey);
      setSignature(sig);
      setPubKey(pubK);
      setAddress(classicAddr);
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const handleVerify = () => {
    setError('');
    setVerifyResult('');
    if (!message.trim() || !signature.trim()) {
      setError('Message and signature are required for verification.');
      return;
    }
    const pubKeyCheck = verifyPubKey.trim() || pubKey;
    if (!pubKeyCheck) {
      setError('No public key provided. Provide a public key or sign first.');
      return;
    }
    try {
      let msgHex = '';
      if (mode === 'text') {
        msgHex = Buffer.from(message, 'utf8').toString('hex');
      } else if (mode === 'hex') {
        let input = message.trim().replace(/^0x/, '');
        if (!/^[0-9A-Fa-f]*$/.test(input)) {
          throw new Error('Invalid HEX input for verification.');
        }
        msgHex = input.toLowerCase();
      } else {
        const parsed = JSON.parse(message);
        const asString = JSON.stringify(parsed);
        msgHex = Buffer.from(asString, 'utf8').toString('hex');
      }
      const valid = rippleVerify(msgHex, signature.trim(), pubKeyCheck);
      if (valid) {
        const derivedAddr = deriveAddress(pubKeyCheck);
        setVerifyResult(`Signature is VALID. Matches address: ${derivedAddr}`);
      } else {
        setVerifyResult('Signature is INVALID.');
      }
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const handleClear = () => {
    setMessage('');
    setSignature('');
    setPubKey('');
    setVerifyPubKey('');
    setVerifyResult('');
    setError('');
    setAddress('');
    setCopiedSig(false);
    setCopiedPubKey(false);
  };

  if (unfunded) {
    return (
      <SignPanelContainer
        $isDark={theme.darkMode}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <GlassPanel
          $isDark={theme.darkMode}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Title>Sign / Verify Message</Title>
          <ErrorBox $isDark={theme.darkMode}>
            This account is not activated (balance &lt; base reserve).
            Off-ledger signing still works, but you cannot submit on-ledger transactions.
          </ErrorBox>
        </GlassPanel>
      </SignPanelContainer>
    );
  }

  return (
    <>
      <ApexGlobalStyle $isDark={theme.darkMode} />
      <SignPanelContainer
        $isDark={theme.darkMode}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <GlassPanel
          $isDark={theme.darkMode}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Title>Sign / Verify Message</Title>
          {error && (
            <ErrorBox $isDark={theme.darkMode}>
              {error}
            </ErrorBox>
          )}
          <Row>
            <RowLabel>Message Mode:</RowLabel>
            <Select
              $isDark={theme.darkMode}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="text">Text</option>
              <option value="hex">Hex</option>
              <option value="json">JSON</option>
            </Select>
          </Row>
          <Section>
            <FieldLabel>Message:</FieldLabel>
            <TextArea
              $isDark={theme.darkMode}
              placeholder={
                mode === 'json'
                  ? '{"example":"data"}'
                  : mode === 'hex'
                  ? 'e.g. 48656c6c6f'
                  : 'Type your text message...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Section>
          <ButtonRow>
            <OutlineButton $isDark={theme.darkMode} onClick={handleSign}>
              ✒️ Sign
            </OutlineButton>
            <OutlineButton $isDark={theme.darkMode} onClick={handleClear}>
              ⎌ Clear
            </OutlineButton>
          </ButtonRow>
          {signature && (
            <ResultBox $isDark={theme.darkMode}>
              <SubTitle>Signature Result</SubTitle>
              <SmallLabel>Signature (hex):</SmallLabel>
              <CodeBlock $isDark={theme.darkMode}>{signature}</CodeBlock>
              <CopyToClipboard text={signature} onCopy={() => setCopiedSig(true)}>
                <OutlineButton $isDark={theme.darkMode}>
                  {copiedSig ? 'Copied!' : 'Copy Signature'}
                </OutlineButton>
              </CopyToClipboard>
              <SmallLabel style={{ marginTop: '0.8rem' }}>Public Key (hex):</SmallLabel>
              <CodeBlock $isDark={theme.darkMode}>{pubKey}</CodeBlock>
              <CopyToClipboard text={pubKey} onCopy={() => setCopiedPubKey(true)}>
                <OutlineButton $isDark={theme.darkMode}>
                  {copiedPubKey ? 'Copied!' : 'Copy PubKey'}
                </OutlineButton>
              </CopyToClipboard>
              {address && (
                <>
                  <SmallLabel style={{ marginTop: '0.8rem' }}>Classic Address:</SmallLabel>
                  <CodeBlock $isDark={theme.darkMode}>{address}</CodeBlock>
                </>
              )}
              <div style={{ marginTop: '0.8rem' }}>
                <QRCodeCanvas
                  value={signature}
                  size={128}
                  bgColor={theme.darkMode ? '#333' : '#fff'}
                />
              </div>
            </ResultBox>
          )}
          <Divider $isDark={theme.darkMode} />
          <SubTitle>Verify Signature</SubTitle>
          <HelpText>
            Enter the same message (in the same mode) and the signature. 
            If "Public Key" is empty, it will use your own from above.
          </HelpText>
          <Section>
            <FieldLabel>Public Key (for verification):</FieldLabel>
            <Input
              $isDark={theme.darkMode}
              placeholder="Leave blank to use your own PubKey..."
              value={verifyPubKey}
              onChange={(e) => setVerifyPubKey(e.target.value)}
            />
          </Section>
          <Section>
            <FieldLabel>Signature (for verification):</FieldLabel>
            <TextArea
              $isDark={theme.darkMode}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
          </Section>
          <OutlineButton $isDark={theme.darkMode} onClick={handleVerify}>
            ✅ Verify
          </OutlineButton>
          {verifyResult && (
            <VerifyResult
              $isDark={theme.darkMode}
              $valid={verifyResult.includes('VALID')}
            >
              {verifyResult}
            </VerifyResult>
          )}
        </GlassPanel>
      </SignPanelContainer>
    </>
  );
}

const SignPanelContainer = styled(motion.div)`
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
      ? `1px solid ${theme.borderColor || 'rgba(255,255,255,0.2)'}`
      : `1px solid ${theme.borderColor || 'rgba(255,255,255,0.3)'}`};
  display: flex;
  flex-direction: column;
  min-height: 260px;
`;

const Title = styled.h2`
  margin: 0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
`;

const ErrorBox = styled.div`
  margin-bottom: 1rem;
  padding: 0.8rem;
  border: 1px solid ${({ $isDark }) => ($isDark ? '#aa4444' : '#faa')};
  border-radius: 4px;
  background: ${({ $isDark }) => ($isDark ? 'rgba(255,0,0,0.1)' : '#ffe6e6')};
  color: red;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const RowLabel = styled.span`
  font-size: 0.85rem;
  font-weight: 500;
`;

const OutlineButton = styled.button`
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  background: transparent;
  color: ${({ $isDark, theme }) => ($isDark ? '#fff' : (theme.color || '#333'))};
  border: 1px solid ${({ $isDark, theme }) => ($isDark ? '#fff' : (theme.color || '#333'))};
  border-radius: 4px;
  font-size: 0.85rem;
  &:hover {
    background: ${({ $isDark }) => ($isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')};
  }
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
`;

const Section = styled.div`
  margin-bottom: 1rem;
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 0.3rem;
  font-weight: 600;
  font-size: 0.85rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 70px;
  resize: vertical;
  padding: 0.5rem;
  font-size: 0.85rem;
  border: 1px solid ${({ $isDark, theme }) => ($isDark ? (theme.inputBorder || '#444') : (theme.inputBorder || '#ccc'))};
  border-radius: 4px;
  color: ${({ $isDark, theme }) => ($isDark ? '#fff' : (theme.color || '#333'))};
  background: ${({ $isDark, theme }) =>
    $isDark
      ? (theme.inputBg || 'rgba(255,255,255,0.07)')
      : (theme.inputBg || '#fff')};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  font-size: 0.85rem;
  border: 1px solid ${({ $isDark, theme }) => ($isDark ? (theme.inputBorder || '#444') : (theme.inputBorder || '#ccc'))};
  border-radius: 4px;
  color: ${({ $isDark, theme }) => ($isDark ? '#fff' : (theme.color || '#333'))};
  background: ${({ $isDark, theme }) =>
    $isDark
      ? (theme.inputBg || 'rgba(255,255,255,0.07)')
      : (theme.inputBg || '#fff')};
`;

const Select = styled.select`
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  border: 1px solid ${({ $isDark, theme }) => ($isDark ? (theme.inputBorder || '#444') : (theme.inputBorder || '#ccc'))};
  border-radius: 4px;
  background: ${({ $isDark, theme }) =>
    $isDark
      ? (theme.inputBg || 'rgba(255,255,255,0.07)')
      : (theme.inputBg || '#fff')};
  color: ${({ $isDark, theme }) => ($isDark ? '#fff' : (theme.color || '#333'))};
  & option {
    background: ${({ $isDark }) => ($isDark ? '#2f2f2f' : '#fff')};
    color: ${({ $isDark }) => ($isDark ? '#fff' : '#333')};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const ResultBox = styled.div`
  margin-bottom: 1rem;
  padding: 0.8rem;
  border: 1px solid ${({ $isDark, theme }) => ($isDark ? (theme.borderColor || '#777') : (theme.borderColor || '#ccc'))};
  border-radius: 4px;
  background: transparent;
`;

const SubTitle = styled.h4`
  margin: 0;
  margin-bottom: 0.6rem;
  font-size: 1rem;
  font-weight: 500;
`;

const SmallLabel = styled.p`
  margin: 0.5rem 0 0.2rem;
  font-size: 0.85rem;
  font-weight: 600;
`;

const CodeBlock = styled.div`
  word-wrap: break-word;
  font-size: 0.8rem;
  background: ${({ $isDark, theme }) =>
    $isDark
      ? (theme.inputBg || 'rgba(255,255,255,0.07)')
      : (theme.inputBg || '#fff')};
  border: 1px solid ${({ $isDark, theme }) =>
    $isDark ? (theme.inputBorder || '#444') : (theme.inputBorder || '#ccc')};
  padding: 0.5rem;
  border-radius: 4px;
  max-height: 110px;
  overflow: auto;
  color: ${({ $isDark, theme }) => ($isDark ? '#fff' : (theme.color || '#333'))};
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ $isDark, theme }) =>
    $isDark ? (theme.borderColor || '#444') : (theme.borderColor || '#ccc')};
  margin: 1rem 0;
`;

const HelpText = styled.p`
  margin: 0;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  opacity: 0.8;
`;

const VerifyResult = styled.div`
  margin-top: 0.6rem;
  font-size: 0.9rem;
  color: ${({ $valid, $isDark }) =>
    $valid
      ? ($isDark ? '#8fff8f' : 'green')
      : ($isDark ? '#ff8f8f' : 'red')};
`;
