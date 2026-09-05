import { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, CircularProgress, Typography,
} from '@mui/material';
import { forumPalette } from '../../theme/forumTheme';
import { searchGifs, type GifResult } from '../../services/forum.api';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (gif: GifResult) => void;
}

export default function GifPicker({ open, onClose, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchGifs(q, 12);
        setResults(res ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  const handlePick = (gif: GifResult) => {
    onPick(gif);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ bgcolor: forumPalette.bgCard, color: forumPalette.textPrimary, fontWeight: 700 }}>
        🎞 Buscar GIFs
      </DialogTitle>
      <DialogContent sx={{ bgcolor: forumPalette.bgCard }}>
        <TextField
          autoFocus
          label="Buscar GIF (ej: capibara)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2, '& input': { color: forumPalette.textPrimary } }}
        />
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} sx={{ color: forumPalette.accent }} />
          </Box>
        ) : query.trim().length >= 2 && results.length === 0 ? (
          <Typography color="textSecondary" textAlign="center" py={4}>
            No se encontraron GIFs.
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 1,
              maxHeight: 360,
              overflowY: 'auto',
            }}
          >
            {results.map((g) => (
              <Box
                key={g.id}
                component="img"
                src={g.previewUrl}
                alt={g.title || 'gif'}
                loading="lazy"
                onClick={() => handlePick(g)}
                sx={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: `1px solid ${forumPalette.border}`,
                  '&:hover': { opacity: 0.85 },
                }}
              />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ bgcolor: forumPalette.bgCard }}>
        <Button onClick={onClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
}
