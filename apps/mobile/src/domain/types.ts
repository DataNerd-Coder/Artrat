export type DocumentStatus = 'ready' | 'missing' | 'removed';

export interface VaultDocument {
  id: string;
  title: string;
  category: 'Academic' | 'Identity' | 'Origin' | 'Financial' | 'Endorsement';
  fileName: string;
  fileSize: string;
  updatedAt: string;
  status: DocumentStatus;
  usedInCount: number;
  versionNote?: string;
}

export interface ProfileFact {
  id: string;
  label: string;
  value: string;
  category: 'Academic' | 'Identity' | 'Origin' | 'Banking' | 'Addressing';
  verifiedSource: string;
}

export interface HardRuleCheck {
  id: string;
  ruleLabel: string;
  portalRequirement: string;
  studentValue: string;
  passed: boolean;
}

export type ApplicationItemType =
  | 'document'
  | 'writeup'
  | 'missing_requirement';

export interface OrderedApplicationItem {
  id: string;
  orderIndex: number;
  type: ApplicationItemType;
  title: string;
  portalFieldLabel: string;
  status: 'ready' | 'action_required' | 'updated';
  vaultDocId?: string;
  writeupContent?: string;
  writeupWordLimit?: number;
  writeupPrompt?: string;
  groundedFacts?: string[];
  googleTaskTitle?: string;
  googleCalendarSlot?: string;
  lastReminderTriggered?: string;
  externalCheckoffCount?: number;
  // Drafted Endorsement / Referee / Attestation Letter fields
  recipientRoleLabel?: string;
  draftFileName?: string;
  studentWritingAddress?: string;
  hodRecipientAddress?: string;
}

export interface ChatTurn {
  id: string;
  sender: 'artrat' | 'student';
  text: string;
  timestamp: string;
  badge?: string;
  collapsibleTitle?: string;
  collapsibleBullets?: string[];
}

export interface CuratedApplication {
  id: string;
  title: string;
  sponsor: string;
  awardValue: string;
  deadline: string;
  daysLeft: number;
  portalUrl: string;
  discoverySource: string;
  automationPolicy: 'end_to_end_auto' | 'assisted_handoff';
  dryRunCompletedAt: string;
  hardRules: HardRuleCheck[];
  status:
    | 'ready_to_submit'
    | 'waiting_on_document'
    | 'submitted'
    | 'not_eligible';
  statusSummary: string;
  disqualificationReason?: string;
  daysUntilHistoryWipe?: number;
  orderedItems: OrderedApplicationItem[];
  chatTurns: ChatTurn[];
  submissionReceiptId?: string;
}

export interface GeneralHistoryThread {
  id: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  kind: 'link_drop_qualified' | 'link_drop_disqualified' | 'vault_command';
  portalUrl?: string;
  outcomeBadge: string;
  outcomeColor: 'green' | 'red' | 'purple';
  linkedApplicationId?: string;
  wipedAfterDays?: number;
  messages: {
    id: string;
    sender: 'student' | 'artrat';
    text: string;
    timestamp: string;
  }[];
}
