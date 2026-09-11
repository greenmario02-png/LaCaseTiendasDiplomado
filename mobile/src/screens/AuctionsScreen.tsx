import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Scale, Banknote, Timer } from 'lucide-react-native';
import { api, resolveImageUrl } from '../services/api';
import { PriceDisplay } from '../components/redesign/PriceDisplay';
import { CountdownTimer } from '../components/redesign/CountdownTimer';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';

export default function AuctionsScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/auctions', { params: { limit: 20 } });
        setAuctions(data.data ?? []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={auctions}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 90 }}
      ListHeaderComponent={
        <View style={styles.titleRow}>
          <Scale size={20} color={colors.primary} />
          <Text style={styles.title}>Subastas activas</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState message="No hay subastas activas" />}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AuctionDetail', { id: item.id })}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.priceRow}>
              <Banknote size={14} color={colors.primary} />
              <PriceDisplay price={Number(item.currentPrice)} />
            </View>
            <View style={styles.countdownRow}>
              <Timer size={12} color={colors.textSecondary} />
              <CountdownTimer target={new Date(item.endDate).getTime()} />
            </View>
          </View>
          {item.imageUrl && <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.thumb} />}
        </TouchableOpacity>
      )}
    />
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 12 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  thumb: { width: 70, height: 70, borderRadius: 8 },
});
