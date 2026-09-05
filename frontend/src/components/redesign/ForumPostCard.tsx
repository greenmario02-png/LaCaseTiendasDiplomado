import React, { useState } from 'react';
import { Card, CardContent, Chip, Typography, Box, Button, Stack } from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { getUnifiedTokens } from '../../theme';

export type ForumPostCardData = {
  id: number;
  title: string;
  body: string;
  city: string;
  category: { icon: string; name: string; color: string };
  author: { forumUsername: string };
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  replyCount: number;
  positives: number;
  createdAt: string;
};

type Props = {
  post: ForumPostCardData;
  onOpen: (id: number) => void;
  onPositive: (id: number) => void;
};

export function ForumPostCard({ post, onOpen, onPositive }: Props) {
  const [voted, setVoted] = useState(false);
  const tokens = getUnifiedTokens(false);
  const isResolved = post.status === 'RESOLVED';
  return (
    <Card
      sx={{
        bgcolor: tokens.surfaceContainerLowest,
        borderRadius: '12px',
        boxShadow: tokens.cardShadow,
        mb: 2,
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={1} alignItems="center">
          <Box
            component="span"
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: `${post.category.color}22`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            {post.category.icon}
          </Box>
          <Chip label={post.category.name} size="small" sx={{ bgcolor: `${tokens.primary}14`, color: tokens.primary }} />
          <Chip label={`📍 ${post.city}`} size="small" variant="outlined" />
          <Chip
            label={isResolved ? 'Resuelta ✓' : 'Abierta'}
            size="small"
            sx={{
              bgcolor: isResolved ? `${tokens.tertiaryContainer}1A` : `${tokens.secondaryContainer}26`,
              color: isResolved ? tokens.tertiaryContainer : '#B45309',
              fontWeight: 600,
            }}
          />
        </Stack>
        <Typography
          variant="subtitle1"
          fontWeight={600}
          sx={{ cursor: 'pointer', '&:hover': { color: tokens.primary } }}
          onClick={() => onOpen(post.id)}
        >
          {post.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {post.body}
        </Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            por {post.author.forumUsername} · 💬 {post.replyCount}
          </Typography>
          <Button
            size="small"
            startIcon={<ThumbUpIcon />}
            onClick={() => {
              onPositive(post.id);
              setVoted((v) => !v);
            }}
            sx={{ color: voted ? tokens.primary : tokens.outline, textTransform: 'none' }}
          >
            {voted ? 'Me sirvió' : 'Positivo'} {post.positives + (voted ? 1 : 0)}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
