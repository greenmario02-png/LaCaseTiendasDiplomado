import React from 'react';
import { Text, View, Pressable, Modal, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export interface SuccessToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export function SuccessToast({ open, message, onClose }: SuccessToastProps) {
  const { colors: c, raised } = useAppTheme();
  if (!open) return null;
  return (
    <Pressable style={[styles.toast, { backgroundColor: c.success }]} onPress={onClose}>
      <Text style={styles.toastText}>✓ {message}</Text>
    </Pressable>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { colors: c, raised } = useAppTheme();

  return (
    <Modal visible={open} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: c.surface, ...raised }]}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: c.textSecondary }]}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable style={[styles.btn, { backgroundColor: 'transparent' }]} onPress={onClose}>
              <Text style={[styles.btnText, { color: c.textSecondary }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: c.error }]} onPress={onConfirm}>
              <Text style={styles.btnText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    zIndex: 10,
  },
  toastText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 16, padding: 20, gap: 10 },
  title: { fontSize: 17, fontWeight: '700' },
  message: { fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  btn: { minHeight: 44, borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
