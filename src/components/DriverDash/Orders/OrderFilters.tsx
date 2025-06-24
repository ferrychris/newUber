import React from 'react';

interface OrderFiltersProps {
  activeFilter: 'all' | 'pending' | 'accepted' | 'completed';
  onFilterChange: (filter: 'all' | 'pending' | 'accepted' | 'completed') => void;
}

const OrderFilters: React.FC<OrderFiltersProps> = ({ activeFilter, onFilterChange }) => {
  const filters = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'Pending' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'completed', label: 'Completed' },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeFilter === filter.id
              ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
              : 'bg-[#333333] text-gray-400 border border-gray-700 hover:bg-[#3a3a3a]'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default OrderFilters;
