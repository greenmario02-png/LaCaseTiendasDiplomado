import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import { PrimaryButton, SecondaryButton, GhostButton } from '../components/redesign/Buttons';
import ComputerIcon from '@mui/icons-material/Computer';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useMoney } from '../hooks/useMoney';
import { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';

const SLOTS = [
  { type: 'CPU', label: 'Procesador', required: true },
  { type: 'MOTHERBOARD', label: 'Motherboard', required: true },
  { type: 'RAM', label: 'Memoria RAM', required: true },
  { type: 'GPU', label: 'Placa de Video', required: true },
  { type: 'STORAGE', label: 'Almacenamiento', required: true },
  { type: 'PSU', label: 'Fuente de Poder', required: true },
  { type: 'CASE', label: 'Gabinete', required: true },
  { type: 'COOLER', label: 'RefrigeraciÃ³n', required: true },
];

export default function PcBuilderPage() {
  const money = useMoney();
  const user = useAuthStore((s) => s.user);
  const addItem = useCartStore((s) => s.addItem);

  const [selected, setSelected] = useState<Record<string, any>>({});
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [slotProducts, setSlotProducts] = useState<any[]>([]);
  const [loadingSlot, setLoadingSlot] = useState(false);
  const [buildName, setBuildName] = useState('');
  const [builds, setBuilds] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      api.get('/builds').then((res) => setBuilds(res.data.data)).catch(() => {});
    }
  }, [user]);

  const openSlotSelector = async (slotType: string) => {
    setOpenSlot(slotType);
    setLoadingSlot(true);
    try {
      const { data } = await api.get('/builds/slot-products', { params: { slotType } });
      setSlotProducts(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingSlot(false);
    }
  };

  const pickProduct = (product: any) => {
    setSelected((prev) => ({ ...prev, [openSlot as string]: product }));
    setOpenSlot(null);
  };

  const total = Object.values(selected).reduce((acc, p: any) => acc + Number(p.price), 0);
  const completedSlots = Object.keys(selected).length;

  const saveBuild = async () => {
    if (!user) {
      toast.error('IniciÃ¡ sesiÃ³n para guardar tu build');
      return;
    }
    if (completedSlots < 3) {
      toast.error('ElegÃ­ al menos 3 componentes');
      return;
    }
    const components = Object.entries(selected).map(([slotType, product]: [string, any]) => ({
      productId: product.id,
      slotType,
    }));
    try {
      await api.post('/builds', { name: buildName || 'Mi PC', components });
      toast.success('Build guardada');
      const { data } = await api.get('/builds');
      setBuilds(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const addAllToCart = async () => {
    for (const [slot, product] of Object.entries(selected)) {
      await addItem((product as any).id, 1);
    }
    toast.success('Todos los componentes agregados al carrito');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <ComputerIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Arma tu PC
        </Typography>
      </Box>
      <Typography color="text.secondary" mb={3}>
        ElegÃ­ cada componente de cualquier tienda. Verificamos que sean compatibles y calculamos el costo total.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {SLOTS.map((slot) => {
              const product = selected[slot.type];
              return (
                <Box key={slot.type}>
                  <Box display="flex" alignItems="center" gap={2} py={1.5}>
                    <Chip label={slot.type} color={product ? 'primary' : 'default'} variant={product ? 'filled' : 'outlined'} />
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {slot.label}
                        {slot.required && <span style={{ color: '#f40025' }}> *</span>}
                      </Typography>
                      {product ? (
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">{product.name}</Typography>
                          <Chip size="small" label={`${money(Number(product.price))}`} className="price-color" variant="outlined" />
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Sin seleccionar
                        </Typography>
                      )}
                    </Box>
                    <SecondaryButton size="small" onClick={() => openSlotSelector(slot.type)}>
                      {product ? 'Cambiar' : 'Seleccionar'}
                    </SecondaryButton>
                    {product && (
                      <GhostButton size="small" color="error" onClick={() => setSelected((prev) => ({ ...prev, [slot.type]: undefined }))}>
                        <DeleteIcon fontSize="small" />
                      </GhostButton>
                    )}
                  </Box>
                  <Divider />
                </Box>
              );
            })}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Resumen
            </Typography>
            <Box mb={1}>
              <Typography color="text.secondary" variant="body2">
                Componentes seleccionados: {completedSlots}/8
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Total estimado</Typography>
              <Typography variant="h6" className="price-color">
                {money(total)}
              </Typography>
            </Box>
            <input
              value={buildName}
              onChange={(e) => setBuildName(e.target.value)}
              placeholder="Nombre de la build (ej: PC Gamer Pro)"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', marginBottom: 12 }}
            />
            <Box mb={1}>
              <PrimaryButton fullWidth startIcon={<SaveIcon />} onClick={saveBuild}>
                Guardar build
              </PrimaryButton>
            </Box>
            <SecondaryButton fullWidth startIcon={<ShoppingCartIcon />} onClick={addAllToCart} disabled={completedSlots === 0}>
              Agregar todo al carrito
            </SecondaryButton>

            {builds.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Tus builds guardadas
                </Typography>
                {builds.map((b) => (
                  <Box key={b.id} py={0.5}>
                    <Typography variant="body2">{b.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {money(Number(b.totalPrice))} Â· {b.components.length} componentes
                    </Typography>
                  </Box>
                ))}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={Boolean(openSlot)} onClose={() => setOpenSlot(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Seleccionar {SLOTS.find((s) => s.type === openSlot)?.label}
        </DialogTitle>
        <DialogContent dividers>
          {loadingSlot ? (
            <Typography>Buscando productos...</Typography>
          ) : slotProducts.length === 0 ? (
            <Alert severity="info">No hay productos disponibles para este slot.</Alert>
          ) : (
            <List disablePadding>
              {slotProducts.map((p) => (
                <ListItemButton key={p.id} onClick={() => pickProduct(p)}>
                  <ListItemAvatar>
                    <Avatar variant="rounded">
                      <AddIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={p.name}
                    secondary={
                      <>
                        {p.seller.storeName} Â· {money(Number(p.price))}
                        {p.stock <= 0 ? ' Â· SIN STOCK' : ` Â· stock ${p.stock}`}
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setOpenSlot(null)}>Cerrar</GhostButton>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

