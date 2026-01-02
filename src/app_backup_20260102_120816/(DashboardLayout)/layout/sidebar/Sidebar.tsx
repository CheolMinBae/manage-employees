'use client';

import Image from 'next/image';
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
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useSession } from 'next-auth/react';

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
  const { data: session } = useSession();
  console.log(session);

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
    { title: 'Schedule Templates', icon: <ScheduleIcon />, href: '/schedule-templates', adminOnly: true },
    { title: 'Settings', icon: <SettingsOutlinedIcon />, href: '/settings' },
  ];
  
  // admin 사용자인지 확인
  const isAdmin = session?.user?.position === 'admin';
  
  // 권한에 따라 메뉴 필터링
  const menus = navItems.filter(item => {
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    
    if (isAdmin) {
      // admin은 모든 메뉴 접근 가능 (adminOnly 체크는 위에서 이미 함)
      return true;
    } else {
      // employee는 Dashboard와 Schedule만 접근 가능
      return ['Dashboard', 'Schedule'].includes(item.title);
    }
  });

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
        <Image
          src="/logo_img.png"
          alt="Brand Logo"
          width={160}
          height={64}
          style={{ objectFit: 'contain' }}
        />
      </Box>

      <List>
        {menus.map((item) => (
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
