import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { PartnerProjectApplication, PartnerProjectProposalDetails } from '../models/types';

interface ProposalCardProps {
  application: PartnerProjectApplication;
  projectTitle: string;
  onPress?: () => void;
  onApprove?: (application: PartnerProjectApplication) => void;
  onReject?: (application: PartnerProjectApplication, notes: string) => void;
  onRequestRevision?: (application: PartnerProjectApplication, notes: string) => void;
  onEdit?: (application: PartnerProjectApplication) => void;
  compact?: boolean;
  isAdmin?: boolean;
  isVolunteer?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Approved': return '#166534';
    case 'Rejected': return '#dc2626';
    case 'Revision Requested':
    case 'Needs Revision': return '#d97706';
    case 'Resubmitted': return '#2563eb';
    case 'Pending':
    default: return '#f59e0b';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Approved': return 'check-circle';
    case 'Rejected': return 'cancel';
    case 'Revision Requested':
    case 'Needs Revision': return 'edit-note';
    case 'Resubmitted': return 'update';
    case 'Pending':
    default: return 'schedule';
  }
};

export default function ProposalCard({ application, projectTitle, onPress, onApprove, onReject, onRequestRevision, onEdit, compact = false, isAdmin = false, isVolunteer = false }: ProposalCardProps) {
  const navigation = useNavigation<any>();
  const [showModal, setShowModal] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isActing, setIsActing] = useState(false);

  const statusColor = getStatusColor(application.status);
  const statusIcon = getStatusIcon(application.status);
  const proposalDetails: Partial<PartnerProjectProposalDetails> = application.proposalDetails || {};
  const isReviewable = application.status === 'Pending' || application.status === 'Resubmitted';
  const isRevisionRequested = application.status === 'Revision Requested' || application.status === 'Needs Revision';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('Messages', { projectId: application.projectId, proposalId: application.id });
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsActing(true);
    try {
      await onApprove(application);
      setShowModal(false);
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    if (!rejectionNotes.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection.');
      return;
    }
    setIsActing(true);
    try {
      await onReject(application, rejectionNotes.trim());
      setShowModal(false);
      setShowRejectInput(false);
      setRejectionNotes('');
    } finally {
      setIsActing(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!onRequestRevision) return;
    if (!revisionNotes.trim()) {
      Alert.alert('Required', 'Please specify the changes or revisions requested.');
      return;
    }
    setIsActing(true);
    try {
      await onRequestRevision(application, revisionNotes.trim());
      setShowModal(false);
      setShowRevisionInput(false);
      setRevisionNotes('');
    } finally {
      setIsActing(false);
    }
  };

  const handleEditProposal = () => {
    setShowModal(false);
    if (onEdit) {
      onEdit(application);
    } else {
      navigation.navigate('Messages', {
        projectId: application.projectId,
        proposalId: application.id,
        newProposalModule: proposalDetails.requestedProgramModule,
        newProposalProjectId: proposalDetails.targetProjectId || application.projectId,
      });
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.card, compact && styles.cardCompact]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{projectTitle}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {application.partnerName} • {application.status}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setShowModal(false); setShowRejectInput(false); setShowRevisionInput(false); setRejectionNotes(''); setRevisionNotes(''); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{isVolunteer ? 'Task Details' : 'Proposal Details'}</Text>
                <Text style={styles.modalSubtitle}>{application.partnerName}</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowModal(false); setShowRejectInput(false); setShowRevisionInput(false); setRejectionNotes(''); setRevisionNotes(''); }} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                <MaterialIcons name={statusIcon as any} size={20} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>Status: {application.status}</Text>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailLabel}>Project Title</Text>
                  <Text style={styles.detailValue}>{projectTitle}</Text>
                </View>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailLabel}>Program Module</Text>
                  <Text style={styles.detailValue}>{proposalDetails.requestedProgramModule || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailLabel}>Start Date</Text>
                  <Text style={styles.detailValue}>{proposalDetails.proposedStartDate || 'TBD'}</Text>
                </View>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailLabel}>End Date</Text>
                  <Text style={styles.detailValue}>{proposalDetails.proposedEndDate || 'TBD'}</Text>
                </View>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{proposalDetails.proposedLocation || 'N/A'}</Text>
                </View>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailLabel}>Volunteers Needed</Text>
                  <Text style={styles.detailValue}>{proposalDetails.proposedVolunteersNeeded ?? 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Project Description</Text>
                <Text style={styles.detailValue}>{proposalDetails.proposedDescription || 'N/A'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Community Need</Text>
                <Text style={styles.detailValue}>{proposalDetails.communityNeed || 'N/A'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Expected Deliverables</Text>
                <Text style={styles.detailValue}>{proposalDetails.expectedDeliverables || 'N/A'}</Text>
              </View>

              {application.reviewNotes ? (
                <View style={[
                  styles.detailSection,
                  styles.reviewNotesBox,
                  application.status === 'Rejected' && { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
                  isRevisionRequested && { backgroundColor: '#fffbeb', borderColor: '#fed7aa' },
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <MaterialIcons
                      name={application.status === 'Rejected' ? 'error-outline' : 'feedback'}
                      size={16}
                      color={application.status === 'Rejected' ? '#dc2626' : '#d97706'}
                    />
                    <Text style={[
                      styles.detailLabel,
                      { marginBottom: 0 },
                      application.status === 'Rejected' && { color: '#dc2626' },
                      isRevisionRequested && { color: '#b45309' },
                    ]}>
                      {application.status === 'Rejected' ? 'Reason for Rejection' : 'Admin Feedback / Review Notes'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.detailValue,
                    application.status === 'Rejected' && { color: '#991b1b' },
                    isRevisionRequested && { color: '#92400e' },
                  ]}>
                    {application.reviewNotes}
                  </Text>
                </View>
              ) : null}

              {(isRevisionRequested || application.status === 'Rejected') && !isAdmin && (
                <View style={{ marginTop: 16 }}>
                  <TouchableOpacity
                    style={[
                      styles.approveBtn,
                      {
                        width: '100%',
                        justifyContent: 'center',
                        backgroundColor: application.status === 'Rejected' ? '#dc2626' : '#d97706',
                      },
                    ]}
                    onPress={handleEditProposal}
                  >
                    <MaterialIcons name="edit" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.approveBtnText}>Edit & Resubmit Proposal</Text>
                  </TouchableOpacity>
                </View>
              )}

              {application.status === 'Approved' && (
                <View style={{ marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.approveBtn, { width: '100%', justifyContent: 'center', backgroundColor: '#166534' }]}
                    onPress={() => {
                      setShowModal(false);
                      navigation.navigate('Projects', { projectId: application.projectId });
                    }}
                  >
                    <MaterialIcons name="folder-special" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.approveBtnText}>View Project Workspace</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isAdmin && isReviewable && onApprove && (
                <View style={styles.actionsSection}>
                  {showRejectInput ? (
                    <View style={styles.rejectInputWrap}>
                      <Text style={styles.rejectInputLabel}>Reason for rejection</Text>
                      <TextInput
                        style={styles.rejectInput}
                        placeholder="Explain why this proposal is being rejected..."
                        value={rejectionNotes}
                        onChangeText={setRejectionNotes}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                      <View style={styles.rejectActions}>
                        <TouchableOpacity
                          style={styles.cancelRejectBtn}
                          onPress={() => { setShowRejectInput(false); setRejectionNotes(''); }}
                        >
                          <Text style={styles.cancelRejectText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.confirmRejectBtn, isActing && styles.btnDisabled]}
                          onPress={handleReject}
                          disabled={isActing}
                        >
                          <MaterialIcons name="cancel" size={16} color="#fff" />
                          <Text style={styles.confirmRejectText}>{isActing ? 'Rejecting...' : 'Confirm Reject'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : showRevisionInput ? (
                    <View style={styles.rejectInputWrap}>
                      <Text style={styles.rejectInputLabel}>Requested Changes / Revision Notes</Text>
                      <TextInput
                        style={styles.rejectInput}
                        placeholder="Specify what the partner needs to revise..."
                        value={revisionNotes}
                        onChangeText={setRevisionNotes}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                      <View style={styles.rejectActions}>
                        <TouchableOpacity
                          style={styles.cancelRejectBtn}
                          onPress={() => { setShowRevisionInput(false); setRevisionNotes(''); }}
                        >
                          <Text style={styles.cancelRejectText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.confirmRejectBtn, { backgroundColor: '#d97706' }, isActing && styles.btnDisabled]}
                          onPress={handleRequestRevision}
                          disabled={isActing}
                        >
                          <MaterialIcons name="edit-note" size={16} color="#fff" />
                          <Text style={styles.confirmRejectText}>{isActing ? 'Submitting...' : 'Send Revision Request'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.actionButtons}>
                      {onReject && (
                        <TouchableOpacity
                          style={[styles.rejectBtn, isActing && styles.btnDisabled]}
                          onPress={() => { setShowRejectInput(true); setShowRevisionInput(false); }}
                          disabled={isActing}
                        >
                          <MaterialIcons name="cancel" size={18} color="#dc2626" />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      )}
                      {onRequestRevision && (
                        <TouchableOpacity
                          style={[styles.rejectBtn, { borderColor: '#fed7aa', backgroundColor: '#fffbeb' }, isActing && styles.btnDisabled]}
                          onPress={() => { setShowRevisionInput(true); setShowRejectInput(false); }}
                          disabled={isActing}
                        >
                          <MaterialIcons name="edit-note" size={18} color="#d97706" />
                          <Text style={[styles.rejectBtnText, { color: '#d97706' }]}>Request Revision</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.approveBtn, isActing && styles.btnDisabled]}
                        onPress={handleApprove}
                        disabled={isActing}
                      >
                        <MaterialIcons name="check-circle" size={18} color="#fff" />
                        <Text style={styles.approveBtnText}>{isActing ? 'Approving...' : 'Approve'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardCompact: { padding: 10, marginBottom: 6 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#64748b' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  closeButton: { padding: 4 },
  modalContent: { padding: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 20, alignSelf: 'flex-start' },
  statusText: { fontSize: 13, fontWeight: '600' },
  detailSection: { marginBottom: 16 },
  detailGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  detailGridItem: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  detailValue: { fontSize: 13, color: '#0f172a', lineHeight: 20, fontWeight: '500' },
  reviewNotesBox: { backgroundColor: '#fef9c3', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fde047' },
  actionsSection: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  actionButtons: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#dc2626', backgroundColor: '#fff' },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, backgroundColor: '#166534' },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
  rejectInputWrap: { gap: 10 },
  rejectInputLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  rejectInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 13, color: '#0f172a', backgroundColor: '#f8fafc', minHeight: 80 },
  rejectActions: { flexDirection: 'row', gap: 10 },
  cancelRejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelRejectText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  confirmRejectBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#dc2626' },
  confirmRejectText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
