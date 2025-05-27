'use client';

import { useEffect, useState } from 'react';
import { Grid, Box, Divider } from '@mui/material';
import { useSession } from 'next-auth/react';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import WeeklyScheduleTable from './components/dashboard/WeeklyScheduleTable';
import HourlyStaffingTable from './components/dashboard/HourlyStaffingTable';
import { useProtectedSession } from './hooks/useProtectedSession';
import { startOfWeek, format } from 'date-fns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { WEEK_OPTIONS } from '@/constants/dateConfig';

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

  const userPosition = session?.user?.position;
  const isAdmin = userPosition === 'admin';

  if (!data) return <div>Loading...</div>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <PageContainer title="Dashboard" description="this is Dashboard">
        <Box>
          {isAdmin && (
            <Box sx={{ mb: '50px' }}>
              <HourlyStaffingTable initialDate={new Date()} />
            </Box>
          )}
          
          {isAdmin && (
            <Divider sx={{ mb: '50px' }} />
          )}
          
          <Grid container spacing={3}>
            <Grid item xs={12} lg={12}>
              <WeeklyScheduleTable
                dates={data.dates}
                scheduleData={data.scheduleData}
                weekStart={weekStart}
                onWeekChange={handleWeekChange}
                weekRange={data.weekRange}
              />
            </Grid>
          </Grid>
        </Box>
      </PageContainer>
    </LocalizationProvider>
  );
}
