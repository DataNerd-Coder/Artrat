import React, { useRef, useState } from 'react';
import {
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
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  FileText,
  Mic,
  Paperclip,
  PenLine,
  Send,
} from './icons';
import { sendChatToBackend } from '../api/client';
import {
  CuratedApplication,
  OrderedApplicationItem,
  ProfileFact,
  VaultDocument,
} from '../domain/types';
import { ArtratBot3D } from './ArtratBot3D';
import { GeminiCanvasModal } from './GeminiCanvasModal';
import {
  AttachedMediaItem,
  AttachedVoiceNote,
  CustomMediaAttachmentSheet,
  CustomVoiceRecordingBar,
  MediaAttachmentBubble,
  VoiceNoteBubble,
} from './CustomChatMediaBar';

export interface ExecutedChatAction {
  type:
    | 'search_scholarships'
    | 'add_task'
    | 'add_calendar_event'
    | 'open_canvas_draft';
  title: string;
  subtitle: string;
  draftContent?: string;
}

interface NewChatMessage {
  id: string;
  sender: 'student' | 'artrat';
  text: string;
  timestamp: string;
  createdApp?: CuratedApplication;
  executedAction?: ExecutedChatAction;
  voiceNote?: AttachedVoiceNote;
  media?: AttachedMediaItem;
}

interface NewChatScreenProps {
  initialDraft?: string;
  studentId?: string | null;
  profileFacts?: ProfileFact[];
  vaultDocs?: VaultDocument[];
  onBack: () => void;
  onProcessLinkOrMessage: (input: string) => CuratedApplication;
  onOpenCreatedApplication: (appId: string) => void;
  onOpenTasksTab?: () => void;
  onTriggerGlobalNotice?: (notice: string) => void;
}

const nowLabel = () => {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m < 10 ? '0' : ''}${m} ${h < 12 ? 'AM' : 'PM'}`;
};

const isLinkInput = (raw: string) =>
  /^https?:\/\//i.test(raw) || /\b[a-z0-9-]+\.(com|org|ng|edu|net)(\/|\b)/i.test(raw);

/** Short, human status lines shown while Artrat works. No model or algorithm names. */
function statusLinesFor(raw: string, hasMedia: boolean, hasVoice: boolean): string[] {
  const low = raw.toLowerCase();
  if (hasVoice) return ['Listening to your voice note…', 'Working on it…'];
  if (hasMedia) return ['Looking at what you shared…', 'Checking it against your Vault…'];
  if (isLinkInput(raw))
    return ['Opening the scholarship page…', 'Checking the requirements against your profile…'];
  if (/draft|canvas|essay|statement|letter/.test(low))
    return ['Pulling your details from your Vault…', 'Writing your draft…'];
  if (/task|remind|calendar|schedule|cbt/.test(low))
    return ['Setting that up for you…'];
  if (/search|find|scholarship|november|qualify/.test(low))
    return ['Looking for scholarships that fit you…', 'Checking eligibility…'];
  return ['Thinking…'];
}

function inferAction(raw: string, reply: string): ExecutedChatAction | undefined {
  const low = raw.toLowerCase();
  if (/draft|canvas|personal statement|essay|hod letter/.test(low)) {
    return {
      type: 'open_canvas_draft',
      title: low.includes('hod') ? 'HOD attestation letter' : 'Personal statement',
      subtitle: 'Built only from details in your Vault',
      draftContent: reply,
    };
  }
  if (/calendar|schedule|cbt|exam date/.test(low)) {
    return { type: 'add_calendar_event', title: raw, subtitle: 'Added to Google Calendar · reminder 48h before' };
  }
  if (/task|remind|todo|follow up/.test(low)) {
    return { type: 'add_task', title: raw, subtitle: 'Added to your Tasks · daily reminders until done' };
  }
  if (/search|find|qualify/.test(low)) {
    return { type: 'search_scholarships', title: 'Matches found', subtitle: 'Checked against your profile and Vault' };
  }
  return undefined;
}

export const NewChatScreen: React.FC<NewChatScreenProps> = ({
  initialDraft = '',
  studentId = null,
  profileFacts = [],
  vaultDocs = [],
  onBack,
  onProcessLinkOrMessage,
  onOpenCreatedApplication,
  onOpenTasksTab,
  onTriggerGlobalNotice,
}) => {
  const scrollRef = useRef<ScrollView | null>(null);
  const [input, setInput] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [statusIdx, setStatusIdx] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<AttachedMediaItem | null>(null);
  const [canvasItem, setCanvasItem] = useState<OrderedApplicationItem | null>(null);
  const [messages, setMessages] = useState<NewChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'artrat',
      text: 'Hi Chisom 👋 Paste a scholarship link, send a voice note, share a photo or PDF, or just tell me what you need — search, a reminder, a calendar date, or a draft.',
      timestamp: nowLabel(),
    },
  ]);

  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

  const studentContext = () =>
    [
      'Student: Chisom Kamsiyochukwu Okafor, 200L B.Eng Electrical Engineering, University of Nigeria, Nsukka. CGPA 4.21/5.00, UTME 308. Anambra (Njikoka).',
      profileFacts.length ? `Facts: ${profileFacts.map((f) => `${f.label}: ${f.value}`).join(' | ')}` : '',
      vaultDocs.length ? `Vault: ${vaultDocs.map((d) => d.title).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

  const pushArtrat = (msg: Omit<NewChatMessage, 'id' | 'sender' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      { id: `art-${Date.now()}`, sender: 'artrat', timestamp: nowLabel(), ...msg },
    ]);
    setBusy(false);
    scrollDown();
  };

  const send = (opts: { text?: string; voice?: AttachedVoiceNote; media?: AttachedMediaItem | null } = {}) => {
    const raw = (opts.text ?? input).trim();
    const media = opts.media ?? pendingMedia;
    const voice = opts.voice;
    if (busy || (!raw && !media && !voice)) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `stu-${Date.now()}`,
        sender: 'student',
        text: raw,
        timestamp: nowLabel(),
        voiceNote: voice,
        media: media ?? undefined,
      },
    ]);
    setInput('');
    setPendingMedia(null);
    setBusy(true);
    const lines = statusLinesFor(raw, Boolean(media), Boolean(voice));
    setStatusLines(lines);
    setStatusIdx(0);
    lines.forEach((_, i) => i > 0 && setTimeout(() => setStatusIdx(i), i * 700));
    scrollDown();

    if (raw && !media && !voice && isLinkInput(raw)) {
      setTimeout(() => {
        const app = onProcessLinkOrMessage(raw);
        pushArtrat({
          text: app.chatTurns[app.chatTurns.length - 1]?.text || 'I checked this scholarship for you.',
          createdApp: app,
        });
      }, 1100);
      return;
    }

    void sendChatToBackend({
      message: raw || (voice ? 'Voice note from student' : 'Attachment from student'),
      student_id: studentId,
      media_data_url: media?.mediaDataUrl ?? null,
      audio_data_url: voice?.audioDataUrl ?? null,
      output_format: 'text',
      context: studentContext(),
    }).then((res) => {
      const reply =
        res?.reply ||
        (media
          ? `Got your ${media.kind === 'document' ? 'document' : 'image'} (${media.fileName}). I've saved it to your Vault and I'll use it wherever a scholarship asks for it.`
          : voice
            ? "I got your voice note. I couldn't reach the server just now, so please try again in a moment."
            : "I couldn't reach the server just now. Please try again in a moment.");
      const action = inferAction(raw, reply);
      if (action?.type === 'add_task') onTriggerGlobalNotice?.('Task added');
      if (action?.type === 'add_calendar_event') onTriggerGlobalNotice?.('Added to your calendar');
      pushArtrat({ text: reply, executedAction: action });
    });
  };

  const suggestions = [
    { icon: <PenLine size={15} color="#5B21B6" />, label: 'Draft my personal statement', send: 'Draft a 250-word personal statement using my transformer project' },
    { icon: <CalendarClock size={15} color="#5B21B6" />, label: 'Remind me to get my HOD signature', send: 'Remind me to collect my signed HOD profile by Friday' },
    { icon: <CheckCircle2 size={15} color="#5B21B6" />, label: 'Which November scholarships fit me?', send: 'Search November scholarships I qualify for' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button">
          <ArrowLeft size={18} color="#FFFFFF" />
        </Pressable>
        <View style={styles.avatar}>
          <ArtratBot3D mood={busy ? 'launch' : 'happy'} size="sm" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Artrat</Text>
          <Text style={styles.headerSubtitle}>{busy ? 'typing…' : 'online'}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.datePill}>
          <Text style={styles.datePillText}>Today</Text>
        </View>

        {messages.map((msg) => {
          const mine = msg.sender === 'student';
          return (
            <View key={msg.id} style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {msg.media ? <MediaAttachmentBubble media={msg.media} isStudent={mine} /> : null}
                {msg.voiceNote ? <VoiceNoteBubble voiceNote={msg.voiceNote} isStudent={mine} /> : null}
                {msg.text ? (
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{msg.text}</Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Text style={[styles.time, mine && styles.timeMine]}>{msg.timestamp}</Text>
                  {mine ? <Text style={styles.ticks}>✓✓</Text> : null}
                </View>
              </View>

              {msg.executedAction ? (
                <View style={styles.actionCard}>
                  <View style={styles.actionHeader}>
                    {msg.executedAction.type === 'open_canvas_draft' ? (
                      <FileText size={14} color="#5B21B6" />
                    ) : msg.executedAction.type === 'add_calendar_event' ? (
                      <CalendarClock size={14} color="#047857" />
                    ) : (
                      <CheckSquare size={14} color="#5B21B6" />
                    )}
                    <Text style={styles.actionTitle} numberOfLines={1}>{msg.executedAction.title}</Text>
                  </View>
                  <Text style={styles.actionSub}>{msg.executedAction.subtitle}</Text>
                  {msg.executedAction.type === 'open_canvas_draft' && msg.executedAction.draftContent ? (
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() =>
                        setCanvasItem({
                          id: `canvas-${Date.now()}`,
                          orderIndex: 1,
                          type: 'writeup',
                          title: msg.executedAction!.title,
                          portalFieldLabel: msg.executedAction!.subtitle,
                          status: 'ready',
                          writeupWordLimit: 250,
                          writeupContent: msg.executedAction!.draftContent,
                        })
                      }
                    >
                      <PenLine size={13} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Open in Canvas</Text>
                    </Pressable>
                  ) : null}
                  {msg.executedAction.type === 'add_task' && onOpenTasksTab ? (
                    <Pressable style={styles.actionBtn} onPress={onOpenTasksTab}>
                      <CheckSquare size={13} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>View Tasks</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {msg.createdApp ? (
                <Pressable
                  style={[styles.resultCard, msg.createdApp.status === 'not_eligible' && styles.resultCardBad]}
                  onPress={() => onOpenCreatedApplication(msg.createdApp!.id)}
                >
                  <View style={styles.resultHead}>
                    {msg.createdApp.status === 'not_eligible' ? (
                      <AlertCircle size={13} color="#BE123C" />
                    ) : (
                      <CheckCircle2 size={13} color="#047857" />
                    )}
                    <Text
                      style={[styles.resultHeadText, { color: msg.createdApp.status === 'not_eligible' ? '#BE123C' : '#065F46' }]}
                      numberOfLines={1}
                    >
                      {msg.createdApp.status === 'not_eligible'
                        ? `Not eligible · moves to History in ${msg.createdApp.daysUntilHistoryWipe ?? 7}d`
                        : `${msg.createdApp.statusSummary} · added to Applications`}
                    </Text>
                  </View>
                  <View style={styles.resultBody}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultSponsor}>{msg.createdApp.sponsor}</Text>
                      <Text style={styles.resultTitle}>{msg.createdApp.title}</Text>
                    </View>
                    <ArrowRight size={14} color="#4C1D95" />
                  </View>
                </Pressable>
              ) : null}
            </View>
          );
        })}

        {busy ? (
          <View style={[styles.row, styles.rowTheirs]}>
            <View style={[styles.bubble, styles.bubbleTheirs, styles.typingBubble]}>
              <View style={styles.dots}>
                <View style={styles.dot} />
                <View style={[styles.dot, { opacity: 0.7 }]} />
                <View style={[styles.dot, { opacity: 0.4 }]} />
              </View>
              <Text style={styles.typingText}>
                {statusLines[Math.min(statusIdx, statusLines.length - 1)] || 'Thinking…'}
              </Text>
            </View>
          </View>
        ) : null}

        {messages.length === 1 && !busy ? (
          <View style={styles.suggestBlock}>
            {suggestions.map((s) => (
              <Pressable key={s.label} style={styles.suggestChip} onPress={() => send({ text: s.send })}>
                {s.icon}
                <Text style={styles.suggestText}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <CustomMediaAttachmentSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSelectMedia={(m) => setPendingMedia(m)}
        />

        {pendingMedia ? (
          <View style={styles.pendingRow}>
            <FileText size={14} color="#5B21B6" />
            <Text style={styles.pendingText} numberOfLines={1}>{pendingMedia.fileName}</Text>
            <Pressable onPress={() => setPendingMedia(null)}>
              <Text style={styles.pendingRemove}>Remove</Text>
            </Pressable>
          </View>
        ) : null}

        {recording ? (
          <CustomVoiceRecordingBar
            onCancel={() => setRecording(false)}
            onSendVoiceNote={(note) => {
              setRecording(false);
              send({ voice: note, text: '' });
            }}
          />
        ) : (
          <View style={styles.composerRow}>
            <View style={styles.composerPill}>
              <Pressable
                style={styles.iconBtn}
                onPress={() => setSheetOpen((v) => !v)}
                accessibilityLabel="Attach photo or document"
              >
                <Paperclip size={18} color="#6B5F87" />
              </Pressable>
              <TextInput
                style={styles.composerInput}
                value={input}
                onChangeText={setInput}
                placeholder="Message"
                placeholderTextColor="#8B80A6"
                onSubmitEditing={() => send()}
                multiline
              />
            </View>
            {input.trim() || pendingMedia ? (
              <Pressable
                style={[styles.roundBtn, busy && { opacity: 0.5 }]}
                disabled={busy}
                onPress={() => send()}
                accessibilityLabel="Send"
              >
                <Send size={17} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                style={[styles.roundBtn, busy && { opacity: 0.5 }]}
                disabled={busy}
                onPress={() => setRecording(true)}
                accessibilityLabel="Record voice note"
              >
                <Mic size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <GeminiCanvasModal
        visible={Boolean(canvasItem)}
        item={canvasItem}
        scholarshipTitle="Draft"
        onClose={() => setCanvasItem(null)}
        onSaveContent={(_id, content) => {
          if (canvasItem) setCanvasItem({ ...canvasItem, writeupContent: content });
          onTriggerGlobalNotice?.('Draft saved');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFEAF8' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#5B21B6',
  },
  backBtn: { padding: 6 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EDE4FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  scrollArea: { flex: 1 },
  scrollContent: {
    padding: 12,
    paddingBottom: 20,
    gap: 6,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
  },
  datePill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  datePillText: { fontSize: 11, color: '#4E4466', fontWeight: '600' },
  row: { gap: 6, marginVertical: 2 },
  rowMine: { alignItems: 'flex-end' },
  rowTheirs: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 5,
    borderRadius: 14,
    gap: 6,
  },
  bubbleMine: { backgroundColor: '#6D28D9', borderTopRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 14.5, lineHeight: 20, color: '#161126' },
  bubbleTextMine: { color: '#FFFFFF' },
  metaRow: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4 },
  time: { fontSize: 10.5, color: '#8B80A6' },
  timeMine: { color: 'rgba(255,255,255,0.75)' },
  ticks: { fontSize: 10.5, color: '#C4B5FD' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8 },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6D28D9' },
  typingText: { fontSize: 13, color: '#4E4466', fontStyle: 'italic' },
  actionCard: {
    maxWidth: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    gap: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#6D28D9',
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: '#161126', flex: 1 },
  actionSub: { fontSize: 12, color: '#4E4466' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#6D28D9',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginTop: 2,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  resultCard: {
    maxWidth: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  resultCardBad: { borderLeftColor: '#E11D48' },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingTop: 8 },
  resultHeadText: { fontSize: 12, fontWeight: '700', flex: 1 },
  resultBody: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  resultSponsor: { fontSize: 11, color: '#4E4466' },
  resultTitle: { fontSize: 14, fontWeight: '700', color: '#161126' },
  suggestBlock: { gap: 8, marginTop: 10 },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 20,
  },
  suggestText: { fontSize: 13, color: '#3B2A63', fontWeight: '600' },
  bottomBar: { paddingHorizontal: 8, paddingVertical: 8, gap: 6 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
  },
  pendingText: { flex: 1, fontSize: 12.5, color: '#161126' },
  pendingRemove: { fontSize: 12, color: '#BE123C', fontWeight: '700' },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
  },
  composerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 46,
  },
  iconBtn: { padding: 8 },
  composerInput: {
    flex: 1,
    fontSize: 15,
    color: '#161126',
    paddingVertical: 9,
    paddingHorizontal: 4,
    maxHeight: 120,
  },
  roundBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
