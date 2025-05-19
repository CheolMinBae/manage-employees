'use client';

import { Grid, Box } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import WeeklyScheduleTable from './components/dashboard/WeeklyScheduleTable';
import { useProtectedSession } from './hooks/useProtectedSession';

const Dashboard = () => {
  useProtectedSession();

  const scheduleData = [
    {
      name: 'IRON',
      position: 'Barista',
      corp: 'SWC',
      eid: 2,
      category: 'FOH',
      shifts: [
        {
          date: '2025-05-11',
          slots: [
            { start: '06:00', end: '09:00' },
            { start: '14:00', end: '18:00' },
            { start: '23:00', end: '02:00' },
          ],
        },
        { date: '2025-05-12', slots: [{ start: '05:00', end: '10:00' }] },
        { date: '2025-05-13', slots: [{ start: '10:00', end: '14:00' }] },
        { date: '2025-05-14', slots: [] },
        { date: '2025-05-15', slots: [{ start: '15:00', end: '21:00' }] },
        { date: '2025-05-16', slots: [{ start: '10:00', end: '15:00' }] },
        { date: '2025-05-17', slots: [{ start: '14:00', end: '18:00' }] },
      ],
    },
    {
      name: 'GRACE',
      position: 'Barista',
      corp: 'SWC',
      eid: 3,
      category: 'FOH',
      shifts: [
        {
          date: '2025-05-11',
          slots: [
            { start: '09:00', end: '13:00' },
            { start: '20:00', end: '01:00' },
          ],
        },
        { date: '2025-05-12', slots: [] },
        { date: '2025-05-13', slots: [{ start: '16:30', end: '21:00' }] },
        { date: '2025-05-14', slots: [{ start: '16:30', end: '21:00' }] },
        { date: '2025-05-15', slots: [] },
        { date: '2025-05-16', slots: [{ start: '10:00', end: '15:00' }] },
        { date: '2025-05-17', slots: [{ start: '14:00', end: '18:00' }] },
      ],
    },
  ];

  const dates = [
    '2025-05-11',
    '2025-05-12',
    '2025-05-13',
    '2025-05-14',
    '2025-05-15',
    '2025-05-16',
    '2025-05-17',
  ];

  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <Box>
        <Grid container spacing={1}>
          <Grid item xs={12} lg={12}>
            <WeeklyScheduleTable
              weekTitle="Week 3 of May"
              weekRange="May 11 – May 17"
              dates={dates}
              scheduleData={scheduleData}
            />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Dashboard;
