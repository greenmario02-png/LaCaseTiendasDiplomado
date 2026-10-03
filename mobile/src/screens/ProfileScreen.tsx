import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useRbacStore } from '../stores/rbacStore';
import { CoinChip } from '../components/redesign/CoinChip';
import { Store, ShieldCheck, ShoppingCart, BadgeCheck, Heart, Package, Pencil, Gift, Users, Ticket, Flame, Wrench, Bell, ClipboardList, Upload, Wallet, MessageSquareWarning, Briefcase } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { useNotificationsStore } from '../stores/notificationsStore';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 0 }) + ' Bs';
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: 'pending',
  PROOF_SUBMITTED: 'proofSubmitted',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

function MenuItem({ icon, label, onPress, badge }: { icon: React.ReactNode; label: string; onPress: () => void; badge?: number }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemRow}>
        {icon}
        <Text style={styles.menuText}>{label}</Text>
        {!!badge && badge > 0 && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuthStore();
  const hasPermission = useRbacStore((s) => s.hasPermission);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const unread = useNotificationsStore((s) => s.unread);
  const refreshUnread = useNotificationsStore((s) => s.refreshUnread);

  const load = async () => {
    try {
      const { data } = await api.get('/account/orders');
      setOrders(data.data ?? []);
    } catch {}
    try {
      const { data } = await api.get('/coins/invite');
      setInvite(data.data ?? null);
    } catch {}
    refreshUnread();
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      if (user) load();
    }, [user])
  );

  const doLogout = async () => {
    Alert.alert(t('mobile.profile.logout'), t('mobile.profile.logoutConfirmMessage'), [
      { text: t('mobile.common.cancel'), style: 'cancel' },
      { text: t('mobile.profile.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        {user?.profileImage ? (
          <Image source={{ uri: resolveImageUrl(user.profileImage) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{user?.firstName?.[0] ?? '?'}</Text>
          </View>
        )}
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badges}>
          <View style={styles.badgeItem}>
            {user?.role === 'SELLER' ? (
              <Store size={13} color={colors.primary} />
            ) : user?.role === 'ADMIN' ? (
              <ShieldCheck size={13} color={colors.primary} />
            ) : (
              <ShoppingCart size={13} color={colors.primary} />
            )}
            <Text style={styles.role}>
              {user?.role === 'SELLER' ? t('mobile.profile.roles.seller') : user?.role === 'ADMIN' ? t('mobile.profile.roles.admin') : t('mobile.profile.roles.customer')}
            </Text>
          </View>
          {user?.isVerified && (
            <View style={styles.badgeItem}>
              <BadgeCheck size={13} color={colors.success} />
              <Text style={styles.verified}>{t('mobile.profile.verifiedLabel')}</Text>
            </View>
          )}
        </View>
        <View style={styles.coinWrap}>
          <CoinChip amount={user?.gamerCoins ?? 0} />
        </View>
        <LanguageSwitcher />
      </View>

      <View style={styles.menu}>
        <MenuItem icon={<Bell size={17} color={colors.primary} />} label={t('mobile.profile.notifications')} onPress={() => navigation.navigate('Notifications')} badge={unread} />
        <MenuItem icon={<ClipboardList size={17} color={colors.primary} />} label={t('mobile.profile.myOrders')} onPress={() => navigation.navigate('Orders')} />
        <MenuItem icon={<Heart size={17} color={colors.error} />} label={t('mobile.profile.myWishlist')} onPress={() => navigation.navigate('Wishlist')} />
        <MenuItem icon={<Package size={17} color={colors.primary} />} label={t('mobile.profile.myAddresses')} onPress={() => navigation.navigate('Addresses')} />
        <MenuItem icon={<Pencil size={17} color={colors.textSecondary} />} label={t('mobile.profile.editProfile')} onPress={() => navigation.navigate('EditProfile')} />
        <MenuItem icon={<Briefcase size={17} color={colors.primary} />} label={t('mobile.profile.jobs')} onPress={() => navigation.navigate('Jobs')} />
        <MenuItem icon={<ClipboardList size={17} color={colors.primary} />} label={t('mobile.profile.myApplications')} onPress={() => navigation.navigate('MyApplications')} />
        <MenuItem icon={<Gift size={17} color={colors.warning} />} label={t('mobile.profile.inviteFriends')} onPress={() => setInviteOpen(true)} />
        {(user?.role === 'SELLER' || hasPermission('seller.products.manage')) && (
          <>
            <MenuItem icon={<Store size={17} color={colors.primary} />} label={t('mobile.profile.myStore')} onPress={() => navigation.navigate('SellerDashboard')} />
            <MenuItem icon={<Package size={17} color={colors.primary} />} label={t('mobile.profile.myProducts')} onPress={() => navigation.navigate('SellerProducts')} />
            <MenuItem icon={<Briefcase size={17} color={colors.primary} />} label={t('mobile.profile.myJobs')} onPress={() => navigation.navigate('SellerJobs')} />
            <MenuItem icon={<Upload size={17} color={colors.primary} />} label={t('mobile.profile.bulkUpload')} onPress={() => navigation.navigate('SellerBulkProducts')} />
            <MenuItem icon={<Users size={17} color={colors.primary} />} label={t('mobile.profile.storeTeam')} onPress={() => navigation.navigate('SellerTeam')} />
            <MenuItem icon={<Ticket size={17} color={colors.primary} />} label={t('mobile.profile.myCoupons')} onPress={() => navigation.navigate('SellerCoupons')} />
            <MenuItem icon={<Flame size={17} color={colors.warning} />} label={t('mobile.profile.myPromotions')} onPress={() => navigation.navigate('SellerPromotions')} />
            <MenuItem icon={<Wallet size={17} color={colors.success} />} label={t('mobile.profile.myPayouts')} onPress={() => navigation.navigate('SellerPayouts')} />
            <MenuItem icon={<Wrench size={17} color={colors.textSecondary} />} label={t('mobile.profile.editStore')} onPress={() => navigation.navigate('EditStore')} />
          </>
        )}
        {/* La administración (panel, tiendas, empleos) es solo web; en la app queda únicamente la moderación del foro. */}
        {hasPermission('admin.dashboard') && user?.role !== 'ADMIN' && (
          <>
            <MenuItem icon={<MessageSquareWarning size={17} color={colors.warning} />} label={t('mobile.profile.forumModeration')} onPress={() => navigation.navigate('ForumModeration')} />
          </>
        )}
      </View>

      <Text style={styles.section}>{t('mobile.profile.myOrders')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : orders.length === 0 ? (
        <Text style={styles.empty}>{t('mobile.profile.noOrders')}</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 16 }}
          ListFooterComponent={
            <TouchableOpacity style={[styles.logout, { marginBottom: insets.bottom + 12 }]} onPress={doLogout}>
              <Text style={styles.logoutText}>{t('mobile.profile.logout')}</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => {
            const statusKey = STATUS_LABEL_KEYS[item.status];
            const statusText = statusKey ? t(`mobile.profile.status.${statusKey}`) : item.status;
            return (
              <View style={styles.order}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderId}>{t('mobile.profile.orderNumber', { id: item.id })}</Text>
                  <Text style={styles.orderStatus}>{statusText}</Text>
                  <Text style={styles.orderMeta}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-BO') : ''}
                    {item.items?.length ? t('mobile.profile.productsCount', { count: item.items.length }) : ''}
                  </Text>
                </View>
                <Text style={styles.orderTotal}>{money(item.total)}</Text>
              </View>
            );
          }}
        />
      )}
      <Modal visible={inviteOpen} transparent animationType="slide" onRequestClose={() => setInviteOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <Gift size={18} color={colors.warning} />
              <Text style={styles.modalTitle}>{t('mobile.profile.inviteModalTitle')}</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {t('mobile.profile.inviteModalSubtitle')}
              {invite?.referredCount ? t('mobile.profile.inviteAlreadyInvited', { count: invite?.referredCount }) : ''}
            </Text>
            <View style={styles.inviteBox}>
              <Text style={styles.inviteCode}>{invite?.inviteCode ?? t('mobile.common.loading')}</Text>
              <Text style={styles.inviteLink}>{invite?.inviteUrl ?? ''}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(invite?.inviteCode ?? '');
                  Alert.alert(t('mobile.common.done'), t('mobile.profile.inviteCodeCopiedMessage'));
                } catch {}
              }}
            >
              <Text style={styles.copyBtnText}>{t('mobile.profile.copyCodeButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(`${invite?.inviteUrl ?? ''}`);
                  Alert.alert(t('mobile.common.done'), t('mobile.profile.inviteLinkCopiedMessage'));
                } catch {}
              }}
            >
              <Text style={styles.copyBtnText}>{t('mobile.profile.copyLinkButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setInviteOpen(false)}>
              <Text style={styles.closeBtnText}>{t('mobile.common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, alignItems: 'center', paddingVertical: 28, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 10 },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badgeItem: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  role: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  verified: { fontSize: 12, color: colors.success, fontWeight: '700' },
  coinWrap: { marginTop: 12 },
  menu: { backgroundColor: colors.surface, marginTop: 12, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden' },
  menuItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuItemRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  menuText: { fontSize: 15, color: colors.text, flex: 1 },
  menuBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  menuBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  section: { fontSize: 16, fontWeight: '800', color: colors.text, paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 12 },
  order: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14 },
  orderId: { fontSize: 14, fontWeight: '700', color: colors.text },
  orderStatus: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  orderMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  orderTotal: { fontSize: 15, fontWeight: '800', color: colors.price },
  logout: { backgroundColor: colors.surface, margin: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.error, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalTitleRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
  inviteBox: { backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 14, alignItems: 'center' },
  inviteCode: { fontSize: 20, fontWeight: '800', color: colors.primary },
  inviteLink: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  copyBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  copyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  closeBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 6 },
  closeBtnText: { color: colors.textSecondary, fontSize: 14 },
});
