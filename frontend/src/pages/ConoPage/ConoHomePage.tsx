import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardActionArea, Grid, Tabs, Tab, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Chip, Alert,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { listConoThemes, createConoTheme } from '../../services/cono.api';
import type { ConoTheme, ConoThemeType } from '../../services/cono.api';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';
import { MotionCard } from '../../components/motion/MotionCard';

export default function ConoHomePage() {
  const { t } = useTranslation();
  const tokens = useUnifiedTokens();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<ConoThemeType>('MEME');
  const [themes, setThemes] = useState<ConoTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ slug: '', title: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listConoThemes(tab).then(setThemes).finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const submitTheme = async () => {
    if (!form.slug.trim() || !form.title.trim()) {
      toast.error(t('cono.home.slugAndTitleRequired'));
      return;
    }
    setSaving(true);
    try {
      const theme = await createConoTheme({ ...form, type: tab });
      setCreateOpen(false);
      setForm({ slug: '', title: '', description: '' });
      navigate(`/cono/${theme.slug}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <Typography variant="h5" fontWeight={800} sx={{ color: tokens.onSurface, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmojiEventsIcon sx={{ fontSize: 26, color: tokens.primary }} /> {t('cono.home.title')}
      </Typography>
      <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant, mb: 2 }}>
        {t('cono.home.subtitle')}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={t('cono.home.tabMemes')} value="MEME" />
          <Tab label={t('cono.home.tabTournaments')} value="TOURNAMENT" icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
        {user && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            {t('cono.home.newTheme')}
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : themes.length === 0 ? (
        <Alert severity="info">{t('cono.home.emptyThemes')}</Alert>
      ) : (
        <StaggerContainer>
          <Grid container spacing={2}>
            {themes.map((theme) => (
              <Grid item xs={12} sm={6} key={theme.id}>
                <StaggerItem>
                  <MotionCard>
                    <Card sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: '12px', boxShadow: tokens.cardShadow }}>
                      <CardActionArea onClick={() => navigate(`/cono/${theme.slug}`)}>
                        <CardContent>
                          <Typography fontWeight={700} sx={{ color: tokens.onSurface }}>{theme.title}</Typography>
                          {theme.description && (
                            <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant, mb: 1 }}>{theme.description}</Typography>
                          )}
                          <Chip label={t('cono.home.entriesCount', { count: theme._count?.entries ?? 0 })} size="small" />
                          {theme.createdBy && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: tokens.onSurfaceVariant }}>
                              {t('cono.home.byAuthor', { username: theme.createdBy.forumUsername })}
                            </Typography>
                          )}
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('cono.home.newThemeDialogTitle', { type: tab === 'MEME' ? t('cono.home.tabMemes') : t('cono.home.tournamentSingular') })}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
            {t('cono.home.verificationRequired')}
            <Button size="small" onClick={() => navigate('/foro/verificacion')} sx={{ ml: 1 }}>{t('cono.home.verifyMe')}</Button>
          </Alert>
          <TextField
            fullWidth margin="dense" label={t('cono.home.slugLabel')} placeholder="peor-banco-bolivia"
            value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" label={t('cono.home.titleLabel')} placeholder="Peor banco de Bolivia"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" label={t('cono.home.descriptionLabel')} multiline minRows={2}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('cono.home.cancel')}</Button>
          <Button variant="contained" onClick={submitTheme} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : t('cono.home.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

