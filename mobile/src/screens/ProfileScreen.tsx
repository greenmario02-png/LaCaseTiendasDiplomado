import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useRbacStore } from '../stores/rbacStore';
import { CoinChip } from '../components/redesign/CoinChip';
import { Store, ShieldCheck, ShoppingCart, BadgeCheck, Heart, Package, Pencil, Gift, Users, Ticket, Flame, Wrench, Bell, ClipboardList, Upload, Wallet, MapPin, MessageSquareWarning } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { useNotificationsStore } from '../stores/notificationsStore';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 0 }) + ' Bs';
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PROOF_SUBMITTED: 'Comprobante enviado',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
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
    Alert.alert('Salir', '¿Cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
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
              {user?.role === 'SELLER' ? 'Vendedor' : user?.role === 'ADMIN' ? 'Administrador' : 'Comprador'}
            </Text>
          </View>
          {user?.isVerified && (
            <View style={styles.badgeItem}>
              <BadgeCheck size={13} color={colors.success} />
              <Text style={styles.verified}>Verificado</Text>
            </View>
          )}
        </View>
        <View style={styles.coinWrap}>
          <CoinChip amount={user?.gamerCoins ?? 0} />
        </View>
      </View>

      <View style={styles.menu}>
        <MenuItem icon={<Bell size={17} color={colors.primary} />} label="Notificaciones" onPress={() => navigation.navigate('Notifications')} badge={unread} />
        <MenuItem icon={<ClipboardList size={17} color={colors.primary} />} label="Mis pedidos" onPress={() => navigation.navigate('Orders')} />
        <MenuItem icon={<Heart size={17} color={colors.error} />} label="Mis favoritos" onPress={() => navigation.navigate('Wishlist')} />
        <MenuItem icon={<Package size={17} color={colors.primary} />} label="Mis direcciones" onPress={() => navigation.navigate('Addresses')} />
        <MenuItem icon={<Pencil size={17} color={colors.textSecondary} />} label="Editar perfil" onPress={() => navigation.navigate('EditProfile')} />
        <MenuItem icon={<Gift size={17} color={colors.warning} />} label="Invitá amigos y ganá 50 monedas" onPress={() => setInviteOpen(true)} />
        {(user?.role === 'SELLER' || hasPermission('seller.products.manage')) && (
          <>
            <MenuItem icon={<Store size={17} color={colors.primary} />} label="Mi tienda" onPress={() => navigation.navigate('SellerDashboard')} />
            <MenuItem icon={<Package size={17} color={colors.primary} />} label="Mis productos" onPress={() => navigation.navigate('SellerProducts')} />
            <MenuItem icon={<Upload size={17} color={colors.primary} />} label="Carga masiva de productos" onPress={() => navigation.navigate('SellerBulkProducts')} />
            <MenuItem icon={<Users size={17} color={colors.primary} />} label="Equipo de tienda" onPress={() => navigation.navigate('SellerTeam')} />
            <MenuItem icon={<Ticket size={17} color={colors.primary} />} label="Mis cupones" onPress={() => navigation.navigate('SellerCoupons')} />
            <MenuItem icon={<Flame size={17} color={colors.warning} />} label="Mis promociones" onPress={() => navigation.navigate('SellerPromotions')} />
            <MenuItem icon={<Wallet size={17} color={colors.success} />} label="Mis pagos" onPress={() => navigation.navigate('SellerPayouts')} />
            <MenuItem icon={<Wrench size={17} color={colors.textSecondary} />} label="Editar tienda" onPress={() => navigation.navigate('EditStore')} />
          </>
        )}
        {(user?.role === 'ADMIN' || hasPermission('admin.dashboard')) && (
          <>
            <MenuItem icon={<ShieldCheck size={17} color={colors.primary} />} label="Panel admin" onPress={() => navigation.navigate('AdminDashboard')} />
            <MenuItem icon={<Store size={17} color={colors.primary} />} label="Vendedores" onPress={() => navigation.navigate('AdminSellers')} />
            <MenuItem icon={<MapPin size={17} color={colors.primary} />} label="Verificación de tiendas" onPress={() => navigation.navigate('AdminVerification')} />
            <MenuItem icon={<MessageSquareWarning size={17} color={colors.warning} />} label="Moderación del foro" onPress={() => navigation.navigate('ForumModeration')} />
          </>
        )}
      </View>

      <Text style={styles.section}>Mis pedidos</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : orders.length === 0 ? (
        <Text style={styles.empty}>Aún no tenés pedidos</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 16 }}
          ListFooterComponent={
            <TouchableOpacity style={[styles.logout, { marginBottom: insets.bottom + 12 }]} onPress={doLogout}>
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <View style={styles.order}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderId}>Pedido #{item.id}</Text>
                <Text style={styles.orderStatus}>{STATUS_LABEL[item.status] ?? item.status}</Text>
                <Text style={styles.orderMeta}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-BO') : ''}
                  {item.items?.length ? ` · ${item.items.length} producto(s)` : ''}
                </Text>
              </View>
              <Text style={styles.orderTotal}>{money(item.total)}</Text>
            </View>
          )}
        />
      )}
      <Modal visible={inviteOpen} transparent animationType="slide" onRequestClose={() => setInviteOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <Gift size={18} color={colors.warning} />
              <Text style={styles.modalTitle}>Invitá amigos y ganá</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Compartí tu código: cuando alguien se registre con él, ganás 50 monedas del proyecto.
              {invite?.referredCount ? `\nYa invitaste a ${invite?.referredCount} persona(s).` : ''}
            </Text>
            <View style={styles.inviteBox}>
              <Text style={styles.inviteCode}>{invite?.inviteCode ?? 'Cargando...'}</Text>
              <Text style={styles.inviteLink}>{invite?.inviteUrl ?? ''}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(invite?.inviteCode ?? '');
                  Alert.alert('Listo', 'Código de invitación copiado.');
                } catch {}
              }}
            >
              <Text style={styles.copyBtnText}>Copiar código</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(`${invite?.inviteUrl ?? ''}`);
                  Alert.alert('Listo', 'Link de invitación copiado.');
                } catch {}
              }}
            >
              <Text style={styles.copyBtnText}>Copiar link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setInviteOpen(false)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
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
