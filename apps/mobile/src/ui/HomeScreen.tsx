import React from 'react';
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
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  Upload,
} from './icons';
import {
  CuratedApplication,
  OrderedApplicationItem,
  ProfileFact,
  VaultDocument,
} from '../domain/types';
import { ArtratBot3D } from './ArtratBot3D';

interface HomeScreenProps {
  applications: CuratedApplication[];
  vaultDocs: VaultDocument[];
  profileFacts: ProfileFact[];
  onOpenApplication: (appId: string) => void;
  onNavigateTab: (tab: 'home' | 'applications' | 'tasks' | 'vault') => void;
  onUploadMissingDocFromHome: (appId: string, itemId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  applications,
  onOpenApplication,
  onNavigateTab,
  onUploadMissingDocFromHome,
}) => {
  const { width } = useWindowDimensions();
  const isTwoCol = width >= 840;

  const readyApps = applications.filter((a) => a.status === 'ready_to_submit');
  const waitingApps = applications.filter(
    (a) => a.status === 'waiting_on_document'
  );
  const submittedApps = applications.filter((a) => a.status === 'submitted');
  const totalTasksCount = readyApps.length + waitingApps.length;

  const handleDownloadDraft = (item: OrderedApplicationItem) => {
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
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isTwoCol && styles.contentWide,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Lavender Hero Banner with Floating 3D Mascot */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextCol}>
            <View style={styles.studentBadge}>
              <Text style={styles.studentBadgeText}>
                UNN · 200L Electrical Eng
              </Text>
            </View>

            <Text accessibilityRole="header" style={styles.heroGreeting}>
              Hi Chisom
            </Text>

            <Text style={styles.heroSubtitle}>
              {waitingApps.length > 0
                ? `${readyApps.length} scholarships are ready for you to submit. Artrat has also drafted your HOD letter for signature.`
                : `All ${readyApps.length + submittedApps.length} of your eligible scholarships are ready to submit.`}
            </Text>
          </View>

          <View style={styles.mascotFloat}>
            <ArtratBot3D
              mood={waitingApps.length > 0 ? 'radar' : 'happy'}
              size={isTwoCol ? 'lg' : 'md'}
            />
          </View>
        </View>

        {/* Clean 3-Stat Pill Strip */}
        <View style={styles.statsStrip}>
          <Pressable
            style={styles.statCell}
            onPress={() => onNavigateTab('applications')}
          >
            <Text style={styles.statNumber}>{readyApps.length}</Text>
            <Text style={styles.statLabel}>Ready to submit</Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statCell}
            onPress={() => onNavigateTab('tasks')}
          >
            <Text
              style={[
                styles.statNumber,
                totalTasksCount > 0 && styles.statNumberCoral,
              ]}
            >
              {totalTasksCount}
            </Text>
            <Text style={styles.statLabel}>Open tasks</Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statCell}
            onPress={() => onNavigateTab('applications')}
          >
            <Text style={styles.statNumber}>₦850k</Text>
            <Text style={styles.statLabel}>Total value</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Responsive Grid: Stacked on Mobile, 2 Columns on Wide Screens */}
      <View style={[styles.columnsWrap, isTwoCol && styles.columnsWrapWide]}>
        {/* Needs Your Action Section (With Refined Warm Orange Header Strip) */}
        {waitingApps.length > 0 ? (
          <View style={[styles.sectionBlock, isTwoCol && styles.colHalf]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Needs your signature</Text>
              <Pressable onPress={() => onNavigateTab('tasks')}>
                <Text style={styles.seeAllLink}>Open in Tasks</Text>
              </Pressable>
            </View>

            {waitingApps.map((app) => {
              const missingItem = app.orderedItems.find(
                (i) =>
                  i.type === 'missing_requirement' &&
                  i.status === 'action_required'
              );
              return (
                <View key={app.id} style={styles.actionCard}>
                  {/* Refined Warm Terracotta-Orange Strip at Top of Card */}
                  {missingItem ? (
                    <View style={styles.orangeBannerStrip}>
                      <View style={styles.orangeDot} />
                      <Clock size={14} color="#C2410C" />
                      <Text
                        style={styles.orangeBannerText}
                        numberOfLines={1}
                      >
                        HOD Letter Drafted · Needs Signature
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.actionCardBody}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sponsorText}>{app.sponsor}</Text>
                        <Text style={styles.cardTitle}>{app.title}</Text>
                      </View>
                      <View style={styles.awardPill}>
                        <Text style={styles.awardPillText}>
                          {app.awardValue}
                        </Text>
                      </View>
                    </View>

                    {missingItem ? (
                      <View style={styles.missingDetailsBlock}>
                        <Text style={styles.missingDesc}>
                          Artrat formatted your{' '}
                          <Text style={styles.missingBold}>
                            {missingItem.title}
                          </Text>{' '}
                          with your UNN writing address and HOD recipient address. Download the draft for your HOD to sign & stamp, then upload the scan.
                        </Text>

                        <View style={styles.reminderTag}>
                          <CalendarClock size={13} color="#5B21B6" />
                          <Text style={styles.reminderTagText}>
                            {missingItem.googleCalendarSlot}
                          </Text>
                        </View>

                        <View style={styles.homeActionStack}>
                          <View style={styles.homeSecondaryPair}>
                            <Pressable
                              style={styles.secondarySoftBtn}
                              onPress={() => handleDownloadDraft(missingItem)}
                            >
                              <Download size={14} color="#4C1D95" />
                              <Text
                                style={styles.secondarySoftBtnText}
                                numberOfLines={1}
                              >
                                Download PDF
                              </Text>
                            </Pressable>

                            <Pressable
                              style={styles.secondarySoftBtn}
                              onPress={() => onOpenApplication(app.id)}
                            >
                              <Text
                                style={styles.secondarySoftBtnText}
                                numberOfLines={1}
                              >
                                Open Chat
                              </Text>
                              <ArrowRight size={13} color="#4C1D95" />
                            </Pressable>
                          </View>

                          <Pressable
                            style={styles.primaryVioletBtn}
                            onPress={() =>
                              onUploadMissingDocFromHome(app.id, missingItem.id)
                            }
                          >
                            <Upload size={14} color="#FFFFFF" />
                            <Text style={styles.primaryVioletBtnText}>
                              Upload Signed Letter
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Ready to Review & Submit Section */}
        <View style={[styles.sectionBlock, isTwoCol && styles.colHalf]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ready for you to submit</Text>
            <Pressable onPress={() => onNavigateTab('applications')}>
              <Text style={styles.seeAllLink}>See all</Text>
            </Pressable>
          </View>

          <View style={styles.cardsStack}>
            {[...readyApps, ...submittedApps].map((app) => (
              <Pressable
                key={app.id}
                style={styles.readyCard}
                onPress={() => onOpenApplication(app.id)}
              >
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sponsorText}>{app.sponsor}</Text>
                    <Text style={styles.cardTitle}>{app.title}</Text>
                  </View>
                  <View style={styles.awardPill}>
                    <Text style={styles.awardPillText}>{app.awardValue}</Text>
                  </View>
                </View>

                <View style={styles.readyCardBottom}>
                  <View style={styles.readyStatusRow}>
                    {app.status === 'submitted' ? (
                      <>
                        <FileCheck2 size={15} color="#047857" />
                        <Text style={styles.readyStatusText}>Submitted</Text>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} color="#047857" />
                        <Text style={styles.readyStatusText}>
                          {app.statusSummary} · Due {app.deadline}
                        </Text>
                      </>
                    )}
                  </View>

                  <View style={styles.openArrowCircle}>
                    <ArrowRight size={15} color="#5B21B6" />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
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
    paddingTop: 14,
    paddingBottom: 32,
    gap: 20,
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
  },
  contentWide: {
    paddingHorizontal: 28,
    paddingTop: 22,
  },
  heroCard: {
    backgroundColor: '#ECE4FC',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DDD0F8',
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTextCol: {
    flex: 1,
    gap: 5,
  },
  studentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  studentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  heroGreeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#161126',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3D3356',
    maxWidth: 540,
  },
  mascotFloat: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#EAE4F8',
  },
  statNumber: {
    fontSize: 19,
    fontWeight: '700',
    color: '#161126',
    fontVariant: ['tabular-nums'],
  },
  statNumberCoral: {
    color: '#C2410C',
  },
  statLabel: {
    fontSize: 12,
    color: '#4E4466',
    fontWeight: '500',
  },
  columnsWrap: {
    gap: 20,
  },
  columnsWrapWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  colHalf: {
    flex: 1,
  },
  sectionBlock: {
    gap: 10,
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
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B21B6',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    overflow: 'hidden',
  },
  orangeBannerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  orangeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EA580C',
  },
  orangeBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
    flex: 1,
  },
  actionCardBody: {
    padding: 15,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  sponsorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4E4466',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161126',
    lineHeight: 21,
  },
  awardPill: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  awardPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4C1D95',
    fontVariant: ['tabular-nums'],
  },
  missingDetailsBlock: {
    backgroundColor: '#FAF8FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAE3F8',
    gap: 8,
  },
  missingDesc: {
    fontSize: 13,
    color: '#4E4466',
    lineHeight: 18,
  },
  missingBold: {
    fontWeight: '700',
    color: '#161126',
  },
  reminderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  homeActionStack: {
    gap: 8,
    marginTop: 2,
  },
  homeSecondaryPair: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryVioletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6D28D9',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  primaryVioletBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondarySoftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EDE5FF',
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondarySoftBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C1D95',
  },
  cardsStack: {
    gap: 10,
  },
  readyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 12,
  },
  readyCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2EEFC',
  },
  readyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  readyStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  openArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
