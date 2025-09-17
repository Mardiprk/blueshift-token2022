import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Token2022 } from "../target/types/token2022";
import { Keypair, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

describe("token2022", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.token2022 as Program<Token2022>;
  const provider = anchor.AnchorProvider.env();

  let mintKeypair: Keypair;
  let userKeypair: Keypair;
  let user2Keypair: Keypair;

  beforeEach(async () => {
    mintKeypair = Keypair.generate();
    userKeypair = Keypair.generate();
    user2Keypair = Keypair.generate();

    // Airdrop SOL to both users
    for (const kp of [userKeypair, user2Keypair]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(kp.publicKey, 2e9)
      );
    }
  });

  it("Creates a mint with metadata extension", async () => {
    const tx = await program.methods
      .createMintWithMetadata(6, "Test Token", "TEST", "https://example.com/metadata.json")
      .accounts({
        payer: userKeypair.publicKey,
        mint: mintKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([userKeypair, mintKeypair])
      .rpc();

    console.log("Create mint tx:", tx);

    const mintInfo = await provider.connection.getAccountInfo(mintKeypair.publicKey);
    expect(mintInfo).to.not.be.null;
  });

  it("Mints and transfers tokens", async () => {
    // Create mint
    await program.methods
      .createMintWithMetadata(6, "Test Token", "TEST", "https://example.com/metadata.json")
      .accounts({
        payer: userKeypair.publicKey,
        mint: mintKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([userKeypair, mintKeypair])
      .rpc();

    const user1TokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      userKeypair.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const user2TokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      user2Keypair.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create token accounts
    for (const [payer, tokenAccount] of [
      [userKeypair, user1TokenAccount],
      [user2Keypair, user2TokenAccount],
    ] as const) {
      await program.methods
        .createTokenAccount()
        .accounts({
          payer: payer.publicKey,
          mint: mintKeypair.publicKey,
          tokenAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([payer])
        .rpc();
    }

    // Mint 1000 tokens to user1
    const mintAmount = new anchor.BN(1_000_000_000); // 1000 tokens (6 decimals)
    await program.methods
      .mintTokens(mintAmount)
      .accounts({
        mintAuthority: userKeypair.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: user1TokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([userKeypair])
      .rpc();

    // Transfer 100 tokens to user2
    const transferAmount = new anchor.BN(100_000_000); // 100 tokens (6 decimals)
    await program.methods
      .transferTokens(transferAmount)
      .accounts({
        authority: userKeypair.publicKey,
        fromTokenAccount: user1TokenAccount,
        toTokenAccount: user2TokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([userKeypair])
      .rpc();

    // Verify balances
    const user1Balance = await provider.connection.getTokenAccountBalance(user1TokenAccount);
    const user2Balance = await provider.connection.getTokenAccountBalance(user2TokenAccount);

    expect(user1Balance.value.amount).to.equal("900000000"); // 900 tokens left
    expect(user2Balance.value.amount).to.equal("100000000"); // 100 tokens received

    console.log("User 1 balance:", user1Balance.value.uiAmount);
    console.log("User 2 balance:", user2Balance.value.uiAmount);
  });
});
