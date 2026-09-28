import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import { Link } from 'react-router-dom';
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
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import { api } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';

export default function SellerAuctions() {
  const { t } = useTranslation();
  const money = useMoney();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/auctions/mine')
      .then((res) => setAuctions(res.data.data))
      .catch(() => setAuctions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <GavelIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          {t('seller.auctions.title', { count: auctions.length })}
        </Typography>
      </Box>

      {auctions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {t('seller.auctions.empty.message')}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <PrimaryButton to="/seller/productos/nuevo">
              {t('seller.auctions.empty.cta')}
            </PrimaryButton>
          </Box>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('seller.auctions.table.title')}</TableCell>
                <TableCell align="right">{t('seller.auctions.table.currentPrice')}</TableCell>
                <TableCell align="center">{t('seller.auctions.table.bids')}</TableCell>
                <TableCell align="center">{t('seller.auctions.table.status')}</TableCell>
                <TableCell align="center">{t('seller.auctions.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auctions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {a.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('seller.auctions.endDate', { date: new Date(a.endDate).toLocaleString('es-BO') })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" className="price-color">
                    {money(a.currentPrice)}
                  </TableCell>
                  <TableCell align="center">{a.bidsCount}</TableCell>
                  <TableCell align="center">
                    {a.isExpired ? (
                      a.isSold && a.winner ? (
                        <Chip label={t('seller.auctions.status.wonBy', { name: a.winner.firstName })} size="small" color="success" />
                      ) : (
                        <Chip label={t('seller.auctions.status.noWinner')} size="small" color="default" />
                      )
                    ) : (
                      <Chip label={t('seller.auctions.status.active')} size="small" color="primary" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <PrimaryButton to={`/subasta/${a.id}`} size="small">
                      {t('seller.auctions.actions.view')}
                    </PrimaryButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
