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
    userType: 'barista',
    corp: 'corp1',
    eid: '',
    category: '',
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
      alert('Registration successful');
      router.push('/authentication/login');
    } else {
      const data = await res.json();
      alert(`Registration failed: ${data.message || 'Server error'}`);
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={8}>
      <Typography variant="h5" gutterBottom>
        Sign Up
      </Typography>
      <Stack spacing={2}>
        <TextField name="name" label="Name" value={form.name} onChange={handleChange} />
        <TextField name="email" label="Email" value={form.email} onChange={handleChange} />
        <TextField name="password" type="password" label="Password" value={form.password} onChange={handleChange} />

        <TextField
          name="position"
          label="User Role"
          select
          value={form.position}
          onChange={handleChange}
        >
          <MenuItem value="employee">Employee</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
        </TextField>

        <TextField
          name="userType"
          label="Position"
          select
          value={form.userType}
          onChange={handleChange}
        >
          <MenuItem value="barista">Barista</MenuItem>
          <MenuItem value="supervisor">Supervisor</MenuItem>
          <MenuItem value="position1">Position 1</MenuItem>
          <MenuItem value="position2">Position 2</MenuItem>
        </TextField>

        <TextField
          name="corp"
          label="Corporation"
          select
          value={form.corp}
          onChange={handleChange}
        >
          <MenuItem value="corp1">Corp 1</MenuItem>
          <MenuItem value="corp2">Corp 2</MenuItem>
          <MenuItem value="corp3">Corp 3</MenuItem>
        </TextField>

        <TextField
          name="eid"
          label="EID"
          value={form.eid}
          onChange={handleChange}
        />

        <TextField
          name="category"
          label="Category"
          value={form.category}
          onChange={handleChange}
        />

        <Button variant="contained" onClick={handleRegister}>
          Register
        </Button>
      </Stack>
    </Box>
  );
}
