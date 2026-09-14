from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.units import mm

out_dir = Path(__file__).parent
html_path = out_dir / "nvc_skills_contributed_report_template.html"
pdf_path = out_dir / "nvc_skills_contributed_report_template.pdf"

# ---------- HTML ----------
html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NVC Skills Contributed Report</title>
<style>
:root{
  --green:#216b35;
  --green-light:#eef7f0;
  --text:#172033;
  --muted:#667085;
  --border:#dfe5e1;
}
*{box-sizing:border-box}
body{
  margin:0;
  background:#fff;
  color:var(--text);
  font-family:Arial,Helvetica,sans-serif;
  font-size:13px;
}
.report{
  width:min(1120px,100%);
  margin:auto;
  padding:34px 42px;
}
.header{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  padding-bottom:18px;
  border-bottom:3px solid var(--green);
}
.brand{
  display:flex;
  align-items:center;
  gap:12px;
}
.logo{
  width:46px;height:46px;
  border-radius:10px;
  background:var(--green-light);
  display:grid;
  place-items:center;
  color:var(--green);
  font-size:24px;
  font-weight:700;
}
.brand-name{font-size:25px;font-weight:800;line-height:1}
.brand-sub{font-size:10px;color:var(--green);font-weight:800;letter-spacing:1px;margin-top:3px}
.report-meta{text-align:right;line-height:1.6}
.report-meta strong{display:block;color:var(--green);font-size:15px}
.report-meta span{color:var(--muted)}
.title-block{
  padding:25px 0 18px;
  border-bottom:1px solid var(--border);
}
h1{
  margin:0 0 6px;
  color:var(--green);
  font-size:28px;
  letter-spacing:-.5px;
}
.subtitle{margin:0;color:var(--muted);font-size:14px}
.section{padding-top:22px}
.section-title{
  margin:0 0 5px;
  color:var(--green);
  font-size:20px;
}
.section-desc{margin:0 0 15px;color:var(--muted)}
.summary{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:12px;
}
.metric{
  border:1px solid var(--border);
  background:var(--green-light);
  padding:16px;
  min-height:92px;
}
.metric-label{
  color:var(--green);
  font-weight:700;
  font-size:11px;
  text-transform:uppercase;
}
.metric-value{
  margin-top:13px;
  font-size:28px;
  font-weight:800;
}
.chart{
  margin-top:18px;
  border:1px solid var(--border);
  padding:22px;
  min-height:300px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.donut{
  width:230px;
  height:230px;
  border-radius:50%;
  background:conic-gradient(#dcebdc 0deg 45deg,#c9dfc9 45deg 90deg,#b5d2b5 90deg 135deg,#a0c6a0 135deg 180deg,#8bb88b 180deg 225deg,#76a976 225deg 270deg,#609760 270deg 315deg,#dcebdc 315deg 360deg);
  position:relative;
}
.donut:after{
  content:"";
  position:absolute;
  inset:65px;
  background:#fff;
  border-radius:50%;
}
.donut-label{
  position:absolute;
  inset:0;
  z-index:2;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  color:var(--muted);
}
.donut-label strong{font-size:38px;color:var(--text)}
.donut-label span{font-size:14px;font-weight:700;letter-spacing:.5px}
.breakdown{
  margin-top:18px;
  border:1px solid var(--border);
  overflow:hidden;
}
.breakdown table,.directory table{
  width:100%;
  border-collapse:collapse;
}
th,td{
  padding:11px 13px;
  text-align:left;
  border-bottom:1px solid var(--border);
}
th{
  background:var(--green-light);
  color:var(--green);
  font-size:11px;
  text-transform:uppercase;
}
tbody tr:last-child td{border-bottom:0}
.empty{color:#98a2b3}
.directory{margin-top:18px;border:1px solid var(--border);overflow:hidden}
.footer{
  margin-top:28px;
  padding-top:11px;
  border-top:2px solid var(--green);
  display:flex;
  justify-content:space-between;
  color:var(--muted);
  font-size:11px;
}
@media(max-width:700px){
  .report{padding:22px}
  .header{flex-direction:column;gap:14px}
  .report-meta{text-align:left}
  .summary{grid-template-columns:1fr}
}
@media print{
  .report{width:100%;padding:20px}
}
</style>
</head>
<body>
<main class="report">

<header class="header">
  <div class="brand">
    <div class="logo">✚</div>
    <div>
      <div class="brand-name">nvc</div>
      <div class="brand-sub">FOUNDATION</div>
    </div>
  </div>
  <div class="report-meta">
    <strong>SKILLS CONTRIBUTED REPORT</strong>
    <span>Report Generated: [Date and Time]</span>
  </div>
</header>

<section class="title-block">
  <h1>SKILLS CONTRIBUTED REPORT</h1>
  <p class="subtitle">NEGRENSE VOLUNTEERS FOR CHANGE (NVC) FOUNDATION</p>
</section>

<section class="section">
  <h2 class="section-title">Skills Contributed by Volunteers</h2>
  <p class="section-desc">Summary of skills contributed by volunteers.</p>

  <div class="summary">
    <div class="metric">
      <div class="metric-label">Total Identified Skills</div>
      <div class="metric-value">___</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Volunteers Contributing</div>
      <div class="metric-value">___</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Skill Contributions</div>
      <div class="metric-value">___</div>
    </div>
  </div>

  <div class="chart">
    <div class="donut">
      <div class="donut-label">
        <strong>__</strong>
        <span>SKILLS</span>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <h2 class="section-title">Skill Distribution Breakdown</h2>
  <div class="breakdown">
    <table>
      <thead>
        <tr>
          <th>Skill</th>
          <th>Volunteers</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="empty">[Skill]</td><td>___</td><td>___%</td></tr>
        <tr><td class="empty">[Skill]</td><td>___</td><td>___%</td></tr>
        <tr><td class="empty">[Skill]</td><td>___</td><td>___%</td></tr>
        <tr><td class="empty">[Skill]</td><td>___</td><td>___%</td></tr>
        <tr><td class="empty">[Skill]</td><td>___</td><td>___%</td></tr>
        <tr><td class="empty">[Skill]</td><td>___</td><td>___%</td></tr>
        <tr><td class="empty">[Skill]</td><td>___</td><td>___%</td></tr>
        <tr><td class="empty">Other</td><td>___</td><td>___%</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section class="section">
  <h2 class="section-title">Volunteer Skills Directory</h2>
  <div class="directory">
    <table>
      <thead>
        <tr>
          <th>Volunteer</th>
          <th>Email</th>
          <th>Skills</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="empty">[Volunteer Name]</td><td class="empty">[Email]</td><td class="empty">[Skills]</td></tr>
        <tr><td class="empty">[Volunteer Name]</td><td class="empty">[Email]</td><td class="empty">[Skills]</td></tr>
        <tr><td class="empty">[Volunteer Name]</td><td class="empty">[Email]</td><td class="empty">[Skills]</td></tr>
        <tr><td class="empty">[Volunteer Name]</td><td class="empty">[Email]</td><td class="empty">[Skills]</td></tr>
        <tr><td class="empty">[Volunteer Name]</td><td class="empty">[Email]</td><td class="empty">[Skills]</td></tr>
        <tr><td class="empty">[Volunteer Name]</td><td class="empty">[Email]</td><td class="empty">[Skills]</td></tr>
      </tbody>
    </table>
  </div>
</section>

<footer class="footer">
  <span>nvcfoundation-ph.org</span>
  <span>NVC Foundation</span>
</footer>

</main>
</body>
</html>
"""

html_path.write_text(html, encoding="utf-8")

# ---------- PDF ----------
doc = SimpleDocTemplate(
    str(pdf_path),
    pagesize=A4,
    rightMargin=18*mm,
    leftMargin=18*mm,
    topMargin=16*mm,
    bottomMargin=16*mm
)

styles = getSampleStyleSheet()
green = colors.HexColor("#216b35")
light = colors.HexColor("#eef7f0")
text = colors.HexColor("#172033")
muted = colors.HexColor("#667085")
border = colors.HexColor("#dfe5e1")

title = ParagraphStyle("Title", parent=styles["Heading1"], fontName="Helvetica-Bold",
                       fontSize=22, leading=26, textColor=green, spaceAfter=5)
section = ParagraphStyle("Section", parent=styles["Heading2"], fontName="Helvetica-Bold",
                         fontSize=14, leading=18, textColor=green, spaceBefore=8, spaceAfter=5)
body = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica",
                      fontSize=9, leading=12, textColor=muted)
small = ParagraphStyle("Small", parent=body, fontSize=8)
right = ParagraphStyle("Right", parent=body, alignment=TA_RIGHT)

story = []

header_data = [[
    Paragraph("<b><font size='23'>nvc</font></b><br/><font color='#216b35' size='8'><b>FOUNDATION</b></font>", body),
    Paragraph("<b><font color='#216b35'>SKILLS CONTRIBUTED REPORT</font></b><br/>Report Generated: [Date and Time]", right)
]]
header = Table(header_data, colWidths=[85*mm, 85*mm])
header.setStyle(TableStyle([
    ("VALIGN",(0,0),(-1,-1),"TOP"),
    ("LINEBELOW",(0,0),(-1,-1),2,green),
    ("BOTTOMPADDING",(0,0),(-1,-1),10),
]))
story += [header, Spacer(1, 9)]

story += [
    Paragraph("SKILLS CONTRIBUTED REPORT", title),
    Paragraph("NEGRENSE VOLUNTEERS FOR CHANGE (NVC) FOUNDATION", body),
    Spacer(1, 12),
    Paragraph("Skills Contributed by Volunteers", section),
    Paragraph("Summary of skills contributed by volunteers.", body),
    Spacer(1, 7)
]

metrics = [
    [Paragraph("<b>TOTAL IDENTIFIED SKILLS</b><br/><font size='22'>___</font>", small),
     Paragraph("<b>TOTAL VOLUNTEERS CONTRIBUTING</b><br/><font size='22'>___</font>", small),
     Paragraph("<b>TOTAL SKILL CONTRIBUTIONS</b><br/><font size='22'>___</font>", small)]
]
mt = Table(metrics, colWidths=[56*mm,56*mm,56*mm], rowHeights=[25*mm])
mt.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,-1),light),
    ("BOX",(0,0),(-1,-1),0.6,border),
    ("INNERGRID",(0,0),(-1,-1),0.6,border),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("LEFTPADDING",(0,0),(-1,-1),10),
]))
story += [mt, Spacer(1, 14)]

chart_placeholder = Table(
    [[Paragraph("<font size='32'><b>__</b></font><br/><font size='10'>SKILLS</font>", 
                ParagraphStyle("center", parent=body, alignment=1, textColor=text))]],
    colWidths=[58*mm], rowHeights=[58*mm]
)
chart_placeholder.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,-1),colors.white),
    ("BOX",(0,0),(-1,-1),45,colors.HexColor("#dcebdc")),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("ALIGN",(0,0),(-1,-1),"CENTER"),
]))
story += [
    Paragraph("Skill Distribution", section),
    chart_placeholder,
    Spacer(1, 12),
    Paragraph("Skill Distribution Breakdown", section)
]

breakdown_data = [[
    Paragraph("<b>SKILL</b>", small),
    Paragraph("<b>VOLUNTEERS</b>", small),
    Paragraph("<b>PERCENTAGE</b>", small)
]]
for skill in ["[Skill]"] * 7 + ["Other"]:
    breakdown_data.append([skill, "___", "___%"])

bt = Table(breakdown_data, colWidths=[95*mm,38*mm,38*mm])
bt.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),light),
    ("TEXTCOLOR",(0,0),(-1,0),green),
    ("GRID",(0,0),(-1,-1),0.5,border),
    ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
    ("FONTSIZE",(0,0),(-1,-1),8),
    ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#fafcfb")]),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("TOPPADDING",(0,0),(-1,-1),7),
    ("BOTTOMPADDING",(0,0),(-1,-1),7),
]))
story += [bt, Spacer(1, 12), Paragraph("Volunteer Skills Directory", section)]

directory_data = [[
    Paragraph("<b>VOLUNTEER</b>", small),
    Paragraph("<b>EMAIL</b>", small),
    Paragraph("<b>SKILLS</b>", small)
]]
for _ in range(6):
    directory_data.append(["[Volunteer Name]", "[Email]", "[Skills]"])

dt = Table(directory_data, colWidths=[48*mm,55*mm,68*mm], repeatRows=1)
dt.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),light),
    ("TEXTCOLOR",(0,0),(-1,0),green),
    ("GRID",(0,0),(-1,-1),0.5,border),
    ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
    ("FONTSIZE",(0,0),(-1,-1),8),
    ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#fafcfb")]),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("TOPPADDING",(0,0),(-1,-1),7),
    ("BOTTOMPADDING",(0,0),(-1,-1),7),
]))
story.append(dt)
story.append(Spacer(1, 14))

footer = Table([[
    Paragraph("nvcfoundation-ph.org", small),
    Paragraph("NVC Foundation", ParagraphStyle("footerR", parent=small, alignment=TA_RIGHT))
]], colWidths=[85*mm,85*mm])
footer.setStyle(TableStyle([
    ("LINEABOVE",(0,0),(-1,-1),1.2,green),
    ("TOPPADDING",(0,0),(-1,-1),7),
]))
story.append(footer)

doc.build(story)

if __name__ == "__main__":
    print(f"Created HTML: {html_path}")
    print(f"Created PDF: {pdf_path}")
