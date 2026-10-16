import React from 'react';
import { Text, View, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { FolderOpen, TriangleAlert } from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export function EmptyState({ message }: { message: string }) {
  const { colors: c } = useAppTheme();
  return (
    <View style={styles.center}>
      <FolderOpen size={34} color={c.textSecondary} />
      <Text style={[styles.message, { color: c.textSecondary }]}>{message}</Text>
    </View>
  );
}

export function LoadingState() {
  const { colors: c } = useAppTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator testID="loading" color={c.primary} size="large" />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors: c } = useAppTheme();
  return (
    <View style={styles.center}>
      <TriangleAlert size={34} color={c.error} />
      <Text style={[styles.message, { color: c.error }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={[styles.retry, { backgroundColor: c.primary }]}
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  message: { fontSize: 14, textAlign: 'center' },
  retry: { minHeight: 44, borderRadius: 14, paddingHorizontal: 24, justifyContent: 'center' },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
