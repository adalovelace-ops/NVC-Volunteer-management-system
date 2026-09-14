import { NVC_LOGO_BASE64 } from './nvcLogo';
import { downloadHtmlPdf } from './pdfDownload';
import type { Project, Volunteer, VolunteerProjectJoinRecord, VolunteerTimeLog } from '../models/types';

export interface EventActivityItem {
  id?: string;
  name: string;
  shortName?: string;
  date: string;
  location: string;
  volunteers: number;
}

export interface VolunteersPerEventReportData {
  reportTitle?: string;
  reportSubtitle?: string;
  headingTitle?: string;
  headingSubtitle?: string;
  events: EventActivityItem[];
}

export interface BuildVolunteersPerEventParams {
  projects: Project[];
  timeLogs?: VolunteerTimeLog[];
  joinRecords?: VolunteerProjectJoinRecord[];
  volunteers?: Volunteer[];
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

function truncateLabel(title: string, maxLength: number = 14): string {
  const trimmed = title.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 2)}..`;
}

export function buildVolunteersPerEventReportData(
  params: BuildVolunteersPerEventParams
): VolunteersPerEventReportData {
  const {
    projects,
    timeLogs = [],
    joinRecords = [],
    volunteers = [],
  } = params;

  const volunteersById = new Map(volunteers.map(v => [v.id, v]));
  const volunteersByUserId = new Map(volunteers.map(v => [v.userId, v]));

  // Pick events (or regular projects if none flagged as isEvent)
  let rawEvents = projects.filter(p => p.isEvent);
  if (rawEvents.length === 0) {
    rawEvents = projects;
  }

  const items: EventActivityItem[] = rawEvents.map(event => {
    const joinedIds = new Set<string>();

    (event.volunteers || []).forEach(id => {
      if (id) joinedIds.add(id);
    });

    (event.joinedUserIds || []).forEach(userId => {
      const vol = volunteersByUserId.get(userId);
      if (vol?.id) joinedIds.add(vol.id);
    });

    joinRecords
      .filter(record => record.projectId === event.id)
      .forEach(record => {
        if (record.volunteerId) {
          joinedIds.add(record.volunteerId);
        } else if (record.volunteerUserId) {
          const vol = volunteersByUserId.get(record.volunteerUserId);
          if (vol?.id) joinedIds.add(vol.id);
        }
      });

    timeLogs
      .filter(log => log.projectId === event.id)
      .forEach(log => {
        const volId = log.volunteerId || ((log as any).userId ? volunteersByUserId.get((log as any).userId)?.id : undefined);
        if (volId) joinedIds.add(volId);
      });

    let dateStr = '—';
    if (event.startDate) {
      const d = new Date(event.startDate);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    const loc =
      event.location?.address ||
      event.location?.city ||
      (event as any).locationName ||
      (event as any).address ||
      'Negros Occidental';

    return {
      id: event.id,
      name: event.title || 'Untitled Event',
      shortName: truncateLabel(event.title || 'Event', 14),
      date: dateStr,
      location: loc,
      volunteers: joinedIds.size,
    };
  });

  // Sort by volunteer count descending
  items.sort((a, b) => b.volunteers - a.volunteers || a.name.localeCompare(b.name));

  return {
    reportTitle: 'VOLUNTEER ACTIVITY REPORT',
    reportSubtitle: 'PER EVENT',
    headingTitle: 'VOLUNTEERS PER EVENT',
    headingSubtitle: 'Weekly distribution of volunteer activity across top events',
    events: items,
  };
}

export function generateVolunteersPerEventReportHtml(
  data: VolunteersPerEventReportData
): string {
  const reportTitle = data.reportTitle || 'VOLUNTEER ACTIVITY REPORT';
  const reportSubtitle = data.reportSubtitle || 'PER EVENT';
  const headingTitle = data.headingTitle || 'VOLUNTEERS PER EVENT';
  const headingSubtitle =
    data.headingSubtitle || 'Weekly distribution of volunteer activity across top events';

  const events = data.events || [];
  const highestCount = events.reduce((max, ev) => Math.max(max, ev.volunteers), 0);
  const maxVal = Math.max(10, Math.ceil((highestCount || 10) / 5) * 5);

  const axisValues = [
    maxVal,
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  // Up to 6 top events for bar chart
  const topEvents = events.slice(0, 6);
  const totalChartSlots = 6;
  const barGroupsHtml: string[] = [];

  for (let i = 0; i < totalChartSlots; i++) {
    const ev = topEvents[i];
    if (ev) {
      const pct = maxVal > 0 ? Math.round((ev.volunteers / maxVal) * 100) : 0;
      const barHeight = Math.max(ev.volunteers > 0 ? 8 : 2, Math.min(100, pct));
      const isHigh = ev.volunteers >= maxVal * 0.5;
      const barBg = isHigh ? '#b9dfc0' : '#eef7f0';
      const barBorder = isHigh ? '#8ac994' : '#c7dccb';

      barGroupsHtml.push(`
        <div class="bar-group">
          <div class="bar" style="height: ${barHeight}%; background: ${barBg}; border-color: ${barBorder};" title="${escapeHtml(ev.name)}: ${ev.volunteers} volunteers">
            ${ev.volunteers > 0 ? `<span class="bar-value">${ev.volunteers}</span>` : ''}
          </div>
          <div class="event-label" title="${escapeHtml(ev.name)}">${escapeHtml(ev.shortName || ev.name)}</div>
        </div>
      `);
    } else {
      barGroupsHtml.push(`
        <div class="bar-group">
          <div class="bar"></div>
          <div class="event-label">—</div>
        </div>
      `);
    }
  }

  // All Events Table (minimum 8 rows)
  const totalTableRows = Math.max(8, events.length);
  const tableRowsHtml: string[] = [];

  for (let i = 0; i < totalTableRows; i++) {
    const ev = events[i];
    const index = i + 1;
    if (ev) {
      tableRowsHtml.push(`
        <tr>
          <td>${index}</td>
          <td><strong>${escapeHtml(ev.name)}</strong></td>
          <td>${escapeHtml(ev.date)}</td>
          <td>${escapeHtml(ev.location)}</td>
          <td class="count">${ev.volunteers}</td>
        </tr>
      `);
    } else {
      tableRowsHtml.push(`
        <tr>
          <td>${index}</td>
          <td class="empty">—</td>
          <td class="empty">—</td>
          <td class="empty">—</td>
          <td class="count empty">—</td>
        </tr>
      `);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(headingTitle)}</title>
<style>
  :root {
    --green: #216b35;
    --green-light: #eef7f0;
    --text: #172033;
    --muted: #667085;
    --border: #dfe5e1;
    --bg: #ffffff;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: Inter, Arial, Helvetica, sans-serif;
    font-size: 14px;
  }

  .report {
    width: min(1200px, 100%);
    margin: 0 auto;
    padding: 30px 36px;
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 18px;
    border-bottom: 3px solid var(--green);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-logo {
    height: 48px;
    width: auto;
    max-width: 220px;
    object-fit: contain;
    display: block;
  }

  .logo {
    width: 46px;
    height: 46px;
    border-radius: 10px;
    background: var(--green-light);
    display: grid;
    place-items: center;
    color: var(--green);
    font-size: 23px;
    font-weight: 800;
  }

  .brand strong {
    display: block;
    font-size: 25px;
    line-height: 1;
  }

  .brand span {
    color: var(--green);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .report-title {
    text-align: right;
    color: var(--green);
    font-weight: 800;
    line-height: 1.5;
  }

  .report-title span {
    display: block;
    color: var(--text);
    font-weight: 700;
  }

  .heading {
    padding: 25px 0 20px;
    border-bottom: 1px solid var(--border);
  }

  h1 {
    margin: 0 0 6px;
    font-size: 30px;
    letter-spacing: -0.8px;
  }

  .subtitle {
    margin: 0;
    color: var(--muted);
    font-size: 16px;
  }

  .section {
    padding-top: 24px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    margin-bottom: 16px;
  }

  .section-title {
    margin: 0;
    color: var(--green);
    font-size: 21px;
    font-weight: 800;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 18px;
    color: var(--muted);
    font-size: 12px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid #b9c8bd;
  }

  .low { background: #eef7f0; }
  .high { background: #b9dfc0; }

  .chart {
    border: 1px solid var(--border);
    padding: 20px;
    background: #fff;
  }

  .chart-grid {
    display: grid;
    grid-template-columns: 45px 1fr;
    gap: 12px;
    min-height: 250px;
  }

  .axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: var(--muted);
    font-size: 11px;
    padding: 0 0 24px;
  }

  .bars {
    display: flex;
    align-items: flex-end;
    gap: 24px;
    border-left: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: 12px 20px 0;
  }

  .bar-group {
    flex: 1;
    min-width: 45px;
    height: 220px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    position: relative;
  }

  .bar {
    width: 42px;
    height: 0;
    min-height: 2px;
    background: #dcecdf;
    border: 1px solid #c7dccb;
    border-radius: 4px 4px 0 0;
    position: relative;
    transition: height 0.3s ease;
  }

  .bar-value {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    font-weight: 700;
    color: var(--green);
  }

  .event-label {
    position: absolute;
    bottom: -27px;
    left: 50%;
    transform: translateX(-50%);
    width: 90px;
    text-align: center;
    color: var(--muted);
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .table-wrap {
    margin-top: 35px;
    border: 1px solid var(--border);
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 700px;
  }

  th, td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }

  th {
    background: var(--green-light);
    color: var(--green);
    font-size: 12px;
    text-transform: uppercase;
    font-weight: 800;
  }

  td {
    height: 52px;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  .count {
    font-weight: 800;
    color: var(--green);
  }

  .empty {
    color: #98a2b3;
  }

  .footer {
    margin-top: 30px;
    padding-top: 12px;
    border-top: 2px solid var(--green);
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    font-size: 12px;
  }

  @media (max-width: 700px) {
    .report { padding: 22px; }

    .top {
      flex-direction: column;
      gap: 14px;
    }

    .report-title {
      text-align: left;
    }

    .section-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .legend {
      align-self: flex-start;
    }
  }

  @media print {
    body { background: white; }
    .report { width: 100%; padding: 20px; }
    .chart { page-break-inside: avoid; }
    .table-wrap { page-break-inside: avoid; }
  }
</style>
</head>

<body>
<main class="report">

  <header class="top">
    <div class="brand">
      ${NVC_LOGO_BASE64 ? `<img src="${NVC_LOGO_BASE64}" alt="NVC Foundation Logo" class="brand-logo" />` : `
      <div class="logo">✚</div>
      <div>
        <strong>nvc</strong>
        <span>FOUNDATION</span>
      </div>`}
    </div>

    <div class="report-title">
      ${escapeHtml(reportTitle)}
      <span>${escapeHtml(reportSubtitle)}</span>
    </div>
  </header>

  <section class="heading">
    <h1>${escapeHtml(headingTitle)}</h1>
    <p class="subtitle">${escapeHtml(headingSubtitle)}</p>
  </section>

  <section class="section">
    <div class="section-header">
      <h2 class="section-title">Volunteer Activity</h2>

      <div class="legend">
        <div class="legend-item">
          <span class="legend-dot low"></span>
          <span>Low</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot high"></span>
          <span>High</span>
        </div>
      </div>
    </div>

    <div class="chart">
      <div class="chart-grid">
        <div class="axis">
          ${axisValues.map(val => `<span>${val}</span>`).join('\n          ')}
        </div>

        <div class="bars">
          ${barGroupsHtml.join('')}
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <h2 class="section-title">All Events</h2>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Event</th>
            <th>Date</th>
            <th>Location</th>
            <th>Volunteers</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml.join('')}
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

export async function exportVolunteersPerEventReportPdf(
  data: VolunteersPerEventReportData,
  filename: string = `Volunteers_Per_Event_Report_${new Date().toISOString().slice(0, 10)}.pdf`
): Promise<void> {
  const html = generateVolunteersPerEventReportHtml(data);
  await downloadHtmlPdf(html, filename);
}
