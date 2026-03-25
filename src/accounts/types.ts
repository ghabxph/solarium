import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface AccountData {
  pubkey: string;
  account: {
    lamports: number;
    data: number[];
    owner: string;
    executable: boolean;
    rentEpoch: number;
  };
}

export enum TokenType {
  ATA = 'ATA',
  Token2022 = 'Token2022',
}

export interface PreCreateAccount {
  mint: PublicKey;
  owner: PublicKey;
  type: TokenType;
  balance: BN;
}
