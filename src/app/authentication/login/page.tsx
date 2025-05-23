'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

  return (
    <Box maxWidth={400} mx="auto" mt={8}>
      <Typography variant="h5" gutterBottom>
        Tiger Schedule
      </Typography>

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
          onClick={() => signIn('google')}
          startIcon={<FcGoogle />} // ✅ 아이콘 추가
        >
          Sign in with Google
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
