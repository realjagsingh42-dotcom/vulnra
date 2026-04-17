import * as core from "@actions/core";
import * as github from "@actions/github";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  hit_rate: number;
  hits: number;
  total: number;
  owasp_category?: string;
  owasp_name?: string;
  remediation?: string;
}

interface ScanResult {
  id: string;
  status: "pending" | "running" | "complete" | "failed";
  risk_score: number | null;
  findings: Finding[];
  target_url: string;
  tier: string;
  scan_engine: string;
  created_at: string;
  completed_at: string | null;
  error?: string;
}

interface DiffSummary {
  current_score: number;
  baseline_score: number;
  risk_delta: number;
  risk_delta_pct: number;
  has_regressions: boolean;
  new_count: number;
  fixed_count: number;
  unchanged_count: number;
}

interface DiffResult {
  new: Finding[];
  fixed: Finding[];
  unchanged: Finding[];
  summary: DiffSummary;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, options);
  return res;
}

function severityEmoji(sev: string): string {
  switch (sev) {
    case "CRITICAL": return "🔴";
    case "HIGH":     return "🟠";
    case "MEDIUM":   return "🟡";
    case "LOW":      return "🔵";
    default:         return "⚪";
  }
}

function riskColor(score: number): string {
  if (score >= 70) return "🔴";
  if (score >= 40) return "🟡";
  return "🟢";
}

function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// ---------------------------------------------------------------------------
// Poll scan until complete or failed
// ---------------------------------------------------------------------------

async function pollScan(
  apiUrl: string,
  apiKey: string,
  scanId: string,
  maxWaitMs = 15 * 60 * 1000  // 15 min timeout
): Promise<ScanResult> {
  const deadline = Date.now() + maxWaitMs;
  let interval = 5000; // start at 5s, back off up to 30s

  while (Date.now() < deadline) {
    await sleep(interval);
    interval = Math.min(interval * 1.4, 30_000);

    const res = await apiFetch(`${apiUrl}/scan/${scanId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      core.warning(`Poll returned ${res.status}, retrying...`);
      continue;
    }

    const data = (await res.json()) as ScanResult;
    core.info(`  → status: ${data.status}`);

    if (data.status === "complete" || data.status === "failed") {
      return data;
    }
  }

  throw new Error(`Scan ${scanId} timed out after ${maxWaitMs / 60000} minutes.`);
}

// ---------------------------------------------------------------------------
// Build PR comment markdown
// ---------------------------------------------------------------------------

function buildComment(
  scan: ScanResult,
  diff: DiffResult | null,
  reportUrl: string,
  failOnScore: number
): string {
  const score = Math.round((scan.risk_score ?? 0) * 10);
  const icon = riskColor(score);
  const failed = failOnScore > 0 && score >= failOnScore;

  const lines: string[] = [];

  lines.push(`## ${icon} VULNRA LLM Security Scan`);
  lines.push("");

  // Summary table
  lines.push("| | |");
  lines.push("|---|---|");
  lines.push(`| **Target** | \`${scan.target_url}\` |`);
  lines.push(`| **Risk Score** | **${score}/100** ${icon} |`);
  lines.push(`| **Findings** | ${scan.findings.length} |`);
  lines.push(`| **Engine** | ${scan.scan_engine} |`);
  lines.push(`| **Tier** | ${scan.tier} |`);
  lines.push(`| **Scan ID** | \`${scan.id}\` |`);
  if (scan.completed_at) {
    const elapsed = Math.round(
      (new Date(scan.completed_at).getTime() - new Date(scan.created_at).getTime()) / 1000
    );
    lines.push(`| **Duration** | ${elapsed}s |`);
  }
  lines.push("");

  // Diff block (regression check)
  if (diff) {
    const s = diff.summary;
    const deltaSign = s.risk_delta > 0 ? "+" : "";
    const regression = s.has_regressions;
    lines.push(`### ${regression ? "⚠️ Regression Detected" : "✅ No Regressions"}`);
    lines.push("");
    lines.push(
      `Risk score changed from **${s.baseline_score}/100** → **${s.current_score}/100** ` +
      `(${deltaSign}${s.risk_delta_pct.toFixed(1)}pp)`
    );
    lines.push("");
    lines.push(
      `🆕 **${s.new_count} new** &nbsp;|&nbsp; ` +
      `✅ **${s.fixed_count} fixed** &nbsp;|&nbsp; ` +
      `⏸ **${s.unchanged_count} unchanged**`
    );
    lines.push("");

    if (diff.new.length > 0) {
      lines.push("<details>");
      lines.push(`<summary>🆕 New findings (${diff.new.length})</summary>`);
      lines.push("");
      lines.push("| Severity | Category | Hit Rate | OWASP |");
      lines.push("|---|---|---|---|");
      for (const f of diff.new) {
        lines.push(
          `| ${severityEmoji(f.severity)} ${f.severity} | ${f.category} | ` +
          `${formatPct(f.hit_rate)} (${f.hits}/${f.total}) | ` +
          `${f.owasp_name ?? "—"} |`
        );
      }
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }

    if (diff.fixed.length > 0) {
      lines.push("<details>");
      lines.push(`<summary>✅ Fixed findings (${diff.fixed.length})</summary>`);
      lines.push("");
      lines.push("| Severity | Category | OWASP |");
      lines.push("|---|---|---|");
      for (const f of diff.fixed) {
        lines.push(
          `| ~~${severityEmoji(f.severity)} ${f.severity}~~ | ~~${f.category}~~ | ` +
          `~~${f.owasp_name ?? "—"}~~ |`
        );
      }
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }
  }

  // All findings
  if (scan.findings.length > 0) {
    lines.push("<details>");
    lines.push(`<summary>All findings (${scan.findings.length})</summary>`);
    lines.push("");
    lines.push("| Severity | Category | Hit Rate | OWASP |");
    lines.push("|---|---|---|---|");
    for (const f of scan.findings) {
      lines.push(
        `| ${severityEmoji(f.severity)} ${f.severity} | ${f.category} | ` +
        `${formatPct(f.hit_rate)} (${f.hits}/${f.total}) | ` +
        `${f.owasp_name ?? "—"} |`
      );
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  } else {
    lines.push("✅ **No findings.** Your model passed all probes for this scan depth.");
    lines.push("");
  }

  // Report link & status
  lines.push(`📄 [Download PDF Report](${reportUrl})`);
  lines.push("");

  if (failed) {
    lines.push(
      `> ⛔ **Check failed:** risk score ${score} meets or exceeds the configured threshold of ${failOnScore}.`
    );
  }

  lines.push("");
  lines.push(
    `<sub>Generated by [VULNRA](https://vulnra.com) · ` +
    `[View scan](https://app.vulnra.com/scanner?scan_id=${scan.id})</sub>`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Post or update PR comment
// ---------------------------------------------------------------------------

async function upsertPRComment(body: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    core.info("GITHUB_TOKEN not set — skipping PR comment.");
    return;
  }

  const ctx = github.context;
  if (!ctx.payload.pull_request) {
    core.info("Not a PR event — skipping PR comment.");
    return;
  }

  const octokit = github.getOctokit(token);
  const prNumber = ctx.payload.pull_request.number;
  const { owner, repo } = ctx.repo;
  const marker = "<!-- vulnra-scan-action -->";
  const fullBody = `${marker}\n${body}`;

  // Find existing comment from this action
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existing = comments.find((c) => c.body?.startsWith(marker));

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body: fullBody,
    });
    core.info(`Updated existing PR comment #${existing.id}`);
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: fullBody,
    });
    core.info(`Posted new PR comment on PR #${prNumber}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  try {
    const apiKey      = core.getInput("api_key", { required: true });
    const targetUrl   = core.getInput("target_url", { required: true });
    const model       = core.getInput("model");
    const scanEngine  = core.getInput("scan_engine") || "combined";
    const tier        = core.getInput("tier") || "pro";
    const baselineId  = core.getInput("baseline_scan_id");
    const failScore   = parseInt(core.getInput("fail_on_risk_score") || "70", 10);
    const apiUrl      = (core.getInput("vulnra_api_url") || "https://api.vulnra.com").replace(/\/$/, "");

    // ------------------------------------------------------------------
    // 1. Start scan
    // ------------------------------------------------------------------
    core.info(`🔍 Starting VULNRA scan → ${targetUrl}`);

    const scanPayload: Record<string, string> = {
      url: targetUrl,
      scan_engine: scanEngine,
      tier,
    };
    if (model) scanPayload.model = model;

    const startRes = await apiFetch(`${apiUrl}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(scanPayload),
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      throw new Error(`Failed to start scan (${startRes.status}): ${errText}`);
    }

    const startData = (await startRes.json()) as { scan_id: string };
    const scanId = startData.scan_id;
    core.info(`✅ Scan started — ID: ${scanId}`);
    core.setOutput("scan_id", scanId);

    // ------------------------------------------------------------------
    // 2. Poll until done
    // ------------------------------------------------------------------
    core.info("⏳ Waiting for scan to complete...");
    const scan = await pollScan(apiUrl, apiKey, scanId);

    if (scan.status === "failed") {
      throw new Error(`Scan failed: ${scan.error ?? "unknown error"}`);
    }

    const score = Math.round((scan.risk_score ?? 0) * 10);
    core.setOutput("risk_score", String(score));
    core.setOutput("findings_count", String(scan.findings.length));
    core.info(`✅ Scan complete — risk score: ${score}/100, findings: ${scan.findings.length}`);

    // ------------------------------------------------------------------
    // 3. Build report URL
    // ------------------------------------------------------------------
    const reportUrl = `${apiUrl}/scan/${scanId}/report`;
    core.setOutput("report_url", reportUrl);

    // ------------------------------------------------------------------
    // 4. Optional: fetch diff against baseline
    // ------------------------------------------------------------------
    let diff: DiffResult | null = null;
    if (baselineId) {
      core.info(`🔀 Fetching diff against baseline ${baselineId}...`);
      try {
        const diffRes = await apiFetch(
          `${apiUrl}/scan/${scanId}/diff?baseline=${baselineId}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (diffRes.ok) {
          diff = (await diffRes.json()) as DiffResult;
          const s = diff.summary;
          core.info(
            `  → new: ${s.new_count}, fixed: ${s.fixed_count}, unchanged: ${s.unchanged_count}`
          );
        } else {
          core.warning(`Diff fetch returned ${diffRes.status} — skipping regression analysis.`);
        }
      } catch (e) {
        core.warning(`Diff fetch failed: ${e} — skipping regression analysis.`);
      }
    }

    // ------------------------------------------------------------------
    // 5. Post PR comment
    // ------------------------------------------------------------------
    const commentBody = buildComment(scan, diff, reportUrl, failScore);
    await upsertPRComment(commentBody);

    // ------------------------------------------------------------------
    // 6. Annotate check summary
    // ------------------------------------------------------------------
    try {
      if (process.env.GITHUB_STEP_SUMMARY) {
        await core.summary
          .addHeading("VULNRA LLM Security Scan", 2)
          .addTable([
            [
              { data: "Metric", header: true },
              { data: "Value", header: true },
            ],
            ["Risk Score", `${score}/100`],
            ["Findings", String(scan.findings.length)],
            ["Scan ID", scanId],
          ])
          .addLink("View full report", `https://app.vulnra.com/scanner?scan_id=${scanId}`)
          .write();
      }
    } catch (e) {
      core.debug(`Summary write skipped: ${e}`);
    }

    // ------------------------------------------------------------------
    // 7. Fail check if threshold exceeded
    // ------------------------------------------------------------------
    if (failScore > 0 && score >= failScore) {
      core.setFailed(
        `VULNRA risk score ${score}/100 meets or exceeds fail threshold of ${failScore}.`
      );
    }
  } catch (error) {
    core.setFailed(`VULNRA action failed: ${error}`);
  }
}

run();
