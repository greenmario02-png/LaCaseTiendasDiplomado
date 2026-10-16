import { Box } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import type { MsgStatus } from '../../lib/chat/chatModel';
import { useC } from '../../lib/chat/i18n';

/** Estado de un mensaje propio con iconos (no emoji): reloj, ✓, ✓✓ y ✓✓ de color al leerse. Accesible por aria-label. */
export default function MessageTicks({ status, readColor }: { status: MsgStatus; readColor: string }) {
  const c = useC();
  const label = c(`status.${status}`);
  const sx = { fontSize: 15, verticalAlign: 'middle' } as const;
  return (
    <Box component="span" role="img" aria-label={label} title={label} data-status={status} sx={{ ml: 0.5, display: 'inline-flex', alignItems: 'center' }}>
      {status === 'pending' && <ScheduleIcon sx={sx} />}
      {status === 'failed' && <ErrorOutlineIcon sx={{ ...sx, color: 'error.light' }} />}
      {status === 'sent' && <DoneIcon sx={sx} />}
      {status === 'delivered' && <DoneAllIcon sx={sx} />}
      {status === 'read' && <DoneAllIcon sx={{ ...sx, color: readColor }} />}
    </Box>
  );
}
