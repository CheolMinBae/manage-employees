import React from 'react';
import { Box } from '@mui/material';

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
      {children}
    </Box>
  );
} 