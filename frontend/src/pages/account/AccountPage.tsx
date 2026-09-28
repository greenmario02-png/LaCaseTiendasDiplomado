import { useEffect, useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Box,
  Avatar,
  TextField,
  Divider,
  Chip,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { CoinChip } from '../../components/redesign/CoinChip';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import { useAuthStore } from '../../stores/authStore';
import { api, getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import toast from 'react-hot-toast';

export default function AccountPage() {
  const { t } = useTranslation();
  const money = useMoney();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
    locationCity: '',
    locationState: '',
    locationPostalCode: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [coins, setCoins] = useState<any>(null);
  const [invite, setInvite] = useState<any>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyAmount, setBuyAmount] = useState('100');
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: (user as any).phone || '',
        country: (user as any).country || '',
        locationCity: (user as any).locationCity || '',
        locationState: (user as any).locationState || '',
        locationPostalCode: (user as any).locationPostalCode || '',
        bio: (user as any).bio || '',
      });
    }
    api.get('/account/orders', { params: { limit: 5 } }).then((res) => setOrders(res.data.data)).catch(() => {});
    api.get('/coins/balance').then((res) => setCoins(res.data.data)).catch(() => {});
    api.get('/coins/invite').then((res) => setInvite(res.data.data)).catch(() => {});
  }, [user]);

  const handleBuyCoins = async () => {
    const amount = Number(buyAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error(t('account.profile.invalidCoinAmount'));
      return;
    }
    setBuying(true);
    try {
      const { data } = await api.post('/coins/buy', { amount });
      setCoins(data.data);
      if (user) setUser({ ...user, gamerCoins: data.data.balance });
      toast.success(t('account.profile.boughtCoins', { amount }));
      setBuyOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBuying(false);
    }
  };

  const uploadProfileImage = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await api.post('/account/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data.data?.url ?? data.data?.fileUrl ?? data.data?.path;
      if (url) {
        const { data: updated } = await api.put('/account', { profileImage: url });
        setUser(updated.data);
        toast.success(t('account.profile.profileImageUpdated'));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/account', form);
      setUser(data.data);
      toast.success(t('account.profile.profileUpdated'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const profileImage = (user as any).profileImage;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        {t('account.profile.title')}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                src={profileImage}
                sx={{ width: 96, height: 96, mx: 'auto', mb: 1, fontSize: 36, bgcolor: 'primary.main' }}
              >
                {user?.firstName?.[0] ?? user?.email[0]?.toUpperCase()}
              </Avatar>
              <IconButton
                size="small"
                sx={{ position: 'absolute', bottom: 4, right: 4, bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon fontSize="small" />}
              </IconButton>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadProfileImage(f);
                  e.target.value = '';
                }}
              />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography color="text.secondary">{user?.email}</Typography>
            <Chip label={user?.role} color={user?.role === 'ADMIN' ? 'error' : user?.role === 'SELLER' ? 'primary' : 'default'} size="small" sx={{ mt: 1 }} />
            <Box mt={1}>
              <CoinChip coins={user?.gamerCoins ?? 0} label={t('account.profile.coinsChipLabel')} />
            </Box>
            <Box mt={1} display="flex" gap={1} justifyContent="center">
              <GhostButton size="small" onClick={() => setBuyOpen(true)}>
                {t('account.profile.buyCoins')}
              </GhostButton>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" flexDirection="column" gap={1}>
              <GhostButton to="/cuenta/pedidos">{t('account.profile.myOrders')}</GhostButton>
              <GhostButton to="/cuenta/direcciones">{t('account.profile.addresses')}</GhostButton>
              <GhostButton to="/cuenta/wishlist">{t('account.profile.wishlist')}</GhostButton>
              <GhostButton to="/cuenta/devoluciones">{t('account.profile.returns')}</GhostButton>
              <GhostButton to="/cuenta/afiliados">{t('account.profile.affiliateProgram')}</GhostButton>
              <GhostButton to="/cuenta/notificaciones">{t('account.profile.notifications')}</GhostButton>
              <GhostButton to="/subastas/mis">{t('account.profile.myAuctions')}</GhostButton>
              {user?.role === 'SELLER' && (
                <GhostButton to="/seller">{t('account.profile.goToMyStore')}</GhostButton>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700}>
                {t('account.profile.coinsTitle')}
              </Typography>
              <SecondaryButton size="small" onClick={() => setBuyOpen(true)}>
                {t('account.profile.buyCoins')}
              </SecondaryButton>
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Trans i18nKey="account.profile.coinsInfo" components={{ b: <b /> }} />
            </Alert>
            <Typography variant="body2" fontWeight={700} mb={1}>
              {t('account.profile.balanceLabel', { balance: coins?.balance ?? user?.gamerCoins ?? 0 })}
            </Typography>
            {coins?.transactions?.length ? (
              <List dense>
                {coins.transactions.map((t: any) => (
                  <ListItem key={t.id} divider>
                    <ListItemIcon>
                      <MonetizationOnIcon color={t.amount > 0 ? 'success' : 'error'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={t.note || t.type}
                      secondary={new Date(t.createdAt).toLocaleString('es-AR')}
                    />
                    <Typography variant="body2" fontWeight={700} color={t.amount > 0 ? 'success.main' : 'error.main'}>
                      {t.amount > 0 ? '+' : ''}
                      {t.amount}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" variant="body2">
                {t('account.profile.noCoinMovements')}
              </Typography>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              {t('account.profile.inviteTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              {t('account.profile.inviteDescription')}
              {invite?.referredCount ? ` ${t('account.profile.invitedCount', { count: invite.referredCount })}` : ''}
            </Typography>
            <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
              <TextField
                size="small"
                value={invite?.inviteCode ?? ''}
                inputProps={{ readOnly: true }}
                sx={{ minWidth: 160 }}
              />
              <SecondaryButton
                size="small"
                onClick={() => {
                  navigator.clipboard?.writeText(invite?.inviteCode ?? '');
                  toast.success(t('account.profile.copyCodeSuccess'));
                }}
              >
                {t('account.profile.copy')}
              </SecondaryButton>
              <SecondaryButton
                size="small"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}${invite?.inviteUrl ?? ''}`);
                  toast.success(t('account.profile.copyLinkSuccess'));
                }}
              >
                {t('account.profile.copyLink')}
              </SecondaryButton>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {t('account.profile.personalDataTitle')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label={t('account.profile.firstNameLabel')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('account.profile.lastNameLabel')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('account.profile.phoneLabel')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('account.profile.countryLabel')} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('account.profile.cityLabel')} value={form.locationCity} onChange={(e) => setForm({ ...form, locationCity: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('account.profile.provinceLabel')} value={form.locationState} onChange={(e) => setForm({ ...form, locationState: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('account.profile.postalCodeLabel')} value={form.locationPostalCode} onChange={(e) => setForm({ ...form, locationPostalCode: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label={t('account.profile.bioLabel')}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder={t('account.profile.bioPlaceholder')}
                />
              </Grid>
            </Grid>
            <Box mt={2}>
              <PrimaryButton onClick={save} disabled={saving}>
                {saving ? <CircularProgress size={20} /> : t('account.profile.saveChanges')}
              </PrimaryButton>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                {t('account.profile.lastOrdersTitle')}
              </Typography>
              <GhostButton to="/cuenta/pedidos" size="small">
                {t('account.profile.viewAll')}
              </GhostButton>
            </Box>
            {orders.length === 0 && <Typography color="text.secondary">{t('account.profile.noOrdersYet')}</Typography>}
            {orders.map((o) => (
              <Box key={o.id} display="flex" justifyContent="space-between" alignItems="center" py={1} borderBottom={1} borderColor="divider">
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    #{o.id} — {o.seller.storeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(o.createdAt).toLocaleDateString('es-AR')}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2" fontWeight={700}>
                    {money(o.total)}
                  </Typography>
                  <Chip label={o.status} size="small" variant="outlined" />
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={buyOpen} onClose={() => setBuyOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('account.profile.buyCoinsDialogTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('account.profile.buyCoinsDialogDescription')}
          </Typography>
          <TextField
            label={t('account.profile.coinsQuantityLabel')}
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setBuyOpen(false)}>{t('account.profile.cancel')}</GhostButton>
          <PrimaryButton color="warning" onClick={handleBuyCoins} disabled={buying}>
            {buying ? <CircularProgress size={20} /> : t('account.profile.buy')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
