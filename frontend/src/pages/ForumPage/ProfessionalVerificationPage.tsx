import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, RadioGroup, FormControlLabel, Radio, Alert, CircularProgress, Stack,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import ScienceIcon from '@mui/icons-material/Science';
import toast from 'react-hot-toast';
import {
  listProfessionalFields, getFieldQuestions, submitVerification, getMyVerifications,
} from '../../services/forum.api';
import type { ProfessionalField, ProfessionalQuestion } from '../../services/forum.api';
import { useUnifiedTokens } from '../../theme';
import { getErrorMessage } from '../../services/api';

export default function ProfessionalVerificationPage() {
  const tokens = useUnifiedTokens();
  const [fields, setFields] = useState<ProfessionalField[]>([]);
  const [verifiedFieldIds, setVerifiedFieldIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const [activeField, setActiveField] = useState<ProfessionalField | null>(null);
  const [questions, setQuestions] = useState<ProfessionalQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: 'PASSED' | 'FAILED'; score: number; totalQuestions: number } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([listProfessionalFields(), getMyVerifications()])
      .then(([f, v]) => {
        setFields(f);
        setVerifiedFieldIds(new Set(v.map((x) => x.fieldId)));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openQuiz = async (field: ProfessionalField) => {
    setActiveField(field);
    setAnswers({});
    setResult(null);
    try {
      const { questions } = await getFieldQuestions(field.slug);
      setQuestions(questions);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setActiveField(null);
    }
  };

  const submit = async () => {
    if (!activeField) return;
    if (Object.keys(answers).length < questions.length) {
      toast.error('Respondé todas las preguntas antes de enviar.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({ questionId: q.id, selectedOptionIndex: answers[q.id] }));
      const res = await submitVerification(activeField.slug, payload);
      setResult(res);
      if (res.status === 'PASSED') load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} sx={{ color: tokens.onSurface, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScienceIcon sx={{ fontSize: 20, color: tokens.primary }} /> Comunidades profesionales
      </Typography>
      <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant, mb: 2 }}>
        Respondé un cuestionario básico de tu área para poder publicar en Ciencia, Debates, Noticias y
        Preguntas de esa comunidad. Podés seguir leyendo esas secciones sin verificarte.
      </Typography>

      <Stack spacing={1.5}>
        {fields.map((f) => {
          const verified = verifiedFieldIds.has(f.id);
          return (
            <Card key={f.id} sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: '12px', boxShadow: tokens.cardShadow }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} sx={{ color: tokens.onSurface, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {f.name}
                    {verified && <Chip icon={<VerifiedIcon sx={{ fontSize: 14 }} />} label="Verificado" size="small" color="success" variant="outlined" />}
                  </Typography>
                  {f.description && (
                    <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant }}>{f.description}</Typography>
                  )}
                </Box>
                <Button variant={verified ? 'outlined' : 'contained'} size="small" onClick={() => openQuiz(f)}>
                  {verified ? 'Reintentar cuestionario' : 'Rendir cuestionario'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Dialog open={!!activeField} onClose={() => setActiveField(null)} fullWidth maxWidth="sm">
        <DialogTitle>Cuestionario — {activeField?.name}</DialogTitle>
        <DialogContent>
          {result ? (
            <Alert severity={result.status === 'PASSED' ? 'success' : 'error'} sx={{ mt: 1 }}>
              {result.status === 'PASSED'
                ? `¡Aprobaste! ${result.score}/${result.totalQuestions} correctas. Ya podés publicar en esta comunidad.`
                : `No aprobaste (${result.score}/${result.totalQuestions} correctas). Podés reintentar más tarde.`}
            </Alert>
          ) : questions.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : (
            <Stack spacing={2} mt={1}>
              {questions.map((q, i) => (
                <Box key={q.id}>
                  <Typography fontWeight={600} sx={{ mb: 0.5 }}>{i + 1}. {q.question}</Typography>
                  <RadioGroup
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
                  >
                    {q.options.map((opt, idx) => (
                      <FormControlLabel key={idx} value={idx} control={<Radio size="small" />} label={opt} />
                    ))}
                  </RadioGroup>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveField(null)}>{result ? 'Cerrar' : 'Cancelar'}</Button>
          {!result && questions.length > 0 && (
            <Button variant="contained" onClick={submit} disabled={submitting}>
              {submitting ? <CircularProgress size={18} /> : 'Enviar respuestas'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
