import React from 'react';
import { Box, AppBar, Toolbar, styled, Stack, IconButton, Badge, Button, Typography, Avatar } from '@mui/material';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { IconBellRinging, IconMenu } from '@tabler/icons-react';

interface ItemType {
  toggleMobileSidebar:  (event: React.MouseEvent<HTMLElement>) => void;
}

const Header = ({ toggleMobileSidebar }: ItemType) => {
  const { data: session } = useSession();

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: '70px',
    },
  }));

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        <IconButton
          color="inherit"
          aria-label="menu"
          onClick={toggleMobileSidebar}
          sx={{
            display: {
              lg: "none",
              xs: "inline",
            },
          }}
        >
          <IconMenu width="20" height="20" />
        </IconButton>

        <IconButton
          size="large"
          aria-label="show 11 new notifications"
          color="inherit"
          aria-controls="msgs-menu"
          aria-haspopup="true"
        >
          <Badge variant="dot" color="primary">
            <IconBellRinging size="21" stroke="1.5" />
          </Badge>
        </IconButton>

        <Box flexGrow={1} />

        {/* 기준 시간대 안내 */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mr: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Time Zone: California (Pacific Time, America/Los_Angeles)
          </Typography>
        </Box>

        <Stack spacing={1} direction="row" alignItems="center">
          {!session ? (
            <Button
              variant="contained"
              component={Link}
              href="/authentication/login"
              disableElevation
              color="primary"
            >
              Login
            </Button>
          ) : (
            <>
              <Typography variant="body2" fontWeight={500}>
                {session.user?.name || session.user?.email}
              </Typography>
              <Avatar src={session.user?.image || undefined} alt="avatar" sx={{ width: 32, height: 32 }} />
              <Button variant="outlined" size="small" onClick={() => signOut({ callbackUrl: '/authentication/login' })}>
                Logout
              </Button>
            </>
          )}
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
