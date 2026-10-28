import React, { useState } from 'react';
import { Plus, Trash2, Volume2 } from 'lucide-react';
import { AssistantSettings, PlaybookRule } from '../types';
import { AVATAR_VAANI } from '../data/initialData';
import { AvatarWithFallback } from './AvatarWithFallback';
import { synthesizeAndPlaySpeech } from '../utils/audioPlayer';

interface SmartRulesViewProps {
  settings: AssistantSettings;
  rules: PlaybookRule[];
  onUpdateSettings: (next: AssistantSettings) => void;
  onToggleRule: (id: string) => void;
  onAddRule: (rule: Omit<PlaybookRule, 'id'>) => void;
  onDeleteRule: (id: string) => void;
}

const VOICE_OPTIONS: Array<{
  id: AssistantSettings['voiceName'];
  label: string;
  desc: string;
}> = [
  { id: 'Kore', label: 'Kore', desc: 'Poised, warm executive female voice' },
  { id: 'Zephyr', label: 'Zephyr', desc: 'Bright, articulate conversational voice' },
  { id: 'Puck', label: 'Puck', desc: 'Friendly, energetic male assistant voice' },
  { id: 'Charon', label: 'Charon', desc: 'Calm, authoritative baritone voice' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Crisp, direct studio voice' },
];

export const SmartRulesView: React.FC<SmartRulesViewProps> = ({
  settings,
  rules,
  onUpdateSettings,
  onToggleRule,
  onAddRule,
  onDeleteRule,
}) => {
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<PlaybookRule['category']>('Delivery');
  const [newInstruction, setNewInstruction] = useState('');

  const handlePreviewVoice = async () => {
    if (isPreviewingVoice) return;
    setIsPreviewingVoice(true);
    const sample = `Hello, I am ${settings.assistantName}, ${settings.ownerName}'s call assistant. नमस्ते, आप हिंदी में बात कर सकते हैं। నమస్తే, మీరు తెలుగులో కూడా మాట్లాడవచ్చు.`;
    await synthesizeAndPlaySpeech({
      text: sample,
      voiceName: settings.voiceName,
    });
    setIsPreviewingVoice(false);
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInstruction.trim()) return;
    onAddRule({
      title: newTitle.trim(),
      category: newCategory,
      instruction: newInstruction.trim(),
      enabled: true,
    });
    setNewTitle('');
    setNewInstruction('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: Assistant Persona, Availability & Memory */}
      <section className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-6">
        <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
          <AvatarWithFallback
            src={AVATAR_VAANI}
            alt={settings.assistantName}
            initials={settings.assistantName}
            sizeClass="w-14 h-14"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assistant Persona & Voice</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fluent in English, हिन्दी, and తెలుగు with instant code-switching
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Your Name (Spoken to Callers)
              </label>
              <input
                type="text"
                value={settings.ownerName}
                onChange={(e) => onUpdateSettings({ ...settings, ownerName: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                AI Assistant Name
              </label>
              <input
                type="text"
                value={settings.assistantName}
                onChange={(e) => onUpdateSettings({ ...settings, assistantName: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Availability Mode */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Current Availability Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['In a Meeting', 'Deep Work', 'Driving', 'After Hours'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, statusMode: mode })}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    settings.statusMode === mode
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Greeting Language Mode */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Opening Greeting Language
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                ['Trilingual Auto', 'English First', 'Hindi First', 'Telugu First'] as const
              ).map((gm) => (
                <button
                  key={gm}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, greetingMode: gm })}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    settings.greetingMode === gm
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {gm}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700">Assistant Voice</label>
              <button
                type="button"
                disabled={isPreviewingVoice}
                onClick={handlePreviewVoice}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-900 flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isPreviewingVoice ? 'Playing Sample…' : 'Hear EN / HI / TE Sample'}</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {VOICE_OPTIONS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, voiceName: v.id })}
                  className={`w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                    settings.voiceName === v.id ? 'bg-indigo-50/70' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{v.label}</div>
                    <div className="text-xs text-slate-500">{v.desc}</div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">
                    {settings.voiceName === v.id ? 'Selected' : 'Select'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Context Memory Note */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Personal Context Memory (Address, Drop-off & Callback Window)
            </label>
            <textarea
              rows={3}
              value={settings.customContextNote}
              onChange={(e) => onUpdateSettings({ ...settings, customContextNote: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 leading-relaxed"
            />
          </div>
        </div>
      </section>

      {/* RIGHT: Smart Playbooks & Guardrail Rules */}
      <section className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-6">
        <div className="pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Autonomous Call Playbooks</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {settings.assistantName} enforces these rules across English, Hindi, and Telugu calls
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                ...settings,
                autoBlockHighSpam: !settings.autoBlockHighSpam,
              })
            }
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              settings.autoBlockHighSpam
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            Auto-Hangup High Spam: {settings.autoBlockHighSpam ? 'On' : 'Off'}
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {rules.map((rule) => (
            <div key={rule.id} className="py-4 first:pt-0 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900 text-sm">{rule.title}</span>
                  <span aria-hidden="true">·</span>
                  <span>{rule.category}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{rule.instruction}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleRule(rule.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    rule.enabled
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rule.enabled ? 'Active' : 'Paused'}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRule(rule.id)}
                  aria-label={`Delete ${rule.title}`}
                  className="min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Playbook Form */}
        <form onSubmit={handleCreateRule} className="pt-5 border-t border-slate-200/80 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Create Custom Rule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Rule title (e.g., Swiggy Drop Rule)"
              className="sm:col-span-2 min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as PlaybookRule['category'])}
              className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:border-indigo-600"
            >
              <option value="Delivery">Delivery</option>
              <option value="Security">Security</option>
              <option value="Spam">Spam</option>
              <option value="VIP">VIP</option>
              <option value="Scheduling">Scheduling</option>
            </select>
          </div>
          <textarea
            rows={2}
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            placeholder="Describe how Vaani should respond when this situation occurs…"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || !newInstruction.trim()}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Playbook Rule</span>
          </button>
        </form>
      </section>
    </div>
  );
};
