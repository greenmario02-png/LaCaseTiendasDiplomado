import { useEffect, useState, useRef } from 'react';
import { PartyPopper } from 'lucide-react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  Avatar,
  Divider,
  Breadcrumbs,
  IconButton,
  Grid2,
  Tooltip,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import TimerIcon from '@mui/icons-material/Timer';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import LockIcon from '@mui/icons-material/Lock';
import { api } from '../services/api';
import { useMoney } from '../hooks/useMoney';
import { useAuthStore } from '../stores/authStore';
import { connectSocket, disconnectSocket, joinAuction, leaveAuction } from '../services/socket';
import { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';
import { PrimaryButton, SecondaryButton } from '../components/redesign/Buttons';

interface Bid {
  id: number;
  bidAmount: string;
  createdAt: string;
  bidder: { id: number; firstName: string; lastName: string; storeName?: string | null };
}

interface Auction {
  id: number;
  title: string;
  description?: string | null;
  currentPrice: string;
  startingPrice: string;
  minIncrement: string;
  maxIncrement: string;
  nextBid: number;
  endDate: string;
  isExpired: boolean;
  imageUrl?: string | null;
  seller: { id: number; storeName: string; rating: number };
  winner?: { id: number; firstName: string; lastName: string } | null;
  isSold: boolean;
  bids: Bid[];
  bidsCount: number;
  reservePrice?: number | null;
  reserveMet?: boolean;
  buyNowPrice?: number | null;
  isHighestBidder?: boolean;
  myProxyBid?: number | null;
  isWatching?: boolean;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Terminada';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
}

export default function AuctionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const money = useMoney();
  const user = useAuthStore((s) => s.user);

  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    api
      .get(`/auctions/${id}`)
      .then((res) => {
        setAuction(res.data.data);
        setTimeLeft(res.data.data.timeLeftMs);
      })
      .catch(() => setAuction(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  // Countdown
  useEffect(() => {
    if (!auction) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [auction?.id]);

  // Socket.IO para tiempo real
  useEffect(() => {
    if (!auction) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = connectSocket(token);
    joinAuction(Number(id));

    socket.on('auction:bidPlaced', (payload: any) => {
      if (payload.auction) {
        setAuction(payload.auction);
        setTimeLeft(payload.auction.timeLeftMs);
        if (payload.extendedTo) {
          toast.success('¡Oferta en los últimos minutos! El tiempo se extendió.');
        }
      }
    });

    socket.on('auction:sold', () => {
      load(true);
      toast.success('Subasta cerrada');
    });

    return () => {
      socket.off('auction:bidPlaced');
      socket.off('auction:sold');
      leaveAuction(Number(id));
      disconnectSocket();
    };
  }, [auction?.id, id]);

  const placeBid = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const amount = Number(bidAmount);
    if (!amount) {
      toast.error('Ingresá un monto');
      return;
    }
    setBidding(true);
    try {
      const { data } = await api.post(`/auctions/${id}/bid`, { bidAmount: amount });
      toast.success(data.message || 'Oferta registrada');
      setBidAmount('');
      if (data.data.auction) setAuction(data.data.auction);
      setTimeLeft(data.data.auction?.timeLeftMs ?? 0);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBidding(false);
    }
  };

  const doBuyNow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!confirm(`¿Comprar al instante por ${money(auction!.buyNowPrice!)}?`)) return;
    setBidding(true);
    try {
      const { data } = await api.post(`/auctions/${id}/buy-now`);
      toast.success(data.message || 'Compra realizada');
      load(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBidding(false);
    }
  };

  const toggleWatch = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/auctions/${id}/watch`);
      setAuction((a) => (a ? { ...a, isWatching: data.data.watched } : a));
      toast.success(data.data.watched ? 'Agregado a tu watchlist' : 'Quitado del watchlist');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;

  if (!auction) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5">Subasta no encontrada</Typography>
      </Container>
    );
  }

  const isExpired = auction.isExpired || timeLeft <= 0;
  const isSeller = user?.id === auction.seller.id;
  const myHighestBid = auction.bids.find((b) => b.bidder.id === user?.id);
  const iAmWinning = auction.isHighestBidder && !isExpired;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Typography component={Link} to="/" color="inherit" sx={{ textDecoration: 'none' }}>
          Inicio
        </Typography>
        <Typography component={Link} to="/subastas" color="inherit" sx={{ textDecoration: 'none' }}>
          Subastas
        </Typography>
        <Typography color="text.primary">{auction.title}</Typography>
      </Breadcrumbs>

      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 1 }}>
            <Box className="image-container" sx={{ aspectRatio: '1/1', borderRadius: 2 }}>
              {auction.imageUrl ? (
                <img src={auction.imageUrl} alt={auction.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <GavelIcon sx={{ fontSize: 80, color: '#ccc' }} />
              )}
            </Box>
          </Paper>
        </Grid2>

        <Grid2 size={{ xs: 12, md: 6 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h4" fontWeight={700} flex={1}>
              {auction.title}
            </Typography>
            {user && !isSeller && (
              <Tooltip title={auction.isWatching ? 'Quitar del watchlist' : 'Agregar al watchlist'}>
                <IconButton onClick={toggleWatch}>
                  {auction.isWatching ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1} mt={1} mb={2} flexWrap="wrap">
            <Chip label={`Precio actual: ${money(auction.currentPrice)}`} color="primary" />
            <Chip label={`Inicial: ${money(auction.startingPrice)}`} variant="outlined" />
            <Chip label={`${auction.bidsCount} ofertas`} variant="outlined" />
            {auction.buyNowPrice && !isExpired && (
              <Chip label={`Buy It Now: ${money(auction.buyNowPrice)}`} color="secondary" icon={<LocalOfferIcon />} />
            )}
            {auction.reservePrice && (
              <Chip
                label={auction.reserveMet ? 'Reserva alcanzada ✓' : `Reserva no alcanzada (${money(auction.reservePrice)})`}
                variant="outlined"
                color={auction.reserveMet ? 'success' : 'warning'}
              />
            )}
          </Box>

          <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon color={isExpired ? 'error' : 'success'} />
            <Box flex={1}>
              <Typography variant="body1" fontWeight={700} color={isExpired ? 'error' : 'success.main'}>
                {isExpired ? 'Subasta terminada' : formatTimeLeft(timeLeft)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(auction.endDate).toLocaleString('es-BO')}
              </Typography>
            </Box>
            {auction.reservePrice && !auction.reserveMet && !isExpired && (
              <Chip icon={<LockIcon />} label="Reserva no alcanzada" size="small" color="warning" />
            )}
          </Paper>

          {auction.description && (
            <Typography variant="body2" color="text.secondary" paragraph>
              {auction.description}
            </Typography>
          )}

          <Box mb={2}>
            <Typography variant="body2" fontWeight={600}>
              Vendedor:{' '}
              <Link to={`/vendedor/${auction.seller.id}`} style={{ color: 'inherit' }}>
                {auction.seller.storeName}
              </Link>{' '}
              {auction.seller.rating}
            </Typography>
          </Box>

          {isExpired ? (
            auction.isSold && auction.winner ? (
              <Alert severity="success">
                Ganada por {auction.winner.firstName} {auction.winner.lastName} con {money(auction.currentPrice)}
              </Alert>
            ) : (
              <Alert severity="info">
                Subasta finalizada {auction.reservePrice && !auction.reserveMet ? '(no se alcanzó la reserva)' : '(sin ganador)'}.
              </Alert>
            )
          ) : isSeller ? (
            <Alert severity="info">Esta es tu subasta. No podés ofertar ni comprarla.</Alert>
          ) : (
            <Paper sx={{ p: 2 }}>
              {iAmWinning && <Alert severity="success" sx={{ mb: 2 }}>Vas ganando con {money(auction.currentPrice)}</Alert>}
              {myHighestBid && !iAmWinning && !isExpired && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Tu mejor oferta: {money(myHighestBid.bidAmount)}
                  {auction.myProxyBid ? ` (proxy máximo: ${money(auction.myProxyBid)})` : ''}
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary" mb={1}>
                Próxima oferta mínima: <strong>{money(auction.nextBid)}</strong>
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <TextField
                  type="number"
                  size="small"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={String(auction.nextBid)}
                  sx={{ flex: 1, minWidth: 140 }}
                />
                <PrimaryButton onClick={placeBid} disabled={bidding}>
                  {bidding ? <CircularProgress size={20} color="inherit" /> : 'Ofertar'}
                </PrimaryButton>
                {auction.buyNowPrice && (
                  <SecondaryButton onClick={doBuyNow} disabled={bidding}>
                    <LocalOfferIcon sx={{ mr: 0.5 }} /> Buy It Now
                  </SecondaryButton>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Tu oferta actúa como <strong>proxy bidding</strong>: pagás solo lo necesario para ganar, hasta el monto que indicás.
              </Typography>
            </Paper>
          )}
        </Grid2>
      </Grid2>

      {/* Historial de ofertas */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Historial de ofertas ({auction.bids.length})
        </Typography>
        {auction.bids.length === 0 ? (
          <Typography color="text.secondary">Aún no hay ofertas. ¡Sé el primero!</Typography>
        ) : (
          <List disablePadding>
            {auction.bids.slice(0, 30).map((b, idx) => (
              <ListItem key={b.id} divider={idx < Math.min(auction.bids.length, 30) - 1} disableGutters>
                <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: b.bidder.id === user?.id ? 'primary.main' : 'grey.500' }}>
                  {b.bidder.firstName?.[0] || b.bidder.lastName?.[0] || 'U'}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={600}>
                    {b.bidder.storeName || `${b.bidder.firstName} ${b.bidder.lastName}`}
                    {b.bidder.id === user?.id && ' (vos)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(b.createdAt).toLocaleTimeString('es-BO')}
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight={700} className="price-color">
                  {money(b.bidAmount)}
                </Typography>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}
