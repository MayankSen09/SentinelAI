/**
 * POST /execute handler — the core orchestration endpoint.
 *
 * Flow:
 *  1. Validate request body with Zod
 *  2. Fetch AgentPolicy from chain (or mock in demo mode)
 *  3. If x402 payment → route through Firewall first (short-circuit on failure)
 *  4. Invoke program client (submit_transaction)
 *  5. Build PER-aware log entry and store it
 *  6. Return { status, reason }
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { fetchAgentPolicy, PolicyNotFoundError } from "../services/policyFetcher";
import { validateTransaction } from "../services/firewallValidator";
import { routeX402 } from "../services/x402Router";
import { isPrivateMode, buildResponse } from "../services/perHandler";
import { submitTransaction } from "../services/programClient";
import { buildLogEntry, logTransaction, getLogs } from "../utils/logger";
import { appendAuditLog } from "../services/auditLogger";
import type { ExecuteResponse } from "../models/types";

const router = Router();

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const ExecuteRequestSchema = z.object({
  // Strictly enforce valid Solana Base58 pubkey lengths (32 to 44 chars)
  agent_pubkey: z.string().min(32, "Invalid agent public key length").max(44, "Agent key too long"),
  // Constrain max integer bound to max TS safe Integer to prevent buffer underflows/overflows
  amount: z.number().int().positive("Amount must be positive").max(Number.MAX_SAFE_INTEGER, "Amount too large"),
  // Strict matching on receiver length
  receiver: z.string().min(32, "Invalid receiver public key").max(44, "Receiver key too long"),
  payment_type: z.enum(["normal", "x402"]),
});

// ─── API Protection ─────────────────────────────────────────────────────────

// Apply 100 requests per 15 minutes strict limits
const executeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { status: "rejected", reason: "Too many transactions requested, please try again later." },
});

// ─── POST /execute ──────────────────────────────────────────────────────────

router.post("/execute", executeRateLimiter, async (req: Request, res: Response) => {
  // Step 1: Validate request body
  const parsed = ExecuteRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    const response: ExecuteResponse = {
      status: "rejected",
      reason: `Missing field: ${firstError.path.join(".")} — ${firstError.message ?? ''}`,
    };
    res.status(400).json(response);
    return;
  }

  const { agent_pubkey, amount, receiver, payment_type } = parsed.data;

  try {
    // Step 2: Fetch agent policy
    const policy = await fetchAgentPolicy(agent_pubkey);
    const privateMode = isPrivateMode(policy.privateMode);

    // Step 3: x402 routing — firewall short-circuit (Property 14)
    if (payment_type === "x402") {
      const x402Result = routeX402(policy, amount, receiver);
      if (!x402Result.valid) {
        const response: ExecuteResponse = {
          status: "rejected",
          reason: x402Result.reason,
        };

        // Log the rejection (PER-aware)
        const logEntry = buildLogEntry(
          agent_pubkey, payment_type, amount, receiver,
          "rejected", x402Result.reason, privateMode
        );
        logTransaction(logEntry);
        appendAuditLog(logEntry); // Requirement 20

        res.status(200).json(response);
        return;
      }
    }

    // Step 4: Invoke program client (submit_transaction)
    const result = await submitTransaction(agent_pubkey, amount, receiver, policy);

    // Step 5: Log the result (PER-aware)
    const logEntry = buildLogEntry(
      agent_pubkey, payment_type, amount, receiver,
      result.status, result.reason, privateMode
    );
    logTransaction(logEntry);
    appendAuditLog(logEntry); // Requirement 20

    // Step 6: Return response
    const response = buildResponse(result, privateMode);
    res.status(200).json(response);

  } catch (error) {
    if (error instanceof PolicyNotFoundError) {
      const response: ExecuteResponse = {
        status: "rejected",
        reason: "Agent policy not found",
      };
      res.status(404).json(response);
      return;
    }

    // Unexpected error — never retry (Requirement 6.5)
    console.error("Unexpected error in /execute:", error);
    const response: ExecuteResponse = {
      status: "rejected",
      reason: "Internal server error",
    };
    res.status(500).json(response);
  }
});

// ─── GET /logs ──────────────────────────────────────────────────────────────

router.get("/logs", (req: Request, res: Response) => {
  const agentPubkey = req.query.agent_pubkey as string | undefined;
  const logs = getLogs(agentPubkey);
  res.json(logs);
});

// ─── POST /freeze ───────────────────────────────────────────────────────────

const FreezeSchema = z.object({
  agent_pubkey: z.string().min(32).max(44),
});

router.post("/freeze", (req: Request, res: Response) => {
  const parsed = FreezeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "error", reason: "Invalid agent_pubkey" });
    return;
  }
  const { freezeAgent } = require("../services/programClient");
  freezeAgent(parsed.data.agent_pubkey);

  const logEntry = buildLogEntry(
    parsed.data.agent_pubkey, "normal", 0, "",
    "rejected", "Agent manually frozen by owner", false
  );
  logTransaction(logEntry);
  appendAuditLog(logEntry);

  res.json({ status: "frozen", agent_pubkey: parsed.data.agent_pubkey });
});

// ─── POST /unfreeze ─────────────────────────────────────────────────────────

router.post("/unfreeze", (req: Request, res: Response) => {
  const parsed = FreezeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "error", reason: "Invalid agent_pubkey" });
    return;
  }
  const { unfreezeAgent } = require("../services/programClient");
  unfreezeAgent(parsed.data.agent_pubkey);

  const logEntry = buildLogEntry(
    parsed.data.agent_pubkey, "normal", 0, "",
    "approved", "Agent unfrozen by owner", false
  );
  logTransaction(logEntry);
  appendAuditLog(logEntry);

  res.json({ status: "unfrozen", agent_pubkey: parsed.data.agent_pubkey });
});

// ─── GET /profile ───────────────────────────────────────────────────────────

router.get("/profile", (req: Request, res: Response) => {
  const agentPubkey = req.query.agent_pubkey as string | undefined;
  if (!agentPubkey) {
    res.status(400).json({ error: "agent_pubkey query parameter required" });
    return;
  }
  const { getProfile, getOrCreateProfile } = require("../services/programClient");
  const profile = getProfile(agentPubkey) || getOrCreateProfile(agentPubkey);
  res.json({
    agentPubkey: profile.agentPubkey?.toBase58?.() || agentPubkey,
    reputationScore: profile.reputationScore,
    totalTransactions: profile.totalTransactions,
    successfulTransactions: profile.successfulTransactions,
    consecutiveFailures: profile.consecutiveFailures,
    frozen: profile.frozen,
  });
});

export default router;
