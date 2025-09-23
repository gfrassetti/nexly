"use client";

import { useState, useMemo } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WhatsAppDemo() {
  const [demoStep, setDemoStep] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('+5491123456789');
  const [message, setMessage] = useState('Hello from Nexly! This is a demo message for Meta review.');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { subscription } = useSubscription();
  const { t, language, setLanguage } = useLanguage();

  // Usar useMemo para recalcular cuando cambie el idioma
  const demoSteps = useMemo(() => [
    {
      title: t('whatsapp.demo.step1'),
      description: t('whatsapp.demo.step1.desc'),
      action: () => setDemoStep(1)
    },
    {
      title: t('whatsapp.demo.step2'), 
      description: t('whatsapp.demo.step2.desc'),
      action: () => setDemoStep(2)
    },
    {
      title: t('whatsapp.demo.step3'),
      description: t('whatsapp.demo.step3.desc'),
      action: () => setDemoStep(3)
    },
    {
      title: t('whatsapp.demo.step4'),
      description: t('whatsapp.demo.step4.desc'),
      action: () => setDemoStep(4)
    },
    {
      title: t('whatsapp.demo.step5'),
      description: t('whatsapp.demo.step5.desc'),
      action: () => setDemoStep(5)
    }
  ], [t]);

  const simulateSend = async () => {
    setIsSending(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSent(true);
    setIsSending(false);
  };

  if (!subscription?.subscription) {
    return (
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
        <div className="text-red-400">
          ⚠️ Demo requires active subscription. This simulates the real app behavior.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          🎬 {t('whatsapp.demo.title')}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-400">Language:</span>
          <button
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            {language === 'en' ? 'ES' : 'EN'}
          </button>
        </div>
      </div>
      <p className="text-neutral-400 text-sm mb-6">
        {t('whatsapp.demo.description')}
      </p>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {demoSteps.map((step, index) => (
          <div key={index} className="flex items-center">
            <button
              onClick={step.action}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                demoStep >= index 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-neutral-600 text-neutral-400'
              }`}
            >
              {index + 1}
            </button>
            {index < demoSteps.length - 1 && (
              <div className={`w-16 h-1 mx-2 ${
                demoStep > index ? 'bg-blue-600' : 'bg-neutral-600'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="bg-neutral-700 rounded-lg p-6 mb-6">
        <h4 className="text-white font-medium mb-2">{demoSteps[demoStep].title}</h4>
        <p className="text-neutral-300 text-sm mb-4">{demoSteps[demoStep].description}</p>

        {demoStep === 0 && (
          <div className="space-y-4">
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <h5 className="text-blue-300 font-medium mb-2">Meta OAuth Flow (Simulated)</h5>
              <p className="text-blue-200 text-sm mb-3">
                In the real app, this would redirect to Meta's OAuth page for WhatsApp Business permissions.
              </p>
              <div className="bg-neutral-800 rounded p-3 font-mono text-sm">
                <div className="text-green-400">GET https://www.facebook.com/v19.0/dialog/oauth</div>
                <div className="text-neutral-400">?client_id=META_APP_ID</div>
                <div className="text-neutral-400">&scope=whatsapp_business_management,whatsapp_business_messaging</div>
                <div className="text-neutral-400">&redirect_uri=callback_url</div>
              </div>
            </div>
            <button
              onClick={() => setDemoStep(1)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Continue to User Dashboard →
            </button>
          </div>
        )}

        {demoStep === 1 && (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <h5 className="text-green-300 font-medium mb-2">✅ User Authenticated</h5>
              <p className="text-green-200 text-sm">
                User successfully logged in with Meta OAuth and has WhatsApp Business permissions.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-400">User:</span>
                <span className="text-white ml-2">demo@nexly.com</span>
              </div>
              <div>
                <span className="text-neutral-400">Status:</span>
                <span className="text-green-400 ml-2">Connected</span>
              </div>
              <div>
                <span className="text-neutral-400">Permissions:</span>
                <span className="text-green-400 ml-2">WhatsApp Business</span>
              </div>
              <div>
                <span className="text-neutral-400">Plan:</span>
                <span className="text-blue-400 ml-2">{subscription.subscription.planType}</span>
              </div>
            </div>
            <button
              onClick={() => setDemoStep(2)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Access Message Interface →
            </button>
          </div>
        )}

        {demoStep === 2 && (
          <div className="space-y-4">
            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
              <h5 className="text-purple-300 font-medium mb-2">📱 WhatsApp Message Interface</h5>
              <p className="text-purple-200 text-sm mb-4">
                User has access to the WhatsApp messaging interface with full permissions.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Recipient WhatsApp Number
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-600 border border-neutral-500 rounded-lg text-white"
                  placeholder="+5491123456789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Message Content
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-neutral-600 border border-neutral-500 rounded-lg text-white"
                  placeholder="Type your WhatsApp message here..."
                />
              </div>
            </div>

            <button
              onClick={() => setDemoStep(3)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Send Message →
            </button>
          </div>
        )}

        {demoStep === 3 && (
          <div className="space-y-4">
            <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
              <h5 className="text-orange-300 font-medium mb-2">🚀 Sending Message to WhatsApp</h5>
              <p className="text-orange-200 text-sm mb-4">
                Message is being sent through WhatsApp Business Cloud API.
              </p>
            </div>

            <div className="bg-neutral-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-300">To:</span>
                <span className="text-white">{phoneNumber}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-300">Message:</span>
                <span className="text-white">{message}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Status:</span>
                <span className="text-yellow-400">Sending...</span>
              </div>
            </div>

            <button
              onClick={simulateSend}
              disabled={isSending}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-neutral-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isSending ? 'Sending...' : 'Send via WhatsApp API'}
            </button>
          </div>
        )}

        {demoStep === 4 && (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <h5 className="text-green-300 font-medium mb-2">✅ Message Sent Successfully</h5>
              <p className="text-green-200 text-sm mb-4">
                Message has been delivered to WhatsApp Business Cloud API.
              </p>
            </div>

            <div className="bg-neutral-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Message ID:</span>
                <span className="text-white font-mono">wamid.HBgNNTQ5MTEyMzQ1Njc4ORUCABIYID...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Status:</span>
                <span className="text-green-400">Delivered</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Timestamp:</span>
                <span className="text-white">{new Date().toISOString()}</span>
              </div>
            </div>

            <button
              onClick={() => setDemoStep(5)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Verify in WhatsApp →
            </button>
          </div>
        )}

        {demoStep === 5 && (
          <div className="space-y-4">
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <h5 className="text-blue-300 font-medium mb-2">📱 Message Reception & Response</h5>
              <p className="text-blue-200 text-sm mb-4">
                Receive and respond to messages from customers via Nexly platform.
              </p>
            </div>

            {/* Incoming Message */}
            <div className="bg-neutral-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">C</span>
                </div>
                <div>
                  <div className="text-white font-medium">Customer</div>
                  <div className="text-neutral-400 text-sm">WhatsApp</div>
                </div>
              </div>
              <div className="bg-blue-700 rounded-lg p-3 ml-13">
                <p className="text-white">Hello! I need help with my order #12345</p>
                <p className="text-blue-200 text-xs mt-1">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>

            {/* Response Interface */}
            <div className="bg-neutral-800 rounded-lg p-4">
              <h6 className="text-white font-medium mb-3">📝 Nexly Response Interface</h6>
              <div className="bg-neutral-700 rounded-lg p-3 mb-3">
                <p className="text-neutral-300 text-sm mb-2">Customer: Customer</p>
                <p className="text-neutral-300 text-sm mb-2">Platform: WhatsApp</p>
                <p className="text-neutral-300 text-sm mb-2">Message: "Hello! I need help with my order #12345"</p>
                <p className="text-green-400 text-sm">Status: Ready to respond</p>
              </div>
              
              <div className="bg-neutral-700 rounded-lg p-3">
                <p className="text-neutral-300 text-sm mb-2">Response:</p>
                <p className="text-white">Hi! I'll help you with order #12345. Let me check the status...</p>
                <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm mt-2">
                  Send Response
                </button>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <h6 className="text-green-300 font-medium mb-2">✅ Complete Integration Flow</h6>
              <p className="text-green-200 text-sm">
                This demonstrates the complete WhatsApp Business integration: send messages, receive customer messages, and respond through Nexly platform.
                Once Meta approves our app, all functionality will be operational.
              </p>
            </div>

            <button
              onClick={() => setDemoStep(0)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Restart Demo
            </button>
          </div>
        )}
      </div>

      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
        <h6 className="text-yellow-300 font-medium mb-2">📋 Meta Review Notes</h6>
        <ul className="text-yellow-200 text-sm space-y-1">
          <li>• This demo shows the complete user experience</li>
          <li>• Real API integration is implemented and ready</li>
          <li>• Once approved, all calls will connect to WhatsApp Business API</li>
          <li>• User authentication flow is fully implemented</li>
          <li>• Message sending and delivery confirmation are ready</li>
        </ul>
      </div>
    </div>
  );
}
