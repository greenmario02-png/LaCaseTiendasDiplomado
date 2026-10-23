import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, TextField, Typography } from '@mui/material';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

type Option = 'SELLER' | 'STORE' | 'PRODUCT';

const REASON: Record<Option, string> = {
  SELLER: 'VENDEDOR_SOSPECHOSO',
  STORE: 'TIENDA_SOSPECHOSA',
  PRODUCT: 'PRODUCTO_INADECUADO',
};

/**
 * Denunciar al vendedor, la tienda o el producto desde la ficha (POST /catalog-reports). Las denuncias las
 * revisa el administrador o el moderador asignado. Sin sesión, lleva a iniciarla.
 */
export default function ReportCatalogButton({ productId, sellerId }: { productId: number; sellerId: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState<Option>('PRODUCT');
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);

  const label = (o: Option) =>
    o === 'SELLER'
      ? t('catalogReport.reportSeller', { defaultValue: 'Denunciar vendedor' })
      : o === 'STORE'
        ? t('catalogReport.reportStore', { defaultValue: 'Denunciar tienda' })
        : t('catalogReport.reportProduct', { defaultValue: 'Producto inadecuado' });

  const start = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setOption('PRODUCT');
    setDetail('');
    setOpen(true);
  };

  const send = async () => {
    setSending(true);
    try {
      await api.post('/catalog-reports', {
        targetType: option,
        targetId: option === 'PRODUCT' ? productId : sellerId,
        reason: REASON[option],
        detail: detail.trim() || undefined,
      });
      toast.success(t('catalogReport.sent', { defaultValue: 'Gracias, revisaremos tu denuncia.' }));
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button size="small" color="inherit" startIcon={<FlagOutlinedIcon fontSize="small" />} onClick={start} sx={{ color: 'text.secondary', minHeight: 44 }}>
        {t('catalogReport.button', { defaultValue: 'Denunciar' })}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" aria-labelledby="catalog-report-title">
        <DialogTitle id="catalog-report-title">{t('catalogReport.title', { defaultValue: '¿Qué quieres denunciar?' })}</DialogTitle>
        <DialogContent>
          <RadioGroup value={option} onChange={(e) => setOption(e.target.value as Option)}>
            {(['PRODUCT', 'STORE', 'SELLER'] as Option[]).map((o) => (
              <FormControlLabel key={o} value={o} control={<Radio />} label={label(o)} />
            ))}
          </RadioGroup>
          <TextField
            fullWidth
            multiline
            minRows={2}
            margin="dense"
            label={t('catalogReport.detail', { defaultValue: 'Cuéntanos qué pasó (opcional)' })}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 300 } }}
          />
          <Typography variant="caption" color="text.secondary">
            {t('catalogReport.hint', { defaultValue: 'Nuestro equipo revisará la denuncia.' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('catalogReport.cancel', { defaultValue: 'Cancelar' })}</Button>
          <Button variant="contained" color="error" disabled={sending} onClick={send}>
            {t('catalogReport.send', { defaultValue: 'Enviar denuncia' })}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
