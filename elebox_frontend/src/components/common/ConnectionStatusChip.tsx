import { Chip, keyframes } from '@mui/material';
import type { WebSocketConnectionStatus } from '@/services/websocketService';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
`;

interface ConnectionStatusChipProps {
  status: WebSocketConnectionStatus | string;
}

const STATUS_COPY: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  connected: { label: 'Connected', color: 'success' },
  connecting: { label: 'Connecting', color: 'warning' },
  disconnected: { label: 'Disconnected', color: 'error' },
  error: { label: 'Disconnected', color: 'error' },
};

export const ConnectionStatusChip = ({ status }: ConnectionStatusChipProps) => {
  const config = STATUS_COPY[status] ?? { label: String(status), color: 'default' as const };
  const connecting = status === 'connecting';

  return (
    <Chip
      size="small"
      color={config.color === 'default' ? 'default' : config.color}
      variant="outlined"
      label={`WebSocket: ${config.label}`}
      sx={{
        height: 24,
        fontWeight: 700,
        fontSize: '0.7rem',
        animation: connecting ? `${pulse} 1.2s ease-in-out infinite` : 'none',
      }}
    />
  );
};
