import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import { Star, Package } from 'lucide-react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  Divider,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { api, getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import toast from 'react-hot-toast';

export default function AdminSellers() {
  const { t } = useTranslation();
  const money = useMoney();
  const [tab, setTab] = useState(0);
  const [pending, setPending] = useState<any[]>([]);
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/sellers/pending').then((r) => r.data.data).catch(() => []),
      api.get('/admin/users', { params: { role: 'SELLER', limit: 200 } }).then((r) => r.data.data).catch(() => []),
    ])
      .then(([p, a]) => {
        setPending(p);
        setAll(a);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (sellerId: number, isApproved: boolean) => {
    try {
      await api.put(`/admin/users/${sellerId}`, { isApproved });
      toast.success(isApproved ? t('admin.sellers.toasts.sellerApproved') : t('admin.sellers.toasts.sellerRejected'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleActive = async (sellerId: number, isActive: boolean) => {
    try {
      await api.put(`/admin/users/${sellerId}`, { isActive });
      toast.success(isActive ? t('admin.sellers.toasts.sellerSuspended') : t('admin.sellers.toasts.sellerActivated'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const togglePause = async (sellerId: number, storePaused: boolean) => {
    try {
      await api.put(`/admin/sellers/${sellerId}/pause`, { paused: !storePaused });
      toast.success(!storePaused ? t('admin.sellers.toasts.storePausedSuspicious') : t('admin.sellers.toasts.storeResumed'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openDetail = async (sellerId: number) => {
    try {
      const res = await api.get(`/admin/sellers/${sellerId}`);
      setDetail(res.data.data);
      setDetailOpen(true);
    } catch {
      toast.error(t('admin.sellers.toasts.errorLoadingDetail'));
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('admin.sellers.tabs.pending', { count: pending.length })} />
        <Tab label={t('admin.sellers.tabs.all', { count: all.length })} />
      </Tabs>

      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.sellers.table.store')}</TableCell>
                <TableCell>{t('admin.sellers.table.email')}</TableCell>
                <TableCell>{t('admin.sellers.table.location')}</TableCell>
                <TableCell align="center">{t('admin.sellers.table.category')}</TableCell>
                <TableCell align="center">{t('admin.sellers.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">{t('admin.sellers.noPendingSellers')}</Typography>
                  </TableCell>
                </TableRow>
              )}
              {pending.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {s.storeName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.firstName} {s.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>
                    {s.locationCity}, {s.locationState}
                  </TableCell>
                  <TableCell align="center">{s.storeCategory || '—'}</TableCell>
                  <TableCell align="center">
                    <PrimaryButton size="small" color="success" onClick={() => approve(s.id, true)}>
                      <CheckIcon fontSize="small" /> {t('admin.sellers.approve')}
                    </PrimaryButton>
                    <Box sx={{ ml: 1, display: 'inline-block' }}>
                      <GhostButton size="small" color="error" onClick={() => approve(s.id, false)}>
                        {t('admin.sellers.reject')}
                      </GhostButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.sellers.table.store')}</TableCell>
                <TableCell>{t('admin.sellers.table.email')}</TableCell>
                <TableCell align="center">{t('admin.sellers.table.status')}</TableCell>
                <TableCell align="center">{t('admin.sellers.table.category')}</TableCell>
                <TableCell align="right">{t('admin.sellers.table.sales')}</TableCell>
                <TableCell align="center">{t('admin.sellers.table.rating')}</TableCell>
                <TableCell align="center">{t('admin.sellers.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {all.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {s.storeName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.firstName} {s.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={!s.isActive ? t('admin.sellers.status.suspended') : s.isApproved ? t('admin.sellers.status.approved') : t('admin.sellers.status.pending')}
                      size="small"
                      color={!s.isActive ? 'error' : s.isApproved ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell align="center">{s.storeCategory || '—'}</TableCell>
                  <TableCell align="right">{s.totalSales}</TableCell>
                  <TableCell align="center">{s.rating}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => openDetail(s.id)} title={t('admin.common.viewDetail')}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <GhostButton
                      size="small"
                      color={s.isActive ? 'error' : 'success'}
                      onClick={() => toggleActive(s.id, s.isActive)}
                    >
                      {s.isActive ? t('admin.sellers.suspend') : t('admin.sellers.activate')}
                    </GhostButton>
                    {typeof s.storePaused === 'boolean' && (
                      <GhostButton
                        size="small"
                        color="warning"
                        onClick={() => togglePause(s.id, s.storePaused)}
                      >
                        {s.storePaused ? t('admin.sellers.resume') : t('admin.sellers.pause')}
                      </GhostButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ===== DIALOG DETALLE TIENDA ===== */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {detail && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar>
                  {detail.seller.storeLogo ? (
                    <img src={detail.seller.storeLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <StorefrontIcon />
                  )}
                </Avatar>
                <Box>
                  <Typography variant="h6">{detail.seller.storeName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {detail.seller.email} · {detail.seller.locationCity}, {detail.seller.locationState} {detail.seller.country || ''}
                  </Typography>
                </Box>
                <Box ml="auto">
                  <Chip label={detail.seller.isActive ? t('admin.sellers.detail.active') : t('admin.sellers.detail.suspended')} color={detail.seller.isActive ? 'success' : 'error'} size="small" />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {detail.seller.storeDescription && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {detail.seller.storeDescription}
                </Typography>
              )}
              {detail.seller.storeCategory && <Chip label={detail.seller.storeCategory} variant="outlined" size="small" />}

              <Grid container spacing={2} mt={1}>
                {[
                  { label: t('admin.sellers.metrics.products'), value: detail.metrics.productCount },
                  { label: t('admin.sellers.metrics.activeProducts'), value: detail.metrics.activeProducts },
                  { label: t('admin.sellers.metrics.pendingModeration'), value: detail.metrics.pendingProducts },
                  { label: t('admin.sellers.metrics.orders'), value: detail.metrics.orderCount },
                  { label: t('admin.sellers.metrics.revenue'), value: money(detail.metrics.revenue), money: true },
                ].map((m) => (
                  <Grid item xs={6} sm={4} key={m.label}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={700} className={m.money ? 'price-color' : ''}>
                        {m.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {m.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle2" fontWeight={700} mt={3} mb={1}>
                {t('admin.sellers.recentOrders')}
              </Typography>
              {detail.recentOrders.length === 0 ? (
                <Typography color="text.secondary">{t('admin.sellers.noOrders')}</Typography>
              ) : (
                detail.recentOrders.map((o: any) => (
                  <Box key={o.id} py={1} borderBottom={1} borderColor="divider">
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={600}>
                        #{o.id} — {o.buyer?.firstName} {o.buyer?.lastName}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} className="price-color">
                        {money(o.total)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(o.createdAt).toLocaleString('es-BO')} · {t(`orders.status.${String(o.status).toLowerCase()}`)}
                    </Typography>
                  </Box>
                ))
              )}

              {detail.reviews.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    {t('admin.sellers.reviews', { count: detail.reviews.length })}
                  </Typography>
                  {detail.reviews.map((r: any) => (
                    <Box key={r.id} py={0.5}>
                      <Typography variant="body2">
                        {'★'.repeat(r.rating)} <em>{r.comment}</em>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        — {r.user?.firstName} {r.user?.lastName}
                      </Typography>
                    </Box>
                  ))}
                </>
              )}
            </DialogContent>
            <DialogActions>
        <GhostButton color={detail.seller.isActive ? 'error' : 'success'} onClick={() => { toggleActive(detail.seller.id, detail.seller.isActive); setDetailOpen(false); }}>
          {detail.seller.isActive ? t('admin.sellers.suspendStore') : t('admin.sellers.activateStore')}
        </GhostButton>
        {typeof detail.seller.storePaused === 'boolean' && (
          <GhostButton color="warning" onClick={() => { togglePause(detail.seller.id, detail.seller.storePaused); setDetailOpen(false); }}>
            {detail.seller.storePaused ? t('admin.sellers.resumeStore') : t('admin.sellers.pauseStore')}
          </GhostButton>
        )}
              <GhostButton onClick={() => setDetailOpen(false)}>{t('admin.sellers.close')}</GhostButton>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
