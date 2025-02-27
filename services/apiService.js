import { Client, Wallet, xrpToDrops } from 'xrpl';

export async function sendXrpTransaction(opts) {
  const { seed, fromAddress, toAddress, amountXrp, destinationTag, memo, onLog } = opts;
  function log(msg) {
    if (typeof onLog === 'function') {
      onLog(msg);
    }
  }
  log('=== sendXrpTransaction: Manual TX start ===');
  log(`From=${fromAddress}, To=${toAddress}, AmountXRP=${amountXrp}`);
  const client = new Client('wss://s2.ripple.com');
  await client.connect();
  try {
    log('Connected to s2.ripple.com');
    const wallet = Wallet.fromSeed(seed);
    if (wallet.classicAddress !== fromAddress) {
      throw new Error('Seed does not match fromAddress');
    }
    log(`Wallet OK: ${wallet.classicAddress}`);
    log('Requesting recommended fee...');
    const feeResp = await client.request({ command: 'fee' });
    const baseDrops = parseInt(feeResp.result?.drops?.base_fee, 10) || 10;
    const openDrops = parseInt(feeResp.result?.drops?.open_ledger_fee, 10) || baseDrops;
    const recommendedDrops = Math.max(openDrops, 10);
    log(`baseFee=${baseDrops}, openLedgerFee=${openDrops}, finalFeeDrops=${recommendedDrops}`);
    log('Requesting ledger_current...');
    const ledgerCurResp = await client.request({ command: 'ledger_current' });
    const currentLedger = ledgerCurResp.result?.ledger_current_index;
    if (!currentLedger) {
      throw new Error('Unable to get current ledger index');
    }
    log(`currentLedger = ${currentLedger}`);
    log('Requesting account_info => Sequence...');
    const acctInfoResp = await client.request({
      command: 'account_info',
      account: fromAddress,
      ledger_index: 'current'
    });
    const seq = acctInfoResp.result?.account_data?.Sequence;
    if (!seq) {
      throw new Error('Unable to get Sequence from account_info');
    }
    log(`Sequence = ${seq}`);
    const lastLedger = currentLedger + 2000;
    const drops = xrpToDrops(amountXrp);
    const paymentTx = {
      TransactionType: 'Payment',
      Account: fromAddress,
      Destination: toAddress,
      Amount: drops,
      Fee: recommendedDrops.toString(),
      Sequence: seq,
      LastLedgerSequence: lastLedger
    };
    if (typeof destinationTag === 'number') {
      paymentTx.DestinationTag = destinationTag;
    }
    if (memo && memo.trim()) {
      const memoHex = Buffer.from(memo.trim(), 'utf8').toString('hex');
      paymentTx.Memos = [{ Memo: { MemoData: memoHex } }];
    }
    log(`Payment TX: ${JSON.stringify(paymentTx, null, 2)}`);
    const signed = wallet.sign(paymentTx);
    log(`Signed hash: ${signed.hash}`);
    log(`Signed tx_blob length: ${signed.tx_blob.length} chars`);
    log('Submitting transaction (client.submit) ...');
    const submitResp = await client.submit(signed.tx_blob);
    log(`submitResp: ${JSON.stringify(submitResp, null, 2)}`);
    const pollCountMax = 20;
    let finalResult = null;
    let pollCount = 0;
    const txHash = signed.hash;
    while (pollCount < pollCountMax) {
      pollCount++;
      log(`Polling #${pollCount} for tx: ${txHash}`);
      await new Promise(r => setTimeout(r, 3000));
      let txInfoResp;
      try {
        txInfoResp = await client.request({
          command: 'tx',
          transaction: txHash
        });
      } catch (pollErr) {
        log(`Poll error: ${pollErr.message}`);
        continue;
      }
      if (!txInfoResp || !txInfoResp.result) {
        log('No tx result yet');
        continue;
      }
      const validated = txInfoResp.result.validated;
      const resultCode = txInfoResp.result.meta?.TransactionResult;
      log(`tx validated=${validated}, result=${resultCode}`);
      if (validated) {
        finalResult = txInfoResp.result;
        break;
      }
    }
    if (!finalResult) {
      log('Not validated after 20 polls => maybe pending still');
      return { error: 'PENDING', message: 'Not validated in 20 polls' };
    }
    return finalResult;
  } catch (err) {
    log(`sendXrpTransaction error: ${err.message}`);
    throw err;
  } finally {
    log('Disconnecting from s2.ripple.com...');
    await client.disconnect();
    log('Disconnected');
  }
}

export async function getXrpBalance(address) {
  const client = new Client('wss://s2.ripple.com');
  await client.connect();
  try {
    const resp = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    });
    const dropsStr = resp.result?.account_data?.Balance;
    if (!dropsStr) return 0;
    return parseInt(dropsStr, 10) / 1000000;
  } finally {
    await client.disconnect();
  }
}

export async function getXrpTransactions(address, limit = 10) {
  const client = new Client('wss://s2.ripple.com');
  await client.connect();
  try {
    const resp = await client.request({
      command: 'account_tx',
      account: address,
      ledger_index_min: -1,
      ledger_index_max: -1,
      limit
    });
    return resp.result?.transactions || [];
  } finally {
    await client.disconnect();
  }
}

export async function pingNetwork() {
  const client = new Client('wss://s2.ripple.com');
  try {
    await client.connect();
    await client.disconnect();
    return true;
  } catch (err) {
    console.error('pingNetwork error:', err);
    return false;
  }
}

let lastMarketData = null;
let lastMarketDataTs = 0;
const MARKET_DATA_CACHE_TTL_MS = 60000;

export async function getXrpMarketData() {
  const now = Date.now();
  if (lastMarketData && (now - lastMarketDataTs) < MARKET_DATA_CACHE_TTL_MS) {
    return lastMarketData;
  }
  const url = 'https://api.coingecko.com/api/v3/coins/ripple?localization=false';
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch Market Data: ${resp.status}`);
  }
  const data = await resp.json();
  const marketData = {
    currentPrice: data.market_data.current_price.usd,
    marketCap: data.market_data.market_cap.usd,
    totalVolume: data.market_data.total_volume.usd,
    priceChange24h: data.market_data.price_change_percentage_24h
  };
  lastMarketData = marketData;
  lastMarketDataTs = now;
  return marketData;
}

const chartCache = {};
const CHART_CACHE_TTL_MS = 60000;

export async function getXrpChartData(timeframe = '1') {
  const now = Date.now();
  if (chartCache[timeframe] && (now - chartCache[timeframe].ts) < CHART_CACHE_TTL_MS) {
    return chartCache[timeframe].data;
  }
  const days = timeframe === '7' ? '7' : timeframe === '30' ? '30' : '1';
  const url = `https://api.coingecko.com/api/v3/coins/ripple/market_chart?vs_currency=usd&days=${days}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch Chart Data: ${resp.status}`);
  }
  const data = await resp.json();
  const chartData = { prices: data.prices };
  chartCache[timeframe] = {
    data: chartData,
    ts: now
  };
  return chartData;
}
