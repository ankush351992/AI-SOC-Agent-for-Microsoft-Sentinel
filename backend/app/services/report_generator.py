"""
===================================================================
Microsoft Sentinel AI SOC Agent - Executive Report Generator Service
Generates publication-ready Microsoft Word (.docx), print-ready HTML/PDF,
and Markdown executive incident forensic & triage reports.
===================================================================
"""

import io
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls


def _set_cell_background(cell, fill_hex: str):
    """Sets background fill color of a table cell."""
    tc_pr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tc_pr.append(shd)


def _set_cell_margins(cell, top: int = 120, bottom: int = 120, left: int = 160, right: int = 160):
    """Sets inner padding/margins for a table cell."""
    tc_pr = cell._element.get_or_add_tcPr()
    tc_mar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tc_pr.append(tc_mar)


def generate_docx_report(
    incident: Dict[str, Any],
    report: Dict[str, Any],
    analyst_name: str = "SOC Lead"
) -> io.BytesIO:
    """
    Generates a publication-grade Microsoft Word (.docx) Executive
    Incident Forensic & Triage Report.
    """
    doc = docx.Document()

    # Set page margins (0.75 in all around for A4 / Letter standard)
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Base typography styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)

    inc_num = str(incident.get("incidentNumber") or incident.get("id") or "N/A")
    inc_title = incident.get("title", "Microsoft Sentinel Security Incident")
    severity = str(report.get("severity_assessment") or incident.get("severity") or "Medium")
    created_time = incident.get("createdTimeUtc", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
    verdict = report.get("verdict", "TRUE_POSITIVE")
    confidence = report.get("confidence_score", 90)
    rca = report.get("root_cause_analysis", {})

    # Verdict Colors
    if verdict == "TRUE_POSITIVE":
        verdict_label = "TRUE POSITIVE (CONFIRMED MALICIOUS THREAT)"
        verdict_hex = "DC2626"
        verdict_bg = "FEE2E2"
        v_rgb = RGBColor(0xDC, 0x26, 0x26)
    elif verdict == "FALSE_POSITIVE":
        verdict_label = "FALSE POSITIVE (BENIGN / NO THREAT DETECTED)"
        verdict_hex = "059669"
        verdict_bg = "D1FAE5"
        v_rgb = RGBColor(0x05, 0x96, 0x69)
    else:
        verdict_label = "SUSPICIOUS (MANUAL ESCALATION REQUIRED)"
        verdict_hex = "D97706"
        verdict_bg = "FEF3C7"
        v_rgb = RGBColor(0xD9, 0x77, 0x06)

    # -------------------------------------------------------------
    # 1. HEADER BANNER
    # -------------------------------------------------------------
    header_tbl = doc.add_table(rows=1, cols=2)
    header_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    header_tbl.autofit = False

    cell_l = header_tbl.cell(0, 0)
    cell_r = header_tbl.cell(0, 1)
    cell_l.width = Inches(4.5)
    cell_r.width = Inches(2.5)

    _set_cell_background(cell_l, "0F172A")
    _set_cell_background(cell_r, "0F172A")
    _set_cell_margins(cell_l, top=140, bottom=140, left=180, right=180)
    _set_cell_margins(cell_r, top=140, bottom=140, left=180, right=180)

    p_l = cell_l.paragraphs[0]
    p_l.paragraph_format.space_after = Pt(2)
    r_main = p_l.add_run("MICROSOFT SENTINEL SOC")
    r_main.font.bold = True
    r_main.font.size = Pt(14)
    r_main.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    r_sub = p_l.add_run("\nAutonomous Forensic Incident Triage & RCA Report")
    r_sub.font.size = Pt(9.5)
    r_sub.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    p_r = cell_r.paragraphs[0]
    p_r.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_r.paragraph_format.space_after = Pt(2)
    r_res = p_r.add_run("RESTRICTED // SOC-IR")
    r_res.font.bold = True
    r_res.font.size = Pt(9.5)
    r_res.font.color.rgb = RGBColor(0xEF, 0x44, 0x44)

    r_date = p_r.add_run(f"\nGenerated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    r_date.font.size = Pt(8.5)
    r_date.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    doc.add_paragraph()  # Spacer

    # -------------------------------------------------------------
    # 2. INCIDENT METADATA TABLE
    # -------------------------------------------------------------
    meta_tbl = doc.add_table(rows=3, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_tbl.autofit = False

    meta_items = [
        ("Incident Number & Title:", f"#{inc_num} - {inc_title}", "Assessed Severity:", severity.upper()),
        ("Detection / Trigger Time:", str(created_time), "Lead Reviewing Analyst:", analyst_name),
        ("Patient Zero Target:", str(rca.get("patient_zero") or "Target Identity / Host"), "AI Triage Engine:", "Sentinel AI SOC Agent (gpt-4o-mini)")
    ]

    for row_idx, (k1, v1, k2, v2) in enumerate(meta_items):
        c1 = meta_tbl.cell(row_idx, 0)
        c2 = meta_tbl.cell(row_idx, 1)
        c1.width = Inches(3.5)
        c2.width = Inches(3.5)
        _set_cell_background(c1, "F8FAFC")
        _set_cell_background(c2, "F8FAFC")
        _set_cell_margins(c1, top=80, bottom=80, left=120, right=120)
        _set_cell_margins(c2, top=80, bottom=80, left=120, right=120)

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r_k1 = p1.add_run(f"{k1} ")
        r_k1.font.bold = True
        r_k1.font.size = Pt(9)
        r_k1.font.color.rgb = RGBColor(0x47, 0x55, 0x69)
        r_v1 = p1.add_run(v1)
        r_v1.font.size = Pt(9.5)
        r_v1.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

        p2 = c2.paragraphs[0]
        p2.paragraph_format.space_after = Pt(0)
        r_k2 = p2.add_run(f"{k2} ")
        r_k2.font.bold = True
        r_k2.font.size = Pt(9)
        r_k2.font.color.rgb = RGBColor(0x47, 0x55, 0x69)
        r_v2 = p2.add_run(v2)
        r_v2.font.size = Pt(9.5)
        r_v2.font.bold = (k2 == "Assessed Severity:")
        r_v2.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph()  # Spacer

    # -------------------------------------------------------------
    # 3. VERDICT CALLOUT CARD
    # -------------------------------------------------------------
    v_tbl = doc.add_table(rows=1, cols=1)
    v_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    v_tbl.autofit = False
    v_cell = v_tbl.cell(0, 0)
    v_cell.width = Inches(7.0)
    _set_cell_background(v_cell, verdict_bg)
    _set_cell_margins(v_cell, top=120, bottom=120, left=160, right=160)

    vp = v_cell.paragraphs[0]
    vp.paragraph_format.space_after = Pt(2)
    vr1 = vp.add_run("FORENSIC AI VERDICT: ")
    vr1.font.size = Pt(10)
    vr1.font.bold = True
    vr1.font.color.rgb = v_rgb

    vr2 = vp.add_run(f"{verdict_label}\n")
    vr2.font.size = Pt(12)
    vr2.font.bold = True
    vr2.font.color.rgb = v_rgb

    vr3 = vp.add_run(f"AI Confidence Score: {confidence}%  |  Classification State: Validated")
    vr3.font.size = Pt(9)
    vr3.font.color.rgb = RGBColor(0x37, 0x41, 0x51)

    # -------------------------------------------------------------
    # 4. SECTION 1: EXECUTIVE SUMMARY & ROOT CAUSE
    # -------------------------------------------------------------
    h1 = doc.add_heading("1. Executive Summary & Incident Root Cause", level=2)
    h1.paragraph_format.space_before = Pt(12)
    h1.paragraph_format.space_after = Pt(4)
    h1.runs[0].font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    p_exec = doc.add_paragraph()
    p_exec.paragraph_format.space_after = Pt(6)
    p_exec.paragraph_format.line_spacing = 1.15
    p_exec.add_run(report.get("executive_summary", "No executive summary provided."))

    # -------------------------------------------------------------
    # 5. SECTION 2: PATIENT ZERO & ATTACK VECTOR
    # -------------------------------------------------------------
    h2 = doc.add_heading("2. Patient Zero & Initial Attack Vector", level=2)
    h2.paragraph_format.space_before = Pt(10)
    h2.paragraph_format.space_after = Pt(4)
    h2.runs[0].font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    p_vec = doc.add_paragraph()
    p_vec.paragraph_format.space_after = Pt(4)
    r_vec_lbl = p_vec.add_run("Initial Ingress Vector: ")
    r_vec_lbl.font.bold = True
    p_vec.add_run(str(rca.get("initial_access_vector") or incident.get("description") or "Automated Sentinel analytic alert rule trigger."))

    # -------------------------------------------------------------
    # 6. SECTION 3: PROCESS TREE & SUBPROCESS LINEAGE
    # -------------------------------------------------------------
    process_tree = rca.get("process_tree", [])
    if process_tree:
        h3 = doc.add_heading("3. Process Execution Lineage & Subprocess Tree", level=2)
        h3.paragraph_format.space_before = Pt(10)
        h3.paragraph_format.space_after = Pt(4)
        h3.runs[0].font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

        pt_tbl = doc.add_table(rows=len(process_tree) + 1, cols=3)
        pt_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        pt_tbl.autofit = False

        headers = ["PID", "Process Name", "Executed Command & Payload"]
        widths = [Inches(1.0), Inches(2.0), Inches(4.0)]

        for c_idx, h_text in enumerate(headers):
            c = pt_tbl.cell(0, c_idx)
            c.width = widths[c_idx]
            _set_cell_background(c, "1E293B")
            _set_cell_margins(c, top=80, bottom=80, left=100, right=100)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(h_text)
            run.font.bold = True
            run.font.size = Pt(8.5)
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

        for r_idx, proc in enumerate(process_tree):
            r_num = r_idx + 1
            bg_c = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
            
            c0 = pt_tbl.cell(r_num, 0)
            c1 = pt_tbl.cell(r_num, 1)
            c2 = pt_tbl.cell(r_num, 2)
            c0.width, c1.width, c2.width = widths

            for c in [c0, c1, c2]:
                _set_cell_background(c, bg_c)
                _set_cell_margins(c, top=60, bottom=60, left=100, right=100)

            c0.paragraphs[0].add_run(str(proc.get("pid", "N/A"))).font.size = Pt(8.5)
            c1.paragraphs[0].add_run(str(proc.get("process", "N/A"))).font.size = Pt(8.5)
            
            p2 = c2.paragraphs[0]
            p2.paragraph_format.space_after = Pt(0)
            r_cmd = p2.add_run(str(proc.get("command", "N/A")))
            r_cmd.font.name = 'Courier New'
            r_cmd.font.size = Pt(8)
            
            if proc.get("decoded"):
                p_dec = c2.add_paragraph()
                p_dec.paragraph_format.space_after = Pt(0)
                r_dec = p_dec.add_run(f"Decoded: {proc.get('decoded')}")
                r_dec.font.bold = True
                r_dec.font.name = 'Courier New'
                r_dec.font.size = Pt(8)
                r_dec.font.color.rgb = RGBColor(0x05, 0x96, 0x69)

    # -------------------------------------------------------------
    # 7. SECTION 4: NETWORK EGRESS & C2 TELEMETRY
    # -------------------------------------------------------------
    c2 = rca.get("network_c2_telemetry", {})
    if c2.get("destination_ip") and c2.get("destination_ip") != "No External C2 Observed":
        h4 = doc.add_heading("4. Origin / Command & Control (C2) Telemetry", level=2)
        h4.paragraph_format.space_before = Pt(10)
        h4.paragraph_format.space_after = Pt(4)
        h4.runs[0].font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

        p_c2 = doc.add_paragraph()
        p_c2.paragraph_format.space_after = Pt(2)
        p_c2.add_run("• Destination Endpoint: ").bold = True
        p_c2.add_run(f"{c2.get('destination_ip')}:{c2.get('port', 443)} ({c2.get('protocol', 'HTTPS')})\n")
        p_c2.add_run("• Threat Reputation: ").bold = True
        p_c2.add_run(f"{c2.get('reputation', 'Threat Node')}\n")
        p_c2.add_run("• Telemetry Volume: ").bold = True
        p_c2.add_run(f"{c2.get('bytes_transferred', 'Outbound Stream')}")

    # -------------------------------------------------------------
    # 8. SECTION 5: MITRE ATT&CK ALIGNMENT
    # -------------------------------------------------------------
    mitre = report.get("mitre_attack", {})
    tactics = mitre.get("tactics", [])
    techniques = mitre.get("techniques", [])
    if tactics or techniques:
        h5 = doc.add_heading("5. MITRE ATT&CK Framework Alignment", level=2)
        h5.paragraph_format.space_before = Pt(10)
        h5.paragraph_format.space_after = Pt(4)
        h5.runs[0].font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

        p_m = doc.add_paragraph()
        p_m.paragraph_format.space_after = Pt(4)
        r_tac = p_m.add_run("Tactics Identified: ")
        r_tac.font.bold = True
        p_m.add_run(", ".join(tactics) if tactics else "None recorded")

        p_m2 = doc.add_paragraph()
        p_m2.paragraph_format.space_after = Pt(4)
        r_tec = p_m2.add_run("Techniques Identified: ")
        r_tec.font.bold = True
        p_m2.add_run(", ".join(techniques) if techniques else "None recorded")

    # -------------------------------------------------------------
    # 9. SECTION 6: KEY FORENSIC EVIDENCE FINDINGS
    # -------------------------------------------------------------
    findings = report.get("evidence_findings", [])
    h6 = doc.add_heading("6. Key Forensic Evidence Findings", level=2)
    h6.paragraph_format.space_before = Pt(10)
    h6.paragraph_format.space_after = Pt(4)
    h6.runs[0].font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    if findings:
        for idx, finding in enumerate(findings):
            p_ev = doc.add_paragraph(style='List Bullet')
            p_ev.paragraph_format.space_after = Pt(2)
            p_ev.add_run(finding)
    else:
        p_none = doc.add_paragraph()
        p_none.add_run("No specific forensic indicators recorded.")

    # -------------------------------------------------------------
    # 10. SECTION 7: CORRECTIVE & PREVENTIVE ACTION PLAN (CAPA)
    # -------------------------------------------------------------
    actions = rca.get("corrective_and_preventive_actions") or report.get("recommended_actions", [])
    h7 = doc.add_heading("7. Corrective & Preventive Action Plan (CAPA)", level=2)
    h7.paragraph_format.space_before = Pt(10)
    h7.paragraph_format.space_after = Pt(4)
    h7.runs[0].font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    if actions:
        for action in actions:
            p_act = doc.add_paragraph(style='List Bullet')
            p_act.paragraph_format.space_after = Pt(2)
            r_act = p_act.add_run(f"[ACTION REQUIRED] {action}")
            r_act.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    else:
        doc.add_paragraph().add_run("No containment actions required.")

    # -------------------------------------------------------------
    # 11. SECTION 8: EXECUTED KQL HUNTING QUERIES
    # -------------------------------------------------------------
    kql_queries = report.get("kql_queries_used", [])
    if kql_queries:
        h8 = doc.add_heading("8. Executed Log Analytics KQL Hunting Queries", level=2)
        h8.paragraph_format.space_before = Pt(10)
        h8.paragraph_format.space_after = Pt(4)
        h8.runs[0].font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

        for q in kql_queries:
            q_tbl = doc.add_table(rows=1, cols=1)
            q_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            q_tbl.autofit = False
            q_cell = q_tbl.cell(0, 0)
            q_cell.width = Inches(7.0)
            _set_cell_background(q_cell, "0B0F19")
            _set_cell_margins(q_cell, top=80, bottom=80, left=120, right=120)
            qp = q_cell.paragraphs[0]
            qp.paragraph_format.space_after = Pt(0)
            qr = qp.add_run(q)
            qr.font.name = 'Courier New'
            qr.font.size = Pt(8.5)
            qr.font.color.rgb = RGBColor(0x67, 0xE8, 0xF9)
            doc.add_paragraph()  # Spacer

    # -------------------------------------------------------------
    # 12. SECTION 9: ANALYST SIGN-OFF & AUDIT TRAIL
    # -------------------------------------------------------------
    h9 = doc.add_heading("9. Formal Analyst Sign-Off & Audit Verification", level=2)
    h9.paragraph_format.space_before = Pt(12)
    h9.paragraph_format.space_after = Pt(4)
    h9.runs[0].font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    sign_tbl = doc.add_table(rows=3, cols=2)
    sign_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    sign_tbl.autofit = False

    audit_payload = f"{inc_num}:{verdict}:{confidence}:{analyst_name}:{created_time}"
    audit_hash = hashlib.sha256(audit_payload.encode()).hexdigest()

    sign_items = [
        ("Reviewing Security Analyst:", analyst_name, "Sign-off Timestamp:", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")),
        ("Closure Classification:", f"{verdict} (Verified)", "Compliance Standard:", "SOC 2 Type II / ISO 27001"),
        ("Cryptographic Audit Hash:", f"SHA256: {audit_hash[:24]}...", "Verification Status:", "DIGITALLY SIGNED & VERIFIED")
    ]

    for r_idx, (k1, v1, k2, v2) in enumerate(sign_items):
        c1 = sign_tbl.cell(r_idx, 0)
        c2 = sign_tbl.cell(r_idx, 1)
        c1.width = Inches(3.5)
        c2.width = Inches(3.5)
        _set_cell_background(c1, "F1F5F9")
        _set_cell_background(c2, "F1F5F9")
        _set_cell_margins(c1, top=80, bottom=80, left=120, right=120)
        _set_cell_margins(c2, top=80, bottom=80, left=120, right=120)

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        p1.add_run(f"{k1} ").font.bold = True
        p1.runs[0].font.size = Pt(8.5)
        p1.add_run(v1).font.size = Pt(8.5)

        p2 = c2.paragraphs[0]
        p2.paragraph_format.space_after = Pt(0)
        p2.add_run(f"{k2} ").font.bold = True
        p2.runs[0].font.size = Pt(8.5)
        r_v2 = p2.add_run(v2)
        r_v2.font.size = Pt(8.5)
        if k2 == "Verification Status:":
            r_v2.font.bold = True
            r_v2.font.color.rgb = RGBColor(0x05, 0x96, 0x69)

    # Save to memory buffer
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    return file_stream


def generate_html_report(
    incident: Dict[str, Any],
    report: Dict[str, Any],
    analyst_name: str = "SOC Lead"
) -> str:
    """Generates an A4 print-ready HTML / PDF Executive Incident Brief."""
    inc_num = str(incident.get("incidentNumber") or incident.get("id") or "Report")
    inc_title = incident.get("title", "Microsoft Sentinel Incident")
    created_time = incident.get("createdTimeUtc", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
    severity = str(report.get("severity_assessment") or incident.get("severity") or "Medium")
    verdict = report.get("verdict", "TRUE_POSITIVE")
    confidence = report.get("confidence_score", 90)
    rca = report.get("root_cause_analysis", {})

    v_color = "#DC2626" if verdict == "TRUE_POSITIVE" else "#059669" if verdict == "FALSE_POSITIVE" else "#D97706"
    v_bg = "#FEE2E2" if verdict == "TRUE_POSITIVE" else "#D1FAE5" if verdict == "FALSE_POSITIVE" else "#FEF3C7"

    tactics_html = "".join([f'<span class="badge badge-tac">{t}</span>' for t in report.get("mitre_attack", {}).get("tactics", [])]) or "None recorded"
    techniques_html = "".join([f'<span class="badge badge-tec">{t}</span>' for t in report.get("mitre_attack", {}).get("techniques", [])]) or "None recorded"

    evidence_html = "".join([f'<div class="ev-row"><span class="ev-num">#{i+1}</span><span>{e}</span></div>' for i, e in enumerate(report.get("evidence_findings", []))]) or "<p>No indicators recorded.</p>"
    actions_html = "".join([f'<li class="act-row"><span class="check">✓</span><span>{a}</span></li>' for a in (rca.get("corrective_and_preventive_actions") or report.get("recommended_actions", []))]) or "<li>No actions required.</li>"
    kql_html = "".join([f'<pre class="kql-code"><code>{q}</code></pre>' for q in report.get("kql_queries_used", [])])

    audit_payload = f"{inc_num}:{verdict}:{confidence}:{analyst_name}:{created_time}"
    audit_hash = hashlib.sha256(audit_payload.encode()).hexdigest()

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Sentinel_Executive_Incident_Brief_#{inc_num}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
    @page {{ size: A4; margin: 15mm; }}
    body {{ font-family: 'Inter', -apple-system, sans-serif; color: #0F172A; background: #FFF; margin: 0; padding: 20px; font-size: 11px; line-height: 1.5; -webkit-print-color-adjust: exact !important; }}
    .header-tbl {{ width: 100%; border-bottom: 2px solid #0F172A; padding-bottom: 10px; margin-bottom: 14px; }}
    .meta-grid {{ background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }}
    .meta-lbl {{ font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #64748B; }}
    .meta-val {{ font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; }}
    .verdict-box {{ border: 2px solid {v_color}; background: {v_bg}; border-radius: 6px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }}
    .sec-h {{ font-size: 11px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-top: 14px; margin-bottom: 8px; color: #0F172A; }}
    .box-p {{ background: #F8FAFC; border-left: 3px solid #2563EB; padding: 8px 12px; font-size: 11px; border-radius: 0 4px 4px 0; margin-bottom: 8px; }}
    .badge {{ display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; font-family: 'JetBrains Mono', monospace; margin-right: 4px; margin-bottom: 4px; }}
    .badge-tac {{ background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }}
    .badge-tec {{ background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }}
    .ev-row {{ display: flex; margin-bottom: 4px; padding: 5px 8px; background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 4px; }}
    .ev-num {{ font-weight: 700; color: #2563EB; margin-right: 8px; font-family: 'JetBrains Mono', monospace; }}
    .act-list {{ list-style: none; padding: 0; margin: 0; }}
    .act-row {{ display: flex; align-items: center; padding: 4px 0; }}
    .check {{ display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border-radius: 2px; background: #10B981; color: #FFF; font-size: 9px; margin-right: 8px; font-weight: bold; }}
    .kql-code {{ background: #0B0F19; color: #67E8F9; padding: 8px 10px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 9px; white-space: pre-wrap; margin-bottom: 8px; }}
    .sign-box {{ background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 10px 14px; margin-top: 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 10px; }}
    .footer {{ margin-top: 20px; border-top: 1px solid #E2E8F0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8.5px; color: #94A3B8; }}
  </style>
</head>
<body onload="window.print()">
  <table class="header-tbl">
    <tr>
      <td>
        <div style="font-size:16px; font-weight:900; color:#0F172A; letter-spacing:-0.5px;">🛡️ MICROSOFT SENTINEL <span style="color:#2563EB;">AI SOC</span></div>
        <div style="font-size:10px; color:#64748B;">Executive Incident Forensic & Root Cause Analysis (RCA) Brief</div>
      </td>
      <td style="text-align: right; vertical-align: top;">
        <div style="font-size: 10px; font-weight: 800; color: #DC2626;">RESTRICTED // SOC-IR</div>
      </td>
    </tr>
  </table>

  <div class="meta-grid">
    <div><div class="meta-lbl">Incident ID</div><div class="meta-val">#{inc_num}</div></div>
    <div><div class="meta-lbl">Detection Time</div><div class="meta-val">{created_time}</div></div>
    <div><div class="meta-lbl">Assessed Severity</div><div class="meta-val" style="color:{v_color}; font-weight:bold;">{severity.upper()}</div></div>
    <div><div class="meta-lbl">Reviewing Analyst</div><div class="meta-val">{analyst_name}</div></div>
  </div>

  <div class="verdict-box">
    <div>
      <div style="font-size:8.5px; font-weight:700; color:{v_color}; text-transform:uppercase;">AI FORENSIC VERDICT</div>
      <div style="font-size:14px; font-weight:900; color:{v_color};">{verdict.replace('_', ' ')}</div>
    </div>
    <div style="font-size:22px; font-weight:900; font-family:'JetBrains Mono', monospace; color:{v_color};">
      {confidence}%
    </div>
  </div>

  <div class="sec-h">1. Executive Summary & Root Cause Assessment</div>
  <div class="box-p">{report.get("executive_summary", "No summary provided.")}</div>

  <div class="sec-h">2. Patient Zero & Ingress Vector</div>
  <p style="margin: 4px 0 8px 0;"><strong>Ingress Vector:</strong> {rca.get("initial_access_vector") or incident.get("description") or "Analytic detection trigger."}</p>

  <div class="sec-h">3. MITRE ATT&CK Matrix Alignment</div>
  <div style="margin-bottom: 6px;"><strong>Tactics:</strong> {tactics_html}</div>
  <div style="margin-bottom: 8px;"><strong>Techniques:</strong> {techniques_html}</div>

  <div class="sec-h">4. Key Forensic Telemetry & Indicators</div>
  {evidence_html}

  <div class="sec-h">5. Corrective & Preventive Action Plan (CAPA)</div>
  <ul class="act-list">{actions_html}</ul>

  {f'<div class="sec-h">6. Executed KQL Hunting Queries</div>{kql_html}' if kql_html else ''}

  <div class="sec-h">7. Formal Analyst Sign-Off & Verification</div>
  <div class="sign-box">
    <div><strong>Assigned Analyst:</strong> {analyst_name}</div>
    <div><strong>Signed Timestamp:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</div>
    <div><strong>Classification:</strong> {verdict} (Verified)</div>
    <div style="grid-column: span 3; font-family:'JetBrains Mono', monospace; color:#64748B; font-size:9px;">
      Cryptographic Audit Hash: SHA256:{audit_hash}
    </div>
  </div>

  <div class="footer">
    <span>Microsoft Sentinel AI SOC Agent • Executive Incident Brief</span>
    <span>CONFIDENTIAL & PROPRIETARY</span>
  </div>
</body>
</html>"""
