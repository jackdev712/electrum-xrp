import {
  Client,
  xrpToDrops,
  dropsToXrp,
  Wallet,
  verify as xrplVerify
} from 'xrpl';

function safeLog(onLog, prefix, msg) {
  if (typeof onLog === 'function') {
    onLog(`[${prefix}] ${msg}`);
  }
}

export async function getTrustLines(serverUrl, address, onLog) {
  safeLog(onLog, 'getTrustLines', `Connecting to ${serverUrl}, address=${address}`);
  const client = new Client(serverUrl);
  await client.connect();
  safeLog(onLog, 'getTrustLines', 'Connected, requesting account_lines...');
  try {
    const resp = await client.request({
      command: 'account_lines',
      account: address
    });
    const lines = resp.result.lines || [];
    safeLog(onLog, 'getTrustLines', `Got ${lines.length} lines`);
    return lines;
  } finally {
    safeLog(onLog, 'getTrustLines', 'Disconnecting...');
    await client.disconnect();
    safeLog(onLog, 'getTrustLines', 'Disconnected');
  }
}

export async function setTrustLine({
  serverUrl,
  seed,
  currency,
  issuer,
  limit,
  memos = [],
  noRipple,
  freeze,
  authorized,
  qualityIn,
  qualityOut,
  onLog
}) {
  function log(msg) {
    safeLog(onLog, 'setTrustLine', msg);
  }
  log('=== Manual TrustSet TX start ===');
  log(`Params: currency=${currency}, issuer=${issuer}, limit=${limit}, noRipple=${noRipple}, freeze=${freeze}, authorized=${authorized}`);

  const client = new Client(serverUrl);
  await client.connect();
  log(`Connected to ${serverUrl}`);

  try {
    const wallet = Wallet.fromSeed(seed);
    log(`Wallet address = ${wallet.classicAddress}`);

    log('Requesting recommended fee (fee command)...');
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
      account: wallet.classicAddress,
      ledger_index: 'current'
    });
    const seq = acctInfoResp.result?.account_data?.Sequence;
    if (!seq) {
      throw new Error('Unable to get Sequence from account_info');
    }
    log(`Sequence = ${seq}`);

    const lastLedger = currentLedger + 2000;
    const trustSetTx = {
      TransactionType: 'TrustSet',
      Account: wallet.classicAddress,
      Fee: recommendedDrops.toString(),
      Sequence: seq,
      LastLedgerSequence: lastLedger,
      LimitAmount: {
        currency,
        issuer,
        value: limit
      }
    };

    if (memos.length > 0) {
      trustSetTx.Memos = memos.map(m => {
        const memoHex = Buffer.from(m.trim(), 'utf8').toString('hex');
        return { Memo: { MemoData: memoHex } };
      });
    }

    if (typeof qualityIn === 'number' && qualityIn >= 0) {
      trustSetTx.QualityIn = qualityIn;
      log(`QualityIn=${qualityIn}`);
    }
    if (typeof qualityOut === 'number' && qualityOut >= 0) {
      trustSetTx.QualityOut = qualityOut;
      log(`QualityOut=${qualityOut}`);
    }

    let flags = 0;

    if (typeof noRipple === 'boolean') {
      if (noRipple) {
        flags |= 0x00040000;
        log('Applying tfSetNoRipple');
      } else {
        flags |= 0x00080000;
        log('Applying tfClearNoRipple');
      }
    }

    if (wallet.classicAddress === issuer) {
      if (typeof freeze === 'boolean') {
        if (freeze) {
          flags |= 0x00200000;
          log('Applying tfSetFreeze');
        } else {
          flags |= 0x00400000;
          log('Applying tfClearFreeze');
        }
      }
    } else {
      log('Not the issuer => ignore freeze flags');
    }

    if (authorized === true) {
      flags |= 0x00100000;
      log('Applying tfSetfAuth');
    }

    if (flags !== 0) {
      trustSetTx.Flags = flags;
    }

    log(`TrustSet TX to sign: ${JSON.stringify(trustSetTx, null, 2)}`);

    const signed = wallet.sign(trustSetTx);
    log(`Signed TX hash: ${signed.hash}`);
    log(`Signed tx_blob length: ${signed.tx_blob.length} chars`);

    log('Submitting trustSet transaction (client.submit) ...');
    const submitResp = await client.submit(signed.tx_blob);
    log(`submitResp: ${JSON.stringify(submitResp, null, 2)}`);

    const txHash = signed.hash;
    let finalResult = null;
    const pollCountMax = 20;
    for (let i = 1; i <= pollCountMax; i++) {
      log(`Polling #${i} for tx: ${txHash}`);
      await new Promise(res => setTimeout(res, 3000));

      try {
        const txInfoResp = await client.request({
          command: 'tx',
          transaction: txHash
        });
        if (txInfoResp && txInfoResp.result) {
          const validated = txInfoResp.result.validated;
          const resultCode = txInfoResp.result.meta?.TransactionResult;
          log(`tx validated=${validated}, result=${resultCode}`);
          if (validated) {
            finalResult = txInfoResp.result;
            break;
          }
        } else {
          log('No tx result yet');
        }
      } catch (pollErr) {
        log(`Poll error: ${pollErr.message}`);
      }
    }

    if (!finalResult) {
      log('Not validated after 20 polls => maybe still pending...');
      return { error: 'PENDING', message: 'Not validated in 20 polls' };
    }

    return finalResult;

  } catch (err) {
    log(`setTrustLine error: ${err.message}`);
    throw err;
  } finally {
    log('Disconnecting from XRPL node...');
    await client.disconnect();
    log('Disconnected');
    log('=== Manual TrustSet TX end ===');
  }
}

export async function deleteTrustLine({
  serverUrl,
  seed,
  currency,
  issuer,
  onLog
}) {
  safeLog(onLog, 'deleteTrustLine', `limit=0, currency=${currency}, issuer=${issuer}`);
  return await setTrustLine({
    serverUrl,
    seed,
    currency,
    issuer,
    limit: '0',
    onLog
  });
}

export async function createEscrow({
  serverUrl,
  seed,
  amountXrp,
  finishAfterUnixTime,
  conditionHex,
  onLog
}) {
  function log(msg) {
    safeLog(onLog, 'createEscrow', msg);
  }
  log(`Start createEscrow. amountXrp=${amountXrp}, finishAfter=${finishAfterUnixTime}`);

  const client = new Client(serverUrl);
  await client.connect();
  log('Connected.');

  try {
    const wallet = Wallet.fromSeed(seed);
    log(`Wallet=${wallet.classicAddress}`);

    const escrowCreate = {
      TransactionType: 'EscrowCreate',
      Account: wallet.classicAddress,
      Amount: xrpToDrops(amountXrp),
      FinishAfter: finishAfterUnixTime
    };

    if (conditionHex) {
      escrowCreate.Condition = conditionHex;
    }

    log('Construct TX (before autofill): ' + JSON.stringify(escrowCreate, null, 2));
    const prepared = await client.autofill(escrowCreate, {
      maxLedgerVersionOffset: 200
    });
    log('Prepared TX: ' + JSON.stringify(prepared, null, 2));
    const signed = wallet.sign(prepared);
    log(`Signed TX hash=${signed.hash}`);

    const result = await client.submitAndWait(signed.tx_blob);
    log('submitAndWait result=' + JSON.stringify(result, null, 2));
    return result;
  } finally {
    log('Disconnecting...');
    await client.disconnect();
    log('Disconnected.');
  }
}

export async function finishEscrow({
  serverUrl,
  seed,
  owner,
  escrowSequence,
  conditionHex,
  fulfillmentHex,
  onLog
}) {
  function log(msg) {
    safeLog(onLog, 'finishEscrow', msg);
  }
  log(`Start finishEscrow. owner=${owner}, sequence=${escrowSequence}`);

  const client = new Client(serverUrl);
  await client.connect();
  log('Connected.');

  try {
    const wallet = Wallet.fromSeed(seed);
    log(`Wallet=${wallet.classicAddress}`);

    const escrowFinishTx = {
      TransactionType: 'EscrowFinish',
      Account: wallet.classicAddress,
      Owner: owner,
      OfferSequence: escrowSequence
    };
    if (conditionHex) {
      escrowFinishTx.Condition = conditionHex;
    }
    if (fulfillmentHex) {
      escrowFinishTx.Fulfillment = fulfillmentHex;
    }

    log('Construct TX (before autofill): ' + JSON.stringify(escrowFinishTx, null, 2));
    const prepared = await client.autofill(escrowFinishTx, {
      maxLedgerVersionOffset: 200
    });
    log('Prepared TX: ' + JSON.stringify(prepared, null, 2));

    const signed = wallet.sign(prepared);
    log(`Signed TX hash=${signed.hash}`);
    const result = await client.submitAndWait(signed.tx_blob);
    log('submitAndWait result=' + JSON.stringify(result, null, 2));
    return result;
  } finally {
    log('Disconnecting...');
    await client.disconnect();
    log('Disconnected.');
  }
}

export async function createPaymentChannel({
  serverUrl,
  seed,
  destination,
  amountXrp,
  settleDelay,
  publicKeyHex,
  onLog
}) {
  function log(msg) {
    safeLog(onLog, 'createPaymentChannel', msg);
  }
  log(`Start. destination=${destination}, amountXrp=${amountXrp}`);

  const client = new Client(serverUrl);
  await client.connect();
  log('Connected.');

  try {
    const wallet = Wallet.fromSeed(seed);
    log(`Wallet=${wallet.classicAddress}`);

    const chanCreate = {
      TransactionType: 'PaymentChannelCreate',
      Account: wallet.classicAddress,
      Amount: xrpToDrops(amountXrp),
      Destination: destination,
      SettleDelay: settleDelay,
      PublicKey: publicKeyHex
    };

    log('Constructing TX (before autofill): ' + JSON.stringify(chanCreate, null, 2));
    const prepared = await client.autofill(chanCreate, {
      maxLedgerVersionOffset: 200
    });
    log('Prepared TX: ' + JSON.stringify(prepared, null, 2));

    const signed = wallet.sign(prepared);
    log(`Signed hash=${signed.hash}`);
    const result = await client.submitAndWait(signed.tx_blob);
    log('Result=' + JSON.stringify(result, null, 2));
    return result;
  } finally {
    log('Disconnecting...');
    await client.disconnect();
    log('Disconnected.');
  }
}

export async function fundPaymentChannel({
  serverUrl,
  seed,
  channelId,
  amountXrp,
  onLog
}) {
  function log(msg) {
    safeLog(onLog, 'fundPaymentChannel', msg);
  }
  log(`Start. channelId=${channelId}, amountXrp=${amountXrp}`);

  const client = new Client(serverUrl);
  await client.connect();
  log('Connected.');

  try {
    const wallet = Wallet.fromSeed(seed);
    log(`Wallet=${wallet.classicAddress}`);

    const chanFund = {
      TransactionType: 'PaymentChannelFund',
      Account: wallet.classicAddress,
      Channel: channelId,
      Amount: xrpToDrops(amountXrp)
    };

    log('Constructing TX: ' + JSON.stringify(chanFund, null, 2));
    const prepared = await client.autofill(chanFund, {
      maxLedgerVersionOffset: 200
    });
    log('Prepared: ' + JSON.stringify(prepared, null, 2));

    const signed = wallet.sign(prepared);
    log(`Signed hash=${signed.hash}`);
    const result = await client.submitAndWait(signed.tx_blob);
    log('Result=' + JSON.stringify(result, null, 2));
    return result;
  } finally {
    log('Disconnecting...');
    await client.disconnect();
    log('Disconnected.');
  }
}

export async function setAccountOptions({
  serverUrl,
  seed,
  domain,
  requireDestTag = false,
  disallowXRP = false,
  transferRate = 0,
  onLog
}) {
  function log(msg) {
    safeLog(onLog, 'setAccountOptions', msg);
  }
  log(`Start. domain=${domain}, requireDestTag=${requireDestTag}, disallowXRP=${disallowXRP}, rate=${transferRate}`);

  const client = new Client(serverUrl);
  await client.connect();
  log('Connected.');

  try {
    const wallet = Wallet.fromSeed(seed);
    log(`Wallet=${wallet.classicAddress}`);

    const accSetTx = {
      TransactionType: 'AccountSet',
      Account: wallet.classicAddress
    };

    if (domain) {
      accSetTx.Domain = Buffer.from(domain, 'utf8').toString('hex');
      log(`Domain hex set`);
    }

    let setFlag;
    let clearFlag;
    if (requireDestTag) {
      setFlag = 1;
    } else {
      clearFlag = 1;
    }
    if (disallowXRP) {
      setFlag = 3;
    }

    accSetTx.SetFlag = setFlag;
    accSetTx.ClearFlag = clearFlag;

    if (transferRate > 0) {
      accSetTx.TransferRate = Math.floor(1000000000 * (1 + transferRate));
    }

    log('Before autofill=' + JSON.stringify(accSetTx, null, 2));
    const prepared = await client.autofill(accSetTx, {
      maxLedgerVersionOffset: 200
    });
    log('Prepared=' + JSON.stringify(prepared, null, 2));

    const signed = wallet.sign(prepared);
    log(`Signed hash=${signed.hash}`);

    const result = await client.submitAndWait(signed.tx_blob);
    log('Result=' + JSON.stringify(result, null, 2));
    return result;
  } finally {
    log('Disconnecting...');
    await client.disconnect();
    log('Disconnected.');
  }
}

export async function setRegularKey({
  serverUrl,
  seed,
  regularKey,
  onLog
}) {
  function log(msg) {
    safeLog(onLog, 'setRegularKey', msg);
  }
  log(`Start. regularKey=${regularKey}`);

  const client = new Client(serverUrl);
  await client.connect();
  log('Connected.');

  try {
    const wallet = Wallet.fromSeed(seed);
    log(`Wallet=${wallet.classicAddress}`);

    const setKeyTx = {
      TransactionType: 'SetRegularKey',
      Account: wallet.classicAddress,
      RegularKey: regularKey
    };

    log('Before autofill=' + JSON.stringify(setKeyTx, null, 2));
    const prepared = await client.autofill(setKeyTx, {
      maxLedgerVersionOffset: 200
    });
    log('Prepared=' + JSON.stringify(prepared, null, 2));

    const signed = wallet.sign(prepared);
    log(`Signed hash=${signed.hash}`);

    const result = await client.submitAndWait(signed.tx_blob);
    log('Result=' + JSON.stringify(result, null, 2));
    return result;
  } finally {
    log('Disconnecting...');
    await client.disconnect();
    log('Disconnected.');
  }
}

export async function clearRegularKey({
  serverUrl,
  seed,
  onLog
}) {
  safeLog(onLog, 'clearRegularKey', 'Clearing regular key => empty');
  return await setRegularKey({
    serverUrl,
    seed,
    regularKey: '',
    onLog
  });
}

export async function setSignerList({
  serverUrl,
  seed,
  signerQuorum,
  signers,
  onLog
}) {
  function log(msg) {
    safeLog(onLog, 'setSignerList', msg);
  }
  log(`Start. signerQuorum=${signerQuorum}, signers count=${signers.length}`);

  const client = new Client(serverUrl);
  await client.connect();
  log('Connected.');

  try {
    const wallet = Wallet.fromSeed(seed);
    log(`Wallet=${wallet.classicAddress}`);

    const SignerEntries = signers.map((s) => ({
      SignerEntry: {
        Account: s.address,
        SignerWeight: s.weight
      }
    }));

    const signerListTx = {
      TransactionType: 'SignerListSet',
      Account: wallet.classicAddress,
      SignerQuorum: signerQuorum,
      SignerEntries
    };

    log('Before autofill=' + JSON.stringify(signerListTx, null, 2));
    const prepared = await client.autofill(signerListTx, {
      maxLedgerVersionOffset: 200
    });
    log('Prepared=' + JSON.stringify(prepared, null, 2));

    const signed = wallet.sign(prepared);
    log(`Signed hash=${signed.hash}`);

    const result = await client.submitAndWait(signed.tx_blob);
    log('Result=' + JSON.stringify(result, null, 2));
    return result;
  } finally {
    log('Disconnecting...');
    await client.disconnect();
    log('Disconnected.');
  }
}

export function signMessageOffline(seed, message) {
  const w = Wallet.fromSeed(seed);
  const signature = w.signMessage(message);
  return { signature, publicKey: w.publicKey };
}

export function verifyMessageOffline(message, signature, publicKeyBase58) {
  return xrplVerify(message, signature, publicKeyBase58);
}
