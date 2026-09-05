import { useEffect, useState } from 'react';
import { Container, Typography, Accordion, AccordionSummary, AccordionDetails, Paper } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { api } from '../services/api';

export default function HelpPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);

  useEffect(() => {
    api.get('/faqs').then((res) => setFaqs(res.data.data)).catch(() => {});
    api.get('/warranties').then((res) => setWarranties(res.data.data)).catch(() => {});
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Ayuda
      </Typography>
      <Typography color="text.secondary" mb={3}>
        Preguntas frecuentes sobre cómo comprar y vender en LaCase Multi Tiendas.
      </Typography>

      <Typography variant="h6" fontWeight={700} mb={2}>
        Preguntas frecuentes
      </Typography>
      {faqs.map((f) => (
        <Accordion key={f.id} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>{f.question}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              {f.answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}

      <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
        Garantías
      </Typography>
      {warranties.map((w) => (
        <Paper key={w.id} sx={{ p: 2, mb: 1 }}>
          <Typography fontWeight={600}>{w.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {w.content}
          </Typography>
        </Paper>
      ))}
    </Container>
  );
}
