'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Stack,
  Grid,
  alpha,
} from '@mui/material';
import {
  Star,
  NotificationsActive,
  RateReview,
  WorkOutline,
  CardGiftcard,
} from '@mui/icons-material';

const ApplyPage = () => {
  const [email, setEmail] = useState('');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f7f7f7' }}>
      {/* Navigation Bar */}
      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid #e0e0e0',
          py: 2,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box
              component="img"
              src="/logo_img.png"
              alt="Seed Water"
              sx={{
                height: { xs: 40, sm: 50, md: 60 },
                width: 'auto',
                objectFit: 'contain',
              }}
            />
            <Stack 
              direction="row" 
              spacing={{ xs: 2, sm: 4 }}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Section 1: Hero - Reward App Coming Soon */}
      <Box
        sx={{
          backgroundImage: 'url(/bg01.png)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
          <Grid 
            container 
            spacing={{ xs: 4, md: 6 }} 
            alignItems="center"
            sx={{
              '& .MuiGrid-item': {
                borderRight: 'none !important',
                borderLeft: 'none !important',
              }
            }}
          >
            <Grid item xs={12} md={7}>
              <Stack spacing={{ xs: 3, md: 4 }} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '2rem', sm: '2.5rem', md: '4rem' },
                    color: 'white',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Your rewards are<br />coming soon
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                    color: '#d4d4d4',
                    fontWeight: 400,
                    lineHeight: 1.6,
                    maxWidth: { xs: '100%', md: 500 },
                    mx: { xs: 'auto', md: 0 },
                  }}
                >
                  고객전용 리워드 앱이 곧 출시됩니다. 특별한 혜택과 할인을 가장 먼저 받아보세요.
                </Typography>
                
                <Box sx={{ mt: 4 }}>
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={2} 
                    alignItems="center" 
                    sx={{ maxWidth: { xs: 350, sm: 600 }, mx: 'auto' }}
                  >
                    <TextField
                      fullWidth
                      placeholder="이메일 주소를 입력하세요"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          borderRadius: '50px',
                          border: 'none',
                          '& fieldset': { border: 'none' },
                          '& input': { px: 3, py: 1.5 },
                        },
                      }}
                    />
                    <Button
                      variant="contained"
                      sx={{
                        bgcolor: '#00704a',
                        color: 'white',
                        borderRadius: '50px',
                        px: 4,
                        py: 2,
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        minWidth: { xs: '100%', sm: 180 },
                        flexShrink: 0,
                        '&:hover': { bgcolor: '#005c3d' },
                      }}
                    >
                      알림받기
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Box
                  component="img"
                  src="/coffee-img.png"
                  alt="Coffee"
                  sx={{
                    width: { xs: 325, sm: 390 },
                    height: { xs: 325, sm: 390 },
                    objectFit: 'contain',
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Section 2: Review & Gift */}
      <Box sx={{ bgcolor: '#5f4633', py: { xs: 4, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box
                sx={{
                  width: { xs: 300, sm: 350, md: 400 },
                  height: { xs: 250, sm: 275, md: 300 },
                  bgcolor: alpha('#fff', 0.1),
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  position: 'relative',
                  border: '1px solid',
                  borderColor: alpha('#fff', 0.2),
                }}
              >
                <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} sx={{ fontSize: 40, color: '#ffd700' }} />
                  ))}
                </Stack>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: '#00704a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RateReview sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: '#d4af37',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CardGiftcard sx={{ fontSize: 30, color: 'white' }} />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={3} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
                    color: '#f5f5dc',
                    lineHeight: 1.2,
                  }}
                >
                  It's a great day for<br />free gifts
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
                    color: alpha('#fff', 0.9),
                    lineHeight: 1.6,
                  }}
                >
                  Seed & Water를 방문해주셔서 감사합니다. 소중한 리뷰를 남겨주시면 추첨을 통해 특별한 무료 선물을 드립니다!
                </Typography>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: '#d4af37',
                      color: '#5f4633',
                      borderRadius: '50px',
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#b8941f' },
                    }}
                  >
                    리뷰 남기기
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{
                      borderColor: '#f5f5dc',
                      color: '#f5f5dc',
                      borderRadius: '50px',
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: '#f5f5dc',
                        bgcolor: alpha('#f5f5dc', 0.1),
                      },
                    }}
                  >
                    나중에
                  </Button>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Section 3: Hiring */}
      <Box sx={{ bgcolor: '#f8f8f8', py: { xs: 4, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            <Grid item xs={12} md={8}>
              <Stack spacing={{ xs: 3, md: 4 }} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '2rem', sm: '2.5rem', md: '4rem' },
                    color: '#2c3e50',
                    lineHeight: 1.1,
                  }}
                >
                  We're hiring
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.8rem' },
                    color: '#34495e',
                    fontWeight: 600,
                  }}
                >
                  Join our amazing team!
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    color: '#666',
                    maxWidth: { xs: '100%', md: 500 },
                    lineHeight: 1.6,
                    mx: { xs: 'auto', md: 0 },
                  }}
                >
                  함께 성장할 열정적인 팀원을 찾고 있습니다. 새로운 도전과 기회가 기다리고 있어요!
                </Typography>
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<WorkOutline />}
                  sx={{
                    bgcolor: '#00704a',
                    color: 'white',
                    borderRadius: '50px',
                    px: { xs: 4, md: 6 },
                    py: 2,
                    fontSize: { xs: '1rem', md: '1.2rem' },
                    fontWeight: 600,
                    textTransform: 'none',
                    alignSelf: { xs: 'center', md: 'flex-start' },
                    '&:hover': { bgcolor: '#005c3d' },
                  }}
                >
                  지원하기
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 520,
                    borderRadius: 4,
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
                    },
                  }}
                >
                  <Box
                    component="img"
                    src="/team-photo.png"
                    alt="Seed Water Team"
                    sx={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#2c3e50', py: 4 }}>
        <Container maxWidth="lg">
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            justifyContent="space-between" 
            alignItems="center"
            spacing={{ xs: 2, sm: 0 }}
          >
            <Typography variant="body2" sx={{ color: '#bbb', textAlign: { xs: 'center', sm: 'left' } }}>
              © 2025 Seed Water. All rights reserved.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 4 }}>
              <Typography variant="body2" sx={{ color: '#bbb', cursor: 'pointer', '&:hover': { color: 'white' }, textAlign: 'center' }}>
                Privacy Policy
              </Typography>
              <Typography variant="body2" sx={{ color: '#bbb', cursor: 'pointer', '&:hover': { color: 'white' }, textAlign: 'center' }}>
                Terms of Service
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default ApplyPage; 