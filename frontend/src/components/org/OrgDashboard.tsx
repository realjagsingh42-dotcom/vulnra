"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import {
  Shield, LogOut, Server, Key, Radio, History, Database,
  Users, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, Building2, Crown, UserCircle, Clock, Filter,
  RefreshCw, Loader2, Mail
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://vulnra-production.up.railway.app";

interface OrgInfo {
  id: string;
  name: string;
  owner_id: string;
  tier: string;
  created_at: string;
  your_role: string;
}

interface Member {
  user_id: string;
  role: string;
  joined_at?: string;
}

interface PendingInvite {
  email: string;
  role: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_id: string;
  ip_address: string;
  created_at: string;
  metadata: Record<string, any>;
}

type Tab = "members" | "audit";

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

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn(
      "text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase",
      role === "admin"
        ? "border-acid/40 bg-acid/10 text-acid"
        : "border-v-border text-v-muted2"
    )}>
      {role}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  const color =
    action.startsWith("member.removed") || action.startsWith("api_key.revoked")
      ? "border-red-400/30 text-red-400"
      : action.startsWith("member.invited") || action.startsWith("org.")
      ? "border-acid/30 text-acid"
      : action.startsWith("scan.")
      ? "border-blue-400/30 text-blue-400"
      : "border-v-border text-v-muted2";
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${color}`}>
      {action}
    </span>
  );
}

export default function OrgDashboard({ user }: { user: User }) {
  const [token, setToken] = useState<string>("");
  const [tier, setTier] = useState<string>("free");
  const [tab, setTab] = useState<Tab>("members");
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session
  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);

      // Load tier
      try {
        const d = await apiFetch("/billing/subscription", session.access_token);
        setTier(d.tier || "free");
      } catch {}

      // Load org
      try {
        const d = await apiFetch("/api/org", session.access_token);
        setOrg(d);
      } catch (e: any) {
        if (!e.message.includes("404")) setError(e.message);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const loadMembers = useCallback(async () => {
    if (!token || !org) return;
    try {
      const d = await apiFetch("/api/org/members", token);
      setMembers(d.members || []);
      setPendingInvites(d.pending_invites || []);
    } catch {}
  }, [token, org]);

  const loadAuditLogs = useCallback(async () => {
    if (!token || !org) return;
    try {
      const params = new URLSearchParams({
        limit: "50",
        offset: String(auditOffset),
      });
      if (actionFilter) params.set("action_filter", actionFilter);
      const d = await apiFetch(`/api/audit-logs?${params}`, token);
      setAuditLogs(d.logs || []);
      setAuditTotal(d.total || 0);
    } catch (e: any) {
      setError(e.message);
    }
  }, [token, org, auditOffset, actionFilter]);

  useEffect(() => {
    if (org) {
      loadMembers();
    }
  }, [org, loadMembers]);

  useEffect(() => {
    if (tab === "audit" && org) {
      loadAuditLogs();
    }
  }, [tab, org, loadAuditLogs]);

  const handleCreateOrg = async () => {
    if (!orgName.trim() || !token) return;
    setCreatingOrg(true);
    setError(null);
    try {
      const d = await apiFetch("/api/org", token, {
        method: "POST",
        body: JSON.stringify({ name: orgName.trim() }),
      });
      setOrg({ id: d.id, name: d.name, owner_id: user.id, tier: d.tier, created_at: new Date().toISOString(), your_role: "admin" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !token) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      await apiFetch("/api/org/invite", token, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteMsg(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      loadMembers();
    } catch (e: any) {
      setInviteMsg(`Error: ${e.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!token) return;
    try {
      await apiFetch(`/api/org/members/${memberUserId}`, token, { method: "DELETE" });
      setMembers(m => m.filter(x => x.user_id !== memberUserId));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const isAdmin = org?.your_role === "admin";

  // ── Not enterprise ──────────────────────────────────────────────────────────
  if (!loading && tier !== "enterprise") {
    return (
      <div className="flex flex-col h-screen bg-background font-sans items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-lg bg-acid/10 border border-acid/20 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-acid/60" />
          </div>
          <h2 className="font-mono text-lg font-bold text-white">Enterprise Feature</h2>
          <p className="text-sm text-v-muted leading-relaxed">
            Organization management, audit logs, and team collaboration require an
            Enterprise plan.
          </p>
          <a href="/billing" className="inline-flex items-center gap-2 bg-acid text-black font-mono text-xs font-bold px-4 py-2 rounded hover:bg-acid/90 transition-colors">
            Upgrade to Enterprise
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
      {/* Top Nav */}
      <nav className="h-13 bg-v-bg1 border-b border-v-border2 flex items-center justify-between px-5 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-sm font-bold tracking-wider">
            <div className="w-6 h-6 rounded bg-acid flex items-center justify-center">
              <Shield className="w-3 h-3 text-black" />
            </div>
            VULNRA <em className="text-acid not-italic tracking-tighter ml-1">PLATFORM</em>
          </div>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/scanner" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors"><Shield className="w-3.5 h-3.5" />SCANNER</a>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/mcp-scanner" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors"><Server className="w-3.5 h-3.5" />AGENT_SECURITY</a>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/rag-scanner" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors"><Database className="w-3.5 h-3.5" />RAG_SECURITY</a>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/org" className="flex items-center gap-1.5 font-mono text-[10px] text-acid tracking-wider"><Building2 className="w-3.5 h-3.5" />ORG</a>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/settings/api-keys" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors"><Key className="w-3.5 h-3.5" />API_KEYS</a>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/monitor" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors"><Radio className="w-3.5 h-3.5" />SENTINEL</a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-acid bg-acid/10 border border-acid/30 px-2.5 py-1 rounded-sm">ENTERPRISE</span>
          <span className="text-[11px] text-v-muted truncate max-w-[160px]">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-1.5 text-[10px] font-mono text-v-muted2 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />LOGOUT
            </button>
          </form>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-acid" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded text-xs font-mono text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* No org yet */}
        {!loading && !org && (
          <div className="p-6 bg-v-bg1 border border-v-border2 rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-acid" />
              <h2 className="font-mono text-sm font-bold text-white tracking-wider">CREATE ORGANIZATION</h2>
            </div>
            <p className="text-xs text-v-muted leading-relaxed">
              Set up your team workspace to manage members, view shared scans, and access audit logs.
            </p>
            <div className="flex gap-3">
              <input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Organization name"
                className="flex-1 bg-v-bg2 border border-v-border text-white text-xs font-mono px-3 py-2 rounded focus:outline-none focus:border-acid/50 placeholder:text-v-muted2"
                onKeyDown={e => e.key === "Enter" && handleCreateOrg()}
              />
              <button
                onClick={handleCreateOrg}
                disabled={creatingOrg || !orgName.trim()}
                className="flex items-center gap-2 bg-acid text-black font-mono text-xs font-bold px-4 py-2 rounded hover:bg-acid/90 disabled:opacity-50"
              >
                {creatingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                CREATE
              </button>
            </div>
          </div>
        )}

        {/* Org header */}
        {org && (
          <>
            <div className="p-4 bg-v-bg1 border border-v-border2 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-acid/15 border border-acid/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-acid" />
                </div>
                <div>
                  <h1 className="font-mono text-sm font-bold text-white">{org.name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-v-muted">ID: {org.id.slice(0, 8)}…</span>
                    <RoleBadge role={org.your_role} />
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-mono text-v-muted">
                Created {new Date(org.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-v-border2">
              {(["members", "audit"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-mono tracking-wider border-b-2 -mb-[2px] transition-colors",
                    tab === t
                      ? "border-acid text-acid"
                      : "border-transparent text-v-muted2 hover:text-v-muted"
                  )}
                >
                  {t === "members" ? "MEMBERS" : "AUDIT LOG"}
                </button>
              ))}
            </div>

            {/* Members tab */}
            {tab === "members" && (
              <div className="space-y-4">
                {/* Invite form (admin only) */}
                {isAdmin && (
                  <div className="p-4 bg-v-bg1 border border-v-border2 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-acid" />
                      <h3 className="font-mono text-xs font-bold text-white tracking-wider">INVITE MEMBER</h3>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="flex-1 bg-v-bg2 border border-v-border text-white text-xs font-mono px-3 py-2 rounded focus:outline-none focus:border-acid/50 placeholder:text-v-muted2"
                      />
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as "member" | "admin")}
                        className="bg-v-bg2 border border-v-border text-white text-xs font-mono px-2 py-2 rounded focus:outline-none focus:border-acid/50"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={handleInvite}
                        disabled={inviting || !inviteEmail.trim()}
                        className="flex items-center gap-1.5 bg-acid text-black font-mono text-xs font-bold px-3 py-2 rounded hover:bg-acid/90 disabled:opacity-50"
                      >
                        {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        INVITE
                      </button>
                    </div>
                    {inviteMsg && (
                      <p className={`text-[10px] font-mono ${inviteMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                        {inviteMsg}
                      </p>
                    )}
                  </div>
                )}

                {/* Members list */}
                <div className="bg-v-bg1 border border-v-border2 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-v-border2 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-acid" />
                    <span className="font-mono text-xs font-bold text-white tracking-wider">
                      MEMBERS ({members.length})
                    </span>
                  </div>
                  <div className="divide-y divide-v-border">
                    {members.length === 0 && (
                      <div className="px-4 py-6 text-center text-xs text-v-muted">No members yet.</div>
                    )}
                    {members.map(m => (
                      <div key={m.user_id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-v-muted2" />
                          <span className="text-xs font-mono text-v-muted">{m.user_id.slice(0, 12)}…</span>
                          {m.user_id === user.id && (
                            <span className="text-[9px] font-mono text-acid">(you)</span>
                          )}
                          {m.user_id === org.owner_id && (
                            <Crown className="w-3 h-3 text-acid" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={m.role} />
                          {isAdmin && m.user_id !== user.id && (
                            <button
                              onClick={() => handleRemoveMember(m.user_id)}
                              className="text-v-muted2 hover:text-red-400 transition-colors p-1 rounded"
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending invites */}
                {pendingInvites.length > 0 && (
                  <div className="bg-v-bg1 border border-v-border2 rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-v-border2 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-v-muted2" />
                      <span className="font-mono text-xs font-bold text-white tracking-wider">
                        PENDING INVITES ({pendingInvites.length})
                      </span>
                    </div>
                    <div className="divide-y divide-v-border">
                      {pendingInvites.map((inv, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3">
                          <span className="text-xs font-mono text-v-muted">{inv.email}</span>
                          <div className="flex items-center gap-2">
                            <RoleBadge role={inv.role} />
                            <span className="text-[9px] font-mono text-v-muted2">
                              {new Date(inv.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audit log tab */}
            {tab === "audit" && isAdmin && (
              <div className="space-y-3">
                {/* Filters */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <Filter className="w-3.5 h-3.5 text-v-muted2" />
                    <input
                      value={actionFilter}
                      onChange={e => { setActionFilter(e.target.value); setAuditOffset(0); }}
                      placeholder="Filter by action prefix (e.g. scan., member.)"
                      className="flex-1 bg-v-bg2 border border-v-border text-white text-xs font-mono px-3 py-1.5 rounded focus:outline-none focus:border-acid/50 placeholder:text-v-muted2"
                    />
                  </div>
                  <button
                    onClick={loadAuditLogs}
                    className="flex items-center gap-1.5 text-[10px] font-mono text-v-muted2 hover:text-acid transition-colors border border-v-border px-2.5 py-1.5 rounded"
                  >
                    <RefreshCw className="w-3 h-3" />REFRESH
                  </button>
                </div>

                {/* Log table */}
                <div className="bg-v-bg1 border border-v-border2 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-v-border2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-acid" />
                      <span className="font-mono text-xs font-bold text-white tracking-wider">
                        AUDIT LOG ({auditTotal} events)
                      </span>
                    </div>
                  </div>

                  {auditLogs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-v-muted">No audit logs found.</div>
                  ) : (
                    <div className="divide-y divide-v-border overflow-x-auto">
                      {auditLogs.map(log => (
                        <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                          <div className="w-32 shrink-0">
                            <span className="text-[9px] font-mono text-v-muted2">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="w-32 shrink-0">
                            <ActionBadge action={log.action} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-mono text-v-muted truncate block">
                              {log.user_id?.slice(0, 8)}… → {log.resource_id || "—"}
                            </span>
                          </div>
                          <div className="w-24 shrink-0 text-right">
                            <span className="text-[9px] font-mono text-v-muted2">{log.ip_address || "—"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {auditTotal > 50 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-v-border2">
                      <button
                        onClick={() => setAuditOffset(Math.max(0, auditOffset - 50))}
                        disabled={auditOffset === 0}
                        className="text-[10px] font-mono text-v-muted2 hover:text-acid disabled:opacity-30 transition-colors"
                      >
                        ← PREV
                      </button>
                      <span className="text-[10px] font-mono text-v-muted">
                        {auditOffset + 1}–{Math.min(auditOffset + 50, auditTotal)} of {auditTotal}
                      </span>
                      <button
                        onClick={() => setAuditOffset(auditOffset + 50)}
                        disabled={auditOffset + 50 >= auditTotal}
                        className="text-[10px] font-mono text-v-muted2 hover:text-acid disabled:opacity-30 transition-colors"
                      >
                        NEXT →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "audit" && !isAdmin && (
              <div className="p-6 text-center text-xs text-v-muted">
                Audit logs are only visible to organization admins.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
