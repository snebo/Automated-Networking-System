'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { telephonyApi } from '@/lib/api';

export function ManualCallForm() {
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [goal, setGoal] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const { mutate: makeManualCall, isPending } = useMutation({
    mutationFn: async () => {
      // Validate phone number format
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Please enter a valid phone number');
      }

      // Add +1 if not present and number is 10 digits
      const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
      
      return telephonyApi.initiateManualCall(businessName, formattedPhone, goal);
    },
    onSuccess: (data) => {
      showMessage(`Call initiated! Call ID: ${data.callSid.slice(-8)}`, 'success');
      // Clear form
      setBusinessName('');
      setPhoneNumber('');
      setGoal('');
    },
    onError: (error: Error) => {
      showMessage(error.message || 'Failed to initiate call', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessName.trim() || !phoneNumber.trim() || !goal.trim()) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    makeManualCall();
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📞 Manual Call
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Call a business not in the database by entering details manually
        </p>
      </div>
      <div className="p-6">
        {message && (
          <div className={`mb-4 p-3 rounded-md ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
              🏢 Business Name *
            </label>
            <input
              id="businessName"
              type="text"
              placeholder="e.g., Acme Corporation"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={isPending}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
              📞 Phone Number *
            </label>
            <input
              id="phoneNumber"
              type="tel"
              placeholder="e.g., (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isPending}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700">
              🎯 Call Goal *
            </label>
            <textarea
              id="goal"
              placeholder="e.g., Get the contact information of the HR manager"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isPending}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start">
              <div className="text-blue-600 mr-2">ℹ️</div>
              <p className="text-sm text-blue-800">
                This will create a temporary business record and initiate a call immediately.
                The call will be tracked in the workflow history.
              </p>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isPending || !businessName.trim() || !phoneNumber.trim() || !goal.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Initiating Call...' : 'Start Call'}
          </button>
        </form>
      </div>
    </div>
  );
}