import React from 'react';
import MessagePage from '../components/userDashcomponents/messages/MessagePage';

const DriverMessages: React.FC = () => {
  return <MessagePage isDriver={true} />;
};

export default DriverMessages;
