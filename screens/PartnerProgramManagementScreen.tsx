import React, { useCallback, useMemo, useState } from 'react';
import ModernTheme from '../utils/modernTheme';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getProgramModuleFromProposalProjectId,
  getPartnerDashboardSnapshot,
  subscribeToStorageChanges,
} from '../models/storage';
import {
  AdvocacyFocus,
  PartnerProjectApplication,
  Project,
  Partner,
  AdminPlanningCalendar,
  AdminPlanningItem,
} from '../models/types';
import ProjectTimelineCalendarCard from '../components/ProjectTimelineCalendarCard';
import { getProjectDisplayStatus, getProjectStatusColor } from '../utils/projectStatus';
import { getPrimaryProjectImageSource } from '../utils/projectMap';
import { isAbortLikeError } from '../utils/requestErrors';
import { format } from 'date-fns';

type ProgramCardConfig = {
  id: string;
  title: string;
  module: AdvocacyFocus;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
};

function getAdvocacyFocusFromText(value?: string): AdvocacyFocus | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('nutrition')) return 'Nutrition';
  if (normalized.includes('education')) return 'Education';
  if (normalized.includes('livelihood')) return 'Livelihood';
  if (normalized.includes('disaster')) return 'Disaster';
  return null;
}

function getProgramModule(program: Project): AdvocacyFocus | null {
  return (
    getAdvocacyFocusFromText(program.programModule) ||
    getAdvocacyFocusFromText(program.id) ||
    getAdvocacyFocusFromText(program.title) ||
    getAdvocacyFocusFromText(program.category)
  );
}

function getProgramIcon(module: AdvocacyFocus): keyof typeof MaterialIcons.glyphMap {
  if (module === 'Nutrition') return 'restaurant';
  if (module === 'Education') return 'school';
  if (module === 'Livelihood') return 'work';
  return 'warning';
}

function getProgramAccent(module: AdvocacyFocus): string {
  if (module === 'Nutrition') return '#dc2626';
  if (module === 'Education') return '#2563eb';
  if (module === 'Livelihood') return '#7c3aed';
  return '#ea580c';
}

const CATEGORY_TABS: Array<'All' | AdvocacyFocus> = ['All', 'Nutrition', 'Education', 'Livelihood', 'Disaster'];

const TOP_LEVEL_WRAPPER_IDS = new Set([
  'nutrition',
  'education',
  'livelihood',
  'disaster',
  'program-nutrition',
  'program-education',
  'program-livelihood',
  'program-disaster',
]);

export default function PartnerProgramManagementScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [programs, setPrograms] = useState<Project[]>([]);
  const [partnerApplications, setPartnerApplications] = useState<PartnerProjectApplication[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [planningCalendars, setPlanningCalendars] = useState<AdminPlanningCalendar[]>([]);
  const [planningItems, setPlanningItems] = useState<AdminPlanningItem[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'All' | AdvocacyFocus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailModalProject, setDetailModalProject] = useState<Project | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const isDesktop = screenWidth >= 800;

  const loadData = useCallback(async (showRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      const snapshot = await getPartnerDashboardSnapshot();
      setPrograms(
        (snapshot.programs || []).filter(program => !program.isEvent && !program.parentProjectId)
      );
      setPartnerApplications(
        (snapshot.partnerApplications || []).filter(application => application.partnerUserId === user.id)
      );
      setAllProjects(snapshot.projects || []);
      setPlanningCalendars(snapshot.adminPlanningCalendars || []);
      setPlanningItems(snapshot.adminPlanningItems || []);

      const owned = (snapshot.partners || []).find((p: Partner) =>
        p.ownerUserId === user.id || p.contactEmail?.toLowerCase() === user.email?.toLowerCase()
      );
      setPartner(owned || null);
    } catch (error) {
      if (!isAbortLikeError(error)) {
        console.error('PartnerProgramManagementScreen loadData error:', error);
      }
    } finally {
      setLoading(false);
      if (showRefresh) {
        setRefreshing(false);
      }
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
      return subscribeToStorageChanges(['projects', 'programs', 'partnerProjectApplications'], () => {
        void loadData();
      });
    }, [loadData])
  );

  const partnerProjectsAndEvents = useMemo(() => {
    if (!partner) return [];
    return allProjects.filter(project => {
      if (project.partnerId === partner.id) {
        return true;
      }
      if (project.isEvent && project.parentProjectId) {
        const parent = allProjects.find(p => p.id === project.parentProjectId);
        return parent?.partnerId === partner.id;
      }
      return false;
    });
  }, [allProjects, partner]);

  // Actual projects from database/storage
  const availableProjects = useMemo(() => {
    return allProjects
      .filter(project => {
        if (project.isEvent) return false;
        const normId = String(project.id || '').trim().toLowerCase();
        if (TOP_LEVEL_WRAPPER_IDS.has(normId)) return false;
        return true;
      })
      .sort((left, right) => {
        const timeA = new Date(right.updatedAt || right.startDate || right.createdAt || 0).getTime();
        const timeB = new Date(left.updatedAt || left.startDate || left.createdAt || 0).getTime();
        return timeA - timeB;
      });
  }, [allProjects]);

  // Filter available projects based on category tab & search query
  const filteredProjects = useMemo(() => {
    return availableProjects.filter(project => {
      const module = getProgramModule(project);
      if (selectedCategoryTab !== 'All' && module !== selectedCategoryTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (project.title || '').toLowerCase().includes(q);
        const matchDesc = (project.description || '').toLowerCase().includes(q);
        const matchLoc = (project.location?.address || '').toLowerCase().includes(q);
        const matchSkills = (project.skillsNeeded || []).some(s => s.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchLoc && !matchSkills) {
          return false;
        }
      }
      return true;
    });
  }, [availableProjects, selectedCategoryTab, searchQuery]);

  const handleOpenProposal = (project: Project) => {
    const module = getProgramModule(project) || 'Nutrition';
    setDetailModalProject(null);
    navigation.navigate('Messages', {
      newProposalModule: module,
      newProposalProjectId: project.id,
      newProposalTitle: project.title,
    });
  };

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return 'Ongoing Initiative';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#166534" />
        <Text style={styles.loadingText}>Loading NVC Program Management...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header */}
      <View style={styles.heroBanner}>
        <View style={styles.heroTextWrap}>
          <View style={styles.heroTag}>
            <MaterialIcons name="handshake" size={14} color="#166534" />
            <Text style={styles.heroTagText}>Partner Collaboration Portal</Text>
          </View>
          <Text style={styles.heroTitle}>NVC Program Management</Text>
          <Text style={styles.heroSubtitle}>
            Explore active NVC advocacy initiatives, review scheduled community timelines, and submit proposals to co-lead or support impactful projects.
          </Text>
        </View>
      </View>

      {/* Available Projects Section */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>AVAILABLE PROJECTS</Text>
          <Text style={styles.sectionSubtitle}>
            Browse NVC's core programs across Nutrition, Education, Livelihood, and Disaster Relief
          </Text>
        </View>
      </View>

      {/* Category Filter Chips & Search */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
          {CATEGORY_TABS.map(tab => {
            const isSelected = selectedCategoryTab === tab;
            const accent = tab === 'All' ? '#166534' : getProgramAccent(tab);
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterTab,
                  isSelected && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => setSelectedCategoryTab(tab)}
              >
                {tab !== 'All' && (
                  <MaterialIcons
                    name={getProgramIcon(tab)}
                    size={14}
                    color={isSelected ? '#ffffff' : accent}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                  {tab === 'All' ? 'All Projects' : tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={18} color="#94a3b8" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects by name, location, or skill..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Project Cards Grid */}
      {filteredProjects.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialIcons name="folder-open" size={40} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No matching projects found</Text>
          <Text style={styles.emptyText}>Try changing your filter category or search keyword.</Text>
        </View>
      ) : (
        <View style={[styles.projectsGrid, isDesktop && styles.projectsGridDesktop]}>
          {filteredProjects.map(project => {
            const module = getProgramModule(project) || 'Nutrition';
            const accent = getProgramAccent(module);
            const iconName = getProgramIcon(module);
            const imageSource = getPrimaryProjectImageSource(project);
            const status = getProjectDisplayStatus(project);
            const statusColor = getProjectStatusColor(project);

            return (
              <View
                key={project.id}
                style={[styles.projectCard, isDesktop && styles.projectCardDesktop]}
              >
                {/* Header Banner / Image */}
                <View style={styles.cardHeaderWrap}>
                  {imageSource ? (
                    <Image source={imageSource} style={styles.cardHeaderImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cardHeaderGradient, { backgroundColor: accent }]}>
                      <MaterialIcons name={iconName} size={48} color="#ffffff" style={{ opacity: 0.85 }} />
                    </View>
                  )}

                  {/* Dark gradient overlay for text readability */}
                  <View style={styles.cardHeaderOverlay}>
                    <View style={styles.cardHeaderTopRow}>
                      <View style={[styles.moduleBadge, { backgroundColor: accent }]}>
                        <MaterialIcons name={iconName} size={12} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={styles.moduleBadgeText}>{module.toUpperCase()}</Text>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusBadgeText}>{status}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Card Body */}
                <View style={styles.cardBody}>
                  <Text style={styles.projectCardTitle} numberOfLines={2}>
                    {project.title}
                  </Text>

                  <Text style={styles.projectCardDescription} numberOfLines={3}>
                    {project.description || 'NVC community program initiative and development effort.'}
                  </Text>

                  {/* Info Metadata Grid */}
                  <View style={styles.cardMetaGrid}>
                    <View style={styles.metaRow}>
                      <MaterialIcons name="calendar-today" size={14} color="#64748b" style={styles.metaIcon} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {formatDateDisplay(project.startDate)}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <MaterialIcons name="place" size={14} color="#64748b" style={styles.metaIcon} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {project.location?.address || 'Negros Occidental'}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <MaterialIcons name="people" size={14} color="#64748b" style={styles.metaIcon} />
                      <Text style={styles.metaText}>
                        {project.volunteersNeeded ? `${project.volunteersNeeded} Volunteers Needed` : 'Open for Volunteers'}
                      </Text>
                    </View>

                    {Boolean(project.skillsNeeded?.length) && (
                      <View style={styles.metaRow}>
                        <MaterialIcons name="psychology" size={14} color="#64748b" style={styles.metaIcon} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {project.skillsNeeded?.join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() => setDetailModalProject(project)}
                    >
                      <Text style={styles.detailsButtonText}>Learn More</Text>
                      <MaterialIcons name="arrow-forward" size={14} color="#166534" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.proposalButton, { backgroundColor: accent }]}
                      onPress={() => handleOpenProposal(project)}
                    >
                      <MaterialIcons name="edit-note" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.proposalButtonText}>Submit Proposal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.sectionSpacer} />

      {/* Project & Event Calendar */}
      <Text style={styles.calendarSectionHeader}>PROJECT & EVENT TIMELINE CALENDAR</Text>
      <ProjectTimelineCalendarCard
        title="Program Calendar"
        subtitle="Review your active projects, scheduled events, and milestones."
        projects={partnerProjectsAndEvents.length ? partnerProjectsAndEvents : allProjects}
        planningCalendars={planningCalendars}
        planningItems={planningItems}
        accentColor="#166534"
        emptyText="No scheduled items yet."
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        hideSecondCalendar={true}
        onOpenProject={(projectId) => {
          const match = allProjects.find(p => p.id === projectId);
          if (match) {
            setDetailModalProject(match);
          }
        }}
      />

      {/* Project Detail Modal */}
      {detailModalProject && (
        <Modal
          visible={Boolean(detailModalProject)}
          transparent
          animationType="fade"
          onRequestClose={() => setDetailModalProject(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.detailModalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={[styles.moduleBadge, { backgroundColor: getProgramAccent(getProgramModule(detailModalProject) || 'Nutrition'), marginBottom: 6 }]}>
                    <MaterialIcons name={getProgramIcon(getProgramModule(detailModalProject) || 'Nutrition')} size={12} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.moduleBadgeText}>{(getProgramModule(detailModalProject) || 'Nutrition').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.detailModalTitle}>{detailModalProject.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setDetailModalProject(null)} style={styles.modalCloseBtn}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.detailModalDescription}>
                  {detailModalProject.description}
                </Text>

                <View style={styles.modalDetailGrid}>
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Status</Text>
                    <Text style={[styles.modalDetailValue, { color: getProjectStatusColor(detailModalProject) }]}>
                      {getProjectDisplayStatus(detailModalProject)}
                    </Text>
                  </View>

                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Location</Text>
                    <Text style={styles.modalDetailValue}>
                      {detailModalProject.location?.address || 'Negros Island, Philippines'}
                    </Text>
                  </View>

                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Volunteers Target</Text>
                    <Text style={styles.modalDetailValue}>
                      {detailModalProject.volunteersNeeded || 'Flexible requirement'}
                    </Text>
                  </View>

                  {Boolean(detailModalProject.skillsNeeded?.length) && (
                    <View style={styles.modalDetailItem}>
                      <Text style={styles.modalDetailLabel}>Key Skills & Expertise</Text>
                      <Text style={styles.modalDetailValue}>
                        {detailModalProject.skillsNeeded?.join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalFooterActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDetailModalProject(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { backgroundColor: getProgramAccent(getProgramModule(detailModalProject) || 'Nutrition') }]}
                  onPress={() => handleOpenProposal(detailModalProject)}
                >
                  <MaterialIcons name="handshake" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.modalPrimaryBtnText}>Partner With This Project</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    paddingBottom: 36,
    gap: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  heroBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTextWrap: {
    gap: 8,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
    marginBottom: 4,
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  filterBar: {
    gap: 12,
  },
  tabsScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    height: '100%',
  },
  projectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  projectsGridDesktop: {
    justifyContent: 'space-between',
  },
  projectCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  projectCardDesktop: {
    width: '48.8%',
  },
  cardHeaderWrap: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: '#1e293b',
  },
  cardHeaderImage: {
    width: '100%',
    height: '100%',
  },
  cardHeaderGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  cardHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  moduleBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  projectCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
  },
  projectCardDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
  },
  cardMetaGrid: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIcon: {
    width: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 4,
  },
  detailsButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  proposalButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#166534',
  },
  proposalButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  sectionSpacer: {
    height: 12,
  },
  calendarSectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: -6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  detailModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 540,
    maxHeight: '85%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalCloseBtn: {
    padding: 4,
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 26,
  },
  modalScroll: {
    marginVertical: 10,
  },
  detailModalDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 16,
  },
  modalDetailGrid: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 12,
  },
  modalDetailItem: {
    gap: 2,
  },
  modalDetailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  modalDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalPrimaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#166534',
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
