import { useEffect, useState } from 'react';
import { Container, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { api } from '../services/api';
import { useUnifiedTokens } from '../theme';
import { PageHeader, SurfaceCard } from '../components/redesign/PageHeader';
import { FadeIn } from '../components/motion/FadeIn';

export default function HelpPage() {
  const t = useUnifiedTokens();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);

  useEffect(() => {
    api.get('/faqs').then((res) => setFaqs(res.data.data)).catch(() => {});
    api.get('/warranties').then((res) => setWarranties(res.data.data)).catch(() => {});
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <PageHeader
        title="Ayuda"
        subtitle="Preguntas frecuentes sobre cómo comprar y vender en LaCase Multi Tiendas."
        icon={<HelpOutlineIcon />}
      />

      <FadeIn>
      <Typography variant="h6" fontWeight={700} mb={2} color={t.onSurface}>
        Preguntas frecuentes
      </Typography>
      {faqs.map((f) => (
        <Accordion
          key={f.id}
          disableGutters
          elevation={0}
          sx={{
            mb: 1,
            borderRadius: '16px !important',
            bgcolor: t.surfaceContainerLowest,
            border: `1px solid ${t.outline}33`,
            boxShadow: t.cardShadow,
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: t.onSurfaceVariant }} />}>
            <Typography fontWeight={600} color={t.onSurface}>{f.question}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color={t.onSurfaceVariant}>
              {f.answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}

      <Typography variant="h6" fontWeight={700} mt={4} mb={2} color={t.onSurface}>
        Garantías
      </Typography>
      {warranties.map((w) => (
        <SurfaceCard key={w.id} sx={{ p: 2, mb: 1 }}>
          <Typography fontWeight={600} color={t.onSurface}>{w.title}</Typography>
          <Typography variant="body2" color={t.onSurfaceVariant}>
            {w.content}
          </Typography>
        </SurfaceCard>
      ))}
      </FadeIn>
    </Container>
  );
}
