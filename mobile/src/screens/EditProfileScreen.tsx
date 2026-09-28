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

export default function EditProfileScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    bio: user?.bio ?? '',
    country: user?.country ?? '',
    locationCity: user?.locationCity ?? '',
    locationState: user?.locationState ?? '',
  });
  const [profileImage, setProfileImage] = useState<string>(user?.profileImage ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handlePickedImage = async (uri: string) => {
    setUploading(true);
    try {
      const url = await uploadImage(uri, '/account/upload');
      setProfileImage(url);
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert(t('mobile.editProfile.missingInfoTitle'), t('mobile.editProfile.missingInfoMessage'));
      return;
    }
    setSaving(true);
    try {
      await api.put('/account', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        bio: form.bio.trim() || undefined,
        country: form.country.trim() || undefined,
        locationCity: form.locationCity.trim() || undefined,
        locationState: form.locationState.trim() || undefined,
        ...(profileImage ? { profileImage } : {}),
      });
      await refreshUser();
      Alert.alert(t('mobile.common.done'), t('mobile.editProfile.updateSuccessMessage'));
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('mobile.editProfile.title')}</Text>
      <Text style={styles.subtitle}>{t('mobile.editProfile.subtitle')}</Text>

      <Text style={styles.label}>{t('mobile.editProfile.photoLabel')}</Text>
      <ImagePickerButton
        label={uploading ? t('mobile.common.uploading') : t('mobile.editProfile.changePhotoButton')}
        currentUri={profileImage}
        onPicked={handlePickedImage}
        square
        uploading={uploading}
      />

      <Text style={styles.label}>{t('mobile.editProfile.firstNameLabel')}</Text>
      <NeoInput style={styles.input} value={form.firstName} onChangeText={(v) => set('firstName', v)} placeholder={t('mobile.editProfile.firstNamePlaceholder')} />

      <Text style={styles.label}>{t('mobile.editProfile.lastNameLabel')}</Text>
      <NeoInput style={styles.input} value={form.lastName} onChangeText={(v) => set('lastName', v)} placeholder={t('mobile.editProfile.lastNamePlaceholder')} />

      <Text style={styles.label}>{t('mobile.common.phone')}</Text>
      <NeoInput style={styles.input} value={form.phone} onChangeText={(v) => set('phone', v)} placeholder={t('mobile.editProfile.phonePlaceholder')} keyboardType="phone-pad" />

      <Text style={styles.label}>{t('mobile.common.country')}</Text>
      <NeoInput style={styles.input} value={form.country} onChangeText={(v) => set('country', v)} placeholder={t('mobile.editProfile.countryPlaceholder')} />

      <Text style={styles.label}>{t('mobile.common.city')}</Text>
      <NeoInput style={styles.input} value={form.locationCity} onChangeText={(v) => set('locationCity', v)} placeholder={t('mobile.editProfile.cityPlaceholder')} />

      <Text style={styles.label}>{t('mobile.common.stateProvince')}</Text>
      <NeoInput style={styles.input} value={form.locationState} onChangeText={(v) => set('locationState', v)} placeholder={t('mobile.editProfile.cityPlaceholder')} />

      <Text style={styles.label}>{t('mobile.editProfile.bioLabel')}</Text>
      <NeoInput
        style={styles.textarea}
        value={form.bio}
        onChangeText={(v) => set('bio', v)}
        placeholder={t('mobile.editProfile.bioPlaceholder')}
        multiline
      />

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
  input: {},
  textarea: { minHeight: 84 },
  buttonWrap: { marginTop: 24 },
});
