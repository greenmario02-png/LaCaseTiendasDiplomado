import { useEffect, useState } from 'react';
import { BadgeCheck, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Chip,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Card,
  CardActionArea,
  CardContent,
  CardActions,
  CardMedia,
  Alert,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { PrimaryButton } from '../components/redesign/Buttons';
import GavelIcon from '@mui/icons-material/Gavel';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BoltIcon from '@mui/icons-material/Bolt';
import TimerIcon from '@mui/icons-material/Timer';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { api, getErrorMessage } from '../services/api';
import { useMoney } from '../hooks/useMoney';
import toast from 'react-hot-toast';

interface Auction {
  id: number;
  title: string;
  currentPrice: string | number;
  bidsCount: number;
  timeLeftMs: number;
  endDate: string;
  isExpired: boolean;
  isSold: boolean;
  reserveMet: boolean;
  myProxyBid?: number | null;
  isHighestBidder: boolean;
  winner?: { id: number; firstName: string; lastName: string } | null;
  seller: { storeName: string };
  imageUrl?: string | null;
  orderId?: number | null;
  isPaid?: boolean;
  paymentDeadline?: number | null;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Terminada';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Nivel lúdico según la actividad del usuario en la subasta */
function levelLabel(a: Auction): { label: string; color: 'success' | 'primary' | 'error' | 'warning' } {
  if (a.isHighestBidder) return { label: 'Vas ganando', color: 'success' };
  if (a.timeLeftMs < 3600000) return { label: '¡Última hora!', color: 'error' };
  return { label: 'Competís', color: 'primary' };
}

export default function AuctionWatchlistPage() {
  const money = useMoney();
  const [tab, setTab] = useState(0);
  const [active, setActive] = useState<Auction[]>([]);
  const [watchlist, setWatchlist] = useState<Auction[]>([]);
  const [won, setWon] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/auctions/active').then((r) => r.data.data).catch(() => []),
      api.get('/auctions/watchlist').then((r) => r.data.data).catch(() => []),
      api.get('/auctions/my-won').then((r) => r.data.data).catch(() => []),
    ])
      .then(([act, w, wn]) => {
        setActive(act);
        setWatchlist(w);
        setWon(wn);
      })
      .finally(() => setLoading(false));
  }, []);

  const removeFromWatch = async (auctionId: number) => {
    try {
      await api.post(`/auctions/${auctionId}/watch`);
      setWatchlist((prev) => prev.filter((a) => a.id !== auctionId));
      toast.success('Quitado del watchlist');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const renderGrid = (items: Auction[], emptyText: string, interactive = false) => (
    <>
      {items.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">{emptyText}</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {items.map((a) => {
            const lvl = levelLabel(a);
            const urgency = Math.max(0, Math.min(1, a.timeLeftMs / (12 * 3600000)));
            return (
              <Grid item xs={6} sm={4} md={3} key={a.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: a.isHighestBidder ? '2px solid #4caf50' : undefined,
                    position: 'relative',
                  }}
                >
                  {a.isHighestBidder && (
                    <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                      <Tooltip title="Vas ganando esta subasta">
                        <Chip size="small" color="success" icon={<BoltIcon />} label="1º" />
                      </Tooltip>
                    </Box>
                  )}
                  <CardActionArea component={Link} to={`/subasta/${a.id}`} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box className="image-container" sx={{ aspectRatio: '1/1' }}>
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      ) : (
                        <GavelIcon sx={{ fontSize: 48, color: '#ccc' }} />
                      )}
                    </Box>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {a.title}
                      </Typography>
                      <Typography variant="body1" className="price-color" fontWeight={700}>
                        {money(a.currentPrice)}
                      </Typography>
                      <Box my={1} display="flex" alignItems="center" gap={1}>
                        <TimerIcon fontSize="small" color={a.timeLeftMs < 3600000 ? 'error' : 'action'} />
                        <Typography variant="caption" fontWeight={600} color={a.timeLeftMs < 3600000 ? 'error' : 'text.primary'}>
                          {formatTimeLeft(a.timeLeftMs)}
                        </Typography>
                      </Box>
                      {interactive && (
                        <>
                          <LinearProgress variant="determinate" value={urgency * 100} color={urgency < 0.25 ? 'error' : 'warning'} sx={{ mb: 1, height: 6, borderRadius: 3 }} />
                          <Chip label={lvl.label} size="small" color={lvl.color} />
                        </>
                      )}
                      {!interactive && a.isSold && a.winner && (
                        <Chip label={`Ganó: ${a.winner.firstName}`} size="small" color="success" />
                      )}
                      {!interactive && !a.isSold && (
                        <Chip label={formatTimeLeft(a.timeLeftMs)} size="small" color={a.timeLeftMs < 3600000 ? 'error' : 'primary'} />
                      )}
                    </CardContent>
                  </CardActionArea>
                  {interactive && (
                    <Box p={1} pt={0}>
                      <Tooltip title="Quitar del watchlist">
                        <Chip size="small" label="Quitar" onClick={() => removeFromWatch(a.id)} variant="outlined" />
                      </Tooltip>
                    </Box>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;

  const totalActive = active.filter((a) => !a.isSold && !a.isExpired).length;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <GavelIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Mis subastas
        </Typography>
        {totalActive > 0 && (
          <Chip icon={<LocalFireDepartmentIcon />} color="error" size="small" label={`${totalActive} activas en juego`} sx={{ ml: 1 }} />
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<BoltIcon fontSize="small" />} iconPosition="start" label={`⚡ Activas (${totalActive})`} />
        <Tab icon={<BookmarkIcon fontSize="small" />} iconPosition="start" label={`Seguidas (${watchlist.length})`} />
        <Tab icon={<EmojiEventsIcon fontSize="small" />} iconPosition="start" label={`Ganadas (${won.length})`} />
      </Tabs>

      {tab === 0 &&
        renderGrid(
          active,
          'No estás pujando en ninguna subasta activa. Explorá las subastas y participá: la adrenalina de ganar con una buena oferta te espera. ⚡',
          true
        )}
      {tab === 1 && renderGrid(watchlist, 'No seguís ninguna subasta. Usá el ícono de marcador en una subasta para seguirla.')}
      {tab === 2 && (
        <>
          {won.some((a) => a.orderId && !a.isPaid) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              ¡Felicidades! Ganaste una o más subastas. <b>Tenés 48 horas para pagar</b> antes de que vuelvan a
              subasta. Tocá "Pagar" en cada tarjeta.
            </Alert>
          )}
          <Grid container spacing={2}>
            {won.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">Aún no ganaste ninguna subasta.</Typography>
                </Paper>
              </Grid>
            ) : (
              won.map((a) => {
                const needsPayment = Boolean(a.orderId) && !a.isPaid;
                const deadline = a.paymentDeadline ? new Date(a.paymentDeadline).getTime() - now : 0;
                const deadlineHours = Math.max(0, Math.floor(deadline / 3600000));
                return (
                  <Grid item xs={12} sm={6} md={4} key={a.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: needsPayment ? '2px solid #ff9800' : '2px solid #4caf50' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight={700}>
                          {a.title}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                          Ganada por{' '}
                          <b>
                            {Number(a.currentPrice).toLocaleString('es-BO', { maximumFractionDigits: 0 })} Bs
                          </b>
                        </Typography>
                        {needsPayment ? (
                          <>
                            <Chip label="⏳ Pendiente de pago" color="warning" size="small" sx={{ mb: 1 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              ⏱️ Te quedan <b>{deadlineHours}h</b> para pagar
                            </Typography>
                          </>
                        ) : (
                          <Chip label="Pagada" color="success" size="small" />
                        )}
                      </CardContent>
                      {needsPayment && (
                        <CardActions>
                          <PrimaryButton color="warning" fullWidth to={`/cuenta/pedidos/${a.orderId}`}>
                            Pagar ahora
                          </PrimaryButton>
                        </CardActions>
                      )}
                    </Card>
                  </Grid>
                );
              })
            )}
          </Grid>
        </>
      )}
    </Container>
  );
}
