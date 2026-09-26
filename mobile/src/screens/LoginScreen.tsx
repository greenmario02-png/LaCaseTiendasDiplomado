import React, { useMemo,  useState  } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Store } from 'lucide-react-native';
import { useAuthStore } from '../stores/authStore';
import { getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { NeoButton } from '../components/redesign/NeoButton';
import { NeoInput } from '../components/redesign/NeoInput';

export default function LoginScreen({ navigation }: any) {
  const { colors, raised } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!email || !password) {
      setError('Ingresá tu email y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
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
            <Store size={30} color={colors.primary} />
          </View>
          <Text style={styles.logo}>LaCase Multi Tiendas</Text>
          <Text style={styles.subtitle}>Bienvenido de nuevo</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <NeoInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <NeoInput
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <NeoButton title={loading ? 'Ingresando...' : 'Ingresar'} onPress={submit} disabled={loading} />

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkWrap}>
            <Text style={styles.link}>¿No tenés cuenta? Registrate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    card: { backgroundColor: colors.surface, borderRadius: 24, padding: 24 },
    logoBox: {
      alignSelf: 'center',
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      marginBottom: 14,
    },
    logo: { fontSize: 26, fontWeight: '900', color: colors.primary, textAlign: 'center' },
    subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 24 },
    errorBox: { borderLeftWidth: 3, borderLeftColor: colors.error, borderRadius: 8, padding: 12, marginBottom: 14 },
    errorText: { color: colors.error, fontSize: 13 },
    linkWrap: { marginTop: 18 },
    link: { color: colors.primary, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  });
