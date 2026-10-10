import React, { useState } from 'react';
import { Card, CardContent, Chip, Typography, Box, Button, Stack } from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { getUnifiedTokens } from '../../theme';
import { useThemeStore } from '../../stores/themeStore';
import { CategoryIcon } from '../../theme/forumIcons';

export type ForumPostCardData = {
  id: number;
  title: string;
  body: string;
  city: string;
  category: { slug?: string; icon: string; name: string; color: string };
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
  const darkMode = useThemeStore((s) => s.darkMode);
  const tokens = getUnifiedTokens(darkMode);
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
            <CategoryIcon slug={post.category.slug} size={18} color={post.category.color} />
          </Box>
          <Chip label={post.category.name} size="small" sx={{ bgcolor: `${tokens.primary}14`, color: tokens.primary }} />
          <Chip icon={<PlaceOutlinedIcon />} label={post.city} size="small" variant="outlined" />
          <Chip
            icon={isResolved ? <CheckCircleOutlineIcon /> : undefined}
            label={isResolved ? 'Resuelta' : 'Abierta'}
            size="small"
            sx={{
              bgcolor: isResolved ? `${tokens.tertiaryContainer}1A` : `${tokens.secondaryContainer}26`,
              color: isResolved ? tokens.tertiaryContainer : tokens.secondary,
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
            por {post.author.forumUsername} · <ChatBubbleOutlineIcon sx={{ fontSize: 14, verticalAlign: 'text-bottom' }} /> {post.replyCount}
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
