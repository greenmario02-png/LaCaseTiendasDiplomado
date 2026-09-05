import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  InputBase,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ChatIcon from '@mui/icons-material/Chat';
import GavelIcon from '@mui/icons-material/Gavel';
import ForumIcon from '@mui/icons-material/Forum';
import { styled, alpha } from '@mui/material/styles';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useCartStore } from '../../stores/cartStore';
import { useCurrencyStore } from '../../stores/currencyStore';
import { api } from '../../services/api';
import NotificationBell from './NotificationBell';
import CurrencyRates from '../ui/CurrencyRates';

const SearchBox = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': { backgroundColor: alpha(theme.palette.common.white, 0.25) },
  width: '100%',
  maxWidth: 500,
  [theme.breakpoints.down('sm')]: { maxWidth: 'none' },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    width: '100%',
  },
}));

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const darkMode = useThemeStore((s) => s.darkMode);
  const toggle = useThemeStore((s) => s.toggle);
  const cart = useCartStore((s) => s.cart);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const currencies = useCurrencyStore((s) => s.currencies);
  const selectedCurrency = useCurrencyStore((s) => s.selected);
  const setCurrency = useCurrencyStore((s) => s.setSelected);

  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  useEffect(() => {
    setMounted(true);
    fetchCart().catch(() => {});
    if (user) {
      api.get('/chat/unread').then((res) => setUnreadChat(res.data.data.count)).catch(() => {});
    }
  }, [fetchCart, user]);

  useEffect(() => {
    setMounted(false);
    setSearch('');
  }, [location.pathname]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (search.trim()) {
        // Registrar búsqueda para recomendaciones
        api.post('/tracking/search', { term: search.trim() }).catch(() => {});
        navigate(`/productos?search=${encodeURIComponent(search.trim())}`);
      }
    },
    [navigate, search]
  );

  const handleMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const itemCount = mounted ? cart?.itemCount ?? 0 : 0;

  return (
    <AppBar position="sticky" color="primary">
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 0.5 }}>
        <Box component={Link} to="/" display="flex" alignItems="center" sx={{ textDecoration: 'none', color: 'inherit', mr: 1 }}>
          <StorefrontIcon sx={{ mr: 0.5 }} />
          <Box sx={{ fontWeight: 800, fontSize: '1.2rem' }}>LaCase Multi Tiendas</Box>
        </Box>

        <Box component="form" onSubmit={handleSearch} sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <SearchBox>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Buscar productos, marcas, vendedores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </SearchBox>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CurrencyRates />
          {currencies.length > 0 && (
            <select
              value={selectedCurrency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'transparent',
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
              aria-label="Seleccionar moneda"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code} style={{ color: '#000' }}>
                  {c.symbol}
                </option>
              ))}
            </select>
          )}
          <Tooltip title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
            <IconButton color="inherit" onClick={toggle}>
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Foro LaCASE">
            <IconButton color="inherit" onClick={() => navigate('/foro')}>
              <ForumIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Eventos 🎟️">
            <IconButton color="inherit" onClick={() => navigate('/eventos')}>
              <span style={{ fontSize: 20 }}>🎟️</span>
            </IconButton>
          </Tooltip>

          <Tooltip title="Carrito">
            <IconButton color="inherit" onClick={() => navigate('/carrito')}>
              <Badge badgeContent={itemCount} color="secondary">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {user && (
            <>
              <NotificationBell />
              <Tooltip title="Mensajes">
                <IconButton color="inherit" onClick={() => navigate('/mensajes')}>
                  <Badge badgeContent={unreadChat} color="error">
                    <ChatIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Mis subastas">
                <IconButton color="inherit" onClick={() => navigate('/subastas/mis')}>
                  <Badge color="secondary">
                    <GavelIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
            </>
          )}

          {user ? (
            <>
              <IconButton color="inherit" onClick={handleMenu} sx={{ p: 0.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {user.firstName?.[0] ?? user.email[0].toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                <MenuItem onClick={() => { handleClose(); navigate('/cuenta'); }}>
                  <AccountCircleIcon sx={{ mr: 1 }} /> Mi cuenta
                </MenuItem>
                {(user.role === 'SELLER' || user.role === 'ADMIN') && (
                  <MenuItem onClick={() => { handleClose(); navigate('/seller'); }}>
                    <StorefrontIcon sx={{ mr: 1 }} /> Mi tienda
                  </MenuItem>
                )}
                {user.role === 'ADMIN' && (
                  <MenuItem onClick={() => { handleClose(); navigate('/admin'); }}>
                    <AdminPanelSettingsIcon sx={{ mr: 1 }} /> Panel admin
                  </MenuItem>
                )}
                <Divider />
                <MenuItem
                  onClick={() => {
                    handleClose();
                    logout();
                    navigate('/');
                  }}
                >
                  Cerrar sesión
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <IconButton color="inherit" onClick={() => navigate('/login')}>
                <AccountCircleIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
