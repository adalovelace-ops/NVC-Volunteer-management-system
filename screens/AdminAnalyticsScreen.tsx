import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  getAllPartnerReports,
  getAllProjects,
  getAllVolunteers,
  getAllVolunteerProjectJoinRecords,
  getAllVolunteerTimeLogs,
  getAllPartners,
  getAllPartnerProjectApplications,
  subscribeToStorageChanges,
} from '../models/storage';
import type { Partner, PartnerProjectApplication, PartnerReport, Project, Volunteer, VolunteerProjectJoinRecord, VolunteerTimeLog } from '../models/types';
import ModernTheme from '../utils/modernTheme';
import { buildTextPdf, downloadPdfFile } from '../utils/pdfDownload';

type MonthPoint = {
  key: string;
  label: string;
  value: number;
  names: string[];
};

type WeekBucket = {
  key: string;
  label: string;
  subLabel: string;
  start: Date;
  end: Date;
};

type HeatmapCell = {
  value: number;
  names: string[];
};

type HeatmapRow = {
  id: string;
  title: string;
  joined: number;
  cells: HeatmapCell[];
};

type SkillSlice = {
  name: string;
  count: number;
  percent: number;
  color: string;
};

type PartnerSectorQuarter = {
  label: string;
  total: number;
  counts: Record<Partner['sectorType'], number>;
};

const SKILL_COLORS = [
  '#243f1f',
  '#477f39',
  '#6f9a38',
  '#8db653',
  '#9fc76f',
  '#37682b',
  '#4f988c',
  '#d9e44f',
];

const HEAT_COLORS = ['#eef2f7', '#c9d9bf', '#a7c082', '#ba8f72', '#9d6f55'];

function safeDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildPartnerSectorQuarters(partners: Partner[]): PartnerSectorQuarter[] {
  const now = new Date();
  const currentQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const sectors: Partner['sectorType'][] = ['NGO', 'Hospital', 'Institution', 'Private'];

  return Array.from({ length: 4 }, (_, index) => {
    const quarterStart = new Date(now.getFullYear(), currentQuarterStartMonth - (3 - index) * 3, 1);
    const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 1);
    const counts = sectors.reduce((result, sector) => {
      result[sector] = partners.filter(partner => {
        const createdAt = safeDate(partner.createdAt);
        return partner.sectorType === sector && createdAt !== null && createdAt >= quarterStart && createdAt < quarterEnd;
      }).length;
      return result;
    }, {} as Record<Partner['sectorType'], number>);

    return {
      label: `Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`,
      total: sectors.reduce((sum, sector) => sum + counts[sector], 0),
      counts,
    };
  });
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short' });
}

function formatWeekSubLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

function getVolunteerIdForLog(log: VolunteerTimeLog, volunteersById: Map<string, Volunteer>): string {
  return volunteersById.has(log.volunteerId) ? log.volunteerId : log.volunteerId;
}

function getEventVolunteerIds(
  event: Project,
  timeLogs: VolunteerTimeLog[],
  joinRecords: VolunteerProjectJoinRecord[],
  volunteersById: Map<string, Volunteer>,
  volunteersByUserId: Map<string, Volunteer>
): Set<string> {
  const ids = new Set<string>();

  (event.volunteers || []).forEach(id => {
    if (id) {
      ids.add(id);
    }
  });

  (event.joinedUserIds || []).forEach(userId => {
    const volunteer = volunteersByUserId.get(userId);
    if (volunteer?.id) {
      ids.add(volunteer.id);
    }
  });

  joinRecords
    .filter(record => record.projectId === event.id)
    .forEach(record => {
      if (record.volunteerId) {
        ids.add(record.volunteerId);
      } else if (record.volunteerUserId) {
        const volunteer = volunteersByUserId.get(record.volunteerUserId);
        if (volunteer?.id) {
          ids.add(volunteer.id);
        }
      }
    });

  timeLogs
    .filter(log => log.projectId === event.id)
    .forEach(log => ids.add(getVolunteerIdForLog(log, volunteersById)));

  return ids;
}

function formatEventTitle(title: string): string {
  if (title.length <= 24) {
    return title;
  }

  return `${title.slice(0, 21)}...`;
}

function getHeatColor(value: number, maxValue: number): string {
  if (value <= 0 || maxValue <= 0) {
    return HEAT_COLORS[0];
  }

  const index = Math.min(HEAT_COLORS.length - 1, Math.ceil((value / maxValue) * (HEAT_COLORS.length - 1)));
  return HEAT_COLORS[index];
}

function buildMonthPoints(volunteers: Volunteer[]): MonthPoint[] {
  const now = startOfMonth(new Date());
  const firstMonth = addMonths(now, -11);
  const sortedVolunteers = [...volunteers]
    .map(volunteer => ({
      createdAt: safeDate(volunteer.createdAt),
      name: volunteer.name || volunteer.email || 'Unknown volunteer',
    }))
    .filter(item => item.createdAt !== null)
    .sort((left, right) => left.createdAt!.getTime() - right.createdAt!.getTime()) as { createdAt: Date; name: string }[];

  return Array.from({ length: 12 }).map((_, index) => {
    const monthStart = addMonths(firstMonth, index);
    const monthEnd = addMonths(monthStart, 1);
    const names = sortedVolunteers
      .filter(item => item.createdAt < monthEnd)
      .map(item => item.name)
      .sort((left, right) => left.localeCompare(right));

    return {
      key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
      label: formatMonthLabel(monthStart),
      value: names.length,
      names,
    };
  });
}

function buildWeekBuckets(): WeekBucket[] {
  const currentWeek = startOfWeek(new Date());
  const firstWeek = new Date(currentWeek);
  firstWeek.setDate(firstWeek.getDate() - 9 * 7);

  return Array.from({ length: 10 }).map((_, index) => {
    const start = new Date(firstWeek);
    start.setDate(firstWeek.getDate() + index * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return {
      key: start.toISOString(),
      label: `W${index + 1}`,
      subLabel: formatWeekSubLabel(start),
      start,
      end,
    };
  });
}

function buildHeatmapRows(
  projects: Project[],
  timeLogs: VolunteerTimeLog[],
  joinRecords: VolunteerProjectJoinRecord[],
  volunteers: Volunteer[],
  weeks: WeekBucket[]
): HeatmapRow[] {
  const events = projects.filter(project => project.isEvent);
  const volunteersById = new Map(volunteers.map(volunteer => [volunteer.id, volunteer]));
  const volunteersByUserId = new Map(volunteers.map(volunteer => [volunteer.userId, volunteer]));

  return events
    .map(event => {
      const joinedIds = getEventVolunteerIds(event, timeLogs, joinRecords, volunteersById, volunteersByUserId);
      const cells = weeks.map(week => {
        const weeklyVolunteerIds = new Set<string>();
        timeLogs
          .filter(log => log.projectId === event.id)
          .forEach(log => {
            const timeIn = safeDate(log.timeIn);
            if (timeIn && timeIn >= week.start && timeIn < week.end) {
              weeklyVolunteerIds.add(getVolunteerIdForLog(log, volunteersById));
            }
          });

        joinRecords
          .filter(record => record.projectId === event.id)
          .forEach(record => {
            const joinedAt = safeDate(record.joinedAt);
            if (joinedAt && joinedAt >= week.start && joinedAt < week.end) {
              if (record.volunteerId) {
                weeklyVolunteerIds.add(record.volunteerId);
              } else if (record.volunteerUserId) {
                const volunteer = volunteersByUserId.get(record.volunteerUserId);
                if (volunteer?.id) {
                  weeklyVolunteerIds.add(volunteer.id);
                }
              }
            }
          });

        const names = Array.from(weeklyVolunteerIds)
          .map(volunteerId => volunteersById.get(volunteerId)?.name || volunteerId)
          .sort((a, b) => a.localeCompare(b));

        return {
          value: weeklyVolunteerIds.size,
          names,
        };
      });

      return {
        id: event.id,
        title: event.title || 'Untitled event',
        joined: joinedIds.size,
        cells,
      };
    })
    .filter(row => row.joined > 0 || row.cells.some(cell => cell.value > 0))
    .sort((left, right) => {
      const rightTotal = right.cells.reduce((sum, cell) => sum + cell.value, 0);
      const leftTotal = left.cells.reduce((sum, cell) => sum + cell.value, 0);
      return rightTotal - leftTotal || right.joined - left.joined || left.title.localeCompare(right.title);
    })
    .slice(0, 6);
}

function buildSkillSlices(
  volunteers: Volunteer[],
  projects: Project[],
  timeLogs: VolunteerTimeLog[],
  joinRecords: VolunteerProjectJoinRecord[]
): { slices: SkillSlice[]; volunteerCount: number; contributionCount: number } {
  const events = projects.filter(project => project.isEvent);
  const volunteersById = new Map(volunteers.map(volunteer => [volunteer.id, volunteer]));
  const volunteersByUserId = new Map(volunteers.map(volunteer => [volunteer.userId, volunteer]));
  const joinedVolunteerIds = new Set<string>();

  events.forEach(event => {
    getEventVolunteerIds(event, timeLogs, joinRecords, volunteersById, volunteersByUserId).forEach(id => joinedVolunteerIds.add(id));
  });

  // Always include all volunteers' skills, not just those in events
  const skillCounts = new Map<string, number>();

  volunteers.forEach(volunteer => {
    (volunteer.skills || [])
      .map(normalizeSkill)
      .filter(Boolean)
      .forEach(skill => {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      });
  });

  const sortedSkills = Array.from(skillCounts.entries()).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
  );
  const topSkills = sortedSkills.slice(0, 7);
  const otherCount = sortedSkills.slice(7).reduce((sum, [, count]) => sum + count, 0);
  const visibleSkills = otherCount > 0 ? [...topSkills, [`Other (${sortedSkills.length - 7})`, otherCount] as [string, number]] : topSkills;
  const contributionCount = visibleSkills.reduce((sum, [, count]) => sum + count, 0);

  return {
    slices: visibleSkills.map(([name, count], index) => ({
      name,
      count,
      percent: contributionCount > 0 ? Math.round((count / contributionCount) * 100) : 0,
      color: SKILL_COLORS[index % SKILL_COLORS.length],
    })),
    volunteerCount: volunteers.length,
    contributionCount,
  };
}

function buildDonutGradient(slices: SkillSlice[]): string {
  if (slices.length === 0) {
    return 'conic-gradient(#dfe8d6 0deg 360deg)';
  }

  let cursor = 0;
  const segments = slices.map(slice => {
    const degrees = (slice.percent / 100) * 360;
    const start = cursor;
    const end = cursor + degrees;
    cursor = end;
    return `${slice.color} ${start}deg ${end}deg`;
  });

  if (cursor < 360) {
    segments.push(`${slices[slices.length - 1].color} ${cursor}deg 360deg`);
  }

  return `conic-gradient(${segments.join(', ')})`;
}

function getCompletedVolunteerHours(log: VolunteerTimeLog): number {
  const start = safeDate(log.timeIn);
  const end = safeDate(log.timeOut);
  if (!start || !end || end <= start) {
    return 0;
  }

  return (end.getTime() - start.getTime()) / 3_600_000;
}

export type AnalyticsReportSection = 
  | 'all'
  | 'total_volunteers'
  | 'volunteers_per_event'
  | 'skills_contributed'
  | 'partner_sectors'
  | 'project_status';

function generateAnalyticsPdf(
  section: AnalyticsReportSection,
  volunteers: Volunteer[],
  projects: Project[],
  partners: Partner[],
  joinRecords: VolunteerProjectJoinRecord[],
  timeLogs: VolunteerTimeLog[],
  monthPoints: MonthPoint[],
  heatmapRows: HeatmapRow[],
  skillAnalytics: { slices: SkillSlice[]; volunteerCount: number; contributionCount: number },
  partnerSectorQuarters: PartnerSectorQuarter[],
  currentTotal: number,
  monthlyDelta: number
): { title: string; filename: string; content: string } {
  const events = projects.filter(p => p.isEvent);
  const regularProjects = projects.filter(p => !p.isEvent);
  const dateStr = new Date().toISOString().slice(0, 10);
  const timestampStr = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

  const volunteersById = new Map(volunteers.map(v => [v.id, v]));
  const volunteersByUserId = new Map(volunteers.map(v => [v.userId, v]));

  let sectionTitle = 'COMPREHENSIVE ANALYTICS REPORT';
  let filename = `Analytics_Report_${dateStr}.pdf`;
  let body = '';

  const buildTotalVolunteersSection = () => {
    let s = '================================================================================\n';
    s += '1. TOTAL VOLUNTEERS & 12-MONTH CUMULATIVE GROWTH\n';
    s += '================================================================================\n';
    s += `Total Registered Volunteers: ${currentTotal}\n`;
    s += `Monthly Growth Delta: ${monthlyDelta >= 0 ? '+' : ''}${monthlyDelta} volunteers vs last month\n\n`;
    s += '12-MONTH CUMULATIVE GROWTH & VOLUNTEER ROSTER:\n';
    s += '--------------------------------------------------------------------------------\n';
    monthPoints.forEach((pt, idx) => {
      const prevVal = idx > 0 ? monthPoints[idx - 1].value : 0;
      const newCount = Math.max(0, pt.value - prevVal);
      s += `\n[${pt.label}] Cumulative Total: ${pt.value} (+${newCount} new)\n`;
      if (pt.names.length > 0) {
        s += `  Volunteers (${pt.names.length}):\n`;
        for (let i = 0; i < pt.names.length; i += 3) {
          s += `    - ${pt.names.slice(i, i + 3).join(', ')}\n`;
        }
      } else {
        s += '  No volunteers registered up to this period.\n';
      }
    });
    s += '\n';
    return s;
  };

  const buildVolunteersPerEventSection = () => {
    let s = '================================================================================\n';
    s += '2. VOLUNTEERS PER EVENT (EVENT PARTICIPATION)\n';
    s += '================================================================================\n';
    s += `Total Events Tracked: ${events.length}\n\n`;
    s += 'EVENTS & JOINED VOLUNTEER LIST:\n';
    s += '--------------------------------------------------------------------------------\n';
    if (events.length === 0) {
      s += 'No events recorded in the system.\n\n';
    } else {
      events.forEach((ev, idx) => {
        const joinedIds = getEventVolunteerIds(ev, timeLogs, joinRecords, volunteersById, volunteersByUserId);
        const joinedNames = Array.from(joinedIds)
          .map(id => volunteersById.get(id)?.name || volunteersByUserId.get(id)?.name || id)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

        s += `\n[EVENT ${idx + 1}] ${ev.title}\n`;
        s += `  * Status: ${ev.status || 'Active'}\n`;
        s += `  * Dates: ${ev.startDate ? new Date(ev.startDate).toLocaleDateString() : 'N/A'} - ${ev.endDate ? new Date(ev.endDate).toLocaleDateString() : 'N/A'}\n`;
        s += `  * Location: ${ev.location?.address || 'N/A'}\n`;
        s += `  * Total Volunteers Joined: ${joinedNames.length} (Estimated Needed: ${ev.volunteersNeeded || 'N/A'})\n`;
        if (joinedNames.length > 0) {
          s += `  * Joined Volunteers (${joinedNames.length}):\n`;
          for (let i = 0; i < joinedNames.length; i += 3) {
            s += `      ${joinedNames.slice(i, i + 3).join(', ')}\n`;
          }
        } else {
          s += '  * Joined Volunteers: None joined yet\n';
        }
      });
      s += '\n';
    }
    return s;
  };

  const buildSkillsContributedSection = () => {
    let s = '================================================================================\n';
    s += '3. SKILLS CONTRIBUTED BY VOLUNTEERS\n';
    s += '================================================================================\n';
    s += `Total Identified Skills: ${skillAnalytics.slices.length}\n`;
    s += `Total Volunteers Contributing: ${skillAnalytics.volunteerCount}\n`;
    s += `Total Skill Contributions: ${skillAnalytics.contributionCount}\n\n`;
    s += 'SKILL DISTRIBUTION BREAKDOWN:\n';
    s += '--------------------------------------------------------------------------------\n';
    skillAnalytics.slices.forEach(slice => {
      s += `  * ${slice.name.padEnd(28, ' ')} : ${String(slice.count).padStart(3, ' ')} volunteers (${slice.percent}%)\n`;
    });
    s += '\nVOLUNTEER SKILLS DIRECTORY:\n';
    s += '--------------------------------------------------------------------------------\n';
    volunteers.forEach(v => {
      const vSkills = (v.skills && v.skills.length > 0) 
        ? v.skills.join(', ') 
        : (v.skillsDescription || 'General Support');
      s += `  * ${v.name || 'Volunteer'} (${v.email || 'No email'})\n`;
      s += `      Skills: ${vSkills}\n`;
      if (v.availability) {
        s += `      Availability: ${v.availability}\n`;
      }
    });
    s += '\n';
    return s;
  };

  const buildPartnerSectorsSection = () => {
    let s = '================================================================================\n';
    s += '4. PARTNER SECTORS BY QUARTER\n';
    s += '================================================================================\n';
    s += `Total Partner Organizations: ${partners.length}\n\n`;
    s += 'QUARTERLY SUMMARY:\n';
    s += '--------------------------------------------------------------------------------\n';
    s += 'Quarter     | NGO | Hospital | Institution | Private | Total\n';
    s += '------------+-----+----------+-------------+---------+------\n';
    partnerSectorQuarters.forEach(q => {
      const qCol = q.label.padEnd(11, ' ');
      const ngoCol = String(q.counts.NGO || 0).padStart(3, ' ');
      const hospCol = String(q.counts.Hospital || 0).padStart(8, ' ');
      const instCol = String(q.counts.Institution || 0).padStart(11, ' ');
      const privCol = String(q.counts.Private || 0).padStart(7, ' ');
      const totCol = String(q.total).padStart(5, ' ');
      s += `${qCol} | ${ngoCol} | ${hospCol} | ${instCol} | ${privCol} | ${totCol}\n`;
    });
    s += '\nPARTNER ORGANIZATIONS DIRECTORY:\n';
    s += '--------------------------------------------------------------------------------\n';
    if (partners.length === 0) {
      s += 'No partner organizations recorded in the system.\n\n';
    } else {
      partners.forEach((p, idx) => {
        s += `[${idx + 1}] ${p.name || 'Partner Org'}\n`;
        s += `    * Sector Type: ${p.sectorType || 'NGO'}\n`;
        s += `    * Contact: ${p.contactPerson || 'N/A'} (${p.contactEmail || 'N/A'})\n`;
        s += `    * Phone: ${p.contactPhone || 'N/A'}\n`;
        s += `    * Location: ${p.location?.address || 'N/A'}\n`;
        s += `    * Joined: ${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}\n\n`;
      });
    }
    return s;
  };

  const buildProjectStatusOverviewSection = () => {
    let s = '================================================================================\n';
    s += '5. PROJECT STATUS OVERVIEW (FILTERED PROJECT REPORTS)\n';
    s += '================================================================================\n';
    s += `Total Projects: ${regularProjects.length}\n\n`;
    const statusMeta = [
      { status: 'Planning' as const, label: 'PLANNING (Draft / Upcoming)' },
      { status: 'In Progress' as const, label: 'IN PROGRESS (Active)' },
      { status: 'On Hold' as const, label: 'ON HOLD (Not Active Yet / Paused)' },
      { status: 'Completed' as const, label: 'COMPLETED (Closed Projects)' },
      { status: 'Cancelled' as const, label: 'CANCELLED (Cancel Project)' },
    ];
    statusMeta.forEach(({ status, label }) => {
      const statusProjects = regularProjects.filter(p => p.status === status);
      s += `--------------------------------------------------------------------------------\n`;
      s += `STATUS: ${label} (${statusProjects.length} Projects)\n`;
      s += `--------------------------------------------------------------------------------\n`;
      if (statusProjects.length === 0) {
        s += `  No projects currently in ${status} status.\n\n`;
      } else {
        statusProjects.forEach((p, pIdx) => {
          s += `  ${pIdx + 1}. ${p.title}\n`;
          s += `     - Module: ${p.programModule || p.category || 'General'}\n`;
          s += `     - Dates: ${p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A'} to ${p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A'}\n`;
          s += `     - Location: ${p.location?.address || 'N/A'}\n`;
          s += `     - Volunteers Joined: ${p.volunteers?.length || 0} / ${p.volunteersNeeded || 'N/A'}\n`;
          if (p.description) {
            s += `     - Description: ${p.description.replace(/\n/g, ' ').slice(0, 140)}...\n`;
          }
          s += '\n';
        });
      }
    });
    return s;
  };

  if (section === 'total_volunteers') {
    sectionTitle = 'TOTAL VOLUNTEERS GROWTH REPORT';
    filename = `Total_Volunteers_Report_${dateStr}.pdf`;
    body = buildTotalVolunteersSection();
  } else if (section === 'volunteers_per_event') {
    sectionTitle = 'VOLUNTEERS PER EVENT PARTICIPATION REPORT';
    filename = `Volunteers_Per_Event_Report_${dateStr}.pdf`;
    body = buildVolunteersPerEventSection();
  } else if (section === 'skills_contributed') {
    sectionTitle = 'SKILLS CONTRIBUTED REPORT';
    filename = `Skills_Contributed_Report_${dateStr}.pdf`;
    body = buildSkillsContributedSection();
  } else if (section === 'partner_sectors') {
    sectionTitle = 'PARTNER SECTORS & DIRECTORY REPORT';
    filename = `Partner_Sectors_Report_${dateStr}.pdf`;
    body = buildPartnerSectorsSection();
  } else if (section === 'project_status') {
    sectionTitle = 'PROJECT STATUS OVERVIEW REPORT';
    filename = `Project_Status_Overview_${dateStr}.pdf`;
    body = buildProjectStatusOverviewSection();
  } else {
    // all
    sectionTitle = 'NVC SYSTEM ANALYTICS & IMPACT REPORT';
    filename = `NVC_System_Analytics_Report_${dateStr}.pdf`;
    body = [
      buildTotalVolunteersSection(),
      buildVolunteersPerEventSection(),
      buildSkillsContributedSection(),
      buildPartnerSectorsSection(),
      buildProjectStatusOverviewSection(),
    ].join('\n\n');
  }

  let header = 'NEGRENSE VOLUNTEERS FOR CHANGE (NVC) FOUNDATION\n';
  header += `${sectionTitle}\n`;
  header += `Report Generated: ${timestampStr}\n`;
  header += '================================================================================\n\n';

  return {
    title: sectionTitle,
    filename,
    content: header + body,
  };
}

export default function AdminAnalyticsScreen() {
  const { width } = useWindowDimensions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [timeLogs, setTimeLogs] = useState<VolunteerTimeLog[]>([]);
  const [volunteerJoinRecords, setVolunteerJoinRecords] = useState<VolunteerProjectJoinRecord[]>([]);
  const [reports, setReports] = useState<PartnerReport[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerApplications, setPartnerApplications] = useState<PartnerProjectApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const [nextProjects, nextVolunteers, nextTimeLogs, nextJoinRecords, nextReports, nextPartners, nextApplications] = await Promise.all([
        getAllProjects(),
        getAllVolunteers(),
        getAllVolunteerTimeLogs(),
        getAllVolunteerProjectJoinRecords(),
        getAllPartnerReports(),
        getAllPartners(),
        getAllPartnerProjectApplications(),
      ]);
      setProjects(nextProjects);
      setVolunteers(nextVolunteers);
      setTimeLogs(nextTimeLogs);
      setVolunteerJoinRecords(nextJoinRecords);
      setReports(nextReports);
      setPartners(nextPartners);
      setPartnerApplications(nextApplications);
    } catch (error) {
      console.error('Failed to load admin analytics:', error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAnalytics(true);
  }, [loadAnalytics]);

  useEffect(() => {
    return subscribeToStorageChanges(
      ['projects', 'volunteers', 'volunteerTimeLogs', 'partnerReports', 'volunteerProjectJoins', 'partners', 'partnerProjectApplications'],
      () => {
        void loadAnalytics();
      }
    );
  }, [loadAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }, [loadAnalytics]);

  const monthPoints = useMemo(() => buildMonthPoints(volunteers), [volunteers]);
  const weeks = useMemo(() => buildWeekBuckets(), []);
  const heatmapRows = useMemo(
    () => buildHeatmapRows(projects, timeLogs, volunteerJoinRecords, volunteers, weeks),
    [projects, timeLogs, volunteerJoinRecords, volunteers, weeks]
  );
  const skillAnalytics = useMemo(
    () => buildSkillSlices(volunteers, projects, timeLogs, volunteerJoinRecords),
    [projects, timeLogs, volunteerJoinRecords, volunteers]
  );
  const partnerSectorAnalytics = useMemo(() => {
    const sectorNames: Partner['sectorType'][] = ['NGO', 'Hospital', 'Institution', 'Private'];
    const total = partners.length;
    return sectorNames.map((sector, index) => ({
      sector,
      count: partners.filter(partner => partner.sectorType === sector).length,
      percent: total > 0 ? Math.round((partners.filter(partner => partner.sectorType === sector).length / total) * 100) : 0,
      color: ['#3f7a54', '#d97706', '#2563eb', '#be185d'][index],
    }));
  }, [partners]);
  const partnerSectorQuarters = useMemo(
    () => buildPartnerSectorQuarters(partners),
    [partners]
  );

  const completedHours = useMemo(
    () => Math.round(timeLogs.reduce((sum, log) => sum + getCompletedVolunteerHours(log), 0)),
    [timeLogs]
  );
  const currentTotal = volunteers.length;
  const previousTotal = monthPoints[monthPoints.length - 2]?.value || 0;
  const monthlyDelta = currentTotal - previousTotal;
  const maxVolunteerValue = Math.max(4, ...monthPoints.map(point => point.value));
  const maxHeatValue = Math.max(0, ...heatmapRows.flatMap(row => row.cells.map(cell => cell.value)));
  const chartWidth = Math.max(620, Math.min(900, width - 260));
  const chartHeight = 230;
  const plotPadding = { top: 18, right: 16, bottom: 32, left: 46 };
  const plotWidth = chartWidth - plotPadding.left - plotPadding.right;
  const plotHeight = chartHeight - plotPadding.top - plotPadding.bottom;
  const chartPoints = monthPoints.map((point, index) => {
    const x = plotPadding.left + (plotWidth / Math.max(1, monthPoints.length - 1)) * index;
    const y = plotPadding.top + plotHeight - (point.value / maxVolunteerValue) * plotHeight;
    return { ...point, x, y };
  });
  const donutGradient = buildDonutGradient(skillAnalytics.slices);
  const isCompact = width < 980;
  const isWeb = Platform.OS === 'web';
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    rowTitle: string;
    weekLabel: string;
    value: number;
    names: string[];
    rowIndex: number;
    columnIndex: number;
  } | null>(null);
  const hoverClearTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportSection, setSelectedExportSection] = useState<AnalyticsReportSection>('all');
  const [isExporting, setIsExporting] = useState(false);

  const handleGenerateAnalyticsReport = async (section: AnalyticsReportSection = selectedExportSection) => {
    setIsExporting(true);
    try {
      const report = generateAnalyticsPdf(
        section,
        volunteers,
        projects,
        partners,
        volunteerJoinRecords,
        timeLogs,
        monthPoints,
        heatmapRows,
        skillAnalytics,
        partnerSectorQuarters,
        currentTotal,
        monthlyDelta
      );

      const pdfContent = buildTextPdf(report.title, report.content);
      await downloadPdfFile(report.filename, pdfContent, 'Unable to download report PDF.');
      setShowExportModal(false);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`✅ Report Generated!\n\n${report.filename} downloaded successfully.`);
      } else {
        Alert.alert('✅ Report Generated', `${report.filename} generated and saved successfully.`);
      }
    } catch (error: any) {
      Alert.alert('Export Failed', error?.message || 'Unable to generate analytics PDF report.');
    } finally {
      setIsExporting(false);
    }
  };

  const cancelHoverClear = useCallback(() => {
    if (hoverClearTimeoutRef.current) {
      clearTimeout(hoverClearTimeoutRef.current);
      hoverClearTimeoutRef.current = null;
    }
  }, []);

  const clearHoverPointAfterDelay = useCallback(() => {
    cancelHoverClear();
    hoverClearTimeoutRef.current = setTimeout(() => {
      setHoveredPointKey(null);
      hoverClearTimeoutRef.current = null;
    }, 300);
  }, [cancelHoverClear]);

  const handleHoverPoint = useCallback(
    (key: string) => {
      cancelHoverClear();
      setHoveredPointKey(key);
    },
    [cancelHoverClear]
  );

  useEffect(() => {
    return () => {
      cancelHoverClear();
    };
  }, [cancelHoverClear]);

  const hoveredPoint = hoveredPointKey ? chartPoints.find(point => point.key === hoveredPointKey) : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4b7d3c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TOP ACTION BAR */}
        <View style={styles.topActionBar}>
          <View style={styles.topActionBarInfo}>
            <Text style={styles.screenHeaderTitle}>System Analytics & Impact</Text>
            <Text style={styles.screenHeaderSubtitle}>Real-time metrics, growth trajectory, and organization reports</Text>
          </View>
          <TouchableOpacity
            style={styles.exportPdfButton}
            onPress={() => {
              setSelectedExportSection('all');
              setShowExportModal(true);
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="picture-as-pdf" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.exportPdfButtonText}>Generate PDF Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>TOTAL VOLUNTEERS</Text>
              <Text style={styles.cardSubtitle}>Cumulative growth across the last 12 months</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => void handleGenerateAnalyticsReport('total_volunteers')}
                style={styles.cardExportIconBtn}
                title="Download Total Volunteers PDF"
              >
                <MaterialIcons name="picture-as-pdf" size={16} color="#166534" />
                <Text style={styles.cardExportIconText}>Export PDF</Text>
              </TouchableOpacity>
              <View style={styles.legendItem}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Volunteers</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricStrip}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
            <View style={styles.totalPill}>
              <MaterialIcons name="groups" size={14} color="#fff" />
              <Text style={styles.totalPillText}>{currentTotal} total volunteers</Text>
            </View>
            <View style={styles.deltaPill}>
              <MaterialIcons name={monthlyDelta >= 0 ? 'trending-up' : 'trending-down'} size={14} color="#2d6f35" />
              <Text style={styles.deltaPillText}>
                {monthlyDelta >= 0 ? '+' : ''}{monthlyDelta} vs last month
              </Text>
            </View>
            <Text style={styles.inspectHint}>
              {hoveredPoint ? `${hoveredPoint.label}: ${hoveredPoint.value} volunteers` : 'Hover a point to inspect a month'}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View
              style={[styles.lineChart, { width: chartWidth, height: chartHeight }]}
            >
              {[0, 1, 2, 3, 4].map(step => {
                const value = Math.round((maxVolunteerValue / 4) * step);
                const top = plotPadding.top + plotHeight - (plotHeight / 4) * step;
                return (
                  <View key={step} style={[styles.gridLine, { top, left: plotPadding.left, width: plotWidth }]}>
                    <Text style={styles.axisLabel}>{value}</Text>
                  </View>
                );
              })}
              {chartPoints.slice(1).map((point, index) => {
                const previous = chartPoints[index];
                const dx = point.x - previous.x;
                const dy = point.y - previous.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = `${Math.atan2(dy, dx)}rad`;
                return (
                  <View
                    key={`${previous.key}-${point.key}`}
                    style={[
                      styles.lineSegment,
                      {
                        width: distance,
                        left: (previous.x + point.x) / 2 - distance / 2,
                        top: (previous.y + point.y) / 2 - 1.5,
                        transform: [{ rotate: angle }],
                      },
                    ]}
                  />
                );
              })}
              {hoveredPoint ? (
                <View
                  style={[styles.tooltip, { left: Math.max(8, hoveredPoint.x - 42), top: Math.max(4, hoveredPoint.y - 50) }]}
                  {...(isWeb
                    ? ({
                        onMouseEnter: () => handleHoverPoint(hoveredPoint.key),
                        onPointerEnter: () => handleHoverPoint(hoveredPoint.key),
                        onMouseLeave: clearHoverPointAfterDelay,
                        onPointerLeave: clearHoverPointAfterDelay,
                      } as any)
                    : {})}
                >
                  <Text style={styles.tooltipLabel}>{hoveredPoint.label}</Text>
                  <Text style={styles.tooltipValue}>{hoveredPoint.value} volunteers</Text>
                  {hoveredPoint.names.length > 0 ? (
                    <Text style={styles.tooltipNames}>
                      {hoveredPoint.names.slice(0, 6).join(', ')}
                      {hoveredPoint.names.length > 6 ? ` +${hoveredPoint.names.length - 6} more` : ''}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {chartPoints.map(point => (
                <React.Fragment key={point.key}>
                  <View
                    style={[styles.hoverTarget, { left: point.x - 21, top: point.y - 21 }]}
                    {...(isWeb
                      ? ({
                          onMouseEnter: () => handleHoverPoint(point.key),
                          onPointerEnter: () => handleHoverPoint(point.key),
                          onMouseOver: () => handleHoverPoint(point.key),
                          onMouseLeave: clearHoverPointAfterDelay,
                          onPointerLeave: clearHoverPointAfterDelay,
                        } as any)
                      : {
                          onStartShouldSetResponder: () => true,
                          onResponderGrant: () => handleHoverPoint(point.key),
                          onResponderMove: () => handleHoverPoint(point.key),
                          onResponderRelease: clearHoverPointAfterDelay,
                        })}
                  >
                    <View style={styles.chartPoint} />
                  </View>
                  <Text style={[styles.monthLabel, { left: point.x - 18, top: chartHeight - 25 }]}>{point.label}</Text>
                </React.Fragment>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.lowerGrid, isCompact && styles.lowerGridStacked]}>
          <View style={[styles.heatmapCard, isCompact && styles.fullWidthCard]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>VOLUNTEERS PER EVENT</Text>
                <Text style={styles.cardSubtitle}>Weekly distribution of volunteer activity across top events</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => void handleGenerateAnalyticsReport('volunteers_per_event')}
                  style={styles.cardExportIconBtn}
                  title="Download Volunteers Per Event PDF"
                >
                  <MaterialIcons name="picture-as-pdf" size={16} color="#166534" />
                  <Text style={styles.cardExportIconText}>Export PDF</Text>
                </TouchableOpacity>
                <View style={styles.heatLegend}>
                  <Text style={styles.heatLegendText}>Low</Text>
                  {HEAT_COLORS.slice(1).map(color => (
                    <View key={color} style={[styles.heatLegendSwatch, { backgroundColor: color }]} />
                  ))}
                  <Text style={styles.heatLegendText}>High</Text>
                </View>
              </View>
            </View>
            <Text style={styles.previewHint}>
              {hoveredCell ? (
                hoveredCell.names.length > 0 ?
                  `${hoveredCell.weekLabel} — ${hoveredCell.rowTitle}: ${hoveredCell.names.join(', ')}` :
                  `${hoveredCell.weekLabel} — ${hoveredCell.rowTitle}: ${hoveredCell.value} volunteer${hoveredCell.value === 1 ? '' : 's'}`
              ) : (
                'Hover a cell to preview - tap to see volunteer details'
              )}
            </Text>

            {heatmapRows.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No event volunteer activity yet</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.heatmapTableWrapper}>
                  <View style={styles.heatmapTable}>
                    <View style={styles.heatmapHeaderRow}>
                    <View style={styles.eventNameSpacer} />
                    {weeks.map(week => (
                      <View key={week.key} style={styles.weekHeader}>
                        <Text style={styles.weekLabel}>{week.label}</Text>
                        <Text style={styles.weekSubLabel}>{week.subLabel}</Text>
                      </View>
                    ))}
                  </View>
                  {heatmapRows.map((row, rowIndex) => (
                    <View key={row.id} style={styles.heatmapRow}>
                      <View style={styles.eventNameCell}>
                        <Text style={styles.eventName} numberOfLines={1}>{formatEventTitle(row.title)}</Text>
                        <Text style={styles.eventJoined}>{row.joined} joined</Text>
                      </View>
                      {row.cells.map((cell, index) => (
                        <View
                          key={`${row.id}-${weeks[index].key}`}
                          style={[
                            styles.heatCell,
                            { backgroundColor: getHeatColor(cell.value, maxHeatValue) },
                          ]}
                          {...(isWeb
                            ? ({
                                onMouseEnter: () => setHoveredCell({
                                  rowTitle: row.title,
                                  weekLabel: weeks[index].label,
                                  value: cell.value,
                                  names: cell.names,
                                  rowIndex,
                                  columnIndex: index,
                                }),
                                onMouseLeave: () => setHoveredCell(null),
                              } as any)
                            : {
                                onStartShouldSetResponder: () => true,
                                onResponderGrant: () => setHoveredCell({
                                  rowTitle: row.title,
                                  weekLabel: weeks[index].label,
                                  value: cell.value,
                                  names: cell.names,
                                  rowIndex,
                                  columnIndex: index,
                                }),
                                onResponderRelease: () => setHoveredCell(null),
                              })}
                        >
                          {cell.value > 0 ? <Text style={styles.heatCellText}>{cell.value}</Text> : null}
                        </View>
                      ))}
                    </View>
                  ))}
                  {hoveredCell ? (
                    <View
                      style={[
                        styles.tooltip,
                        {
                          left: 168 + hoveredCell.columnIndex * 58,
                          top: 48 + hoveredCell.rowIndex * 47,
                        },
                      ]}
                    >
                      <Text style={styles.tooltipLabel}>{hoveredCell.weekLabel}</Text>
                      <Text style={styles.tooltipValue}>{hoveredCell.rowTitle}</Text>
                      {hoveredCell.names.length > 0 ? (
                        <Text style={styles.tooltipNames}>{hoveredCell.names.join(', ')}</Text>
                      ) : (
                        <Text style={styles.tooltipValue}>{hoveredCell.value} volunteer{hoveredCell.value === 1 ? '' : 's'}</Text>
                      )}
                    </View>
                  ) : null}
                </View>
              </View>
              </ScrollView>
            )}
          </View>

          <View style={[styles.skillsCard, isCompact && styles.fullWidthCard]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>SKILLS CONTRIBUTED</Text>
                <Text style={styles.cardSubtitle}>All skills brought by volunteers joined to events</Text>
              </View>
              <TouchableOpacity
                onPress={() => void handleGenerateAnalyticsReport('skills_contributed')}
                style={styles.cardExportIconBtn}
                title="Download Skills Contributed PDF"
              >
                <MaterialIcons name="picture-as-pdf" size={16} color="#166534" />
                <Text style={styles.cardExportIconText}>Export PDF</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.skillsBody}>
              <View style={styles.donutWrap}>
                <View
                  style={[
                    styles.donutOuter,
                    Platform.OS === 'web' ? ({ backgroundImage: donutGradient } as any) : null,
                  ]}
                >
                  {Platform.OS !== 'web' && skillAnalytics.slices.map((slice, index) => (
                    <View
                      key={slice.name}
                      style={[
                        styles.mobileDonutBand,
                        {
                          backgroundColor: slice.color,
                          transform: [{ rotate: `${index * (360 / Math.max(1, skillAnalytics.slices.length))}deg` }],
                        },
                      ]}
                    />
                  ))}
                  <View style={styles.donutInner}>
                    <Text style={styles.donutNumber}>{skillAnalytics.slices.length}</Text>
                    <Text style={styles.donutLabel}>SKILLS</Text>
                  </View>
                </View>
                <Text style={styles.donutMeta}>
                  {skillAnalytics.volunteerCount} volunteers - {skillAnalytics.contributionCount} contributions
                </Text>
              </View>

              <View style={styles.skillList}>
                {skillAnalytics.slices.length === 0 ? (
                  <Text style={styles.emptyText}>No skills available</Text>
                ) : (
                  skillAnalytics.slices.map(slice => (
                    <View key={slice.name} style={styles.skillRow}>
                      <View style={[styles.skillDot, { backgroundColor: slice.color }]} />
                      <Text style={styles.skillName} numberOfLines={1}>{slice.name}</Text>
                      <Text style={styles.skillValue}>{slice.count} - {slice.percent}%</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>

          <View style={[styles.skillsCard, isCompact && styles.fullWidthCard]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>PARTNER SECTORS BY QUARTER</Text>
                <Text style={styles.cardSubtitle}>New partner organizations grouped by creation quarter</Text>
              </View>
              <TouchableOpacity
                onPress={() => void handleGenerateAnalyticsReport('partner_sectors')}
                style={styles.cardExportIconBtn}
                title="Download Partner Sectors PDF"
              >
                <MaterialIcons name="picture-as-pdf" size={16} color="#166534" />
                <Text style={styles.cardExportIconText}>Export PDF</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sectorTable}>
              <View style={styles.sectorTableRow}>
                <Text style={[styles.sectorTableLabel, styles.sectorTableHeader]}>Quarter</Text>
                {partnerSectorAnalytics.map(item => (
                  <Text key={item.sector} style={[styles.sectorTableValue, styles.sectorTableHeader]}>{item.sector}</Text>
                ))}
              </View>
              {partnerSectorQuarters.map(quarter => (
                <View key={quarter.label} style={styles.sectorTableRow}>
                  <Text style={styles.sectorTableLabel}>{quarter.label}</Text>
                  {partnerSectorAnalytics.map(item => (
                    <Text key={item.sector} style={styles.sectorTableValue}>{quarter.counts[item.sector]}</Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* PROJECT STATUS OVERVIEW */}
        <View style={styles.statusOverviewCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>PROJECT STATUS OVERVIEW</Text>
              <Text style={styles.cardSubtitle}>Engage projects are sorted by current status</Text>
            </View>
            <TouchableOpacity
              onPress={() => void handleGenerateAnalyticsReport('project_status')}
              style={styles.cardExportIconBtn}
              title="Download Project Status Overview PDF"
            >
              <MaterialIcons name="picture-as-pdf" size={16} color="#166534" />
              <Text style={styles.cardExportIconText}>Export PDF</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusList}>
            {[
              { status: 'Planning', label: 'Planning', tag: 'Draft / Upcoming' },
              { status: 'In Progress', label: 'In Progress', tag: 'Active' },
              { status: 'On Hold', label: 'On Hold', tag: 'Not Active Yet / Paused' },
              { status: 'Completed', label: 'Completed', tag: 'Closed Projects' },
              { status: 'Cancelled', label: 'Cancelled', tag: 'Cancel Project' },
            ].map(item => {
              const count = projects.filter(p => !p.isEvent && p.status === item.status).length;
              const statusColor = 
                item.status === 'Planning' ? ModernTheme.colors.status.planning :
                item.status === 'In Progress' ? ModernTheme.colors.status.inProgress :
                item.status === 'On Hold' ? ModernTheme.colors.status.onHold :
                item.status === 'Completed' ? ModernTheme.colors.status.completed :
                ModernTheme.colors.status.cancelled;
              
              return (
                <View key={item.status} style={styles.statusRow}>
                  <View style={styles.statusLeft}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={styles.statusLabel}>{item.label}</Text>
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: `${statusColor}18`, marginLeft: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{item.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.statusCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* PROJECTS TRACKING */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <View>
              <Text style={styles.cardTitle}>PROJECTS TRACKING</Text>
              <Text style={styles.cardSubtitle}>Partner organization projects with their counts and current status</Text>
            </View>
            <View style={styles.trackingFilters}>
              {(() => {
                const partnerProjects = projects.filter(p => !p.isEvent);
                
                return (
                  <>
                    <View style={[styles.filterChip, styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, styles.filterChipTextActive]}>All ({partnerProjects.length})</Text>
                    </View>
                    {[
                      { status: 'Planning', tag: 'Draft' },
                      { status: 'In Progress', tag: 'Active' },
                      { status: 'On Hold', tag: 'Not Active' },
                      { status: 'Completed', tag: 'Closed' },
                      { status: 'Cancelled', tag: 'Cancelled' },
                    ].map(item => {
                      const count = partnerProjects.filter(p => p.status === item.status).length;
                      return (
                        <View key={item.status} style={styles.filterChip}>
                          <Text style={styles.filterChipText}>{item.status} ({item.tag}) • {count}</Text>
                        </View>
                      );
                    })}
                  </>
                );
              })()}
            </View>
          </View>

          {(() => {
            // Filter for partner projects only
            const partnerProjects = projects.filter(p => !p.isEvent).slice(0, 10);

            if (partnerProjects.length === 0) {
              return (
                <View style={styles.emptyTrackingState}>
                  <MaterialIcons name="folder-open" size={48} color={ModernTheme.colors.neutral[300]} />
                  <Text style={styles.emptyText}>No partner projects yet</Text>
                </View>
              );
            }

            return (
              <View style={styles.projectTrackingList}>
                {partnerProjects.map(project => {
                  const statusColor = 
                    project.status === 'Planning' ? ModernTheme.colors.status.planning :
                    project.status === 'In Progress' ? ModernTheme.colors.status.inProgress :
                    project.status === 'On Hold' ? ModernTheme.colors.status.onHold :
                    project.status === 'Completed' ? ModernTheme.colors.status.completed :
                    ModernTheme.colors.status.cancelled;

                  // Find the partner organization for this project
                  const application = partnerApplications.find(
                    app => app.projectId === project.id && app.status === 'Approved'
                  );
                  const partner = partners.find(
                    p => p.id === project.partnerId || p.ownerUserId === application?.partnerUserId
                  );
                  const partnerName = partner?.name || application?.partnerName || 'Internal';

                  return (
                    <View key={project.id} style={styles.projectTrackingItem}>
                      <View style={styles.projectTrackingMain}>
                        <View style={[styles.projectStatusIndicator, { backgroundColor: statusColor }]} />
                        <View style={styles.projectTrackingInfo}>
                          <Text style={styles.projectTrackingTitle} numberOfLines={1}>
                            {project.title}
                          </Text>
                          <Text style={styles.projectTrackingMeta}>
                            {project.isEvent ? 'Event' : 'Project'} • {project.programModule || project.category}
                          </Text>
                          <View style={styles.partnerOrgBadge}>
                            <MaterialIcons name="business" size={12} color={ModernTheme.colors.accent[700]} />
                            <Text style={styles.partnerOrgText} numberOfLines={1}>{partnerName}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.projectTrackingStats}>
                        <View style={styles.projectStatBadge}>
                          <MaterialIcons name="people" size={14} color={ModernTheme.colors.primary[700]} />
                          <Text style={styles.projectStatText}>{project.volunteers?.length || 0}</Text>
                        </View>
                        <View style={[styles.projectStatusBadge, { backgroundColor: `${statusColor}15`, borderColor: statusColor }]}>
                          <Text style={[styles.projectStatusText, { color: statusColor }]}>{project.status}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
                {projects.filter(p => !p.isEvent).length > 10 && (
                  <Text style={styles.trackingFooterHint}>
                    Showing 10 of {projects.filter(p => !p.isEvent).length} projects • View full list in Projects screen
                  </Text>
                )}
              </View>
            );
          })()}
        </View>

        <View style={styles.footerStats}>
          <Text style={styles.footerStat}>Event reports: {reports.length}</Text>
          <Text style={styles.footerStat}>Completed volunteer hours: {completedHours}</Text>
          <Text style={styles.footerStat}>Tracked events: {projects.filter(project => project.isEvent).length}</Text>
        </View>
      </ScrollView>

      {/* EXPORT PDF REPORT MODAL */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.modalPdfIcon}>
                  <MaterialIcons name="picture-as-pdf" size={24} color="#dc2626" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Generate Analytics PDF Report</Text>
                  <Text style={styles.modalSubtitle}>Select the sections to include in your generated report</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowExportModal(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.reportOptionsList}>
              {[
                {
                  key: 'all',
                  title: 'Full Executive Analytics Report',
                  desc: 'All 5 sections including volunteer roster, event participation, skills directory, partner sectors, and project status.',
                  icon: 'analytics',
                },
                {
                  key: 'total_volunteers',
                  title: '1. Total Volunteers Growth',
                  desc: '12-month cumulative growth curve with complete names of registered volunteers per period.',
                  icon: 'groups',
                },
                {
                  key: 'volunteers_per_event',
                  title: '2. Volunteers Per Event',
                  desc: 'All tracked events and full list of joined volunteer names for each event.',
                  icon: 'event',
                },
                {
                  key: 'skills_contributed',
                  title: '3. Skills Contributed',
                  desc: 'Skill distribution metrics and complete volunteer-to-skill directory.',
                  icon: 'psychology',
                },
                {
                  key: 'partner_sectors',
                  title: '4. Partner Sectors by Quarter',
                  desc: 'Quarterly breakdown of NGO, Hospital, Institution, Private partners and full organization directory.',
                  icon: 'business',
                },
                {
                  key: 'project_status',
                  title: '5. Project Status Overview',
                  desc: 'Filtered project breakdown across Planning, In Progress, On Hold, Completed, and Cancelled.',
                  icon: 'folder-special',
                },
              ].map(opt => {
                const isSelected = selectedExportSection === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.reportOptionItem, isSelected && styles.reportOptionItemSelected]}
                    onPress={() => setSelectedExportSection(opt.key as AnalyticsReportSection)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.reportOptionRadio, isSelected && styles.reportOptionRadioSelected]}>
                      {isSelected && <View style={styles.reportOptionRadioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reportOptionTitle, isSelected && styles.reportOptionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={styles.reportOptionDesc}>{opt.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowExportModal(false)}
                disabled={isExporting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDownloadBtn}
                onPress={() => void handleGenerateAnalyticsReport()}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                ) : (
                  <MaterialIcons name="file-download" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.modalDownloadBtnText}>
                  {isExporting ? 'Generating PDF...' : 'Download PDF Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ModernTheme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ModernTheme.colors.background.secondary,
  },
  scrollContent: {
    padding: ModernTheme.spacing[5],
    gap: ModernTheme.spacing[4],
  },
  chartCard: {
    borderRadius: ModernTheme.borderRadius.lg,
    backgroundColor: ModernTheme.colors.background.card,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: ModernTheme.spacing[5],
    ...ModernTheme.shadows.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: ModernTheme.spacing[3],
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: ModernTheme.typography.fontSize.xl,
    fontWeight: ModernTheme.typography.fontWeight.bold,
    color: ModernTheme.colors.text.primary,
    letterSpacing: ModernTheme.typography.letterSpacing.tight,
  },
  cardSubtitle: {
    marginTop: ModernTheme.spacing[1],
    fontSize: ModernTheme.typography.fontSize.sm,
    color: ModernTheme.colors.text.secondary,
    fontWeight: ModernTheme.typography.fontWeight.medium,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[2],
    paddingTop: ModernTheme.spacing[2.5],
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: ModernTheme.borderRadius.full,
    backgroundColor: ModernTheme.colors.primary[600],
  },
  legendText: {
    fontSize: ModernTheme.typography.fontSize.sm,
    fontWeight: ModernTheme.typography.fontWeight.semibold,
    color: ModernTheme.colors.text.secondary,
  },
  metricStrip: {
    marginTop: ModernTheme.spacing[3.5],
    minHeight: 42,
    borderRadius: ModernTheme.borderRadius.md,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: ModernTheme.colors.background.tertiary,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: ModernTheme.spacing[2.5],
    paddingHorizontal: ModernTheme.spacing[3],
    paddingVertical: ModernTheme.spacing[2],
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[1.5],
    borderRadius: ModernTheme.borderRadius.full,
    backgroundColor: ModernTheme.colors.background.card,
    paddingHorizontal: ModernTheme.spacing[2.5],
    paddingVertical: ModernTheme.spacing[1.5],
    ...ModernTheme.shadows.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: ModernTheme.borderRadius.full,
    backgroundColor: ModernTheme.colors.accent[400],
  },
  liveText: {
    fontSize: ModernTheme.typography.fontSize.sm,
    fontWeight: ModernTheme.typography.fontWeight.bold,
    color: ModernTheme.colors.text.primary,
  },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[1.5],
    borderRadius: ModernTheme.borderRadius.full,
    backgroundColor: ModernTheme.colors.primary[600],
    paddingHorizontal: ModernTheme.spacing[3],
    paddingVertical: ModernTheme.spacing[1.5],
    ...ModernTheme.shadows.sm,
  },
  totalPillText: {
    fontSize: ModernTheme.typography.fontSize.sm,
    fontWeight: ModernTheme.typography.fontWeight.bold,
    color: ModernTheme.colors.text.inverse,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[1.5],
    borderRadius: ModernTheme.borderRadius.full,
    backgroundColor: ModernTheme.colors.primary[100],
    paddingHorizontal: ModernTheme.spacing[3],
    paddingVertical: ModernTheme.spacing[1.5],
  },
  deltaPillText: {
    fontSize: ModernTheme.typography.fontSize.sm,
    fontWeight: ModernTheme.typography.fontWeight.bold,
    color: ModernTheme.colors.primary[800],
  },
  inspectHint: {
    fontSize: ModernTheme.typography.fontSize.sm,
    color: ModernTheme.colors.text.tertiary,
    fontStyle: 'italic',
  },
  lineChart: {
    marginTop: 10,
    alignSelf: 'center',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#d9e7cc',
  },
  axisLabel: {
    position: 'absolute',
    left: -18,
    top: -8,
    fontSize: 11,
    color: '#8a967f',
    fontWeight: '700',
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: ModernTheme.borderRadius.full,
    backgroundColor: ModernTheme.colors.primary[600],
  },
  chartPoint: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: ModernTheme.borderRadius.full,
    backgroundColor: ModernTheme.colors.background.card,
    borderWidth: 3,
    borderColor: ModernTheme.colors.primary[600],
  },
  monthLabel: {
    position: 'absolute',
    width: 36,
    textAlign: 'center',
    fontSize: ModernTheme.typography.fontSize.xs,
    color: ModernTheme.colors.text.secondary,
    fontWeight: ModernTheme.typography.fontWeight.semibold,
  },
  lowerGrid: {
    flexDirection: 'row',
    gap: ModernTheme.spacing[3.5],
    alignItems: 'stretch',
  },
  lowerGridStacked: {
    flexDirection: 'column',
  },
  heatmapCard: {
    flex: 2,
    borderRadius: ModernTheme.borderRadius.lg,
    backgroundColor: ModernTheme.colors.background.card,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: ModernTheme.spacing[5],
    ...ModernTheme.shadows.base,
  },
  skillsCard: {
    flex: 0.95,
    borderRadius: ModernTheme.borderRadius.lg,
    backgroundColor: ModernTheme.colors.background.card,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: ModernTheme.spacing[5],
    ...ModernTheme.shadows.base,
  },
  fullWidthCard: {
    width: '100%',
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
  },
  heatLegendText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#596074',
  },
  heatLegendSwatch: {
    width: 16,
    height: 16,
    borderRadius: 5,
  },
  previewHint: {
    marginTop: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#dce8d3',
    backgroundColor: '#f5f9f1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#8a99a7',
    fontStyle: 'italic',
  },
  emptyState: {
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: ModernTheme.typography.fontSize.sm,
    fontWeight: ModernTheme.typography.fontWeight.semibold,
    color: ModernTheme.colors.text.secondary,
  },
  heatmapTableWrapper: {
    position: 'relative',
  },
  heatmapTable: {
    marginTop: 12,
    minWidth: 720,
  },
  heatmapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  eventNameSpacer: {
    width: 165,
  },
  weekHeader: {
    width: 58,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 12,
    color: '#4f566a',
    fontWeight: '900',
  },
  weekSubLabel: {
    marginTop: 3,
    fontSize: 9,
    color: '#8a99a7',
    fontWeight: '700',
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  eventNameCell: {
    width: 165,
    paddingRight: 12,
  },
  eventName: {
    fontSize: 12,
    color: '#344051',
    fontWeight: '900',
  },
  eventJoined: {
    marginTop: 3,
    fontSize: 10,
    color: '#7b8798',
    fontWeight: '700',
  },
  heatCell: {
    width: 54,
    height: 42,
    borderRadius: 5,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoverTarget: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  tooltip: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffffcc',
    borderWidth: 1,
    borderColor: '#d1ddc6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  tooltipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#223a23',
  },
  tooltipValue: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '900',
    color: '#4b7d3c',
  },
  tooltipNames: {
    marginTop: 6,
    fontSize: 11,
    color: '#3b4d3a',
    fontWeight: '700',
    lineHeight: 16,
  },
  heatCellText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '900',
  },
  skillsBody: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  donutWrap: {
    alignItems: 'center',
    minWidth: 190,
  },
  donutOuter: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#dfe8d6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mobileDonutBand: {
    position: 'absolute',
    width: 84,
    height: 168,
    left: 84,
    top: 0,
    opacity: 0.9,
  },
  donutInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutNumber: {
    fontSize: 34,
    lineHeight: 36,
    color: '#262b3d',
    fontWeight: '900',
  },
  donutLabel: {
    marginTop: 3,
    fontSize: 12,
    color: '#596074',
    fontWeight: '800',
  },
  donutMeta: {
    marginTop: 12,
    fontSize: 12,
    color: '#6a7182',
    fontWeight: '800',
    textAlign: 'center',
  },
  skillList: {
    flex: 1,
    minWidth: 220,
    gap: 10,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skillDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  skillName: {
    flex: 1,
    fontSize: 12,
    color: '#344051',
    fontWeight: '900',
  },
  skillValue: {
    fontSize: 12,
    color: '#6a7182',
    fontWeight: '900',
  },
  sectorTable: {
    marginTop: 20,
    gap: 10,
  },
  sectorTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#edf1eb',
    paddingVertical: 8,
  },
  sectorTableLabel: {
    flex: 1.2,
    fontSize: 11,
    color: '#344051',
    fontWeight: '800',
  },
  sectorTableValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: '#6a7182',
    fontWeight: '800',
  },
  sectorTableHeader: {
    color: '#3f7a54',
    fontWeight: '900',
  },
  footerStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ModernTheme.spacing[2.5],
    paddingBottom: ModernTheme.spacing[1],
  },
  footerStat: {
    borderRadius: ModernTheme.borderRadius.full,
    backgroundColor: ModernTheme.colors.background.card,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingHorizontal: ModernTheme.spacing[3],
    paddingVertical: ModernTheme.spacing[1.5],
    fontSize: ModernTheme.typography.fontSize.sm,
    color: ModernTheme.colors.text.secondary,
    fontWeight: ModernTheme.typography.fontWeight.semibold,
    ...ModernTheme.shadows.sm,
  },
  // Project Status Overview styles
  statusOverviewCard: {
    borderRadius: ModernTheme.borderRadius.lg,
    backgroundColor: ModernTheme.colors.background.card,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: ModernTheme.spacing[5],
    ...ModernTheme.shadows.base,
  },
  statusList: {
    marginTop: ModernTheme.spacing[3],
    gap: ModernTheme.spacing[2],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: ModernTheme.spacing[3],
    paddingHorizontal: ModernTheme.spacing[4],
    backgroundColor: ModernTheme.colors.background.tertiary,
    borderRadius: ModernTheme.borderRadius.md,
    marginBottom: 0,
    ...ModernTheme.shadows.xs,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[3],
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: ModernTheme.borderRadius.full,
    ...ModernTheme.shadows.sm,
  },
  statusLabel: {
    fontSize: ModernTheme.typography.fontSize.md,
    fontWeight: ModernTheme.typography.fontWeight.semibold,
    color: ModernTheme.colors.text.primary,
  },
  statusCount: {
    fontSize: ModernTheme.typography.fontSize.lg,
    fontWeight: ModernTheme.typography.fontWeight.bold,
    color: ModernTheme.colors.text.primary,
  },
  // Projects Tracking styles
  trackingCard: {
    borderRadius: ModernTheme.borderRadius.lg,
    backgroundColor: ModernTheme.colors.background.card,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: ModernTheme.spacing[5],
    ...ModernTheme.shadows.base,
  },
  trackingHeader: {
    gap: ModernTheme.spacing[3],
  },
  trackingFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ModernTheme.spacing[2],
    marginTop: ModernTheme.spacing[2],
  },
  filterChip: {
    paddingHorizontal: ModernTheme.spacing[3],
    paddingVertical: ModernTheme.spacing[1.5],
    borderRadius: ModernTheme.borderRadius.full,
    backgroundColor: ModernTheme.colors.neutral[100],
    borderWidth: 0,
    borderColor: 'transparent',
    ...ModernTheme.shadows.xs,
  },
  filterChipActive: {
    backgroundColor: ModernTheme.colors.primary[600],
    borderColor: ModernTheme.colors.primary[600],
    ...ModernTheme.shadows.sm,
  },
  filterChipText: {
    fontSize: ModernTheme.typography.fontSize.sm,
    fontWeight: ModernTheme.typography.fontWeight.semibold,
    color: ModernTheme.colors.text.secondary,
  },
  filterChipTextActive: {
    color: ModernTheme.colors.text.inverse,
  },
  emptyTrackingState: {
    alignItems: 'center',
    paddingVertical: ModernTheme.spacing[12],
    gap: ModernTheme.spacing[3],
  },
  projectTrackingList: {
    marginTop: ModernTheme.spacing[4],
    gap: ModernTheme.spacing[2],
  },
  projectTrackingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: ModernTheme.spacing[3],
    paddingHorizontal: ModernTheme.spacing[4],
    backgroundColor: ModernTheme.colors.background.tertiary,
    borderRadius: ModernTheme.borderRadius.md,
    gap: ModernTheme.spacing[3],
    ...ModernTheme.shadows.xs,
  },
  projectTrackingMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[3],
  },
  projectStatusIndicator: {
    width: 4,
    height: 40,
    borderRadius: ModernTheme.borderRadius.sm,
  },
  projectTrackingInfo: {
    flex: 1,
  },
  projectTrackingTitle: {
    fontSize: ModernTheme.typography.fontSize.md,
    fontWeight: ModernTheme.typography.fontWeight.semibold,
    color: ModernTheme.colors.text.primary,
    marginBottom: ModernTheme.spacing[1],
  },
  projectTrackingMeta: {
    fontSize: ModernTheme.typography.fontSize.sm,
    color: ModernTheme.colors.text.secondary,
    fontWeight: ModernTheme.typography.fontWeight.medium,
  },
  partnerOrgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[1],
    marginTop: ModernTheme.spacing[1],
    paddingHorizontal: ModernTheme.spacing[2],
    paddingVertical: ModernTheme.spacing[0.5],
    backgroundColor: ModernTheme.colors.accent[50],
    borderRadius: ModernTheme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  partnerOrgText: {
    fontSize: ModernTheme.typography.fontSize.xs,
    color: ModernTheme.colors.accent[700],
    fontWeight: ModernTheme.typography.fontWeight.semibold,
    maxWidth: 200,
  },
  projectTrackingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[2],
  },
  projectStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[1],
    paddingHorizontal: ModernTheme.spacing[2],
    paddingVertical: ModernTheme.spacing[1],
    backgroundColor: ModernTheme.colors.primary[50],
    borderRadius: ModernTheme.borderRadius.sm,
  },
  projectStatText: {
    fontSize: ModernTheme.typography.fontSize.sm,
    fontWeight: ModernTheme.typography.fontWeight.semibold,
    color: ModernTheme.colors.primary[700],
  },
  projectStatusBadge: {
    paddingHorizontal: ModernTheme.spacing[2.5],
    paddingVertical: ModernTheme.spacing[1],
    borderRadius: ModernTheme.borderRadius.full,
    borderWidth: 1.5,
  },
  projectStatusText: {
    fontSize: ModernTheme.typography.fontSize.xs,
    fontWeight: ModernTheme.typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: ModernTheme.typography.letterSpacing.wide,
  },
  trackingFooterHint: {
    marginTop: ModernTheme.spacing[3],
    fontSize: ModernTheme.typography.fontSize.sm,
    color: ModernTheme.colors.text.secondary,
    fontWeight: ModernTheme.typography.fontWeight.medium,
    textAlign: 'center',
  },
  // Top Action Bar and PDF export styles
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexWrap: 'wrap',
    gap: 12,
  },
  topActionBarInfo: {
    flex: 1,
    minWidth: 240,
  },
  screenHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  screenHeaderSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  exportPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#166534',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  exportPdfButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardExportIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  cardExportIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    maxWidth: 640,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 14,
  },
  modalPdfIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  reportOptionsList: {
    gap: 10,
    marginVertical: 12,
  },
  reportOptionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  reportOptionItemSelected: {
    borderColor: '#166534',
    backgroundColor: '#f0fdf4',
  },
  reportOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  reportOptionRadioSelected: {
    borderColor: '#166534',
  },
  reportOptionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#166534',
  },
  reportOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  reportOptionTitleSelected: {
    color: '#166534',
  },
  reportOptionDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#166534',
  },
  modalDownloadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
