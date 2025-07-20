import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button, 
  IconButton, 
  Typography,
  CircularProgress,
  Box
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import supportService from '../../services/supportService';
import { toast } from 'react-hot-toast';

interface SupportTicketModalProps {
  open: boolean;
  onClose: () => void;
  orderId?: string; // Optional order ID if creating ticket from order context
}

const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  open,
  onClose,
  orderId
}) => {
  const { t } = useTranslation();
  const [subject, setSubject] = useState(orderId ? `Order #${orderId.slice(0, 8)} Support` : '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject || !message) {
      toast.error(t('fill All Fields'));
      return;
    }

    try {
      setIsSubmitting(true);
      await supportService.createTicket(subject, message);
      toast.success(t('Ticket Submitted'));
      setSubject('');
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast.error(t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={!isSubmitting ? onClose : undefined}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: '12px',
          bgcolor: theme => theme.palette.mode === 'dark' ? '#18181B' : '#ffffff',
          color: theme => theme.palette.mode === 'dark' ? 'white' : '#18181B'
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, color: theme => theme.palette.mode === 'dark' ? 'white' : '#18181B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{t('Contact Support')}</Typography>
        {!isSubmitting && (
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ bgcolor: '#18181B' }}>
          <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
            {t('Fill The Form')}
          </Typography>
          
          <TextField
            fullWidth
            label={t('Subject')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            margin="dense"
            variant="outlined"
            disabled={isSubmitting}
            required
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&.Mui-focused fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
              },
              '& .MuiInputBase-input': {
                color: 'white'
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)'
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'rgba(255, 255, 255, 0.9)'
              }
            }}
          />
          
          <TextField
            fullWidth
            label={t('Message')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            margin="dense"
            multiline
            rows={5}
            variant="outlined"
            disabled={isSubmitting}
            required
            sx={{ 
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&.Mui-focused fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
              },
              '& .MuiInputBase-input': {
                color: 'white'
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)'
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'rgba(255, 255, 255, 0.9)'
              }
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'rgba(28, 28, 32, 0.8)' }}>
          {!isSubmitting && (
            <Button 
              onClick={onClose} 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }
              }}
            >
              {t('common.cancel')}
            </Button>
          )}
          <Button 
            type="submit"
            variant="contained"
            disabled={isSubmitting || !subject || !message}
            sx={{
              bgcolor: '#27272A',
              '&:hover': {
                bgcolor: '#3F3F46'
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isSubmitting ? t('Submitting') : t('Submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SupportTicketModal;
