import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { isImageMediaUri } from '../utils/media';

/**
 * Safeguarding review status for a photo.
 * - 'pending': Awaiting NVC review
 * - 'approved': No concerns, approved for permitted use
 * - 'flagged': Concern identified, access restricted, safeguarding focal person alerted
 */
export type SafeguardingStatus = 'pending' | 'approved' | 'flagged';

export interface SafeguardingReviewResult {
  /** The photo URI that was reviewed */
  photoUri: string;
  /** Whether the uploader confirmed authorized use */
  authorizedUseConfirmed: boolean;
  /** NVC review result status */
  status: SafeguardingStatus;
  /** If flagged: the concern description */
  flagReason?: string;
  /** If flagged: the action taken */
  actionTaken?: string;
  /** Timestamp of review */
  reviewedAt: string;
  /** Whether the photo is stored as restricted media */
  isRestrictedMedia: boolean;
}

export interface ChildSafeguardingModalProps {
  visible: boolean;
  photoUri: string;
  onApprove: (result: SafeguardingReviewResult) => void;
  onCancel: () => void;
  /** Whether current user is an admin / field officer performing administrative review */
  isAdmin?: boolean;
  /** If true, runs volunteer attendance flow (Notice only, skips Authorize, NVC Review, Decision) */
  isVolunteerAttendance?: boolean;
  /** Flow mode */
  mode?: 'volunteer_attendance' | 'admin_review' | 'full';
  volunteerName?: string;
  volunteerUserId?: string;
  eventName?: string;
}

type FlowStep =
  | 'reminder'
  | 'authorize'
  | 'nvc_review'
  | 'flag_decision'
  | 'flag_report'
  | 'approved'
  | 'cancelled';

const NVC_REVIEW_CHECKS = [
  { id: 'no_identifiable_children', label: 'No identifiable children appear without consent' },
  { id: 'no_distress', label: 'No images showing children in distress or vulnerability' },
  { id: 'appropriate_context', label: 'Photo shows appropriate activity context' },
  { id: 'no_location_risk', label: 'No sensitive location details that may endanger children' },
  { id: 'dignity_preserved', label: 'Dignity and privacy of all individuals are preserved' },
];

export default function ChildSafeguardingModal({
  visible,
  photoUri,
  onApprove,
  onCancel,
  isAdmin,
  isVolunteerAttendance,
  mode,
  volunteerName,
  volunteerUserId,
  eventName,
}: ChildSafeguardingModalProps) {
  const isVolunteerAttendanceFlow = Boolean(
    isVolunteerAttendance || mode === 'volunteer_attendance'
  );
  const isAdminReviewFlow = Boolean(
    mode === 'admin_review' || (isAdmin && !isVolunteerAttendanceFlow)
  );

  const [step, setStep] = useState<FlowStep>(isAdminReviewFlow ? 'authorize' : 'reminder');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [flagReason, setFlagReason] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  const resetState = useCallback(() => {
    setStep(isAdminReviewFlow ? 'authorize' : 'reminder');
    setCheckedItems({});
    setFlagReason('');
    setActionTaken('');
  }, [isAdminReviewFlow]);

  useEffect(() => {
    if (visible) {
      setStep(isAdminReviewFlow ? 'authorize' : 'reminder');
      setCheckedItems({});
      setFlagReason('');
      setActionTaken('');
    }
  }, [visible, isAdminReviewFlow]);

  const handleCancel = useCallback(() => {
    resetState();
    onCancel();
  }, [onCancel, resetState]);

  const handleVolunteerAttendanceSubmit = useCallback(() => {
    const result: SafeguardingReviewResult = {
      photoUri,
      authorizedUseConfirmed: true,
      status: 'pending',
      reviewedAt: new Date().toISOString(),
      isRestrictedMedia: true,
    };
    resetState();
    onApprove(result);
  }, [onApprove, photoUri, resetState]);

  const handleAuthorizeYes = useCallback(() => {
    // Store as restricted media → proceed to NVC review
    setStep('nvc_review');
  }, []);

  const handleAuthorizeNo = useCallback(() => {
    if (isAdminReviewFlow) {
      setStep('flag_report');
      return;
    }
    // Cancel upload
    resetState();
    onCancel();
  }, [isAdminReviewFlow, onCancel, resetState]);

  const handleToggleCheck = useCallback((id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const allChecked = NVC_REVIEW_CHECKS.every(check => checkedItems[check.id]);
  const hasConcern = NVC_REVIEW_CHECKS.some(check => !checkedItems[check.id]);

  const handleNvcComplete = useCallback(() => {
    setStep('flag_decision');
  }, []);

  const handleNoFlag = useCallback(() => {
    // Approve for permitted use
    const result: SafeguardingReviewResult = {
      photoUri,
      authorizedUseConfirmed: true,
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      isRestrictedMedia: true,
    };
    resetState();
    onApprove(result);
  }, [onApprove, photoUri, resetState]);

  const handleYesFlag = useCallback(() => {
    setStep('flag_report');
  }, []);

  const handleSubmitFlag = useCallback(() => {
    // Restrict access and alert safeguarding focal person → record action and outcome
    const result: SafeguardingReviewResult = {
      photoUri,
      authorizedUseConfirmed: true,
      status: 'flagged',
      flagReason: flagReason.trim() || 'Concern identified during NVC review',
      actionTaken: actionTaken.trim() || 'Restricted access and alerted safeguarding focal person',
      reviewedAt: new Date().toISOString(),
      isRestrictedMedia: true,
    };
    resetState();
    onApprove(result);
  }, [actionTaken, flagReason, onApprove, photoUri, resetState]);

  const renderPhotoPreview = () => {
    if (!photoUri) return null;
    return isImageMediaUri(photoUri) ? (
      <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
    ) : (
      <View style={styles.photoFallback}>
        <MaterialIcons name="image" size={32} color="#166534" />
        <Text style={styles.photoFallbackText}>Photo selected</Text>
      </View>
    );
  };

  // ── Step: Child-Safeguarding Reminder ──
  const renderReminder = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <MaterialIcons name="shield" size={28} color="#166534" />
      </View>
      <Text style={styles.stepTitle}>Child Protection and Privacy Notice</Text>
      <Text style={styles.stepDescription}>
        Photos and videos submitted through NVC Connect are used only for registration, attendance verification, project documentation, and authorized reporting. Do not upload inappropriate, exploitative, or unnecessary images of children. If a child appears in submitted media, the uploader must ensure that the image was obtained and submitted with appropriate authorization or consent.
      </Text>

      <View style={styles.reminderCard}>
        <View style={styles.reminderRow}>
          <MaterialIcons name="check-circle" size={16} color="#166534" />
          <Text style={styles.reminderText}>
            Used only for registration, attendance verification, project documentation, and authorized reporting
          </Text>
        </View>
        <View style={styles.reminderRow}>
          <MaterialIcons name="check-circle" size={16} color="#166534" />
          <Text style={styles.reminderText}>
            Do not upload inappropriate, exploitative, or unnecessary images of children
          </Text>
        </View>
        <View style={styles.reminderRow}>
          <MaterialIcons name="check-circle" size={16} color="#166534" />
          <Text style={styles.reminderText}>
            Ensure image was obtained and submitted with appropriate authorization or consent
          </Text>
        </View>
        <View style={styles.reminderRow}>
          <MaterialIcons name="check-circle" size={16} color="#166534" />
          <Text style={styles.reminderText}>
            {isVolunteerAttendanceFlow
              ? 'Submitted attendance photos undergo administrative NVC child-safeguarding review'
              : 'Flagged content will be escalated to the safeguarding focal person'}
          </Text>
        </View>
      </View>

      {renderPhotoPreview()}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        {isVolunteerAttendanceFlow ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleVolunteerAttendanceSubmit}>
            <MaterialIcons name="check-circle" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Confirm Attendance Photo</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('authorize')}>
            <MaterialIcons name="arrow-forward" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>I Understand</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ── Step: Authorize Confirmation ──
  const renderAuthorize = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <MaterialIcons name="verified-user" size={28} color="#166534" />
      </View>
      <Text style={styles.stepTitle}>
        {isAdminReviewFlow ? 'Authorize — Approve Photo' : 'Confirm Authorized Use'}
      </Text>
      <Text style={styles.stepDescription}>
        {isAdminReviewFlow
          ? `Review attendance photo submitted by ${volunteerName || 'the volunteer'}. Verify that the photo is authorized and complies with NVC Child Protection policy.`
          : 'Do you confirm that this media is authorized for use? If a child appears in this media, you confirm that the image was obtained and submitted with appropriate authorization or consent, complying with NVC Child Protection policy.'}
      </Text>

      {renderPhotoPreview()}

      <View style={styles.authorizeInfo}>
        <MaterialIcons name="info" size={16} color="#0369a1" />
        <Text style={styles.authorizeInfoText}>
          {isAdminReviewFlow
            ? 'Approving photo authorization advances to Step 3: NVC Review Rules.'
            : 'If confirmed, this photo will be stored as restricted media and undergo NVC review.'}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleAuthorizeNo}>
          <MaterialIcons name="cancel" size={16} color="#fff" />
          <Text style={styles.dangerBtnText}>
            {isAdminReviewFlow ? 'Remove Photo' : 'No — Cancel Upload'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleAuthorizeYes}>
          <MaterialIcons name="check-circle" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {isAdminReviewFlow ? 'Approve Photo (Authorize)' : 'Yes — Authorized'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step: NVC Review Rules Checklist ──
  const renderNvcReview = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <MaterialIcons name="fact-check" size={28} color="#166534" />
      </View>
      <Text style={styles.stepTitle}>
        {isAdminReviewFlow ? 'Step 3: NVC Review' : 'NVC Review Rules'}
      </Text>
      <Text style={styles.stepDescription}>
        {isAdminReviewFlow
          ? 'Check safeguarding criteria below. You may Accept Photo or Remove Photo.'
          : 'Review the photo against each safeguarding criteria below. Check each item that the photo satisfies.'}
      </Text>

      {renderPhotoPreview()}

      <View style={styles.checklistCard}>
        {NVC_REVIEW_CHECKS.map(check => (
          <TouchableOpacity
            key={check.id}
            style={styles.checkRow}
            onPress={() => handleToggleCheck(check.id)}
          >
            <MaterialIcons
              name={checkedItems[check.id] ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={checkedItems[check.id] ? '#166534' : '#94a3b8'}
            />
            <Text
              style={[styles.checkLabel, checkedItems[check.id] && styles.checkLabelChecked]}
            >
              {check.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!allChecked && (
        <View style={styles.warningBanner}>
          <MaterialIcons name="warning" size={16} color="#92400e" />
          <Text style={styles.warningText}>
            Unchecked items will be treated as potential concerns during flag review.
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => (isAdminReviewFlow ? setStep('authorize') : handleCancel())}
        >
          <Text style={styles.cancelBtnText}>{isAdminReviewFlow ? 'Back' : 'Cancel'}</Text>
        </TouchableOpacity>
        {isAdminReviewFlow && (
          <TouchableOpacity style={styles.dangerBtn} onPress={handleYesFlag}>
            <MaterialIcons name="delete-outline" size={16} color="#fff" />
            <Text style={styles.dangerBtnText}>Remove Photo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleNvcComplete}>
          <MaterialIcons name={isAdminReviewFlow ? 'check-circle' : 'arrow-forward'} size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {isAdminReviewFlow ? 'Accept Photo' : 'Continue Review'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step: Flag Decision ──
  const renderFlagDecision = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <MaterialIcons
          name={hasConcern ? 'flag' : 'thumb-up'}
          size={28}
          color={hasConcern ? '#dc2626' : '#166534'}
        />
      </View>
      <Text style={styles.stepTitle}>
        {isAdminReviewFlow
          ? hasConcern
            ? 'Step 4: Review Decision — Concern Identified'
            : 'Step 4: Photo Accepted — Notify Volunteer'
          : hasConcern
          ? 'Concern Identified'
          : 'No Concerns Found'}
      </Text>
      <Text style={styles.stepDescription}>
        {isAdminReviewFlow
          ? hasConcern
            ? 'One or more NVC criteria were not satisfied. You can flag/remove this photo or approve for permitted use.'
            : `All NVC review criteria are satisfied. Photo is accepted. A notification will be sent to ${volunteerName || 'the volunteer'}.`
          : hasConcern
          ? 'One or more NVC review criteria were not satisfied. Would you like to flag this photo for safeguarding review, or approve it for permitted use?'
          : 'All NVC review criteria are satisfied. You may approve this photo for permitted use, or flag it if you still have a concern.'}
      </Text>

      {hasConcern && (
        <View style={styles.concernSummary}>
          <Text style={styles.concernSummaryTitle}>Unchecked Criteria:</Text>
          {NVC_REVIEW_CHECKS.filter(check => !checkedItems[check.id]).map(check => (
            <View key={check.id} style={styles.concernItem}>
              <MaterialIcons name="error-outline" size={14} color="#dc2626" />
              <Text style={styles.concernItemText}>{check.label}</Text>
            </View>
          ))}
        </View>
      )}

      {isAdminReviewFlow && !hasConcern && (
        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <MaterialIcons name="notifications-active" size={16} color="#166534" />
            <Text style={styles.reminderText}>
              Notification to {volunteerName || 'Volunteer'}: "Your attendance photo for {eventName || 'this event'} was accepted and verified."
            </Text>
          </View>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleYesFlag}>
          <MaterialIcons name="flag" size={16} color="#fff" />
          <Text style={styles.dangerBtnText}>
            {isAdminReviewFlow ? 'Remove Photo' : 'Flag Concern'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleNoFlag}>
          <MaterialIcons name="check-circle" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {isAdminReviewFlow ? 'Accept Photo & Notify' : 'Approve for Use'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step: Flag Report (Record action and outcome) ──
  const renderFlagReport = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.iconCircle, styles.iconCircleDanger]}>
        <MaterialIcons name="report-problem" size={28} color="#dc2626" />
      </View>
      <Text style={styles.stepTitle}>
        {isAdminReviewFlow ? 'Record Concern & Remove Photo' : 'Record Safeguarding Concern'}
      </Text>
      <Text style={styles.stepDescription}>
        {isAdminReviewFlow
          ? `The attendance photo will be removed/restricted. A notification will be sent to ${volunteerName || 'the volunteer'}.`
          : 'Access to this photo will be restricted. The safeguarding focal person will be alerted. Please describe the concern and action taken.'}
      </Text>

      {renderPhotoPreview()}

      <Text style={styles.fieldLabel}>Describe the Concern *</Text>
      <TextInput
        style={styles.textArea}
        value={flagReason}
        onChangeText={setFlagReason}
        placeholder="What specific concern was identified?"
        multiline
        numberOfLines={3}
        placeholderTextColor="#cbd5e1"
      />

      <Text style={styles.fieldLabel}>Action Taken / Response Procedure</Text>
      <TextInput
        style={styles.textArea}
        value={actionTaken}
        onChangeText={setActionTaken}
        placeholder="Describe the approved response procedure followed..."
        multiline
        numberOfLines={3}
        placeholderTextColor="#cbd5e1"
      />

      <View style={styles.alertCard}>
        <MaterialIcons name="notifications-active" size={16} color="#b45309" />
        <Text style={styles.alertCardText}>
          {isAdminReviewFlow
            ? `The safeguarding focal person and ${volunteerName || 'the volunteer'} will be notified automatically.`
            : 'The safeguarding focal person will be notified automatically when this report is submitted.'}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep(isAdminReviewFlow ? 'nvc_review' : 'flag_decision')}>
          <Text style={styles.cancelBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dangerBtn, !flagReason.trim() && styles.disabledBtn]}
          onPress={handleSubmitFlag}
          disabled={!flagReason.trim()}
        >
          <MaterialIcons name="send" size={16} color="#fff" />
          <Text style={styles.dangerBtnText}>
            {isAdminReviewFlow ? 'Remove Photo & Notify' : 'Submit & Restrict'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'reminder':
        return renderReminder();
      case 'authorize':
        return renderAuthorize();
      case 'nvc_review':
        return renderNvcReview();
      case 'flag_decision':
        return renderFlagDecision();
      case 'flag_report':
        return renderFlagReport();
      default:
        return null;
    }
  };

  // Step indicator
  const stepOrder: FlowStep[] = isAdminReviewFlow
    ? ['authorize', 'nvc_review', 'flag_decision']
    : ['reminder', 'authorize', 'nvc_review', 'flag_decision'];
  const currentStepIndex = stepOrder.indexOf(step);
  const stepLabels = isAdminReviewFlow
    ? ['Authorize', 'NVC Review', 'Notify Volunteer']
    : ['Notice', 'Authorize', 'NVC Review', 'Decision'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="shield" size={20} color="#166534" />
              <Text style={styles.headerTitle}>
                {isAdminReviewFlow ? 'Admin Safeguarding Review' : 'Child Protection & Privacy'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} hitSlop={8}>
              <MaterialIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Step indicator - hidden on volunteer attendance */}
          {!isVolunteerAttendanceFlow && step !== 'flag_report' && (
            <View style={styles.stepIndicator}>
              {stepLabels.map((label, index) => (
                <View key={label} style={styles.stepDot}>
                  <View
                    style={[
                      styles.dot,
                      index <= currentStepIndex && styles.dotActive,
                      index < currentStepIndex && styles.dotCompleted,
                    ]}
                  >
                    {index < currentStepIndex ? (
                      <MaterialIcons name="check" size={10} color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.dotText,
                          index <= currentStepIndex && styles.dotTextActive,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      index <= currentStepIndex && styles.stepLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator>
            {renderCurrentStep()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '85%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stepDot: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: {
    backgroundColor: '#166534',
  },
  dotCompleted: {
    backgroundColor: '#15803d',
  },
  dotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  dotTextActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  stepLabelActive: {
    color: '#166534',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContainer: {
    paddingVertical: 20,
    gap: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  iconCircleDanger: {
    backgroundColor: '#fee2e2',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  photoFallback: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderStyle: 'dashed',
  },
  photoFallbackText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  reminderCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  reminderText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#166534',
    flex: 1,
  },
  authorizeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  authorizeInfoText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#0369a1',
    flex: 1,
  },
  checklistCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  checkLabel: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  checkLabelChecked: {
    color: '#166534',
    fontWeight: '500',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#92400e',
    flex: 1,
  },
  concernSummary: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  concernSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 2,
  },
  concernItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  concernItemText: {
    fontSize: 12,
    color: '#991b1b',
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 72,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  alertCardText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#92400e',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dangerBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
