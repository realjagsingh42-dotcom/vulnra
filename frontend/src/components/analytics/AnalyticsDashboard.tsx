"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  Zap, AlertTriangle, BarChart3, Activity, RefreshCw,
  Loader2,
} from "lucide-react";
import VulnraLogo from "@/components/VulnraLogo";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────────── */
interface TrendPoint { date: string; score: number }
interface CategoryCount { category: string; count: number }

interface Summary {
  total_scans: number;
  avg_risk_score: number;
  total_findings: number;
  critical_findings: number;
  trend_30d: TrendPoint[];
  top_categories: CategoryCount[];
  most_scanned_url: string | null;
  score_change: number | null;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function riskColor(score: number) {
  if (score >= 70) return "#ff4d4d";
  if (score >= 40) return "#f5a623";
  return "#b8ff57";
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtCategory(raw: string) {
  return raw.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── SVG Line Chart ───────────────────────────────────────────────────────── */
function LineChart({ data }: { data: TrendPoint[] }) {
  const W = 640, H = 160, PAD = { t: 16, r: 16, b: 40, l: 40 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-v-muted2 font-mono text-xs opacity-40">
        No scan data in the last 30 days
      </div>
    );
  }

  const minScore = 0;
  const maxScore = 100;

  function px(d: TrendPoint, i: number): string {
    const x = PAD.l + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = PAD.t + innerH - ((d.score - minScore) / (maxScore - minScore)) * innerH;
    return `${x},${y}`;
  }

  // Build smooth polyline path
  const points = data.map((d, i) => px(d, i)).join(" ");

  // Build area fill path
  const areaPath = data.length > 0
    ? `M ${px(data[0], 0)} L ${data.map((d, i) => px(d, i)).join(" L ")} L ${PAD.l + innerW},${PAD.t + innerH} L ${PAD.l},${PAD.t + innerH} Z`
    : "";

  // Y grid lines at 0, 25, 50, 75, 100
  const gridY = [0, 25, 50, 75, 100];

  // X axis labels — show up to 6 dates
  const xLabelCount = Math.min(6, data.length);
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / Math.max(xLabelCount - 1, 1)) * (data.length - 1))
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-40"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8ff57" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#b8ff57" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Grid lines */}
      {gridY.map((v) => {
        const y = PAD.t + innerH - (v / 100) * innerH;
        return (
          <g key={v}>
            <line
              x1={PAD.l} y1={y} x2={PAD.l + innerW} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            />
            <text
              x={PAD.l - 6} y={y + 4}
              fontSize="9" fill="rgba(255,255,255,0.3)"
              textAnchor="end" fontFamily="monospace"
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="url(#areaGrad)" />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#b8ff57"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />

      {/* Data points */}
      {data.map((d, i) => {
        const [cx, cy] = px(d, i).split(",").map(Number);
        return (
          <circle
            key={i} cx={cx} cy={cy} r="3"
            fill="#b8ff57" stroke="#060608" strokeWidth="1.5"
          />
        );
      })}

      {/* X axis labels */}
      {xLabelIndices.map((idx) => {
        const d = data[idx];
        const [cx] = px(d, idx).split(",").map(Number);
        return (
          <text
            key={idx}
            x={cx} y={H - 4}
            fontSize="9" fill="rgba(255,255,255,0.35)"
            textAnchor="middle" fontFamily="monospace"
          >
            {fmtDate(d.date)}
          </text>
        );
      })}
    </svg>
  );
}

/* ─── Category Bar Chart ───────────────────────────────────────────────────── */
function CategoryBars({ data }: { data: CategoryCount[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-v-muted2 font-mono text-xs opacity-40">
        No findings yet
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2.5">
      {data.map((item) => {
        const pct = (item.count / max) * 100;
        const isHigh = item.category.includes("INJECTION") || item.category.includes("JAILBREAK");
        return (
          <div key={item.category}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[11px] text-v-muted">{fmtCategory(item.category)}</span>
              <span className="font-mono text-[10px] text-v-muted2">{item.count}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: isHigh ? "#ff4d4d" : "#b8ff57",
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Stat Card ────────────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
  danger = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "border rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden",
        danger
          ? "border-v-red/25 bg-v-red/5"
          : accent
          ? "border-acid/25 bg-acid/5"
          : "border-v-border2 bg-white/[0.02]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-v-muted2">
          {label}
        </span>
        <Icon
          className={cn(
            "w-4 h-4",
            danger ? "text-v-red/60" : accent ? "text-acid/60" : "text-v-muted2/40"
          )}
        />
      </div>
      <div
        className={cn(
          "font-mono text-3xl font-bold tracking-tight",
          danger ? "text-v-red" : accent ? "text-acid" : "text-white"
        )}
      >
        {value}
      </div>
      {sub && (
        <span className="font-mono text-[10.5px] text-v-muted2">{sub}</span>
      )}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */
export default function AnalyticsDashboard({ user }: { user: User }) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const supabase = createClient();

  async function fetchData(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not authenticated"); return; }

      const resp = await fetch(`${API}/api/analytics/summary`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) throw new Error("Failed to load analytics");
      setData(await resp.json());
      setError(null);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const scoreChangeIcon =
    data?.score_change == null ? <Minus className="w-3.5 h-3.5" />
    : data.score_change > 0 ? <TrendingUp className="w-3.5 h-3.5 text-v-red" />
    : <TrendingDown className="w-3.5 h-3.5 text-acid" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <nav className="h-13 bg-v-bg1 border-b border-v-border2 flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <VulnraLogo suffix="ANALYTICS" />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/scanner"
            className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 hover:text-acid transition-colors tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Scanner
          </Link>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 hover:text-acid transition-colors tracking-wider disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </nav>

      <div className="max-w-[1100px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-3">
            <span className="w-4 h-px bg-acid/40" />
            Security Posture
            <span className="w-4 h-px bg-acid/40" />
          </div>
          <h1 className="font-mono text-3xl font-bold tracking-tight mb-2">
            Analytics Dashboard
          </h1>
          <p className="font-mono text-[13px] text-v-muted">
            Aggregated vulnerability trends across all your scanned endpoints.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3 font-mono text-xs text-v-muted2">
            <Loader2 className="w-5 h-5 animate-spin text-acid" />
            LOADING ANALYTICS...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 gap-3 font-mono text-sm text-v-red">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* ── Summary cards ─────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Scans"
                value={data.total_scans}
                icon={Zap}
                accent
              />
              <StatCard
                label="Avg Risk Score"
                value={`${data.avg_risk_score}`}
                sub={
                  data.score_change != null
                    ? `${data.score_change > 0 ? "+" : ""}${data.score_change}pp vs prior`
                    : "no trend data"
                }
                icon={Activity}
                danger={data.avg_risk_score >= 70}
                accent={data.avg_risk_score < 40}
              />
              <StatCard
                label="Total Findings"
                value={data.total_findings}
                icon={BarChart3}
              />
              <StatCard
                label="Critical Findings"
                value={data.critical_findings}
                sub="HIGH or CRITICAL severity"
                icon={AlertTriangle}
                danger={data.critical_findings > 0}
              />
            </div>

            {/* ── Most scanned URL ───────────────────────────────── */}
            {data.most_scanned_url && (
              <div className="border border-v-border2 rounded-xl p-4 flex items-center gap-4">
                <div className="font-mono text-[9px] tracking-widest uppercase text-v-muted2 shrink-0">
                  Most Scanned
                </div>
                <code className="font-mono text-[12px] text-acid truncate">
                  {data.most_scanned_url}
                </code>
              </div>
            )}

            {/* ── Charts row ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              {/* Line chart */}
              <div className="border border-v-border2 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-v-muted2 mb-1">
                      Risk Trend
                    </div>
                    <div className="font-mono text-sm font-bold text-white">
                      30-Day Score History
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-v-muted2">
                    {scoreChangeIcon}
                    {data.score_change != null
                      ? `${data.score_change > 0 ? "+" : ""}${data.score_change}pp`
                      : "—"}
                  </div>
                </div>
                <LineChart data={data.trend_30d} />
              </div>

              {/* Category bars */}
              <div className="border border-v-border2 rounded-xl p-6">
                <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-v-muted2 mb-1">
                  Top Vulnerabilities
                </div>
                <div className="font-mono text-sm font-bold text-white mb-5">
                  By Category
                </div>
                <CategoryBars data={data.top_categories} />
              </div>
            </div>

            {/* ── Empty state prompt ─────────────────────────────── */}
            {data.total_scans === 0 && (
              <div className="border border-dashed border-v-border2 rounded-xl p-10 text-center">
                <Activity className="w-10 h-10 text-v-muted2/30 mx-auto mb-4" />
                <p className="font-mono text-[13px] text-v-muted mb-4">
                  No scans yet. Run your first scan to see analytics here.
                </p>
                <Link
                  href="/scanner"
                  className="inline-flex items-center gap-2 bg-acid text-black font-mono text-[11px] tracking-widest uppercase px-5 py-2.5 rounded font-bold hover:bg-acid/90 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" /> Start Scanning
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
