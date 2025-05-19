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
      alert('로그인 실패');
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={8}>
      <Typography variant="h5" gutterBottom>
        로그인
      </Typography>

      <Stack spacing={2}>
        <TextField
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button variant="contained" onClick={handleSubmit}>
          로그인
        </Button>

        <Divider>또는</Divider>

        <Button variant="outlined" onClick={() => signIn('google')}>
          Google 로그인
        </Button>
      </Stack>

      {/* ✅ 최하단 회원가입 링크 */}
      <Box mt={4} textAlign="center">
        <Typography variant="body2">
          아직 계정이 없으신가요?{' '}
          <MuiLink component={Link} href="/authentication/register" underline="hover">
            회원가입
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
}
