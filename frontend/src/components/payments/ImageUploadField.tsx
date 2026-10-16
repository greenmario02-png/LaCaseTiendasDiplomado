import { useEffect, useId, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { checkQrFile, usePayT } from '../../lib/payments';
import { getErrorMessage, resolveImageUrl } from '../../services/api';

interface Props {
  label: string;
  help?: string;
  /** Ruta ya guardada (p. ej. /uploads/...). Nunca se escribe una URL a mano: solo se sube un archivo. */
  value: string | null;
  /** Sube el archivo y devuelve la ruta interna; el padre decide cuándo guardarla. */
  upload: (file: File) => Promise<string>;
  onChange: (url: string | null) => void;
  previewAlt: string;
  /** Forma de la vista previa. */
  aspect?: 'square' | 'wide';
  disabled?: boolean;
}

/**
 * Campo de imagen SIN URL: botón «Subir imagen» (archivo / cámara en móvil), vista previa ANTES de guardar,
 * y opciones de cambiar o quitar. Valida tipo y tamaño en el cliente; el servidor vuelve a validar la firma real.
 */
export default function ImageUploadField({ label, help, value, upload, onChange, previewAlt, aspect = 'square', disabled }: Props) {
  const pt = usePayT();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    const problem = checkQrFile(file);
    if (problem) {
      setError(pt(`qr.${problem}`));
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    setBusy(true);
    try {
      onChange(await upload(file));
    } catch (e) {
      setError(getErrorMessage(e));
      setLocalPreview(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const shown = localPreview ?? (value ? resolveImageUrl(value) : null);
  const box = aspect === 'square' ? { width: 180, height: 180 } : { width: '100%', maxWidth: 420, height: 140 };

  return (
    <Box>
      <Typography component="label" htmlFor={inputId} variant="subtitle2" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {help && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {help}
        </Typography>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <Box
          sx={{
            ...box,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {shown ? (
            <Box component="img" src={shown} alt={previewAlt} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <UploadFileIcon sx={{ fontSize: 48, color: 'text.disabled' }} aria-hidden />
          )}
          {busy && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'action.disabledBackground' }}>
              <CircularProgress size={28} aria-label={pt('image.uploading')} />
            </Box>
          )}
        </Box>
        <Stack spacing={1}>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={disabled || busy}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            sx={{ minHeight: 44 }}
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? pt('image.uploading') : shown ? pt('image.change') : pt('image.upload')}
          </Button>
          {shown && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              sx={{ minHeight: 44 }}
              disabled={disabled || busy}
              onClick={() => {
                setLocalPreview(null);
                onChange(null);
              }}
            >
              {pt('image.remove')}
            </Button>
          )}
        </Stack>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }} role="alert">
          {error}
        </Alert>
      )}
    </Box>
  );
}
