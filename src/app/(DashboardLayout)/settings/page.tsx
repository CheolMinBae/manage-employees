'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import EmployeeManagement from './components/EmployeeManagement';
import CorporationManagement from './components/CorporationManagement';
import UserRoleManagement from './components/UserRoleManagement';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export default function SettingsPage() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box p={4}>
      <Typography variant="h4" mb={4}>⚙️ Settings</Typography>
      
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange} aria-label="settings tabs">
            <Tab label="Employee Management" {...a11yProps(0)} />
            <Tab label="Corporation Management" {...a11yProps(1)} />
            <Tab label="User Role Management" {...a11yProps(2)} />
          </Tabs>
        </Box>
        
        <TabPanel value={value} index={0}>
          <EmployeeManagement />
        </TabPanel>
        
        <TabPanel value={value} index={1}>
          <CorporationManagement />
        </TabPanel>
        
        <TabPanel value={value} index={2}>
          <UserRoleManagement />
        </TabPanel>
      </Paper>
    </Box>
  );
} 