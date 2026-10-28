import React, { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Smartphone } from 'lucide-react';
import { AssistantSettings } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidSetupViewProps {
  settings: AssistantSettings;
  onUpdateSettings: (next: AssistantSettings) => void;
}

export const AndroidSetupView: React.FC<AndroidSetupViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);

  const cleanDigits = settings.virtualBridgeNumber.replace(/[^\d+]/g, '');

  const ussdCodes = [
    {
      id: 'busy',
      title: 'Forward When Busy / Declined',
      desc: `Routes incoming calls to ${settings.assistantName} whenever you reject a call or are on another line.`,
      code: `*67*${cleanDigits}#`,
    },
    {
      id: 'noanswer',
      title: 'Forward When Unanswered (15s)',
      desc: `Lets your phone ring briefly, then hands the call to ${settings.assistantName} if you don't pick up.`,
      code: `*61*${cleanDigits}#`,
    },
    {
      id: 'unreachable',
      title: 'Forward When Airplane Mode / No Signal',
      desc: 'Ensures callers in English, Hindi, or Telugu reach your assistant even in dead zones.',
      code: `*62*${cleanDigits}#`,
    },
    {
      id: 'reset',
      title: 'Disable All Call Forwarding',
      desc: 'Standard GSM reset code to restore normal carrier ringing at any time.',
      code: '##002#',
    },
  ];

  const copyText = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: Install Android PWA Standalone App */}
      <section className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Install on Android Home Screen</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Standalone Android app experience with full-screen call console & offline log access
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 font-medium">
            Vaani AI is installed and running in standalone Android mode.
          </div>
        ) : isInstallable ? (
          <button
            type="button"
            onClick={install}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Install Vaani Android App</span>
          </button>
        ) : isIOS ? (
          <button
            type="button"
            onClick={() => setShowIOSModal(true)}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>How to Install on iPhone</span>
          </button>
        ) : (
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
            <p className="text-xs text-slate-700 leading-relaxed">
              Open this app directly in <strong>Chrome on your Android phone</strong>, then tap
              <strong> Install App</strong> (or Chrome’s top-right menu → <strong>Add to Home screen</strong>) to launch Vaani full-screen like a native APK.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyText('app-url', window.location.href)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedKey === 'app-url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'app-url' ? 'App URL Copied' : 'Copy Android App Link'}</span>
              </button>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Standalone Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-700">
            How Vaani Surpasses Equal AI on Android
          </h3>
          <div className="divide-y divide-slate-100 text-xs text-slate-600">
            <div className="py-2.5 flex justify-between gap-4">
              <span className="font-medium text-slate-900">Native Trilingual Fluency</span>
              <span>English · हिन्दी · తెలుగు</span>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <span className="font-medium text-slate-900">Mid-Call Live Whisper</span>
              <span>Translates to caller’s language</span>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <span className="font-medium text-slate-900">Zero-Trust OTP Guard</span>
              <span>Blocks social-engineering scams</span>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <span className="font-medium text-slate-900">Duplex Gemini Live Voice</span>
              <span>Sub-second interruptible audio</span>
            </div>
          </div>
        </div>

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Install on Home Screen</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in Safari’s bottom bar.<br />
                2. Tap <strong>Add to Home Screen</strong> to launch Vaani full-screen.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </section>

      {/* RIGHT: Indian Carrier Call Forwarding USSD Configurator */}
      <section className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-5">
        <div className="pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            Android Carrier Call Forwarding Setup
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Like Equal AI on Android, conditional GSM call forwarding routes declined or unanswered
            calls to your AI assistant line while keeping regular calls on your SIM.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Select Your Indian Mobile Carrier
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(['Jio', 'Airtel', 'Vi', 'BSNL'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, carrier: c })}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    settings.carrier === c
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              AI Assistant SIP / Bridge Number
            </label>
            <input
              type="text"
              value={settings.virtualBridgeNumber}
              onChange={(e) =>
                onUpdateSettings({ ...settings, virtualBridgeNumber: e.target.value })
              }
              className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {ussdCodes.map((item) => (
            <div
              key={item.id}
              className="py-4 first:pt-2 last:pb-0 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="max-w-md">
                <div className="text-sm font-semibold text-slate-900">
                  {settings.carrier} · {item.title}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <code className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-mono tabular-nums text-slate-900">
                  {item.code}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(item.id, item.code)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedKey === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
