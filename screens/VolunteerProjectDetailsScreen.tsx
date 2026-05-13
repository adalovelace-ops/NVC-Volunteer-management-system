import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getProject,
  getVolunteerByUserId,
  getVolunteerProjectMatches,
  getVolunteerTimeLogs,
  startVolunteerTimeLog,
  subscribeToStorageChanges,
} from '../models/storage';
import { Project, Volunteer, VolunteerProjectMatch, VolunteerTimeLog } from '../models/types';
import { getProjectDisplayStatus, getProjectStatusColor } from '../utils/projectStatus';
import { getRequestErrorMessage } from '../utils/requestErrors';
import { pickImageFromDevice } from '../utils/media';

const PROGRAM_IMAGE_BY_CATEGORY: Record<Project['category'], ImageSourcePropType> = {
  Nutrition: require('../assets/programs/nutrition.jpg'),
  Education: require('../assets/programs/education.jpg'),
  Livelihood: require('../assets/programs/livelihood.jpg'),
  Disaster: require('../assets/programs/mingo-relief.jpg'),
};

function getProjectImageSource(project: Project): ImageSourcePropType {
  if (!project.imageHidden && project.imageUrl) {
    return { uri: project.imageUrl };
  }
  return PROGRAM_IMAGE_BY_CATEGORY[project.programModule || project.category];
}

function getLocalDateKey(value?: string, now: Date = new Date()): string {
  const date = value ? new Date(value) : now;
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(now);
    const month = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return `${fallback.getFullYear()}-${month}-${day}`;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isVolunteerAssignedToTask(
  task: { assignedVolunteerId?: string; assignedVolunteerIds?: string[] },
  volunteerId?: string | null
): boolean {
  if (!volunteerId) {
    return false;
  }

  const assignedVolunteerIds = Array.from(
    new Set(
      [
        ...(Array.isArray(task.assignedVolunteerIds) ? task.assignedVolunteerIds : []),
        task.assignedVolunteerId,
      ]
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )
  );

  return assignedVolunteerIds.includes(volunteerId);
}

function hasEventStartedForToday(startValue?: string, now: Date = new Date()): boolean {
  if (!startValue) {
    return true;
  }

  const startDate = new Date(startValue);
  if (Number.isNaN(startDate.getTime())) {
    return true;
  }

  const attendanceStart = new Date(startDate);
  attendanceStart.setHours(9, 0, 0, 0);
  return now >= attendanceStart;
}

function hasEventEndedForToday(endValue?: string, now: Date = new Date()): boolean {
  if (!endValue) {
    return false;
  }

  const endDate = new Date(endValue);
  if (Number.isNaN(endDate.getTime())) {
    return false;
  }

  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);
  return now > endOfDay;
}

export default function VolunteerProjectDetailsScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const { user } = useAuth();
  const projectId = route?.params?.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [volunteerProfile, setVolunteerProfile] = useState<Volunteer | null>(null);
  const [volunteerMatches, setVolunteerMatches] = useState<VolunteerProjectMatch[]>([]);
  const [timeLogs, setTimeLogs] = useState<VolunteerTimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [activeTimeLog, setActiveTimeLog] = useState<VolunteerTimeLog | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const handleBackToProgramSuite = useCallback(() => {
    navigation.navigate('Projects');
  }, [navigation]);

  const loadData = useCallback(async () => {
    if (!projectId || !user?.id) return;
    const shouldShowBlockingLoader = !hasLoadedOnceRef.current;

    try {
      if (shouldShowBlockingLoader) {
        setLoading(true);
      }
      const [projectData, volunteerData] = await Promise.all([
        getProject(projectId),
        getVolunteerByUserId(user.id).catch(() => null),
      ]);

      setProject(projectData);
      setVolunteerProfile(volunteerData);

      const [matches, volunteerLogs] = volunteerData
        ? await Promise.all([
            getVolunteerProjectMatches(volunteerData.id).catch(() => []),
            getVolunteerTimeLogs(volunteerData.id).catch(() => []),
          ])
        : [[], []];

      setVolunteerMatches(matches);

      const projectTimeLogs = volunteerLogs.filter(log => log.projectId === projectId);
      setTimeLogs(projectTimeLogs);

      const todayKey = getLocalDateKey();
      const active = projectTimeLogs.find(
        log => getLocalDateKey(log.attendanceConfirmedAt || log.timeIn) === todayKey
      );
      setActiveTimeLog(active || null);
      hasLoadedOnceRef.current = true;
    } catch (error) {
      console.error('Error loading project details:', error);
    } finally {
      if (shouldShowBlockingLoader) {
        setLoading(false);
      }
    }
  }, [projectId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return subscribeToStorageChanges(
        ['projects', 'volunteerMatches', 'volunteerTimeLogs'],
        loadData
      );
    }, [loadData])
  );

  const handleStartTimeLog = async () => {
    if (!user?.id || !project || !volunteerProfile) return;

    try {
      setLoadingAction('startTime');
      const attendancePhoto = await pickImageFromDevice();
      if (!attendancePhoto) {
        setLoadingAction(null);
        return;
      }

      const timeLog = await startVolunteerTimeLog(
        volunteerProfile.id,
        project.id,
        undefined,
        attendancePhoto
      );
      setActiveTimeLog(timeLog);
      setTimeLogs((prev) => [...prev, timeLog]);
      Alert.alert('Success', 'Attendance confirmed for today.');
    } catch (error) {
      Alert.alert(
        'Error',
        getRequestErrorMessage(error, 'Unable to confirm attendance.')
      );
    } finally {
      setLoadingAction(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialIcons name="folder-open" size={48} color="#ccc" />
          <Text style={styles.errorText}>Project not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToProgramSuite}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentMatch = volunteerMatches.find((m) => m.projectId === project.id);
  const isAssignedToTask = Boolean(
    volunteerProfile &&
      (project.internalTasks || []).some(task => isVolunteerAssignedToTask(task, volunteerProfile.id))
  );
  const isJoined =
    !!currentMatch ||
    Boolean(volunteerProfile && project.volunteers.includes(volunteerProfile.id)) ||
    isAssignedToTask;
  const isPending = currentMatch?.status === 'Requested';
  const isEventRecord = Boolean(project.isEvent);
  const eventHasStarted = hasEventStartedForToday(project.startDate);
  const eventHasEnded =
    hasEventEndedForToday(project.endDate || project.startDate) ||
    getProjectDisplayStatus(project) === 'Completed' ||
    getProjectDisplayStatus(project) === 'Cancelled';
  const canConfirmAttendance =
    isEventRecord && isJoined && !isPending && isAssignedToTask && !activeTimeLog && eventHasStarted && !eventHasEnded;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackToProgramSuite}
            style={styles.headerButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEventRecord ? 'Event Details' : 'Project Details'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Project Image */}
        <Image
          source={getProjectImageSource(project)}
          style={styles.projectImage}
        />

        {/* Project Info */}
        <View style={styles.content}>
          <Text style={styles.projectTitle}>{project.title}</Text>

          {/* Status Badge */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getProjectStatusColor(project),
                },
              ]}
            >
              <Text style={styles.statusText}>
                {getProjectDisplayStatus(project)}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionText}>{project.description}</Text>
          </View>

          {/* Date & Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>

            <View style={styles.detailRow}>
              <MaterialIcons name="calendar-today" size={20} color="#4CAF50" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {project.startDate && project.endDate
                    ? `${format(new Date(project.startDate), 'MMM d, yyyy')} - ${format(
                        new Date(project.endDate),
                        'MMM d, yyyy'
                      )}`
                    : 'Date to be announced'}
                </Text>
              </View>
            </View>

            {project.location?.address && (
              <View style={styles.detailRow}>
                <MaterialIcons name="location-on" size={20} color="#4CAF50" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{project.location.address}</Text>
                </View>
              </View>
            )}

            {project.volunteersNeeded && (
              <View style={styles.detailRow}>
                <MaterialIcons name="people" size={20} color="#4CAF50" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Volunteers Needed</Text>
                  <Text style={styles.detailValue}>{project.volunteersNeeded}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Daily Attendance */}
          {isEventRecord && isJoined && !isPending && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Attendance</Text>

              {activeTimeLog ? (
                <View style={styles.timeLogActive}>
                  <MaterialIcons
                    name="verified-user"
                    size={24}
                    color="#166534"
                  />
                  <View style={styles.timeLogContent}>
                    <Text style={styles.timeLogStatus}>Attendance already confirmed today</Text>
                    <Text style={styles.timeLogTime}>
                      Confirmed at {format(new Date(activeTimeLog.attendanceConfirmedAt || activeTimeLog.timeIn), 'h:mm a')}
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.timeLogStartButton}
                  onPress={handleStartTimeLog}
                  disabled={loadingAction === 'startTime' || !canConfirmAttendance}
                >
                  <MaterialIcons name="photo-camera" size={20} color="#fff" />
                  <Text style={styles.timeLogStartButtonText}>
                    {loadingAction === 'startTime'
                      ? 'Confirming...'
                      : !isAssignedToTask
                      ? 'Task Assignment Required'
                      : !eventHasStarted
                      ? 'Available at 9:00 AM'
                      : eventHasEnded
                      ? 'Attendance Closed'
                      : 'Confirm Attendance'}
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.timeLogTime}>
                {!isAssignedToTask
                  ? 'You need an assigned event task before attendance opens.'
                  : !eventHasStarted
                  ? 'Attendance opens at 9:00 AM on the event start date.'
                  : eventHasEnded
                  ? 'Attendance is closed because the event already ended.'
                  : activeTimeLog
                  ? 'Your attendance is already recorded for today.'
                  : 'Upload your on-site photo to confirm attendance for today.'}
              </Text>

              {timeLogs.length > 0 && (
                <View style={styles.timeLogsHistory}>
                  <Text style={styles.timeLogsHistoryTitle}>
                    Attendance history ({timeLogs.length} {timeLogs.length === 1 ? 'record' : 'records'})
                  </Text>
                  {timeLogs.map((log) => (
                    <View key={log.id} style={styles.timeLogEntry}>
                      <Text style={styles.timeLogEntryDate}>
                        {format(new Date(log.attendanceConfirmedAt || log.timeIn), 'MMM d, h:mm a')}
                      </Text>
                      <Text style={styles.timeLogEntryDuration}>
                        {log.attendanceCheckedAt
                          ? `Checked by admin on ${format(new Date(log.attendanceCheckedAt), 'MMM d, h:mm a')}`
                          : 'Waiting for admin review'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {isEventRecord ? (
            <View style={styles.projectNoticeCard}>
              <MaterialIcons
                name={isJoined ? 'check-circle-outline' : 'event-available'}
                size={18}
                color="#166534"
              />
              <Text style={styles.projectNoticeText}>
                {isPending
                  ? 'Your event join request is pending admin approval.'
                  : isJoined
                    ? 'You already joined this event. Use the attendance section here to confirm your presence each day after 9:00 AM.'
                    : 'Join this event from the volunteer event list.'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.projectNoticeCard}>
              <MaterialIcons name="info-outline" size={18} color="#166534" />
              <Text style={styles.projectNoticeText}>
                Volunteers can join events only. Open an event under this project to send a join request.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    padding: 6,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  projectImage: {
    width: '100%',
    height: 176,
  },
  content: {
    padding: 14,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statusRow: {
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#666',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  timeLogActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  timeLogContent: {
    flex: 1,
  },
  timeLogStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  timeLogTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  timeLogStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  timeLogStartButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timeLogsHistory: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
  },
  timeLogsHistoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  timeLogEntry: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeLogEntryDate: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  timeLogEntryDuration: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  projectNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 28,
  },
  projectNoticeText: {
    flex: 1,
    color: '#166534',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
});
