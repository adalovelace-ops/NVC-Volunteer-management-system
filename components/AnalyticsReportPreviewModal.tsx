import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { Partner, PartnerProjectApplication, PartnerReport, Project, Volunteer, VolunteerProjectJoinRecord, VolunteerTimeLog } from '../models/types';
import {
  generateReportHtml,
  ReportTemplateData,
  VolunteerPhotoItem,
  SectorPartnerItem,
  StatusDistributionItem,
  ReportDocumentItem,
} from '../utils/pdfReportTemplate';
import { downloadHtmlPdf } from '../utils/pdfDownload';

interface AnalyticsReportPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  volunteers: Volunteer[];
  projects: Project[];
  partners: Partner[];
  partnerApplications?: PartnerProjectApplication[];
  volunteerJoinRecords: VolunteerProjectJoinRecord[];
  timeLogs: VolunteerTimeLog[];
  reports?: PartnerReport[];
  skillAnalytics: {
    slices: { name: string; count: number; percent: number; color: string }[];
    volunteerCount: number;
    contributionCount: number;
  };
  currentTotal: number;
  monthlyDelta: number;
}

export default function AnalyticsReportPreviewModal({
  visible,
  onClose,
  volunteers,
  projects,
  partners,
  partnerApplications = [],
  volunteerJoinRecords,
  timeLogs,
  reports = [],
  skillAnalytics,
  currentTotal,
  monthlyDelta,
}: AnalyticsReportPreviewModalProps) {
  // Scope type: 'executive' | projectId | reportId
  const [selectedScope, setSelectedScope] = useState<string>('executive');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'html'>('card');

  const now = new Date();
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;

  // Build strictly from system data
  const reportData: ReportTemplateData = useMemo(() => {
    const volunteersById = new Map(volunteers.map(v => [v.id, v]));
    const volunteersByUserId = new Map(volunteers.map(v => [v.userId, v]));

    // CASE 1: Individual Partner Report Selected
    if (selectedScope.startsWith('report:')) {
      const reportId = selectedScope.replace('report:', '');
      const report = reports.find(r => r.id === reportId);
      if (report) {
        const linkedProject = projects.find(p => p.id === report.projectId);

        // Real photos from this report and project
        const realPhotos: VolunteerPhotoItem[] = [];
        if (report.mediaFile && report.mediaFile.trim()) {
          realPhotos.push({
            uri: report.mediaFile.trim(),
            volunteerName: report.submitterName || 'Report Submitter',
            date: report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Logged',
            photoCount: 1,
          });
        }
        timeLogs
          .filter(l => l.projectId === report.projectId && Boolean((l.attendancePhoto || l.completionPhoto || '').trim()))
          .forEach((l, idx) => {
            const uri = (l.attendancePhoto || l.completionPhoto || '').trim();
            if (!realPhotos.some(p => p.uri === uri)) {
              const vol = volunteersById.get(l.volunteerId) || volunteersByUserId.get(l.volunteerId);
              realPhotos.push({
                uri,
                volunteerName: vol?.name || `Volunteer ${idx + 1}`,
                date: l.timeIn ? new Date(l.timeIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified',
                photoCount: 1,
              });
            }
          });

        const highlights: string[] = [];
        if (report.description && report.description.trim()) {
          highlights.push(`Report Summary: ${report.description.trim()}`);
        }
        if (report.collaborationFeedback && report.collaborationFeedback.trim()) {
          highlights.push(`Collaboration Feedback: ${report.collaborationFeedback.trim()}`);
        }
        if (report.volunteerPraise && report.volunteerPraise.trim()) {
          highlights.push(`Volunteer Commendation: ${report.volunteerPraise.trim()}`);
        }
        if (report.gratitudeNote && report.gratitudeNote.trim()) {
          highlights.push(`Gratitude Message: ${report.gratitudeNote.trim()}`);
        }
        if (linkedProject) {
          highlights.push(`Linked Program: "${linkedProject.title}" (${linkedProject.status}) at ${linkedProject.location?.address || 'Negros Occidental'}.`);
        }

        const documents: ReportDocumentItem[] = [
          { name: `Report_${report.id.slice(0, 8)}.pdf`, type: 'pdf', size: 'Verified Report' },
        ];
        if (report.attachments && Array.isArray(report.attachments)) {
          report.attachments.forEach(att => {
            documents.push({
              name: att.description || 'Report Attachment',
              type: att.type === 'document' ? 'doc' : 'pdf',
              size: 'Attached File',
            });
          });
        }

        return {
          reportQuarter: currentQuarter,
          title: report.title || linkedProject?.title || 'Partner Field Report',
          subtitle: `Category: ${report.reportType} • Project: ${linkedProject?.title || 'General'}`,
          period: `Submitted: ${report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}`,
          submittedOn: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          submittedBy: report.submitterName || 'Partner Representative',
          submittedRole: report.submitterRole || 'Partner',
          heroPhoto: report.mediaFile?.trim() || undefined,
          totalProjects: report.impactCount || 0,
          totalProjectsLabel: 'Impact Count',
          totalProjectsDelta: 'Beneficiaries impacted',
          skillsContributed: linkedProject?.skillsNeeded?.length || 1,
          skillsContributedLabel: 'Skills Applied',
          skillsContributedDelta: linkedProject?.skillsNeeded?.join(', ') || 'Field Support',
          eventsConducted: linkedProject?.isEvent ? 1 : 0,
          eventsConductedLabel: 'Event Verified',
          eventsConductedDelta: linkedProject?.isEvent ? 'Live Event' : 'Continuous Program',
          volunteersInvolved: linkedProject?.volunteers?.length || 0,
          volunteersInvolvedLabel: 'Volunteers Engaged',
          volunteersInvolvedDelta: `Status: ${report.status}`,
          sectorPartners: [],
          statusSectionTitle: 'Verification Status',
          statusSectionSubtitle: 'Report submission and review state',
          statusDistributions: [
            {
              status: report.status || 'Submitted',
              count: 1,
              percent: 100,
              color: report.status === 'Reviewed' ? '#166534' : '#2563eb',
            },
          ],
          overallResult: {
            primaryLabel: report.status || 'Submitted',
            primaryPercent: 100,
            secondaryLabel: 'Impact Logged',
            secondaryPercent: report.impactCount || 0,
            tertiaryLabel: 'Review Status',
            tertiaryPercent: report.reviewedAt ? 100 : 0,
          },
          highlights,
          documents,
          photos: realPhotos,
        };
      }
    }

    // CASE 2: Individual Project / Event Selected
    if (selectedScope.startsWith('project:')) {
      const projectId = selectedScope.replace('project:', '');
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const app = partnerApplications.find(a => a.projectId === project.id && a.status === 'Approved');
        const partner = partners.find(pt => pt.id === project.partnerId || pt.ownerUserId === app?.partnerUserId);
        const joinedRecords = volunteerJoinRecords.filter(r => r.projectId === project.id);
        const joinedCount = (project.volunteers?.length || 0) + joinedRecords.length;

        // Real photos uploaded for this project only
        const realPhotos: VolunteerPhotoItem[] = [];
        timeLogs
          .filter(l => l.projectId === project.id && Boolean((l.attendancePhoto || l.completionPhoto || '').trim()))
          .forEach((l, idx) => {
            const uri = (l.attendancePhoto || l.completionPhoto || '').trim();
            if (!realPhotos.some(p => p.uri === uri)) {
              const vol = volunteersById.get(l.volunteerId) || volunteersByUserId.get(l.volunteerId);
              realPhotos.push({
                uri,
                volunteerName: vol?.name || `Volunteer ${idx + 1}`,
                date: l.timeIn ? new Date(l.timeIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified',
                photoCount: 1,
              });
            }
          });

        // Real internal tasks breakdown
        const tasks = project.internalTasks || [];
        const completedTasks = tasks.filter(t => t.status === 'Completed').length;
        const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
        const assignedTasks = tasks.filter(t => t.status === 'Assigned').length;
        const unassignedTasks = tasks.filter(t => t.status === 'Unassigned').length;
        const totalTasks = Math.max(1, tasks.length);

        const statusDistributions: StatusDistributionItem[] = tasks.length > 0 ? [
          { status: 'Completed', count: completedTasks, percent: Math.round((completedTasks / totalTasks) * 100), color: '#166534' },
          { status: 'In Progress', count: inProgressTasks, percent: Math.round((inProgressTasks / totalTasks) * 100), color: '#2563eb' },
          { status: 'Assigned', count: assignedTasks, percent: Math.round((assignedTasks / totalTasks) * 100), color: '#d97706' },
          { status: 'Unassigned', count: unassignedTasks, percent: Math.round((unassignedTasks / totalTasks) * 100), color: '#64748b' },
        ] : [
          { status: project.status, count: 1, percent: 100, color: '#166534' },
        ];

        const highlights: string[] = [];
        if (project.description && project.description.trim()) {
          highlights.push(`Program Description: ${project.description.trim()}`);
        }
        highlights.push(`Current Status: ${project.status} (${project.isEvent ? 'Event' : 'Program'}).`);
        highlights.push(`Location Placement: ${project.location?.address || 'Negros Occidental'}.`);
        highlights.push(`Volunteer Mobilization: ${joinedCount} joined of ${project.volunteersNeeded || 'N/A'} target.`);
        if (tasks.length > 0) {
          highlights.push(`Internal Tasks: ${completedTasks} completed out of ${tasks.length} delegated.`);
        }
        if (partner) {
          highlights.push(`Partner Collaboration: Partner organization "${partner.name}" (${partner.sectorType}).`);
        }

        const pStart = project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
        const pEnd = project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

        const documents: ReportDocumentItem[] = [
          { name: `Project_Report_${project.id.slice(0, 8)}.pdf`, type: 'pdf', size: 'Project Summary' },
        ];

        return {
          reportQuarter: currentQuarter,
          title: project.title,
          subtitle: `${project.isEvent ? 'Event' : 'Project'} • ${project.programModule || project.category || 'General'}`,
          period: `${pStart} - ${pEnd}`,
          submittedOn: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          submittedBy: partner?.name || 'Project Coordinator',
          submittedRole: partner?.sectorType || 'Coordinator',
          heroPhoto: undefined,
          totalProjects: 1,
          totalProjectsLabel: 'Project Status',
          totalProjectsDelta: project.status,
          skillsContributed: project.skillsNeeded?.length || 0,
          skillsContributedLabel: 'Skills Required',
          skillsContributedDelta: project.skillsNeeded?.slice(0, 2).join(', ') || 'General',
          eventsConducted: tasks.length,
          eventsConductedLabel: 'Internal Tasks',
          eventsConductedDelta: `${completedTasks} completed`,
          volunteersInvolved: joinedCount,
          volunteersInvolvedLabel: 'Volunteers Joined',
          volunteersInvolvedDelta: `Target: ${project.volunteersNeeded || 'N/A'}`,
          sectorPartners: partner ? [{ sector: partner.sectorType, count: 1, percent: 100, color: '#166534' }] : [],
          statusSectionTitle: tasks.length > 0 ? 'Internal Tasks Execution' : 'Project Status',
          statusSectionSubtitle: `Progress tracking for ${project.title}`,
          statusDistributions,
          overallResult: {
            primaryLabel: tasks.length > 0 ? 'Completed Tasks' : 'Status',
            primaryPercent: tasks.length > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100,
            secondaryLabel: tasks.length > 0 ? 'In Progress' : 'Volunteers',
            secondaryPercent: tasks.length > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : joinedCount,
            tertiaryLabel: tasks.length > 0 ? 'Pending' : 'Target',
            tertiaryPercent: tasks.length > 0 ? Math.round((unassignedTasks / totalTasks) * 100) : (project.volunteersNeeded || 0),
          },
          highlights,
          documents,
          photos: realPhotos,
        };
      }
    }

    // CASE 3: Full System Executive Analytics Report
    const regularProjects = projects.filter(p => !p.isEvent);
    const events = projects.filter(p => p.isEvent);

    // Partner sector counts
    const sectorCounts: Record<string, number> = {};
    partners.forEach(p => {
      const s = p.sectorType || 'Other';
      sectorCounts[s] = (sectorCounts[s] || 0) + 1;
    });
    const totalPartners = Math.max(1, partners.length);
    const sectorColors: Record<string, string> = {
      NGO: '#166534',
      Hospital: '#ef4444',
      Institution: '#3b82f6',
      Private: '#f59e0b',
    };
    const sectorPartners: SectorPartnerItem[] = Object.keys(sectorCounts).map(s => ({
      sector: s,
      count: sectorCounts[s],
      percent: Math.round((sectorCounts[s] / totalPartners) * 100),
      color: sectorColors[s] || '#6b7280',
    }));

    // Real project status counts
    const statusCounts: Record<string, number> = {
      Planning: 0,
      'In Progress': 0,
      'On Hold': 0,
      Completed: 0,
      Cancelled: 0,
    };
    projects.forEach(p => {
      if (statusCounts[p.status] !== undefined) {
        statusCounts[p.status] += 1;
      } else {
        statusCounts['Planning'] += 1;
      }
    });
    const totalProj = Math.max(1, projects.length);
    const statusColors: Record<string, string> = {
      'In Progress': '#166534',
      Planning: '#2563eb',
      Completed: '#7c3aed',
      'On Hold': '#d97706',
      Cancelled: '#dc2626',
    };
    const statusDistributions: StatusDistributionItem[] = Object.keys(statusCounts)
      .filter(st => statusCounts[st] > 0)
      .map(st => ({
        status: st,
        count: statusCounts[st],
        percent: Math.round((statusCounts[st] / totalProj) * 100),
        color: statusColors[st] || '#64748b',
      }));

    // Calculate total completed volunteer hours
    const completedHours = Math.round(
      timeLogs.reduce((sum, log) => {
        if (!log.timeIn || !log.timeOut) return sum;
        const s = new Date(log.timeIn).getTime();
        const e = new Date(log.timeOut).getTime();
        return sum + (e > s ? (e - s) / 3_600_000 : 0);
      }, 0)
    );

    // Collect ONLY real photos
    const realPhotos: VolunteerPhotoItem[] = [];
    timeLogs
      .filter(l => Boolean((l.attendancePhoto || l.completionPhoto || '').trim()))
      .slice(0, 5)
      .forEach((l, idx) => {
        const uri = (l.attendancePhoto || l.completionPhoto || '').trim();
        if (!realPhotos.some(p => p.uri === uri)) {
          const vol = volunteersById.get(l.volunteerId) || volunteersByUserId.get(l.volunteerId);
          realPhotos.push({
            uri,
            volunteerName: vol?.name || `Volunteer ${idx + 1}`,
            date: l.timeIn ? new Date(l.timeIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified',
            photoCount: 1,
          });
        }
      });

    reports
      .filter(r => Boolean(r.mediaFile && r.mediaFile.trim()))
      .slice(0, 5)
      .forEach(r => {
        const uri = r.mediaFile!.trim();
        if (!realPhotos.some(p => p.uri === uri)) {
          realPhotos.push({
            uri,
            volunteerName: r.submitterName || 'Partner Reporter',
            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified',
            photoCount: 1,
          });
        }
      });

    // Real highlights from system
    const highlights: string[] = [
      `Registered ${volunteers.length} volunteers contributing ${skillAnalytics.contributionCount} verified skills across ${skillAnalytics.slices.length} categories.`,
      `Mobilized ${projects.length} total initiatives (${regularProjects.length} programs and ${events.length} community events).`,
      `Engaged ${partners.length} validated partner organizations across ${Object.keys(sectorCounts).length} sectors.`,
      `Recorded ${completedHours} verified volunteer service hours through digital timekeeping.`,
      `Generated ${reports.length} partner operational and field impact submissions.`,
    ];

    const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const qStart = new Date(now.getFullYear(), currentQuarterMonth, 1);
    const qEnd = new Date(now.getFullYear(), currentQuarterMonth + 3, 0);
    const periodStr = `${qStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${qEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const completedPercent = Math.round((statusCounts['Completed'] / totalProj) * 100);
    const activePercent = Math.round((statusCounts['In Progress'] / totalProj) * 100);
    const planningPercent = Math.round((statusCounts['Planning'] / totalProj) * 100);

    return {
      reportQuarter: currentQuarter,
      title: 'Executive System Analytics & Impact Report',
      subtitle: 'Negros Occidental Volunteer Operations & Project Tracking',
      period: periodStr,
      submittedOn: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      submittedBy: 'NVC Administration',
      submittedRole: 'Administrator',
      heroPhoto: undefined,
      totalProjects: regularProjects.length,
      totalProjectsLabel: 'Total Projects',
      totalProjectsDelta: `${statusCounts['Completed']} Completed`,
      skillsContributed: skillAnalytics.contributionCount,
      skillsContributedLabel: 'Skills Contributed',
      skillsContributedDelta: `${skillAnalytics.slices.length} Unique Skills`,
      eventsConducted: events.length,
      eventsConductedLabel: 'Events Conducted',
      eventsConductedDelta: `${events.filter(e => e.status === 'Completed').length} Completed`,
      volunteersInvolved: currentTotal || volunteers.length,
      volunteersInvolvedLabel: 'Volunteers Involved',
      volunteersInvolvedDelta: `${monthlyDelta >= 0 ? '+' : ''}${monthlyDelta} this month`,
      sectorPartners,
      statusSectionTitle: 'Project Execution Status',
      statusSectionSubtitle: 'Distribution of project lifecycles across active operations',
      statusDistributions,
      overallResult: {
        primaryLabel: 'In Progress (Active)',
        primaryPercent: activePercent,
        secondaryLabel: 'Planning (Draft)',
        secondaryPercent: planningPercent,
        tertiaryLabel: 'Completed (Closed)',
        tertiaryPercent: completedPercent,
      },
      highlights,
      documents: [
        { name: `NVC_Executive_Analytics_${currentQuarter.replace(/\s+/g, '_')}.pdf`, type: 'pdf', size: 'Executive Summary' },
        { name: `Volunteers_Directory_${currentQuarter.replace(/\s+/g, '_')}.pdf`, type: 'pdf', size: `${volunteers.length} Volunteers` },
      ],
      photos: realPhotos,
    };
  }, [
    selectedScope,
    projects,
    partners,
    partnerApplications,
    volunteers,
    volunteerJoinRecords,
    timeLogs,
    reports,
    currentQuarter,
    skillAnalytics,
    currentTotal,
    monthlyDelta,
  ]);

  const htmlContent = useMemo(() => generateReportHtml(reportData), [reportData]);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const filename = selectedScope === 'executive'
        ? `NVC_Executive_Report_${currentQuarter.replace(/\s+/g, '_')}.pdf`
        : `NVC_Report_${reportData.title.slice(0, 24).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      await downloadHtmlPdf(filename, htmlContent);
    } catch (err: any) {
      console.error('Failed to download PDF', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={styles.cloverIconBox}>
                <MaterialIcons name="eco" size={22} color="#166534" />
              </View>
              <View>
                <Text style={styles.topBarTitle}>NVC Report Preview</Text>
                <Text style={styles.topBarSubtitle}>Green Executive Template • Live System Data</Text>
              </View>
            </View>

            <View style={styles.topBarRight}>
              {/* View Mode Toggle on Web */}
              {Platform.OS === 'web' && (
                <View style={styles.viewToggleGroup}>
                  <TouchableOpacity
                    style={[styles.viewToggleBtn, viewMode === 'card' && styles.viewToggleBtnActive]}
                    onPress={() => setViewMode('card')}
                  >
                    <Text style={[styles.viewToggleText, viewMode === 'card' && styles.viewToggleTextActive]}>
                      Card
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewToggleBtn, viewMode === 'html' && styles.viewToggleBtnActive]}
                    onPress={() => setViewMode('html')}
                  >
                    <Text style={[styles.viewToggleText, viewMode === 'html' && styles.viewToggleTextActive]}>
                      HTML
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Download PDF Button */}
              <TouchableOpacity
                style={styles.downloadPrimaryBtn}
                onPress={handleDownload}
                disabled={isGenerating}
                activeOpacity={0.85}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                ) : (
                  <MaterialIcons name="file-download" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.downloadPrimaryBtnText}>
                  {isGenerating ? 'Compiling...' : 'Download PDF'}
                </Text>
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* REPORT SELECTOR STRIP (Per Report PDF Support) */}
          <View style={styles.scopeStrip}>
            <Text style={styles.scopeStripLabel}>Select Report:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopeScroll}>
              <TouchableOpacity
                style={[styles.scopeChip, selectedScope === 'executive' && styles.scopeChipActive]}
                onPress={() => setSelectedScope('executive')}
              >
                <MaterialIcons
                  name="analytics"
                  size={14}
                  color={selectedScope === 'executive' ? '#ffffff' : '#166534'}
                />
                <Text style={[styles.scopeChipText, selectedScope === 'executive' && styles.scopeChipTextActive]}>
                  Full System Executive
                </Text>
              </TouchableOpacity>

              {/* Real projects in system */}
              {projects.map(p => (
                <TouchableOpacity
                  key={`proj-${p.id}`}
                  style={[styles.scopeChip, selectedScope === `project:${p.id}` && styles.scopeChipActive]}
                  onPress={() => setSelectedScope(`project:${p.id}`)}
                >
                  <MaterialIcons
                    name={p.isEvent ? 'event' : 'folder'}
                    size={14}
                    color={selectedScope === `project:${p.id}` ? '#ffffff' : '#475569'}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.scopeChipText, selectedScope === `project:${p.id}` && styles.scopeChipTextActive]}
                  >
                    {p.title}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Real partner reports in system */}
              {reports.map(r => (
                <TouchableOpacity
                  key={`rep-${r.id}`}
                  style={[styles.scopeChip, selectedScope === `report:${r.id}` && styles.scopeChipActive]}
                  onPress={() => setSelectedScope(`report:${r.id}`)}
                >
                  <MaterialIcons
                    name="assignment"
                    size={14}
                    color={selectedScope === `report:${r.id}` ? '#ffffff' : '#2563eb'}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.scopeChipText, selectedScope === `report:${r.id}` && styles.scopeChipTextActive]}
                  >
                    {r.title || `${r.submitterName} Report`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* PREVIEW CONTENT */}
          <ScrollView contentContainerStyle={styles.previewScroll} showsVerticalScrollIndicator={true}>
            {viewMode === 'html' && Platform.OS === 'web' ? (
              <View style={styles.iframeWrapper}>
                <iframe
                  srcDoc={htmlContent}
                  style={{
                    width: '100%',
                    height: 1100,
                    border: 'none',
                    borderRadius: 12,
                    backgroundColor: '#ffffff',
                  }}
                  title="PDF Report Preview"
                />
              </View>
            ) : (
              /* NATIVE / REACT NATIVE CARD PREVIEW */
              <View style={styles.reportSheet}>
                {/* 1. Header */}
                <View style={styles.sheetHeader}>
                  <View style={styles.brandRow}>
                    <View style={styles.cloverBadge}>
                      <MaterialIcons name="eco" size={32} color="#16a34a" />
                    </View>
                    <View>
                      <Text style={styles.brandTitle}>
                        nvc <Text style={{ color: '#166534', fontWeight: '800' }}>FOUNDATION</Text>
                      </Text>
                      <Text style={styles.brandSubtitle}>Measuring Success</Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.reportCategoryTitle}>SYSTEM REPORT</Text>
                    {reportData.reportQuarter ? (
                      <View style={styles.quarterBadge}>
                        <Text style={styles.quarterBadgeText}>{reportData.reportQuarter}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* 2. Hero & Subtitles */}
                <View style={styles.sheetHero}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroSubtitle}>{reportData.subtitle}</Text>
                    <Text style={styles.heroTitle}>{reportData.title}</Text>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <MaterialIcons name="event" size={16} color="#16a34a" />
                        <View>
                          <Text style={styles.metaLabel}>Reporting Period</Text>
                          <Text style={styles.metaValue}>{reportData.period}</Text>
                        </View>
                      </View>

                      <View style={styles.metaItem}>
                        <MaterialIcons name="schedule" size={16} color="#16a34a" />
                        <View>
                          <Text style={styles.metaLabel}>Submitted On</Text>
                          <Text style={styles.metaValue}>{reportData.submittedOn}</Text>
                        </View>
                      </View>

                      <View style={styles.metaItem}>
                        <MaterialIcons name="person" size={16} color="#16a34a" />
                        <View>
                          <Text style={styles.metaLabel}>Submitted By</Text>
                          <Text style={styles.metaValue}>
                            {reportData.submittedBy} ({reportData.submittedRole})
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {reportData.heroPhoto ? (
                    <Image
                      source={{ uri: reportData.heroPhoto }}
                      style={styles.heroImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.heroBrandPlaceholder}>
                      <Text style={styles.heroBrandText}>NVC FOUNDATION</Text>
                      <Text style={styles.heroBrandSub}>Negros Occidental Operations</Text>
                    </View>
                  )}
                </View>

                {/* 3. Top 5 KPI Cards */}
                <View style={styles.kpiRow}>
                  <View style={styles.kpiCard}>
                    <View style={styles.kpiHeader}>
                      <MaterialIcons name="folder" size={14} color="#64748b" />
                      <Text style={styles.kpiTitle}>{reportData.totalProjectsLabel || 'Projects'}</Text>
                    </View>
                    <Text style={styles.kpiNum}>{reportData.totalProjects}</Text>
                    <Text style={styles.kpiDelta}>{reportData.totalProjectsDelta}</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <View style={styles.kpiHeader}>
                      <MaterialIcons name="psychology" size={14} color="#64748b" />
                      <Text style={styles.kpiTitle}>{reportData.skillsContributedLabel || 'Skills'}</Text>
                    </View>
                    <Text style={styles.kpiNum}>{reportData.skillsContributed}</Text>
                    <Text style={styles.kpiDelta}>{reportData.skillsContributedDelta}</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <View style={styles.kpiHeader}>
                      <MaterialIcons name="event-available" size={14} color="#64748b" />
                      <Text style={styles.kpiTitle}>{reportData.eventsConductedLabel || 'Events'}</Text>
                    </View>
                    <Text style={styles.kpiNum}>{reportData.eventsConducted}</Text>
                    <Text style={styles.kpiDelta}>{reportData.eventsConductedDelta}</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <View style={styles.kpiHeader}>
                      <MaterialIcons name="pie-chart" size={14} color="#64748b" />
                      <Text style={styles.kpiTitle}>Sectors</Text>
                    </View>
                    <View style={styles.sectorsPreview}>
                      {(reportData.sectorPartners || []).length > 0 ? (
                        (reportData.sectorPartners || []).slice(0, 3).map(s => (
                          <View key={s.sector} style={styles.sectorRow}>
                            <View style={[styles.sectorDot, { backgroundColor: s.color }]} />
                            <Text style={styles.sectorText} numberOfLines={1}>
                              {s.sector} ({s.count})
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.sectorEmptyText}>No sectors</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.kpiCard}>
                    <View style={styles.kpiHeader}>
                      <MaterialIcons name="groups" size={14} color="#64748b" />
                      <Text style={styles.kpiTitle}>{reportData.volunteersInvolvedLabel || 'Volunteers'}</Text>
                    </View>
                    <Text style={styles.kpiNum}>{reportData.volunteersInvolved}</Text>
                    <Text style={styles.kpiDelta}>{reportData.volunteersInvolvedDelta}</Text>
                  </View>
                </View>

                {/* 4. Middle Section - Real Status Distribution */}
                <View style={styles.impactBox}>
                  <View style={styles.impactBanner}>
                    <Text style={styles.bannerBadge}>LOVE DELIVERS</Text>
                    <Text style={styles.bannerDivider}>|</Text>
                    <Text style={styles.bannerSub}>Measuring Success</Text>
                  </View>

                  <View style={styles.impactContent}>
                    <View style={styles.chartHeader}>
                      <Text style={styles.chartTitle}>
                        {reportData.statusSectionTitle || 'Project Execution Status'}
                      </Text>
                      <View style={styles.chartLegend}>
                        {(reportData.statusDistributions || []).map(item => (
                          <View key={item.status} style={styles.legendChip}>
                            <View style={[styles.legendBox, { backgroundColor: item.color }]} />
                            <Text style={styles.legendText}>
                              {item.status} ({item.count})
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={styles.chartGrid}>
                      {/* Real status bars */}
                      <View style={styles.statusBarsContainer}>
                        {(reportData.statusDistributions || []).map(item => (
                          <View key={item.status} style={styles.statusBarRow}>
                            <View style={styles.statusBarLabels}>
                              <Text style={styles.statusBarStatusText}>{item.status}</Text>
                              <Text style={styles.statusBarCountText}>
                                {item.count} items ({item.percent}%)
                              </Text>
                            </View>
                            <View style={styles.statusBarTrack}>
                              <View
                                style={[
                                  styles.statusBarFill,
                                  {
                                    width: `${Math.max(4, item.percent)}%`,
                                    backgroundColor: item.color,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        ))}
                      </View>

                      {/* Overall Result Box */}
                      <View style={styles.overallResultCard}>
                        <Text style={styles.overallResultTitle}>Overall Status</Text>
                        {reportData.overallResult ? (
                          <>
                            <View style={styles.overallStatBlock}>
                              <Text style={styles.overallStatNum}>
                                {reportData.overallResult.primaryPercent}%
                              </Text>
                              <Text style={styles.overallStatLabel}>
                                {reportData.overallResult.primaryLabel}
                              </Text>
                            </View>
                            <View style={styles.overallStatBlock}>
                              <Text style={styles.overallStatNum}>
                                {reportData.overallResult.secondaryPercent}%
                              </Text>
                              <Text style={styles.overallStatLabel}>
                                {reportData.overallResult.secondaryLabel}
                              </Text>
                            </View>
                            <View style={styles.overallStatBlock}>
                              <Text style={styles.overallStatNum}>
                                {reportData.overallResult.tertiaryPercent}%
                              </Text>
                              <Text style={styles.overallStatLabel}>
                                {reportData.overallResult.tertiaryLabel}
                              </Text>
                            </View>
                          </>
                        ) : (
                          <View style={styles.overallStatBlock}>
                            <Text style={styles.overallStatNum}>{reportData.totalProjects}</Text>
                            <Text style={styles.overallStatLabel}>Total Tracked</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.chartFootnote}>
                      {reportData.statusSectionSubtitle || '*Data derived strictly from live system records.'}
                    </Text>
                  </View>
                </View>

                {/* 5. Two Columns: Highlights & Documents */}
                <View style={styles.twoColGrid}>
                  {/* Left: Highlights */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="star" size={18} color="#16a34a" />
                      <Text style={styles.sectionTitle}>Execution Highlights</Text>
                    </View>
                    <View style={styles.highlightsList}>
                      {reportData.highlights.map((h, i) => (
                        <View key={i} style={styles.highlightRow}>
                          <View style={styles.checkCircle}>
                            <MaterialIcons name="check" size={11} color="#ffffff" />
                          </View>
                          <Text style={styles.highlightText}>{h}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Right: Documents */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="description" size={18} color="#16a34a" />
                      <Text style={styles.sectionTitle}>Attached & Generated Documents</Text>
                    </View>
                    <View style={styles.docList}>
                      {(reportData.documents || []).map((doc, idx) => (
                        <View key={idx} style={styles.docItem}>
                          <View style={styles.docLeft}>
                            <View
                              style={[
                                styles.docTypeBadge,
                                { backgroundColor: doc.type === 'pdf' ? '#ef4444' : '#16a34a' },
                              ]}
                            >
                              <Text style={styles.docTypeText}>{doc.type.toUpperCase()}</Text>
                            </View>
                            <View>
                              <Text style={styles.docName}>{doc.name}</Text>
                              <Text style={styles.docSize}>{doc.size}</Text>
                            </View>
                          </View>
                          <MaterialIcons name="file-download" size={18} color="#64748b" />
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* 6. Volunteer Photos Gallery (REAL PHOTOS ONLY) */}
                <View style={styles.photosSection}>
                  <View style={styles.photosHeader}>
                    <View style={styles.photosTitleRow}>
                      <MaterialIcons name="photo-camera" size={18} color="#14532d" />
                      <Text style={styles.photosTitle}>Photos from Verified Submissions</Text>
                    </View>
                    <View style={styles.viewAllBadge}>
                      <Text style={styles.viewAllText}>
                        Photos ({reportData.photos.length})
                      </Text>
                    </View>
                  </View>

                  {reportData.photos.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                      {reportData.photos.map((p, index) => (
                        <View key={index} style={styles.photoCard}>
                          <Image
                            source={{ uri: p.uri }}
                            style={styles.photoThumb}
                            resizeMode="cover"
                          />
                          <View style={styles.photoOverlay}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.photoDate}>{p.date}</Text>
                              <Text style={styles.photoVolunteer} numberOfLines={1}>
                                {p.volunteerName}
                              </Text>
                            </View>
                            {p.photoCount ? (
                              <View style={styles.photoCountPill}>
                                <Text style={styles.photoCountText}>{p.photoCount} photos</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyPhotosContainer}>
                      <MaterialIcons name="no-photography" size={24} color="#94a3b8" />
                      <Text style={styles.emptyPhotosText}>
                        No volunteer field photos uploaded in system records for this report.
                      </Text>
                    </View>
                  )}
                </View>

                {/* 7. Footer */}
                <View style={styles.sheetFooter}>
                  <View style={styles.footerContacts}>
                    <Text style={styles.footerContactText}>🌐 nvcfoundation-ph.org</Text>
                    <Text style={styles.footerContactText}>✉️ info@nvcfoundation-ph.org</Text>
                    <Text style={styles.footerContactText}>📞 (034) 703 6781</Text>
                  </View>
                  <Text style={styles.footerSlogan}>
                    <Text style={{ color: '#86efac' }}>LOVE DELIVERS.</Text> CHANGE HAPPENS.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* BOTTOM CONTROLS */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionDownloadBtn}
              onPress={handleDownload}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
              ) : (
                <MaterialIcons name="file-download" size={20} color="#ffffff" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.actionDownloadBtnText}>
                {isGenerating ? 'Compiling PDF...' : 'Download / Print PDF Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 24 : 10,
  },
  modalCard: {
    width: '100%',
    maxWidth: 1040,
    maxHeight: '94%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexWrap: 'wrap',
    gap: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cloverIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  topBarSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  viewToggleTextActive: {
    color: '#166534',
    fontWeight: '700',
  },
  downloadPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#166534',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },

  /* SCOPE SELECTOR STRIP */
  scopeStrip: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scopeStripLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  scopeScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: 220,
  },
  scopeChipActive: {
    backgroundColor: '#166534',
  },
  scopeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  scopeChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  previewScroll: {
    padding: 20,
    alignItems: 'center',
  },
  iframeWrapper: {
    width: '100%',
    maxWidth: 960,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },

  /* REPORT SHEET NATIVE DESIGN */
  reportSheet: {
    width: '100%',
    maxWidth: 960,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cloverBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#14532d',
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  reportCategoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  quarterBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  quarterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  sheetHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingBottom: 18,
    gap: 20,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#14532d',
    marginTop: 2,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  heroImage: {
    width: 200,
    height: 110,
    borderRadius: 14,
  },
  heroBrandPlaceholder: {
    width: 200,
    height: 110,
    borderRadius: 14,
    backgroundColor: '#14532d',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  heroBrandText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#86efac',
    textAlign: 'center',
  },
  heroBrandSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#dcfce7',
    textAlign: 'center',
    marginTop: 4,
  },

  /* 5 KPI CARDS */
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 28,
    paddingBottom: 16,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  kpiNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 2,
  },
  kpiDelta: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803d',
  },
  sectorsPreview: {
    gap: 2,
    marginVertical: 4,
  },
  sectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectorDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
  },
  sectorText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#475569',
  },
  sectorEmptyText: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
  },

  /* IMPACT & STATUS SECTION */
  impactBox: {
    paddingHorizontal: 28,
    paddingBottom: 16,
  },
  impactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  bannerBadge: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerDivider: {
    color: 'rgba(255,255,255,0.4)',
  },
  bannerSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#bbf7d0',
  },
  impactContent: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  chartGrid: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  statusBarsContainer: {
    flex: 1,
    gap: 8,
  },
  statusBarRow: {
    gap: 3,
  },
  statusBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusBarStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  statusBarCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  statusBarTrack: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  overallResultCard: {
    width: 170,
    backgroundColor: '#14532d',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  overallResultTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#86efac',
    textTransform: 'uppercase',
  },
  overallStatBlock: {
    flexDirection: 'column',
  },
  overallStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  overallStatLabel: {
    fontSize: 9,
    color: '#dcfce7',
    fontWeight: '500',
  },
  chartFootnote: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 6,
  },

  /* TWO COLUMNS */
  twoColGrid: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 28,
    paddingBottom: 16,
  },
  sectionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  highlightsList: {
    gap: 6,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  checkCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  highlightText: {
    flex: 1,
    fontSize: 10,
    color: '#334155',
    lineHeight: 14,
  },
  docList: {
    gap: 6,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docTypeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  docTypeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
  },
  docName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
  },
  docSize: {
    fontSize: 8,
    color: '#64748b',
  },

  /* PHOTOS SECTION */
  photosSection: {
    paddingHorizontal: 28,
    paddingBottom: 20,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  photosTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photosTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  viewAllBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803d',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoCard: {
    width: 140,
    height: 95,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  photoDate: {
    fontSize: 7,
    color: '#cbd5e1',
  },
  photoVolunteer: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  photoCountPill: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  photoCountText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyPhotosContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyPhotosText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },

  /* FOOTER */
  sheetFooter: {
    backgroundColor: '#14532d',
    paddingHorizontal: 28,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerContacts: {
    flexDirection: 'row',
    gap: 14,
  },
  footerContactText: {
    fontSize: 10,
    color: '#dcfce7',
    fontWeight: '500',
  },
  footerSlogan: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* BOTTOM BAR */
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  actionDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#166534',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  actionDownloadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
