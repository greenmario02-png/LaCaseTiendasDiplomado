import React, { useMemo,  useState  } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { api, getErrorMessage } from '../services/api';
import { uploadImage } from '../services/upload';
import { useAuthStore } from '../stores/authStore';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';
import { useAppTheme } from '../theme/ThemeContext';
import ImagePickerButton from '../components/ImagePickerButton';

export default function EditStoreScreen({ navigation }: any) {
  const { colors } = useAppTheme();
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
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.storeName.trim()) {
      Alert.alert('Falta información', 'El nombre de la tienda es obligatorio.');
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
      Alert.alert('Listo', 'Tienda actualizada correctamente.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Editar tienda</Text>
      <Text style={styles.subtitle}>Actualizá la información pública de tu tienda.</Text>

      <Text style={styles.label}>Logo de la tienda</Text>
      <ImagePickerButton
        label={uploading ? 'Subiendo...' : 'Cambiar logo'}
        currentUri={storeLogo}
        onPicked={handlePickedLogo}
        square
        uploading={uploading}
      />

      <Text style={styles.label}>Nombre de la tienda *</Text>
      <NeoInput style={styles.input} value={form.storeName} onChangeText={(v) => set('storeName', v)} placeholder="Ej: Gislason - Kreiger" />

      <Text style={styles.label}>Categoría de la tienda</Text>
      <NeoInput style={styles.input} value={form.storeCategory} onChangeText={(v) => set('storeCategory', v)} placeholder="Ej: Tecnología, Moda, Hogar..." />

      <Text style={styles.label}>Descripción</Text>
      <NeoInput
        style={styles.textarea}
        value={form.storeDescription}
        onChangeText={(v) => set('storeDescription', v)}
        placeholder="Contá qué vendés..."
        multiline
      />

      <Text style={styles.label}>WhatsApp</Text>
      <NeoInput style={styles.input} value={form.whatsappPhone} onChangeText={(v) => set('whatsappPhone', v)} placeholder="Ej: 59170000000" keyboardType="phone-pad" />

      <Text style={styles.label}>Ciudad</Text>
      <NeoInput style={styles.input} value={form.locationCity} onChangeText={(v) => set('locationCity', v)} placeholder="Ej: La Paz" />

      <Text style={styles.label}>Departamento / Provincia</Text>
      <NeoInput style={styles.input} value={form.locationState} onChangeText={(v) => set('locationState', v)} placeholder="Ej: La Paz" />

      <Text style={styles.label}>Envío gratis desde (Bs)</Text>
      <NeoInput style={styles.input} value={form.freeShippingThreshold} onChangeText={(v) => set('freeShippingThreshold', v)} placeholder="Ej: 300" keyboardType="numeric" />

      <Text style={styles.section}>Redes sociales</Text>

      <Text style={styles.label}>Instagram</Text>
      <NeoInput style={styles.input} value={form.instagramUrl} onChangeText={(v) => set('instagramUrl', v)} placeholder="https://instagram.com/..." />

      <Text style={styles.label}>Facebook</Text>
      <NeoInput style={styles.input} value={form.facebookUrl} onChangeText={(v) => set('facebookUrl', v)} placeholder="https://facebook.com/..." />

      <Text style={styles.label}>TikTok</Text>
      <NeoInput style={styles.input} value={form.tiktokUrl} onChangeText={(v) => set('tiktokUrl', v)} placeholder="https://tiktok.com/..." />

      <View style={styles.buttonWrap}>
        <NeoButton title={saving ? 'Guardando...' : 'Guardar cambios'} onPress={save} disabled={saving} />
      </View>
      <NeoButton title="Cancelar" variant="ghost" onPress={() => navigation.goBack()} />
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
  section: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 20 },
  input: {},
  textarea: { minHeight: 84 },
  buttonWrap: { marginTop: 24 },
});
