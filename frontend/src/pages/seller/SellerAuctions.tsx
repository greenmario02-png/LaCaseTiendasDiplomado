import { useEffect, useState } from 'react';
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
          Mis subastas ({auctions.length})
        </Typography>
      </Box>

      {auctions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No creaste subastas aún. Al publicar un producto activá la opción "Publicar como subasta".
          </Typography>
          <Box sx={{ mt: 2 }}>
            <PrimaryButton to="/seller/productos/nuevo">
              Crear subasta
            </PrimaryButton>
          </Box>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell align="right">Precio actual</TableCell>
                <TableCell align="center">Ofertas</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
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
                      Fin: {new Date(a.endDate).toLocaleString('es-BO')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" className="price-color">
                    {money(a.currentPrice)}
                  </TableCell>
                  <TableCell align="center">{a.bidsCount}</TableCell>
                  <TableCell align="center">
                    {a.isExpired ? (
                      a.isSold && a.winner ? (
                        <Chip label={`Ganada: ${a.winner.firstName}`} size="small" color="success" />
                      ) : (
                        <Chip label="Sin ganador" size="small" color="default" />
                      )
                    ) : (
                      <Chip label="Activa" size="small" color="primary" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <PrimaryButton to={`/subasta/${a.id}`} size="small">
                      Ver
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
