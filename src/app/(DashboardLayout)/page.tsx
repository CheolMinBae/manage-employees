'use client';

import { useEffect, useState } from 'react';
import { Grid, Box, Tabs, Tab } from '@mui/material';
import { useSession } from 'next-auth/react';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import WeeklyScheduleTable from './components/dashboard/WeeklyScheduleTable';
import HourlyStaffingTable from './components/dashboard/HourlyStaffingTable';
import { useProtectedSession } from './hooks/useProtectedSession';
import { startOfWeek, format } from 'date-fns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { WEEK_OPTIONS } from '@/constants/dateConfig';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

export default function Dashboard() {
  useProtectedSession();
  const { data: session } = useSession();

  const [data, setData] = useState<{
    weekTitle: string;
    weekRange: string;
    dates: string[];
    scheduleData: any[];
  } | null>(null);

  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), WEEK_OPTIONS));
  const [tabValue, setTabValue] = useState(0);

  const fetchData = async () => {
    const queryParams = new URLSearchParams({
      mode: 'dashboard',
      weekStart: format(weekStart, 'yyyy-MM-dd'),
    });

    const res = await fetch(`/api/schedules?${queryParams.toString()}`, {
      cache: 'no-store',
    });

    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    fetchData();
  }, [weekStart]);

  const handleWeekChange = (dir: 'prev' | 'next') => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + (dir === 'next' ? 7 : -7));
    setWeekStart(newStart);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const userPosition = session?.user?.position;
  const isAdmin = userPosition === 'admin';

  if (!data) return <div>Loading...</div>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <PageContainer title="Dashboard" description="this is Dashboard">
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
              <Tab label="📅 Weekly Schedule" {...a11yProps(0)} />
              {isAdmin && <Tab label="👥 Hourly Staffing" {...a11yProps(1)} />}
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={12}>
                <WeeklyScheduleTable
                  dates={data.dates}
                  scheduleData={data.scheduleData}
                  weekStart={weekStart}
                  onWeekChange={handleWeekChange}
                  weekRange={data.weekRange}
                  onRefresh={fetchData}
                />
              </Grid>
            </Grid>
          </TabPanel>
          
          {isAdmin && (
            <TabPanel value={tabValue} index={1}>
              <HourlyStaffingTable initialDate={new Date()} />
            </TabPanel>
          )}
        </Box>
      </PageContainer>
    </LocalizationProvider>
  );
}
