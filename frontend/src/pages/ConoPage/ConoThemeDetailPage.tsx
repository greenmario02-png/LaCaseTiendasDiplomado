import { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardActionArea, CardMedia, CardContent, Tabs, Tab, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Alert, Stack, Chip,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import MenuItem from '@mui/material/MenuItem';
import {
  getConoTheme, listConoEntries, createConoEntry, uploadConoImage, listConoMatches, createConoMatch,
} from '../../services/cono.api';
import type { ConoTheme, ConoEntry, ConoMatch } from '../../services/cono.api';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage, resolveImageUrl } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { ConoMatchCard } from '../../components/cono/ConoMatchCard';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';
import { MotionCard } from '../../components/motion/MotionCard';

const WINDOWS = [
  { key: '', label: 'Histórico' },
  { key: 'daily', label: 'Hoy' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensual' },
] as const;

export default function ConoThemeDetailPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const tokens = useUnifiedTokens();
  const { user } = useAuthStore();

  const [theme, setTheme] = useState<ConoTheme | null>(null);
  const [entries, setEntries] = useState<ConoEntry[]>([]);
  const [matches, setMatches] = useState<ConoMatch[]>([]);
  const [rangeWindow, setRangeWindow] = useState<'' | 'daily' | 'weekly' | 'monthly'>('');
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [matchOpen, setMatchOpen] = useState(false);
  const [matchForm, setMatchForm] = useState({ entryAId: '', entryBId: '', votingDate: new Date().toISOString().slice(0, 10) });
  const [savingMatch, setSavingMatch] = useState(false);

  const isCreator = !!theme && !!user?.forumProfile && theme.createdBy?.forumUsername === user.forumProfile.forumUsername;

  const loadEntries = (t: ConoTheme) => {
    listConoEntries(t.id, rangeWindow || undefined).then(setEntries);
  };
  const loadMatches = (t: ConoTheme) => listConoMatches(t.id).then(setMatches);

  useEffect(() => {
    setLoading(true);
    getConoTheme(slug).then((t) => {
      setTheme(t);
      if (t.type === 'MEME') loadEntries(t);
      else { loadMatches(t); listConoEntries(t.id).then(setEntries); }
    }).catch((e) => toast.error(getErrorMessage(e))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const submitMatch = async () => {
    if (!theme || !matchForm.entryAId || !matchForm.entryBId) {
      toast.error('Elegí las dos entradas que se enfrentan.');
      return;
    }
    if (matchForm.entryAId === matchForm.entryBId) {
      toast.error('Elegí dos entradas distintas.');
      return;
    }
    setSavingMatch(true);
    try {
      await createConoMatch({
        themeId: theme.id,
        entryAId: Number(matchForm.entryAId),
        entryBId: Number(matchForm.entryBId),
        votingDate: matchForm.votingDate,
      });
      setMatchOpen(false);
      loadMatches(theme);
      toast.success('Enfrentamiento creado.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSavingMatch(false);
    }
  };

  useEffect(() => {
    if (theme?.type === 'MEME') loadEntries(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeWindow]);

  const submitEntry = async () => {
    if (!theme || !file || !label.trim()) {
      toast.error('Elegí una imagen y escribí un nombre/título.');
      return;
    }
    setSaving(true);
    try {
      const { url } = await uploadConoImage(file);
      await createConoEntry(theme.id, { label: label.trim(), imageUrl: url });
      setUploadOpen(false);
      setLabel('');
      setFile(null);
      loadEntries(theme);
      toast.success('¡Entrada publicada!');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!theme) return <Alert severity="error">Tema no encontrado.</Alert>;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <Typography variant="h5" fontWeight={800} sx={{ color: tokens.onSurface }}>{theme.title}</Typography>
      {theme.description && <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant, mb: 2 }}>{theme.description}</Typography>}

      {theme.type === 'MEME' ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Tabs value={rangeWindow} onChange={(_, v) => setRangeWindow(v)}>
              {WINDOWS.map((w) => <Tab key={w.key} label={w.label} value={w.key} />)}
            </Tabs>
            {user && (
              <Button variant="contained" startIcon={<AddPhotoAlternateIcon />} onClick={() => setUploadOpen(true)}>
                Subir meme
              </Button>
            )}
          </Box>

          {entries.length === 0 ? (
            <Alert severity="info">Todavía no hay entradas {rangeWindow && 'en este período'}.</Alert>
          ) : (
            <StaggerContainer>
              <Grid container spacing={2}>
                {entries.map((e, i) => (
                  <Grid item xs={6} sm={4} key={e.id}>
                    <StaggerItem>
                      <MotionCard style={{ position: 'relative' }}>
                        <Card sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: '12px', boxShadow: tokens.cardShadow, position: 'relative' }}>
                          {i < 3 && (
                            <Chip label={`#${i + 1}`} size="small" color="warning"
                              sx={{ position: 'absolute', top: 6, left: 6, zIndex: 1, fontWeight: 700 }} />
                          )}
                          <CardActionArea onClick={() => navigate(`/cono/entrada/${e.id}`)}>
                            <CardMedia component="img" height="120" image={resolveImageUrl(e.imageUrl)} alt={e.label} />
                            <CardContent sx={{ p: 1.2 }}>
                              <Typography variant="body2" fontWeight={600} sx={{ color: tokens.onSurface, mb: 0.5 }} noWrap>{e.label}</Typography>
                              <Stack direction="row" spacing={1}>
                                <Chip icon={<ThumbUpIcon sx={{ fontSize: 12 }} />} label={e.positiveCount} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                <Chip icon={<ThumbDownIcon sx={{ fontSize: 12 }} />} label={e.negativeCount} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                              </Stack>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </MotionCard>
                    </StaggerItem>
                  </Grid>
                ))}
              </Grid>
            </StaggerContainer>
          )}
        </>
      ) : (
        <>
          {user && theme && (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button variant="outlined" startIcon={<AddPhotoAlternateIcon />} onClick={() => setUploadOpen(true)}>
                Proponer competidor
              </Button>
              {isCreator && entries.length >= 2 && (
                <Button variant="outlined" color="secondary" onClick={() => setMatchOpen(true)}>
                  Armar enfrentamiento
                </Button>
              )}
            </Stack>
          )}
          {matches.length === 0 ? (
            <Alert severity="info">Todavía no hay enfrentamientos armados en este torneo.</Alert>
          ) : (
            <StaggerContainer>
              <Stack spacing={2}>
                {matches.map((m) => (
                  <StaggerItem key={m.id}>
                    <ConoMatchCard match={m} />
                  </StaggerItem>
                ))}
              </Stack>
            </StaggerContainer>
          )}
        </>
      )}

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{theme.type === 'MEME' ? 'Subir meme' : 'Proponer competidor'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth margin="dense" label={theme.type === 'MEME' ? 'Título del meme' : 'Nombre del competidor'}
            value={label} onChange={(e) => setLabel(e.target.value)}
          />
          <Button component="label" variant="outlined" sx={{ mt: 1 }} startIcon={<AddPhotoAlternateIcon />}>
            {file ? file.name : 'Elegir imagen'}
            <input type="file" hidden accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={submitEntry} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Publicar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={matchOpen} onClose={() => setMatchOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Armar enfrentamiento</DialogTitle>
        <DialogContent>
          <TextField
            select fullWidth margin="dense" label="Competidor A"
            value={matchForm.entryAId} onChange={(e) => setMatchForm({ ...matchForm, entryAId: e.target.value })}
          >
            {entries.map((e) => <MenuItem key={e.id} value={e.id}>{e.label}</MenuItem>)}
          </TextField>
          <TextField
            select fullWidth margin="dense" label="Competidor B"
            value={matchForm.entryBId} onChange={(e) => setMatchForm({ ...matchForm, entryBId: e.target.value })}
          >
            {entries.map((e) => <MenuItem key={e.id} value={e.id}>{e.label}</MenuItem>)}
          </TextField>
          <TextField
            type="date" fullWidth margin="dense" label="Fecha de votación"
            InputLabelProps={{ shrink: true }}
            value={matchForm.votingDate} onChange={(e) => setMatchForm({ ...matchForm, votingDate: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={submitMatch} disabled={savingMatch}>
            {savingMatch ? <CircularProgress size={18} /> : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
