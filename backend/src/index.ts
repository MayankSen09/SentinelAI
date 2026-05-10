/**
 * SentinelAI Backend — Express Server Entry Point.
 *
 * Provides the execution control API for the SentinelAI system:
 *  - POST /execute — submit and validate agent transactions
 *  - GET /logs     — retrieve transaction activity log
 *  - GET /health   — server health check
 *
 * Requirements: 6.1
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { createReadStream } from "fs";
import * as readline from "readline";
import { rateLimit } from "express-rate-limit";
import executeRouter from "./routes/execute";
import { handleResourceRequest } from "./routes/x402Resource";
import { LogEntry } from "./models/types";
import { PORT, MAX_AUDIT_ENTRIES, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from "./constants";

const app = express();
const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : (typeof PORT === 'string' ? parseInt(PORT) : PORT);

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: "*", // Allow all origins for devnet demo
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(express.json({ limit: "50kb" })); // Prevent large payload DoS attacks

// Global Rate Limiter (Security Audit Fix: Protect GET endpoints from DoS)
const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, 
  max: RATE_LIMIT_MAX_REQUESTS,
  message: { status: "rejected", reason: "Global API Rate limit exceeded" },
});
app.use(apiRateLimiter);

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use("/", executeRouter);

// API Status welcome endpoint
app.get("/", (_req, res) => {
  res.json({
    status: "active",
    message: "Welcome to SentinelAI Security Suite API. The firewall is active and guarding on-chain activities.",
    documentation: "/health",
    endpoints: {
      submit: "POST /execute",
      logs: "GET /logs",
      audit: "GET /api/audit",
      profile: "GET /profile?agent_pubkey=<KEY>"
    }
  });
});

// x402 Resource HTTP 402 Flow Endpoint (Req 18)
app.get("/api/resource/:resourceId", handleResourceRequest);

/**
 * Immutable Audit Log Endpoint (Requirement 20).
 * 
 * Reads and streams the local JSONL audit logs. 
 * Implements protective bounds to prevent memory overflow on large log processing.
 */
app.get("/api/audit", async (_req, res) => {
  try {
    const logPath = process.env.VERCEL ? "/tmp/audit_log.jsonl" : path.resolve(process.cwd(), "audit_log.jsonl");
    
    const fileStream = createReadStream(logPath);
    fileStream.on('error', () => {
      // File missing or inaccessible
      if (!res.headersSent) res.json([]);
    });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const entries: LogEntry[] = [];
    const MAX_ENTRIES = MAX_AUDIT_ENTRIES; // DoS Protection: Bind memory limit

    for await (const line of rl) {
      if (line.trim()) {
        try {
          entries.push(JSON.parse(line));
          if (entries.length > MAX_ENTRIES) {
            entries.shift();
          }
        } catch(e) {}
      }
    }
    
    if (!res.headersSent) res.json(entries.reverse()); // latest first
  } catch (error) {
    if (!res.headersSent) res.json([]);
  }
});

/**
 * Health Check Endpoint.
 * Used for container liveliness probes and cluster status verification.
 */
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sentinel-ai-backend",
    timestamp: new Date().toISOString(),
    mode: process.env.DEMO_MODE === "true" ? "demo" : "production",
  });
});

// ─── Start Server ───────────────────────────────────────────────────────────

if (require.main === module) {
  app.listen(SERVER_PORT, () => {
    console.log(`\n================================================================`);
    console.log(` 🛡️  SentinelAI Backend is now actively monitoring`);
    console.log(`================================================================`);
    console.log(` 🚀 Endpoint: http://localhost:${SERVER_PORT}`);
    console.log(` 🔐 Environment: ${process.env.DEMO_MODE === "true" ? "DEMO (Simulated)" : "PRODUCTION"}`);
    console.log(`\n 📡 Enabled Routes:`);
    console.log(`    • POST /execute        -> Agent Execution Gateway`);
    console.log(`    • GET  /logs           -> Event Stream`);
    console.log(`    • GET  /api/audit      -> Immutable Trail`);
    console.log(`    • GET  /api/resource   -> x402 Verification`);
    console.log(`================================================================\n`);
  });
}

export { app };
export default app;
