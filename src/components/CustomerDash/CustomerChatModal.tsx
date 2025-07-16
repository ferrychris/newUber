import React from 'react';
import { Dialog, DialogContent } from '@mui/material';
import Message from '../userDashcomponents/messages/Message';

interface CustomerChatModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  driverId: string;
}

const CustomerChatModal: React.FC<CustomerChatModalProps> = ({
  open,
  onClose,
  orderId,
  driverId
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        style: {
          borderRadius: '12px',
          overflow: 'hidden'
        }
      }}
    >
      <DialogContent sx={{ p: 0, height: '70vh', overflow: 'hidden' }}>
        <Message
          orderId={orderId}
          receiverId={driverId}
          isDriver={false}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CustomerChatModal;
