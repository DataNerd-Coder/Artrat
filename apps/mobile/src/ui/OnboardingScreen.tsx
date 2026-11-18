import React, { useRef, useState } from 'react';
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
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Clock,
  Cloud,
  FileCheck2,
  FileText,
  Info,
  Lock,
  Mail,
  MessageSquare,
  Shield,
  Smartphone,
  Upload,
  User,
  X,
} from './icons';
import { ArtratBot3D } from './ArtratBot3D';
import { ProfileFact, VaultDocument } from '../domain/types';
import {
  ACADEMIC_LEVEL_OPTIONS,
  getLgasByState,
  INITIAL_UNIVERSITY_SEMESTER_CACHE,
  NIGERIA_STATES,
  NIGERIAN_UNIVERSITIES,
  UniversitySemesterRecord,
} from '../domain/nigeriaStatesLgas';

interface OnboardingScreenProps {
  studentWritingAddress: string;
  hodRecipientAddress: string;
  onUpdateAddresses: (newWritingAddr: string, newHodAddr: string) => void;
  onCompleteWithMatchedScholarship: () => void;
  onSyncOnboardingArtifact: (
    newDocs: VaultDocument[],
    updatedFacts: Omit<ProfileFact, 'id'>[]
  ) => void;
  onFinishOnboarding: () => void;
}

type OnboardingStage = 'auth' | 'profile_form' | 'connectors' | 'ai_interview';

interface OnboardingConnectorItem {
  id: string;
  name: string;
  category: 'google' | 'academic' | 'messaging';
  providerDomain: string;
  accountLabel: string;
  status: 'connected' | 'available' | 'coming_soon';
  infoTitle: string;
  infoSummary: string;
  infoPermissions: string[];
}

const INITIAL_ONBOARDING_CONNECTORS: OnboardingConnectorItem[] = [
  {
    id: 'google-tasks',
    name: 'Google Tasks',
    category: 'google',
    providerDomain: 'tasks.google.com',
    accountLabel: 'chisom.okafor.248912@unn.edu.ng',
    status: 'connected',
    infoTitle: 'How Artrat uses Google Tasks',
    infoSummary:
      'Creates daily follow-up reminders at 9:30 AM and 2:00 PM whenever an application needs a signed letter or document upload.',
    infoPermissions: [
      'Create & update pending scholarship tasks',
      'Verify document upload in Vault before closing tasks',
    ],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'google',
    providerDomain: 'calendar.google.com',
    accountLabel: 'chisom.okafor.248912@unn.edu.ng',
    status: 'connected',
    infoTitle: 'How Artrat uses Google Calendar',
    infoSummary:
      'Adds scholarship closing dates and online test schedules to your calendar with 48-hour advance alerts.',
    infoPermissions: [
      'Add scholarship deadline & test window events',
      'Set 48-hour closing reminders',
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'google',
    providerDomain: 'mail.google.com',
    accountLabel: 'chisom.okafor.248912@unn.edu.ng',
    status: 'connected',
    infoTitle: 'How Artrat uses Gmail',
    infoSummary:
      'Automatically reads portal verification codes (OTPs) so Artrat can register and submit your applications without interrupting you, and saves your confirmation receipts.',
    infoPermissions: [
      'Pick up portal verification codes during submission',
      'Save official confirmation receipts to your Vault',
    ],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'google',
    providerDomain: 'drive.google.com',
    accountLabel: 'chisom.okafor.248912@unn.edu.ng',
    status: 'connected',
    infoTitle: 'How Artrat uses Google Drive',
    infoSummary:
      'Imports your academic PDFs and backs up your prepared submission kits and receipts.',
    infoPermissions: [
      'Import student PDF/JPG documents into Vault',
      'Back up verified submission receipts & kits',
    ],
  },
  {
    id: 'bank-statement-open-banking',
    name: 'Bank Statement',
    category: 'google',
    providerDomain: 'Open Banking',
    accountLabel: 'Link your bank for on-request statements',
    status: 'available',
    infoTitle: 'How Artrat uses Bank Statement',
    infoSummary:
      'Bank statements are not needed upfront. Connecting this lets Artrat fetch a stamped statement only when a scholarship specifically asks for financial proof.',
    infoPermissions: [
      'Fetch stamped PDF bank statement when requested by a scholarship',
      'Confirm account name matches your student profile',
    ],
  },
  {
    id: 'microsoft-todo',
    name: 'Microsoft To Do',
    category: 'academic',
    providerDomain: 'to-do.office.com',
    accountLabel: 'chisom.okafor@student.edu.ng',
    status: 'available',
    infoTitle: 'How Artrat uses Microsoft To Do',
    infoSummary:
      'Syncs pending scholarship tasks with your university Microsoft 365 account.',
    infoPermissions: [
      'Create & update scholarship tasks in Microsoft To Do',
      'Sync completion status with Artrat Tasks',
    ],
  },
  {
    id: 'outlook-calendar',
    name: 'Outlook Calendar',
    category: 'academic',
    providerDomain: 'outlook.office.com',
    accountLabel: 'chisom.okafor@student.edu.ng',
    status: 'available',
    infoTitle: 'How Artrat uses Outlook Calendar',
    infoSummary:
      'Syncs scholarship closing dates and test windows to your university Outlook calendar.',
    infoPermissions: [
      'Add scholarship deadline events to Outlook Calendar',
      'Configure 24-hour reminder notifications',
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'messaging',
    providerDomain: 'whatsapp.com',
    accountLabel: '+234 814 392 7190',
    status: 'coming_soon',
    infoTitle: 'How Artrat will use WhatsApp',
    infoSummary:
      'Receive deadline alerts on WhatsApp and send a photo of any requested document directly into your Vault.',
    infoPermissions: [
      'Send deadline & task reminders on WhatsApp',
      'Accept document uploads directly from WhatsApp chat',
    ],
  },
];

interface InterviewStepConfig {
  id: string;
  title: string;
  kind: 'document' | 'conversation';
  acceptsDocument?: boolean;
  defaultFileName?: string;
  extractedDetail?: string;
  quickSuggestions: string[];
}

const INTERVIEW_STEPS: InterviewStepConfig[] = [
  {
    id: 'waec',
    title: 'O-Level Result (WAEC / NECO)',
    kind: 'document',
    acceptsDocument: true,
    defaultFileName: 'WAEC_O_Level_Statement_Chisom_Okafor.pdf',
    extractedDetail:
      '5 A1s (Further Maths, Maths, Physics, Chemistry, Civic) & 3 B2s (English Language, Biology, Computer Studies) · 1 Sitting',
    quickSuggestions: [
      'Upload WAEC Result PDF',
      'Can I combine two sittings (WAEC + NECO)?',
    ],
  },
  {
    id: 'jamb_result',
    title: 'JAMB UTME Original Result Slip',
    kind: 'document',
    acceptsDocument: true,
    defaultFileName: 'JAMB_Original_Result_Slip_308_Chisom_Okafor.pdf',
    extractedDetail:
      'Aggregate Score: 308 / 400 (Mathematics 86, Physics 81, Chemistry 76, Use of English 65)',
    quickSuggestions: [
      'Upload JAMB Result Slip',
      'Why do scholarships ask for JAMB score?',
    ],
  },
  {
    id: 'uni_admission',
    title: 'University Admission Letter',
    kind: 'document',
    acceptsDocument: true,
    defaultFileName: 'UNN_Provisional_Admission_Letter_Chisom_Okafor.pdf',
    extractedDetail:
      'University of Nigeria, Nsukka (UNN) · B.Eng Electrical Engineering · 2024/2025 Entry',
    quickSuggestions: [
      'Upload University Admission Letter',
      'Is this different from the JAMB Admission Letter?',
    ],
  },
  {
    id: 'jamb_admission',
    title: 'JAMB CAPS Admission Letter',
    kind: 'document',
    acceptsDocument: true,
    defaultFileName: 'JAMB_CAPS_Official_Admission_Letter_Chisom_Okafor.pdf',
    extractedDetail:
      'JAMB CAPS Institution & Course Match Confirmed · B.Eng Electrical Engineering (UNN)',
    quickSuggestions: [
      'Upload JAMB Admission Letter',
      'Where do I download my JAMB CAPS letter?',
    ],
  },
  {
    id: 'school_id',
    title: 'School, Departmental, or Library ID Card',
    kind: 'document',
    acceptsDocument: true,
    defaultFileName: 'UNN_Engineering_Faculty_ID_2024_248912.jpg',
    extractedDetail:
      'Matric No: 2024/248912 · Faculty of Engineering ID · Active 200L Student',
    quickSuggestions: [
      'Upload Faculty / School ID',
      'Upload Library Card instead',
      'Our university has not issued plastic IDs yet',
    ],
  },
  {
    id: 'nin_slip',
    title: 'National Identification Number (NIN) Slip',
    kind: 'document',
    acceptsDocument: true,
    defaultFileName: 'NIMC_NIN_Slip_Chisom_Okafor.pdf',
    extractedDetail:
      '11-Digit NIN Verified · Full Legal Name & Date of Birth Match Confirmed',
    quickSuggestions: [
      'Upload NIN Slip',
      'Is the NIMC Digital NIN Slip accepted?',
    ],
  },
  {
    id: 'passport',
    title: 'Passport Photograph',
    kind: 'document',
    acceptsDocument: true,
    defaultFileName: 'Passport_Photo_Chisom_Okafor_White_BG.jpg',
    extractedDetail:
      '450×450px Studio Portrait · Plain White Background · Portal-Ready',
    quickSuggestions: ['Upload Passport Photograph'],
  },
  {
    id: 'bank_details',
    title: 'Student Bank Account Details',
    kind: 'conversation',
    acceptsDocument: false,
    quickSuggestions: [
      'Access Bank · 0149823410 · Chisom Kamsiyochukwu Okafor',
      'Why do you need my bank account details?',
      'Do I need to upload a bank statement now?',
    ],
  },
  {
    id: 'cv_projects',
    title: 'Academic CV — Projects, Leadership & Experience',
    kind: 'conversation',
    acceptsDocument: true,
    defaultFileName: 'Existing_CV_Chisom_Okafor.pdf',
    extractedDetail:
      'Extracted baseline CV: 100L Class Rep Assistant & EEE 102 Workshop Lab Group Lead',
    quickSuggestions: [
      'Upload Existing CV to Review Together',
      'I built a low-loss single-phase transformer in EEE 102 and volunteer with IEEE UNN',
      'I am in 200L and do not have a CV yet',
    ],
  },
  {
    id: 'cv_certifications',
    title: 'Academic CV — Certifications & Technical Skills',
    kind: 'conversation',
    acceptsDocument: true,
    defaultFileName: 'MATLAB_Onramp_Certificate_Chisom_Okafor.pdf',
    extractedDetail:
      'Added Certification: MathWorks MATLAB Onramp & Python Circuit Simulation',
    quickSuggestions: [
      'I completed MATLAB Onramp, Python for Engineers, and AutoCAD Electrical',
      'Upload Certificate PDF',
      'No extra certifications yet, just my coursework skills',
    ],
  },
  {
    id: 'personal_story',
    title: 'Personal Statement & Community Roots',
    kind: 'conversation',
    acceptsDocument: false,
    quickSuggestions: [
      'I grew up in Njikoka, Anambra where transformer faults left our street in darkness for weeks, inspiring me to study Electrical Engineering',
      'How will you use this story in my applications?',
    ],
  },
  {
    id: 'family_background',
    title: 'Parents’ Status & Occupation',
    kind: 'conversation',
    acceptsDocument: false,
    quickSuggestions: [
      'My father passed away in 2021; my mother is a primary school teacher and petty trader',
      'Both parents are alive; my father is a civil servant and my mother is a trader',
      'Why do scholarships ask about parents?',
    ],
  },
  {
    id: 'sponsorship_disability',
    title: 'School Fees, Accommodation & Disability Status',
    kind: 'conversation',
    acceptsDocument: false,
    quickSuggestions: [
      'My mother pays my school fees and off-campus hostel rent; I have no disability',
      'I sponsor myself through tutoring alongside my mother; no disability',
    ],
  },
  {
    id: 'transcript',
    title: 'Academic Transcript or Signed Result Sheet',
    kind: 'document',
    acceptsDocument: true,
    defaultFileName: 'UNN_Signed_100L_Statement_of_Result_4.21_CGPA.pdf',
    extractedDetail:
      'Signed 100L Result Sheet (Exam Officer Stamp) · CGPA: 4.21 / 5.00 (Second Class Upper)',
    quickSuggestions: [
      'My results are not complete yet — what should I do?',
      'Upload Exam Officer Signed 100L Result Sheet',
      'Why didn’t you ask for my LGA Certificate?',
    ],
  },
];

interface ChatBubbleMessage {
  id: string;
  sender: 'artrat' | 'student';
  text: string;
  timestamp: string;
  attachedDoc?: {
    fileName: string;
    extractedSummary: string;
  };
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEARS = Array.from({ length: 18 }, (_, i) => String(2010 - i));
const DAYS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, '0')
);

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  studentWritingAddress,
  hodRecipientAddress,
  onUpdateAddresses,
  onCompleteWithMatchedScholarship,
  onSyncOnboardingArtifact,
  onFinishOnboarding,
}) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const scrollViewRef = useRef<any>(null);

  const [stage, setStage] = useState<OnboardingStage>('auth');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  // Step 1: Auth fields
  const [email, setEmail] = useState('chisom.okafor.248912@unn.edu.ng');
  const [password, setPassword] = useState('••••••••••••');

  // Step 2: Bio-data & School details
  const [fullName, setFullName] = useState('Chisom Kamsiyochukwu Okafor');
  const [dobDay, setDobDay] = useState('14');
  const [dobMonth, setDobMonth] = useState('May');
  const [dobYear, setDobYear] = useState('2009');
  const [dobModalOpen, setDobModalOpen] = useState(false);

  const [selectedUniName, setSelectedUniName] = useState<string>(
    'University of Nigeria, Nsukka (UNN)'
  );
  const [uniCache, setUniCache] = useState<
    Record<string, UniversitySemesterRecord>
  >(INITIAL_UNIVERSITY_SEMESTER_CACHE);
  const [uniModalOpen, setUniModalOpen] = useState(false);
  const [uniSearchQuery, setUniSearchQuery] = useState('');

  const selectedUni: UniversitySemesterRecord = uniCache[selectedUniName] || {
    universityName: selectedUniName,
    activeSession: '2025/2026',
    currentSemester: '2nd Semester',
    liveVerificationSignal: '2nd Semester · 2025/2026',
    nextPromotionWindow: 'Next session',
    cachedAt: 'Active',
  };

  const [department, setDepartment] = useState('B.Eng Electrical Engineering');
  const [level, setLevel] = useState('200 Level');
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [matricNo, setMatricNo] = useState('2024/248912');

  const [stateOfOrigin, setStateOfOrigin] = useState('Anambra');
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [lgaOfOrigin, setLgaOfOrigin] = useState('Njikoka');
  const [lgaModalOpen, setLgaModalOpen] = useState(false);

  const [studentAddress, setStudentAddress] = useState(
    studentWritingAddress ||
      'Room 214, Kwame Nkrumah Hall, University of Nigeria, Nsukka, Enugu State'
  );

  // Step 3: Connectors
  const [connectors, setConnectors] = useState<OnboardingConnectorItem[]>(
    INITIAL_ONBOARDING_CONNECTORS
  );
  const [openConnectorInfoId, setOpenConnectorInfoId] = useState<string | null>(
    null
  );
  const [oauthTarget, setOauthTarget] =
    useState<OnboardingConnectorItem | null>(null);
  const [oauthEmailInput, setOauthEmailInput] = useState(
    'chisom.okafor.248912@unn.edu.ng'
  );
  const [oauthAuthorizing, setOauthAuthorizing] = useState(false);

  // Step 4: Dynamic, Information-Gain-Driven AI Onboarding Interview
  // Adapts length dynamically: compresses when a student provides multiple facts at once,
  // and expands with targeted follow-ups when their background or scholarship goals require more depth.
  const [interviewQueue, setInterviewQueue] =
    useState<InterviewStepConfig[]>(INTERVIEW_STEPS);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [interviewIdx, setInterviewIdx] = useState(0);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatBubbleMessage[]>([
    {
      id: 'init-1',
      sender: 'artrat',
      text: `Hi Chisom! Welcome to Artrat. This interview is dynamic—you can go one item at a time, or share multiple details in a single message (bank, CV projects, skills, personal story, and family background) and I will extract all of them at once and skip ahead automatically.\n\nFirst, could you upload your O-Level result (WAEC or NECO)?`,
      timestamp: 'Just now',
    },
  ]);

  const formattedDob = `${dobDay} ${dobMonth} ${dobYear}`;
  const availableLgas = getLgasByState(stateOfOrigin);
  const currentStep =
    interviewQueue[Math.min(interviewIdx, interviewQueue.length - 1)];

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  const getNextStepQuestion = (nextStepId: string, studentFirstName: string): string => {
    switch (nextStepId) {
      case 'jamb_result':
        return `Next, please upload your JAMB UTME Original Result Slip so I can save your aggregate score and subject breakdown.`;
      case 'uni_admission':
        return `Now let's add your University Admission Letter from ${selectedUni.universityName}. (Scholarships treat your school admission letter and your JAMB CAPS admission letter as two separate documents, so we'll save each one distinctly.)`;
      case 'jamb_admission':
        return `Great! Now please upload your official JAMB CAPS Admission Letter.`;
      case 'school_id':
        return `Next, please upload a form of school identification—your University ID card, Faculty/Departmental ID, or Library Card all work.`;
      case 'nin_slip':
        return `Now please upload your NIN Slip (either the standard NIMC slip or the improved digital NIN slip).`;
      case 'passport':
        return `Please upload a clear Passport Photograph (plain white or light background).`;
      case 'bank_details':
        return `Almost done with documents! What are your student bank account details (Bank Name, 10-digit NUBAN Account Number, and Account Name) for scholarship stipends?\n\n(Note: I won't ask for your LGA certificate right now since most national scholarships don't require it upfront, and if a scholarship ever asks for a stamped Bank Statement, you can link it on request.)`;
      case 'cv_projects':
        return `Now let's build a standout Academic CV for you from scratch! If you already have a CV, you can upload it and we'll review each section together—or just tell me about any lab projects, leadership roles, or volunteering you've done at ${selectedUni.universityName}.`;
      case 'cv_certifications':
        return `Have you earned any certifications, online courses, or technical skills recently (like MATLAB, Python, AutoCAD, Data Analysis, or workshop certificates) that we should add to your CV?`;
      case 'personal_story':
        return `Let's shape your personal statement story so I can tailor it to every scholarship's prompt. Tell me a bit about where you grew up, what inspired you to study ${department.replace('B.Eng ', '')}, and the impact you want to make.`;
      case 'family_background':
        return `Some scholarships and foundations reserve dedicated grants for students who have lost a parent or come from low-income households. Are both of your parents living, and what work do they do?`;
      case 'sponsorship_disability':
        return `Who currently pays your school fees and accommodation at ${selectedUni.universityName}? Also, do you have any physical or learning disability that scholarships should take into account?`;
      case 'transcript':
        return `Last item, ${studentFirstName}! Please upload your Academic Transcript or Statement of Result. If your results aren't complete yet, don't worry—you can compile the semester results you currently have and get them signed or stamped by your Department Exam Officer (even if it's just one session).`;
      case 'guardian_referee':
        return `Because you qualify for orphan and single-parent priority grants (like BeHerRahmah and community foundation trusts), could you share the name and phone number of your guardian or community referee for attestation letters?`;
      case 'research_supervisor':
        return `Since you mentioned research or thesis work, what is your specific research topic and who is your academic supervisor or referee?`;
      default:
        return '';
    }
  };

  const advanceToNextInterviewStep = (
    acknowledgementPrefix: string,
    extraCompletedIds: string[] = [],
    injectedSteps: InterviewStepConfig[] = []
  ) => {
    const firstName = fullName.split(' ')[0] || 'Chisom';
    const nextCompleted = Array.from(
      new Set([...completedStepIds, currentStep.id, ...extraCompletedIds])
    );
    setCompletedStepIds(nextCompleted);

    let nextQueue = [...interviewQueue];
    for (const st of injectedSteps) {
      if (!nextQueue.some((existing) => existing.id === st.id)) {
        nextQueue.splice( nextQueue.length - 1, 0, st);
      }
    }
    if (injectedSteps.length > 0) {
      setInterviewQueue(nextQueue);
    }

    const nextIdx = nextQueue.findIndex(
      (st, idx) => idx > interviewIdx && !nextCompleted.includes(st.id)
    );

    if (nextIdx === -1 || nextIdx >= nextQueue.length) {
      setInterviewComplete(true);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-done-${Date.now()}`,
          sender: 'artrat',
          text: `${acknowledgementPrefix}\n\nYour Vault, Academic CV, and personal statement profile are completely set up! I've already matched your profile against open scholarships and prepared 3 applications (Shell SPDC, MTN Foundation STEM, and NNPC/TotalEnergies) for you to review. Tap "Enter Artrat Workspace" below whenever you're ready.`,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    setInterviewIdx(nextIdx);
    const nextStep = nextQueue[nextIdx];
    const nextQuestion = getNextStepQuestion(nextStep.id, firstName);

    setChatMessages((prev) => [
      ...prev,
      {
        id: `artrat-step-${Date.now()}`,
        sender: 'artrat',
        text: `${acknowledgementPrefix}\n\n${nextQuestion}`,
        timestamp: 'Just now',
      },
    ]);
    scrollToBottom();
  };

  // Handle Document Upload in Interview
  const handleDocumentUploadInChat = (customFileName?: string) => {
    if (interviewComplete) return;

    const fileName =
      customFileName ||
      currentStep.defaultFileName ||
      `${currentStep.title.replace(/\s+/g, '_')}_Chisom_Okafor.pdf`;
    const extracted =
      currentStep.extractedDetail ||
      `Saved ${currentStep.title} to your Vault`;

    setChatMessages((prev) => [
      ...prev,
      {
        id: `stu-doc-${Date.now()}`,
        sender: 'student',
        text: `Uploaded ${fileName}`,
        timestamp: 'Just now',
        attachedDoc: {
          fileName,
          extractedSummary: extracted,
        },
      },
    ]);

    if (currentStep.id === 'cv_projects') {
      const nextIdx = interviewIdx + 1;
      setInterviewIdx(nextIdx);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-cv-review-${Date.now()}`,
          sender: 'artrat',
          text: `I've read through your uploaded CV (${extracted}). Let's still check each section carefully just in case you've done more since you last updated it—have you acquired any new certifications, online courses, or technical skills recently that aren't on that CV?`,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    const ackMap: Record<string, string> = {
      waec: `Got your O-Level result! I've extracted your grades (${extracted}) and saved the PDF to your Vault.`,
      jamb_result: `Saved! Your JAMB UTME score (${extracted}) is now recorded in your profile and Vault.`,
      uni_admission: `I've verified and saved your ${selectedUni.universityName} Admission Letter (${extracted}).`,
      jamb_admission: `Perfect—your JAMB CAPS Admission Letter is saved separately right alongside your school admission letter.`,
      school_id: `Got it! Your student ID (${extracted}) is saved and ready for portal verification.`,
      nin_slip: `Your NIN Slip is verified and saved to your Vault.`,
      passport: `Great photo! I've saved your passport photograph in portal-ready format.`,
      cv_certifications: `Awesome—I've added that certificate (${extracted}) straight into your Academic CV!`,
      transcript: `I've extracted your 4.21 / 5.00 CGPA from your Exam Officer signed result sheet and saved it to your Vault.`,
    };

    onSyncOnboardingArtifact(
      [
        {
          id: `vault-onb-${Date.now()}`,
          title: currentStep.title,
          category:
            currentStep.id === 'nin_slip' ||
            currentStep.id === 'passport' ||
            currentStep.id === 'school_id'
              ? 'Identity'
              : 'Academic',
          fileName,
          fileSize: '420 KB',
          updatedAt: 'Just now',
          status: 'ready',
          usedInCount: 3,
        },
      ],
      []
    );

    const ack =
      ackMap[currentStep.id] ||
      `Saved ${fileName} (${extracted}) to your Vault.`;
    advanceToNextInterviewStep(ack);
  };

  // Intelligent, context-aware free-form chat handler
  const handleSendChatMessage = (overrideText?: string) => {
    const raw = (overrideText ?? chatInput).trim();
    if (!raw) return;
    setChatInput('');

    // If the user tapped an "Upload ..." chip, trigger the document upload flow
    if (
      raw.toLowerCase().startsWith('upload ') &&
      currentStep.acceptsDocument
    ) {
      if (raw.toLowerCase().includes('library card')) {
        handleDocumentUploadInChat('UNN_Library_ID_Card_2024_248912.jpg');
      } else {
        handleDocumentUploadInChat();
      }
      return;
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: `stu-msg-${Date.now()}`,
        sender: 'student',
        text: raw,
        timestamp: 'Just now',
      },
    ]);

    const lower = raw.toLowerCase();
    const isQuestion =
      raw.includes('?') ||
      lower.startsWith('why') ||
      lower.startsWith('how') ||
      lower.startsWith('what') ||
      lower.startsWith('can i') ||
      lower.startsWith('where') ||
      lower.startsWith('is ') ||
      lower.startsWith('do i');

    // 1. Handle specific student questions / objections across any topic intelligently without blindly skipping the step!
    if (
      lower.includes('two sittings') ||
      lower.includes('combine') ||
      lower.includes('neco')
    ) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-q-${Date.now()}`,
          sender: 'artrat',
          text: `Yes, you can! Most Nigerian scholarships (including PTDF, Agbami, and state bursaries) accept either 1 sitting or a combination of 2 sittings (WAEC + NECO), while a few oil & gas scholarships prefer 5 credits in 1 sitting. Upload whichever O-Level result(s) you have right now using the Upload button below, and I'll match you accurately.`,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    if (
      isQuestion &&
      (lower.includes('jamb') || lower.includes('admission')) &&
      (currentStep.id === 'jamb_result' ||
        currentStep.id === 'uni_admission' ||
        currentStep.id === 'jamb_admission')
    ) {
      const reply =
        currentStep.id === 'jamb_result'
          ? `Many undergraduate scholarships (like MTN Foundation, Shell SPDC, and NNPC/TotalEnergies) verify your UTME entry score alongside your university CGPA. Whenever you're ready, tap Upload below to attach your JAMB Result Slip.`
          : currentStep.id === 'uni_admission'
            ? `Yes, they are two different documents! Your University Admission Letter is issued by ${selectedUni.universityName}'s Registry/Senate, while your JAMB Admission Letter is issued by JAMB CAPS. Portals like Shell SPDC and NLNG ask for both in separate upload slots—so we save both cleanly. Tap Upload below to attach your ${selectedUni.universityName} Admission Letter first.`
            : `You can download your JAMB Admission Letter as a PDF from your JAMB e-Facility portal under "Print Admission Letter". Tap Upload below once you have the PDF ready.`;
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-q-${Date.now()}`,
          sender: 'artrat',
          text: reply,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    if (
      (lower.includes('not issued') ||
        lower.includes('no id') ||
        lower.includes('dont have id') ||
        lower.includes("don't have id")) &&
      currentStep.id === 'school_id'
    ) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-q-${Date.now()}`,
          sender: 'artrat',
          text: `That's very common for 100L and 200L students in Nigerian universities! Scholarship boards accept your Departmental ID card, Faculty ID card, or University Library Card as valid student identification. Tap the Upload button below to attach whichever one you have.`,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    if (isQuestion && lower.includes('nin') && currentStep.id === 'nin_slip') {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-q-${Date.now()}`,
          sender: 'artrat',
          text: `Yes! Both the standard NIMC tracking/NIN slip and the improved Digital NIN Slip PDF are accepted by every Nigerian scholarship portal. Tap Upload below to attach yours.`,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    if (
      isQuestion &&
      (lower.includes('bank') || lower.includes('statement'))
    ) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-q-${Date.now()}`,
          sender: 'artrat',
          text: `Scholarship boards ask for your 10-digit NUBAN account number and bank name so they can disburse your grant directly to you once awarded. You do NOT need to upload a bank statement now—bank statements are only fetched on request if a need-based scholarship specifically asks for one. Just reply with your Bank Name and 10-digit Account Number!`,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    if (
      isQuestion &&
      (lower.includes('lga') || lower.includes('local government'))
    ) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-q-${Date.now()}`,
          sender: 'artrat',
          text: `I didn't ask for your LGA Identification Certificate upfront because most students don't have it lying around and many national STEM scholarships don't require it. If a state or oil-producing community bursary specifically requires an LGA certificate later, I'll let you know inside that application chat!`,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    if (
      (lower.includes('not complete') ||
        lower.includes('incomplete') ||
        lower.includes("don't have transcript") ||
        lower.includes('no transcript')) &&
      currentStep.id === 'transcript'
    ) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-q-${Date.now()}`,
          sender: 'artrat',
          text: `No problem at all—university Senate transcripts often take months! What you should do is print or compile the semester result(s) you currently have (even if it is just your 100L result or a single semester) and have your Department Exam Officer sign and stamp it. Every Nigerian undergraduate scholarship accepts an Exam Officer-signed statement of result. Tap Upload below when you're ready to attach it!`,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    if (isQuestion && lower.includes('parent')) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-q-${Date.now()}`,
          sender: 'artrat',
          text: `Several foundations and oil & gas community trusts reserve priority slots or higher stipends for students who have lost their father or both parents, or whose parents are retired/low-income earners. Knowing your family situation lets me match you with those opportunities and weave your resilience naturally into need-based essays. Tell me about your parents whenever you're comfortable.`,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    if (isQuestion && lower.includes('story')) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `artrat-q-${Date.now()}`,
          sender: 'artrat',
          text: `Every scholarship asks a slightly different personal statement question—some focus on academic excellence, others on community impact or financial need. By understanding where you come from and why you chose ${department.replace('B.Eng ', '')}, I can write authentic, tailored essays for each scholarship in your voice so you never have to write from scratch.`,
          timestamp: 'Just now',
        },
      ]);
      scrollToBottom();
      return;
    }

    // Allow skipping a step if student explicitly asks to skip or do it later
    if (
      lower.includes('skip') ||
      lower.includes('upload later') ||
      lower.includes('do it later')
    ) {
      advanceToNextInterviewStep(
        `No problem—I've marked ${currentStep.title} so you can add or update it in your Vault anytime.`
      );
      return;
    }

    // Dynamic Multi-Slot Extraction: if the student provides multiple profile answers in one message,
    // extract all of them at once and skip every satisfied question automatically!
    const multiExtractedIds: string[] = [];
    const multiNotes: string[] = [];
    if (/\b\d{10}\b/.test(raw) || lower.includes('access bank') || lower.includes('gtbank') || lower.includes('zenith') || lower.includes('first bank') || lower.includes('uba')) {
      multiExtractedIds.push('bank_details');
      multiNotes.push('Bank account');
    }
    if (lower.includes('transformer') || lower.includes('ieee') || lower.includes('class rep') || lower.includes('project') || lower.includes('volunteer')) {
      multiExtractedIds.push('cv_projects');
      multiNotes.push('CV projects & leadership');
    }
    if (lower.includes('matlab') || lower.includes('python') || lower.includes('autocad') || lower.includes('certification')) {
      multiExtractedIds.push('cv_certifications');
      multiNotes.push('Technical certifications');
    }
    if (lower.includes('grew up') || lower.includes('inspired') || lower.includes('darkness') || lower.includes('njikoka')) {
      multiExtractedIds.push('personal_story');
      multiNotes.push('Personal statement story');
    }
    if (lower.includes('father') || lower.includes('mother') || lower.includes('parents')) {
      multiExtractedIds.push('family_background');
      multiNotes.push('Family background');
    }
    if (lower.includes('school fees') || lower.includes('no disability') || lower.includes('hostel rent')) {
      multiExtractedIds.push('sponsorship_disability');
      multiNotes.push('Sponsorship & disability status');
    }

    if (multiExtractedIds.length >= 2) {
      advanceToNextInterviewStep(
        `Dynamic multi-fact extraction complete! From your single message, I extracted and saved ${multiNotes.length} profile sections at once (${multiNotes.join(', ')}) and skipped those questions automatically.`,
        multiExtractedIds
      );
      return;
    }

    // 2. Handle step-by-step conversational responses with tailored, intelligent acknowledgements!
    if (currentStep.id === 'bank_details') {
      advanceToNextInterviewStep(
        `Got it! I've saved "${raw}" as your verified payout bank account for scholarship disbursements.`
      );
      return;
    }

    if (currentStep.id === 'cv_projects') {
      if (
        lower.includes('do not have a cv') ||
        lower.includes("don't have a cv") ||
        lower.includes('no cv')
      ) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `artrat-cv-help-${Date.now()}`,
            sender: 'artrat',
            text: `That's completely fine—most 100L and 200L students don't have one yet! I'll build a clean, two-page Academic CV for you from scratch. Just tell me in plain words: what practical lab work, class project, student society (like IEEE or NUESA), or volunteering have you taken part in so far?`,
            timestamp: 'Just now',
          },
        ]);
        scrollToBottom();
        return;
      }

      advanceToNextInterviewStep(
        `That's strong practical experience! I've structured "${raw}" into the Projects & Leadership section of your Academic CV with measurable engineering bullet points.`
      );
      return;
    }

    if (currentStep.id === 'cv_certifications') {
      advanceToNextInterviewStep(
        `Saved! I've added "${raw}" under Technical Skills & Certifications on your Academic CV.`
      );
      return;
    }

    if (currentStep.id === 'personal_story') {
      advanceToNextInterviewStep(
        `Thank you for sharing that—connecting your roots and lived experience (${raw.slice(0, 75)}${raw.length > 75 ? '...' : ''}) to your ${department.replace('B.Eng ', '')} studies makes for a genuinely compelling personal statement. I've saved this to your Writing Voice ledger.`
      );
      return;
    }

    if (currentStep.id === 'family_background') {
      const mentionsDeceased =
        lower.includes('passed away') ||
        lower.includes('deceased') ||
        lower.includes('late') ||
        lower.includes('lost my');
      const empathyAck = mentionsDeceased
        ? `I'm truly sorry for your loss. Thank you for sharing that with me—I've recorded your family background carefully (${raw}) and unlocked orphan and single-parent scholarship grants in your eligibility profile.`
        : `Thank you for sharing that. I've recorded your parents' occupation details (${raw}) for need-based and family-income scholarship sections.`;
      const dynamicFollowUp: InterviewStepConfig[] = mentionsDeceased
        ? [
            {
              id: 'guardian_referee',
              title: 'Guardian / Community Referee Contact (Dynamic Follow-Up)',
              kind: 'conversation',
              acceptsDocument: false,
              quickSuggestions: [
                'Mrs. Ngozi Okafor (Mother) · +234 803 412 8891 & HRH Igwe of Njikoka',
              ],
            },
          ]
        : [];
      advanceToNextInterviewStep(empathyAck, [], dynamicFollowUp);
      return;
    }

    if (currentStep.id === 'sponsorship_disability') {
      advanceToNextInterviewStep(
        `Noted! I've saved your sponsorship and accommodation details (${raw}) so I can weave them accurately into financial-need statements whenever a scholarship asks.`
      );
      return;
    }

    // If we're on a document step and the student typed a message instead of uploading
    if (currentStep.acceptsDocument) {
      handleDocumentUploadInChat();
      return;
    }

    advanceToNextInterviewStep(`Saved "${raw}" to your profile.`);
  };

  // Connector OAuth Modal Handlers
  const handleConnectorButtonPress = (item: OnboardingConnectorItem) => {
    if (item.status === 'coming_soon') return;
    setOauthEmailInput(item.accountLabel);
    setOauthAuthorizing(false);
    setOauthTarget(item);
  };

  const handleConfirmOAuth = () => {
    if (!oauthTarget) return;
    setOauthAuthorizing(true);
    setTimeout(() => {
      const updatedLabel =
        oauthEmailInput.trim() || oauthTarget.accountLabel;
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === oauthTarget.id
            ? { ...c, status: 'connected', accountLabel: updatedLabel }
            : c
        )
      );
      setOauthTarget(null);
      setOauthAuthorizing(false);
    }, 450);
  };

  const handleDisconnectOAuth = () => {
    if (!oauthTarget) return;
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === oauthTarget.id ? { ...c, status: 'available' } : c
      )
    );
    setOauthTarget(null);
  };

  const filteredUniversities = NIGERIAN_UNIVERSITIES.filter((uName) =>
    uName.toLowerCase().includes(uniSearchQuery.toLowerCase())
  );

  const renderConnectorRow = (item: OnboardingConnectorItem) => {
    const isConnected = item.status === 'connected';
    const isComingSoon = item.status === 'coming_soon';
    const isInfoOpen = openConnectorInfoId === item.id;

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
        <View style={styles.connectorMainRow}>
          <View style={styles.connectorIconBox}>{renderIcon()}</View>

          <View style={styles.connectorTitleGroup}>
            <View style={styles.connectorNameRow}>
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
                <Info size={12} color={isInfoOpen ? '#FFFFFF' : '#5B21B6'} />
              </Pressable>
            </View>
            <Text style={styles.connectorSubText} numberOfLines={1}>
              {isConnected
                ? item.accountLabel
                : isComingSoon
                  ? 'Direct WhatsApp reminders & document uploads'
                  : item.accountLabel}
            </Text>
          </View>

          {isComingSoon ? (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
            </View>
          ) : (
            <Pressable
              style={[
                styles.connectBtn,
                isConnected
                  ? styles.connectBtnConnected
                  : styles.connectBtnAvailable,
              ]}
              onPress={() => handleConnectorButtonPress(item)}
            >
              <Text
                style={[
                  styles.connectBtnText,
                  isConnected
                    ? styles.connectBtnTextConnected
                    : styles.connectBtnTextAvailable,
                ]}
              >
                {isConnected ? 'Connected' : 'Connect'}
              </Text>
            </Pressable>
          )}
        </View>

        {isInfoOpen ? (
          <View style={styles.connectorInfoBox}>
            <Text style={styles.connectorInfoTitle}>{item.infoTitle}</Text>
            <Text style={styles.connectorInfoSummary}>{item.infoSummary}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Progress Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          {stage !== 'auth' ? (
            <Pressable
              style={styles.backStepBtn}
              onPress={() => {
                if (stage === 'profile_form') setStage('auth');
                else if (stage === 'connectors') setStage('profile_form');
                else if (stage === 'ai_interview') setStage('connectors');
              }}
            >
              <ArrowLeft size={15} color="#161126" />
              <Text style={styles.backStepBtnText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>A</Text>
            </View>
          )}
          <View>
            <Text style={styles.brandTitle}>Artrat</Text>
            <Text style={styles.brandSubtitle}>
              Autonomous Scholarship Workspace
            </Text>
          </View>
        </View>

        <View style={styles.stepPillsRow}>
          {(
            [
              { id: 'auth', label: '1. Account' },
              { id: 'profile_form', label: '2. Profile' },
              { id: 'connectors', label: '3. Connect' },
              { id: 'ai_interview', label: '4. Chat' },
            ] as const
          ).map((s) => {
            const active = stage === s.id;
            return (
              <Pressable
                key={s.id}
                style={[styles.stepPill, active && styles.stepPillActive]}
                onPress={() => setStage(s.id)}
              >
                <Text
                  style={[
                    styles.stepPillText,
                    active && styles.stepPillTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* =========================================================
          STAGE 4: FULL-PAGE IN-HOME STYLE CHAT INTERFACE
         ========================================================= */}
      {stage === 'ai_interview' ? (
        <View style={styles.chatPageContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScrollArea}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            {/* Same Mascot Banner as NewChatScreen */}
            <View style={styles.mascotBanner}>
              <ArtratBot3D mood="happy" size="sm" />
              <View style={{ flex: 1 }}>
                <Text style={styles.mascotBannerTitle}>
                  Artrat Dynamic Interview
                </Text>
                <Text style={styles.mascotBannerSub}>
                  {interviewComplete
                    ? '100% Info Gathered · Vault, Academic CV & Personal Statement Ready'
                    : `${currentStep.title} · ${Math.round(
                        (completedStepIds.length / interviewQueue.length) * 100
                      )}% info gathered (${
                        interviewQueue.length - completedStepIds.length
                      } left)`}
                </Text>
              </View>
              <Pressable
                style={styles.skipToWorkspacePill}
                onPress={onFinishOnboarding}
              >
                <Text style={styles.skipToWorkspacePillText}>
                  {interviewComplete ? 'Open Workspace' : 'Skip to Home'}
                </Text>
              </Pressable>
            </View>

            {/* Message Bubbles (Identical to NewChatScreen / ApplicationChatScreen) */}
            {chatMessages.map((msg) => {
              const isArtrat = msg.sender === 'artrat';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.bubble,
                    isArtrat ? styles.artratBubble : styles.studentBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      isArtrat
                        ? styles.artratBubbleText
                        : styles.studentBubbleText,
                    ]}
                  >
                    {msg.text}
                  </Text>

                  {msg.attachedDoc ? (
                    <View style={styles.docBox}>
                      <View style={styles.docRow}>
                        <View style={styles.docIconWrap}>
                          <FileText size={16} color="#5B21B6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docFileName}>
                            {msg.attachedDoc.fileName}
                          </Text>
                          <Text style={styles.docExtractedText}>
                            {msg.attachedDoc.extractedSummary}
                          </Text>
                        </View>
                        <View style={styles.savedVaultPill}>
                          <Check size={11} color="#047857" />
                          <Text style={styles.savedVaultPillText}>
                            Saved in Vault
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  <Text
                    style={[
                      styles.bubbleTime,
                      !isArtrat && { color: '#E9D5FF' },
                    ]}
                  >
                    {isArtrat ? 'Artrat' : 'You'} · {msg.timestamp}
                  </Text>
                </View>
              );
            })}

            {/* Quick Suggestion Chips or Final Workspace Launch Card */}
            {interviewComplete ? (
              <View style={styles.completeLaunchCard}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.completeLaunchTitle}>
                    3 Scholarships Prepared & Waiting for You
                  </Text>
                  <Text style={styles.completeLaunchSub}>
                    Shell SPDC, MTN STEM, and NNPC/TotalEnergies are ready in
                    your Applications tab.
                  </Text>
                </View>
                <Pressable
                  style={styles.primaryCtaBtn}
                  onPress={() => {
                    onCompleteWithMatchedScholarship();
                    onFinishOnboarding();
                  }}
                >
                  <Text style={styles.primaryCtaBtnText}>
                    Enter Artrat Workspace
                  </Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.quickPromptsWrap}>
                <Text style={styles.quickPromptsHeading}>
                  Quick actions or type any question below:
                </Text>
                <View style={styles.promptChipsRow}>
                  {currentStep.kind === 'conversation' ? (
                    <Pressable
                      style={[styles.promptChip, styles.promptChipUpload]}
                      onPress={() =>
                        handleSendChatMessage(
                          'Access Bank 0149823410; I built a transformer in EEE 102 and volunteer with IEEE UNN; certified in MATLAB & Python; grew up in Njikoka where outages inspired me; my father passed away and my mother pays my school fees; no disability'
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.promptChipText,
                          styles.promptChipUploadText,
                        ]}
                      >
                        ⚡ Fast-Track: Answer Bank, CV, Skills, Story & Family in 1 Turn
                      </Text>
                    </Pressable>
                  ) : null}
                  {currentStep.quickSuggestions.map((suggestion) => {
                    const isUploadChip = suggestion
                      .toLowerCase()
                      .startsWith('upload ');
                    return (
                      <Pressable
                        key={suggestion}
                        style={[
                          styles.promptChip,
                          isUploadChip && styles.promptChipUpload,
                        ]}
                        onPress={() => handleSendChatMessage(suggestion)}
                      >
                        {isUploadChip ? (
                          <Upload size={13} color="#5B21B6" />
                        ) : null}
                        <Text
                          style={[
                            styles.promptChipText,
                            isUploadChip && styles.promptChipUploadText,
                          ]}
                        >
                          {suggestion}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Pinned Bottom Composer Pill (Identical to NewChatScreen / ApplicationChatScreen) */}
          <View style={styles.bottomBar}>
            <View style={styles.composerPill}>
              {currentStep.acceptsDocument && !interviewComplete ? (
                <Pressable
                  style={styles.attachDocPillBtn}
                  onPress={() => handleDocumentUploadInChat()}
                  accessibilityRole="button"
                  accessibilityLabel={`Upload ${currentStep.title}`}
                >
                  <Upload size={14} color="#5B21B6" />
                  <Text style={styles.attachDocPillText}>Upload</Text>
                </Pressable>
              ) : null}

              <TextInput
                style={styles.composerInput}
                placeholder={
                  interviewComplete
                    ? 'Ask Artrat anything or tap Enter Artrat Workspace...'
                    : currentStep.acceptsDocument
                      ? `Upload ${currentStep.title} or ask a question...`
                      : `Reply to Artrat or ask a question...`
                }
                placeholderTextColor="#756A92"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={() => handleSendChatMessage()}
              />

              <Pressable
                onPress={() => handleSendChatMessage()}
                style={[
                  styles.sendCircleBtn,
                  !chatInput.trim() && styles.sendCircleBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <ArrowRight size={15} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        /* =========================================================
            STAGES 1, 2, 3: CLEAN, UNCLUSTERED ONBOARDING FLOW
           ========================================================= */
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* STEP 1: SIGN IN / CREATE ACCOUNT */}
          {stage === 'auth' ? (
            <View style={styles.stepCard}>
              <View style={styles.heroHeaderRow}>
                <View style={styles.mascotCircle}>
                  <ArtratBot3D mood="happy" size="sm" />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.stepTitle}>
                    {authMode === 'signup'
                      ? 'Create your student account'
                      : 'Welcome back to Artrat'}
                  </Text>
                  <Text style={styles.stepSubtitle}>
                    We find scholarships you qualify for, prepare your documents
                    and essays, and submit them for you.
                  </Text>
                </View>
              </View>

              {/* Auth Mode Toggle */}
              <View style={styles.authSegmentTrack}>
                <Pressable
                  style={[
                    styles.authSegmentBtn,
                    authMode === 'signup' && styles.authSegmentBtnActive,
                  ]}
                  onPress={() => setAuthMode('signup')}
                >
                  <Text
                    style={[
                      styles.authSegmentText,
                      authMode === 'signup' && styles.authSegmentTextActive,
                    ]}
                  >
                    Create Account
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.authSegmentBtn,
                    authMode === 'signin' && styles.authSegmentBtnActive,
                  ]}
                  onPress={() => setAuthMode('signin')}
                >
                  <Text
                    style={[
                      styles.authSegmentText,
                      authMode === 'signin' && styles.authSegmentTextActive,
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>
              </View>

              <View style={styles.formStack}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    University or Personal Email
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="you@unn.edu.ng"
                    placeholderTextColor="#8B80A6"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Enter password"
                    placeholderTextColor="#8B80A6"
                  />
                </View>

                <Pressable
                  style={styles.primaryCtaBtn}
                  onPress={() => setStage('profile_form')}
                >
                  <Text style={styles.primaryCtaBtnText}>
                    {authMode === 'signup'
                      ? 'Continue to Student Profile'
                      : 'Sign In'}
                  </Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={styles.googleAuthBtn}
                onPress={() => setStage('profile_form')}
              >
                <Mail size={16} color="#4C1D95" />
                <Text style={styles.googleAuthBtnText}>
                  Continue with Google
                </Text>
              </Pressable>

              <Pressable
                style={styles.quickSkipLink}
                onPress={onFinishOnboarding}
              >
                <Text style={styles.quickSkipLinkText}>
                  Already onboarded? Open Chisom Okafor’s Workspace →
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* STEP 2: STUDENT BIO-DATA & SCHOOL PROFILE */}
          {stage === 'profile_form' ? (
            <View style={styles.stepCard}>
              <View style={styles.stepHeaderBlock}>
                <Text style={styles.stepTitle}>Student Profile</Text>
                <Text style={styles.stepSubtitle}>
                  Your bio-data and university details used across your
                  scholarship applications.
                </Text>
              </View>

              <View style={styles.formStack}>
                {/* Row 1: Full Legal Name & Date of Birth Picker */}
                <View style={[styles.gridRow, isWide && styles.gridRowWide]}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Full Legal Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Date of Birth</Text>
                    <Pressable
                      style={styles.dropdownTrigger}
                      onPress={() => setDobModalOpen(true)}
                    >
                      <Text style={styles.dropdownTriggerText}>
                        {formattedDob}
                      </Text>
                      <ChevronDown size={16} color="#5B21B6" />
                    </Pressable>
                  </View>
                </View>

                {/* Row 2: University & Course / Department */}
                <View style={[styles.gridRow, isWide && styles.gridRowWide]}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>
                      University / Institution
                    </Text>
                    <Pressable
                      style={styles.dropdownTrigger}
                      onPress={() => setUniModalOpen(true)}
                    >
                      <Text
                        style={styles.dropdownTriggerText}
                        numberOfLines={1}
                      >
                        {selectedUni.universityName}
                      </Text>
                      <ChevronDown size={16} color="#5B21B6" />
                    </Pressable>
                    <Text style={styles.fieldHelperText}>
                      Active session: {selectedUni.currentSemester} (
                      {selectedUni.activeSession})
                    </Text>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Course / Department</Text>
                    <TextInput
                      style={styles.textInput}
                      value={department}
                      onChangeText={setDepartment}
                    />
                  </View>
                </View>

                {/* Row 3: Current Level & Matriculation Number */}
                <View style={[styles.gridRow, isWide && styles.gridRowWide]}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Current Level</Text>
                    <Pressable
                      style={styles.dropdownTrigger}
                      onPress={() => setLevelModalOpen(true)}
                    >
                      <Text style={styles.dropdownTriggerText}>{level}</Text>
                      <ChevronDown size={16} color="#5B21B6" />
                    </Pressable>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Matriculation Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={matricNo}
                      onChangeText={setMatricNo}
                    />
                  </View>
                </View>

                {/* Row 4: State of Origin & Local Government Area (Cascading 36 States + 774 LGAs) */}
                <View style={[styles.gridRow, isWide && styles.gridRowWide]}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>State of Origin</Text>
                    <Pressable
                      style={styles.dropdownTrigger}
                      onPress={() => setStateModalOpen(true)}
                    >
                      <Text style={styles.dropdownTriggerText}>
                        {stateOfOrigin === 'FCT - Abuja'
                          ? 'FCT - Abuja'
                          : `${stateOfOrigin} State`}
                      </Text>
                      <ChevronDown size={16} color="#5B21B6" />
                    </Pressable>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>
                      Local Government Area (LGA)
                    </Text>
                    <Pressable
                      style={styles.dropdownTrigger}
                      onPress={() => setLgaModalOpen(true)}
                    >
                      <Text style={styles.dropdownTriggerText}>
                        {lgaOfOrigin}
                      </Text>
                      <ChevronDown size={16} color="#5B21B6" />
                    </Pressable>
                  </View>
                </View>

                {/* Row 5: Student Residential / Writing Address */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Your Student Residential / Writing Address
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={studentAddress}
                    onChangeText={setStudentAddress}
                  />
                </View>
              </View>

              <Pressable
                style={styles.primaryCtaBtn}
                onPress={() => {
                  onUpdateAddresses(
                    studentAddress.trim() || studentWritingAddress,
                    hodRecipientAddress
                  );
                  setStage('connectors');
                }}
              >
                <Text style={styles.primaryCtaBtnText}>
                  Save Profile & Continue
                </Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}

          {/* STEP 3: CONNECT YOUR APPS */}
          {stage === 'connectors' ? (
            <View style={styles.stepCard}>
              <View style={styles.stepHeaderBlock}>
                <Text style={styles.stepTitle}>Connect Your Apps</Text>
                <Text style={styles.stepSubtitle}>
                  Connect your Google Workspace so Artrat can schedule reminders,
                  pick up portal verification codes automatically, and back up
                  your receipts.
                </Text>
              </View>

              <View style={styles.connectorsStack}>
                {connectors.map(renderConnectorRow)}
              </View>

              <Pressable
                style={styles.primaryCtaBtn}
                onPress={() => setStage('ai_interview')}
              >
                <Text style={styles.primaryCtaBtnText}>Continue to Chat</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* =========================================================
          MODALS FOR DATE OF BIRTH, UNIVERSITY, LEVEL, STATE & LGA
         ========================================================= */}

      {/* DATE OF BIRTH PICKER MODAL */}
      <Modal visible={dobModalOpen} animationType="fade" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDobModalOpen(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setDobModalOpen(false)}
              >
                <X size={15} color="#161126" />
              </Pressable>
            </View>

            <View style={styles.dobColumnsRow}>
              {/* Day Column */}
              <View style={styles.dobColumn}>
                <Text style={styles.dobColLabel}>Day</Text>
                <ScrollView style={styles.dobColScroll}>
                  {DAYS.map((d) => (
                    <Pressable
                      key={d}
                      style={[
                        styles.dobOptionItem,
                        dobDay === d && styles.dobOptionItemActive,
                      ]}
                      onPress={() => setDobDay(d)}
                    >
                      <Text
                        style={[
                          styles.dobOptionText,
                          dobDay === d && styles.dobOptionTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Month Column */}
              <View style={[styles.dobColumn, { flex: 1.4 }]}>
                <Text style={styles.dobColLabel}>Month</Text>
                <ScrollView style={styles.dobColScroll}>
                  {MONTHS.map((m) => (
                    <Pressable
                      key={m}
                      style={[
                        styles.dobOptionItem,
                        dobMonth === m && styles.dobOptionItemActive,
                      ]}
                      onPress={() => setDobMonth(m)}
                    >
                      <Text
                        style={[
                          styles.dobOptionText,
                          dobMonth === m && styles.dobOptionTextActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Year Column */}
              <View style={styles.dobColumn}>
                <Text style={styles.dobColLabel}>Year</Text>
                <ScrollView style={styles.dobColScroll}>
                  {YEARS.map((y) => (
                    <Pressable
                      key={y}
                      style={[
                        styles.dobOptionItem,
                        dobYear === y && styles.dobOptionItemActive,
                      ]}
                      onPress={() => setDobYear(y)}
                    >
                      <Text
                        style={[
                          styles.dobOptionText,
                          dobYear === y && styles.dobOptionTextActive,
                        ]}
                      >
                        {y}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <Pressable
              style={styles.primaryCtaBtn}
              onPress={() => setDobModalOpen(false)}
            >
              <Text style={styles.primaryCtaBtnText}>
                Confirm ({formattedDob})
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* UNIVERSITY PICKER MODAL */}
      <Modal visible={uniModalOpen} animationType="fade" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setUniModalOpen(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Select University (A–Z · {filteredUniversities.length})
              </Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setUniModalOpen(false)}
              >
                <X size={15} color="#161126" />
              </Pressable>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Search Nigerian university (e.g. UNN, UNILAG, UI, FUTO)..."
              placeholderTextColor="#8B80A6"
              value={uniSearchQuery}
              onChangeText={setUniSearchQuery}
            />

            <ScrollView style={styles.modalListScroll}>
              {filteredUniversities.map((uName) => {
                const selected = uName === selectedUniName;
                const rec = uniCache[uName] || {
                  universityName: uName,
                  activeSession: '2025/2026',
                  currentSemester: '2nd Semester' as const,
                  liveVerificationSignal: '2nd Semester · 2025/2026',
                  nextPromotionWindow: 'Next session',
                  cachedAt: 'Active',
                };
                return (
                  <Pressable
                    key={uName}
                    style={[
                      styles.modalOptionRow,
                      selected && styles.modalOptionRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedUniName(uName);
                      if (!uniCache[uName]) {
                        setUniCache((prev) => ({ ...prev, [uName]: rec }));
                      }
                      setUniModalOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalOptionTitle}>{uName}</Text>
                      <Text style={styles.modalOptionSub}>
                        {rec.currentSemester} · {rec.activeSession}
                      </Text>
                    </View>
                    {selected ? <Check size={15} color="#5B21B6" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ACADEMIC LEVEL MODAL */}
      <Modal visible={levelModalOpen} animationType="fade" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setLevelModalOpen(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Current Level</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setLevelModalOpen(false)}
              >
                <X size={15} color="#161126" />
              </Pressable>
            </View>

            <View style={{ gap: 6 }}>
              {ACADEMIC_LEVEL_OPTIONS.map((lvl) => {
                const selected = lvl === level;
                return (
                  <Pressable
                    key={lvl}
                    style={[
                      styles.modalOptionRow,
                      selected && styles.modalOptionRowSelected,
                    ]}
                    onPress={() => {
                      setLevel(lvl);
                      setLevelModalOpen(false);
                    }}
                  >
                    <Text style={styles.modalOptionTitle}>{lvl}</Text>
                    {selected ? <Check size={15} color="#5B21B6" /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* STATE OF ORIGIN MODAL */}
      <Modal visible={stateModalOpen} animationType="fade" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setStateModalOpen(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select State of Origin</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setStateModalOpen(false)}
              >
                <X size={15} color="#161126" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalListScroll}>
              {NIGERIA_STATES.map((st) => {
                const selected = st === stateOfOrigin;
                return (
                  <Pressable
                    key={st}
                    style={[
                      styles.modalOptionRow,
                      selected && styles.modalOptionRowSelected,
                    ]}
                    onPress={() => {
                      setStateOfOrigin(st);
                      const lgas = getLgasByState(st);
                      setLgaOfOrigin(lgas[0] || '');
                      setStateModalOpen(false);
                    }}
                  >
                    <Text style={styles.modalOptionTitle}>
                      {st === 'FCT - Abuja' ? st : `${st} State`}
                    </Text>
                    {selected ? <Check size={15} color="#5B21B6" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* LOCAL GOVERNMENT AREA (LGA) MODAL */}
      <Modal visible={lgaModalOpen} animationType="fade" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setLgaModalOpen(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Select Local Government Area ({stateOfOrigin})
              </Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setLgaModalOpen(false)}
              >
                <X size={15} color="#161126" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalListScroll}>
              {availableLgas.map((lga) => {
                const selected = lga === lgaOfOrigin;
                return (
                  <Pressable
                    key={lga}
                    style={[
                      styles.modalOptionRow,
                      selected && styles.modalOptionRowSelected,
                    ]}
                    onPress={() => {
                      setLgaOfOrigin(lga);
                      setLgaModalOpen(false);
                    }}
                  >
                    <Text style={styles.modalOptionTitle}>{lga}</Text>
                    {selected ? <Check size={15} color="#5B21B6" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* OAUTH CONNECTOR MODAL */}
      <Modal visible={!!oauthTarget} animationType="fade" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setOauthTarget(null)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            {oauthTarget ? (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {oauthTarget.status === 'connected'
                        ? `Manage ${oauthTarget.name}`
                        : `Connect ${oauthTarget.name}`}
                    </Text>
                    <Text style={styles.modalOptionSub}>
                      {oauthTarget.providerDomain}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.modalCloseBtn}
                    onPress={() => setOauthTarget(null)}
                  >
                    <X size={15} color="#161126" />
                  </Pressable>
                </View>

                {oauthAuthorizing ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={22} color="#6D28D9" />
                    <Text style={styles.modalOptionTitle}>
                      Connecting {oauthTarget.name}...
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Account</Text>
                      <TextInput
                        style={styles.textInput}
                        value={oauthEmailInput}
                        onChangeText={setOauthEmailInput}
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.connectorInfoBox}>
                      <Text style={styles.connectorInfoTitle}>Permissions</Text>
                      {oauthTarget.infoPermissions.map((perm, idx) => (
                        <View
                          key={idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Check size={12} color="#5B21B6" />
                          <Text style={styles.connectorInfoSummary}>{perm}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={{ gap: 8 }}>
                      <Pressable
                        style={styles.primaryCtaBtn}
                        onPress={handleConfirmOAuth}
                      >
                        <Text style={styles.primaryCtaBtnText}>
                          {oauthTarget.status === 'connected'
                            ? 'Save Account'
                            : 'Connect'}
                        </Text>
                      </Pressable>

                      {oauthTarget.status === 'connected' ? (
                        <Pressable
                          style={styles.disconnectBtn}
                          onPress={handleDisconnectOAuth}
                        >
                          <Text style={styles.disconnectBtnText}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5FC',
  },
  topHeader: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },
  backStepBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#161126',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161126',
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#6E6388',
  },
  stepPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F3EEFF',
  },
  stepPillActive: {
    backgroundColor: '#6D28D9',
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4C1D95',
  },
  stepPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* STAGES 1, 2, 3 SCROLL & CARD STYLES */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 18,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mascotCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeaderBlock: {
    gap: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#161126',
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#4E4466',
    lineHeight: 19,
  },
  authSegmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
    padding: 4,
  },
  authSegmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  authSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  authSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6388',
  },
  authSegmentTextActive: {
    color: '#161126',
    fontWeight: '700',
  },
  formStack: {
    gap: 14,
  },
  gridRow: {
    gap: 12,
  },
  gridRowWide: {
    flexDirection: 'row',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E4466',
  },
  fieldHelperText: {
    fontSize: 11,
    color: '#6E6388',
  },
  textInput: {
    backgroundColor: '#FAF8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C6F0',
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 13,
    color: '#161126',
  },
  dropdownTrigger: {
    backgroundColor: '#FAF8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C6F0',
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#161126',
    flex: 1,
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6D28D9',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  primaryCtaBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EAE3F8',
  },
  dividerText: {
    fontSize: 12,
    color: '#756A92',
    fontWeight: '600',
  },
  googleAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAF8FF',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DDD0F8',
  },
  googleAuthBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4C1D95',
  },
  quickSkipLink: {
    alignItems: 'center',
    paddingTop: 2,
  },
  quickSkipLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B21B6',
  },

  /* CONNECTORS STEP STYLES (CLEAN, NON-SLOP BUTTONS) */
  connectorsStack: {
    gap: 9,
  },
  connectorCard: {
    backgroundColor: '#FAF8FF',
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 8,
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
  connectorTitleGroup: {
    flex: 1,
    gap: 2,
  },
  connectorNameRow: {
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
    width: 20,
    height: 20,
    borderRadius: 10,
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
  connectorSubText: {
    fontSize: 11,
    color: '#6E6388',
  },
  connectBtn: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnConnected: {
    backgroundColor: '#F3EEFF',
    borderColor: '#E0D4F7',
  },
  connectBtnAvailable: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  connectBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectBtnTextConnected: {
    color: '#4C1D95',
  },
  connectBtnTextAvailable: {
    color: '#FFFFFF',
  },
  comingSoonBadge: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  comingSoonBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E6388',
  },
  connectorInfoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 4,
  },
  connectorInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C1D95',
  },
  connectorInfoSummary: {
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 17,
  },

  /* STAGE 4: IN-HOME PARITY CHAT STYLES */
  chatPageContainer: {
    flex: 1,
    backgroundColor: '#F7F5FC',
  },
  chatScrollArea: {
    flex: 1,
  },
  chatScrollContent: {
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
    marginTop: 2,
  },
  skipToWorkspacePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4C6F0',
  },
  skipToWorkspacePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C1D95',
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
    alignSelf: 'flex-start',
    width: '100%',
  },
  studentBubble: {
    backgroundColor: '#6D28D9',
    alignSelf: 'flex-end',
    maxWidth: '88%',
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 20,
  },
  artratBubbleText: {
    color: '#161126',
  },
  studentBubbleText: {
    color: '#FFFFFF',
  },
  bubbleTime: {
    fontSize: 10,
    color: '#756A92',
    marginTop: 2,
  },
  docBox: {
    backgroundColor: '#FAF8FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAE3F8',
    marginTop: 4,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EDE5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#161126',
  },
  docExtractedText: {
    fontSize: 11,
    color: '#4E4466',
    marginTop: 2,
  },
  savedVaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  savedVaultPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  quickPromptsWrap: {
    gap: 8,
    marginTop: 2,
  },
  quickPromptsHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E4466',
  },
  promptChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD0F8',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  promptChipUpload: {
    backgroundColor: '#F3EEFF',
    borderColor: '#C4B5FD',
  },
  promptChipText: {
    fontSize: 12,
    color: '#4C1D95',
    fontWeight: '600',
  },
  promptChipUploadText: {
    fontWeight: '700',
  },
  completeLaunchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4C6F0',
    gap: 12,
  },
  completeLaunchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161126',
  },
  completeLaunchSub: {
    fontSize: 12,
    color: '#4E4466',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DDD0F8',
    gap: 8,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
  },
  attachDocPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },
  attachDocPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C1D95',
  },
  composerInput: {
    flex: 1,
    fontSize: 13,
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
    opacity: 0.45,
  },

  /* MODALS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 17, 38, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161126',
    flex: 1,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalListScroll: {
    maxHeight: 320,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EEFF',
  },
  modalOptionRowSelected: {
    backgroundColor: '#F3EEFF',
  },
  modalOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#161126',
  },
  modalOptionSub: {
    fontSize: 11,
    color: '#6E6388',
    marginTop: 2,
  },
  dobColumnsRow: {
    flexDirection: 'row',
    gap: 8,
    height: 220,
  },
  dobColumn: {
    flex: 1,
    gap: 6,
  },
  dobColLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6E6388',
    textAlign: 'center',
  },
  dobColScroll: {
    backgroundColor: '#FAF8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  dobOptionItem: {
    paddingVertical: 9,
    alignItems: 'center',
  },
  dobOptionItemActive: {
    backgroundColor: '#EDE5FF',
  },
  dobOptionText: {
    fontSize: 13,
    color: '#4E4466',
    fontWeight: '500',
  },
  dobOptionTextActive: {
    color: '#4C1D95',
    fontWeight: '700',
  },
  disconnectBtn: {
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  disconnectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BE123C',
  },
});
