"use client";

import { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { sendMessageApi } from '@/lib/api';

export default function WhatsAppTester() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('Hello from Nexly! This is a test message.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { subscription } = useSubscription();

  const handleSendTest = async () => {
    if (!phoneNumber || !message) {
      setResult({ success: false, message: 'Please fill in both phone number and message' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await sendMessageApi({
        provider: 'whatsapp',
        to: phoneNumber,
        body: message
      });

      setResult({ 
        success: true, 
        message: `Message sent successfully! Message ID: ${response.externalMessageId || 'N/A'}` 
      });
    } catch (error: any) {
      setResult({ 
        success: false, 
        message: `Error: ${error.message || 'Failed to send message'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!subscription?.subscription) {
    return (
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
        <div className="text-red-400">
          ⚠️ No active subscription found. Please activate your subscription first.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-accent-cream mb-4">
        🧪 WhatsApp Test Tool
      </h3>
      <p className="text-neutral-400 text-sm mb-6">
        Use this tool to test WhatsApp message sending before creating your Meta screencast.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            WhatsApp Phone Number
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+5491123456789 (include country code)"
            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-accent-cream placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Include country code (e.g., +54 for Argentina)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Test Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-accent-cream placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleSendTest}
          disabled={loading || !phoneNumber || !message}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-neutral-600 disabled:cursor-not-allowed text-accent-cream px-4 py-2 rounded-lg transition-colors duration-200"
        >
          {loading ? 'Sending...' : '🚀 Send Test Message'}
        </button>

        {result && (
          <div className={`p-4 rounded-lg ${
            result.success 
              ? 'bg-green-900/30 border border-green-700 text-green-300' 
              : 'bg-red-900/30 border border-red-700 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {result.success ? '✅' : '❌'}
              <span className="font-medium">
                {result.success ? 'Success!' : 'Error'}
              </span>
            </div>
            <p className="mt-1 text-sm">{result.message}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <h4 className="text-blue-300 font-medium mb-2">📋 Screencast Instructions:</h4>
          <ol className="text-sm text-blue-200 space-y-1">
            <li>1. Fill in a real WhatsApp number (yours or a test number)</li>
            <li>2. Customize the message if needed</li>
            <li>3. Click "Send Test Message"</li>
            <li>4. Verify the message appears in WhatsApp Web/App</li>
            <li>5. Record this process for your Meta submission</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
