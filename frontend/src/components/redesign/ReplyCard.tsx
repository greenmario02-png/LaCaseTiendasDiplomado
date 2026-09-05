import React, { useState } from 'react';
import { Card, CardContent, Chip, Typography, Box, Button, Stack } from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getUnifiedTokens } from '../../theme';

export type ReplyCardData = {
  id: number;
  body: string;
  images?: string[];
  isBotReply?: boolean;
  isAccepted?: boolean;
  author: { forumUsername: string; tag?: string } | null;
  positives?: number;
  createdAt?: string;
};

type Props = {
  reply: ReplyCardData;
  canAccept?: boolean;
  onAccept?: (id: number) => void;
  onPositive?: (id: number) => void;
};

export function ReplyCard({ reply, canAccept, onAccept, onPositive }: Props) {
  const [voted, setVoted] = useState(false);
  const tokens = getUnifiedTokens(false);
  const positives = reply.positives ?? 0;

  return (
    <Card
      sx={{
        bgcolor: tokens.surfaceContainerLowest,
        borderRadius: '12px',
        boxShadow: tokens.cardShadow,
        mb: 1.5,
        borderLeft: reply.isAccepted ? `3px solid ${tokens.tertiaryContainer}` : undefined,
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={1} alignItems="center">
          {reply.isBotReply ? (
            <Chip
              label="Bot LaCASE Multitienda"
              size="small"
              sx={{ bgcolor: `${tokens.primary}14`, color: tokens.primary, fontWeight: 600 }}
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              <strong style={{ color: tokens.onSurface }}>{reply.author?.forumUsername ?? 'usuario'}</strong>
              {reply.author?.tag ? ` · ${reply.author.tag}` : ''}
            </Typography>
          )}
          {reply.isAccepted && (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
              label="Resuelve la duda"
              size="small"
              sx={{ bgcolor: `${tokens.tertiaryContainer}1A`, color: tokens.tertiaryContainer, fontWeight: 600 }}
            />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', mb: 1 }}>
          {reply.body}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            startIcon={<ThumbUpIcon />}
            onClick={() => {
              onPositive?.(reply.id);
              setVoted((v) => !v);
            }}
            sx={{ color: voted ? tokens.primary : tokens.outline, textTransform: 'none' }}
          >
            {voted ? 'Me sirvió' : 'Positivo'} {positives + (voted ? 1 : 0)}
          </Button>
          {canAccept && !reply.isAccepted && !reply.isBotReply && (
            <Button
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={() => onAccept?.(reply.id)}
              sx={{ color: tokens.tertiaryContainer, textTransform: 'none' }}
            >
              Marcar como respuesta
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
