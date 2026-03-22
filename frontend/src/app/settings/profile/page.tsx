"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { signOut } from "@/app/auth/actions";
import { useRouter } from "next/navigation";
import {
  Loader2, Save, Copy, Check, AlertTriangle, CheckCircle2,
  Trash2, Plus, Eye, EyeOff, Github, Twitter, LogOut, ExternalLink,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ── helpers ──────────────────────────────────────────────────── */
async function getSession() {
  const sb = createClient();
  const { data } = await sb.auth.getSession();
  return data.session;
}

function useCopy(timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  }, [timeout]);
  return { copied, copy };
}

/* ── sub-components ───────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-v-muted2 mb-2">
      {children}
    </div>
  );
}

function Card({ children, red }: { children: React.ReactNode; red?: boolean }) {
  return (
    <div className={`rounded-sm p-5 mb-4 ${red ? "border border-v-red/30 bg-background" : "border border-v-border2 bg-v-bg1"}`}>
      {children}
    </div>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-[11px] font-mono px-3 py-2 rounded-sm border mt-2 ${ok ? "bg-acid/10 border-acid/30 text-acid" : "bg-v-red/10 border-v-red/30 text-v-red"}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
      {msg}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-mono text-[10.5px] tracking-wider text-v-muted2 uppercase mb-1.5">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full font-mono text-[13px] bg-background border border-v-border2 rounded-sm px-3 py-2.5 text-foreground placeholder:text-v-muted2 focus:outline-none focus:border-acid/50 focus:bg-v-bg2 transition-colors ${props.readOnly ? "opacity-60 cursor-not-allowed" : ""} ${props.className ?? ""}`}
    />
  );
}

function Btn({
  children, onClick, disabled, variant = "primary", className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const styles = {
    primary: "bg-acid text-black hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(184,255,87,0.25)]",
    ghost:   "border border-v-border text-foreground hover:border-white/20 hover:-translate-y-0.5",
    danger:  "border border-v-red/30 text-v-red hover:bg-v-red/10 hover:border-v-red/50",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 font-mono text-[10.5px] tracking-widest px-4 py-2.5 rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

const TIER_COLOR: Record<string, string> = {
  free:       "bg-white/10 text-v-muted border-white/10",
  pro:        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  enterprise: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const TIER_LIMIT: Record<string, number> = { free: 1, pro: 100, enterprise: 999 };

/* ── Main component ───────────────────────────────────────────── */
export default function ProfilePage() {
  const router = useRouter();
  // NOTE: createClient() is NOT called here at render time — it would throw
  // if NEXT_PUBLIC_SUPABASE_URL is missing (Railway env var not set), crashing
  // the entire component to the error boundary. Instead we call it lazily
  // inside each async handler that needs it, wrapped in try/catch.

  /* profile state */
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail]   = useState("");
  const [userId, setUserId] = useState("");
  const [tier, setTier]     = useState("free");
  const [memberSince, setMemberSince] = useState("");
  const [scansToday, setScansToday]   = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [orgName, setOrgName]         = useState("");
  const [providers, setProviders]     = useState<string[]>([]);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ msg: string; ok: boolean } | null>(null);

  /* API keys */
  const [keys, setKeys]           = useState<{id:string;name:string;key_prefix:string;created_at:string;last_used_at:string|null}[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName]   = useState("");
  const [newKeyCreating, setNewKeyCreating] = useState(false);
  const [revealedKey, setRevealedKey]       = useState<string | null>(null);
  const [revealedKeyName, setRevealedKeyName] = useState("");
  const [keyMsg, setKeyMsg] = useState<{ msg: string; ok: boolean } | null>(null);

  /* referral */
  const { copied: refCopied, copy: copyRef } = useCopy();

  /* delete */
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting]           = useState(false);

  /* ── Load profile ─────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        let session;
        try {
          session = await getSession();
        } catch {
          // createClient() threw — env vars likely missing in this deployment.
          // Show an inline error instead of crashing the whole component.
          setLoadError("Auth service unavailable. NEXT_PUBLIC_SUPABASE_URL may not be set in Railway.");
          return;
        }

        if (!session) { router.push("/login?redirect=/settings/profile"); return; }

        const u = session.user;
        setEmail(u.email ?? "");
        setUserId(u.id);
        setProviders((u.app_metadata?.providers as string[]) ?? []);
        setMemberSince(
          new Date(u.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        );

        /* load profile data — 503 means backend not yet configured, show defaults */
        try {
          const resp = await fetch(`${API}/api/user/profile`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (resp.ok) {
            const d = await resp.json();
            setDisplayName(d.display_name ?? "");
            setOrgName(d.org_name ?? "");
            setTier(d.tier ?? "free");
            setScansToday(d.scan_count_today ?? 0);
          }
          // Non-ok (404, 503, etc.) → silently keep defaults; profile still renders
        } catch {
          // Network error fetching profile — keep defaults, do not crash
        }

        /* load keys — non-fatal if it fails */
        loadKeys(session.access_token);
      } catch {
        setLoadError("Failed to load profile. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadKeys(token: string) {
    setKeysLoading(true);
    try {
      const r = await fetch(`${API}/keys`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setKeys(await r.json());
    } finally {
      setKeysLoading(false);
    }
  }

  /* ── Save profile ─────────────────────────────────────────── */
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const session = await getSession();
      if (!session) return;
      const r = await fetch(`${API}/api/user/profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, org_name: orgName }),
      });
      setProfileMsg(r.ok
        ? { msg: "Profile saved", ok: true }
        : { msg: (await r.json()).detail || "Save failed", ok: false });
    } catch {
      setProfileMsg({ msg: "Network error", ok: false });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(null), 4000);
    }
  };

  /* ── API keys ─────────────────────────────────────────────── */
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setNewKeyCreating(true);
    setKeyMsg(null);
    try {
      const session = await getSession();
      if (!session) return;
      const r = await fetch(`${API}/keys`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (r.ok) {
        const d = await r.json();
        setRevealedKey(d.key);
        setRevealedKeyName(d.name);
        setNewKeyName("");
        loadKeys(session.access_token);
      } else {
        const e = await r.json();
        setKeyMsg({ msg: e.detail || "Failed to create key", ok: false });
      }
    } catch {
      setKeyMsg({ msg: "Network error", ok: false });
    } finally {
      setNewKeyCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const session = await getSession();
      if (!session) return;
      const r = await fetch(`${API}/keys/${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (r.ok) {
        const token = session.access_token;
        setKeys(k => k.filter(x => x.id !== keyId));
        loadKeys(token);
      }
    } catch { /* noop */ }
  };

  /* ── Delete account ───────────────────────────────────────── */
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const session = await getSession();
      if (!session) return;
      const r = await fetch(`${API}/api/user`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (r.ok) {
        // Best-effort sign out — if createClient() throws (env vars missing)
        // we still redirect the user away rather than crashing the component.
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch { /* proceed to redirect regardless */ }
        router.push("/");
      }
    } catch {
      /* deletion failed — deleting spinner will reset via finally */
    } finally {
      setDeleting(false);
    }
  };

  /* ── referral ─────────────────────────────────────────────── */
  const refCode = userId ? userId.slice(0, 8) : "";
  const refLink = `https://vulnra.ai?ref=${refCode}`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I use VULNRA to red-team my LLM APIs. Get a free scan: ${refLink}`)}`;

  /* ── render ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 text-acid animate-spin" />
      </div>
    );
  }

  /* Inline error — shown instead of crashing to the 500 error boundary */
  if (loadError) {
    return (
      <div className="max-w-[680px]">
        <div className="border border-v-red/30 bg-v-red/5 rounded-sm p-5 font-mono">
          <div className="flex items-center gap-2 text-v-red text-[11px] font-bold tracking-wider mb-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            PROFILE LOAD ERROR
          </div>
          <p className="text-[12px] text-v-muted leading-relaxed mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="font-mono text-[10.5px] tracking-widest px-4 py-2 rounded-sm border border-v-border text-foreground hover:border-white/20 transition-all"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  const scanLimit = TIER_LIMIT[tier] ?? 1;
  const scanPct   = Math.min((scansToday / scanLimit) * 100, 100);

  return (
    <div className="max-w-[680px] space-y-1">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold tracking-tight mb-1">Profile</h1>
        <p className="font-mono text-[12px] text-v-muted2">
          Manage your account, plan, API keys, and preferences.
        </p>
      </div>

      {/* ── Avatar / header card ───────────────────────────── */}
      <div className="flex items-center gap-4 p-5 border border-v-border2 bg-v-bg1 rounded-sm mb-6">
        <div className="w-14 h-14 rounded-full bg-acid text-black flex items-center justify-center font-mono font-bold text-2xl shrink-0">
          {email ? email[0].toUpperCase() : "U"}
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[15px] font-semibold text-foreground truncate">
            {displayName || email.split("@")[0]}
          </div>
          <div className="font-mono text-[11px] text-v-muted2 truncate">{email}</div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`font-mono text-[9.5px] tracking-widest px-2 py-0.5 rounded-sm border uppercase ${TIER_COLOR[tier] ?? TIER_COLOR.free}`}>
              {tier}
            </span>
            {memberSince && (
              <span className="font-mono text-[10px] text-v-muted2">
                Member since {memberSince}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 1. Account Info ────────────────────────────────── */}
      <SectionLabel>Account Info</SectionLabel>
      <Card>
        <div className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={email} readOnly />
          </div>
          <div>
            <Label>Full name / display name</Label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Jane Smith"
            />
          </div>
          <div>
            <Label>Organization</Label>
            <Input
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>
          {profileMsg && <Toast {...profileMsg} />}
          <Btn onClick={handleSaveProfile} disabled={profileSaving}>
            {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </Btn>
        </div>
      </Card>

      {/* ── 2. Plan & Usage ────────────────────────────────── */}
      <SectionLabel>Plan &amp; Usage</SectionLabel>
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-mono text-[12px] text-v-muted2 mb-0.5">Current plan</div>
              <span className={`font-mono text-[11px] tracking-widest px-2.5 py-1 rounded-sm border uppercase ${TIER_COLOR[tier] ?? TIER_COLOR.free}`}>
                {tier === "enterprise" ? "Enterprise" : tier === "pro" ? "Pro — $49/mo" : "Free"}
              </span>
            </div>
            {tier === "free" && (
              <a
                href="/pricing"
                className="font-mono text-[10.5px] tracking-widest bg-acid text-black px-4 py-2 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(184,255,87,0.2)] transition-all"
              >
                Upgrade to Pro →
              </a>
            )}
            {tier !== "free" && (
              <a
                href="/billing/manage"
                className="font-mono text-[10.5px] tracking-widest border border-v-border text-foreground px-4 py-2 rounded-sm hover:border-white/20 transition-all"
              >
                Manage billing →
              </a>
            )}
          </div>

          {/* Usage bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="font-mono text-[10.5px] text-v-muted2 uppercase tracking-wider">Scans today</div>
              <div className="font-mono text-[11px] text-foreground">
                {scansToday} / {tier === "enterprise" ? "∞" : scanLimit}
              </div>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${scanPct >= 90 ? "bg-v-red" : "bg-acid"}`}
                style={{ width: `${tier === "enterprise" ? Math.min(scansToday * 2, 100) : scanPct}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ── 3. API Keys ────────────────────────────────────── */}
      <SectionLabel>API Keys</SectionLabel>
      <Card>
        <div className="space-y-4">
          <div className="font-mono text-[11px] text-v-muted2">
            API keys grant full access to your account. Keep them secret.
            Free: 3 &nbsp;·&nbsp; Pro: 20 &nbsp;·&nbsp; Enterprise: unlimited.
          </div>

          {/* revealed key one-time display */}
          {revealedKey && (
            <div className="bg-acid/5 border border-acid/20 rounded-sm p-3">
              <div className="font-mono text-[10px] text-acid mb-1 uppercase tracking-wider">
                ✓ Key created — copy now, it won&apos;t be shown again
              </div>
              <div className="font-mono text-[11px] text-v-muted2 mb-0.5">{revealedKeyName}</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-[12px] text-foreground bg-v-bg2 px-2 py-1.5 rounded-sm border border-v-border2 break-all">
                  {revealedKey}
                </code>
                <CopyBtn text={revealedKey} />
              </div>
              <button
                onClick={() => setRevealedKey(null)}
                className="mt-2 font-mono text-[10px] text-v-muted2 hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* create new key */}
          <div className="flex gap-2">
            <input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. CI Pipeline)"
              className="flex-1 font-mono text-[13px] bg-background border border-v-border2 rounded-sm px-3 py-2.5 text-foreground placeholder:text-v-muted2 focus:outline-none focus:border-acid/50 transition-colors"
              onKeyDown={e => e.key === "Enter" && handleCreateKey()}
            />
            <Btn onClick={handleCreateKey} disabled={newKeyCreating || !newKeyName.trim()}>
              {newKeyCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Generate
            </Btn>
          </div>
          {keyMsg && <Toast {...keyMsg} />}

          {/* key list */}
          {keysLoading ? (
            <Loader2 className="w-4 h-4 text-acid animate-spin" />
          ) : keys.length === 0 ? (
            <div className="font-mono text-[11px] text-v-muted2">No API keys yet.</div>
          ) : (
            <div className="space-y-2">
              {keys.map(k => (
                <div key={k.id} className="flex items-center justify-between gap-3 bg-background border border-v-border2 rounded-sm px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="font-mono text-[12px] text-foreground">{k.name}</div>
                    <div className="font-mono text-[10.5px] text-v-muted2">
                      vk_live_{k.key_prefix}•••• &nbsp;·&nbsp;
                      Created {new Date(k.created_at).toLocaleDateString()} &nbsp;·&nbsp;
                      {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : "Never used"}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeKey(k.id)}
                    className="font-mono text-[10px] tracking-wider text-v-red hover:text-v-red/70 transition-colors shrink-0"
                    title="Revoke"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── 4. Connected Accounts ──────────────────────────── */}
      <SectionLabel>Connected Accounts</SectionLabel>
      <Card>
        <div className="space-y-3">
          {[
            { id: "github", label: "GitHub",  Icon: Github },
            { id: "google", label: "Google",  Icon: GoogleIcon },
          ].map(({ id, label, Icon }) => {
            const connected = providers.includes(id);
            return (
              <div key={id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-v-muted" />
                  <span className="font-mono text-[12px] text-foreground">{label}</span>
                </div>
                {connected ? (
                  <span className="font-mono text-[10px] tracking-wider text-acid flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-v-muted2">Not connected</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── 5. Referral ────────────────────────────────────── */}
      <SectionLabel>Referral</SectionLabel>
      <Card>
        <div className="space-y-3">
          <div className="font-mono text-[12.5px] font-semibold text-foreground">
            Earn 20% recurring commission
          </div>
          <div className="font-mono text-[11px] text-v-muted2">
            You earn 20% of every payment from users you refer, forever.
          </div>
          {refCode && (
            <>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-[12px] text-foreground bg-background border border-v-border2 px-3 py-2.5 rounded-sm truncate">
                  {refLink}
                </code>
                <button
                  onClick={() => copyRef(refLink)}
                  className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-widest px-3 py-2.5 rounded-sm border border-v-border text-foreground hover:border-white/20 transition-all shrink-0"
                >
                  {refCopied ? <Check className="w-3.5 h-3.5 text-acid" /> : <Copy className="w-3.5 h-3.5" />}
                  {refCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <a
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-widest border border-v-border text-foreground px-4 py-2.5 rounded-sm hover:border-white/20 hover:-translate-y-0.5 transition-all"
              >
                <Twitter className="w-3.5 h-3.5" />
                Share on Twitter
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            </>
          )}
        </div>
      </Card>

      {/* ── 6. Notification Settings ───────────────────────── */}
      <SectionLabel>Notifications</SectionLabel>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[12px] text-foreground">Alert preferences</div>
            <div className="font-mono text-[11px] text-v-muted2 mt-0.5">Sentinel alerts, scan digests, product updates</div>
          </div>
          <a
            href="/settings/notifications"
            className="font-mono text-[10.5px] tracking-widest border border-v-border text-foreground px-3 py-2 rounded-sm hover:border-white/20 transition-all"
          >
            Configure →
          </a>
        </div>
      </Card>

      {/* ── 7. Data & Privacy ──────────────────────────────── */}
      <SectionLabel>Data &amp; Privacy</SectionLabel>
      <Card>
        <div className="space-y-3">
          <div className="font-mono text-[11.5px] text-v-muted leading-relaxed">
            Scan retention: <span className="text-foreground">{tier === "free" ? "7 days (Free)" : tier === "pro" ? "30 days (Pro)" : "90 days (Enterprise)"}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <a href="/privacy" className="font-mono text-[11px] text-v-muted2 hover:text-acid transition-colors underline underline-offset-2">Privacy Policy</a>
            <span className="text-v-border2">·</span>
            <a href="/terms"   className="font-mono text-[11px] text-v-muted2 hover:text-acid transition-colors underline underline-offset-2">Terms of Service</a>
          </div>
        </div>
      </Card>

      {/* ── 8. Danger Zone ─────────────────────────────────── */}
      <SectionLabel>Danger Zone</SectionLabel>
      <Card red>
        <div className="space-y-5">

          {/* Sign out */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-mono text-[12px] text-foreground">Sign out</div>
              <div className="font-mono text-[11px] text-v-muted2 mt-0.5">Sign out of this device</div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-widest px-4 py-2.5 rounded-sm border border-v-red/30 text-v-red hover:bg-v-red/10 hover:border-v-red/50 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </form>
          </div>

          <div className="border-t border-v-red/10" />

          {/* Delete account */}
          <div>
            <div className="font-mono text-[12px] text-foreground mb-1">Delete account</div>
            <div className="font-mono text-[11px] text-v-muted2 mb-3 leading-relaxed">
              Permanently deletes your account, all scans, API keys, and billing data.
              This action is <span className="text-v-red font-semibold">irreversible</span>.
            </div>
            <div className="space-y-2">
              <Label>Type <span className="text-v-red font-bold">DELETE</span> to confirm</Label>
              <Input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="border-v-red/20 focus:border-v-red/50"
              />
              <Btn
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== "DELETE"}
                variant="danger"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete my account
              </Btn>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── small helpers ────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      onClick={() => copy(text)}
      className="flex items-center gap-1 font-mono text-[10px] tracking-wider px-2.5 py-1.5 rounded-sm border border-v-border text-foreground hover:border-white/20 transition-all shrink-0"
    >
      {copied ? <Check className="w-3 h-3 text-acid" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
