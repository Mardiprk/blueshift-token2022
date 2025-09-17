## Token-2022 Anchor Example

This project demonstrates creating and using a Token-2022 mint on Solana with Anchor. It covers:

- Creating a mint with the metadata pointer extension
- Creating associated token accounts (ATAs)
- Minting tokens
- Transferring tokens

The end-to-end flow is verified by the TypeScript tests in `tests/token2022.ts` and passes on localnet.

### Prerequisites

- Solana CLI (v1.18+ recommended)
- Rust toolchain (stable)
- Anchor (v0.30+)
- Node.js 18+ and Yarn

### Install

```bash
yarn install
```

### Build

```bash
anchor build
```

### Run tests (localnet)

The tests will spin up a local validator (via Anchor), build the program, and run the TypeScript suite.

```bash
anchor test
```

You should see output similar to:

```text
token2022
Create mint tx: 271c2w13dzYZ9q7wuZv7K32FRMF1VDx5KA4T9yHYskt4fPLzeqsMYbV4p2fbXkW8KQkC4DNcnwwk52gr1wWSSmyJ
    ✔ Creates a mint with metadata extension (408ms)
User 1 balance: 900
User 2 balance: 100
    ✔ Mints and transfers tokens (2082ms)


  2 passing (4s)
```

### What the tests do

- Create a new Token-2022 mint with 6 decimals and a metadata pointer
- Create ATAs for two users under the Token-2022 program
- Mint 1000 tokens to User 1
- Transfer 100 tokens from User 1 to User 2
- Assert balances: User 1 has 900, User 2 has 100

Test source: `tests/token2022.ts`

### Flow diagram

```mermaid
flowchart TD
  A[Create Mint (Token-2022)\nmetadata pointer set] --> B[Create ATA for User1]
  A --> C[Create ATA for User2]
  B --> D[Mint 1000 to User1 ATA]
  D --> E[Transfer 100 from User1 ATA to User2 ATA]
  E --> F[Assert balances:\nUser1 = 900, User2 = 100]
```

### Key files

- `programs/token2022/src/lib.rs`: Anchor program (CPI into Token-2022 for mint/transfer)
- `tests/token2022.ts`: TypeScript tests using Anchor client

### Useful commands

- Start a standalone local validator (optional):
  ```bash
  solana-test-validator --reset
  ```
- Point CLI to localnet:
  ```bash
  solana config set --url localhost
  ```

### Notes

- The tests use Token-2022 program IDs for minting/transfers and `Associated Token Program` for ATA creation.
- The mint is created with 6 decimals; token amounts in the test are specified in base units.



