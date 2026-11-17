import {
  CuratedApplication,
  GeneralHistoryThread,
  ProfileFact,
  VaultDocument,
} from '../domain/types';

export function buildHodLetterDraft(
  studentWritingAddress: string,
  hodRecipientAddress: string
): string {
  return `${studentWritingAddress}
29 October 2026

Through:
${hodRecipientAddress}

Dear Sir/Madam,

LETTER OF GOOD STANDING & ACADEMIC ATTESTATION FOR CHISOM KAMSIYOCHUKWU OKAFOR (MATRIC NO: 2024/248912)

This is to officially certify that Chisom Kamsiyochukwu Okafor (Matriculation Number: 2024/248912) is a bonafide full-time 200 Level undergraduate student in the Department of Electrical Engineering, Faculty of Engineering, University of Nigeria, Nsukka.

Based on official departmental academic records for the completed 100 Level session, the student holds a Cumulative Grade Point Average (CGPA) of 4.21 / 5.00 (Second Class Honours, Upper Division) and is of exemplary character and good disciplinary standing.

We endorse this application for the NNPC / TotalEnergies National Merit Scholarship without reservation.

Yours faithfully,

______________________________________
${hodRecipientAddress}
(Signature, Official Stamp & Date)`;
}

export const INITIAL_PROFILE_FACTS: ProfileFact[] = [
  {
    id: 'fact-name',
    label: 'Full Name',
    value: 'Chisom Kamsiyochukwu Okafor',
    category: 'Identity',
    verifiedSource: 'NIN Slip',
  },
  {
    id: 'fact-age',
    label: 'Date of Birth',
    value: '14 May 2009',
    category: 'Identity',
    verifiedSource: 'Student Profile',
  },
  {
    id: 'fact-uni',
    label: 'University & Department',
    value: 'University of Nigeria, Nsukka (UNN) · Electrical Engineering',
    category: 'Academic',
    verifiedSource: 'University Admission Letter',
  },
  {
    id: 'fact-semester-level',
    label: 'Level & Session',
    value: '200 Level · 2nd Semester (2025/2026)',
    category: 'Academic',
    verifiedSource: 'University Record',
  },
  {
    id: 'fact-level',
    label: 'Matriculation Number',
    value: '2024/248912',
    category: 'Academic',
    verifiedSource: 'Departmental ID Card',
  },
  {
    id: 'fact-cgpa',
    label: 'Current CGPA',
    value: '4.21 / 5.00 (Second Class Upper)',
    category: 'Academic',
    verifiedSource: '100L Result Sheet',
  },
  {
    id: 'fact-jamb',
    label: 'JAMB UTME Score',
    value: '308 / 400 · Reg: 202440981234BA',
    category: 'Academic',
    verifiedSource: 'JAMB Result Slip',
  },
  {
    id: 'fact-waec',
    label: "WAEC O'Level Result",
    value: '5 A1s (Maths, Physics, Chem, Further Maths, Civic) · 3 B2s (Eng, Bio, Tech Draw)',
    category: 'Academic',
    verifiedSource: "WAEC Result",
  },
  {
    id: 'fact-origin',
    label: 'State of Origin & LGA',
    value: 'Anambra State · Njikoka LGA',
    category: 'Origin',
    verifiedSource: 'Student Profile',
  },
  {
    id: 'fact-writing-address',
    label: 'Residential Address',
    value: 'Room 204, Kwame Nkrumah Hall, University of Nigeria, Nsukka',
    category: 'Addressing',
    verifiedSource: 'Student Profile',
  },
  {
    id: 'fact-bank',
    label: 'Bank Account',
    value: 'Access Bank · 0149823410 · Chisom K. Okafor',
    category: 'Banking',
    verifiedSource: 'Student Profile',
  },
  {
    id: 'fact-family-sponsorship',
    label: 'Family & Sponsorship',
    value: 'Father late · Mother (Secondary School Teacher) sponsors tuition & hostel',
    category: 'Identity',
    verifiedSource: 'Student Profile',
  },
];

export const INITIAL_VAULT_DOCUMENTS: VaultDocument[] = [
  {
    id: 'vault-waec',
    title: "WAEC O'Level Result",
    category: 'Academic',
    fileName: 'WAEC_SSCE_Result_Chisom_Okafor.pdf',
    fileSize: '340 KB',
    updatedAt: '5 A1s, 3 B2s',
    status: 'ready',
    usedInCount: 3,
  },
  {
    id: 'vault-jamb-result',
    title: 'JAMB UTME Result Slip',
    category: 'Academic',
    fileName: 'JAMB_UTME_Result_308_Chisom.pdf',
    fileSize: '285 KB',
    updatedAt: 'Score: 308 / 400',
    status: 'ready',
    usedInCount: 3,
  },
  {
    id: 'vault-school-admission',
    title: 'University Admission Letter',
    category: 'Academic',
    fileName: 'UNN_Provisional_Admission_Letter.pdf',
    fileSize: '490 KB',
    updatedAt: 'B.Eng. Electrical Engineering, UNN',
    status: 'ready',
    usedInCount: 3,
  },
  {
    id: 'vault-jamb-admission',
    title: 'JAMB Admission Letter',
    category: 'Academic',
    fileName: 'JAMB_CAPS_Admission_Letter_Chisom.pdf',
    fileSize: '410 KB',
    updatedAt: 'JAMB CAPS Official Letter',
    status: 'ready',
    usedInCount: 3,
  },
  {
    id: 'vault-idcard',
    title: 'Departmental ID Card',
    category: 'Identity',
    fileName: 'UNN_Electrical_Dept_ID_Card.pdf',
    fileSize: '290 KB',
    updatedAt: 'Matric No: 2024/248912',
    status: 'ready',
    usedInCount: 3,
  },
  {
    id: 'vault-nin',
    title: 'NIN Slip',
    category: 'Identity',
    fileName: 'Chisom_Okafor_NIN.pdf',
    fileSize: '215 KB',
    updatedAt: 'National Identification Number',
    status: 'ready',
    usedInCount: 2,
  },
  {
    id: 'vault-passport',
    title: 'Passport Photograph',
    category: 'Identity',
    fileName: 'Chisom_Okafor_Passport.jpg',
    fileSize: '184 KB',
    updatedAt: 'White background',
    status: 'ready',
    usedInCount: 4,
  },
  {
    id: 'vault-transcript',
    title: '100L Result Sheet',
    category: 'Academic',
    fileName: 'UNN_100L_Compiled_Result_4.21.pdf',
    fileSize: '412 KB',
    updatedAt: 'CGPA: 4.21 / 5.00',
    status: 'ready',
    usedInCount: 4,
  },
  {
    id: 'vault-cv',
    title: 'Academic CV',
    category: 'Academic',
    fileName: 'Chisom_Okafor_Academic_CV.pdf',
    fileSize: '230 KB',
    updatedAt: 'Updated today',
    status: 'ready',
    usedInCount: 2,
  },
  {
    id: 'vault-indigene',
    title: 'LGA Certificate of Origin',
    category: 'Origin',
    fileName: 'Njikoka_LGA_Certificate.pdf',
    fileSize: '350 KB',
    updatedAt: 'Njikoka LGA, Anambra State',
    status: 'ready',
    usedInCount: 1,
  },
];

const DEFAULT_WRITING_ADDR =
  'Room 204, Kwame Nkrumah Hall, University of Nigeria, Nsukka';
const DEFAULT_HOD_ADDR =
  'Prof. E. C. Anene, HOD Electrical Engineering, Faculty of Engineering, UNN';

export const INITIAL_APPLICATIONS: CuratedApplication[] = [
  {
    id: 'app-shell-spdc',
    title: 'Shell SPDC University Scholarship',
    sponsor: 'Shell Nigeria (SPDC JV)',
    awardValue: '₦350,000 / yr',
    deadline: 'Nov 14',
    daysLeft: 16,
    portalUrl: 'https://scholarships.shell.com.ng',
    discoverySource: 'Curated for you',
    automationPolicy: 'end_to_end_auto',
    dryRunCompletedAt: 'Today, 8:15 AM',
    status: 'ready_to_submit',
    statusSummary: '6 of 6 items ready to submit',
    hardRules: [
      {
        id: 'hr-1',
        ruleLabel: 'Level & University',
        portalRequirement: '200L at Accredited Nigerian University',
        studentValue: '200L · UNN',
        passed: true,
      },
      {
        id: 'hr-2',
        ruleLabel: 'Minimum CGPA',
        portalRequirement: '3.50 / 5.00 required',
        studentValue: '4.21 / 5.00',
        passed: true,
      },
      {
        id: 'hr-3',
        ruleLabel: 'Course of Study',
        portalRequirement: 'Engineering or Applied Sciences',
        studentValue: 'Electrical Engineering',
        passed: true,
      },
    ],
    orderedItems: [
      {
        id: 'shell-item-1',
        orderIndex: 1,
        type: 'document',
        title: 'Passport Photograph',
        portalFieldLabel: 'Recent passport photograph (white background)',
        status: 'ready',
        vaultDocId: 'vault-passport',
      },
      {
        id: 'shell-item-2',
        orderIndex: 2,
        type: 'document',
        title: 'University Admission Letter',
        portalFieldLabel: 'Official university provisional admission letter (PDF)',
        status: 'ready',
        vaultDocId: 'vault-school-admission',
      },
      {
        id: 'shell-item-3',
        orderIndex: 3,
        type: 'document',
        title: 'JAMB Admission Letter',
        portalFieldLabel: 'JAMB admission letter (PDF)',
        status: 'ready',
        vaultDocId: 'vault-jamb-admission',
      },
      {
        id: 'shell-item-4',
        orderIndex: 4,
        type: 'document',
        title: '100L Result Sheet',
        portalFieldLabel: 'Signed 100 Level result sheet (4.21 CGPA)',
        status: 'ready',
        vaultDocId: 'vault-transcript',
      },
      {
        id: 'shell-item-5',
        orderIndex: 5,
        type: 'writeup',
        title: 'Personal Statement',
        portalFieldLabel: 'Academic achievements & career goals (Max 250 words)',
        status: 'ready',
        writeupWordLimit: 250,
        writeupPrompt:
          'Describe your academic achievements in your first year at university and how a degree in Electrical Engineering aligns with Nigeria’s energy transition.',
        writeupContent:
          'Completing my 100 Level in Electrical Engineering at the University of Nigeria, Nsukka with a 4.21/5.00 CGPA after scoring 308 in the JAMB UTME reinforced my commitment to power-systems engineering. Growing up in Njikoka, Anambra State, where unstable grid distribution frequently forced local clinics and workshops onto costly diesel generators, I saw firsthand how energy reliability shapes community productivity.\n\nIn my first-year engineering laboratory modules, I ranked in the top 5% of my cohort while designing low-loss transformer winding models and micro-grid load-balancing simulations. With the Shell SPDC JV Scholarship, I will dedicate my 200-level coursework and holiday research entirely to embedded metering and distributed solar-hybrid grid protection.',
      },
      {
        id: 'shell-item-6',
        orderIndex: 6,
        type: 'document',
        title: 'Departmental ID Card',
        portalFieldLabel: 'Valid school, departmental, or library ID card',
        status: 'ready',
        vaultDocId: 'vault-idcard',
      },
    ],
    chatTurns: [
      {
        id: 'turn-shell-1',
        sender: 'artrat',
        collapsibleTitle: 'Prepared 6 of 6 required items in order for Shell SPDC',
        collapsibleBullets: [
          '1. Passport Photograph',
          '2. University Admission Letter',
          '3. JAMB Admission Letter',
          '4. 100L Result Sheet (4.21 CGPA)',
          '5. Personal Statement (126 / 250 words)',
          '6. Departmental ID Card',
        ],
        text: 'I have prepared your 5 required documents and your 250-word personal statement in the order required by Shell SPDC. Tap the statement to edit it in Canvas, or replace any document before we submit.',
        timestamp: '8:15 AM',
      },
    ],
  },
  {
    id: 'app-nnpc-total',
    title: 'NNPC / TotalEnergies Merit Scholarship',
    sponsor: 'TotalEnergies & NNPC',
    awardValue: '₦200,000 / yr',
    deadline: 'Nov 16',
    daysLeft: 18,
    portalUrl: 'https://csr-ng.totalenergies.com',
    discoverySource: 'Curated for you',
    automationPolicy: 'end_to_end_auto',
    dryRunCompletedAt: 'Yesterday',
    status: 'waiting_on_document',
    statusSummary: 'HOD letter drafted · Needs HOD signature',
    hardRules: [
      {
        id: 'hr-tot-1',
        ruleLabel: 'Academic Level',
        portalRequirement: '100L or 200L Full-Time',
        studentValue: '200L · UNN',
        passed: true,
      },
      {
        id: 'hr-tot-2',
        ruleLabel: 'Minimum CGPA',
        portalRequirement: '2.50 / 5.00 required',
        studentValue: '4.21 / 5.00',
        passed: true,
      },
    ],
    orderedItems: [
      {
        id: 'tot-item-1',
        orderIndex: 1,
        type: 'document',
        title: 'Passport Photograph',
        portalFieldLabel: 'Recent passport photo',
        status: 'ready',
        vaultDocId: 'vault-passport',
      },
      {
        id: 'tot-item-2',
        orderIndex: 2,
        type: 'document',
        title: 'LGA Certificate of Origin',
        portalFieldLabel: 'Local government certificate of origin',
        status: 'ready',
        vaultDocId: 'vault-indigene',
      },
      {
        id: 'tot-item-3',
        orderIndex: 3,
        type: 'document',
        title: '100L Statement of Result',
        portalFieldLabel: 'Signed 100L result sheet',
        status: 'ready',
        vaultDocId: 'vault-transcript',
      },
      {
        id: 'tot-item-4',
        orderIndex: 4,
        type: 'writeup',
        title: 'Statement of Financial Need & Purpose',
        portalFieldLabel: 'Why you should be selected (Max 200 words)',
        status: 'ready',
        writeupWordLimit: 200,
        writeupPrompt:
          'Explain how the NNPC/TotalEnergies Merit Award will support your university studies.',
        writeupContent:
          'As a 17-year-old 200 Level Electrical Engineering student at the University of Nigeria, Nsukka maintaining a 4.21/5.00 CGPA, my focus is mastering power electronics and industrial instrumentation. Receiving the NNPC/TotalEnergies National Merit Scholarship of ₦200,000 per year will directly cover my laboratory components, circuit simulation licences, and hostel accommodation in Nsukka.',
      },
      {
        id: 'tot-item-5',
        orderIndex: 5,
        type: 'missing_requirement',
        title: 'Signed HOD Letter of Good Standing',
        recipientRoleLabel: 'HOD / Signatory Recipient Address',
        portalFieldLabel:
          'Requested by this scholarship — Artrat drafted your letter below to print, get signed, and upload',
        status: 'action_required',
        draftFileName: 'Chisom_Okafor_UNN_HOD_Letter_Draft.pdf',
        studentWritingAddress: DEFAULT_WRITING_ADDR,
        hodRecipientAddress: DEFAULT_HOD_ADDR,
        writeupWordLimit: 250,
        writeupPrompt:
          'Formal HOD Letter of Good Standing structured with your writing address and your HOD recipient address.',
        writeupContent: buildHodLetterDraft(
          DEFAULT_WRITING_ADDR,
          DEFAULT_HOD_ADDR
        ),
        googleTaskTitle:
          'Print drafted HOD letter, get Prof. Anene signature & upload scan',
        googleCalendarSlot: 'Daily 9:30 AM & 2:00 PM reminder in Google Tasks',
      },
    ],
    chatTurns: [
      {
        id: 'turn-tot-1',
        sender: 'artrat',
        collapsibleTitle:
          '4 items ready · Drafted your HOD Letter for signature (Item 5)',
        collapsibleBullets: [
          '1. Passport Photograph (from Vault)',
          '2. LGA Certificate of Origin (from Vault)',
          '3. 100L Statement of Result (from Vault)',
          '4. Statement of Financial Need & Purpose (ready in Canvas)',
          '5. HOD Letter of Good Standing (drafted with your UNN address — download, get signed, and upload)',
        ],
        text: 'I have prepared your first 4 items and drafted your formal HOD Letter of Good Standing using your writing address and HOD recipient address. You can update either address, download the PDF to take to your HOD for signature, and upload the signed scan here.',
        timestamp: '9:30 AM',
      },
    ],
  },
  {
    id: 'app-mtn-stem',
    title: 'MTN Science & Technology Scholarship',
    sponsor: 'MTN Foundation',
    awardValue: '₦300,000 / yr',
    deadline: 'Nov 22',
    daysLeft: 24,
    portalUrl: 'https://scholarships.mtn.ng',
    discoverySource: 'Curated for you',
    automationPolicy: 'end_to_end_auto',
    dryRunCompletedAt: '2 days ago',
    status: 'ready_to_submit',
    statusSummary: '4 of 4 items ready to submit',
    hardRules: [
      {
        id: 'hr-mtn-1',
        ruleLabel: 'Course of Study',
        portalRequirement: 'Accredited STEM Degree',
        studentValue: 'Electrical Engineering',
        passed: true,
      },
      {
        id: 'hr-mtn-2',
        ruleLabel: 'Minimum CGPA',
        portalRequirement: '3.50 / 5.00 required',
        studentValue: '4.21 / 5.00',
        passed: true,
      },
    ],
    orderedItems: [
      {
        id: 'mtn-item-1',
        orderIndex: 1,
        type: 'document',
        title: 'Passport Photograph',
        portalFieldLabel: 'Passport photograph',
        status: 'ready',
        vaultDocId: 'vault-passport',
      },
      {
        id: 'mtn-item-2',
        orderIndex: 2,
        type: 'document',
        title: 'National Identification Slip (NIN)',
        portalFieldLabel: 'Verified NIN slip',
        status: 'ready',
        vaultDocId: 'vault-nin',
      },
      {
        id: 'mtn-item-3',
        orderIndex: 3,
        type: 'document',
        title: '100L Statement of Result',
        portalFieldLabel: 'Official 100L result sheet',
        status: 'ready',
        vaultDocId: 'vault-transcript',
      },
      {
        id: 'mtn-item-4',
        orderIndex: 4,
        type: 'writeup',
        title: 'STEM Community Impact Essay',
        portalFieldLabel:
          'How your STEM degree will solve a local problem (Max 300 words)',
        status: 'ready',
        writeupWordLimit: 300,
        writeupPrompt:
          'Describe a practical engineering challenge in your community and how your STEM education equips you to solve it.',
        writeupContent:
          'Across student hostels and small businesses in Nsukka and Anambra State, voltage fluctuations and phase imbalances routinely damage medical refrigeration and ICT equipment. Through my Electrical Engineering training at the University of Nigeria, Nsukka (where I hold a 4.21/5.00 CGPA), I am developing an affordable microcontroller-based automatic phase selector and surge isolator tailored for local distribution lines.\n\nThe MTN Foundation Science & Technology Scholarship will fund my prototype hardware components and academic fees through graduation.',
      },
    ],
    chatTurns: [
      {
        id: 'turn-mtn-1',
        sender: 'artrat',
        collapsibleTitle: 'Prepared 4 of 4 required items in order for MTN STEM',
        collapsibleBullets: [
          '1. Passport Photograph (from Vault)',
          '2. National Identification Slip — NIN (from Vault)',
          '3. 100L Statement of Result — 4.21 CGPA (from Vault)',
          '4. STEM Community Impact Essay — 88 / 300 words (editable in Canvas)',
        ],
        text: 'All 4 items for the MTN Science & Technology Scholarship are ready in order. Review your essay or tap Submit whenever you are ready.',
        timestamp: '2 days ago',
      },
    ],
  },
  // Disqualified application shown in the "Didn't Meet Standards (Wipes to History after 7d)" section below active applications
  {
    id: 'app-agbami-ineligible',
    title: 'Agbami Medical & Engineering Award',
    sponsor: 'Star Deep Water & Agbami Parties',
    awardValue: '₦400,000 / yr',
    deadline: 'Nov 30',
    daysLeft: 32,
    portalUrl: 'https://scholastica.ng/schemes/agbami-2026',
    discoverySource: 'From link you shared',
    automationPolicy: 'end_to_end_auto',
    dryRunCompletedAt: 'Yesterday',
    status: 'not_eligible',
    statusSummary: 'Requires First Class (4.50 CGPA)',
    disqualificationReason:
      'Requires First Class Honours (4.50 / 5.00 minimum CGPA). Your current CGPA is 4.21 (Second Class Upper).',
    daysUntilHistoryWipe: 6,
    hardRules: [
      {
        id: 'hr-agb-1',
        ruleLabel: 'Course of Study',
        portalRequirement: 'Engineering or Medicine',
        studentValue: 'Electrical Engineering',
        passed: true,
      },
      {
        id: 'hr-agb-2',
        ruleLabel: 'Minimum CGPA',
        portalRequirement: '4.50 / 5.00 (First Class) required',
        studentValue: '4.21 / 5.00 (2.1)',
        passed: false,
      },
    ],
    orderedItems: [],
    chatTurns: [
      {
        id: 'turn-agb-0',
        sender: 'student',
        text: 'https://scholastica.ng/schemes/agbami-2026 please work on this for me',
        timestamp: 'Yesterday, 6:11 PM',
      },
      {
        id: 'turn-agb-1',
        sender: 'artrat',
        collapsibleTitle:
          'Not eligible: Requires First Class 4.50 CGPA (Wipes to History in 6 days)',
        collapsibleBullets: [
          'Passed: 200L Electrical Engineering at UNN',
          'Passed: All 5 supporting documents available in Vault',
          'Did not meet standard: Portal strictly requires 4.50 / 5.00 CGPA (you have 4.21)',
        ],
        text: 'I checked Agbami Medical & Engineering. Even though you have all the required documents, the portal strictly requires a First Class CGPA of at least 4.50 / 5.00. Because your CGPA is 4.21 (Second Class Upper), you do not meet the requirement.\n\nThis chat sits below your active applications for 7 days so you can review it, and then automatically wipes into your History. I also matched you with similar scholarships that accept 2.1 Honours (3.50+ CGPA).',
        timestamp: 'Yesterday, 6:12 PM',
      },
    ],
  },
];

export const INITIAL_HISTORY_THREADS: GeneralHistoryThread[] = [
  {
    id: 'hist-ptdf-wiped',
    title: 'PTDF Undergraduate & Postgrad Award',
    subtitle:
      'Did not meet standard (Federal Oil-Producing State requirement) · Auto-wiped after 7 days',
    updatedAt: '8 days ago',
    kind: 'link_drop_disqualified',
    portalUrl: 'https://scholarship.ptdf.gov.ng',
    outcomeBadge: 'Wiped after 7d',
    outcomeColor: 'red',
    wipedAfterDays: 7,
    messages: [
      {
        id: 'm-ptdf-1',
        sender: 'student',
        text: 'https://scholarship.ptdf.gov.ng can you prepare this one?',
        timestamp: '8 days ago',
      },
      {
        id: 'm-ptdf-2',
        sender: 'artrat',
        text: 'I checked this PTDF category and verified your requirements. It is restricted to 300 Level students and postgraduate applicants, whereas you are in 200 Level. After sitting below your Applications list for 7 days, this chat was automatically archived here in your History.',
        timestamp: '8 days ago',
      },
    ],
  },
  {
    id: 'hist-nlng',
    title: 'NLNG Undergraduate Scholarship',
    subtitle:
      'For 100 Level students only · Matched you with NNPC / TotalEnergies (200L)',
    updatedAt: '9 days ago',
    kind: 'link_drop_disqualified',
    portalUrl: 'https://nlng.com/undergraduate-scholarship-2026',
    outcomeBadge: '100L Only · Wiped after 7d',
    outcomeColor: 'purple',
    wipedAfterDays: 7,
    messages: [
      {
        id: 'm3',
        sender: 'student',
        text: 'https://nlng.com/undergraduate-scholarship-2026',
        timestamp: '9 days ago',
      },
      {
        id: 'm4',
        sender: 'artrat',
        text: 'NLNG Undergraduate only accepts 100 Level students, and you are currently in 200 Level. I matched you with the NNPC / TotalEnergies Merit Award instead, which accepts 200 Level students.',
        timestamp: '9 days ago',
      },
    ],
  },
];
