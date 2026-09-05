import { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { Box, Typography, Card, CardContent, Alert, Grid, CircularProgress, Stack, TextField, Chip, Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { SecondaryButton } from '../components/redesign/Buttons';
import { api, getErrorMessage } from '../services/api';

export default function AffiliatePage() {
  const [aff, setAff] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const [a, r] = await Promise.all([api.get('/affiliates/me'), api.get('/affiliates/my-referrals')]);
      setAff(a.data.data);
      setReferrals(r.data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <CircularProgress sx={{ mt: 6, mx: 'auto', display: 'block' }} />;

  const copy = () => {
    if (aff?.referralCode) {
      navigator.clipboard?.writeText(aff.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box p={3} maxWidth={900} mx="auto">
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Programa de afiliados
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Tu código de referido
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                <TextField value={aff?.referralCode ?? ''} size="small" inputProps={{ readOnly: true }} />
                <SecondaryButton startIcon={<ContentCopyIcon />} onClick={copy} size="small">
                  {copied ? '¡Copiado!' : 'Copiar'}
                </SecondaryButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Compartilo con tus amigos. Cuando se registren y compren, ganás comisión.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Comisión
              </Typography>
              <Typography variant="h4" fontWeight={800} color="primary">
                {aff?.commissionPct}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Balance ganado
              </Typography>
              <Typography variant="h4" fontWeight={800} color="success.main">
                Bs {Number(aff?.balance ?? 0).toLocaleString('es-BO')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {aff?.referralCount ?? 0} referidos · {aff?.paidOrderCount ?? 0} compras pagadas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight={700} mb={1}>
        Mis referidos
      </Typography>
      {referrals.length === 0 ? (
        <Alert severity="info">Aún no tenés referidos. Compartí tu código para empezar a ganar.</Alert>
      ) : (
        <TableContainer component={Card} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Referido</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Comisión</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {referrals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.referred?.firstName} {r.referred?.lastName}
                  </TableCell>
                  <TableCell>{r.referred?.email}</TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    {r.commission != null ? (
                      <Chip label={`Bs ${Number(r.commission).toLocaleString('es-BO')}`} color="success" size="small" />
                    ) : (
                      <Chip label="Pendiente de compra" size="small" />
                    )}
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
