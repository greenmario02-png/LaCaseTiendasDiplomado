import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase } from 'lucide-react';
import { Box, Typography, Card, CardContent, Alert, Grid, CircularProgress, Stack, TextField, Chip, Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { SecondaryButton } from '../components/redesign/Buttons';
import { api, getErrorMessage } from '../services/api';

export default function AffiliatePage() {
  const { t: tr } = useTranslation();
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
        {tr('affiliate.title')}
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
                {tr('affiliate.referralCode')}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                <TextField value={aff?.referralCode ?? ''} size="small" inputProps={{ readOnly: true }} />
                <SecondaryButton startIcon={<ContentCopyIcon />} onClick={copy} size="small">
                  {copied ? tr('affiliate.copied') : tr('affiliate.copy')}
                </SecondaryButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {tr('affiliate.shareNote')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {tr('affiliate.commission')}
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
                {tr('affiliate.balanceEarned')}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="success.main">
                {tr('affiliate.amountBs', { amount: Number(aff?.balance ?? 0).toLocaleString('es-BO') })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tr('affiliate.referralStats', { referrals: aff?.referralCount ?? 0, orders: aff?.paidOrderCount ?? 0 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight={700} mb={1}>
        {tr('affiliate.myReferrals')}
      </Typography>
      {referrals.length === 0 ? (
        <Alert severity="info">{tr('affiliate.empty')}</Alert>
      ) : (
        <TableContainer component={Card} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{tr('affiliate.table.referred')}</TableCell>
                <TableCell>{tr('affiliate.table.email')}</TableCell>
                <TableCell>{tr('affiliate.table.date')}</TableCell>
                <TableCell align="right">{tr('affiliate.table.commission')}</TableCell>
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
                      <Chip label={tr('affiliate.amountBs', { amount: Number(r.commission).toLocaleString('es-BO') })} color="success" size="small" />
                    ) : (
                      <Chip label={tr('affiliate.pendingPurchase')} size="small" />
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
