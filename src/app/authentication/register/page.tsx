'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  MenuItem,
} from '@mui/material';

interface UserRole {
  _id: string;
  key: string;
  name: string;
  description?: string;
}

interface Corporation {
  _id: string;
  name: string;
  description?: string;
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    position: 'employee',
    userType: '',
    corp: '',
    eid: '',
    category: '',
  });

  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, corpsRes] = await Promise.all([
          fetch('/api/userrole'),
          fetch('/api/corporation')
        ]);

        if (rolesRes.ok && corpsRes.ok) {
          const [rolesData, corpsData] = await Promise.all([
            rolesRes.json(),
            corpsRes.json()
          ]);

          setUserRoles(rolesData);
          setCorporations(corpsData);

          // 기본값 설정
          if (rolesData.length > 0) {
            setForm(prev => ({ ...prev, userType: rolesData[0].key }));
          }
          if (corpsData.length > 0) {
            setForm(prev => ({ ...prev, corp: corpsData[0].name }));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (loading) {
    return <Box>Loading...</Box>;
  }

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
          {userRoles.map((role) => (
            <MenuItem key={role._id} value={role.key}>
              {role.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          name="corp"
          label="Corporation"
          select
          value={form.corp}
          onChange={handleChange}
        >
          {corporations.map((corp) => (
            <MenuItem key={corp._id} value={corp.name}>
              {corp.name}
            </MenuItem>
          ))}
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
