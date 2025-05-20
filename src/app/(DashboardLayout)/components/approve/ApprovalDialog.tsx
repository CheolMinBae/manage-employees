// components/ApprovalDialog.tsx
'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';

interface Props {
  open: boolean;
  onClose: () => void;
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  setStartTime: (val: Dayjs | null) => void;
  setEndTime: (val: Dayjs | null) => void;
  onApprove: () => void;
}

const ApprovalDialog = ({
  open, onClose,
  startTime, endTime,
  setStartTime, setEndTime,
  onApprove
}: Props) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Are you sure you want to approve this time?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TimePicker
            label="Start Time"
            value={startTime}
            onChange={setStartTime}
          />
          <TimePicker
            label="End Time"
            value={endTime}
            onChange={setEndTime}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onApprove}>Approve</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApprovalDialog;
