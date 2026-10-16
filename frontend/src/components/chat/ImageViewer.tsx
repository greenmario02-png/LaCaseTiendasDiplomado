import { Box, Dialog, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useC } from '../../lib/chat/i18n';

/** Visor de imagen a pantalla completa (Esc o el boton cierran; el foco vuelve al disparador por el Dialog de MUI). */
export default function ImageViewer({ src, alt, onClose }: { src: string | null; alt: string; onClose: () => void }) {
  const c = useC();
  return (
    <Dialog open={!!src} onClose={onClose} fullScreen aria-label={c('imageViewer')} PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.92)' } }}>
      <IconButton onClick={onClose} aria-label={c('close')} autoFocus sx={{ position: 'absolute', top: 8, right: 8, width: 48, height: 48, color: '#fff', bgcolor: 'rgba(0,0,0,0.4)' }}>
        <CloseIcon />
      </IconButton>
      <Box onClick={onClose} sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, minHeight: '100%' }}>
        {src && <Box component="img" src={src} alt={alt} onClick={(e) => e.stopPropagation()} sx={{ maxWidth: '100%', maxHeight: 'calc(100vh - 32px)', objectFit: 'contain' }} />}
      </Box>
    </Dialog>
  );
}
