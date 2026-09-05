import { Link } from 'react-router-dom';
import { Box, Container, Grid, Typography, Divider } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';

export default function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', mt: 6, pt: 4, pb: 3 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <Box display="flex" alignItems="center" mb={1}>
              <StorefrontIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight={800}>
                LaCase Multi Tiendas
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Marketplace multi-vendedor. Encontrá los mejores precios de todas las tiendas en un solo lugar, con cálculo
              de envío según la ubicación del vendedor.
            </Typography>
          </Grid>

          <Grid item xs={6} sm={4}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Comprar
            </Typography>
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography component={Link} to="/productos" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Todos los productos
              </Typography>
              <Typography component={Link} to="/subastas" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Subastas
              </Typography>
              <Typography component={Link} to="/promociones" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Promociones
              </Typography>
              <Typography component={Link} to="/arma-tu-pc" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Arma tu PC
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} sm={4}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Vender
            </Typography>
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography component={Link} to="/registro-vendedor" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Abrí tu tienda
              </Typography>
              <Typography component={Link} to="/ayuda" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Ayuda y preguntas frecuentes
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          © {new Date().getFullYear()} LaCase Multi Tiendas. Todos los derechos reservados.
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 0.5 }}>
          Desarrollado por Alvaro Diaz Vallejos
        </Typography>
      </Container>
    </Box>
  );
}
