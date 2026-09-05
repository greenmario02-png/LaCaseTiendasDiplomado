import { useCallback, useRef, useState, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Slider,
} from '@mui/material';
import { api } from '../../services/api';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  imageUrl: string;
  /** Relación de aspecto objetivo (w/h), ej: 3.2 para 1920x600 */
  aspect: number;
  title?: string;
  onClose: () => void;
  onUploaded: (url: string) => void;
}

function loadImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = url;
  });
}

export default function ImageCropDialog({ open, imageUrl, aspect, title = 'Recortar imagen', onClose, onUploaded }: Props) {
  const [src, setSrc] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const croppedRef = useRef<Blob | null>(null);

  useEffect(() => {
    if (open && imageUrl) {
      setError('');
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      loadImageAsDataUrl(imageUrl)
        .then(setSrc)
        .catch(() => setError('No se pudo cargar la imagen. Probá con otra.'));
    }
  }, [open, imageUrl]);

  const onCropComplete = useCallback((_: unknown, croppedAreaPixels: { width: number; height: number; x: number; y: number }) => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
      canvas.toBlob((blob) => {
        if (blob) croppedRef.current = blob;
      }, 'image/jpeg', 0.9);
    };
    img.src = src;
  }, [src]);

  const doUpload = async () => {
    if (!croppedRef.current) {
      toast.error('Procesando recorte...');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      // Convertir blob a File con nombre
      const file = new File([croppedRef.current], `crop-${Date.now()}.jpg`, { type: 'image/jpeg' });
      fd.append('image', file);
      const { data } = await api.post('/admin/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data.data.url);
      toast.success('Imagen recortada y subida');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!error && src && (
          <Box sx={{ position: 'relative', height: 380, bgcolor: '#000' }}>
            <Cropper image={src} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          </Box>
        )}
        {!error && src && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" mb={0.5}>
              Zoom
            </Typography>
            <Slider value={zoom} min={1} max={3} step={0.1} onChange={(_, v) => setZoom(v as number)} />
          </Box>
        )}
        {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="primary" onClick={doUpload} disabled={uploading || !src || Boolean(error)}>
          {uploading ? <CircularProgress size={20} /> : 'Recortar y guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
