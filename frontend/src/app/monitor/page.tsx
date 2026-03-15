"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  Activity, Plus, Trash2, Loader2, ArrowLeft,
  Clock, Bell, BellOff, AlertTriangle, CheckCircle2,
  Zap, Building2, Shield, RefreshCw,
} from "lucide-react";

interface Watch {
  id: string;
  url: string;
  interval_hours: number;
  tier: string;
  last_scan: string | null;
  last_risk_score: number | null;
  notification_email: string | null;
  active: boolean;
  created_at: string;
}

const INTERVAL_OPTIONS = [
  { label: "1 hour",   value: 1,   pro: false },
  { label: "6 hours",  value: 6,   pro: false },
  { label: "12 hours", value: 12,  pro: false },
  { label: "24 hours", value: 24,  pro: false },
  { label: "72 hours", value: 72,  pro: false },
  { label: "7 days",   value: 168, pro: false },
];

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function isOverdue(watch: Watch): boolean {
  if (!watch.last_scan) return false;
  const last = new Date(watch.last_scan).getTime();
  return Date.now() - last > watch.interval_hours * 3600_000 * 1.1; // 10% grace
}

function neverScanned(watch: Watch): boolean {
  return !watch.last_scan;
}

function RiskBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[9px] font-mono text-v-muted2">—</span>;
  const pct = Math.round(score * 100);
  const cls =
    pct >= 70 ? "text-v-red border-v-red/30 bg-v-red/5" :
    pct >= 40 ? "text-v-amber border-v-amber/30 bg-v-amber/5" :
                "text-acid border-acid/30 bg-acid/5";
  return (
    <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border", cls)}>
      {pct}
    </span>
  );
}

function StatusDot({ watch }: { watch: Watch }) {
  if (neverScanned(watch)) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-v-amber animate-pulse" />
        <span className="text-[9px] font-mono text-v-amber uppercase">Pending first scan</span>
      </div>
    );
  }
  if (isOverdue(watch)) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-v-red" />
        <span className="text-[9px] font-mono text-v-red uppercase">Overdue</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse" />
      <span className="text-[9px] font-mono text-acid uppercase">Active</span>
    </div>
  );
}

export default function MonitorPage() {
  const router = useRouter();
  const [watches, setWatches]   = useState<Watch[]>([]);
  const [limit, setLimit]       = useState(0);
  const [tier, setTier]         = useState("free");
  const [available, setAvailable] = useState(false);
  const [loading, setLoading]   = useState(true);

  // Create form
  const [showForm, setShowForm]   = useState(false);
  const [newUrl, setNewUrl]       = useState("");
  const [newInterval, setNewInterval] = useState(24);
  const [newEmail, setNewEmail]   = useState("");
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Revoke
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => { fetchWatches(); }, []);

  async function getSession() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return null; }
    return session;
  }

  async function fetchWatches() {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session) return;
      const resp = await fetch(`${API}/monitor`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setWatches(data.watches || []);
      setLimit(data.limit || 0);
      setTier(data.tier || "free");
      setAvailable(data.sentinel_available || false);
    } catch {
      // leave empty
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const session = await getSession();
      if (!session) return;
      const resp = await fetch(`${API}/monitor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          url: newUrl.trim(),
          interval_hours: newInterval,
          notification_email: newEmail.trim() || null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setCreateError(data.detail || "Failed to create watch.");
        return;
      }
      setShowForm(false);
      setNewUrl(""); setNewEmail(""); setNewInterval(24);
      await fetchWatches();
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(watchId: string) {
    setDeleting(watchId);
    try {
      const session = await getSession();
      if (!session) return;
      await fetch(`${API}/monitor/${watchId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setWatches(prev => prev.filter(w => w.id !== watchId));
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  }

  const minInterval = tier === "enterprise" ? 1 : 24;
  const filteredIntervals = INTERVAL_OPTIONS.filter(o => o.value >= minInterval);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-acid/4 rounded-full blur-[100px]" />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#4db8ff]/4 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-14">

        {/* Back */}
        <button
          onClick={() => router.push("/scanner")}
          className="flex items-center gap-1.5 text-xs font-mono text-v-muted2 hover:text-v-muted transition-colors mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to scanner
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <span className="text-[9px] font-mono tracking-[0.25em] text-acid uppercase">
              // Continuous Monitoring
            </span>
            <h1 className="text-2xl font-bold text-foreground mt-2">Sentinel Watches</h1>
            <p className="text-sm text-v-muted mt-1">
              Automatically re-scan endpoints on a schedule. Get alerted when risk scores spike.
            </p>
          </div>
          {!loading && available && (
            <div className="text-right">
              <span className="text-[9px] font-mono text-v-muted2">
                {watches.length} / {limit >= 50 ? "∞" : limit} watches
              </span>
            </div>
          )}
        </div>

        {/* Upgrade gate for free users */}
        {!loading && !available && (
          <div className="rounded-lg border border-v-border bg-v-bg2 p-8 text-center mb-6">
            <Activity className="w-8 h-8 text-v-muted2 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium text-foreground mb-1">
              Sentinel requires Pro or Enterprise
            </p>
            <p className="text-xs text-v-muted mb-5">
              Schedule automated rescans and receive alerts when your LLM endpoints degrade.
            </p>
            <button
              onClick={() => router.push("/billing")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-acid text-black text-xs font-mono font-bold tracking-widest uppercase rounded hover:bg-acid/90 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> Upgrade to Pro
            </button>
          </div>
        )}

        {/* Add watch button */}
        {available && !showForm && watches.length < limit && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-acid text-black text-xs font-mono font-bold tracking-widest uppercase rounded hover:bg-acid/90 transition-colors mb-6"
          >
            <Plus className="w-3.5 h-3.5" /> Add watch
          </button>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="rounded-lg border border-acid/25 bg-acid/5 p-5 mb-6">
            <p className="text-[9px] font-mono tracking-widest text-acid uppercase mb-4">
              New sentinel watch
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-v-muted2 mb-1.5">Target URL *</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://your-llm-api.com/chat"
                  required
                  className="w-full bg-black/30 border border-v-border text-sm font-mono text-foreground placeholder:text-v-muted2 px-3 py-2 rounded focus:outline-none focus:border-acid/40 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-v-muted2 mb-1.5">Scan interval</label>
                  <select
                    value={newInterval}
                    onChange={e => setNewInterval(Number(e.target.value))}
                    className="w-full bg-black/30 border border-v-border text-sm font-mono text-foreground px-3 py-2 rounded focus:outline-none focus:border-acid/40 transition-colors"
                  >
                    {filteredIntervals.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-v-muted2 mb-1.5">
                    Alert email (optional)
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-black/30 border border-v-border text-sm font-mono text-foreground placeholder:text-v-muted2 px-3 py-2 rounded focus:outline-none focus:border-acid/40 transition-colors"
                  />
                </div>
              </div>
            </div>

            {createError && (
              <p className="mt-3 text-[10px] font-mono text-v-red">! {createError}</p>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button
                type="submit"
                disabled={creating || !newUrl.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-acid text-black text-xs font-mono font-bold tracking-widest uppercase rounded hover:bg-acid/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {creating ? "CREATING..." : "CREATE"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setCreateError(null); }}
                className="px-4 py-2 text-xs font-mono text-v-muted2 border border-v-border rounded hover:text-v-muted hover:border-white/15 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Watches list */}
        {available && (
          <div className="rounded-lg border border-v-border overflow-hidden">
            <div className="bg-v-bg2 border-b border-v-border px-4 py-3">
              <span className="text-[9px] font-mono tracking-widest text-v-muted2 uppercase">
                Active watches
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex items-center justify-center gap-2 text-v-muted2 font-mono text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-acid" /> LOADING...
              </div>
            ) : watches.length === 0 ? (
              <div className="py-14 flex flex-col items-center gap-3 opacity-40">
                <Activity className="w-7 h-7" />
                <span className="font-mono text-xs tracking-widest uppercase">No watches yet</span>
                <span className="text-[11px] text-v-muted2">Add a URL to start monitoring.</span>
              </div>
            ) : (
              <div className="divide-y divide-v-border">
                {watches.map(watch => (
                  <div key={watch.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {/* URL */}
                        <p
                          className="font-mono text-[11px] text-foreground truncate mb-1.5"
                          title={watch.url}
                        >
                          {watch.url}
                        </p>

                        {/* Status + metadata row */}
                        <div className="flex items-center flex-wrap gap-3">
                          <StatusDot watch={watch} />

                          <div className="flex items-center gap-1 text-[9px] font-mono text-v-muted2">
                            <RefreshCw className="w-2.5 h-2.5" />
                            Every {watch.interval_hours}h
                          </div>

                          {watch.last_scan && (
                            <div className="flex items-center gap-1 text-[9px] font-mono text-v-muted2">
                              <Clock className="w-2.5 h-2.5" />
                              Last: {formatDate(watch.last_scan)}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-v-muted2">Risk:</span>
                            <RiskBadge score={watch.last_risk_score} />
                          </div>

                          {watch.notification_email ? (
                            <div className="flex items-center gap-1 text-[9px] font-mono text-v-muted2">
                              <Bell className="w-2.5 h-2.5" />
                              {watch.notification_email}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[9px] font-mono text-v-muted2 opacity-50">
                              <BellOff className="w-2.5 h-2.5" />
                              No alerts
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delete */}
                      <div className="shrink-0">
                        {confirmId === watch.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-v-muted2">Delete?</span>
                            <button
                              onClick={() => handleDelete(watch.id)}
                              disabled={deleting === watch.id}
                              className="text-[9px] font-mono px-2 py-1 border border-v-red/30 text-v-red hover:bg-v-red/10 rounded transition-colors disabled:opacity-40"
                            >
                              {deleting === watch.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-[9px] font-mono px-2 py-1 border border-v-border text-v-muted2 hover:text-v-muted rounded transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(watch.id)}
                            className="p-1.5 text-v-muted2 hover:text-v-red border border-transparent hover:border-v-red/20 rounded transition-colors"
                            title="Delete watch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info box */}
        {available && (
          <div className="mt-6 rounded-lg border border-v-border bg-v-bg2 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-3.5 h-3.5 text-v-muted2 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-v-muted leading-relaxed">
                  Scans run every 15 min check cycle. Alert emails are sent when risk score increases by 20+ points or new HIGH findings appear.
                </p>
                <p className="text-[10px] font-mono text-v-muted2">
                  {tier === "enterprise"
                    ? "Enterprise: up to 50 watches · minimum 1h interval"
                    : "Pro: up to 5 watches · minimum 24h interval"}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
