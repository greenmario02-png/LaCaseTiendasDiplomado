import { Box, Typography, LinearProgress, Button } from '@mui/material';
import RedeemIcon from '@mui/icons-material/Redeem';
import { forumPalette } from '../../theme/forumTheme';

interface Props {
  karma: number;
  karmaSpent: number;
  tag: string;
  onRedeem?: () => void;
}

const MAX_KARMA = 3000; // Leyenda

export function KarmaCard({ karma, karmaSpent, tag, onRedeem }: Props) {
  const available = karma - karmaSpent;
  const pct = Math.min(100, (karma / MAX_KARMA) * 100);

  return (
    <Box
      sx={{
        bgcolor: forumPalette.bgCard,
        border: `1px solid ${forumPalette.border}`,
        borderRadius: 2,
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography fontWeight={700} sx={{ color: forumPalette.textPrimary }}>
          🎖️ Karma
        </Typography>
        <Typography fontWeight={700} sx={{ color: forumPalette.karmaGold }}>
          {tag}
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight={800} sx={{ color: forumPalette.textPrimary }}>
        {karma}
      </Typography>
      <Typography variant="caption" sx={{ color: forumPalette.textMuted }}>
        Disponible para canjear: {available} (canjeados: {karmaSpent})
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{ mt: 1.5, height: 8, borderRadius: 4, bgcolor: forumPalette.bgInput,
          '& .MuiLinearProgress-bar': { bgcolor: forumPalette.karmaGold } }}
      />
      <Typography variant="caption" sx={{ color: forumPalette.textMuted, display: 'block', mt: 0.5 }}>
        {pct.toFixed(0)}% hacia Leyenda (3000)
      </Typography>
      {onRedeem && (
        <Button
          fullWidth
          variant="contained"
          startIcon={<RedeemIcon />}
          disabled={available < 100}
          onClick={onRedeem}
          sx={{ mt: 1.5, bgcolor: forumPalette.accent, '&:hover': { bgcolor: forumPalette.accentHover } }}
        >
          Canjear karma por monedas
        </Button>
      )}
    </Box>
  );
}
