// ============================================================
// TokenUsageBadge — Shows current token usage to the user
// Turns yellow at 80%, red at 95%
// ============================================================

"use client";

import { TokenUsage } from "@must-iq/shared-types";

interface Props {
  usage: TokenUsage;
}

export function TokenUsageBadge({ usage }: Props) {
  if (usage.tokenBudget === -1) {
    return (
      <span className="text-xs text-gray-500 font-mono">
        Unlimited tokens
      </span>
    );
  }

  const pct = usage.percentUsed;
  const color =
    pct >= 0.95
      ? "text-red-400 bg-red-900/30 border-red-800"
      : pct >= 0.8
        ? "text-yellow-400 bg-yellow-900/30 border-yellow-800"
        : "text-green-400 bg-green-900/30 border-green-800";

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${color}`}>
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(pct * 100, 100)}%`,
            background: pct >= 0.95 ? "#f87171" : pct >= 0.8 ? "#fbbf24" : "#4ade80",
          }}
        />
      </div>
      <span>
        {usage.remainingTokens === Infinity
          ? "∞"
          : usage.remainingTokens.toLocaleString()}{" "}
        tokens left
      </span>
    </div>
  );
}
