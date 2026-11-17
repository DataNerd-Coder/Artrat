import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, PenLine, X } from './icons';
import { OrderedApplicationItem } from '../domain/types';
import { ArtratBot3D } from './ArtratBot3D';

interface GeminiCanvasModalProps {
  visible: boolean;
  item: OrderedApplicationItem | null;
  scholarshipTitle: string;
  onClose: () => void;
  onSaveContent: (itemId: string, updatedContent: string) => void;
}

const QUICK_REFINEMENTS = [
  {
    id: 'concise',
    label: 'Make it more concise',
    instruction: 'Make the statement tighter while keeping every key detail.',
  },
  {
    id: 'impact',
    label: 'Highlight UNN lab work',
    instruction: 'Emphasize my 100L Electrical Engineering lab projects.',
  },
  {
    id: 'community',
    label: 'Strengthen community impact',
    instruction: 'Sharpen the connection between power reliability and local clinics.',
  },
];

export const GeminiCanvasModal: React.FC<GeminiCanvasModalProps> = ({
  visible,
  item,
  scholarshipTitle,
  onClose,
  onSaveContent,
}) => {
  const [draftText, setDraftText] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (item?.writeupContent) {
      setDraftText(item.writeupContent);
      setStatusMessage(null);
      setAiPrompt('');
    }
  }, [item]);

  if (!item) return null;

  const wordCount = draftText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const wordLimit = item.writeupWordLimit || 250;

  const applyAiEdit = (instruction: string) => {
    const lower = instruction.toLowerCase();
    let updated = draftText;

    if (lower.includes('concise') || lower.includes('tight')) {
      updated =
        'Completing 100 Level in Electrical Engineering at the University of Nigeria, Nsukka with a 4.21/5.00 CGPA (after scoring 308 in JAMB UTME) deepened my focus on power-systems protection. Growing up in Njikoka, Anambra State, where unstable distribution lines routinely forced local workshops and clinics onto costly generators, showed me why grid resilience matters.\n\nRanking in the top 5% of my UNN engineering laboratory cohort, I designed low-loss transformer models and load-balancing simulations. This scholarship will cover my 200-level laboratory components and academic fees so I can focus fully on distributed solar-hybrid grid research.';
    } else if (lower.includes('lab')) {
      updated =
        draftText +
        '\n\nWithin the UNN Department of Electrical Engineering, my 4.21/5.00 first-year standing reflects strong laboratory execution across circuit analysis and electromechanical energy conversion.';
    } else {
      updated =
        draftText +
        '\n\nThrough this scholarship, I aim to translate my UNN Electrical Engineering coursework directly into reliable local power solutions.';
    }

    setDraftText(updated);
    setStatusMessage('Updated draft with Artrat');
    setAiPrompt('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.dialogSheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <ArtratBot3D mood="scribe" size="sm" />
              <View style={{ flex: 1 }}>
                <Text style={styles.headerContext} numberOfLines={1}>
                  {scholarshipTitle}
                </Text>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={16} color="#140E28" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Editable Canvas Surface */}
            <View style={styles.editorSurface}>
              <View style={styles.editorToolbar}>
                <Text style={styles.editorToolbarLabel}>
                  {item.portalFieldLabel}
                </Text>
                <Text
                  style={[
                    styles.wordCountText,
                    wordCount > wordLimit && styles.wordCountOver,
                  ]}
                >
                  {wordCount} / {wordLimit} words
                </Text>
              </View>

              <TextInput
                style={styles.editorInput}
                multiline
                value={draftText}
                onChangeText={setDraftText}
                textAlignVertical="top"
              />
            </View>

            {statusMessage ? (
              <View style={styles.statusToast}>
                <Check size={13} color="#4C1D95" />
                <Text style={styles.statusToastText}>{statusMessage}</Text>
              </View>
            ) : null}

            {/* Quick AI Refinement Chips */}
            <View style={styles.refinementGroup}>
              <Text style={styles.refinementLabel}>Ask Artrat to rewrite:</Text>
              <View style={styles.chipsWrap}>
                {QUICK_REFINEMENTS.map((preset) => (
                  <Pressable
                    key={preset.id}
                    style={styles.refineChip}
                    onPress={() => applyAiEdit(preset.instruction)}
                  >
                    <PenLine size={12} color="#4C1D95" />
                    <Text style={styles.refineChipText}>{preset.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.customPromptRow}>
                <TextInput
                  style={styles.customPromptInput}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  placeholder="Tell Artrat what to change..."
                  placeholderTextColor="#6E6488"
                  onSubmitEditing={() => {
                    if (aiPrompt.trim()) applyAiEdit(aiPrompt.trim());
                  }}
                />
                <Pressable
                  style={[
                    styles.applyBtn,
                    !aiPrompt.trim() && styles.applyBtnDisabled,
                  ]}
                  disabled={!aiPrompt.trim()}
                  onPress={() => {
                    if (aiPrompt.trim()) applyAiEdit(aiPrompt.trim());
                  }}
                >
                  <Text style={styles.applyBtnText}>Rewrite</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.saveBtn}
              onPress={() => {
                onSaveContent(item.id, draftText);
                onClose();
              }}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Pressable>
          </View>
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
  dialogSheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2FC',
    backgroundColor: '#F6F3FF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerContext: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4A4166',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#140E28',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDE4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 18,
  },
  bodyContent: {
    paddingVertical: 18,
    gap: 16,
  },
  editorSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8CEFA',
    overflow: 'hidden',
  },
  editorToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F6F3FF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2FC',
    gap: 8,
  },
  editorToolbarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A4166',
    flex: 1,
  },
  wordCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C1D95',
  },
  wordCountOver: {
    color: '#DC2626',
  },
  editorInput: {
    minHeight: 190,
    padding: 14,
    fontSize: 14,
    lineHeight: 22,
    color: '#140E28',
  },
  statusToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE4FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusToastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  refinementGroup: {
    gap: 10,
  },
  refinementLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#140E28',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  refineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDE4FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  refineChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  customPromptRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  customPromptInput: {
    flex: 1,
    backgroundColor: '#F6F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFD5F8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#140E28',
  },
  applyBtn: {
    backgroundColor: '#6D28D9',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
  },
  applyBtnDisabled: {
    opacity: 0.4,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#EAE2FC',
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4C1D95',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
