export interface ReportTemplateData {
  title: string;
  period: string;
  submittedOn: string;
  submittedBy: string;
  totalProjects: number;
  eventsConducted: number;
  volunteersInvolved: number;
  highlights: string[];
  photos: string[];
}

export function generateReportHtml(data: ReportTemplateData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Report PDF</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
        }
        .container {
          width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .header h1 {
          color: #166534;
          margin: 0;
          font-size: 28px;
        }
        .header .report-type {
          font-size: 14px;
          font-weight: bold;
          color: #fff;
          background: #166534;
          padding: 4px 12px;
          border-radius: 12px;
        }
        .title-section {
          margin-bottom: 30px;
        }
        .title-section h2 {
          color: #166534;
          margin: 0;
          font-size: 32px;
        }
        .meta {
          display: flex;
          gap: 40px;
          margin-top: 20px;
          color: #4b5563;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-item span:first-child {
          font-size: 12px;
          color: #9ca3af;
        }
        .meta-item span:last-child {
          font-weight: bold;
          font-size: 14px;
        }
        .stats-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .stat-card {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin: 0 8px;
          text-align: center;
        }
        .stat-card:first-child { margin-left: 0; }
        .stat-card:last-child { margin-right: 0; }
        .stat-title {
          font-size: 12px;
          color: #6b7280;
        }
        .stat-value {
          font-size: 36px;
          font-weight: bold;
          margin: 8px 0;
          color: #111827;
        }
        .content-grid {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
        }
        .highlights {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
        }
        .highlights h3 {
          color: #166534;
          margin-top: 0;
        }
        .highlights ul {
          padding-left: 20px;
        }
        .highlights li {
          margin-bottom: 10px;
          color: #4b5563;
        }
        .photos {
          margin-top: 20px;
        }
        .photos h3 {
          color: #166534;
        }
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .photo-item {
          width: 100%;
          height: 120px;
          background-color: #f3f4f6;
          border-radius: 8px;
          object-fit: cover;
        }
        .footer {
          margin-top: 40px;
          padding: 20px;
          background: #166534;
          color: #fff;
          display: flex;
          justify-content: space-between;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>NVC Foundation</h1>
            <span style="font-size: 12px; color: #6b7280;">Measuring Success</span>
          </div>
          <div>
            <h1 style="text-align: right; margin-bottom: 8px;">QUARTERLY REPORT</h1>
            <span class="report-type" style="float: right;">Q2 2026</span>
          </div>
        </div>

        <div class="title-section">
          <h2 style="font-weight: normal; color: #4b5563;">Analytics Overview</h2>
          <h2>${data.title}</h2>
          
          <div class="meta">
            <div class="meta-item">
              <span>Reporting Period</span>
              <span>${data.period}</span>
            </div>
            <div class="meta-item">
              <span>Submitted On</span>
              <span>${data.submittedOn}</span>
            </div>
            <div class="meta-item">
              <span>Submitted By</span>
              <span>${data.submittedBy}</span>
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-title">Total Projects</div>
            <div class="stat-value">${data.totalProjects}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Events Conducted</div>
            <div class="stat-value">${data.eventsConducted}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Volunteers Involved</div>
            <div class="stat-value">${data.volunteersInvolved}</div>
          </div>
        </div>

        <div class="content-grid">
          <div class="highlights">
            <h3>Project Highlights</h3>
            <ul>
              ${data.highlights.map(h => `<li>${h}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="photos">
          <h3>Photos from Reports</h3>
          <div class="photo-grid">
            ${data.photos.map(p => `<img src="${p}" class="photo-item" />`).join('')}
          </div>
        </div>
        
        <div class="footer">
          <span>nvcfoundation-ph.org</span>
          <span>LOVE DELIVERS. CHANGE HAPPENS.</span>
        </div>
      </div>
    </body>
    </html>
  `;
}
