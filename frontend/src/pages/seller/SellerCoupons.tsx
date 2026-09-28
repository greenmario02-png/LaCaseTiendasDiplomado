import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  MenuItem,
  Checkbox,
  ListItemText,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import RedeemIcon from '@mui/icons-material/Redeem';
import { api, getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import toast from 'react-hot-toast';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/redesign/Buttons';
import { LoadingState } from '../../components/redesign/States';
import { useUnifiedTokens } from '../../theme';

interface CouponProduct {
  productId: number;
  product: { id: number; name: string; price: number };
}

interface Coupon {
  id: number;
  code: string;
  description?: string;
  type: string;
  value: number;
  spentAmount?: number | null;
  minSpend?: number | null;
  maxUses?: number | null;
  usesCount: number;
  endDate?: string | null;
  isActive: boolean;
  products?: CouponProduct[];
}

const emptyForm = {
  code: '',
  description: '',
  type: 'PERCENTAGE',
  value: '',
  minSpend: '',
  maxUses: '',
  endDate: '',
  productIds: [] as number[],
};

export default function SellerCoupons() {
  const { t: tr } = useTranslation();
  const money = useMoney();
  const t = useUnifiedTokens();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/seller/coupons').then((r) => r.data.data).catch(() => []),
      api.get('/seller/products').then((r) => r.data.data).catch(() => []),
    ])
      .then(([c, p]) => {
        setCoupons(c);
        setMyProducts(p);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || '',
      type: c.type,
      value: String(c.value),
      minSpend: c.minSpend ? String(c.minSpend) : '',
      maxUses: c.maxUses ? String(c.maxUses) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      productIds: c.products?.map((p) => p.productId) ?? [],
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        description: form.description,
        type: form.type,
        value: Number(form.value),
        minSpend: form.minSpend ? Number(form.minSpend) : null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        productIds: form.productIds,
      };
      if (editing) {
        await api.put(`/seller/coupons/${editing.id}`, payload);
        toast.success(tr('seller.coupons.toast.updated'));
      } else {
        await api.post('/seller/coupons', payload);
        toast.success(tr('seller.coupons.toast.created'));
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/seller/coupons/${id}`);
      toast.success(tr('seller.coupons.toast.deleted'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await api.put(`/seller/coupons/${c.id}`, { isActive: !c.isActive });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const typeLabel = (type: string) =>
    type === 'PERCENTAGE'
      ? tr('seller.coupons.type.percentage')
      : type === 'FIXED'
      ? tr('seller.coupons.type.fixed')
      : tr('seller.coupons.type.gift');

  if (loading) return <LoadingState />;

  return (
    <Box>
      <PageHeader
        title={tr('seller.coupons.title')}
        subtitle={tr('seller.coupons.subtitle')}
        icon={<LocalOfferIcon />}
        actions={
          <PrimaryButton type="button" startIcon={<AddIcon />} onClick={openNew}>
            {tr('seller.coupons.actions.create')}
          </PrimaryButton>
        }
      />

      <SurfaceCard sx={{ p: 0, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: t.surface, '& th': { color: t.onSurfaceVariant, fontWeight: 700 } }}>
              <TableCell>{tr('seller.coupons.table.code')}</TableCell>
              <TableCell>{tr('seller.coupons.table.type')}</TableCell>
              <TableCell>{tr('seller.coupons.table.value')}</TableCell>
              <TableCell>{tr('seller.coupons.table.products')}</TableCell>
              <TableCell>{tr('seller.coupons.table.uses')}</TableCell>
              <TableCell>{tr('seller.coupons.table.status')}</TableCell>
              <TableCell align="right">{tr('seller.coupons.table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {tr('seller.coupons.emptyState')}
                </TableCell>
              </TableRow>
            )}
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell sx={{ fontWeight: 700 }}>{c.code}</TableCell>
                <TableCell>{typeLabel(c.type)}</TableCell>
                <TableCell>
                  {c.type === 'PERCENTAGE'
                    ? `${c.value}%`
                    : c.type === 'GIFT'
                    ? tr('seller.coupons.table.giftValue', { value: money(c.value), spent: money(c.spentAmount ?? 0) })
                    : money(c.value)}
                </TableCell>
                <TableCell>
                  {c.products && c.products.length > 0 ? (
                    <Chip size="small" label={tr('seller.coupons.table.productCount', { count: c.products.length })} />
                  ) : (
                    <Chip size="small" label={tr('seller.coupons.table.allProducts')} variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  {c.usesCount}
                  {c.maxUses ? `/${c.maxUses}` : ''}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={c.isActive ? tr('seller.coupons.status.active') : tr('seller.coupons.status.inactive')}
                    color={c.isActive ? 'success' : 'default'}
                    onClick={() => toggleActive(c)}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(c)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(c.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </SurfaceCard>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? tr('seller.coupons.dialog.editTitle') : tr('seller.coupons.dialog.createTitle')}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label={tr('seller.coupons.dialog.codeLabel')}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              fullWidth
              disabled={Boolean(editing)}
            />
            <TextField
              label={tr('seller.coupons.dialog.descriptionLabel')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder={tr('seller.coupons.dialog.descriptionPlaceholder')}
            />
            <TextField select label={tr('seller.coupons.dialog.typeLabel')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} fullWidth>
              <MenuItem value="PERCENTAGE">{tr('seller.coupons.dialog.typeOptions.percentage')}</MenuItem>
              <MenuItem value="FIXED">{tr('seller.coupons.dialog.typeOptions.fixed')}</MenuItem>
              <MenuItem value="GIFT">{tr('seller.coupons.dialog.typeOptions.gift')}</MenuItem>
            </TextField>
            <TextField
              label={
                form.type === 'PERCENTAGE'
                  ? tr('seller.coupons.dialog.valueLabel.percentage')
                  : form.type === 'GIFT'
                  ? tr('seller.coupons.dialog.valueLabel.gift')
                  : tr('seller.coupons.dialog.valueLabel.fixed')
              }
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              fullWidth
            />
            {form.type === 'GIFT' && (
              <Typography variant="caption" color="text.secondary">
                {tr('seller.coupons.dialog.giftHint')}
              </Typography>
            )}
            <TextField
              label={tr('seller.coupons.dialog.minSpendLabel')}
              type="number"
              value={form.minSpend}
              onChange={(e) => setForm({ ...form, minSpend: e.target.value })}
              fullWidth
            />
            <TextField
              label={tr('seller.coupons.dialog.maxUsesLabel')}
              type="number"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              fullWidth
            />
            <TextField
              label={tr('seller.coupons.dialog.endDateLabel')}
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              fullWidth
            />
            <Autocomplete
              multiple
              options={myProducts}
              getOptionLabel={(p) => tr('seller.coupons.dialog.productOptionLabel', { name: p.name, price: p.price })}
              value={myProducts.filter((p) => form.productIds.includes(p.id))}
              onChange={(_, v) => setForm({ ...form, productIds: v.map((p) => p.id) })}
              renderInput={(params) => <TextField {...params} label={tr('seller.coupons.dialog.productsLabel')} />}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <GhostButton type="button" onClick={() => setOpen(false)}>{tr('seller.coupons.dialog.cancel')}</GhostButton>
          <PrimaryButton type="button" onClick={save} disabled={saving || !form.code || !form.value}>
            {saving ? <CircularProgress size={18} color="inherit" /> : tr('seller.coupons.dialog.save')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
