import React, { useState } from 'react';
import { Fab, Tooltip, useTheme, Zoom } from '@mui/material';
import { FaHeadset } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import SupportTicketModal from './SupportTicketModal';

interface SupportFabProps {
  orderId?: string; // Optional - when used in order context
}

const SupportFab: React.FC<SupportFabProps> = ({ orderId }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Tooltip 
        title={t('Contact Support')}
        placement="left"
        TransitionComponent={Zoom}
        arrow
      >
        <Fab
          color="primary"
          aria-label="support"
          onClick={handleOpenModal}
          sx={{
            position: 'fixed',
            bottom: { xs: 80, sm: 30 },
            right: 20,
            bgcolor: theme => theme.palette.mode === 'dark' ? '#27272A' : '#7c3aed',
            '&:hover': {
              bgcolor: theme => theme.palette.mode === 'dark' ? '#3F3F46' : '#6d28d9'
            },
            zIndex: theme.zIndex.drawer + 1
          }}
        >
          <FaHeadset size={24} />
        </Fab>
      </Tooltip>

      <SupportTicketModal
        open={isModalOpen}
        onClose={handleCloseModal}
        orderId={orderId}
      />
    </>
  );
};

export default SupportFab;
