'use client';

import { useEffect, useState } from 'react';
import { Grid, Box, Tabs, Tab, CircularProgress, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useSession } from 'next-auth/react';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import WeeklyScheduleTable from './components/dashboard/WeeklyScheduleTable';
import HourlyStaffingTable from './components/dashboard/HourlyStaffingTable';
import { useProtectedSession } from './hooks/useProtectedSession';
import { useSelectedCorp } from './hooks/useSelectedCorp';
import dayjs from 'dayjs';
import '@/constants/dateConfig';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { useSearchParams, useRouter, usePathname } from "next/navigation";

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
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
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
  const { selectedCorp, setSelectedCorp, availableCorps, selectedCorpData, loading: corpLoading, isAdmin } = useSelectedCorp();

  const [data, setData] = useState<{
    weekTitle: string;
    weekRange: string;
    dates: string[];
    scheduleData: any[];
  } | null>(null);

  const [weekStart, setWeekStart] = useState<Date>(dayjs().startOf('week').toDate());

  const [tabValue, setTabValue] = useState(0);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const fetchData = async () => {
    if (!selectedCorp) return;
    const queryParams = new URLSearchParams({
      mode: 'dashboard',
      weekStart: dayjs(weekStart).format('YYYY-MM-DD'),
      corp: selectedCorp,
    });

    const res = await fetch(`/api/schedules?${queryParams.toString()}`, {
      cache: 'no-store',
    });

    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    if (selectedCorp) fetchData();
  }, [weekStart, selectedCorp]);

  const handleWeekChange = (dir: 'prev' | 'next') => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + (dir === 'next' ? 7 : -7));
    setWeekStart(newStart);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // 탭 이동 시 URL도 업데이트
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newValue === 0 ? "weekly" : "hourly");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // URL 쿼리(view)가 변경되면 자동으로 탭 전환
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "hourly") {
      setTabValue(1);
    } else {
      setTabValue(0);
    }
  }, [searchParams]);

  if (corpLoading || !data) return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={2}>
      <CircularProgress size={48} />
      <Typography variant="body2" color="text.secondary">Loading dashboard...</Typography>
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <PageContainer title="Dashboard" description="this is Dashboard">
        <Box>

          {/* Corporation 선택 + 탭 영역 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            {isAdmin && availableCorps.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Corporation</InputLabel>
                <Select
                  value={selectedCorp}
                  label="Corporation"
                  onChange={(e) => setSelectedCorp(e.target.value)}
                >
                  {availableCorps.map((corp) => (
                    <MenuItem key={corp._id} value={corp.name}>
                      {corp.name}{corp.description ? ` (${corp.description})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {(!isAdmin || availableCorps.length <= 1) && selectedCorp && (
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedCorp}
              </Typography>
            )}
          </Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
              <Tab label="📅 Weekly Schedule" {...a11yProps(0)} />
              <Tab label="👥 Hourly Staffing" {...a11yProps(1)} />
            </Tabs>
          </Box>

          {/* Weekly */}
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

          {/* Hourly */}
          <TabPanel value={tabValue} index={1}>
            <HourlyStaffingTable
              initialDate={ new Date(searchParams.get("date") ?? new Date()) }
              selectedCorp={selectedCorp}
            />
          </TabPanel>

        </Box>
      </PageContainer>
    </LocalizationProvider>
  );
}
