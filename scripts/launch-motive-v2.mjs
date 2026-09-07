#!/usr/bin/env node
/**
 * MOTIVE — Pons V2-compatible launcher for Robinhood Chain 4663.
 *
 * This calls the verified Pons V2 launch contracts with MOTIVE metadata.
 * It does NOT deploy a new factory. The factory/curve protocol already lives
 * on Robinhood Chain; this script launches a MOTIVE token through it.
 *
 * Safe default: dry-run only. Mainnet write requires --send explicitly.
 *
 * Examples:
 *   node scripts/launch-motive-v2.mjs --dry \
 *     --name "Motive Signal" --symbol SGNL
 *
 *   node scripts/launch-motive-v2.mjs --send \
 *     --name "Motive Signal" --symbol SGNL \
 *     --logo "ipfs://..." --desc "A market for better signals" \
 *     --buy 0.125 --tax 0
 *
 * Key source:
 *   PK=0x... environment variable, or ./pk.txt (first non-comment line)
 *   Never print or commit the private key.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  http,
  keccak256,
  maxUint256,
  parseAbi,
  parseEther,
  zeroAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const HERE = dirname(fileURLToPath(import.meta.url));
const RPC = 'https://rpc.mainnet.chain.robinhood.com';
const CHAIN_ID = 4663;
const CHAIN = { id: CHAIN_ID, name: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };

// Verified Pons V2 addresses.
const PONS_V2_FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';
const PONS_V2_LAUNCH_AND_BUY = '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948';
const ZERO_BYTES32 = `0x${'00'.repeat(32)}`;

const ABI = parseAbi([
  'function launchFee() view returns (uint256)',
  'function launchConfigCount() view returns (uint256)',
  'function launchEnabled() view returns (bool)',
  'function canLaunch(address) view returns (bool)',
  'function previewLaunchEconomics(uint256,address) view returns (bytes32)',
  'function launchToken((string name,string symbol,string logo,string description,(string twitter,string telegram,string discord,string website,string farcaster) socials,address creatorFeeRecipient,uint16 creatorTaxBps,bool buybackEnabled,bytes32 expectedEconomics,bytes32 salt) params,uint256 launchConfigId,address pairToken,address[] snipeTaxExemptions) payable returns (address token,address curve)',
  'function launchAndBuy((string name,string symbol,string logo,string description,(string twitter,string telegram,string discord,string website,string farcaster) socials,address creatorFeeRecipient,uint16 creatorTaxBps,bool buybackEnabled,bytes32 expectedEconomics,bytes32 salt) params,uint256 launchConfigId,address pairToken,uint256 quoteIn,uint256 minTokensOut,address recipient,address[] snipeTaxExemptions) payable returns (address token,address curve,uint256 tokensOut)',
]);

const args = process.argv.slice(2);
const has = (name) => args.includes(name);
function value(name, fallback = '') {
  const i = args.findIndex((x) => x === name || x.startsWith(`${name}=`));
  if (i < 0) return fallback;
  if (args[i].includes('=')) return args[i].slice(name.length + 1);
  return args[i + 1] ?? fallback;
}
function number(name, fallback) {
  const n = Number(value(name, String(fallback)));
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid ${name}`);
  return n;
}
function readPrivateKey() {
  if (process.env.PK?.trim()) return process.env.PK.trim();
  const file = resolve(HERE, 'pk.txt');
  if (!existsSync(file)) return null;
  return readFileSync(file, 'utf8').split('\n').map((x) => x.trim()).find((x) => x && !x.startsWith('#')) || null;
}
function randomSalt() {
  const seed = `${Date.now()}:${process.pid}:${Math.random()}`;
  return keccak256(new TextEncoder().encode(seed));
}
function cleanText(x, max) {
  return String(x || '').trim().slice(0, max);
}

const isSend = has('--send');
const isDry = !isSend || has('--dry');
const name = cleanText(value('--name', 'Motive Token'), 32);
const symbol = cleanText(value('--symbol', 'MOTV'), 12).toUpperCase();
const logo = cleanText(value('--logo', ''), 512);
const description = cleanText(value('--desc', 'A community token launched through MOTIVE.'), 280);
const buyEth = number('--buy', 0);
const creatorTaxBps = Math.round(number('--tax-bps', number('--tax', 0) * 100));
const configId = BigInt(value('--config-id', '0'));
const minTokensOut = BigInt(value('--min-tokens-out', '0'));
const salt = value('--salt', randomSalt());
const socials = {
  twitter: cleanText(value('--twitter', ''), 256),
  telegram: cleanText(value('--telegram', ''), 256),
  discord: cleanText(value('--discord', ''), 256),
  website: cleanText(value('--website', ''), 256),
  farcaster: '',
};

if (!/^0x[0-9a-fA-F]{64}$/.test(salt)) throw new Error('--salt must be 32-byte hex');
if (creatorTaxBps > 1000) throw new Error('MOTIVE tax is capped at 10% (1000 bps)');
if (symbol.length < 1) throw new Error('--symbol is required');

const pk = readPrivateKey();
const account = pk ? privateKeyToAccount(pk) : null;
const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC, { timeout: 15000 }) });
const factory = { address: PONS_V2_FACTORY, abi: ABI };
const forwarder = { address: PONS_V2_LAUNCH_AND_BUY, abi: ABI };

const chainHex = await publicClient.getChainId();
if (chainHex !== CHAIN_ID) throw new Error(`Wrong chain: RPC returned ${chainHex}, expected ${CHAIN_ID}`);
const [launchFee, launchEnabled, configCount] = await Promise.all([
  publicClient.readContract({ ...factory, functionName: 'launchFee' }),
  publicClient.readContract({ ...factory, functionName: 'launchEnabled' }),
  publicClient.readContract({ ...factory, functionName: 'launchConfigCount' }),
]);
if (!launchEnabled) throw new Error('Pons factory launchEnabled=false');
if (configId >= configCount) throw new Error(`Invalid config id ${configId}; factory has ${configCount} configs`);

const sender = account?.address || '0x0000000000000000000000000000000000000001';
const allowed = await publicClient.readContract({ ...factory, functionName: 'canLaunch', args: [sender] }).catch(() => null);
const expectedEconomics = await publicClient.readContract({ ...factory, functionName: 'previewLaunchEconomics', args: [configId, zeroAddress] });
const quoteIn = parseEther(String(buyEth));
const totalValue = launchFee + quoteIn;
const params = {
  name,
  symbol,
  logo,
  description,
  socials,
  creatorFeeRecipient: account?.address || sender,
  creatorTaxBps,
  buybackEnabled: has('--buyback'),
  expectedEconomics,
  salt,
};

console.log('\nMOTIVE / PONS V2 LAUNCH');
console.log('────────────────────────────────────────');
console.log(`chain:       Robinhood Chain (${CHAIN_ID})`);
console.log(`factory:     ${PONS_V2_FACTORY}`);
console.log(`launcher:    ${PONS_V2_LAUNCH_AND_BUY}`);
console.log(`name:        ${name}`);
console.log(`symbol:      ${symbol}`);
console.log(`pair:        ETH (native; other pairings disabled for now)`);
console.log(`dev buy:     ${formatEther(quoteIn)} ETH`);
console.log(`launch fee:  ${formatEther(launchFee)} ETH`);
console.log(`total value: ${formatEther(totalValue)} ETH + gas`);
console.log(`creator tax: ${creatorTaxBps} bps (${creatorTaxBps / 100}%)`);
console.log(`sender:      ${account?.address || '(no key; dry-run metadata only)'}`);
console.log(`whitelisted: ${allowed === null ? 'not checked' : allowed}`);
console.log(`config id:   ${configId}`);
console.log(`salt:        ${salt}`);
console.log(`mode:        ${isDry ? 'DRY RUN' : 'SEND'}`);

if (!isDry && !account) throw new Error('No PK. Set PK or create scripts/pk.txt before --send');
if (!isDry && allowed !== true) throw new Error(`Sender is not whitelisted by Pons factory: ${account.address}`);

const functionName = quoteIn > 0n ? 'launchAndBuy' : 'launchToken';
const callArgs = quoteIn > 0n
  ? [params, configId, zeroAddress, quoteIn, minTokensOut, account?.address || sender, []]
  : [params, configId, zeroAddress, []];
const target = quoteIn > 0n ? PONS_V2_LAUNCH_AND_BUY : PONS_V2_FACTORY;
const data = encodeFunctionData({ abi: ABI, functionName, args: callArgs });

if (isDry) {
  console.log(`calldata bytes: ${(data.length - 2) / 2}`);
  console.log('No transaction sent. Use --send only after reviewing the values above.');
  process.exit(0);
}

const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC) });
const gas = await publicClient.estimateGas({ account: account.address, to: target, data, value: totalValue });
console.log(`gas estimate: ${gas}`);
const hash = await wallet.sendTransaction({ account, to: target, data, value: totalValue, gas: (gas * 120n) / 100n });
console.log(`tx: https://robinhoodchain.blockscout.com/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120000 });
console.log(`status: ${receipt.status} · block ${receipt.blockNumber}`);
if (receipt.status !== 'success') process.exitCode = 1;
