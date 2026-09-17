import { Box, Grid, Card, CardContent, Typography, Tabs, Tab, TextField, MenuItem, Stack } from '@mui/material';
import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { AppTable } from '@/components/common/AppTable';
import { palette } from '@/theme';
import { useTheme } from '@mui/material/styles';

const dailyData = [
  { hour: '06:00', violations: 0 },
  { hour: '08:00', violations: 2 },
  { hour: '10:00', violations: 1 },
  { hour: '12:00', violations: 3 },
  { hour: '14:00', violations: 1 },
  { hour: '16:00', violations: 4 },
  { hour: '18:00', violations: 0 },
];

const healthData = [
  { name: 'Normal', value: 12, color: palette.sage },
  { name: 'Warning', value: 3, color: palette.main },
  { name: 'Violation', value: 2, color: '#d32f2f' },
  { name: 'Offline', value: 1, color: '#9e9e9e' },
];

const reportRows = [
  { id: 1, report: 'Daily Safety Summary', period: '2026-06-10', violations: 5, devices: 18 },
  { id: 2, report: 'Weekly Compliance', period: 'Week 23', violations: 28, devices: 18 },
  { id: 3, report: 'Monthly Performance', period: 'June 2026', violations: 112, devices: 18 },
];

const tabs = ['Daily', 'Weekly', 'Monthly', 'Device Health', 'Violations'];

export const ReportsPage = () => {
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const axisColor = theme.palette.text.secondary;
  const gridColor = theme.palette.divider;

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Safety and device health reporting"
      />

      <Card sx={{ mb: 3, p: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
        >
          <TextField size="small" label="Start date" type="date" InputLabelProps={{ shrink: true }} fullWidth />
          <TextField size="small" label="End date" type="date" InputLabelProps={{ shrink: true }} fullWidth />
          <TextField size="small" select label="Location" defaultValue="" fullWidth>
            <MenuItem value="">All locations</MenuItem>
          </TextField>
          <TextField size="small" select label="Work Area" defaultValue="" fullWidth>
            <MenuItem value="">All work areas</MenuItem>
          </TextField>
          <TextField size="small" select label="Device" defaultValue="" fullWidth>
            <MenuItem value="">All devices</MenuItem>
          </TextField>
          <TextField size="small" select label="Violation" defaultValue="" fullWidth>
            <MenuItem value="">All types</MenuItem>
          </TextField>
        </Stack>
      </Card>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {tabs.map((t) => <Tab key={t} label={t} />)}
      </Tabs>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {tabs[tab]} Report Chart
              </Typography>
              <Box height={{ xs: 240, md: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {tab === 3 ? (
                    <PieChart>
                      <Pie data={healthData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {healthData.map((e) => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  ) : tab === 0 ? (
                    <BarChart data={dailyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="hour" tick={{ fill: axisColor, fontSize: 11 }} />
                      <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="violations" fill={palette.main} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={dailyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="hour" tick={{ fill: axisColor, fontSize: 11 }} />
                      <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="violations" stroke={palette.sage} strokeWidth={2} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Summary</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Reports will connect to backend analytics APIs. Current data is for UI preview.
              </Typography>
              <Typography variant="body2"><strong>Total Devices:</strong> 18</Typography>
              <Typography variant="body2"><strong>Avg Uptime:</strong> 97.2%</Typography>
              <Typography variant="body2"><strong>Violations (30d):</strong> 112</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <AppTable
        columns={[
          { id: 'report', label: 'Report Name', mobilePrimary: true },
          { id: 'period', label: 'Period' },
          { id: 'violations', label: 'Violations' },
          { id: 'devices', label: 'Devices' },
        ]}
        rows={reportRows}
        total={reportRows.length}
        page={0}
        pageSize={10}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        getRowId={(r) => r.id}
      />
    </Box>
  );
};
