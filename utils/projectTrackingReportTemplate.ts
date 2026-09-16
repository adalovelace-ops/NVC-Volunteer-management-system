import type { Partner, PartnerProjectApplication, Project } from '../models/types';
import { getProjectDisplayStatus } from './projectStatus';

type ProjectTrackingRow = {
  title: string;
  status: string;
  partner: string;
};

export interface ProjectTrackingReportData {
  generatedAt: string;
  rows: ProjectTrackingRow[];
  statusCounts: Record<string, number>;
}

const STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];

function escapeHtml(value: string | number | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function statusClass(status: string): string {
  return status.toLowerCase().replace(/\s+/g, '-');
}

export function buildProjectTrackingReportData(params: {
  projects: Project[];
  partners: Partner[];
  partnerApplications: PartnerProjectApplication[];
}): ProjectTrackingReportData {
  const projects = params.projects.filter(project => !project.isEvent && !project.isDraft);
  const statusCounts = Object.fromEntries(STATUSES.map(status => [status, 0])) as Record<string, number>;

  const rows = projects.map(project => {
    const status = getProjectDisplayStatus(project);
    statusCounts[status] += 1;
    const application = params.partnerApplications.find(item => item.projectId === project.id && item.status === 'Approved');
    const partner = params.partners.find(item => item.id === project.partnerId || item.ownerUserId === application?.partnerUserId);
    return {
      title: project.title || 'Untitled project',
      status,
      partner: partner?.name || application?.partnerName || 'Internal',
    };
  }).sort((left, right) => left.title.localeCompare(right.title));

  return { generatedAt: new Date().toLocaleString(), rows, statusCounts };
}

function generateProjectReportHtml(
  data: ProjectTrackingReportData,
  report: { title: string; subtitle: string; footer: string; sortByStatus?: boolean },
): string {
  const statusOrder = Object.fromEntries(STATUSES.map((status, index) => [status, index]));
  const rows = report.sortByStatus
    ? [...data.rows].sort((left, right) => (statusOrder[left.status] - statusOrder[right.status]) || left.title.localeCompare(right.title))
    : data.rows;
  const projectRows = rows.length ? rows.map(row => `
    <tr><td><strong>${escapeHtml(row.title)}</strong></td><td>${escapeHtml(row.partner)}</td><td><b class="status ${statusClass(row.status)}">${escapeHtml(row.status)}</b></td></tr>`).join('') : '<tr><td colspan="3" class="empty">No partner projects available.</td></tr>';
  const metrics = [['All Projects', data.rows.length], ...STATUSES.map(status => [status, data.statusCounts[status] || 0])]
    .map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(report.title)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#f7f8f7;color:#18241c;font-family:Inter,Arial,sans-serif}.page{max-width:1180px;margin:36px auto;padding:0 24px}.header{display:flex;justify-content:space-between;padding-bottom:22px;border-bottom:1px solid #dfe6e1}.brand{color:#347345;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px}h1{margin:0;font-size:31px;letter-spacing:-.02em}.subtitle,.period{color:#69766d;font-size:13px}.subtitle{margin:7px 0 0}.period{text-align:right;line-height:1.7}.summary{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:22px 0}.metric,.section{background:#fff;border:1px solid #dfe6e1}.metric{border-radius:9px;padding:14px}.metric span{display:block;color:#69766d;font-size:11px;margin-bottom:7px}.metric strong{font-size:21px}.section{border-radius:11px;margin-top:18px;overflow:hidden}.section-head{padding:17px 19px;border-bottom:1px solid #e8ece9}.section-head h2{margin:0;font-size:16px}.section-head p{margin:3px 0 0;color:#7b877f;font-size:12px}table{width:100%;border-collapse:collapse}th,td{padding:14px 19px;text-align:left;border-bottom:1px solid #edf0ee;font-size:13px;vertical-align:top}th{background:#fafbfa;color:#69766d;font-size:10px;text-transform:uppercase;letter-spacing:.06em}tr:last-child td{border:0}td span{display:block;color:#7b877f;font-size:11px;margin-top:3px}.status{display:inline-block;padding:5px 9px;border-radius:999px;font-size:10px;background:#eef1ef;color:#5e6a62}.planning{background:#f3f0e5;color:#806b27}.in-progress{background:#e8f4ea;color:#28703d}.on-hold{background:#fff1e3;color:#9a6426}.completed{background:#e7f4ee;color:#26704b}.cancelled{background:#f9e9e9;color:#a34343}.empty{text-align:center;color:#8a958e;padding:40px}.footer{margin:18px 0;color:#89948d;font-size:11px;text-align:right}@media(max-width:700px){.header{display:block}.period{text-align:left;margin-top:12px}.summary{grid-template-columns:repeat(3,1fr)}.section{overflow-x:auto}table{min-width:680px}}@media print{body{background:#fff}.page{max-width:none;margin:0;padding:0}.section{break-inside:avoid}@page{size:A4 landscape;margin:9mm}}
</style></head><body><main class="page"><header class="header"><div><div class="brand">NVC Foundation</div><h1>${escapeHtml(report.title)}</h1><p class="subtitle">${escapeHtml(report.subtitle)}</p></div><div class="period">Generated<br>${escapeHtml(data.generatedAt)}</div></header><section class="summary">${metrics}</section><section class="section"><div class="section-head"><h2>Project List</h2><p>All partner organization projects</p></div><table><thead><tr><th>Project Name</th><th>Partner Organization</th><th>Project Status</th></tr></thead><tbody>${projectRows}</tbody></table></section><div class="footer">${escapeHtml(report.footer)}</div></main></body></html>`;
}

export function generateProjectTrackingReportHtml(data: ProjectTrackingReportData): string {
  return generateProjectReportHtml(data, {
    title: 'Project Status Tracking',
    subtitle: 'Current status of partner organization projects',
    footer: 'NVC Foundation - Project Status Tracking Report',
  });
}

export function generateProjectStatusOverviewReportHtml(data: ProjectTrackingReportData): string {
  return generateProjectReportHtml(data, {
    title: 'Project Status Overview',
    subtitle: 'Engaged projects sorted by current status',
    footer: 'NVC Foundation - Project Status Overview Report',
    sortByStatus: true,
  });
}
