import { useEffect, useRef, useState } from 'react';
import { Coins } from 'lucide-react';
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
      toast.error('Ingresá una cantidad válida de monedas.');
      return;
    }
    setBuying(true);
    try {
      const { data } = await api.post('/coins/buy', { amount });
      setCoins(data.data);
      if (user) setUser({ ...user, gamerCoins: data.data.balance });
      toast.success(`Compraste ${amount} moneda(s).`);
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
        toast.success('Foto de perfil actualizada');
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
      toast.success('Perfil actualizado');
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
        Mi cuenta
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
              <CoinChip coins={user?.gamerCoins ?? 0} label="monedas" />
            </Box>
            <Box mt={1} display="flex" gap={1} justifyContent="center">
              <GhostButton size="small" onClick={() => setBuyOpen(true)}>
                Comprar monedas
              </GhostButton>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" flexDirection="column" gap={1}>
              <GhostButton to="/cuenta/pedidos">Mis pedidos</GhostButton>
              <GhostButton to="/cuenta/direcciones">Direcciones</GhostButton>
              <GhostButton to="/cuenta/wishlist">Favoritos</GhostButton>
              <GhostButton to="/cuenta/devoluciones">Devoluciones</GhostButton>
              <GhostButton to="/cuenta/afiliados">Programa de afiliados</GhostButton>
              <GhostButton to="/cuenta/notificaciones">Notificaciones</GhostButton>
              <GhostButton to="/subastas/mis">Mis subastas</GhostButton>
              {user?.role === 'SELLER' && (
                <GhostButton to="/seller">Ir a mi tienda</GhostButton>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700}>
                Monedas del proyecto
              </Typography>
              <SecondaryButton size="small" onClick={() => setBuyOpen(true)}>
                Comprar monedas
              </SecondaryButton>
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              La moneda oficial de LaCase Multi Tiendas: se <b>compra</b> como token, se <b>gana</b> al hacer
              compras efectivas (sin devolución) y ayudando en el foro, y se <b>usa</b> para comprar productos,
              vales de regalo y vales de descuento.
            </Alert>
            <Typography variant="body2" fontWeight={700} mb={1}>
              Saldo: {coins?.balance ?? user?.gamerCoins ?? 0} monedas
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
                Todavía no tenés movimientos de monedas.
              </Typography>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Invitá amigos y ganá 50 monedas
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Compartí tu código: cuando alguien se registre con él, ganás 50 monedas.
              {invite?.referredCount ? ` Ya invitaste a ${invite.referredCount} persona(s).` : ''}
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
                  toast.success('Código copiado al portapapeles');
                }}
              >
                Copiar
              </SecondaryButton>
              <SecondaryButton
                size="small"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}${invite?.inviteUrl ?? ''}`);
                  toast.success('Link de invitación copiado');
                }}
              >
                Copiar link
              </SecondaryButton>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Datos personales
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Nombre" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Apellido" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="País" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Ciudad" value={form.locationCity} onChange={(e) => setForm({ ...form, locationCity: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Provincia" value={form.locationState} onChange={(e) => setForm({ ...form, locationState: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Código postal" value={form.locationPostalCode} onChange={(e) => setForm({ ...form, locationPostalCode: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Biografía"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Contá un poco sobre vos o tu tienda..."
                />
              </Grid>
            </Grid>
            <Box mt={2}>
              <PrimaryButton onClick={save} disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Guardar cambios'}
              </PrimaryButton>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                Últimos pedidos
              </Typography>
              <GhostButton to="/cuenta/pedidos" size="small">
                Ver todos
              </GhostButton>
            </Box>
            {orders.length === 0 && <Typography color="text.secondary">No hiciste compras todavía.</Typography>}
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
        <DialogTitle>Comprar monedas del proyecto</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Comprás monedas a modo de tokens que podés usar en LaCase Multi Tiendas (productos, vales de regalo, vales de descuento).
          </Typography>
          <TextField
            label="Cantidad de monedas"
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setBuyOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton color="warning" onClick={handleBuyCoins} disabled={buying}>
            {buying ? <CircularProgress size={20} /> : 'Comprar'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
