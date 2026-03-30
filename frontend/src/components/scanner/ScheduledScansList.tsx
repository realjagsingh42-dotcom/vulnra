"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import {
  ArrowLeft, Plus, Loader2, Clock, Play, Pause, Trash2,
  RefreshCw, AlertTriangle, Calendar, History
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import VulnraLogo from "@/components/VulnraLogo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://vulnra-production.up.railway.app";

interface ScheduledScan {
  id: string;
  target_url: string;
  scan_type: string;
  schedule_type: string;
  status: string;
  next_run_at: string | null;
  last_run_at: string | null;
  last_risk_score: number | null;
  interval_hours: number | null;
  cron_expression: string | null;
  created_at: string;
}

async function apiFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function ScheduledScansList({ user }: { user: User }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scans, setScans] = useState<ScheduledScan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    target_url: "",
    schedule_type: "one-time",
    run_at: "",
    interval_hours: 24,
    cron_expression: "",
    notify_email: "",
  });
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tier = (user.user_metadata?.tier || "free").toLowerCase();
  const getSupabase = () => createClient();

  useEffect(() => {
    loadScans();
  }, []);

  async function loadScans() {
    try {
      setLoading(true);
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      const data = await apiFetch("/api/scheduled-scans", session.access_token);
      setScans(data.scans || []);
    } catch (err: any) {
      if (!err.message?.includes("Pro or Enterprise")) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      const payload: any = {
        target_url: formData.target_url,
        schedule_type: formData.schedule_type,
        tier: tier,
        notify_on_complete: !!formData.notify_email,
        notify_email: formData.notify_email || null,
      };

      if (formData.schedule_type === "one-time") {
        payload.run_at = formData.run_at;
      } else if (formData.schedule_type === "recurring") {
        payload.interval_hours = formData.interval_hours;
      } else if (formData.schedule_type === "cron") {
        payload.cron_expression = formData.cron_expression;
      }

      await apiFetch("/api/scheduled-scans", session.access_token, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setShowForm(false);
      setFormData({
        target_url: "",
        schedule_type: "one-time",
        run_at: "",
        interval_hours: 24,
        cron_expression: "",
        notify_email: "",
      });
      await loadScans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePause(scanId: string) {
    setActionLoading(scanId);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      await apiFetch(`/api/scheduled-scans/${scanId}/pause`, session.access_token, {
        method: "POST",
      });
      await loadScans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResume(scanId: string) {
    setActionLoading(scanId);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      await apiFetch(`/api/scheduled-scans/${scanId}/resume`, session.access_token, {
        method: "POST",
      });
      await loadScans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRunNow(scanId: string) {
    setActionLoading(scanId);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      await apiFetch(`/api/scheduled-scans/${scanId}/run-now`, session.access_token, {
        method: "POST",
      });
      alert("Scan triggered! Check the scanner page for progress.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(scanId: string) {
    if (!confirm("Delete this scheduled scan?")) return;

    setActionLoading(scanId);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      await apiFetch(`/api/scheduled-scans/${scanId}`, session.access_token, {
        method: "DELETE",
      });
      await loadScans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  function formatNextRun(scan: ScheduledScan) {
    if (!scan.next_run_at) return "—";
    const date = new Date(scan.next_run_at);
    if (scan.schedule_type === "one-time") {
      return date.toLocaleString();
    }
    if (scan.schedule_type === "recurring") {
      return `in ${scan.interval_hours}h`;
    }
    return scan.cron_expression || "—";
  }

  function getScheduleLabel(scan: ScheduledScan) {
    if (scan.schedule_type === "one-time") return "One-time";
    if (scan.schedule_type === "recurring") return `Every ${scan.interval_hours}h`;
    return `Cron: ${scan.cron_expression}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-acid animate-spin" />
      </div>
    );
  }

  if (tier !== "pro" && tier !== "enterprise") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <nav className="h-13 bg-v-bg1 border-b border-v-border2 flex items-center px-5">
          <a href="/scanner" className="flex items-center gap-2 text-[10px] font-mono text-v-muted2 hover:text-acid">
            <ArrowLeft className="w-3 h-3" /> BACK TO SCANNER
          </a>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Clock className="w-12 h-12 text-v-muted mx-auto mb-4" />
            <h1 className="text-lg font-bold text-foreground mb-2">Pro or Enterprise Required</h1>
            <p className="text-sm text-v-muted2">
              Scheduled scans are available on Pro and Enterprise plans.
            </p>
            <a href="/billing" className="inline-block mt-4 px-4 py-2 bg-acid text-black text-xs font-mono hover:bg-acid/90">
              UPGRADE PLAN
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="h-13 bg-v-bg1 border-b border-v-border2 flex items-center justify-between px-5">
        <div className="flex items-center gap-4">
          <a href="/scanner" className="flex items-center gap-2 text-[10px] font-mono text-v-muted2 hover:text-acid">
            <ArrowLeft className="w-3 h-3" /> BACK
          </a>
          <div className="h-5 w-[1px] bg-v-border" />
          <a href="/"><VulnraLogo suffix="PLATFORM" /></a>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-acid" />
              Scheduled Scans
            </h1>
            <p className="text-xs text-v-muted2 mt-1">
              Automate recurring vulnerability scans
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-acid text-black text-xs font-mono hover:bg-acid/90"
            >
              <Plus className="w-3 h-3" /> NEW SCHEDULE
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 border border-v-red/30 bg-v-red/5 rounded-sm flex items-center gap-2 text-v-red text-xs">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 p-5 border border-v-border2 bg-v-bg1 rounded-sm">
            <h2 className="text-sm font-bold text-foreground mb-4">New Scheduled Scan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-v-muted2 mb-1">TARGET URL</label>
                <input
                  type="text"
                  value={formData.target_url}
                  onChange={e => setFormData({ ...formData, target_url: e.target.value })}
                  placeholder="https://api.openai.com/v1/chat/completions"
                  className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-v-muted2 mb-1">SCHEDULE TYPE</label>
                  <select
                    value={formData.schedule_type}
                    onChange={e => setFormData({ ...formData, schedule_type: e.target.value })}
                    className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                  >
                    <option value="one-time">One-time</option>
                    <option value="recurring">Recurring</option>
                    <option value="cron">Cron Expression</option>
                  </select>
                </div>

                {formData.schedule_type === "one-time" && (
                  <div>
                    <label className="block text-[10px] font-mono text-v-muted2 mb-1">RUN AT</label>
                    <input
                      type="datetime-local"
                      value={formData.run_at}
                      onChange={e => setFormData({ ...formData, run_at: e.target.value })}
                      className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                      required
                    />
                  </div>
                )}

                {formData.schedule_type === "recurring" && (
                  <div>
                    <label className="block text-[10px] font-mono text-v-muted2 mb-1">INTERVAL (HOURS)</label>
                    <input
                      type="number"
                      value={formData.interval_hours}
                      onChange={e => setFormData({ ...formData, interval_hours: parseInt(e.target.value) })}
                      min="1"
                      max="720"
                      className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                      required
                    />
                  </div>
                )}

                {formData.schedule_type === "cron" && (
                  <div>
                    <label className="block text-[10px] font-mono text-v-muted2 mb-1">CRON EXPRESSION</label>
                    <input
                      type="text"
                      value={formData.cron_expression}
                      onChange={e => setFormData({ ...formData, cron_expression: e.target.value })}
                      placeholder="0 9 * * 1"
                      className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm font-mono"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono text-v-muted2 mb-1">NOTIFICATION EMAIL (OPTIONAL)</label>
                <input
                  type="email"
                  value={formData.notify_email}
                  onChange={e => setFormData({ ...formData, notify_email: e.target.value })}
                  placeholder="alerts@company.com"
                  className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-acid text-black text-xs font-mono hover:bg-acid/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
                  CREATE SCHEDULE
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-v-border text-v-muted2 text-xs font-mono hover:border-white/20"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {scans.length === 0 ? (
            <div className="p-8 border border-dashed border-v-border text-center">
              <Clock className="w-8 h-8 text-v-muted mx-auto mb-2" />
              <p className="text-xs text-v-muted2">No scheduled scans</p>
            </div>
          ) : (
            scans.map(scan => (
              <div key={scan.id} className="p-4 border border-v-border2 bg-v-bg1 rounded-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded flex items-center justify-center",
                      scan.status === "active" ? "bg-acid/10" : scan.status === "paused" ? "bg-amber-500/10" : "bg-v-border"
                    )}>
                      <Clock className={cn(
                        "w-4 h-4",
                        scan.status === "active" ? "text-acid" : scan.status === "paused" ? "text-amber-400" : "text-v-muted2"
                      )} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground truncate max-w-[300px]">
                        {scan.target_url}
                      </h3>
                      <p className="text-[10px] text-v-muted2">
                        {getScheduleLabel(scan)} • {scan.status.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <p className="text-[10px] text-v-muted2">Next run</p>
                      <p className="text-xs text-foreground">{formatNextRun(scan)}</p>
                    </div>

                    {scan.last_risk_score !== null && (
                      <span className={cn(
                        "text-[9px] font-mono px-2 py-1 rounded",
                        scan.last_risk_score >= 0.7 ? "bg-v-red/20 text-v-red" :
                        scan.last_risk_score >= 0.3 ? "bg-amber-500/20 text-amber-400" :
                        "bg-acid/20 text-acid"
                      )}>
                        {scan.last_risk_score.toFixed(2)}
                      </span>
                    )}

                    {scan.status === "active" && (
                      <button
                        onClick={() => handlePause(scan.id)}
                        disabled={actionLoading === scan.id}
                        className="flex items-center gap-1.5 px-2 py-1 border border-v-border text-[10px] font-mono text-v-muted2 hover:text-foreground hover:border-white/20"
                      >
                        <Pause className="w-3 h-3" />
                      </button>
                    )}

                    {scan.status === "paused" && (
                      <button
                        onClick={() => handleResume(scan.id)}
                        disabled={actionLoading === scan.id}
                        className="flex items-center gap-1.5 px-2 py-1 border border-v-border text-[10px] font-mono text-v-muted2 hover:text-foreground hover:border-white/20"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => handleRunNow(scan.id)}
                      disabled={actionLoading === scan.id}
                      className="flex items-center gap-1.5 px-2 py-1 border border-acid/30 text-[10px] font-mono text-acid hover:bg-acid/10"
                    >
                      <RefreshCw className={cn("w-3 h-3", actionLoading === scan.id && "animate-spin")} />
                    </button>

                    <button
                      onClick={() => handleDelete(scan.id)}
                      disabled={actionLoading === scan.id}
                      className="flex items-center gap-1.5 px-2 py-1 border border-v-red/30 text-[10px] font-mono text-v-red hover:bg-v-red/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
