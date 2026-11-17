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
  CheckCircle2,
  Link2,
  Send,
} from './icons';
import { CuratedApplication } from '../domain/types';
import { ArtratBot3D } from './ArtratBot3D';

interface NewChatMessage {
  id: string;
  sender: 'student' | 'artrat';
  text: string;
  timestamp: string;
  createdApp?: CuratedApplication;
}

interface NewChatScreenProps {
  initialDraft?: string;
  onBack: () => void;
  onProcessLinkOrMessage: (input: string) => CuratedApplication;
  onOpenCreatedApplication: (appId: string) => void;
}

export const NewChatScreen: React.FC<NewChatScreenProps> = ({
  initialDraft = '',
  onBack,
  onProcessLinkOrMessage,
  onOpenCreatedApplication,
}) => {
  const [input, setInput] = useState(initialDraft);
  const [messages, setMessages] = useState<NewChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'artrat',
      text: 'Paste any scholarship link or tell me which application you want me to work on. I will check every requirement against your Vault—if you qualify, I will prepare your documents and writeups in order; if not, I will place it below your list and wipe it to History after 7 days.',
      timestamp: 'Now',
    },
  ]);

  const handleSend = (textToSend?: string) => {
    const raw = (textToSend ?? input).trim();
    if (!raw) return;

    const studentMsg: NewChatMessage = {
      id: `stu-${Date.now()}`,
      sender: 'student',
      text: raw,
      timestamp: 'Just now',
    };

    const resultApp = onProcessLinkOrMessage(raw);
    const artratTurn =
      resultApp.chatTurns[resultApp.chatTurns.length - 1]?.text ||
      'I have checked this scholarship for you.';

    const artratMsg: NewChatMessage = {
      id: `art-${Date.now() + 1}`,
      sender: 'artrat',
      text: artratTurn,
      timestamp: 'Just now',
      createdApp: resultApp,
    };

    setMessages((prev) => [...prev, studentMsg, artratMsg]);
    setInput('');
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
            New Application Chat
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Drop a scholarship link or ask Artrat
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
          <ArtratBot3D mood="radar" size="sm" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.mascotBannerTitle}>Artrat Assistant</Text>
            <Text style={styles.mascotBannerSub}>
              Checks eligibility & prepares your documents in order
            </Text>
          </View>
        </View>

        {/* Quick Demo Link Chips so the student can test both Eligible & 7-Day Wipe flows in 1 tap */}
        {messages.length === 1 ? (
          <View style={styles.suggestionsBlock}>
            <Text style={styles.suggestionsTitle}>Try a scholarship link</Text>
            <View style={styles.suggestionsCol}>
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
                </Text>
              </View>

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
        </View>
      </ScrollView>

      {/* Bottom Composer */}
      <View style={styles.bottomBar}>
        <View style={styles.composerPill}>
          <TextInput
            style={styles.composerInput}
            value={input}
            onChangeText={setInput}
            placeholder="Paste scholarship link or message Artrat..."
            placeholderTextColor="#756A92"
            autoFocus
            onSubmitEditing={() => handleSend()}
          />
          <Pressable
            style={[
              styles.sendCircleBtn,
              !input.trim() && styles.sendCircleBtnDisabled,
            ]}
            disabled={!input.trim()}
            onPress={() => handleSend()}
            accessibilityLabel="Send"
          >
            <Send size={15} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
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
    gap: 4,
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
