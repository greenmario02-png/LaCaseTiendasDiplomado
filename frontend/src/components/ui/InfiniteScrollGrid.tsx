import { useEffect, useRef, useState, ReactNode } from 'react';
import { Box, CircularProgress, Button, Typography } from '@mui/material';
import { ProductGridSkeleton } from './LoadingSkeleton';

interface Props<T> {
  hasMore: boolean;
  loading: boolean;
  fetchNext: () => Promise<void>;
  children: ReactNode;
  skeletonCount?: number;
  emptyMessage?: string;
  total?: number;
}

/**
 * Grid con infinite scroll usando IntersectionObserver.
 * Carga la siguiente página automáticamente al llegar al final,
 * con skeletons mientras carga y botón "Cargar más" como fallback.
 */
export default function InfiniteScrollGrid<T>({
  hasMore,
  loading,
  fetchNext,
  children,
  skeletonCount = 6,
  emptyMessage = 'No se encontraron resultados',
  total,
}: Props<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showFallback, setShowFallback] = useState(false);
  const loadingRef = useRef(loading);

  // Sincronizar el ref fuera del render (evita efectos secundarios en render)
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          fetchNext().catch(() => {});
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, fetchNext]);

  // fallback manual si el observer no dispara (scroll de página completo)
  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box>
      {children}
      {loading && <ProductGridSkeleton count={skeletonCount} />}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      {hasMore && showFallback && !loading && (
        <Box textAlign="center" py={3}>
          <Button variant="outlined" onClick={() => fetchNext().catch(() => {})}>
            Cargar más productos
          </Button>
        </Box>
      )}
      {!hasMore && total !== undefined && total > 0 && (
        <Box textAlign="center" py={3}>
          <Typography variant="body2" color="text.secondary">
            Mostrando todos los {total} resultados
          </Typography>
        </Box>
      )}
      {!hasMore && total === 0 && (
        <Box textAlign="center" py={6}>
          <Typography variant="body1" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      )}
      {loading && (
        <Box textAlign="center" py={2}>
          <CircularProgress size={28} />
        </Box>
      )}
    </Box>
  );
}
