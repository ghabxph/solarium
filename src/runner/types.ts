import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { ConnectionMock } from '../workspace/connection';
import { PreCreateAccount } from '../accounts/types';

export interface SourceRef {
  category: string;
  module: string;
  scenario: number;
}

export interface TxCallbackContext {
  txIndex: number;
  totalTxs: number;
  instructions: TransactionInstruction[];
  allTransactions: TransactionInstruction[][];
}

export type KeypairsCallback = (ctx: TxCallbackContext) => Keypair[];

export type DownloadAccountsCallback = (ctx: TxCallbackContext) => PublicKey[] | undefined;

export interface AssertionsContext<TParams> {
  transactions: TransactionInstruction[][];
  scenario: TParams;
  workspace: string;
  connection: ConnectionMock;
}

export type AssertionsCallback<TParams> = (ctx: AssertionsContext<TParams>) => void | Promise<void>;

export interface DynamicPreCreateContext {
  instructions: TransactionInstruction[];
  connection: ConnectionMock;
  workspace: string;
}

export type DynamicPreCreateAccountsCallback = (ctx: DynamicPreCreateContext) => Promise<PreCreateAccount[]>;

export interface TxGeneratorResult {
  status: number;
  data: {
    transactions: TransactionInstruction[][];
    message?: string;
  };
}

export interface Scenario<TParams = Record<string, unknown>> {
  description: string;
  source?: SourceRef;
  params: TParams;
  signers?: Keypair[];
  preCreateAccounts?: PreCreateAccount[];
  deleteAccounts?: PublicKey[];
  dynamicPreCreateAccounts?: DynamicPreCreateAccountsCallback;
  expectedGenerationError?: RegExp;
  expectedSimulationError?: RegExp;
}

export interface TestConfig<TParams> {
  category: string;
  module: string;
  description: string;
  scenarios: Scenario<TParams>[];
  txGenerator: (params: {
    connection: ConnectionMock;
    scenario: TParams;
    workspace: string;
  }) => Promise<TxGeneratorResult>;
  signers?: Keypair[] | KeypairsCallback;
  downloadAccounts?: DownloadAccountsCallback;
  airdropAddresses?: PublicKey[];
  timeout?: number;
  routeWorkspaceToTemp?: boolean;
  skipExecution?: boolean;
  programs: Record<string, string>;
  inBetweenTxAssertions?: AssertionsCallback<TParams>;
  assertions?: AssertionsCallback<TParams>;
}
