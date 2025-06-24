import React from 'react';


interface AvailabilityToggleProps {
  available: boolean;
  onToggle: () => Promise<void>;
  isToggling: boolean;
  isDisabled: boolean;
}

const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({
  available,
  isToggling,
  onToggle,
  isDisabled
}) => {
  const buttonText = available ? 'Go Offline' : 'Go Online';

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Driver Dashboard</h2>
      <button
        onClick={onToggle}
        disabled={isDisabled || isToggling}
        className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 ${available ? 'bg-green-100 text-black' : 'bg-gray-100 text-black'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
      >
        {isToggling ? 'Updating...' : buttonText}
      </button>
    </div>
  );
};

export default AvailabilityToggle;
