import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  MenuItem,
  Autocomplete,
  Tooltip,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { api, getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

interface TeamMember {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  storeRole: 'ADMIN' | 'EMPLOYEE';
  storeOwnerId: number | null;
  isActive: boolean;
  createdAt: string;
}

interface UserOption {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export default function SellerTeam() {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.storeRole === 'OWNER';
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<UserOption[]>([]);
  const [selected, setSelected] = useState<UserOption | null>(null);
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [searching, setSearching] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/seller/team')
      .then((r) => setMembers(r.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Búsqueda de usuarios con debounce para el autocompletado
  useEffect(() => {
    if (!open || search.trim().length < 2) {
      setOptions([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      api
        .get('/seller/team/users/search', { params: { q: search } })
        .then((r) => setOptions(r.data.data))
        .catch(() => setOptions([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, open]);

  const invite = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.post('/seller/team/invite', { email: selected.email, role });
      toast.success('Empleado invitado');
      setOpen(false);
      setSelected(null);
      setSearch('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (m: TeamMember, newRole: string) => {
    try {
      await api.put(`/seller/team/${m.id}/role`, { role: newRole });
      toast.success('Rol actualizado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (m: TeamMember) => {
    try {
      await api.delete(`/seller/team/${m.id}`);
      toast.success('Empleado removido del equipo');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <GroupIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Equipo de mi tienda
          </Typography>
        </Box>
        <PrimaryButton startIcon={<PersonAddIcon />} onClick={() => setOpen(true)}>
          Invitar empleado
        </PrimaryButton>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Invitá a personas de confianza para que te ayuden a gestionar la tienda. Los administradores gestionan todo; los empleados
        solo pueden subir productos y ver pedidos (sin precios ni cobros).
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Miembro</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {user && (
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>
                  {`${user.firstName} ${user.lastName}`}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip size="small" color="primary" label="Dueño" />
                </TableCell>
                <TableCell align="right">—</TableCell>
              </TableRow>
            )}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Todavía no tenés empleados. Invitá a alguien para que te ayude a gestionar la tienda.
                </TableCell>
              </TableRow>
            )}
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell sx={{ fontWeight: 600 }}>{`${m.firstName} ${m.lastName}`}</TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={m.storeRole}
                    disabled={!isOwner}
                    onChange={(e) => changeRole(m, e.target.value)}
                    sx={{ minWidth: 170 }}
                  >
                    <MenuItem value="ADMIN">Administrador</MenuItem>
                    <MenuItem value="EMPLOYEE">Empleado</MenuItem>
                  </TextField>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={isOwner ? 'Quitar del equipo' : 'Solo el dueño puede quitar empleados'}>
                    <span>
                      <IconButton size="small" color="error" disabled={!isOwner} onClick={() => remove(m)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invitar empleado</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Autocomplete
              options={options}
              loading={searching}
              getOptionLabel={(o) => `${o.firstName} ${o.lastName} — ${o.email}`}
              inputValue={search}
              onInputChange={(_, v) => setSearch(v)}
              onChange={(_, v) => setSelected(v)}
              filterOptions={(x) => x}
              noOptionsText={search.trim().length < 2 ? 'Escribí al menos 2 letras' : 'Sin resultados'}
              renderInput={(params) => (
                <TextField {...params} label="Buscar usuario por email o nombre" placeholder="juan@mail.com" />
              )}
            />
            <TextField select label="Rol" value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'EMPLOYEE')} fullWidth>
              <MenuItem value="ADMIN">Administrador — gestiona toda la tienda</MenuItem>
              <MenuItem value="EMPLOYEE">Empleado — solo productos y pedidos</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={invite} disabled={saving || !selected}>
            {saving ? <CircularProgress size={18} /> : 'Invitar'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
