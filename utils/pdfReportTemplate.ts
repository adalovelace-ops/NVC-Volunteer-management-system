export interface VolunteerPhotoItem {
  uri: string;
  volunteerName: string;
  date: string;
  photoCount?: number;
}

export interface SectorPartnerItem {
  sector: string;
  percent: number;
  color: string;
}

export interface LocationImpactItem {
  location: string;
  hitTargetPercent: number;
  improvedPercent: number;
  noImprovementPercent: number;
}

export interface ReportDocumentItem {
  name: string;
  type: 'pdf' | 'xlsx' | 'doc';
  size: string;
}

export interface ReportTemplateData {
  reportQuarter?: string;
  title: string;
  subtitle?: string;
  period: string;
  submittedOn: string;
  submittedBy: string;
  submittedRole?: string;
  heroPhoto?: string;
  totalProjects: number;
  totalProjectsDelta?: string;
  skillsContributed: number;
  skillsContributedDelta?: string;
  eventsConducted: number;
  eventsConductedDelta?: string;
  volunteersInvolved: number;
  volunteersInvolvedDelta?: string;
  sectorPartners?: SectorPartnerItem[];
  locationImpacts?: LocationImpactItem[];
  overallResult?: {
    hitTarget: number;
    improved: number;
    noImprovement: number;
  };
  highlights: string[];
  documents?: ReportDocumentItem[];
  photos: (string | VolunteerPhotoItem)[];
}

export function generateReportHtml(data: ReportTemplateData): string {
  const quarter = data.reportQuarter || 'Q2 2026';
  const subtitle = data.subtitle || 'Nutrition Program';
  const title = data.title || 'Mingo Meals Distribution';
  const period = data.period || 'Apr 1 - Jun 30, 2026';
  const submittedOn = data.submittedOn || 'Jul 5, 2026';
  const submittedBy = data.submittedBy || 'Anna Cruz';
  const submittedRole = data.submittedRole || 'Program Coordinator';

  const totalProjectsDelta = data.totalProjectsDelta || '+33% vs Q1 2026 ↗';
  const skillsDelta = data.skillsContributedDelta || '+14% vs Q1 2026 ↗';
  const eventsDelta = data.eventsConductedDelta || '+20% vs Q1 2026 ↗';
  const volunteersDelta = data.volunteersInvolvedDelta || '+15% vs Q1 2026 ↗';

  const defaultHeroPhoto =
    data.heroPhoto ||
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80';

  const sectors: SectorPartnerItem[] = data.sectorPartners && data.sectorPartners.length > 0
    ? data.sectorPartners
    : [
        { sector: 'Nutrition', percent: 40, color: '#166534' },
        { sector: 'Education', percent: 25, color: '#3b82f6' },
        { sector: 'Livelihood', percent: 20, color: '#f59e0b' },
        { sector: 'Health', percent: 10, color: '#ef4444' },
        { sector: 'Others', percent: 5, color: '#6b7280' },
      ];

  const locations: LocationImpactItem[] = data.locationImpacts && data.locationImpacts.length > 0
    ? data.locationImpacts
    : [
        { location: 'Bago', hitTargetPercent: 22, improvedPercent: 77, noImprovementPercent: 1 },
        { location: 'DSB', hitTargetPercent: 15, improvedPercent: 85, noImprovementPercent: 0 },
        { location: 'Victorias', hitTargetPercent: 19.17, improvedPercent: 79.7, noImprovementPercent: 1.13 },
        { location: 'Sagay', hitTargetPercent: 19.74, improvedPercent: 77.63, noImprovementPercent: 2.63 },
      ];

  const overall = data.overallResult || {
    hitTarget: 19,
    improved: 79,
    noImprovement: 2,
  };

  const defaultHighlights = [
    'Implemented daily Mingo meals distribution across community centers.',
    'Conducted nutrition education and volunteer orientation sessions.',
    'Monitored growth progress, attendance verification, and field check-ins.',
    'Provided health and medical wellness coordination with local partners.',
    'Facilitated livelihood empowerment seminars for beneficiary families.',
  ];

  const highlights = data.highlights && data.highlights.length > 0
    ? data.highlights
    : defaultHighlights;

  const defaultDocuments: ReportDocumentItem[] = [
    { name: `${quarter} Quarterly Report.pdf`, type: 'pdf', size: '2.4 MB' },
    { name: `Financial Summary ${quarter}.xlsx`, type: 'xlsx', size: '1.1 MB' },
    { name: `M&E Summary ${quarter}.pdf`, type: 'pdf', size: '1.6 MB' },
  ];

  const documents = data.documents && data.documents.length > 0
    ? data.documents
    : defaultDocuments;

  const rawPhotos = data.photos && data.photos.length > 0 ? data.photos : [];
  const normalizedPhotos: VolunteerPhotoItem[] = rawPhotos.slice(0, 5).map((p, i) => {
    if (typeof p === 'string') {
      const defaultNames = ['Maria Santos', 'John Dela Cruz', 'Ana Reyes', 'Ricky Villanueva', 'Jessa Bautista'];
      return {
        uri: p,
        volunteerName: defaultNames[i % defaultNames.length],
        date: 'Aug 14, 2026',
        photoCount: (i % 3) + 3,
      };
    }
    return p;
  });

  // If fewer than 5 photos, pad with realistic volunteer community photos
  const fallbackPhotos: VolunteerPhotoItem[] = [
    {
      uri: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=500&auto=format&fit=crop&q=80',
      volunteerName: 'Maria Santos',
      date: 'Aug 14, 2026',
      photoCount: 4,
    },
    {
      uri: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=500&auto=format&fit=crop&q=80',
      volunteerName: 'John Dela Cruz',
      date: 'Aug 14, 2026',
      photoCount: 6,
    },
    {
      uri: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=500&auto=format&fit=crop&q=80',
      volunteerName: 'Ana Reyes',
      date: 'Aug 14, 2026',
      photoCount: 3,
    },
    {
      uri: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=500&auto=format&fit=crop&q=80',
      volunteerName: 'Ricky Villanueva',
      date: 'Aug 15, 2026',
      photoCount: 5,
    },
    {
      uri: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=500&auto=format&fit=crop&q=80',
      volunteerName: 'Jessa Bautista',
      date: 'Aug 15, 2026',
      photoCount: 4,
    },
  ];

  const displayPhotos = normalizedPhotos.length >= 3
    ? normalizedPhotos
    : [...normalizedPhotos, ...fallbackPhotos.slice(normalizedPhotos.length, 5)];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - NVC Foundation Quarterly Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
      font-size: 18px;
      font-weight: 600;
      color: #16a34a;
      margin-bottom: 2px;
    }

    .program-title {
      font-size: 28px;
      font-weight: 800;
      color: #14532d;
      line-height: 1.15;
      margin-bottom: 18px;
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
      width: 270px;
      height: 140px;
      border-radius: 60px 16px 16px 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
    }

    .hero-photo-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
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
      font-size: 32px;
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
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: conic-gradient(
        #166534 0% 40%,
        #3b82f6 40% 65%,
        #f59e0b 65% 85%,
        #ef4444 85% 95%,
        #6b7280 95% 100%
      );
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

    /* IMPACT & BENEFICIARY STATUS SECTION */
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

    .impact-chart-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
    }

    .impact-chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .impact-legend {
      display: flex;
      gap: 14px;
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
      grid-template-columns: 1fr 180px;
      gap: 20px;
      align-items: center;
    }

    /* BAR CHART */
    .bar-chart-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      height: 170px;
      align-items: flex-end;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 8px;
    }

    .bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
    }

    .bar-columns {
      display: flex;
      align-items: flex-end;
      gap: 5px;
      width: 100%;
      justify-content: center;
      height: 135px;
    }

    .bar-col {
      width: 22px;
      border-radius: 4px 4px 0 0;
      position: relative;
      display: flex;
      justify-content: center;
    }

    .bar-col-label {
      position: absolute;
      top: -16px;
      font-size: 9px;
      font-weight: 700;
      color: #334155;
      white-space: nowrap;
    }

    .location-name {
      margin-top: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
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
      font-style: italic;
    }

    /* HIGHLIGHTS & DOCUMENTS */
    .two-col-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
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

    /* DOCUMENTS LIST */
    .doc-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .doc-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid #f1f5f9;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 8px;
    }

    .doc-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .doc-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      color: #ffffff;
    }

    .badge-pdf { background: #ef4444; }
    .badge-xlsx { background: #16a34a; }

    .doc-name {
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
    }

    .doc-size {
      font-size: 9px;
      color: #64748b;
    }

    .doc-dl-icon {
      font-size: 14px;
      color: #64748b;
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
        <!-- SVG Clover Logo -->
        <svg class="clover-logo" viewBox="0 0 100 100">
          <g fill="#22c55e">
            <!-- Top Heart -->
            <path d="M50 48 C42 35 30 35 30 45 C30 55 45 65 50 68 C55 65 70 55 70 45 C70 35 58 35 50 48 Z" transform="rotate(0 50 50) translate(0 -16)" />
            <!-- Left Heart -->
            <path d="M50 48 C42 35 30 35 30 45 C30 55 45 65 50 68 C55 65 70 55 70 45 C70 35 58 35 50 48 Z" transform="rotate(-90 50 50) translate(0 -16)" />
            <!-- Right Heart -->
            <path d="M50 48 C42 35 30 35 30 45 C30 55 45 65 50 68 C55 65 70 55 70 45 C70 35 58 35 50 48 Z" transform="rotate(90 50 50) translate(0 -16)" />
            <!-- Stem -->
            <path d="M48 54 Q44 74 38 82 Q42 82 50 60 Z" fill="#15803d" />
          </g>
        </svg>
        <div class="brand-text-block">
          <div class="brand-nvc">nvc <span style="font-weight: 700; color: #166534;">FOUNDATION</span></div>
          <div class="brand-sub">Measuring Success</div>
        </div>
      </div>

      <div class="report-quarter-badge-wrap">
        <div class="report-badge-title">QUARTERLY REPORT</div>
        <div class="quarter-pill">${escapeHtml(quarter)}</div>
      </div>
    </div>

    <!-- HERO SECTION -->
    <div class="hero-section">
      <div class="hero-info">
        <div class="program-subtitle">${escapeHtml(subtitle)}</div>
        <div class="program-title">${escapeHtml(title)}</div>

        <div class="meta-row">
          <div class="meta-item">
            <div class="meta-icon-box">📅</div>
            <div class="meta-content">
              <span class="meta-label">Reporting Period</span>
              <span class="meta-value">${escapeHtml(period)}</span>
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
              <span class="meta-label">Submitted By</span>
              <span class="meta-value">${escapeHtml(submittedBy)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-photo-wrap">
        <img src="${escapeHtml(defaultHeroPhoto)}" alt="Program Volunteers in Action" />
      </div>
    </div>

    <!-- 5 KPI METRIC CARDS -->
    <div class="metric-cards-row">
      <!-- Total Projects -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-icon">📁</span>
          <span class="kpi-title">Total Projects</span>
        </div>
        <div class="kpi-value">${data.totalProjects}</div>
        <div class="kpi-delta">${escapeHtml(totalProjectsDelta)}</div>
      </div>

      <!-- Skills Contributed -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-icon">👤</span>
          <span class="kpi-title">Skills Contributed</span>
        </div>
        <div class="kpi-value">${data.skillsContributed}</div>
        <div class="kpi-delta">${escapeHtml(skillsDelta)}</div>
      </div>

      <!-- Events Conducted -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-icon">📅</span>
          <span class="kpi-title">Events Conducted</span>
        </div>
        <div class="kpi-value">${data.eventsConducted}</div>
        <div class="kpi-delta">${escapeHtml(eventsDelta)}</div>
      </div>

      <!-- Sectors Partner -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-icon">📊</span>
          <span class="kpi-title">Sectors Partner</span>
        </div>
        <div class="sectors-card-content">
          <div class="pie-mini"></div>
          <div class="sectors-legend">
            ${sectors.map(s => `
              <div class="sector-item">
                <div class="sector-dot" style="background: ${s.color};"></div>
                <span>${escapeHtml(s.sector)} ${s.percent}%</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Volunteers Involved -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-icon">👥</span>
          <span class="kpi-title">Volunteers Involved</span>
        </div>
        <div class="kpi-value">${data.volunteersInvolved}</div>
        <div class="kpi-delta">${escapeHtml(volunteersDelta)}</div>
      </div>
    </div>

    <!-- IMPACT & BENEFICIARY STATUS SECTION -->
    <div class="impact-section">
      <div class="impact-banner">
        <span class="banner-badge">LOVE DELIVERS</span>
        <span class="banner-divider">|</span>
        <span class="banner-sub">Measuring Success</span>
      </div>

      <div class="impact-chart-box">
        <div class="impact-chart-header">
          <div class="impact-chart-title">% of Beneficiaries and their status after 1 year in the Nutrition Program - height</div>
          <div class="impact-legend">
            <div class="legend-chip">
              <div class="legend-box" style="background: #14532d;"></div>
              <span>Hit Target</span>
            </div>
            <div class="legend-chip">
              <div class="legend-box" style="background: #86efac;"></div>
              <span>Improved but below target</span>
            </div>
            <div class="legend-chip">
              <div class="legend-box" style="background: #94a3b8;"></div>
              <span>No Improvement</span>
            </div>
          </div>
        </div>

        <div class="chart-and-result-grid">
          <!-- 4-location Bar Chart -->
          <div>
            <div class="bar-chart-row">
              ${locations.map(loc => `
                <div class="bar-group">
                  <div class="bar-columns">
                    <!-- Improved bar (light green) -->
                    <div class="bar-col" style="height: ${Math.max(10, Math.min(100, loc.improvedPercent * 1.1))}px; background: #86efac;">
                      <span class="bar-col-label">${loc.improvedPercent}%</span>
                    </div>
                    <!-- Hit Target bar (dark green) -->
                    <div class="bar-col" style="height: ${Math.max(10, Math.min(130, loc.hitTargetPercent * 1.35))}px; background: #14532d;">
                      <span class="bar-col-label">${loc.hitTargetPercent}%</span>
                    </div>
                    <!-- No Improvement bar (gray) -->
                    <div class="bar-col" style="height: ${Math.max(4, Math.min(40, loc.noImprovementPercent * 6))}px; background: #94a3b8;">
                      <span class="bar-col-label">${loc.noImprovementPercent}%</span>
                    </div>
                  </div>
                  <div class="location-name">${escapeHtml(loc.location)}</div>
                </div>
              `).join('')}
            </div>
            <div class="footnote">*Based on height-for-age improvement of beneficiaries after 1 year in the program.</div>
          </div>

          <!-- Overall Result Card -->
          <div class="overall-result-card">
            <div class="overall-result-title">Overall Result</div>
            <div class="overall-stat-item">
              <div class="overall-stat-num">${overall.hitTarget}%</div>
              <div class="overall-stat-label">Hit Target</div>
            </div>
            <div class="overall-stat-item">
              <div class="overall-stat-num">${overall.improved}%</div>
              <div class="overall-stat-label">Improved but below target</div>
            </div>
            <div class="overall-stat-item">
              <div class="overall-stat-num">${overall.noImprovement}%</div>
              <div class="overall-stat-label">No improvement</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TWO-COLUMN SECTION: HIGHLIGHTS & DOCUMENTS -->
    <div class="two-col-grid">
      <!-- Left: Project Highlights -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">⭐</span>
          <span class="section-title">Project Highlights</span>
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

      <!-- Right: Report Documents -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">📑</span>
          <span class="section-title">Report Documents</span>
        </div>
        <div class="doc-list">
          ${documents.map(d => `
            <div class="doc-item">
              <div class="doc-left">
                <span class="doc-badge ${d.type === 'pdf' ? 'badge-pdf' : 'badge-xlsx'}">${d.type.toUpperCase()}</span>
                <div>
                  <div class="doc-name">${escapeHtml(d.name)}</div>
                  <div class="doc-size">${escapeHtml(d.size)}</div>
                </div>
              </div>
              <span class="doc-dl-icon">↓</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- PHOTOS GALLERY -->
    <div class="photos-section">
      <div class="photos-header">
        <div class="photos-title-wrap">
          <span style="font-size: 16px;">📷</span>
          <span class="photos-title">Photos from Volunteers Report</span>
        </div>
        <span class="view-all-pill">View All Photos (${rawPhotos.length || 24})</span>
      </div>

      <div class="photo-grid-5">
        ${displayPhotos.map(p => `
          <div class="photo-card">
            <img src="${escapeHtml(p.uri)}" alt="Volunteer Activity" />
            <div class="photo-overlay">
              <div class="photo-meta">
                <span class="photo-date">${escapeHtml(p.date)}</span>
                <span class="photo-volunteer">${escapeHtml(p.volunteerName)}</span>
              </div>
              <span class="photo-count-badge">${p.photoCount || 4} photos</span>
            </div>
          </div>
        `).join('')}
      </div>
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
