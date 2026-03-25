import * as fs from 'fs';
import * as path from 'path';
import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';

export interface ConnectionMockConfig {
  artifactsDir: string;
  rpcUrl?: string;
}

export class ConnectionMock {
  private artifactsDir: string;
  private workspace: string = '';
  private rpcUrl: string;
  private _connection: Connection | null = null;

  constructor(config: ConnectionMockConfig) {
    this.artifactsDir = config.artifactsDir;
    this.rpcUrl = config.rpcUrl || 'https://api.mainnet-beta.solana.com';
  }

  setWorkspace(workspace: string): void {
    this.workspace = workspace;
  }

  get connection(): Connection {
    if (!this._connection) {
      this._connection = new Connection(this.rpcUrl);
    }
    return this._connection;
  }

  private resolveAccountPath(pubkey: PublicKey): string {
    return path.join(this.artifactsDir, 'accounts', this.workspace, `${pubkey.toBase58()}.json`);
  }

  async getAccountInfo(pubkey: PublicKey): Promise<AccountInfo<Buffer> | null> {
    const filePath = this.resolveAccountPath(pubkey);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const accountInfo = content.account;
    return {
      lamports: accountInfo.lamports,
      data: Buffer.from(accountInfo.data),
      owner: new PublicKey(accountInfo.owner),
      executable: accountInfo.executable,
      rentEpoch: accountInfo.rentEpoch,
    };
  }

  async getMultipleAccountsInfo(
    pubkeys: PublicKey[],
  ): Promise<(AccountInfo<Buffer> | null)[]> {
    return Promise.all(pubkeys.map(pk => this.getAccountInfo(pk)));
  }

  getWorkspaceDir(): string {
    return path.join(this.artifactsDir, 'accounts', this.workspace);
  }
}
