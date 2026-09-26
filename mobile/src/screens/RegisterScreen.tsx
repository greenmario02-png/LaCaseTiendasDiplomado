import React, { useMemo,  useState  } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { getErrorMessage } from '../services/api';
import { COUNTRIES, STORE_CATEGORIES } from '../data/geo';
import { ShoppingCart, Store } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { NeoButton } from '../components/redesign/NeoButton';
import { NeoInput } from '../components/redesign/NeoInput';

export default function RegisterScreen({ navigation }: any) {
  const { colors, raised, pressed } = useAppTheme();
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
        <View style={[styles.card, raised]}>
          <View style={[styles.logoBox, raised]}>
            <Store size={28} color={colors.primary} />
          </View>
          <Text style={styles.logo}>Crear cuenta</Text>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'CUSTOMER' ? { ...pressed } : { ...raised }]}
              onPress={() => setMode('CUSTOMER')}
            >
              <View style={styles.tabRow}>
                <ShoppingCart size={15} color={mode === 'CUSTOMER' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabText, mode === 'CUSTOMER' && styles.tabTextActive]}>Comprador</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'SELLER' ? { ...pressed } : { ...raised }]} onPress={() => setMode('SELLER')}>
              <View style={styles.tabRow}>
                <Store size={15} color={mode === 'SELLER' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabText, mode === 'SELLER' && styles.tabTextActive]}>Vendedor</Text>
              </View>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <NeoInput placeholder="Nombre" value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" returnKeyType="next" />
          <NeoInput placeholder="Apellido" value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" returnKeyType="next" />
          <NeoInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" returnKeyType="next" />
          <NeoInput placeholder="Contraseña (mín. 8)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
          <NeoInput placeholder="Celular de contacto" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />

          {mode === 'SELLER' && (
            <>
              <Text style={styles.sectionLabel}>Datos de la tienda</Text>
              <NeoInput placeholder="Nombre de la tienda" value={storeName} onChangeText={setStoreName} />
              <NeoInput placeholder="Descripción (mín. 10 caracteres)" value={storeDescription} onChangeText={setStoreDescription} multiline />

              <Text style={styles.label}>Categoría de productos</Text>
              <View style={styles.chips}>
                {STORE_CATEGORIES.slice(0, 8).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, storeCategory === c ? { ...pressed } : { ...raised }]}
                    onPress={() => setStoreCategory(c)}
                  >
                    <Text style={[styles.chipText, storeCategory === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>País</Text>
              <View style={styles.chips}>
                {COUNTRIES.map((c) => (
                  <TouchableOpacity key={c.code} style={[styles.chip, countryCode === c.code ? { ...pressed } : { ...raised }]} onPress={() => { setCountryCode(c.code); setDivision(''); }}>
                    <Text style={[styles.chipText, countryCode === c.code && styles.chipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{country.divisionLabel}</Text>
              <View style={styles.chips}>
                {country.divisions.map((d) => (
                  <TouchableOpacity key={d.name} style={[styles.chip, division === d.name ? { ...pressed } : { ...raised }]} onPress={() => setDivision(d.name)}>
                    <Text style={[styles.chipText, division === d.name && styles.chipTextActive]}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <NeoInput placeholder="Ciudad" value={city} onChangeText={setCity} />
            </>
          )}

          <NeoButton
            title={loading ? 'Enviando...' : mode === 'SELLER' ? 'Crear tienda' : 'Registrarme'}
            onPress={submit}
            disabled={loading}
            style={styles.button}
          />

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkWrap}>
            <Text style={styles.link}>¿Ya tenés cuenta? Ingresá</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { padding: 20, paddingBottom: 40 },
    card: { backgroundColor: colors.surface, borderRadius: 24, padding: 20 },
    logoBox: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      marginBottom: 10,
    },
    logo: { fontSize: 24, fontWeight: '900', color: colors.primary, textAlign: 'center', marginBottom: 18 },
    tabs: { flexDirection: 'row', gap: 12, marginBottom: 18 },
    tab: { flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    tabRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    tabText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
    tabTextActive: { color: colors.primary },
    errorBox: { borderLeftWidth: 3, borderLeftColor: colors.error, borderRadius: 8, padding: 12, marginBottom: 14 },
    errorText: { color: colors.error, fontSize: 13 },
    sectionLabel: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 8, marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 4, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.surface },
    chipText: { fontSize: 12, color: colors.textSecondary },
    chipTextActive: { color: colors.primary, fontWeight: '700' },
    button: { marginTop: 4 },
    linkWrap: { marginTop: 18 },
    link: { color: colors.primary, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  });
