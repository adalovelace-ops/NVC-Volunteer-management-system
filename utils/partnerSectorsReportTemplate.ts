import { downloadHtmlPdf } from './pdfDownload';
import { NVC_LOGO_BASE64 } from './nvcLogo';
import type { Partner } from '../models/types';

export interface PartnerSectorSummaryRow {
  quarter: string;
  ngo: number;
  hospital: number;
  institution: number;
  privateSector: number;
}

export interface PartnerQuarterItem {
  name: string;
  sector: string;
}

export interface PartnerQuarterGroup {
  quarter: string;
  partners: PartnerQuarterItem[];
}

export interface PartnerSectorsReportData {
  reportTitle?: string;
  reportSubtitle?: string;
  summaryRows: PartnerSectorSummaryRow[];
  quarterGroups: PartnerQuarterGroup[];
  generatedAt?: string;
}

export interface BuildPartnerSectorsReportParams {
  partners: Partner[];
}

function escapeHtml(value?: string | number | null): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildPartnerSectorsReportData(
  params: BuildPartnerSectorsReportParams
): PartnerSectorsReportData {
  const { partners = [] } = params;

  const now = new Date();
  const currentQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const sectors: Partner['sectorType'][] = ['NGO', 'Hospital', 'Institution', 'Private'];

  // Generate 4 rolling quarters (Q-3, Q-2, Q-1, Q-current)
  const quarterWindows = Array.from({ length: 4 }, (_, index) => {
    const quarterStart = new Date(now.getFullYear(), currentQuarterStartMonth - (3 - index) * 3, 1);
    const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 1);
    const qNum = Math.floor(quarterStart.getMonth() / 3) + 1;
    const label = `Q${qNum} ${quarterStart.getFullYear()}`;
    return {
      label,
      quarterStart,
      quarterEnd,
    };
  });

  const summaryRows: PartnerSectorSummaryRow[] = [];
  const quarterGroups: PartnerQuarterGroup[] = [];

  quarterWindows.forEach((window, wIdx) => {
    const isCurrentQuarter = wIdx === quarterWindows.length - 1;

    // Filter partners in this quarter window
    const matchingPartners = partners.filter(partner => {
      const createdAt = safeDate(partner.createdAt);
      if (createdAt !== null) {
        return createdAt >= window.quarterStart && createdAt < window.quarterEnd;
      }
      // If no valid createdAt, assign to current quarter by default
      return isCurrentQuarter;
    });

    const ngoCount = matchingPartners.filter(p => p.sectorType === 'NGO').length;
    const hospitalCount = matchingPartners.filter(p => p.sectorType === 'Hospital').length;
    const institutionCount = matchingPartners.filter(p => p.sectorType === 'Institution').length;
    const privateCount = matchingPartners.filter(p => p.sectorType === 'Private').length;

    summaryRows.push({
      quarter: window.label,
      ngo: ngoCount,
      hospital: hospitalCount,
      institution: institutionCount,
      privateSector: privateCount,
    });

    const partnerItems: PartnerQuarterItem[] = matchingPartners
      .map(p => ({
        name: p.name || p.stakeholderName || 'Partner Organization',
        sector: p.sectorType || 'General',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    quarterGroups.push({
      quarter: window.label,
      partners: partnerItems,
    });
  });

  const generatedAt = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    reportTitle: 'PARTNER SECTORS BY QUARTER',
    reportSubtitle: 'New partner organizations grouped by creation quarter',
    summaryRows,
    quarterGroups,
    generatedAt,
  };
}

export function generatePartnerSectorsReportHtml(data: PartnerSectorsReportData): string {
  const tableRowsHtml = data.summaryRows
    .map((row, idx) => {
      const isLast = idx === data.summaryRows.length - 1;
      return `
      <tr${isLast ? ' class="last"' : ''}>
        <td><b>${escapeHtml(row.quarter)}</b></td>
        <td class="num">${escapeHtml(row.ngo)}</td>
        <td class="num">${escapeHtml(row.hospital)}</td>
        <td class="num">${escapeHtml(row.institution)}</td>
        <td class="num">${escapeHtml(row.privateSector)}</td>
      </tr>`;
    })
    .join('');

  const gridCardsHtml = data.quarterGroups
    .map(q => {
      const partnersHtml = q.partners.length > 0
        ? q.partners
            .map(
              p => `
          <div class="partner">
            <div class="name">${escapeHtml(p.name)}</div>
            <div class="sector">${escapeHtml(p.sector)}</div>
          </div>`
            )
            .join('')
        : '<div class="empty">No partners registered.</div>';

      return `
      <div class="q">
        <h3>${escapeHtml(q.quarter)}</h3>
        ${partnersHtml}
      </div>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>NVC Partner Sectors by Quarter</title>
<style>
:root{--g:#216b35;--gl:#eef7f0;--t:#172033;--m:#667085;--b:#dfe5e1}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--t);font-family:Arial,Helvetica,sans-serif}
.report{max-width:1200px;margin:auto;padding:30px 36px}.top{display:flex;justify-content:space-between;padding-bottom:18px;border-bottom:3px solid var(--g)}
.brand{display:flex;gap:12px;align-items:center}.logo{width:46px;height:46px;border-radius:10px;background:var(--gl);display:flex;align-items:center;justify-content:center;color:var(--g);font-size:23px;font-weight:800;overflow:hidden}
.logo img{width:100%;height:100%;object-fit:contain}
.brand strong{display:block;font-size:25px}.brand span{color:var(--g);font-size:11px;font-weight:800;letter-spacing:1px}.type{text-align:right;color:var(--g);font-weight:800;line-height:1.5}.type span{display:block;color:var(--t)}
.heading{padding:25px 0 20px;border-bottom:1px solid var(--b)}h1{margin:0 0 6px;font-size:30px}.subtitle{margin:0;color:var(--m);font-size:16px}
.section{padding-top:24px}.title{margin:0 0 6px;color:var(--g);font-size:21px}.desc{margin:0 0 16px;color:var(--m)}
.table-wrap{border:1px solid var(--b);overflow:hidden}table{width:100%;border-collapse:collapse}th,td{padding:14px 16px;text-align:left;border-bottom:1px solid var(--b)}th{background:var(--gl);color:var(--g);font-size:12px;text-transform:uppercase}td{height:50px}.last td{border-bottom:0}.num{font-weight:800;color:var(--g)}
.grid{margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.q{border:1px solid var(--b);padding:17px 18px;border-radius:4px}.q h3{margin:0 0 12px;color:var(--g);font-size:16px}.partner{padding:10px 0;border-top:1px solid var(--b)}.partner:first-of-type{border-top:0}.name{font-weight:700}.sector{color:var(--m);font-size:12px;margin-top:3px}.empty{color:#98a2b3;padding:8px 0}
.footer{margin-top:30px;padding-top:12px;border-top:2px solid var(--g);display:flex;justify-content:space-between;color:var(--m);font-size:12px}
@media(max-width:700px){.report{padding:22px}.top{flex-direction:column;gap:14px}.type{text-align:left}.grid{grid-template-columns:1fr}}
@media print{.report{max-width:100%;padding:20px}}
</style>
</head>
<body>
<main class="report">
<header class="top">
<div class="brand">
  <div class="logo">
    <img src="${NVC_LOGO_BASE64}" alt="NVC Foundation Logo" />
  </div>
  <div>
    <strong>nvc</strong>
    <span>FOUNDATION</span>
  </div>
</div>
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
${tableRowsHtml}
</tbody>
</table>
</div>
</section>

<section class="section">
<h2 class="title">Partners by Quarter</h2>
<p class="desc">Partner organization names grouped by creation quarter.</p>
<div class="grid">
${gridCardsHtml}
</div>
</section>

<footer class="footer"><span>nvcfoundation-ph.org</span><span>NVC Foundation</span></footer>
</main>
</body>
</html>`;
}

export async function exportPartnerSectorsReportPdf(
  data: PartnerSectorsReportData,
  filename: string = `NVC_Partner_Sectors_By_Quarter_Report_${new Date().toISOString().slice(0, 10)}.pdf`
): Promise<void> {
  const html = generatePartnerSectorsReportHtml(data);
  await downloadHtmlPdf(filename, html);
}
