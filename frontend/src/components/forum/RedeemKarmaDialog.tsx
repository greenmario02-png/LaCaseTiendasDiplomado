import { useState } from 'react';
import { Coins } from 'lucide-react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Typography, Alert, InputAdornment,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { redeemKarma } from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';

interface Props {
  open: boolean;
  available: number;
  onClose: () => void;
  onRedeemed: (result: { karmaRedeemed: number; coinsEarned: number; newGamerCoins: number }) => void;
}

export function RedeemKarmaDialog({ open, available, onClose, onRedeemed }: Props) {
  const { t } = useTranslation();
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
      <DialogTitle sx={{ color: '#F0F0F0', display: 'flex', alignItems: 'center', gap: 1 }}><Coins size={18} strokeWidth={2.2} color='#FFD700' /> {t('forum.redeemKarmaDialog.title')}</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }}>
          {t('forum.redeemKarmaDialog.rateNotice')}
        </Alert>
        <TextField
          fullWidth
          type="number"
          label={t('forum.redeemKarmaDialog.amountLabel')}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          inputProps={{ min: 100, step: 100 }}
          InputProps={{ endAdornment: <InputAdornment position="end">{t('forum.redeemKarmaDialog.karmaUnit')}</InputAdornment> }}
          helperText={t('forum.redeemKarmaDialog.availableHelper', { available })}
        />
        <Typography variant="body2" sx={{ color: '#FFD700', mt: 1.5 }}>
          {t('forum.redeemKarmaDialog.willReceive')} <Coins size={14} strokeWidth={2.4} color='#FFD700' style={{ verticalAlign: '-2px' }} /> {t('forum.redeemKarmaDialog.coinsCount', { count: coins })}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 1.5, fontSize: '0.85rem' }}>{error}</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#AAAAAA' }}>{t('forum.redeemKarmaDialog.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || amount < 100 || amount % 100 !== 0 || amount > available}
          sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#FF8C5A' } }}
        >
          {loading ? t('forum.redeemKarmaDialog.redeeming') : t('forum.redeemKarmaDialog.redeem')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
