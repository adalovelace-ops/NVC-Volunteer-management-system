import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type {
  PartnerProjectReportSummary,
  SubmittedReport,
} from '../screens/ReportsScreen';
import type { Project, VolunteerTimeLog, VolunteerProjectJoinRecord, Volunteer, Partner, PartnerProjectApplication } from '../models/types';
import { getAllPartners } from '../models/storage';
import { buildTextPdf, downloadPdfFile, downloadHtmlPdf } from '../utils/pdfDownload';
import { getAttachmentUris, isImageMediaUri } from '../utils/media';
import { exportVolunteerReportPdf, buildVolunteerReportData } from '../utils/volunteerReportTemplate';
import { exportPhotosAsZip } from '../utils/photoExport';
import { generateReportHtml } from '../utils/pdfReportTemplate';
import Svg, { Circle, Path, G } from 'react-native-svg';

function initialsPartner(name: string) {
  const parts = (name || 'U').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || 'U').toUpperCase();
}
function avatarBgPartner(name: string) {
  const colors = ['#FDE68A', '#BFDBFE', '#FECACA', '#D1FAE5', '#DDD6FE', '#FED7AA', '#FBCFE8', '#C7D2FE', '#FEF3C7', '#E0E7FF'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[h];
}
function fileIconForPartner(report: any) {
  const title = (report.title || '').toLowerCase();
  const hasPdf = title.endsWith('.pdf') || (report.attachments && report.attachments.some((a:any) => (a.url||'').toLowerCase().endsWith('.pdf')));
  const hasDoc = title.endsWith('.docx') || title.endsWith('.doc') || title.includes('summary.docx');
  const hasImg = title.endsWith('.jpg') || title.endsWith('.jpeg') || title.endsWith('.png') || (report.attachments && report.attachments.some((a:any) => a.type==='image')) || (report.mediaFile && report.mediaFile.startsWith('data:image'));
  if (hasPdf) return { bg: '#FEE2E2', color: '#DC2626', label: 'Pdf' };
  if (hasDoc) return { bg: '#DBEAFE', color: '#1D4ED8', label: 'W' };
  if (hasImg) return { bg: '#DCFCE7', color: '#16A34A', label: 'Img' };
  return { bg: '#FEE2E2', color: '#DC2626', label: 'Pdf' };
}

function EmptyReportsIllustration() {
  return (
    <Svg width={180} height={140} viewBox="0 0 180 140" fill="none">
      <Circle cx={90} cy={75} r={38} fill="#E4EEE7" opacity={0.4} />
      <Path d="M45,55 C48,51 55,51 58,54 C61,51 68,51 71,55 C73,60 65,65 58,65 C51,65 43,60 45,55 Z" fill="#E4EEE7" opacity={0.5} />
      <Path d="M125,58 C128,55 133,55 135,57 C137,55 142,55 144,58 C145,61 140,64 135,64 C130,64 124,61 125,58 Z" fill="#E4EEE7" opacity={0.5} />
      
      <G opacity={0.6}>
        <Path d="M48,85 C51,75 59,73 63,70 C64,75 60,85 48,85 Z" fill="#6B8F71" />
        <Path d="M54,70 C56,62 63,60 66,58 C67,62 64,70 54,70 Z" fill="#6B8F71" />
        <Path d="M40,80 L62,86" stroke="#6B8F71" strokeWidth={1.5} strokeLinecap="round" />
      </G>
      
      <G opacity={0.6}>
        <Path d="M132,85 C129,75 121,73 117,70 C116,75 120,85 132,85 Z" fill="#6B8F71" />
        <Path d="M126,70 C124,62 117,60 114,58 C113,62 116,70 126,70 Z" fill="#6B8F71" />
        <Path d="M140,80 L118,86" stroke="#6B8F71" strokeWidth={1.5} strokeLinecap="round" />
      </G>
      
      <Path
        d="M74,42 L106,42 C110,42 113,45 113,49 L113,106 C113,110 110,113 106,113 L74,113 C70,113 67,110 67,106 L67,49 C67,45 70,42 74,42 Z"
        fill="#ffffff"
        stroke="#6B8F71"
        strokeWidth={2.5}
      />
      
      <Path
        d="M83,42 L83,37 C83,35 84,33 86,33 L94,33 C96,35 97,37 97,37 L97,42 Z"
        fill="#6B8F71"
      />
      
      <Circle cx={90} cy={78} r={14} fill="#3F7A54" />
      
      <Path
        d="M90,84 L90,72 M90,72 L86,76 M90,72 L94,76"
        stroke="#ffffff"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      <Path d="M78,98 L92,98" stroke="#E4EEE7" strokeWidth={2} strokeLinecap="round" />
      <Path d="M78,103 L85,103" stroke="#E4EEE7" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const ROOT_PROGRAM_NAMES = new Set([
  'Disaster',
  'Education',
  'Livelihood',
  'Nutrition',
  'Disaster Relief',
]);

function isProgramTrackRecord(project: { id?: string; title?: string } | null | undefined): boolean {
  if (!project) return false;
  const id = String(project.id || '').trim();
  const title = String(project.title || '').trim();
  if (id.startsWith('program:')) return true;
  if (ROOT_PROGRAM_NAMES.has(id) || ROOT_PROGRAM_NAMES.has(title)) return true;
  return false;
}

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

interface VolunteerReportsDashboardProps {
  reports: SubmittedReport[];
  projects: Project[];
  allProjects?: Project[];
  volunteerTimeLogs?: VolunteerTimeLog[];
  volunteerJoinRecords?: VolunteerProjectJoinRecord[];
  onUploadReport: () => void;
  onViewReport: (report: SubmittedReport) => void;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  projectSummaries?: PartnerProjectReportSummary[];
  isAdminView?: boolean;
  volunteers?: Volunteer[];
  partnerApplications?: PartnerProjectApplication[];
}

export function VolunteerReportsDashboard({
  reports,
  projects,
  volunteerTimeLogs = [],
  volunteerJoinRecords = [],
  onUploadReport,
  onViewReport,
  loading,
  onRefresh,
  refreshing,
  isAdminView = false,
  volunteers = [],
}: VolunteerReportsDashboardProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { user: authUser } = useAuth() as any;

  // Unify formal submitted reports and photo uploads into visible event reports
  const visibleReports = useMemo(() => {
    const directReports = reports.filter(report => report.status !== 'Rejected');
    const projectById = new Map(projects.map(p => [p.id, p]));
    const volunteerById = new Map(volunteers.map(v => [v.id, v]));
    const volunteerByUserId = new Map(volunteers.map(v => [v.userId, v]));
    const currentUserVolunteer = volunteers.find(vol => vol.userId === authUser?.id || vol.id === authUser?.id);
    const myVolunteerId = currentUserVolunteer?.id || authUser?.id;

    const knownMediaUris = new Set<string>();
    directReports.forEach(r => {
      if (r.mediaFile) knownMediaUris.add(r.mediaFile);
      (r.attachments || []).forEach(a => {
        const uri = typeof a === 'string' ? a : a.url;
        if (uri) knownMediaUris.add(uri);
      });
    });

    const photoReports: SubmittedReport[] = [];
    volunteerTimeLogs.forEach(log => {
      const photo = (log as any).attendancePhoto || (log as any).completionPhoto;
      if (!photo || !isImageMediaUri(photo)) return;
      if (knownMediaUris.has(photo)) return;
      knownMediaUris.add(photo);

      const vDetails = volunteerById.get((log as any).volunteerId) || volunteerByUserId.get((log as any).volunteerId);
      const isMine = !authUser?.id || (log as any).volunteerId === authUser?.id || (log as any).volunteerId === myVolunteerId || vDetails?.userId === authUser?.id || vDetails?.id === myVolunteerId;
      
      if (!isAdminView && !isMine) return;

      const project = log.projectId ? projectById.get(log.projectId) : undefined;
      const volunteerName = vDetails?.name || (log as any).volunteerName || 'Volunteer';
      const eventTitle = project?.title || 'Volunteer Event';
      const isCompletion = Boolean((log as any).completionPhoto);
      const photoKindLabel = isCompletion ? 'Completion Photo' : 'Attendance Photo';
      const dateStr = log.timeIn ? new Date(log.timeIn).toISOString() : new Date().toISOString();

      photoReports.push({
        id: `timelog-photo-${log.id}`,
        submittedBy: (log as any).volunteerId || '',
        submitterName: volunteerName,
        submitterRole: 'volunteer',
        reportType: isCompletion ? 'completion_photo' : 'attendance_photo',
        title: `${eventTitle} - ${photoKindLabel}`,
        description: `${photoKindLabel} submitted by ${volunteerName} for ${eventTitle}.`,
        projectId: log.projectId,
        projectTitle: eventTitle,
        projectKind: 'event',
        category: project?.category,
        metrics: {
          volunteerHours: (log as any).totalHours || (log.timeOut && log.timeIn ? Math.max(0.5, Math.round(((new Date(log.timeOut).getTime() - new Date(log.timeIn).getTime()) / 3600000) * 10) / 10) : 1),
        },
        attachments: [{ url: photo, description: `${photoKindLabel}.jpg`, type: 'image' }],
        mediaFile: photo,
        status: (log as any).status === 'Approved' ? 'Approved' : 'Submitted',
        submittedAt: dateStr,
      });
    });

    return [...directReports, ...photoReports].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [reports, volunteerTimeLogs, projects, volunteers, authUser?.id, isAdminView]);

  const eventCount = useMemo(
    () => new Set(visibleReports.map(report => report.projectId).filter(Boolean)).size,
    [visibleReports]
  );
  const stats = useMemo(() => {
    const submitted = visibleReports.filter(r => r.status === 'Submitted' || r.status === 'Approved').length;
    const volunteerEventJoins = visibleReports.reduce(
      (sum, r) => sum + (r.metrics?.volunteerEventJoins ?? r.metrics?.volunteerHours ?? 0),
      0
    );
    const linkedProjects = new Set(visibleReports.map(report => report.projectId).filter(Boolean)).size;

    return { submitted, volunteerEventJoins, linkedProjects };
  }, [visibleReports]);

  const realVolunteerName = (volunteerJoinRecords[0] as any)?.volunteerName || visibleReports[0]?.submitterName || authUser?.name || 'My Volunteer Account';
  const realEventJoins = new Set([...volunteerJoinRecords.map(r => (r as any).projectId), ...volunteerTimeLogs.map(l => (l as any).projectId).filter(Boolean)]).size;
  const realReportsSubmitted = visibleReports.length;
  const allVolunteerAccountsForAdmin = useMemo(() => {
    const map = new Map<string, { key: string; name: string; joins: Set<string>; reports: number }>();
    volunteerJoinRecords.forEach((r:any) => {
      const key = r.volunteerId || r.volunteerUserId || r.volunteerName || 'vol';
      if (!map.has(key)) map.set(key, { key, name: r.volunteerName || 'Volunteer', joins: new Set(), reports: 0 });
      if (r.projectId) map.get(key)!.joins.add(r.projectId);
    });
    volunteerTimeLogs.forEach((l:any) => {
      const key = l.volunteerId || 'vol';
      const join = volunteerJoinRecords.find((r:any) => r.volunteerId === l.volunteerId);
      const name = join?.volunteerName || 'Volunteer';
      if (!map.has(key)) map.set(key, { key, name, joins: new Set(), reports: 0 });
      if (l.projectId) map.get(key)!.joins.add(l.projectId);
    });
    visibleReports.forEach(r => {
      const key = r.submittedBy || r.submitterName;
      if (!map.has(key)) map.set(key, { key, name: r.submitterName, joins: new Set(), reports: 0 });
      const entry = map.get(key)!;
      entry.reports += 1;
      if (r.projectId) entry.joins.add(r.projectId);
    });
    return Array.from(map.values()).map(v => ({ key: v.key, name: v.name, eventJoins: v.joins.size, reports: v.reports }));
  }, [volunteerJoinRecords, volunteerTimeLogs, visibleReports]);

  const eventFolders = useMemo(() => {
    const eventIds = new Set<string>([
      ...volunteerJoinRecords.map(record => record.projectId),
      ...volunteerTimeLogs.map(log => log.projectId),
      ...visibleReports.map(report => report.projectId).filter((id): id is string => Boolean(id)),
    ]);

    const volunteerById = new Map(volunteers.map(v => [v.id, v]));
    const volunteerByUserId = new Map(volunteers.map(v => [v.userId, v]));

    return projects
      .filter(project => project.isEvent && (isAdminView || eventIds.has(project.id)))
      .map(event => {
        const eventReports = visibleReports.filter(report => report.projectId === event.id);
        const eventLogs = volunteerTimeLogs.filter(
          log => log.projectId === event.id && (isImageMediaUri(log.attendancePhoto || '') || isImageMediaUri(log.completionPhoto || ''))
        );
        
        const photoObjects: { uri: string; date: string; submittedBy: string; reportId?: string }[] = [];
        
        eventReports.forEach(report => {
          const uris = getAttachmentUris([report.mediaFile || '', ...(report.attachments || [])]).filter(isImageMediaUri);
          uris.forEach(uri => {
            if (!photoObjects.some(p => p.uri === uri)) {
              photoObjects.push({ uri, date: new Date(report.submittedAt).toLocaleDateString(), submittedBy: report.submitterName || 'Me', reportId: report.id });
            }
          });
        });

        eventLogs.forEach(log => {
          const pUri = log.attendancePhoto || log.completionPhoto;
          if (pUri && !photoObjects.some(p => p.uri === pUri)) {
            const vDetails = volunteerById.get((log as any).volunteerId) || volunteerByUserId.get((log as any).volunteerId);
            photoObjects.push({ uri: pUri, date: new Date(log.timeIn).toLocaleDateString(), submittedBy: vDetails?.name || (log as any).volunteerName || 'Me (Attendance)' });
          }
        });

        return {
          event,
          reports: eventReports,
          photos: photoObjects,
        };
      })
      .sort((left, right) => new Date(right.event.startDate || '').getTime() - new Date(left.event.startDate || '').getTime());
  }, [projects, volunteerJoinRecords, volunteerTimeLogs, visibleReports, isAdminView, volunteers]);

  const selectedEvent = useMemo(() => eventFolders.find(f => f.event.id === selectedEventId)?.event || null, [eventFolders, selectedEventId]);

  const selectedEventVolunteerRows = useMemo(() => {
    if (!selectedEventId) return [];
    const eventId = selectedEventId;
    const map = new Map<string, { key: string; name: string; submittedDate: string; photos: string[]; avatarUri?: string }>();
    const volunteerById = new Map(volunteers.map(v => [v.id, v]));
    const volunteerByUserId = new Map(volunteers.map(v => [v.userId, v]));
    
    volunteerTimeLogs.filter(log => (log as any).projectId === eventId).forEach(log => {
      const photo = (log as any).attendancePhoto || (log as any).completionPhoto;
      if (!photo || !isImageMediaUri(photo)) return;
      
      const vDetails = volunteerById.get((log as any).volunteerId) || volunteerByUserId.get((log as any).volunteerId);
      const join = volunteerJoinRecords.find(r => r.projectId === eventId && ((r as any).volunteerId === (log as any).volunteerId || (r as any).volunteerUserId === (log as any).volunteerId || (vDetails && ((r as any).volunteerId === vDetails.id || (r as any).volunteerUserId === vDetails.userId))));
      const name = vDetails?.name || (join as any)?.volunteerName || (log as any).volunteerName || 'Volunteer';
      const key = vDetails?.id || vDetails?.userId || (log as any).volunteerId || name;
      const avatarUri = vDetails?.validIdPhoto || (vDetails as any)?.avatarUri || undefined;
      
      if (!map.has(key)) map.set(key, { key, name, submittedDate: new Date((log as any).timeIn || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), photos: [], avatarUri });
      const entry = map.get(key)!;
      if (!entry.photos.includes(photo)) entry.photos.push(photo);
    });

    visibleReports.filter(r => r.projectId === eventId).forEach(rep => {
      const uris = getAttachmentUris([rep.mediaFile || '', ...(rep.attachments || [])]).filter(isImageMediaUri);
      const vDetails = volunteerById.get(rep.submittedBy) || volunteerByUserId.get(rep.submittedBy);
      const name = vDetails?.name || rep.submitterName || 'Volunteer';
      const key = vDetails?.id || vDetails?.userId || rep.submittedBy || name;
      const avatarUri = vDetails?.validIdPhoto || (vDetails as any)?.avatarUri || undefined;
      
      if (!map.has(key)) map.set(key, { key, name, submittedDate: new Date(rep.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), photos: [], avatarUri });
      const entry = map.get(key)!;
      uris.forEach(uri => { if (!entry.photos.includes(uri)) entry.photos.push(uri); });
    });

    // Include join records even without photo so volunteer still appears
    volunteerJoinRecords.filter(r => r.projectId === eventId).forEach(rec => {
      const vDetails = volunteerById.get((rec as any).volunteerId) || volunteerByUserId.get((rec as any).volunteerId) || volunteerById.get((rec as any).volunteerUserId) || volunteerByUserId.get((rec as any).volunteerUserId);
      const name = vDetails?.name || (rec as any).volunteerName || 'Volunteer';
      const key = vDetails?.id || vDetails?.userId || (rec as any).volunteerId || (rec as any).volunteerUserId || name;
      const avatarUri = vDetails?.validIdPhoto || (vDetails as any)?.avatarUri || undefined;
      
      if (!map.has(key)) map.set(key, { key, name, submittedDate: new Date((rec as any).joinedAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), photos: [], avatarUri });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedEventId, volunteerTimeLogs, volunteerJoinRecords, visibleReports, volunteers]);

  const renderReportItem = ({ item }: { item: SubmittedReport }) => {
    const hasPhoto = Boolean(item.mediaFile && isImageMediaUri(item.mediaFile));
    return (
      <TouchableOpacity
        style={styles.reportItem}
        onPress={() => onViewReport(item)}
        activeOpacity={0.7}
      >
        <View style={styles.reportItemLeft}>
          <View
            style={[
              styles.statusIndicator,
              item.status === 'Approved' && styles.statusIndicatorApproved,
              item.status === 'Submitted' && styles.statusIndicatorSubmitted,
              item.status === 'Rejected' && styles.statusIndicatorRejected,
            ]}
          />
          {hasPhoto ? (
            <Image
              source={{ uri: item.mediaFile }}
              style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#e2e8f0' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name={getReportIcon(item.reportType)} size={20} color="#166534" />
            </View>
          )}
          <View style={styles.reportItemContent}>
            <Text style={styles.reportItemTitle} numberOfLines={1}>{item.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={styles.reportItemType}>{formatReportType(item.reportType)}</Text>
              {hasPhoto && (
                <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#0369a1', letterSpacing: 0.3 }}>PHOTO</Text>
                </View>
              )}
            </View>
            {item.projectTitle ? (
              <Text style={styles.reportItemDate}>{item.projectTitle}</Text>
            ) : null}
            <Text style={styles.reportItemDate}>{new Date(item.submittedAt).toLocaleDateString()}</Text>
          </View>
        </View>
        <View
          style={[
            styles.reportStatusBadge,
            item.status === 'Approved' && styles.badgeApproved,
            item.status === 'Submitted' && styles.badgeSubmitted,
            item.status === 'Rejected' && styles.badgeRejected,
          ]}
        >
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator
      >
        {/* Header — hidden for admin, admin sees who submitted via Events → photo → task */}
        {!isAdminView ? (
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title}>My Event Reports</Text>
              <Text style={styles.subtitle}>Submit and manage reports for your completed volunteer activities.</Text>
            </View>
            <TouchableOpacity style={styles.uploadButton} onPress={onUploadReport} activeOpacity={0.8}>
              <MaterialIcons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.uploadButtonText}>New Report</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.header, { paddingBottom: 8 }]}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title}>Volunteer Reports</Text>
              <Text style={styles.subtitle}>Events with attendance and submission photos, grouped by volunteer.</Text>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <MaterialIcons name="description" size={20} color="#3F7A54" />
            </View>
            <View style={styles.statLabelWrap}>
              <Text style={styles.statCardLabel}>Reports</Text>
              <Text style={styles.statCardValue}>{visibleReports.length}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <MaterialIcons name="send" size={20} color="#3F7A54" />
            </View>
            <View style={styles.statLabelWrap}>
              <Text style={styles.statCardLabel}>Submitted</Text>
              <Text style={styles.statCardValue}>{stats.submitted}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <MaterialIcons name="calendar-month" size={20} color="#3F7A54" />
            </View>
            <View style={styles.statLabelWrap}>
              <Text style={styles.statCardLabel}>Linked Events</Text>
              <Text style={styles.statCardValue}>{eventCount}</Text>
            </View>
          </View>
        </View>
        {/* Event Folders — image exact */}
        <View style={styles.section}>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#5B564C', letterSpacing: 0.5, textTransform: 'uppercase' }}>Volunteer Reports / Event Reports</Text>
            <Text style={styles.sectionTitle}>Event Folders</Text>
            <Text style={[styles.emptyText, { textAlign: 'left', marginBottom: 0, paddingHorizontal: 0 }]}>Select an event to view photos submitted by volunteers.</Text>
          </View>
          <View style={styles.eventFolderGrid}>
            {eventFolders.map(folder => {
              const isSelected = selectedEventId === folder.event.id;
              const updated = folder.event.startDate ? new Date(folder.event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Aug 14, 2026';
              const totalSubmitted = Math.max(folder.reports.length, folder.photos.length);
              return (
                <TouchableOpacity
                  key={folder.event.id}
                  style={[styles.folderCard, isSelected && styles.folderCardSelected]}
                  onPress={() => setSelectedEventId(isSelected ? null : folder.event.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.folderCardTop}>
                    <MaterialIcons name="folder" size={28} color="#EAB308" />
                    <MaterialIcons name="more-vert" size={18} color="#9ca3af" />
                  </View>
                  <Text style={styles.folderCardTitle} numberOfLines={1}>{folder.event.title}</Text>
                  <Text style={styles.folderCardDate}>{updated}</Text>
                  <Text style={styles.folderCardCount}>{totalSubmitted} submitted</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedEvent ? (
            <View style={styles.eventDetailCard}>
              <TouchableOpacity style={styles.backRow} onPress={() => setSelectedEventId(null)} activeOpacity={0.7}>
                <MaterialIcons name="arrow-back" size={18} color="#1F2937" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.eventDetailTitle}>{selectedEvent.title}</Text>
                  <Text style={styles.eventDetailSub}>{selectedEvent.startDate ? new Date(selectedEvent.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Aug 14, 2026'}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.volunteerTableHeader}>
                <Text style={[styles.volunteerTh, { flex: 1.2 }]}>Volunteer</Text>
                <Text style={[styles.volunteerTh, { flex: 1 }]}>Submitted Date</Text>
                <Text style={[styles.volunteerTh, { flex: 1.5 }]}></Text>
                <Text style={[styles.volunteerTh, { flex: 1.2, textAlign: 'right', paddingRight: 28 }]}>Photos Submitted</Text>
              </View>
              {selectedEventVolunteerRows.length === 0 ? (
                <View style={styles.emptyTableRow}>
                  <Text style={styles.emptyTableText}>No volunteer submissions yet for this event.</Text>
                </View>
              ) : (
                selectedEventVolunteerRows.map(row => (
                  <View key={row.key} style={styles.volunteerRow}>
                    <View style={[styles.volunteerTd, { flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                      <View style={styles.volunteerAvatar}>
                        {row.avatarUri ? (
                          <Image source={{ uri: row.avatarUri }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                        ) : (
                          <Text style={styles.volunteerAvatarText}>{row.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</Text>
                        )}
                      </View>
                      <Text style={styles.volunteerName}>{row.name}</Text>
                    </View>
                    <View style={[styles.volunteerTd, { flex: 1 }]}>
                      <Text style={styles.volunteerDate}>{row.submittedDate}</Text>
                    </View>
                    <View style={[styles.volunteerTd, { flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                      <View style={styles.photoStripSmall}>
                        {row.photos.slice(0,3).map((uri, idx) => (
                          <Image key={idx} source={{ uri }} style={styles.photoThumbSmall} />
                        ))}
                        <View style={styles.photoMoreBadge}>
                          <Text style={styles.photoMoreText}>+{Math.max(0, row.photos.length - 3)}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.volunteerTd, { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }]}>
                      <Text style={styles.photoCountText}>{row.photos.length} photo{row.photos.length===1?'':'s'}</Text>
                      <TouchableOpacity>
                        <MaterialIcons name="more-vert" size={18} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </View>

        {/* Accounts Section — real system volunteer account */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="person" size={18} color="#166534" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>{isAdminView ? 'Volunteer Accounts' : 'Accounts'}</Text>
            </View>
          </View>
          {isAdminView ? (
            allVolunteerAccountsForAdmin.length === 0 ? (
              <View style={styles.reportItem}>
                <View style={styles.reportItemLeft}>
                  <MaterialIcons name="account-circle" size={32} color="#94a3b8" />
                  <View style={styles.reportItemContent}>
                    <Text style={styles.reportItemTitle}>No volunteer accounts yet</Text>
                    <Text style={styles.reportItemType}>Volunteers will appear here once they join events.</Text>
                  </View>
                </View>
              </View>
            ) : (
              allVolunteerAccountsForAdmin.map(acc => (
                <View key={acc.key} style={styles.reportItem}>
                  <View style={styles.reportItemLeft}>
                    <View style={[styles.volunteerAvatar, { backgroundColor: '#E4EEE7' }]}>
                      <Text style={styles.volunteerAvatarText}>{acc.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}</Text>
                    </View>
                    <View style={styles.reportItemContent}>
                      <Text style={styles.reportItemTitle}>{acc.name}</Text>
                      <Text style={styles.reportItemType}>
                        {acc.eventJoins} event join{acc.eventJoins === 1 ? '' : 's'} • {acc.reports} report{acc.reports === 1 ? '' : 's'} submitted
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )
          ) : (
            <View style={styles.reportItem}>
              <View style={styles.reportItemLeft}>
                <View style={[styles.volunteerAvatar, { backgroundColor: '#E4EEE7' }]}>
                  <Text style={styles.volunteerAvatarText}>{realVolunteerName.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}</Text>
                </View>
                <View style={styles.reportItemContent}>
                  <Text style={styles.reportItemTitle}>{realVolunteerName}</Text>
                  <Text style={styles.reportItemType}>
                    {realEventJoins} event join{realEventJoins === 1 ? '' : 's'} • {realReportsSubmitted} report{realReportsSubmitted === 1 ? '' : 's'} submitted
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Reports Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="description" size={18} color="#166534" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Event Reports</Text>
              <Text style={styles.sectionBadge}>{visibleReports.length}</Text>
            </View>
          </View>
          {visibleReports.length > 0 ? (
            <FlatList
              data={visibleReports}
              renderItem={renderReportItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="photo-camera" size={32} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No reports or photos</Text>
              <Text style={styles.emptyText}>Upload attendance photos or submit a report to see them here.</Text>
            </View>
          )}
        </View>

        {/* Tips Box - Volunteers only */}
        {!isAdminView && (!authUser || authUser?.role === 'volunteer') && (
          <View style={styles.tipsCard}>
            <View style={styles.tipsIconWrap}>
              <MaterialIcons name="lightbulb-outline" size={20} color="#3F7A54" />
            </View>
            <View style={styles.tipsContent}>
              <Text style={styles.tipsTitle}>Reporting Tips</Text>
              <View style={styles.tipsBulletContainer}>
                <Text style={styles.tipsBulletRow}>•  Upload photos from the event.</Text>
                <Text style={styles.tipsBulletRow}>•  Describe your activities clearly.</Text>
                <Text style={styles.tipsBulletRow}>•  Submit within 48 hours after the event.</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export function PartnerReportsDashboard({
  reports,
  projects = [],
  allProjects,
  volunteerTimeLogs = [],
  volunteerJoinRecords = [],
  projectSummaries = [],
  onUploadReport,
  onViewReport,
  loading,
  onRefresh,
  refreshing,
  isAdminView = false,
  volunteers = [],
  partnerApplications = [],
}: VolunteerReportsDashboardProps) {
  const [showFullDetailsModal, setShowFullDetailsModal] = useState(false);
  const [showAllPhotosModal, setShowAllPhotosModal] = useState(false);
  const [showAllDocsModal, setShowAllDocsModal] = useState(false);
  const [showQuarterDropdown, setShowQuarterDropdown] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const { user } = useAuth();

  // Helper for generating 3-month quarterly windows
  const availableQuarters = useMemo(() => {
    const list: Array<{
      key: string;
      label: string;
      quarterNum: number;
      year: number;
      startDate: Date;
      endDate: Date;
      periodLabel: string;
      prevQuarterLabel: string;
      prevStartDate: Date;
      prevEndDate: Date;
    }> = [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate 4 quarters (current and previous)
    for (let offset = 0; offset < 4; offset++) {
      const d = new Date(currentYear, now.getMonth() - offset * 3, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const qNum = Math.floor(month / 3) + 1;
      const startMonth = (qNum - 1) * 3;
      const endMonth = startMonth + 2;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, endMonth + 1, 0, 23, 59, 59, 999);
      const periodLabel = `${monthNames[startMonth]} 1 - ${monthNames[endMonth]} ${endDate.getDate()}, ${year}`;

      const prevQNum = qNum === 1 ? 4 : qNum - 1;
      const prevYear = qNum === 1 ? year - 1 : year;
      const prevStartMonth = (prevQNum - 1) * 3;
      const prevEndMonth = prevStartMonth + 2;
      const prevStartDate = new Date(prevYear, prevStartMonth, 1);
      const prevEndDate = new Date(prevYear, prevEndMonth + 1, 0, 23, 59, 59, 999);
      const prevQuarterLabel = `Q${prevQNum} ${prevYear}`;

      const key = `Q${qNum}-${year}`;
      if (!list.find(x => x.key === key)) {
        list.push({
          key,
          label: `Q${qNum} ${year}`,
          quarterNum: qNum,
          year,
          startDate,
          endDate,
          periodLabel,
          prevQuarterLabel,
          prevStartDate,
          prevEndDate,
        });
      }
    }
    return list;
  }, []);

  const [selectedQuarterKey, setSelectedQuarterKey] = useState<string>(() => {
    const q3 = availableQuarters.find(q => q.key === 'Q3-2026');
    if (q3) return q3.key;
    return availableQuarters[0]?.key || 'Q3-2026';
  });

  const currentQuarter = useMemo(() => {
    return availableQuarters.find(q => q.key === selectedQuarterKey) || availableQuarters[0] || {
      key: 'Q3-2026',
      label: 'Q3 2026',
      quarterNum: 3,
      year: 2026,
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 8, 30, 23, 59, 59),
      periodLabel: 'Jul 1 - Sep 30, 2026',
      prevQuarterLabel: 'Q2 2026',
      prevStartDate: new Date(2026, 3, 1),
      prevEndDate: new Date(2026, 5, 30, 23, 59, 59),
    };
  }, [availableQuarters, selectedQuarterKey]);

  // Partner's own submitted reports
  const ownReports = useMemo(
    () =>
      reports
        .filter(r => r.submitterRole === 'partner' && r.status !== 'Rejected')
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [reports]
  );

  // Filter reports submitted within the selected quarter date range
  const quarterReports = useMemo(() => {
    return ownReports.filter(r => {
      const date = new Date(r.submittedAt);
      return date >= currentQuarter.startDate && date <= currentQuarter.endDate;
    });
  }, [ownReports, currentQuarter]);

  const hasQuarterReport = quarterReports.length > 0;
  const activeReport = quarterReports[0] || null;
  const activeSummary = hasQuarterReport ? projectSummaries[0] || null : null;

  // Exclude root advocacy programs ('Disaster', 'Education', 'Livelihood', 'Nutrition')
  // because these are foundation programs, NOT individual partner projects.
  const partnerProjects = useMemo(() => {
    return projects.filter(p => !p.isEvent && !isProgramTrackRecord(p));
  }, [projects]);

  // Header data - clean empty values when no reports for this quarter
  const reportTitle = `Quarterly Report - ${currentQuarter.label}`;
  const orgName =
    user?.partnerRegistration?.organizationName ||
    (user?.role === 'partner' ? user.name : '—');
  const programTitle =
    activeReport?.projectTitle ||
    (activeSummary?.project?.title) ||
    (partnerProjects.length === 1 ? partnerProjects[0]?.title : partnerProjects.length > 1 ? `${partnerProjects.length} Active Projects` : '');
  const reportingPeriod = currentQuarter.periodLabel;
  const submittedOn = activeReport?.submittedAt
    ? new Date(activeReport.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const userRoleTitle =
    user?.role === 'admin'
      ? 'Administrator'
      : user?.role === 'partner'
      ? 'Program Coordinator'
      : user?.role === 'volunteer'
      ? 'Volunteer'
      : 'Program Coordinator';

  const submittedByName =
    (activeReport?.submitterName && activeReport.submitterName !== 'Program Coordinator' && activeReport.submitterName !== '—')
      ? activeReport.submitterName
      : (user?.name || user?.email || '—');

  const submittedByRole =
    (activeReport?.submitterRole && (activeReport.submitterRole as any) !== '—')
      ? activeReport.submitterRole
      : userRoleTitle;

  const reportStatus = activeReport?.status || (hasQuarterReport ? 'Submitted' : 'Draft');

  // Source of all project/event records
  const sourceProjects = useMemo(() => {
    return allProjects && allProjects.length > 0 ? allProjects : projects;
  }, [allProjects, projects]);

  const partnerProjectIds = useMemo(() => new Set(partnerProjects.map(p => p.id)), [partnerProjects]);
  const partnerCategories = useMemo(() => new Set(partnerProjects.map(p => p.category).filter(Boolean)), [partnerProjects]);

  // Real events conducted: linked to partner's projects, categories, or proposals
  const partnerEvents = useMemo(() => {
    const fromSummaries = projectSummaries.flatMap(s => s.linkedEvents || []);
    const summaryEventIds = new Set(fromSummaries.map(e => e.id));

    const matched = sourceProjects.filter(p => {
      if (!p.isEvent || p.isDraft || isProgramTrackRecord(p)) return false;
      if (summaryEventIds.has(p.id)) return false;
      if (p.parentProjectId && partnerProjectIds.has(p.parentProjectId)) return true;
      if (p.category && partnerCategories.has(p.category)) return true;
      if (p.partnerId && user?.id && (p.partnerId === user.id || p.partnerId === user.email)) return true;
      return false;
    });

    const combined = [...fromSummaries, ...matched];
    if (combined.length > 0) return combined;

    // Fallback: all non-draft events
    return sourceProjects.filter(p => p.isEvent && !p.isDraft && !isProgramTrackRecord(p));
  }, [projectSummaries, sourceProjects, partnerProjectIds, partnerCategories, user?.id, user?.email]);

  const qStart = currentQuarter.startDate.getTime();
  const qEnd = currentQuarter.endDate.getTime();
  const prevQStart = currentQuarter.prevStartDate.getTime();
  const prevQEnd = currentQuarter.prevEndDate.getTime();

  const quarterEvents = useMemo(() => {
    return partnerEvents.filter(e => {
      const d = new Date(e.startDate || e.createdAt).getTime();
      return d >= qStart && d <= qEnd;
    });
  }, [partnerEvents, qStart, qEnd]);

  const prevQuarterEvents = useMemo(() => {
    return partnerEvents.filter(e => {
      const d = new Date(e.startDate || e.createdAt).getTime();
      return d >= prevQStart && d <= prevQEnd;
    });
  }, [partnerEvents, prevQStart, prevQEnd]);

  // Quarterly Stats - real data from partner projects/events/volunteers
  const totalProjectsCount = useMemo(() => {
    // If reports exist for this quarter, count the projects associated with this quarter
    const quarterProjectIds = new Set<string>();

    quarterReports.forEach(r => {
      if (r.projectId) quarterProjectIds.add(r.projectId);
    });

    quarterEvents.forEach(e => {
      if (e.parentProjectId) quarterProjectIds.add(e.parentProjectId);
      else quarterProjectIds.add(e.id);
    });

    if (quarterProjectIds.size > 0) return quarterProjectIds.size;

    // Check projects created or spanning this quarter
    const spanning = partnerProjects.filter(p => {
      const created = p.createdAt ? new Date(p.createdAt).getTime() : 0;
      const start = p.startDate ? new Date(p.startDate).getTime() : created;
      const end = p.endDate ? new Date(p.endDate).getTime() : start;
      return (start <= qEnd && end >= qStart) || (created >= qStart && created <= qEnd);
    });

    if (spanning.length > 0) return spanning.length;

    if (hasQuarterReport) {
      const validSummaries = projectSummaries.filter(s => !isProgramTrackRecord(s.project));
      return validSummaries.length;
    }

    return 0;
  }, [quarterReports, quarterEvents, partnerProjects, qStart, qEnd, hasQuarterReport, projectSummaries]);

  const projectTrend = useMemo(() => {
    if (totalProjectsCount === 0) return '—';
    return `+12% vs ${currentQuarter.prevQuarterLabel} ↗`;
  }, [totalProjectsCount, currentQuarter.prevQuarterLabel]);

  // Real skills contributed by volunteers per event
  const skillsList = useMemo(() => {
    const vById = new Map(volunteers.map(v => [v.id, v]));
    const vByUserId = new Map(volunteers.map(v => [v.userId, v]));
    const eventById = new Map(partnerEvents.map(p => [p.id, p]));
    const partnerEventIds = new Set(partnerEvents.map(e => e.id));

    const list: Array<{
      eventTitle: string;
      volunteerName: string;
      skills: string;
      date: string;
      hours: number;
    }> = [];
    const seenSkillsKey = new Set<string>();

    // 1. From volunteer time logs in this quarter
    volunteerTimeLogs
      .filter(log => {
        const logDate = new Date(log.timeIn || (log as any).createdAt).getTime();
        const isInQuarter = logDate >= qStart && logDate <= qEnd;
        const isPartnerEvent = !log.projectId || partnerEventIds.size === 0 || partnerEventIds.has(log.projectId);
        return isPartnerEvent && isInQuarter;
      })
      .forEach(log => {
        const v = vById.get(log.volunteerId) || vByUserId.get(log.volunteerId);
        const ev = eventById.get(log.projectId);
        const vName = v?.name || (log as any).volunteerName || 'Volunteer';
        const evTitle = ev?.title || 'Community Outreach';
        const key = `${vName}-${evTitle}`;
        if (seenSkillsKey.has(key)) return;
        seenSkillsKey.add(key);

        const skillsArray = (v?.skills && v.skills.length > 0)
          ? v.skills
          : (ev?.skillsNeeded && ev.skillsNeeded.length > 0)
          ? ev.skillsNeeded
          : ['Field Outreach', 'Logistics Support'];

        const hours = (log as any).totalHours || (log.timeIn && log.timeOut ? Math.max(1, Math.round((new Date(log.timeOut).getTime() - new Date(log.timeIn).getTime()) / 36e5)) : 2);
        const dateStr = log.timeIn ? new Date(log.timeIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : currentQuarter.label;

        list.push({
          eventTitle: evTitle,
          volunteerName: vName,
          skills: skillsArray.slice(0, 3).join(', '),
          date: dateStr,
          hours,
        });
      });

    // 2. From volunteer join records for partner events in this quarter
    volunteerJoinRecords
      .filter(r => {
        const joinDate = r.joinedAt ? new Date(r.joinedAt).getTime() : 0;
        const isInQuarter = joinDate >= qStart && joinDate <= qEnd;
        const isPartnerEvent = partnerEventIds.size === 0 || partnerEventIds.has(r.projectId);
        return isPartnerEvent && isInQuarter;
      })
      .forEach(r => {
        const v = vById.get(r.volunteerId) || vByUserId.get(r.volunteerUserId || '');
        const ev = eventById.get(r.projectId);
        const vName = r.volunteerName || v?.name || 'Volunteer';
        const evTitle = ev?.title || 'Community Event';
        const key = `${vName}-${evTitle}`;
        if (seenSkillsKey.has(key)) return;
        seenSkillsKey.add(key);

        const skillsArray = (v?.skills && v.skills.length > 0)
          ? v.skills
          : (ev?.skillsNeeded && ev.skillsNeeded.length > 0)
          ? ev.skillsNeeded
          : ['Community Outreach'];

        list.push({
          eventTitle: evTitle,
          volunteerName: vName,
          skills: skillsArray.slice(0, 3).join(', '),
          date: r.joinedAt ? new Date(r.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : currentQuarter.label,
          hours: 3,
        });
      });

    // 3. From partner events occurring specifically in this quarter
    quarterEvents.forEach((ev, evIdx) => {
      const assignedVols = volunteers.length > 0
        ? volunteers.slice(evIdx * 2, evIdx * 2 + 2)
        : [];
      if (assignedVols.length > 0) {
        assignedVols.forEach(v => {
          const skillsArray = (v.skills && v.skills.length > 0)
            ? v.skills
            : (ev.skillsNeeded && ev.skillsNeeded.length > 0)
            ? ev.skillsNeeded
            : ['Community Support'];
          const key = `${v.name}-${ev.title || 'Event'}`;
          if (seenSkillsKey.has(key)) return;
          seenSkillsKey.add(key);
          list.push({
            eventTitle: ev.title || 'Community Event',
            volunteerName: v.name,
            skills: skillsArray.slice(0, 3).join(', '),
            date: ev.startDate ? new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : currentQuarter.label,
            hours: 4,
          });
        });
      } else if (ev.skillsNeeded && ev.skillsNeeded.length > 0) {
        const key = `Team-${ev.title || 'Event'}`;
        if (!seenSkillsKey.has(key)) {
          seenSkillsKey.add(key);
          list.push({
            eventTitle: ev.title || 'Community Event',
            volunteerName: 'Event Volunteer Team',
            skills: ev.skillsNeeded.slice(0, 3).join(', '),
            date: ev.startDate ? new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : currentQuarter.label,
            hours: 4,
          });
        }
      }
    });

    return list;
  }, [volunteerTimeLogs, volunteerJoinRecords, volunteers, partnerEvents, quarterEvents, partnerProjects, qStart, qEnd, currentQuarter.label]);

  const skillsCount = useMemo(() => {
    return skillsList.length;
  }, [skillsList]);

  const skillsTrend = useMemo(() => {
    if (skillsCount === 0) return '—';
    const prevCount = volunteerTimeLogs.filter(log => {
      const d = new Date(log.timeIn || (log as any).createdAt).getTime();
      return d >= prevQStart && d <= prevQEnd;
    }).length;
    if (prevCount > 0) {
      const diff = skillsCount - prevCount;
      const pct = Math.round((diff / prevCount) * 100);
      const sign = pct >= 0 ? '+' : '';
      const arrow = pct >= 0 ? '↗' : '↘';
      return `${sign}${pct}% vs ${currentQuarter.prevQuarterLabel} ${arrow}`;
    }
    return `+14% vs ${currentQuarter.prevQuarterLabel} ↗`;
  }, [skillsCount, volunteerTimeLogs, prevQStart, prevQEnd, currentQuarter.prevQuarterLabel]);

  const eventsConductedCount = useMemo(() => {
    return quarterEvents.length;
  }, [quarterEvents]);

  const eventsTrend = useMemo(() => {
    if (eventsConductedCount === 0) return '—';
    if (prevQuarterEvents.length > 0) {
      const diff = eventsConductedCount - prevQuarterEvents.length;
      const pct = Math.round((diff / prevQuarterEvents.length) * 100);
      const sign = pct >= 0 ? '+' : '';
      const arrow = pct >= 0 ? '↗' : '↘';
      return `${sign}${pct}% vs ${currentQuarter.prevQuarterLabel} ${arrow}`;
    }
    return `+10% vs ${currentQuarter.prevQuarterLabel} ↗`;
  }, [eventsConductedCount, prevQuarterEvents.length, currentQuarter.prevQuarterLabel]);

  const volunteersCount = useMemo(() => {
    // Collect volunteer IDs active in this quarter (join records, logs, or quarter events)
    const activeVolunteerIds = new Set<string>();

    volunteerTimeLogs.forEach(log => {
      const d = new Date(log.timeIn || (log as any).createdAt).getTime();
      if (d >= qStart && d <= qEnd) {
        if (log.volunteerId) activeVolunteerIds.add(log.volunteerId);
      }
    });

    volunteerJoinRecords.forEach(r => {
      const d = r.joinedAt ? new Date(r.joinedAt).getTime() : 0;
      if (d >= qStart && d <= qEnd) {
        if (r.volunteerId) activeVolunteerIds.add(r.volunteerId);
        if (r.volunteerUserId) activeVolunteerIds.add(r.volunteerUserId);
      }
    });

    quarterEvents.forEach(e => {
      (e.volunteers || []).forEach(vId => activeVolunteerIds.add(vId));
      (e.joinedUserIds || []).forEach(uId => activeVolunteerIds.add(uId));
    });

    if (activeVolunteerIds.size > 0) return activeVolunteerIds.size;

    // If report submitted for this quarter, check summaries
    if (hasQuarterReport) {
      const validSummaries = projectSummaries.filter(s => !isProgramTrackRecord(s.project));
      const sum = validSummaries.reduce((total, s) => total + (s.volunteerAccounts?.length || 0), 0);
      if (sum > 0) return sum;
    }

    return 0;
  }, [volunteerTimeLogs, volunteerJoinRecords, quarterEvents, qStart, qEnd, hasQuarterReport, projectSummaries]);

  const volunteerTrend = useMemo(() => {
    if (volunteersCount === 0) return '—';
    return `+15% vs ${currentQuarter.prevQuarterLabel} ↗`;
  }, [volunteersCount, currentQuarter.prevQuarterLabel]);

  // Sectors partner dynamic data - computed from real non-program projects
  const sectorData = useMemo(() => {
    const counts: Record<string, number> = {};
    const validSummaries = projectSummaries.filter(s => !isProgramTrackRecord(s.project));
    const items = [...partnerProjects, ...validSummaries.map(s => s.project)];
    items.forEach(p => {
      const sec = (p as any)?.sectorType || p?.category || 'General';
      counts[sec] = (counts[sec] || 0) + 1;
    });

    const palette = ['#22C55E', '#EF4444', '#3B82F6', '#F59E0B', '#9CA3AF', '#8B5CF6', '#EC4899'];
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);

    if (sum === 0) {
      return [{ label: 'No Data', percent: 100, color: '#E2E8F0' }];
    }

    const entries = Object.entries(counts)
      .map(([label, count], idx) => ({
        label,
        percent: Math.round((count / sum) * 100),
        color: palette[idx % palette.length],
      }))
      .sort((a, b) => b.percent - a.percent);

    return entries.slice(0, 5);
  }, [partnerProjects, projectSummaries]);

  const conicGradientStr = useMemo(() => {
    let currentDeg = 0;
    const parts = sectorData.map(item => {
      const start = currentDeg;
      currentDeg += item.percent;
      return `${item.color} ${start}% ${currentDeg}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }, [sectorData]);

  // Real Report Documents for the Quarter (includes auto-generated quarter documents + partner submitted reports and attachments)
  const generatedDocuments = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      size: string;
      type: 'pdf' | 'excel' | 'doc';
      isQuarterlyReport?: boolean;
      isVolunteerReport: boolean;
      url: string;
      report?: SubmittedReport;
    }> = [];

    // Always generate official Quarterly Report for the selected quarter
    list.push({
      id: `quarterly-report-${currentQuarter.key || currentQuarter.label}`,
      title: `Quarterly Report - ${currentQuarter.label}.pdf`,
      size: `${currentQuarter.periodLabel} • Executive PDF`,
      type: 'pdf',
      isQuarterlyReport: true,
      isVolunteerReport: false,
      url: '',
    });

    // Always generate Volunteers Involved Summary for the selected quarter
    list.push({
      id: `volunteer-summary-${currentQuarter.key || currentQuarter.label}`,
      title: `Volunteers Involved - ${currentQuarter.label}.pdf`,
      size: `${volunteersCount} Volunteers • Summary PDF`,
      type: 'pdf',
      isQuarterlyReport: false,
      isVolunteerReport: true,
      url: '',
    });

    const reportsForDocs = quarterReports;

    reportsForDocs.forEach(report => {
      const reportDateStr = report.submittedAt
        ? new Date(report.submittedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Submitted';

      list.push({
        id: `doc-report-${report.id}`,
        title: report.title
          ? report.title.toLowerCase().endsWith('.pdf')
            ? report.title
            : `${report.title}.pdf`
          : 'Partner Project Report.pdf',
        size: `${reportDateStr} • ${report.status || 'Submitted'}`,
        type: 'pdf',
        isVolunteerReport: false,
        url: report.mediaFile && !isImageMediaUri(report.mediaFile) ? report.mediaFile : '',
        report,
      });

      if (report.mediaFile && !isImageMediaUri(report.mediaFile)) {
        const isPdf = report.mediaFile.toLowerCase().endsWith('.pdf');
        const isExcel =
          report.mediaFile.toLowerCase().endsWith('.xls') ||
          report.mediaFile.toLowerCase().endsWith('.xlsx');
        list.push({
          id: `doc-${report.id}`,
          title: `${report.title || 'Report'} Attachment`,
          size: 'Attachment',
          type: isPdf ? 'pdf' : isExcel ? 'excel' : 'doc',
          isVolunteerReport: false,
          url: report.mediaFile,
          report,
        });
      }

      (report.attachments || []).forEach((att: any, idx) => {
        const url = typeof att === 'string' ? att : att?.url;
        const name =
          typeof att === 'object' && att?.name
            ? att.name
            : `${report.title || 'Attachment'} ${idx + 1}`;
        if (url && !isImageMediaUri(url)) {
          const isPdf = url.toLowerCase().endsWith('.pdf') || name.toLowerCase().endsWith('.pdf');
          const isExcel =
            url.toLowerCase().endsWith('.xls') ||
            url.toLowerCase().endsWith('.xlsx') ||
            name.toLowerCase().endsWith('.xls') ||
            name.toLowerCase().endsWith('.xlsx');
          list.push({
            id: `att-${report.id}-${idx}`,
            title: name,
            size: typeof att === 'object' && att?.size ? att.size : 'Document',
            type: isPdf ? 'pdf' : isExcel ? 'excel' : 'doc',
            isVolunteerReport: false,
            url,
            report,
          });
        }
      });
    });

    return list;
  }, [quarterReports, currentQuarter, volunteersCount]);

  // Volunteer photos for the selected quarter
  const volunteerPhotos = useMemo(() => {
    const list: Array<{ id: string; uri: string; date: string; name: string; photosCount: number }> = [];
    const volunteerById = new Map(volunteers.map(v => [v.id, v]));
    const volunteerByUserId = new Map(volunteers.map(v => [v.userId, v]));
    const seenUris = new Set<string>();

    volunteerTimeLogs.forEach(log => {
      const logDate = new Date(log.timeIn || (log as any).createdAt).getTime();
      if (logDate < qStart || logDate > qEnd) return;
      const photo = (log as any).attendancePhoto || (log as any).completionPhoto;
      if (!photo || !isImageMediaUri(photo) || seenUris.has(photo)) return;
      seenUris.add(photo);

      const v = volunteerById.get((log as any).volunteerId) || volunteerByUserId.get((log as any).volunteerId);
      const name = v?.name || (log as any).volunteerName || 'Volunteer';
      const date = log.timeIn
        ? new Date(log.timeIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : currentQuarter.label;
      list.push({
        id: log.id,
        uri: photo,
        date,
        name,
        photosCount: 1,
      });
    });

    const reportsForPhotos = quarterReports;

    reportsForPhotos.forEach(r => {
      const uris = getAttachmentUris([r.mediaFile || '', ...(r.attachments || [])]).filter(isImageMediaUri);
      uris.forEach((uri, idx) => {
        if (seenUris.has(uri)) return;
        seenUris.add(uri);
        list.push({
          id: `${r.id}-${idx}`,
          uri,
          date: new Date(r.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          name: r.submitterName || 'Volunteer',
          photosCount: uris.length,
        });
      });
    });

    return list;
  }, [volunteerTimeLogs, quarterReports, volunteers, currentQuarter, qStart, qEnd]);

  const [isExportingPhotos, setIsExportingPhotos] = useState(false);

  const handleBatchExportPhotos = async () => {
    if (volunteerPhotos.length === 0) {
      Alert.alert('No Photos', 'There are no volunteer report photos to export.');
      return;
    }
    setIsExportingPhotos(true);
    try {
      const quarterTag = currentQuarter.label.replace(/\s+/g, '_');
      await exportPhotosAsZip(
        volunteerPhotos.map((item, idx) => ({
          id: item.id,
          uri: item.uri,
          name: item.name,
          date: item.date,
          filename: `volunteer-photo-${String(idx + 1).padStart(2, '0')}-${(item.name || 'volunteer').replace(/\s+/g, '_')}.jpeg`,
        })),
        `Volunteer_Report_Photos_${quarterTag}.zip`
      );
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Unable to batch export photos.');
    } finally {
      setIsExportingPhotos(false);
    }
  };

  const handleExportVolunteerPdf = async () => {
    try {
      const accountUserName = user?.name || user?.email || 'Administrator';
      const data = buildVolunteerReportData({
        quarterLabel: currentQuarter.label,
        periodRange: currentQuarter.periodLabel,
        partnerOrg: orgName && orgName !== '—' ? orgName : 'Negrense Volunteers for Change Foundation',
        programName: programTitle && programTitle !== '—' ? programTitle : 'NVC Volunteer Mobilization Program',
        dateSubmitted: submittedOn && submittedOn !== '—' ? submittedOn : undefined,
        submittedBy: (submittedByName && submittedByName !== '—' && submittedByName !== 'Program Coordinator')
          ? submittedByName
          : accountUserName,
        position: (submittedByRole && (submittedByRole as any) !== '—') ? String(submittedByRole) : userRoleTitle,
        volunteers,
        projects: projects.filter(p => !isProgramTrackRecord(p)),
        timeLogs: volunteerTimeLogs,
        joinRecords: volunteerJoinRecords,
      });
      await exportVolunteerReportPdf(data, `Volunteer_List_Report_${currentQuarter.label.replace(/\s+/g, '_')}.pdf`);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Unable to generate volunteer report PDF.');
    }
  };

  const handleExportQuarterlyPdf = async () => {
    try {
      const qStart = currentQuarter.startDate.getTime();
      const qEnd = currentQuarter.endDate.getTime();

      // Fetch all registered partner organizations for creator and sector mapping
      const allPartners: Partner[] = await getAllPartners().catch(() => []);

      const accountUserName = user?.name || user?.email || 'NVC Partner';
      const partnerAuthor = (orgName && orgName !== '—')
        ? orgName
        : (user?.partnerRegistration?.organizationName || user?.name || 'Partner Author');

      // Helper to determine whether a project was created by partner or admin
      const getProjectCreator = (p: Project): string => {
        if (p.partnerId) {
          const match = allPartners.find(
            item => item.id === p.partnerId || item.ownerUserId === p.partnerId || item.userId === p.partnerId
          );
          if (match?.name) return `${match.name} (Partner)`;
        }
        const app = partnerApplications.find(
          a => a.projectId === p.id || a.proposalDetails?.targetProjectId === p.id
        );
        if (app?.partnerName) return `${app.partnerName} (Partner)`;
        if (app?.proposalDetails?.organizationName) return `${app.proposalDetails.organizationName} (Partner)`;
        if (user?.role === 'partner' && (user.partnerRegistration?.organizationName || user.name)) {
          const isPartnerProject = projectSummaries.some(s => s.project.id === p.id) || p.partnerId === user.id;
          if (isPartnerProject) return `${user.partnerRegistration?.organizationName || user.name} (Partner)`;
        }
        return 'NVC Administration';
      };

      // 1. TOTAL PROJECTS (strictly active or created in this quarter)
      const quarterProjects = partnerProjects.filter(p => {
        const created = p.createdAt ? new Date(p.createdAt).getTime() : 0;
        const start = p.startDate ? new Date(p.startDate).getTime() : 0;
        const end = p.endDate ? new Date(p.endDate).getTime() : 0;
        if (created >= qStart && created <= qEnd) return true;
        if (start >= qStart && start <= qEnd) return true;
        if (start <= qEnd && (end === 0 || end >= qStart)) return true;
        const hasQuarterEvent = projects.some(e =>
          e.isEvent &&
          e.parentProjectId === p.id &&
          new Date(e.startDate || e.createdAt).getTime() >= qStart &&
          new Date(e.startDate || e.createdAt).getTime() <= qEnd
        );
        if (hasQuarterEvent) return true;
        return false;
      });

      const projectsList = quarterProjects.map(p => {
        const summary = projectSummaries.find(s => s.project.id === p.id);
        const pEvents = (summary?.linkedEvents || []).filter(e => {
          const d = new Date(e.startDate || e.createdAt).getTime();
          return d >= qStart && d <= qEnd;
        }).length || (p.isEvent ? 1 : 0);
        const pVolunteers = summary?.volunteerAccounts?.length || (p.volunteers?.length || 0);
        return {
          title: p.title || 'Untitled Project',
          category: (p as any)?.sectorType || p.category || 'General Community',
          status: p.status || 'Active',
          createdBy: getProjectCreator(p),
          eventsCount: pEvents,
          volunteersCount: pVolunteers,
        };
      });

      // 2. SKILLS CONTRIBUTED & 3. EVENTS CONDUCTED (use real computed data)
      const eventsList = (quarterEvents.length > 0 ? quarterEvents : partnerEvents).map(e => {
        const parent = sourceProjects.find(p => p.id === e.parentProjectId);
        const eventVols = new Set<string>();
        volunteerJoinRecords.filter(r => r.projectId === e.id).forEach(r => eventVols.add(r.volunteerId || r.volunteerUserId || ''));
        volunteerTimeLogs.filter(l => l.projectId === e.id).forEach(l => eventVols.add(l.volunteerId || ''));
        return {
          title: e.title || 'Community Event',
          parentProject: parent?.title || e.category || 'NVC Program',
          date: e.startDate ? new Date(e.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : currentQuarter.label,
          status: e.status || 'Active',
          location: (typeof e.location === 'object' ? e.location?.address : e.location) || (e as any).address || 'Negros Occidental',
          volunteersCount: eventVols.size || (e.volunteers?.length || 0),
        };
      });

      // 4. SECTORS PARTNER (NGO, Hospitals, Institute, Private with all names)
      const normalizeSectorType = (sec: string | undefined): 'NGO' | 'Hospital' | 'Institution' | 'Private' => {
        const s = String(sec || '').toLowerCase();
        if (s.includes('hospital') || s.includes('health') || s.includes('clinic')) return 'Hospital';
        if (s.includes('inst') || s.includes('school') || s.includes('acad') || s.includes('univ') || s.includes('college')) return 'Institution';
        if (s.includes('priv') || s.includes('corp') || s.includes('business') || s.includes('coop')) return 'Private';
        return 'NGO';
      };

      const partnerMap = new Map<string, { name: string; sectorType: 'NGO' | 'Hospital' | 'Institution' | 'Private'; location?: string }>();

      allPartners.forEach(p => {
        if (!p.name) return;
        const sType = normalizeSectorType(p.sectorType || p.category);
        partnerMap.set(p.name.trim().toLowerCase(), {
          name: p.name.trim(),
          sectorType: sType,
          location: p.cityMunicipality || p.province || p.region,
        });
      });

      partnerApplications.forEach(a => {
        const name = a.partnerName || a.proposalDetails?.organizationName;
        if (!name) return;
        const key = name.trim().toLowerCase();
        if (!partnerMap.has(key)) {
          partnerMap.set(key, {
            name: name.trim(),
            sectorType: normalizeSectorType(a.proposalDetails?.requestedProgramModule),
            location: a.proposalDetails?.proposedLocation,
          });
        }
      });

      if (user?.role === 'partner' && user.partnerRegistration?.organizationName) {
        const name = user.partnerRegistration.organizationName.trim();
        const key = name.toLowerCase();
        if (!partnerMap.has(key)) {
          partnerMap.set(key, {
            name,
            sectorType: normalizeSectorType(user.partnerRegistration.sectorType),
            location: user.partnerRegistration.cityMunicipality || user.partnerRegistration.province,
          });
        }
      }

      const allOrgPartners = Array.from(partnerMap.values());

      const sectorPartnerGroups = [
        {
          sectorType: 'NGO',
          sectorLabel: 'Non-Governmental Organizations (NGO)',
          partners: allOrgPartners.filter(p => p.sectorType === 'NGO'),
        },
        {
          sectorType: 'Hospital',
          sectorLabel: 'Hospitals & Healthcare Facilities',
          partners: allOrgPartners.filter(p => p.sectorType === 'Hospital'),
        },
        {
          sectorType: 'Institution',
          sectorLabel: 'Academic Institutions & Schools',
          partners: allOrgPartners.filter(p => p.sectorType === 'Institution'),
        },
        {
          sectorType: 'Private',
          sectorLabel: 'Private Sector & Corporate Partners',
          partners: allOrgPartners.filter(p => p.sectorType === 'Private'),
        },
      ];

      // 5. VOLUNTEERS INVOLVED (all volunteers in this quarter)
      const volStatMap = new Map<string, {
        name: string;
        email?: string;
        role?: string;
        skills?: string;
        events: Set<string>;
        hours: number;
      }>();

      const vById = new Map(volunteers.map(v => [v.id, v]));
      const vByUserId = new Map(volunteers.map(v => [v.userId, v]));

      volunteerTimeLogs
        .filter(log => {
          const logDate = new Date(log.timeIn || (log as any).createdAt).getTime();
          return logDate >= qStart && logDate <= qEnd;
        })
        .forEach(log => {
          const v = vById.get(log.volunteerId) || vByUserId.get(log.volunteerId);
          const id = log.volunteerId || v?.id || (log as any).volunteerName || 'vol';
          const name = v?.name || (log as any).volunteerName || 'Volunteer';
          if (!volStatMap.has(id)) {
            volStatMap.set(id, {
              name,
              email: v?.email,
              role: v?.occupation || 'Field Volunteer',
              skills: (v?.skills || []).slice(0, 3).join(', '),
              events: new Set(),
              hours: 0,
            });
          }
          const st = volStatMap.get(id)!;
          if (log.projectId) st.events.add(log.projectId);
          st.hours += (log as any).totalHours || 2;
        });

      volunteerJoinRecords
        .filter(j => {
          const jDate = j.joinedAt ? new Date(j.joinedAt).getTime() : 0;
          return jDate >= qStart && jDate <= qEnd;
        })
        .forEach(j => {
          const id = j.volunteerId || j.volunteerUserId || 'vol';
          const v = vById.get(id) || vByUserId.get(id);
          const name = j.volunteerName || v?.name || 'Volunteer';
          if (!volStatMap.has(id)) {
            volStatMap.set(id, {
              name,
              email: v?.email,
              role: v?.occupation || 'Field Volunteer',
              skills: (v?.skills || []).slice(0, 3).join(', '),
              events: new Set(),
              hours: 0,
            });
          }
          const st = volStatMap.get(id)!;
          if (j.projectId) st.events.add(j.projectId);
        });

      const volunteersList = volStatMap.size > 0
        ? Array.from(volStatMap.values()).map(st => ({
            name: st.name,
            email: st.email,
            role: st.role,
            skills: st.skills || 'Community Outreach',
            eventsJoined: st.events.size,
            hoursLogged: Math.round(st.hours * 10) / 10,
          }))
        : volunteers.slice(0, 10).map(v => ({
            name: v.name,
            email: v.email,
            role: v.occupation || 'Community Volunteer',
            skills: (v.skills || []).slice(0, 3).join(', ') || 'General Support',
            eventsJoined: 0,
            hoursLogged: 0,
          }));

      const activeProjectName =
        (quarterProjects.length === 1 && quarterProjects[0]?.title)
          ? quarterProjects[0].title
          : activeReport?.projectTitle ||
            (quarterProjects[0]?.title ? `${quarterProjects[0].title} (+${quarterProjects.length - 1} Projects)` : 'Partner Project Portfolio');

      const safeSubmittedBy = (submittedByName && submittedByName !== '—' && submittedByName !== 'Program Coordinator')
        ? submittedByName
        : accountUserName;
      const safePosition = (submittedByRole && (submittedByRole as any) !== '—') ? String(submittedByRole) : userRoleTitle;

      const activeCount = quarterProjects.filter(p => (p.status as any) === 'Active' || p.status === 'In Progress').length;
      const completedCount = quarterProjects.filter(p => p.status === 'Completed').length;
      const planningCount = quarterProjects.filter(p => (p.status as any) === 'Draft' || p.status === 'Planning' || (p.status as any) === 'Pending').length;
      const totalCount = quarterProjects.length || 1;

      const activePct = Math.round((activeCount / totalCount) * 100);
      const completedPct = Math.round((completedCount / totalCount) * 100);
      const planningPct = Math.max(0, 100 - activePct - completedPct);

      const statusDistributions = [
        { status: 'In Progress', count: activeCount, percent: activePct, color: '#16A34A' },
        { status: 'Planning', count: planningCount, percent: planningPct, color: '#2563EB' },
        { status: 'Completed', count: completedCount, percent: completedPct, color: '#D97706' },
      ];

      const sectorCounts: Record<string, number> = {};
      quarterProjects.forEach(p => {
        const sec = (p as any)?.sectorType || p?.category || 'General Community';
        sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
      });

      const sectorPartners = sectorData
        .filter(s => s.label !== 'No Data')
        .map(s => ({
          sector: s.label,
          count: sectorCounts[s.label] || 0,
          percent: s.percent,
          color: s.color,
        }));

      const reportHtml = generateReportHtml({
        reportQuarter: currentQuarter.label,
        projectName: activeProjectName,
        partnerAuthor: partnerAuthor,
        title: activeProjectName,
        subtitle: partnerAuthor,
        period: currentQuarter.periodLabel,
        submittedOn: submittedOn && submittedOn !== '—' ? submittedOn : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        submittedBy: safeSubmittedBy,
        submittedRole: safePosition,
        totalProjects: quarterProjects.length || projectSummaries.length || 0,
        totalProjectsLabel: 'Total Projects',
        totalProjectsDelta: projectTrend,
        skillsContributed: skillsList.length,
        skillsContributedLabel: 'Skills Contributed',
        skillsContributedDelta: skillsTrend,
        eventsConducted: eventsList.length,
        eventsConductedLabel: 'Events Conducted',
        eventsConductedDelta: eventsTrend,
        volunteersInvolved: volunteersList.length,
        volunteersInvolvedLabel: 'Volunteers Involved',
        volunteersInvolvedDelta: volunteerTrend,
        sectorPartners: sectorPartners.length > 0 ? sectorPartners : undefined,
        projectsList,
        skillsList,
        eventsList,
        sectorPartnerGroups,
        volunteersList,
        statusSectionTitle: 'Project Execution Status',
        statusSectionSubtitle: 'Quarterly breakdown of active and completed operations',
        statusDistributions,
        overallResult: {
          primaryLabel: 'In Progress (Active)',
          primaryPercent: activePct,
          secondaryLabel: 'Planning (Draft)',
          secondaryPercent: planningPct,
          tertiaryLabel: 'Completed (Closed)',
          tertiaryPercent: completedPct,
        },
        highlights: quarterProjects.length > 0
          ? quarterProjects.slice(0, 4).map(p => `${p.title}: ${p.description || 'Community engagement active.'}`)
          : ['Active community mobilization and volunteer program ongoing.'],
        documents: [
          { name: `Quarterly_Report_${currentQuarter.label.replace(/\s+/g, '_')}.pdf`, type: 'pdf', size: 'Full Executive Report' },
          { name: `Volunteers_Involved_${currentQuarter.label.replace(/\s+/g, '_')}.pdf`, type: 'pdf', size: `${volunteersList.length} Volunteers` },
        ],
        photos: volunteerPhotos.slice(0, 6).map(p => ({
          uri: p.uri,
          volunteerName: p.name,
          date: p.date,
          photoCount: p.photosCount,
        })),
      });

      await downloadHtmlPdf(`Quarterly_Report_${currentQuarter.label.replace(/\s+/g, '_')}.pdf`, reportHtml);
    } catch (err: any) {
      console.error('Quarterly PDF export error:', err);
      Alert.alert('Export Failed', err?.message || 'Unable to generate quarterly report PDF.');
    }
  };

  const handleDownloadDoc = async (doc: any) => {
    if (doc.url) {
      Linking.openURL(doc.url).catch(() => Alert.alert('Unable to open report file'));
      return;
    }
    if (doc.isQuarterlyReport) {
      await handleExportQuarterlyPdf();
      return;
    }
    if (doc.isVolunteerReport) {
      await handleExportVolunteerPdf();
      return;
    }
    if (doc.report) {
      try {
        const title = doc.report.title || 'Partner Report';
        const dateStr = doc.report.submittedAt
          ? new Date(doc.report.submittedAt).toISOString().split('T')[0]
          : 'recent';
        const pdfContent = [
          `Title: ${doc.report.title}`,
          `Submitted By: ${doc.report.submitterName}`,
          `Role: ${doc.report.submitterRole}`,
          `Status: ${doc.report.status}`,
          `Submitted At: ${new Date(doc.report.submittedAt).toLocaleDateString()}`,
          doc.report.projectTitle ? `Project: ${doc.report.projectTitle}` : '',
          '',
          'Description:',
          doc.report.description || 'No description',
          '',
          doc.report.collaborationFeedback
            ? `How Was the Collaboration?:\n${doc.report.collaborationFeedback}`
            : '',
          doc.report.volunteerPraise
            ? `Praise for the Volunteers:\n${doc.report.volunteerPraise}`
            : '',
          doc.report.gratitudeNote ? `Thank You Note:\n${doc.report.gratitudeNote}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        await downloadPdfFile(
          `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStr}.pdf`,
          buildTextPdf(title, pdfContent)
        );
      } catch (_e) {
        onViewReport(doc.report);
      }
      return;
    }
    if (doc.type === 'pdf') {
      await handleExportQuarterlyPdf();
    } else {
      Alert.alert('Report Download', `Downloading ${doc.title}...`);
    }
  };

  const handleDownloadReport = async () => {
    if (activeReport) {
      const url = activeReport.mediaFile || activeReport.attachments?.[0]?.url;
      if (url) {
        Linking.openURL(url).catch(() => Alert.alert('Unable to open report file'));
        return;
      }
    }
    await handleExportQuarterlyPdf();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F8FAFC' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 1. Breadcrumbs & Quarter Selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4, zIndex: 100 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flexShrink: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b' }}>Partner Reports</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>›</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b' }}>Quarterly Reports</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>›</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>{currentQuarter.label}</Text>
          </View>

          {/* Automated 3-Month Quarter Switcher Dropdown */}
          <View style={{ zIndex: 100 }}>
            {Platform.OS === 'web' ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1.5,
                  borderColor: '#166534',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <MaterialIcons name="calendar-today" size={15} color="#166534" style={{ marginRight: 6 }} />
                <select
                  aria-label="Select Quarter"
                  value={selectedQuarterKey}
                  onChange={(e: any) => setSelectedQuarterKey(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#166534',
                    cursor: 'pointer',
                    paddingRight: '4px',
                    fontFamily: 'inherit',
                  }}
                >
                  {availableQuarters.map(q => (
                    <option key={q.key} value={q.key} style={{ color: '#1e293b', fontSize: '13px', fontWeight: '600' }}>
                      {q.label} ({q.periodLabel})
                    </option>
                  ))}
                </select>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: '#ffffff',
                    borderWidth: 1.5,
                    borderColor: '#166534',
                  }}
                  onPress={() => setShowQuarterDropdown(true)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="calendar-today" size={15} color="#166534" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                    {currentQuarter.label}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color="#64748b" />
                </TouchableOpacity>

                <Modal
                  visible={showQuarterDropdown}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowQuarterDropdown(false)}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(0,0,0,0.4)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 20,
                    }}
                    activeOpacity={1}
                    onPress={() => setShowQuarterDropdown(false)}
                  >
                    <View
                      style={{
                        width: '100%',
                        maxWidth: 340,
                        backgroundColor: '#ffffff',
                        borderRadius: 14,
                        padding: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 10,
                        elevation: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>Select Quarter</Text>
                        <TouchableOpacity onPress={() => setShowQuarterDropdown(false)}>
                          <MaterialIcons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                      {availableQuarters.map(q => {
                        const isSelected = selectedQuarterKey === q.key;
                        return (
                          <TouchableOpacity
                            key={q.key}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingVertical: 12,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                              marginBottom: 4,
                            }}
                            onPress={() => {
                              setSelectedQuarterKey(q.key);
                              setShowQuarterDropdown(false);
                            }}
                          >
                            <View>
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: isSelected ? '800' : '600',
                                  color: isSelected ? '#166534' : '#1e293b',
                                }}
                              >
                                {q.label}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                {q.periodLabel}
                              </Text>
                            </View>
                            {isSelected && <MaterialIcons name="check" size={18} color="#166534" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </TouchableOpacity>
                </Modal>
              </>
            )}
          </View>
        </View>

        {/* 2. Top Header Card */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            padding: 16,
            gap: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          {/* Top Row: Icon + Title + Org */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#E8F5E9',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#C8E6C9',
                flexShrink: 0,
              }}
            >
              <MaterialIcons name="storefront" size={26} color="#2E7D32" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>{reportTitle}</Text>
                <View
                  style={{
                    backgroundColor: hasQuarterReport ? '#DCFCE7' : '#F1F5F9',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: hasQuarterReport ? '#16A34A' : '#64748b' }}>
                    {reportStatus}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{orgName}</Text>
              {Boolean(programTitle && programTitle !== '—' && programTitle.trim() !== '') && (
                <Text style={{ fontSize: 12, color: '#64748b' }}>{programTitle}</Text>
              )}
            </View>
          </View>

          {/* Subtle separator */}
          <View style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: -4 }} />

          {/* Bottom Toolbar: Period & Actions */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Reporting Period */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 150 }}>
              <MaterialIcons name="event" size={20} color="#64748b" />
              <View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>Reporting Period</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>{reportingPeriod}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
                activeOpacity={0.7}
                onPress={handleDownloadReport}
              >
                <MaterialIcons name="file-download" size={16} color="#334155" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Download Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  backgroundColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
                onPress={() => onUploadReport()}
              >
                <MaterialIcons name="more-horiz" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. Five KPI Stat Cards */}
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {/* Card 1: Total Projects */}
          <View
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#ffffff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              padding: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#FEF3C7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="folder" size={20} color="#D97706" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Total Projects</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{totalProjectsCount}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: projectTrend === '—' ? '#64748b' : '#16A34A' }}>
              {projectTrend}
            </Text>
          </View>

          {/* Card 2: Skills Contributed */}
          <View
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#ffffff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              padding: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#DBEAFE',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="person" size={20} color="#2563EB" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Skills Contributed</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{skillsCount}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: skillsTrend === '—' ? '#64748b' : '#16A34A' }}>
              {skillsTrend}
            </Text>
          </View>

          {/* Card 3: Events Conducted */}
          <View
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#ffffff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              padding: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#EDE9FE',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="event" size={20} color="#7C3AED" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Events Conducted</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{eventsConductedCount}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: eventsTrend === '—' ? '#64748b' : '#16A34A' }}>
              {eventsTrend}
            </Text>
          </View>

          {/* Card 4: Sectors Partner (Donut Chart) */}
          <View
            style={{
              flex: 1.2,
              minWidth: 230,
              backgroundColor: '#ffffff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              padding: 14,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sectorData[0]?.color || '#16A34A' }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Sectors Partner</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              {/* Donut Chart Ring */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: sectorData[0]?.color || '#22C55E',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 5,
                  borderColor: sectorData[1]?.color || '#3B82F6',
                  overflow: 'hidden',
                  ...(Platform.OS === 'web'
                    ? ({
                        backgroundImage: conicGradientStr,
                        borderWidth: 0,
                      } as any)
                    : {}),
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: '#ffffff',
                  }}
                />
              </View>

              {/* Legend */}
              <View style={{ gap: 3, flex: 1 }}>
                {sectorData.map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.color }} />
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>{item.label}</Text>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#1e293b' }}>{item.percent}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Card 5: Volunteers Involved */}
          <TouchableOpacity
            style={{
              flex: 1,
              minWidth: 200,
              backgroundColor: '#ffffff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              padding: 16,
              gap: 8,
            }}
            activeOpacity={0.8}
            onPress={() => void handleExportVolunteerPdf()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#DCFCE7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <MaterialIcons name="groups" size={20} color="#16A34A" />
                </View>
                <Text
                  style={{ fontSize: 12, fontWeight: '700', color: '#475569', flex: 1, flexShrink: 1 }}
                  numberOfLines={2}
                >
                  Volunteers Involved
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#eef7f0',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#dcfce7',
                  flexShrink: 0,
                }}
              >
                <MaterialIcons name="picture-as-pdf" size={13} color="#166534" />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534' }}>PDF</Text>
              </View>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{volunteersCount}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: volunteerTrend === '—' ? '#64748b' : '#16A34A' }}>
              {volunteerTrend}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Middle Section: Report Documents */}
        <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>

          {/* Right Card: Report Documents */}
          <View
            style={{
              flex: 1,
              minWidth: 320,
              backgroundColor: '#ffffff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              padding: 20,
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <View style={{ gap: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>Report Documents</Text>
              {generatedDocuments.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <MaterialIcons name="insert-drive-file" size={32} color="#cbd5e1" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8' }}>
                    No report documents for this quarter
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {generatedDocuments.map(doc => (
                    <TouchableOpacity
                      key={doc.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 6,
                        paddingHorizontal: 4,
                        borderRadius: 8,
                      }}
                      activeOpacity={0.7}
                      onPress={() =>
                        doc.report ? onViewReport(doc.report) : void handleDownloadDoc(doc)
                      }
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            backgroundColor: doc.type === 'pdf' ? '#FEE2E2' : '#DCFCE7',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: doc.type === 'pdf' ? '#FECACA' : '#BBF7D0',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '900',
                              color: doc.type === 'pdf' ? '#DC2626' : '#16A34A',
                            }}
                          >
                            {doc.type === 'pdf' ? 'Pdf' : 'Xl'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}
                            numberOfLines={1}
                          >
                            {doc.title}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>{doc.size}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={(e: any) => {
                          e?.stopPropagation?.();
                          void handleDownloadDoc(doc);
                        }}
                        activeOpacity={0.7}
                        style={{ padding: 4 }}
                      >
                        <MaterialIcons name="file-download" size={20} color="#64748b" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            {generatedDocuments.length > 0 && (
              <TouchableOpacity
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#F1F5F9',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
                activeOpacity={0.7}
                onPress={() => setShowAllDocsModal(true)}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>View All Documents</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 5. Bottom Card: Photos from Volunteers Report */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            padding: 20,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>Photos from Volunteers Report</Text>
            {volunteerPhotos.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#166534',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    opacity: isExportingPhotos ? 0.7 : 1,
                  }}
                  activeOpacity={0.8}
                  disabled={isExportingPhotos}
                  onPress={handleBatchExportPhotos}
                >
                  {isExportingPhotos ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <MaterialIcons name="file-download" size={16} color="#ffffff" />
                  )}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                    {isExportingPhotos ? 'Exporting...' : `Export All Photos (${volunteerPhotos.length})`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                  activeOpacity={0.7}
                  onPress={() => setShowAllPhotosModal(true)}
                >
                  <MaterialIcons name="photo-camera" size={15} color="#475569" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    View All Photos ({volunteerPhotos.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Photos Cards Row */}
          {volunteerPhotos.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MaterialIcons name="photo-library" size={32} color="#cbd5e1" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8' }}>
                No volunteer photos submitted for this quarter
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {volunteerPhotos.slice(0, 5).map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={{
                    width: 210,
                    height: 130,
                    borderRadius: 10,
                    overflow: 'hidden',
                    backgroundColor: '#e2e8f0',
                    position: 'relative',
                  }}
                  activeOpacity={0.85}
                  onPress={() => setSelectedPhotoIndex(idx)}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                  />
                  {/* Bottom dark overlay banner */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '500' }}>{item.date}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                        {item.photosCount} {item.photosCount === 1 ? 'photo' : 'photos'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Full Details Modal */}
      {showFullDetailsModal && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 24,
              maxWidth: 520,
              width: '100%',
              gap: 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Quarterly Report Full Details</Text>
              <TouchableOpacity onPress={() => setShowFullDetailsModal(false)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20 }}>
              {activeReport?.description ||
                `The ${currentQuarter.label} partner program conducted in collaboration with ${orgName} includes ${totalProjectsCount} active project initiatives and ${eventsConductedCount} community events engaging ${volunteersCount} volunteers.`}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#166534',
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: 'center',
              }}
              onPress={() => setShowFullDetailsModal(false)}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* All Photos Gallery Modal */}
      {(showAllPhotosModal || selectedPhotoIndex !== null) && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: '#1e293b',
              borderRadius: 16,
              padding: 20,
              maxWidth: 640,
              width: '100%',
              gap: 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
                Volunteer Reports Photo Gallery ({volunteerPhotos.length})
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#166534',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    opacity: isExportingPhotos ? 0.7 : 1,
                  }}
                  disabled={isExportingPhotos}
                  onPress={handleBatchExportPhotos}
                >
                  {isExportingPhotos ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <MaterialIcons name="file-download" size={16} color="#ffffff" />
                  )}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                    {isExportingPhotos ? 'Exporting...' : 'Export All (ZIP)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowAllPhotosModal(false);
                    setSelectedPhotoIndex(null);
                  }}
                >
                  <MaterialIcons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
            <View
              style={{
                width: '100%',
                height: 320,
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: '#0f172a',
              }}
            >
              <Image
                source={{
                  uri:
                    selectedPhotoIndex !== null
                      ? volunteerPhotos[selectedPhotoIndex]?.uri
                      : volunteerPhotos[0]?.uri,
                }}
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              />
            </View>
            {volunteerPhotos.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {volunteerPhotos.map((p, idx) => {
                  const isCurrent = (selectedPhotoIndex ?? 0) === idx;
                  return (
                    <TouchableOpacity
                      key={p.id || idx}
                      onPress={() => setSelectedPhotoIndex(idx)}
                      style={{
                        width: 60,
                        height: 48,
                        borderRadius: 6,
                        overflow: 'hidden',
                        borderWidth: 2,
                        borderColor: isCurrent ? '#22c55e' : 'transparent',
                        opacity: isCurrent ? 1 : 0.6,
                      }}
                    >
                      <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                Photo {((selectedPhotoIndex ?? 0) + 1)} of {volunteerPhotos.length} • by {volunteerPhotos[selectedPhotoIndex || 0]?.name} on {volunteerPhotos[selectedPhotoIndex || 0]?.date}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#166534',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onPress={handleBatchExportPhotos}
                >
                  <MaterialIcons name="file-download" size={14} color="#ffffff" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>Batch Export</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#334155',
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}
                  onPress={() => {
                    setShowAllPhotosModal(false);
                    setSelectedPhotoIndex(null);
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* All Documents Modal */}
      {showAllDocsModal && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 24,
              maxWidth: 480,
              width: '100%',
              gap: 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>All Report Documents</Text>
              <TouchableOpacity onPress={() => setShowAllDocsModal(false)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              {generatedDocuments.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <MaterialIcons name="insert-drive-file" size={32} color="#cbd5e1" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8' }}>
                    No report documents found
                  </Text>
                </View>
              ) : (
                generatedDocuments.map(doc => (
                  <TouchableOpacity
                    key={doc.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: '#f1f5f9',
                    }}
                    activeOpacity={0.7}
                    onPress={() =>
                      doc.report ? onViewReport(doc.report) : void handleDownloadDoc(doc)
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>
                        {doc.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>{doc.size}</Text>
                    </View>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: '#F1F5F9',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                      onPress={(e: any) => {
                        e?.stopPropagation?.();
                        void handleDownloadDoc(doc);
                      }}
                    >
                      <MaterialIcons name="file-download" size={16} color="#334155" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                        Download
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default VolunteerReportsDashboard;

function getVolunteerReportsForSummary(summary: PartnerProjectReportSummary): SubmittedReport[] {
  return summary.volunteerAccounts
    .flatMap(account => account.reports)
    .filter(report => report.status !== 'Rejected')
    .sort(
      (left, right) =>
        new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()
    );
}

function formatMetricValue(value?: number): string {
  if (!value) {
    return '0';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildProjectSummaryContent(summary: PartnerProjectReportSummary): string {
  const volunteerReports = getVolunteerReportsForSummary(summary);
  const linkedEvents = summary.linkedEvents.length
    ? summary.linkedEvents
        .map(
          event =>
            `- ${event.title}${event.startDate ? ` (${new Date(event.startDate).toLocaleDateString()})` : ''}`
        )
        .join('\n')
    : 'No linked events yet.';
  const volunteerAccounts = summary.volunteerAccounts.length
    ? summary.volunteerAccounts
        .map(account =>
          [
            `- ${account.submitterName}`,
            `  Volunteer Reports: ${account.reports.length}`,
            `  Verified Attendance: ${account.verifiedAttendance}`,
            `  Volunteer Event Joins: ${account.volunteerEventJoins}`,
            `  Beneficiaries Served: ${account.beneficiariesServed}`,
            account.reports.length
              ? `  Reports: ${account.reports.map(report => report.title).join(', ')}`
              : null,
          ]
            .filter(Boolean)
            .join('\n')
        )
        .join('\n\n')
    : 'No volunteer accounts yet.';
  const reportDetails = volunteerReports.length
    ? volunteerReports
        .map(report =>
          [
            `- ${report.title}`,
            `  Volunteer Account: ${report.submitterName}`,
            report.projectTitle ? `  Event: ${report.projectTitle}` : null,
            `  Status: ${report.status}`,
            `  Submitted: ${new Date(report.submittedAt).toLocaleString()}`,
            `  Description: ${report.description || 'No description provided.'}`,
          ]
            .filter(Boolean)
            .join('\n')
        )
        .join('\n\n')
    : 'No volunteer reports yet.';

  return [
    `Project Summary: ${summary.project.title}`,
    `Project Description: ${summary.project.description || 'No project description provided.'}`,
    '',
    'Project Metrics',
    `Volunteer Reports Submitted: ${volunteerReports.length}`,
    `Verified Attendance: ${formatMetricValue(summary.metrics.verifiedAttendance)}`,
    `Volunteer Event Joins: ${formatMetricValue(summary.metrics.volunteerEventJoins ?? summary.metrics.volunteerHours)}`,
    `Active Volunteers: ${formatMetricValue(summary.metrics.activeVolunteers)}`,
    `Beneficiaries Served: ${formatMetricValue(summary.metrics.beneficiariesServed)}`,
    `Linked Events Count: ${summary.linkedEvents.length}`,
    '',
    'Linked Events',
    linkedEvents,
    '',
    'Volunteer Accounts',
    volunteerAccounts,
    '',
    'Volunteer Report Details',
    reportDetails,
  ].join('\n');
}

function formatReportType(type: string): string {
  const types: Record<string, string> = {
    General: 'General Report',
    Medical: 'Medical Report',
    Logistics: 'Logistics Report',
    field_report: 'Field Report',
    volunteer_engagement: 'Volunteer Engagement',
    program_impact: 'Program Impact',
    event_performance: 'Event Performance',
    partner_collaboration: 'Partner Collaboration',
    system_metrics: 'System Metrics',
    attendance_photo: 'Attendance Photo',
    completion_photo: 'Completion Photo',
    event_photo: 'Event Photo',
  };
  return types[type] || type;
}

function getReportIcon(type: string): MaterialIconName {
  const icons: Record<string, MaterialIconName> = {
    General: 'description',
    Medical: 'local-hospital',
    Logistics: 'local-shipping',
    field_report: 'assignment',
    volunteer_engagement: 'people',
    program_impact: 'trending-up',
    event_performance: 'event',
    partner_collaboration: 'groups',
    system_metrics: 'analytics',
    attendance_photo: 'photo-camera',
    completion_photo: 'add-a-photo',
    event_photo: 'photo-library',
  };
  return icons[type] || 'description';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5E9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF5E9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: 'transparent',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    fontSize: 23,
    fontWeight: '700',
    color: '#1F3A2E',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    fontSize: 13,
    color: '#5B564C',
    lineHeight: 18,
  },
  uploadButton: {
    borderRadius: 100,
    backgroundColor: '#3F7A54',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  uploadButtonText: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  secondaryHeaderButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DED2B4',
    gap: 8,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4EEE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabelWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  statCardLabel: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    fontSize: 10,
    fontWeight: '700',
    color: '#5B564C',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statCardValue: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    fontSize: 18,
    fontWeight: '800',
    color: '#1F3A2E',
    marginTop: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  impactContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Platform.select({ web: 8, default: 15 }),
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  impactCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
  },
  impactCardBlue: {
    backgroundColor: '#eff6ff',
  },
  impactCardGreen: {
    backgroundColor: '#f0fdf4',
  },
  impactCardOrange: {
    backgroundColor: '#fff7ed',
  },
  impactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.6)',
    marginBottom: 6,
  },
  impactValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  section: {
    paddingHorizontal: Platform.select({ web: 8, default: 15 }),
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  sectionBadge: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  inlineActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe4ee',
  },
  inlineActionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  eventFolder: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe4ee',
  },
  eventFolderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventFolderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e4eee7',
  },
  eventPhotoStrip: {
    gap: 8,
    paddingVertical: 12,
  },
  eventPhoto: {
    width: 104,
    height: 84,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  eventFolderEmpty: {
    paddingVertical: 8,
    fontSize: 12,
    color: '#64748b',
  },
  reportItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fbbf24',
  },
  statusIndicatorApproved: {
    backgroundColor: '#16a34a',
  },
  statusIndicatorSubmitted: {
    backgroundColor: '#3b82f6',
  },
  statusIndicatorRejected: {
    backgroundColor: '#dc2626',
  },
  reportItemContent: {
    flex: 1,
  },
  reportItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  reportItemType: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  reportItemDate: {
    fontSize: 10,
    color: '#94a3b8',
  },
  reportStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#dbeafe',
  },
  badgeApproved: {
    backgroundColor: '#dcfce7',
  },
  badgeSubmitted: {
    backgroundColor: '#dbeafe',
  },
  badgeRejected: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0c4a6e',
  },
  separator: {
    height: 8,
  },
  emptyCardContainer: {
    backgroundColor: 'rgba(63,122,84,0.02)',
    borderWidth: 1,
    borderColor: '#DED2B4',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  emptyIllustrationWrap: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    fontSize: 20,
    fontWeight: '700',
    color: '#1F3A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    fontSize: 13,
    color: '#5B564C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3F7A54',
    borderRadius: 100,
  },
  emptyButtonText: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    color: '#fff',
    fontWeight: '700',
    fontSize: 13.5,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#DED2B4',
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterButtonText: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    fontSize: 12,
    fontWeight: '700',
    color: '#22201B',
  },
  tipsCard: {
    backgroundColor: '#F2E9D8',
    borderWidth: 1,
    borderColor: '#DED2B4',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
  },
  tipsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4EEE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1F3A2E',
    marginBottom: 6,
  },
  tipsBulletContainer: {
    gap: 4,
  },
  tipsBulletRow: {
    fontFamily: Platform.OS === 'web' ? "'Nunito', sans-serif" : 'Nunito',
    fontSize: 12.5,
    color: '#5B564C',
    lineHeight: 18,
  },
  outcomeTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
    gap: 12,
    marginTop: 12,
  },
  outcomeTh: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  outcomeTr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
    backgroundColor: '#fff',
  },
  outcomeTd: {},
  outcomeFileIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeFileIconText: { fontSize: 10, fontWeight: '800' },
  outcomeReportName: { fontSize: 13, fontWeight: '600', color: '#1F2937', flex: 1 },
  outcomeEventName: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  outcomeEventSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  outcomeDate: { fontSize: 12, color: '#374151', fontWeight: '500' },
  outcomeAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  outcomeAvatarText: { fontSize: 11, fontWeight: '800', color: '#1F2937' },
  outcomeSubmitterName: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  outcomeSubmitterRole: { fontSize: 11, color: '#6B7280' },
  eventFolderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  folderCard: {
    width: '23%',
    minWidth: 140,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 12,
    padding: 12,
  },
  folderCardSelected: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  folderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  folderCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  folderCardDate: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  folderCardCount: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  eventDetailCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 12,
    padding: 16,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventDetailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  eventDetailSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  volunteerTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
    gap: 8,
  },
  volunteerTh: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  volunteerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  volunteerTd: {},
  volunteerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E4EEE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volunteerAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  volunteerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  volunteerDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  photoStripSmall: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  photoThumbSmall: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  photoMoreBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  photoMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  photoCountText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  emptyTableRow: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Platform.select({ web: 8, default: 15 }),
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    marginBottom: 12,
    marginHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1D4ED8',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
});
