'use client';

import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

interface ItemType {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
  isSidebarOpen: boolean;
}

const MSidebar = ({
  isMobileSidebarOpen,
  onSidebarClose,
  isSidebarOpen,
}: ItemType) => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const sidebarWidth = 270;

  const scrollbarStyles = {
    '&::-webkit-scrollbar': {
      width: '7px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#eff2f7',
      borderRadius: '15px',
    },
  };

  const navItems = [
    { title: 'Dashboard', icon: <DashboardOutlinedIcon />, href: '/' },
    { title: 'Schedule', icon: <GroupOutlinedIcon />, href: '/schedule' },
    { title: 'Approve', icon: <GroupOutlinedIcon />, href: '/approve' },
    { title: 'Settings', icon: <SettingsOutlinedIcon />, href: '/settings' },
  ];

  const content = (
    <Box
      sx={{
        height: '100%',
        px: 2,
        py: 3,
        display: 'flex',
        flexDirection: 'column',
        ...scrollbarStyles,
      }}
    >
      <Box sx={{ mb: 4 }}>
        <img src="/images/logos/dark-logo.svg" alt="Logo" width={120} />
      </Box>

      <List>
        {navItems.map((item) => (
          <ListItem button key={item.title} component="a" href={item.href}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.title} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  if (lgUp) {
    return (
      <Box
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
        }}
      >
        <Drawer
          anchor="left"
          open={isSidebarOpen}
          variant="permanent"
          PaperProps={{
            sx: {
              width: sidebarWidth,
              boxSizing: 'border-box',
              borderRight: 'none',
              ...scrollbarStyles,
            },
          }}
        >
          {content}
        </Drawer>
      </Box>
    );
  }

  return (
    <Drawer
      anchor="left"
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant="temporary"
      PaperProps={{
        sx: {
          width: sidebarWidth,
          boxSizing: 'border-box',
          boxShadow: (theme) => theme.shadows[8],
          ...scrollbarStyles,
        },
      }}
    >
      {content}
    </Drawer>
  );
};

export default MSidebar;
