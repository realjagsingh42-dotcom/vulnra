"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiTurnResultsProps {
  conversation: Array<{
    turn: number;
    user: string;
    assistant: string;
  }>;
  findings: Array<{
    turn: number;
    type: string;
    prompt?: string;
    response?: string;
  }>;
}

export default function MultiTurnResults({ conversation, findings }: MultiTurnResultsProps) {
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set());

  const toggleTurn = (turn: number) => {
    const newExpanded = new Set(expandedTurns);
    if (newExpanded.has(turn)) {
      newExpanded.delete(turn);
    } else {
      newExpanded.add(turn);
    }
    setExpandedTurns(newExpanded);
  };

  if (!conversation || conversation.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-mono text-v-muted2 uppercase tracking-widest flex items-center justify-between">
        <span>Multi-Turn Conversation</span>
        <span className="text-acid">{conversation.length} turns</span>
      </div>
      
      {findings.length > 0 && (
        <div className="bg-v-red/10 border border-v-red/30 rounded-sm p-2">
          <div className="text-[9px] text-v-red font-mono">
            ⚠️ {findings.length} potential jailbreak(s) detected
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar">
        {conversation.map((turn, i) => {
          const isExpanded = expandedTurns.has(turn.turn);
          const hasFinding = findings.some(f => f.turn === turn.turn);
          
          return (
            <div 
              key={i} 
              className={cn(
                "p-2 border rounded-sm cursor-pointer transition-all",
                hasFinding 
                  ? "border-v-red/50 bg-v-red/5 hover:bg-v-red/10" 
                  : "border-v-border2 bg-black/20 hover:bg-black/30"
              )}
              onClick={() => toggleTurn(turn.turn)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-v-muted2">Turn {turn.turn + 1}</span>
                  {hasFinding && (
                    <span className="text-[8px] text-v-red bg-v-red/10 px-1.5 py-0.5 rounded">
                      JAILBREAK
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-v-muted2" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-v-muted2" />
                )}
              </div>
              
              {isExpanded && (
                <div className="mt-2 space-y-2">
                  <div>
                    <div className="text-[8px] text-v-muted2 mb-1">User</div>
                    <div className="text-[10px] text-acid/80 font-mono leading-relaxed">
                      {turn.user}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-v-muted2 mb-1">Assistant</div>
                    <div className="text-[10px] text-v-muted font-mono leading-relaxed">
                      {turn.assistant}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
