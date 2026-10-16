import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Coins, MessageCircle, Receipt, Wallet } from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { usePendingPaymentCount } from '../../services/payments';
import { currencySymbol, useCurrencyStore, useMoney } from '../../services/money';
import { TOUCH } from './PaymentBits';

/**
 * Accesos directos al pago en el perfil: «Mis pedidos», «Pagar pedidos pendientes» (con contador) y «Mensajes»,
 * sin tener que buscar el pedido. Antes en la app no había un botón directo para pagar.
 */
export function AccountQuickActions({ navigation, enabled = true }: { navigation: { navigate: (r: string, p?: object) => void }; enabled?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { count, refresh } = usePendingPaymentCount(enabled);
  useFocusEffect(useCallback(() => refresh(), [refresh]));

  const item = (testID: string, icon: React.ReactNode, label: string, onPress: () => void, badge = 0, a11y?: string) => (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={a11y ?? label} onPress={onPress} style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {icon}
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={2}>{label}</Text>
      {badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <View accessibilityLabel={t('pagos.menu.title')} style={styles.wrap}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{t('pagos.menu.title')}</Text>
      <View style={styles.row}>
        {item('quick-orders', <Receipt size={20} color={colors.primary} />, t('pagos.menu.orders'), () => navigation.navigate('Orders'))}
        {item('quick-pay', <Wallet size={20} color={colors.warning} />, t('pagos.menu.payPending'), () => navigation.navigate('Orders', { pendingPayment: true }), count, t('pagos.menu.payPendingA11y', { count }))}
        {item('quick-messages', <MessageCircle size={20} color={colors.primary} />, t('pagos.menu.messages'), () => navigation.navigate('Chat'))}
      </View>
    </View>
  );
}

/** Selector de moneda: los montos de la app se muestran convertidos y con su denominación (US$, €, ...). */
export function CurrencyPicker() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  useMoney(); // carga la elección guardada
  const loadCurrencies = useCurrencyStore((s) => s.loadCurrencies);
  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);
  const currencies = useCurrencyStore((s) => s.currencies);
  const selected = useCurrencyStore((s) => s.selected);
  const setSelected = useCurrencyStore((s) => s.setSelected);
  const list = currencies.length ? currencies : [{ code: 'BOB', name: 'Boliviano', symbol: 'Bs', rate: 1 }];
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { alignItems: 'center' }]}>
        <Coins size={18} color={colors.primary} />
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text, marginBottom: 0 }]}>{t('pagos.menu.currency')}</Text>
      </View>
      <View style={[styles.row, { flexWrap: 'wrap', marginTop: 8 }]} accessibilityRole="radiogroup">
        {list.map((c) => {
          const on = c.code === selected;
          return (
            <Pressable
              key={c.code}
              testID={`currency-${c.code}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${c.name} (${currencySymbol(c.code, list)})`}
              onPress={() => setSelected(c.code)}
              style={[styles.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : colors.surface }]}
            >
              <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '700' }}>{`${c.code} ${currencySymbol(c.code, list)}`}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 12 },
  title: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  item: { flex: 1, minHeight: 72, minWidth: TOUCH, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badge: { position: 'absolute', top: 6, right: 6, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  chip: { minHeight: TOUCH, minWidth: TOUCH, paddingHorizontal: 12, borderWidth: 1.5, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
