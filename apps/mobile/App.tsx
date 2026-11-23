import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileCheck2,
  FolderClosed,
  HelpCircle,
  History,
  Home,
  Layers,
  MessageSquare,
  Send,
  Settings,
} from './src/ui/icons';
import {
  buildHodLetterDraft,
  INITIAL_APPLICATIONS,
  INITIAL_HISTORY_THREADS,
  INITIAL_PROFILE_FACTS,
  INITIAL_VAULT_DOCUMENTS,
} from './src/api/mockData';
import {
  sendChatToBackend,
  submitStudentLinkDrop,
  syncStudentProfileToBackend,
  syncVaultUploadToBackend,
} from './src/api/client';
import {
  CuratedApplication,
  GeneralHistoryThread,
  ProfileFact,
  VaultDocument,
} from './src/domain/types';
import { ApplicationChatScreen } from './src/ui/ApplicationChatScreen';
import { ChatHistoryDrawer } from './src/ui/ChatHistoryDrawer';
import { HomeScreen } from './src/ui/HomeScreen';
import { NewChatScreen } from './src/ui/NewChatScreen';
import { NotificationsModal } from './src/ui/NotificationsModal';
import { OnboardingScreen } from './src/ui/OnboardingScreen';
import {
  ProfileSettingsScreen,
  ProfileSettingsSubTab,
} from './src/ui/ProfileSettingsScreen';
import { TasksScreen } from './src/ui/TasksScreen';
import { VaultScreen } from './src/ui/VaultScreen';

type ActiveTab = 'home' | 'applications' | 'tasks' | 'vault';

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 840;

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [applications, setApplications] =
    useState<CuratedApplication[]>(INITIAL_APPLICATIONS);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>(
    INITIAL_VAULT_DOCUMENTS
  );
  const [profileFacts, setProfileFacts] = useState<ProfileFact[]>(
    INITIAL_PROFILE_FACTS
  );
  const [historyThreads, setHistoryThreads] = useState<GeneralHistoryThread[]>(
    INITIAL_HISTORY_THREADS
  );

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [profileInitialSubTab, setProfileInitialSubTab] =
    useState<ProfileSettingsSubTab>('profile');
  const [onboardingPreviewOpen, setOnboardingPreviewOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(2);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);
  const [backendStudentId, setBackendStudentId] = useState<string | null>(null);

  useEffect(() => {
    void syncStudentProfileToBackend({
      email: 'chisom.okafor.248912@unn.edu.ng',
      full_name: 'Chisom Kamsiyochukwu Okafor',
      date_of_birth: '2009-05-14',
      institution: 'University of Nigeria, Nsukka (UNN)',
      department: 'B.Eng Electrical Engineering',
      matric_number: '2024/248912',
      academic_level: '200 Level',
      state_of_origin: 'Anambra',
      lga: 'Njikoka',
      residential_address:
        'Room 204, Kwame Nkrumah Hall, University of Nigeria, Nsukka',
    }).then((stu) => {
      if (stu?.id) setBackendStudentId(stu.id);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'artrat-google-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);

      const style = document.createElement('style');
      style.textContent = `
        html, body, #root {
          height: 100%;
          margin: 0;
          padding: 0;
          background-color: #F7F5FC;
          font-family: "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        * {
          box-sizing: border-box;
          font-family: "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          -webkit-tap-highlight-color: transparent;
        }
        div[role="button"], button {
          user-select: none;
          -webkit-user-select: none;
        }
        input:focus, textarea:focus {
          outline: none;
        }
        .artrat-glass-dock {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 10px 28px -6px rgba(91, 33, 182, 0.15), 0 2px 8px -2px rgba(22, 17, 38, 0.06);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const selectedApplication = applications.find((a) => a.id === selectedAppId);
  const [appsMobileNavVisible, setAppsMobileNavVisible] = useState(false);
  const lastAppsScrollY = React.useRef(0);
  const touchStartYRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (activeTab !== 'applications') {
      setAppsMobileNavVisible(false);
      lastAppsScrollY.current = 0;
    }
  }, [activeTab]);

  // Native Web Wheel + Touch Gesture Listener so scrolling down/up on Applications tab on Mobile ALWAYS toggles between Sticky Chatbox & Bottom Nav
  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      isDesktop ||
      activeTab !== 'applications' ||
      !!selectedApplication ||
      newChatOpen ||
      profileSettingsOpen ||
      onboardingPreviewOpen
    ) {
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 2) {
        setAppsMobileNavVisible(true);
      } else if (e.deltaY < -2) {
        setAppsMobileNavVisible(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (
        touchStartYRef.current !== null &&
        e.touches &&
        e.touches.length > 0
      ) {
        const dy = touchStartYRef.current - e.touches[0].clientY;
        if (dy > 8) {
          setAppsMobileNavVisible(true);
        } else if (dy < -8) {
          setAppsMobileNavVisible(false);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [
    isDesktop,
    activeTab,
    selectedApplication,
    newChatOpen,
    profileSettingsOpen,
    onboardingPreviewOpen,
  ]);

  const studentWritingAddress =
    profileFacts.find((f) => f.id === 'fact-writing-address')?.value ||
    'Room 204, Kwame Nkrumah Hall, University of Nigeria, Nsukka';

  const [defaultHodAddress, setDefaultHodAddress] = useState(
    'Prof. E. C. Anene, HOD Electrical Engineering, Faculty of Engineering, UNN'
  );

  const hodRecipientAddress =
    profileFacts.find((f) => f.id === 'fact-hod-address')?.value ||
    defaultHodAddress;

  const showNotice = (msg: string) => {
    setGlobalNotice(msg);
    setTimeout(() => setGlobalNotice(null), 4000);
  };

  // Update Both Student Writing Address & HOD Recipient Address -> Regenerates HOD Letter Draft
  const handleUpdateAddresses = (newWritingAddr: string, newHodAddr: string) => {
    setDefaultHodAddress(newHodAddr);
    setProfileFacts((prev) => {
      const updated = prev.map((fact) => {
        if (fact.id === 'fact-writing-address')
          return { ...fact, value: newWritingAddr };
        if (fact.id === 'fact-hod-address')
          return { ...fact, value: newHodAddr };
        return fact;
      });
      const hasHodFact = updated.some((f) => f.id === 'fact-hod-address');
      if (!hasHodFact && newHodAddr !== hodRecipientAddress) {
        return [
          ...updated,
          {
            id: 'fact-hod-address',
            label: 'Signatory / Referee Address',
            value: newHodAddr,
            category: 'Addressing',
            verifiedSource: 'Updated in Application',
          },
        ];
      }
      return updated;
    });

    const updatedDraft = buildHodLetterDraft(newWritingAddr, newHodAddr);
    setApplications((prev) =>
      prev.map((app) => ({
        ...app,
        orderedItems: app.orderedItems.map((it) =>
          it.type === 'missing_requirement'
            ? {
                ...it,
                studentWritingAddress: newWritingAddr,
                hodRecipientAddress: newHodAddr,
                writeupContent: updatedDraft,
              }
            : it
        ),
      }))
    );
  };

  // Replace Document inside an Application Chat -> Updates Global Vault
  const handleReplaceDocumentInChat = (
    appId: string,
    itemId: string,
    vaultDocId: string,
    newFileName: string
  ) => {
    setVaultDocs((prev) =>
      prev.map((doc) =>
        doc.id === vaultDocId
          ? {
              ...doc,
              fileName: newFileName,
              updatedAt: 'Updated just now',
              status: 'ready',
            }
          : doc
      )
    );

    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              orderedItems: app.orderedItems.map((it) =>
                it.id === itemId ? { ...it, status: 'updated' } : it
              ),
              chatTurns: [
                ...app.chatTurns,
                {
                  id: `turn-${Date.now()}`,
                  sender: 'artrat',
                  text: `Updated "${newFileName}" here and in your Vault.`,
                  timestamp: 'Just now',
                },
              ],
            }
          : app
      )
    );
  };

  // Manual Replace in Vault
  const handleReplaceVaultDocManual = (docId: string, newFileName: string) => {
    setVaultDocs((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              fileName: newFileName,
              updatedAt: 'Updated just now',
              status: 'ready',
            }
          : doc
      )
    );
  };

  // Manual Remove in Vault
  const handleRemoveVaultDocManual = (docId: string) => {
    setVaultDocs((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              status: 'removed',
              updatedAt: 'Removed',
            }
          : doc
      )
    );
  };

  // Profile Fact Update
  const handleUpdateProfileFact = (factId: string, newValue: string) => {
    setProfileFacts((prev) =>
      prev.map((f) => (f.id === factId ? { ...f, value: newValue } : f))
    );
    if (factId === 'fact-writing-address') {
      handleUpdateAddresses(newValue, hodRecipientAddress);
    } else if (factId === 'fact-hod-address') {
      handleUpdateAddresses(studentWritingAddress, newValue);
    }
  };

  // Dynamic Vault Document Addition
  const handleAddVaultDoc = (
    title: string,
    category: VaultDocument['category'],
    fileName: string
  ) => {
    const newDoc: VaultDocument = {
      id: `vault-dyn-${Date.now()}`,
      title,
      category,
      fileName,
      fileSize: '310 KB',
      updatedAt: 'Added just now',
      status: 'ready',
      usedInCount: 1,
    };
    setVaultDocs((prev) => [newDoc, ...prev]);
  };

  // Dynamic Vault Profile Fact Addition
  const handleAddProfileFact = (
    label: string,
    value: string,
    category: ProfileFact['category']
  ) => {
    const newFact: ProfileFact = {
      id: `fact-dyn-${Date.now()}`,
      label,
      value,
      category,
      verifiedSource: 'Added by you',
    };
    setProfileFacts((prev) => [newFact, ...prev]);
  };

  // Onboarding AI Match Completion -> Adds Newly Matched & Prepared Scholarship to Applications
  const handleCompleteOnboardingMatch = () => {
    setApplications((prev) => {
      if (prev.some((a) => a.id === 'app-seplat-jv')) return prev;
      const seplatApp: CuratedApplication = {
        id: 'app-seplat-jv',
        title: 'Seplat Energy JV National Undergraduate Scholarship',
        sponsor: 'Seplat Energy & NNPC JV',
        awardValue: '₦200,000 / yr',
        deadline: 'Nov 25',
        daysLeft: 27,
        portalUrl: 'https://seplatenergy.com/scholarships',
        discoverySource: 'Newly matched for you',
        automationPolicy: 'end_to_end_auto',
        dryRunCompletedAt: 'Just now',
        status: 'ready_to_submit',
        statusSummary: '4 of 4 items ready to submit',
        hardRules: [
          {
            id: 'hr-sep-1',
            ruleLabel: 'Academic Level & Course',
            portalRequirement: '200L Engineering or Geosciences',
            studentValue: '200L Electrical Engineering',
            passed: true,
          },
          {
            id: 'hr-sep-2',
            ruleLabel: 'Minimum CGPA',
            portalRequirement: '3.50 / 5.00 required',
            studentValue: '4.21 / 5.00',
            passed: true,
          },
        ],
        orderedItems: [
          {
            id: 'sep-1',
            orderIndex: 1,
            type: 'document',
            title: 'Passport Photograph',
            portalFieldLabel: 'Recent passport photograph',
            status: 'ready',
            vaultDocId: 'vault-passport',
          },
          {
            id: 'sep-2',
            orderIndex: 2,
            type: 'document',
            title: '100L Statement of Result',
            portalFieldLabel: 'Signed 100L result sheet (4.21 CGPA)',
            status: 'ready',
            vaultDocId: 'vault-transcript',
          },
          {
            id: 'sep-3',
            orderIndex: 3,
            type: 'document',
            title: 'University Student ID Card',
            portalFieldLabel: 'Valid student ID card',
            status: 'ready',
            vaultDocId: 'vault-idcard',
          },
          {
            id: 'sep-4',
            orderIndex: 4,
            type: 'writeup',
            title: 'Energy Transition Statement of Purpose',
            portalFieldLabel: 'Why you merit the Seplat JV Award (Max 250 words)',
            status: 'ready',
            writeupWordLimit: 250,
            writeupContent:
              'Holding a 4.21/5.00 CGPA in 200 Level Electrical Engineering after scoring 308 in the JAMB UTME reflects my dedication to reliable power distribution and renewable microgrid engineering. The Seplat Energy JV Undergraduate Scholarship will directly fund my laboratory research and tuition through graduation.',
          },
        ],
        chatTurns: [
          {
            id: 'turn-sep-1',
            sender: 'artrat',
            collapsibleTitle:
              'Newly Matched: Prepared 4 of 4 items in order for Seplat Energy JV',
            collapsibleBullets: [
              '1. Passport Photograph (from Vault)',
              '2. 100L Statement of Result — 4.21 CGPA (from Vault)',
              '3. University Student ID Card (from Vault)',
              '4. Energy Transition Statement of Purpose (editable in Canvas)',
            ],
            text: 'I matched your profile against the Seplat Energy JV National Undergraduate Scholarship and verified every requirement. All 4 items are arranged in portal order for your review.',
            timestamp: 'Just now',
          },
        ],
      };
      return [seplatApp, ...prev];
    });
    setOnboardingPreviewOpen(false);
    setProfileSettingsOpen(false);
    setActiveTab('applications');
    showNotice(
      'AI Match complete: Prepared Seplat Energy JV Scholarship in your Applications!'
    );
  };

  // Gemini Canvas Writeup Save
  const handleUpdateWriteupInCanvas = (
    appId: string,
    itemId: string,
    newContent: string
  ) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              orderedItems: app.orderedItems.map((it) =>
                it.id === itemId
                  ? { ...it, writeupContent: newContent, status: 'updated' }
                  : it
              ),
              chatTurns: [
                ...app.chatTurns,
                {
                  id: `turn-${Date.now()}`,
                  sender: 'artrat',
                  text: 'Saved your updated text from Canvas.',
                  timestamp: 'Just now',
                },
              ],
            }
          : app
      )
    );
  };

  // Upload Missing Requirement (e.g. Signed HOD Letter)
  const handleUploadMissingRequirement = (appId: string, itemId: string) => {
    if (backendStudentId) {
      void syncVaultUploadToBackend(backendStudentId, {
        doc_type: 'dynamic_endorsement',
        signed_by: 'hod',
        title: 'Signed HOD Attestation Letter',
        file_name: 'UNN_EEE_HOD_Endorsement_Signed.pdf',
        storage_key: `vault/${backendStudentId}/hod-endorsement.pdf`,
        extracted_summary: 'Signed & stamped by HOD Electrical Engineering, UNN',
      });
    }
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const updatedItems = app.orderedItems.map((it) =>
          it.id === itemId ? { ...it, status: 'ready' as const } : it
        );
        const stillMissing = updatedItems.some(
          (i) => i.status === 'action_required'
        );
        return {
          ...app,
          status: stillMissing ? 'waiting_on_document' : 'ready_to_submit',
          statusSummary: stillMissing
            ? app.statusSummary
            : '5 of 5 items ready to submit',
          orderedItems: updatedItems,
          chatTurns: [
            ...app.chatTurns,
            {
              id: `turn-${Date.now()}`,
              sender: 'artrat',
              text: 'Received your signed HOD letter and closed your Google Tasks reminder. Your application is now ready to submit.',
              timestamp: 'Just now',
            },
          ],
        };
      })
    );
    showNotice('Signed HOD letter uploaded · Ready to submit');
  };

  // Submit Application
  const handleDeclareAndSubmit = (appId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              status: 'submitted',
              statusSummary: 'Submitted',
              submissionReceiptId: '#ART-2026-88412',
              chatTurns: [
                ...app.chatTurns,
                {
                  id: `turn-${Date.now()}`,
                  sender: 'artrat',
                  text: 'Submitted your application. Confirmation receipt is saved in your Vault.',
                  timestamp: 'Just now',
                },
              ],
            }
          : app
      )
    );
  };

  // Move an ineligible application from the 7-day below list straight to History
  const handleArchiveIneligibleNow = (appId: string) => {
    const target = applications.find((a) => a.id === appId);
    if (!target) return;

    const newThread: GeneralHistoryThread = {
      id: `hist-${Date.now()}`,
      title: target.title,
      subtitle: `${target.statusSummary} · Wiped to History`,
      updatedAt: 'Just now',
      kind: 'link_drop_disqualified',
      portalUrl: target.portalUrl,
      outcomeBadge: 'Moved to History',
      outcomeColor: 'red',
      wipedAfterDays: 7,
      messages: target.chatTurns.map((t) => ({
        id: t.id,
        sender: t.sender,
        text: t.text,
        timestamp: t.timestamp,
      })),
    };

    setHistoryThreads((prev) => [newThread, ...prev]);
    setApplications((prev) => prev.filter((a) => a.id !== appId));
    setSelectedAppId(null);
    showNotice(`Moved "${target.title}" to History`);
  };

  // Send Message inside a Specific Application Chat (with interactive reasoning status stream)
  const handleSendMessageInAppChat = (appId: string, message: string) => {
    const replyTurnId = `turn-art-${Date.now() + 1}`;
    const targetApp = applications.find((a) => a.id === appId);
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        return {
          ...app,
          chatTurns: [
            ...app.chatTurns,
            {
              id: `turn-stu-${Date.now()}`,
              sender: 'student',
              text: message,
              timestamp: 'Just now',
            },
            {
              id: replyTurnId,
              sender: 'artrat',
              text: 'Checking your documents and updating your application…',
              timestamp: 'Thinking…',
            },
          ],
        };
      })
    );
    void sendChatToBackend({
      message,
      student_id: backendStudentId,
      output_format: 'text',
      context: targetApp
        ? `${targetApp.title} (${targetApp.portalUrl}) · Status: ${targetApp.statusSummary}`
        : null,
    }).then((res) => {
      const fallbackText =
        res?.reply ||
        `Checked against your UNN 200L profile (4.21 CGPA) and ${
          targetApp?.title || 'this scholarship'
        } blueprint—I have updated your application package accordingly.`;
      setApplications((prev) =>
        prev.map((app) =>
          app.id !== appId
            ? app
            : {
                ...app,
                chatTurns: app.chatTurns.map((t) =>
                  t.id === replyTurnId
                    ? { ...t, text: fallbackText, timestamp: 'Just now' }
                    : t
                ),
              }
        )
      );
    });
  };

  // Process a scholarship link or message inside NewChatScreen -> Returns the created application (either Ready or Not Eligible 7-day wipe)
  const handleProcessLinkOrMessageInNewChat = (
    input: string
  ): CuratedApplication => {
    if (/^https?:\/\//i.test(input.trim())) {
      void submitStudentLinkDrop(input.trim());
    }
    const lower = input.toLowerCase();
    const isIneligibleDemo =
      lower.includes('first-class') ||
      lower.includes('first class') ||
      lower.includes('agbami') ||
      lower.includes('ptdf') ||
      lower.includes('4.5') ||
      lower.includes('100l') ||
      lower.includes('postgrad') ||
      lower.includes('nlng');

    const hostLabel = input
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .replace(/^www\./, '');

    if (isIneligibleDemo) {
      const newIneligibleId = `app-ineligible-${Date.now()}`;
      const newIneligibleApp: CuratedApplication = {
        id: newIneligibleId,
        title:
          hostLabel.includes('.') && hostLabel.length < 28
            ? `${hostLabel} Merit Award`
            : 'First Class Honours National Award',
        sponsor: hostLabel.includes('.') ? hostLabel : 'Scholarship Board',
        awardValue: '₦400,000 / yr',
        deadline: 'Nov 30',
        daysLeft: 30,
        portalUrl: input,
        discoverySource: 'From link you shared',
        automationPolicy: 'end_to_end_auto',
        dryRunCompletedAt: 'Just now',
        status: 'not_eligible',
        statusSummary: 'Requires First Class (4.50 CGPA)',
        disqualificationReason:
          'Requires First Class Honours (4.50 / 5.00 minimum CGPA). Your current CGPA is 4.21 / 5.00 (Second Class Upper).',
        daysUntilHistoryWipe: 7,
        hardRules: [
          {
            id: 'hr-new-1',
            ruleLabel: 'Academic Level & Course',
            portalRequirement: '200L Engineering',
            studentValue: '200L Electrical Engineering · UNN',
            passed: true,
          },
          {
            id: 'hr-new-2',
            ruleLabel: 'Minimum CGPA',
            portalRequirement: '4.50 / 5.00 (First Class) required',
            studentValue: '4.21 / 5.00 (2.1 Honours)',
            passed: false,
          },
        ],
        orderedItems: [],
        chatTurns: [
          {
            id: `turn-stu-${Date.now()}`,
            sender: 'student',
            text: input,
            timestamp: 'Just now',
          },
          {
            id: `turn-art-${Date.now() + 1}`,
            sender: 'artrat',
            collapsibleTitle:
              'Not eligible: Requires 4.50 CGPA · Wipes to History in 7 days',
            collapsibleBullets: [
              'Passed: 200L Electrical Engineering at UNN',
              'Passed: Supporting documents available in Vault',
              'Did not meet standard: Strictly requires 4.50 First Class CGPA (you have 4.21)',
            ],
            text: `I checked "${input}". Even though you have all the supporting documents in your Vault, this scholarship strictly requires a First Class CGPA of at least 4.50 / 5.00. Because your CGPA is 4.21 (Second Class Upper), you do not meet the requirement.\n\nI placed this below your active applications—it will automatically wipe to your History after 7 days.`,
            timestamp: 'Just now',
          },
        ],
      };

      setApplications((prev) => [...prev, newIneligibleApp]);
      return newIneligibleApp;
    }

    const newAppId = `app-custom-${Date.now()}`;
    const cleanTitle =
      hostLabel.includes('.') && hostLabel.length < 30
        ? `Chevron / ${hostLabel} STEM Award`
        : 'Chevron JV Undergraduate Scholarship';

    const newApp: CuratedApplication = {
      id: newAppId,
      title: cleanTitle,
      sponsor: hostLabel.includes('.') ? hostLabel : 'Chevron Nigeria JV',
      awardValue: '₦250,000 / yr',
      deadline: 'Nov 28',
      daysLeft: 30,
      portalUrl: input,
      discoverySource: 'From link you shared',
      automationPolicy: 'end_to_end_auto',
      dryRunCompletedAt: 'Just now',
      status: 'ready_to_submit',
      statusSummary: '4 of 4 items ready to submit',
      hardRules: [
        {
          id: 'hr-c-1',
          ruleLabel: 'Minimum CGPA',
          portalRequirement: '3.50 / 5.00 required',
          studentValue: '4.21 / 5.00',
          passed: true,
        },
      ],
      orderedItems: [
        {
          id: `c-item-1-${Date.now()}`,
          orderIndex: 1,
          type: 'document',
          title: 'Passport Photograph',
          portalFieldLabel: 'Recent passport photograph',
          status: 'ready',
          vaultDocId: 'vault-passport',
        },
        {
          id: `c-item-2-${Date.now()}`,
          orderIndex: 2,
          type: 'document',
          title: '100L Statement of Result',
          portalFieldLabel: 'Signed 100L result sheet',
          status: 'ready',
          vaultDocId: 'vault-transcript',
        },
        {
          id: `c-item-3-${Date.now()}`,
          orderIndex: 3,
          type: 'document',
          title: 'University Student ID Card',
          portalFieldLabel: 'Valid student ID card',
          status: 'ready',
          vaultDocId: 'vault-idcard',
        },
        {
          id: `c-item-4-${Date.now()}`,
          orderIndex: 4,
          type: 'writeup',
          title: 'Personal Statement',
          portalFieldLabel: 'Academic goals statement (Max 250 words)',
          status: 'ready',
          writeupWordLimit: 250,
          writeupContent:
            'Maintaining a 4.21/5.00 CGPA in Electrical Engineering at the University of Nigeria, Nsukka after scoring 308 in the JAMB UTME reflects my commitment to power-systems engineering. This scholarship will directly support my 200-level laboratory coursework and embedded grid-protection research.',
        },
      ],
      chatTurns: [
        {
          id: `turn-stu-${Date.now()}`,
          sender: 'student',
          text: input,
          timestamp: 'Just now',
        },
        {
          id: `turn-c-${Date.now() + 1}`,
          sender: 'artrat',
          collapsibleTitle: `Prepared 4 of 4 required items in order for ${cleanTitle}`,
          collapsibleBullets: [
            '1. Passport Photograph (from Vault)',
            '2. 100L Statement of Result — 4.21 CGPA (from Vault)',
            '3. University Student ID Card (from Vault)',
            '4. Personal Statement (editable in Canvas)',
          ],
          text: `I checked "${input}" against your Vault. You meet every requirement, so I prepared all 4 required items in order for you.`,
          timestamp: 'Just now',
        },
      ],
    };

    setApplications((prev) => [newApp, ...prev]);
    return newApp;
  };

  const activeEligibleApps = applications.filter(
    (a) => a.status !== 'not_eligible'
  );
  const belowStandardApps = applications.filter(
    (a) => a.status === 'not_eligible'
  );

  const pendingTaskCount = applications.filter(
    (a) =>
      a.status === 'waiting_on_document' || a.status === 'ready_to_submit'
  ).length;

  const isInsideChatOrModalScreen =
    !!selectedApplication ||
    newChatOpen ||
    profileSettingsOpen ||
    onboardingPreviewOpen;

  return (
    <View style={[styles.outerStage, isDesktop && styles.outerStageDesktop]}>
      <StatusBar style="dark" />

      {/* DESKTOP LEFT SIDEBAR NAVIGATION (Only on Desktop >= 840px) */}
      {isDesktop ? (
        <View style={styles.desktopSidebar}>
          <View style={styles.sidebarBrandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>A</Text>
            </View>
            <Text style={styles.brandName}>Artrat</Text>
          </View>

          <View style={styles.sidebarNavList}>
            <Pressable
              style={[
                styles.sidebarNavItem,
                !isInsideChatOrModalScreen &&
                  activeTab === 'home' &&
                  styles.sidebarNavItemActive,
              ]}
              onPress={() => {
                setSelectedAppId(null);
                setNewChatOpen(false);
                setProfileSettingsOpen(false);
                setOnboardingPreviewOpen(false);
                setActiveTab('home');
              }}
            >
              <Home
                size={18}
                color={
                  !isInsideChatOrModalScreen && activeTab === 'home'
                    ? '#5B21B6'
                    : '#4E4466'
                }
              />
              <Text
                style={[
                  styles.sidebarNavLabel,
                  !isInsideChatOrModalScreen &&
                    activeTab === 'home' &&
                    styles.sidebarNavLabelActive,
                ]}
              >
                Home
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.sidebarNavItem,
                (!!selectedApplication ||
                  newChatOpen ||
                  (!isInsideChatOrModalScreen &&
                    activeTab === 'applications')) &&
                  styles.sidebarNavItemActive,
              ]}
              onPress={() => {
                setSelectedAppId(null);
                setNewChatOpen(false);
                setProfileSettingsOpen(false);
                setOnboardingPreviewOpen(false);
                setActiveTab('applications');
              }}
            >
              <Layers
                size={18}
                color={
                  !!selectedApplication ||
                  newChatOpen ||
                  (!isInsideChatOrModalScreen && activeTab === 'applications')
                    ? '#5B21B6'
                    : '#4E4466'
                }
              />
              <Text
                style={[
                  styles.sidebarNavLabel,
                  (!!selectedApplication ||
                    newChatOpen ||
                    (!isInsideChatOrModalScreen &&
                      activeTab === 'applications')) &&
                    styles.sidebarNavLabelActive,
                ]}
              >
                Applications
              </Text>
              <View style={styles.sidebarCountPill}>
                <Text style={styles.sidebarCountText}>
                  {activeEligibleApps.length}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.sidebarNavItem,
                !isInsideChatOrModalScreen &&
                  activeTab === 'tasks' &&
                  styles.sidebarNavItemActive,
              ]}
              onPress={() => {
                setSelectedAppId(null);
                setNewChatOpen(false);
                setProfileSettingsOpen(false);
                setOnboardingPreviewOpen(false);
                setActiveTab('tasks');
              }}
            >
              <CheckSquare
                size={18}
                color={
                  !isInsideChatOrModalScreen && activeTab === 'tasks'
                    ? '#5B21B6'
                    : '#4E4466'
                }
              />
              <Text
                style={[
                  styles.sidebarNavLabel,
                  !isInsideChatOrModalScreen &&
                    activeTab === 'tasks' &&
                    styles.sidebarNavLabelActive,
                ]}
              >
                Tasks
              </Text>
              {pendingTaskCount > 0 ? (
                <View style={styles.sidebarTaskCountPill}>
                  <Text style={styles.sidebarTaskCountText}>
                    {pendingTaskCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              style={[
                styles.sidebarNavItem,
                !isInsideChatOrModalScreen &&
                  activeTab === 'vault' &&
                  styles.sidebarNavItemActive,
              ]}
              onPress={() => {
                setSelectedAppId(null);
                setNewChatOpen(false);
                setProfileSettingsOpen(false);
                setOnboardingPreviewOpen(false);
                setActiveTab('vault');
              }}
            >
              <FolderClosed
                size={18}
                color={
                  !isInsideChatOrModalScreen && activeTab === 'vault'
                    ? '#5B21B6'
                    : '#4E4466'
                }
              />
              <Text
                style={[
                  styles.sidebarNavLabel,
                  !isInsideChatOrModalScreen &&
                    activeTab === 'vault' &&
                    styles.sidebarNavLabelActive,
                ]}
              >
                Vault
              </Text>
            </Pressable>

            <View style={styles.sidebarDivider} />

            <Pressable
              style={styles.sidebarNavItem}
              onPress={() => setNotificationsOpen(true)}
            >
              <Bell size={18} color="#4E4466" />
              <Text style={styles.sidebarNavLabel}>Notifications</Text>
              {unreadNotificationsCount > 0 ? (
                <View style={styles.sidebarCountPill}>
                  <Text style={styles.sidebarCountText}>
                    {unreadNotificationsCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              style={[
                styles.sidebarNavItem,
                profileSettingsOpen &&
                  profileInitialSubTab === 'connectors' &&
                  styles.sidebarNavItemActive,
              ]}
              onPress={() => {
                setSelectedAppId(null);
                setNewChatOpen(false);
                setOnboardingPreviewOpen(false);
                setProfileInitialSubTab('connectors');
                setProfileSettingsOpen(true);
              }}
            >
              <CalendarClock
                size={18}
                color={
                  profileSettingsOpen && profileInitialSubTab === 'connectors'
                    ? '#5B21B6'
                    : '#4E4466'
                }
              />
              <Text
                style={[
                  styles.sidebarNavLabel,
                  profileSettingsOpen &&
                    profileInitialSubTab === 'connectors' &&
                    styles.sidebarNavLabelActive,
                ]}
              >
                Connected Apps
              </Text>
              <View style={styles.sidebarCountPill}>
                <Text style={styles.sidebarCountText}>4</Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.sidebarNavItem,
                profileSettingsOpen &&
                  profileInitialSubTab === 'receipts' &&
                  styles.sidebarNavItemActive,
              ]}
              onPress={() => {
                setSelectedAppId(null);
                setNewChatOpen(false);
                setOnboardingPreviewOpen(false);
                setProfileInitialSubTab('receipts');
                setProfileSettingsOpen(true);
              }}
            >
              <FileCheck2
                size={18}
                color={
                  profileSettingsOpen && profileInitialSubTab === 'receipts'
                    ? '#5B21B6'
                    : '#4E4466'
                }
              />
              <Text
                style={[
                  styles.sidebarNavLabel,
                  profileSettingsOpen &&
                    profileInitialSubTab === 'receipts' &&
                    styles.sidebarNavLabelActive,
                ]}
              >
                Receipts & Execution
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.sidebarNavItem,
                profileSettingsOpen &&
                  profileInitialSubTab === 'settings' &&
                  styles.sidebarNavItemActive,
              ]}
              onPress={() => {
                setSelectedAppId(null);
                setNewChatOpen(false);
                setOnboardingPreviewOpen(false);
                setProfileInitialSubTab('settings');
                setProfileSettingsOpen(true);
              }}
            >
              <Settings
                size={18}
                color={
                  profileSettingsOpen && profileInitialSubTab === 'settings'
                    ? '#5B21B6'
                    : '#4E4466'
                }
              />
              <Text
                style={[
                  styles.sidebarNavLabel,
                  profileSettingsOpen &&
                    profileInitialSubTab === 'settings' &&
                    styles.sidebarNavLabelActive,
                ]}
              >
                Settings & Privacy
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.sidebarNavItem,
                profileSettingsOpen &&
                  profileInitialSubTab === 'help' &&
                  styles.sidebarNavItemActive,
              ]}
              onPress={() => {
                setSelectedAppId(null);
                setNewChatOpen(false);
                setOnboardingPreviewOpen(false);
                setProfileInitialSubTab('help');
                setProfileSettingsOpen(true);
              }}
            >
              <HelpCircle
                size={18}
                color={
                  profileSettingsOpen && profileInitialSubTab === 'help'
                    ? '#5B21B6'
                    : '#4E4466'
                }
              />
              <Text
                style={[
                  styles.sidebarNavLabel,
                  profileSettingsOpen &&
                    profileInitialSubTab === 'help' &&
                    styles.sidebarNavLabelActive,
                ]}
              >
                Help & FAQ
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.sidebarFooterCard,
              profileSettingsOpen &&
                (profileInitialSubTab === 'hub' ||
                  profileInitialSubTab === 'profile') &&
                styles.sidebarFooterCardActive,
            ]}
            onPress={() => {
              setSelectedAppId(null);
              setNewChatOpen(false);
              setOnboardingPreviewOpen(false);
              setProfileInitialSubTab('hub');
              setProfileSettingsOpen(true);
            }}
          >
            <View style={styles.studentAvatarCircle}>
              <Text style={styles.studentAvatarText}>CO</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sidebarStudentName} numberOfLines={1}>
                Chisom Okafor
              </Text>
              <Text style={styles.sidebarStudentSub} numberOfLines={1}>
                All Account Pages · 4.21
              </Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {/* MAIN CONTENT SHELL */}
      <View style={styles.mainFrame}>
        {/* Mobile Top Bar (Only on Mobile < 840px, and History button ONLY appears in Applications!) */}
        {!isDesktop && !isInsideChatOrModalScreen ? (
          <View style={styles.topBar}>
            <View style={styles.brandGroup}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>A</Text>
              </View>
              <Text style={styles.brandName}>Artrat</Text>
            </View>

            <View style={styles.topBarActionsRow}>
              {activeTab === 'applications' ? (
                <Pressable
                  style={styles.historyPillBtn}
                  onPress={() => setHistoryDrawerOpen(true)}
                  accessibilityRole="button"
                >
                  <History size={14} color="#4C1D95" />
                  <Text style={styles.historyPillText}>History</Text>
                </Pressable>
              ) : null}

              <Pressable
                style={styles.topIconCircleBtn}
                onPress={() => setNotificationsOpen(true)}
                accessibilityLabel="Notifications"
                accessibilityRole="button"
              >
                <Bell size={16} color="#4C1D95" />
                {unreadNotificationsCount > 0 ? (
                  <View style={styles.topBellDot} />
                ) : null}
              </Pressable>

              <Pressable
                style={styles.topAvatarBtn}
                onPress={() => {
                  setProfileInitialSubTab('hub');
                  setProfileSettingsOpen(true);
                }}
                accessibilityLabel="Profile and Settings"
                accessibilityRole="button"
              >
                <Text style={styles.topAvatarBtnText}>CO</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {globalNotice ? (
          <View style={styles.noticeToast}>
            <Text style={styles.noticeToastText}>{globalNotice}</Text>
          </View>
        ) : null}

        {/* Active Screen Content */}
        <View style={styles.screenArea}>
          {selectedApplication ? (
            <ApplicationChatScreen
              application={selectedApplication}
              vaultDocs={vaultDocs}
              studentWritingAddress={studentWritingAddress}
              hodRecipientAddress={hodRecipientAddress}
              onUpdateAddresses={handleUpdateAddresses}
              onBack={() => setSelectedAppId(null)}
              onReplaceDocumentInChat={handleReplaceDocumentInChat}
              onUpdateWriteupInCanvas={handleUpdateWriteupInCanvas}
              onUploadMissingRequirement={handleUploadMissingRequirement}
              onDeclareAndSubmit={handleDeclareAndSubmit}
              onSendMessageInAppChat={handleSendMessageInAppChat}
              onArchiveIneligibleNow={handleArchiveIneligibleNow}
            />
          ) : newChatOpen ? (
            <NewChatScreen
              studentId={backendStudentId}
              profileFacts={profileFacts}
              vaultDocs={vaultDocs}
              onBack={() => setNewChatOpen(false)}
              onProcessLinkOrMessage={handleProcessLinkOrMessageInNewChat}
              onOpenCreatedApplication={(appId) => {
                setNewChatOpen(false);
                setSelectedAppId(appId);
              }}
              onOpenTasksTab={() => {
                setNewChatOpen(false);
                setActiveTab('tasks');
              }}
              onTriggerGlobalNotice={showNotice}
            />
          ) : onboardingPreviewOpen ? (
            <OnboardingScreen
              studentWritingAddress={studentWritingAddress}
              hodRecipientAddress={hodRecipientAddress}
              onUpdateAddresses={handleUpdateAddresses}
              onCompleteWithMatchedScholarship={handleCompleteOnboardingMatch}
              onSyncOnboardingArtifact={(newDocs, updatedFacts) => {
                if (newDocs.length > 0) {
                  setVaultDocs((prev) => [...newDocs, ...prev]);
                }
                if (updatedFacts.length > 0) {
                  setProfileFacts((prev) => [
                    ...updatedFacts.map((f, idx) => ({
                      id: `fact-interview-${Date.now()}-${idx}`,
                      label: f.label,
                      value: f.value,
                      category: f.category,
                      verifiedSource: f.verifiedSource,
                    })),
                    ...prev,
                  ]);
                }
              }}
              onFinishOnboarding={() => {
                setOnboardingPreviewOpen(false);
                setProfileSettingsOpen(false);
                setActiveTab('applications');
              }}
            />
          ) : profileSettingsOpen ? (
            <ProfileSettingsScreen
              key={profileInitialSubTab}
              initialSubTab={profileInitialSubTab}
              profileFacts={profileFacts}
              applications={applications}
              studentWritingAddress={studentWritingAddress}
              hodRecipientAddress={hodRecipientAddress}
              onUpdateAddresses={handleUpdateAddresses}
              onUpdateProfileFact={handleUpdateProfileFact}
              onBack={() => setProfileSettingsOpen(false)}
              onOpenOnboardingPreview={() => {
                setProfileSettingsOpen(false);
                setOnboardingPreviewOpen(true);
              }}
              onOpenNotifications={() => setNotificationsOpen(true)}
            />
          ) : activeTab === 'home' ? (
            <HomeScreen
              applications={applications}
              vaultDocs={vaultDocs}
              profileFacts={profileFacts}
              onOpenApplication={(id) => setSelectedAppId(id)}
              onNavigateTab={(t) => setActiveTab(t)}
              onUploadMissingDocFromHome={handleUploadMissingRequirement}
            />
          ) : activeTab === 'applications' ? (
            <View style={styles.applicationsView}>
              <ScrollView
                style={styles.appsScroll}
                contentContainerStyle={[
                  styles.appsContent,
                  !isDesktop && styles.appsContentMobileBottomPad,
                  isDesktop && styles.appsContentWide,
                ]}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(e) => {
                  if (isDesktop) return;
                  const y = e.nativeEvent.contentOffset.y;
                  const dy = y - lastAppsScrollY.current;
                  lastAppsScrollY.current = y;
                  if (dy > 3) {
                    setAppsMobileNavVisible(true);
                  } else if (dy < -3 || y <= 4) {
                    setAppsMobileNavVisible(false);
                  }
                }}
              >
                {/* Applications Header (Includes History Button on Desktop, and exclusively inside Applications!) */}
                <View style={styles.appsHeaderRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text accessibilityRole="header" style={styles.appsTitle}>
                      Applications
                    </Text>
                    <Text style={styles.appsSubtitle}>
                      Tap any scholarship to open its chat and view your prepared documents and writeups in order.
                    </Text>
                  </View>

                  {isDesktop ? (
                    <Pressable
                      style={styles.historyPillBtn}
                      onPress={() => setHistoryDrawerOpen(true)}
                      accessibilityRole="button"
                    >
                      <History size={15} color="#4C1D95" />
                      <Text style={styles.historyPillText}>History</Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* SECTION 1: Active & Eligible Applications */}
                <View style={styles.appsStack}>
                  {activeEligibleApps.map((app) => {
                    const isWaiting = app.status === 'waiting_on_document';
                    return (
                      <Pressable
                        key={app.id}
                        style={styles.appCard}
                        onPress={() => setSelectedAppId(app.id)}
                      >
                        {/* Refined Warm Terracotta-Orange Strip ONLY when waiting on signature */}
                        {isWaiting ? (
                          <View style={styles.appCardOrangeStrip}>
                            <View style={styles.orangeDot} />
                            <Clock size={13} color="#C2410C" />
                            <Text
                              style={styles.appCardOrangeStripText}
                              numberOfLines={1}
                            >
                              HOD Letter Drafted · Needs Signature
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.appCardInner}>
                          <View style={styles.appCardTop}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.appSponsor}>
                                {app.sponsor}
                              </Text>
                              <Text style={styles.appTitle}>{app.title}</Text>
                            </View>

                            <View style={styles.awardBadge}>
                              <Text style={styles.awardBadgeText}>
                                {app.awardValue}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.appCardFooter}>
                            <View style={styles.statusRow}>
                              {isWaiting ? (
                                <Clock size={15} color="#C2410C" />
                              ) : (
                                <CheckCircle2 size={15} color="#047857" />
                              )}
                              <Text
                                style={[
                                  styles.statusLabel,
                                  isWaiting && styles.statusLabelCoral,
                                ]}
                                numberOfLines={1}
                              >
                                {app.statusSummary} · Due {app.deadline}
                              </Text>
                            </View>

                            <View style={styles.openCircle}>
                              <ArrowRight size={15} color="#5B21B6" />
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* SECTION 2 (BELOW): Didn't Meet Standards · Wipes to History after 7 Days */}
                {belowStandardApps.length > 0 ? (
                  <View style={styles.belowSectionBlock}>
                    <View style={styles.belowSectionHeader}>
                      <Text style={styles.belowSectionTitle}>
                        Didn’t Meet Standards
                      </Text>
                      <Text style={styles.belowSectionMeta}>
                        Wipes to History in 7d
                      </Text>
                    </View>

                    <View style={styles.appsStack}>
                      {belowStandardApps.map((app) => (
                        <Pressable
                          key={app.id}
                          style={styles.ineligibleAppCard}
                          onPress={() => setSelectedAppId(app.id)}
                        >
                          <View style={styles.ineligibleStrip}>
                            <AlertCircle size={13} color="#BE123C" />
                            <Text
                              style={styles.ineligibleStripText}
                              numberOfLines={1}
                            >
                              {app.statusSummary} · Wipes in{' '}
                              {app.daysUntilHistoryWipe ?? 7}d
                            </Text>
                          </View>

                          <View style={styles.appCardInner}>
                            <View style={styles.appCardTop}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.appSponsor}>
                                  {app.sponsor}
                                </Text>
                                <Text style={styles.appTitle}>{app.title}</Text>
                              </View>
                              <View style={styles.openChatTag}>
                                <Text style={styles.openChatTagText}>
                                  Open Chat
                                </Text>
                                <ArrowRight size={13} color="#4C1D95" />
                              </View>
                            </View>

                            <Text style={styles.ineligibleCardReason}>
                              {app.disqualificationReason}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </ScrollView>

              {/* Tapping the Chatbox in Applications IMMEDIATELY opens the New Application Chat screen! On mobile, floats at the bottom and hides when scrolling down so the Bottom Nav appears in its place without layout jump. */}
              {isDesktop || !appsMobileNavVisible ? (
                <View
                  style={[
                    styles.appsChatBar,
                    !isDesktop && styles.appsChatBarMobileFloating,
                  ]}
                >
                  <Pressable
                    style={styles.chatTriggerPill}
                    onPress={() => setNewChatOpen(true)}
                    accessibilityRole="button"
                  >
                    <View style={styles.chatTriggerIconWrap}>
                      <MessageSquare size={15} color="#5B21B6" />
                    </View>
                    <Text
                      style={styles.chatTriggerPlaceholder}
                      numberOfLines={1}
                    >
                      Drop a scholarship link or start a new chat...
                    </Text>
                    <View style={styles.sendRoundBtn}>
                      <Send size={14} color="#FFFFFF" />
                    </View>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : activeTab === 'tasks' ? (
            <TasksScreen
              applications={applications}
              studentWritingAddress={studentWritingAddress}
              hodRecipientAddress={hodRecipientAddress}
              onUpdateAddresses={handleUpdateAddresses}
              onUpdateWriteupInCanvas={handleUpdateWriteupInCanvas}
              onUploadMissingDoc={handleUploadMissingRequirement}
              onSubmitApplication={handleDeclareAndSubmit}
              onOpenApplicationChat={(appId) => setSelectedAppId(appId)}
            />
          ) : (
            <VaultScreen
              vaultDocs={vaultDocs}
              profileFacts={profileFacts}
              onReplaceVaultDoc={handleReplaceVaultDocManual}
              onRemoveVaultDoc={handleRemoveVaultDocManual}
              onUpdateProfileFact={handleUpdateProfileFact}
              onAddVaultDoc={handleAddVaultDoc}
              onAddProfileFact={handleAddProfileFact}
            />
          )}
        </View>

        {/* PREMIUM FLOATING GLASS PILL-DOCK MOBILE BOTTOM NAV (Only on Mobile < 840px; on Applications tab, only appears when scrolling down!) */}
        {!isDesktop &&
        !isInsideChatOrModalScreen &&
        (activeTab !== 'applications' || appsMobileNavVisible) ? (
          <View
            style={[
              styles.bottomDockOuter,
              activeTab === 'applications' && styles.bottomDockOuterFloating,
            ]}
          >
            <View
              style={styles.bottomDockInner}
              // @ts-ignore web className for frosted glass + ambient violet shadow
              className="artrat-glass-dock"
            >
              <Pressable
                style={styles.dockTabItem}
                onPress={() => setActiveTab('home')}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.dockIconCapsule,
                    activeTab === 'home' && styles.dockIconCapsuleActive,
                  ]}
                >
                  <Home
                    size={17}
                    color={activeTab === 'home' ? '#FFFFFF' : '#5E547A'}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.dockTabLabel,
                    activeTab === 'home' && styles.dockTabLabelActive,
                  ]}
                >
                  Home
                </Text>
              </Pressable>

              <Pressable
                style={styles.dockTabItem}
                onPress={() => setActiveTab('applications')}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.dockIconCapsule,
                    activeTab === 'applications' &&
                      styles.dockIconCapsuleActive,
                  ]}
                >
                  <Layers
                    size={17}
                    color={
                      activeTab === 'applications' ? '#FFFFFF' : '#5E547A'
                    }
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.dockTabLabel,
                    activeTab === 'applications' && styles.dockTabLabelActive,
                  ]}
                >
                  Applications
                </Text>
              </Pressable>

              <Pressable
                style={styles.dockTabItem}
                onPress={() => setActiveTab('tasks')}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.dockIconCapsule,
                    activeTab === 'tasks' && styles.dockIconCapsuleActive,
                  ]}
                >
                  <CheckSquare
                    size={17}
                    color={activeTab === 'tasks' ? '#FFFFFF' : '#5E547A'}
                  />
                  {pendingTaskCount > 0 ? (
                    <View style={styles.navCountBadge}>
                      <Text style={styles.navCountBadgeText}>
                        {pendingTaskCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.dockTabLabel,
                    activeTab === 'tasks' && styles.dockTabLabelActive,
                  ]}
                >
                  Tasks
                </Text>
              </Pressable>

              <Pressable
                style={styles.dockTabItem}
                onPress={() => setActiveTab('vault')}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.dockIconCapsule,
                    activeTab === 'vault' && styles.dockIconCapsuleActive,
                  ]}
                >
                  <FolderClosed
                    size={17}
                    color={activeTab === 'vault' ? '#FFFFFF' : '#5E547A'}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.dockTabLabel,
                    activeTab === 'vault' && styles.dockTabLabelActive,
                  ]}
                >
                  Vault
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {/* Unified Chat History Sheet (Accessible strictly from Applications) */}
      <ChatHistoryDrawer
        visible={historyDrawerOpen}
        applications={applications}
        generalThreads={historyThreads}
        onClose={() => setHistoryDrawerOpen(false)}
        onSelectApplicationChat={(appId) => setSelectedAppId(appId)}
      />

      {/* Notifications Sheet */}
      <NotificationsModal
        visible={notificationsOpen}
        applications={applications}
        unreadCount={unreadNotificationsCount}
        onMarkAllRead={() => setUnreadNotificationsCount(0)}
        onClose={() => setNotificationsOpen(false)}
        onSelectApplication={(appId) => {
          setProfileSettingsOpen(false);
          setOnboardingPreviewOpen(false);
          setNewChatOpen(false);
          setSelectedAppId(appId);
        }}
        onSelectTab={(tab) => {
          setProfileSettingsOpen(false);
          setOnboardingPreviewOpen(false);
          setNewChatOpen(false);
          setSelectedAppId(null);
          setActiveTab(tab);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerStage: {
    flex: 1,
    backgroundColor: '#F7F5FC',
  },
  outerStageDesktop: {
    flexDirection: 'row',
  },
  desktopSidebar: {
    width: 236,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5DDF5',
    paddingVertical: 20,
    paddingHorizontal: 14,
    gap: 16,
  },
  sidebarBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  sidebarNavList: {
    gap: 6,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
  },
  sidebarNavItemActive: {
    backgroundColor: '#F3EEFF',
  },
  sidebarNavLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4E4466',
    flex: 1,
  },
  sidebarNavLabelActive: {
    color: '#4C1D95',
    fontWeight: '700',
  },
  sidebarCountPill: {
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sidebarCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C1D95',
  },
  sidebarTaskCountPill: {
    backgroundColor: '#FFF4ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sidebarTaskCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#EAE4F8',
    marginVertical: 4,
  },
  sidebarFooterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF8FF',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  sidebarFooterCardActive: {
    backgroundColor: '#F3EEFF',
    borderColor: '#6D28D9',
  },
  topBarActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topIconCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDE5FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBellDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EA580C',
    borderWidth: 1.5,
    borderColor: '#EDE5FF',
  },
  topAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAvatarBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  studentAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDE5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C1D95',
  },
  sidebarStudentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161126',
  },
  sidebarStudentSub: {
    fontSize: 11,
    color: '#4E4466',
  },
  mainFrame: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    backgroundColor: '#F7F5FC',
    overflow: 'hidden',
  },
  topBar: {
    height: 54,
    backgroundColor: '#F7F5FC',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDF5',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161126',
    letterSpacing: -0.3,
  },
  historyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
  },
  historyPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C1D95',
  },
  noticeToast: {
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD0F8',
  },
  noticeToastText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C1D95',
  },
  screenArea: {
    flex: 1,
    minHeight: 0,
  },
  applicationsView: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    backgroundColor: '#F7F5FC',
  },
  appsScroll: {
    flex: 1,
    minHeight: 0,
  },
  appsContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 16,
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
  },
  appsContentMobileBottomPad: {
    paddingBottom: 120,
  },
  appsContentWide: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  appsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  appsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#161126',
    letterSpacing: -0.4,
  },
  appsSubtitle: {
    fontSize: 14,
    color: '#4E4466',
    lineHeight: 20,
    maxWidth: 640,
  },
  appsStack: {
    gap: 12,
  },
  appCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    overflow: 'hidden',
  },
  appCardOrangeStrip: {
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
  appCardOrangeStripText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
    flex: 1,
  },
  appCardInner: {
    padding: 16,
    gap: 12,
  },
  appCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  appSponsor: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4E4466',
    marginBottom: 2,
  },
  appTitle: {
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
  appCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2EEFC',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
    flex: 1,
  },
  statusLabelCoral: {
    color: '#C2410C',
  },
  openCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  belowSectionBlock: {
    gap: 10,
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5DDF5',
  },
  belowSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  belowSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4E4466',
  },
  belowSectionMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#756A92',
  },
  ineligibleAppCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECDD3',
    overflow: 'hidden',
  },
  ineligibleStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FECDD3',
  },
  ineligibleStripText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BE123C',
    flex: 1,
  },
  openChatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  openChatTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  ineligibleCardReason: {
    fontSize: 13,
    color: '#4E4466',
    lineHeight: 19,
  },
  appsChatBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F7F5FC',
  },
  appsChatBarMobileFloating: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    backgroundColor: 'rgba(247, 245, 252, 0.94)',
    paddingBottom: 14,
  },
  chatTriggerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4C6F0',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 10,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  chatTriggerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTriggerPlaceholder: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#6E6488',
  },
  sendRoundBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDockOuter: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#F7F5FC',
  },
  bottomDockOuterFloating: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    backgroundColor: 'rgba(247, 245, 252, 0.94)',
  },
  bottomDockInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#DDD0F8',
  },
  dockTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dockIconCapsule: {
    width: 46,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dockIconCapsuleActive: {
    backgroundColor: '#6D28D9',
  },
  navCountBadge: {
    position: 'absolute',
    top: -4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EA580C',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  navCountBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 11,
  },
  dockTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5E547A',
    letterSpacing: -0.1,
  },
  dockTabLabelActive: {
    color: '#4C1D95',
    fontWeight: '700',
  },
});
