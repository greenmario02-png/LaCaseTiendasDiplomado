import { Box, Typography } from '@mui/material';
import { useCurrencyStore, convertPrice, formatMoney, getRate } from '../../stores/currencyStore';

interface Props {
  price: string | number;
  originalPrice?: string | number | null;
  size?: 'small' | 'medium' | 'large';
}

export default function PriceDisplay({ price, originalPrice, size = 'medium' }: Props) {
  const currencies = useCurrencyStore((s) => s.currencies);
  const selected = useCurrencyStore((s) => s.selected);

  const rate = getRate(currencies, selected);
  const num = Number(price);
  const orig = originalPrice ? Number(originalPrice) : null;

  const converted = convertPrice(num, selected, rate);
  const convertedOrig = orig !== null ? convertPrice(orig, selected, rate) : null;
  const discount = orig && orig > num ? Math.round((1 - num / orig) * 100) : 0;

  const fontSizes = { small: '0.95rem', medium: '1.15rem', large: '1.6rem' };

  return (
    <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
      <Typography className="price-color" sx={{ fontSize: fontSizes[size] }}>
        {formatMoney(converted, selected)}
      </Typography>
      {convertedOrig !== null && convertedOrig > converted && (
        <>
          <Typography variant="body2" className="strikethrough">
            {formatMoney(convertedOrig, selected)}
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
