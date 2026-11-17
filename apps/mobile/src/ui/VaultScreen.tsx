import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Check,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from './icons';
import { ProfileFact, VaultDocument } from '../domain/types';

interface VaultScreenProps {
  vaultDocs: VaultDocument[];
  profileFacts: ProfileFact[];
  onReplaceVaultDoc: (docId: string, newFileName: string) => void;
  onRemoveVaultDoc: (docId: string) => void;
  onUpdateProfileFact: (factId: string, newValue: string) => void;
  onAddVaultDoc: (title: string, category: VaultDocument['category'], fileName: string) => void;
  onAddProfileFact: (label: string, value: string, category: ProfileFact['category']) => void;
}

type VaultSubTab = 'documents' | 'details';

export const VaultScreen: React.FC<VaultScreenProps> = ({
  vaultDocs,
  profileFacts,
  onReplaceVaultDoc,
  onRemoveVaultDoc,
  onUpdateProfileFact,
  onAddVaultDoc,
  onAddProfileFact,
}) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 840;

  const [subTab, setSubTab] = useState<VaultSubTab>('documents');
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Add Document State
  const [addingDocOpen, setAddingDocOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] =
    useState<VaultDocument['category']>('Academic');

  // Dynamic Add Fact State
  const [addingFactOpen, setAddingFactOpen] = useState(false);
  const [newFactLabel, setNewFactLabel] = useState('');
  const [newFactValue, setNewFactValue] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleManualReplace = (doc: VaultDocument) => {
    const cleanTitle = doc.title.replace(/\s+/g, '_');
    const newName = `Chisom_${cleanTitle}_Updated.pdf`;
    onReplaceVaultDoc(doc.id, newName);
    showToast(`Updated "${doc.title}" across all applications.`);
  };

  const handleManualRemove = (doc: VaultDocument) => {
    onRemoveVaultDoc(doc.id);
    showToast(`Removed "${doc.title}" from your Vault.`);
  };

  const handleCreateDynamicDoc = () => {
    const trimmed = newDocTitle.trim();
    if (!trimmed) return;
    const cleanSlug = trimmed.replace(/\s+/g, '_');
    const fileName = `Chisom_${cleanSlug}.pdf`;
    onAddVaultDoc(trimmed, newDocCategory, fileName);
    setNewDocTitle('');
    setAddingDocOpen(false);
    showToast(`Added "${trimmed}" to your Vault.`);
  };

  const handleCreateDynamicFact = () => {
    const labelTrim = newFactLabel.trim();
    const valTrim = newFactValue.trim();
    if (!labelTrim || !valTrim) return;
    onAddProfileFact(labelTrim, valTrim, 'Academic');
    setNewFactLabel('');
    setNewFactValue('');
    setAddingFactOpen(false);
    showToast(`Saved "${labelTrim}" in your Vault.`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isWide && styles.contentWide]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
    >
      {/* Header */}
      <View style={styles.headerBlock}>
        <View style={styles.headerTitleRow}>
          <Text accessibilityRole="header" style={styles.pageTitle}>
            Your Vault
          </Text>

          <Pressable
            style={styles.addDynamicBtn}
            onPress={() => {
              if (subTab === 'documents') {
                setAddingDocOpen((p) => !p);
              } else {
                setAddingFactOpen((p) => !p);
              }
            }}
          >
            <Plus size={14} color="#FFFFFF" />
            <Text style={styles.addDynamicBtnText}>
              {subTab === 'documents' ? 'Add Document' : 'Add Detail'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.pageSubtitle}>
          Your living memory of documents and details. Artrat stores it here for every future application.
        </Text>
      </View>

      {/* iOS Segmented Control */}
      <View style={styles.segmentedTrack}>
        <Pressable
          style={[
            styles.segmentBtn,
            subTab === 'documents' && styles.segmentBtnActive,
          ]}
          onPress={() => setSubTab('documents')}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.segmentText,
              subTab === 'documents' && styles.segmentTextActive,
            ]}
          >
            Documents ({vaultDocs.length})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentBtn,
            subTab === 'details' && styles.segmentBtnActive,
          ]}
          onPress={() => setSubTab('details')}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.segmentText,
              subTab === 'details' && styles.segmentTextActive,
            ]}
          >
            My Details ({profileFacts.length})
          </Text>
        </Pressable>
      </View>

      {toastMessage ? (
        <View style={styles.toastBar}>
          <Check size={14} color="#047857" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Add Dynamic Document Drawer */}
      {subTab === 'documents' && addingDocOpen ? (
        <View style={styles.addFormCard}>
          <Text style={styles.addFormTitle}>
            Store a New Document in Your Vault
          </Text>
          <Text style={styles.addFormSub}>
            E.g., Guarantor Form, Academic Mentor Recommendation, Medical Fitness Certificate, WAEC Result, or Sworn Affidavit
          </Text>

          <TextInput
            style={styles.factInput}
            placeholder="Document title (e.g., Guarantor Attestation Letter)"
            placeholderTextColor="#8B80A6"
            value={newDocTitle}
            onChangeText={setNewDocTitle}
          />

          <View style={styles.categoryChipsRow}>
            {(
              [
                'Academic',
                'Endorsement',
                'Identity',
                'Origin',
                'Financial',
              ] as const
            ).map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.catChip,
                  newDocCategory === cat && styles.catChipActive,
                ]}
                onPress={() => setNewDocCategory(cat)}
              >
                <Text
                  style={[
                    styles.catChipText,
                    newDocCategory === cat && styles.catChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.addFormActions}>
            <Pressable
              style={styles.cancelGhostBtn}
              onPress={() => setAddingDocOpen(false)}
            >
              <Text style={styles.cancelGhostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.saveFactBtn}
              onPress={handleCreateDynamicDoc}
            >
              <Upload size={13} color="#FFFFFF" />
              <Text style={styles.saveFactBtnText}>Upload & Save to Vault</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Add Dynamic Detail Drawer */}
      {subTab === 'details' && addingFactOpen ? (
        <View style={styles.addFormCard}>
          <Text style={styles.addFormTitle}>
            Store a New Fact or Referee Detail
          </Text>
          <Text style={styles.addFormSub}>
            Any new requirement a scholarship asks about you (e.g., Academic Mentor Email, Guarantor Phone, JAMB Reg Number, LinkedIn URL) is saved here for future portals.
          </Text>

          <TextInput
            style={styles.factInput}
            placeholder="Detail name (e.g., Academic Mentor Contact)"
            placeholderTextColor="#8B80A6"
            value={newFactLabel}
            onChangeText={setNewFactLabel}
          />
          <TextInput
            style={styles.factInput}
            placeholder="Value (e.g., Dr. O. Nwosu · o.nwosu@unn.edu.ng)"
            placeholderTextColor="#8B80A6"
            value={newFactValue}
            onChangeText={setNewFactValue}
          />

          <View style={styles.addFormActions}>
            <Pressable
              style={styles.cancelGhostBtn}
              onPress={() => setAddingFactOpen(false)}
            >
              <Text style={styles.cancelGhostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.saveFactBtn}
              onPress={handleCreateDynamicFact}
            >
              <Check size={13} color="#FFFFFF" />
              <Text style={styles.saveFactBtnText}>Save to My Details</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* 1. Documents View */}
      {subTab === 'documents' ? (
        <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
          {vaultDocs.map((doc) => (
            <View
              key={doc.id}
              style={[
                styles.docCard,
                isWide && styles.cardHalf,
                doc.status === 'removed' && styles.docCardRemoved,
              ]}
            >
              <View style={styles.docTop}>
                <View style={styles.docIconWrap}>
                  <FileText
                    size={18}
                    color={doc.status === 'removed' ? '#756A92' : '#5B21B6'}
                  />
                </View>
                <View style={styles.docTextCol}>
                  <Text style={styles.docTitle} numberOfLines={1}>
                    {doc.title}
                  </Text>
                  <Text style={styles.docSub} numberOfLines={1}>
                    {doc.status === 'removed'
                      ? 'Removed · Re-upload when ready'
                      : `${doc.fileName} · ${doc.fileSize}`}
                  </Text>
                </View>
              </View>

              <View style={styles.docActionsRow}>
                <View style={styles.docBtnsCluster}>
                  <Pressable
                    style={styles.replaceBtn}
                    onPress={() => handleManualReplace(doc)}
                  >
                    {doc.status === 'removed' ? (
                      <Upload size={13} color="#4C1D95" />
                    ) : (
                      <RefreshCw size={13} color="#4C1D95" />
                    )}
                    <Text style={styles.replaceBtnText}>
                      {doc.status === 'removed' ? 'Re-upload' : 'Replace'}
                    </Text>
                  </Pressable>

                  {doc.status !== 'removed' ? (
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() => handleManualRemove(doc)}
                    >
                      <Trash2 size={13} color="#BE123C" />
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.docCatPill}>
                  <Text style={styles.docCatPillText}>{doc.category}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* 2. My Details View */}
      {subTab === 'details' ? (
        <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
          {profileFacts.map((fact) => {
            const isEditing = editingFactId === fact.id;
            const isLockedDob = fact.id === 'fact-age';
            return (
              <View
                key={fact.id}
                style={[styles.factCard, isWide && styles.cardHalf]}
              >
                <View style={styles.factTopRow}>
                  <Text style={styles.factLabel} numberOfLines={1}>
                    {fact.label}
                  </Text>

                  <View style={styles.factRightMetaRow}>
                    <View style={styles.factSourceBadge}>
                      <Text style={styles.factSourcePill} numberOfLines={1}>
                        {fact.verifiedSource}
                      </Text>
                    </View>

                    {!isEditing && !isLockedDob ? (
                      <Pressable
                        style={styles.editTriggerBtn}
                        accessibilityRole="button"
                        onPress={() => {
                          setEditingFactId(fact.id);
                          setEditingValue(fact.value);
                        }}
                      >
                        <Pencil size={12} color="#4C1D95" />
                        <Text style={styles.editTriggerText}>Edit</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {isEditing ? (
                  <View style={styles.editInlineRow}>
                    <TextInput
                      style={styles.factInput}
                      value={editingValue}
                      onChangeText={setEditingValue}
                      onSubmitEditing={() => {
                        if (editingValue.trim()) {
                          onUpdateProfileFact(fact.id, editingValue.trim());
                          showToast(
                            `Updated "${fact.label}" across all applications`
                          );
                        }
                        setEditingFactId(null);
                      }}
                    />
                    <Pressable
                      style={styles.saveFactBtn}
                      accessibilityRole="button"
                      onPress={() => {
                        if (editingValue.trim()) {
                          onUpdateProfileFact(fact.id, editingValue.trim());
                          showToast(
                            `Updated "${fact.label}" across all applications`
                          );
                        }
                        setEditingFactId(null);
                      }}
                    >
                      <Text style={styles.saveFactBtnText}>Save</Text>
                    </Pressable>
                    <Pressable
                      style={styles.cancelGhostBtn}
                      accessibilityRole="button"
                      onPress={() => setEditingFactId(null)}
                    >
                      <Text style={styles.cancelGhostBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.factValue}>{fact.value}</Text>
                )}
              </View>
            );
          })}
        </View>
      ) : null}
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
    paddingTop: 18,
    paddingBottom: 36,
    gap: 14,
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
  },
  contentWide: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  headerBlock: {
    gap: 5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#161126',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#4E4466',
    lineHeight: 19,
    maxWidth: 640,
  },
  addDynamicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6D28D9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  addDynamicBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#EAE3F8',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E4466',
  },
  segmentTextActive: {
    color: '#161126',
    fontWeight: '700',
  },
  toastBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  addFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    gap: 10,
  },
  addFormTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161126',
  },
  addFormSub: {
    fontSize: 12,
    color: '#4E4466',
    lineHeight: 17,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3EEFF',
  },
  catChipActive: {
    backgroundColor: '#6D28D9',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4C1D95',
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  cancelGhostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3EEFF',
  },
  cancelGhostBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  cardsGrid: {
    gap: 10,
  },
  cardsGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  cardHalf: {
    width: '48.5%',
    minWidth: 320,
    flexGrow: 1,
  },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 12,
  },
  docCardRemoved: {
    opacity: 0.7,
  },
  docTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161126',
  },
  docCatPill: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E4D8FA',
    flexShrink: 0,
  },
  docCatPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B21B6',
  },
  docSub: {
    fontSize: 12,
    color: '#4E4466',
  },
  docActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2EEFC',
  },
  docBtnsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  replaceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BE123C',
  },
  factCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    gap: 6,
  },
  factTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  factLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '600',
    color: '#4E4466',
  },
  factRightMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  factSourceBadge: {
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  factSourcePill: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5B21B6',
  },
  factValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161126',
    lineHeight: 20,
  },
  editTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editTriggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
  },
  editInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  factInput: {
    flex: 1,
    backgroundColor: '#F7F5FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD0F8',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#161126',
  },
  saveFactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6D28D9',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  saveFactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
