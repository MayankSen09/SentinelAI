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

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(helmet()); // Apply critical web vulnerabilities headers (XSS, clickjacking, etc)
app.use(express.json({ limit: "50kb" })); // Prevent large payload DoS attacks

// Global Rate Limiter (Security Audit Fix: Protect GET endpoints from DoS)
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 500,
  message: { status: "rejected", reason: "Global API Rate limit exceeded" },
});
app.use(apiRateLimiter);
app.use(
  cors({
    origin: "*", // Allow all origins for devnet demo
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use("/", executeRouter);

// x402 Resource HTTP 402 Flow Endpoint (Req 18)
app.get("/api/resource/:resourceId", handleResourceRequest);

// Immutable Audit Log Endpoint (Req 20)
app.get("/api/audit", async (_req, res) => {
  try {
    const logPath = path.join(__dirname, "../../audit_log.jsonl");
    
    const fileStream = createReadStream(logPath);
    fileStream.on('error', () => {
      // File missing or inaccessible
      if (!res.headersSent) res.json([]);
    });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const entries: any[] = [];
    const MAX_ENTRIES = 100; // DoS Protection: Bind memory limit

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

// Health check
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
  app.listen(PORT, () => {
    console.log(`\n🛡️  SentinelAI Backend running on http://localhost:${PORT}`);
    console.log(`   Mode: ${process.env.DEMO_MODE === "true" ? "DEMO" : "PRODUCTION"}`);
    console.log(`   Endpoints:`);
    console.log(`     POST /execute  — Submit agent transaction`);
    console.log(`     GET  /logs     — Retrieve activity log`);
    console.log(`     GET  /api/audit — Retrieve immutable audit logs`);
    console.log(`     GET  /api/resource/:id — x402 resource challenge`);
    console.log(`     GET  /health   — Health check\n`);
  });
}

export { app };
