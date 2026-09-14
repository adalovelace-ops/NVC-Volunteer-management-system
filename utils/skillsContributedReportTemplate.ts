import { downloadHtmlPdf } from './pdfDownload';
import { NVC_LOGO_BASE64 } from './nvcLogo';
import type { Project, Volunteer, VolunteerProjectJoinRecord, VolunteerTimeLog } from '../models/types';

export interface SkillDistributionItem {
  skill: string;
  volunteers: number;
  percentage: string;
  color?: string;
}

export interface VolunteerSkillDirectoryItem {
  name: string;
  email: string;
  skills: string;
}

export interface SkillsContributedReportData {
  reportTitle?: string;
  reportSubtitle?: string;
  generatedAt?: string;
  totalIdentifiedSkills: number;
  totalVolunteersContributing: number;
  totalSkillContributions: number;
  donutGradient?: string;
  skills: SkillDistributionItem[];
  directory: VolunteerSkillDirectoryItem[];
}

export interface BuildSkillsContributedParams {
  volunteers: Volunteer[];
  projects?: Project[];
  timeLogs?: VolunteerTimeLog[];
  joinRecords?: VolunteerProjectJoinRecord[];
}

const GREEN_PALETTE = [
  '#216b35',
  '#2d8646',
  '#3f7a54',
  '#539b69',
  '#68af7f',
  '#7ec395',
  '#97d7ac',
  '#b2eac3',
];

function escapeHtml(value?: string | number | null): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeSkill(raw: string): string {
  const cleaned = raw.trim().replace(/^[-*•\s]+/, '');
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function buildSkillsContributedReportData(
  params: BuildSkillsContributedParams
): SkillsContributedReportData {
  const { volunteers = [] } = params;

  const skillVolunteerMap = new Map<string, Set<string>>();
  const volunteerSkillsMap = new Map<string, string[]>();
  let totalContributions = 0;

  volunteers.forEach(v => {
    const rawSkills: string[] = [];
    if (Array.isArray(v.skills)) {
      rawSkills.push(...v.skills);
    }
    if (v.specialSkills && typeof v.specialSkills === 'string') {
      rawSkills.push(...v.specialSkills.split(/[,;\n]+/));
    }

    const uniqueSkills = Array.from(
      new Set(rawSkills.map(normalizeSkill).filter(Boolean))
    );

    if (uniqueSkills.length > 0) {
      uniqueSkills.forEach(skill => {
        if (!skillVolunteerMap.has(skill)) {
          skillVolunteerMap.set(skill, new Set());
        }
        skillVolunteerMap.get(skill)!.add(v.id || v.userId || v.name);
        totalContributions += 1;
      });
      volunteerSkillsMap.set(v.id || v.userId || v.name, uniqueSkills);
    }
  });

  const totalContributing = volunteerSkillsMap.size;
  const totalIdentified = skillVolunteerMap.size;

  const sortedSkills = Array.from(skillVolunteerMap.entries())
    .map(([skill, set]) => ({ skill, count: set.size }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));

  const topSkills = sortedSkills.slice(0, 7);
  const remainingSkills = sortedSkills.slice(7);
  const otherCount = remainingSkills.reduce((sum, item) => sum + item.count, 0);

  const finalBreakdown: SkillDistributionItem[] = topSkills.map((item, idx) => {
    const pct = totalContributing > 0 ? Math.round((item.count / totalContributing) * 100) : 0;
    return {
      skill: item.skill,
      volunteers: item.count,
      percentage: `${pct}%`,
      color: GREEN_PALETTE[idx % GREEN_PALETTE.length],
    };
  });

  if (otherCount > 0) {
    const otherPct = totalContributing > 0 ? Math.round((otherCount / totalContributing) * 100) : 0;
    finalBreakdown.push({
      skill: `Other (${remainingSkills.length})`,
      volunteers: otherCount,
      percentage: `${otherPct}%`,
      color: '#a0c6a0',
    });
  }

  // Build conic-gradient for donut chart
  let gradientStr = 'conic-gradient(#dcebdc 0deg 360deg)';
  if (finalBreakdown.length > 0 && totalContributions > 0) {
    let currentDeg = 0;
    const slices = finalBreakdown.map((item, idx) => {
      const start = currentDeg;
      const deg = Math.round((item.volunteers / Math.max(1, totalContributions)) * 360);
      currentDeg += deg;
      const color = item.color || GREEN_PALETTE[idx % GREEN_PALETTE.length];
      return `${color} ${start}deg ${currentDeg}deg`;
    });
    if (currentDeg < 360) {
      slices.push(`${GREEN_PALETTE[0]} ${currentDeg}deg 360deg`);
    }
    gradientStr = `conic-gradient(${slices.join(', ')})`;
  }

  // Build volunteer directory
  const directory: VolunteerSkillDirectoryItem[] = volunteers
    .map(v => {
      const skillsList = volunteerSkillsMap.get(v.id || v.userId || v.name) || [];
      return {
        name: v.name || 'Volunteer',
        email: v.email || '—',
        skills: skillsList.length > 0 ? skillsList.join(', ') : (v.specialSkills || 'General Support'),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const now = new Date();
  const generatedAt = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    reportTitle: 'SKILLS CONTRIBUTED REPORT',
    reportSubtitle: 'NEGRENSE VOLUNTEERS FOR CHANGE (NVC) FOUNDATION',
    generatedAt,
    totalIdentifiedSkills: totalIdentified,
    totalVolunteersContributing: totalContributing,
    totalSkillContributions: totalContributions,
    donutGradient: gradientStr,
    skills: finalBreakdown,
    directory,
  };
}

export function generateSkillsContributedReportHtml(data: SkillsContributedReportData): string {
  const generatedAt = escapeHtml(data.generatedAt || new Date().toLocaleString());
  const donutGradient = data.donutGradient || 'conic-gradient(#dcebdc 0deg 45deg,#c9dfc9 45deg 90deg,#b5d2b5 90deg 135deg,#a0c6a0 135deg 180deg,#8bb88b 180deg 225deg,#76a976 225deg 270deg,#609760 270deg 315deg,#dcebdc 315deg 360deg)';

  const breakdownRowsHtml = data.skills.length > 0
    ? data.skills
        .map(
          item => `
        <tr>
          <td><strong>${escapeHtml(item.skill)}</strong></td>
          <td>${escapeHtml(item.volunteers)}</td>
          <td>${escapeHtml(item.percentage)}</td>
        </tr>`
        )
        .join('')
    : '<tr><td class="empty" colspan="3">No skill distribution recorded yet.</td></tr>';

  const directoryRowsHtml = data.directory.length > 0
    ? data.directory
        .map(
          v => `
        <tr>
          <td><strong>${escapeHtml(v.name)}</strong></td>
          <td class="meta-email">${escapeHtml(v.email)}</td>
          <td>${escapeHtml(v.skills)}</td>
        </tr>`
        )
        .join('')
    : '<tr><td class="empty" colspan="3">No volunteer directory available.</td></tr>';

  return `<!DOCTYPE html>
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
  display:flex;
  align-items:center;
  justify-content:center;
  color:var(--green);
  font-size:24px;
  font-weight:700;
  overflow:hidden;
}
.logo img{
  width:100%;
  height:100%;
  object-fit:contain;
}
.brand-name{font-size:25px;font-weight:800;line-height:1;color:var(--text)}
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
.subtitle{margin:0;color:var(--muted);font-size:14px;font-weight:600}
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
  border-radius:6px;
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
  color:var(--text);
}
.chart{
  margin-top:18px;
  border:1px solid var(--border);
  border-radius:6px;
  padding:22px;
  min-height:300px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#fafcfb;
}
.donut{
  width:230px;
  height:230px;
  border-radius:50%;
  background:${donutGradient};
  position:relative;
  box-shadow:0 4px 12px rgba(0,0,0,0.06);
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
.donut-label strong{font-size:38px;color:var(--text);line-height:1}
.donut-label span{font-size:13px;font-weight:800;letter-spacing:1px;color:var(--green);margin-top:4px}
.breakdown{
  margin-top:18px;
  border:1px solid var(--border);
  border-radius:6px;
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
  letter-spacing:0.5px;
}
tbody tr:nth-child(even){background:#fafcfb}
tbody tr:last-child td{border-bottom:0}
.meta-email{color:var(--muted);font-size:12px}
.empty{color:#98a2b3;text-align:center;padding:18px}
.directory{margin-top:18px;border:1px solid var(--border);border-radius:6px;overflow:hidden}
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
    <div class="logo">
      <img src="${NVC_LOGO_BASE64}" alt="NVC Foundation Logo" />
    </div>
    <div>
      <div class="brand-name">nvc</div>
      <div class="brand-sub">FOUNDATION</div>
    </div>
  </div>
  <div class="report-meta">
    <strong>SKILLS CONTRIBUTED REPORT</strong>
    <span>Report Generated: ${generatedAt}</span>
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
      <div class="metric-value">${escapeHtml(data.totalIdentifiedSkills)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Volunteers Contributing</div>
      <div class="metric-value">${escapeHtml(data.totalVolunteersContributing)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Skill Contributions</div>
      <div class="metric-value">${escapeHtml(data.totalSkillContributions)}</div>
    </div>
  </div>

  <div class="chart">
    <div class="donut">
      <div class="donut-label">
        <strong>${escapeHtml(data.totalIdentifiedSkills)}</strong>
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
        ${breakdownRowsHtml}
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
        ${directoryRowsHtml}
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
</html>`;
}

export async function exportSkillsContributedReportPdf(
  data: SkillsContributedReportData,
  filename: string = `NVC_Skills_Contributed_Report_${new Date().toISOString().slice(0, 10)}.pdf`
): Promise<void> {
  const html = generateSkillsContributedReportHtml(data);
  await downloadHtmlPdf(filename, html);
}
