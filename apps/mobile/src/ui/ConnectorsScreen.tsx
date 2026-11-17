import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderArchive,
  Mail,
  Upload,
} from './icons';
import { CuratedApplication } from '../domain/types';

interface ConnectorsScreenProps {
  applications: CuratedApplication[];
  onOpenApplication: (appId: string) => void;
  onUploadMissingDoc: (appId: string, itemId: string) => void;
  onSimulateExternalCheckoff: (appId: string, itemId: string) => void;
}

export const ConnectorsScreen: React.FC<ConnectorsScreenProps> = ({
  applications,
  onOpenApplication,
  onUploadMissingDoc,
  onSimulateExternalCheckoff,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  const pendingReminders = applications.flatMap((app) =>
    app.orderedItems
      .filter((item) => item.type === 'missing_requirement')
      .map((item) => ({ app, item }))
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isDesktop && styles.contentDesktop,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Reminders & Google Workspace</Text>
        <Text style={styles.pageSubtitle}>
          When an application requires a physical signature or missing document, Artrat schedules recurring reminders in your Google Tasks and Google Calendar until the file is uploaded in-app.
        </Text>
      </View>

      {/* Section 1: Active Document Reminders */}
      <View style={[styles.twoColSection, !isDesktop && styles.twoColMobile]}>
        <View style={[styles.labelColumn, !isDesktop && styles.labelColumnMobile]}>
          <Text style={styles.sectionHeading}>Active document reminders</Text>
          <Text style={styles.sectionDescription}>
            Checking a task off externally in Google Tasks without uploading the document in Artrat will automatically re-open the task so you never miss a deadline.
          </Text>
        </View>

        <View style={styles.panelColumn}>
          {pendingReminders.map(({ app, item }) => {
            const isPending = item.status === 'action_required';
            return (
              <View key={item.id} style={styles.reminderCard}>
                <View style={styles.reminderTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sponsorLabel}>{app.title}</Text>
                    <Text style={styles.reminderTitle}>{item.title}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      isPending ? styles.statusPillAmber : styles.statusPillGreen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isPending
                          ? styles.statusPillTextAmber
                          : styles.statusPillTextGreen,
                      ]}
                    >
                      {isPending ? 'Recurring in Google Tasks' : 'Uploaded & closed'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.portalDesc}>{item.portalFieldLabel}</Text>

                <View style={styles.metaStack}>
                  <View style={styles.metaLine}>
                    <Clock size={14} color="#6E6A7C" />
                    <Text style={styles.metaText}>
                      Task: {item.googleTaskTitle}
                    </Text>
                  </View>
                  <View style={styles.metaLine}>
                    <CalendarClock size={14} color="#6E6A7C" />
                    <Text style={styles.metaText}>
                      Schedule: {item.googleCalendarSlot}
                    </Text>
                  </View>
                </View>

                {isPending &&
                item.externalCheckoffCount &&
                item.externalCheckoffCount > 0 ? (
                  <View style={styles.guardNotice}>
                    <Text style={styles.guardNoticeText}>
                      Re-triggered {item.externalCheckoffCount} time(s) after external check-off in Google Tasks (document still required in-app).
                    </Text>
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  {isPending ? (
                    <>
                      <Pressable
                        style={styles.primaryBtn}
                        onPress={() => onUploadMissingDoc(app.id, item.id)}
                      >
                        <Upload size={14} color="#FFFFFF" />
                        <Text style={styles.primaryBtnText}>
                          Upload signed document
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.secondaryBtn}
                        onPress={() =>
                          onSimulateExternalCheckoff(app.id, item.id)
                        }
                      >
                        <ExternalLink size={13} color="#4A4558" />
                        <Text style={styles.secondaryBtnText}>
                          Simulate external check-off
                        </Text>
                      </Pressable>
                    </>
                  ) : null}

                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() => onOpenApplication(app.id)}
                  >
                    <Text style={styles.secondaryBtnText}>
                      Open application chat
                    </Text>
                    <ArrowRight size={13} color="#171426" />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Section 2: Connected Google Accounts */}
      <View style={[styles.twoColSection, !isDesktop && styles.twoColMobile]}>
        <View style={[styles.labelColumn, !isDesktop && styles.labelColumnMobile]}>
          <Text style={styles.sectionHeading}>Connected Google Workspace</Text>
          <Text style={styles.sectionDescription}>
            Linked to chisom.okafor.248912@unn.edu.ng for task reminders, deadline blocks, portal OTP reading, and receipt backups.
          </Text>
        </View>

        <View style={styles.panelColumn}>
          <View style={styles.connectorRow}>
            <View style={styles.connectorLeft}>
              <Clock size={16} color="#5B21B6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.connectorName}>Google Tasks</Text>
                <Text style={styles.connectorDesc}>
                  Keeps missing-signature tasks active until the file is uploaded in Artrat.
                </Text>
              </View>
            </View>
            <View style={styles.connectedBadge}>
              <CheckCircle2 size={13} color="#15803D" />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>

          <View style={styles.connectorRow}>
            <View style={styles.connectorLeft}>
              <CalendarClock size={16} color="#5B21B6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.connectorName}>Google Calendar</Text>
                <Text style={styles.connectorDesc}>
                  Blocks morning and afternoon campus visit slots before portal deadlines.
                </Text>
              </View>
            </View>
            <View style={styles.connectedBadge}>
              <CheckCircle2 size={13} color="#15803D" />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>

          <View style={styles.connectorRow}>
            <View style={styles.connectorLeft}>
              <Mail size={16} color="#5B21B6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.connectorName}>Gmail Verification Reader</Text>
                <Text style={styles.connectorDesc}>
                  Reads scholarship portal verification links and submission receipts.
                </Text>
              </View>
            </View>
            <View style={styles.connectedBadge}>
              <CheckCircle2 size={13} color="#15803D" />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>

          <View style={styles.connectorRow}>
            <View style={styles.connectorLeft}>
              <FolderArchive size={16} color="#5B21B6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.connectorName}>Google Drive Vault Backup</Text>
                <Text style={styles.connectorDesc}>
                  Backs up your submitted application packages and portal receipts.
                </Text>
              </View>
            </View>
            <View style={styles.connectedBadge}>
              <CheckCircle2 size={13} color="#15803D" />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 48,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingHorizontal: 36,
    paddingTop: 36,
  },
  pageHeader: {
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#171426',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6E6A7C',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 680,
  },
  twoColSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },
  twoColMobile: {
    flexDirection: 'column',
    gap: 14,
  },
  labelColumn: {
    width: 320,
    paddingTop: 4,
  },
  labelColumnMobile: {
    width: '100%',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171426',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6E6A7C',
    marginTop: 6,
    lineHeight: 19,
  },
  panelColumn: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F1EEF8',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E6E1F2',
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6E1F0',
    gap: 10,
  },
  reminderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sponsorLabel: {
    fontSize: 12,
    color: '#6E6A7C',
    marginBottom: 2,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171426',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillAmber: {
    backgroundColor: '#FEF3C7',
  },
  statusPillGreen: {
    backgroundColor: '#DCFCE7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusPillTextAmber: {
    color: '#B45309',
  },
  statusPillTextGreen: {
    color: '#15803D',
  },
  portalDesc: {
    fontSize: 13,
    color: '#4A4558',
  },
  metaStack: {
    gap: 5,
    paddingTop: 4,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6E6A7C',
  },
  guardNotice: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  guardNoticeText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#171426',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F0FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#171426',
  },
  divider: {
    height: 1,
    backgroundColor: '#E6E1F0',
    marginVertical: 32,
  },
  connectorRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6E1F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  connectorLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  connectorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171426',
  },
  connectorDesc: {
    fontSize: 12,
    color: '#6E6A7C',
    marginTop: 2,
    lineHeight: 17,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#15803D',
  },
});
