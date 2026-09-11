import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Alert } from 'react-native';
import { Timer, CheckCircle2, Lock, Trophy, Flame } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { NeoButton } from '../components/redesign/NeoButton';
import { NeoInput } from '../components/redesign/NeoInput';
import { PriceDisplay } from '../components/redesign/PriceDisplay';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';
import { colors as themeColors } from '../theme';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 0 }) + ' Bs';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Terminó';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

export default function AuctionDetailScreen({ route }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { id } = route.params;
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bid, setBid] = useState('');
  const [bidding, setBidding] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      const { data } = await api.get(`/auctions/${id}`);
      setAuction(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [id]);

  const placeBid = async () => {
    const amount = Number(bid);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido');
      return;
    }
    setBidding(true);
    try {
      const { data } = await api.post(`/auctions/${id}/bid`, { bidAmount: amount });
      setAuction(data.data.auction ?? data.data);
      setBid('');
      Alert.alert('¡Oferta enviada!', `Precio actual: ${money(data.data.auction?.currentPrice ?? data.data.currentPrice)}`);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setBidding(false);
    }
  };

  const buyNow = async () => {
    Alert.alert('Comprar ahora', `¿Comprar por ${money(auction.buyNowPrice)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Comprar',
        onPress: async () => {
          try {
            await api.post(`/auctions/${id}/buy-now`);
            Alert.alert('¡Comprado!', 'Ganaste la subasta con la compra directa');
            load();
          } catch (err) {
            Alert.alert('Error', getErrorMessage(err));
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingState />;
  }
  if (!auction) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Subasta no encontrada</Text>
      </View>
    );
  }

  const remaining = new Date(auction.endDate).getTime() - now;
  const urgent = remaining > 0 && remaining < 3600000;
  const reserveMet = auction.reservePrice != null && Number(auction.currentPrice) >= Number(auction.reservePrice);
  const isWinning = auction.isHighestBidder;

  return (
    <ScrollView style={styles.flex}>
      {auction.imageUrl ? <Image source={{ uri: auction.imageUrl }} style={styles.image} resizeMode="cover" /> : null}
      <View style={styles.body}>
        <Text style={styles.title}>{auction.title}</Text>

        <View style={[styles.countdownBox, urgent && styles.countdownUrgent]}>
          <View style={styles.countdownLabelRow}>
            <Timer size={13} color={urgent ? colors.error : colors.warning} />
            <Text style={[styles.countdownLabel, urgent && { color: colors.error }]}>Termina en</Text>
          </View>
          <Text style={[styles.countdown, urgent && styles.countdownUrgentText]}>{formatCountdown(remaining)}</Text>
        </View>

        {auction.reservePrice != null && (
          <View style={[styles.reserveRow, reserveMet ? styles.reserveMetBox : styles.reserveNotBox]}>
            {reserveMet ? (
              <CheckCircle2 size={14} color={colors.success} />
            ) : (
              <Lock size={13} color={colors.textSecondary} />
            )}
            <Text style={[styles.reserveText, reserveMet ? styles.reserveMetText : styles.reserveNotText]}>
              {reserveMet ? 'Reserva alcanzada' : `Reserva: ${money(auction.reservePrice)}`}
            </Text>
          </View>
        )}

        {isWinning && (
          <View style={styles.winningRow}>
            <Trophy size={14} color={colors.success} />
            <Text style={styles.winning}>¡Vas ganando!</Text>
          </View>
        )}
        {!isWinning && auction.hasBids && (
          <View style={styles.losingRow}>
            <Flame size={14} color={colors.warning} />
            <Text style={styles.losing}>Competís — subí tu oferta</Text>
          </View>
        )}

        <View style={styles.priceRow}>
          <PriceDisplay price={Number(auction.currentPrice)} />
          <Text style={styles.bids}>{auction.bids?.length ?? 0} ofertas</Text>
        </View>

        {auction.buyNowPrice != null && Number(auction.buyNowPrice) > 0 && (
          <View style={styles.buyNowWrap}>
            <NeoButton
              title={`Comprar ahora: ${money(auction.buyNowPrice)}`}
              variant="secondary"
              onPress={buyNow}
              style={styles.buyNowBtn}
            />
          </View>
        )}

        <Text style={styles.section}>Hacer una oferta</Text>
        <View style={styles.bidRow}>
          <NeoInput
            style={styles.bidInput}
            placeholder="Tu oferta (Bs)"
            value={bid}
            onChangeText={setBid}
            keyboardType="numeric"
          />
          <NeoButton
            title={bidding ? 'Enviando...' : 'Ofertar'}
            onPress={placeBid}
            disabled={bidding || remaining <= 0}
            style={styles.bidBtn}
          />
        </View>

        <Text style={styles.section}>Historial de ofertas</Text>
        {(auction.bids ?? []).length === 0 ? (
          <EmptyState message="Sin ofertas todavía — ¡sé el primero!" />
        ) : (
          (auction.bids ?? []).map((b: any, idx: number) => (
            <View key={idx} style={styles.bidItem}>
              <Text style={styles.bidUser}>{b.bidder?.firstName ?? b.bidder?.email ?? 'Oferta'}</Text>
              <Text style={styles.bidAmount}>{money(b.bidAmount)}</Text>
              <Text style={styles.bidTime}>{new Date(b.createdAt).toLocaleTimeString()}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.error, fontSize: 16 },
  image: { width: '100%', aspectRatio: 1.2, backgroundColor: '#eee' },
  body: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  countdownBox: { backgroundColor: '#FFF4E5', borderRadius: 10, padding: 12, marginTop: 12 },
  countdownUrgent: { backgroundColor: '#FDECEA' },
  countdownLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countdownLabel: { fontSize: 12, color: colors.textSecondary },
  countdown: { fontSize: 24, fontWeight: '900', color: colors.warning, marginTop: 2 },
  countdownUrgentText: { color: colors.error },
  reserveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  reserveText: { fontSize: 14, fontWeight: '700' },
  reserveMetBox: { backgroundColor: 'rgba(76,175,80,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  reserveMetText: { color: colors.success },
  reserveNotBox: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  reserveNotText: { color: colors.textSecondary },
  winningRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  winning: { color: colors.success, fontWeight: '800', fontSize: 16 },
  losingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  losing: { color: colors.warning, fontWeight: '700', fontSize: 15 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  bids: { fontSize: 13, color: colors.textSecondary },
  buyNowWrap: { marginTop: 14 },
  buyNowBtn: { flex: 1 },
  section: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 8 },
  bidRow: { flexDirection: 'row', gap: 10 },
  bidInput: { flex: 1 },
  bidBtn: { minWidth: 120 },
  bidItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  bidUser: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  bidAmount: { fontSize: 14, fontWeight: '800', color: colors.price },
  bidTime: { fontSize: 12, color: colors.textSecondary, marginLeft: 8 },
});
