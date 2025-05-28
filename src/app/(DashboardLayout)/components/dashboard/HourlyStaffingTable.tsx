'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Paper, Box, Tooltip, Chip, Stack, IconButton
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useEffect, useState } from 'react';
import { format, addDays, subDays } from 'date-fns';

interface Employee {
  name: string;
  position: string;
  shift: string;
}

interface HourlyData {
  hour: number;
  count: number;
  employees: Employee[];
}

interface HourlyStaffingData {
  date: string;
  hourlyData: HourlyData[];
}

interface HourlyStaffingTableProps {
  initialDate?: Date;
}

export default function HourlyStaffingTable({ initialDate = new Date() }: HourlyStaffingTableProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [data, setData] = useState<HourlyStaffingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHourlyData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/schedules/hourly?date=${dateStr}`, {
        cache: 'no-store', // 캐시 무시하여 최신 데이터 가져오기
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching hourly data:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchHourlyData();
  }, [selectedDate]);

  const handleRefresh = () => {
    fetchHourlyData(true);
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'MMM d');
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    setSelectedDate(prevDate => 
      direction === 'prev' ? subDays(prevDate, 1) : addDays(prevDate, 1)
    );
  };

  const renderTooltipContent = (employees: Employee[]) => {
    if (employees.length === 0) {
      return <Typography variant="body2">No employees working</Typography>;
    }

    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Working Staff:
        </Typography>
        <Stack spacing={0.5}>
          {employees.map((emp, idx) => (
            <Box key={idx}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {emp.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {emp.position} • {emp.shift}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  };

  const getCountColor = (count: number) => {
    if (count === 0) return '#9e9e9e';
    if (count <= 2) return '#f44336';
    if (count <= 4) return '#ff9800';
    return '#4caf50';
  };

  if (loading) {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
          <Typography variant="h6">
            ⏰ Hourly Staffing
          </Typography>
          <IconButton 
            size="small" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
          <Typography variant="h6">
            ⏰ Hourly Staffing
          </Typography>
          <IconButton 
            size="small" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography>Unable to load data.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <Typography variant="h6">
          ⏰ Hourly Staffing
        </Typography>
        <Tooltip title="Refresh data">
          <IconButton 
            size="small" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              ...(refreshing && {
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': {
                    transform: 'rotate(0deg)',
                  },
                  '100%': {
                    transform: 'rotate(360deg)',
                  },
                },
              }),
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell colSpan={24} align="center" sx={{ py: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDateChange('prev')}
                    sx={{ p: 0.5 }}
                  >
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6">
                    {formatDateHeader(data.date)}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDateChange('next')}
                    sx={{ p: 0.5 }}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              {data.hourlyData.map((hourData) => (
                <TableCell key={hourData.hour} align="center" sx={{ minWidth: 40, px: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    {formatHour(hourData.hour)}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {data.hourlyData.map((hourData) => (
                <TableCell key={hourData.hour} align="center" sx={{ px: 0.5, py: 1 }}>
                  <Tooltip
                    title={renderTooltipContent(hourData.employees)}
                    placement="top"
                    arrow
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: getCountColor(hourData.count),
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          borderRadius: 1,
                        },
                        px: 0.5,
                        py: 0.25,
                      }}
                    >
                      {hourData.count || ''}
                    </Typography>
                  </Tooltip>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Color Legend:
        </Typography>
        <Chip 
          label="0 staff" 
          size="small" 
          sx={{ backgroundColor: '#9e9e9e', color: 'white', fontSize: '0.7rem' }} 
        />
        <Chip 
          label="1-2 staff" 
          size="small" 
          sx={{ backgroundColor: '#f44336', color: 'white', fontSize: '0.7rem' }} 
        />
        <Chip 
          label="3-4 staff" 
          size="small" 
          sx={{ backgroundColor: '#ff9800', color: 'white', fontSize: '0.7rem' }} 
        />
        <Chip 
          label="5+ staff" 
          size="small" 
          sx={{ backgroundColor: '#4caf50', color: 'white', fontSize: '0.7rem' }} 
        />
      </Box>
    </Box>
  );
} 