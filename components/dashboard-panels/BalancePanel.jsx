import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes, css, createGlobalStyle } from 'styled-components';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiLock } from 'react-icons/fi';
import ReactApexChart from 'react-apexcharts';
import 'apexcharts/dist/apexcharts.css';

import { useWallet } from '../../context/WalletContext';
import { useThemeContext } from '../../context/ThemeContext';
import { getXrpMarketData, getXrpChartData } from '../../services/apiService';

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

const skeletonShimmer = keyframes`
  0% {
    background-position: -200px 0
  }
  100% {
    background-position: calc(200px + 100%) 0
  }
`;

export default function BalancePanel() {
  const {
    wallet,
    balance,
    refreshBalanceAndTx,
    fiatCurrency,
    xrpPriceFiat,
    locked,
    unfunded,
  } = useWallet();

  const { theme } = useThemeContext();

  const xrpBalance = balance / 1_000_000;
  const fiatEquivalent = useMemo(
    () => (xrpBalance * xrpPriceFiat).toFixed(2),
    [xrpBalance, xrpPriceFiat]
  );

  const [marketData, setMarketData] = useState(null);
  const [marketError, setMarketError] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);

  const [chartData, setChartData] = useState(null);
  const [chartError, setChartError] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  const [selectedRange, setSelectedRange] = useState('7');
  const [chartType, setChartType] = useState('area');
  const [series, setSeries] = useState([]);
  const [options, setOptions] = useState({});

  const showReserveWarning = unfunded || xrpBalance < 10;
  const needed = xrpBalance < 10 ? 10 - xrpBalance : 0;

  useEffect(() => {
    fetchMarketData();
    fetchChartData(selectedRange);
  }, [selectedRange]);

  async function fetchMarketData() {
    try {
      setMarketLoading(true);
      setMarketError(null);
      const data = await getXrpMarketData();
      setMarketData(data);
    } catch (err) {
      setMarketError(err);
    } finally {
      setMarketLoading(false);
    }
  }

  async function fetchChartData(range) {
    try {
      setChartLoading(true);
      setChartError(null);
      const resp = await getXrpChartData(range);
      setChartData(resp);
    } catch (err) {
      setChartError(err);
    } finally {
      setChartLoading(false);
    }
  }

  const handleRefresh = async () => {
    await refreshBalanceAndTx();
    await fetchMarketData();
    await fetchChartData(selectedRange);
  };

  const handleRangeChange = (range) => {
    setSelectedRange(range);
  };

  const toggleChartType = () => {
    setChartType((prev) => (prev === 'area' ? 'candlestick' : 'area'));
  };

  useEffect(() => {
    if (!chartData?.prices) {
      setSeries([]);
      setOptions({});
      return;
    }

    const apexSeries = chartData.prices.map(([ts, price]) => [ts, price]);
    const textColor = theme.darkMode ? '#e0e0e0' : '#333';

    if (chartType !== 'candlestick') {
      const lineColor = theme.darkMode
      ? 'rgba(135, 221, 253, 0.97)'
      : 'rgba(135, 221, 253, 1)';
    
      const gradientFrom = theme.darkMode
        ? 'rgba(75, 81, 83, 0.5)'
        : 'rgba(35, 170, 255, 0.4)';
      const gradientTo = theme.darkMode
        ? 'rgba(35, 255, 175, 0)'
        : 'rgba(35, 170, 255, 0)';

      setSeries([
        {
          name: `XRP (last ${selectedRange}d)`,
          data: apexSeries,
        },
      ]);
      setOptions({
        chart: {
          id: 'xrp-price-chart',
          type: 'area',
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true,
            },
          },
          background: 'transparent',
          foreColor: textColor,
        },
        grid: {
          borderColor: theme.darkMode
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(0,0,0,0.1)',
        },
        dataLabels: { enabled: false },
        stroke: {
          curve: 'smooth',
          width: 2,
          colors: [lineColor],
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            gradientToColors: [lineColor],
            inverseColors: false,
            opacityFrom: 0.25,
            opacityTo: 0.0,
            stops: [0, 95, 100],
            colorStops: [
              {
                offset: 0,
                color: gradientFrom,
                opacity: 0.7,
              },
              {
                offset: 100,
                color: gradientTo,
                opacity: 0.0,
              },
            ],
          },
        },
        xaxis: {
          type: 'datetime',
          labels: {
            style: {
              fontSize: '0.85rem',
              colors: textColor,
            },
          },
          axisBorder: {
            color: theme.darkMode
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(0,0,0,0.3)',
          },
          axisTicks: {
            color: theme.darkMode
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(0,0,0,0.3)',
          },
        },
        yaxis: {
          labels: {
            style: {
              fontSize: '0.85rem',
              colors: textColor,
            },
            formatter: (val) => `$${val.toFixed(4)}`,
          },
        },
        tooltip: {
          theme: theme.darkMode ? 'dark' : 'light',
          x: { format: 'dd MMM HH:mm' },
        },
        legend: { show: false },
      });
    } else {
      const ohlc = apexSeries.map(([ts, price]) => {
        const offset = price * 0.0001;
        return {
          x: ts,
          y: [
            Number(price - offset),
            Number(price + offset),
            Number(price - offset),
            Number(price),
          ],
        };
      });

      setSeries([
        {
          name: `XRP Candles (${selectedRange}d)`,
          data: ohlc,
        },
      ]);
      setOptions({
        chart: {
          id: 'xrp-price-candles',
          type: 'candlestick',
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true,
            },
          },
          background: 'transparent',
          foreColor: textColor,
        },
        grid: {
          borderColor: theme.darkMode
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(0,0,0,0.1)',
        },
        xaxis: {
          type: 'datetime',
          labels: {
            style: {
              fontSize: '0.85rem',
              colors: textColor,
            },
          },
          axisBorder: {
            color: theme.darkMode
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(0,0,0,0.3)',
          },
          axisTicks: {
            color: theme.darkMode
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(0,0,0,0.3)',
          },
        },
        yaxis: {
          labels: {
            style: {
              fontSize: '0.85rem',
              colors: textColor,
            },
            formatter: (val) => `$${val.toFixed(4)}`,
          },
        },
        tooltip: {
          theme: theme.darkMode ? 'dark' : 'light',
          x: { format: 'dd MMM HH:mm' },
        },
        plotOptions: {
          candlestick: {
            colors: {
              upward: '#00c853',
              downward: '#e53935',
            },
          },
        },
        legend: { show: false },
      });
    }
  }, [chartData, theme.darkMode, selectedRange, chartType]);

  return (
    <>
      <ApexGlobalStyle $isDark={theme.darkMode} />

      <Container
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        $isDark={theme.darkMode}
      >
        <TopRow>
          <LeftPanel
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            $isDark={theme.darkMode}
          >
            <LeftContent>
              <BalanceTitleRow>
                <TitleWithIcon>
                  <IconImg src="./images/xrp.webp" alt="XRP Icon" />
                  <PanelTitle>XRP Balance</PanelTitle>
                  {locked && (
                    <LockBox>
                      <FiLock size={13} />
                      <LockText>Locked</LockText>
                    </LockBox>
                  )}
                  {showReserveWarning && (
                    <ReserveBox $isDark={theme.darkMode}>
                      {unfunded ? (
                        <ReserveText>Needs at least 10 XRP</ReserveText>
                      ) : (
                        <ReserveText>
                          {xrpBalance.toFixed(2)} XRP, need {needed.toFixed(2)} more
                        </ReserveText>
                      )}
                    </ReserveBox>
                  )}
                </TitleWithIcon>
              </BalanceTitleRow>

              <InfoLine>
                <InfoLabel>Address</InfoLabel>
                <InfoValue>{wallet?.address || '—'}</InfoValue>
              </InfoLine>
              <InfoLine>
                <InfoLabel>Balance</InfoLabel>
                <InfoValue>{xrpBalance.toFixed(6)} XRP</InfoValue>
              </InfoLine>
              <InfoLine>
                <InfoLabel>Fiat ({fiatCurrency})</InfoLabel>
                <InfoValue>
                  {fiatEquivalent} {fiatCurrency}
                </InfoValue>
              </InfoLine>

              <BottomRow>
                <RefreshButton whileHover={{ scale: 1.05 }} onClick={handleRefresh}>
                  <FiRefreshCw size={14} />
                  <span>Refresh</span>
                </RefreshButton>
              </BottomRow>
            </LeftContent>
          </LeftPanel>

          <RightPanel
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            $isDark={theme.darkMode}
          >
            <PanelSubtitle>XRP Market</PanelSubtitle>
            {marketLoading ? (
              <SkeletonBox style={{ height: '60px' }} />
            ) : marketError ? (
              <ErrorText>Error: {marketError.message}</ErrorText>
            ) : marketData ? (
              <MarketBox $isDark={theme.darkMode}>
                <MarketRowGrid>
                  <div>
                    <span>Price (USD)</span>
                    <strong>${marketData.currentPrice.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>24h Change</span>
                    <PriceChangeText value={marketData.priceChange24h}>
                      {marketData.priceChange24h.toFixed(2)}%
                    </PriceChangeText>
                  </div>
                  <div>
                    <span>Market Cap</span>
                    <strong>${marketData.marketCap.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Volume (24h)</span>
                    <strong>${marketData.totalVolume.toLocaleString()}</strong>
                  </div>
                </MarketRowGrid>
              </MarketBox>
            ) : (
              <NoDataText>No market data</NoDataText>
            )}
          </RightPanel>
        </TopRow>

        <ChartControls
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <TimeFrameButtons>
            <TimeFrameBtn
              $active={selectedRange === '1'}
              onClick={() => handleRangeChange('1')}
            >
              1D
            </TimeFrameBtn>
            <TimeFrameBtn
              $active={selectedRange === '7'}
              onClick={() => handleRangeChange('7')}
            >
              7D
            </TimeFrameBtn>
            <TimeFrameBtn
              $active={selectedRange === '30'}
              onClick={() => handleRangeChange('30')}
            >
              30D
            </TimeFrameBtn>
            <TimeFrameBtn
              $active={selectedRange === '90'}
              onClick={() => handleRangeChange('90')}
            >
              90D
            </TimeFrameBtn>
          </TimeFrameButtons>

          <ChartTypeToggler onClick={toggleChartType}>
            Switch to {chartType === 'candlestick' ? 'Line' : 'Candles'}
          </ChartTypeToggler>
        </ChartControls>

        <ChartSection
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          $isDark={theme.darkMode}
        >
          <PanelSubtitle>XRP Price Chart</PanelSubtitle>
          {chartLoading ? (
            <SkeletonBox style={{ height: '180px', marginTop: '0.5rem' }} />
          ) : chartError ? (
            <ErrorText>Error: {chartError.message}</ErrorText>
          ) : series.length > 0 && options.chart ? (
            <ChartWrapper>
              <ReactApexChart
                options={options}
                series={series}
                type={chartType}
                width="100%"
                height="100%"
              />
            </ChartWrapper>
          ) : (
            <NoDataText>No data</NoDataText>
          )}
        </ChartSection>
      </Container>
    </>
  );
}

const gradientAnim = keyframes`
  0% {
    background-position: 0% 50%
  }
  50% {
    background-position: 100% 50%
  }
  100% {
    background-position: 0% 50%
  }
`;

const Container = styled(motion.div)`
  width: 100%;
  padding: 0.8rem;
  color: ${({ $isDark }) => ($isDark ? '#dfe1e2' : '#333')};
  font-family: 'Roboto', Arial, sans-serif;
  box-sizing: border-box;
  border-radius: 8px;
  background: ${({ $isDark }) =>
    $isDark
      ? 'linear-gradient(135deg,rgba(26, 36, 47, 0),rgba(20, 26, 32, 0))'
      : 'linear-gradient(135deg, #fafafa, #f5f5f5)'};
  background-size: 200% 200%;
  animation: ${gradientAnim} 10s ease infinite;
  font-size: 0.95rem;
`;

const TopRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const LeftPanel = styled(motion.div)`
  flex: 1 1 280px;
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: ${({ $isDark }) =>
    $isDark
      ? 'linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(255,255,255,0.05))'
      : 'linear-gradient(to right, rgba(255, 255, 255, 0.6), rgba(255,255,255,0.4))'};
  box-shadow: ${({ $isDark }) =>
    $isDark
      ? '0 2px 8px rgba(0, 0, 0, 0.7)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  border: ${({ $isDark }) =>
    $isDark
      ? '1px solid rgba(255, 255, 255, 0.2)'
      : '1px solid rgba(255, 255, 255, 0.3)'};
  display: flex;
  flex-direction: column;
`;

const LeftContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const BalanceTitleRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.3rem;
`;

const TitleWithIcon = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
`;

const IconImg = styled.img`
  width: 22px;
  height: 22px;
  object-fit: contain;
`;

const PanelTitle = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const LockBox = styled.div`
  display: inline-flex;
  align-items: center;
  background-color: rgba(255, 56, 56, 0.12);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
`;

const LockText = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  margin-left: 0.2rem;
`;

const ReserveBox = styled.div`
  background-color: ${({ $isDark }) =>
    $isDark
      ? 'rgba(255, 255, 0, 0.25)'
      : 'rgba(255, 234, 0, 0.42)'};
  padding: 0.3rem 0.4rem;
  border-radius: 4px;
  border: ${({ $isDark }) =>
    $isDark
      ? '1px solid rgba(255, 255, 255, 0.2)'
      : '1px solid rgba(0, 0, 0, 0.1)'};
`;

const ReserveText = styled.p`
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0;
`;

const InfoLine = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.3rem;
`;

const InfoLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
`;

const InfoValue = styled.span`
  font-size: 0.8rem;
  font-weight: 400;
  text-align: right;
  word-break: break-all;
  max-width: 65%;
`;

const BottomRow = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: flex-start;
  padding-top: 0.4rem;
`;

const RefreshButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background-color: rgb(105, 189, 102);
  color: #fff;
  padding: 0.3rem 0.6rem;
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

const RightPanel = styled(motion.div)`
  flex: 1 1 280px;
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: ${({ $isDark }) =>
    $isDark
      ? 'linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(255,255,255,0.05))'
      : 'linear-gradient(to right, rgba(255, 255, 255, 0.6), rgba(255,255,255,0.4))'};
  box-shadow: ${({ $isDark }) =>
    $isDark
      ? '0 2px 8px rgba(0, 0, 0, 0.7)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  border: ${({ $isDark }) =>
    $isDark
      ? '1px solid rgba(255, 255, 255, 0.2)'
      : '1px solid rgba(255, 255, 255, 0.3)'};
  display: flex;
  flex-direction: column;
`;

const PanelSubtitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
`;

const MarketBox = styled.div`
  margin-top: 0.2rem;
  border-radius: 4px;
  padding: 0.5rem;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  background: ${({ $isDark }) =>
    $isDark
      ? 'rgba(255, 255, 255, 0)'
      : 'rgba(255, 255, 255, 0.35)'};
  box-shadow: ${({ $isDark }) =>
    $isDark
      ? '0 2px 10px rgba(0, 0, 0, 0.5)'
      : '0 2px 10px rgba(0, 0, 0, 0.1)'};
  border: ${({ $isDark }) =>
    $isDark
      ? '1px solid rgba(255, 255, 255, 0.15)'
      : '1px solid rgba(255, 255, 255, 0.3)'};
`;

const MarketRowGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  font-size: 0.85rem;
  & > div {
    display: flex;
    flex-direction: column;
    span {
      opacity: 0.8;
    }
    strong {
      font-weight: 600;
      margin-top: 0.2rem;
    }
  }
`;

const PriceChangeText = styled.strong`
  ${({ value }) =>
    value > 0
      ? css`
          color: #00c853;
        `
      : value < 0
      ? css`
          color: #e53935;
        `
      : css`
          color: inherit;
        `};
`;

const ChartControls = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
`;

const TimeFrameButtons = styled.div`
  display: inline-flex;
  gap: 0.4rem;
`;

const TimeFrameBtn = styled.button`
  background-color: ${({ $active }) => ($active ? '#2979ff' : '#e0e0e0')};
  color: ${({ $active }) => ($active ? '#fff' : '#333')};
  border: none;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
  &:hover {
    background-color: ${({ $active }) => ($active ? '#1565c0' : '#d5d5d5')};
  }
`;

const ChartTypeToggler = styled.button`
  background-color: #ff8f00;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
  &:hover {
    background-color: #ff6f00;
  }
`;

const ChartSection = styled(motion.div)`
  border-radius: 8px;
  padding: 0.6rem;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  background: ${({ $isDark }) =>
    $isDark
      ? 'linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.05))'
      : 'linear-gradient(to right, rgba(255,255,255,0.6), rgba(255,255,255,0.4))'};
  box-shadow: ${({ $isDark }) =>
    $isDark
      ? '0 2px 8px rgba(0, 0, 0, 0.7)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  border: ${({ $isDark }) =>
    $isDark
      ? '1px solid rgba(255, 255, 255, 0.2)'
      : '1px solid rgba(255, 255, 255, 0.3)'};
`;

const ChartWrapper = styled.div`
  width: 100%;
  height: 180px;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.4rem;
`;

const NoDataText = styled.p`
  font-size: 0.85rem;
  color: #bbb;
  text-align: center;
  padding: 0.6rem;
`;

const SkeletonBox = styled.div`
  width: 100%;
  border-radius: 4px;
  background-color: #ccc;
  background-image: linear-gradient(
    90deg,
    #ccc 0px,
    #e0e0e0 40px,
    #ccc 80px
  );
  background-size: 200px 100%;
  animation: ${skeletonShimmer} 1.4s ease-in-out infinite;
`;

const ErrorText = styled.p`
  font-size: 0.85rem;
  color: #ff4d4d;
  font-weight: 500;
`;
