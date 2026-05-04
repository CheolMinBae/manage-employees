'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';

interface ScheduleAuditLog {
  _id: string;
  scheduleId: string;
  action: string;
  actorName?: string;
  actorRole?: string;
  targetEmployeeName?: string;
  targetUserId?: string;
  corp?: string;
  date?: string;
  before?: any;
  after?: any;
  createdAt?: string;
}

function summarizeChange(log: ScheduleAuditLog) {
  const before = log.before || {};
  const after = log.after || {};

  if (log.action === 'delete' || log.action === 'bulk-delete') {
    return `${before.start || '-'} ~ ${before.end || '-'} deleted`;
  }
  if (log.action === 'approve') return `Approved ${after.start || before.start || '-'} ~ ${after.end || before.end || '-'}`;
  if (log.action === 'unapprove') return 'Reset to pending';
  if (log.action === 'create') return `Created ${after.start || '-'} ~ ${after.end || '-'}`;

  const fields = ['date', 'start', 'end', 'userType'];
  const changed = fields
    .filter((field) => before[field] !== after[field])
    .map((field) => `${field}: ${before[field] ?? '-'} → ${after[field] ?? '-'}`);
  return changed.length > 0 ? changed.join(', ') : 'Updated schedule';
}

export default function ScheduleAuditLogTable() {
  const [logs, setLogs] = useState<ScheduleAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/schedule-audit-logs');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || data?.error || 'Failed to load schedule logs');
        }
        setLogs(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e.message || 'Failed to load schedule logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={2}>
        <CircularProgress size={24} />
        <Typography>Loading schedule audit logs...</Typography>
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h6" mb={1}>Schedule Audit Trail</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Shows who changed, approved, or deleted schedules. Latest 200 records.
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Corp</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Change</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log._id}>
                <TableCell>{log.createdAt ? dayjs(log.createdAt).format('YYYY-MM-DD HH:mm') : '-'}</TableCell>
                <TableCell><Chip size="small" label={log.action} /></TableCell>
                <TableCell>{log.actorName || 'Unknown'} ({log.actorRole || 'unknown'})</TableCell>
                <TableCell>{log.targetEmployeeName || log.targetUserId || '-'}</TableCell>
                <TableCell>{log.corp || '-'}</TableCell>
                <TableCell>{log.date || '-'}</TableCell>
                <TableCell>{summarizeChange(log)}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">No audit logs yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
