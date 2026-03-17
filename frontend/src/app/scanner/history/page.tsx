"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  Shield, ArrowLeft, ExternalLink, FileDown, Loader2,
  ChevronLeft, ChevronRight, Clock, Zap, Building2, GitCompareArrows,
  ScanLine, Plus,
} from "lucide-react";

interface Scan {
  id: string;
  target_url: string;
  status: string;
  risk_score: number | null;
  tier: string;
  scan_engine: string;
  created_at: string;
  completed_at: string | null;
}

const PAGE_SIZE = 20;

function RiskBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border border-v-border text-v-muted2">
        —
      </span>
    );
  }
  const pct = Math.round(score * 100);
  const cls =
    pct >= 70
      ? "bg-v-red/10 text-v-red border-v-red/30"
      : pct >= 40
      ? "bg-v-amber/10 text-v-amber border-v-amber/30"
      : "bg-acid/10 text-acid border-acid/30";
  return (
    <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border", cls)}>
      {pct}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "complete"
      ? "text-acid border-acid/30 bg-acid/5"
      : status === "failed"
      ? "text-v-red border-v-red/30 bg-v-red/5"
      : "text-v-amber border-v-amber/30 bg-v-amber/5";
  return (
    <span className={cn("text-[8px] font-mono px-1.5 py-0.5 rounded-[2px] border tracking-wider uppercase", cls)}>
      {status}
    </span>
  );
}

function TierIcon({ tier }: { tier: string }) {
  if (tier === "enterprise") return <Building2 className="w-3 h-3 text-[#4db8ff]" />;
  if (tier === "pro") return <Zap className="w-3 h-3 text-acid" />;
  return <Shield className="w-3 h-3 text-v-muted2" />;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  // Comparison selection — at most 2 scan IDs, ordered by selection time
  const [selected, setSelected] = useState<string[]>([]);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchScans(0);
  }, []);

  async function fetchScans(newOffset: number) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const resp = await fetch(
        `${API}/scans?limit=${PAGE_SIZE + 1}&offset=${newOffset}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!resp.ok) throw new Error("Failed to load scan history");

      const data = await resp.json();
      const rows: Scan[] = data.scans || [];
      setHasMore(rows.length > PAGE_SIZE);
      setScans(rows.slice(0, PAGE_SIZE));
      setOffset(newOffset);
    } catch {
      // leave list empty
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id]; // drop oldest, add newest
    });
  }

  function handleCompare() {
    if (selected.length !== 2) return;
    const [s1, s2] = selected.map(id => scans.find(s => s.id === id)!);
    if (!s1 || !s2) return;
    const [newer, older] = new Date(s1.created_at) >= new Date(s2.created_at)
      ? [s1, s2] : [s2, s1];
    router.push(`/scanner/diff?a=${newer.id}&b=${older.id}`);
  }

  async function handleDownload(scan: Scan) {
    if (scan.status !== "complete") return;
    setDownloading(scan.id);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const resp = await fetch(`${API}/scan/${scan.id}/report`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) return;

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vulnra-report-${scan.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-acid/4 rounded-full blur-[100px]" />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-[#4db8ff]/4 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-14">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.push("/scanner")}
            className="flex items-center gap-1.5 text-xs font-mono text-v-muted2 hover:text-v-muted transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to scanner
          </button>
          <button
            onClick={() => router.push("/scanner")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-acid text-black text-xs font-mono font-bold tracking-widest uppercase rounded hover:bg-acid/90 transition-colors"
          >
            + New scan
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <span className="text-[9px] font-mono tracking-[0.25em] text-acid uppercase">
            // Scan History
          </span>
          <h1 className="text-2xl font-bold text-foreground mt-2">
            Past scans
          </h1>
          <p className="text-sm text-v-muted mt-1">
            All vulnerability audits run on your account, newest first.
          </p>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-v-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-v-bg2 border-b border-v-border">
                <th className="px-3 py-3 w-8" title="Select to compare" />
                <th className="text-left px-4 py-3 font-mono text-[9px] tracking-widest uppercase text-v-muted2 w-[32%]">Target</th>
                <th className="text-left px-4 py-3 font-mono text-[9px] tracking-widest uppercase text-v-muted2">Status</th>
                <th className="text-left px-4 py-3 font-mono text-[9px] tracking-widest uppercase text-v-muted2">Risk</th>
                <th className="text-left px-4 py-3 font-mono text-[9px] tracking-widest uppercase text-v-muted2">Tier</th>
                <th className="text-left px-4 py-3 font-mono text-[9px] tracking-widest uppercase text-v-muted2">Date</th>
                <th className="px-4 py-3 font-mono text-[9px] tracking-widest uppercase text-v-muted2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-v-muted2">
                    <div className="flex items-center justify-center gap-2 font-mono text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-acid" />
                      LOADING...
                    </div>
                  </td>
                </tr>
              ) : scans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center gap-5">
                      {/* Icon */}
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-acid/8 border border-acid/15 flex items-center justify-center">
                          <ScanLine className="w-7 h-7 text-acid/50" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-v-bg2 border border-v-border flex items-center justify-center">
                          <Clock className="w-2.5 h-2.5 text-v-muted2" />
                        </div>
                      </div>
                      {/* Copy */}
                      <div className="space-y-1">
                        <p className="font-mono text-[12px] text-foreground font-semibold tracking-wider">NO SCANS YET</p>
                        <p className="font-mono text-[10px] text-v-muted2 max-w-xs">
                          Run your first adversarial audit to start tracking<br />vulnerability history here.
                        </p>
                      </div>
                      {/* CTA */}
                      <a
                        href="/scanner"
                        className="inline-flex items-center gap-1.5 text-[10px] font-mono px-4 py-2 bg-acid text-black font-bold tracking-widest uppercase rounded hover:bg-acid/90 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Run First Scan
                      </a>
                    </div>
                  </td>
                </tr>
              ) : (
                scans.map((scan, i) => (
                  <tr
                    key={scan.id}
                    className={cn(
                      "border-b border-v-border last:border-0 hover:bg-white/2 transition-colors",
                      i % 2 === 0 ? "bg-transparent" : "bg-v-bg2/40"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3">
                      {scan.status === "complete" && (
                        <button
                          onClick={() => toggleSelect(scan.id)}
                          className={cn(
                            "w-4 h-4 rounded-[2px] border flex items-center justify-center transition-all",
                            selected.includes(scan.id)
                              ? "bg-acid border-acid text-black"
                              : "border-v-border hover:border-white/20"
                          )}
                        >
                          {selected.includes(scan.id) && (
                            <span className="text-[8px] font-bold leading-none">✓</span>
                          )}
                        </button>
                      )}
                    </td>

                    {/* Target URL */}
                    <td className="px-4 py-3">
                      <span
                        className="font-mono text-[10px] text-v-muted truncate block max-w-[280px]"
                        title={scan.target_url}
                      >
                        {scan.target_url}
                      </span>
                      <span className="text-[9px] text-v-muted2 font-mono">
                        {scan.id.slice(0, 8)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusPill status={scan.status} />
                    </td>

                    {/* Risk score */}
                    <td className="px-4 py-3">
                      <RiskBadge score={scan.risk_score} />
                    </td>

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <TierIcon tier={scan.tier || "free"} />
                        <span className="font-mono text-[9px] text-v-muted2 uppercase">{scan.tier || "free"}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] text-v-muted2">
                        {formatDate(scan.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View in scanner */}
                        <a
                          href={`/scanner?scan_id=${scan.id}`}
                          title="View in scanner"
                          className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-[2px] border border-v-border text-v-muted2 hover:border-white/15 hover:text-v-muted transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          VIEW
                        </a>

                        {/* PDF download — only for complete scans */}
                        {scan.status === "complete" && (
                          <button
                            onClick={() => handleDownload(scan)}
                            disabled={downloading === scan.id}
                            title="Download PDF report"
                            className={cn(
                              "inline-flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-[2px] border transition-colors",
                              downloading === scan.id
                                ? "opacity-40 cursor-not-allowed border-v-border text-v-muted2"
                                : "border-acid/30 text-acid hover:bg-acid/10 hover:border-acid/50"
                            )}
                          >
                            {downloading === scan.id
                              ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              : <FileDown className="w-2.5 h-2.5" />
                            }
                            PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && scans.length > 0 && (
          <div className="flex items-center justify-between mt-5">
            <span className="text-[10px] font-mono text-v-muted2">
              Showing {offset + 1}–{offset + scans.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={offset === 0}
                onClick={() => fetchScans(Math.max(0, offset - PAGE_SIZE))}
                className="inline-flex items-center gap-1 text-[10px] font-mono px-3 py-1.5 rounded border border-v-border text-v-muted2 hover:border-white/15 hover:text-v-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>
              <button
                disabled={!hasMore}
                onClick={() => fetchScans(offset + PAGE_SIZE)}
                className="inline-flex items-center gap-1 text-[10px] font-mono px-3 py-1.5 rounded border border-v-border text-v-muted2 hover:border-white/15 hover:text-v-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating compare bar — appears when 2 scans are selected */}
      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 px-5 py-3 bg-v-bg1 border border-acid/40 rounded-lg shadow-2xl backdrop-blur-sm">
            <span className="text-[10px] font-mono text-v-muted2">
              <span className="text-acid font-bold">{selected.length}</span>
              {selected.length === 1 ? " scan selected" : " scans selected"}
            </span>
            {selected.length === 2 && (
              <button
                onClick={handleCompare}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 bg-acid text-black font-bold rounded hover:bg-acid/90 transition-colors tracking-widest uppercase"
              >
                <GitCompareArrows className="w-3 h-3" />
                Compare
              </button>
            )}
            {selected.length === 1 && (
              <span className="text-[9px] font-mono text-v-muted2 opacity-60">
                Select one more to compare
              </span>
            )}
            <button
              onClick={() => setSelected([])}
              className="text-[9px] font-mono text-v-muted2 hover:text-v-muted transition-colors ml-1"
            >
              clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
