import { useCallback, useEffect, useState } from 'react';
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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import { api } from '../../services/api';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { LoadingState, EmptyState } from '../../components/redesign/States';

interface SettingRow {
  key: string;
  value: string;
  updatedAt?: string;
}

const EMPTY_FORM: SettingRow = { key: '', value: '' };

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SettingRow | null>(null);
  const [form, setForm] = useState<SettingRow>(EMPTY_FORM);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/admin/settings')
      .then((res) => {
        const obj: Record<string, string> = res.data.data ?? {};
        const rows = Object.entries(obj).map(([key, value]) => ({ key, value }));
        setSettings(rows);
      })
      .catch(() => setSettings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (row: SettingRow) => {
    setForm({ key: row.key, value: row.value });
    setEditing(row);
    setError('');
    setDialogOpen(true);
  };

  const save = async () => {
    const key = form.key.trim();
    if (!key) {
      setError(t('admin.settings.keyRequired'));
      return;
    }
    try {
      await api.put(`/admin/settings/${encodeURIComponent(key)}`, { key, value: form.value });
      toast.success(editing ? t('admin.settings.updated') : t('admin.settings.created'));
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const remove = async (row: SettingRow) => {
    if (!confirm(t('admin.settings.confirmDelete', { key: row.key }))) return;
    try {
      await api.delete(`/admin/settings/${encodeURIComponent(row.key)}`);
      toast.success(t('admin.settings.deleted'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {t('admin.settings.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin.settings.subtitle')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          {t('admin.settings.newSetting')}
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        {t('admin.settings.infoBanner')} <Chip label="settings" size="small" /> {t('admin.settings.infoBannerEndpoint')}{' '}
        <code>GET /api/admin/settings</code>. {t('admin.settings.infoBannerWarning')}
      </Alert>

      {loading ? (
        <LoadingState />
      ) : settings.length === 0 ? (
        <EmptyState message={t('admin.settings.emptyState')} />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.settings.columnKey')}</TableCell>
                <TableCell>{t('admin.settings.columnValue')}</TableCell>
                <TableCell align="center">{t('admin.settings.columnActions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {settings.map((row) => (
                <TableRow key={row.key}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <SettingsIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 1, color: 'text.secondary' }} />
                    {row.key}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 400 }}>
                    <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace' }}>
                      {row.value}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton onClick={() => openEdit(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton color="error" onClick={() => remove(row)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('admin.settings.editDialogTitle', { key: editing.key }) : t('admin.settings.newDialogTitle')}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField
              label={t('admin.settings.keyLabel')}
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              fullWidth
              disabled={!!editing}
              helperText={t('admin.settings.keyHelperText')}
            />
            <TextField
              label={t('admin.settings.valueLabel')}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('admin.common.cancel')}</Button>
          <Button variant="contained" onClick={save}>
            {editing ? t('admin.common.save') : t('admin.settings.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
