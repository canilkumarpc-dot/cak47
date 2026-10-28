/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Inbox, PhoneCall, Sliders, Smartphone } from 'lucide-react';
import {
  AssistantSettings,
  CallRecord,
  PlaybookRule,
  SupportedLanguage,
} from './types';
import {
  INITIAL_CALL_HISTORY,
  INITIAL_PLAYBOOK_RULES,
  INITIAL_SETTINGS,
} from './data/initialData';
import { LiveScreeningView } from './components/LiveScreeningView';
import { CallInboxView } from './components/CallInboxView';
import { SmartRulesView } from './components/SmartRulesView';
import { AndroidSetupView } from './components/AndroidSetupView';
import { useOnlineStatus } from './hooks/usePWAInstall';

type ActiveTab = 'live' | 'inbox' | 'rules' | 'android';

const STORAGE_KEYS = {
  SETTINGS: 'vaani_settings_v1',
  RULES: 'vaani_rules_v1',
  HISTORY: 'vaani_history_v1',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('live');
  const [externalTriggerCount, setExternalTriggerCount] = useState(0);
  const isOnline = useOnlineStatus();

  const [settings, setSettings] = useState<AssistantSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [rules, setRules] = useState<PlaybookRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RULES);
      return saved ? JSON.parse(saved) : INITIAL_PLAYBOOK_RULES;
    } catch {
      return INITIAL_PLAYBOOK_RULES;
    }
  });

  const [callHistory, setCallHistory] = useState<CallRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : INITIAL_CALL_HISTORY;
    } catch {
      return INITIAL_CALL_HISTORY;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
    } catch {
      // Ignore
    }
  }, [rules]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(callHistory));
    } catch {
      // Ignore
    }
  }, [callHistory]);

  const handleUpdateReadingLang = (lang: SupportedLanguage) => {
    setSettings((prev) => ({ ...prev, preferredReadingLang: lang }));
  };

  const handleSaveCallRecord = (record: CallRecord) => {
    setCallHistory((prev) => [record, ...prev]);
  };

  const handleToggleActionItem = (callId: string, actionId: string) => {
    setCallHistory((prev) =>
      prev.map((rec) =>
        rec.id !== callId
          ? rec
          : {
              ...rec,
              actionItems: rec.actionItems.map((a) =>
                a.id === actionId ? { ...a, completed: !a.completed } : a
              ),
            }
      )
    );
  };

  const handleDeleteRecord = (callId: string) => {
    setCallHistory((prev) => prev.filter((r) => r.id !== callId));
  };

  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleAddRule = (newRule: Omit<PlaybookRule, 'id'>) => {
    setRules((prev) => [
      ...prev,
      { ...newRule, id: `rule-${Date.now()}` },
    ]);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    mobileLabel: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'live', label: 'Live Screening', mobileLabel: 'Live Call', icon: PhoneCall },
    { id: 'inbox', label: 'Call Inbox', mobileLabel: 'Inbox', icon: Inbox },
    { id: 'rules', label: 'Smart Rules', mobileLabel: 'Playbooks', icon: Sliders },
    { id: 'android', label: 'Android Setup', mobileLabel: 'Android', icon: Smartphone },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 lg:pb-12">
      {/* Top Navigation Bar — Strictly follows 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 h-16">
          {/* Zone 1: Single-element Brand Wordmark */}
          <a
            href="#live"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('live');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
          >
            Vaani AI
          </a>

          {/* Zone 2: 4 Single-line Text Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  activeTab === item.id
                    ? 'text-slate-900 border-indigo-600 font-semibold'
                    : 'border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('live');
                setExternalTriggerCount((c) => c + 1);
              }}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
            >
              Simulate Incoming Call
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Subheader Context Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight" style={{ textWrap: 'balance' }}>
              {activeTab === 'live' && 'Multilingual AI Call Assistant'}
              {activeTab === 'inbox' && 'Screened Call Inbox & Trilingual Briefs'}
              {activeTab === 'rules' && 'Autonomous Playbooks & Voice Studio'}
              {activeTab === 'android' && 'Android App Install & Carrier Forwarding'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Assistant: {settings.assistantName}</span>
            <span aria-hidden="true">·</span>
            <span>Status: {settings.statusMode}</span>
            <span aria-hidden="true">·</span>
            <span>Languages: English / हिन्दी / తెలుగు</span>
          </div>
        </div>
      </div>

      {/* Main Content Canvas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {activeTab === 'live' && (
          <LiveScreeningView
            settings={settings}
            rules={rules}
            onUpdateReadingLang={handleUpdateReadingLang}
            onSaveCallRecord={handleSaveCallRecord}
            externalTriggerCount={externalTriggerCount}
          />
        )}

        {activeTab === 'inbox' && (
          <CallInboxView
            records={callHistory}
            settings={settings}
            onToggleActionItem={handleToggleActionItem}
            onDeleteRecord={handleDeleteRecord}
            onGoToLiveScreen={() => setActiveTab('live')}
          />
        )}

        {activeTab === 'rules' && (
          <SmartRulesView
            settings={settings}
            rules={rules}
            onUpdateSettings={setSettings}
            onToggleRule={handleToggleRule}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
          />
        )}

        {activeTab === 'android' && (
          <AndroidSetupView
            settings={settings}
            onUpdateSettings={setSettings}
          />
        )}
      </main>

      {/* Offline Mode Connectivity Toast */}
      {!isOnline && (
        <div className="fixed bottom-20 lg:bottom-5 left-4 z-50 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
          Offline Mode — Viewing cached call history & playbooks
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar (< lg, 64px height, <8% viewport height) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
      >
        <div className="grid grid-cols-4 items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`h-full min-h-[44px] flex flex-col items-center justify-center transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium tracking-tight mt-1 whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
