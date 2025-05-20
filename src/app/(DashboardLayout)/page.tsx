'use client';

import { useEffect, useState } from 'react';
import { Grid, Box } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import WeeklyScheduleTable from './components/dashboard/WeeklyScheduleTable';
import { useProtectedSession } from './hooks/useProtectedSession';
import { startOfWeek, format } from 'date-fns';

export default function Dashboard() {
  useProtectedSession();

  const [data, setData] = useState<{
    weekTitle: string;
    weekRange: string;
    dates: string[];
    scheduleData: any[];
  } | null>(null);

  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));

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

  if (!data) return <div>Loading...</div>;

  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <Box>
        <Grid container spacing={1}>
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
  );
}
