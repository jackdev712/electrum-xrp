
import React from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { FiShoppingCart } from 'react-icons/fi';

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

export default function BuyXrpPanel() {
  const { theme } = useThemeContext();
  const isDark = theme.darkMode;

  const backgroundParam = isDark ? '1A242F' : 'FFFFFF';
  const darkParam       = isDark ? 'true'     : 'false';

  const snippet = `
<iframe
  id='iframe-widget'
  src='https://changenow.io/embeds/exchange-widget/v2/widget.html?FAQ=true&amount=0.01&amountFiat=1500&backgroundColor=${backgroundParam}&darkMode=${darkParam}&from=btc&fromFiat=eur&horizontal=false&isFiat=true&lang=en-US&link_id=3bea05c24747f0&locales=true&logo=true&primaryColor=00C26F&to=xrp&toFiat=xrp&toTheMoon=true'
  style="height: 356px; width: 100%; border: none;">
</iframe>

<script
  defer
  type='text/javascript'
  src='https://changenow.io/embeds/exchange-widget/v2/stepper-connector.js'>
</script>
`;

  return (
    <>
      <ApexGlobalStyle $isDark={isDark} />

      <BuyXrpContainer
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
          <PanelTitle>
            <FiShoppingCart style={{ marginRight:6 }}/>
            Buy XRP With Other Currency
          </PanelTitle>

          <EmbedContainer>
            <div dangerouslySetInnerHTML={{ __html: snippet }} />
          </EmbedContainer>

          <InfoText>
            This embedded widget uses default parameters to exchange BTC 
            to XRP. If you're in dark mode, the widget also adapts its color. 
            You can modify the snippet if you need other pairs (e.g. ETH → XRP)
            or to change the design further.
          </InfoText>
        </GlassPanel>
      </BuyXrpContainer>
    </>
  );
}


const BuyXrpContainer = styled(motion.div)`
  width:100%;
  min-height:340px;
  padding:1rem;
  border-radius:8px;
  box-sizing:border-box;
  color:${({ $isDark, theme })=> $isDark?'#dfe1e2':(theme.color||'#333')};
  background:${({ $isDark, theme })=>
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
  box-shadow:${({ $isDark })=> $isDark?'0 2px 8px rgba(0,0,0,0)':'0 2px 8px rgba(0,0,0,0)'};
  border:${({ $isDark, theme })=>
    $isDark
      ? `1px solid ${theme.borderColor||'rgba(255,255,255,0.2)'}`
      : `1px solid ${theme.borderColor||'rgba(0,0,0,0.2)'}`};

  display:flex;
  flex-direction:column;
  min-height:260px;
`;

const PanelTitle = styled.h2`
  margin:0;
  margin-bottom:1rem;
  font-size:1.2rem;
  font-weight:600;
  display:flex;
  align-items:center;
`;

const EmbedContainer = styled.div`
  width:100%;
  /* Полупрозрачная рамка вокруг виджета (необязательно) */
  border:1px solid ${({ $isDark })=> $isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.2)'};
  border-radius:6px;
  padding:0.6rem;
  background:transparent;
`;

const InfoText = styled.p`
  margin-top:1rem;
  font-size:0.9rem;
  line-height:1.4;
  opacity:0.9;
`;
