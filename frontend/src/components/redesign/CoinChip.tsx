import { Chip } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { getUnifiedTokens } from '../../theme';

interface CoinChipProps {
  coins: number;
  label?: string;
}

/** Chip ámbar con las monedas del proyecto. */
export function CoinChip({ coins, label }: CoinChipProps) {
  const tokens = getUnifiedTokens(false);
  return (
    <Chip
      icon={<MonetizationOnIcon />}
      label={label != null ? `🪙 ${coins} ${label}` : `🪙 ${coins}`}
      size="small"
      sx={{
        bgcolor: tokens.secondaryContainer,
        color: tokens.onSecondary,
        fontWeight: 700,
        '& .MuiChip-icon': { color: 'inherit' },
      }}
    />
  );
}
