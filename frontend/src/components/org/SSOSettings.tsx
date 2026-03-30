"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import {
  Shield, ArrowLeft, Plus, Trash2, Loader2, CheckCircle2,
  XCircle, AlertTriangle, Save, RefreshCw, Key, Globe
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import VulnraLogo from "@/components/VulnraLogo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://vulnra-production.up.railway.app";

interface SSOConfig {
  id: string;
  provider_type: string;
  provider_name: string;
  idp_entity_id: string;
  idp_sso_url: string;
  enabled: boolean;
  allowed_domains: string[];
}

interface SSOIdentity {
  id: string;
  email: string;
  name: string;
  idp_subject: string;
  first_login_at: string;
  last_login_at: string;
}

const PROVIDER_OPTIONS = [
  { value: "okta", label: "Okta" },
  { value: "azure", label: "Microsoft Azure AD" },
  { value: "google", label: "Google Workspace" },
  { value: "onelogin", label: "OneLogin" },
  { value: "pingidentity", label: "Ping Identity" },
  { value: "generic_saml", label: "Generic SAML 2.0" },
  { value: "generic_oidc", label: "Generic OIDC" },
];

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

export default function SSOSettings({ user }: { user: User }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<SSOConfig[]>([]);
  const [identities, setIdentities] = useState<SSOIdentity[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    provider_type: "saml",
    provider_name: "",
    idp_entity_id: "",
    idp_sso_url: "",
    idp_certificate: "",
    idp_logout_url: "",
    client_id: "",
    client_secret: "",
    scopes: "openid email profile",
    allowed_domains: "",
  });

  const getSupabase = () => createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      const [configsData, identitiesData] = await Promise.all([
        apiFetch("/api/org/sso", session.access_token),
        apiFetch("/api/org/sso/identities", session.access_token).catch(() => ({ identities: [] })),
      ]);

      setConfigs(configsData.configs || []);
      setIdentities(identitiesData.identities || []);
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

      const payload = {
        ...formData,
        allowed_domains: formData.allowed_domains
          .split(",")
          .map(d => d.trim())
          .filter(Boolean),
      };

      await apiFetch("/api/org/sso", session.access_token, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setShowForm(false);
      setFormData({
        provider_type: "saml",
        provider_name: "",
        idp_entity_id: "",
        idp_sso_url: "",
        idp_certificate: "",
        idp_logout_url: "",
        client_id: "",
        client_secret: "",
        scopes: "openid email profile",
        allowed_domains: "",
      });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(config: SSOConfig) {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      await apiFetch(`/api/org/sso/${config.id}`, session.access_token, {
        method: "PUT",
        body: JSON.stringify({ enabled: !config.enabled }),
      });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(config: SSOConfig) {
    if (!confirm(`Delete ${config.provider_name} SSO configuration?`)) return;

    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      await apiFetch(`/api/org/sso/${config.id}`, session.access_token, {
        method: "DELETE",
      });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleTest(config: SSOConfig) {
    setTesting(config.id);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      const result = await apiFetch(`/api/org/sso/${config.id}/test`, session.access_token, {
        method: "POST",
      });

      if (result.success) {
        alert(`Connection successful: ${result.message}`);
      } else {
        alert(`Connection failed: ${result.message}`);
      }
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  }

  const tier = (user.user_metadata?.tier || "free").toLowerCase();

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
          <a href="/org" className="flex items-center gap-2 text-[10px] font-mono text-v-muted2 hover:text-acid">
            <ArrowLeft className="w-3 h-3" /> BACK TO ORG
          </a>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Shield className="w-12 h-12 text-v-muted mx-auto mb-4" />
            <h1 className="text-lg font-bold text-foreground mb-2">Pro or Enterprise Required</h1>
            <p className="text-sm text-v-muted2">
              SSO is available on Pro and Enterprise plans. Upgrade to enable single sign-on.
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
          <a href="/org" className="flex items-center gap-2 text-[10px] font-mono text-v-muted2 hover:text-acid">
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
              <Shield className="w-5 h-5 text-acid" />
              Single Sign-On (SSO)
            </h1>
            <p className="text-xs text-v-muted2 mt-1">
              Configure SAML 2.0 or OIDC providers for your organization
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-acid text-black text-xs font-mono hover:bg-acid/90"
            >
              <Plus className="w-3 h-3" /> ADD PROVIDER
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
            <h2 className="text-sm font-bold text-foreground mb-4">New SSO Configuration</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-v-muted2 mb-1">PROVIDER TYPE</label>
                  <select
                    value={formData.provider_type}
                    onChange={e => setFormData({ ...formData, provider_type: e.target.value })}
                    className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                  >
                    <option value="saml">SAML 2.0</option>
                    <option value="oidc">OIDC / OAuth 2.0</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-v-muted2 mb-1">PROVIDER</label>
                  <select
                    value={formData.provider_name}
                    onChange={e => setFormData({ ...formData, provider_name: e.target.value })}
                    className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                    required
                  >
                    <option value="">Select provider...</option>
                    {PROVIDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.provider_type === "saml" ? (
                <>
                  <div>
                    <label className="block text-[10px] font-mono text-v-muted2 mb-1">IDP ENTITY ID / ISSUER</label>
                    <input
                      type="text"
                      value={formData.idp_entity_id}
                      onChange={e => setFormData({ ...formData, idp_entity_id: e.target.value })}
                      placeholder="https://your-idp.example.com"
                      className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-v-muted2 mb-1">IDP SSO URL</label>
                    <input
                      type="text"
                      value={formData.idp_sso_url}
                      onChange={e => setFormData({ ...formData, idp_sso_url: e.target.value })}
                      placeholder="https://your-idp.example.com/sso/saml"
                      className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-v-muted2 mb-1">IDP CERTIFICATE (PEM)</label>
                    <textarea
                      value={formData.idp_certificate}
                      onChange={e => setFormData({ ...formData, idp_certificate: e.target.value })}
                      placeholder="-----BEGIN CERTIFICATE-----..."
                      rows={4}
                      className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-mono text-v-muted2 mb-1">ISSUER URL</label>
                    <input
                      type="text"
                      value={formData.idp_entity_id}
                      onChange={e => setFormData({ ...formData, idp_entity_id: e.target.value })}
                      placeholder="https://your-idp.example.com"
                      className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-v-muted2 mb-1">AUTHORIZATION URL</label>
                    <input
                      type="text"
                      value={formData.idp_sso_url}
                      onChange={e => setFormData({ ...formData, idp_sso_url: e.target.value })}
                      placeholder="https://your-idp.example.com/oauth/authorize"
                      className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-v-muted2 mb-1">CLIENT ID</label>
                      <input
                        type="text"
                        value={formData.client_id}
                        onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                        className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-v-muted2 mb-1">CLIENT SECRET</label>
                      <input
                        type="password"
                        value={formData.client_secret}
                        onChange={e => setFormData({ ...formData, client_secret: e.target.value })}
                        className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-mono text-v-muted2 mb-1">ALLOWED DOMAINS (comma-separated)</label>
                <input
                  type="text"
                  value={formData.allowed_domains}
                  onChange={e => setFormData({ ...formData, allowed_domains: e.target.value })}
                  placeholder="example.com, company.com"
                  className="w-full bg-v-bg2 border border-v-border text-foreground text-xs px-3 py-2 rounded-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-acid text-black text-xs font-mono hover:bg-acid/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  SAVE CONFIG
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

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-foreground">Configured Providers</h2>
          {configs.length === 0 ? (
            <div className="p-8 border border-dashed border-v-border text-center">
              <Shield className="w-8 h-8 text-v-muted mx-auto mb-2" />
              <p className="text-xs text-v-muted2">No SSO providers configured</p>
            </div>
          ) : (
            configs.map(config => (
              <div key={config.id} className="p-4 border border-v-border2 bg-v-bg1 rounded-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded flex items-center justify-center",
                      config.enabled ? "bg-acid/10" : "bg-v-border"
                    )}>
                      {config.enabled ? (
                        <CheckCircle2 className="w-4 h-4 text-acid" />
                      ) : (
                        <XCircle className="w-4 h-4 text-v-muted2" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        {PROVIDER_OPTIONS.find(p => p.value === config.provider_name)?.label || config.provider_name}
                      </h3>
                      <p className="text-[10px] text-v-muted2">
                        {config.provider_type.toUpperCase()} • {config.enabled ? "ENABLED" : "DISABLED"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(config)}
                      disabled={testing === config.id}
                      className="flex items-center gap-1.5 px-2 py-1 border border-v-border text-[10px] font-mono text-v-muted2 hover:text-foreground hover:border-white/20"
                    >
                      <RefreshCw className={cn("w-3 h-3", testing === config.id && "animate-spin")} />
                      TEST
                    </button>
                    <button
                      onClick={() => handleToggle(config)}
                      className={cn(
                        "px-2 py-1 text-[10px] font-mono border",
                        config.enabled
                          ? "border-v-red/30 text-v-red hover:bg-v-red/10"
                          : "border-acid/30 text-acid hover:bg-acid/10"
                      )}
                    >
                      {config.enabled ? "DISABLE" : "ENABLE"}
                    </button>
                    <button
                      onClick={() => handleDelete(config)}
                      className="flex items-center gap-1.5 px-2 py-1 border border-v-red/30 text-[10px] font-mono text-v-red hover:bg-v-red/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {config.allowed_domains?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-v-border">
                    <p className="text-[10px] text-v-muted2 mb-1">Allowed domains:</p>
                    <div className="flex flex-wrap gap-1">
                      {config.allowed_domains.map(domain => (
                        <span key={domain} className="px-2 py-0.5 bg-v-bg2 text-[10px] text-v-muted">
                          @{domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {identities.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-bold text-foreground mb-4">Linked Accounts</h2>
            <div className="space-y-2">
              {identities.map(identity => (
                <div key={identity.id} className="p-3 border border-v-border2 bg-v-bg1 rounded-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-v-border flex items-center justify-center">
                      <Key className="w-4 h-4 text-v-muted2" />
                    </div>
                    <div>
                      <p className="text-xs text-foreground">{identity.email || identity.name || identity.idp_subject}</p>
                      <p className="text-[10px] text-v-muted2">
                        Last login: {identity.last_login_at ? new Date(identity.last_login_at).toLocaleString() : "Never"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
