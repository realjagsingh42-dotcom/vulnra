"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  Key, Plus, Trash2, Copy, CheckCheck, Loader2,
  ArrowLeft, AlertTriangle, Eye, EyeOff, Clock, Zap, Building2, Shield,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

function TierLabel({ tier, limit }: { tier: string; limit: number }) {
  const icon =
    tier === "enterprise" ? <Building2 className="w-3 h-3 text-[#4db8ff]" /> :
    tier === "pro"        ? <Zap className="w-3 h-3 text-acid" /> :
                            <Shield className="w-3 h-3 text-v-muted2" />;
  const limitStr = limit >= 9999 ? "Unlimited" : `${limit} keys`;
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-mono text-v-muted2">
      {icon} {tier.toUpperCase()} · {limitStr}
    </span>
  );
}

export default function ApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [limit, setLimit] = useState(3);
  const [tier, setTier]   = useState("free");
  const [loading, setLoading] = useState(true);

  // Create form
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Revealed key after creation
  const [newKey, setNewKey]         = useState<string | null>(null);
  const [keyCopied, setKeyCopied]   = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);

  // Revoke confirmation
  const [revoking, setRevoking]     = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => { fetchKeys(); }, []);

  async function getSession() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return null; }
    return session;
  }

  async function fetchKeys() {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session) return;
      const resp = await fetch(`${API}/keys`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setKeys(data.keys || []);
      setLimit(data.limit || 3);
      setTier(data.tier || "free");
    } catch {
      // leave empty
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const session = await getSession();
      if (!session) return;
      const resp = await fetch(`${API}/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setCreateError(data.detail || "Failed to create key.");
        return;
      }
      setNewKey(data.key);
      setKeyVisible(false);
      setKeyCopied(false);
      setNewName("");
      await fetchKeys();
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setRevoking(keyId);
    try {
      const session = await getSession();
      if (!session) return;
      await fetch(`${API}/keys/${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setKeys(prev => prev.filter(k => k.id !== keyId));
    } finally {
      setRevoking(null);
      setConfirmId(null);
    }
  }

  async function copyKey(text: string) {
    await navigator.clipboard.writeText(text);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 3000);
  }

  const activeKeys = keys.filter(k => !k.revoked);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-acid/4 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-14">

        {/* Back nav */}
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
              // Settings
            </span>
            <h1 className="text-2xl font-bold text-foreground mt-2">API Keys</h1>
            <p className="text-sm text-v-muted mt-1">
              Use API keys to authenticate requests from CI/CD pipelines and scripts.
            </p>
          </div>
          {!loading && <TierLabel tier={tier} limit={limit} />}
        </div>

        {/* New key reveal banner */}
        {newKey && (
          <div className="rounded-lg border border-acid/30 bg-acid/5 p-5 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-acid mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-0.5">Copy your key now</p>
                <p className="text-xs text-v-muted">
                  This key won't be shown again. Store it somewhere safe.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-[11px] bg-black/40 border border-v-border px-3 py-2 rounded text-acid break-all">
                {keyVisible ? newKey : `vk_live_${"•".repeat(32)}`}
              </div>
              <button
                onClick={() => setKeyVisible(v => !v)}
                className="shrink-0 p-2 text-v-muted2 hover:text-v-muted border border-v-border rounded transition-colors"
                title={keyVisible ? "Hide" : "Show"}
              >
                {keyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => copyKey(newKey)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono tracking-wider border rounded transition-colors",
                  keyCopied
                    ? "border-acid/50 text-acid bg-acid/10"
                    : "border-acid/30 text-acid hover:bg-acid/10"
                )}
              >
                {keyCopied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {keyCopied ? "COPIED" : "COPY"}
              </button>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="mt-3 text-[10px] font-mono text-v-muted2 hover:text-v-muted transition-colors"
            >
              I've saved it — dismiss
            </button>
          </div>
        )}

        {/* Create key form */}
        {!loading && activeKeys.length < limit && (
          <form onSubmit={handleCreate} className="rounded-lg border border-v-border bg-v-bg2 p-5 mb-6">
            <p className="text-[9px] font-mono tracking-widest text-v-muted2 uppercase mb-4">
              Create new key
            </p>
            <div className="flex items-center gap-3">
              <input
                ref={nameRef}
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. CI pipeline, staging bot"
                maxLength={60}
                className="flex-1 bg-black/30 border border-v-border text-sm font-mono text-foreground placeholder:text-v-muted2 px-3 py-2 rounded focus:outline-none focus:border-acid/40 transition-colors"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-acid text-black text-xs font-mono font-bold tracking-widest uppercase rounded hover:bg-acid/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {creating ? "CREATING..." : "CREATE"}
              </button>
            </div>
            {createError && (
              <p className="mt-2 text-[10px] font-mono text-v-red">! {createError}</p>
            )}
          </form>
        )}

        {!loading && activeKeys.length >= limit && (
          <div className="rounded-lg border border-v-border bg-v-bg2 p-4 mb-6 flex items-center justify-between gap-4">
            <p className="text-xs text-v-muted font-mono">
              Key limit reached ({limit}). Revoke an existing key or{" "}
              <a href="/billing" className="text-acid hover:underline">upgrade your plan</a>.
            </p>
          </div>
        )}

        {/* Keys list */}
        <div className="rounded-lg border border-v-border overflow-hidden">
          <div className="bg-v-bg2 border-b border-v-border px-4 py-3 flex items-center justify-between">
            <span className="text-[9px] font-mono tracking-widest text-v-muted2 uppercase">
              Your keys
            </span>
            <span className="text-[9px] font-mono text-v-muted2">
              {activeKeys.length} / {limit >= 9999 ? "∞" : limit} active
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-v-muted2 font-mono text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-acid" />
              LOADING...
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 opacity-40">
              <Key className="w-7 h-7" />
              <span className="font-mono text-xs tracking-widest uppercase">No keys yet</span>
            </div>
          ) : (
            <div className="divide-y divide-v-border">
              {keys.map(k => (
                <div
                  key={k.id}
                  className={cn(
                    "px-4 py-4 flex items-center justify-between gap-4",
                    k.revoked && "opacity-40"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Key className={cn("w-3.5 h-3.5 shrink-0", k.revoked ? "text-v-muted2" : "text-acid")} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-foreground truncate">{k.name}</span>
                        {k.revoked && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 border border-v-red/30 text-v-red rounded-[2px] uppercase">
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-v-muted2">
                          vk_live_{k.key_prefix}••••••••
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-v-muted2">
                          <Clock className="w-2.5 h-2.5" />
                          Created {formatDate(k.created_at)}
                        </span>
                        {k.last_used_at && (
                          <span className="text-[10px] text-v-muted2">
                            Last used {formatDate(k.last_used_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!k.revoked && (
                    <div className="shrink-0">
                      {confirmId === k.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-v-muted2">Revoke?</span>
                          <button
                            onClick={() => handleRevoke(k.id)}
                            disabled={revoking === k.id}
                            className="text-[9px] font-mono px-2 py-1 border border-v-red/30 text-v-red hover:bg-v-red/10 rounded transition-colors disabled:opacity-40"
                          >
                            {revoking === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes, revoke"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-[9px] font-mono px-2 py-1 border border-v-border text-v-muted2 hover:text-v-muted rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(k.id)}
                          title="Revoke key"
                          className="p-1.5 text-v-muted2 hover:text-v-red border border-transparent hover:border-v-red/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage docs */}
        <div className="mt-8 rounded-lg border border-v-border bg-v-bg2 p-5">
          <p className="text-[9px] font-mono tracking-widest text-v-muted2 uppercase mb-4">
            Usage examples
          </p>
          <div className="space-y-4 text-[11px] font-mono">
            <div>
              <p className="text-v-muted2 mb-1.5">curl</p>
              <pre className="bg-black/40 border border-v-border rounded p-3 text-acid overflow-x-auto text-[10px] leading-relaxed">{`curl -X POST https://api.vulnra.ai/scan \\
  -H "Authorization: Bearer vk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-llm-api.com/chat", "tier": "pro"}'`}</pre>
            </div>
            <div>
              <p className="text-v-muted2 mb-1.5">Python</p>
              <pre className="bg-black/40 border border-v-border rounded p-3 text-acid overflow-x-auto text-[10px] leading-relaxed">{`import requests

resp = requests.post(
    "https://api.vulnra.ai/scan",
    headers={"Authorization": "Bearer vk_live_YOUR_KEY"},
    json={"url": "https://your-llm-api.com/chat", "tier": "pro"},
)
scan_id = resp.json()["scan_id"]`}</pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
