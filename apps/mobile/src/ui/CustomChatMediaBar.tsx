import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  Check,
  FileText,
  ImageIcon,
  Pause,
  Play,
  Send,
  Trash2,
  X,
} from './icons';

export interface AttachedVoiceNote {
  durationSec: number;
  waveform: number[];
  audioDataUrl?: string | null;
  transcriptPreview?: string;
}

export interface AttachedMediaItem {
  kind: 'image' | 'document' | 'camera';
  fileName: string;
  fileSize: string;
  mediaDataUrl?: string | null;
  caption?: string;
}

const DEFAULT_WAVEFORM = [
  0.28, 0.52, 0.75, 0.42, 0.88, 0.64, 0.35, 0.92, 0.78, 0.48, 0.62, 0.95, 0.7,
  0.38, 0.84, 0.58, 0.74, 0.9, 0.46, 0.66, 0.82, 0.5, 0.36, 0.72, 0.55, 0.32,
];

function formatDuration(sec: number): string {
  const s = Math.max(1, Math.round(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

export const VoiceNoteBubble: React.FC<{
  voiceNote: AttachedVoiceNote;
  isStudent: boolean;
}> = ({ voiceNote, isStudent }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const bars =
    voiceNote.waveform.length > 0 ? voiceNote.waveform : DEFAULT_WAVEFORM;

  useEffect(() => {
    if (!playing) return;
    const stepMs = 120 / speed;
    const increment = 1 / Math.max(8, voiceNote.durationSec * 8);
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 1) {
          setPlaying(false);
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);
    return () => clearInterval(timer);
  }, [playing, speed, voiceNote.durationSec]);

  const cycleSpeed = () => {
    setSpeed((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  };

  return (
    <View
      style={[
        styles.voiceWrap,
        isStudent ? styles.voiceWrapStudent : styles.voiceWrapArtrat,
      ]}
    >
      <Pressable
        style={[
          styles.playCircle,
          isStudent ? styles.playCircleStudent : styles.playCircleArtrat,
        ]}
        onPress={() => setPlaying((p) => !p)}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {playing ? (
          <Pause size={14} color={isStudent ? '#5B21B6' : '#FFFFFF'} />
        ) : (
          <Play size={14} color={isStudent ? '#5B21B6' : '#FFFFFF'} />
        )}
      </Pressable>

      <View style={styles.waveformCol}>
        <View style={styles.waveformTrack}>
          {bars.map((h, idx) => {
            const ratio = idx / bars.length;
            const filled = playing ? ratio <= progress : true;
            return (
              <View
                key={idx}
                style={[
                  styles.waveBar,
                  {
                    height: Math.max(5, Math.round(h * 24)),
                    backgroundColor: isStudent
                      ? filled
                        ? '#FFFFFF'
                        : 'rgba(255,255,255,0.38)'
                      : filled
                        ? '#6D28D9'
                        : '#D8CCFA',
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.voiceMetaRow}>
          <Text
            style={[
              styles.voiceDurationText,
              isStudent && { color: 'rgba(255,255,255,0.88)' },
            ]}
          >
            {playing
              ? formatDuration(
                  Math.max(1, Math.round(progress * voiceNote.durationSec))
                )
              : formatDuration(voiceNote.durationSec)}
          </Text>
          <Text
            style={[
              styles.voiceLabelText,
              isStudent && { color: 'rgba(255,255,255,0.82)' },
            ]}
          >
            Voice message
          </Text>
        </View>
      </View>

      <Pressable
        style={[
          styles.speedPill,
          isStudent ? styles.speedPillStudent : styles.speedPillArtrat,
        ]}
        onPress={cycleSpeed}
      >
        <Text
          style={[
            styles.speedPillText,
            isStudent && { color: '#FFFFFF' },
          ]}
        >
          {speed}×
        </Text>
      </Pressable>
    </View>
  );
};

export const MediaAttachmentBubble: React.FC<{
  media: AttachedMediaItem;
  isStudent: boolean;
}> = ({ media, isStudent }) => {
  const isImage = media.kind === 'image' || media.kind === 'camera';
  return (
    <View
      style={[
        styles.mediaCard,
        isStudent ? styles.mediaCardStudent : styles.mediaCardArtrat,
      ]}
    >
      {isImage ? (
        <View style={styles.imagePreviewCanvas}>
          <View style={styles.imagePreviewBadgeRow}>
            <View style={styles.imageKindPill}>
              <ImageIcon size={12} color="#5B21B6" />
              <Text style={styles.imageKindPillText}>
                {media.kind === 'camera' ? 'Camera Scan' : 'Image Attachment'}
              </Text>
            </View>
            <View style={styles.verifiedMediaPill}>
              <Check size={10} color="#047857" />
              <Text style={styles.verifiedMediaPillText}>Read clearly</Text>
            </View>
          </View>
          <Text style={styles.imagePreviewTitle} numberOfLines={1}>
            {media.fileName}
          </Text>
          <Text style={styles.imagePreviewSub} numberOfLines={2}>
            {media.caption || 'Attached image ready for review'}
          </Text>
        </View>
      ) : (
        <View style={styles.docRow}>
          <View
            style={[
              styles.docIconBox,
              isStudent && { backgroundColor: 'rgba(255,255,255,0.18)' },
            ]}
          >
            <FileText size={16} color={isStudent ? '#FFFFFF' : '#5B21B6'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.docNameText,
                isStudent && { color: '#FFFFFF' },
              ]}
              numberOfLines={1}
            >
              {media.fileName}
            </Text>
            <Text
              style={[
                styles.docMetaText,
                isStudent && { color: 'rgba(255,255,255,0.82)' },
              ]}
            >
              {media.fileSize} · Document
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export const CustomMediaAttachmentSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectMedia: (media: AttachedMediaItem) => void;
}> = ({ visible, onClose, onSelectMedia }) => {
  if (!visible) return null;

  const triggerWebFilePicker = (
    accept: string,
    kind: 'image' | 'document',
    fallbackName: string,
    fallbackCaption: string
  ) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const sizeKb = Math.max(12, Math.round(file.size / 1024));
        const reader = new FileReader();
        reader.onload = () => {
          onSelectMedia({
            kind,
            fileName: file.name,
            fileSize: `${sizeKb} KB`,
            mediaDataUrl:
              typeof reader.result === 'string' ? reader.result : null,
            caption: `Attached ${file.name} (${sizeKb} KB)`,
          });
          onClose();
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }
    onSelectMedia({
      kind,
      fileName: fallbackName,
      fileSize: '340 KB',
      mediaDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      caption: fallbackCaption,
    });
    onClose();
  };

  return (
    <View style={styles.sheetContainer}>
      <View style={styles.sheetHeaderRow}>
        <Text style={styles.sheetHeaderTitle}>Share with Artrat</Text>
        <Pressable
          onPress={onClose}
          style={styles.sheetCloseBtn}
          accessibilityRole="button"
        >
          <X size={14} color="#4E4466" />
        </Pressable>
      </View>

      <View style={styles.sheetOptionsGrid}>
        <Pressable
          style={styles.sheetOptionCard}
          onPress={() =>
            triggerWebFilePicker(
              'image/*',
              'image',
              'Scholarship_Flyer_Screenshot.png',
              'Scholarship flyer & requirement screenshot'
            )
          }
        >
          <View
            style={[styles.sheetIconCircle, { backgroundColor: '#F3EEFF' }]}
          >
            <ImageIcon size={18} color="#6D28D9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetOptionTitle}>Photo or Screenshot</Text>
            <Text style={styles.sheetOptionSub}>
              Share a scholarship flyer, portal screen, or result photo
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.sheetOptionCard}
          onPress={() =>
            triggerWebFilePicker(
              '.pdf,.doc,.docx,image/*',
              'document',
              'UNN_Signed_Semester_Result_Chisom.pdf',
              'Signed academic document PDF'
            )
          }
        >
          <View
            style={[styles.sheetIconCircle, { backgroundColor: '#ECFDF5' }]}
          >
            <FileText size={18} color="#047857" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetOptionTitle}>Academic PDF or Document</Text>
            <Text style={styles.sheetOptionSub}>
              Attach a transcript, admission letter, CV, or attestation form
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.sheetOptionCard}
          onPress={() => {
            onSelectMedia({
              kind: 'camera',
              fileName: 'Camera_Scan_Departmental_Result_200L.jpg',
              fileSize: '285 KB',
              mediaDataUrl:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
              caption: 'Clear camera scan · Exam Officer stamp visible',
            });
            onClose();
          }}
        >
          <View
            style={[styles.sheetIconCircle, { backgroundColor: '#FEF3C7' }]}
          >
            <Camera size={18} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetOptionTitle}>Instant Camera Scan</Text>
            <Text style={styles.sheetOptionSub}>
              Snap a paper result slip, ID card, or signed HOD letter
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

export const CustomVoiceRecordingBar: React.FC<{
  onCancel: () => void;
  onSendVoiceNote: (note: AttachedVoiceNote) => void;
}> = ({ onCancel, onSendVoiceNote }) => {
  const [seconds, setSeconds] = useState(1);
  const [liveBars, setLiveBars] = useState<number[]>(DEFAULT_WAVEFORM.slice(0, 22));
  const mediaRecorderRef = useRef<any>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window !== 'undefined' &&
      'MediaRecorder' in window
    ) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const RecorderClass = (window as any).MediaRecorder;
          const rec = new RecorderClass(stream);
          chunksRef.current = [];
          rec.ondataavailable = (ev: any) => {
            if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
          };
          rec.start();
          mediaRecorderRef.current = { rec, stream };
        })
        .catch(() => {
          // Graceful fallback when microphone permission is not granted in browser
        });
    }
    return () => {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.rec.stop();
          mediaRecorderRef.current.stream
            .getTracks()
            .forEach((t: any) => t.stop());
        } catch {
          // ignore cleanup
        }
      }
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => s + 1);
      setLiveBars((prev) => {
        const nextVal = 0.25 + ((Date.now() % 73) / 100) * 0.72;
        return [...prev.slice(1), Number(nextVal.toFixed(2))];
      });
    }, 350);
    return () => clearInterval(t);
  }, []);

  const handleFinishAndSend = () => {
    const durationSec = Math.max(2, Math.round(seconds * 0.45));
    if (mediaRecorderRef.current && chunksRef.current.length > 0) {
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          onSendVoiceNote({
            durationSec,
            waveform: liveBars,
            audioDataUrl:
              typeof reader.result === 'string' ? reader.result : null,
          });
        };
        reader.readAsDataURL(blob);
        return;
      } catch {
        // fall through
      }
    }
    onSendVoiceNote({
      durationSec,
      waveform: liveBars,
      audioDataUrl: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
    });
  };

  return (
    <View style={styles.recordingBar}>
      <Pressable
        style={styles.cancelRecordBtn}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel voice note"
      >
        <Trash2 size={15} color="#BE123C" />
      </Pressable>

      <View style={styles.recordingStatusWrap}>
        <View style={styles.redPulseDot} />
        <Text style={styles.recordingTimerText}>
          {formatDuration(Math.max(1, Math.round(seconds * 0.45)))}
        </Text>
      </View>

      <View style={styles.liveWaveformRow}>
        {liveBars.map((h, i) => (
          <View
            key={i}
            style={[
              styles.liveWaveBar,
              { height: Math.max(5, Math.round(h * 22)) },
            ]}
          />
        ))}
      </View>

      <Pressable
        style={styles.sendVoiceCircleBtn}
        onPress={handleFinishAndSend}
        accessibilityRole="button"
        accessibilityLabel="Send voice note"
      >
        <Send size={15} color="#FFFFFF" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  voiceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    minWidth: 235,
  },
  voiceWrapStudent: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  voiceWrapArtrat: {
    backgroundColor: '#F6F2FF',
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  playCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircleStudent: {
    backgroundColor: '#FFFFFF',
  },
  playCircleArtrat: {
    backgroundColor: '#6D28D9',
  },
  waveformCol: {
    flex: 1,
    gap: 5,
  },
  waveformTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    height: 26,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  voiceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C1D95',
  },
  voiceLabelText: {
    fontSize: 10,
    color: '#756A92',
  },
  speedPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  speedPillStudent: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  speedPillArtrat: {
    backgroundColor: '#ECE4FC',
  },
  speedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C1D95',
  },
  mediaCard: {
    borderRadius: 14,
    padding: 10,
    marginBottom: 4,
  },
  mediaCardStudent: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  mediaCardArtrat: {
    backgroundColor: '#F6F2FF',
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  imagePreviewCanvas: {
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5DDF5',
  },
  imagePreviewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  imageKindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EEFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  imageKindPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5B21B6',
  },
  verifiedMediaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifiedMediaPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  imagePreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#161126',
    marginTop: 2,
  },
  imagePreviewSub: {
    fontSize: 11,
    color: '#4E4466',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ECE4FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#161126',
  },
  docMetaText: {
    fontSize: 11,
    color: '#756A92',
    marginTop: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DDD0F8',
    gap: 10,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161126',
  },
  sheetCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionsGrid: {
    gap: 8,
  },
  sheetOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FBF9FF',
    borderWidth: 1,
    borderColor: '#EDE6FA',
  },
  sheetIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161126',
  },
  sheetOptionSub: {
    fontSize: 11,
    color: '#4E4466',
    marginTop: 1,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5FC',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    paddingLeft: 8,
    paddingRight: 5,
    paddingVertical: 4,
    gap: 10,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
  },
  cancelRecordBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redPulseDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E11D48',
  },
  recordingTimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161126',
    minWidth: 32,
  },
  liveWaveformRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 26,
  },
  liveWaveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#6D28D9',
  },
  sendVoiceCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
