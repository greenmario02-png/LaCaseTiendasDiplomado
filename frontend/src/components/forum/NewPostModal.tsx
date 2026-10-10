import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Stack, Chip, Alert, InputLabel, FormControl, Select, Box,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useForumPalette } from '../../theme/forumTheme';
import { useForumStore } from '../../stores/forumStore';
import { useAuthStore } from '../../stores/authStore';
import { listCategories, createPost, uploadPostImages } from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';
import type { ForumCategory, GifResult } from '../../services/forum.api';
import { PencilLine } from 'lucide-react';
import GifBoxOutlinedIcon from '@mui/icons-material/GifBoxOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { CategoryIcon } from '../../theme/forumIcons';
import { useTranslation } from 'react-i18next';
import GifPicker from './GifPicker';

const POST_TYPES = ['GENERAL', 'PRECIO', 'EXISTENCIA', 'EMPLEO', 'ALQUILER', 'ANTICROTICO', 'DIRECCION'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewPostModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const forumPalette = useForumPalette();
  const { user } = useAuthStore();
  const fetchPosts = useForumStore((s) => s.fetchPosts);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState(user?.forumProfile?.city ?? '');
  const [type, setType] = useState('GENERAL');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [gifUrls, setGifUrls] = useState<string[]>([]);
  const [gifOpen, setGifOpen] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && !loaded) {
      setLoaded(true);
      listCategories()
        .then((cats) => setCategories(cats))
        .catch(() => {});
    }
  }, [open, loaded]);

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && tags.length < 5 && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const handleSubmit = async () => {
    setError('');
    if (title.trim().length < 10) return setError(t('forum.newPostModal.titleTooShort'));
    if (body.trim().length < 20) return setError(t('forum.newPostModal.bodyTooShort'));
    if (!categoryId) return setError(t('forum.newPostModal.selectCategory'));
    setSubmitting(true);
    try {
      const post = await createPost({
        title: title.trim(),
        body: body.trim(),
        categoryId: Number(categoryId),
        city: city.trim() || 'Bolivia',
        type,
        tags,
        images: gifUrls,
      });
      // Subir imágenes tras crear el post (máx 4)
      if (images.length > 0 && post?.id) {
        await uploadPostImages(post.id, images.slice(0, 4));
      }
      onClose();
      setTitle(''); setBody(''); setCategoryId(''); setCity(user?.forumProfile?.city ?? ''); setType('GENERAL'); setTags([]); setImages([]); setGifUrls([]);
      void fetchPosts({ reset: true });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setImages([]);
    setGifUrls([]);
  };

  const handlePickGif = (gif: GifResult) => {
    setGifUrls((prev) => [...prev, gif.url].slice(0, 4));
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ bgcolor: forumPalette.bgCard, color: forumPalette.textPrimary, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PencilLine size={18} strokeWidth={2.2} /> {t('forum.newPostModal.title')}
      </DialogTitle>
      <DialogContent sx={{ bgcolor: forumPalette.bgCard, pt: 2 }}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('forum.newPostModal.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 200 }}
            helperText={t('forum.newPostModal.titleHelper', { length: title.length })}
            sx={{ input: { color: forumPalette.textPrimary } }}
          />
          <TextField
            label={t('forum.newPostModal.bodyLabel')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            inputProps={{ maxLength: 5000 }}
            sx={{ '& textarea': { color: forumPalette.textPrimary } }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('forum.newPostModal.subforumLabel')}</InputLabel>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} label={t('forum.newPostModal.subforumLabel')}>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CategoryIcon slug={c.slug} size={16} />{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>{t('forum.newPostModal.typeLabel')}</InputLabel>
              <Select value={type} onChange={(e) => setType(e.target.value)} label={t('forum.newPostModal.typeLabel')}>
                {POST_TYPES.map((pt) => (
                  <MenuItem key={pt} value={pt}>{pt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <TextField
            label={t('forum.newPostModal.cityLabel')}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            fullWidth
            size="small"
            helperText={t('forum.newPostModal.cityHelper')}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label={t('forum.newPostModal.tagsLabel')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
              size="small"
              fullWidth
            />
            <Button onClick={handleAddTag} variant="outlined" size="small">{t('forum.newPostModal.addTag')}</Button>
          </Stack>
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {tags.map((t) => (
              <Chip key={t} label={`#${t}`} onDelete={() => setTags(tags.filter((x) => x !== t))} size="small" />
            ))}
          </Stack>
          {/* Subida de imágenes */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component="label"
              variant="outlined"
              size="small"
              startIcon={<AddPhotoAlternateIcon />}
              disabled={images.length >= 4}
            >
              {t('forum.newPostModal.addImages', { count: images.length })}
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setImages((prev) => [...prev, ...files].slice(0, 4));
                  e.target.value = '';
                }}
              />
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setGifOpen(true)}
              disabled={images.length + gifUrls.length >= 4}
              sx={{ color: forumPalette.accent, borderColor: forumPalette.accent }}
            >
              <GifBoxOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} /> {t('forum.newPostModal.gifCount', { count: gifUrls.length })}
            </Button>
            {images.length > 0 && (
              <Button size="small" color="error" onClick={() => setImages([])}>{t('forum.newPostModal.removeAllImages')}</Button>
            )}
            {gifUrls.length > 0 && (
              <Button size="small" color="error" onClick={() => setGifUrls([])}>{t('forum.newPostModal.removeGifs')}</Button>
            )}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {images.map((img, i) => (
              <Box
                key={i}
                component="img"
                src={URL.createObjectURL(img)}
                alt={`imagen-${i + 1}`}
                sx={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 1, border: `1px solid ${forumPalette.border}` }}
              />
            ))}
            {gifUrls.map((u, i) => (
              <Box
                key={`gif-${i}`}
                component="img"
                src={u}
                alt={`gif-${i + 1}`}
                sx={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 1, border: `1px solid ${forumPalette.border}` }}
              />
            ))}
          </Stack>
          {(type === 'PRECIO' || type === 'EXISTENCIA') && (
            <Alert severity="info" icon={<SmartToyOutlinedIcon fontSize="inherit" />} sx={{ fontSize: '0.8rem' }}>
              {t('forum.newPostModal.botNotice')}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ bgcolor: forumPalette.bgCard }}>
        <Button onClick={handleClose}>{t('forum.newPostModal.cancel')}</Button>
        <Button variant="contained" disabled={submitting} onClick={handleSubmit} sx={{ bgcolor: forumPalette.accent, '&:hover': { bgcolor: forumPalette.accentHover } }}>
          {t('forum.newPostModal.submit')}
        </Button>
      </DialogActions>
      <GifPicker open={gifOpen} onClose={() => setGifOpen(false)} onPick={handlePickGif} />
    </Dialog>
  );
}
