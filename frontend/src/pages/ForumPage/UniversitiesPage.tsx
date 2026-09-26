import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Stack, CircularProgress, Alert } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { useNavigate } from 'react-router-dom';
import { listUniversities } from '../../services/forum.api';
import type { University } from '../../services/forum.api';
import { useUnifiedTokens } from '../../theme';
import { useForumStore } from '../../stores/forumStore';

export function UniversitiesPage() {
  const tokens = useUnifiedTokens();
  const navigate = useNavigate();
  const { setCategory } = useForumStore();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUniversities().then(setUniversities).finally(() => setLoading(false));
  }, []);

  const grouped = universities.reduce<Record<string, University[]>>((acc, u) => {
    const dept = u.city.department;
    (acc[dept] ??= []).push(u);
    return acc;
  }, {});

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} sx={{ color: tokens.onSurface, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SchoolIcon sx={{ fontSize: 20, color: tokens.primary }} /> Universidades
      </Typography>
      <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }}>
        Cada subforo es exclusivo de la comunidad universitaria de su ciudad — solo lo ven quienes
        estén en esa ciudad, o ya tengan actividad previa ahí.
      </Alert>

      {Object.entries(grouped).map(([dept, unis]) => (
        <Box key={dept} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: tokens.onSurfaceVariant, mb: 1 }}>{dept}</Typography>
          <Stack spacing={1}>
            {unis.map((u) => {
              const slug = u.categories[0]?.slug;
              return (
                <Card key={u.id} sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: '10px', boxShadow: tokens.cardShadow }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '10px !important' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={600} sx={{ color: tokens.onSurface, fontSize: '0.9rem' }}>{u.name}</Typography>
                      <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant }}>{u.city.name}</Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!slug}
                      onClick={() => { if (slug) { setCategory(slug); navigate('/foro'); } }}
                    >
                      Entrar al subforo
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
