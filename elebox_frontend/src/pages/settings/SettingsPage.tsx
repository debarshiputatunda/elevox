import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import { PageHeader } from '@/components/common/PageHeader';
import { useThemeMode } from '@/context/ThemeContext';
import { useIsMobile } from '@/hooks/useResponsive';

const sections = ['Application', 'Notifications', 'Theme', 'Account', 'Security'] as const;

export const SettingsPage = () => {
  const { mode, toggleTheme } = useThemeMode();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState(0);

  const appearance = (
    <Stack spacing={2}>
      <Typography variant="h6">Theme</Typography>
      <FormControlLabel
        control={<Switch checked={mode === 'dark'} onChange={toggleTheme} />}
        label={mode === 'dark' ? 'Dark mode' : 'Light mode'}
      />
      <Typography variant="body2" color="text.secondary">
        Light mode uses cream, white, orange, and sage. Dark mode uses navy, blue, orange, and green.
      </Typography>
    </Stack>
  );

  const application = (
    <Stack spacing={2}>
      <Typography variant="h6">Application</Typography>
      <TextField
        fullWidth
        label="API Base URL"
        defaultValue={import.meta.env.VITE_API_BASE_URL}
        disabled
      />
      <TextField
        fullWidth
        label="Telemetry Refresh Interval (seconds)"
        defaultValue="10"
        type="number"
      />
      <Button variant="contained" disabled>
        Save Changes
      </Button>
      <Typography variant="caption" color="text.secondary">
        Settings persistence requires the backend configuration API.
      </Typography>
    </Stack>
  );

  const notifications = (
    <Stack spacing={2}>
      <Typography variant="h6">Notifications</Typography>
      <FormControlLabel control={<Switch defaultChecked />} label="Load exceeded alerts" />
      <FormControlLabel control={<Switch defaultChecked />} label="Open buckle alerts" />
      <FormControlLabel control={<Switch defaultChecked />} label="Low battery warnings" />
      <FormControlLabel control={<Switch />} label="Email digest" />
    </Stack>
  );

  const account = (
    <Stack spacing={2}>
      <Typography variant="h6">Account preferences</Typography>
      <TextField fullWidth label="Display name format" defaultValue="Full name" disabled />
      <TextField fullWidth select label="Landing page" defaultValue="role" SelectProps={{ native: true }}>
        <option value="role">Role default</option>
        <option value="dashboard">Dashboard</option>
        <option value="monitoring">Monitoring</option>
      </TextField>
    </Stack>
  );

  const security = (
    <Stack spacing={2}>
      <Typography variant="h6">Security</Typography>
      <FormControlLabel control={<Switch defaultChecked />} label="Require password on sensitive actions" />
      <Typography variant="body2" color="text.secondary">
        Session tokens are stored securely in the browser. Sign out from any shared workstation.
      </Typography>
    </Stack>
  );

  const panels = [application, notifications, appearance, account, security];

  return (
    <Box>
      <PageHeader title="Settings" subtitle="System configuration and preferences" />
      {isMobile ? (
        <Stack spacing={2}>
          {panels.map((panel, index) => (
            <Card key={sections[index]}>
              <CardContent>{panel}</CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
          >
            {sections.map((section) => (
              <Tab key={section} label={section} />
            ))}
          </Tabs>
          <CardContent>{panels[tab]}</CardContent>
        </Card>
      )}
    </Box>
  );
};
