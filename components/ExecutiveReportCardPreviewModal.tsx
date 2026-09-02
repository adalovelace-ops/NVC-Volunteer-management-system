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
  Alert,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { Partner, PartnerReport, Project, Volunteer, VolunteerProjectJoinRecord, VolunteerTimeLog } from '../models/types';
import {
  buildExecutiveReportData,
  downloadExecutiveReportCardPdf,
  ExecutiveReportData,
} from '../utils/executiveReportCardHtml';

interface ExecutiveReportCardPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  projects: Project[];
  volunteers: Volunteer[];
  timeLogs: VolunteerTimeLog[];
  partners: Partner[];
  joinRecords: VolunteerProjectJoinRecord[];
  partnerReports?: PartnerReport[];
  currentUser?: { name?: string; role?: string };
  initialProjectId?: string;
}

export default function ExecutiveReportCardPreviewModal({
  visible,
  onClose,
  projects,
  volunteers,
  timeLogs,
  partners,
  joinRecords,
  partnerReports = [],
  currentUser,
  initialProjectId = 'all',
}: ExecutiveReportCardPreviewModalProps) {
  const { width } = useWindowDimensions();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q2 2026');
  const [isDownloading, setIsDownloading] = useState(false);

  // Sync initialProjectId when visible changes
  React.useEffect(() => {
    if (visible && initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [visible, initialProjectId]);

  // Compute live report data based on selections
  const reportData = useMemo(() => {
    return buildExecutiveReportData(
      selectedProjectId,
      selectedQuarter,
      projects,
      volunteers,
      timeLogs,
      partners,
      joinRecords,
      partnerReports,
      currentUser
    );
  }, [selectedProjectId, selectedQuarter, projects, volunteers, timeLogs, partners, joinRecords, partnerReports, currentUser]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadExecutiveReportCardPdf(reportData);
      if (Platform.OS === 'web') {
        // alert or notice
      } else {
        Alert.alert('Success', 'Executive Report Card PDF generated successfully!');
      }
    } catch (error: any) {
      Alert.alert('Download Error', error?.message || 'Unable to download executive report card PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!visible) {
    return null;
  }

  const isSmallScreen = width < 768;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, isSmallScreen && styles.modalCardMobile]}>
          
          {/* MODAL CONTROL HEADER */}
          <View style={styles.topControlBar}>
            <View style={styles.titleInfo}>
              <View style={styles.badgeRow}>
                <View style={styles.nvcLogoBadge}>
                  <MaterialIcons name="eco" size={16} color="#ffffff" />
                  <Text style={styles.nvcLogoBadgeText}>NVC Foundation</Text>
                </View>
                <Text style={styles.modalMainTitle}>Executive Report Card Preview</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Live system data generated into the official NVC quarterly report card format
              </Text>
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.downloadPrimaryBtn}
                onPress={handleDownload}
                disabled={isDownloading}
                activeOpacity={0.8}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                ) : (
                  <MaterialIcons name="download" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.downloadPrimaryBtnText}>
                  {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeIconButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>

          {/* PER-REPORT & QUARTER SELECTION TABS */}
          <View style={styles.selectorBar}>
            <View style={styles.selectorGroup}>
              <Text style={styles.selectorLabel}>Select Report / Program:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                <TouchableOpacity
                  style={[styles.projectChip, selectedProjectId === 'all' && styles.projectChipActive]}
                  onPress={() => setSelectedProjectId('all')}
                >
                  <MaterialIcons
                    name="stars"
                    size={14}
                    color={selectedProjectId === 'all' ? '#ffffff' : '#166534'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.projectChipText, selectedProjectId === 'all' && styles.projectChipTextActive]}>
                    Overall Quarterly Impact
                  </Text>
                </TouchableOpacity>

                {projects.slice(0, 8).map(project => {
                  const isSelected = selectedProjectId === project.id;
                  return (
                    <TouchableOpacity
                      key={project.id}
                      style={[styles.projectChip, isSelected && styles.projectChipActive]}
                      onPress={() => setSelectedProjectId(project.id)}
                    >
                      <MaterialIcons
                        name={project.isEvent ? 'event' : 'folder'}
                        size={14}
                        color={isSelected ? '#ffffff' : '#475569'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[styles.projectChipText, isSelected && styles.projectChipTextActive]}
                        numberOfLines={1}
                      >
                        {project.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.quarterGroup}>
              {['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'].map(q => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quarterChip, selectedQuarter === q && styles.quarterChipActive]}
                  onPress={() => setSelectedQuarter(q)}
                >
                  <Text style={[styles.quarterChipText, selectedQuarter === q && styles.quarterChipTextActive]}>
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* PREVIEW CONTAINER - SCROLLABLE EXECUTIVE CARD */}
          <ScrollView
            style={styles.cardScrollView}
            contentContainerStyle={styles.cardScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.executiveCardPaper}>
              
              {/* CARD HEADER */}
              <View style={styles.cardHeader}>
                <View style={styles.brandRow}>
                  {/* Shamrock Clover Emblem */}
                  <View style={styles.cloverIconBox}>
                    <MaterialIcons name="eco" size={32} color="#16a34a" />
                  </View>
                  <View>
                    <View style={styles.nvcBrandTextWrap}>
                      <Text style={styles.nvcBrandMain}>nvc</Text>
                      <Text style={styles.nvcBrandFoundation}>FOUNDATION</Text>
                    </View>
                    <Text style={styles.nvcBrandSub}>Measuring Success</Text>
                  </View>
                </View>

                <View style={styles.quarterHeaderBox}>
                  <Text style={styles.quarterTitleText}>QUARTERLY REPORT</Text>
                  <View style={styles.quarterPillBadge}>
                    <Text style={styles.quarterPillText}>{reportData.quarterLabel}</Text>
                  </View>
                </View>
              </View>

              {/* PROGRAM TITLE & HERO BANNER */}
              <View style={styles.titleAndHeroSection}>
                <View style={styles.titleDetailsCol}>
                  <Text style={styles.programCatText}>{reportData.programCategory}</Text>
                  <Text style={styles.programTitleText}>{reportData.reportTitle}</Text>

                  {/* Metadata Row */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <View style={styles.metaIconWrap}>
                        <MaterialIcons name="event" size={16} color="#166534" />
                      </View>
                      <View>
                        <Text style={styles.metaSmallLabel}>Reporting Period</Text>
                        <Text style={styles.metaBoldVal}>{reportData.reportingPeriod}</Text>
                      </View>
                    </View>

                    <View style={styles.metaItem}>
                      <View style={styles.metaIconWrap}>
                        <MaterialIcons name="schedule" size={16} color="#166534" />
                      </View>
                      <View>
                        <Text style={styles.metaSmallLabel}>Submitted On</Text>
                        <Text style={styles.metaBoldVal}>{reportData.submittedOn}</Text>
                      </View>
                    </View>

                    <View style={styles.metaItem}>
                      <View style={styles.metaIconWrap}>
                        <MaterialIcons name="person" size={16} color="#166534" />
                      </View>
                      <View>
                        <Text style={styles.metaSmallLabel}>Submitted By</Text>
                        <Text style={styles.metaBoldVal}>{reportData.submittedBy}</Text>
                        <Text style={styles.metaSubRole}>{reportData.submitterRole}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Hero Image */}
                <View style={styles.heroImageWrapper}>
                  <Image
                    source={{ uri: reportData.heroImageUrl }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                </View>
              </View>

              {/* 5 METRIC CARDS ROW */}
              <View style={styles.metricsGridRow}>
                {/* 1. Total Projects */}
                <View style={styles.statMetricCard}>
                  <View style={styles.statHeader}>
                    <MaterialIcons name="folder" size={16} color="#166534" />
                    <Text style={styles.statHeaderTitle}>Total Projects</Text>
                  </View>
                  <Text style={styles.statNumberText}>{reportData.totalProjects}</Text>
                  <Text style={styles.statDeltaText}>{reportData.totalProjectsDelta} ↗</Text>
                </View>

                {/* 2. Skills Contributed */}
                <View style={styles.statMetricCard}>
                  <View style={styles.statHeader}>
                    <MaterialIcons name="psychology" size={16} color="#166534" />
                    <Text style={styles.statHeaderTitle}>Skills Contributed</Text>
                  </View>
                  <Text style={styles.statNumberText}>{reportData.skillsContributed}</Text>
                  <Text style={styles.statDeltaText}>{reportData.skillsDelta} ↗</Text>
                </View>

                {/* 3. Events Conducted */}
                <View style={styles.statMetricCard}>
                  <View style={styles.statHeader}>
                    <MaterialIcons name="event-available" size={16} color="#166534" />
                    <Text style={styles.statHeaderTitle}>Events Conducted</Text>
                  </View>
                  <Text style={styles.statNumberText}>{reportData.eventsConducted}</Text>
                  <Text style={styles.statDeltaText}>{reportData.eventsDelta} ↗</Text>
                </View>

                {/* 4. Sectors Partner (Donut Simulation) */}
                <View style={[styles.statMetricCard, styles.donutMetricCard]}>
                  <Text style={[styles.statHeaderTitle, { textAlign: 'center', marginBottom: 4 }]}>
                    Sectors Partner
                  </Text>
                  <View style={styles.donutRowContent}>
                    <View style={styles.mockDonutCircle}>
                      <View style={styles.mockDonutHole}>
                        <Text style={styles.mockDonutCenterText}>100%</Text>
                      </View>
                    </View>
                    <View style={styles.donutLegendList}>
                      {reportData.sectorSlices.map(s => (
                        <View key={s.label} style={styles.donutLegendItem}>
                          <View style={[styles.donutDot, { backgroundColor: s.color }]} />
                          <Text style={styles.donutLegendText} numberOfLines={1}>
                            {s.label} <Text style={{ fontWeight: '800', color: '#0f172a' }}>{s.percentage}%</Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* 5. Volunteers Involved */}
                <View style={styles.statMetricCard}>
                  <View style={styles.statHeader}>
                    <MaterialIcons name="groups" size={16} color="#166534" />
                    <Text style={styles.statHeaderTitle}>Volunteers Involved</Text>
                  </View>
                  <Text style={styles.statNumberText}>{reportData.volunteersInvolved}</Text>
                  <Text style={styles.statDeltaText}>{reportData.volunteersDelta} ↗</Text>
                </View>
              </View>

              {/* IMPACT & ASSESSMENT SECTION (BAR CHART) */}
              <View style={styles.impactAssessmentSection}>
                <View style={styles.impactHeaderRow}>
                  <View style={styles.loveDeliversBadge}>
                    <Text style={styles.loveDeliversMain}>LOVE DELIVERS</Text>
                    <View style={styles.loveDeliversDivider} />
                    <Text style={styles.loveDeliversSub}>Measuring Success</Text>
                  </View>
                  <Text style={styles.impactTitleText}>
                    {reportData.impactTitle}
                  </Text>
                </View>

                {/* Legend Row */}
                <View style={styles.chartLegendRow}>
                  <View style={styles.legendEntry}>
                    <View style={[styles.legendBox, { backgroundColor: '#86efac' }]} />
                    <Text style={styles.legendEntryText}>Hit Target</Text>
                  </View>
                  <View style={styles.legendEntry}>
                    <View style={[styles.legendBox, { backgroundColor: '#15803d' }]} />
                    <Text style={styles.legendEntryText}>Improved but below target</Text>
                  </View>
                  <View style={styles.legendEntry}>
                    <View style={[styles.legendBox, { backgroundColor: '#94a3b8' }]} />
                    <Text style={styles.legendEntryText}>No Improvement</Text>
                  </View>
                </View>

                {/* Chart & Result Summary Grid */}
                <View style={styles.chartAndResultGrid}>
                  {/* Bar Chart Area */}
                  <View style={styles.barsContainerRow}>
                    {reportData.impactLocations.map(loc => {
                      const hHit = Math.max(12, (loc.hitTarget / 100) * 110);
                      const hImp = Math.max(12, (loc.improved / 100) * 110);
                      const hNo = Math.max(6, (loc.noImprovement / 100) * 110);

                      return (
                        <View key={loc.location} style={styles.barLocationColumn}>
                          <View style={styles.threeBarsWrap}>
                            <View style={styles.barItemWrap}>
                              <Text style={styles.barValueText}>{loc.hitTarget}%</Text>
                              <View style={[styles.barShape, { height: hHit, backgroundColor: '#86efac' }]} />
                            </View>
                            <View style={styles.barItemWrap}>
                              <Text style={styles.barValueText}>{loc.improved}%</Text>
                              <View style={[styles.barShape, { height: hImp, backgroundColor: '#15803d' }]} />
                            </View>
                            <View style={styles.barItemWrap}>
                              <Text style={styles.barValueText}>{loc.noImprovement}%</Text>
                              <View style={[styles.barShape, { height: hNo, backgroundColor: '#94a3b8' }]} />
                            </View>
                          </View>
                          <Text style={styles.barLocationTitle}>{loc.location}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Overall Result Box */}
                  <View style={styles.overallResultCard}>
                    <View style={styles.overallResultHeader}>
                      <Text style={styles.overallResultHeaderText}>Overall Result</Text>
                    </View>
                    <View style={styles.overallResultBody}>
                      <View style={styles.resultMetricRow}>
                        <Text style={styles.resultBigNumber}>{reportData.overallResult.hitTarget}%</Text>
                        <Text style={styles.resultMetricLabel}>Hit Target</Text>
                      </View>
                      <View style={styles.resultMetricRow}>
                        <Text style={styles.resultBigNumber}>{reportData.overallResult.improved}%</Text>
                        <Text style={styles.resultMetricLabel}>Improved but below target</Text>
                      </View>
                      <View style={styles.resultMetricRow}>
                        <Text style={styles.resultBigNumber}>{reportData.overallResult.noImprovement}%</Text>
                        <Text style={styles.resultMetricLabel}>No improvement</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Text style={styles.footnoteText}>{reportData.impactFootnote}</Text>
              </View>

              {/* SPLIT SECTION: HIGHLIGHTS & DOCUMENTS */}
              <View style={styles.splitCardsRow}>
                {/* Project Highlights */}
                <View style={styles.splitCardBox}>
                  <View style={styles.splitCardHeader}>
                    <MaterialIcons name="stars" size={18} color="#166534" style={{ marginRight: 6 }} />
                    <Text style={styles.splitCardTitle}>Project Highlights</Text>
                  </View>
                  <View style={styles.highlightsList}>
                    {reportData.highlights.map((item, idx) => (
                      <View key={idx} style={styles.highlightBulletRow}>
                        <View style={styles.checkCircle}>
                          <MaterialIcons name="check" size={12} color="#ffffff" />
                        </View>
                        <Text style={styles.highlightItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Report Documents */}
                <View style={styles.splitCardBox}>
                  <View style={styles.splitCardHeader}>
                    <MaterialIcons name="description" size={18} color="#166534" style={{ marginRight: 6 }} />
                    <Text style={styles.splitCardTitle}>Report Documents</Text>
                  </View>
                  <View style={styles.docsList}>
                    {reportData.documents.map((doc, idx) => (
                      <View key={idx} style={styles.docItemCard}>
                        <View style={[styles.docTypeBadge, doc.type === 'pdf' ? styles.pdfBadge : styles.excelBadge]}>
                          <Text style={styles.docTypeBadgeText}>{doc.type === 'pdf' ? 'PDF' : 'X'}</Text>
                        </View>
                        <View style={styles.docDetailsCol}>
                          <Text style={styles.docNameText} numberOfLines={1}>{doc.title}</Text>
                          <Text style={styles.docSizeText}>{doc.size}</Text>
                        </View>
                        <TouchableOpacity style={styles.docDownloadIconBtn} onPress={handleDownload}>
                          <MaterialIcons name="arrow-downward" size={16} color="#0f172a" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* VOLUNTEER PHOTO GALLERY */}
              <View style={styles.photosSection}>
                <View style={styles.photosHeaderRow}>
                  <View style={styles.photoSectionTitleWrap}>
                    <MaterialIcons name="photo-camera" size={18} color="#166534" style={{ marginRight: 6 }} />
                    <Text style={styles.photoSectionTitle}>Photos from Volunteers Report</Text>
                  </View>
                  <View style={styles.viewAllPhotosPill}>
                    <MaterialIcons name="collections" size={14} color="#334155" style={{ marginRight: 4 }} />
                    <Text style={styles.viewAllPhotosText}>
                      View All Photos ({reportData.photos.reduce((sum, p) => sum + p.photoCount, 0)})
                    </Text>
                  </View>
                </View>

                <View style={styles.photosGrid}>
                  {reportData.photos.map(photo => (
                    <View key={photo.id} style={styles.photoThumbCard}>
                      <Image source={{ uri: photo.imageUrl }} style={styles.photoThumbImg} />
                      <View style={styles.photoOverlayGradient}>
                        <Text style={styles.photoDateText}>{photo.date}</Text>
                        <Text style={styles.photoSubmitterText} numberOfLines={1}>{photo.submitterName}</Text>
                      </View>
                      <View style={styles.photoCountBadge}>
                        <Text style={styles.photoCountText}>{photo.photoCount} photos</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* FOOTER BAR */}
              <View style={styles.cardFooterBar}>
                <View style={styles.footerContactsRow}>
                  <Text style={styles.footerContactItem}>🌐 nvcfoundation-ph.org</Text>
                  <Text style={styles.footerContactItem}>✉️ info@nvcfoundation-ph.org</Text>
                  <Text style={styles.footerContactItem}>📞 (034) 703 6781</Text>
                </View>
                <Text style={styles.footerMottoText}>LOVE DELIVERS. CHANGE HAPPENS.</Text>
              </View>

            </View>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxWidth: 980,
    maxHeight: '94%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalCardMobile: {
    maxWidth: '100%',
    borderRadius: 14,
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexWrap: 'wrap',
    gap: 10,
  },
  titleInfo: {
    flex: 1,
    minWidth: 260,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nvcLogoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#166534',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  nvcLogoBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  modalMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  downloadPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#166534',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  downloadPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectorGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 320,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  projectChipActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  projectChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  projectChipTextActive: {
    color: '#ffffff',
  },
  quarterGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  quarterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quarterChipActive: {
    backgroundColor: '#14532d',
    borderColor: '#14532d',
  },
  quarterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  quarterChipTextActive: {
    color: '#ffffff',
  },
  cardScrollView: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  cardScrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  executiveCardPaper: {
    width: '100%',
    maxWidth: 880,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  // CARD HEADER
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cloverIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nvcBrandTextWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  nvcBrandMain: {
    fontSize: 22,
    fontWeight: '900',
    color: '#14532d',
  },
  nvcBrandFoundation: {
    fontSize: 16,
    fontWeight: '400',
    color: '#14532d',
    letterSpacing: 0.5,
  },
  nvcBrandSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  quarterHeaderBox: {
    alignItems: 'flex-end',
  },
  quarterTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#14532d',
    letterSpacing: 0.5,
  },
  quarterPillBadge: {
    marginTop: 4,
    backgroundColor: '#166534',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 20,
  },
  quarterPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  // TITLE & HERO
  titleAndHeroSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 18,
    gap: 20,
  },
  titleDetailsCol: {
    flex: 1,
  },
  programCatText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#166534',
  },
  programTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaSmallLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  metaBoldVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  metaSubRole: {
    fontSize: 9,
    color: '#64748b',
  },
  heroImageWrapper: {
    width: 230,
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  // METRICS ROW
  metricsGridRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexWrap: 'wrap',
  },
  statMetricCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  statNumberText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginVertical: 4,
  },
  statDeltaText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#166534',
  },
  donutMetricCard: {
    minWidth: 160,
  },
  donutRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  mockDonutCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 7,
    borderColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockDonutHole: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockDonutCenterText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#166534',
  },
  donutLegendList: {
    flex: 1,
    gap: 2,
  },
  donutLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  donutDot: {
    width: 5,
    height: 5,
    borderRadius: 2,
  },
  donutLegendText: {
    fontSize: 8.5,
    color: '#475569',
  },
  // IMPACT ASSESSMENT
  impactAssessmentSection: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
  },
  impactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  loveDeliversBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  loveDeliversMain: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  loveDeliversDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  loveDeliversSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ffffff',
  },
  impactTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    flex: 1,
  },
  chartLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  legendEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendBox: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendEntryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  chartAndResultGrid: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-end',
  },
  barsContainerRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
  },
  barLocationColumn: {
    alignItems: 'center',
    flex: 1,
  },
  threeBarsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 115,
  },
  barItemWrap: {
    alignItems: 'center',
    gap: 2,
  },
  barValueText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#334155',
  },
  barShape: {
    width: 12,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barLocationTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  overallResultCard: {
    width: 130,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  overallResultHeader: {
    backgroundColor: '#166534',
    paddingVertical: 4,
    alignItems: 'center',
  },
  overallResultHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  overallResultBody: {
    padding: 8,
    gap: 6,
    alignItems: 'center',
  },
  resultMetricRow: {
    alignItems: 'center',
  },
  resultBigNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  resultMetricLabel: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  footnoteText: {
    fontSize: 8.5,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
  },
  // SPLIT SECTION
  splitCardsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexWrap: 'wrap',
  },
  splitCardBox: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
  },
  splitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  splitCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  highlightsList: {
    gap: 8,
  },
  highlightBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  highlightItemText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 14,
    color: '#334155',
    fontWeight: '500',
  },
  docsList: {
    gap: 8,
  },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 8,
    gap: 8,
  },
  docTypeBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBadge: {
    backgroundColor: '#dc2626',
  },
  excelBadge: {
    backgroundColor: '#16a34a',
  },
  docTypeBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  docDetailsCol: {
    flex: 1,
  },
  docNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  docSizeText: {
    fontSize: 9,
    color: '#64748b',
  },
  docDownloadIconBtn: {
    padding: 4,
  },
  // PHOTOS SECTION
  photosSection: {
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  photosHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoSectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  viewAllPhotosPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ffffff',
  },
  viewAllPhotosText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  photoThumbCard: {
    flex: 1,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  photoOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  photoDateText: {
    fontSize: 7.5,
    color: '#cbd5e1',
  },
  photoSubmitterText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  photoCountText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  // FOOTER BAR
  cardFooterBar: {
    backgroundColor: '#14532d',
    paddingHorizontal: 24,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  footerContactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  footerContactItem: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '600',
  },
  footerMottoText: {
    color: '#86efac',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
