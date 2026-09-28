import { useTranslation } from 'react-i18next';
import { Box, Container, Typography } from '@mui/material';
import { PrimaryButton } from '../components/redesign/Buttons';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
      <Typography variant="h1" fontWeight={800} color="primary">
        404
      </Typography>
      <Typography variant="h5" mb={2}>
        {t('common.notFound.title')}
      </Typography>
      <Typography color="text.secondary" mb={3}>
        {t('common.notFound.message')}
      </Typography>
      <PrimaryButton to="/">{t('common.notFound.backHome')}</PrimaryButton>
    </Container>
  );
}
