import { NVC_LOGO_BASE64 } from './nvcLogo';

export interface VolunteerPhotoItem {
  uri: string;
  volunteerName: string;
  date: string;
  photoCount?: number;
}

export interface SectorPartnerItem {
  sector: string;
  count: number;
  percent: number;
  color: string;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  percent: number;
  color: string;
}

export interface ReportDocumentItem {
  name: string;
  type: 'pdf' | 'xlsx' | 'doc';
  size: string;
}

export interface ProjectItemSummary {
  title: string;
  category: string;
  status: string;
  createdBy?: string;
  volunteersCount: number;
  eventsCount: number;
}

export interface SkillContributionItem {
  eventTitle: string;
  volunteerName: string;
  skills: string;
  date: string;
  hours: number;
}

export interface EventConductedItem {
  title: string;
  parentProject?: string;
  date: string;
  status: string;
  location?: string;
  volunteersCount: number;
}

export interface SectorPartnerGroup {
  sectorType: string;
  sectorLabel: string;
  partners: Array<{
    name: string;
    advocacyFocus?: string;
    location?: string;
  }>;
}

export interface VolunteerInvolvedItem {
  name: string;
  email?: string;
  role?: string;
  skills?: string;
  eventsJoined: number;
  hoursLogged: number;
}

export interface ReportTemplateData {
  reportQuarter?: string;
  projectName?: string;
  partnerAuthor?: string;
  projectsList?: ProjectItemSummary[];
  skillsList?: SkillContributionItem[];
  eventsList?: EventConductedItem[];
  sectorPartnerGroups?: SectorPartnerGroup[];
  volunteersList?: VolunteerInvolvedItem[];
  title: string;
  subtitle?: string;
  period: string;
  submittedOn: string;
  submittedBy: string;
  submittedRole?: string;
  heroPhoto?: string;
  totalProjects: number;
  totalProjectsLabel?: string;
  totalProjectsDelta?: string;
  skillsContributed: number;
  skillsContributedLabel?: string;
  skillsContributedDelta?: string;
  eventsConducted: number;
  eventsConductedLabel?: string;
  eventsConductedDelta?: string;
  volunteersInvolved: number;
  volunteersInvolvedLabel?: string;
  volunteersInvolvedDelta?: string;
  sectorPartners?: SectorPartnerItem[];
  statusSectionTitle?: string;
  statusSectionSubtitle?: string;
  statusDistributions?: StatusDistributionItem[];
  overallResult?: {
    primaryLabel: string;
    primaryPercent: number;
    secondaryLabel: string;
    secondaryPercent: number;
    tertiaryLabel: string;
    tertiaryPercent: number;
  };
  highlights: string[];
  documents?: ReportDocumentItem[];
  photos: VolunteerPhotoItem[];
}

export function generateReportHtml(data: ReportTemplateData): string {
  const quarter = data.reportQuarter || '';
  const projectName = data.projectName || data.title || 'Executive Analytics Report';
  const partnerAuthor = data.partnerAuthor || data.subtitle || 'NVC Partner';
  const subtitle = partnerAuthor;
  const title = projectName;
  const period = data.period || 'Current Period';
  const submittedOn = data.submittedOn || new Date().toLocaleDateString();
  const submittedBy = data.submittedBy || partnerAuthor;
  const submittedRole = data.submittedRole || 'Program Coordinator';
  const projectsList = Array.isArray(data.projectsList) ? data.projectsList : [];
  const skillsList = Array.isArray(data.skillsList) ? data.skillsList : [];
  const eventsList = Array.isArray(data.eventsList) ? data.eventsList : [];
  const sectorPartnerGroups = Array.isArray(data.sectorPartnerGroups) ? data.sectorPartnerGroups : [];
  const volunteersList = Array.isArray(data.volunteersList) ? data.volunteersList : [];

  const totalProjectsLabel = data.totalProjectsLabel || 'Total Projects';
  const totalProjectsDelta = data.totalProjectsDelta || '';
  const skillsLabel = data.skillsContributedLabel || 'Skills Contributed';
  const skillsDelta = data.skillsContributedDelta || '';
  const eventsLabel = data.eventsConductedLabel || 'Events Conducted';
  const eventsDelta = data.eventsConductedDelta || '';
  const volunteersLabel = data.volunteersInvolvedLabel || 'Volunteers Involved';
  const volunteersDelta = data.volunteersInvolvedDelta || '';

  const sectors: SectorPartnerItem[] = Array.isArray(data.sectorPartners) ? data.sectorPartners : [];
  const statusItems: StatusDistributionItem[] = Array.isArray(data.statusDistributions) ? data.statusDistributions : [];

  const overall = data.overallResult;

  const highlights = Array.isArray(data.highlights) && data.highlights.length > 0
    ? data.highlights
    : ['No activity logs recorded for this selection.'];

  const documents = Array.isArray(data.documents) && data.documents.length > 0
    ? data.documents
    : [{ name: `${title.replace(/\s+/g, '_')}_${quarter || 'Report'}.pdf`, type: 'pdf' as const, size: 'Generated PDF' }];

  const photos = Array.isArray(data.photos) ? data.photos : [];

  // Build conic gradient for real sectors if available
  let sectorConicGradient = '#166534';
  if (sectors.length > 0) {
    let currentDeg = 0;
    const segments = sectors.map(s => {
      const deg = Math.max(2, (s.percent / 100) * 360);
      const start = currentDeg;
      const end = currentDeg + deg;
      currentDeg = end;
      return `${s.color} ${start}deg ${end}deg`;
    });
    sectorConicGradient = `conic-gradient(${segments.join(', ')})`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - NVC Foundation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f1f5f9;
      color: #1e293b;
      line-height: 1.4;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .report-sheet {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 28px 36px 16px 36px;
    }

    .brand-block {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo {
      height: 48px;
      width: auto;
      max-width: 240px;
      object-fit: contain;
      display: block;
    }

    .clover-logo {
      width: 44px;
      height: 44px;
      fill: #22c55e;
    }

    .brand-text-block {
      display: flex;
      flex-direction: column;
    }

    .brand-nvc {
      font-size: 26px;
      font-weight: 800;
      color: #14532d;
      line-height: 1;
      letter-spacing: -0.5px;
    }

    .brand-sub {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }

    .report-quarter-badge-wrap {
      text-align: right;
    }

    .report-badge-title {
      font-size: 20px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: 0.5px;
    }

    .quarter-pill {
      display: inline-block;
      margin-top: 4px;
      background: #22c55e;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      padding: 4px 14px;
      border-radius: 9999px;
      letter-spacing: 0.3px;
    }

    /* HERO & TITLE */
    .hero-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 36px 20px 36px;
      gap: 24px;
    }

    .hero-info {
      flex: 1;
    }

    .program-subtitle {
      font-size: 16px;
      font-weight: 600;
      color: #16a34a;
      margin-bottom: 2px;
    }

    .program-title {
      font-size: 26px;
      font-weight: 800;
      color: #14532d;
      line-height: 1.18;
      margin-bottom: 16px;
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #f0fdf4;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #16a34a;
      font-size: 16px;
    }

    .meta-content {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 11px;
      font-weight: 500;
      color: #94a3b8;
    }

    .meta-value {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }

    .hero-photo-wrap {
      width: 240px;
      height: 130px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hero-photo-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hero-brand-box {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #14532d 0%, #166534 100%);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      text-align: center;
    }

    .hero-brand-tag {
      font-size: 14px;
      font-weight: 800;
      color: #86efac;
      letter-spacing: 0.5px;
    }

    .hero-brand-text {
      font-size: 11px;
      font-weight: 600;
      color: #dcfce7;
      margin-top: 4px;
    }

    /* TOP 5 METRIC CARDS */
    .metric-cards-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      padding: 0 36px 20px 36px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 116px;
    }

    .kpi-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .kpi-icon {
      font-size: 14px;
      color: #64748b;
    }

    .kpi-title {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }

    .kpi-value {
      font-size: 30px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
      margin: 4px 0;
    }

    .kpi-delta {
      font-size: 10px;
      font-weight: 700;
      color: #15803d;
    }

    /* SECTORS MINI CARD */
    .sectors-card-content {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .pie-mini {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: ${sectorConicGradient};
      flex-shrink: 0;
    }

    .sectors-legend {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 9px;
      font-weight: 600;
      color: #475569;
    }

    .sector-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sector-dot {
      width: 6px;
      height: 6px;
      border-radius: 2px;
    }

    /* PARTNER PROJECTS TABLE SECTION */
    .projects-table-section {
      margin: 0 36px 20px 36px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
    }

    .partner-projects-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    .partner-projects-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      border-bottom: 2px solid #e2e8f0;
      text-align: left;
    }

    .partner-projects-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }

    .sector-tag {
      background: #f0fdf4;
      color: #166534;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10px;
    }

    .status-pill {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      display: inline-block;
    }

    .status-in-progress, .status-active { background: #dcfce7; color: #15803d; }
    .status-completed { background: #dbeafe; color: #1d4ed8; }
    .status-planning, .status-draft, .status-pending { background: #fef3c7; color: #b45309; }

    .section-title-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
    }

    .title-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-left .icon { font-size: 16px; }
    .title-left .heading {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
    }

    .quarter-tag {
      font-size: 11px;
      font-weight: 700;
      color: #166534;
      background: #eef7f0;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .author-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      display: inline-block;
    }

    .author-partner {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #dbeafe;
    }

    .author-admin {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .skill-tag {
      background: #fef3c7;
      color: #92400e;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 10px;
      display: inline-block;
    }

    .empty-section-hint {
      padding: 16px;
      text-align: center;
      color: #94a3b8;
      font-size: 11px;
      font-style: italic;
      background: #f8fafc;
      border-radius: 8px;
    }

    /* SECTOR GROUPS GRID */
    .sector-groups-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .sector-group-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .sector-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }

    .sector-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .badge-ngo { background: #dcfce7; color: #166534; }
    .badge-hospital { background: #fee2e2; color: #991b1b; }
    .badge-institution { background: #dbeafe; color: #1e40af; }
    .badge-private { background: #fef3c7; color: #92400e; }

    .sector-group-title {
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
      flex: 1;
    }

    .sector-group-count {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      background: #ffffff;
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
    }

    .sector-partner-names {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .sector-partner-item {
      font-size: 11px;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sector-partner-item .dot {
      color: #16a34a;
      font-weight: 800;
    }

    .partner-org-name {
      font-weight: 700;
      color: #0f172a;
    }

    .partner-org-loc {
      font-size: 10px;
      color: #64748b;
    }

    .empty-sector-hint {
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
      padding: 4px 0;
    }

    /* IMPACT & STATUS SECTION */
    .impact-section {
      padding: 0 36px 20px 36px;
    }

    .impact-banner {
      background: #14532d;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .banner-badge {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    .banner-divider {
      color: rgba(255, 255, 255, 0.4);
    }

    .banner-sub {
      font-size: 13px;
      font-weight: 500;
      color: #bbf7d0;
    }

    .impact-chart-box {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      background: #ffffff;
    }

    .impact-chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .impact-chart-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }

    .impact-legend {
      display: flex;
      gap: 12px;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }

    .legend-chip {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .legend-box {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }

    .chart-and-result-grid {
      display: grid;
      grid-template-columns: 1fr 200px;
      gap: 20px;
      align-items: center;
    }

    /* REAL STATUS BARS */
    .status-bars-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-right: 12px;
    }

    .status-bar-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .status-bar-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }

    .status-bar-track {
      height: 12px;
      background: #f1f5f9;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
    }

    .status-bar-fill {
      height: 100%;
      border-radius: 6px;
    }

    /* OVERALL RESULT CARD */
    .overall-result-card {
      background: #14532d;
      border-radius: 10px;
      padding: 16px 14px;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .overall-result-title {
      font-size: 12px;
      font-weight: 800;
      color: #86efac;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 6px;
    }

    .overall-stat-item {
      display: flex;
      flex-direction: column;
    }

    .overall-stat-num {
      font-size: 22px;
      font-weight: 800;
      line-height: 1;
      color: #ffffff;
    }

    .overall-stat-label {
      font-size: 10px;
      color: #dcfce7;
      font-weight: 500;
      margin-top: 2px;
    }

    .footnote {
      font-size: 9px;
      color: #94a3b8;
      margin-top: 8px;
    }

    /* HIGHLIGHTS */
    .highlights-section {
      padding: 0 36px 20px 36px;
    }

    .section-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 18px;
      background: #ffffff;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .section-icon {
      color: #16a34a;
      font-size: 16px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }

    .highlights-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .highlight-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11px;
      color: #334155;
      line-height: 1.35;
    }

    .check-icon {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #22c55e;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 800;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* PHOTOS GALLERY */
    .photos-section {
      padding: 0 36px 24px 36px;
    }

    .photos-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .photos-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .photos-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }

    .view-all-pill {
      font-size: 10px;
      font-weight: 700;
      color: #15803d;
      border: 1px solid #86efac;
      padding: 3px 10px;
      border-radius: 9999px;
      background: #f0fdf4;
    }

    .photo-grid-5 {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
    }

    .photo-card {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      position: relative;
      height: 110px;
      background: #0f172a;
    }

    .photo-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.92;
    }

    .photo-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 6px 8px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0) 100%);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      color: #ffffff;
    }

    .photo-meta {
      display: flex;
      flex-direction: column;
    }

    .photo-date {
      font-size: 8px;
      color: #cbd5e1;
    }

    .photo-volunteer {
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 95px;
    }

    .photo-count-badge {
      font-size: 8px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.95);
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .empty-photos-box {
      padding: 24px;
      text-align: center;
      color: #64748b;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
      font-size: 12px;
      font-weight: 500;
    }

    /* FOOTER */
    .report-footer {
      background: #14532d;
      color: #ffffff;
      padding: 14px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    .footer-left {
      display: flex;
      gap: 20px;
      color: #dcfce7;
      font-weight: 500;
    }

    .footer-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .footer-right {
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #ffffff;
    }

    .footer-right span {
      color: #86efac;
    }

    /* PRINT STYLES */
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .report-sheet {
        box-shadow: none;
        border: none;
        max-width: 100%;
        border-radius: 0;
      }
      @page {
        size: A4 portrait;
        margin: 8mm 6mm;
      }
    }
  </style>
</head>
<body>
  <div class="report-sheet">
    <!-- HEADER -->
    <div class="header">
      <div class="brand-block">
        <img src="${NVC_LOGO_BASE64}" alt="NVC Foundation Logo" class="brand-logo" />
      </div>

      <div class="report-quarter-badge-wrap">
        <div class="report-badge-title">SYSTEM REPORT</div>
        ${quarter ? `<div class="quarter-pill">${escapeHtml(quarter)}</div>` : ''}
      </div>
    </div>

    <!-- HERO SECTION -->
    <div class="hero-section">
      <div class="hero-info">
        <div class="program-subtitle">PARTNER / AUTHOR: ${escapeHtml(partnerAuthor)}</div>
        <div class="program-title">${escapeHtml(projectName)}</div>

        <div class="meta-row">
          <div class="meta-item">
            <div class="meta-icon-box">📅</div>
            <div class="meta-content">
              <span class="meta-label">Reporting Period</span>
              <span class="meta-value">${escapeHtml(period)}</span>
            </div>
          </div>

          <div class="meta-item">
            <div class="meta-icon-box">🏢</div>
            <div class="meta-content">
              <span class="meta-label">Partner / Author</span>
              <span class="meta-value">${escapeHtml(partnerAuthor)}</span>
            </div>
          </div>

          <div class="meta-item">
            <div class="meta-icon-box">🕒</div>
            <div class="meta-content">
              <span class="meta-label">Submitted On</span>
              <span class="meta-value">${escapeHtml(submittedOn)}</span>
            </div>
          </div>

          <div class="meta-item">
            <div class="meta-icon-box">👤</div>
            <div class="meta-content">
              <span class="meta-label">Author Role</span>
              <span class="meta-value">${escapeHtml(submittedRole)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-photo-wrap">
        ${data.heroPhoto ? `
          <img src="${escapeHtml(data.heroPhoto)}" alt="Project Evidence" />
        ` : `
          <div class="hero-brand-box">
            <div class="hero-brand-tag">NVC FOUNDATION</div>
            <div class="hero-brand-text">Negros Occidental Operations</div>
          </div>
        `}
      </div>
    </div>

    <!-- 5 KPI METRIC CARDS -->
    <div class="metric-cards-row">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-icon">📁</span>
          <span class="kpi-title">${escapeHtml(totalProjectsLabel)}</span>
        </div>
        <div class="kpi-value">${data.totalProjects}</div>
        ${totalProjectsDelta ? `<div class="kpi-delta">${escapeHtml(totalProjectsDelta)}</div>` : ''}
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-icon">👤</span>
          <span class="kpi-title">${escapeHtml(skillsLabel)}</span>
        </div>
        <div class="kpi-value">${data.skillsContributed}</div>
        ${skillsDelta ? `<div class="kpi-delta">${escapeHtml(skillsDelta)}</div>` : ''}
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-icon">📅</span>
          <span class="kpi-title">${escapeHtml(eventsLabel)}</span>
        </div>
        <div class="kpi-value">${data.eventsConducted}</div>
        ${eventsDelta ? `<div class="kpi-delta">${escapeHtml(eventsDelta)}</div>` : ''}
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-icon">📊</span>
          <span class="kpi-title">Sectors Partner</span>
        </div>
        <div class="sectors-card-content">
          <div class="pie-mini"></div>
          <div class="sectors-legend">
            ${sectors.length > 0 ? sectors.slice(0, 4).map(s => `
              <div class="sector-item">
                <div class="sector-dot" style="background: ${s.color};"></div>
                <span>${escapeHtml(s.sector)} (${s.count > 0 ? `${s.count} • ` : ''}${s.percent}%)</span>
              </div>
            `).join('') : '<span style="font-size: 9px; color: #94a3b8;">No sector data</span>'}
          </div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-icon">👥</span>
          <span class="kpi-title">${escapeHtml(volunteersLabel)}</span>
        </div>
        <div class="kpi-value">${data.volunteersInvolved}</div>
        ${volunteersDelta ? `<div class="kpi-delta">${escapeHtml(volunteersDelta)}</div>` : ''}
      </div>
    </div>

    <!-- 1. TOTAL PROJECTS (all projects and who made it: created by partner or admin) -->
    <div class="projects-table-section">
      <div class="section-title-bar">
        <div class="title-left">
          <span class="icon">📁</span>
          <span class="heading">Total Projects (${projectsList.length})</span>
        </div>
        <span class="quarter-tag">${escapeHtml(quarter)}</span>
      </div>
      ${projectsList.length > 0 ? `
        <table class="partner-projects-table">
          <thead>
            <tr>
              <th style="width: 28px;">#</th>
              <th>Project Name</th>
              <th>Sector / Category</th>
              <th>Created By</th>
              <th>Execution Status</th>
              <th style="text-align: center;">Events</th>
              <th style="text-align: center;">Volunteers</th>
            </tr>
          </thead>
          <tbody>
            ${projectsList.map((p, idx) => `
              <tr>
                <td style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                <td><strong>${escapeHtml(p.title)}</strong></td>
                <td><span class="sector-tag">${escapeHtml(p.category)}</span></td>
                <td><span class="author-tag ${(p.createdBy || '').toLowerCase().includes('admin') ? 'author-admin' : 'author-partner'}">${escapeHtml(p.createdBy || 'NVC Administration')}</span></td>
                <td><span class="status-pill status-${escapeHtml((p.status || 'active').toLowerCase().replace(/\s+/g, '-'))}">${escapeHtml(p.status || 'Active')}</span></td>
                <td style="text-align: center; font-weight: 600;">${p.eventsCount}</td>
                <td style="text-align: center; font-weight: 800; color: #166534;">${p.volunteersCount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `
        <div class="empty-section-hint">No projects recorded for ${escapeHtml(quarter)}.</div>
      `}
    </div>

    <!-- 2. SKILLS CONTRIBUTED (skills by volunteers per event) -->
    <div class="projects-table-section">
      <div class="section-title-bar">
        <div class="title-left">
          <span class="icon">🎯</span>
          <span class="heading">Skills Contributed by Volunteers (${skillsList.length})</span>
        </div>
        <span class="quarter-tag">${escapeHtml(quarter)}</span>
      </div>
      ${skillsList.length > 0 ? `
        <table class="partner-projects-table">
          <thead>
            <tr>
              <th style="width: 28px;">#</th>
              <th>Event / Activity</th>
              <th>Volunteer Name</th>
              <th>Skills Contributed</th>
              <th>Date</th>
              <th style="text-align: center;">Hours Logged</th>
            </tr>
          </thead>
          <tbody>
            ${skillsList.map((s, idx) => `
              <tr>
                <td style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                <td><strong>${escapeHtml(s.eventTitle)}</strong></td>
                <td><span style="font-weight: 700; color: #1e293b;">${escapeHtml(s.volunteerName)}</span></td>
                <td><span class="skill-tag">${escapeHtml(s.skills)}</span></td>
                <td style="color: #64748b; font-size: 11px;">${escapeHtml(s.date)}</td>
                <td style="text-align: center; font-weight: 800; color: #166534;">${s.hours} hrs</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `
        <div class="empty-section-hint">No volunteer skills logged for ${escapeHtml(quarter)}.</div>
      `}
    </div>

    <!-- 3. EVENTS CONDUCTED (all events made, listed, date, status) -->
    <div class="projects-table-section">
      <div class="section-title-bar">
        <div class="title-left">
          <span class="icon">📅</span>
          <span class="heading">Events Conducted (${eventsList.length})</span>
        </div>
        <span class="quarter-tag">${escapeHtml(quarter)}</span>
      </div>
      ${eventsList.length > 0 ? `
        <table class="partner-projects-table">
          <thead>
            <tr>
              <th style="width: 28px;">#</th>
              <th>Event Title</th>
              <th>Parent Project / Category</th>
              <th>Date</th>
              <th>Location</th>
              <th>Status</th>
              <th style="text-align: center;">Volunteers</th>
            </tr>
          </thead>
          <tbody>
            ${eventsList.map((e, idx) => `
              <tr>
                <td style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                <td><strong>${escapeHtml(e.title)}</strong></td>
                <td style="color: #475569;">${escapeHtml(e.parentProject || 'General Initiative')}</td>
                <td style="font-weight: 700; color: #1e293b;">${escapeHtml(e.date)}</td>
                <td style="color: #64748b;">${escapeHtml(e.location || 'Negros Occidental')}</td>
                <td><span class="status-pill status-${escapeHtml((e.status || 'completed').toLowerCase().replace(/\s+/g, '-'))}">${escapeHtml(e.status || 'Completed')}</span></td>
                <td style="text-align: center; font-weight: 800; color: #166534;">${e.volunteersCount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `
        <div class="empty-section-hint">No events conducted during ${escapeHtml(quarter)}.</div>
      `}
    </div>

    <!-- 4. SECTORS PARTNER (NGO, Hospitals, Institute, Private with all names) -->
    <div class="projects-table-section">
      <div class="section-title-bar">
        <div class="title-left">
          <span class="icon">🏢</span>
          <span class="heading">Partner Organizations by Sector</span>
        </div>
        <span class="quarter-tag">${escapeHtml(quarter)}</span>
      </div>
      ${sectorPartnerGroups.length > 0 ? `
        <div class="sector-groups-grid">
          ${sectorPartnerGroups.map(group => `
            <div class="sector-group-card">
              <div class="sector-group-header">
                <span class="sector-badge badge-${group.sectorType.toLowerCase()}">${escapeHtml(group.sectorType.toUpperCase())}</span>
                <span class="sector-group-title">${escapeHtml(group.sectorLabel)}</span>
                <span class="sector-group-count">${group.partners.length}</span>
              </div>
              ${group.partners.length > 0 ? `
                <ul class="sector-partner-names">
                  ${group.partners.map(partner => `
                    <li class="sector-partner-item">
                      <span class="dot">•</span>
                      <span class="partner-org-name">${escapeHtml(partner.name)}</span>
                      ${partner.location ? `<span class="partner-org-loc">(${escapeHtml(partner.location)})</span>` : ''}
                    </li>
                  `).join('')}
                </ul>
              ` : `
                <div class="empty-sector-hint">No partners registered under this sector for this quarter.</div>
              `}
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-section-hint">No partner sectors recorded for ${escapeHtml(quarter)}.</div>
      `}
    </div>

    <!-- 5. VOLUNTEERS INVOLVED (all volunteers in this quarter) -->
    <div class="projects-table-section">
      <div class="section-title-bar">
        <div class="title-left">
          <span class="icon">👥</span>
          <span class="heading">Volunteers Involved (${volunteersList.length})</span>
        </div>
        <span class="quarter-tag">${escapeHtml(quarter)}</span>
      </div>
      ${volunteersList.length > 0 ? `
        <table class="partner-projects-table">
          <thead>
            <tr>
              <th style="width: 28px;">#</th>
              <th>Volunteer Name</th>
              <th>Role / Focus</th>
              <th>Primary Skills</th>
              <th style="text-align: center;">Events Joined</th>
              <th style="text-align: center;">Hours Logged</th>
            </tr>
          </thead>
          <tbody>
            ${volunteersList.map((v, idx) => `
              <tr>
                <td style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                <td><strong>${escapeHtml(v.name)}</strong></td>
                <td><span style="font-size: 11px; color: #475569;">${escapeHtml(v.role || 'Community Volunteer')}</span></td>
                <td><span class="skill-tag">${escapeHtml(v.skills || 'General Support')}</span></td>
                <td style="text-align: center; font-weight: 700;">${v.eventsJoined}</td>
                <td style="text-align: center; font-weight: 800; color: #166534;">${v.hoursLogged} hrs</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `
        <div class="empty-section-hint">No volunteers participated in ${escapeHtml(quarter)}.</div>
      `}
    </div>

    <!-- IMPACT & STATUS SECTION -->
    <div class="impact-section">
      <div class="impact-banner">
        <span class="banner-badge">LOVE DELIVERS</span>
        <span class="banner-divider">|</span>
        <span class="banner-sub">Measuring Success</span>
      </div>

      <div class="impact-chart-box">
        <div class="impact-chart-header">
          <div class="impact-chart-title">${escapeHtml(data.statusSectionTitle || 'Project & Execution Status Distribution')}</div>
          <div class="impact-legend">
            ${statusItems.map(item => `
              <div class="legend-chip">
                <div class="legend-box" style="background: ${item.color};"></div>
                <span>${escapeHtml(item.status)} (${item.count})</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="chart-and-result-grid">
          <!-- Real status horizontal bars -->
          <div class="status-bars-container">
            ${statusItems.length > 0 ? statusItems.map(item => `
              <div class="status-bar-row">
                <div class="status-bar-labels">
                  <span>${escapeHtml(item.status)}</span>
                  <span>${item.count} items (${item.percent}%)</span>
                </div>
                <div class="status-bar-track">
                  <div class="status-bar-fill" style="width: ${Math.max(4, item.percent)}%; background: ${item.color};"></div>
                </div>
              </div>
            `).join('') : '<div style="font-size: 11px; color: #94a3b8; padding: 20px 0;">No status distribution data available.</div>'}
            <div class="footnote">${escapeHtml(data.statusSectionSubtitle || '*Data derived strictly from live system records.')}</div>
          </div>

          <!-- Overall Result Card -->
          <div class="overall-result-card">
            <div class="overall-result-title">Overall Status</div>
            ${overall ? `
              <div class="overall-stat-item">
                <div class="overall-stat-num">${overall.primaryPercent}%</div>
                <div class="overall-stat-label">${escapeHtml(overall.primaryLabel)}</div>
              </div>
              <div class="overall-stat-item">
                <div class="overall-stat-num">${overall.secondaryPercent}%</div>
                <div class="overall-stat-label">${escapeHtml(overall.secondaryLabel)}</div>
              </div>
              <div class="overall-stat-item">
                <div class="overall-stat-num">${overall.tertiaryPercent}%</div>
                <div class="overall-stat-label">${escapeHtml(overall.tertiaryLabel)}</div>
              </div>
            ` : `
              <div class="overall-stat-item">
                <div class="overall-stat-num">${data.totalProjects}</div>
                <div class="overall-stat-label">Total Records Tracked</div>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>

    <!-- EXECUTION HIGHLIGHTS -->
    <div class="highlights-section">
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">⭐</span>
          <span class="section-title">Execution Highlights</span>
        </div>
        <ul class="highlights-list">
          ${highlights.map(h => `
            <li class="highlight-item">
              <div class="check-icon">✓</div>
              <span>${escapeHtml(h)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>

    <!-- REAL PHOTOS GALLERY -->
    <div class="photos-section">
      <div class="photos-header">
        <div class="photos-title-wrap">
          <span style="font-size: 16px;">📷</span>
          <span class="photos-title">Photos from Verified Submissions</span>
        </div>
        <span class="view-all-pill">Photos (${photos.length})</span>
      </div>

      ${photos.length > 0 ? `
        <div class="photo-grid-5">
          ${photos.slice(0, 5).map(p => `
            <div class="photo-card">
              <img src="${escapeHtml(p.uri)}" alt="Volunteer Evidence" />
              <div class="photo-overlay">
                <div class="photo-meta">
                  <span class="photo-date">${escapeHtml(p.date)}</span>
                  <span class="photo-volunteer">${escapeHtml(p.volunteerName)}</span>
                </div>
                ${p.photoCount ? `<span class="photo-count-badge">${p.photoCount} photos</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-photos-box">
          No field photos uploaded in system records for this report.
        </div>
      `}
    </div>

    <!-- FOOTER -->
    <div class="report-footer">
      <div class="footer-left">
        <div class="footer-item">
          <span>🌐</span>
          <span>nvcfoundation-ph.org</span>
        </div>
        <div class="footer-item">
          <span>✉️</span>
          <span>info@nvcfoundation-ph.org</span>
        </div>
        <div class="footer-item">
          <span>📞</span>
          <span>(034) 703 6781</span>
        </div>
      </div>
      <div class="footer-right">
        <span>LOVE DELIVERS.</span> CHANGE HAPPENS.
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
