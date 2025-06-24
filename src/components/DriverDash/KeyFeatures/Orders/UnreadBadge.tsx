import { Box } from '@mui/material';

interface UnreadBadgeProps {
  count: number;
}

export const UnreadBadge = ({ count }: UnreadBadgeProps): JSX.Element | null => {
  if (count <= 0) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: -8,
        right: -8,
        bgcolor: 'error.main',
        color: 'white',
        borderRadius: '50%',
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
      }}
    >
      {count}
    </Box>
  );
};
