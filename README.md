# Solarium

**Hermetic, idempotent testing framework for Solana smart contracts.**

Solarium eliminates the pain of testing Solana programs by giving you isolated workspaces, mock accounts, and a declarative test runner — so your tests are fast, reproducible, and never touch the live chain.

## Why Solarium?

- **Hermetic by design** — Each test runs in an isolated workspace. No shared state, no flaky tests.
- **Declarative test configuration** — Define scenarios with accounts, signers, and expected outcomes in a single config object.
- **Built-in account mocking** — Create synthetic token accounts and mints (SPL Token & Token-2022) without an RPC connection.
- **Live account downloading** — Fetch real account data from any Solana RPC endpoint for realistic integration tests.
- **Multi-scenario support** — Chain multiple transaction scenarios in one test, with assertions between each step.
- **Zero boilerplate** — `runTest()` handles workspace setup, account creation, transaction execution, and cleanup.

## Installation

```bash
npm install solarium
```

## Quick Start

```typescript
import {
  runTest,
  wrapSingleIx,
  TokenType,
} from "solarium";
import { Keypair, SystemProgram, PublicKey } from "@solana/web3.js";

const payer = Keypair.generate();

await runTest({
  testConfig: {
    routeWorkspaceToTemp: true, // protect your repo artifacts
    scenarios: [
      {
        name: "Transfer SOL",
        signers: [payer],
        airdropSol: { [payer.publicKey.toBase58()]: 10 },
        expectedError: null, // expect success
      },
    ],
  },
  workspacePath: "./test-workspace",
  txGenerator: async (scenario, workspace) => {
    const receiver = Keypair.generate();
    return wrapSingleIx(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: receiver.publicKey,
        lamports: 1_000_000_000,
      })
    );
  },
});
```

## Core Concepts

### `routeWorkspaceToTemp` — Protecting Your Codebase Artifacts

This is the most important flag in Solarium. When enabled, the test runner copies your entire workspace to a temporary directory before execution. All mutations (account state changes, program outputs) happen in the temp copy — **your committed artifacts are never touched**.

Without it, the Solana test runtime writes directly into your workspace, modifying the account JSON files you carefully downloaded and committed. This contaminates your repo with post-execution state and breaks idempotency.

```typescript
await runTest({
  testConfig: {
    routeWorkspaceToTemp: true, // always recommended
    scenarios: [/* ... */],
  },
  // ...
});
```

**The recommended workflow:**

1. Download mainnet accounts with `AccountDownloader` into your workspace
2. Commit those account artifacts to your repo (they're your test fixtures)
3. Set `routeWorkspaceToTemp: true` so tests run against a temp copy
4. Tests are hermetic and idempotent — run them 1000 times, same result

### Workspace Structure

Every test workspace follows a standard layout. Accounts and programs are stored as JSON/SO files, and `routeWorkspaceToTemp` ensures they stay clean across runs.

```typescript
import { WorkspaceManager, buildWorkspace } from "solarium";

const workspace = buildWorkspace("./my-workspace");
const manager = new WorkspaceManager(workspace);
```

### Account Mocking with TokenHacker

Create token accounts and mints without touching the chain:

```typescript
import { TokenHacker, TokenType } from "solarium";

// Create a synthetic SPL token mint
TokenHacker.createMint({
  mintAddress: mintPubkey,
  decimals: 6,
  supply: 1_000_000n,
  mintAuthority: authorityPubkey,
  outputDir: workspace.accountsDir,
});

// Create a synthetic token account
TokenHacker.createTokenAccount({
  address: ataPubkey,
  mint: mintPubkey,
  owner: walletPubkey,
  amount: 500_000n,
  tokenType: TokenType.ATA,
  outputDir: workspace.accountsDir,
});
```

### Live Account Downloading

Pull real on-chain accounts and commit them as test fixtures. These become your source-of-truth artifacts — `routeWorkspaceToTemp` ensures tests never overwrite them.

```typescript
import { AccountDownloader } from "solarium";

const downloader = new AccountDownloader("https://api.mainnet-beta.solana.com");
await downloader.download({
  accounts: [new PublicKey("So11111111111111111111111111111111111111112")],
  outputDir: "./test-workspace/accounts",
});

// Now commit these to your repo:
//   git add test-workspace/accounts/
//   git commit -m "Add mainnet account fixtures"
```

### Connection Mock

Use `ConnectionMock` to resolve accounts from your workspace's file system instead of making RPC calls:

```typescript
import { ConnectionMock } from "solarium";

const connection = new ConnectionMock("./test-workspace/accounts");
const accountInfo = await connection.getAccountInfo(publicKey);
```

### Multi-Scenario Tests

Chain dependent scenarios with shared account state:

```typescript
await runTest({
  testConfig: {
    routeWorkspaceToTemp: true,
    scenarios: [
      {
        name: "Initialize",
        signers: [authority],
        airdropSol: { [authority.publicKey.toBase58()]: 10 },
        expectedError: null,
      },
      {
        name: "Update",
        signers: [authority],
        // Reference accounts created in a previous scenario
        accountSources: { "ProgramState": { scenario: 0 } },
        expectedError: null,
      },
    ],
  },
  workspacePath: "./test-workspace",
  txGenerator: async (scenario, workspace) => {
    // Generate transactions based on scenario index
    // ...
  },
  customAssertions: async (scenarioIndex, workspace) => {
    // Assert on workspace state after each scenario
  },
});
```

## API Reference

### `runTest(options: RunTestOptions)`

The main entry point. Orchestrates the full test lifecycle:

1. Isolate workspace (copy to temp directory)
2. Pre-create accounts (static)
3. Generate transactions via your callback
4. Validate responses
5. Pre-create accounts (dynamic, based on generated instructions)
6. Execute transactions with optional in-between assertions
7. Run final custom assertions
8. Clean up

### Helper Functions

| Function | Description |
|---|---|
| `wrapSingleIx(instruction)` | Wrap a single instruction into a test result |
| `wrapSingleTx(transaction)` | Wrap a single transaction into a test result |
| `wrapMultiTx(transactions)` | Wrap multiple transactions into a test result |
| `wrapError(error)` | Wrap an expected error result |

### Key Types

| Type | Description |
|---|---|
| `TestConfig` | Top-level test configuration with scenarios |
| `Scenario` | A single test scenario (signers, accounts, expected errors) |
| `TxGeneratorResult` | Return type from your transaction generator callback |
| `PreCreateAccount` | Account to synthetically create before execution |
| `SourceRef` | Reference to an account from a previous scenario |

## Auto-Loaded Programs

Solarium automatically loads these programs — no need to include them in your workspace:

- System Program
- Token Program (SPL)
- Token-2022 Program (Token Extensions)
- Associated Token Program
- Memo Program
- Compute Budget Program
- Address Lookup Table Program

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Run tests
npm test

# Lint
npm run lint
npm run lint:fix
```

## License

MIT
