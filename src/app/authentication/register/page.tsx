// src/app/authentication/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  MenuItem,
} from '@mui/material';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    position: 'employee',
  });

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(form),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      alert('회원가입 완료');
      router.push('/authentication/login');
    } else {
      const data = await res.json();
      alert(`회원가입 실패: ${data.message || '서버 오류'}`);
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={8}>
      <Typography variant="h5" gutterBottom>
        회원가입
      </Typography>
      <Stack spacing={2}>
        <TextField name="name" label="이름" value={form.name} onChange={handleChange} />
        <TextField name="email" label="이메일" value={form.email} onChange={handleChange} />
        <TextField name="password" type="password" label="비밀번호" value={form.password} onChange={handleChange} />

        {/* ✅ position 셀렉트박스 추가 */}
        <TextField
          name="position"
          label="직책"
          select
          value={form.position}
          onChange={handleChange}
        >
          <MenuItem value="employee">직원</MenuItem>
          <MenuItem value="admin">관리자</MenuItem>
        </TextField>

        <Button variant="contained" onClick={handleRegister}>
          회원가입
        </Button>
      </Stack>
    </Box>
  );
}
