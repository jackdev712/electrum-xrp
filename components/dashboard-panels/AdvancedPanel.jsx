import React, { useState } from 'react';
import styled, { createGlobalStyle, keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';

import { useWallet } from '../../context/WalletContext';
import { useThemeContext } from '../../context/ThemeContext';

import {
  createEscrow,
  finishEscrow,
  createPaymentChannel,
  fundPaymentChannel,
  setAccountOptions,
  setRegularKey,
  clearRegularKey,
  setSignerList,
  setTrustLine,
  deleteTrustLine
} from '../../services/xrplAdvancedService';
import { deriveKeypair } from 'ripple-keypairs';

const ApexGlobalStyle = createGlobalStyle`
  .apexcharts-menu {
    background-color: ${({ $isDark }) => $isDark ? '#2a2a2a':'#fff'} !important;
    color: ${({ $isDark }) => $isDark ? '#e0e0e0':'#333'} !important;
    border: ${({ $isDark }) => $isDark ? '1px solid #444':'1px solid #ccc'} !important;
    box-shadow: ${({ $isDark }) => $isDark ? '0 3px 10px rgba(0,0,0,0.7)':'0 3px 8px rgba(0,0,0,0.2)'} !important;
  }
  .apexcharts-menu-item {
    padding: 6px 12px !important;
  }
  .apexcharts-menu-item:hover {
    background-color: ${({ $isDark })=> $isDark?'#444':'#eee'} !important;
    color: ${({ $isDark })=> $isDark?'#fff':'#000'} !important;
  }
`;

const gradientAnim = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

export default function AdvancedPanel() {
  const { wallet, locked, unfunded, addAdvancedRecord } = useWallet();
  const { theme } = useThemeContext();

  const [escrowAmount, setEscrowAmount] = useState('10');
  const [escrowFinishTime, setEscrowFinishTime] = useState('');
  const [escrowCondition, setEscrowCondition] = useState('');
  const [escrowOwner, setEscrowOwner] = useState('');
  const [escrowSeq, setEscrowSeq] = useState('');
  const [escrowFulfillment, setEscrowFulfillment] = useState('');
  const [escrowError, setEscrowError] = useState('');
  const [escrowInfo, setEscrowInfo] = useState('');

  const [chanDest, setChanDest] = useState('');
  const [chanAmount, setChanAmount] = useState('50');
  const [chanSettleDelay, setChanSettleDelay] = useState('86400');
  const [chanPubKeyHex, setChanPubKeyHex] = useState('');
  const [chanId, setChanId] = useState('');
  const [chanError, setChanError] = useState('');
  const [chanInfo, setChanInfo] = useState('');

  const [domain, setDomain] = useState('');
  const [requireDestTag, setRequireDestTag] = useState(false);
  const [disallowXRP, setDisallowXRP] = useState(false);
  const [transferRate, setTransferRate] = useState('0');
  const [accountError, setAccountError] = useState('');
  const [accountInfo, setAccountInfo] = useState('');

  const [regularKey, setRegularKeyValue] = useState('');
  const [regKeyError, setRegKeyError] = useState('');
  const [regKeyInfo, setRegKeyInfo] = useState('');

  const [signerThreshold, setSignerThreshold] = useState('2');
  const [signers, setSigners] = useState([
    { address: '', weight: '1' },
    { address: '', weight: '1' }
  ]);
  const [signerError, setSignerError] = useState('');
  const [signerInfo, setSignerInfo] = useState('');

  const [trustCurrency, setTrustCurrency] = useState('USD');
  const [trustIssuer, setTrustIssuer] = useState('');
  const [trustLimit, setTrustLimit] = useState('1000');
  const [trustNoRipple, setTrustNoRipple] = useState(false);
  const [trustFreeze, setTrustFreeze] = useState(false);
  const [trustAuth, setTrustAuth] = useState(false);
  const [trustError, setTrustError] = useState('');
  const [trustInfo, setTrustInfo] = useState('');

  if(!wallet || !wallet.seed){
    return (
      <AdvancedPanelContainer
        $isDark={theme.darkMode}
        initial={{ opacity:0, y:6 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4 }}
      >
        <GlassPanel
          $isDark={theme.darkMode}
          initial={{ opacity:0, scale:0.95 }}
          animate={{ opacity:1, scale:1 }}
          transition={{ duration:0.3 }}
        >
          <PanelTitle>Advanced Panel</PanelTitle>
          <ErrorText>No wallet loaded.</ErrorText>
        </GlassPanel>
      </AdvancedPanelContainer>
    );
  }
  if(unfunded){
    return (
      <AdvancedPanelContainer
        $isDark={theme.darkMode}
        initial={{ opacity:0, y:6 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4 }}
      >
        <GlassPanel
          $isDark={theme.darkMode}
          initial={{ opacity:0, scale:0.95 }}
          animate={{ opacity:1, scale:1 }}
          transition={{ duration:0.3 }}
        >
          <PanelTitle>Advanced Panel</PanelTitle>
          <ErrorText>
            Account not activated (need 10+ XRP). Escrow / PaymentChannel / etc. not possible.
          </ErrorText>
        </GlassPanel>
      </AdvancedPanelContainer>
    );
  }

  function clearEscrowMsgs(){
    setEscrowError('');
    setEscrowInfo('');
  }
  function checkEscrowWallet(){
    if(locked){
      setEscrowError('Wallet locked. Please unlock first.');
      return false;
    }
    return true;
  }
  async function handleCreateEscrow(){
    clearEscrowMsgs();
    if(!checkEscrowWallet()) return;
    try{
      const rippleEpochOffset = 946684800;
      const finishTimeUnix = parseInt(escrowFinishTime, 10);
      if(isNaN(finishTimeUnix)){
        throw new Error('Invalid Escrow Finish time (unix).');
      }
      const finishAfter = finishTimeUnix - rippleEpochOffset;
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const resp = await createEscrow({
        serverUrl: url,
        seed: wallet.seed,
        amountXrp: parseFloat(escrowAmount),
        finishAfterUnixTime: finishAfter,
        conditionHex: escrowCondition.trim() || undefined
      });
      const resultCode = resp.result?.meta?.TransactionResult || 'N/A';
      setEscrowInfo(`EscrowCreate: ${resultCode}`);
      addAdvancedRecord({
        id: Date.now(),
        time: new Date().toISOString(),
        action: 'createEscrow',
        details: {
          amountXrp: parseFloat(escrowAmount),
          finishTimeUnix,
          condition: escrowCondition.trim() || '',
          resultCode
        }
      });
    } catch(err){
      setEscrowError(err.message);
    }
  }
  async function handleFinishEscrow(){
    clearEscrowMsgs();
    if(!checkEscrowWallet()) return;
    try{
      const seq = parseInt(escrowSeq, 10);
      if(isNaN(seq)){
        throw new Error('Invalid Escrow sequence (integer).');
      }
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const resp = await finishEscrow({
        serverUrl: url,
        seed: wallet.seed,
        owner: escrowOwner.trim(),
        escrowSequence: seq,
        conditionHex: escrowCondition.trim() || undefined,
        fulfillmentHex: escrowFulfillment.trim() || undefined
      });
      const resultCode = resp.result?.meta?.TransactionResult || 'N/A';
      setEscrowInfo(`EscrowFinish: ${resultCode}`);
      addAdvancedRecord({
        id: Date.now(),
        time: new Date().toISOString(),
        action: 'finishEscrow',
        details: {
          owner: escrowOwner.trim(),
          sequence: seq,
          fulfillment: escrowFulfillment.trim() || '',
          resultCode
        }
      });
    } catch(err){
      setEscrowError(err.message);
    }
  }

  function clearChanMsgs(){
    setChanError('');
    setChanInfo('');
  }
  function checkChanWallet(){
    if(locked){
      setChanError('Wallet locked. Please unlock first.');
      return false;
    }
    return true;
  }
  async function handleCreateChannel(){
    clearChanMsgs();
    if(!checkChanWallet()) return;
    try{
      const kp = deriveKeypair(wallet.seed);
      const localPubKey = kp.publicKey;
      const usedPubKey = chanPubKeyHex.trim() || localPubKey;
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const resp = await createPaymentChannel({
        serverUrl: url,
        seed: wallet.seed,
        destination: chanDest.trim(),
        amountXrp: parseFloat(chanAmount),
        settleDelay: parseInt(chanSettleDelay, 10),
        publicKeyHex: usedPubKey
      });
      const resultCode = resp.result?.meta?.TransactionResult || 'N/A';
      setChanInfo(`PaymentChannelCreate: ${resultCode}`);
      addAdvancedRecord({
        id: Date.now(),
        time: new Date().toISOString(),
        action: 'createPaymentChannel',
        details: {
          destination: chanDest.trim(),
          amountXrp: parseFloat(chanAmount),
          usedPubKey,
          resultCode
        }
      });
    } catch(err){
      setChanError(err.message);
    }
  }
  async function handleFundChannel(){
    clearChanMsgs();
    if(!checkChanWallet()) return;
    try{
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const resp = await fundPaymentChannel({
        serverUrl: url,
        seed: wallet.seed,
        channelId: chanId.trim(),
        amountXrp: parseFloat(chanAmount)
      });
      const resultCode = resp.result?.meta?.TransactionResult || 'N/A';
      setChanInfo(`PaymentChannelFund: ${resultCode}`);
      addAdvancedRecord({
        id: Date.now(),
        time: new Date().toISOString(),
        action: 'fundPaymentChannel',
        details: {
          channelId: chanId.trim(),
          amountXrp: parseFloat(chanAmount),
          resultCode
        }
      });
    } catch(err){
      setChanError(err.message);
    }
  }

  function clearAccountMsgs(){
    setAccountError('');
    setAccountInfo('');
  }
  function checkAccountWallet(){
    if(locked){
      setAccountError('Wallet locked.');
      return false;
    }
    return true;
  }
  async function handleSetAccountOptions(){
    clearAccountMsgs();
    if(!checkAccountWallet()) return;
    try{
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const rateF = parseFloat(transferRate) || 0;
      if(requireDestTag && disallowXRP){
        const respA = await setAccountOptions({
          serverUrl: url,
          seed: wallet.seed,
          domain,
          requireDestTag: true,
          disallowXRP: false,
          transferRate: rateF
        });
        const resA = respA.result?.meta?.TransactionResult || 'N/A';
        if(resA !== 'tesSUCCESS'){
          setAccountError(`AccountSet(RequireDestTag) failed: ${resA}`);
          return;
        }
        const respB = await setAccountOptions({
          serverUrl: url,
          seed: wallet.seed,
          domain: '',
          requireDestTag: false,
          disallowXRP: true,
          transferRate: 0
        });
        const resB = respB.result?.meta?.TransactionResult || 'N/A';
        if(resB !== 'tesSUCCESS'){
          setAccountError(`AccountSet(DisallowXRP) failed: ${resB}`);
          return;
        }
        setAccountInfo(`AccountSet done for both => ${resB}`);
        addAdvancedRecord({
          id: Date.now(),
          time: new Date().toISOString(),
          action: 'setAccountOptions(multiple)',
          details: {
            domain,
            requireDestTag: true,
            disallowXRP: true,
            resultA: resA,
            resultB: resB
          }
        });
      } else {
        const resp = await setAccountOptions({
          serverUrl: url,
          seed: wallet.seed,
          domain,
          requireDestTag,
          disallowXRP,
          transferRate: rateF
        });
        const resultCode = resp.result?.meta?.TransactionResult || 'N/A';
        setAccountInfo(`AccountSet: ${resultCode}`);
        addAdvancedRecord({
          id: Date.now(),
          time: new Date().toISOString(),
          action: 'setAccountOptions',
          details: {
            domain,
            requireDestTag,
            disallowXRP,
            transferRate: rateF,
            resultCode
          }
        });
      }
    } catch(err){
      setAccountError(err.message);
    }
  }

  function clearRegKeyMsgs(){
    setRegKeyError('');
    setRegKeyInfo('');
  }
  function checkRegKeyWallet(){
    if(locked){
      setRegKeyError('Wallet locked.');
      return false;
    }
    return true;
  }
  async function handleSetRegularKey(){
    clearRegKeyMsgs();
    if(!checkRegKeyWallet()) return;
    try{
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const resp = await setRegularKey({
        serverUrl: url,
        seed: wallet.seed,
        regularKey: regularKey.trim()
      });
      const resultCode = resp.result?.meta?.TransactionResult || 'N/A';
      setRegKeyInfo(`SetRegularKey: ${resultCode}`);
      addAdvancedRecord({
        id: Date.now(),
        time: new Date().toISOString(),
        action: 'setRegularKey',
        details: {
          regularKey: regularKey.trim(),
          resultCode
        }
      });
    } catch(err){
      setRegKeyError(err.message);
    }
  }
  async function handleClearRegularKey(){
    clearRegKeyMsgs();
    if(!checkRegKeyWallet()) return;
    try{
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const resp = await clearRegularKey({
        serverUrl: url,
        seed: wallet.seed
      });
      const resultCode = resp.result?.meta?.TransactionResult || 'N/A';
      setRegKeyInfo(`ClearRegularKey: ${resultCode}`);
      addAdvancedRecord({
        id: Date.now(),
        time: new Date().toISOString(),
        action: 'clearRegularKey',
        details: { resultCode }
      });
    } catch(err){
      setRegKeyError(err.message);
    }
  }

  function clearSignerMsgs(){
    setSignerError('');
    setSignerInfo('');
  }
  function checkSignerWallet(){
    if(locked){
      setSignerError('Wallet locked.');
      return false;
    }
    return true;
  }
  function handleAddSigner(){
    setSigners(prev => [...prev, { address: '', weight: '1' }]);
  }
  function handleSignerChange(idx, field, val){
    setSigners(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  }
  async function handleSetSignerList(){
    clearSignerMsgs();
    if(!checkSignerWallet()) return;
    try{
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const th = parseInt(signerThreshold, 10);
      if(isNaN(th) || th < 1){
        throw new Error('Invalid threshold');
      }
      const finalSigners = signers
        .filter(s => s.address.trim())
        .map(s => ({
          address: s.address.trim(),
          weight: parseInt(s.weight, 10) || 1
        }));
      if(finalSigners.length === 0){
        throw new Error('No signers provided.');
      }
      const resp = await setSignerList({
        serverUrl: url,
        seed: wallet.seed,
        signerQuorum: th,
        signers: finalSigners
      });
      const resultCode = resp.result?.meta?.TransactionResult || 'N/A';
      setSignerInfo(`SignerListSet: ${resultCode}`);
      addAdvancedRecord({
        id: Date.now(),
        time: new Date().toISOString(),
        action: 'setSignerList',
        details: {
          threshold: th,
          signers: finalSigners,
          resultCode
        }
      });
    } catch(err){
      setSignerError(err.message);
    }
  }

  function clearTrustMsgs(){
    setTrustError('');
    setTrustInfo('');
  }
  function checkTrustWallet(){
    if(locked){
      setTrustError('Wallet locked.');
      return false;
    }
    return true;
  }
  async function handleSetTrustLine(){
    clearTrustMsgs();
    if(!checkTrustWallet()) return;
    try{
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const resp = await setTrustLine({
        serverUrl: url,
        seed: wallet.seed,
        currency: trustCurrency.trim().toUpperCase(),
        issuer: trustIssuer.trim(),
        limit: trustLimit,
        noRipple: trustNoRipple,
        freeze: trustFreeze,
        authorized: trustAuth
      });
      const resultCode = resp.result?.meta?.TransactionResult || 'N/A';
      setTrustInfo(`SetTrustLine: ${resultCode}`);
      addAdvancedRecord({
        id: Date.now(),
        time: new Date().toISOString(),
        action: 'setTrustLine',
        details: {
          currency: trustCurrency.trim().toUpperCase(),
          issuer: trustIssuer.trim(),
          limit: trustLimit,
          noRipple: trustNoRipple,
          freeze: trustFreeze,
          authorized: trustAuth,
          resultCode
        }
      });
    } catch(err){
      setTrustError(err.message);
    }
  }
  async function handleDeleteTrustLine(){
    clearTrustMsgs();
    if(!checkTrustWallet()) return;
    try{
      const url = wallet.serverUrl || 'wss://s2.ripple.com';
      const resp = await deleteTrustLine({
        serverUrl: url,
        seed: wallet.seed,
        currency: trustCurrency.trim().toUpperCase(),
        issuer: trustIssuer.trim()
      });
      const resultCode = resp.result?.meta?.TransactionResult || 'N/A';
      setTrustInfo(`DeleteTrustLine: ${resultCode}`);
      addAdvancedRecord({
        id: Date.now(),
        time: new Date().toISOString(),
        action: 'deleteTrustLine',
        details: {
          currency: trustCurrency.trim().toUpperCase(),
          issuer: trustIssuer.trim(),
          resultCode
        }
      });
    } catch(err){
      setTrustError(err.message);
    }
  }

  return (
    <>
      <ApexGlobalStyle $isDark={theme.darkMode} />

      <AdvancedPanelContainer
        $isDark={theme.darkMode}
        initial={{ opacity:0, y:6 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4 }}
      >
        <GlassPanel
          $isDark={theme.darkMode}
          initial={{ opacity:0, scale:0.95 }}
          animate={{ opacity:1, scale:1 }}
          transition={{ duration:0.3 }}
        >
          <PanelTitle>Advanced Panel</PanelTitle>
          <SectionBlock>
            <SectionTitle>Escrow (Create / Finish)</SectionTitle>
            {escrowError && <ErrorBox>{escrowError}</ErrorBox>}
            {escrowInfo && <InfoBox>{escrowInfo}</InfoBox>}
            <Row>
              <Label>Amount (XRP):</Label>
              <Input
                $isDark={theme.darkMode}
                value={escrowAmount}
                onChange={(e) => setEscrowAmount(e.target.value)}
              />
              <Label>FinishAfter (Unix):</Label>
              <Input
                $isDark={theme.darkMode}
                value={escrowFinishTime}
                onChange={(e) => setEscrowFinishTime(e.target.value)}
              />
            </Row>
            <Row>
              <Label>Condition (Hex):</Label>
              <LongInput
                $isDark={theme.darkMode}
                value={escrowCondition}
                onChange={(e) => setEscrowCondition(e.target.value)}
                placeholder="Optional"
              />
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleCreateEscrow}
              >
                Create Escrow
              </OutlineButton>
            </Row>
            <Row>
              <Label>Owner:</Label>
              <LongInput
                $isDark={theme.darkMode}
                value={escrowOwner}
                onChange={(e) => setEscrowOwner(e.target.value)}
              />
              <Label>Seq:</Label>
              <Input
                $isDark={theme.darkMode}
                value={escrowSeq}
                onChange={(e) => setEscrowSeq(e.target.value)}
              />
            </Row>
            <Row>
              <Label>Fulfillment (Hex):</Label>
              <LongInput
                $isDark={theme.darkMode}
                value={escrowFulfillment}
                onChange={(e) => setEscrowFulfillment(e.target.value)}
                placeholder="Optional"
              />
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleFinishEscrow}
              >
                Finish Escrow
              </OutlineButton>
            </Row>
          </SectionBlock>
          <SectionBlock>
            <SectionTitle>Payment Channel (Create / Fund)</SectionTitle>
            {chanError && <ErrorBox>{chanError}</ErrorBox>}
            {chanInfo && <InfoBox>{chanInfo}</InfoBox>}
            <Row>
              <Label>Destination:</Label>
              <LongInput
                $isDark={theme.darkMode}
                value={chanDest}
                onChange={(e) => setChanDest(e.target.value)}
              />
              <Label>Amount (XRP):</Label>
              <Input
                $isDark={theme.darkMode}
                value={chanAmount}
                onChange={(e) => setChanAmount(e.target.value)}
              />
            </Row>
            <Row>
              <Label>SettleDelay (sec):</Label>
              <Input
                $isDark={theme.darkMode}
                value={chanSettleDelay}
                onChange={(e) => setChanSettleDelay(e.target.value)}
              />
              <Label>PublicKey (Hex):</Label>
              <LongInput
                $isDark={theme.darkMode}
                value={chanPubKeyHex}
                onChange={(e) => setChanPubKeyHex(e.target.value)}
                placeholder="Leave empty to auto-derive"
              />
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleCreateChannel}
              >
                Create Channel
              </OutlineButton>
            </Row>
            <Row>
              <Label>ChannelId:</Label>
              <LongInput
                $isDark={theme.darkMode}
                value={chanId}
                onChange={(e) => setChanId(e.target.value)}
              />
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleFundChannel}
              >
                Fund Channel
              </OutlineButton>
            </Row>
          </SectionBlock>
          <SectionBlock>
            <SectionTitle>Account Options (AccountSet)</SectionTitle>
            {accountError && <ErrorBox>{accountError}</ErrorBox>}
            {accountInfo && <InfoBox>{accountInfo}</InfoBox>}
            <Row>
              <Label>Domain:</Label>
              <LongInput
                $isDark={theme.darkMode}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </Row>
            <Row>
              <CheckBoxLabel>
                <input
                  type="checkbox"
                  checked={requireDestTag}
                  onChange={(e) => setRequireDestTag(e.target.checked)}
                />
                requireDestTag
              </CheckBoxLabel>
              <CheckBoxLabel>
                <input
                  type="checkbox"
                  checked={disallowXRP}
                  onChange={(e) => setDisallowXRP(e.target.checked)}
                />
                disallowXRP
              </CheckBoxLabel>
              <Label>TransferRate:</Label>
              <Input
                $isDark={theme.darkMode}
                value={transferRate}
                onChange={(e) => setTransferRate(e.target.value)}
              />
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleSetAccountOptions}
              >
                Apply
              </OutlineButton>
            </Row>
          </SectionBlock>
          <SectionBlock>
            <SectionTitle>Regular Key</SectionTitle>
            {regKeyError && <ErrorBox>{regKeyError}</ErrorBox>}
            {regKeyInfo && <InfoBox>{regKeyInfo}</InfoBox>}
            <Row>
              <Label>New Regular Key:</Label>
              <LongInput
                $isDark={theme.darkMode}
                value={regularKey}
                onChange={(e) => setRegularKeyValue(e.target.value)}
                placeholder="rAddress or empty"
              />
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleSetRegularKey}
              >
                Set Regular Key
              </OutlineButton>
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleClearRegularKey}
              >
                Clear Regular Key
              </OutlineButton>
            </Row>
          </SectionBlock>
          <SectionBlock>
            <SectionTitle>SignerList (MultiSign)</SectionTitle>
            {signerError && <ErrorBox>{signerError}</ErrorBox>}
            {signerInfo && <InfoBox>{signerInfo}</InfoBox>}
            <Row>
              <Label>Threshold:</Label>
              <Input
                $isDark={theme.darkMode}
                value={signerThreshold}
                onChange={(e) => setSignerThreshold(e.target.value)}
              />
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleAddSigner}
              >
                + Add Signer
              </OutlineButton>
            </Row>
            {signers.map((s, i) => (
              <Row key={`signer_${i}`}>
                <Label>Signer #{i + 1}:</Label>
                <LongInput
                  $isDark={theme.darkMode}
                  placeholder="rAddress..."
                  value={s.address}
                  onChange={(e) => handleSignerChange(i, 'address', e.target.value)}
                />
                <Label>Weight:</Label>
                <Input
                  $isDark={theme.darkMode}
                  value={s.weight}
                  onChange={(e) => handleSignerChange(i, 'weight', e.target.value)}
                />
              </Row>
            ))}
            <Row>
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleSetSignerList}
              >
                Set SignerList
              </OutlineButton>
            </Row>
          </SectionBlock>
          <SectionBlock>
            <SectionTitle>Trust Line</SectionTitle>
            {trustError && <ErrorBox>{trustError}</ErrorBox>}
            {trustInfo && <InfoBox>{trustInfo}</InfoBox>}
            <Row>
              <Label>Currency:</Label>
              <Input
                $isDark={theme.darkMode}
                value={trustCurrency}
                onChange={(e) => setTrustCurrency(e.target.value)}
              />
              <Label>Issuer:</Label>
              <LongInput
                $isDark={theme.darkMode}
                value={trustIssuer}
                onChange={(e) => setTrustIssuer(e.target.value)}
              />
              <Label>Limit:</Label>
              <Input
                $isDark={theme.darkMode}
                value={trustLimit}
                onChange={(e) => setTrustLimit(e.target.value)}
              />
            </Row>
            <Row>
              <CheckBoxLabel>
                <input
                  type="checkbox"
                  checked={trustNoRipple}
                  onChange={(e) => setTrustNoRipple(e.target.checked)}
                />
                noRipple
              </CheckBoxLabel>
              <CheckBoxLabel>
                <input
                  type="checkbox"
                  checked={trustFreeze}
                  onChange={(e) => setTrustFreeze(e.target.checked)}
                />
                freeze
              </CheckBoxLabel>
              <CheckBoxLabel>
                <input
                  type="checkbox"
                  checked={trustAuth}
                  onChange={(e) => setTrustAuth(e.target.checked)}
                />
                authorized
              </CheckBoxLabel>
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleSetTrustLine}
              >
                Set TrustLine
              </OutlineButton>
              <OutlineButton
                $isDark={theme.darkMode}
                onClick={handleDeleteTrustLine}
              >
                Delete TrustLine
              </OutlineButton>
            </Row>
          </SectionBlock>
        </GlassPanel>
      </AdvancedPanelContainer>
    </>
  );
}

const AdvancedPanelContainer = styled(motion.div)`
  width: 100%;
  min-height: 340px;
  padding: 0.8rem;
  border-radius: 8px;
  box-sizing: border-box;
  color: ${({ $isDark, theme }) => $isDark ? '#dfe1e2' : (theme.color || '#333')};
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
    $isDark ? '0 2px 8px rgba(0,0,0,0)' : '0 2px 8px rgba(0,0,0,0)'};
  border: ${({ $isDark, theme }) =>
    $isDark
      ? `1px solid ${theme.borderColor || 'rgba(255,255,255,0.2)'}`
      : `1px solid ${theme.borderColor || 'rgba(255,255,255,0.3)'}`};
  display: flex;
  flex-direction: column;
  min-height: 260px;
`;

const PanelTitle = styled.h3`
  margin: 0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
`;

const ErrorText = styled.div`
  margin-bottom: 1rem;
  color: red;
  font-size: 0.95rem;
`;

const SectionBlock = styled.div`
  margin-bottom: 1rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px dashed ${({ $isDark, theme }) =>
    $isDark
      ? (theme.borderColor || '#444')
      : (theme.borderColor || '#ccc')
  };
  &:last-of-type {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  margin: 0;
  margin-bottom: 0.6rem;
  font-size: 1rem;
  font-weight: 500;
`;

const ErrorBox = styled.div`
  margin-bottom: 0.3rem;
  color: red;
`;

const InfoBox = styled.div`
  margin-bottom: 0.3rem;
  color: green;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
`;

const Label = styled.label`
  font-weight: bold;
  min-width: 60px;
  font-size: 0.85rem;
`;

const Input = styled.input`
  width: 80px;
  padding: 0.3rem;
  border: 1px solid ${({ $isDark, theme }) =>
    $isDark
      ? (theme.borderColor || '#bbb')
      : (theme.borderColor || '#666')};
  background: ${({ $isDark, theme }) =>
    $isDark
      ? (theme.inputBg || 'rgba(255,255,255,0.07)')
      : (theme.inputBg || '#fff')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  border-radius: 4px;
  font-size: 0.85rem;
`;

const LongInput = styled(Input)`
  width: 150px;
`;

const OutlineButton = styled.button`
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  background: transparent;
  border: 1px solid ${({ $isDark, theme }) =>
    $isDark
      ? (theme.borderColor || '#bbb')
      : (theme.borderColor || '#666')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  border-radius: 4px;
  font-size: 0.85rem;
  &:hover{
    background: ${({ $isDark }) =>
      $isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  }
`;

const CheckBoxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
`;
