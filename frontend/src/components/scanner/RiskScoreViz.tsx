"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryScores {
  injection: number;
  jailbreak: number;
  leakage: number;
  compliance: number;
}

interface RiskScoreVizProps {
  riskScore: number;          // 0–10 from garak engine
  categoryScores?: CategoryScores | null;
  prevRiskScore?: number | null;
}

// ── SVG Gauge Helpers ────────────────────────────────────────────────────────

/** Convert a fraction (0=left, 1=right) to an (x,y) point on the arc */
function arcPoint(cx: number, cy: number, r: number, frac: number) {
  const a = Math.PI - frac * Math.PI; // 0→PI (left), 1→0 (right)
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }; // negate y for SVG
}

/** Build an annular (donut) sector SVG path.
 *  Traces: outer arc clockwise (sweep=1) + line + inner arc counter-clockwise (sweep=0)
 */
function annularArc(
  cx: number, cy: number,
  rOuter: number, rInner: number,
  startFrac: number, endFrac: number
): string {
  const o1 = arcPoint(cx, cy, rOuter, startFrac);
  const o2 = arcPoint(cx, cy, rOuter, endFrac);
  const i2 = arcPoint(cx, cy, rInner, endFrac);
  const i1 = arcPoint(cx, cy, rInner, startFrac);
  const large = Math.abs(endFrac - startFrac) > 0.5 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return [
    `M ${f(o1.x)} ${f(o1.y)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${f(o2.x)} ${f(o2.y)}`,
    `L ${f(i2.x)} ${f(i2.y)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${f(i1.x)} ${f(i1.y)}`,
    `Z`,
  ].join(" ");
}

// ── Donut Chart Helper ────────────────────────────────────────────────────────

function donutSlice(
  cx: number, cy: number, r: number, r2: number,
  startAngle: number, endAngle: number
): string {
  const p = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos((angle - 90) * (Math.PI / 180)),
    y: cy + radius * Math.sin((angle - 90) * (Math.PI / 180)),
  });
  const s1 = p(startAngle, r);
  const e1 = p(endAngle, r);
  const s2 = p(endAngle, r2);
  const e2 = p(startAngle, r2);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return [
    `M ${f(s1.x)} ${f(s1.y)}`,
    `A ${r} ${r} 0 ${large} 1 ${f(e1.x)} ${f(e1.y)}`,
    `L ${f(s2.x)} ${f(s2.y)}`,
    `A ${r2} ${r2} 0 ${large} 0 ${f(e2.x)} ${f(e2.y)}`,
    `Z`,
  ].join(" ");
}

// ── Category Config ───────────────────────────────────────────────────────────

const CATS = [
  { key: "injection"  as const, label: "Injection",  color: "#ff5f5f" },
  { key: "jailbreak"  as const, label: "Jailbreak",  color: "#ff9a3c" },
  { key: "leakage"    as const, label: "Leakage",    color: "#ffd700" },
  { key: "compliance" as const, label: "Compliance", color: "#4db8ff" },
];

const BENCHMARK = 31; // industry average, hardcoded

// ── Component ─────────────────────────────────────────────────────────────────

export default function RiskScoreViz({ riskScore, categoryScores, prevRiskScore }: RiskScoreVizProps) {
  // Garak returns 0–10; normalize to 0–1 for gauge math, display as 0–100
  const normalized = Math.min(Math.max(riskScore / 10, 0), 1);
  const displayScore = Math.round(riskScore * 10);

  const delta =
    prevRiskScore != null
      ? Math.round((riskScore - prevRiskScore) * 10)
      : null;

  const gaugeColor =
    normalized >= 0.6 ? "#ff5f5f" :
    normalized >= 0.3 ? "#ffc94a" :
    "#b8ff57";

  // Gauge dimensions
  const CX = 130, CY = 120, R_OUT = 98, R_IN = 70;
  const needle = arcPoint(CX, CY, R_OUT - 12, normalized);

  // Category values
  const catVals = CATS.map(c => categoryScores?.[c.key] ?? 0);
  const catTotal = catVals.reduce((a, b) => a + b, 0) || 1;

  // Donut slices
  const DONUT_CX = 40, DONUT_CY = 40, DONUT_R = 32, DONUT_R2 = 20;
  let angle = -90;
  const slices = catVals.map((val, i) => {
    const sweep = (val / catTotal) * 360;
    if (sweep < 2) { angle += sweep; return null; }
    const path = donutSlice(DONUT_CX, DONUT_CY, DONUT_R, DONUT_R2, angle, angle + sweep);
    angle += sweep;
    return { path, color: CATS[i].color };
  });

  return (
    <div className="mb-2 p-3 border border-v-border rounded-sm bg-black/20">
      {/* ── Gauge SVG ── */}
      <svg viewBox="0 0 260 128" className="w-full" style={{ maxHeight: 112 }}>
        {/* Dark background track */}
        <path d={annularArc(CX, CY, R_OUT, R_IN, 0, 1)} fill="#151518" />

        {/* Zone backgrounds (dim) */}
        <path d={annularArc(CX, CY, R_OUT, R_IN, 0,   0.3)} fill="#b8ff5715" />
        <path d={annularArc(CX, CY, R_OUT, R_IN, 0.3, 0.6)} fill="#ffc94a15" />
        <path d={annularArc(CX, CY, R_OUT, R_IN, 0.6, 1.0)} fill="#ff5f5f15" />

        {/* Filled progress up to current score */}
        {normalized > 0.001 && (
          <path
            d={annularArc(CX, CY, R_OUT, R_IN, 0, normalized)}
            fill={gaugeColor}
            opacity={0.9}
          />
        )}

        {/* Benchmark tick */}
        {(() => {
          const bf = BENCHMARK / 100;
          const bp = arcPoint(CX, CY, R_OUT + 4, bf);
          const bi = arcPoint(CX, CY, R_IN - 4, bf);
          return (
            <line
              x1={bp.x.toFixed(2)} y1={bp.y.toFixed(2)}
              x2={bi.x.toFixed(2)} y2={bi.y.toFixed(2)}
              stroke="#666" strokeWidth={1.5} strokeDasharray="2 2"
            />
          );
        })()}

        {/* Needle */}
        <line
          x1={CX} y1={CY}
          x2={needle.x.toFixed(2)} y2={needle.y.toFixed(2)}
          stroke="white" strokeWidth={2} strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={4.5} fill="white" />

        {/* Score */}
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize={30} fontWeight="bold" fontFamily="monospace" fill="white">
          {displayScore}
        </text>
        <text x={CX} y={CY + 7} textAnchor="middle" fontSize={8} fontFamily="monospace" fill="#555">
          / 100
        </text>

        {/* Zone labels */}
        <text x={28}  y={CY + 18} fontSize={8} fontFamily="monospace" fill="#b8ff57" textAnchor="middle" opacity={0.7}>LOW</text>
        <text x={CX}  y={22}      fontSize={8} fontFamily="monospace" fill="#ffc94a" textAnchor="middle" opacity={0.7}>MED</text>
        <text x={232} y={CY + 18} fontSize={8} fontFamily="monospace" fill="#ff5f5f" textAnchor="middle" opacity={0.7}>HIGH</text>
      </svg>

      {/* ── Delta + Benchmark row ── */}
      <div className="flex items-center justify-between px-1 mt-0.5 mb-3">
        <div className="flex items-center gap-1.5">
          {delta !== null ? (
            <>
              {delta > 0
                ? <ArrowUp className="w-3 h-3 text-v-red" />
                : delta < 0
                ? <ArrowDown className="w-3 h-3 text-acid" />
                : <Minus className="w-3 h-3 text-v-muted2" />}
              <span className={cn(
                "text-[10px] font-mono",
                delta > 0 ? "text-v-red" : delta < 0 ? "text-acid" : "text-v-muted2"
              )}>
                {delta > 0 ? `+${delta}` : delta} vs last scan
              </span>
            </>
          ) : (
            <span className="text-[10px] font-mono text-v-muted2 opacity-60">
              First scan for this endpoint
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-v-muted2">
          Avg: <span className="text-v-amber">{BENCHMARK}</span>
        </span>
      </div>

      {/* ── Category breakdown ── */}
      {categoryScores && (
        <div className="border-t border-v-border/40 pt-2.5">
          <div className="flex items-start gap-3">
            {/* Donut */}
            <svg viewBox="0 0 80 80" width={68} height={68} className="shrink-0">
              {catTotal <= 1
                ? <circle cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R} fill="none" stroke="#222" strokeWidth={12} />
                : slices.map((s, i) => s ? <path key={i} d={s.path} fill={s.color} /> : null)
              }
              <circle cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R2} fill="#0d0d0f" />
              <text x={DONUT_CX} y={DONUT_CY + 3} textAnchor="middle" fontSize={6} fontFamily="monospace" fill="#444">RISK</text>
            </svg>

            {/* Legend + bars */}
            <div className="flex-1 space-y-1.5 min-w-0 pt-0.5">
              {CATS.map((c, i) => (
                <div key={c.key} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-[9px] font-mono text-v-muted2 w-16 shrink-0">{c.label}</span>
                  <div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${catVals[i]}%`, background: c.color, opacity: catVals[i] > 0 ? 0.85 : 0.2 }}
                    />
                  </div>
                  <span className="text-[9px] font-mono w-5 text-right shrink-0" style={{ color: catVals[i] > 0 ? c.color : "#444" }}>
                    {catVals[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
