import React, { useState } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  FiKey,
  FiSun,
  FiMoon,
  FiDollarSign,
  FiSettings,
  FiTool,
  FiServer,
  FiLock,
  FiRefreshCcw
} from 'react-icons/fi';
import { useWallet } from '../../context/WalletContext';
import { useThemeContext } from '../../context/ThemeContext';

const ApexGlobalStyle = createGlobalStyle`
  .apexcharts-menu {
    background-color:${({ $isDark })=> $isDark?'#2a2a2a':'#fff'} !important;
    color:${({ $isDark })=> $isDark?'#e0e0e0':'#333'} !important;
    border:${({ $isDark })=> $isDark?'1px solid #444':'1px solid #ccc'} !important;
    box-shadow:${({ $isDark })=> $isDark?'0 3px 10px rgba(0,0,0,0.7)':'0 3px 8px rgba(0,0,0,0.2)'} !important;
  }
  .apexcharts-menu-item {
    padding:6px 12px !important;
  }
  .apexcharts-menu-item:hover {
    background-color:${({ $isDark })=> $isDark?'#444':'#eee'} !important;
    color:${({ $isDark })=> $isDark?'#fff':'#000'} !important;
  }
`;

const gradientAnim = keyframes`
  0% { background-position:0% 50%; }
  50% { background-position:100% 50%; }
  100% { background-position:0% 50%; }
`;

export default function SettingsPanel() {
  const {
    locked,
    lockWallet,
    unlockWallet,
    masterPassword,
    setMasterPassword,
    fiatCurrency,
    setFiatCurrency,
    userSettings,
    updateUserSettings,
    resetUserSettings,
    wallet,
    setWalletWithPath,
    refreshBalanceAndTx
  } = useWallet();
  const { toggleTheme, theme } = useThemeContext();
  const isDark = theme.name === 'dark';
  const [pwErr, setPwErr] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  function handleChangePassword() {
    setPwErr('');
    setPwMsg('');
    if (!oldPwd.trim() || !newPwd.trim()) {
      setPwErr('Please fill old and new password');
      return;
    }
    if (!locked) {
      if (oldPwd !== masterPassword) {
        setPwErr('Old password is incorrect');
        return;
      }
      setMasterPassword(newPwd);
      setPwMsg('Password changed successfully');
      setOldPwd('');
      setNewPwd('');
    } else {
      const ok = unlockWallet(oldPwd);
      if (!ok) {
        setPwErr('Wrong old password');
        return;
      }
      setMasterPassword(newPwd);
      lockWallet();
      setPwMsg('Password changed, wallet re-locked');
      setOldPwd('');
      setNewPwd('');
    }
  }
  function handleToggleTheme() {
    toggleTheme();
  }
  const [fiatMsg, setFiatMsg] = useState('');
  function handleFiatChange(e) {
    const val = e.target.value;
    setFiatCurrency(val);
    setFiatMsg(`Fiat changed to ${val}`);
  }
  const fiatList = [
    'USD','EUR','GBP','AUD','CAD','JPY','CNY','RUB','BRL','CHF','INR','MXN','HKD',
    'SGD','NZD','SEK','NOK','DKK','PLN','TRY','ZAR','AED','ARS','CLP','COP','CZK',
    'HUF','ILS','KRW','MYR','PHP'
  ];
  const [usErr, setUsErr] = useState('');
  const [usMsg, setUsMsg] = useState('');
  function handleAutoLockMinutes(e) {
    setUsErr('');
    setUsMsg('');
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 0) {
      setUsErr('Auto-lock minutes must be >= 0');
      return;
    }
    updateUserSettings({ autoLockMinutes: val });
    setUsMsg(`autoLockMinutes updated to ${val}`);
  }
  function handleToggleAutoRefresh() {
    setUsErr('');
    setUsMsg('');
    const newVal = !userSettings.autoRefreshTx;
    updateUserSettings({ autoRefreshTx: newVal });
    setUsMsg(`autoRefreshTx changed to ${newVal}`);
  }
  function handleToggleShowFiat() {
    setUsErr('');
    setUsMsg('');
    const newVal = !userSettings.showFiat;
    updateUserSettings({ showFiat: newVal });
    setUsMsg(`showFiat changed to ${newVal}`);
  }
  function handleResetDefaults() {
    setUsErr('');
    setUsMsg('');
    resetUserSettings();
    setPwMsg('');
    setFiatMsg('');
    setUsMsg('All user settings reset to defaults');
  }
  const [otherErr, setOtherErr] = useState('');
  const [otherMsg, setOtherMsg] = useState('');
  const [tempOffset, setTempOffset] = useState(String(userSettings.txMaxLedgerOffset || 200));
  function handleOtherApply() {
    setOtherErr('');
    setOtherMsg('');
    const val = parseInt(tempOffset, 10);
    if (isNaN(val) || val < 1) {
      setOtherErr('Ledger offset must be a positive integer');
      return;
    }
    updateUserSettings({ txMaxLedgerOffset: val });
    setOtherMsg(`Ledger offset updated to ${val}`);
  }
  const [nodeErr, setNodeErr] = useState('');
  const [nodeMsg, setNodeMsg] = useState('');
  const [tempNode, setTempNode] = useState(userSettings.preferredNode || 'wss://s2.ripple.com');
  function handleApplyNode() {
    setNodeErr('');
    setNodeMsg('');
    const url = tempNode.trim();
    if (!url.startsWith('wss://')) {
      setNodeErr('URL must start with wss://');
      return;
    }
    updateUserSettings({ preferredNode: url });
    if (wallet) {
      const newWallet = { ...wallet, serverUrl: url };
      setWalletWithPath(newWallet, null);
    }
    refreshBalanceAndTx();
    setNodeMsg(`Node changed to ${url}`);
  }
  return (
    <>
      <ApexGlobalStyle $isDark={isDark} />
      <SettingsPanelContainer
        $isDark={isDark}
        initial={{ opacity:0, y:6 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4 }}
      >
        <GlassPanel
          $isDark={isDark}
          initial={{ opacity:0, scale:0.95 }}
          animate={{ opacity:1, scale:1 }}
          transition={{ duration:0.3 }}
        >
          <MainTitle>
            <FiSettings style={{ marginRight:6, fontSize:'1.2rem' }}/>
            Settings
          </MainTitle>
          <GridWrapper>
            <SectionBlock $isDark={isDark}>
              <SectionTitle>
                <FiKey style={{ marginRight:5 }}/>
                Change Password
              </SectionTitle>
              {(pwErr || pwMsg) && (
                <MsgBox $isError={!!pwErr}>
                  {pwErr || pwMsg}
                </MsgBox>
              )}
              <HelpText>
                Keep your wallet safe by updating your password regularly.
                If you forget or lose your password, you won't be able to 
                unlock your wallet. 
              </HelpText>
              <FormRow>
                <Label>Old Password:</Label>
                <Input
                  $isDark={isDark}
                  type="password"
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                />
              </FormRow>
              <FormRow>
                <Label>New Password:</Label>
                <Input
                  $isDark={isDark}
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
              </FormRow>
              <OutlineButton $isDark={isDark} onClick={handleChangePassword}>
                <FiLock style={{ marginRight:3 }}/>
                Update Password
              </OutlineButton>
              <InfoLine>
                Wallet is currently <b>{locked ? 'Locked' : 'Unlocked'}</b>.
              </InfoLine>
            </SectionBlock>
            <SectionBlock $isDark={isDark}>
              <SectionTitle>
                {isDark
                  ? <FiSun style={{ marginRight:5 }}/>
                  : <FiMoon style={{ marginRight:5 }}/>}
                Theme
              </SectionTitle>
              <HelpText>Switch between a light or dark interface for your wallet.</HelpText>
              <OutlineButton $isDark={isDark} onClick={handleToggleTheme}>
                {isDark
                  ? <>Switch to Light</>
                  : <><FiMoon style={{ marginRight:3 }}/> Switch to Dark</>
                }
              </OutlineButton>
              <InfoLine>
                Current theme: <b>{isDark ? 'Dark' : 'Light'}</b>
              </InfoLine>
            </SectionBlock>
            <SectionBlock $isDark={isDark}>
              <SectionTitle>
                <FiDollarSign style={{ marginRight:5 }}/>
                Fiat Currency
              </SectionTitle>
              {fiatMsg && <MsgBox>{fiatMsg}</MsgBox>}
              <HelpText>
                Select your preferred fiat currency for approximate conversions 
                (shown throughout the app, like in Balance, etc.).
              </HelpText>
              <InfoLine>
                Selected: <b>{fiatCurrency}</b>
              </InfoLine>
              <Select
                $isDark={isDark}
                value={fiatCurrency}
                onChange={handleFiatChange}
              >
                {fiatList.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </Select>
            </SectionBlock>
            <SectionBlock $isDark={isDark}>
              <SectionTitle>
                <FiSettings style={{ marginRight:5 }}/>
                User Settings
              </SectionTitle>
              {(usErr || usMsg) && (
                <MsgBox $isError={!!usErr}>
                  {usErr || usMsg}
                </MsgBox>
              )}
              <HelpText>
                Adjust how your wallet behaves. For example, auto-lock 
                will lock the wallet automatically after N minutes of inactivity.
                Auto-refresh can check for new transactions periodically.
                Showing fiat toggles whether your approximate fiat value 
                is displayed in the wallet.
              </HelpText>
              <FormRow>
                <Label>Auto-Lock (min):</Label>
                <Input
                  $isDark={isDark}
                  type="number"
                  value={userSettings.autoLockMinutes}
                  onChange={handleAutoLockMinutes}
                />
              </FormRow>
              <FormRow>
                <Label>Auto-Refresh Tx:</Label>
                <Checkbox
                  type="checkbox"
                  checked={userSettings.autoRefreshTx}
                  onChange={handleToggleAutoRefresh}
                />
              </FormRow>
              <FormRow>
                <Label>Show Fiat:</Label>
                <Checkbox
                  type="checkbox"
                  checked={userSettings.showFiat}
                  onChange={handleToggleShowFiat}
                />
              </FormRow>
              <OutlineButton $isDark={isDark} onClick={handleResetDefaults}>
                <FiRefreshCcw style={{ marginRight:3 }}/>
                Reset to Defaults
              </OutlineButton>
            </SectionBlock>
            <SectionBlock $isDark={isDark}>
              <SectionTitle>
                <FiTool style={{ marginRight:5 }}/>
                Other Settings
              </SectionTitle>
              {(otherErr || otherMsg) && (
                <MsgBox $isError={!!otherErr}>
                  {otherErr || otherMsg}
                </MsgBox>
              )}
              <HelpText>
                Here you can set a custom <b>txMaxLedgerOffset</b> 
                used for advanced transactions (e.g. when you sign or submit 
                transactions, the wallet checks how many ledgers ahead 
                it can still be valid).
              </HelpText>
              <FormRow>
                <Label>Max Ledger Offset:</Label>
                <Input
                  $isDark={isDark}
                  type="number"
                  value={tempOffset}
                  onChange={(e)=> setTempOffset(e.target.value)}
                />
              </FormRow>
              <OutlineButton $isDark={isDark} onClick={handleOtherApply}>
                <FiRefreshCcw style={{ marginRight:3 }}/>
                Apply Offset
              </OutlineButton>
            </SectionBlock>
            <SectionBlock $isDark={isDark}>
              <SectionTitle>
                <FiServer style={{ marginRight:5 }}/>
                XRPL Node Settings
              </SectionTitle>
              {(nodeErr || nodeMsg) && (
                <MsgBox $isError={!!nodeErr}>
                  {nodeErr || nodeMsg}
                </MsgBox>
              )}
              <HelpText>
                Choose a custom XRPL node (WebSocket) for balance & transaction updates. 
                Must start with <b>wss://</b>. You can switch to a different public 
                node or a private one if you have it.
              </HelpText>
              <FormRow>
                <Label>Node URL:</Label>
                <Input
                  $isDark={isDark}
                  type="text"
                  value={tempNode}
                  onChange={(e)=> setTempNode(e.target.value)}
                />
              </FormRow>
              <OutlineButton $isDark={isDark} onClick={handleApplyNode}>
                <FiServer style={{ marginRight:3 }}/>
                Apply Node
              </OutlineButton>
            </SectionBlock>
          </GridWrapper>
        </GlassPanel>
      </SettingsPanelContainer>
    </>
  );
}

const SettingsPanelContainer = styled(motion.div)`
  width:100%;
  min-height:340px;
  padding:0.8rem;
  border-radius:8px;
  box-sizing:border-box;
  color: ${({ $isDark, theme })=> $isDark?'#dfe1e2':(theme.color||'#333')};
  background: ${({ $isDark, theme })=>
    $isDark
      ? (theme.background||'linear-gradient(135deg,rgba(26,36,47,0),rgba(20,26,32,0))')
      : (theme.background||'linear-gradient(135deg,#fafafa,#f5f5f5)')};
  background-size:200% 200%;
  animation:${gradientAnim} 10s ease infinite;
  position:relative;
`;

const GlassPanel = styled(motion.div)`
  border-radius:10px;
  backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
  padding:1rem;
  background:${({ $isDark, theme })=>
    $isDark
      ? (theme.panelBg||'linear-gradient(to right, rgba(255,0,0,0), rgba(255,255,255,0.05))')
      : (theme.panelBg||'linear-gradient(to right, rgba(255,255,255,0.7), rgba(255,255,255,0.4))')};
  box-shadow:${({ $isDark })=>
    $isDark
      ? '0 2px 8px rgba(0,0,0,0)'
      : '0 2px 8px rgba(0,0,0,0)'}; 
  border:${({ $isDark, theme })=>
    $isDark
      ? `1px solid ${theme.borderColor||'rgba(255,255,255,0.2)'}` 
      : `1px solid ${theme.borderColor||'rgba(0,0,0,0.2)'}`};
  display:flex;
  flex-direction:column;
  min-height:260px;
`;

const MainTitle = styled.h2`
  margin:0;
  margin-bottom:1rem;
  font-size:1.2rem;
  font-weight:600;
  display:flex;
  align-items:center;
`;

const GridWrapper = styled.div`
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(280px,1fr));
  gap:1rem;
`;

const SectionBlock = styled.div`
  border-radius:4px;
  padding:1rem;
  background:transparent;
  border:1px solid ${({ $isDark })=> $isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.2)'};
`;

const SectionTitle = styled.h3`
  margin:0;
  margin-bottom:0.6rem;
  font-size:1rem;
  font-weight:500;
  display:flex;
  align-items:center;
`;

const MsgBox = styled.div`
  margin-bottom:0.6rem;
  padding:0.5rem;
  border:1px solid;
  border-color: ${({ $isError })=> $isError?'red':'green'};
  color: ${({ $isError })=> $isError?'red':'green'};
  border-radius:4px;
  background:transparent;
`;

const HelpText = styled.p`
  font-size:0.85rem;
  margin-bottom:0.7rem;
  line-height:1.4;
  opacity:0.9;
`;

const InfoLine = styled.p`
  font-size:0.85rem;
  margin-top:0.6rem;
`;

const FormRow = styled.div`
  display:flex;
  align-items:center;
  gap:0.5rem;
  margin-bottom:0.6rem;
`;

const Label = styled.label`
  width:120px;
  text-align:right;
  font-size:0.85rem;
  font-weight:500;
`;

const Input = styled.input`
  flex:1;
  padding:4px 6px;
  font-size:0.85rem;
  border-radius:4px;
  background:transparent;
  border:1px solid ${({ $isDark })=> $isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.2)'};
  color:${({ $isDark })=> $isDark?'#fff':'#333'};
  &:focus {
    outline:none;
    border-color:${({ $isDark })=> $isDark?'rgba(255,255,255,0.4)':'rgba(0,0,0,0.4)'};
  }
`;

const Checkbox = styled.input`
  transform:scale(1.2);
  cursor:pointer;
`;

const OutlineButton = styled.button`
  margin-top:0.3rem;
  padding:0.4rem 0.8rem;
  font-size:0.85rem;
  background:transparent;
  border-radius:4px;
  cursor:pointer;
  border:1px solid ${({ $isDark })=> $isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.2)'};
  color:${({ $isDark })=> $isDark?'#fff':'#333'};
  display:inline-flex;
  align-items:center;
  gap:0.3rem;
`;

const Select = styled.select`
  flex:1;
  padding:4px 6px;
  font-size:0.85rem;
  border-radius:4px;
  background:transparent;
  border:1px solid ${({ $isDark })=> $isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.2)'};
  color:${({ $isDark })=> $isDark?'#fff':'#333'};
  margin-top:0.3rem;
  cursor:pointer;
  &:hover{
    background:${({ $isDark })=> $isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)'};
  }
  & option {
    background:${({ $isDark })=> $isDark?'#2f2f2f':'#fff'};
    color:${({ $isDark })=> $isDark?'#fff':'#333'};
  }
`;
