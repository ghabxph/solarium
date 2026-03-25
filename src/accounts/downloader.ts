import * as fs from 'fs';
import * as path from 'path';
import { Connection, PublicKey } from '@solana/web3.js';
import { AccountData } from './types';
import { DEFAULT_BATCH_SIZE } from '../constants';

export interface DownloaderConfig {
  rpcUrl: string;
  batchSize?: number;
}

export class AccountDownloader {
  private connection: Connection;
  private batchSize: number;

  constructor(config: DownloaderConfig) {
    this.connection = new Connection(config.rpcUrl);
    this.batchSize = config.batchSize || DEFAULT_BATCH_SIZE;
  }

  async download(workspaceDir: string, pubkeys: PublicKey[]): Promise<void> {
    fs.mkdirSync(workspaceDir, { recursive: true });

    for (let i = 0; i < pubkeys.length; i += this.batchSize) {
      const batch = pubkeys.slice(i, i + this.batchSize);
      const accounts = await this.connection.getMultipleAccountsInfo(batch);

      for (let j = 0; j < batch.length; j++) {
        const account = accounts[j];
        if (!account) continue;

        const data: AccountData = {
          pubkey: batch[j].toBase58(),
          account: {
            lamports: account.lamports,
            data: Array.from(account.data),
            owner: account.owner.toBase58(),
            executable: account.executable,
            rentEpoch: account.rentEpoch ?? 0,
          },
        };

        const filePath = path.join(workspaceDir, `${batch[j].toBase58()}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data));
      }
    }
  }

  async downloadSingle(workspaceDir: string, pubkey: PublicKey): Promise<boolean> {
    fs.mkdirSync(workspaceDir, { recursive: true });
    const account = await this.connection.getAccountInfo(pubkey);
    if (!account) return false;

    const data: AccountData = {
      pubkey: pubkey.toBase58(),
      account: {
        lamports: account.lamports,
        data: Array.from(account.data),
        owner: account.owner.toBase58(),
        executable: account.executable,
        rentEpoch: account.rentEpoch ?? 0,
      },
    };

    const filePath = path.join(workspaceDir, `${pubkey.toBase58()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data));
    return true;
  }
}
