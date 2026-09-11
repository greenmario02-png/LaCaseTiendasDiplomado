import React, { useMemo,  useState  } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { getErrorMessage } from '../services/api';
import { COUNTRIES, STORE_CATEGORIES } from '../data/geo';
import { ShoppingCart, Store } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function RegisterScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const register = useAuthStore((s) => s.register);
  const [mode, setMode] = useState<'CUSTOMER' | 'SELLER'>('CUSTOMER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Vendedor
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeCategory, setStoreCategory] = useState(STORE_CATEGORIES[0]);
  const [countryCode, setCountryCode] = useState('BO');
  const [division, setDivision] = useState('');
  const [city, setCity] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];

  const submit = async () => {
    setError('');
    if (!firstName || !lastName || !email || !password) {
      setError('Completá nombre, apellido, email y contraseña');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    const base = {
      firstName,
      lastName,
      email: email.trim(),
      password,
      phone,
    };

    const payload =
      mode === 'SELLER'
        ? {
            ...base,
            role: 'SELLER',
            storeName,
            storeDescription,
            storeCategory,
            country: countryCode,
            locationCity: city,
            locationState: division,
          }
        : { ...base, role: 'CUSTOMER' };

    setLoading(true);
    try {
      await register(payload);
      if (mode === 'SELLER') {
        Alert.alert('¡Tienda registrada!', 'Tu tienda quedó pendiente de aprobación del administrador. Te avisaremos.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={0}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Crear cuenta</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'CUSTOMER' && styles.tabActive]}
            onPress={() => setMode('CUSTOMER')}
          >
            <View style={styles.tabRow}>
              <ShoppingCart size={15} color={mode === 'CUSTOMER' ? '#fff' : colors.textSecondary} />
              <Text style={[styles.tabText, mode === 'CUSTOMER' && styles.tabTextActive]}>Comprador</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'SELLER' && styles.tabActive]} onPress={() => setMode('SELLER')}>
            <View style={styles.tabRow}>
              <Store size={15} color={mode === 'SELLER' ? '#fff' : colors.textSecondary} />
              <Text style={[styles.tabText, mode === 'SELLER' && styles.tabTextActive]}>Vendedor</Text>
            </View>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput style={styles.input} placeholder="Nombre" value={firstName} onChangeText={setFirstName} placeholderTextColor="#999" />
        <TextInput style={styles.input} placeholder="Apellido" value={lastName} onChangeText={setLastName} placeholderTextColor="#999" />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#999" />
        <TextInput style={styles.input} placeholder="Contraseña (mín. 8)" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#999" />
        <TextInput style={styles.input} placeholder="Celular de contacto" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#999" />

        {mode === 'SELLER' && (
          <>
            <Text style={styles.sectionLabel}>Datos de la tienda</Text>
            <TextInput style={styles.input} placeholder="Nombre de la tienda" value={storeName} onChangeText={setStoreName} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Descripción (mín. 10 caracteres)" value={storeDescription} onChangeText={setStoreDescription} multiline placeholderTextColor="#999" />

            <Text style={styles.label}>Categoría de productos</Text>
            <View style={styles.chips}>
              {STORE_CATEGORIES.slice(0, 8).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, storeCategory === c && styles.chipActive]}
                  onPress={() => setStoreCategory(c)}
                >
                  <Text style={[styles.chipText, storeCategory === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>País</Text>
            <View style={styles.chips}>
              {COUNTRIES.map((c) => (
                <TouchableOpacity key={c.code} style={[styles.chip, countryCode === c.code && styles.chipActive]} onPress={() => { setCountryCode(c.code); setDivision(''); }}>
                  <Text style={[styles.chipText, countryCode === c.code && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{country.divisionLabel}</Text>
            <View style={styles.chips}>
              {country.divisions.map((d) => (
                <TouchableOpacity key={d.name} style={[styles.chip, division === d.name && styles.chipActive]} onPress={() => setDivision(d.name)}>
                  <Text style={[styles.chipText, division === d.name && styles.chipTextActive]}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={styles.input} placeholder="Ciudad" value={city} onChangeText={setCity} placeholderTextColor="#999" />
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === 'SELLER' ? 'Crear tienda' : 'Registrarme'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={styles.link}>¿Ya tenés cuenta? Ingresá</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingBottom: 40 },
  logo: { fontSize: 26, fontWeight: '900', color: colors.primary, textAlign: 'center', marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface },
  tabRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: '#fff' },
  errorBox: { backgroundColor: '#FDECEA', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: colors.error, fontSize: 13 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 12, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 8, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: colors.primary, textAlign: 'center', fontSize: 14 },
});
