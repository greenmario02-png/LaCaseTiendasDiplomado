import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react-native';
import { SUPPORTED_LANGUAGES, setLanguage } from '../../i18n';
import { useAppTheme } from '../../theme/ThemeContext';

/**
 * Selector de idioma para la app móvil — mismo catálogo que el del frontend web
 * (`src/locales/languages.json`). Los idiomas "stub" se marcan con "ES" porque todavía
 * renderizan el texto en español (ver README de locales).
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const styles = makeStyles(colors);

  const current = SUPPORTED_LANGUAGES[i18n.language] ?? SUPPORTED_LANGUAGES.es;

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Languages size={20} color={colors.text} />
        <Text style={styles.triggerLabel}>{current.nativeName}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t('common.language', 'Idioma')}</Text>
            <FlatList
              data={Object.entries(SUPPORTED_LANGUAGES)}
              keyExtractor={([code]) => code}
              renderItem={({ item: [code, lang] }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={async () => {
                    await setLanguage(code);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionLabel}>{lang.nativeName}</Text>
                  <View style={styles.optionRight}>
                    {lang.status === 'stub' && <Text style={styles.stubBadge}>ES</Text>}
                    {code === i18n.language && <Check size={18} color={colors.primary} />}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    trigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
    triggerLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '60%' },
    title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    optionLabel: { fontSize: 15, color: colors.text },
    optionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stubBadge: { fontSize: 11, color: colors.textSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  });
}

export default LanguageSwitcher;
