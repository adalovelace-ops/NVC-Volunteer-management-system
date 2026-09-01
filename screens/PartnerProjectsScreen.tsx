import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ModernTheme from '../utils/modernTheme';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllVolunteerTimeLogs,
  getProjectsScreenSnapshot,
  subscribeToStorageChanges,
} from '../models/storage';
import { PartnerProjectApplication, Project, VolunteerTimeLog } from '../models/types';
import { getProjectDisplayStatus, getProjectStatusColor } from '../utils/projectStatus';
import { getRequestErrorMessage, getRequestErrorTitle } from '../utils/requestErrors';

function countTrackedVolunteers(project: Project) {
  const joinedUserCount = new Set(project.joinedUserIds || []).size;
  const assignedVolunteerCount = new Set(project.volunteers || []).size;
  const taskedVolunteerCount = new Set(
    (project.internalTasks || [])
      .map(task => task.assignedVolunteerId)
      .filter((value): value is string => Boolean(value))
  ).size;

  return Math.max(joinedUserCount, assignedVolunteerCount, taskedVolunteerCount);
}

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Schedule to be announced';
  }

  const startLabel = start.toLocaleDateString();
  const endLabel = end.toLocaleDateString();
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

export default function PartnerProjectsScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [partnerApplications, setPartnerApplications] = useState<PartnerProjectApplication[]>([]);
  const [volunteerTimeLogs, setVolunteerTimeLogs] = useState<VolunteerTimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ title: string; message: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setPartnerApplications([]);
      setLoading(false);
      return;
    }

    try {
      const [snapshot, allVolunteerTimeLogs] = await Promise.all([
        getProjectsScreenSnapshot(user, ['projects', 'partnerApplications']),
        getAllVolunteerTimeLogs(),
      ]);
      setProjects(snapshot.projects || []);
      setPartnerApplications(snapshot.partnerApplications || []);
      setVolunteerTimeLogs(allVolunteerTimeLogs || []);
      setLoadError(null);
    } catch (error) {
      setLoadError({
        title: getRequestErrorTitle(error, 'Unable to load projects'),
        message: getRequestErrorMessage(error, 'Failed to load your tracked partner projects.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
      return subscribeToStorageChanges(['projects', 'events', 'partnerProjectApplications'], () => {
        void loadData();
      });
    }, [loadData])
  );

  useFocusEffect(
    useCallback(() => {
      return subscribeToStorageChanges(['volunteerTimeLogs'], () => {
        void loadData();
      });
    }, [loadData])
  );

  const approvedProjectIds = useMemo(
    () => new Set(
      partnerApplications
        .filter(application => application.status === 'Approved')
        .map(application => application.projectId)
        .filter(Boolean)
    ),
    [partnerApplications]
  );

  const trackedProjects = useMemo(
    () =>
      projects
        .filter(project =>
          !project.isEvent &&
          approvedProjectIds.has(project.id) &&
          // Exclude top-level program records (they have no parentProjectId and no proposal-id prefix)
          (Boolean(project.parentProjectId) || String(project.id || '').startsWith('project-proposal-'))
        )
        .sort(
          (left, right) =>
            new Date(right.updatedAt || right.createdAt).getTime() -
            new Date(left.updatedAt || left.createdAt).getTime()
        ),
    [approvedProjectIds, projects]
  );

  const projectMetrics = useMemo(
    () =>
      trackedProjects.map(project => {
        const linkedEvents = projects
          .filter(event => event.isEvent && event.parentProjectId === project.id)
          .sort(
            (left, right) =>
              new Date(left.startDate).getTime() - new Date(right.startDate).getTime()
          );
        const volunteerJoinCount = linkedEvents.reduce(
          (sum, event) => sum + countTrackedVolunteers(event),
          0
        );
        const verifiedAttendanceCount = linkedEvents.reduce(
          (sum, event) =>
            sum +
            volunteerTimeLogs.filter(
              log => log.projectId === event.id && Boolean(log.timeOut)
            ).length,
          0
        );
        const activeEventCount = linkedEvents.filter(event => {
          const status = getProjectDisplayStatus(event);
          return status !== 'Completed' && status !== 'Cancelled';
        }).length;

        return {
          project,
          linkedEvents,
          volunteerJoinCount,
          verifiedAttendanceCount,
          activeEventCount,
        };
      }),
    [projects, trackedProjects, volunteerTimeLogs]
  );

  const summary = useMemo(() => {
    const totalEvents = projectMetrics.reduce((sum, entry) => sum + entry.linkedEvents.length, 0);
    const totalVolunteerJoins = projectMetrics.reduce((sum, entry) => sum + entry.volunteerJoinCount, 0);
    const totalVerifiedAttendance = projectMetrics.reduce(
      (sum, entry) => sum + entry.verifiedAttendanceCount,
      0
    );
    const activeProjects = projectMetrics.filter(entry => {
      const status = getProjectDisplayStatus(entry.project);
      return status !== 'Completed' && status !== 'Cancelled';
    }).length;

    return {
      totalProjects: projectMetrics.length,
      totalEvents,
      totalVolunteerJoins,
      totalVerifiedAttendance,
      activeProjects,
    };
  }, [projectMetrics]);

  useEffect(() => {
    const targetProjectId = String(route?.params?.projectId || '').trim();
    if (!targetProjectId) {
      return;
    }

    if (projectMetrics.some(entry => entry.project.id === targetProjectId)) {
      setSelectedProjectId(targetProjectId);
      navigation?.setParams?.({ projectId: undefined });
    }
  }, [projectMetrics, route?.params?.projectId, navigation]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const selectedProjectMetrics = useMemo(
    () =>
      selectedProjectId
        ? projectMetrics.find(entry => entry.project.id === selectedProjectId) || null
        : null,
    [projectMetrics, selectedProjectId]
  );

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#166534" />
        <Text style={styles.centerStateText}>Loading your projects...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#166534" />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Page header */}
      <Text style={styles.pageTitle}>Partner Tracking</Text>
      <Text style={styles.pageSubtitle}>
        Monitor and manage your projects, events, and volunteer engagements.
      </Text>

      {loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>{loadError.title}</Text>
          <Text style={styles.errorText}>{loadError.message}</Text>
        </View>
      ) : null}

      {/* My Projects summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryCardHeader}>
          <View style={styles.summaryCardIconWrap}>
            <MaterialIcons name="folder" size={22} color="#166534" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryCardTitle}>My Projects</Text>
            <Text style={styles.summaryCardSub}>
              Tap a project box to open its events, volunteer joins, and current progress.
            </Text>
          </View>
        </View>

        <View style={styles.statTileRow}>
          <View style={styles.statTile}>
            <View style={styles.statTileIcon}>
              <MaterialIcons name="folder" size={20} color="#166534" />
            </View>
            <Text style={styles.statTileValue}>{summary.totalProjects}</Text>
            <Text style={styles.statTileLabel}>Projects</Text>
          </View>
          <View style={styles.statTile}>
            <View style={styles.statTileIcon}>
              <MaterialIcons name="event" size={20} color="#166534" />
            </View>
            <Text style={styles.statTileValue}>{summary.totalEvents}</Text>
            <Text style={styles.statTileLabel}>Events</Text>
          </View>
          <View style={styles.statTile}>
            <View style={styles.statTileIcon}>
              <MaterialIcons name="groups" size={20} color="#166534" />
            </View>
            <Text style={styles.statTileValue}>{summary.totalVolunteerJoins}</Text>
            <Text style={styles.statTileLabel}>Joins</Text>
          </View>
        </View>
      </View>

      {/* Tracked Projects List */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionHeader}>Approved & Active Projects</Text>
        {projectMetrics.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="folder-open" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No approved projects yet</Text>
            <Text style={styles.emptyText}>
              When your project proposals are approved by the admin, they will appear here with live volunteer tracking and event metrics.
            </Text>
          </View>
        ) : (
          <View style={styles.boxList}>
            {projectMetrics.map(entry => {
              const displayStatus = getProjectDisplayStatus(entry.project);
              const statusColor = getProjectStatusColor(entry.project);
              return (
                <TouchableOpacity
                  key={entry.project.id}
                  style={styles.projectBox}
                  activeOpacity={0.8}
                  onPress={() => setSelectedProjectId(entry.project.id)}
                >
                  <View style={styles.projectBoxTopRow}>
                    <View style={styles.projectBoxCopy}>
                      <Text style={styles.projectBoxTitle}>{entry.project.title}</Text>
                      <Text style={styles.projectBoxMeta}>
                        {entry.project.programModule || entry.project.category} • {formatDateRange(entry.project.startDate, entry.project.endDate)}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: `${statusColor}20` }]}>
                      <Text style={[styles.statusChipText, { color: statusColor }]}>{displayStatus}</Text>
                    </View>
                  </View>

                  <View style={styles.projectStatRow}>
                    <View style={styles.projectStatMini}>
                      <Text style={styles.projectStatValue}>{entry.linkedEvents.length}</Text>
                      <Text style={styles.projectStatLabel}>Events</Text>
                    </View>
                    <View style={styles.projectStatMini}>
                      <Text style={styles.projectStatValue}>{entry.volunteerJoinCount}</Text>
                      <Text style={styles.projectStatLabel}>Volunteers</Text>
                    </View>
                    <View style={styles.projectStatMini}>
                      <Text style={styles.projectStatValue}>{entry.verifiedAttendanceCount}</Text>
                      <Text style={styles.projectStatLabel}>Verified</Text>
                    </View>
                    <View style={styles.projectStatMini}>
                      <Text style={styles.projectStatValue}>{entry.activeEventCount}</Text>
                      <Text style={styles.projectStatLabel}>Active Events</Text>
                    </View>
                  </View>

                  <View style={styles.projectBoxFooter}>
                    <Text style={styles.projectBoxFooterText} numberOfLines={1}>
                      {entry.project.location?.address || 'Negros Occidental'}
                    </Text>
                    <Text style={styles.projectTapHint}>View Details →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>


      {/* Project Details Modal */}

      <Modal
        visible={Boolean(selectedProjectMetrics)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProjectId(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropDismiss} onPress={() => setSelectedProjectId(null)} />
          <View style={styles.modalCard}>
            {selectedProjectMetrics ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderCopy}>
                    <Text style={styles.modalTitle}>{selectedProjectMetrics.project.title}</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedProjectMetrics.project.programModule || selectedProjectMetrics.project.category}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedProjectId(null)}
                    hitSlop={8}
                  >
                    <MaterialIcons name="close" size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalContentScroll}
                  contentContainerStyle={styles.modalContentScrollContent}
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.modalMetricRow}>
                    <View style={styles.modalMetricCard}>
                      <Text style={styles.modalMetricValue}>{selectedProjectMetrics.linkedEvents.length}</Text>
                      <Text style={styles.modalMetricLabel}>Events</Text>
                    </View>
                    <View style={styles.modalMetricCard}>
                      <Text style={styles.modalMetricValue}>{selectedProjectMetrics.volunteerJoinCount}</Text>
                      <Text style={styles.modalMetricLabel}>Joins</Text>
                    </View>
                    <View style={styles.modalMetricCard}>
                      <Text style={styles.modalMetricValue}>{selectedProjectMetrics.verifiedAttendanceCount}</Text>
                      <Text style={styles.modalMetricLabel}>Verified</Text>
                    </View>
                    <View style={styles.modalMetricCard}>
                      <Text style={styles.modalMetricValue}>{selectedProjectMetrics.activeEventCount}</Text>
                      <Text style={styles.modalMetricLabel}>Active</Text>
                    </View>
                  </View>

                  <Text style={styles.projectDetailText}>
                    {selectedProjectMetrics.project.location.address || 'Location to be announced'}
                  </Text>
                  <Text style={styles.projectDetailText}>
                    {formatDateRange(
                      selectedProjectMetrics.project.startDate,
                      selectedProjectMetrics.project.endDate
                    )}
                  </Text>
                  <Text style={styles.projectDetailText}>
                    {selectedProjectMetrics.project.description || 'No project description yet.'}
                  </Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 16 }}>
                    <Text style={[styles.eventSectionTitle, { marginBottom: 0, marginTop: 0 }]}>Inside This Project</Text>
                    <TouchableOpacity onPress={() => {
                      setSelectedProjectId(null);
                      navigation.navigate('ProjectLifecycle', { projectId: selectedProjectMetrics.project.id });
                    }}>
                      <Text style={{ color: '#166534', fontWeight: 'bold', fontSize: 13 }}>More here</Text>
                    </TouchableOpacity>
                  </View>
                  {selectedProjectMetrics.linkedEvents.length === 0 ? (
                    <View style={styles.eventEmptyCard}>
                      <Text style={styles.eventEmptyText}>
                        No admin-created events have been attached to this project yet.
                      </Text>
                    </View>
                  ) : (
                    selectedProjectMetrics.linkedEvents.map(event => {
                      const eventStatus = getProjectDisplayStatus(event);
                      const eventVolunteerCount = countTrackedVolunteers(event);
                      const eventVerifiedAttendanceCount = volunteerTimeLogs.filter(
                        log => log.projectId === event.id && Boolean(log.timeOut)
                      ).length;

                      return (
                        <View key={event.id} style={styles.eventItem}>
                          <View style={styles.eventItemTopRow}>
                            <View style={styles.eventItemCopy}>
                              <Text style={styles.eventItemTitle}>{event.title}</Text>
                              <Text style={styles.eventItemMeta}>
                                {formatDateRange(event.startDate, event.endDate)}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.statusChip,
                                { backgroundColor: `${getProjectStatusColor(event)}20` },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusChipText,
                                  { color: getProjectStatusColor(event) },
                                ]}
                              >
                                {eventStatus}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.eventAddress}>
                            {event.location.address || 'Location to be announced'}
                          </Text>

                          <View style={styles.eventPillRow}>
                            <View style={styles.eventPill}>
                              <MaterialIcons name="groups" size={14} color="#475569" />
                              <Text style={styles.eventPillText}>
                                {eventVolunteerCount} volunteer
                                {eventVolunteerCount === 1 ? '' : 's'} joined
                              </Text>
                            </View>
                            <View style={styles.eventPill}>
                              <MaterialIcons name="people-outline" size={14} color="#475569" />
                              <Text style={styles.eventPillText}>
                                Need {event.volunteersNeeded}
                              </Text>
                            </View>
                            <View style={styles.eventPill}>
                              <MaterialIcons name="verified" size={14} color="#475569" />
                              <Text style={styles.eventPillText}>
                                {eventVerifiedAttendanceCount} verified attendance
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#edf6ee',
  },
  centerStateText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  // Page header
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 20,
  },
  // My Projects summary card
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe7dc',
    padding: 16,
    marginBottom: 20,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  summaryCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f0faf2',
    borderWidth: 1,
    borderColor: '#c7e5cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#166534',
    marginBottom: 2,
  },
  summaryCardSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
  },
  statTileRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8fbf8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe7dc',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
  },
  statTileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f0faf2',
    borderWidth: 1,
    borderColor: '#c7e5cc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statTileValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#166534',
  },
  statTileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  // Section
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
  },
  programListCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe7dc',
    overflow: 'hidden',
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  programRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9f2ea',
  },
  programRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f0faf2',
    borderWidth: 1,
    borderColor: '#c7e5cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  programRowBody: {
    flex: 1,
  },
  programRowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  programRowMeta: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
  },
  viewProgramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#e9f2ea',
    backgroundColor: '#f0faf2',
  },
  viewProgramBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },

  errorCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
  },
  errorText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#7f1d1d',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#dbe7dc',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: '#64748b',
  },
  availableProgramHeader: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  boxList: {
    gap: 12,
  },
  projectBox: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe7dc',
    padding: 12,
  },
  projectBoxTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  projectBoxCopy: {
    flex: 1,
  },
  projectBoxTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    color: '#0f172a',
  },
  projectBoxMeta: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  projectStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  projectStatMini: {
    width: '48%',
    borderRadius: 12,
    backgroundColor: '#f8fbf8',
    borderWidth: 1,
    borderColor: '#dbe7dc',
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  projectStatValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  projectStatLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 13,
  },
  projectBoxFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  projectBoxFooterText: {
    flex: 1,
    fontSize: 10,
    color: '#64748b',
  },
  projectTapHint: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    padding: 18,
  },
  modalBackdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    maxHeight: '82%',
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbe7dc',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  modalHeaderCopy: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  modalMetricCard: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#f8fbf8',
    borderWidth: 1,
    borderColor: '#dbe7dc',
    padding: 10,
  },
  modalMetricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalMetricLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  modalContentScroll: {
    marginTop: 6,
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  modalContentScrollContent: {
    paddingBottom: 16,
  },
  projectDetailPanel: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dbe7dc',
    paddingTop: 12,
    gap: 8,
  },
  projectDetailText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#0f172a',
  },
  eventSectionTitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  eventEmptyCard: {
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  eventEmptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
  },
  eventItem: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe7dc',
    padding: 12,
    marginTop: 6,
  },
  eventItemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  eventItemCopy: {
    flex: 1,
  },
  eventItemTitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  eventItemMeta: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  eventAddress: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 17,
    color: '#64748b',
  },
  eventPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  eventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f8fbf8',
    borderWidth: 1,
    borderColor: '#dbe7dc',
  },
  eventPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
});
