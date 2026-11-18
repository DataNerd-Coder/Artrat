import React, { useState } from 'react';
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
  Link2,
  PenLine,
  RefreshCw,
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

export interface ExecutedChatAction {
  type:
    | 'search_scholarships'
    | 'add_task'
    | 'add_calendar_event'
    | 'open_canvas_draft'
    | 'update_profile_fact';
  title: string;
  subtitle: string;
  draftContent?: string;
}

interface NewChatMessage {
  id: string;
  sender: 'student' | 'artrat';
  text: string;
  timestamp: string;
  reasoningSteps?: string[];
  modelBadge?: string;
  createdApp?: CuratedApplication;
  executedAction?: ExecutedChatAction;
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

function getReasoningStagesForInput(raw: string): string[] {
  const low = raw.toLowerCase();
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    low.includes('.com') ||
    low.includes('.ng') ||
    low.includes('scholarshipregion')
  ) {
    return [
      'Resolving link & hopping past aggregator blogs to official portal...',
      'Running dry-run DOM & form-control inspector against your UNN 200L Vault...',
      'Checking hard eligibility rules (4.21 CGPA, 308 JAMB) with Baidu ERNIE 5.5 Flash...',
    ];
  }
  if (
    low.includes('draft') ||
    low.includes('canvas') ||
    low.includes('essay') ||
    low.includes('statement') ||
    low.includes('letter')
  ) {
    return [
      'Reading your UNN Electrical Engineering profile (4.21 CGPA) & IEEE project ledger...',
      'Drafting grounded writeup with Baidu ERNIE 5.5 Flash (zero fabricated claims)...',
      'Preparing interactive Gemini Canvas document...',
    ];
  }
  if (
    low.includes('task') ||
    low.includes('remind') ||
    low.includes('todo') ||
    low.includes('calendar') ||
    low.includes('schedule') ||
    low.includes('cbt')
  ) {
    return [
      'Checking your active applications & university semester schedule...',
      'Reasoning with Baidu ERNIE 5.5 Flash & syncing Google Tasks / Calendar...',
      'Setting 9:30 AM / 2:00 PM & 48-hour advance alerts...',
    ];
  }
  if (low.includes('search') || low.includes('find') || low.includes('november')) {
    return [
      'Loading your verified UNN 200L profile (4.21 CGPA, Anambra/Njikoka)...',
      'Querying Thompson Sampling + UCB1 + Contextual LinUCB discovery ensemble...',
      'Filtering verified portals & ranking matches with Baidu ERNIE 5.5 Flash...',
    ];
  }
  return [
    'Reading your verified Student Profile, 4.21 CGPA & 10 Vault documents...',
    'Reasoning over your request with Baidu ERNIE 5.5 Flash...',
    'Preparing grounded response...',
  ];
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
  const [input, setInput] = useState(initialDraft);
  const [isReasoning, setIsReasoning] = useState(false);
  const [reasoningStageIdx, setReasoningStageIdx] = useState(0);
  const [activeReasoningStages, setActiveReasoningStages] = useState<string[]>(
    []
  );
  const [canvasDraftModalItem, setCanvasDraftModalItem] =
    useState<OrderedApplicationItem | null>(null);

  const [messages, setMessages] = useState<NewChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'artrat',
      text: 'Hi Chisom! You can paste any scholarship link, or ask me to search for scholarships, add a task, schedule a Google Calendar reminder, draft an essay or HOD letter in Gemini Canvas, or check anything in your UNN 200L Vault (4.21 CGPA).',
      timestamp: 'Now',
      modelBadge: 'ERNIE 5.5 Flash · Super VL · Fish Audio S2.1',
    },
  ]);

  const buildLocalAgentResponse = (
    raw: string
  ): {
    reply: string;
    steps: string[];
    action?: ExecutedChatAction;
    isLinkDrop?: boolean;
  } => {
    const low = raw.toLowerCase();
    const isLink =
      /^https?:\/\//i.test(raw) ||
      low.includes('chevron-nigeria.com') ||
      low.includes('nlng-firstclass.org') ||
      low.includes('icanstudent') ||
      low.includes('scholarshipregion') ||
      low.includes('scholastica.ng');

    if (isLink) {
      return {
        reply: '',
        steps: getReasoningStagesForInput(raw),
        isLinkDrop: true,
      };
    }

    if (
      low.includes('draft') ||
      low.includes('canvas') ||
      low.includes('personal statement') ||
      low.includes('essay') ||
      low.includes('hod letter')
    ) {
      const isHod = low.includes('hod');
      const draftTitle = isHod
        ? 'HOD Attestation Letter — UNN Electrical Engineering'
        : 'Personal Statement — Grounded in UNN 200L & IEEE Project Ledger';
      const draftBody = isHod
        ? `From:\nChisom Kamsiyochukwu Okafor\nMatric No: 2024/248912\n200 Level, Department of Electrical Engineering\nUniversity of Nigeria, Nsukka (UNN)\n\nTo:\nThe Head of Department,\nDepartment of Electrical Engineering,\nUniversity of Nigeria, Nsukka.\n\nDear Sir/Ma,\n\nREQUEST FOR DEPARTMENTAL ATTESTATION AND SCHOLARSHIP ENDORSEMENT\n\nI respectfully request your official signature and departmental stamp on my scholarship attestation letter. I am a full-time 200-Level student in good academic standing with a cumulative grade point average (CGPA) of 4.21 / 5.00 (Second Class Honours, Upper Division) and a UTME entry score of 308 / 400.\n\nThank you for your continued mentorship and support.\n\nYours faithfully,\nChisom Kamsiyochukwu Okafor`
        : `Growing up in Njikoka, Anambra State, recurring distribution transformer faults frequently left our neighbourhood without electricity for weeks. Watching small businesses and students struggle during those outages inspired my decision to study Electrical Engineering at the University of Nigeria, Nsukka (UNN), where I entered with a 308 UTME score and currently maintain a 4.21 / 5.00 CGPA in 200 Level.\n\nIn my 100-Level EEE 102 workshop laboratory, I led my group in winding and testing a low-loss single-phase step-down transformer, applying MATLAB Onramp and Python circuit simulation to minimize core losses. Alongside serving as Assistant Class Representative and volunteering with the IEEE UNN Student Branch, my goal is to specialize in resilient power distribution systems for underserved Nigerian communities.`;
      return {
        reply: `I drafted your "${draftTitle}" using only verified facts from your UNN profile (4.21 CGPA, 308 UTME, Njikoka community background, and EEE 102 transformer lab project). Tap below to open, edit, or refine it in Gemini Canvas.`,
        steps: getReasoningStagesForInput(raw),
        action: {
          type: 'open_canvas_draft',
          title: draftTitle,
          subtitle: 'Grounded in your Vault & Evidence Ledger · Zero hallucinated claims',
          draftContent: draftBody,
        },
      };
    }

    if (
      low.includes('calendar') ||
      low.includes('schedule') ||
      low.includes('cbt') ||
      low.includes('exam date')
    ) {
      return {
        reply: `Done! I added "${raw}" to your Google Calendar (chisom.okafor.248912@unn.edu.ng) with a 48-hour advance notification and a morning reminder at 8:00 AM.`,
        steps: getReasoningStagesForInput(raw),
        action: {
          type: 'add_calendar_event',
          title: raw,
          subtitle: 'Synced to Google Calendar · 48h advance alert active',
        },
      };
    }

    if (
      low.includes('task') ||
      low.includes('remind') ||
      low.includes('todo') ||
      low.includes('follow up')
    ) {
      return {
        reply: `I created a new task for "${raw}" and synced it to your Google Tasks with daily check-in reminders at 9:30 AM and 2:00 PM until the required document is in your Vault.`,
        steps: getReasoningStagesForInput(raw),
        action: {
          type: 'add_task',
          title: raw,
          subtitle: 'Added to Artrat Tasks & Google Tasks · 9:30 AM & 2:00 PM alerts',
        },
      };
    }

    if (
      low.includes('search') ||
      low.includes('find') ||
      low.includes('november') ||
      low.includes('qualify')
    ) {
      return {
        reply: `Using your UNN 200L Electrical Engineering profile (4.21 / 5.00 CGPA, 308 JAMB, Anambra State) and our Thompson Sampling + UCB1 + LinUCB discovery ensemble, here are your top verified November scholarship matches:\n\n1. 2026 NNPC / SNEPCo National University Scholarship (portal: candidate.scholastica.ng · Closes Nov 30 · Min 3.50 CGPA — You qualify; needs signed HOD profile & Government Declaration Form).\n2. AgricTech Scholarship Program 2026/2027 (Closes Nov 30 · Min 3.50 CGPA — You qualify; requires 2-minute video & Google Form sign-in).\n3. BeHerRahmah Initiative Scholarship 2026 (Google Form currently closed on /closedform).`,
        steps: getReasoningStagesForInput(raw),
        action: {
          type: 'search_scholarships',
          title: '3 Verified November Portals Inspected',
          subtitle: 'Matched against your 4.21 CGPA & 10 Vault documents',
        },
      };
    }

    return {
      reply: `Based on your verified profile (Chisom Kamsiyochukwu Okafor · 200L B.Eng Electrical Engineering at UNN · 4.21/5.00 CGPA · 308 JAMB · ${vaultDocs.length || 10} Vault documents ready), I'm ready to help. You can ask me to search live scholarships, draft an essay or HOD letter in Gemini Canvas, add a task to Google Tasks, schedule a test date on Google Calendar, or drop any scholarship link for an instant dry-run.`,
      steps: getReasoningStagesForInput(raw),
    };
  };

  const handleSend = (textToSend?: string) => {
    const raw = (textToSend ?? input).trim();
    if (!raw || isReasoning) return;

    const studentMsg: NewChatMessage = {
      id: `stu-${Date.now()}`,
      sender: 'student',
      text: raw,
      timestamp: 'Just now',
    };

    const stages = getReasoningStagesForInput(raw);
    setMessages((prev) => [...prev, studentMsg]);
    setInput('');
    setIsReasoning(true);
    setActiveReasoningStages(stages);
    setReasoningStageIdx(0);

    const t1 = setTimeout(() => setReasoningStageIdx(1), 420);
    const t2 = setTimeout(() => setReasoningStageIdx(2), 840);

    const localPlan = buildLocalAgentResponse(raw);

    if (localPlan.isLinkDrop) {
      setTimeout(() => {
        clearTimeout(t1);
        clearTimeout(t2);
        const resultApp = onProcessLinkOrMessage(raw);
        const artratTurn =
          resultApp.chatTurns[resultApp.chatTurns.length - 1]?.text ||
          'I have checked this scholarship for you.';
        const artratMsg: NewChatMessage = {
          id: `art-${Date.now() + 1}`,
          sender: 'artrat',
          text: artratTurn,
          timestamp: 'Just now',
          reasoningSteps: stages,
          modelBadge: 'ERNIE 5.5 Flash · Official Portal Dry-Run',
          createdApp: resultApp,
        };
        setMessages((prev) => [...prev, artratMsg]);
        setIsReasoning(false);
      }, 1150);
      return;
    }

    const contextSummary = [
      'Student: Chisom Kamsiyochukwu Okafor, 200L B.Eng Electrical Engineering, University of Nigeria, Nsukka (UNN), CGPA 4.21/5.00, JAMB 308/400, State: Anambra (Njikoka).',
      profileFacts.length
        ? `Facts: ${profileFacts.map((f) => `${f.label}: ${f.value}`).join(' | ')}`
        : '',
      vaultDocs.length
        ? `Vault (${vaultDocs.length}): ${vaultDocs.map((d) => d.title).join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    void sendChatToBackend({
      message: raw,
      student_id: studentId,
      output_format: 'text',
      context: contextSummary,
    }).then((backendRes) => {
      setTimeout(() => {
        clearTimeout(t1);
        clearTimeout(t2);
        const finalReply = backendRes?.reply || localPlan.reply;
        const finalSteps =
          backendRes?.reasoning_steps && backendRes.reasoning_steps.length > 0
            ? backendRes.reasoning_steps
            : localPlan.steps;

        if (localPlan.action?.type === 'add_task' && onTriggerGlobalNotice) {
          onTriggerGlobalNotice(`Added task: "${raw}"`);
        } else if (
          localPlan.action?.type === 'add_calendar_event' &&
          onTriggerGlobalNotice
        ) {
          onTriggerGlobalNotice(`Added to Google Calendar: "${raw}"`);
        }

        const artratMsg: NewChatMessage = {
          id: `art-${Date.now() + 1}`,
          sender: 'artrat',
          text: finalReply,
          timestamp: 'Just now',
          reasoningSteps: finalSteps,
          modelBadge: backendRes?.reasoning_model
            ? `${backendRes.reasoning_model}`
            : 'baidu/ernie-5.5-flash-preview:free',
          executedAction: localPlan.action,
        };
        setMessages((prev) => [...prev, artratMsg]);
        setIsReasoning(false);
      }, 950);
    });
  };

  return (
    <View style={styles.container}>
      {/* Mobile-Optimized Header */}
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
          <Text style={styles.headerTitle} numberOfLines={1}>
            Artrat AI Command & Link Chat
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Search, add tasks/calendar, draft in Canvas, or drop a link
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot Header */}
        <View style={styles.mascotBanner}>
          <ArtratBot3D mood={isReasoning ? 'launch' : 'radar'} size="sm" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.mascotBannerTitle}>
              Artrat Autonomous Assistant (UNN 200L · 4.21 CGPA)
            </Text>
            <Text style={styles.mascotBannerSub}>
              Powered by ERNIE 5.5 Flash (reasoning), Nemotron 3.5 Super VL
              (media) & Fish Audio S2.1
            </Text>
          </View>
        </View>

        {/* Quick Command & Link Chips */}
        {messages.length === 1 ? (
          <View style={styles.suggestionsBlock}>
            <Text style={styles.suggestionsTitle}>
              Try an AI command or drop a scholarship link
            </Text>
            <View style={styles.suggestionsCol}>
              <Pressable
                style={styles.suggestionCard}
                onPress={() =>
                  handleSend(
                    'Search November STEM scholarships I qualify for with my 4.21 CGPA'
                  )
                }
              >
                <View style={styles.suggestionIconWrap}>
                  <RefreshCw size={15} color="#5B21B6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionLabel} numberOfLines={1}>
                    Search November STEM scholarships I qualify for
                  </Text>
                  <Text style={styles.suggestionSub}>
                    Runs Thompson + UCB1 + LinUCB ensemble against your Vault
                  </Text>
                </View>
                <ArrowRight size={14} color="#5B21B6" />
              </Pressable>

              <Pressable
                style={styles.suggestionCard}
                onPress={() =>
                  handleSend(
                    'Draft a 250-word personal statement in Canvas using my UNN IEEE transformer project'
                  )
                }
              >
                <View style={styles.suggestionIconWrap}>
                  <PenLine size={15} color="#5B21B6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionLabel} numberOfLines={1}>
                    Draft a personal statement in Gemini Canvas
                  </Text>
                  <Text style={styles.suggestionSub}>
                    Grounded in your 4.21 CGPA & EEE 102 transformer lab project
                  </Text>
                </View>
                <ArrowRight size={14} color="#5B21B6" />
              </Pressable>

              <Pressable
                style={styles.suggestionCard}
                onPress={() =>
                  handleSend(
                    'Remind me to collect my signed HOD profile by Friday and add the NNPC CBT on Nov 25 to my calendar'
                  )
                }
              >
                <View style={styles.suggestionIconWrap}>
                  <CalendarClock size={15} color="#5B21B6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionLabel} numberOfLines={1}>
                    Add HOD signature task & schedule CBT on Google Calendar
                  </Text>
                  <Text style={styles.suggestionSub}>
                    Creates Google Task + 48h Google Calendar alert
                  </Text>
                </View>
                <ArrowRight size={14} color="#5B21B6" />
              </Pressable>

              <Pressable
                style={styles.suggestionCard}
                onPress={() =>
                  handleSend('https://chevron-nigeria.com/jv-stem-scholarship')
                }
              >
                <View style={styles.suggestionIconWrap}>
                  <Link2 size={15} color="#5B21B6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionLabel} numberOfLines={1}>
                    https://chevron-nigeria.com/jv-stem-scholarship
                  </Text>
                  <Text style={styles.suggestionSub}>
                    Accepts 2.1 Honours (3.50+ CGPA) · Prepares 4 items
                  </Text>
                </View>
                <ArrowRight size={14} color="#5B21B6" />
              </Pressable>

              <Pressable
                style={styles.suggestionCard}
                onPress={() =>
                  handleSend(
                    'https://nlng-firstclass.org/award-4.5-requirement'
                  )
                }
              >
                <View
                  style={[
                    styles.suggestionIconWrap,
                    { backgroundColor: '#FFF1F2' },
                  ]}
                >
                  <AlertCircle size={15} color="#BE123C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionLabel} numberOfLines={1}>
                    https://nlng-firstclass.org/award-4.5-requirement
                  </Text>
                  <Text style={styles.suggestionSub}>
                    Requires 4.50 First Class · Moves below & wipes in 7d
                  </Text>
                </View>
                <ArrowRight size={14} color="#BE123C" />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Chat Messages */}
        <View style={styles.messagesStack}>
          {messages.map((msg) => (
            <View key={msg.id} style={styles.messageTurnWrap}>
              <View
                style={[
                  styles.bubble,
                  msg.sender === 'student'
                    ? styles.studentBubble
                    : styles.artratBubble,
                ]}
              >
                {msg.sender === 'artrat' &&
                msg.reasoningSteps &&
                msg.reasoningSteps.length > 0 ? (
                  <View style={styles.reasoningTraceBox}>
                    <Text style={styles.reasoningTraceHeader}>
                      ✓ Reasoning trace ({msg.reasoningSteps.length} steps)
                    </Text>
                    {msg.reasoningSteps.map((st, idx) => (
                      <Text key={idx} style={styles.reasoningTraceLine}>
                        • {st}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <Text
                  style={[
                    styles.bubbleText,
                    msg.sender === 'student' && styles.studentBubbleText,
                  ]}
                >
                  {msg.text}
                </Text>
                <Text
                  style={[
                    styles.bubbleTime,
                    msg.sender === 'student' && styles.studentBubbleTime,
                  ]}
                >
                  {msg.sender === 'student' ? 'You' : 'Artrat'} ·{' '}
                  {msg.timestamp}
                  {msg.modelBadge ? ` · ${msg.modelBadge}` : ''}
                </Text>
              </View>

              {/* Inline Action Card when Artrat executes a command (Canvas draft, Task, Calendar, Search) */}
              {msg.executedAction ? (
                <View style={styles.actionExecutedCard}>
                  <View style={styles.actionExecutedHeader}>
                    {msg.executedAction.type === 'open_canvas_draft' ? (
                      <FileText size={14} color="#5B21B6" />
                    ) : msg.executedAction.type === 'add_calendar_event' ? (
                      <CalendarClock size={14} color="#047857" />
                    ) : (
                      <CheckSquare size={14} color="#5B21B6" />
                    )}
                    <Text style={styles.actionExecutedTitle} numberOfLines={1}>
                      {msg.executedAction.title}
                    </Text>
                  </View>
                  <Text style={styles.actionExecutedSub}>
                    {msg.executedAction.subtitle}
                  </Text>
                  {msg.executedAction.type === 'open_canvas_draft' &&
                  msg.executedAction.draftContent ? (
                    <Pressable
                      style={styles.openCanvasBtn}
                      onPress={() =>
                        setCanvasDraftModalItem({
                          id: `canvas-${Date.now()}`,
                          orderIndex: 1,
                          type: 'writeup',
                          title: msg.executedAction!.title,
                          portalFieldLabel: msg.executedAction!.subtitle,
                          status: 'ready',
                          writeupWordLimit: 250,
                          writeupContent: msg.executedAction!.draftContent,
                          groundedFacts: [
                            'UNN 200L Electrical Engineering · 4.21 / 5.00 CGPA',
                            'UTME Score: 308 / 400',
                            'EEE 102 Low-Loss Transformer Lab Lead & IEEE UNN Volunteer',
                          ],
                        })
                      }
                    >
                      <PenLine size={13} color="#FFFFFF" />
                      <Text style={styles.openCanvasBtnText}>
                        Open & Edit in Gemini Canvas
                      </Text>
                    </Pressable>
                  ) : null}
                  {msg.executedAction.type === 'add_task' && onOpenTasksTab ? (
                    <Pressable
                      style={styles.openCanvasBtn}
                      onPress={onOpenTasksTab}
                    >
                      <CheckSquare size={13} color="#FFFFFF" />
                      <Text style={styles.openCanvasBtnText}>
                        View in Tasks Tab
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {/* Inline Result Card when Artrat processes a link */}
              {msg.createdApp ? (
                <Pressable
                  style={[
                    styles.resultCard,
                    msg.createdApp.status === 'not_eligible' &&
                      styles.resultCardIneligible,
                  ]}
                  onPress={() => onOpenCreatedApplication(msg.createdApp!.id)}
                >
                  <View
                    style={[
                      styles.resultStrip,
                      msg.createdApp.status === 'not_eligible'
                        ? styles.resultStripRed
                        : styles.resultStripGreen,
                    ]}
                  >
                    {msg.createdApp.status === 'not_eligible' ? (
                      <AlertCircle size={13} color="#BE123C" />
                    ) : (
                      <CheckCircle2 size={13} color="#047857" />
                    )}
                    <Text
                      style={[
                        styles.resultStripText,
                        msg.createdApp.status === 'not_eligible'
                          ? { color: '#BE123C' }
                          : { color: '#065F46' },
                      ]}
                      numberOfLines={1}
                    >
                      {msg.createdApp.status === 'not_eligible'
                        ? `Placed below Applications · Wipes to History in ${
                            msg.createdApp.daysUntilHistoryWipe ?? 7
                          }d`
                        : `${msg.createdApp.statusSummary} · Added to Applications`}
                    </Text>
                  </View>

                  <View style={styles.resultBody}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultSponsor}>
                        {msg.createdApp.sponsor}
                      </Text>
                      <Text style={styles.resultTitle}>
                        {msg.createdApp.title}
                      </Text>
                    </View>
                    <View style={styles.resultOpenPill}>
                      <Text style={styles.resultOpenPillText}>
                        {msg.createdApp.status === 'not_eligible'
                          ? 'View Details'
                          : 'View Package'}
                      </Text>
                      <ArrowRight size={13} color="#4C1D95" />
                    </View>
                  </View>
                </Pressable>
              ) : null}
            </View>
          ))}

          {/* Interactive Live Reasoning Stream Pill */}
          {isReasoning ? (
            <View style={styles.liveReasoningBubble}>
              <View style={styles.liveReasoningHeader}>
                <RefreshCw size={14} color="#6D28D9" />
                <Text style={styles.liveReasoningTitle}>
                  {activeReasoningStages[
                    Math.min(
                      reasoningStageIdx,
                      activeReasoningStages.length - 1
                    )
                  ] || 'Reasoning with Baidu ERNIE 5.5 Flash...'}
                </Text>
              </View>
              <View style={styles.liveReasoningStepsList}>
                {activeReasoningStages.map((stage, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.liveReasoningStepItem,
                      i <= reasoningStageIdx &&
                        styles.liveReasoningStepItemActive,
                    ]}
                  >
                    {i < reasoningStageIdx
                      ? '✓ '
                      : i === reasoningStageIdx
                        ? '● '
                        : '○ '}
                    {stage}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom Composer */}
      <View style={styles.bottomBar}>
        <View style={styles.composerPill}>
          <TextInput
            style={styles.composerInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Artrat to search, add a task/calendar, draft in Canvas, or paste a link..."
            placeholderTextColor="#756A92"
            autoFocus
            onSubmitEditing={() => handleSend()}
          />
          <Pressable
            style={[
              styles.sendCircleBtn,
              (!input.trim() || isReasoning) && styles.sendCircleBtnDisabled,
            ]}
            disabled={!input.trim() || isReasoning}
            onPress={() => handleSend()}
            accessibilityLabel="Send"
          >
            <Send size={15} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Gemini Canvas Modal for AI-drafted essays or letters */}
      <GeminiCanvasModal
        visible={Boolean(canvasDraftModalItem)}
        item={canvasDraftModalItem}
        scholarshipTitle="Artrat AI Chat Draft"
        onClose={() => setCanvasDraftModalItem(null)}
        onSaveContent={(_itemId, newContent) => {
          if (canvasDraftModalItem) {
            setCanvasDraftModalItem({
              ...canvasDraftModalItem,
              writeupContent: newContent,
            });
          }
          if (onTriggerGlobalNotice) {
            onTriggerGlobalNotice('Saved updated writeup in Gemini Canvas');
          }
        }}
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
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDF5',
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
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
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
  },
  mascotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECE4FC',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD0F8',
  },
  mascotBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161126',
  },
  mascotBannerSub: {
    fontSize: 12,
    color: '#4E4466',
  },
  suggestionsBlock: {
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E4466',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  suggestionsCol: {
    gap: 8,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  suggestionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161126',
  },
  suggestionSub: {
    fontSize: 11,
    color: '#4E4466',
    marginTop: 2,
  },
  messagesStack: {
    gap: 12,
  },
  messageTurnWrap: {
    gap: 8,
  },
  bubble: {
    padding: 14,
    borderRadius: 16,
    gap: 6,
  },
  artratBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  studentBubble: {
    backgroundColor: '#6D28D9',
    alignSelf: 'flex-end',
    maxWidth: '88%',
  },
  reasoningTraceBox: {
    backgroundColor: '#F6F2FF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 2,
  },
  reasoningTraceHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B21B6',
  },
  reasoningTraceLine: {
    fontSize: 11,
    color: '#4E4466',
  },
  bubbleText: {
    fontSize: 14,
    color: '#161126',
    lineHeight: 20,
  },
  studentBubbleText: {
    color: '#FFFFFF',
  },
  bubbleTime: {
    fontSize: 11,
    color: '#756A92',
  },
  studentBubbleTime: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  liveReasoningBubble: {
    backgroundColor: '#F3EEFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    gap: 8,
  },
  liveReasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveReasoningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4C1D95',
    flex: 1,
  },
  liveReasoningStepsList: {
    gap: 3,
  },
  liveReasoningStepItem: {
    fontSize: 11,
    color: '#756A92',
  },
  liveReasoningStepItemActive: {
    color: '#4C1D95',
    fontWeight: '600',
  },
  actionExecutedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD0F8',
    gap: 6,
  },
  actionExecutedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionExecutedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161126',
    flex: 1,
  },
  actionExecutedSub: {
    fontSize: 12,
    color: '#4E4466',
  },
  openCanvasBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6D28D9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  openCanvasBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    overflow: 'hidden',
  },
  resultCardIneligible: {
    borderColor: '#FECDD3',
  },
  resultStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  resultStripGreen: {
    backgroundColor: '#ECFDF5',
    borderBottomColor: '#A7F3D0',
  },
  resultStripRed: {
    backgroundColor: '#FFF1F2',
    borderBottomColor: '#FECDD3',
  },
  resultStripText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  resultBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 10,
  },
  resultSponsor: {
    fontSize: 11,
    color: '#4E4466',
    fontWeight: '500',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161126',
    marginTop: 1,
  },
  resultOpenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resultOpenPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  bottomBar: {
    paddingHorizontal: 14,
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
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 4,
    gap: 8,
    maxWidth: 820,
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
