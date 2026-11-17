import React, { useState } from 'react';
import {
  Modal,
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
  ArrowLeft,
  ArrowRight,
  Award,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Cloud,
  Download,
  FileCheck2,
  FileText,
  FolderArchive,
  HelpCircle,
  Info,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Pencil,
  PenLine,
  Settings,
  Shield,
  Smartphone,
  User,
  X,
} from './icons';
import { CuratedApplication, ProfileFact } from '../domain/types';
import {
  ACADEMIC_LEVEL_OPTIONS,
  getLgasByState,
  NIGERIA_STATES,
  NIGERIAN_UNIVERSITIES,
} from '../domain/nigeriaStatesLgas';
import { ArtratBot3D } from './ArtratBot3D';

export type ProfileSettingsSubTab =
  | 'hub'
  | 'profile'
  | 'voice_ledger'
  | 'connectors'
  | 'receipts'
  | 'notifications'
  | 'settings'
  | 'help';

interface ProfileSettingsScreenProps {
  initialSubTab?: ProfileSettingsSubTab;
  profileFacts: ProfileFact[];
  applications: CuratedApplication[];
  studentWritingAddress: string;
  hodRecipientAddress: string;
  onUpdateAddresses: (writingAddr: string, hodAddr: string) => void;
  onUpdateProfileFact: (factId: string, newValue: string) => void;
  onBack: () => void;
  onOpenOnboardingPreview: () => void;
  onOpenNotifications?: () => void;
}

interface ConnectorConfig {
  id: string;
  name: string;
  category: 'google' | 'academic' | 'messaging';
  accountLabel: string;
  providerDomain: string;
  status: 'connected' | 'available' | 'coming_soon';
  infoTitle: string;
  infoSummary: string;
  infoPermissions: string[];
}

const INITIAL_CONNECTORS: ConnectorConfig[] = [
  {
    id: 'google-tasks',
    name: 'Google Tasks',
    category: 'google',
    accountLabel: 'chisom.okafor.248912@unn.edu.ng',
    providerDomain: 'tasks.google.com',
    status: 'connected',
    infoTitle: 'How Artrat uses Google Tasks',
    infoSummary:
      'Creates daily reminders at 9:30 AM and 2:00 PM whenever an application requires a physical signature or document upload. If checked off externally before the document is uploaded in Artrat, Artrat automatically re-opens the task.',
    infoPermissions: [
      'Create & update scholarship action tasks',
      'Verify document upload in Vault before closing reminders',
    ],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'google',
    accountLabel: 'chisom.okafor.248912@unn.edu.ng',
    providerDomain: 'calendar.google.com',
    status: 'connected',
    infoTitle: 'How Artrat uses Google Calendar',
    infoSummary:
      'Blocks official scholarship closing dates, aptitude test windows, and interview slots on your calendar with 48-hour advance alerts.',
    infoPermissions: [
      'Add scholarship deadline & test window events',
      'Schedule 48-hour closing reminders',
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'google',
    accountLabel: 'chisom.okafor.248912@unn.edu.ng',
    providerDomain: 'mail.google.com',
    status: 'connected',
    infoTitle: 'How Artrat uses Gmail',
    infoSummary:
      'Automatically reads portal verification codes (OTPs) so Artrat can register and submit your applications without interrupting you, and saves official confirmation receipts to your Vault.',
    infoPermissions: [
      'Automatically pick up portal OTP codes during submission',
      'Save scholarship confirmation receipts to your Vault',
    ],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'google',
    accountLabel: 'chisom.okafor.248912@unn.edu.ng',
    providerDomain: 'drive.google.com',
    status: 'connected',
    infoTitle: 'How Artrat uses Google Drive',
    infoSummary:
      'Imports your academic certificates into your Vault and stores encrypted backups of your submission kits and confirmation receipts.',
    infoPermissions: [
      'Import student PDF/JPG documents into Vault',
      'Back up verified submission receipts & kits',
    ],
  },
  {
    id: 'bank-statement-open-banking',
    name: 'Bank Statement',
    category: 'google',
    accountLabel: 'Access Bank · 0149823410',
    providerDomain: 'accessbankplc.com',
    status: 'connected',
    infoTitle: 'Bank Statement',
    infoSummary:
      'Fetches an official stamped bank statement only when a scholarship specifically requires financial proof.',
    infoPermissions: [
      'Fetch stamped PDF bank statement when requested by a scholarship',
      'Confirm account name matches your student profile',
    ],
  },
  {
    id: 'microsoft-todo',
    name: 'Microsoft To Do',
    category: 'academic',
    accountLabel: 'chisom.okafor@student.edu.ng',
    providerDomain: 'to-do.office.com',
    status: 'available',
    infoTitle: 'How Artrat uses Microsoft To Do',
    infoSummary:
      'Task sync for students whose universities provide Microsoft 365 accounts, keeping action items synced across devices.',
    infoPermissions: [
      'Create & update pending scholarship tasks in Microsoft To Do',
      'Sync completion status with Artrat Tasks',
    ],
  },
  {
    id: 'outlook-calendar',
    name: 'Outlook Calendar',
    category: 'academic',
    accountLabel: 'chisom.okafor@student.edu.ng',
    providerDomain: 'outlook.office.com',
    status: 'available',
    infoTitle: 'How Artrat uses Outlook Calendar',
    infoSummary:
      'Syncs scholarship closing dates and online aptitude test schedules to your university Outlook calendar.',
    infoPermissions: [
      'Add scholarship deadline events to Outlook Calendar',
      'Configure 24-hour reminder notifications',
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'messaging',
    accountLabel: '+234 814 392 7190',
    providerDomain: 'whatsapp.com',
    status: 'coming_soon',
    infoTitle: 'How Artrat will use WhatsApp',
    infoSummary:
      'Receive deadline alerts on WhatsApp and snap a photo of any newly requested document in chat to store it straight into your dynamic Vault.',
    infoPermissions: [
      'Send deadline & task reminders on WhatsApp',
      'Accept document uploads directly from WhatsApp chat',
    ],
  },
  {
    id: 'sms-otp',
    name: 'SMS & Phone Alerts',
    category: 'messaging',
    accountLabel: '+234 814 392 7190',
    providerDomain: 'SMS Gateway',
    status: 'coming_soon',
    infoTitle: 'How Artrat will use SMS Alerts',
    infoSummary:
      'Offline SMS fallback when mobile data is unavailable and an application portal requests a time-sensitive verification code.',
    infoPermissions: ['Send urgent offline SMS alerts for portal handoffs'],
  },
];

interface EvidenceLedgerItem {
  id: string;
  title: string;
  category: string;
  metric: string;
  verifiedSource: string;
}

const INITIAL_EVIDENCE_ITEMS: EvidenceLedgerItem[] = [
  {
    id: 'ev-1',
    title: 'Top 5% 100L Electrical Engineering Cohort',
    category: 'Academic Distinction',
    metric: '4.21 / 5.00 CGPA (Second Class Upper)',
    verifiedSource: 'Verified from 100L Statement of Result',
  },
  {
    id: 'ev-2',
    title: 'Low-Loss Single-Phase Transformer Winding Prototype',
    category: 'Engineering Lab Project',
    metric: '94% efficiency in EEE 102 Workshop',
    verifiedSource: 'Student Voice Ledger · Faculty of Engineering',
  },
  {
    id: 'ev-3',
    title: 'JAMB UTME National Top Percentile Score',
    category: 'Entrance Exam',
    metric: '308 / 400 Aggregate (Eng, Maths, Physics, Chem)',
    verifiedSource: 'Verified from JAMB Original Result Slip',
  },
  {
    id: 'ev-4',
    title: 'IEEE Student Branch Solar Microgrid Volunteer',
    category: 'Leadership & Community Impact',
    metric: '18 rural solar study lamps repaired',
    verifiedSource: 'Student Voice Ledger',
  },
];

export const ProfileSettingsScreen: React.FC<ProfileSettingsScreenProps> = ({
  initialSubTab = 'hub',
  profileFacts,
  applications,
  studentWritingAddress,
  hodRecipientAddress,
  onUpdateAddresses,
  onUpdateProfileFact,
  onBack,
  onOpenOnboardingPreview,
  onOpenNotifications,
}) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 840;

  const [activePage, setActivePage] =
    useState<ProfileSettingsSubTab>(initialSubTab);

  // University Semester Tracker & Autonomous Level Promotion + Force Override State
  const [autoLevelPromotion, setAutoLevelPromotion] = useState(true);
  const [forceLevelOverrideMode, setForceLevelOverrideMode] = useState(false);
  const [studentLevel, setStudentLevel] = useState('200 Level');

  // Cascading Nigerian State / 774 LGA Dropdown State + Profile Record Edit State
  const [profileState, setProfileState] = useState('Anambra');
  const [profileLga, setProfileLga] = useState('Njikoka');
  const [profileStateModalOpen, setProfileStateModalOpen] = useState(false);
  const [profileLgaModalOpen, setProfileLgaModalOpen] = useState(false);
  const [profileUniModalOpen, setProfileUniModalOpen] = useState(false);
  const [profileUniSearch, setProfileUniSearch] = useState('');
  const liveFullName =
    profileFacts.find((f) => f.id === 'fact-full-name')?.value ||
    'Chisom Kamsiyochukwu Okafor';
  const liveInstitution =
    profileFacts.find((f) => f.id === 'fact-institution')?.value ||
    'University of Nigeria, Nsukka (UNN) · B.Eng Electrical Engineering';
  const liveMatric =
    profileFacts.find((f) => f.id === 'fact-matric')?.value || '2024/248912';
  const liveCgpa =
    profileFacts.find((f) => f.id === 'fact-cgpa')?.value.split('(')[0].trim() ||
    '4.21 / 5.00';
  const liveJamb =
    profileFacts.find((f) => f.id === 'fact-jamb')?.value.split(' ')[0] ||
    '308';

  const [editingProfileRecord, setEditingProfileRecord] = useState(false);
  const [editFullName, setEditFullName] = useState(liveFullName);
  const [editInstitution, setEditInstitution] = useState(liveInstitution);
  const [editMatric, setEditMatric] = useState(liveMatric);
  const [editBank, setEditBank] = useState(
    profileFacts.find((f) => f.id === 'fact-bank')?.value ||
      'Access Bank · 0149823410 (Chisom K. Okafor)'
  );
  const [editFamily, setEditFamily] = useState(
    profileFacts.find((f) => f.id === 'fact-family-context')?.value ||
      'Mother (Civil Servant & Petty Trader) · Father Deceased (2021)'
  );

  // Connectors & Interactive OAuth Connection Modal State
  const [connectors, setConnectors] =
    useState<ConnectorConfig[]>(INITIAL_CONNECTORS);
  const [openConnectorInfoId, setOpenConnectorInfoId] = useState<string | null>(
    null
  );
  const [oauthTargetConnector, setOauthTargetConnector] =
    useState<ConnectorConfig | null>(null);
  const [oauthAccountEmail, setOauthAccountEmail] = useState(
    'chisom.okafor.248912@unn.edu.ng'
  );
  const [oauthStep, setOauthStep] = useState<'permissions' | 'authorizing'>(
    'permissions'
  );

  const [reminderSchedule, setReminderSchedule] = useState<
    '9:30 AM & 2:00 PM' | '8:00 AM & 6:00 PM'
  >('9:30 AM & 2:00 PM');
  const [whatsappWaitlist, setWhatsappWaitlist] = useState(false);

  // Voice & Evidence Ledger State
  const [voiceTone, setVoiceTone] = useState<
    'technical' | 'community' | 'academic'
  >('technical');
  const [voiceNotes, setVoiceNotes] = useState(
    'Highlight my top 5% 100L Electrical Engineering lab ranking, low-loss transformer winding project, 308 JAMB score, and commitment to solving power grid reliability in Nigerian communities.'
  );
  const [evidenceItems, setEvidenceItems] = useState<EvidenceLedgerItem[]>(
    INITIAL_EVIDENCE_ITEMS
  );
  const [addingEvidence, setAddingEvidence] = useState(false);
  const [newEvTitle, setNewEvTitle] = useState('');
  const [newEvMetric, setNewEvMetric] = useState('');

  // Student Address State (Primary in Profile; Referee/Signatory address synced from applications)
  const [editingStudentAddress, setEditingStudentAddress] = useState(false);
  const [writingAddrInput, setWritingAddrInput] = useState(
    studentWritingAddress
  );

  // Submission Kit State
  const [copiedKitField, setCopiedKitField] = useState<string | null>(null);

  // Notification Settings & Under-18 NDPA Privacy State
  const [notifyDeadlines, setNotifyDeadlines] = useState(true);
  const [notifyNewPackages, setNotifyNewPackages] = useState(true);
  const [notifyHumanStep, setNotifyHumanStep] = useState(true);
  const [notifyCleanup, setNotifyCleanup] = useState(true);
  const [channelPush, setChannelPush] = useState(true);
  const [channelGoogleTasks, setChannelGoogleTasks] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);
  const [guardianCcEnabled, setGuardianCcEnabled] = useState(true);
  const [guardianEmail, setGuardianEmail] = useState('okafor.family@gmail.com');
  const [editingGuardian, setEditingGuardian] = useState(false);

  // Help & FAQ Accordion State
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const submittedApplications = applications.filter(
    (a) => a.status === 'submitted'
  );

  const connectedCount = connectors.filter(
    (c) => c.status === 'connected'
  ).length;

  // Open Interactive OAuth Connection Flow or Disconnect
  const handleConnectorActionPress = (item: ConnectorConfig) => {
    if (item.status === 'coming_soon') {
      setWhatsappWaitlist((p) => !p);
      showToast(
        !whatsappWaitlist
          ? `Early access enabled for ${item.name}.`
          : `Removed early access alert for ${item.name}.`
      );
      return;
    }

    // Open interactive OAuth Consent / Account Demo Modal so user can experience connecting or re-authorizing any connector!
    setOauthAccountEmail(item.accountLabel);
    setOauthStep('permissions');
    setOauthTargetConnector(item);
  };

  const handleConfirmOAuthConnect = () => {
    if (!oauthTargetConnector) return;
    setOauthStep('authorizing');
    setTimeout(() => {
      const updatedAccount =
        oauthAccountEmail.trim() || oauthTargetConnector.accountLabel;
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === oauthTargetConnector.id
            ? { ...c, status: 'connected', accountLabel: updatedAccount }
            : c
        )
      );
      setOauthTargetConnector(null);
      showToast(`Connected ${oauthTargetConnector.name} (${updatedAccount})`);
    }, 550);
  };

  const handleDisconnectFromModal = () => {
    if (!oauthTargetConnector) return;
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === oauthTargetConnector.id ? { ...c, status: 'available' } : c
      )
    );
    const name = oauthTargetConnector.name;
    setOauthTargetConnector(null);
    showToast(`Disconnected ${name}.`);
  };

  const handleDownloadReceipt = (title: string, receiptId: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const content = `ARTRAT VERIFIED SUBMISSION RECEIPT\nReceipt ID: ${receiptId}\nScholarship: ${title}\nStudent: Chisom Kamsiyochukwu Okafor (200L · 2024/248912)\nStatus: Confirmed & Archived in Vault`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt_${receiptId.replace('#', '')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    showToast(`Downloaded receipt ${receiptId} for ${title}.`);
  };

  const handleDownloadSubmissionKit = (
    fileName: string,
    kitDescription: string,
    format: 'docx' | 'pdf' = 'pdf'
  ) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const content = `ARTRAT SUBMISSION KIT (${format.toUpperCase()})\nFile: ${fileName}\nStudent: Chisom Kamsiyochukwu Okafor (2024/248912)\nWriting Address: ${studentWritingAddress}\n\nIncluded Items (Portal Order):\n1. 01_Passport_Photograph_Chisom_Okafor.pdf\n2. 02_Admission_Letter_Chisom_Okafor.pdf\n3. 03_100L_Statement_of_Result_4.21_CGPA.pdf\n4. 04_Student_ID_Card.pdf\n5. 05_Tailored_Statement_of_Purpose.${format}\n\nSummary:\n${kitDescription}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    showToast(`Downloaded "${fileName}".`);
  };

  const PAGE_META: Record<
    ProfileSettingsSubTab,
    { title: string; subtitle: string }
  > = {
    hub: {
      title: 'Account & Pages',
      subtitle: 'Chisom K. Okafor · 200L Electrical Engineering',
    },
    profile: {
      title: 'My Profile',
      subtitle: 'Chisom K. Okafor · University of Nigeria, Nsukka',
    },
    voice_ledger: {
      title: 'Writing Voice & Achievements',
      subtitle: 'Personal statement tone & achievements',
    },
    connectors: {
      title: 'Connected Apps',
      subtitle: `${connectedCount} apps connected`,
    },
    receipts: {
      title: 'Receipts & Submission Kits',
      subtitle: 'Confirmed portal receipts & downloadable kits',
    },
    notifications: {
      title: 'Notification Settings',
      subtitle: 'Choose which scholarship alerts you receive',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Academic level, guardian receipts & account',
    },
    help: {
      title: 'How Artrat Works & FAQ',
      subtitle: 'From scholarship match to submission',
    },
  };

  const renderConnectorRow = (item: ConnectorConfig) => {
    const isInfoOpen = openConnectorInfoId === item.id;
    const isConnected = item.status === 'connected';
    const isComingSoon = item.status === 'coming_soon';

    const renderIcon = () => {
      switch (item.id) {
        case 'google-tasks':
          return <CheckSquare size={17} color="#5B21B6" />;
        case 'google-calendar':
          return <CalendarClock size={17} color="#5B21B6" />;
        case 'gmail':
          return <Mail size={17} color="#5B21B6" />;
        case 'google-drive':
          return <Cloud size={17} color="#5B21B6" />;
        case 'microsoft-todo':
          return <CheckCircle2 size={17} color="#4E4466" />;
        case 'outlook-calendar':
          return <Clock size={17} color="#4E4466" />;
        case 'whatsapp':
          return <MessageSquare size={17} color="#5B21B6" />;
        default:
          return <Smartphone size={17} color="#5B21B6" />;
      }
    };

    return (
      <View key={item.id} style={styles.connectorCard}>
        {/* Single Compact Row: Icon + Title + (i) Info Button + Interactive Connect/Manage Button */}
        <View style={styles.connectorMainRow}>
          <View
            style={[
              styles.connectorIconBox,
              isConnected && styles.connectorIconBoxActive,
            ]}
          >
            {renderIcon()}
          </View>

          <View style={styles.connectorTitleGroup}>
            <View style={styles.connectorNameWithInfoRow}>
              <Text style={styles.connectorNameText} numberOfLines={1}>
                {item.name}
              </Text>
              <Pressable
                style={[
                  styles.infoIconButton,
                  isInfoOpen && styles.infoIconButtonActive,
                ]}
                onPress={() =>
                  setOpenConnectorInfoId(isInfoOpen ? null : item.id)
                }
                accessibilityRole="button"
                accessibilityLabel={`Info about ${item.name}`}
              >
                <Info size={13} color={isInfoOpen ? '#FFFFFF' : '#5B21B6'} />
              </Pressable>
            </View>

            <Text style={styles.connectorAccountSub} numberOfLines={1}>
              {isConnected
                ? item.accountLabel
                : isComingSoon
                  ? 'Direct mobile alerts'
                  : `Tap Connect to link ${item.providerDomain}`}
            </Text>
          </View>

          {isComingSoon ? (
            <Pressable
              style={[
                styles.comingSoonPillBtn,
                whatsappWaitlist && styles.comingSoonPillBtnActive,
              ]}
              onPress={() => handleConnectorActionPress(item)}
            >
              <Text
                style={[
                  styles.comingSoonPillText,
                  whatsappWaitlist && styles.comingSoonPillTextActive,
                ]}
              >
                {whatsappWaitlist ? 'Waitlisted' : 'Coming Soon'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.connectActionBtn,
                isConnected
                  ? styles.connectActionBtnConnected
                  : styles.connectActionBtnAvailable,
              ]}
              onPress={() => handleConnectorActionPress(item)}
            >
              <Text
                style={[
                  styles.connectActionBtnText,
                  isConnected
                    ? styles.connectActionBtnTextConnected
                    : styles.connectActionBtnTextAvailable,
                ]}
              >
                {isConnected ? 'Connected' : 'Connect'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Google Tasks compact schedule pill row (only when connected) */}
        {item.id === 'google-tasks' && isConnected ? (
          <View style={styles.tasksScheduleInlineBar}>
            <Text style={styles.tasksScheduleLabel}>Daily reminder slots:</Text>
            <View style={styles.tasksSchedulePills}>
              {(['9:30 AM & 2:00 PM', '8:00 AM & 6:00 PM'] as const).map(
                (slot) => (
                  <Pressable
                    key={slot}
                    style={[
                      styles.miniScheduleChip,
                      reminderSchedule === slot &&
                        styles.miniScheduleChipActive,
                    ]}
                    onPress={() => {
                      setReminderSchedule(slot);
                      showToast(`Updated Google Tasks reminders to ${slot}`);
                    }}
                  >
                    <Text
                      style={[
                        styles.miniScheduleChipText,
                        reminderSchedule === slot &&
                          styles.miniScheduleChipTextActive,
                      ]}
                    >
                      {slot}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>
        ) : null}

        {/* Expandable Info Popover (Only shown when the user taps the `i` icon!) */}
        {isInfoOpen ? (
          <View style={styles.connectorInfoPopover}>
            <View style={styles.connectorInfoHeader}>
              <View style={styles.connectorInfoTitleRow}>
                <Info size={14} color="#5B21B6" />
                <Text style={styles.connectorInfoTitle}>{item.infoTitle}</Text>
              </View>
              <Pressable
                onPress={() => setOpenConnectorInfoId(null)}
                style={styles.closeInfoPill}
              >
                <Text style={styles.closeInfoPillText}>Hide</Text>
              </Pressable>
            </View>

            <Text style={styles.connectorInfoBody}>{item.infoSummary}</Text>

            <View style={styles.connectorPermsList}>
              {item.infoPermissions.map((perm, idx) => (
                <View key={idx} style={styles.connectorPermRow}>
                  <Check size={12} color="#047857" />
                  <Text style={styles.connectorPermText}>{perm}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            if (!isWide && activePage !== 'hub') {
              setActivePage('hub');
            } else {
              onBack();
            }
          }}
          style={styles.backBtn}
          accessibilityRole="button"
        >
          <ArrowLeft size={16} color="#161126" />
          <Text style={styles.backBtnText}>
            {!isWide && activePage !== 'hub' ? 'All Pages' : 'Back'}
          </Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text
            accessibilityRole="header"
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {PAGE_META[activePage].title}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {PAGE_META[activePage].subtitle}
          </Text>
        </View>
      </View>

      {toastMsg ? (
        <View style={styles.toastBar}>
          <Check size={14} color="#047857" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      <View style={[styles.bodyLayout, isWide && styles.bodyLayoutWide]}>
        {/* Desktop Left Sub-Navigation Rail (When on wide screen >= 840px) */}
        {isWide ? (
          <View style={styles.desktopSubRail}>
            {(
              [
                {
                  id: 'hub',
                  label: 'All Pages',
                  icon: <User size={16} color="#5B21B6" />,
                },
                {
                  id: 'profile',
                  label: 'My Profile',
                  icon: <User size={16} color="#5B21B6" />,
                },
                {
                  id: 'voice_ledger',
                  label: 'Writing Voice & Ledger',
                  icon: <PenLine size={16} color="#5B21B6" />,
                },
                {
                  id: 'connectors',
                  label: 'Connected Apps',
                  icon: <CalendarClock size={16} color="#5B21B6" />,
                },
                {
                  id: 'receipts',
                  label: 'Receipts & Kits',
                  icon: <FileCheck2 size={16} color="#5B21B6" />,
                },
                {
                  id: 'notifications',
                  label: 'Notification Settings',
                  icon: <Bell size={16} color="#5B21B6" />,
                },
                {
                  id: 'settings',
                  label: 'Settings',
                  icon: <Settings size={16} color="#5B21B6" />,
                },
                {
                  id: 'help',
                  label: 'How Artrat Works & FAQ',
                  icon: <HelpCircle size={16} color="#5B21B6" />,
                },
              ] as const
            ).map((nav) => (
              <Pressable
                key={nav.id}
                style={[
                  styles.railItem,
                  activePage === nav.id && styles.railItemActive,
                ]}
                onPress={() => setActivePage(nav.id)}
              >
                {nav.icon}
                <Text
                  style={[
                    styles.railItemText,
                    activePage === nav.id && styles.railItemTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {nav.label}
                </Text>
              </Pressable>
            ))}

            <View style={styles.railDivider} />

            <Pressable
              style={styles.railItem}
              onPress={onOpenOnboardingPreview}
            >
              <KeyRound size={16} color="#4E4466" />
              <Text style={styles.railItemText}>Sign-In & Onboarding</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.content,
            isWide && styles.contentWide,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Mobile Horizontal Quick-Jump Pill Bar when inside a specific subpage */}
          {!isWide && activePage !== 'hub' ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mobileJumpPillsRow}
            >
              {(
                [
                  { id: 'profile', label: 'Profile' },
                  { id: 'voice_ledger', label: 'Voice & Ledger' },
                  { id: 'connectors', label: 'Connectors' },
                  { id: 'receipts', label: 'Receipts & Kits' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'settings', label: 'Settings' },
                  { id: 'help', label: 'How It Works' },
                ] as const
              ).map((p) => (
                <Pressable
                  key={p.id}
                  style={[
                    styles.jumpPill,
                    activePage === p.id && styles.jumpPillActive,
                  ]}
                  onPress={() => setActivePage(p.id)}
                >
                  <Text
                    style={[
                      styles.jumpPillText,
                      activePage === p.id && styles.jumpPillTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {/* =========================================================
              PAGE 0: ACCOUNT & COMPLEMENTARY PAGES DIRECTORY HUB
             ========================================================= */}
          {activePage === 'hub' ? (
            <View style={styles.sectionStack}>
              {/* Student Summary Hero Card */}
              <View style={styles.identityHeroCard}>
                <View style={styles.identityTopRow}>
                  <View style={styles.avatarCircleLg}>
                    <Text style={styles.avatarTextLg}>CO</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.studentNameTitle}>
                      {liveFullName}
                    </Text>
                    <Text style={styles.studentUniSub}>
                      {studentLevel} · {liveInstitution}
                    </Text>
                  </View>
                </View>

                <View style={styles.academicStatsRow}>
                  <View style={styles.academicStatItem}>
                    <Text style={styles.academicStatVal}>{liveCgpa}</Text>
                    <Text style={styles.academicStatLab}>CGPA</Text>
                  </View>
                  <View style={styles.statVertDivider} />
                  <View style={styles.academicStatItem}>
                    <Text style={styles.academicStatVal}>
                      {connectedCount} Active
                    </Text>
                    <Text style={styles.academicStatLab}>Connected Apps</Text>
                  </View>
                  <View style={styles.statVertDivider} />
                  <View style={styles.academicStatItem}>
                    <Text style={styles.academicStatVal}>
                      {evidenceItems.length} Saved
                    </Text>
                    <Text style={styles.academicStatLab}>Achievements</Text>
                  </View>
                </View>
              </View>

              <View style={styles.hubCardsList}>
                {/* 1. My Profile */}
                <Pressable
                  style={styles.hubNavCard}
                  onPress={() => setActivePage('profile')}
                >
                  <View style={styles.hubNavIconBox}>
                    <User size={18} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.hubNavTitle}>My Profile</Text>
                    <Text style={styles.hubNavSub}>
                      Personal details, university record & residential address
                    </Text>
                  </View>
                  <ArrowRight size={16} color="#5B21B6" />
                </Pressable>

                {/* 2. Writing Voice & Evidence Ledger */}
                <Pressable
                  style={styles.hubNavCard}
                  onPress={() => setActivePage('voice_ledger')}
                >
                  <View style={styles.hubNavIconBox}>
                    <PenLine size={18} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.hubNavTitle}>
                      Writing Voice & Achievements
                    </Text>
                    <Text style={styles.hubNavSub}>
                      Personal statement tone & achievements used in Canvas
                    </Text>
                  </View>
                  <ArrowRight size={16} color="#5B21B6" />
                </Pressable>

                {/* 3. Connected Apps */}
                <Pressable
                  style={styles.hubNavCard}
                  onPress={() => setActivePage('connectors')}
                >
                  <View style={styles.hubNavIconBox}>
                    <CalendarClock size={18} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.hubTitleWithBadge}>
                      <Text style={styles.hubNavTitle}>Connected Apps</Text>
                      <View style={styles.hubGreenPill}>
                        <Text style={styles.hubGreenPillText}>
                          {connectedCount} Connected
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.hubNavSub}>
                      Google Tasks, Calendar, Gmail, Drive, Bank Statement & WhatsApp
                    </Text>
                  </View>
                  <ArrowRight size={16} color="#5B21B6" />
                </Pressable>

                {/* 4. Receipts & Downloadable Submission Kits */}
                <Pressable
                  style={styles.hubNavCard}
                  onPress={() => setActivePage('receipts')}
                >
                  <View style={styles.hubNavIconBox}>
                    <FileCheck2 size={18} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.hubNavTitle}>
                      Receipts & Submission Kits
                    </Text>
                    <Text style={styles.hubNavSub}>
                      Portal confirmation receipts & downloadable Submission Kits
                    </Text>
                  </View>
                  <ArrowRight size={16} color="#5B21B6" />
                </Pressable>

                {/* 5. Notification Settings */}
                <Pressable
                  style={styles.hubNavCard}
                  onPress={() => setActivePage('notifications')}
                >
                  <View style={styles.hubNavIconBox}>
                    <Bell size={18} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.hubNavTitle}>
                      Notification Settings
                    </Text>
                    <Text style={styles.hubNavSub}>
                      Deadline reminders, scholarship matches & submission alerts
                    </Text>
                  </View>
                  <ArrowRight size={16} color="#5B21B6" />
                </Pressable>

                {/* 6. Settings */}
                <Pressable
                  style={styles.hubNavCard}
                  onPress={() => setActivePage('settings')}
                >
                  <View style={styles.hubNavIconBox}>
                    <Settings size={18} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.hubNavTitle}>Settings</Text>
                    <Text style={styles.hubNavSub}>
                      Academic level, guardian receipt copies & data export
                    </Text>
                  </View>
                  <ArrowRight size={16} color="#5B21B6" />
                </Pressable>

                {/* 7. How Artrat Works & FAQ */}
                <Pressable
                  style={styles.hubNavCard}
                  onPress={() => setActivePage('help')}
                >
                  <View style={styles.hubNavIconBox}>
                    <HelpCircle size={18} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.hubNavTitle}>
                      How Artrat Works & FAQ
                    </Text>
                    <Text style={styles.hubNavSub}>
                      How your scholarships are matched, prepared & submitted for you
                    </Text>
                  </View>
                  <ArrowRight size={16} color="#5B21B6" />
                </Pressable>

                {/* 8. Sign-In & Onboarding */}
                <Pressable
                  style={styles.hubNavCard}
                  onPress={onOpenOnboardingPreview}
                >
                  <View style={styles.hubNavIconBox}>
                    <KeyRound size={18} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.hubNavTitle}>
                      Sign-In & Onboarding
                    </Text>
                    <Text style={styles.hubNavSub}>
                      Sign in, update your profile & chat with Artrat
                    </Text>
                  </View>
                  <ArrowRight size={16} color="#5B21B6" />
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* =========================================================
              PAGE 1: MY PROFILE (CLEAN, UNCLUSTERED)
             ========================================================= */}
          {activePage === 'profile' ? (
            <View style={styles.sectionStack}>
              <View style={styles.identityHeroCard}>
                <View style={styles.identityTopRow}>
                  <View style={styles.avatarCircleLg}>
                    <Text style={styles.avatarTextLg}>CO</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.studentNameTitle}>
                      {liveFullName}
                    </Text>
                    <Text style={styles.studentUniSub}>
                      {liveInstitution} · {studentLevel}
                    </Text>
                  </View>
                </View>

                <View style={styles.academicStatsRow}>
                  <View style={styles.academicStatItem}>
                    <Text style={styles.academicStatVal}>{liveCgpa}</Text>
                    <Text style={styles.academicStatLab}>CGPA</Text>
                  </View>
                  <View style={styles.statVertDivider} />
                  <View style={styles.academicStatItem}>
                    <Text style={styles.academicStatVal}>{liveMatric}</Text>
                    <Text style={styles.academicStatLab}>Matric No</Text>
                  </View>
                  <View style={styles.statVertDivider} />
                  <View style={styles.academicStatItem}>
                    <Text style={styles.academicStatVal}>{liveJamb}</Text>
                    <Text style={styles.academicStatLab}>JAMB Score</Text>
                  </View>
                </View>
              </View>

              {/* Student Residential & Writing Address Card */}
              <View style={styles.card}>
                <View style={styles.cardHeaderBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Your Student Residential & Writing Address
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Used on your scholarship applications and official letters
                    </Text>
                  </View>
                  <Pressable
                    style={styles.editPillBtn}
                    onPress={() => {
                      setWritingAddrInput(studentWritingAddress);
                      setEditingStudentAddress((p) => !p);
                    }}
                  >
                    <Pencil size={12} color="#4C1D95" />
                    <Text style={styles.editPillBtnText}>
                      {editingStudentAddress ? 'Cancel' : 'Edit'}
                    </Text>
                  </Pressable>
                </View>

                {editingStudentAddress ? (
                  <View style={styles.addrForm}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Your Student Residential / Writing Address
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        value={writingAddrInput}
                        onChangeText={setWritingAddrInput}
                      />
                    </View>
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() => {
                        const updated =
                          writingAddrInput.trim() || studentWritingAddress;
                        onUpdateAddresses(updated, hodRecipientAddress);
                        onUpdateProfileFact('fact-writing-address', updated);
                        setEditingStudentAddress(false);
                        showToast('Updated your residential address.');
                      }}
                    >
                      <Check size={14} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Save Address</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.addrReadBlock}>
                    <View style={styles.addrReadItem}>
                      <Text style={styles.addrReadLabel}>
                        Student Residential / Writing Address
                      </Text>
                      <Text style={styles.addrReadVal}>
                        {studentWritingAddress}
                      </Text>
                    </View>

                    {hodRecipientAddress.trim() ? (
                      <View style={styles.syncedRefereeStrip}>
                        <CheckCircle2 size={14} color="#047857" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.syncedRefereeLabel}>
                            Saved Signatory / Referee Address
                          </Text>
                          <Text style={styles.syncedRefereeVal}>
                            {hodRecipientAddress}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>

              {/* Academic & Origin Record with Working Edit Mode */}
              <View style={styles.card}>
                <View style={styles.cardHeaderBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Academic & Origin Record
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Verified student details used across your scholarship applications
                    </Text>
                  </View>
                  <Pressable
                    style={styles.editPillBtn}
                    accessibilityRole="button"
                    onPress={() => {
                      if (!editingProfileRecord) {
                        setEditFullName(liveFullName);
                        setEditInstitution(liveInstitution);
                        setEditMatric(liveMatric);
                        setEditBank(
                          profileFacts.find((f) => f.id === 'fact-bank')
                            ?.value || editBank
                        );
                        setEditFamily(
                          profileFacts.find(
                            (f) => f.id === 'fact-family-context'
                          )?.value || editFamily
                        );
                      }
                      setEditingProfileRecord((p) => !p);
                    }}
                  >
                    <Pencil size={12} color="#4C1D95" />
                    <Text style={styles.editPillBtnText}>
                      {editingProfileRecord ? 'Cancel' : 'Edit'}
                    </Text>
                  </Pressable>
                </View>

                {editingProfileRecord ? (
                  <View style={styles.addrForm}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Full Legal Name</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editFullName}
                        onChangeText={setEditFullName}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Date of Birth (Fixed from sign-up)
                      </Text>
                      <View
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: '#F3EEFF',
                            borderColor: '#E5DDF5',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: '#6E6388',
                          }}
                        >
                          14 May 2009
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        University (Tap to select from A–Z dropdown)
                      </Text>
                      <Pressable
                        style={[
                          styles.textInput,
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          },
                        ]}
                        onPress={() => {
                          setProfileUniSearch('');
                          setProfileUniModalOpen(true);
                        }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontWeight: '600',
                            color: '#161126',
                          }}
                          numberOfLines={1}
                        >
                          {editInstitution.split(' · ')[0] || editInstitution}
                        </Text>
                        <ChevronDown size={15} color="#5B21B6" />
                      </Pressable>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        University & Department Record
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        value={editInstitution}
                        onChangeText={setEditInstitution}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Matriculation Number
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        value={editMatric}
                        onChangeText={setEditMatric}
                      />
                    </View>

                    <View
                      style={{
                        flexDirection: isWide ? 'row' : 'column',
                        gap: 10,
                      }}
                    >
                      <View style={[styles.fieldGroup, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>State of Origin</Text>
                        <Pressable
                          style={[
                            styles.textInput,
                            {
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            },
                          ]}
                          onPress={() => setProfileStateModalOpen(true)}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '600',
                              color: '#161126',
                            }}
                          >
                            {profileState === 'FCT - Abuja'
                              ? 'FCT - Abuja'
                              : `${profileState} State`}
                          </Text>
                          <ChevronDown size={15} color="#5B21B6" />
                        </Pressable>
                      </View>

                      <View style={[styles.fieldGroup, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>
                          Local Government Area
                        </Text>
                        <Pressable
                          style={[
                            styles.textInput,
                            {
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            },
                          ]}
                          onPress={() => setProfileLgaModalOpen(true)}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '600',
                              color: '#161126',
                            }}
                          >
                            {profileLga}
                          </Text>
                          <ChevronDown size={15} color="#5B21B6" />
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Bank Account</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editBank}
                        onChangeText={setEditBank}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Family & Sponsorship
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        value={editFamily}
                        onChangeText={setEditFamily}
                      />
                    </View>

                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() => {
                        onUpdateProfileFact(
                          'fact-full-name',
                          editFullName.trim() || 'Chisom Kamsiyochukwu Okafor'
                        );
                        onUpdateProfileFact(
                          'fact-institution',
                          editInstitution.trim() ||
                            'University of Nigeria, Nsukka (UNN) · B.Eng Electrical Engineering'
                        );
                        onUpdateProfileFact(
                          'fact-matric',
                          editMatric.trim() || '2024/248912'
                        );
                        onUpdateProfileFact(
                          'fact-origin',
                          `${profileState === 'FCT - Abuja' ? profileState : `${profileState} State`} · ${profileLga} LGA`
                        );
                        onUpdateProfileFact(
                          'fact-bank',
                          editBank.trim() ||
                            'Access Bank · 0149823410 (Chisom K. Okafor)'
                        );
                        onUpdateProfileFact(
                          'fact-family-context',
                          editFamily.trim() ||
                            'Mother (Civil Servant & Petty Trader) · Father Deceased (2021)'
                        );
                        setEditingProfileRecord(false);
                        showToast('Saved changes to your profile record.');
                      }}
                    >
                      <Check size={14} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Save Changes</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.factsTable}>
                    {profileFacts.map((fact) => (
                      <View key={fact.id} style={styles.factLineRow}>
                        <Text style={styles.factLineLabel}>{fact.label}</Text>
                        <Text style={styles.factLineVal}>{fact.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* =========================================================
              PAGE 2: WRITING VOICE & ACHIEVEMENT EVIDENCE LEDGER
             ========================================================= */}
          {activePage === 'voice_ledger' ? (
            <View style={styles.sectionStack}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.iconBadge}>
                    <PenLine size={15} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Your Writing Voice</Text>
                    <Text style={styles.cardSubtitle}>
                      Controls how Artrat writes your personal statements and SOPs in Canvas
                    </Text>
                  </View>
                </View>

                <View style={styles.tonePillsRow}>
                  {(
                    [
                      { id: 'technical', label: 'Technical & Direct' },
                      { id: 'community', label: 'Community Impact' },
                      { id: 'academic', label: 'Formal Academic' },
                    ] as const
                  ).map((t) => (
                    <Pressable
                      key={t.id}
                      style={[
                        styles.toneChip,
                        voiceTone === t.id && styles.toneChipActive,
                      ]}
                      onPress={() => {
                        setVoiceTone(t.id);
                        showToast(`Updated essay tone to "${t.label}"`);
                      }}
                    >
                      <Text
                        style={[
                          styles.toneChipText,
                          voiceTone === t.id && styles.toneChipTextActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Core Story & Career Goals for Personal Statements
                  </Text>
                  <TextInput
                    style={styles.voiceTextArea}
                    multiline
                    value={voiceNotes}
                    onChangeText={setVoiceNotes}
                  />
                </View>

                <Pressable
                  style={styles.primaryBtn}
                  onPress={() =>
                    showToast('Saved your Writing Voice across all drafts.')
                  }
                >
                  <Check size={14} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Save Voice Profile</Text>
                </Pressable>
              </View>

              {/* Verified Evidence Ledger */}
              <View style={styles.card}>
                <View style={styles.cardHeaderBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Verified Achievement Ledger
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Real projects, scores, and leadership facts Artrat cites in your essays (never fabricated)
                    </Text>
                  </View>
                  <Pressable
                    style={styles.editPillBtn}
                    onPress={() => setAddingEvidence((p) => !p)}
                  >
                    <Text style={styles.editPillBtnText}>
                      {addingEvidence ? 'Cancel' : '+ Add Fact'}
                    </Text>
                  </Pressable>
                </View>

                {addingEvidence ? (
                  <View style={styles.addrForm}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Achievement / Lab Project / Award Title
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., 1st Place Faculty Circuit Design Challenge"
                        placeholderTextColor="#8B80A6"
                        value={newEvTitle}
                        onChangeText={setNewEvTitle}
                      />
                    </View>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Measurable Result or Metric
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., Built 12V pure sine wave inverter prototype"
                        placeholderTextColor="#8B80A6"
                        value={newEvMetric}
                        onChangeText={setNewEvMetric}
                      />
                    </View>
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() => {
                        if (!newEvTitle.trim()) return;
                        setEvidenceItems((prev) => [
                          {
                            id: `ev-${Date.now()}`,
                            title: newEvTitle.trim(),
                            category: 'Student Added Achievement',
                            metric:
                              newEvMetric.trim() || 'Verified student entry',
                            verifiedSource: 'Student Voice Ledger',
                          },
                          ...prev,
                        ]);
                        setNewEvTitle('');
                        setNewEvMetric('');
                        setAddingEvidence(false);
                        showToast('Added achievement to your Writing Ledger.');
                      }}
                    >
                      <Check size={14} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>
                        Add to Achievement Ledger
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.ledgerList}>
                  {evidenceItems.map((ev) => (
                    <View key={ev.id} style={styles.ledgerItemCard}>
                      <View style={styles.ledgerTopRow}>
                        <View style={styles.ledgerBadge}>
                          <Award size={12} color="#5B21B6" />
                          <Text style={styles.ledgerBadgeText}>
                            {ev.category}
                          </Text>
                        </View>
                        <Text style={styles.ledgerSourceText}>
                          {ev.verifiedSource}
                        </Text>
                      </View>
                      <Text style={styles.ledgerTitle}>{ev.title}</Text>
                      <Text style={styles.ledgerMetric}>{ev.metric}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {/* =========================================================
              PAGE 3: INDIVIDUAL CONNECTORS HUB (WITH `i` INFO & OAUTH DEMO)
             ========================================================= */}
          {activePage === 'connectors' ? (
            <View style={styles.sectionStack}>
              <Text style={styles.groupHeading}>
                Google & Financial Connectors
              </Text>
              <View style={styles.connectorsGroupList}>
                {connectors
                  .filter((c) => c.category === 'google')
                  .map(renderConnectorRow)}
              </View>

              <Text style={styles.groupHeading}>
                University Microsoft 365
              </Text>
              <View style={styles.connectorsGroupList}>
                {connectors
                  .filter((c) => c.category === 'academic')
                  .map(renderConnectorRow)}
              </View>

              <Text style={styles.groupHeading}>
                Direct Mobile & Messaging Channels
              </Text>
              <View style={styles.connectorsGroupList}>
                {connectors
                  .filter((c) => c.category === 'messaging')
                  .map(renderConnectorRow)}
              </View>
            </View>
          ) : null}

          {/* =========================================================
              PAGE 4: VERIFIED RECEIPTS & DOWNLOADABLE SUBMISSION KITS
             ========================================================= */}
          {activePage === 'receipts' ? (
            <View style={styles.sectionStack}>
              {/* 1. Downloadable Submission Kits (For portals that require manual upload or forbid browser automation) */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.iconBadge}>
                    <FolderArchive size={16} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Downloadable Submission Kits
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      When a portal requires manual upload, download your essays in Word (.DOCX) or your required documents in .PDF
                    </Text>
                  </View>
                </View>

                <View style={styles.kitCardsStack}>
                  <View style={styles.kitBundleCard}>
                    <View style={styles.kitBundleTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.kitSponsorTag}>
                          Shell SPDC · 5 of 5 Items Ready
                        </Text>
                        <Text style={styles.kitBundleTitle}>
                          Shell SPDC University Scholarship Kit
                        </Text>
                        <Text style={styles.kitBundleMeta}>
                          4 portal documents (.PDF) · 250w Personal Statement (.DOCX / .PDF)
                        </Text>
                      </View>
                    </View>

                    <View style={styles.kitDownloadActionsRow}>
                      <Pressable
                        style={styles.kitCompactPrimaryBtn}
                        onPress={() =>
                          handleDownloadSubmissionKit(
                            'Chisom_Okafor_Shell_SPDC_Documents.pdf',
                            'Shell SPDC Required Documents Packet (PDF)',
                            'pdf'
                          )
                        }
                      >
                        <Download size={12} color="#FFFFFF" />
                        <Text style={styles.kitCompactPrimaryBtnText}>
                          PDF Packet (.PDF)
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.kitCompactSecondaryBtn}
                        onPress={() =>
                          handleDownloadSubmissionKit(
                            'Chisom_Okafor_Shell_SPDC_Statement.docx',
                            'Shell SPDC Personal Statement & Writeups (Word Docs)',
                            'docx'
                          )
                        }
                      >
                        <FileText size={12} color="#4C1D95" />
                        <Text style={styles.kitCompactSecondaryBtnText}>
                          Docs (.DOCX)
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.kitCompactSecondaryBtn}
                        onPress={() => {
                          setCopiedKitField('shell-sop');
                          showToast(
                            'Copied tailored Personal Statement to clipboard.'
                          );
                        }}
                      >
                        <Text style={styles.kitCompactSecondaryBtnText}>
                          {copiedKitField === 'shell-sop'
                            ? 'Copied ✓'
                            : 'Copy Essay'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.kitBundleCard}>
                    <View style={styles.kitBundleTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.kitSponsorTag}>
                          MTN Foundation · 4 of 4 Items Ready
                        </Text>
                        <Text style={styles.kitBundleTitle}>
                          MTN Science & Technology Scholarship Kit
                        </Text>
                        <Text style={styles.kitBundleMeta}>
                          3 portal documents (.PDF) · 300w STEM Impact Essay (.DOCX / .PDF)
                        </Text>
                      </View>
                    </View>

                    <View style={styles.kitDownloadActionsRow}>
                      <Pressable
                        style={styles.kitCompactPrimaryBtn}
                        onPress={() =>
                          handleDownloadSubmissionKit(
                            'Chisom_Okafor_MTN_STEM_Documents.pdf',
                            'MTN STEM Required Documents Packet (PDF)',
                            'pdf'
                          )
                        }
                      >
                        <Download size={12} color="#FFFFFF" />
                        <Text style={styles.kitCompactPrimaryBtnText}>
                          PDF Packet (.PDF)
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.kitCompactSecondaryBtn}
                        onPress={() =>
                          handleDownloadSubmissionKit(
                            'Chisom_Okafor_MTN_STEM_Essay.docx',
                            'MTN STEM Impact Essay (Word Docs)',
                            'docx'
                          )
                        }
                      >
                        <FileText size={12} color="#4C1D95" />
                        <Text style={styles.kitCompactSecondaryBtnText}>
                          Docs (.DOCX)
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.kitCompactSecondaryBtn}
                        onPress={() => {
                          setCopiedKitField('mtn-sop');
                          showToast(
                            'Copied tailored STEM Impact Essay to clipboard.'
                          );
                        }}
                      >
                        <Text style={styles.kitCompactSecondaryBtnText}>
                          {copiedKitField === 'mtn-sop'
                            ? 'Copied ✓'
                            : 'Copy Essay'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>

              {/* 2. Verified Submission Receipts */}
              <Text style={styles.groupHeading}>
                Verified Submission Receipts
              </Text>

              {submittedApplications.map((app) => (
                <View key={app.id} style={styles.receiptCard}>
                  <View style={styles.receiptGreenStrip}>
                    <FileCheck2 size={14} color="#047857" />
                    <Text style={styles.receiptStripText}>
                      Verified Submission Receipt ·{' '}
                      {app.submissionReceiptId || '#ART-2026-88412'}
                    </Text>
                  </View>

                  <View style={styles.receiptBody}>
                    <View style={styles.receiptTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.receiptSponsor}>{app.sponsor}</Text>
                        <Text style={styles.receiptTitle}>{app.title}</Text>
                      </View>
                      <View style={styles.awardPill}>
                        <Text style={styles.awardPillText}>
                          {app.awardValue}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.receiptMeta}>
                      Submitted package of {app.orderedItems.length} items ·
                      Archived in Vault
                    </Text>

                    <Pressable
                      style={styles.secondaryBtn}
                      onPress={() =>
                        handleDownloadReceipt(
                          app.title,
                          app.submissionReceiptId || '#ART-2026-88412'
                        )
                      }
                    >
                      <Download size={14} color="#4C1D95" />
                      <Text style={styles.secondaryBtnText}>
                        Download Confirmation Receipt
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              <View style={styles.receiptCard}>
                <View style={styles.receiptGreenStrip}>
                  <FileCheck2 size={14} color="#047857" />
                  <Text style={styles.receiptStripText}>
                    Verified Submission Receipt · #ART-2025-41902
                  </Text>
                </View>

                <View style={styles.receiptBody}>
                  <View style={styles.receiptTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.receiptSponsor}>
                        Anambra State Scholarship Board
                      </Text>
                      <Text style={styles.receiptTitle}>
                        Anambra State STEM Undergraduate Bursary (100L)
                      </Text>
                    </View>
                    <View style={styles.awardPill}>
                      <Text style={styles.awardPillText}>₦150,000</Text>
                    </View>
                  </View>

                  <Text style={styles.receiptMeta}>
                    Submitted 14 May 2026 · 4 of 4 items verified · Awarded
                  </Text>

                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() =>
                      handleDownloadReceipt(
                        'Anambra State STEM Undergraduate Bursary',
                        '#ART-2025-41902'
                      )
                    }
                  >
                    <Download size={14} color="#4C1D95" />
                    <Text style={styles.secondaryBtnText}>
                      Download Confirmation Receipt
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {/* =========================================================
              PAGE 5A: NOTIFICATION SETTINGS (PREFERENCES & CHANNELS)
             ========================================================= */}
          {activePage === 'notifications' ? (
            <View style={styles.sectionStack}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.iconBadge}>
                    <Bell size={15} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Scholarship & Task Alerts
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Control which events trigger reminders for your applications
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.toggleRow}
                  onPress={() => setNotifyDeadlines((p) => !p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>
                      Pending Document & Deadline Reminders
                    </Text>
                    <Text style={styles.toggleSub}>
                      Daily alerts when an application needs a signed endorsement, referee form, or final submission
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switchTrack,
                      notifyDeadlines && styles.switchTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        notifyDeadlines && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.toggleRow}
                  onPress={() => setNotifyNewPackages((p) => !p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>
                      Newly Matched & Prepared Scholarships
                    </Text>
                    <Text style={styles.toggleSub}>
                      Notify me when Artrat discovers and prepares a new scholarship I qualify for
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switchTrack,
                      notifyNewPackages && styles.switchTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        notifyNewPackages && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.toggleRow}
                  onPress={() => setNotifyHumanStep((p) => !p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>
                      Confirmed Submission & Receipt Alerts
                    </Text>
                    <Text style={styles.toggleSub}>
                      Notify me as soon as Artrat submits an application and saves the official portal receipt
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switchTrack,
                      notifyHumanStep && styles.switchTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        notifyHumanStep && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.toggleRow}
                  onPress={() => setNotifyCleanup((p) => !p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>
                      7-Day Ineligible Chat Cleanup Notice
                    </Text>
                    <Text style={styles.toggleSub}>
                      Notify me before an ineligible scholarship link is moved to History after 7 days
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switchTrack,
                      notifyCleanup && styles.switchTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        notifyCleanup && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </Pressable>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Delivery Channels</Text>

                <Pressable
                  style={styles.toggleRow}
                  onPress={() => setChannelPush((p) => !p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>
                      In-App & Mobile Push Notifications
                    </Text>
                    <Text style={styles.toggleSub}>
                      Instant alerts in the top notification bell and on your phone
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switchTrack,
                      channelPush && styles.switchTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        channelPush && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.toggleRow}
                  onPress={() => setChannelGoogleTasks((p) => !p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>
                      Google Tasks & Calendar Sync (9:30 AM & 2:00 PM)
                    </Text>
                    <Text style={styles.toggleSub}>
                      Schedule daily follow-up reminders in your connected Google Tasks & Calendar
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switchTrack,
                      channelGoogleTasks && styles.switchTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        channelGoogleTasks && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.toggleRow}
                  onPress={() => setChannelEmail((p) => !p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>
                      Email Confirmation Receipts
                    </Text>
                    <Text style={styles.toggleSub}>
                      Send verified submission receipts and weekly digests to chisom.okafor.248912@unn.edu.ng
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switchTrack,
                      channelEmail && styles.switchTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        channelEmail && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* =========================================================
              PAGE 5B: SETTINGS (CLEAN, UNCLUSTERED)
             ========================================================= */}
          {activePage === 'settings' ? (
            <View style={styles.sectionStack}>
              {/* Quick Link to Notification Settings */}
              <Pressable
                style={styles.hubNavCard}
                onPress={() => setActivePage('notifications')}
              >
                <View style={styles.hubNavIconBox}>
                  <Bell size={18} color="#5B21B6" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.hubNavTitle}>Notification Settings</Text>
                  <Text style={styles.hubNavSub}>
                    Deadline reminders, submission alerts & delivery channels
                  </Text>
                </View>
                <ArrowRight size={16} color="#5B21B6" />
              </Pressable>

              {/* Academic Level & Semester Promotion */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.iconBadge}>
                    <CalendarClock size={15} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Academic Level</Text>
                    <Text style={styles.cardSubtitle}>
                      University of Nigeria, Nsukka · 2nd Semester (2025/2026)
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.toggleRow}
                  onPress={() => {
                    const next = !autoLevelPromotion;
                    setAutoLevelPromotion(next);
                    if (next) setForceLevelOverrideMode(false);
                    showToast(
                      next
                        ? 'Auto-update level enabled.'
                        : 'Manual level selection enabled.'
                    );
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>
                      Auto-update level each session
                    </Text>
                    <Text style={styles.toggleSub}>
                      Promotes your level automatically when your school starts a new session
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switchTrack,
                      autoLevelPromotion && styles.switchTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        autoLevelPromotion && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </Pressable>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Current Level (tap to override manually)
                  </Text>
                  <View style={styles.tonePillsRow}>
                    {ACADEMIC_LEVEL_OPTIONS.map((lvl) => {
                      const active = studentLevel === lvl;
                      return (
                        <Pressable
                          key={lvl}
                          style={[
                            styles.toneChip,
                            active && styles.toneChipActive,
                          ]}
                          onPress={() => {
                            setStudentLevel(lvl);
                            setForceLevelOverrideMode(true);
                            setAutoLevelPromotion(false);
                            onUpdateProfileFact(
                              'fact-semester-level',
                              `${lvl} · 2nd Semester (2025/2026)`
                            );
                            showToast(`Updated your level to ${lvl}.`);
                          }}
                        >
                          <Text
                            style={[
                              styles.toneChipText,
                              active && styles.toneChipTextActive,
                            ]}
                          >
                            {lvl}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Guardian Receipts */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.iconBadge}>
                    <Shield size={15} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Parent & Guardian Receipts
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Optional email copy when an application is submitted
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.toggleRow}
                  onPress={() => setGuardianCcEnabled((p) => !p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>
                      CC Parent / Guardian on Submission Receipts
                    </Text>
                    <Text style={styles.toggleSub}>
                      Sends a copy of confirmed submissions to {guardianEmail}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switchTrack,
                      guardianCcEnabled && styles.switchTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        guardianCcEnabled && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </Pressable>

                {editingGuardian ? (
                  <View style={styles.guardianEditRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={guardianEmail}
                      onChangeText={setGuardianEmail}
                    />
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() => {
                        setEditingGuardian(false);
                        showToast('Updated guardian email.');
                      }}
                    >
                      <Text style={styles.primaryBtnText}>Save</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.editPillBtn}
                    onPress={() => setEditingGuardian(true)}
                  >
                    <Pencil size={12} color="#4C1D95" />
                    <Text style={styles.editPillBtnText}>
                      Change Email ({guardianEmail})
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Account, Export & Sign-Out */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Account</Text>
                <View style={styles.accountBtnsRow}>
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() =>
                      showToast(
                        'Exported Chisom_Okafor_Artrat_Vault_Backup.zip.'
                      )
                    }
                  >
                    <Download size={14} color="#4C1D95" />
                    <Text style={styles.secondaryBtnText}>
                      Export My Data (.ZIP)
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.onboardingPreviewBtn}
                    onPress={onOpenOnboardingPreview}
                  >
                    <KeyRound size={14} color="#4C1D95" />
                    <Text style={styles.onboardingPreviewBtnText}>
                      Sign-In & Onboarding
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={styles.signOutBtn}
                  onPress={onOpenOnboardingPreview}
                >
                  <LogOut size={14} color="#BE123C" />
                  <Text style={styles.signOutBtnText}>Sign Out</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* =========================================================
              PAGE 6: HOW ARTRAT WORKS & STUDENT FAQ
             ========================================================= */}
          {activePage === 'help' ? (
            <View style={styles.sectionStack}>
              {/* Mascot Welcome Hero Card */}
              <View style={styles.helpHeroCard}>
                <View style={styles.helpMascotWrap}>
                  <ArtratBot3D mood="happy" size="sm" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.helpHeroTitle}>
                    From scholarship discovery to final submission—handled while you study.
                  </Text>
                  <Text style={styles.helpHeroSubtitle}>
                    Artrat finds scholarships you qualify for, prepares your documents and essays in order, and submits your applications after you review them.
                  </Text>
                </View>
              </View>

              {/* 4 Visual Step Cards (2x2 on Desktop, Clean Stack on Mobile) */}
              <Text style={styles.groupHeading}>4 Steps From Match to Receipt</Text>
              <View style={[styles.helpStepsGrid, isWide && styles.helpStepsGridWide]}>
                {[
                  {
                    step: 'Step 1',
                    tag: 'Always On',
                    title: 'We Find Scholarships You Qualify For',
                    desc: 'Artrat searches national, state, corporate, and international scholarships—or checks any link you drop in chat—and only prepares scholarships where you meet every requirement.',
                    icon: <Layers size={16} color="#5B21B6" />,
                  },
                  {
                    step: 'Step 2',
                    tag: 'Portal Order',
                    title: 'Documents & Essays Prepared in Order',
                    desc: 'Using your Vault, Artrat arranges every required file in the exact sequence the portal asks for and writes tailored personal statements you can review or edit in Canvas.',
                    icon: <PenLine size={16} color="#5B21B6" />,
                  },
                  {
                    step: 'Step 3',
                    tag: 'Google Tasks',
                    title: 'Smart Reminders When a Signature Is Needed',
                    desc: 'If a scholarship asks for a signed letter from a referee, guarantor, mentor, or department, Artrat drafts the letter for you to download and reminds you until you upload the signed copy.',
                    icon: <CalendarClock size={16} color="#5B21B6" />,
                  },
                  {
                    step: 'Step 4',
                    tag: 'Zero Friction',
                    title: 'Autonomous Submission & Verified Receipts',
                    desc: 'Once you tap Submit, Artrat completes the portal submission for you—automatically picking up email verification codes via your connected Gmail—and saves your official receipt.',
                    icon: <FileCheck2 size={16} color="#5B21B6" />,
                  },
                ].map((item) => (
                  <View
                    key={item.step}
                    style={[
                      styles.helpVisualStepCard,
                      isWide && styles.helpVisualStepCardHalf,
                    ]}
                  >
                    <View style={styles.helpStepTopRow}>
                      <View style={styles.helpStepIconBox}>{item.icon}</View>
                      <View style={styles.helpStepTagPill}>
                        <Text style={styles.helpStepTagText}>
                          {item.step} · {item.tag}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.pipelineStepTitle}>{item.title}</Text>
                    <Text style={styles.pipelineStepDesc}>{item.desc}</Text>
                  </View>
                ))}
              </View>

              {/* Student FAQ Accordion */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Common Student Questions</Text>
                <Text style={styles.cardSubtitle}>
                  Clear answers on how your applications, documents, and submissions work
                </Text>

                <View style={styles.faqList}>
                  {[
                    {
                      id: 'faq-1',
                      q: 'Do I have to search for scholarships myself?',
                      a: 'No. Artrat continuously matches you with scholarships that fit your course, level, CGPA, and state of origin. If you also see a scholarship link on WhatsApp or campus boards, just drop it in the Applications chatbox and Artrat will check and prepare it for you.',
                    },
                    {
                      id: 'faq-2',
                      q: 'Can I edit my personal statement or replace a document before submitting?',
                      a: 'Yes. Every prepared application opens as a chat showing your documents and essays in order. Tap any essay to edit it in Canvas, or tap Replace on any document to swap it across your Vault and applications.',
                    },
                    {
                      id: 'faq-3',
                      q: 'Why do I connect Gmail in Connected Apps?',
                      a: 'Many scholarship portals send a verification code (OTP) to your email during registration or final submission. Connecting Gmail allows Artrat to pick up those verification codes automatically and save your official submission receipts without interrupting you.',
                    },
                    {
                      id: 'faq-4',
                      q: 'What if a scholarship asks for a signed letter or a new document?',
                      a: 'If a scholarship needs a signed letter (from a mentor, guarantor, or department), Artrat drafts it for you to download as a PDF or Word document, get signed, and upload. Any new document or detail you provide is saved in your Vault for future scholarships.',
                    },
                    {
                      id: 'faq-5',
                      q: 'What happens to scholarships I do not qualify for?',
                      a: 'If you drop a link whose requirements you do not meet (for example, a First Class 4.50 cutoff), Artrat shows why, places it in the "Didn’t Meet Standards" section below your active applications, and clears it to History after 7 days.',
                    },
                    {
                      id: 'faq-6',
                      q: 'When do I use Downloadable Submission Kits?',
                      a: 'If you ever prefer to upload files manually on a portal, go to Receipts & Submission Kits to download your prepared documents as a .PDF packet or your essays in Word (.DOCX) with one tap.',
                    },
                  ].map((faq) => {
                    const isOpen = openFaqId === faq.id;
                    return (
                      <View key={faq.id} style={styles.faqItem}>
                        <Pressable
                          style={styles.faqHeaderRow}
                          onPress={() => setOpenFaqId(isOpen ? null : faq.id)}
                        >
                          <Text style={styles.faqQuestionText}>{faq.q}</Text>
                          {isOpen ? (
                            <ChevronUp size={16} color="#5B21B6" />
                          ) : (
                            <ChevronDown size={16} color="#5B21B6" />
                          )}
                        </Pressable>
                        {isOpen ? (
                          <Text style={styles.faqAnswerText}>{faq.a}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* INTERACTIVE OAUTH CONNECTOR DEMO MODAL */}
      <Modal
        visible={!!oauthTargetConnector}
        animationType="fade"
        transparent
      >
        <Pressable
          style={styles.oauthBackdrop}
          onPress={() => setOauthTargetConnector(null)}
        >
          <Pressable
            style={styles.oauthModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            {oauthTargetConnector ? (
              <>
                <View style={styles.oauthHeaderRow}>
                  <View style={styles.oauthLockBadge}>
                    <Lock size={15} color="#5B21B6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.oauthHeaderTitle}>
                      {oauthTargetConnector.status === 'connected'
                        ? `Manage ${oauthTargetConnector.name}`
                        : `Connect ${oauthTargetConnector.name}`}
                    </Text>
                    <Text style={styles.oauthHeaderSub}>
                      Secure OAuth 2.0 · {oauthTargetConnector.providerDomain}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.oauthCloseBtn}
                    onPress={() => setOauthTargetConnector(null)}
                  >
                    <X size={15} color="#161126" />
                  </Pressable>
                </View>

                {oauthStep === 'authorizing' ? (
                  <View style={styles.oauthLoadingBox}>
                    <CheckCircle2 size={22} color="#6D28D9" />
                    <Text style={styles.oauthLoadingTitle}>
                      Verifying token with {oauthTargetConnector.name}...
                    </Text>
                    <Text style={styles.oauthLoadingSub}>
                      Syncing student permissions for {oauthAccountEmail}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Student Account to Authorize
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        value={oauthAccountEmail}
                        onChangeText={setOauthAccountEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>

                    <View style={styles.oauthPermsBox}>
                      <Text style={styles.oauthPermsHeading}>
                        Artrat requests permission to:
                      </Text>
                      {oauthTargetConnector.infoPermissions.map((p, idx) => (
                        <View key={idx} style={styles.oauthPermItem}>
                          <CheckCircle2 size={14} color="#047857" />
                          <Text style={styles.oauthPermText}>{p}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.oauthButtonsStack}>
                      <Pressable
                        style={styles.primaryBtn}
                        onPress={handleConfirmOAuthConnect}
                      >
                        <Text style={styles.primaryBtnText}>
                          {oauthTargetConnector.status === 'connected'
                            ? 'Save Account'
                            : 'Connect'}
                        </Text>
                      </Pressable>

                      {oauthTargetConnector.status === 'connected' ? (
                        <Pressable
                          style={styles.signOutBtn}
                          onPress={handleDisconnectFromModal}
                        >
                          <Text style={styles.signOutBtnText}>
                            Disconnect
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                )}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* PROFILE UNIVERSITY A-Z MODAL */}
      <Modal visible={profileUniModalOpen} animationType="fade" transparent>
        <Pressable
          style={styles.oauthBackdrop}
          onPress={() => setProfileUniModalOpen(false)}
        >
          <Pressable
            style={[styles.oauthModalCard, { maxHeight: '80%' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.oauthHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.oauthHeaderTitle}>
                  Select Nigerian University (A–Z)
                </Text>
              </View>
              <Pressable
                style={styles.oauthCloseBtn}
                onPress={() => setProfileUniModalOpen(false)}
              >
                <X size={15} color="#161126" />
              </Pressable>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Search university (e.g. UNN, UNILAG, ABU, Covenant)..."
              placeholderTextColor="#8B80A6"
              value={profileUniSearch}
              onChangeText={setProfileUniSearch}
            />

            <ScrollView style={{ maxHeight: 320 }}>
              {NIGERIAN_UNIVERSITIES.filter((u) =>
                u.toLowerCase().includes(profileUniSearch.toLowerCase())
              ).map((uni) => {
                const currentUniPart = editInstitution.split(' · ')[0] || '';
                const deptPart =
                  editInstitution.split(' · ')[1] ||
                  'B.Eng Electrical Engineering';
                const isSelected = currentUniPart === uni;
                return (
                  <Pressable
                    key={uni}
                    style={[
                      styles.toggleRow,
                      isSelected && { backgroundColor: '#F3EEFF' },
                    ]}
                    onPress={() => {
                      const updated = `${uni} · ${deptPart}`;
                      setEditInstitution(updated);
                      onUpdateProfileFact('fact-institution', updated);
                      setProfileUniModalOpen(false);
                      showToast(`Updated University to ${uni}`);
                    }}
                  >
                    <Text style={[styles.toggleTitle, { flex: 1 }]}>{uni}</Text>
                    {isSelected ? <Check size={14} color="#5B21B6" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* PROFILE STATE OF ORIGIN MODAL */}
      <Modal visible={profileStateModalOpen} animationType="fade" transparent>
        <Pressable
          style={styles.oauthBackdrop}
          onPress={() => setProfileStateModalOpen(false)}
        >
          <Pressable
            style={[styles.oauthModalCard, { maxHeight: '80%' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.oauthHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.oauthHeaderTitle}>State of Origin</Text>
              </View>
              <Pressable
                style={styles.oauthCloseBtn}
                onPress={() => setProfileStateModalOpen(false)}
              >
                <X size={15} color="#161126" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {NIGERIA_STATES.map((st) => {
                const isSelected = st === profileState;
                const lgas = getLgasByState(st);
                return (
                  <Pressable
                    key={st}
                    style={[
                      styles.toggleRow,
                      isSelected && { backgroundColor: '#F3EEFF' },
                    ]}
                    onPress={() => {
                      setProfileState(st);
                      const nextLga = lgas[0] || '';
                      setProfileLga(nextLga);
                      onUpdateProfileFact(
                        'fact-origin',
                        `${st === 'FCT - Abuja' ? st : `${st} State`} · ${nextLga} LGA`
                      );
                      setProfileStateModalOpen(false);
                      showToast(
                        `Updated State of Origin to ${st} (${nextLga})`
                      );
                    }}
                  >
                    <Text style={styles.toggleTitle}>
                      {st === 'FCT - Abuja' ? st : `${st} State`}
                    </Text>
                    {isSelected ? <Check size={14} color="#5B21B6" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* PROFILE LGA MODAL */}
      <Modal visible={profileLgaModalOpen} animationType="fade" transparent>
        <Pressable
          style={styles.oauthBackdrop}
          onPress={() => setProfileLgaModalOpen(false)}
        >
          <Pressable
            style={[styles.oauthModalCard, { maxHeight: '80%' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.oauthHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.oauthHeaderTitle}>
                  Local Government Area ({profileState})
                </Text>
              </View>
              <Pressable
                style={styles.oauthCloseBtn}
                onPress={() => setProfileLgaModalOpen(false)}
              >
                <X size={15} color="#161126" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {getLgasByState(profileState).map((lga) => {
                const isSelected = lga === profileLga;
                return (
                  <Pressable
                    key={lga}
                    style={[
                      styles.toggleRow,
                      isSelected && { backgroundColor: '#F3EEFF' },
                    ]}
                    onPress={() => {
                      setProfileLga(lga);
                      onUpdateProfileFact(
                        'fact-origin',
                        `${profileState === 'FCT - Abuja' ? profileState : `${profileState} State`} · ${lga} LGA`
                      );
                      setProfileLgaModalOpen(false);
                      showToast(`Updated LGA to ${lga}`);
                    }}
                  >
                    <Text style={styles.toggleTitle}>{lga}</Text>
                    {isSelected ? <Check size={14} color="#5B21B6" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5FC',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDF5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },
  backBtnText: {
    fontSize: 12,
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
    fontSize: 11,
    color: '#4E4466',
  },
  toastBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
    flex: 1,
  },
  bodyLayout: {
    flex: 1,
  },
  bodyLayoutWide: {
    flexDirection: 'row',
  },
  desktopSubRail: {
    width: 230,
    backgroundColor: '#FAF8FF',
    borderRightWidth: 1,
    borderRightColor: '#E5DDF5',
    padding: 14,
    gap: 5,
  },
  railItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 11,
  },
  railItemActive: {
    backgroundColor: '#EDE5FF',
  },
  railItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E4466',
    flex: 1,
  },
  railItemTextActive: {
    color: '#4C1D95',
    fontWeight: '700',
  },
  railDivider: {
    height: 1,
    backgroundColor: '#E5DDF5',
    marginVertical: 6,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    gap: 14,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
  },
  contentWide: {
    paddingHorizontal: 26,
    paddingTop: 20,
  },
  mobileJumpPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  jumpPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#EDE5FF',
  },
  jumpPillActive: {
    backgroundColor: '#6D28D9',
  },
  jumpPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  jumpPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionStack: {
    gap: 12,
  },
  groupHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E4466',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  identityHeroCard: {
    backgroundColor: '#ECE4FC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D5C5F7',
    gap: 14,
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircleLg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLg: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  under18Pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  under18PillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C1D95',
  },
  studentNameTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#161126',
  },
  studentUniSub: {
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 17,
  },
  academicStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  academicStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  academicStatVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161126',
  },
  academicStatLab: {
    fontSize: 11,
    color: '#756A92',
    fontWeight: '500',
  },
  statVertDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EAE4F8',
  },
  hubCardsList: {
    gap: 9,
  },
  hubNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  hubNavIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  hubNavTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161126',
  },
  hubNavSub: {
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 17,
  },
  hubGreenPill: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0D4F7',
  },
  hubGreenPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4C1D95',
  },
  syncedRefereeStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: '#DDD0F8',
  },
  syncedRefereeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C1D95',
  },
  syncedRefereeVal: {
    fontSize: 12,
    color: '#4E4466',
    marginTop: 2,
    lineHeight: 17,
  },
  /* INDIVIDUAL COMPACT CONNECTOR CARDS WITH `i` INFO BUTTON */
  connectorsIntroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#DDD0F8',
  },
  connectorsIntroText: {
    flex: 1,
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 17,
  },
  connectorsGroupList: {
    gap: 8,
  },
  connectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 9,
  },
  connectorMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectorIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorIconBoxActive: {
    backgroundColor: '#EDE5FF',
  },
  connectorTitleGroup: {
    flex: 1,
    gap: 2,
  },
  connectorNameWithInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectorNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161126',
  },
  infoIconButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3EEFF',
    borderWidth: 1,
    borderColor: '#D4C6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconButtonActive: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  connectorAccountSub: {
    fontSize: 11,
    color: '#6E6388',
  },
  connectActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  connectActionBtnConnected: {
    backgroundColor: '#F3EEFF',
    borderColor: '#E0D4F7',
  },
  connectActionBtnAvailable: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  connectActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectActionBtnTextConnected: {
    color: '#4C1D95',
  },
  connectActionBtnTextAvailable: {
    color: '#FFFFFF',
  },
  comingSoonPillBtn: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDD0F8',
  },
  comingSoonPillBtnActive: {
    backgroundColor: '#EDE5FF',
    borderColor: '#6D28D9',
  },
  comingSoonPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B21B6',
  },
  comingSoonPillTextActive: {
    color: '#4C1D95',
  },
  tasksScheduleInlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2ECFA',
  },
  tasksScheduleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4E4466',
  },
  tasksSchedulePills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniScheduleChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3EEFF',
  },
  miniScheduleChipActive: {
    backgroundColor: '#6D28D9',
  },
  miniScheduleChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4C1D95',
  },
  miniScheduleChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  connectorInfoPopover: {
    backgroundColor: '#FAF8FF',
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: '#DDD0F8',
    gap: 7,
  },
  connectorInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  connectorInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  connectorInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C1D95',
  },
  closeInfoPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EDE5FF',
  },
  closeInfoPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4C1D95',
  },
  connectorInfoBody: {
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 17,
  },
  connectorPermsList: {
    gap: 4,
    paddingTop: 2,
  },
  connectorPermRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectorPermText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#161126',
  },
  /* SHARED CARD STYLES */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161126',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 17,
  },
  bodyParagraph: {
    fontSize: 13,
    color: '#4E4466',
    lineHeight: 19,
  },
  tonePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0D4F7',
  },
  toneChipActive: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  toneChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  toneChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E4466',
  },
  voiceTextArea: {
    backgroundColor: '#FAF8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C6F0',
    padding: 12,
    fontSize: 13,
    color: '#161126',
    minHeight: 84,
    lineHeight: 19,
  },
  textInput: {
    backgroundColor: '#FAF8FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4C6F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#161126',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#6D28D9',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#F3EEFF',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD0F8',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C1D95',
  },
  editPillBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  editPillBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  addrForm: {
    gap: 10,
    backgroundColor: '#FAF8FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  addrReadBlock: {
    backgroundColor: '#FAF8FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 10,
  },
  addrReadItem: {
    gap: 2,
  },
  addrReadLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#756A92',
  },
  addrReadVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#161126',
    lineHeight: 18,
  },
  factsTable: {
    gap: 8,
    paddingTop: 4,
  },
  factLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EEFF',
    gap: 10,
  },
  factLineLabel: {
    fontSize: 12,
    color: '#6E6388',
    fontWeight: '500',
  },
  factLineVal: {
    fontSize: 12,
    color: '#161126',
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  ledgerList: {
    gap: 9,
  },
  ledgerItemCard: {
    backgroundColor: '#FAF8FF',
    borderRadius: 13,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 4,
  },
  ledgerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ledgerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  ledgerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4C1D95',
  },
  ledgerSourceText: {
    fontSize: 10,
    color: '#6E6388',
  },
  ledgerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161126',
  },
  ledgerMetric: {
    fontSize: 12,
    color: '#4E4466',
  },
  kitCardsStack: {
    gap: 10,
  },
  kitBundleCard: {
    backgroundColor: '#FAF8FF',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 10,
  },
  kitBundleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kitSponsorTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B21B6',
  },
  kitBundleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161126',
    marginTop: 2,
  },
  kitBundleMeta: {
    fontSize: 12,
    color: '#4E4466',
    marginTop: 2,
  },
  kitDownloadActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    alignItems: 'center',
  },
  kitCompactPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6D28D9',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 9,
  },
  kitCompactPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  kitCompactSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3EEFF',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#DDD0F8',
  },
  kitCompactSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    overflow: 'hidden',
  },
  receiptGreenStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  receiptStripText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  receiptBody: {
    padding: 15,
    gap: 10,
  },
  receiptTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  receiptSponsor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B21B6',
  },
  receiptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161126',
    marginTop: 2,
  },
  awardPill: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  awardPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C1D95',
  },
  receiptMeta: {
    fontSize: 12,
    color: '#4E4466',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#161126',
  },
  toggleSub: {
    fontSize: 12,
    color: '#4E4466',
    marginTop: 2,
    lineHeight: 17,
  },
  switchTrack: {
    width: 44,
    height: 25,
    borderRadius: 999,
    backgroundColor: '#DDD0F8',
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: '#6D28D9',
  },
  switchThumb: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  guardianEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountBtnsRow: {
    gap: 10,
  },
  onboardingPreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FAF8FF',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C6F0',
  },
  onboardingPreviewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C1D95',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFF1F2',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginTop: 4,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BE123C',
  },
  helpHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  helpMascotWrap: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  helpHeroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161126',
    lineHeight: 22,
  },
  helpHeroSubtitle: {
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 18,
  },
  helpStepsGrid: {
    gap: 10,
  },
  helpStepsGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  helpVisualStepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 6,
  },
  helpVisualStepCardHalf: {
    width: '48.8%',
    minWidth: 280,
    flexGrow: 1,
  },
  helpStepTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  helpStepIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpStepTagPill: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  helpStepTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5B21B6',
  },
  pipelineStepsList: {
    gap: 10,
    marginTop: 4,
  },
  pipelineStepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FAF8FF',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  pipelineNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pipelineNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pipelineStepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161126',
  },
  pipelineStepDesc: {
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 18,
  },
  faqList: {
    gap: 8,
    marginTop: 4,
  },
  faqItem: {
    backgroundColor: '#FAF8FF',
    borderRadius: 13,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 8,
  },
  faqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#161126',
    lineHeight: 18,
  },
  faqAnswerText: {
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 18,
  },
  /* OAUTH MODAL STYLES */
  oauthBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 17, 38, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  oauthModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 14,
  },
  oauthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  oauthLockBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDE5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161126',
  },
  oauthHeaderSub: {
    fontSize: 12,
    color: '#4E4466',
  },
  oauthCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthPermsBox: {
    backgroundColor: '#FAF8FF',
    borderRadius: 13,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 8,
  },
  oauthPermsHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C1D95',
  },
  oauthPermItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  oauthPermText: {
    fontSize: 12,
    color: '#161126',
    fontWeight: '600',
    flex: 1,
  },
  oauthButtonsStack: {
    gap: 8,
  },
  oauthLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  oauthLoadingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161126',
  },
  oauthLoadingSub: {
    fontSize: 12,
    color: '#4E4466',
  },
});
