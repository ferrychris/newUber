import { Box, Button, Drawer, Typography } from '@mui/material';

interface OrderChatDrawerProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

export const OrderChatDrawer = ({ orderId, open, onClose }: OrderChatDrawerProps): JSX.Element => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } },
      }}
    >
      <Box p={3}>
        <Typography variant="h6" component="h2">Order Chat</Typography>
        <Typography component="div">Order ID: {orderId}</Typography>
        <Box my={2}>
          <Typography variant="body2" component="p" sx={{ color: 'text.secondary' }}>
            Chat interface will be implemented here.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={onClose}>Close</Button>
      </Box>
    </Drawer>
  );
};
