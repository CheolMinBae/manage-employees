'use client';

import {
  Box,
  Grid,
  Select,
  MenuItem,
  TextField,
  Button,
  InputLabel,
  FormControl,
} from '@mui/material';

const options = [
  { value: 'name', label: 'Name' },
  { value: 'corp', label: 'Corp' },
  { value: 'category', label: 'Category' },
  { value: 'eid', label: 'EID' },
];

interface Props {
  filters: { type: string; keyword: string };
  setFilters: (val: { type: string; keyword: string }) => void;
  onSearch: () => void;
}

const DashboardFilterControls = ({ filters, setFilters, onSearch }: Props) => {
  return (
    <Box mb={2}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={2}>
          <FormControl fullWidth>
            <InputLabel>Filter Type</InputLabel>
            <Select
              value={filters.type}
              label="Filter Type"
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              {options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Keyword"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button fullWidth variant="contained" onClick={onSearch}>Search</Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardFilterControls;
