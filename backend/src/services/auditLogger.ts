import { appendFile } from "fs/promises";
import path from "path";
import { LogEntry } from "../models/types";
import { sha256 } from "crypto-hash"; // we installed crypto-hash

const AUDIT_LOG_FILE = path.join(__dirname, "../../audit_log.jsonl");

export interface AuditLogEntry {
  original_log: LogEntry;
  hash: string;
}

export async function appendAuditLog(entry: LogEntry): Promise<void> {
  // Compute SHA-256 hash of the JSON stringified entry
  const entryString = JSON.stringify(entry);
  const hash = await sha256(entryString);

  const auditEntry: AuditLogEntry = {
    original_log: entry,
    hash,
  };

  const auditLine = JSON.stringify(auditEntry) + "\n";
  
  try {
    await appendFile(AUDIT_LOG_FILE, auditLine);
  } catch (error) {
    console.error("Failed to append to audit log", error);
  }
}
