import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appendAuditLog } from './auditLogger';
import { appendFile } from 'fs/promises';
import { createHash } from 'crypto';
import type { LogEntry } from '../models/types';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  appendFile: vi.fn().mockResolvedValue(undefined),
}));

describe('auditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully append a hashed audit entry to the log file', async () => {
    const mockEntry: LogEntry = {
      timestamp: '2026-05-13T12:00:00.000Z',
      payment_type: 'normal',
      status: 'approved',
      reason: 'Test log entry',
      amount: 1000,
      receiver: 'ReceiverPubkey11111111111111111111111111',
    };

    // Manually compute expected hash
    const entryString = JSON.stringify(mockEntry);
    const expectedHash = createHash('sha256').update(entryString).digest('hex');

    await appendAuditLog(mockEntry);

    // Ensure appendFile was called
    expect(appendFile).toHaveBeenCalledTimes(1);

    // Check the structure of the written content
    const [filePath, fileContent] = (appendFile as any).mock.calls[0];
    
    expect(filePath).toBeDefined();
    expect(typeof filePath).toBe('string');
    
    const parsedContent = JSON.parse(fileContent.trim());
    expect(parsedContent.original_log).toEqual(mockEntry);
    expect(parsedContent.hash).toBe(expectedHash);
  });

  it('should compute a different hash for different log entries', async () => {
    const entryA: LogEntry = {
      timestamp: '2026-05-13T12:00:00.000Z',
      payment_type: 'normal',
      status: 'approved',
      reason: 'Message A',
    };

    const entryB: LogEntry = {
      ...entryA,
      reason: 'Message B',
    };

    await appendAuditLog(entryA);
    await appendAuditLog(entryB);

    expect(appendFile).toHaveBeenCalledTimes(2);

    const contentA = JSON.parse((appendFile as any).mock.calls[0][1].trim());
    const contentB = JSON.parse((appendFile as any).mock.calls[1][1].trim());

    expect(contentA.hash).not.toBe(contentB.hash);
  });

  it('should gracefully handle file system errors without throwing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (appendFile as any).mockRejectedValueOnce(new Error('FS Error: Permission Denied'));

    const mockEntry: LogEntry = {
      timestamp: '2026-05-13T12:00:00.000Z',
      payment_type: 'x402',
      status: 'rejected',
      reason: 'Testing error path',
    };

    // Should not throw
    await appendAuditLog(mockEntry);
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
