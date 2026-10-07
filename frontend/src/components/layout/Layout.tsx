import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Navbar from './Navbar';
import Footer from './Footer';
import ReturnToTop from '../ui/ReturnToTop';
import FloatingChat from '../chat/FloatingChat';
import { LaCaseDiceBanner } from '../ui/LaCaseDiceBanner';
import ServidorDespertando from './ServidorDespertando';

export default function Layout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <LaCaseDiceBanner />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <Footer />
      <ReturnToTop />
      <FloatingChat />
      <ServidorDespertando />
    </Box>
  );
}
