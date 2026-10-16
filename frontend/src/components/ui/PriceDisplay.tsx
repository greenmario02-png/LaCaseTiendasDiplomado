import { Box, Typography } from '@mui/material';
import { useMoney } from '../../hooks/useMoney';

interface Props {
  price: string | number;
  originalPrice?: string | number | null;
  size?: 'small' | 'medium' | 'large';
}

export default function PriceDisplay({ price, originalPrice, size = 'medium' }: Props) {
  const money = useMoney();
  const num = Number(price);
  const orig = originalPrice ? Number(originalPrice) : null;
  const discount = orig && orig > num ? Math.round((1 - num / orig) * 100) : 0;

  const fontSizes = { small: '0.95rem', medium: '1.15rem', large: '1.6rem' };

  return (
    <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
      <Typography className="price-color" sx={{ fontSize: fontSizes[size] }}>
        {money(num)}
      </Typography>
      {orig !== null && orig > num && (
        <>
          <Typography variant="body2" className="strikethrough">
            {money(orig)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ bgcolor: 'success.main', color: 'white', px: 0.5, py: 0.25, borderRadius: 1, fontWeight: 700 }}
          >
            -{discount}%
          </Typography>
        </>
      )}
    </Box>
  );
}
