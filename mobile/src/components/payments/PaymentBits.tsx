import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Camera, Check, Copy, ImageUp, Landmark, ShieldAlert, Trash } from 'lucide-react-native';
import { resolveImageUrl } from '../../services/api';
import { useAppTheme } from '../../theme/ThemeContext';
import { pickSafetyTip, SAFETY_TIPS_ES, type SafetyTipId } from '../../services/paymentSafety';
import { QR_MAX_BYTES, useStorePaymentInfo, type StorePaymentInfo } from '../../services/payments';

/** Objetivo táctil mínimo (WCAG 2.5.5): 44 x 44. */
export const TOUCH = 44;

// ── Recomendación de seguridad aleatoria ───────────────────────────
export function PaymentSafetyTip({ amountBs, rng }: { amountBs: number | null | undefined; rng?: () => number }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [tip, setTip] = useState<SafetyTipId>(() => pickSafetyTip(amountBs, rng));
  return (
    <View testID="payment-safety-tip" style={[styles.tip, { borderColor: colors.warning, backgroundColor: colors.surface }]} accessibilityRole="alert">
      <View style={styles.row}>
        <ShieldAlert size={18} color={colors.warning} />
        <Text style={[styles.tipTitle, { color: colors.text }]}>{t('pagos.safety.title')}</Text>
      </View>
      <Text testID={`tip-${tip}`} style={[styles.tipText, { color: colors.text }]}>{t(`pagos.safety.tips.${tip}`, { defaultValue: SAFETY_TIPS_ES[tip] })}</Text>
      <Pressable accessibilityRole="button" onPress={() => setTip((p) => pickSafetyTip(amountBs, rng, p))} style={styles.linkBtn} hitSlop={6}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('pagos.safety.another')}</Text>
      </Pressable>
    </View>
  );
}

// ── Fila con botón copiar ────────────────────────────────────────────────────
function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [done, setDone] = useState(false);
  const canCopy = !value.includes('•');
  return (
    <View style={[styles.row, { minHeight: TOUCH }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text selectable style={[styles.value, { color: colors.text }]}>{value}</Text>
      </View>
      {canCopy && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('pagos.info.copyA11y', { field: label })}
          onPress={async () => {
            await Clipboard.setStringAsync(value).catch(() => undefined);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          }}
          style={styles.iconBtn}
        >
          {done ? <Check size={20} color={colors.success} /> : <Copy size={20} color={colors.primary} />}
        </Pressable>
      )}
      {done && <Text accessibilityLiveRegion="polite" style={styles.srOnly}>{t('pagos.info.copied')}</Text>}
    </View>
  );
}

// ── Tarjeta «Datos de pago» ──────────────────────────────────────────────────
export function StorePaymentCard({ storeId, storeName, info, tipAmountBs, loggedIn = true }: { storeId: number; storeName?: string | null; info?: StorePaymentInfo | null; tipAmountBs?: number | null; loggedIn?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const fetched = useStorePaymentInfo(info === undefined ? storeId : null);
  const data = info === undefined ? fetched.data : info;
  const loading = info === undefined && fetched.loading;
  const name = storeName ?? data?.storeName ?? '';
  return (
    <View style={[styles.card, { borderColor: colors.primary, backgroundColor: colors.surface }]} accessibilityLabel={`${t('pagos.info.title')} ${name}`}>
      <View style={styles.row}>
        <Landmark size={18} color={colors.primary} />
        <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.text }]}>{`${t('pagos.info.title')}${name ? ` · ${name}` : ''}`}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : !data || !data.available ? (
        <Text style={{ color: colors.textSecondary }}>{t('pagos.info.none')}</Text>
      ) : (
        <>
          {tipAmountBs !== undefined && <PaymentSafetyTip amountBs={tipAmountBs} />}
          <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>{t('pagos.info.subtitle')}</Text>
          {data.qrUrl && resolveImageUrl(data.qrUrl) ? <Image source={{ uri: resolveImageUrl(data.qrUrl) }} style={styles.qr} resizeMode="contain" accessible accessibilityLabel={t('pagos.info.qrA11y', { store: name })} /> : null}
          {data.method ? <Text style={{ color: colors.text, marginTop: 6 }}>{t(`pagos.info.method.${data.method}`)}</Text> : null}
          {data.accountHolder ? <CopyRow label={t('pagos.info.holder')} value={data.accountHolder} /> : null}
          {data.bankName ? (
            <View style={{ minHeight: TOUCH, justifyContent: 'center' }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('pagos.info.bank')}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{data.bankName}</Text>
            </View>
          ) : null}
          {data.accountNumber ? <CopyRow label={t('pagos.info.account')} value={data.accountNumber} /> : null}
          {data.phoneQr ? <CopyRow label={t('pagos.info.phoneQr')} value={data.phoneQr} /> : null}
          {!data.full && data.approved ? <Text style={[styles.label, { color: colors.textSecondary, marginTop: 6 }]}>{loggedIn ? t('pagos.info.masked') : t('pagos.info.loginToSee')}</Text> : null}
        </>
      )}
    </View>
  );
}

// ── Campo de imagen del QR: galería / cámara + vista previa, sin URL ────────
export type PickedImage = { uri: string; mimeType?: string | null; fileSize?: number | null };

export async function pickQrImage(source: 'library' | 'camera'): Promise<PickedImage | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const opts = { mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: true, aspect: [1, 1] as [number, number], quality: 0.85, exif: false };
  const r = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets?.[0]?.uri) return null;
  const a = r.assets[0];
  return { uri: a.uri, mimeType: a.mimeType ?? null, fileSize: a.fileSize ?? null };
}

export function QrImageField({ value, onChange, upload, pick = pickQrImage }: { value: string | null; onChange: (url: string | null) => void; upload: (uri: string, mime?: string | null) => Promise<string>; pick?: typeof pickQrImage }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = preview ?? value;

  const choose = async (source: 'library' | 'camera') => {
    const img = await pick(source).catch(() => null);
    if (!img) return;
    if (img.fileSize && img.fileSize > QR_MAX_BYTES) {
      Alert.alert(t('pagos.qr.title'), t('pagos.qr.help'));
      return;
    }
    setPreview(img.uri); // vista previa ANTES de guardar
    setBusy(true);
    try {
      onChange(await upload(img.uri, img.mimeType));
    } catch (e) {
      setPreview(null);
      Alert.alert(t('pagos.qr.title'), (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const btn = (label: string, icon: React.ReactNode, onPress: () => void, testID: string, danger = false) => (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress} style={[styles.actionBtn, { borderColor: danger ? colors.error : colors.primary, opacity: busy ? 0.5 : 1 }]}>
      {icon}
      <Text style={{ color: danger ? colors.error : colors.primary, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return (
    <View>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{t('pagos.qr.title')}</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('pagos.qr.help')}</Text>
      <View style={[styles.previewBox, { borderColor: colors.border }]}>
        {shown ? <Image testID="qr-preview" source={{ uri: shown.startsWith('/') ? resolveImageUrl(shown) : shown }} style={styles.qr} resizeMode="contain" accessible accessibilityLabel={t('pagos.qr.previewA11y')} /> : <ImageUp size={40} color={colors.textSecondary} />}
        {busy ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} accessibilityLabel={t('pagos.qr.uploading')} /> : null}
      </View>
      <View style={styles.actions}>
        {btn(shown ? t('pagos.qr.change') : t('pagos.qr.gallery'), <ImageUp size={18} color={colors.primary} />, () => choose('library'), 'qr-gallery')}
        {btn(t('pagos.qr.camera'), <Camera size={18} color={colors.primary} />, () => choose('camera'), 'qr-camera')}
        {shown ? btn(t('pagos.qr.remove'), <Trash size={18} color={colors.error} />, () => { setPreview(null); onChange(null); }, 'qr-remove', true) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tip: { borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 10, gap: 6 },
  tipTitle: { fontWeight: '800', fontSize: 14 },
  tipText: { fontSize: 14, lineHeight: 20 },
  linkBtn: { minHeight: TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  card: { borderWidth: 2, borderRadius: 14, padding: 12, marginVertical: 8, gap: 4 },
  cardTitle: { fontWeight: '800', fontSize: 15 },
  label: { fontSize: 12 },
  value: { fontSize: 16, fontWeight: '700' },
  iconBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  qr: { width: 180, height: 180, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'center' },
  previewBox: { width: 190, height: 190, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, justifyContent: 'center' },
  actionBtn: { minHeight: TOUCH, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
