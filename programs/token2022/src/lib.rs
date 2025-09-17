use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

declare_id!("2KS2vcW2Z6KghbLDDLHYW883GC4z8vupLFSLBrfR9LWE");
///OG program id = 
#[program]
pub mod token2022 {
    use super::*;

/// Create a new mint with metadata pointer extension
pub fn create_mint_with_metadata(
    ctx: Context<CreateMintWithMetadata>,
    decimals: u8,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    msg!("Creating mint with metadata extension");
    msg!("Name: {}, Symbol: {}, URI: {}", name, symbol, uri);
    
    Ok(())
}

pub fn create_token_account(ctx: Context<CreateTokenAccount>) -> Result<()> {
    msg!("Creating associated token account for mint: {}", ctx.accounts.mint.key());
    Ok(())
}

pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
    msg!("Minting {} tokens", amount);
    
    let mint_to_ctx = anchor_spl::token_interface::MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.token_account.to_account_info(),
        authority: ctx.accounts.mint_authority.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        mint_to_ctx,
    );
    
    anchor_spl::token_interface::mint_to(cpi_ctx, amount)?;
    
    msg!("Successfully minted {} tokens", amount);
    Ok(())
}

/// Transfer tokens between accounts
pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
    msg!("Transferring {} tokens", amount);
    
    let transfer_ctx = anchor_spl::token_interface::Transfer {
        from: ctx.accounts.from_token_account.to_account_info(),
        to: ctx.accounts.to_token_account.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_ctx,
    );
    
    anchor_spl::token_interface::transfer(cpi_ctx, amount)?;
    
    msg!("Successfully transferred {} tokens", amount);
    Ok(())
}
}

#[derive(Accounts)]
pub struct CreateMintWithMetadata<'info> {
#[account(mut)]
pub payer: Signer<'info>,

#[account(
    init,
    payer = payer,
    mint::decimals = 6,
    mint::authority = payer.key(),
    mint::token_program = token_program,
    extensions::metadata_pointer::authority = payer.key(),
    extensions::metadata_pointer::metadata_address = mint.key(),
    extensions::close_authority::authority = payer.key(),
)]
pub mint: InterfaceAccount<'info, Mint>,

pub system_program: Program<'info, System>,
pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CreateTokenAccount<'info> {
#[account(mut)]
pub payer: Signer<'info>,

pub mint: InterfaceAccount<'info, Mint>,

#[account(
    init,
    payer = payer,
    associated_token::mint = mint,
    associated_token::authority = payer,
    associated_token::token_program = token_program,
)]
pub token_account: InterfaceAccount<'info, TokenAccount>,

pub system_program: Program<'info, System>,
pub token_program: Interface<'info, TokenInterface>,
pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
pub mint_authority: Signer<'info>,

/// The mint account
#[account(mut)]
pub mint: InterfaceAccount<'info, Mint>,

#[account(mut)]
pub token_account: InterfaceAccount<'info, TokenAccount>,

pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
pub authority: Signer<'info>,

#[account(mut)]
pub from_token_account: InterfaceAccount<'info, TokenAccount>,

#[account(mut)]
pub to_token_account: InterfaceAccount<'info, TokenAccount>,

pub token_program: Interface<'info, TokenInterface>,
}

#[error_code]
pub enum TokenError {
#[msg("Invalid amount")]
InvalidAmount,
#[msg("Insufficient balance")]
InsufficientBalance,
}