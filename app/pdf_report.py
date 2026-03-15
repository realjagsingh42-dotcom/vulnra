"""
VULNRA — Professional AI Security Audit Report Generator
Consolidated implementation using ReportLab Platypus + BaseDocTemplate.
"""

import io
import os
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.flowables import Flowable

logger = logging.getLogger("vulnra.pdf")

# ─── Colour Palette ────────────────────────────────────────────────────────────
C_ACCENT_GREEN = colors.HexColor("#00C853")
C_ACCENT_RED   = colors.HexColor("#E53935")
C_ACCENT_AMBER = colors.HexColor("#FB8C00")
C_ACCENT_BLUE  = colors.HexColor("#1565C0")

C_BG_PAGE      = colors.HexColor("#F8F9FB")
C_BG_CARD      = colors.white
C_BG_HEADER    = colors.HexColor("#0D0F14")
C_BG_ALT_ROW   = colors.HexColor("#F1F3F7")

C_BORDER       = colors.HexColor("#DDE1EA")
C_TEXT_PRIMARY = colors.HexColor("#0D0F14")
C_TEXT_MUTED   = colors.HexColor("#6B7280")
C_TEXT_WHITE   = colors.white

PAGE_W, PAGE_H = A4
MARGIN_L = 20 * mm
MARGIN_R = 20 * mm
MARGIN_T = 22 * mm
MARGIN_B = 18 * mm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R


# ─── Custom Flowables ──────────────────────────────────────────────────────────

class RiskGauge(Flowable):
    """Semi-circular risk gauge (0–10 garak scale, displayed as ×10 = 0–100)."""

    def __init__(self, score: float, width=72 * mm, height=50 * mm):
        super().__init__()
        self.score = min(max(score, 0), 10)
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        cx = self.width / 2
        cy = 8 * mm
        r_outer = 32 * mm
        r_inner = 21 * mm
        stroke_w = r_outer - r_inner

        # Background track
        c.setStrokeColor(colors.HexColor("#E5E7EB"))
        c.setLineWidth(stroke_w)
        c.arc(cx - r_outer + stroke_w / 2, cy - r_outer + stroke_w / 2,
              cx + r_outer - stroke_w / 2, cy + r_outer - stroke_w / 2,
              startAng=180, extent=180)

        # Coloured progress arc
        arc_col = (C_ACCENT_GREEN if self.score <= 3.5
                   else C_ACCENT_AMBER if self.score <= 6.5
                   else C_ACCENT_RED)
        c.setStrokeColor(arc_col)
        c.arc(cx - r_outer + stroke_w / 2, cy - r_outer + stroke_w / 2,
              cx + r_outer - stroke_w / 2, cy + r_outer - stroke_w / 2,
              startAng=180, extent=int(180 * self.score / 10))

        # Labels
        c.setFillColor(C_TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 22)
        c.drawCentredString(cx, cy + 3.5 * mm, f"{self.score * 10:.0f}")
        c.setFont("Helvetica", 7.5)
        c.setFillColor(C_TEXT_MUTED)
        c.drawCentredString(cx, cy - 2.5 * mm, "/ 100  RISK SCORE")

    def wrap(self, availW, availH):
        return self.width, self.height


class ColoredBar(Flowable):
    """Full-width colour accent bar (section divider)."""

    def __init__(self, color=C_ACCENT_GREEN, height=2.0):
        super().__init__()
        self.bar_color = color
        self.bar_height = height
        self.width = CONTENT_W

    def draw(self):
        self.canv.setFillColor(self.bar_color)
        self.canv.rect(0, 0, self.width, self.bar_height, stroke=0, fill=1)

    def wrap(self, availW, availH):
        return self.width, self.bar_height


class CategoryBars(Flowable):
    """Horizontal bar chart of the 4 risk category scores (0–100)."""

    _CATS = [
        ("injection",  "Injection",  "#E53935"),
        ("jailbreak",  "Jailbreak",  "#FB8C00"),
        ("leakage",    "Leakage",    "#F9A825"),
        ("compliance", "Compliance", "#1565C0"),
    ]

    def __init__(self, scores: dict, width=CONTENT_W - 20):
        super().__init__()
        self.scores = scores
        self.width = width
        self.height = len(self._CATS) * 9 * mm

    def draw(self):
        c = self.canv
        row_h   = 9 * mm
        bar_h   = 3.5 * mm
        label_w = 22 * mm
        val_w   = 10 * mm
        bar_area = self.width - label_w - val_w - 3 * mm

        for i, (key, label, hex_col) in enumerate(self._CATS):
            y_center = self.height - (i + 0.5) * row_h
            bar_y = y_center - bar_h / 2
            score = self.scores.get(key, 0)

            c.setFont("Helvetica", 8)
            c.setFillColor(C_TEXT_MUTED)
            c.drawString(0, y_center - 3, label)

            # Background track
            c.setFillColor(colors.HexColor("#E5E7EB"))
            c.roundRect(label_w, bar_y, bar_area, bar_h, 1.5, stroke=0, fill=1)

            # Fill
            if score > 0:
                fill_w = max(bar_area * score / 100, 3)
                c.setFillColor(colors.HexColor(hex_col))
                c.roundRect(label_w, bar_y, fill_w, bar_h, 1.5, stroke=0, fill=1)

            # Value
            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(colors.HexColor(hex_col) if score > 0 else C_TEXT_MUTED)
            c.drawRightString(self.width, y_center - 3, str(score))

    def wrap(self, availW, availH):
        return self.width, self.height


# ─── Style Sheet ───────────────────────────────────────────────────────────────

def _styles() -> dict:
    def ps(name, **kw):
        return ParagraphStyle(name, **kw)

    return {
        "cover_product": ps("cover_product",
            fontName="Helvetica-Bold", fontSize=9, textColor=C_ACCENT_GREEN, spaceAfter=4),
        "cover_title": ps("cover_title",
            fontName="Helvetica-Bold", fontSize=28, textColor=C_TEXT_WHITE,
            leading=34, spaceAfter=6),
        "cover_sub": ps("cover_sub",
            fontName="Helvetica", fontSize=12, textColor=colors.HexColor("#9CA3AF"), spaceAfter=4),
        "section_label": ps("section_label",
            fontName="Helvetica-Bold", fontSize=7, textColor=C_ACCENT_GREEN,
            spaceBefore=14, spaceAfter=3),
        "body": ps("body",
            fontName="Helvetica", fontSize=9.5, textColor=C_TEXT_PRIMARY, leading=14, spaceAfter=6),
        "body_muted": ps("body_muted",
            fontName="Helvetica", fontSize=8.5, textColor=C_TEXT_MUTED, leading=13, spaceAfter=4),
        "finding_detail": ps("finding_detail",
            fontName="Helvetica", fontSize=8.5, textColor=C_TEXT_MUTED, leading=13, spaceAfter=2),
        "table_header": ps("table_header",
            fontName="Helvetica-Bold", fontSize=8, textColor=C_TEXT_WHITE),
        "table_cell": ps("table_cell",
            fontName="Helvetica", fontSize=8.5, textColor=C_TEXT_PRIMARY, leading=12),
        "table_cell_muted": ps("table_cell_muted",
            fontName="Helvetica", fontSize=8, textColor=C_TEXT_MUTED, leading=11),
        "stat_value": ps("stat_value",
            fontName="Helvetica-Bold", fontSize=22, textColor=C_TEXT_PRIMARY,
            alignment=TA_CENTER, spaceAfter=1),
        "stat_label": ps("stat_label",
            fontName="Helvetica", fontSize=7.5, textColor=C_TEXT_MUTED, alignment=TA_CENTER),
        "appendix_title": ps("appendix_title",
            fontName="Helvetica-Bold", fontSize=10, textColor=C_TEXT_PRIMARY,
            spaceBefore=8, spaceAfter=3),
        "remediation_text": ps("remediation_text",
            fontName="Helvetica", fontSize=9, textColor=C_TEXT_PRIMARY,
            leading=13, spaceAfter=2, leftIndent=8),
    }


# ─── Page Callbacks ────────────────────────────────────────────────────────────

def _cover_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(C_BG_HEADER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(C_ACCENT_GREEN)
    canvas.rect(0, PAGE_H - 3.5 * mm, PAGE_W, 3.5 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#1F2333"))
    step = 8 * mm
    for x in range(int(MARGIN_L), int(PAGE_W), int(step)):
        for y in range(int(MARGIN_B), int(PAGE_H), int(step)):
            canvas.circle(x, y, 0.6, stroke=0, fill=1)
    canvas.restoreState()


def _body_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(C_BG_PAGE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    # Header bar
    canvas.setFillColor(C_BG_HEADER)
    canvas.rect(0, PAGE_H - 14 * mm, PAGE_W, 14 * mm, stroke=0, fill=1)
    canvas.setFillColor(C_ACCENT_GREEN)
    canvas.rect(0, PAGE_H - 14 * mm, PAGE_W, 0.8 * mm, stroke=0, fill=1)
    canvas.setFillColor(C_TEXT_WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(MARGIN_L, PAGE_H - 9 * mm, "VULNRA")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#9CA3AF"))
    canvas.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 9 * mm, "AI Security Audit Report")
    # Footer
    canvas.setFillColor(C_BORDER)
    canvas.rect(MARGIN_L, MARGIN_B - 1, CONTENT_W, 0.5, stroke=0, fill=1)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(C_TEXT_MUTED)
    canvas.drawString(MARGIN_L, MARGIN_B - 8, "CONFIDENTIAL — VULNRA Automated Security Report")
    canvas.drawRightString(PAGE_W - MARGIN_R, MARGIN_B - 8, f"Page {doc.page}")
    canvas.restoreState()


def _body_bg_free(canvas, doc):
    """Body page + diagonal FREE TIER watermark."""
    _body_bg(canvas, doc)
    canvas.saveState()
    try:
        canvas.setFillColorRGB(0, 0.784, 0.325, alpha=0.05)
    except TypeError:
        canvas.setFillColor(colors.HexColor("#F0FFF8"))
    canvas.setFont("Helvetica-Bold", 72)
    canvas.translate(PAGE_W / 2, PAGE_H / 2)
    canvas.rotate(35)
    canvas.drawCentredString(0, 0, "FREE TIER")
    canvas.restoreState()


# ─── Category Scoring ──────────────────────────────────────────────────────────

_CATEGORY_BUCKET = {
    "PROMPT_INJECTION":      "injection",
    "JAILBREAK":             "jailbreak",
    "PII_LEAK":              "leakage",
    "DATA_EXFIL":            "leakage",
    "SYSTEM_PROMPT_LEAKAGE": "leakage",
    "VECTOR_WEAKNESS":       "leakage",
    "POLICY_BYPASS":         "compliance",
    "UNBOUNDED_CONSUMPTION": "compliance",
}


def _compute_category_scores(findings: list) -> dict:
    buckets: dict = {"injection": [], "jailbreak": [], "leakage": [], "compliance": []}
    for f in findings:
        bucket = _CATEGORY_BUCKET.get(f.get("category", ""))
        if bucket:
            buckets[bucket].append(float(f.get("hit_rate", 0)))
    return {k: round(sum(v) / len(v) * 100) if v else 0 for k, v in buckets.items()}


# ─── AI Executive Summary ──────────────────────────────────────────────────────

def _generate_ai_summary(scan: dict) -> str:
    """Call Claude Haiku to write a ~150-word executive summary. Falls back to static text."""
    try:
        import anthropic

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set")

        score = scan.get("risk_score", 0.0)
        findings = [f for f in scan.get("findings", []) if not f.get("blurred")][:6]
        url = scan.get("url", "the target endpoint")

        finding_lines = "\n".join(
            f"- {f.get('category', 'UNKNOWN')}: {f.get('severity', 'UNKNOWN')} severity, "
            f"{f.get('hit_rate', 0) * 100:.0f}% attack success"
            for f in findings
        ) or "- No significant findings"

        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=280,
            messages=[{
                "role": "user",
                "content": (
                    f"Write a 150-word executive summary for an AI security audit report. "
                    f"Target: {url}. Risk score: {score * 10:.0f}/100. "
                    f"Key vulnerabilities:\n{finding_lines}\n\n"
                    "Write professionally for C-suite and security leadership. "
                    "Communicate business risk and urgency. No markdown, no bullet points."
                ),
            }],
        )
        return resp.content[0].text.strip()

    except Exception as e:
        logger.warning(f"AI summary generation skipped: {e}")
        score = scan.get("risk_score", 0.0)
        n = len([f for f in scan.get("findings", []) if not f.get("blurred")])
        if score >= 7:
            return (
                f"This AI endpoint received a risk score of {score * 10:.0f}/100, indicating critical "
                f"security exposure across {n} identified vulnerability categories. Adversarial probes "
                "successfully bypassed safety guardrails at significant rates, presenting immediate risk "
                "of data leakage, policy bypass, and prompt injection. Immediate remediation is required "
                "before this endpoint is used in production or made accessible to untrusted users. "
                "This report details each vulnerability with attack evidence and actionable remediation guidance."
            )
        elif score >= 4:
            return (
                f"This AI endpoint received a risk score of {score * 10:.0f}/100, indicating moderate "
                f"security risks across {n} identified areas. Several adversarial attack vectors succeeded "
                "at measurable rates and should be addressed before wider deployment. "
                "This report provides detailed findings with evidence and remediation guidance "
                "to reduce exposure prior to production use."
            )
        else:
            return (
                f"This AI endpoint received a risk score of {score * 10:.0f}/100, indicating low overall "
                "risk. Most adversarial probes were successfully blocked by existing defences. "
                "Continue monitoring for emerging attack patterns and conduct regular re-scans "
                "as new techniques emerge. Full findings are detailed in this report."
            )


# ─── Date Formatter ────────────────────────────────────────────────────────────

def _format_date(ts) -> str:
    if isinstance(ts, (int, float)) and ts:
        return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%B %d, %Y %H:%M UTC")
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%B %d, %Y %H:%M UTC")
        except ValueError:
            return ts
    return "—"


# ─── Section Builders ──────────────────────────────────────────────────────────

def _cover_page(scan: dict, S: dict, story: list):
    date_str = _format_date(scan.get("completed_at"))
    tier     = scan.get("tier", "free").upper()
    engine   = str(scan.get("scan_engine", "garak_v1")).upper()
    url      = scan.get("url", "—")

    story.append(Spacer(1, 30 * mm))
    story.append(Paragraph("VULNRA", S["cover_product"]))
    story.append(Paragraph("AI Security<br/>Audit Report", S["cover_title"]))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("Automated Red-Team Analysis", S["cover_sub"]))
    story.append(Spacer(1, 12 * mm))
    story.append(HRFlowable(width=CONTENT_W, thickness=0.5,
                             color=colors.HexColor("#374151"), spaceAfter=10 * mm))

    for label, value in [
        ("Target Endpoint", url),
        ("Scan Engine",     engine),
        ("Tier",            tier),
        ("Report Date",     date_str),
        ("Scan ID",         scan.get("scan_id", "—")),
    ]:
        t = Table([[
            Paragraph(f"<b>{label}</b>",
                      ParagraphStyle("cm", fontName="Helvetica-Bold", fontSize=8.5,
                                     textColor=colors.HexColor("#9CA3AF"))),
            Paragraph(str(value),
                      ParagraphStyle("cv", fontName="Helvetica", fontSize=8.5,
                                     textColor=C_TEXT_WHITE)),
        ]], colWidths=[45 * mm, CONTENT_W - 45 * mm])
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story.append(t)

    story.append(Spacer(1, 20 * mm))
    disc_t = Table([[
        Paragraph(
            "This report was generated automatically by VULNRA using open-source red-team probes. "
            "Results are probabilistic and should be reviewed by a qualified security professional "
            "before acting on them.",
            ParagraphStyle("disc", fontName="Helvetica", fontSize=7.5,
                           textColor=colors.HexColor("#6B7280"), leading=11)),
    ]], colWidths=[CONTENT_W])
    disc_t.setStyle(TableStyle([
        ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#111827")),
    ]))
    story.append(disc_t)


def _executive_summary(scan: dict, S: dict, story: list, cat_scores: dict):
    score    = scan.get("risk_score", 0.0)
    findings = scan.get("findings", [])
    n_high   = sum(1 for f in findings if f.get("severity", "").upper() == "HIGH")

    story.append(Paragraph("EXECUTIVE SUMMARY", S["section_label"]))
    story.append(ColoredBar(C_ACCENT_GREEN, 2))
    story.append(Spacer(1, 4 * mm))

    # AI-generated summary
    summary_text  = _generate_ai_summary(scan)
    verdict_color = C_ACCENT_RED if score >= 7 else C_ACCENT_AMBER if score >= 4 else C_ACCENT_GREEN
    vt = Table([[Paragraph(summary_text, S["body"])]], colWidths=[CONTENT_W])
    vt.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND",    (0, 0), (-1, -1), C_BG_CARD),
        ("LINEAFTER",     (0, 0), (0, -1), 3, verdict_color),
        ("BOX",           (0, 0), (-1, -1), 0.5, C_BORDER),
    ]))
    story.append(vt)
    story.append(Spacer(1, 5 * mm))

    # Gauge + KPI stats
    gauge        = RiskGauge(score)
    stat_col_w   = (CONTENT_W - gauge.width) / 3

    def stat_cell(value, label):
        return [Paragraph(str(value), S["stat_value"]), Paragraph(label, S["stat_label"])]

    stats = Table(
        [stat_cell(f"{score * 10:.0f}", "Risk Score"),
         stat_cell(str(len(findings)), "Findings"),
         stat_cell(str(n_high), "High Severity")],
        colWidths=[stat_col_w] * 3,
    )
    stats.setStyle(TableStyle([
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    gauge_row = Table([[gauge, stats]], colWidths=[gauge.width, CONTENT_W - gauge.width])
    gauge_row.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND",    (0, 0), (-1, -1), C_BG_CARD),
        ("BOX",           (0, 0), (-1, -1), 0.5, C_BORDER),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(gauge_row)
    story.append(Spacer(1, 4 * mm))

    # Category bars
    bars_t = Table([[CategoryBars(cat_scores)]], colWidths=[CONTENT_W])
    bars_t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), C_BG_CARD),
        ("BOX",           (0, 0), (-1, -1), 0.5, C_BORDER),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(bars_t)


def _findings_section(scan: dict, S: dict, story: list, is_free: bool):
    findings = scan.get("findings", [])
    if not findings:
        return

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("FINDINGS", S["section_label"]))
    story.append(ColoredBar(C_ACCENT_RED, 2))
    story.append(Spacer(1, 4 * mm))

    SEV_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
    display = sorted(findings[:3] if is_free else findings,
                     key=lambda f: SEV_ORDER.get(f.get("severity", "INFO").upper(), 99))

    SEV_STYLES = {
        "CRITICAL": (colors.HexColor("#7B0000"), colors.HexColor("#FFEBEE")),
        "HIGH":     (C_ACCENT_RED,               colors.HexColor("#FFEBEE")),
        "MEDIUM":   (C_ACCENT_AMBER,             colors.HexColor("#FFF8E1")),
        "LOW":      (C_ACCENT_GREEN,             colors.HexColor("#F0FFF4")),
        "INFO":     (C_ACCENT_BLUE,              colors.HexColor("#EFF6FF")),
    }
    FE_HEX = {"low": "#00C853", "medium": "#FB8C00", "high": "#E53935"}

    for idx, f in enumerate(display):
        sev        = f.get("severity", "INFO").upper()
        cat        = f.get("category", "UNKNOWN").replace("_", " ")
        detail     = f.get("detail", "No detail provided.")
        hit_rate   = f.get("hit_rate", 0)
        hits       = f.get("hits", 0)
        total      = f.get("total", 0)
        owasp_cat  = f.get("owasp_category", "")
        owasp_name = f.get("owasp_name", "")
        fix_effort = (f.get("fix_effort") or "").lower()

        sev_ink, sev_bg = SEV_STYLES.get(sev, (C_TEXT_MUTED, C_BG_ALT_ROW))
        fe_hex = FE_HEX.get(fix_effort, "#6B7280")

        # Header row
        owasp_tag = f" <font size='7' color='#1565C0'>[{owasp_cat}]</font>" if owasp_cat else ""
        fe_tag    = (f" | <font size='7' color='{fe_hex}'>{fix_effort.upper()} FIX</font>"
                     if fix_effort else "")
        header_data = [[
            Paragraph(f"<b>#{idx + 1} — {cat}</b>{owasp_tag}",
                      ParagraphStyle("fh", fontName="Helvetica-Bold", fontSize=10,
                                     textColor=C_TEXT_PRIMARY)),
            Paragraph(f"<b>{sev}</b>{fe_tag}",
                      ParagraphStyle("fr", fontName="Helvetica-Bold", fontSize=8,
                                     textColor=sev_ink, alignment=TA_RIGHT)),
        ]]
        ht = Table(header_data, colWidths=[CONTENT_W - 44 * mm, 44 * mm])
        ht.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND",    (0, 0), (-1, -1), sev_bg),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING",   (0, 0), (0, -1),  10),
            ("RIGHTPADDING",  (-1, 0), (-1, -1), 10),
            ("LINEBELOW",     (0, 0), (-1, -1), 1, sev_ink),
        ]))
        story.append(ht)

        # Detail body
        detail_rows: List[List] = [[Paragraph(detail, S["finding_detail"])]]
        if owasp_name:
            detail_rows.append([
                Paragraph(f"<i>OWASP: {owasp_name}</i>",
                          ParagraphStyle("on", fontName="Helvetica-Oblique", fontSize=8,
                                         textColor=C_ACCENT_BLUE, leading=11, spaceAfter=2))
            ])
        if hit_rate is not None:
            bar = "█" * int(hit_rate * 20) + "░" * (20 - int(hit_rate * 20))
            detail_rows.append([
                Paragraph(
                    f"Attack success: <b>{hit_rate * 100:.1f}%</b> ({hits}/{total} probes) "
                    f"<font face='Courier' size='8'>{bar}</font>",
                    S["body_muted"],
                )
            ])

        bt = Table(detail_rows, colWidths=[CONTENT_W])
        bt.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), C_BG_CARD),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("BOX",           (0, 0), (-1, -1), 0.5, C_BORDER),
            ("LINEBEFORE",    (0, 0), (0, -1),  3, sev_ink),
        ]))
        story.append(bt)
        story.append(Spacer(1, 3 * mm))

    # Free-tier upgrade prompt
    if is_free and len(findings) > 3:
        remaining = len(findings) - 3
        up_t = Table([[
            Paragraph(
                f"<b>+{remaining} more finding{'s' if remaining > 1 else ''} not shown.</b> "
                "Upgrade to Pro or Enterprise for all findings, full remediation guidance, "
                "compliance impact, and adversarial evidence.",
                ParagraphStyle("up", fontName="Helvetica", fontSize=9,
                               textColor=C_ACCENT_GREEN, leading=13)),
        ]], colWidths=[CONTENT_W])
        up_t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#F0FFF4")),
            ("BOX",           (0, 0), (-1, -1), 1, C_ACCENT_GREEN),
            ("LEFTPADDING",   (0, 0), (-1, -1), 12),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
            ("TOPPADDING",    (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(up_t)


def _compliance_section(scan: dict, S: dict, story: list):
    compliance = scan.get("compliance", {})
    if not compliance or compliance.get("blurred"):
        return

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("REGULATORY COMPLIANCE", S["section_label"]))
    story.append(ColoredBar(C_ACCENT_BLUE, 2))
    story.append(Spacer(1, 4 * mm))

    FW_LABELS = {
        "eu_ai_act":   "EU AI Act",
        "dpdp":        "DPDP (India)",
        "nist_ai_rmf": "NIST AI RMF",
    }

    rows = [[
        Paragraph(h, S["table_header"])
        for h in ["Framework", "Status", "Affected Clauses", "Max Exposure"]
    ]]
    for fw_key, details in compliance.items():
        if fw_key in ("blurred", "hint", "mitre_atlas"):
            continue
        label   = FW_LABELS.get(fw_key, fw_key.replace("_", " ").upper())
        clauses = (list(details.get("articles", [])) +
                   list(details.get("sections", [])) +
                   list(details.get("functions", [])))

        exposure = ""
        if "fine_eur" in details:
            exposure = f"\u20ac{details['fine_eur']:,}"
        elif "fine_inr" in details:
            exposure = f"\u20b9{details['fine_inr']:,}"

        rows.append([
            Paragraph(label, S["table_cell"]),
            Paragraph("<font color='#E53935'>\u26a0 RISK</font>",
                      ParagraphStyle("rs", fontName="Helvetica-Bold", fontSize=8.5,
                                     textColor=C_ACCENT_RED)),
            Paragraph(", ".join(clauses[:6]), S["table_cell_muted"]),
            Paragraph(exposure, S["table_cell"]),
        ])

    col_w = [36 * mm, 20 * mm, CONTENT_W - 36 * mm - 20 * mm - 30 * mm, 30 * mm]
    t = Table(rows, colWidths=col_w)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), C_BG_HEADER),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [C_BG_CARD, C_BG_ALT_ROW]),
        ("GRID",          (0, 0), (-1, -1), 0.5, C_BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)


def _remediation_appendix(scan: dict, S: dict, story: list, is_free: bool):
    findings_with_fix = [
        f for f in scan.get("findings", [])
        if f.get("remediation") and not f.get("blurred")
    ]
    if is_free:
        findings_with_fix = findings_with_fix[:3]
    if not findings_with_fix:
        return

    story.append(PageBreak())
    story.append(Paragraph("REMEDIATION APPENDIX", S["section_label"]))
    story.append(ColoredBar(C_ACCENT_AMBER, 2))
    story.append(Spacer(1, 4 * mm))

    FE_HEX = {"low": "#00C853", "medium": "#FB8C00", "high": "#E53935"}

    for i, f in enumerate(findings_with_fix):
        cat        = f.get("category", "UNKNOWN").replace("_", " ")
        sev        = f.get("severity", "")
        fix_effort = (f.get("fix_effort") or "").lower()
        fe_hex     = FE_HEX.get(fix_effort, "#6B7280")

        sev_part = (f" — <font size='8' color='#E53935'>{sev}</font>" if sev else "")
        fe_part  = (f" — <font size='8' color='{fe_hex}'>Fix effort: {fix_effort.upper()}</font>"
                    if fix_effort else "")
        story.append(Paragraph(f"#{i + 1} {cat}{sev_part}{fe_part}", S["appendix_title"]))
        story.append(Paragraph(f.get("remediation", ""), S["remediation_text"]))
        story.append(Spacer(1, 3 * mm))

    total_with_fix = len([f for f in scan.get("findings", []) if f.get("remediation")])
    if is_free and total_with_fix > 3:
        story.append(
            Paragraph(
                f"Full remediation guidance for all {total_with_fix} findings is available "
                "in Pro and Enterprise tiers.",
                ParagraphStyle("ft", fontName="Helvetica-Oblique", fontSize=8.5,
                               textColor=C_TEXT_MUTED, spaceAfter=6),
            )
        )


# ─── Main Entry Point ──────────────────────────────────────────────────────────

def generate_audit_pdf(scan_data: Dict[str, Any]) -> bytes:
    """Generate a professional PDF audit report. Returns raw bytes."""
    logger.info(f"Generating PDF for scan {scan_data.get('scan_id')}")

    is_free   = scan_data.get("tier", "free").lower() == "free"
    cat_scores = _compute_category_scores(scan_data.get("findings", []))

    buf = io.BytesIO()

    # Frames — body frame accounts for 14mm header bar
    cover_frame = Frame(MARGIN_L, MARGIN_B, CONTENT_W,
                        PAGE_H - MARGIN_T - MARGIN_B, id="cover", showBoundary=0)
    body_frame  = Frame(MARGIN_L, MARGIN_B, CONTENT_W,
                        PAGE_H - MARGIN_T - MARGIN_B - 14 * mm, id="body", showBoundary=0)

    body_cb = _body_bg_free if is_free else _body_bg

    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T,  bottomMargin=MARGIN_B,
        title=f"VULNRA Audit — {scan_data.get('url', '')}",
    )
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=_cover_bg),
        PageTemplate(id="body",  frames=[body_frame],  onPage=body_cb),
    ])

    S     = _styles()
    story: list = []

    _cover_page(scan_data, S, story)
    story.append(NextPageTemplate("body"))
    story.append(PageBreak())

    _executive_summary(scan_data, S, story, cat_scores)
    _findings_section(scan_data, S, story, is_free)
    _compliance_section(scan_data, S, story)
    _remediation_appendix(scan_data, S, story, is_free)

    doc.build(story)
    buf.seek(0)
    return buf.read()


# ─── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import time as _time

    sample = {
        "scan_id":      "bf2a758a-677f-4a35-9a98-a743b4025c3a",
        "url":          "https://api.example.com/v1/chat",
        "tier":         "pro",
        "risk_score":   8.5,
        "scan_engine":  "garak_v1,deepteam_v1",
        "status":       "complete",
        "completed_at": _time.time(),
        "findings": [
            {
                "category": "JAILBREAK", "severity": "HIGH",
                "detail": "DAN jailbreak bypassed model safety guardrails in 50% of attempts.",
                "hit_rate": 0.50, "hits": 3, "total": 6, "blurred": False,
                "owasp_category": "LLM01", "owasp_name": "Prompt Injection",
                "fix_effort": "high",
                "remediation": (
                    "Implement multi-layer content moderation with fine-tuned classifiers. "
                    "Add a secondary validation LLM that reviews all outputs before delivery. "
                    "Use Constitutional AI techniques to enforce policy constraints."
                ),
            },
            {
                "category": "PROMPT_INJECTION", "severity": "HIGH",
                "detail": "System prompt hijacked in 50% of probes via promptinject.",
                "hit_rate": 0.50, "hits": 256, "total": 512, "blurred": False,
                "owasp_category": "LLM01", "owasp_name": "Prompt Injection",
                "fix_effort": "medium",
                "remediation": (
                    "Separate system prompt from user input with a dedicated instruction boundary. "
                    "Apply instruction hierarchy enforcement so user messages cannot override system context."
                ),
            },
            {
                "category": "PII_LEAK", "severity": "MEDIUM",
                "detail": "User email reflected verbatim in model error response.",
                "hit_rate": 0.12, "hits": 6, "total": 50, "blurred": False,
                "fix_effort": "low",
                "remediation": "Strip PII from error messages using a regex post-processor before returning to callers.",
            },
        ],
        "compliance": {
            "eu_ai_act":   {"articles": ["Art. 9", "Art. 13", "Art. 15"], "fine_eur": 15_000_000},
            "dpdp":        {"sections": ["Sec. 8", "Sec. 11"], "fine_inr": 250_000_000},
            "nist_ai_rmf": {"functions": ["GOVERN 1.1", "MAP 2.1", "MEASURE 2.5"]},
        },
    }

    pdf_bytes = generate_audit_pdf(sample)
    out_path = "vulnra_audit_test.pdf"
    with open(out_path, "wb") as fh:
        fh.write(pdf_bytes)
    print(f"PDF written: {len(pdf_bytes):,} bytes -> {out_path}")
