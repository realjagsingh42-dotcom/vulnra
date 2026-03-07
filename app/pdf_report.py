"""
VULNRA — Professional AI Security Audit Report Generator
Light-themed, modern, structured PDF output using ReportLab Platypus
"""

import io
import math
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    Image,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.flowables import Flowable

# ─── Colour Palette ────────────────────────────────────────────────────────────
C_BLACK        = colors.HexColor("#0D0F14")
C_DARK         = colors.HexColor("#1A1D27")
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
MARGIN_T = 15 * mm
MARGIN_B = 18 * mm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R


# ─── Helper Flowables ──────────────────────────────────────────────────────────

class RiskGauge(Flowable):
    """Semi-circular risk gauge drawn with canvas calls."""

    def __init__(self, score: float, width=90 * mm, height=52 * mm):
        super().__init__()
        self.score = min(max(score, 0), 10)
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        cx = self.width / 2
        cy = 8 * mm
        r_outer = 36 * mm
        r_inner = 24 * mm
        stroke_w = (r_outer - r_inner)

        # Background arc (light grey)
        c.setStrokeColor(colors.HexColor("#E5E7EB"))
        c.setLineWidth(stroke_w)
        c.arc(cx - r_outer + stroke_w / 2, cy - r_outer + stroke_w / 2,
              cx + r_outer - stroke_w / 2, cy + r_outer - stroke_w / 2,
              startAng=180, extent=180)

        # Coloured fill arc
        fraction = self.score / 10.0
        if self.score <= 3.5:
            arc_col = C_ACCENT_GREEN
        elif self.score <= 6.5:
            arc_col = C_ACCENT_AMBER
        else:
            arc_col = C_ACCENT_RED

        c.setStrokeColor(arc_col)
        c.arc(cx - r_outer + stroke_w / 2, cy - r_outer + stroke_w / 2,
              cx + r_outer - stroke_w / 2, cy + r_outer - stroke_w / 2,
              startAng=180, extent=int(180 * fraction))

        # Score label
        c.setFillColor(C_TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(cx, cy + 4 * mm, f"{self.score:.1f}")
        c.setFont("Helvetica", 8)
        c.setFillColor(C_TEXT_MUTED)
        c.drawCentredString(cx, cy - 3 * mm, "/ 10  RISK SCORE")

    def wrap(self, availW, availH):
        return self.width, self.height


class ColoredBar(Flowable):
    """A full-width colour accent bar (used as section dividers)."""

    def __init__(self, color=C_ACCENT_GREEN, height=1.5):
        super().__init__()
        self.bar_color = color
        self.bar_height = height
        self.width = CONTENT_W

    def draw(self):
        c = self.canv
        c.setFillColor(self.bar_color)
        c.rect(0, 0, self.width, self.bar_height, stroke=0, fill=1)

    def wrap(self, availW, availH):
        return self.width, self.bar_height


class SeverityBadge(Flowable):
    """Pill-shaped severity badge."""

    COLORS = {
        "CRITICAL": (colors.HexColor("#7B0000"), colors.HexColor("#FFEBEE")),
        "HIGH":     (C_ACCENT_RED,              colors.HexColor("#FFEBEE")),
        "MEDIUM":   (C_ACCENT_AMBER,            colors.HexColor("#FFF3E0")),
        "LOW":      (C_ACCENT_GREEN,            colors.HexColor("#E8F5E9")),
        "INFO":     (C_ACCENT_BLUE,             colors.HexColor("#E3F2FD")),
    }

    def __init__(self, severity: str):
        super().__init__()
        self.severity = severity.upper()
        self.ink, self.bg = self.COLORS.get(self.severity, (C_TEXT_MUTED, C_BG_ALT_ROW))

    def draw(self):
        c = self.canv
        w, h = 52, 13
        radius = 5
        c.setFillColor(self.bg)
        c.roundRect(0, 0, w, h, radius, stroke=0, fill=1)
        c.setFillColor(self.ink)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(w / 2, 3.5, self.severity)

    def wrap(self, availW, availH):
        return 52, 13


# ─── Style Sheet ───────────────────────────────────────────────────────────────

def _styles():
    base = getSampleStyleSheet()

    def ps(name, **kw):
        return ParagraphStyle(name, **kw)

    return {
        "cover_product": ps("cover_product",
            fontName="Helvetica-Bold", fontSize=9, textColor=C_ACCENT_GREEN,
            spaceAfter=4, tracking=3),

        "cover_title": ps("cover_title",
            fontName="Helvetica-Bold", fontSize=28, textColor=C_TEXT_WHITE,
            leading=34, spaceAfter=6),

        "cover_sub": ps("cover_sub",
            fontName="Helvetica", fontSize=12, textColor=colors.HexColor("#9CA3AF"),
            spaceAfter=4),

        "cover_meta": ps("cover_meta",
            fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#6B7280"),
            spaceAfter=2),

        "section_label": ps("section_label",
            fontName="Helvetica-Bold", fontSize=7, textColor=C_ACCENT_GREEN,
            spaceBefore=14, spaceAfter=3, tracking=2),

        "section_title": ps("section_title",
            fontName="Helvetica-Bold", fontSize=15, textColor=C_TEXT_PRIMARY,
            spaceAfter=8, leading=20),

        "body": ps("body",
            fontName="Helvetica", fontSize=9.5, textColor=C_TEXT_PRIMARY,
            leading=14, spaceAfter=6),

        "body_muted": ps("body_muted",
            fontName="Helvetica", fontSize=8.5, textColor=C_TEXT_MUTED,
            leading=13, spaceAfter=4),

        "finding_title": ps("finding_title",
            fontName="Helvetica-Bold", fontSize=10, textColor=C_TEXT_PRIMARY,
            spaceAfter=3),

        "finding_detail": ps("finding_detail",
            fontName="Helvetica", fontSize=8.5, textColor=C_TEXT_MUTED,
            leading=13, spaceAfter=2),

        "code": ps("code",
            fontName="Courier", fontSize=8, textColor=colors.HexColor("#374151"),
            backColor=colors.HexColor("#F3F4F6"), leading=12,
            leftIndent=8, rightIndent=8, spaceAfter=6),

        "table_header": ps("table_header",
            fontName="Helvetica-Bold", fontSize=8, textColor=C_TEXT_WHITE,
            alignment=TA_LEFT),

        "table_cell": ps("table_cell",
            fontName="Helvetica", fontSize=8.5, textColor=C_TEXT_PRIMARY,
            leading=12),

        "table_cell_muted": ps("table_cell_muted",
            fontName="Helvetica", fontSize=8, textColor=C_TEXT_MUTED,
            leading=11),

        "stat_value": ps("stat_value",
            fontName="Helvetica-Bold", fontSize=22, textColor=C_TEXT_PRIMARY,
            alignment=TA_CENTER, spaceAfter=1),

        "stat_label": ps("stat_label",
            fontName="Helvetica", fontSize=7.5, textColor=C_TEXT_MUTED,
            alignment=TA_CENTER),

        "footer": ps("footer",
            fontName="Helvetica", fontSize=7.5, textColor=C_TEXT_MUTED,
            alignment=TA_CENTER),
    }


# ─── Page Templates ────────────────────────────────────────────────────────────

def _cover_bg(canvas, doc):
    """Dark cover page background."""
    canvas.saveState()
    # Full dark background
    canvas.setFillColor(C_BG_HEADER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    # Green accent strip at top
    canvas.setFillColor(C_ACCENT_GREEN)
    canvas.rect(0, PAGE_H - 3.5 * mm, PAGE_W, 3.5 * mm, stroke=0, fill=1)
    # Subtle dot-grid watermark
    canvas.setFillColor(colors.HexColor("#1F2333"))
    step = 8 * mm
    for x in range(int(MARGIN_L), int(PAGE_W), int(step)):
        for y in range(int(MARGIN_B), int(PAGE_H), int(step)):
            canvas.circle(x, y, 0.6, stroke=0, fill=1)
    canvas.restoreState()


def _body_bg(canvas, doc):
    """Light body page with header bar and footer."""
    canvas.saveState()
    canvas.setFillColor(C_BG_PAGE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    # Top header bar
    canvas.setFillColor(C_BG_HEADER)
    canvas.rect(0, PAGE_H - 14 * mm, PAGE_W, 14 * mm, stroke=0, fill=1)
    canvas.setFillColor(C_ACCENT_GREEN)
    canvas.rect(0, PAGE_H - 14 * mm, PAGE_W, 0.8 * mm, stroke=0, fill=1)

    # Header text
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
    canvas.drawRightString(PAGE_W - MARGIN_R, MARGIN_B - 8,
                           f"Page {doc.page}")
    canvas.restoreState()


# ─── Section Builders ──────────────────────────────────────────────────────────

def _cover_page(scan: dict, S: dict, story: list):
    ts = scan.get("completed_at")
    date_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%B %d, %Y %H:%M UTC") if ts else "—"
    tier = scan.get("tier", "free").upper()
    engine = scan.get("scan_engine", "garak_v1")
    url = scan.get("url", "—")

    story.append(Spacer(1, 30 * mm))
    story.append(Paragraph("VULNRA", S["cover_product"]))
    story.append(Paragraph("AI Security<br/>Audit Report", S["cover_title"]))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("Automated Red-Team Analysis", S["cover_sub"]))
    story.append(Spacer(1, 12 * mm))
    story.append(HRFlowable(width=CONTENT_W, thickness=0.5,
                             color=colors.HexColor("#374151"), spaceAfter=10 * mm))

    meta_rows = [
        ("Target Endpoint", url),
        ("Scan Engine",     engine),
        ("Tier",            tier),
        ("Report Date",     date_str),
        ("Scan ID",         scan.get("scan_id", "—")),
    ]
    for label, value in meta_rows:
        row_data = [[
            Paragraph(f"<b>{label}</b>",
                      ParagraphStyle("cm", fontName="Helvetica-Bold", fontSize=8.5,
                                     textColor=colors.HexColor("#9CA3AF"))),
            Paragraph(str(value),
                      ParagraphStyle("cv", fontName="Helvetica", fontSize=8.5,
                                     textColor=C_TEXT_WHITE)),
        ]]
        t = Table(row_data, colWidths=[45 * mm, CONTENT_W - 45 * mm])
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story.append(t)

    story.append(Spacer(1, 20 * mm))
    # Disclaimer pill
    disclaimer_data = [[
        Paragraph(
            "This report was generated automatically by VULNRA using open-source "
            "red-team probes. Results are probabilistic and should be reviewed by "
            "a qualified security professional before acting on them.",
            ParagraphStyle("disc", fontName="Helvetica", fontSize=7.5,
                           textColor=colors.HexColor("#6B7280"), leading=11)),
    ]]
    disc_t = Table(disclaimer_data, colWidths=[CONTENT_W])
    disc_t.setStyle(TableStyle([
        ("BOX",            (0, 0), (-1, -1), 0.5, colors.HexColor("#374151")),
        ("LEFTPADDING",    (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 10),
        ("TOPPADDING",     (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 7),
        ("BACKGROUND",     (0, 0), (-1, -1), colors.HexColor("#111827")),
        ("ROUNDEDCORNERS", [4]),
    ]))
    story.append(disc_t)


def _executive_summary(scan: dict, S: dict, story: list):
    score = scan.get("risk_score", 0.0)
    findings = scan.get("findings", [])
    n_high = sum(1 for f in findings if f.get("severity", "").upper() == "HIGH")
    n_medium = sum(1 for f in findings if f.get("severity", "").upper() == "MEDIUM")

    story.append(Paragraph("EXECUTIVE SUMMARY", S["section_label"]))
    story.append(ColoredBar(C_ACCENT_GREEN, 2))
    story.append(Spacer(1, 4 * mm))

    if score >= 7:
        verdict_text = ("The target model demonstrates <b>critical security weaknesses</b>. "
                        "Immediate remediation is required before production deployment.")
        verdict_color = C_ACCENT_RED
    elif score >= 4:
        verdict_text = ("The target model has <b>moderate security risks</b> that should be "
                        "addressed before wider deployment.")
        verdict_color = C_ACCENT_AMBER
    else:
        verdict_text = ("The target model passed most probes with <b>minimal security concerns</b> "
                        "detected during this scan.")
        verdict_color = C_ACCENT_GREEN

    # Verdict box
    vdata = [[Paragraph(verdict_text,
                        ParagraphStyle("vt", fontName="Helvetica", fontSize=9.5,
                                       textColor=C_TEXT_PRIMARY, leading=14))]]
    vt = Table(vdata, colWidths=[CONTENT_W])
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

    # Stats row: gauge + three KPIs
    gauge = RiskGauge(score, width=75 * mm, height=50 * mm)

    stat_col_w = (CONTENT_W - 75 * mm) / 3

    def stat_cell(value, label):
        return [
            Paragraph(str(value), S["stat_value"]),
            Paragraph(label, S["stat_label"]),
        ]

    stats_inner = Table(
        [stat_cell(f"{score:.1f}", "Risk Score"),
         stat_cell(str(len(findings)), "Findings"),
         stat_cell(str(n_high), "High Severity")],
        colWidths=[stat_col_w] * 3,
    )
    stats_inner.setStyle(TableStyle([
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    row = Table([[gauge, stats_inner]],
                colWidths=[75 * mm, CONTENT_W - 75 * mm])
    row.setStyle(TableStyle([
        ("VALIGN",    (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND",(0, 0), (-1, -1), C_BG_CARD),
        ("BOX",       (0, 0), (-1, -1), 0.5, C_BORDER),
        ("TOPPADDING",(0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(row)


def _findings_section(scan: dict, S: dict, story: list):
    findings = scan.get("findings", [])
    if not findings:
        return

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("FINDINGS", S["section_label"]))
    story.append(ColoredBar(C_ACCENT_RED, 2))
    story.append(Spacer(1, 4 * mm))

    SEV_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
    sorted_findings = sorted(findings, key=lambda f: SEV_ORDER.get(f.get("severity", "INFO").upper(), 99))

    for i, finding in enumerate(sorted_findings):
        sev = finding.get("severity", "INFO").upper()
        cat = finding.get("category", "UNKNOWN").replace("_", " ")
        detail = finding.get("detail", "No detail provided.")
        hit_rate = finding.get("hit_rate")
        hits = finding.get("hits")
        total = finding.get("total")

        sev_colors = {
            "CRITICAL": (colors.HexColor("#7B0000"), colors.HexColor("#FFEBEE")),
            "HIGH":     (C_ACCENT_RED,               colors.HexColor("#FFEBEE")),
            "MEDIUM":   (C_ACCENT_AMBER,              colors.HexColor("#FFF8E1")),
            "LOW":      (C_ACCENT_GREEN,              colors.HexColor("#F0FFF4")),
            "INFO":     (C_ACCENT_BLUE,               colors.HexColor("#EFF6FF")),
        }
        sev_ink, sev_bg = sev_colors.get(sev, (C_TEXT_MUTED, C_BG_ALT_ROW))

        # Finding card header
        header_data = [[
            Paragraph(f"<b>#{i+1} — {cat}</b>",
                      ParagraphStyle("fh", fontName="Helvetica-Bold", fontSize=10,
                                     textColor=C_TEXT_PRIMARY)),
            Paragraph(f"<b>{sev}</b>",
                      ParagraphStyle("fs", fontName="Helvetica-Bold", fontSize=8,
                                     textColor=sev_ink, alignment=TA_RIGHT)),
        ]]
        header_t = Table(header_data, colWidths=[CONTENT_W - 40 * mm, 40 * mm])
        header_t.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND",    (0, 0), (-1, -1), sev_bg),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING",   (0, 0), (0, -1), 10),
            ("RIGHTPADDING",  (-1, 0), (-1, -1), 10),
            ("LINEBELOW",     (0, 0), (-1, -1), 1, sev_ink),
        ]))
        story.append(header_t)

        # Detail rows
        detail_rows = [[Paragraph(detail, S["finding_detail"])]]

        if hit_rate is not None:
            pct = f"{hit_rate * 100:.1f}%"
            bar_filled = int(hit_rate * 20)
            bar = "█" * bar_filled + "░" * (20 - bar_filled)
            detail_rows.append([
                Paragraph(f"Attack Success Rate: <b>{pct}</b> ({hits}/{total} probes bypassed)<br/>"
                          f"<font face='Courier' size='8'>{bar}</font>",
                          S["body_muted"])
            ])

        body_t = Table(detail_rows, colWidths=[CONTENT_W])
        body_t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), C_BG_CARD),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
            ("TOPPADDING",    (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("BOX",           (0, 0), (-1, -1), 0.5, C_BORDER),
            ("LINEBEFORE",    (0, 0), (0, -1), 3, sev_ink),
        ]))
        story.append(body_t)
        story.append(Spacer(1, 4 * mm))


def _compliance_section(scan: dict, S: dict, story: list):
    compliance = scan.get("compliance", {})
    if not compliance or compliance.get("blurred"):
        story.append(Spacer(1, 6 * mm))
        story.append(Paragraph("COMPLIANCE MAPPING", S["section_label"]))
        story.append(ColoredBar(C_ACCENT_BLUE, 2))
        story.append(Spacer(1, 4 * mm))

        locked_data = [[Paragraph(
            "🔒  Compliance mapping is available on the <b>Pro</b> tier. "
            "Upgrade at <b>vulnra.ai</b> to see EU AI Act articles, DPDP sections, "
            "NIST AI RMF functions, and estimated fine exposure.",
            ParagraphStyle("lck", fontName="Helvetica", fontSize=9.5,
                           textColor=colors.HexColor("#374151"), leading=14))]]
        lt = Table(locked_data, colWidths=[CONTENT_W])
        lt.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
            ("BOX",           (0, 0), (-1, -1), 0.5, C_BORDER),
            ("LEFTPADDING",   (0, 0), (-1, -1), 12),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
            ("TOPPADDING",    (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(lt)
        return

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("COMPLIANCE MAPPING", S["section_label"]))
    story.append(ColoredBar(C_ACCENT_BLUE, 2))
    story.append(Spacer(1, 4 * mm))

    FRAMEWORKS = {
        "eu_ai_act": {
            "name": "EU AI Act",
            "articles_key": "articles",
            "fine_key": "fine_eur",
            "currency": "€",
            "color": colors.HexColor("#1565C0"),
        },
        "dpdp": {
            "name": "India DPDP Act",
            "articles_key": "sections",
            "fine_key": "fine_inr",
            "currency": "₹",
            "color": colors.HexColor("#6A1B9A"),
        },
        "nist_ai_rmf": {
            "name": "NIST AI RMF",
            "articles_key": "functions",
            "fine_key": None,
            "currency": None,
            "color": colors.HexColor("#00695C"),
        },
    }

    header_row = [
        Paragraph("Framework", S["table_header"]),
        Paragraph("Triggered Controls", S["table_header"]),
        Paragraph("Max Exposure", S["table_header"]),
    ]
    rows = [header_row]

    for key, meta in FRAMEWORKS.items():
        fw = compliance.get(key)
        if not fw:
            continue
        articles = fw.get(meta["articles_key"], [])
        articles_str = ", ".join(articles) if articles else "—"
        if meta["fine_key"] and fw.get(meta["fine_key"]):
            fine_val = fw[meta["fine_key"]]
            fine_str = f"{meta['currency']}{fine_val:,.0f}"
        else:
            fine_str = "N/A"

        rows.append([
            Paragraph(f"<b>{meta['name']}</b>",
                      ParagraphStyle("fn", fontName="Helvetica-Bold", fontSize=9,
                                     textColor=meta["color"])),
            Paragraph(articles_str, S["table_cell"]),
            Paragraph(fine_str,
                      ParagraphStyle("fe", fontName="Helvetica-Bold", fontSize=9,
                                     textColor=C_ACCENT_RED if meta["fine_key"] else C_TEXT_MUTED)),
        ])

    col_w = [45 * mm, CONTENT_W - 45 * mm - 40 * mm, 40 * mm]
    table = Table(rows, colWidths=col_w, repeatRows=1)
    style = [
        ("BACKGROUND",    (0, 0), (-1, 0), C_BG_HEADER),
        ("TEXTCOLOR",     (0, 0), (-1, 0), C_TEXT_WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 8),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [C_BG_CARD, C_BG_ALT_ROW]),
        ("GRID",          (0, 0), (-1, -1), 0.4, C_BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    table.setStyle(TableStyle(style))
    story.append(table)


def _recommendations_section(scan: dict, S: dict, story: list):
    findings = scan.get("findings", [])
    if not findings:
        return

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("RECOMMENDATIONS", S["section_label"]))
    story.append(ColoredBar(C_ACCENT_AMBER, 2))
    story.append(Spacer(1, 4 * mm))

    RECS = {
        "JAILBREAK": (
            "Implement multi-turn context monitoring to detect jailbreak patterns. "
            "Apply system prompt hardening and use output classifiers to flag policy-violating responses."
        ),
        "PROMPT_INJECTION": (
            "Sanitise and validate all user inputs before injection into the model context. "
            "Use structured prompting with clear role separators and apply a secondary moderation layer."
        ),
        "PII_LEAK": (
            "Audit your system prompt for sensitive data. Implement output filtering to detect "
            "and redact PII before responses are returned to users."
        ),
        "ENCODING_BYPASS": (
            "Apply input normalisation to decode Base64, Leetspeak, and other encoding variants "
            "before the prompt reaches the model."
        ),
    }

    seen_cats = set()
    rec_rows = []
    for i, f in enumerate(findings):
        cat = f.get("category", "").upper()
        if cat in seen_cats:
            continue
        seen_cats.add(cat)
        rec = RECS.get(cat, "Review and harden the model configuration against this attack vector.")
        rec_rows.append([
            Paragraph(f"<b>{i+1}</b>",
                      ParagraphStyle("rn", fontName="Helvetica-Bold", fontSize=9,
                                     textColor=C_TEXT_WHITE, alignment=TA_CENTER)),
            Paragraph(f"<b>{cat.replace('_', ' ')}</b><br/>{rec}",
                      ParagraphStyle("rb", fontName="Helvetica", fontSize=9,
                                     textColor=C_TEXT_PRIMARY, leading=13)),
        ])

    if rec_rows:
        t = Table(rec_rows, colWidths=[10 * mm, CONTENT_W - 10 * mm])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (0, -1), C_BG_HEADER),
            ("BACKGROUND",    (1, 0), (-1, -1), C_BG_CARD),
            ("ROWBACKGROUNDS",(1, 1), (-1, -1), [C_BG_CARD, C_BG_ALT_ROW]),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("ALIGN",         (0, 0), (0, -1), "CENTER"),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING",   (1, 0), (1, -1), 10),
            ("GRID",          (0, 0), (-1, -1), 0.4, C_BORDER),
        ]))
        story.append(t)


# ─── Main Entry Point ──────────────────────────────────────────────────────────

def generate_audit_pdf(scan: dict) -> bytes:
    """Generate a professional light-themed audit PDF. Returns raw bytes."""
    buf = io.BytesIO()
    S = _styles()

    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T + 14 * mm,
        bottomMargin=MARGIN_B + 4 * mm,
        title="VULNRA AI Security Audit Report",
        author="VULNRA Scanner",
    )

    cover_frame = Frame(0, 0, PAGE_W, PAGE_H,
                        leftPadding=MARGIN_L, rightPadding=MARGIN_R,
                        topPadding=MARGIN_T, bottomPadding=MARGIN_B)
    body_frame = Frame(MARGIN_L, MARGIN_B + 4 * mm,
                       CONTENT_W, PAGE_H - (MARGIN_T + 14 * mm) - (MARGIN_B + 4 * mm))

    cover_template = PageTemplate(id="cover", frames=[cover_frame], onPage=_cover_bg)
    body_template  = PageTemplate(id="body",  frames=[body_frame],  onPage=_body_bg)
    doc.addPageTemplates([cover_template, body_template])

    from reportlab.platypus import NextPageTemplate
    story = []

    # Cover page
    _cover_page(scan, S, story)
    story.append(NextPageTemplate("body"))
    from reportlab.platypus import PageBreak
    story.append(PageBreak())

    # Body pages
    _executive_summary(scan, S, story)
    _findings_section(scan, S, story)
    _compliance_section(scan, S, story)
    _recommendations_section(scan, S, story)

    # Footer note
    story.append(Spacer(1, 10 * mm))
    story.append(HRFlowable(width=CONTENT_W, thickness=0.5, color=C_BORDER, spaceAfter=4 * mm))
    story.append(Paragraph(
        "Generated by VULNRA — AI Red-Teaming Platform. "
        "This report is for internal security review only. "
        "Do not distribute without authorisation.",
        S["footer"]))

    doc.build(story)
    return buf.getvalue()


# ─── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    sample = {
        "scan_id": "bf2a758a-677f-4a35-9a98-a743b4025c3a",
        "url": "http://localhost:11434/v1/chat/completions",
        "tier": "pro",
        "risk_score": 8.5,
        "scan_engine": "garak_v1",
        "status": "complete",
        "completed_at": 1772839995.0,
        "findings": [
            {
                "category": "JAILBREAK",
                "severity": "HIGH",
                "detail": "DAN jailbreak bypassed model safety guardrails in 50% of attempts via dan.AutoDANCached.",
                "hit_rate": 0.50,
                "hits": 3,
                "total": 6,
                "blurred": False,
            },
            {
                "category": "PROMPT_INJECTION",
                "severity": "HIGH",
                "detail": "System prompt hijacked in 50% of probes via promptinject.HijackHateHumans.",
                "hit_rate": 0.50,
                "hits": 256,
                "total": 512,
                "blurred": False,
            },
            {
                "category": "PII_LEAK",
                "severity": "MEDIUM",
                "detail": "User email address reflected verbatim in model error response.",
                "hit_rate": 0.12,
                "hits": 6,
                "total": 50,
                "blurred": False,
            },
        ],
        "compliance": {
            "eu_ai_act": {"articles": ["Art. 9", "Art. 13", "Art. 15"], "fine_eur": 15_000_000},
            "dpdp":      {"sections": ["Sec. 8", "Sec. 11"],           "fine_inr": 250_000_000},
            "nist_ai_rmf": {"functions": ["GOVERN 1.1", "MAP 2.1", "MEASURE 2.5", "MANAGE 2.2"]},
        },
    }

    pdf_bytes = generate_audit_pdf(sample)
    with open("/mnt/user-data/outputs/vulnra_audit_report.pdf", "wb") as f:
        f.write(pdf_bytes)
    print(f"PDF written: {len(pdf_bytes):,} bytes")
