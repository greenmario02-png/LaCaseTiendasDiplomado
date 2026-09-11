import React, { useMemo,  useState  } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { api, getErrorMessage } from '../services/api';
import { uploadImage } from '../services/upload';
import { useAuthStore } from '../stores/authStore';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';
import { useAppTheme } from '../theme/ThemeContext';
import ImagePickerButton from '../components/ImagePickerButton';

export default function EditProfileScreen({ navigation }: any) {
  const { colors } = useAppTheme();
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
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Falta información', 'El nombre y apellido son obligatorios.');
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
      Alert.alert('Listo', 'Perfil actualizado correctamente.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Editar perfil</Text>
      <Text style={styles.subtitle}>Actualizá tus datos personales.</Text>

      <Text style={styles.label}>Foto de perfil</Text>
      <ImagePickerButton
        label={uploading ? 'Subiendo...' : 'Cambiar foto'}
        currentUri={profileImage}
        onPicked={handlePickedImage}
        square
        uploading={uploading}
      />

      <Text style={styles.label}>Nombre *</Text>
      <NeoInput style={styles.input} value={form.firstName} onChangeText={(v) => set('firstName', v)} placeholder="Tu nombre" />

      <Text style={styles.label}>Apellido *</Text>
      <NeoInput style={styles.input} value={form.lastName} onChangeText={(v) => set('lastName', v)} placeholder="Tu apellido" />

      <Text style={styles.label}>Teléfono</Text>
      <NeoInput style={styles.input} value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="Ej: 591 70000000" keyboardType="phone-pad" />

      <Text style={styles.label}>País</Text>
      <NeoInput style={styles.input} value={form.country} onChangeText={(v) => set('country', v)} placeholder="Ej: Bolivia" />

      <Text style={styles.label}>Ciudad</Text>
      <NeoInput style={styles.input} value={form.locationCity} onChangeText={(v) => set('locationCity', v)} placeholder="Ej: La Paz" />

      <Text style={styles.label}>Departamento / Provincia</Text>
      <NeoInput style={styles.input} value={form.locationState} onChangeText={(v) => set('locationState', v)} placeholder="Ej: La Paz" />

      <Text style={styles.label}>Sobre vos</Text>
      <NeoInput
        style={styles.textarea}
        value={form.bio}
        onChangeText={(v) => set('bio', v)}
        placeholder="Contá algo sobre vos..."
        multiline
      />

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
  input: {},
  textarea: { minHeight: 84 },
  buttonWrap: { marginTop: 24 },
});
