'use client';

import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Popper,
  Paper,
  ClickAwayListener,
  TextField,
} from '@mui/material';
import { DateRange } from 'react-date-range';
import dayjs from 'dayjs';
import { useState, useRef } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface Props {
  users: string[];
  selectedUsers: string;
  setSelectedUsers: (val: string) => void;
  dateRange: Array<{ startDate: Date; endDate: Date; key: string }>;
  setDateRange: (val: Array<{ startDate: Date; endDate: Date; key: string }>) => void;
  selectedStatuses: string[];
  setSelectedStatuses: (val: string[]) => void;
}

const FilterControls = ({
  users,
  selectedUsers,
  setSelectedUsers,
  dateRange,
  setDateRange,
  selectedStatuses,
  setSelectedStatuses,
}: Props) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const popperOpen = Boolean(anchorEl);
  const ref = useRef<HTMLDivElement>(null);

  const handleToggle = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(popperOpen ? null : event.currentTarget);
  };

  const handleClickAway = () => {
    setAnchorEl(null);
  };

  const selectedStart = dateRange[0].startDate;
  const selectedEnd = dateRange[0].endDate;
  const formattedRange = `${dayjs(selectedStart).format('MMM D')} – ${dayjs(selectedEnd).format('MMM D')}`;

  return (
    <Grid container spacing={2} mb={3}>
      {/* 사용자 선택 */}
      <Grid item xs={12} sm={4}>
        <Box display="flex" flexDirection="column" height="100%">
          <Typography variant="caption" fontWeight="bold" mb={0.5}>
            👤 User
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search user name..."
            value={selectedUsers}
            onChange={(e) => setSelectedUsers(e.target.value)}
            variant="outlined"
          />
        </Box>
      </Grid>

      {/* 상태 선택 */}
      <Grid item xs={12} sm={4}>
        <Box display="flex" flexDirection="column" height="100%">
          <Typography variant="caption" fontWeight="bold" mb={0.5}>
            ✅ Status
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              multiple
              value={selectedStatuses}
              onChange={(e) => setSelectedStatuses(e.target.value as string[])}
              input={<OutlinedInput />}
              renderValue={(selected) => selected.join(', ')}
            >
              {['Approved', 'Pending'].map((status) => (
                <MenuItem key={status} value={status}>
                  <Checkbox checked={selectedStatuses.indexOf(status) > -1} />
                  <ListItemText primary={status} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Grid>

      {/* 날짜 필터 */}
      <Grid item xs={12} sm={4}>
        <Box display="flex" flexDirection="column" height="100%">
          <Typography variant="caption" fontWeight="bold" mb={0.5}>
            📅 Filter by Date Range
          </Typography>

          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            border="1px solid #ccc"
            borderRadius={1}
            p={1.5}
            onClick={handleToggle}
            ref={ref}
            sx={{ cursor: 'pointer', height: '40px' }}
          >
            <Typography variant="body2" color="text.secondary">
              {formattedRange}
            </Typography>
            <IconButton size="small" sx={{ p: 0 }}>
              {popperOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Popper */}
        <Popper open={popperOpen} anchorEl={ref.current} placement="bottom-start" sx={{ zIndex: 1300 }}>
          <ClickAwayListener onClickAway={handleClickAway}>
            <Paper sx={{ mt: 1 }}>
              <DateRange
                editableDateInputs
                onChange={(item) => {
                  const selection = item.selection;
                  if (selection.startDate && selection.endDate) {
                    setDateRange([
                      {
                        startDate: selection.startDate,
                        endDate: selection.endDate,
                        key: selection.key || 'selection',
                      },
                    ]);
                  }
                }}
                moveRangeOnFirstSelection={false}
                ranges={dateRange}
                rangeColors={['#1976d2']}
              />
            </Paper>
          </ClickAwayListener>
        </Popper>
      </Grid>
    </Grid>
  );
};

export default FilterControls;
