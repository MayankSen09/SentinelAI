#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# SentinelAI — Devnet Deployment Script
# Deploys the Anchor smart contract to Solana devnet
# ═══════════════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  🛡️  SentinelAI — Solana Devnet Deployment"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

# ─── Step 1: Verify toolchain ────────────────────────────────────────
echo -e "${YELLOW}[1/6] Verifying toolchain...${NC}"
anchor --version || { echo -e "${RED}❌ Anchor CLI not found${NC}"; exit 1; }
solana --version || { echo -e "${RED}❌ Solana CLI not found${NC}"; exit 1; }

# ─── Step 2: Switch to devnet ────────────────────────────────────────
echo -e "${YELLOW}[2/6] Switching to Solana devnet...${NC}"
solana config set --url https://devnet.helius-rpc.com/\?api-key=6f601163-6911-4b7d-98cb-02050e194810

WALLET_ADDRESS=$(solana address)
echo -e "${GREEN}  Wallet: ${WALLET_ADDRESS}${NC}"

# ─── Step 3: Check balance ───────────────────────────────────────────
echo -e "${YELLOW}[3/6] Checking wallet balance...${NC}"
BALANCE=$(solana balance | awk '{print $1}')
echo -e "  Current balance: ${BALANCE} SOL"

REQUIRED=3
if (( $(echo "$BALANCE < $REQUIRED" | bc -l) )); then
  echo -e "${YELLOW}  ⚠️  Need at least ${REQUIRED} SOL for deployment.${NC}"
  echo -e "${YELLOW}  Requesting airdrop...${NC}"
  
  # Try airdrop up to 3 times
  for i in 1 2 3; do
    if solana airdrop 2 --url https://api.devnet.solana.com 2>/dev/null; then
      echo -e "${GREEN}  ✅ Airdrop successful!${NC}"
      break
    else
      echo -e "${YELLOW}  Attempt $i failed, waiting 10s...${NC}"
      sleep 10
    fi
  done
  
  BALANCE=$(solana balance | awk '{print $1}')
  echo -e "  Updated balance: ${BALANCE} SOL"
  
  if (( $(echo "$BALANCE < 1" | bc -l) )); then
    echo -e "${RED}  ❌ Insufficient balance. Please visit https://faucet.solana.com${NC}"
    echo -e "${RED}     and airdrop SOL to: ${WALLET_ADDRESS}${NC}"
    exit 1
  fi
fi

# ─── Step 4: Build the program ───────────────────────────────────────
echo -e "${YELLOW}[4/6] Building the Anchor program...${NC}"
anchor build

# ─── Step 5: Verify program keypair ─────────────────────────────────
echo -e "${YELLOW}[5/6] Verifying program keypair...${NC}"
PROGRAM_ID=$(solana address -k target/deploy/sentinel_ai-keypair.json)
echo -e "${GREEN}  Program ID: ${PROGRAM_ID}${NC}"

# Verify declare_id matches
DECLARED_ID=$(grep 'declare_id!' programs/sentinel_ai/src/lib.rs | sed 's/declare_id!("//;s/");.*//')
if [ "$PROGRAM_ID" != "$DECLARED_ID" ]; then
  echo -e "${YELLOW}  ⚠️  Updating declare_id to match keypair...${NC}"
  sed -i '' "s/declare_id!(\"$DECLARED_ID\")/declare_id!(\"$PROGRAM_ID\")/" programs/sentinel_ai/src/lib.rs
  
  # Also update Anchor.toml
  sed -i '' "s/$DECLARED_ID/$PROGRAM_ID/g" Anchor.toml
  
  # Rebuild
  anchor build
fi

# ─── Step 6: Deploy to devnet ────────────────────────────────────────
echo -e "${YELLOW}[6/6] Deploying to Solana devnet...${NC}"
anchor deploy --provider.cluster devnet

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ SentinelAI deployed to Solana Devnet!${NC}"
echo -e "${GREEN}  Program ID: ${PROGRAM_ID}${NC}"
echo -e "${GREEN}  Explorer: https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Copy the IDL to frontend:  cp target/idl/sentinel_ai.json frontend/src/lib/"
echo "  2. Deploy backend to Railway: cd backend && railway up"
echo "  3. Deploy frontend to Vercel: cd frontend && vercel --prod"
