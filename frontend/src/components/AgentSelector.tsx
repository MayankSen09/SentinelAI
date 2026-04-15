'use client';

/**
 * AgentSelector — dropdown to switch between registered agent pubkeys.
 *
 * Requirements: 14.3
 */

import { useState } from 'react';
import { useAgentStore } from '@/store/agentStore';

export function AgentSelector() {
  const {
    selectedAgentPubkey,
    agentList,
    setSelectedAgent,
    addAgent,
  } = useAgentStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newPubkey, setNewPubkey] = useState('');

  const truncate = (key: string) =>
    `${key.slice(0, 4)}...${key.slice(-4)}`;

  const handleAdd = () => {
    if (newPubkey.length >= 32) {
      addAgent(newPubkey);
      setSelectedAgent(newPubkey);
      setNewPubkey('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-text-secondary font-medium">Agent:</label>

      {agentList.length > 0 ? (
        <select
          value={selectedAgentPubkey || ''}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="sentinel-input !w-auto !py-2 !px-3 !text-xs cursor-pointer"
          id="agent-selector"
        >
          {agentList.map((pubkey) => (
            <option key={pubkey} value={pubkey}>
              {truncate(pubkey)}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs text-text-muted">No agents registered</span>
      )}

      {isAdding ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newPubkey}
            onChange={(e) => setNewPubkey(e.target.value)}
            placeholder="Enter agent public key..."
            className="sentinel-input !w-64 !py-2 !text-xs"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            id="new-agent-input"
          />
          <button
            onClick={handleAdd}
            className="btn-primary !py-2 !px-3 !text-xs"
            id="confirm-add-agent"
          >
            Add
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewPubkey('');
            }}
            className="btn-ghost !py-2 !px-3 !text-xs"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="btn-ghost !py-1.5 !px-3 !text-xs flex items-center gap-1"
          id="add-agent-btn"
        >
          <span className="text-accent">+</span> Add Agent
        </button>
      )}
    </div>
  );
}
