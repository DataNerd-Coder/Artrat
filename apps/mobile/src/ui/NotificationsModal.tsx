import React from 'react';
import {
  Modal,
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
  KeyRound,
  X,
} from './icons';
import { CuratedApplication } from '../domain/types';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  tag: string;
  kind: 'reminder' | 'ready' | 'otp' | 'ineligible';
  unread: boolean;
  targetAppId?: string;
  targetTab?: 'home' | 'applications' | 'tasks' | 'vault';
}

interface NotificationsModalProps {
  visible: boolean;
  applications: CuratedApplication[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onClose: () => void;
  onSelectApplication: (appId: string) => void;
  onSelectTab: (tab: 'home' | 'applications' | 'tasks' | 'vault') => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  applications,
  unreadCount,
  onMarkAllRead,
  onClose,
  onSelectApplication,
  onSelectTab,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 840;

  const waitingApp = applications.find(
    (a) => a.status === 'waiting_on_document'
  );
  const readyApps = applications.filter((a) => a.status === 'ready_to_submit');
  const ineligibleApp = applications.find((a) => a.status === 'not_eligible');

  const items: AppNotification[] = [
    ...(waitingApp
      ? [
          {
            id: 'notif-sign',
            title: `${waitingApp.title} · Signature Pending`,
            body: `Artrat drafted your required endorsement letter. Google Tasks will remind you at 9:30 AM & 2:00 PM until you upload the signed scan.`,
            time: '25m ago',
            tag: 'Google Tasks',
            kind: 'reminder' as const,
            unread: unreadCount > 0,
            targetTab: 'tasks' as const,
          },
        ]
      : []),
    ...readyApps.slice(0, 2).map((app, i) => ({
      id: `notif-ready-${app.id}`,
      title: `Prepared in Order: ${app.title}`,
      body: `Artrat verified all ${app.orderedItems.length} required items against your Vault (${app.awardValue}). Ready for your review before ${app.deadline}.`,
      time: i === 0 ? '2h ago' : 'Yesterday',
      tag: 'Ready to Submit',
      kind: 'ready' as const,
      unread: i === 0 && unreadCount > 0,
      targetAppId: app.id,
    })),
    ...(ineligibleApp
      ? [
          {
            id: 'notif-ineligible',
            title: `${ineligibleApp.title} · Placed Below`,
            body: `${ineligibleApp.statusSummary}. Moved below your active applications and will automatically wipe to History in ${
              ineligibleApp.daysUntilHistoryWipe ?? 6
            } days.`,
            time: 'Yesterday',
            tag: '7-Day Wipe',
            kind: 'ineligible' as const,
            unread: false,
            targetAppId: ineligibleApp.id,
          },
        ]
      : []),
  ];

  return (
    <Modal
      visible={visible}
      animationType={isDesktop ? 'fade' : 'slide'}
      transparent
    >
      <Pressable
        style={[styles.backdrop, isDesktop && styles.backdropDesktop]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.dialog, isDesktop && styles.dialogDesktop]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Mobile Handle Indicator */}
          {!isDesktop ? (
            <View style={styles.mobileHandleWrap}>
              <View style={styles.mobileHandleBar} />
            </View>
          ) : null}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.bellIconWrap}>
                <Bell size={16} color="#5B21B6" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleWithCountRow}>
                  <Text style={styles.headerTitle}>Notifications</Text>
                  {unreadCount > 0 ? (
                    <View style={styles.unreadCountBadge}>
                      <Text style={styles.unreadCountBadgeText}>
                        {unreadCount} new
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.headerSub} numberOfLines={1}>
                  Live updates from Artrat & your connected apps
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {unreadCount > 0 ? (
                <Pressable style={styles.markReadBtn} onPress={onMarkAllRead}>
                  <Text style={styles.markReadText}>Mark all read</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
              >
                <X size={16} color="#161126" />
              </Pressable>
            </View>
          </View>

          {/* Notification Feed */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.notifCard,
                  item.unread && styles.notifCardUnread,
                ]}
                onPress={() => {
                  onMarkAllRead();
                  onClose();
                  if (item.targetAppId) {
                    onSelectApplication(item.targetAppId);
                  } else if (item.targetTab) {
                    onSelectTab(item.targetTab);
                  }
                }}
              >
                <View
                  style={[
                    styles.kindIconBox,
                    (item.kind === 'reminder' || item.kind === 'otp') &&
                      styles.kindOrange,
                    item.kind === 'ready' && styles.kindGreen,
                    item.kind === 'ineligible' && styles.kindRose,
                  ]}
                >
                  {item.kind === 'otp' ? (
                    <KeyRound size={16} color="#C2410C" />
                  ) : item.kind === 'reminder' ? (
                    <CalendarClock size={16} color="#C2410C" />
                  ) : item.kind === 'ready' ? (
                    <CheckCircle2 size={16} color="#047857" />
                  ) : (
                    <AlertCircle size={16} color="#BE123C" />
                  )}
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.metaTopRow}>
                    <View
                      style={[
                        styles.tagPill,
                        (item.kind === 'reminder' || item.kind === 'otp') &&
                          styles.tagPillOrange,
                        item.kind === 'ready' && styles.tagPillGreen,
                        item.kind === 'ineligible' && styles.tagPillRose,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagPillText,
                          (item.kind === 'reminder' || item.kind === 'otp') &&
                            styles.tagTextOrange,
                          item.kind === 'ready' && styles.tagTextGreen,
                          item.kind === 'ineligible' && styles.tagTextRose,
                        ]}
                      >
                        {item.tag}
                      </Text>
                    </View>
                    <Text style={styles.notifTime}>{item.time}</Text>
                  </View>

                  <Text style={styles.notifTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.notifBody}>{item.body}</Text>
                </View>

                <View style={styles.openArrowCircle}>
                  <ArrowRight size={14} color="#5B21B6" />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 17, 38, 0.52)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropDesktop: {
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '86%',
    backgroundColor: '#F7F5FC',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    overflow: 'hidden',
  },
  dialogDesktop: {
    borderRadius: 24,
    maxHeight: 620,
    shadowColor: '#2E1065',
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
  },
  mobileHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
    backgroundColor: '#FFFFFF',
  },
  mobileHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8CEF0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDF5',
    gap: 10,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  bellIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDE5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWithCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#161126',
  },
  unreadCountBadge: {
    backgroundColor: '#FFF4ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  unreadCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },
  headerSub: {
    fontSize: 12,
    color: '#4E4466',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markReadBtn: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDD0F8',
  },
  markReadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C1D95',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listScroll: {
    paddingHorizontal: 16,
  },
  listContent: {
    paddingVertical: 14,
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  notifCardUnread: {
    backgroundColor: '#FAF8FF',
    borderColor: '#C4B5FD',
  },
  kindIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindOrange: {
    backgroundColor: '#FFF4ED',
  },
  kindGreen: {
    backgroundColor: '#ECFDF5',
  },
  kindRose: {
    backgroundColor: '#FFF1F2',
  },
  metaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagPillOrange: {
    backgroundColor: '#FFF4ED',
  },
  tagPillGreen: {
    backgroundColor: '#ECFDF5',
  },
  tagPillRose: {
    backgroundColor: '#FFF1F2',
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tagTextOrange: {
    color: '#C2410C',
  },
  tagTextGreen: {
    color: '#047857',
  },
  tagTextRose: {
    color: '#BE123C',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161126',
  },
  notifTime: {
    fontSize: 11,
    color: '#756A92',
    fontWeight: '500',
  },
  notifBody: {
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 17,
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
