import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import { api } from '../../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Lector de código de barras para el panel del vendedor.
 * Los escáneres USB/lectores de barras se comportan como teclado:
 * escriben el código y envían Enter. También permite escribir el SKU a mano.
 */
export default function BarcodeReader({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode('');
      setResults(null);
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const search = async (q: string) => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    try {
      const { data } = await api.get('/seller/products', { params: { search: term, limit: 20 } });
      setResults(data.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search(code);
    }
  };

  const openProduct = (id: number) => {
    onClose();
    navigate(`/seller/productos/${id}/editar`);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Leer código de barras</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Escaneá el código de barras de un producto o escribí su SKU y presioná Enter.
        </Typography>
        <TextField
          inputRef={inputRef}
          autoFocus
          fullWidth
          label="SKU o código"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ej: PRO-0001"
          InputProps={{ endAdornment: loading ? <CircularProgress size={20} /> : null }}
        />
        <Button
          variant="contained"
          sx={{ mt: 1 }}
          disabled={loading || !code.trim()}
          onClick={() => search(code)}
        >
          Buscar
        </Button>

        {results && (
          <Box mt={2}>
            <Typography variant="subtitle2" fontWeight={700}>
              {results.length} resultado{results.length === 1 ? '' : 's'}
            </Typography>
            {results.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No se encontró ningún producto con ese código.
              </Typography>
            ) : (
              <List dense>
                {results.map((p) => (
                  <ListItem key={p.id} disablePadding>
                    <ListItemButton onClick={() => openProduct(p.id)}>
                      <ListItemText
                        primary={p.name}
                        secondary={`SKU: ${p.sku} · Stock: ${p.stock}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
