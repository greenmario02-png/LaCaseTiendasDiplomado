import { useState } from 'react';
import { Coins } from 'lucide-react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Typography, Alert, InputAdornment,
} from '@mui/material';
import { redeemKarma } from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';

interface Props {
  open: boolean;
  available: number;
  onClose: () => void;
  onRedeemed: (result: { karmaRedeemed: number; coinsEarned: number; newGamerCoins: number }) => void;
}

export function RedeemKarmaDialog({ open, available, onClose, onRedeemed }: Props) {
  const [amount, setAmount] = useState<number>(100);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await redeemKarma(amount);
      onRedeemed(res);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const coins = Math.floor(amount / 100) * 10;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ color: '#F0F0F0', display: 'flex', alignItems: 'center', gap: 1 }}><Coins size={18} strokeWidth={2.2} color='#FFD700' /> Canjear karma por monedas</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }}>
          Tasa: 100 karma = 10 monedas. El karma histórico y tu etiqueta no bajan; solo se
          descuenta del "disponible".
        </Alert>
        <TextField
          fullWidth
          type="number"
          label="Karma a canjear"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          inputProps={{ min: 100, step: 100 }}
          InputProps={{ endAdornment: <InputAdornment position="end">karma</InputAdornment> }}
          helperText={`Disponible: ${available} karma`}
        />
        <Typography variant="body2" sx={{ color: '#FFD700', mt: 1.5 }}>
          Recibirás: <Coins size={14} strokeWidth={2.4} color='#FFD700' style={{ verticalAlign: '-2px' }} /> {coins} monedas
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 1.5, fontSize: '0.85rem' }}>{error}</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#AAAAAA' }}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || amount < 100 || amount % 100 !== 0 || amount > available}
          sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#FF8C5A' } }}
        >
          {loading ? 'Canjeando...' : 'Canjear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
