"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import {
  LogOut, Server, Key, Radio, History, Database, Shield,
  Plus, Trash2, Loader2, Lock, AlertTriangle
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/utils/supabase/client";
import RAGScanResults from "./RAGScanResults";
import VulnraLogo from "@/components/VulnraLogo";

interface AuthHeader { key: string; value: string; }
interface TenantCred  { headers: Record<string, string>; }

interface RAGScanResult {
  id: string;
  status: string;
  scan_duration: number;
  risk_score: number;
  corpus_poisoning_rate: number;
  cross_tenant_leakage: boolean;
  unauthenticated_ingestion: boolean;
  embedding_vectors_exposed: boolean;
  findings: RAGFinding[];
  probes_run: string[];
  error?: string;
}

interface RAGFinding {
  id: string;
  probe_id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  evidence: string;
  remediation: string;
  owasp_llm_category: string;
  hit_rate: number;
  fix_effort: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://vulnra-production.up.railway.app";
const POLL_INTERVAL = 3000;

const PROBE_DESCRIPTIONS: Record<string, string> = {
  "RAG-01": "Corpus Poisoning — inject canary documents in 5 formats",
  "RAG-02": "Cross-Tenant Leakage — multi-tenant isolation check (Enterprise)",
  "RAG-03": "Query Injection — 5 injection vectors via retrieval queries",
  "RAG-04": "Unauthenticated Ingestion — test auth controls on ingestion endpoint",
  "RAG-05": "Embedding Leakage — inspect responses for vectors, PII, internal IDs",
};

const TIER_PROBES: Record<string, string[]> = {
  free:       ["RAG-04"],
  pro:        ["RAG-01", "RAG-03", "RAG-04", "RAG-05"],
  enterprise: ["RAG-01", "RAG-02", "RAG-03", "RAG-04", "RAG-05"],
};

export default function RAGScanner({ user }: { user: User }) {
  const [tier, setTier] = useState<string>("free");
  const [retrievalUrl, setRetrievalUrl] = useState("");
  const [ingestionUrl, setIngestionUrl] = useState("");
  const [llmUrl, setLlmUrl] = useState("");
  const [authHeaders, setAuthHeaders] = useState<AuthHeader[]>([{ key: "Authorization", value: "" }]);
  const [tenantCreds, setTenantCreds] = useState<TenantCred[]>([]);
  const [useCase, setUseCase] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<RAGScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

  // Load tier on mount
  useState(() => {
    const sb = createClient();
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try {
        const res = await fetch(`${API_BASE}/billing/subscription`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const d = await res.json();
          setTier(d.tier || "free");
        }
      } catch {}
    });
  });

  const availableProbes = TIER_PROBES[tier] || TIER_PROBES.free;

  const addAuthHeader = () =>
    setAuthHeaders(h => [...h, { key: "", value: "" }]);

  const removeAuthHeader = (i: number) =>
    setAuthHeaders(h => h.filter((_, idx) => idx !== i));

  const updateAuthHeader = (i: number, field: "key" | "value", val: string) =>
    setAuthHeaders(h => h.map((x, idx) => idx === i ? { ...x, [field]: val } : x));

  const addTenantCred = () =>
    setTenantCreds(c => [...c, { headers: { Authorization: "" } }]);

  const removeTenantCred = (i: number) =>
    setTenantCreds(c => c.filter((_, idx) => idx !== i));

  const updateTenantCred = (i: number, val: string) =>
    setTenantCreds(c => c.map((x, idx) => idx === i ? { headers: { Authorization: val } } : x));

  const startScan = async () => {
    if (!retrievalUrl.trim()) return;
    setScanError(null);
    setScanResult(null);
    setIsScanning(true);
    setStatusMsg("Submitting scan request…");

    const sb = createClient();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { setIsScanning(false); setScanError("Not authenticated."); return; }

    const body: Record<string, any> = {
      retrieval_endpoint: retrievalUrl.trim(),
    };
    if (ingestionUrl.trim()) body.ingestion_endpoint = ingestionUrl.trim();
    if (llmUrl.trim())       body.llm_endpoint = llmUrl.trim();
    if (useCase.trim())      body.use_case = useCase.trim();

    const validHeaders = authHeaders.filter(h => h.key.trim() && h.value.trim());
    if (validHeaders.length > 0) body.auth_headers = validHeaders;

    if (tier === "enterprise" && tenantCreds.length >= 2) {
      body.tenant_credentials = tenantCreds.map(c => ({ headers: c.headers }));
    }

    try {
      const res = await fetch(`${API_BASE}/api/scan/rag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Scan request failed");
      }

      const data = await res.json();
      const id = data.scan_id;
      setScanId(id);
      setStatusMsg(`Scan started — ${data.probe_count} probe(s) running…`);

      // Poll
      const poll = setInterval(async () => {
        try {
          const pr = await fetch(`${API_BASE}/api/scan/rag/${id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (!pr.ok) return;
          const pd = await pr.json();
          if (pd.status === "complete" || pd.status === "failed") {
            clearInterval(poll);
            setIsScanning(false);
            setScanResult(pd);
            setStatusMsg("");
          } else {
            setStatusMsg(`Scanning… probes: ${(pd.probes_run || []).join(", ") || "running"}`);
          }
        } catch (e) {
          // ignore transient errors
        }
      }, POLL_INTERVAL);

    } catch (e: any) {
      setIsScanning(false);
      setScanError(e.message || "Unknown error");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden selection:bg-acid selection:text-black font-sans">
      {/* Top Nav */}
      <nav className="h-13 bg-v-bg1 border-b border-v-border2 flex items-center justify-between px-5 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <VulnraLogo suffix="PLATFORM" />
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/scanner" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors">
            <Shield className="w-3.5 h-3.5" />SCANNER
          </a>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/mcp-scanner" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors">
            <Server className="w-3.5 h-3.5" />AGENT_SECURITY
          </a>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/rag-scanner" className="flex items-center gap-1.5 font-mono text-[10px] text-acid tracking-wider">
            <Database className="w-3.5 h-3.5" />RAG_SECURITY
          </a>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/scanner/history" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors">
            <History className="w-3.5 h-3.5" />HISTORY
          </a>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/settings/api-keys" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors">
            <Key className="w-3.5 h-3.5" />API_KEYS
          </a>
          <div className="h-5 w-[1px] bg-v-border mx-2" />
          <a href="/monitor" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors">
            <Radio className="w-3.5 h-3.5" />SENTINEL
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-v-muted bg-white/5 border border-v-border px-2.5 py-1 rounded-sm uppercase">
            {tier}
          </span>
          <span className="text-[11px] text-v-muted truncate max-w-[160px]">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-1.5 text-[10px] font-mono text-v-muted2 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />LOGOUT
            </button>
          </form>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left config panel */}
        <div className="w-[380px] shrink-0 border-r border-v-border2 bg-v-bg1 flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-v-border2">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-acid" />
              <h1 className="font-mono text-sm font-bold tracking-wider text-white">RAG SECURITY SCANNER</h1>
            </div>
            <p className="text-[11px] text-v-muted leading-relaxed">
              Probe RAG pipelines for corpus poisoning, cross-tenant leakage, query injection,
              unauthenticated ingestion, and embedding vector exposure.
            </p>
          </div>

          <div className="p-5 space-y-5 flex-1">
            {/* Probes available */}
            <div>
              <div className="text-[10px] font-mono text-v-muted2 tracking-wider mb-2">
                ACTIVE PROBES ({availableProbes.length}/5)
              </div>
              <div className="space-y-1.5">
                {(["RAG-01","RAG-02","RAG-03","RAG-04","RAG-05"] as const).map(probe => {
                  const active = availableProbes.includes(probe);
                  return (
                    <div key={probe} className={`flex items-start gap-2 p-2 rounded text-[10px] font-mono border ${
                      active
                        ? "border-acid/30 bg-acid/5 text-v-muted"
                        : "border-v-border bg-v-bg2/50 text-v-muted2/50"
                    }`}>
                      <span className={`mt-0.5 shrink-0 ${active ? "text-acid" : "text-v-muted2/30"}`}>
                        {active ? "▶" : "○"}
                      </span>
                      <span>
                        <span className={active ? "text-white" : ""}>{probe}</span>
                        <span className="ml-1 text-[9px]">{PROBE_DESCRIPTIONS[probe]?.split("—")[0].trim()}</span>
                        {!active && probe === "RAG-02" && (
                          <span className="ml-1 text-v-muted2/40">(Enterprise)</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Retrieval Endpoint */}
            <div>
              <label className="block text-[10px] font-mono text-v-muted2 tracking-wider mb-1.5">
                RETRIEVAL ENDPOINT <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={retrievalUrl}
                onChange={e => setRetrievalUrl(e.target.value)}
                placeholder="https://api.yourapp.com/rag/query"
                className="w-full bg-v-bg2 border border-v-border text-white text-xs font-mono px-3 py-2 rounded focus:outline-none focus:border-acid/50 placeholder:text-v-muted2"
              />
              <p className="text-[10px] text-v-muted mt-1">
                POST endpoint that accepts <code className="text-acid">&#123;"query": "..."&#125;</code>
              </p>
            </div>

            {/* Ingestion Endpoint */}
            <div>
              <label className="block text-[10px] font-mono text-v-muted2 tracking-wider mb-1.5">
                INGESTION ENDPOINT <span className="text-v-muted2">(optional)</span>
              </label>
              <input
                type="url"
                value={ingestionUrl}
                onChange={e => setIngestionUrl(e.target.value)}
                placeholder="https://api.yourapp.com/rag/ingest"
                className="w-full bg-v-bg2 border border-v-border text-white text-xs font-mono px-3 py-2 rounded focus:outline-none focus:border-acid/50 placeholder:text-v-muted2"
              />
              <p className="text-[10px] text-v-muted mt-1">Required for RAG-01 and RAG-04</p>
            </div>

            {/* Auth Headers */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono text-v-muted2 tracking-wider">
                  AUTH HEADERS <span className="text-v-muted2">(Pro+)</span>
                </label>
                {tier !== "free" && (
                  <button
                    onClick={addAuthHeader}
                    className="flex items-center gap-1 text-[9px] font-mono text-acid hover:text-acid/80 transition-colors"
                  >
                    <Plus className="w-3 h-3" />ADD
                  </button>
                )}
              </div>
              {tier === "free" ? (
                <div className="flex items-center gap-1.5 p-2 bg-v-bg2/50 border border-v-border rounded text-[10px] text-v-muted2">
                  <Lock className="w-3 h-3 text-v-muted2/60" />
                  <a href="/billing" className="hover:text-acid transition-colors">Upgrade to Pro</a> to add auth headers
                </div>
              ) : (
                <div className="space-y-2">
                  {authHeaders.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={h.key}
                        onChange={e => updateAuthHeader(i, "key", e.target.value)}
                        placeholder="Header name"
                        className="flex-1 bg-v-bg2 border border-v-border text-white text-xs font-mono px-2 py-1.5 rounded focus:outline-none focus:border-acid/50 placeholder:text-v-muted2"
                      />
                      <input
                        value={h.value}
                        onChange={e => updateAuthHeader(i, "value", e.target.value)}
                        placeholder="Value"
                        className="flex-1 bg-v-bg2 border border-v-border text-white text-xs font-mono px-2 py-1.5 rounded focus:outline-none focus:border-acid/50 placeholder:text-v-muted2"
                      />
                      <button onClick={() => removeAuthHeader(i)} className="text-v-muted2 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tenant Credentials (Enterprise only) */}
            {tier === "enterprise" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono text-v-muted2 tracking-wider">
                    TENANT CREDENTIALS
                  </label>
                  <button
                    onClick={addTenantCred}
                    className="flex items-center gap-1 text-[9px] font-mono text-acid hover:text-acid/80 transition-colors"
                  >
                    <Plus className="w-3 h-3" />ADD TENANT
                  </button>
                </div>
                <p className="text-[10px] text-v-muted mb-2">
                  Add ≥2 tenant auth tokens to enable RAG-02 cross-tenant leakage test
                </p>
                {tenantCreds.length === 0 && (
                  <div className="text-[10px] text-v-muted2 p-2 border border-v-border rounded bg-v-bg2/50">
                    No tenant credentials added — RAG-02 will be skipped
                  </div>
                )}
                {tenantCreds.map((c, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      value={c.headers.Authorization || ""}
                      onChange={e => updateTenantCred(i, e.target.value)}
                      placeholder={`Tenant ${i + 1} Bearer token`}
                      className="flex-1 bg-v-bg2 border border-v-border text-white text-xs font-mono px-2 py-1.5 rounded focus:outline-none focus:border-acid/50 placeholder:text-v-muted2"
                    />
                    <button onClick={() => removeTenantCred(i)} className="text-v-muted2 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Use case */}
            <div>
              <label className="block text-[10px] font-mono text-v-muted2 tracking-wider mb-1.5">
                USE CASE <span className="text-v-muted2">(optional)</span>
              </label>
              <input
                type="text"
                value={useCase}
                onChange={e => setUseCase(e.target.value)}
                placeholder="e.g. customer support, code assistant…"
                className="w-full bg-v-bg2 border border-v-border text-white text-xs font-mono px-3 py-2 rounded focus:outline-none focus:border-acid/50 placeholder:text-v-muted2"
              />
            </div>

            {/* Scan button */}
            <button
              onClick={startScan}
              disabled={isScanning || !retrievalUrl.trim()}
              className="w-full flex items-center justify-center gap-2 bg-acid text-black font-mono text-xs font-bold tracking-wider py-2.5 rounded hover:bg-acid/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />SCANNING…</>
              ) : (
                <><Database className="w-3.5 h-3.5" />START RAG SCAN</>
              )}
            </button>

            {statusMsg && (
              <p className="text-[10px] font-mono text-acid animate-pulse text-center">{statusMsg}</p>
            )}

            {scanError && (
              <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-[10px] font-mono text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {scanError}
              </div>
            )}
          </div>
        </div>

        {/* Right results panel */}
        <div className="flex-1 overflow-y-auto bg-background">
          {!scanResult && !isScanning && (
            <div className="flex flex-col items-center justify-center h-full text-center px-12">
              <div className="w-16 h-16 rounded-lg bg-acid/10 border border-acid/20 flex items-center justify-center mb-4">
                <Database className="w-8 h-8 text-acid/60" />
              </div>
              <h2 className="font-mono text-lg font-bold text-white mb-2">RAG Security Scanner</h2>
              <p className="text-sm text-v-muted max-w-md leading-relaxed mb-6">
                Probe your Retrieval-Augmented Generation pipeline for the OWASP LLM Top 10
                RAG attack surface — corpus poisoning, cross-tenant isolation, query injection,
                and more.
              </p>
              <div className="grid grid-cols-1 gap-2 text-left w-full max-w-sm">
                {availableProbes.map(probe => (
                  <div key={probe} className="flex items-start gap-2.5 p-3 bg-v-bg1 border border-v-border rounded text-xs">
                    <span className="text-acid font-mono mt-0.5">▶</span>
                    <div>
                      <div className="font-mono text-white font-bold">{probe}</div>
                      <div className="text-v-muted mt-0.5">{PROBE_DESCRIPTIONS[probe]?.split("—")[1]?.trim()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isScanning && !scanResult && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 rounded-full border-2 border-acid/30 border-t-acid animate-spin mb-4" />
              <p className="font-mono text-sm text-acid">{statusMsg || "Running probes…"}</p>
              <p className="text-[11px] text-v-muted mt-2">This may take 30–120 seconds</p>
            </div>
          )}

          {scanResult && (
            <RAGScanResults result={scanResult} tier={tier} />
          )}
        </div>
      </div>
    </div>
  );
}
