'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Paper,
  Alert,
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
    userType: '',
    corp: '',
    eid: '',
    category: '',
  });

  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [loading, setLoading] = useState(true);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

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

          // Google에서 온 정보가 있는지 확인
          const emailFromGoogle = searchParams.get('email');
          const nameFromGoogle = searchParams.get('name');

          if (emailFromGoogle) {
            setIsGoogleSignup(true);
            setForm(prev => ({
              ...prev,
              email: emailFromGoogle,
              name: nameFromGoogle || '',
              password: 'google-oauth', // Google 로그인 사용자는 패스워드 불필요
            }));
          }

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
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleRegister = async () => {
    if (!agreeToTerms) {
      alert('You must agree to the Terms of Use to register.');
      return;
    }

    const requestData = {
      ...form,
      position: 'employee', // 항상 employee로 고정
      isFirstLogin: false,   // 항상 false로 고정
    };

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestData),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      alert('Registration successful');
      
      if (isGoogleSignup) {
        // Google 회원가입의 경우 자동으로 Google 로그인 시도
        window.location.href = '/api/auth/signin/google';
      } else {
        // 일반 회원가입의 경우 로그인 페이지로 이동
        router.push('/authentication/login');
      }
    } else {
      const data = await res.json();
      alert(`Registration failed: ${data.message || 'Server error'}`);
    }
  };

  if (loading) {
    return <Box>Loading...</Box>;
  }

  return (
    <Box maxWidth={600} mx="auto" mt={4} px={2}>
      <Typography variant="h5" gutterBottom>
        {isGoogleSignup ? 'Complete Your Google Sign Up' : 'Sign Up'}
      </Typography>
      
      {isGoogleSignup && (
        <Alert severity="info" sx={{ mb: 3 }}>
          We found your Google account! Please complete your registration by filling out the additional information below.
        </Alert>
      )}
      
      <Stack spacing={3}>
        <TextField 
          name="name" 
          label="Name" 
          value={form.name} 
          onChange={handleChange}
          disabled={isGoogleSignup && !!form.name}
        />
        <TextField 
          name="email" 
          label="Email" 
          value={form.email} 
          onChange={handleChange}
          disabled={isGoogleSignup}
        />
        {!isGoogleSignup && (
          <TextField name="password" type="password" label="Password" value={form.password} onChange={handleChange} />
        )}

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

        {/* Terms of Use Section */}
        <Paper elevation={2} sx={{ p: 3, mt: 3, maxHeight: 150, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            Terms of Use and Liability Waiver
          </Typography>
          
          <Typography variant="body2" paragraph>
            By logging in and using this employee scheduling system ("Software") provided by Seed and Water Bakery Cafe, 
            located at 6980 Beach Blvd, Unit C213, Buena Park, CA 92602, you acknowledge and agree to the following:
          </Typography>

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
            Voluntary Use
          </Typography>
          <Typography variant="body2" paragraph>
            This Software is provided to help manage and view your work schedule. Use is voluntary and not a condition of employment.
          </Typography>

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
            No Guarantee or Responsibility
          </Typography>
          <Typography variant="body2" paragraph>
            Seed and Water Bakery Cafe makes no guarantees regarding the accuracy, performance, or availability of the Software. 
            The Company is not responsible for any scheduling errors, missed shifts, technical issues, or misunderstandings 
            that may result from use of the Software.
          </Typography>

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
            Waiver of Liability
          </Typography>
          <Typography variant="body2" paragraph>
            To the fullest extent permitted by California law, you waive and release Seed and Water Bakery Cafe, 
            its owners, management, and employees from any and all claims, losses, or liabilities related to your use of this Software.
          </Typography>

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
            Click-to-Agree Consent
          </Typography>
          <Typography variant="body2" paragraph>
            By clicking "I Agree" or by continuing to use this system, you confirm that you have read, understood, 
            and accepted these terms.
          </Typography>

          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            If you do not agree to these terms, please exit the system and discontinue use immediately.
          </Alert>

          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
            Your login and use of this system will be recorded as acceptance of these terms.
          </Typography>
        </Paper>

        {/* Agreement Checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              ✓ I Agree and Continue - I have read, understood, and accept the Terms of Use and Liability Waiver
            </Typography>
          }
        />

        <Button 
          variant="contained" 
          onClick={handleRegister}
          disabled={!agreeToTerms}
          sx={{ 
            mt: 2,
            opacity: agreeToTerms ? 1 : 0.5,
            '&:disabled': {
              backgroundColor: '#ccc',
              color: '#666'
            }
          }}
        >
          Register
        </Button>
      </Stack>
    </Box>
  );
}
