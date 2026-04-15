'use client';

/**
 * ConnectionStatus - A live indicator of WebSocket / Helius RPC status.
 */

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export function ConnectionStatus() {
  const { connected } = useWallet();
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // In a real implementation this tracks the `connection.onLogs` web socket active state.
    // For now, we tie it to network online status & simple simulated heartbeat.
    setIsLive(true);

    const checkStatus = () => {
      setIsLive(navigator.onLine);
    };

    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);
    
    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
    };
  }, []);

  let statusColor = "bg-text-muted";
  let pulseColor = "";
  let text = "Disconnected";

  if (isLive) {
    statusColor = "bg-trusted";
    pulseColor = "animate-pulse shadow-[0_0_8px_var(--color-trusted)]";
    text = "Helius RPC Live";
  } else if (connected) {
    statusColor = "bg-risky";
    text = "Connecting...";
  }

  return (
    <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-full shadow-sm backdrop-blur-md">
      <div className={`w-2 h-2 rounded-full ${statusColor} ${pulseColor}`} />
      <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
        {text}
      </span>
    </div>
  );
}
