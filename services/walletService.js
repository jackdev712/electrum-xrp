import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import { generateSeed, deriveKeypair, deriveAddress } from 'ripple-keypairs';
import * as bip39 from 'bip39';

export function generateDirectFamilySeed() {
  const seed = generateSeed();
  const kp = deriveKeypair(seed);
  const address = deriveAddress(kp.publicKey);
  return { seed, address };
}

export function generateMnemonicXrp() {
  const mnemonic = bip39.generateMnemonic(128);
  const seedBytes = bip39.mnemonicToSeedSync(mnemonic);
  const entropy16 = seedBytes.slice(0, 16);
  const seed = generateSeed({ entropy: entropy16 });
  const kp = deriveKeypair(seed);
  const address = deriveAddress(kp.publicKey);
  return { mnemonic, seed, address };
}

export function importFromFamilySeed(familySeed) {
  if (!familySeed.startsWith('s')) {
    throw new Error('Not a valid XRPL family seed');
  }
  const kp = deriveKeypair(familySeed);
  const address = deriveAddress(kp.publicKey);
  return { seed: familySeed, address };
}

export function importFromMnemonicXrp(mnemonic) {
  if (!mnemonic.includes(' ')) {
    throw new Error('Not a valid mnemonic (should contain multiple words)');
  }
  if (!bip39.validateMnemonic(mnemonic.trim())) {
    throw new Error('Invalid BIP39 mnemonic');
  }
  const seedBytes = bip39.mnemonicToSeedSync(mnemonic.trim());
  const entropy16 = seedBytes.slice(0, 16);
  const seed = generateSeed({ entropy: entropy16 });
  const kp = deriveKeypair(seed);
  const address = deriveAddress(kp.publicKey);
  return { mnemonic: mnemonic.trim(), seed, address };
}

export async function getXrpBalance(serverUrl, address) {
  if (!serverUrl || !serverUrl.startsWith('ws')) {
    serverUrl = 'wss://s2.ripple.com';
  }
  const client = new Client(serverUrl);
  await client.connect();
  try {
    const resp = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    });
    const dropsStr = resp.result?.account_data?.Balance;
    if (!dropsStr) {
      throw new Error('Account not found');
    }
    const drops = parseInt(dropsStr, 10);
    return drops;
  } finally {
    await client.disconnect();
  }
}

export async function getXrpTransactions(serverUrl, address, limit = 10) {
  if (!serverUrl || !serverUrl.startsWith('ws')) {
    serverUrl = 'wss://s2.ripple.com';
  }
  const client = new Client(serverUrl);
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

export async function sendXrpTransaction(opts) {
  let { serverUrl, seed, fromAddress, toAddress, amountXrp } = opts;
  if (!serverUrl || !serverUrl.startsWith('ws')) {
    serverUrl = 'wss://s2.ripple.com';
  }
  const client = new Client(serverUrl);
  await client.connect();
  try {
    const w = Wallet.fromSeed(seed);
    if (w.classicAddress !== fromAddress) {
      throw new Error('Seed does not match fromAddress');
    }
    const prepared = await client.autofill(
      {
        TransactionType: 'Payment',
        Account: fromAddress,
        Amount: xrpToDrops(amountXrp),
        Destination: toAddress
      },
      {
        maxLedgerVersionOffset: 200
      }
    );
    const signed = w.sign(prepared);
    const tx = await client.submitAndWait(signed.tx_blob);
    return tx.result;
  } finally {
    await client.disconnect();
  }
}

export async function pingNetwork() {
  try {
    const client = new Client('wss://s2.ripple.com');
    await client.connect();
    await client.disconnect();
    return true;
  } catch {
    return false;
  }
}
