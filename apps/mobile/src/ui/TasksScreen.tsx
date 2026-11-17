import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  KeyRound,
  Pencil,
  PenLine,
  Send,
  Upload,
} from './icons';
import {
  CuratedApplication,
  OrderedApplicationItem,
} from '../domain/types';
import { GeminiCanvasModal } from './GeminiCanvasModal';

interface TasksScreenProps {
  applications: CuratedApplication[];
  studentWritingAddress: string;
  hodRecipientAddress: string;
  onUpdateAddresses: (writingAddr: string, hodAddr: string) => void;
  onUpdateWriteupInCanvas: (
    appId: string,
    itemId: string,
    newContent: string
  ) => void;
  onUploadMissingDoc: (appId: string, itemId: string) => void;
  onSubmitApplication: (appId: string) => void;
  onOpenApplicationChat: (appId: string) => void;
}

type TaskFilter = 'all' | 'submit' | 'completed';

export const TasksScreen: React.FC<TasksScreenProps> = ({
  applications,
  studentWritingAddress,
  hodRecipientAddress,
  onUpdateAddresses,
  onUpdateWriteupInCanvas,
  onUploadMissingDoc,
  onSubmitApplication,
  onOpenApplicationChat,
}) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 840;

  const [filter, setFilter] = useState<TaskFilter>('all');
  const [editingAddresses, setEditingAddresses] = useState(false);
  const [writingAddrDraft, setWritingAddrDraft] = useState(
    studentWritingAddress
  );
  const [hodAddrDraft, setHodAddrDraft] = useState(hodRecipientAddress);
  const [canvasTarget, setCanvasTarget] = useState<{
    app: CuratedApplication;
    item: OrderedApplicationItem;
  } | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const triggerBanner = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const handleDownloadLetterPdf = (
    item: OrderedApplicationItem,
    appTitle: string
  ) => {
    const fileName =
      item.draftFileName || 'Chisom_Okafor_UNN_HOD_Letter_Draft.pdf';
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([item.writeupContent || ''], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.pdf$/i, '.txt');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    triggerBanner(
      `Downloaded "${fileName}" for ${appTitle}. Print and take to your HOD for signature.`
    );
  };

  // 1. Physical Document / Signature Tasks
  const signatureTasks = applications.flatMap((app) =>
    app.orderedItems
      .filter(
        (item) =>
          item.type === 'missing_requirement' &&
          item.status === 'action_required'
      )
      .map((item) => ({ app, item }))
  );

  // 2. Final Review & Submission Tasks ("submitting the application is a task on its own")
  const submissionTasks = applications.filter(
    (app) => app.status === 'ready_to_submit'
  );

  // 3. Completed Tasks (Uploaded HOD letters + Submitted Applications)
  const completedSignTasks = applications.flatMap((app) =>
    app.orderedItems
      .filter(
        (item) =>
          item.type === 'missing_requirement' && item.status === 'ready'
      )
      .map((item) => ({ app, item }))
  );
  const submittedApps = applications.filter(
    (app) => app.status === 'submitted'
  );

  const totalPendingCount = signatureTasks.length + submissionTasks.length;
  const totalCompletedCount =
    completedSignTasks.length + submittedApps.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isWide && styles.contentWide]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={styles.pageTitle}>
            Tasks
          </Text>
          <Text style={styles.pageSubtitle}>
            Your action queue for signatures and final application submissions, synced with Google Tasks.
          </Text>
        </View>

        <View style={styles.syncBadge}>
          <CalendarClock size={14} color="#5B21B6" />
          <Text style={styles.syncBadgeText}>Google Tasks Synced</Text>
        </View>
      </View>

      {/* Filter Segmented Bar (1-line mobile-optimized labels) */}
      <View style={styles.segmentedTrack}>
        <Pressable
          style={[
            styles.segmentBtn,
            filter === 'all' && styles.segmentBtnActive,
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.segmentText,
              filter === 'all' && styles.segmentTextActive,
            ]}
          >
            Active ({totalPendingCount})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentBtn,
            filter === 'submit' && styles.segmentBtnActive,
          ]}
          onPress={() => setFilter('submit')}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.segmentText,
              filter === 'submit' && styles.segmentTextActive,
            ]}
          >
            To Submit ({submissionTasks.length})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentBtn,
            filter === 'completed' && styles.segmentBtnActive,
          ]}
          onPress={() => setFilter('completed')}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.segmentText,
              filter === 'completed' && styles.segmentTextActive,
            ]}
          >
            Done ({totalCompletedCount})
          </Text>
        </Pressable>
      </View>

      {feedbackBanner ? (
        <View style={styles.bannerToast}>
          <Check size={14} color="#047857" />
          <Text style={styles.bannerToastText}>{feedbackBanner}</Text>
        </View>
      ) : null}

      {/* SECTION A: Physical Signature & Requested Letter Tasks */}
      {filter === 'all' && signatureTasks.length > 0 ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Needs Physical Signature & Upload
            </Text>
            <Text style={styles.sectionCount}>
              {signatureTasks.length} task
            </Text>
          </View>

          {signatureTasks.map(({ app, item }) => (
            <View key={item.id} style={styles.signatureTaskCard}>
              {/* Refined Warm Coral-Orange Strip at the Top */}
              <View style={styles.orangeHeaderStrip}>
                <View style={styles.orangeAccentDot} />
                <Clock size={14} color="#C2410C" />
                <Text style={styles.orangeStripText} numberOfLines={1}>
                  Requested Letter Drafted · Due {app.deadline}
                </Text>
              </View>

              <View style={styles.taskCardBody}>
                <View style={styles.taskTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sponsorLabel}>{app.title}</Text>
                    <Text style={styles.taskMainTitle}>{item.title}</Text>
                  </View>
                  <View style={styles.awardBadge}>
                    <Text style={styles.awardBadgeText}>{app.awardValue}</Text>
                  </View>
                </View>

                <Text style={styles.taskExplanation}>
                  This scholarship requires a signed attestation letter. Artrat drafted it using your writing address and recipient address below (any update here syncs everywhere).
                </Text>

                {/* Step 1: Writing Address & Signatory Recipient Address Box */}
                <View style={styles.addressConfigBox}>
                  <View style={styles.addressHeaderRow}>
                    <Text style={styles.addressSectionLabel}>
                      Letter Formatting Addresses (Syncs Globally)
                    </Text>
                    <Pressable
                      style={styles.editAddrBtn}
                      onPress={() => {
                        setWritingAddrDraft(studentWritingAddress);
                        setHodAddrDraft(hodRecipientAddress);
                        setEditingAddresses(!editingAddresses);
                      }}
                    >
                      <Pencil size={12} color="#5B21B6" />
                      <Text style={styles.editAddrBtnText}>
                        {editingAddresses ? 'Cancel' : 'Edit'}
                      </Text>
                    </Pressable>
                  </View>

                  {editingAddresses ? (
                    <View style={styles.addressForm}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>
                          Your Writing Address (Top-Right of Letter)
                        </Text>
                        <TextInput
                          style={styles.addressInput}
                          value={writingAddrDraft}
                          onChangeText={setWritingAddrDraft}
                          placeholder="Enter your hostel or residential address..."
                        />
                      </View>

                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>
                          {item.recipientRoleLabel ||
                            'Signatory / Referee Recipient Address'}
                        </Text>
                        <TextInput
                          style={styles.addressInput}
                          value={hodAddrDraft}
                          onChangeText={setHodAddrDraft}
                          placeholder="Enter recipient name, role & address..."
                        />
                      </View>

                      <Pressable
                        style={styles.saveAddressesBtn}
                        onPress={() => {
                          onUpdateAddresses(
                            writingAddrDraft.trim() || studentWritingAddress,
                            hodAddrDraft.trim() || hodRecipientAddress
                          );
                          setEditingAddresses(false);
                          triggerBanner(
                            'Updated letter addresses here and across your Vault & Applications.'
                          );
                        }}
                      >
                        <Check size={14} color="#FFFFFF" />
                        <Text style={styles.saveAddressesBtnText}>
                          Save & Sync Addresses
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.addressSummaryGrid}>
                      <View style={styles.addressSummaryCol}>
                        <Text style={styles.addressMiniTitle}>
                          Your Writing Address
                        </Text>
                        <Text style={styles.addressMiniValue}>
                          {studentWritingAddress}
                        </Text>
                      </View>
                      <View style={styles.addressSummaryCol}>
                        <Text style={styles.addressMiniTitle}>
                          {item.recipientRoleLabel ||
                            'Signatory / Referee Recipient'}
                        </Text>
                        <Text style={styles.addressMiniValue}>
                          {hodRecipientAddress}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Mobile-Optimized 2-Row Button Stack */}
                <View style={styles.mobileActionStack}>
                  <View style={styles.secondaryPairRow}>
                    <Pressable
                      style={styles.downloadBtn}
                      onPress={() => handleDownloadLetterPdf(item, app.title)}
                    >
                      <Download size={14} color="#4C1D95" />
                      <Text style={styles.downloadBtnText} numberOfLines={1}>
                        Download PDF
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.canvasGhostBtn}
                      onPress={() => setCanvasTarget({ app, item })}
                    >
                      <PenLine size={14} color="#4C1D95" />
                      <Text style={styles.canvasGhostBtnText} numberOfLines={1}>
                        Edit in Canvas
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.uploadPrimaryBtn}
                    onPress={() => onUploadMissingDoc(app.id, item.id)}
                  >
                    <Upload size={14} color="#FFFFFF" />
                    <Text style={styles.uploadPrimaryBtnText}>
                      Upload Signed Letter
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* SECTION B: Final Review & Submission Tasks ("submitting the application is a task on its own") */}
      {filter === 'all' || filter === 'submit' ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Review & Submit Prepared Applications
            </Text>
            <Text style={styles.sectionCount}>
              {submissionTasks.length} ready
            </Text>
          </View>

          <View style={[styles.submitGrid, isWide && styles.submitGridWide]}>
            {submissionTasks.map((app) => (
              <View
                key={app.id}
                style={[styles.submitTaskCard, isWide && styles.submitCardHalf]}
              >
                <View style={styles.submitStatusHeader}>
                  <CheckCircle2 size={14} color="#047857" />
                  <Text style={styles.submitStatusHeaderText}>
                    {app.statusSummary} · Due {app.deadline} ({app.daysLeft}d left)
                  </Text>
                </View>

                <View style={styles.submitTaskBody}>
                  <View style={styles.taskTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sponsorLabel}>{app.sponsor}</Text>
                      <Text style={styles.taskMainTitle}>
                        Submit {app.title}
                      </Text>
                    </View>
                    <View style={styles.awardBadge}>
                      <Text style={styles.awardBadgeText}>{app.awardValue}</Text>
                    </View>
                  </View>

                  <Text style={styles.taskExplanation}>
                    Artrat has verified every requirement and arranged all{' '}
                    {app.orderedItems.length} items in portal order. Complete
                    this task by reviewing or submitting now.
                  </Text>

                  <View style={styles.taskActionsRow}>
                    <Pressable
                      style={styles.submitNowBtn}
                      onPress={() => {
                        onSubmitApplication(app.id);
                        triggerBanner(
                          `Submitted ${app.title} · Receipt saved in Vault`
                        );
                      }}
                    >
                      <Send size={13} color="#FFFFFF" />
                      <Text style={styles.submitNowBtnText}>
                        Submit Application
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.reviewChatBtn}
                      onPress={() => onOpenApplicationChat(app.id)}
                    >
                      <Text style={styles.reviewChatBtnText}>
                        Review in Chat
                      </Text>
                      <ArrowRight size={14} color="#4C1D95" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* SECTION C: Completed Tasks */}
      {filter === 'completed' ||
      (filter === 'all' && totalCompletedCount > 0) ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Completed Tasks</Text>
            <Text style={styles.sectionCount}>
              {totalCompletedCount} done
            </Text>
          </View>

          {totalCompletedCount === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Tasks you finish—like uploading a signed HOD letter or submitting an application—will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.completedList}>
              {completedSignTasks.map(({ app, item }) => (
                <View key={item.id} style={styles.completedCard}>
                  <CheckCircle2 size={18} color="#047857" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.completedTitle}>
                      Uploaded {item.title}
                    </Text>
                    <Text style={styles.completedSub}>
                      {app.title} · Google Tasks reminder closed
                    </Text>
                  </View>
                </View>
              ))}

              {submittedApps.map((app) => (
                <Pressable
                  key={app.id}
                  style={styles.completedCard}
                  onPress={() => onOpenApplicationChat(app.id)}
                >
                  <FileCheck2 size={18} color="#047857" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.completedTitle}>
                      Submitted {app.title}
                    </Text>
                    <Text style={styles.completedSub}>
                      Receipt {app.submissionReceiptId || '#ART-2026-88412'} · Saved in Vault
                    </Text>
                  </View>
                  <ArrowRight size={15} color="#4E4466" />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : null}

      {/* Gemini Canvas Modal for Previewing / Editing the HOD Letter */}
      <GeminiCanvasModal
        visible={!!canvasTarget}
        item={canvasTarget?.item || null}
        scholarshipTitle={canvasTarget?.app.title || ''}
        onClose={() => setCanvasTarget(null)}
        onSaveContent={(itemId, updatedText) => {
          if (canvasTarget) {
            onUpdateWriteupInCanvas(
              canvasTarget.app.id,
              itemId,
              updatedText
            );
            triggerBanner('Saved your updated HOD Letter in Canvas.');
          }
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5FC',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 18,
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
  },
  contentWide: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#161126',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#4E4466',
    lineHeight: 20,
    marginTop: 3,
    maxWidth: 620,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#EAE3F8',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E4466',
  },
  segmentTextActive: {
    color: '#161126',
    fontWeight: '700',
  },
  bannerToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bannerToastText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161126',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E4466',
  },
  signatureTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    overflow: 'hidden',
  },
  orangeHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  orangeAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
  },
  orangeStripText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
    flex: 1,
  },
  taskCardBody: {
    padding: 18,
    gap: 14,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  sponsorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B21B6',
    marginBottom: 2,
  },
  taskMainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161126',
    lineHeight: 22,
  },
  awardBadge: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  awardBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4C1D95',
    fontVariant: ['tabular-nums'],
  },
  taskExplanation: {
    fontSize: 13,
    color: '#4E4466',
    lineHeight: 19,
  },
  addressConfigBox: {
    backgroundColor: '#FAF8FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 10,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#161126',
  },
  editAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editAddrBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  addressSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  addressSummaryCol: {
    flex: 1,
    minWidth: 210,
    gap: 2,
  },
  addressMiniTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#756A92',
  },
  addressMiniValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#161126',
    lineHeight: 18,
  },
  addressForm: {
    gap: 10,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E4466',
  },
  addressInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4C6F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#161126',
  },
  saveAddressesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6D28D9',
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
  },
  saveAddressesBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mobileActionStack: {
    gap: 8,
  },
  secondaryPairRow: {
    flexDirection: 'row',
    gap: 8,
  },
  taskActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  otpTaskActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  otpCodeInput: {
    backgroundColor: '#FAF8FF',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#D4C6F0',
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#161126',
    letterSpacing: 2,
    width: 120,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C1D95',
  },
  canvasGhostBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
  },
  canvasGhostBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C1D95',
  },
  uploadPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6D28D9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitGrid: {
    gap: 12,
  },
  submitGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  submitTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    overflow: 'hidden',
  },
  submitCardHalf: {
    flex: 1,
    minWidth: 340,
  },
  submitStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  submitStatusHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  submitTaskBody: {
    padding: 18,
    gap: 12,
  },
  submitNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6D28D9',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  submitNowBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  reviewChatBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C1D95',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  emptyText: {
    fontSize: 13,
    color: '#4E4466',
    lineHeight: 19,
  },
  completedList: {
    gap: 10,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161126',
  },
  completedSub: {
    fontSize: 12,
    color: '#4E4466',
    marginTop: 2,
  },
});
