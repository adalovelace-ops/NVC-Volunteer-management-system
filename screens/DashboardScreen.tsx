import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getDashboardSnapshot,
  subscribeToStorageChanges,
  clearStorageCache,
} from '../models/storage';
import type {
  Partner,
  PartnerProjectApplication,
  Project,
  Volunteer,
  VolunteerProjectJoinRecord,
} from '../models/types';
import { useAuth } from '../contexts/AuthContext';
import { navigateToAvailableRoute } from '../utils/navigation';
import { getMappedProjects } from '../utils/projectMap';
import { withImpactMapFallbackProjects } from '../utils/impactMapFallbacks';
import { getProjectIdsForPartner } from '../utils/mapProjectLinks';
import { getProjectDisplayStatus } from '../utils/projectStatus';
import VolunteerImpactMap from '../components/VolunteerImpactMap';
import { getRequestErrorMessage } from '../utils/requestErrors';

// Helper function to get parent or grandparent program name
function getProjectProgramLabel(project: Project, allProjects: Project[]): string {
  // Check parent project and return its title
  if (project.parentProjectId) {
    const parent = allProjects.find(p => p.id === project.parentProjectId);
    if (parent && parent.title) {
      return parent.title;
    }
  }

  // Check program_id field (alternative parent reference)
  const programId = (project as any).program_id;
  if (programId) {
    const programByProgramId = allProjects.find(p => p.id === programId);
    if (programByProgramId && programByProgramId.title) {
      return programByProgramId.title;
    }
  }

  // For standalone projects/events without parent, try to find matching program by category
  const category = String(project.category || project.programModule || '').trim();
  if (category) {
    // Look for a program that matches this category
    const matchingProgram = allProjects.find(p => {
      const pTitle = String(p.title || '').toLowerCase();
      const pCategory = String(p.category || p.programModule || '').toLowerCase();
      const catLower = category.toLowerCase();
      
      // Check if this is a program (not event, no parent)
      if (p.isEvent || p.parentProjectId) {
        return false;
      }
      
      // Match by category or title containing the category
      return pCategory === catLower || pTitle.includes(catLower);
    });
    
    if (matchingProgram && matchingProgram.title) {
      return matchingProgram.title;
    }
    
    // If no matching program found, return the category itself
    return category;
  }

  return 'General';
}

function formatShortDate(value?: string) {
  if (!value) {
    return 'TBD';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'TBD';
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function getMonthGrid(date: Date): Array<number | null> {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(day);
  }

  while (cells.length < 42) {
    cells.push(null);
  }

  return cells;
}

// Custom hook to memoize projects by content, not reference, preventing re-renders when projects data is the same
function useStableProjects(projects: Project[]): Project[] {
  const prevProjectsRef = useRef<Project[]>([]);
  const prevHashRef = useRef<string>('');

  const currentHash = JSON.stringify(
    projects.map(p => [p.id, p.location?.latitude, p.location?.longitude])
  );

  if (prevHashRef.current !== currentHash) {
    prevHashRef.current = currentHash;
    prevProjectsRef.current = projects;
  }

  return prevProjectsRef.current;
}

function getVolunteerJoinedProjectIds(
  volunteer: Volunteer,
  projects: Project[],
  joinRecords: VolunteerProjectJoinRecord[]
): string[] {
  const joinedProjectIds = new Set<string>(volunteer.pastProjects || []);

  joinRecords
    .filter(
      record =>
        record.volunteerId === volunteer.id ||
        record.volunteerUserId === volunteer.userId
    )
    .forEach(record => {
      if (record.projectId) {
        joinedProjectIds.add(record.projectId);
      }
    });

  projects.forEach(project => {
    const isJoined =
      (project.volunteers || []).includes(volunteer.id) ||
      (project.joinedUserIds || []).includes(volunteer.userId) ||
      (project.internalTasks || []).some(
        task =>
          task.assignedVolunteerId === volunteer.id ||
          (task.assignedVolunteerIds || []).includes(volunteer.id)
      );

    if (isJoined) {
      joinedProjectIds.add(project.id);
    }
  });

  return Array.from(joinedProjectIds);
}

function formatJoinedCountLabel(count: number): string {
  return `${count} event${count === 1 ? '' : 's'} joined`;
}

// Shows the latest dashboard metrics and shortcuts for the logged-in user.
export default function DashboardScreen({ navigation }: any) {
  const { user, isAdmin, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 420;
  const isDesktop = Platform.OS === 'web' || width >= 1100;
  const perfNow = () =>
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  const [dashboardProjectCounts, setDashboardProjectCounts] = useState({
    allProjects: 0,
    programs: 0,
    events: 0,
  });
  const [partnerStats, setPartnerStats] = useState({ total: 0, approved: 0, pending: 0 });
  const [userStats, setUserStats] = useState({ total: 0 });
  const [workflowStats, setWorkflowStats] = useState({
    inboundInquiries: 0,
    timeIns: 0,
    timeOuts: 0,
    pendingReports: 0,
  });
  const [pendingVolunteerJoinRequests, setPendingVolunteerJoinRequests] = useState(0);
  const [timeTrackingTarget, setTimeTrackingTarget] = useState({
    latestTimeInProjectId: undefined as string | undefined,
    latestTimeOutProjectId: undefined as string | undefined,
  });
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const [partnersData, setPartnersData] = useState<Partner[]>([]);
  const [partnerApplicationsData, setPartnerApplicationsData] = useState<PartnerProjectApplication[]>([]);
  const [volunteersData, setVolunteersData] = useState<Volunteer[]>([]);
  const [volunteerJoinRecordsData, setVolunteerJoinRecordsData] = useState<
    VolunteerProjectJoinRecord[]
  >([]);
  const [volunteerCompletedProjectIdsByVolunteerId, setVolunteerCompletedProjectIdsByVolunteerId] =
    useState<Record<string, string[]>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const dashboardLoadInFlightRef = useRef<Promise<void> | null>(null);
  const dashboardReloadQueuedRef = useRef(false);

  // Loads dashboard totals and recent status updates from storage.
  const loadDashboardData = React.useCallback(async () => {
    const startedAt = perfNow();
    try {
      console.log('[DASHBOARD] Loading dashboard snapshot...');
      // Single batch load — getDashboardSnapshot fetches all keys in one request.
      const {
        projects,
        partners,
        users,
        volunteers,
        statusUpdates,
        partnerProjectApplications,
        volunteerTimeLogs,
        volunteerMatches,
        volunteerProjectJoins,
        partnerReports,
        programs,
        programTracks,
        events,
      } = await getDashboardSnapshot();

      console.log('[DASHBOARD] Snapshot loaded:', {
        projects: projects.length,
        programs: programs.length,
        events: events.length,
        programTracks: programTracks.length
      });

      setLoadError(null);
      setProjectsData(projects);
      console.log('[DASHBOARD] Set projectsData to:', projects.length, 'projects');
      setPartnersData(partners);
      setPartnerApplicationsData(partnerProjectApplications || []);
      setVolunteersData(volunteers);
      setVolunteerJoinRecordsData(volunteerProjectJoins || []);

      setDashboardProjectCounts({
        allProjects: projects.filter(
          project => !(programs || []).some(program => program.id === project.id)
        ).length,
        programs: (programTracks || []).length > 0
          ? (programTracks || []).filter(track => track.isActive !== false).length
          : (programs || []).filter(p => !p.parentProjectId && !p.isEvent).length,
        events: (events || []).length || projects.filter(project => project.isEvent).length,
      });

      setPartnerStats({
        total: partners.length,
        approved: partners.filter(p => p.status === 'Approved').length,
        pending: partners.filter(p => p.status === 'Pending').length,
      });

      setUserStats({ total: users.length });

      const projectNamesById = new Map(projects.map(project => [project.id, project.title]));
      const allUpdates = statusUpdates
        .map(update => ({
          ...update,
          projectName: projectNamesById.get(update.projectId) || 'Unknown Project',
        }))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setRecentUpdates(allUpdates.slice(0, 6));

      // Compute workflow stats from already-loaded data — no extra network calls needed.
      const sortedTimeLogs = [...(volunteerTimeLogs || [])].sort(
        (a, b) => new Date(b.timeIn).getTime() - new Date(a.timeIn).getTime()
      );
      setWorkflowStats({
        inboundInquiries: partners.filter(p => p.status === 'Pending').length,
        timeIns: sortedTimeLogs.length,
        timeOuts: sortedTimeLogs.filter(log => Boolean(log.timeOut)).length,
        pendingReports: (partnerReports || []).filter(report => report.status === 'Submitted').length,
      });

      setPendingVolunteerJoinRequests(
        (volunteerMatches || []).filter(match => match.status === 'Requested').length
      );

      const latestTimeInLog = sortedTimeLogs[0];
      const latestTimeOutLog = sortedTimeLogs.find(log => Boolean(log.timeOut)) || null;
      setTimeTrackingTarget({
        latestTimeInProjectId: latestTimeInLog?.projectId,
        latestTimeOutProjectId: latestTimeOutLog?.projectId,
      });

      // Count joined work per volunteer from joins, event rosters, task assignments,
      // and older profile history without adding per-volunteer API calls.
      const joinRecords = volunteerProjectJoins || [];
      const completedByVolunteerId: Record<string, string[]> = {};
      for (const volunteer of volunteers) {
        completedByVolunteerId[volunteer.id] = getVolunteerJoinedProjectIds(
          volunteer,
          projects,
          joinRecords
        );
      }
      setVolunteerCompletedProjectIdsByVolunteerId(completedByVolunteerId);

      const elapsedMs = perfNow() - startedAt;
      console.log(`[perf] DashboardScreen data ready in ${Math.round(elapsedMs)}ms`);
    } catch (error) {
      const errorMessage = getRequestErrorMessage(
        error,
        'Database data is unavailable. Check the backend and Supabase connection.'
      );
      setLoadError(errorMessage);
      setRecentUpdates([]);
      setProjectsData([]);
      setPartnersData([]);
      setVolunteersData([]);
      setVolunteerJoinRecordsData([]);
      setVolunteerCompletedProjectIdsByVolunteerId({});
      setDashboardProjectCounts({
        allProjects: 0,
        programs: 0,
        events: 0,
      });
    }
  }, []);

  const loadDashboardDataCoalesced = React.useCallback(async () => {
    if (dashboardLoadInFlightRef.current) {
      dashboardReloadQueuedRef.current = true;
      return;
    }

    do {
      dashboardReloadQueuedRef.current = false;
      const task = loadDashboardData();
      dashboardLoadInFlightRef.current = task;
      try {
        await task;
      } finally {
        dashboardLoadInFlightRef.current = null;
      }
    } while (dashboardReloadQueuedRef.current);
  }, [loadDashboardData]);

  useFocusEffect(
    React.useCallback(() => {
      void loadDashboardDataCoalesced();
      return subscribeToStorageChanges(
        [
          'users',
          'projects',
          'programs',
          'events',
          'programTracks',
          'partners',
          'partnerProjectApplications',
          'volunteers',
          'statusUpdates',
          'volunteerProjectJoins',
          'volunteerMatches',
          'volunteerTimeLogs',
          'partnerReports',
        ],
        async () => {
          await loadDashboardDataCoalesced();
        }
      );
    }, [loadDashboardDataCoalesced])
  );

  // Confirms logout before clearing the current authenticated session.
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => { } },
      {
        text: 'Logout',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleRefresh = async () => {
    // Clear the storage cache to force a fresh load from the backend
    clearStorageCache([
      'users',
      'projects',
      'programs',
      'programTracks',
      'partners',
      'volunteers',
      'statusUpdates',
      'volunteerProjectJoins',
      'volunteerMatches',
      'volunteerTimeLogs',
      'partnerReports',
      'events',
    ]);
    // Reload dashboard data
    await loadDashboardDataCoalesced();
  };

  const displayName = Platform.OS === 'web' && user?.role === 'admin' ? 'NVC Admin Account' : user?.name;
  const roleLabel =
    user?.role === 'admin'
      ? Platform.OS === 'web'
        ? 'NVC Admin Account'
        : 'Administrator'
      : 'Volunteer Account';

  const openProjects = React.useCallback(
    (projectId?: string) => {
      navigateToAvailableRoute(navigation, 'Projects', projectId ? { projectId } : undefined);
    },
    [navigation]
  );

  const openPartners = React.useCallback(() => {
    navigateToAvailableRoute(navigation, 'Partners', undefined, { routeName: 'Dashboard' });
  }, [navigation]);

  const openUsers = React.useCallback(() => {
    navigateToAvailableRoute(navigation, 'Users', undefined, { routeName: 'Dashboard' });
  }, [navigation]);

  const openLifecycle = React.useCallback(
    (projectId?: string) => {
      navigateToAvailableRoute(
        navigation,
        'Lifecycle',
        projectId ? { projectId } : undefined,
        {
          routeName: 'Projects',
          params: projectId ? { projectId } : undefined,
        }
      );
    },
    [navigation]
  );

  const openMessages = React.useCallback(
    (projectId?: string) => {
      navigateToAvailableRoute(navigation, 'Messages', projectId ? { projectId } : undefined, {
        routeName: 'Dashboard',
      });
    },
    [navigation]
  );

  const impactMapSourceProjects = useMemo(
    () =>
      withImpactMapFallbackProjects(
        projectsData,
        partnerApplicationsData,
        volunteerJoinRecordsData
      ),
    [partnerApplicationsData, projectsData, volunteerJoinRecordsData]
  );

  const mapProjects = useMemo(
    () => getMappedProjects(impactMapSourceProjects),
    [impactMapSourceProjects]
  );

  // Memoize mapProjects by content to prevent unnecessary map re-renders from WebSocket updates
  const stableMapProjects = useStableProjects(mapProjects);

  const volunteerMapAccounts = useMemo(
    () =>
      [...volunteersData]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(volunteer => {
          const joinedProjectIds = new Set([
            ...(volunteer.pastProjects || []),
            ...volunteerJoinRecordsData
              .filter(
                record =>
                  record.volunteerId === volunteer.id ||
                  record.volunteerUserId === volunteer.userId
              )
              .map(record => record.projectId),
          ]);
          const joinedEventProjectIds = impactMapSourceProjects
            .filter(
              project =>
                (project.isEvent || joinedProjectIds.has(project.id)) &&
                (
                  joinedProjectIds.has(project.id) ||
                  (project.joinedUserIds || []).includes(volunteer.userId) ||
                  (project.volunteers || []).includes(volunteer.id) ||
                  (project.internalTasks || []).some(
                    task =>
                      task.assignedVolunteerId === volunteer.id ||
                      (task.assignedVolunteerIds || []).includes(volunteer.id)
                  )
                )
            )
            .map(project => project.id);

          return {
            id: volunteer.id,
            label: volunteer.name,
            projectIds: joinedEventProjectIds,
          };
        }),
    [impactMapSourceProjects, volunteerJoinRecordsData, volunteersData]
  );

  const partnerMapAccounts = useMemo(
    () => {
      const accounts = [...partnersData]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(partner => {
          const projectIds = getProjectIdsForPartner(
            partner,
            impactMapSourceProjects,
            partnerApplicationsData
          );

          return {
            id: partner.id,
            label: partner.name,
            projectIds,
          };
        });

      const assignedProjectIds = new Set(
        accounts.flatMap(account => account.projectIds)
      );
      const knownPartnerKeys = new Set(
        partnersData.flatMap(partner =>
          [partner.id, partner.ownerUserId, partner.contactEmail, partner.name]
            .map(value => String(value || '').trim().toLowerCase())
            .filter(Boolean)
        )
      );
      const approvedApplicationProjectIds = partnerApplicationsData
        .filter(application => application.status === 'Approved')
        .map(application => application.projectId)
        .filter(Boolean);
      const unassignedProjectIds = Array.from(
        new Set([
          ...projectsData
            .filter(project => {
              const partnerKey = String(project.partnerId || '').trim().toLowerCase();
              return Boolean(partnerKey) && !knownPartnerKeys.has(partnerKey);
            })
            .map(project => project.id),
          ...approvedApplicationProjectIds,
        ])
      ).filter(projectId => !assignedProjectIds.has(projectId));

      if (unassignedProjectIds.length > 0) {
        accounts.push({
          id: 'partner-unassigned',
          label: 'N/A Partner Account',
          projectIds: unassignedProjectIds,
        });
      }

      return accounts;
    },
    [impactMapSourceProjects, partnerApplicationsData, partnersData, projectsData]
  );

  const upcomingProjects = useMemo(() => {
    return [...projectsData]
      .filter(project => {
        const status = getProjectDisplayStatus(project);
        return status === 'Planning' || status === 'In Progress';
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 4);
  }, [projectsData]);

  const activeVolunteers = useMemo(
    () =>
      [...volunteersData]
        .sort((a, b) => (b.totalHoursContributed || 0) - (a.totalHoursContributed || 0))
        .slice(0, 3),
    [volunteersData]
  );

  const calendarDate = useMemo(() => new Date(), []);
  const monthGrid = useMemo(() => getMonthGrid(calendarDate), [calendarDate]);
  const monthLabel = useMemo(() => getMonthLabel(calendarDate), [calendarDate]);
  const currentDay = calendarDate.getDate();

  const eventCountByDay = useMemo(() => {
    const map = new Map<number, number>();
    projectsData.forEach(project => {
      const startDate = new Date(project.startDate);
      if (Number.isNaN(startDate.getTime())) {
        return;
      }
      if (
        startDate.getMonth() !== calendarDate.getMonth() ||
        startDate.getFullYear() !== calendarDate.getFullYear()
      ) {
        return;
      }
      map.set(startDate.getDate(), (map.get(startDate.getDate()) || 0) + 1);
    });
    return map;
  }, [projectsData, calendarDate]);

  const messagesCount = workflowStats.timeIns + workflowStats.pendingReports;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={[styles.userSection, isCompact && styles.userSectionCompact]}>
          <View style={[styles.avatar, isCompact && styles.avatarCompact]}>
            <Text style={styles.avatarText}>{displayName?.charAt(0) ?? 'N'}</Text>
          </View>
          <View style={[styles.userCopy, isCompact && styles.userCopyCompact]}>
            <Text style={[styles.greeting, isCompact && styles.greetingCompact]} numberOfLines={2}>
              Welcome, {displayName}
            </Text>
            <Text style={styles.role}>{roleLabel}</Text>
          </View>
          <View style={[styles.headerActions, isCompact && styles.headerActionsCompact]}>
            <TouchableOpacity onPress={handleRefresh} style={styles.headerActionButton}>
              <MaterialIcons name="refresh" size={22} color="#335a42" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerActionButton}>
              <MaterialIcons name="logout" size={22} color="#335a42" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loadError ? (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={20} color="#8f2222" />
          <Text style={styles.errorBannerText}>{loadError}</Text>
          <TouchableOpacity onPress={loadDashboardData}>
            <Text style={styles.errorBannerAction}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.topGrid, !isDesktop && styles.stackGrid]}>
        <View style={styles.trendCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Impact Explorer</Text>
            <TouchableOpacity onPress={() => openProjects()}>
              <Text style={styles.cardMeta}>View all projects</Text>
            </TouchableOpacity>
          </View>

          {mapProjects.length ? (
            <VolunteerImpactMap
              projects={stableMapProjects}
              title="Community Impact Map"
              subtitle="Switch between admin, volunteer, and partner views to inspect mapped project activity."
              initialMapStyleKey="admin-overview"
              volunteerAccounts={volunteerMapAccounts}
              partnerAccounts={partnerMapAccounts}
              onVolunteerPress={(volunteerId: string) => {
                navigateToAvailableRoute(navigation, 'Volunteers', { volunteerId }, { routeName: 'Dashboard' });
              }}
              onPartnerPress={(partnerId: string) => {
                if (partnerId === 'partner-unassigned') {
                  return;
                }
                navigateToAvailableRoute(navigation, 'Partners', { partnerId }, { routeName: 'Dashboard' });
              }}
            />
          ) : (
            <View style={styles.mapFallback}>
              <MaterialIcons name="map" size={28} color="#2f8f45" />
              <Text style={styles.mapFallbackText}>No mapped projects available yet.</Text>
            </View>
          )}
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.upcomingPane}>
            <Text style={styles.upcomingTitle}>Upcoming Activities</Text>
            {upcomingProjects.length ? (
              upcomingProjects.map(project => {
                const programLabel = getProjectProgramLabel(project, projectsData);
                
                // Enhanced debug logging
                const parent = project.parentProjectId 
                  ? projectsData.find(p => p.id === project.parentProjectId)
                  : null;
                
                console.log('[UPCOMING ACTIVITIES]', {
                  title: project.title,
                  category: project.category,
                  programModule: project.programModule,
                  parentProjectId: project.parentProjectId,
                  program_id: (project as any).program_id,
                  parentTitle: parent?.title,
                  parentCategory: parent?.category,
                  parentProgramModule: parent?.programModule,
                  computedLabel: programLabel
                });
                
                return (
                  <TouchableOpacity
                    key={project.id}
                    style={styles.upcomingRow}
                    onPress={() => openProjects(project.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.upcomingName} numberOfLines={1}>{project.title}</Text>
                    <Text style={styles.upcomingCategory} numberOfLines={1}>{programLabel}</Text>
                    <Text style={styles.upcomingDate}>{formatShortDate(project.startDate)}</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.upcomingEmpty}>No upcoming projects yet.</Text>
            )}
          </View>

          <View style={styles.monthPane}>
            <View style={styles.monthTopRow}>
              <View>
                <Text style={styles.todayLabel}>{calendarDate.toLocaleDateString(undefined, { weekday: 'long' })}</Text>
                <Text style={styles.todayDate}>{calendarDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</Text>
              </View>
              <Text style={styles.yearLabel}>{calendarDate.getFullYear()}</Text>
            </View>

            <Text style={styles.monthHeading}>{monthLabel}</Text>

            <View style={styles.weekLabelRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <Text key={day} style={styles.weekLabel}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {monthGrid.map((day, index) => {
                const hasEvent = typeof day === 'number' && eventCountByDay.has(day);
                const isToday = day === currentDay;

                return (
                  <TouchableOpacity
                    key={`${day || 'empty'}-${index}`}
                    style={[
                      styles.dayCell,
                      day === null && styles.dayCellEmpty,
                      hasEvent && styles.dayCellEvent,
                      isToday && styles.dayCellToday,
                    ]}
                    onPress={() => {
                      if (hasEvent) {
                        openLifecycle();
                      }
                    }}
                    activeOpacity={0.85}
                    disabled={day === null}
                  >
                    <Text style={[styles.dayText, day === null && styles.dayTextEmpty, hasEvent && styles.dayTextEvent]}>
                      {day ?? ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.bottomGrid, !isDesktop && styles.stackGrid]}>
        <View style={styles.cardBase}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Active Volunteers</Text>
            <TouchableOpacity onPress={openUsers}>
              <Text style={styles.cardMeta}>View users</Text>
            </TouchableOpacity>
          </View>

          {activeVolunteers.length ? (
            activeVolunteers.map(volunteer => {
              const hours = volunteer.totalHoursContributed || 0;
              const progress = hours > 0 ? Math.min(100, Math.max(8, hours * 3)) : 0;
              const completedCount = (volunteerCompletedProjectIdsByVolunteerId[volunteer.id] || []).length;
              return (
                <View key={volunteer.id} style={styles.volunteerRow}>
                  <View style={styles.volunteerAvatar}>
                    <Text style={styles.volunteerAvatarText}>{String(volunteer.name || 'V').charAt(0)}</Text>
                  </View>
                  <View style={styles.volunteerBody}>
                    <Text style={styles.volunteerName} numberOfLines={1}>{volunteer.name}</Text>
                    <View style={styles.volunteerTrack}>
                      <View style={[styles.volunteerFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.volunteerMeta}>{formatJoinedCountLabel(completedCount)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.newsEmpty}>No active volunteer records yet.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.messagesCard} onPress={() => openMessages()} activeOpacity={0.85}>
          <MaterialIcons name="chat-bubble-outline" size={30} color="#f1fff4" />
          <Text style={styles.messagesValue}>{messagesCount}</Text>
          <Text style={styles.messagesTitle}>Messages</Text>
          <Text style={styles.messagesSub}>Posted by our users</Text>
        </TouchableOpacity>

        <View style={styles.statisticsCard}>
          <Text style={styles.statisticsTitle}>Statistics</Text>
          <View style={styles.statLine}><Text style={styles.statKey}>Total Users</Text><Text style={styles.statNumber}>{userStats.total}</Text></View>
          <View style={styles.statLine}><Text style={styles.statKey}>New Applicants</Text><Text style={styles.statNumber}>{partnerStats.pending}</Text></View>
          {isAdmin ? (
            <View style={styles.statLine}>
              <Text style={styles.statKey}>Pending Volunteer Requests</Text>
              <Text style={styles.statNumber}>{pendingVolunteerJoinRequests}</Text>
            </View>
          ) : null}
          <View style={styles.statLine}><Text style={styles.statKey}>All Projects</Text><Text style={styles.statNumber}>{dashboardProjectCounts.allProjects}</Text></View>
          <View style={styles.statLine}><Text style={styles.statKey}>Program Count</Text><Text style={styles.statNumber}>{dashboardProjectCounts.programs}</Text></View>
          <View style={[styles.statLine, styles.statLineLast]}><Text style={styles.statKey}>Event Count</Text><Text style={styles.statNumber}>{dashboardProjectCounts.events}</Text></View>
        </View>

        <View style={styles.newsCard}>
          <Text style={styles.newsTitle}>News & Announcements</Text>
          {recentUpdates.length ? (
            recentUpdates.slice(0, 3).map((update, index) => (
              <TouchableOpacity
                key={update.id || index}
                style={[styles.newsRow, index === 2 && styles.newsRowLast]}
                onPress={() => openLifecycle(update.projectId)}
                activeOpacity={0.85}
              >
                <View style={styles.newsThumb}>
                  <MaterialIcons name={index === 0 ? 'event' : index === 1 ? 'campaign' : 'photo'} size={18} color="#e8ffe9" />
                </View>
                <View style={styles.newsCopy}>
                  <Text style={styles.newsDate}>{formatShortDate(update.updatedAt)}</Text>
                  <Text style={styles.newsProject} numberOfLines={1}>{update.projectName || 'Project update'}</Text>
                  <Text style={styles.newsBody} numberOfLines={2}>{update.description || 'Status update posted.'}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.newsEmpty}>No announcements yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>NVC v1.0</Text>
      </View>
    </ScrollView>
  );
}

import ModernTheme from '../utils/modernTheme';

const green = {
  page: ModernTheme.colors.background.secondary,
  card: ModernTheme.colors.background.card,
  cardBorder: ModernTheme.colors.border.primary,
  ink: ModernTheme.colors.text.primary,
  muted: ModernTheme.colors.text.secondary,
  strong: ModernTheme.colors.primary[600],
  strongDark: ModernTheme.colors.primary[700],
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: green.page,
  },
  content: {
    paddingBottom: ModernTheme.spacing[5],
  },
  header: {
    backgroundColor: green.card,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    paddingHorizontal: ModernTheme.spacing[3],
    paddingVertical: ModernTheme.spacing[2.5],
    ...ModernTheme.shadows.sm,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[3],
  },
  userSectionCompact: {
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  userCopy: {
    flex: 1,
  },
  userCopyCompact: {
    flexBasis: '100%',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: ModernTheme.borderRadius.full,
    backgroundColor: green.strong,
    justifyContent: 'center',
    alignItems: 'center',
    ...ModernTheme.shadows.sm,
  },
  avatarCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  greetingCompact: {
    fontSize: 14,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '700',
    color: green.ink,
  },
  role: {
    marginTop: 1,
    fontSize: 11,
    color: green.muted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionsCompact: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  headerActionButton: {
    padding: 4,
  },
  errorBanner: {
    marginHorizontal: ModernTheme.spacing[3.5],
    marginTop: ModernTheme.spacing[3],
    paddingHorizontal: ModernTheme.spacing[3],
    paddingVertical: ModernTheme.spacing[2.5],
    borderRadius: ModernTheme.borderRadius.lg,
    backgroundColor: ModernTheme.colors.error + '15',
    borderWidth: 0,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: ModernTheme.spacing[2.5],
    ...ModernTheme.shadows.sm,
  },
  errorBannerText: {
    flex: 1,
    color: '#8f2222',
    fontSize: 12,
    lineHeight: 18,
  },
  errorBannerAction: {
    color: '#8f2222',
    fontSize: 12,
    fontWeight: '700',
  },
  topGrid: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 10,
  },
  bottomGrid: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 10,
    alignItems: 'stretch',
  },
  stackGrid: {
    flexDirection: 'column',
  },
  trendCard: {
    flex: 1.45,
    backgroundColor: green.card,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: ModernTheme.borderRadius.lg,
    padding: ModernTheme.spacing[2],
    minHeight: Platform.OS === 'web' ? undefined : 300,
    ...ModernTheme.shadows.base,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: green.ink,
  },
  cardMeta: {
    fontSize: 10,
    color: green.muted,
    fontWeight: '600',
  },
  mapFallback: {
    minHeight: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9e7dc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f8fcf8',
  },
  mapFallbackText: {
    color: green.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  calendarCard: {
    flex: 1.2,
    borderRadius: ModernTheme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
    flexDirection: 'row',
    minHeight: Platform.OS === 'web' ? 220 : 190,
    ...ModernTheme.shadows.base,
  },
  upcomingPane: {
    width: '38%',
    backgroundColor: green.strong,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  upcomingTitle: {
    color: '#f1fff4',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  upcomingRow: {
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.25)',
  },
  upcomingName: {
    color: '#f7fff8',
    fontSize: 11,
    fontWeight: '600',
  },
  upcomingCategory: {
    marginTop: 1,
    color: '#e4f5d9',
    fontSize: 10,
  },
  upcomingDate: {
    marginTop: 1,
    color: '#d6f8de',
    fontSize: 10,
    fontWeight: '700',
  },
  upcomingEmpty: {
    marginTop: 8,
    color: '#d9f7df',
    fontSize: 11,
  },
  monthPane: {
    flex: 1,
    backgroundColor: green.card,
    padding: 8,
  },
  monthTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  todayLabel: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '400',
    color: green.ink,
  },
  todayDate: {
    marginTop: 1,
    fontSize: 11,
    color: green.ink,
    fontWeight: '700',
  },
  yearLabel: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '400',
    color: green.ink,
  },
  monthHeading: {
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
    color: green.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  weekLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  weekLabel: {
    width: '14.28%',
    textAlign: 'center',
    color: '#7a9181',
    fontSize: 9,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
  },
  dayCellEvent: {
    backgroundColor: '#3cae58',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: green.strong,
  },
  dayText: {
    fontSize: 10,
    color: '#647f6c',
    fontWeight: '600',
  },
  dayTextEmpty: {
    color: 'transparent',
  },
  dayTextEvent: {
    color: '#f5fff7',
    fontWeight: '700',
  },
  cardBase: {
    flex: 1,
    backgroundColor: green.card,
    borderRadius: ModernTheme.borderRadius.lg,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: ModernTheme.spacing[2],
    minHeight: 160,
    ...ModernTheme.shadows.base,
  },
  volunteerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  volunteerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dff2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volunteerAvatarText: {
    color: green.strongDark,
    fontSize: 11,
    fontWeight: '700',
  },
  volunteerBody: {
    flex: 1,
  },
  volunteerName: {
    color: green.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  volunteerTrack: {
    marginTop: 3,
    height: 2,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#dbe9df',
  },
  volunteerFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: green.strong,
  },
  volunteerMeta: {
    marginTop: 2,
    fontSize: 9,
    color: green.muted,
  },
  messagesCard: {
    flex: 0.75,
    backgroundColor: green.strong,
    borderRadius: ModernTheme.borderRadius.lg,
    borderWidth: 0,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    padding: ModernTheme.spacing[2],
    ...ModernTheme.shadows.base,
  },
  messagesValue: {
    marginTop: 2,
    fontSize: 26,
    lineHeight: 30,
    color: '#effff2',
    fontWeight: '700',
  },
  messagesTitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#f1fff4',
    fontWeight: '700',
  },
  messagesSub: {
    marginTop: 1,
    color: '#d9f5df',
    fontSize: 10,
  },
  statisticsCard: {
    flex: 0.85,
    backgroundColor: ModernTheme.colors.primary[50],
    borderRadius: ModernTheme.borderRadius.lg,
    borderWidth: 0,
    borderColor: 'transparent',
    minHeight: 140,
    padding: ModernTheme.spacing[2],
    ...ModernTheme.shadows.base,
  },
  statisticsTitle: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: green.ink,
    marginBottom: 4,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(32,58,42,0.12)',
    paddingVertical: 5,
  },
  statLineLast: {
    borderBottomWidth: 0,
  },
  statKey: {
    color: '#315844',
    fontSize: 11,
  },
  statNumber: {
    color: '#1f3f2d',
    fontSize: 11,
    fontWeight: '700',
  },
  newsCard: {
    flex: 1.4,
    backgroundColor: green.strong,
    borderRadius: ModernTheme.borderRadius.lg,
    borderWidth: 0,
    borderColor: 'transparent',
    minHeight: 140,
    padding: ModernTheme.spacing[2],
    ...ModernTheme.shadows.base,
  },
  newsTitle: {
    textAlign: 'center',
    color: '#f4fff6',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  newsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.24)',
  },
  newsRowLast: {
    borderBottomWidth: 0,
  },
  newsThumb: {
    width: 36,
    height: 28,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsCopy: {
    flex: 1,
  },
  newsDate: {
    color: '#d7f2dd',
    fontSize: 9,
    fontWeight: '700',
  },
  newsProject: {
    marginTop: 1,
    color: '#f4fff6',
    fontSize: 12,
    fontWeight: '700',
  },
  newsBody: {
    marginTop: 1,
    color: '#e9f8eb',
    fontSize: 10,
    lineHeight: 13,
  },
  newsEmpty: {
    color: '#d7f2dd',
    fontSize: 11,
    marginTop: 6,
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#7f9987',
  },
});
