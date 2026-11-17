import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  KeyRound,
  Pencil,
  PenLine,
  RefreshCw,
  Send,
  Upload,
} from './icons';
import {
  CuratedApplication,
  OrderedApplicationItem,
  VaultDocument,
} from '../domain/types';
import { ArtratBot3D, BotMood } from './ArtratBot3D';
import { GeminiCanvasModal } from './GeminiCanvasModal';

interface ApplicationChatScreenProps {
  application: CuratedApplication;
  vaultDocs: VaultDocument[];
  studentWritingAddress: string;
  hodRecipientAddress: string;
  onUpdateAddresses: (writingAddr: string, hodAddr: string) => void;
  onBack: () => void;
  onReplaceDocumentInChat: (
    appId: string,
    itemId: string,
    vaultDocId: string,
    newFileName: string
  ) => void;
  onUpdateWriteupInCanvas: (
    appId: string,
    itemId: string,
    newContent: string
  ) => void;
  onUploadMissingRequirement: (appId: string, itemId: string) => void;
  onDeclareAndSubmit: (appId: string) => void;
  onSendMessageInAppChat: (appId: string, message: string) => void;
  onArchiveIneligibleNow?: (appId: string) => void;
}

export const ApplicationChatScreen: React.FC<ApplicationChatScreenProps> = ({
  application,
  vaultDocs,
  studentWritingAddress,
  hodRecipientAddress,
  onUpdateAddresses,
  onBack,
  onReplaceDocumentInChat,
  onUpdateWriteupInCanvas,
  onUploadMissingRequirement,
  onDeclareAndSubmit,
  onSendMessageInAppChat,
  onArchiveIneligibleNow,
}) => {
  const [activeCanvasItem, setActiveCanvasItem] =
    useState<OrderedApplicationItem | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [introExpanded, setIntroExpanded] = useState(false);
  const [editingAddressItemId, setEditingAddressItemId] = useState<
    string | null
  >(null);
  const [writingAddrInput, setWritingAddrInput] = useState(
    studentWritingAddress
  );
  const [hodAddrInput, setHodAddrInput] = useState(hodRecipientAddress);
  const [submittingState, setSubmittingState] = useState<
    'idle' | 'running' | 'completed'
  >(application.status === 'submitted' ? 'completed' : 'idle');
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  const isNotEligible = application.status === 'not_eligible';
  const hasMissingRequirement = application.orderedItems.some(
    (item) => item.status === 'action_required'
  );

  const botMood: BotMood =
    submittingState === 'running'
      ? 'launch'
      : submittingState === 'completed' || application.status === 'submitted'
      ? 'happy'
      : isNotEligible || hasMissingRequirement
      ? 'alert'
      : 'scribe';

  const showToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => setToastBanner(null), 4000);
  };

  const handleReplaceDoc = (item: OrderedApplicationItem) => {
    if (!item.vaultDocId) return;
    const cleanSlug = item.title.replace(/\s+/g, '_');
    const newFileName = `Chisom_${cleanSlug}_Updated.pdf`;

    onReplaceDocumentInChat(
      application.id,
      item.id,
      item.vaultDocId,
      newFileName
    );
    showToast(`Updated "${item.title}" here and in your Vault.`);
  };

  const handleDownloadHodLetter = (item: OrderedApplicationItem) => {
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
    showToast(
      `Downloaded "${fileName}". Print and take to your HOD for signature.`
    );
  };

  const handleTriggerSubmit = () => {
    if (hasMissingRequirement || isNotEligible || submittingState !== 'idle')
      return;
    setSubmittingState('running');

    setTimeout(() => {
      setSubmittingState('completed');
      onDeclareAndSubmit(application.id);
    }, 1000);
  };

  const handleSendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    onSendMessageInAppChat(application.id, trimmed);
    setChatInput('');
  };

  const firstArtratTurn =
    application.chatTurns.find((t) => t.sender === 'artrat') ||
    application.chatTurns[0];

  const compactHeadline =
    firstArtratTurn?.collapsibleTitle ||
    (isNotEligible
      ? `Did not meet standard · Wipes to History in ${
          application.daysUntilHistoryWipe ?? 7
        }d`
      : `Prepared ${application.orderedItems.length} required items in order`);

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
        >
          <ArrowLeft size={16} color="#161126" />
          <Text style={styles.backBtnText}>Applications</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text
            accessibilityRole="header"
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {application.title}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {isNotEligible
              ? `Not eligible · Wipes to History in ${
                  application.daysUntilHistoryWipe ?? 7
                } days`
              : `${application.awardValue} · Due ${application.deadline}`}
          </Text>
        </View>
      </View>

      {toastBanner ? (
        <View style={styles.syncToast}>
          <Check size={14} color="#047857" />
          <Text style={styles.syncToastText}>{toastBanner}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Collapsible Artrat Summary Bubble (Compact by default even for 9+ documents) */}
        <View style={styles.agentIntroCard}>
          <View style={styles.agentIntroHeaderRow}>
            <ArtratBot3D mood={botMood} size="sm" />

            <View style={styles.agentIntroSummaryCol}>
              <Text style={styles.agentName}>Artrat Summary</Text>
              <Text style={styles.agentHeadlineText}>{compactHeadline}</Text>
            </View>

            <Pressable
              style={styles.collapseToggleBtn}
              onPress={() => setIntroExpanded((prev) => !prev)}
              accessibilityRole="button"
            >
              <Text style={styles.collapseToggleText}>
                {introExpanded ? 'Hide' : 'Details'}
              </Text>
              {introExpanded ? (
                <ChevronUp size={14} color="#4C1D95" />
              ) : (
                <ChevronDown size={14} color="#4C1D95" />
              )}
            </Pressable>
          </View>

          {introExpanded ? (
            <View style={styles.agentExpandedBody}>
              <Text style={styles.agentIntroText}>
                {firstArtratTurn?.text}
              </Text>

              {firstArtratTurn?.collapsibleBullets &&
              firstArtratTurn.collapsibleBullets.length > 0 ? (
                <View style={styles.bulletList}>
                  {firstArtratTurn.collapsibleBullets.map((b, idx) => (
                    <Text key={idx} style={styles.bulletItemText}>
                      • {b}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* CASE 1: NOT ELIGIBLE APPLICATION (Shows why it didn't meet standards + 7-day History wipe) */}
        {isNotEligible ? (
          <View style={styles.ineligibleSection}>
            <View style={styles.ineligibleCard}>
              <View style={styles.ineligibleBannerStrip}>
                <AlertCircle size={15} color="#BE123C" />
                <Text style={styles.ineligibleBannerText}>
                  Did not meet requirement · Wipes to History in{' '}
                  {application.daysUntilHistoryWipe ?? 7} days
                </Text>
              </View>

              <View style={styles.ineligibleBody}>
                <Text style={styles.ineligibleReasonText}>
                  {application.disqualificationReason}
                </Text>

                {application.hardRules.length > 0 ? (
                  <View style={styles.rulesList}>
                    {application.hardRules.map((rule) => (
                      <View key={rule.id} style={styles.ruleRow}>
                        {rule.passed ? (
                          <CheckCircle2 size={15} color="#047857" />
                        ) : (
                          <AlertCircle size={15} color="#BE123C" />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ruleLabelText}>
                            {rule.ruleLabel}: {rule.portalRequirement}
                          </Text>
                          <Text
                            style={[
                              styles.ruleStudentText,
                              !rule.passed && styles.ruleFailedText,
                            ]}
                          >
                            Your record: {rule.studentValue}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                {onArchiveIneligibleNow ? (
                  <Pressable
                    style={styles.moveHistoryNowBtn}
                    onPress={() => onArchiveIneligibleNow(application.id)}
                  >
                    <Text style={styles.moveHistoryNowBtnText}>
                      Move to History Now
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : (
          /* CASE 2: ELIGIBLE APPLICATION — Ordered Package List */
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Prepared in order</Text>
              <Text style={styles.sectionMeta}>
                {application.orderedItems.length} items
              </Text>
            </View>

            <View style={styles.orderedList}>
              {application.orderedItems.map((item) => {
                const linkedVaultDoc = item.vaultDocId
                  ? vaultDocs.find((d) => d.id === item.vaultDocId)
                  : undefined;
                const isEditingAddr = editingAddressItemId === item.id;

                return (
                  <View key={item.id} style={styles.itemCard}>
                    {/* Refined Warm Coral-Orange Strip ONLY at top of card when action is required */}
                    {item.status === 'action_required' ? (
                      <View style={styles.orangeItemHeaderStrip}>
                        <View style={styles.orangeDot} />
                        <Clock size={13} color="#C2410C" />
                        <Text
                          style={styles.orangeItemHeaderText}
                          numberOfLines={1}
                        >
                          HOD Letter Drafted · Needs Signature
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.itemBody}>
                      <View style={styles.itemTopRow}>
                        <View style={styles.itemTitleGroup}>
                          <View style={styles.stepCircle}>
                            <Text style={styles.stepCircleText}>
                              {item.orderIndex}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemTitle}>{item.title}</Text>
                            <Text style={styles.portalFieldSub}>
                              {item.portalFieldLabel}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* 1. Document Item */}
                      {item.type === 'document' && linkedVaultDoc ? (
                        <View style={styles.docBox}>
                          <View style={styles.docInfoRow}>
                            <FileText size={16} color="#5B21B6" />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={styles.docFileName}
                                numberOfLines={1}
                              >
                                {linkedVaultDoc.fileName}
                              </Text>
                              <Text style={styles.docMeta}>
                                {linkedVaultDoc.fileSize} ·{' '}
                                {linkedVaultDoc.updatedAt}
                              </Text>
                            </View>

                            <Pressable
                              style={styles.replaceDocBtn}
                              onPress={() => handleReplaceDoc(item)}
                            >
                              <RefreshCw size={13} color="#4C1D95" />
                              <Text style={styles.replaceDocBtnText}>
                                Replace
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}

                      {/* 2. Writeup Item (Opens Canvas) */}
                      {item.type === 'writeup' ? (
                        <View style={styles.writeupBox}>
                          <Text
                            style={styles.writeupPreviewText}
                            numberOfLines={4}
                          >
                            {item.writeupContent}
                          </Text>

                          <View style={styles.writeupFooterRow}>
                            <Text style={styles.wordCountMeta}>
                              {(item.writeupContent || '')
                                .trim()
                                .split(/\s+/)
                                .filter(Boolean).length}{' '}
                              / {item.writeupWordLimit || 250} words
                            </Text>

                            <Pressable
                              style={styles.canvasBtn}
                              onPress={() => setActiveCanvasItem(item)}
                            >
                              <PenLine size={13} color="#FFFFFF" />
                              <Text style={styles.canvasBtnText}>
                                Open in Canvas
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}

                      {/* 3. Requested Endorsement / Referee / Attestation Letter Item */}
                      {item.type === 'missing_requirement' ? (
                        <View style={styles.hodPreparedContainer}>
                          {/* Address Structure Box (Requested dynamically by this scholarship) */}
                          <View style={styles.addressBox}>
                            <View style={styles.addressHeaderRow}>
                              <Text style={styles.addressTitle}>
                                Letter Formatting Addresses (Syncs Globally)
                              </Text>
                              <Pressable
                                style={styles.editAddrPill}
                                onPress={() => {
                                  setWritingAddrInput(studentWritingAddress);
                                  setHodAddrInput(hodRecipientAddress);
                                  setEditingAddressItemId(
                                    isEditingAddr ? null : item.id
                                  );
                                }}
                              >
                                <Pencil size={12} color="#4C1D95" />
                                <Text style={styles.editAddrPillText}>
                                  {isEditingAddr ? 'Cancel' : 'Edit'}
                                </Text>
                              </Pressable>
                            </View>

                            {isEditingAddr ? (
                              <View style={styles.addressEditForm}>
                                <View style={styles.addrField}>
                                  <Text style={styles.addrFieldLabel}>
                                    Your Writing Address (Sender)
                                  </Text>
                                  <TextInput
                                    style={styles.addrTextInput}
                                    value={writingAddrInput}
                                    onChangeText={setWritingAddrInput}
                                    placeholder="Your hostel or street address..."
                                  />
                                </View>

                                <View style={styles.addrField}>
                                  <Text style={styles.addrFieldLabel}>
                                    {item.recipientRoleLabel ||
                                      'Signatory / Referee Recipient Address'}
                                  </Text>
                                  <TextInput
                                    style={styles.addrTextInput}
                                    value={hodAddrInput}
                                    onChangeText={setHodAddrInput}
                                    placeholder="Recipient name, role & address..."
                                  />
                                </View>

                                <Pressable
                                  style={styles.saveAddrBtn}
                                  onPress={() => {
                                    onUpdateAddresses(
                                      writingAddrInput.trim() ||
                                        studentWritingAddress,
                                      hodAddrInput.trim() || hodRecipientAddress
                                    );
                                    setEditingAddressItemId(null);
                                    showToast(
                                      'Updated letter addresses here and across your Vault & Tasks.'
                                    );
                                  }}
                                >
                                  <Check size={13} color="#FFFFFF" />
                                  <Text style={styles.saveAddrBtnText}>
                                    Save & Sync Addresses
                                  </Text>
                                </Pressable>
                              </View>
                            ) : (
                              <View style={styles.addressReadGrid}>
                                <View style={styles.addressReadCol}>
                                  <Text style={styles.addressMetaLabel}>
                                    Your Writing Address
                                  </Text>
                                  <Text style={styles.addressMetaValue}>
                                    {studentWritingAddress}
                                  </Text>
                                </View>
                                <View style={styles.addressReadCol}>
                                  <Text style={styles.addressMetaLabel}>
                                    {item.recipientRoleLabel ||
                                      'Signatory / Referee Recipient'}
                                  </Text>
                                  <Text style={styles.addressMetaValue}>
                                    {hodRecipientAddress}
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>

                          <View style={styles.reminderRow}>
                            <CalendarClock size={14} color="#5B21B6" />
                            <Text
                              style={styles.reminderScheduleText}
                              numberOfLines={1}
                            >
                              {item.googleCalendarSlot}
                            </Text>
                          </View>

                          {item.status === 'action_required' ? (
                            <View style={styles.hodActionStack}>
                              <View style={styles.hodSecondaryPairRow}>
                                <Pressable
                                  style={styles.secondaryActionBtn}
                                  onPress={() => handleDownloadHodLetter(item)}
                                >
                                  <Download size={14} color="#4C1D95" />
                                  <Text
                                    style={styles.secondaryActionBtnText}
                                    numberOfLines={1}
                                  >
                                    Download PDF
                                  </Text>
                                </Pressable>

                                <Pressable
                                  style={styles.secondaryActionBtn}
                                  onPress={() => setActiveCanvasItem(item)}
                                >
                                  <PenLine size={14} color="#4C1D95" />
                                  <Text
                                    style={styles.secondaryActionBtnText}
                                    numberOfLines={1}
                                  >
                                    Edit in Canvas
                                  </Text>
                                </Pressable>
                              </View>

                              <Pressable
                                style={styles.uploadPrimaryBtn}
                                onPress={() =>
                                  onUploadMissingRequirement(
                                    application.id,
                                    item.id
                                  )
                                }
                              >
                                <Upload size={14} color="#FFFFFF" />
                                <Text style={styles.uploadPrimaryBtnText}>
                                  Upload Signed Letter
                                </Text>
                              </Pressable>
                            </View>
                          ) : (
                            <View style={styles.completedInlineTag}>
                              <CheckCircle2 size={15} color="#047857" />
                              <Text style={styles.completedInlineText}>
                                Signed HOD letter uploaded · Reminder closed
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Conversation Thread Messages */}
        {application.chatTurns.length > 0 ? (
          <View style={styles.conversationSection}>
            <Text style={styles.chatSectionHeader}>Conversation</Text>
            {application.chatTurns.map((turn) => (
              <View
                key={turn.id}
                style={[
                  styles.messageBubble,
                  turn.sender === 'student'
                    ? styles.studentBubble
                    : styles.artratBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    turn.sender === 'student' && styles.studentMessageText,
                  ]}
                >
                  {turn.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    turn.sender === 'student' && styles.studentMessageTime,
                  ]}
                >
                  {turn.sender === 'student' ? 'You' : 'Artrat'} ·{' '}
                  {turn.timestamp}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Final Submit Task Card (Only for Eligible Applications) */}
        {!isNotEligible ? (
          <View style={styles.submitCard}>
            <View style={styles.submitInfo}>
              <Text style={styles.submitTitle}>
                {submittingState === 'completed' ||
                application.status === 'submitted'
                  ? 'Application submitted'
                  : hasMissingRequirement
                  ? 'Task pending: Upload your signed HOD letter'
                  : 'Task: Review & submit application'}
              </Text>
              <Text style={styles.submitDesc}>
                {submittingState === 'completed' ||
                application.status === 'submitted'
                  ? `Submitted to ${application.sponsor}. Your confirmation receipt is saved in your Vault.`
                  : hasMissingRequirement
                  ? 'Download the drafted HOD letter above, have your HOD sign & stamp it, and upload the scan to unlock submission.'
                  : 'All required documents and writeups are arranged in portal order. Submit now to complete this task.'}
              </Text>
            </View>

            {submittingState !== 'completed' &&
            application.status !== 'submitted' ? (
              <Pressable
                style={[
                  styles.submitPrimaryBtn,
                  (hasMissingRequirement || submittingState === 'running') &&
                    styles.submitPrimaryBtnDisabled,
                ]}
                disabled={
                  hasMissingRequirement || submittingState === 'running'
                }
                onPress={handleTriggerSubmit}
              >
                <Text style={styles.submitPrimaryBtnText}>
                  {submittingState === 'running'
                    ? 'Submitting...'
                    : 'Submit Application'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.submittedBadge}>
                <CheckCircle2 size={15} color="#047857" />
                <Text style={styles.submittedBadgeText}>Submitted</Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Chat Composer */}
      <View style={styles.bottomBar}>
        <View style={styles.composerPill}>
          <TextInput
            style={styles.composerInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Message Artrat or drop another scholarship link..."
            placeholderTextColor="#756A92"
            onSubmitEditing={handleSendChat}
          />
          <Pressable
            style={[
              styles.sendCircleBtn,
              !chatInput.trim() && styles.sendCircleBtnDisabled,
            ]}
            onPress={handleSendChat}
            disabled={!chatInput.trim()}
            accessibilityLabel="Send message"
          >
            <Send size={15} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Gemini Canvas Writeup / HOD Letter Modal */}
      <GeminiCanvasModal
        visible={!!activeCanvasItem}
        item={activeCanvasItem}
        scholarshipTitle={application.title}
        onClose={() => setActiveCanvasItem(null)}
        onSaveContent={(itemId, updatedText) =>
          onUpdateWriteupInCanvas(application.id, itemId, updatedText)
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5FC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDF5',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F3EEFF',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#161126',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161126',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#4E4466',
    marginTop: 1,
  },
  syncToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  syncToastText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
  },
  agentIntroCard: {
    backgroundColor: '#ECE4FC',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDD0F8',
    gap: 10,
  },
  agentIntroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agentIntroSummaryCol: {
    flex: 1,
    gap: 2,
  },
  agentName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B21B6',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  agentHeadlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161126',
    lineHeight: 19,
  },
  collapseToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  collapseToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  agentExpandedBody: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  agentIntroText: {
    fontSize: 13,
    color: '#161126',
    lineHeight: 19,
  },
  bulletList: {
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5DDF5',
  },
  bulletItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D3356',
    lineHeight: 18,
  },
  ineligibleSection: {
    gap: 12,
  },
  ineligibleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
    overflow: 'hidden',
  },
  ineligibleBannerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FECDD3',
  },
  ineligibleBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BE123C',
  },
  ineligibleBody: {
    padding: 16,
    gap: 14,
  },
  ineligibleReasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#161126',
    lineHeight: 20,
  },
  rulesList: {
    gap: 8,
    backgroundColor: '#FAF8FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  ruleLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#161126',
  },
  ruleStudentText: {
    fontSize: 12,
    color: '#047857',
    marginTop: 1,
  },
  ruleFailedText: {
    color: '#BE123C',
    fontWeight: '600',
  },
  moveHistoryNowBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  moveHistoryNowBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161126',
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E4466',
  },
  orderedList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    overflow: 'hidden',
  },
  orangeItemHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  orangeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EA580C',
  },
  orangeItemHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
  },
  itemBody: {
    padding: 16,
    gap: 12,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EDE5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepCircleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C1D95',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161126',
  },
  portalFieldSub: {
    fontSize: 13,
    color: '#4E4466',
    marginTop: 2,
  },
  docBox: {
    backgroundColor: '#FAF8FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAE3F8',
  },
  docInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docFileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#161126',
  },
  docMeta: {
    fontSize: 12,
    color: '#4E4466',
    marginTop: 2,
  },
  replaceDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  replaceDocBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  writeupBox: {
    backgroundColor: '#FAF8FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAE3F8',
    gap: 12,
  },
  writeupPreviewText: {
    fontSize: 14,
    color: '#2A2342',
    lineHeight: 21,
  },
  writeupFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAE3F8',
  },
  wordCountMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4E4466',
  },
  canvasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6D28D9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  canvasBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hodPreparedContainer: {
    gap: 12,
  },
  addressBox: {
    backgroundColor: '#FAF8FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 8,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#161126',
  },
  editAddrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editAddrPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  addressReadGrid: {
    gap: 6,
  },
  addressReadCol: {
    gap: 1,
  },
  addressMetaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#756A92',
  },
  addressMetaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#161126',
  },
  addressEditForm: {
    gap: 8,
  },
  addrField: {
    gap: 3,
  },
  addrFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4E4466',
  },
  addrTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4C6F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#161126',
  },
  saveAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6D28D9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    alignSelf: 'flex-start',
  },
  saveAddrBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hodDraftPreview: {
    backgroundColor: '#FAF8FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAE3F8',
  },
  hodDraftPreviewText: {
    fontSize: 12,
    color: '#3D3356',
    lineHeight: 18,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderScheduleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  hodActionStack: {
    gap: 8,
  },
  hodSecondaryPairRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
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
  secondaryActionBtnText: {
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
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  uploadPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedInlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  completedInlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  conversationSection: {
    gap: 8,
    marginTop: 4,
  },
  chatSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4E4466',
  },
  messageBubble: {
    padding: 14,
    borderRadius: 16,
    gap: 4,
  },
  artratBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  studentBubble: {
    backgroundColor: '#6D28D9',
    alignSelf: 'flex-end',
    maxWidth: '86%',
  },
  messageText: {
    fontSize: 14,
    color: '#161126',
    lineHeight: 20,
  },
  studentMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#756A92',
  },
  studentMessageTime: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  submitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 14,
  },
  otpTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
    overflow: 'hidden',
  },
  otpTaskCardVerified: {
    borderColor: '#A7F3D0',
  },
  otpStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  otpStripVerified: {
    backgroundColor: '#ECFDF5',
    borderBottomColor: '#A7F3D0',
  },
  otpStripText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
    flex: 1,
  },
  otpStripTextVerified: {
    color: '#047857',
  },
  otpBody: {
    padding: 16,
    gap: 12,
  },
  otpExplainText: {
    fontSize: 13,
    color: '#4E4466',
    lineHeight: 19,
  },
  otpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  otpCodeField: {
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
    width: 124,
  },
  otpVerifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6D28D9',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 11,
  },
  otpVerifyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitInfo: {
    gap: 4,
  },
  submitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161126',
  },
  submitDesc: {
    fontSize: 13,
    color: '#4E4466',
    lineHeight: 19,
  },
  submitPrimaryBtn: {
    backgroundColor: '#6D28D9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitPrimaryBtnDisabled: {
    opacity: 0.45,
  },
  submitPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    borderRadius: 12,
  },
  submittedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#047857',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5DDF5',
  },
  composerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5FC',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDD0F8',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 5,
    gap: 8,
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
  },
  composerInput: {
    flex: 1,
    fontSize: 14,
    color: '#161126',
    paddingVertical: 6,
  },
  sendCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCircleBtnDisabled: {
    opacity: 0.4,
  },
});
