import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Container, Grid, Typography, Divider } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <Box component="footer" sx={{ bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', mt: 6, pt: 4, pb: 3 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <Box display="flex" alignItems="center" mb={1}>
              <StorefrontIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight={800}>
                {t('footer.brandName')}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t('footer.description')}
            </Typography>
          </Grid>

          <Grid item xs={6} sm={4}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              {t('footer.buyHeading')}
            </Typography>
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography component={Link} to="/productos" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                {t('footer.allProducts')}
              </Typography>
              <Typography component={Link} to="/subastas" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                {t('footer.auctions')}
              </Typography>
              <Typography component={Link} to="/promociones" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                {t('footer.promotions')}
              </Typography>
              <Typography component={Link} to="/arma-tu-pc" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                {t('footer.buildYourPc')}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} sm={4}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              {t('footer.sellHeading')}
            </Typography>
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography component={Link} to="/registro-vendedor" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                {t('footer.openStore')}
              </Typography>
              <Typography component={Link} to="/ayuda" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                {t('footer.helpFaq')}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 0.5 }}>
          {t('footer.developedBy')}
        </Typography>
      </Container>
    </Box>
  );
}
