import React, { useMemo,  useState  } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../services/api';
import { uploadImage } from '../services/upload';
import { useAuthStore } from '../stores/authStore';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';
import { useAppTheme } from '../theme/ThemeContext';
import ImagePickerButton from '../components/ImagePickerButton';

export default function EditStoreScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [form, setForm] = useState({
    storeName: user?.storeName ?? '',
    storeDescription: user?.storeDescription ?? '',
    storeCategory: user?.storeCategory ?? '',
    whatsappPhone: user?.whatsappPhone ?? '',
    locationCity: user?.locationCity ?? '',
    locationState: user?.locationState ?? '',
    instagramUrl: user?.instagramUrl ?? '',
    facebookUrl: user?.facebookUrl ?? '',
    tiktokUrl: user?.tiktokUrl ?? '',
    freeShippingThreshold: user?.freeShippingThreshold ? String(user.freeShippingThreshold) : '',
  });
  const [storeLogo, setStoreLogo] = useState<string>(user?.storeLogo ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handlePickedLogo = async (uri: string) => {
    setUploading(true);
    try {
      const url = await uploadImage(uri, '/seller/upload');
      setStoreLogo(url);
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.storeName.trim()) {
      Alert.alert(t('mobile.editStore.missingInfoTitle'), t('mobile.editStore.missingInfoMessage'));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        storeName: form.storeName.trim(),
        storeDescription: form.storeDescription.trim() || undefined,
        storeCategory: form.storeCategory.trim() || undefined,
        whatsappPhone: form.whatsappPhone.trim() || undefined,
        locationCity: form.locationCity.trim() || undefined,
        locationState: form.locationState.trim() || undefined,
        instagramUrl: form.instagramUrl.trim() || undefined,
        facebookUrl: form.facebookUrl.trim() || undefined,
        tiktokUrl: form.tiktokUrl.trim() || undefined,
        ...(storeLogo ? { storeLogo } : {}),
      };
      if (form.freeShippingThreshold.trim()) {
        payload.freeShippingThreshold = Number(form.freeShippingThreshold);
      }
      await api.put('/seller/profile', payload);
      await refreshUser();
      Alert.alert(t('mobile.common.done'), t('mobile.editStore.updateSuccessMessage'));
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('mobile.editStore.title')}</Text>
      <Text style={styles.subtitle}>{t('mobile.editStore.subtitle')}</Text>

      <Text style={styles.label}>{t('mobile.editStore.logoLabel')}</Text>
      <ImagePickerButton
        label={uploading ? t('mobile.common.uploading') : t('mobile.editStore.changeLogoButton')}
        currentUri={storeLogo}
        onPicked={handlePickedLogo}
        square
        uploading={uploading}
      />

      <Text style={styles.label}>{t('mobile.editStore.storeNameLabel')}</Text>
      <NeoInput style={styles.input} value={form.storeName} onChangeText={(v) => set('storeName', v)} placeholder={t('mobile.editStore.storeNamePlaceholder')} />

      <Text style={styles.hint}>{t('mobile.editStore.identityNotice')}</Text>

      <Text style={styles.label}>{t('mobile.editStore.categoryLabel')}</Text>
      <NeoInput style={styles.input} value={form.storeCategory} onChangeText={(v) => set('storeCategory', v)} placeholder={t('mobile.editStore.categoryPlaceholder')} />

      <Text style={styles.label}>{t('mobile.editStore.descriptionLabel')}</Text>
      <NeoInput
        style={styles.textarea}
        value={form.storeDescription}
        onChangeText={(v) => set('storeDescription', v)}
        placeholder={t('mobile.editStore.descriptionPlaceholder')}
        multiline
      />

      <Text style={styles.label}>{t('mobile.editStore.whatsappLabel')}</Text>
      <NeoInput style={styles.input} value={form.whatsappPhone} onChangeText={(v) => set('whatsappPhone', v)} placeholder={t('mobile.editStore.whatsappPlaceholder')} keyboardType="phone-pad" />

      <Text style={styles.label}>{t('mobile.common.city')}</Text>
      <NeoInput style={styles.input} value={form.locationCity} onChangeText={(v) => set('locationCity', v)} placeholder={t('mobile.editStore.cityPlaceholder')} />

      <Text style={styles.label}>{t('mobile.common.stateProvince')}</Text>
      <NeoInput style={styles.input} value={form.locationState} onChangeText={(v) => set('locationState', v)} placeholder={t('mobile.editStore.statePlaceholder')} />

      <Text style={styles.hint}>{t('mobile.editStore.identityNotice')}</Text>

      <Text style={styles.label}>{t('mobile.editStore.freeShippingLabel')}</Text>
      <NeoInput style={styles.input} value={form.freeShippingThreshold} onChangeText={(v) => set('freeShippingThreshold', v)} placeholder={t('mobile.editStore.freeShippingPlaceholder')} keyboardType="numeric" />

      <Text style={styles.section}>{t('mobile.editStore.socialSection')}</Text>

      <Text style={styles.label}>{t('mobile.editStore.instagramLabel')}</Text>
      <NeoInput style={styles.input} value={form.instagramUrl} onChangeText={(v) => set('instagramUrl', v)} placeholder={t('mobile.editStore.instagramPlaceholder')} />

      <Text style={styles.label}>{t('mobile.editStore.facebookLabel')}</Text>
      <NeoInput style={styles.input} value={form.facebookUrl} onChangeText={(v) => set('facebookUrl', v)} placeholder={t('mobile.editStore.facebookPlaceholder')} />

      <Text style={styles.label}>{t('mobile.editStore.tiktokLabel')}</Text>
      <NeoInput style={styles.input} value={form.tiktokUrl} onChangeText={(v) => set('tiktokUrl', v)} placeholder={t('mobile.editStore.tiktokPlaceholder')} />

      <View style={styles.buttonWrap}>
        <NeoButton title={saving ? t('mobile.common.saving') : t('mobile.common.saveChanges')} onPress={save} disabled={saving} />
      </View>
      <NeoButton title={t('mobile.common.cancel')} variant="ghost" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 4 },
  hint: { fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 15 },
  section: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 20 },
  input: {},
  textarea: { minHeight: 84 },
  buttonWrap: { marginTop: 24 },
});
