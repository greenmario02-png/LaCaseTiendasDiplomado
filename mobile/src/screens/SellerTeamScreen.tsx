import React, { useMemo,  useCallback, useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';

export default function SellerTeamScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'EMPLOYEE' });
  const [inviting, setInviting] = useState(false);

  const isOwner = user?.storeRole === 'OWNER';

  const roleLabel = (role: string): string => {
    const map: Record<string, string> = {
      OWNER: t('mobile.sellerTeam.roleOwner'),
      ADMIN: t('mobile.sellerTeam.roleAdmin'),
      EMPLOYEE: t('mobile.sellerTeam.roleEmployee'),
    };
    return map[role] ?? role;
  };

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/seller/team');
      setMembers(data.data ?? []);
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const invite = async () => {
    if (!inviteForm.email.trim()) return Alert.alert(t('mobile.common.missingInfoTitle'), t('mobile.sellerTeam.emailRequiredMessage'));
    setInviting(true);
    try {
      await api.post('/seller/team/invite', { email: inviteForm.email.trim(), role: inviteForm.role });
      Alert.alert(t('mobile.common.doneTitle'), t('mobile.sellerTeam.inviteSuccessMessage'));
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'EMPLOYEE' });
      load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (id: number, role: string) => {
    try {
      await api.put(`/seller/team/${id}/role`, { role });
      load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    }
  };

  const remove = (id: number, name: string) => {
    Alert.alert(t('mobile.sellerTeam.removeConfirmTitle'), t('mobile.sellerTeam.removeConfirmMessage', { name }), [
      { text: t('mobile.common.cancel'), style: 'cancel' },
      {
        text: t('mobile.common.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/seller/team/${id}`);
            load();
          } catch (e) {
            Alert.alert(t('mobile.common.error'), getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelf = item.id === user?.id;
    const memberRole = item.storeRole ?? item.role ?? 'EMPLOYEE';
    return (
      <View style={styles.card}>
        <View style={styles.body}>
          <Text style={styles.name}>
            {item.firstName} {item.lastName} {isSelf ? t('mobile.sellerTeam.youSuffix') : ''}
          </Text>
          <Text style={styles.email}>{item.email}</Text>
          <View style={styles.badgeRow}>
            <Text style={styles.role}>{roleLabel(memberRole)}</Text>
          </View>
        </View>
        {isOwner && !isSelf && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.miniBtn} onPress={() => changeRole(item.id, memberRole === 'EMPLOYEE' ? 'ADMIN' : 'EMPLOYEE')}>
              <Text style={styles.miniBtnText}>{memberRole === 'EMPLOYEE' ? t('mobile.sellerTeam.makeAdminButton') : t('mobile.sellerTeam.makeEmployeeButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.miniBtn, { borderColor: colors.error }]} onPress={() => remove(item.id, item.firstName ?? '')}>
              <Text style={[styles.miniBtnText, { color: colors.error }]}>{t('mobile.common.remove')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('mobile.sellerTeam.title')}</Text>
        {isOwner && (
          <View style={styles.addWrap}>
            <NeoButton title={t('mobile.sellerTeam.inviteEmployeeButton')} onPress={() => setInviteOpen(true)} />
          </View>
        )}
      </View>
      {loading ? (
        <LoadingState />
      ) : members.length === 0 ? (
        <EmptyState message={isOwner ? t('mobile.sellerTeam.emptyOwnerMessage') : t('mobile.sellerTeam.emptyNonOwnerMessage')} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
        />
      )}

      <Modal visible={inviteOpen} transparent animationType="fade" onRequestClose={() => setInviteOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('mobile.sellerTeam.inviteEmployeeButton')}</Text>
            <Text style={styles.label}>{t('mobile.sellerTeam.userEmailLabel')}</Text>
            <NeoInput style={styles.input} value={inviteForm.email} onChangeText={(v) => setInviteForm((f) => ({ ...f, email: v }))} placeholder={t('mobile.sellerTeam.userEmailPlaceholder')} keyboardType="email-address" />
            <Text style={styles.label}>{t('mobile.sellerTeam.roleLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['EMPLOYEE', 'ADMIN'].map((r) => {
                const active = inviteForm.role === r;
                return (
                  <TouchableOpacity key={r} style={[styles.chip, active && styles.chipActive]} onPress={() => setInviteForm((f) => ({ ...f, role: r }))}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{roleLabel(r)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <NeoButton title={t('mobile.sellerTeam.sendInviteButton')} onPress={invite} disabled={inviting} style={styles.save} />
            <NeoButton title={t('mobile.common.cancel')} variant="ghost" onPress={() => setInviteOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  addWrap: { minWidth: 170 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  email: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badgeRow: { marginTop: 6 },
  role: { fontSize: 11, fontWeight: '700', color: colors.primary, alignSelf: 'flex-start', backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  actions: { gap: 8 },
  miniBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  miniBtnText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.surface, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 4 },
  input: {},
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.background },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  save: { marginTop: 18 },
});
