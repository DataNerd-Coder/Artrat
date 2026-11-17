import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, ArrowRight, FolderOpen, Link2, X } from './icons';
import { CuratedApplication, GeneralHistoryThread } from '../domain/types';

interface ChatHistoryDrawerProps {
  visible: boolean;
  applications: CuratedApplication[];
  generalThreads: GeneralHistoryThread[];
  onClose: () => void;
  onSelectApplicationChat: (appId: string) => void;
}

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  visible,
  applications,
  generalThreads,
  onClose,
  onSelectApplicationChat,
}) => {
  const [selectedThread, setSelectedThread] =
    useState<GeneralHistoryThread | null>(null);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Chat History</Text>
              <Text style={styles.headerSubtitle}>
                Application chats and links archived after 7 days
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setSelectedThread(null);
                onClose();
              }}
              style={styles.closeBtn}
            >
              <X size={16} color="#140E28" />
            </Pressable>
          </View>

          {selectedThread ? (
            <View style={styles.threadView}>
              <Pressable
                style={styles.backRow}
                onPress={() => setSelectedThread(null)}
              >
                <ArrowLeft size={15} color="#5B21B6" />
                <Text style={styles.backText}>Back to history</Text>
              </Pressable>

              <View style={styles.threadSummaryCard}>
                <Text style={styles.threadTitle}>{selectedThread.title}</Text>
                <Text style={styles.threadSubtitle}>
                  {selectedThread.subtitle}
                </Text>
              </View>

              <ScrollView style={styles.messagesList}>
                {selectedThread.messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.msgBubble,
                      msg.sender === 'student'
                        ? styles.msgStudent
                        : styles.msgArtrat,
                    ]}
                  >
                    <Text
                      style={[
                        styles.msgBody,
                        msg.sender === 'student' && styles.msgBodyStudent,
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Section 1: Application Chats */}
              <Text style={styles.sectionHeader}>Applications</Text>
              {applications.map((app) => (
                <Pressable
                  key={app.id}
                  style={styles.historyCard}
                  onPress={() => {
                    onSelectApplicationChat(app.id);
                    onClose();
                  }}
                >
                  <View style={styles.cardLeft}>
                    <View style={styles.iconCircle}>
                      <FolderOpen size={15} color="#5B21B6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{app.title}</Text>
                      <Text style={styles.cardSub}>{app.statusSummary}</Text>
                    </View>
                  </View>
                  <ArrowRight size={15} color="#4A4166" />
                </Pressable>
              ))}

              {/* Section 2: Shared Links */}
              <Text style={[styles.sectionHeader, { marginTop: 14 }]}>
                Links you shared
              </Text>
              {generalThreads.map((thread) => (
                <Pressable
                  key={thread.id}
                  style={styles.historyCard}
                  onPress={() => setSelectedThread(thread)}
                >
                  <View style={styles.cardLeft}>
                    <View style={styles.iconCircle}>
                      <Link2 size={15} color="#4C1D95" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.titleWithBadge}>
                        <Text style={styles.cardTitle}>{thread.title}</Text>
                        <View
                          style={[
                            styles.outcomePill,
                            thread.outcomeColor === 'red'
                              ? styles.outcomeRed
                              : styles.outcomePurple,
                          ]}
                        >
                          <Text
                            style={[
                              styles.outcomeText,
                              thread.outcomeColor === 'red'
                                ? styles.outcomeTextRed
                                : styles.outcomeTextPurple,
                            ]}
                          >
                            {thread.outcomeBadge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardSub}>{thread.subtitle}</Text>
                    </View>
                  </View>
                  <ArrowRight size={15} color="#4A4166" />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 14, 40, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2FC',
    backgroundColor: '#F6F3FF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#140E28',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#4A4166',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDE4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listScroll: {
    paddingHorizontal: 18,
  },
  listContent: {
    paddingVertical: 18,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A4166',
    marginBottom: 2,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#F8F6FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4DCFA',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDE4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWithBadge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#140E28',
  },
  cardSub: {
    fontSize: 12,
    color: '#4A4166',
    marginTop: 2,
    lineHeight: 17,
  },
  outcomePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  outcomeRed: {
    backgroundColor: '#FEE2E2',
  },
  outcomePurple: {
    backgroundColor: '#EDE4FF',
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  outcomeTextRed: {
    color: '#B91C1C',
  },
  outcomeTextPurple: {
    color: '#4C1D95',
  },
  threadView: {
    padding: 18,
    maxHeight: 500,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B21B6',
  },
  threadSummaryCard: {
    backgroundColor: '#F6F3FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4DCFA',
    marginBottom: 12,
  },
  threadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#140E28',
  },
  threadSubtitle: {
    fontSize: 12,
    color: '#4A4166',
    marginTop: 2,
  },
  messagesList: {
    maxHeight: 330,
  },
  msgBubble: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  msgStudent: {
    backgroundColor: '#6D28D9',
    alignSelf: 'flex-end',
    maxWidth: '86%',
  },
  msgArtrat: {
    backgroundColor: '#F6F3FF',
    borderWidth: 1,
    borderColor: '#E4DCFA',
  },
  msgBody: {
    fontSize: 13,
    color: '#140E28',
    lineHeight: 20,
  },
  msgBodyStudent: {
    color: '#FFFFFF',
  },
});
