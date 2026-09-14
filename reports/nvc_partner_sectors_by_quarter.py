from pathlib import Path

out_dir = Path(__file__).parent
html_path = out_dir / "nvc_partner_sectors_by_quarter_template.html"
pdf_path = out_dir / "nvc_partner_sectors_by_quarter_template.pdf"



# ---------- HTML ----------
html = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>NVC Partner Sectors by Quarter</title>
<style>
:root{--g:#216b35;--gl:#eef7f0;--t:#172033;--m:#667085;--b:#dfe5e1}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--t);font-family:Arial,Helvetica,sans-serif}
.report{max-width:1200px;margin:auto;padding:30px 36px}.top{display:flex;justify-content:space-between;padding-bottom:18px;border-bottom:3px solid var(--g)}
.brand{display:flex;gap:12px;align-items:center}.logo{width:46px;height:46px;border-radius:10px;background:var(--gl);display:grid;place-items:center;color:var(--g);font-size:23px;font-weight:800}
.brand strong{display:block;font-size:25px}.brand span{color:var(--g);font-size:11px;font-weight:800;letter-spacing:1px}.type{text-align:right;color:var(--g);font-weight:800;line-height:1.5}.type span{display:block;color:var(--t)}
.heading{padding:25px 0 20px;border-bottom:1px solid var(--b)}h1{margin:0 0 6px;font-size:30px}.subtitle{margin:0;color:var(--m);font-size:16px}
.section{padding-top:24px}.title{margin:0 0 6px;color:var(--g);font-size:21px}.desc{margin:0 0 16px;color:var(--m)}
.table-wrap{border:1px solid var(--b);overflow:hidden}table{width:100%;border-collapse:collapse}th,td{padding:14px 16px;text-align:left;border-bottom:1px solid var(--b)}th{background:var(--gl);color:var(--g);font-size:12px;text-transform:uppercase}td{height:50px}.last td{border-bottom:0}.num{font-weight:800;color:var(--g)}
.grid{margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.q{border:1px solid var(--b);padding:17px 18px}.q h3{margin:0 0 12px;color:var(--g);font-size:16px}.partner{padding:10px 0;border-top:1px solid var(--b)}.partner:first-of-type{border-top:0}.name{font-weight:700}.sector{color:var(--m);font-size:12px;margin-top:3px}.empty{color:#98a2b3;padding:8px 0}
.footer{margin-top:30px;padding-top:12px;border-top:2px solid var(--g);display:flex;justify-content:space-between;color:var(--m);font-size:12px}
@media(max-width:700px){.report{padding:22px}.top{flex-direction:column;gap:14px}.type{text-align:left}.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<main class="report">
<header class="top">
<div class="brand"><div class="logo">✚</div><div><strong>nvc</strong><span>FOUNDATION</span></div></div>
<div class="type">PARTNER REPORT<span>PARTNER SECTORS</span></div>
</header>

<section class="heading">
<h1>PARTNER SECTORS BY QUARTER</h1>
<p class="subtitle">New partner organizations grouped by creation quarter</p>
</section>

<section class="section">
<h2 class="title">Partner Sector Summary</h2>
<p class="desc">Number of new partner organizations by sector and quarter.</p>
<div class="table-wrap">
<table>
<thead><tr><th>Quarter</th><th>NGO</th><th>Hospital</th><th>Institution</th><th>Private</th></tr></thead>
<tbody>
<tr><td><b>Q4 2025</b></td><td class="num">0</td><td class="num">0</td><td class="num">0</td><td class="num">0</td></tr>
<tr><td><b>Q1 2026</b></td><td class="num">0</td><td class="num">0</td><td class="num">0</td><td class="num">0</td></tr>
<tr><td><b>Q2 2026</b></td><td class="num">0</td><td class="num">0</td><td class="num">0</td><td class="num">0</td></tr>
<tr class="last"><td><b>Q3 2026</b></td><td class="num">2</td><td class="num">1</td><td class="num">0</td><td class="num">0</td></tr>
</tbody>
</table>
</div>
</section>

<section class="section">
<h2 class="title">Partners by Quarter</h2>
<p class="desc">Partner organization names grouped by creation quarter.</p>
<div class="grid">
<div class="q"><h3>Q4 2025</h3><div class="empty">No partners registered.</div></div>
<div class="q"><h3>Q1 2026</h3><div class="empty">No partners registered.</div></div>
<div class="q"><h3>Q2 2026</h3><div class="empty">No partners registered.</div></div>
<div class="q"><h3>Q3 2026</h3>
<div class="partner"><div class="name">[Partner Name]</div><div class="sector">NGO</div></div>
<div class="partner"><div class="name">[Partner Name]</div><div class="sector">NGO</div></div>
<div class="partner"><div class="name">[Partner Name]</div><div class="sector">Hospital</div></div>
</div>
</div>
</section>

<footer class="footer"><span>nvcfoundation-ph.org</span><span>NVC Foundation</span></footer>
</main>
</body>
</html>"""

html_path.write_text(html, encoding="utf-8")
print(f"Created HTML: {html_path}")

# ---------- PDF (ReportLab) ----------
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT
    from reportlab.lib.units import mm

    green = colors.HexColor("#216b35")
    light = colors.HexColor("#eef7f0")
    text = colors.HexColor("#172033")
    muted = colors.HexColor("#667085")
    border = colors.HexColor("#dfe5e1")

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=18*mm,
        rightMargin=18*mm,
        topMargin=16*mm,
        bottomMargin=16*mm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("repTitle", parent=styles["Heading1"], fontSize=18, leading=22, textColor=text)
    sub_style = ParagraphStyle("repSub", parent=styles["Normal"], fontSize=9.5, leading=13, textColor=muted)
    section_style = ParagraphStyle("repSec", parent=styles["Heading2"], fontSize=12, leading=16, textColor=green)
    body_style = ParagraphStyle("repBody", parent=styles["Normal"], fontSize=8.5, leading=12, textColor=text)
    bold_style = ParagraphStyle("repBold", parent=body_style, fontName="Helvetica-Bold")
    num_style = ParagraphStyle("repNum", parent=body_style, fontName="Helvetica-Bold", textColor=green)
    small = ParagraphStyle("repSmall", parent=styles["Normal"], fontSize=7.5, leading=10, textColor=muted)

    story = []

    # Top branding
    top_table = Table([[
        Paragraph("<b><font size=16 color='#216b35'>✚</font> nvc</b> <font size=8 color='#216b35'><b>FOUNDATION</b></font>", body_style),
        Paragraph("<font color='#216b35'><b>PARTNER REPORT</b></font><br/><font color='#172033'>PARTNER SECTORS</font>", ParagraphStyle("tr", parent=body_style, alignment=TA_RIGHT))
    ]], colWidths=[110*mm, 64*mm])
    top_table.setStyle(TableStyle([
        ("LINEBELOW", (0,0), (-1,-1), 2, green),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    story += [top_table, Spacer(1, 10)]

    # Heading
    story += [
        Paragraph("PARTNER SECTORS BY QUARTER", title_style),
        Spacer(1, 3),
        Paragraph("New partner organizations grouped by creation quarter", sub_style),
        Spacer(1, 10)
    ]

    # Summary Section
    story += [
        Paragraph("Partner Sector Summary", section_style),
        Spacer(1, 3),
        Paragraph("Number of new partner organizations by sector and quarter.", sub_style),
        Spacer(1, 8)
    ]

    summary_data = [
        [Paragraph("<b>Quarter</b>", bold_style), Paragraph("<b>NGO</b>", bold_style), Paragraph("<b>Hospital</b>", bold_style), Paragraph("<b>Institution</b>", bold_style), Paragraph("<b>Private</b>", bold_style)],
        [Paragraph("<b>Q4 2025</b>", body_style), Paragraph("0", num_style), Paragraph("0", num_style), Paragraph("0", num_style), Paragraph("0", num_style)],
        [Paragraph("<b>Q1 2026</b>", body_style), Paragraph("0", num_style), Paragraph("0", num_style), Paragraph("0", num_style), Paragraph("0", num_style)],
        [Paragraph("<b>Q2 2026</b>", body_style), Paragraph("0", num_style), Paragraph("0", num_style), Paragraph("0", num_style), Paragraph("0", num_style)],
        [Paragraph("<b>Q3 2026</b>", body_style), Paragraph("2", num_style), Paragraph("1", num_style), Paragraph("0", num_style), Paragraph("0", num_style)],
    ]

    st = Table(summary_data, colWidths=[44*mm, 32*mm, 32*mm, 34*mm, 32*mm])
    st.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), light),
        ("TEXTCOLOR", (0,0), (-1,0), green),
        ("GRID", (0,0), (-1,-1), 0.5, border),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story += [st, Spacer(1, 14)]

    # Partners by Quarter Section
    story += [
        Paragraph("Partners by Quarter", section_style),
        Spacer(1, 3),
        Paragraph("Partner organization names grouped by creation quarter.", sub_style),
        Spacer(1, 8)
    ]

    q1 = [Paragraph("<b><font color='#216b35'>Q4 2025</font></b>", body_style), Spacer(1, 4), Paragraph("<font color='#98a2b3'>No partners registered.</font>", small)]
    q2 = [Paragraph("<b><font color='#216b35'>Q1 2026</font></b>", body_style), Spacer(1, 4), Paragraph("<font color='#98a2b3'>No partners registered.</font>", small)]
    q3 = [Paragraph("<b><font color='#216b35'>Q2 2026</font></b>", body_style), Spacer(1, 4), Paragraph("<font color='#98a2b3'>No partners registered.</font>", small)]
    q4 = [
        Paragraph("<b><font color='#216b35'>Q3 2026</font></b>", body_style),
        Spacer(1, 4),
        Paragraph("<b>[Partner Name]</b><br/><font color='#667085' size=7.5>NGO</font>", body_style),
        Spacer(1, 3),
        Paragraph("<b>[Partner Name]</b><br/><font color='#667085' size=7.5>NGO</font>", body_style),
        Spacer(1, 3),
        Paragraph("<b>[Partner Name]</b><br/><font color='#667085' size=7.5>Hospital</font>", body_style),
    ]

    quarter_grid = Table([[q1, q2], [q3, q4]], colWidths=[87*mm, 87*mm])
    quarter_grid.setStyle(TableStyle([
        ("GRID", (0,0), (-1,-1), 0.5, border),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ]))
    story += [quarter_grid, Spacer(1, 14)]

    footer = Table([[
        Paragraph("nvcfoundation-ph.org", small),
        Paragraph("NVC Foundation", ParagraphStyle("footerR", parent=small, alignment=TA_RIGHT))
    ]], colWidths=[87*mm, 87*mm])
    footer.setStyle(TableStyle([
        ("LINEABOVE", (0,0), (-1,-1), 1.2, green),
        ("TOPPADDING", (0,0), (-1,-1), 7),
    ]))
    story.append(footer)

    doc.build(story)
    print(f"Created PDF: {pdf_path}")
except ImportError:
    print("ReportLab not installed in current Python env. Generated HTML file successfully.")

