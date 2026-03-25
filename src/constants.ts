export const AUTO_LOADED_PROGRAMS = new Set([
  '11111111111111111111111111111111',              // System Program
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',  // Token Program
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',  // Token Extensions (Token-2022)
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',  // Associated Token Program
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',   // Memo Program
  'ComputeBudget111111111111111111111111111111',     // Compute Budget Program
  'AddressLookupTab1e1111111111111111111111111',     // Address Lookup Table Program
]);

export const FILE_EXTENSIONS = {
  ACCOUNT: '.json',
  PROGRAM: '.so',
  CONFIG: '.json',
} as const;

export const DEFAULT_BATCH_SIZE = 100;

export const DEFAULT_TIMEOUT = 2 * 60 * 1_000;

export const SOLANA_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const DEFAULT_PATHS = {
  ARTIFACTS: 'artifacts',
  ACCOUNTS: 'artifacts/accounts',
  PROGRAMS: 'artifacts/programs',
  TEMP: 'artifacts/temp/accounts',
} as const;
