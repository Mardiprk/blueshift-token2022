import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Token2022 } from "../target/types/token2022";
import { Keypair } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";

describe("token2022", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.token2022 as Program<Token2022>;
  const provider = anchor.AnchorProvider.env();

  // Test accounts
  let mintKeypair: Keypair;
  let userKeypair: Keypair;
  let user2Keypair: Keypair;
  
  beforeEach(async () => {
    // Generate new keypairs for each test
    mintKeypair = Keypair.generate();
    userKeypair = Keypair.generate();
    user2Keypair = Keypair.generate();
    
    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(userKeypair.publicKey, 2000000000);
    await provider.connection.requestAirdrop(user2Keypair.publicKey, 2000000000);
  });

  it("Creates a mint with metadata extension", async () => {
    const tx = await program.methods
      .createMintWithMetadata(
        6, // decimals
        "Test Token",
        "TEST",
        "https://example.com/metadata.json"
      )
      .accounts({
        payer: userKeypair.publicKey,
        mint: mintKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([userKeypair, mintKeypair])
      .rpc();

    console.log("Create mint tx:", tx);

    const mintAccount = await program.account.mint.fetch(mintKeypair.publicKey);
    expect(mintAccount).to.not.be.null;
  });

  it("Creates token accounts and mints tokens", async () => {
    await program.methods
      .createMintWithMetadata(
        6,
        "Test Token",
        "TEST", 
        "https://example.com/metadata.json"
      )
      .accounts({
        payer: userKeypair.publicKey,
        mint: mintKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([userKeypair, mintKeypair])
      .rpc();

    // Get the associated token account address
    const userTokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      userKeypair.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create the token account
    await program.methods
      .createTokenAccount()
      .accounts({
        payer: userKeypair.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: userTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([userKeypair])
      .rpc();

    // Mint 1000 tokens to the user
    const mintAmount = new anchor.BN(1000000000); // 1000 tokens with 6 decimals
    
    await program.methods
      .mintTokens(mintAmount)
      .accounts({
        mintAuthority: userKeypair.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: userTokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([userKeypair])
      .rpc();

    // Verify the tokens were minted
    const tokenAccountInfo = await provider.connection.getTokenAccountBalance(
      userTokenAccount
    );
    
    expect(tokenAccountInfo.value.amount).to.equal("1000000000");
    console.log("Token balance:", tokenAccountInfo.value.uiAmount);
  });

  it("Transfers tokens between accounts", async () => {
    // Setup: create mint and token accounts
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
      TOKEN_2022_PROGRAM_ID
    );

    const user2TokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      user2Keypair.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Create token accounts
    await program.methods
      .createTokenAccount()
      .accounts({
        payer: userKeypair.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: user1TokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([userKeypair])
      .rpc();

    await program.methods
      .createTokenAccount()
      .accounts({
        payer: user2Keypair.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: user2TokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([user2Keypair])
      .rpc();

    // Mint tokens to user1
    await program.methods
      .mintTokens(new anchor.BN(1000000000))
      .accounts({
        mintAuthority: userKeypair.publicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: user1TokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([userKeypair])
      .rpc();

    // Transfer 100 tokens from user1 to user2
    const transferAmount = new anchor.BN(100000000); // 100 tokens
    
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
    expect(user2Balance.value.amount).to.equal("100000000");  // 100 tokens received

    console.log("User 1 balance:", user1Balance.value.uiAmount);
    console.log("User 2 balance:", user2Balance.value.uiAmount);
  });
});
