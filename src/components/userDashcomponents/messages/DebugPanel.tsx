import React, { memo } from 'react';
import { FaTimes } from 'react-icons/fa';
import { DebugInfo } from './types';

interface DebugPanelProps {
  onClose: () => void;
  debugInfo: DebugInfo;
}

const DebugPanel: React.FC<DebugPanelProps> = memo(({ 
  onClose, 
  debugInfo 
}) => (
  <div className="fixed bottom-4 right-4 z-[9999] bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md">
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-bold">Debug Info</h3>
      <button 
        onClick={onClose}
        className="text-gray-400 hover:text-white"
      >
        <FaTimes />
      </button>
    </div>
    <div className="space-y-2 text-sm">
      <div>
        <span className="text-gray-400">Auth Loading:</span>
        <span className={debugInfo.authLoading ? 'text-yellow-400' : 'text-green-400'}>
          {debugInfo.authLoading ? 'Yes' : 'No'}
        </span>
      </div>
      <div>
        <span className="text-gray-400">Has Auth User:</span>
        <span className={debugInfo.hasAuthUser ? 'text-green-400' : 'text-red-400'}>
          {debugInfo.hasAuthUser ? 'Yes' : 'No'}
        </span>
      </div>
      <div>
        <span className="text-gray-400">User ID:</span>
        <span className="text-gray-300">{debugInfo.userId || 'None'}</span>
      </div>
      <div>
        <span className="text-gray-400">Error:</span>
        <span className="text-red-400">{debugInfo.error || 'None'}</span>
      </div>
      <div>
        <span className="text-gray-400">Last Update:</span>
        <span className="text-gray-300">{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  </div>
));

export default DebugPanel;
