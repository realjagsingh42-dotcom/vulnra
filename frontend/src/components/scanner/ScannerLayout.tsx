"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Shield, LogOut, BarChart3, Settings, Activity } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import ScanConfig from "./ScanConfig";
import Terminal from "./Terminal";

export default function ScannerLayout({ user }: { user: User }) {
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const supabase = createClient();

  const tier = (user.user_metadata?.tier || "free").toLowerCase();

  const handleStartScan = async (config: { url: string; tier: string }) => {
    setIsScanning(true);
    setLogs(["+ INITIALIZING_STOCHASTIC_AUDIT...", `+ TARGET: ${config.url}`, `+ PROTOCOL: ${config.tier.toUpperCase()}`]);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLogs(prev => [...prev, "! ERROR: UNAUTHORIZED_ACCESS"]);
        return;
      }

      setLogs(prev => [...prev, "+ CONNECTING_TO_NODES...", "+ DISPATCHING_PROBES..."]);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/scan`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
            url: config.url,
            tier: config.tier
        })
      });

      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || errData.error || "SCAN_INIT_FAILED");
      }

      const result = await response.json();
      const scanId = result.scan_id;
      setLogs(prev => [...prev, "+ PROBES_COLLECTED", `+ SCAN_ID: ${scanId || "PENDING"}`]);
      
      if (!scanId) {
        setIsScanning(false);
        return;
      }

      // Polling Logic
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/scan/${scanId}`, {
            headers: { "Authorization": `Bearer ${session.access_token}` }
          });
          
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.status === "complete") {
              clearInterval(pollInterval);
              setIsScanning(false);
              setLogs(prev => [...prev, "+ SCAN_COMPLETE. ANALYZING_VULNERABILITIES...", `+ RISK_SCORE: ${pollData.risk_score}`]);
              setFindings(pollData.findings || []);
            } else if (pollData.status === "failed") {
              clearInterval(pollInterval);
              setIsScanning(false);
              setLogs(prev => [...prev, "! ERROR: SCAN_FAILED_INTERNAL_ERROR"]);
            }
          }
        } catch(e) {
          console.error("Polling error", e);
        }
      }, 3000);

    } catch (err: any) {
      setLogs(prev => [...prev, "! ERROR: CONNECTION_FAILED", `! ${err.message || err}`]);
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden selection:bg-acid selection:text-black font-sans">
      {/* Top Navigation */}
      <nav className="h-13 bg-v-bg1 border-b border-v-border2 flex items-center justify-between px-5 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-sm font-bold tracking-wider">
            <div className="w-6 h-6 rounded bg-acid flex items-center justify-center">
              <Shield className="w-3 h-3 text-black" />
            </div>
            VULNRA <em className="text-acid not-italic tracking-tighter ml-1">PLATFORM</em>
          </div>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider">
            SYSTEM_STATUS: <span className="text-acid animate-pulse">OPTIMAL</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono text-v-muted bg-white/5 border border-v-border px-2.5 py-1.25 rounded-sm hover:border-white/10 transition-colors cursor-pointer group">
            <div className="w-4 h-4 rounded-full bg-acid flex items-center justify-center text-[8px] font-bold text-black group-hover:scale-110 transition-transform">
              {user.email?.[0].toUpperCase()}
            </div>
            <span className="max-w-[120px] truncate">{user.email}</span>
            <span className={cn(
              "text-[8px] px-1.25 py-0.25 rounded-[1px] border leading-none font-bold",
              tier === "enterprise" ? "bg-v-amber/10 text-v-amber border-v-amber/20" : "bg-acid/10 text-acid border-acid/20"
            )}>
              {tier.toUpperCase()}
            </span>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-7.5 h-7.5 rounded-sm border border-v-border2 flex items-center justify-center text-v-muted2 hover:text-v-red hover:border-v-red/30 hover:bg-v-red/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      <main className="flex-1 grid grid-cols-[280px_1fr_360px] overflow-hidden">
        {/* Left Panel: Configuration */}
        <aside className="bg-v-bg1 border-r border-v-border2 flex flex-col overflow-hidden">
          <div className="p-4 py-3.5 border-b border-v-border2 flex items-center justify-between shrink-0">
            <span className="text-[8.5px] font-mono tracking-widest text-v-muted2 uppercase">Configuration</span>
            <Settings className="w-3.5 h-3.5 text-v-muted2" />
          </div>
          <ScanConfig onStart={handleStartScan} isScanning={isScanning} />
        </aside>

        {/* Center Panel: Terminal */}
        <Terminal logs={logs} />

        {/* Right Panel: Findings */}
        <aside className="bg-v-bg1 border-l border-v-border2 flex flex-col overflow-hidden">
          <div className="p-4 py-3.5 border-b border-v-border2 flex items-center justify-between shrink-0">
            <span className="text-[8.5px] font-mono tracking-widest text-v-muted2 uppercase">Scan Findings</span>
            <BarChart3 className="w-3.5 h-3.5 text-v-muted2" />
          </div>
          <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
             {findings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-20">
                   <div className="w-12 h-12 rounded-full border border-dashed border-acid flex items-center justify-center mt-[-40px]">
                      <Activity className="w-5 h-5" />
                   </div>
                   <span className="text-[9px] font-mono tracking-widest uppercase italic {isScanning ? 'animate-pulse text-acid' : ''}">
                     {isScanning ? 'Awaiting Scan Telemetry...' : 'Waiting for results...'}
                   </span>
                </div>
             ) : (
                <div className="flex flex-col gap-3 pb-8">
                  {findings.map((f, i) => (
                    <div key={i} className="p-3 border border-v-border2 bg-black/20 rounded-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold tracking-wider">{f.category}</span>
                        <span className={cn(
                          "text-[9px] font-mono px-1.5 py-0.5 rounded-[2px]",
                          f.severity === "HIGH" ? "bg-v-red/10 text-v-red border border-v-red/30" :
                          f.severity === "MEDIUM" ? "bg-v-amber/10 text-v-amber border border-v-amber/30" :
                          "bg-acid/10 text-acid border border-acid/30"
                        )}>{f.severity}</span>
                      </div>
                      <p className="text-[10.5px] text-v-muted leading-relaxed mb-3">
                        {f.detail}
                      </p>
                      {f.reasoning && (
                        <div className="mt-2 text-[9px] text-v-muted2 border-t border-v-border2 pt-2 italic">
                          "{f.reasoning}"
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-v-muted2 border-t border-v-border2/50 pt-2 pb-1">
                        <span>HITS: {f.hits}/{f.total}</span>
                        <span>RATE: {(f.hit_rate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
             )}
          </div>
        </aside>
      </main>
    </div>
  );
}
