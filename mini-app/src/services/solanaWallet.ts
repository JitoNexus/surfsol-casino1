import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

const RPC_URL = 'https://api.mainnet-beta.solana.com';
const HOUSE_WALLET = 'GTZkkfszq8sLsqsdWNfjuMyAuvsiGT3yyftaPtWUJRsc';

interface WalletData {
  publicKey: string;
  secretKey: string;
}

export function generateRealWallet(): WalletData {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: bs58.encode(keypair.secretKey),
  };
}

export function restoreWallet(secretKeyBase58: string): WalletData | null {
  try {
    const secretKey = bs58.decode(secretKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);
    return {
      publicKey: keypair.publicKey.toBase58(),
      secretKey: secretKeyBase58,
    };
  } catch {
    return null;
  }
}

export async function getWalletBalance(publicKey: string): Promise<number> {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const pubkey = new PublicKey(publicKey);
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Failed to get balance:', error);
    return 0;
  }
}

export async function sendToHouseWallet(
  secretKeyBase58: string,
  amountSOL: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const secretKey = bs58.decode(secretKeyBase58);
    const fromKeypair = Keypair.fromSecretKey(secretKey);
    const toPublicKey = new PublicKey(HOUSE_WALLET);

    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;

    const signature = await connection.sendTransaction(transaction, [fromKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');

    return { success: true, signature };
  } catch (error: any) {
    console.error('Transfer failed:', error);
    return { success: false, error: error.message || 'Transfer failed' };
  }
}

export async function sendSOL(
  secretKeyBase58: string,
  toAddress: string,
  amountSOL: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const secretKey = bs58.decode(secretKeyBase58);
    const fromKeypair = Keypair.fromSecretKey(secretKey);
    const toPublicKey = new PublicKey(toAddress);

    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;

    const signature = await connection.sendTransaction(transaction, [fromKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');

    return { success: true, signature };
  } catch (error: any) {
    console.error('Transfer failed:', error);
    return { success: false, error: error.message || 'Transfer failed' };
  }
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export { HOUSE_WALLET };
