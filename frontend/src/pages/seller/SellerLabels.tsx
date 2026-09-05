import { useEffect, useMemo, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import Barcode from '../../components/seller/Barcode';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useMoney } from '../../hooks/useMoney';

const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #labels-print, #labels-print * { visibility: visible; }
    #labels-print { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; }
    #labels-print .label-card { break-inside: avoid; }
    .labels-toolbar { display: none !important; }
  }
`;

/** Generador de etiquetas imprimibles con SKU (código de barras) y nombre del producto. */
export default function SellerLabels() {
  const money = useMoney();
  const storeName = useAuthStore((s) => s.user?.storeName) ?? 'Mi tienda';
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    api
      .get('/seller/products', { params: { limit: 50 } })
      .then((res) => {
        // Solo etiquetas de productos activos (excluye soft-deleted: !isApproved && !isActive)
        const active = res.data.data.filter((p: any) => p.isActive !== false);
        setProducts(active);
        setSelected(new Set(active.map((p: any) => p.id)));
      })
      .finally(() => setLoading(false));
  }, []);

  const toPrint = useMemo(() => products.filter((p) => selected.has(p.id)), [products, selected]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === products.length ? new Set() : new Set(products.map((p) => p.id))));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <style>{printStyles}</style>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} className="labels-toolbar">
        <Typography variant="h6" fontWeight={700}>
          Etiquetas de productos ({toPrint.length})
        </Typography>
        <PrimaryButton startIcon={<PrintIcon />} disabled={toPrint.length === 0} onClick={() => window.print()}>
          Imprimir etiquetas
        </PrimaryButton>
      </Box>

      <Box display="flex" gap={3} className="labels-toolbar">
        <Paper sx={{ p: 2, maxWidth: 420, maxHeight: 480, overflow: 'auto', flex: '0 0 420px' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selected.size === products.length && products.length > 0}
                indeterminate={selected.size > 0 && selected.size < products.length}
                onChange={toggleAll}
              />
            }
            label="Seleccionar todos"
          />
          <Divider sx={{ my: 1 }} />
          {products.length === 0 && (
            <Alert severity="info">Todavía no tenés productos.</Alert>
          )}
          {products.map((p) => (
            <FormControlLabel
              key={p.id}
              control={<Checkbox checked={selected.has(p.id)} onChange={() => toggle(p.id)} />}
              label={
                <Box>
                  <Typography variant="body2">{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.sku} · {money(Number(p.price))}
                  </Typography>
                </Box>
              }
              sx={{ display: 'flex', mb: 0.5 }}
            />
          ))}
        </Paper>
      </Box>

      {toPrint.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }} className="labels-toolbar">
          Seleccioná al menos un producto para imprimir etiquetas.
        </Alert>
      )}

      {toPrint.length > 0 && (
        <Box id="labels-print" mt={3} display="grid" sx={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
          {toPrint.map((p) => (
            <Paper
              key={p.id}
              className="label-card"
              variant="outlined"
              sx={{ p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                {storeName}
              </Typography>
              <Barcode value={p.sku || `SKU-${p.id}`} />
              <Typography variant="caption" fontWeight={700} sx={{ mt: 0.5 }}>
                {p.sku || `SKU-${p.id}`}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.2 }}>
                {p.name}
              </Typography>
              <Typography variant="subtitle2" color="primary" fontWeight={800}>
                {money(Number(p.price))}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
