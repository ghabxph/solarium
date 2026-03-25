import { TransactionInstruction } from '@solana/web3.js';
import { TxGeneratorResult } from './types';

export function wrapSingleIx(ix: TransactionInstruction): TxGeneratorResult {
  return { status: 200, data: { transactions: [[ix]] } };
}

export function wrapSingleTx(ixs: TransactionInstruction[]): TxGeneratorResult {
  return { status: 200, data: { transactions: [ixs] } };
}

export function wrapMultiTx(txs: TransactionInstruction[][]): TxGeneratorResult {
  return { status: 200, data: { transactions: txs } };
}

export function wrapError(status: number, message: string): TxGeneratorResult {
  return { status, data: { transactions: [], message } };
}
