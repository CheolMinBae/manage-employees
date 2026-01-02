import React from 'react';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Autocomplete,
  Chip,
} from '@mui/material';
import { FilterType } from '../../../hooks/useWeeklyScheduleFilter';

interface FilterProps {
  // States
  filterType: FilterType;
  keyword: string;
  selectedNames: string[];
  selectedPositions: string[];
  
  // Data
  uniqueNames: string[];
  uniquePositions: string[];
  
  // Handlers
  onFilterTypeChange: (type: FilterType) => void;
  onKeywordChange: (keyword: string) => void;
  onSelectedNamesChange: (names: string[]) => void;
  onSelectedPositionsChange: (positions: string[]) => void;
  onSearch: () => void;
  onClear: () => void;
  onKeywordKeyDown: (e: React.KeyboardEvent) => void;
}

export default function Filter({
  filterType,
  keyword,
  selectedNames,
  selectedPositions,
  uniqueNames,
  uniquePositions,
  onFilterTypeChange,
  onKeywordChange,
  onSelectedNamesChange,
  onSelectedPositionsChange,
  onSearch,
  onClear,
  onKeywordKeyDown,
}: FilterProps) {
  return (
    <Grid container spacing={2} alignItems="center" mb={3}>
      <Grid item xs={12} md={2}>
        <FormControl fullWidth>
          <InputLabel>Filter by</InputLabel>
          <Select
            label="Filter by"
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value as FilterType)}
          >
            <MenuItem value="name" data-testid="name-filter">Name</MenuItem>
            <MenuItem value="corp" data-testid="corp-filter">Corp</MenuItem>
            <MenuItem value="category" data-testid="category-filter">Category</MenuItem>
            <MenuItem value="eid" data-testid="eid-filter">EID</MenuItem>
            <MenuItem value="position" data-testid="position-filter">Position</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={6}>
        {filterType === 'name' ? (
          <Autocomplete
            multiple
            options={uniqueNames}
            value={selectedNames}
            onChange={(event, newValue) => onSelectedNamesChange(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  size="small"
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Names"
                placeholder="Choose employees..."
              />
            )}
            sx={{ width: '100%' }}
          />
        ) : filterType === 'position' ? (
          <Autocomplete
            multiple
            options={uniquePositions}
            value={selectedPositions}
            onChange={(event, newValue) => onSelectedPositionsChange(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  size="small"
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Positions"
                placeholder="Choose positions..."
              />
            )}
            sx={{ width: '100%' }}
          />
        ) : (
          <TextField
            fullWidth
            label="Keyword"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onKeyDown={onKeywordKeyDown}
            data-testid="keyword-filter"
          />
        )}
      </Grid>
      
      <Grid item xs={12} md={1}>
        <Button 
          fullWidth 
          variant="contained" 
          onClick={onSearch}
        >
          Search
        </Button>
      </Grid>
      
      <Grid item xs={12} md={1}>
        <Button 
          fullWidth 
          variant="outlined" 
          onClick={onClear}
          data-testid="clear-filter-button"
        >
          Clear
        </Button>
      </Grid>
    </Grid>
  );
} 