import * as fs from 'fs';
import * as path from 'path';
import { PublicKey } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import BN from 'bn.js';
import { AccountData, TokenType } from './types';

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

export class TokenHacker {
  createTokenAccount(
    workspaceDir: string,
    mint: PublicKey,
    owner: PublicKey,
    tokenType: TokenType,
    balance: BN,
  ): PublicKey {
    const programId = tokenType === TokenType.Token2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const ata = getAssociatedTokenAddressSync(mint, owner, true, programId);

    const data = this.buildTokenAccountData(mint, owner, balance, programId);
    const accountData: AccountData = {
      pubkey: ata.toBase58(),
      account: {
        lamports: 2039280,
        data: Array.from(data),
        owner: programId.toBase58(),
        executable: false,
        rentEpoch: 0,
      },
    };

    fs.mkdirSync(workspaceDir, { recursive: true });
    const filePath = path.join(workspaceDir, `${ata.toBase58()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(accountData));
    return ata;
  }

  createMint(
    workspaceDir: string,
    mintPubkey: PublicKey,
    authority: PublicKey,
    decimals: number,
    supply: BN,
    tokenType: TokenType = TokenType.ATA,
  ): void {
    const programId = tokenType === TokenType.Token2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const data = this.buildMintData(authority, decimals, supply);

    const accountData: AccountData = {
      pubkey: mintPubkey.toBase58(),
      account: {
        lamports: 1461600,
        data: Array.from(data),
        owner: programId.toBase58(),
        executable: false,
        rentEpoch: 0,
      },
    };

    fs.mkdirSync(workspaceDir, { recursive: true });
    const filePath = path.join(workspaceDir, `${mintPubkey.toBase58()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(accountData));
  }

  private buildTokenAccountData(
    mint: PublicKey,
    owner: PublicKey,
    amount: BN,
    _programId: PublicKey,
  ): Buffer {
    // SPL Token account layout: 165 bytes
    // mint (32) | owner (32) | amount (u64, 8) | delegate_option (4) | delegate (32) |
    // state (1) | is_native_option (4) | is_native (u64, 8) | delegated_amount (u64, 8) |
    // close_authority_option (4) | close_authority (32)
    const buf = Buffer.alloc(165);
    mint.toBuffer().copy(buf, 0);
    owner.toBuffer().copy(buf, 32);
    buf.writeBigUInt64LE(BigInt(amount.toString()), 64);
    buf.writeUInt8(1, 108); // state = Initialized
    return buf;
  }

  private buildMintData(authority: PublicKey, decimals: number, supply: BN): Buffer {
    // SPL Mint layout: 82 bytes
    // mint_authority_option (4) | mint_authority (32) | supply (u64, 8) |
    // decimals (1) | is_initialized (1) | freeze_authority_option (4) | freeze_authority (32)
    const buf = Buffer.alloc(82);
    buf.writeUInt32LE(1, 0); // has mint authority
    authority.toBuffer().copy(buf, 4);
    buf.writeBigUInt64LE(BigInt(supply.toString()), 36);
    buf.writeUInt8(decimals, 44);
    buf.writeUInt8(1, 45); // is_initialized
    return buf;
  }
}
