'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Divider,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc'; // ✅ 추가

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.ok) {
      router.push('/');
    } else {
      alert('Login failed');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log('Google sign in clicked');
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: '/'
      });
      console.log('Google sign in result:', result);
    } catch (error) {
      console.error('Google sign in error:', error);
      alert('Google sign in failed: ' + error);
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={8}>
      <Box display="flex" justifyContent="center" mb={3}>
        <Image
          src="/logo_img.png"
          alt="Brand Logo"
          width={200}
          height={80}
          style={{ objectFit: 'contain' }}
        />
      </Box>

      <Stack spacing={2}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button variant="contained" onClick={handleSubmit}>
          Sign In
        </Button>

        <Divider>or</Divider>

        <Button
          variant="outlined"
          onClick={handleGoogleSignIn}
          startIcon={<FcGoogle />} // ✅ 아이콘 추가
        >
          Start with Google
        </Button>
      </Stack>

      <Box mt={4} textAlign="center">
        <Typography variant="body2">
          Don't have an account?{' '}
          <MuiLink component={Link} href="/authentication/register" underline="hover">
            Sign up
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
}
