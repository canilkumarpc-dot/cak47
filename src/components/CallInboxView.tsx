import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  ChevronRight,
  PhoneIncoming,
  Search,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import { AssistantSettings, CallRecord, SupportedLanguage } from '../types';
import { AvatarWithFallback } from './AvatarWithFallback';
import { synthesizeAndPlaySpeech } from '../utils/audioPlayer';

interface CallInboxViewProps {
  records: CallRecord[];
  settings: AssistantSettings;
  onToggleActionItem: (callId: string, actionId: string) => void;
  onDeleteRecord: (callId: string) => void;
  onGoToLiveScreen: () => void;
}

type InboxFilter = 'all' | 'action' | 'delivery' | 'spam';

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

export const CallInboxView: React.FC<CallInboxViewProps> = ({
  records,
  settings,
  onToggleActionItem,
  onDeleteRecord,
  onGoToLiveScreen,
}) => {
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(records[0]?.id || '');
  const [summaryLang, setSummaryLang] = useState<SupportedLanguage>(settings.preferredReadingLang);
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (filter === 'action' && rec.outcome !== 'Action Needed' && rec.actionItems.every((a) => a.completed)) {
        return false;
      }
      if (filter === 'delivery' && !rec.intentCategory.toLowerCase().includes('delivery')) {
        return false;
      }
      if (filter === 'spam' && rec.outcome !== 'Spam Blocked' && rec.spamConfidence < 70) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${rec.callerName} ${rec.callerNumber} ${rec.summary.headline} ${rec.primaryLanguage} ${rec.intentCategory}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [records, filter, searchQuery]);

  const selectedRecord = useMemo(() => {
    return (
      filteredRecords.find((r) => r.id === selectedId) ||
      filteredRecords[0] ||
      null
    );
  }, [filteredRecords, selectedId]);

  const stats = useMemo(() => {
    const total = records.length;
    const spamBlocked = records.filter((r) => r.outcome === 'Spam Blocked' || r.spamConfidence >= 75).length;
    const openTasks = records.reduce(
      (acc, r) => acc + r.actionItems.filter((a) => !a.completed).length,
      0
    );
    const savedMinutes = Math.max(
      1,
      Math.round(records.reduce((acc, r) => acc + (r.summary.timeSavedSeconds || 60), 0) / 60)
    );
    return { total, spamBlocked, openTasks, savedMinutes };
  }, [records]);

  const handlePlaySummary = async () => {
    if (!selectedRecord || isSpeakingSummary) return;
    setIsSpeakingSummary(true);
    const textToSpeak = selectedRecord.summary[summaryLang] || selectedRecord.summary.English;
    await synthesizeAndPlaySpeech({
      text: textToSpeak,
      voiceName: settings.voiceName,
    });
    setIsSpeakingSummary(false);
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-slate-500">Calls Screened</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.total}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">English · हिन्दी · తెలుగు</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Spam & Loans Blocked</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.spamBlocked}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Zero phone ring interruptions</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Open Action Items</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.openTasks}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Extracted from caller turns</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Focus Time Saved</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.savedMinutes} min
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Automated call handling</div>
        </div>
      </div>

      {/* Main Split: Call List + Trilingual Summary Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <section className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search caller, language, parcel, number…"
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'action', label: 'Action Needed' },
                  { id: 'delivery', label: 'Deliveries' },
                  { id: 'spam', label: 'Spam' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    filter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
                <PhoneIncoming className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">No matching calls</h3>
              <p className="text-xs text-slate-500 mt-1">
                Screen an incoming call or clear your search filter to see transcripts and summaries.
              </p>
              <button
                type="button"
                onClick={onGoToLiveScreen}
                className="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
              >
                Screen a Sample Call
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filteredRecords.map((rec) => {
                const isSelected = selectedRecord?.id === rec.id;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedId(rec.id)}
                    className={`w-full p-4 sm:px-5 flex items-center justify-between gap-3 text-left transition-colors ${
                      isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <AvatarWithFallback
                        src={rec.callerAvatar}
                        alt={rec.callerName}
                        initials={rec.callerName}
                        sizeClass="w-10 h-10 mt-0.5"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {rec.callerName}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                          {rec.summary.headline}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                          <span>{rec.primaryLanguage}</span>
                          <span aria-hidden="true">·</span>
                          <span>{rec.outcome}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{rec.startedAt}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Detail Inspector */}
        <section className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6">
          {!selectedRecord ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Select a call from the inbox to inspect its trilingual brief and full transcript.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Caller Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3.5 min-w-0">
                  <AvatarWithFallback
                    src={selectedRecord.callerAvatar}
                    alt={selectedRecord.callerName}
                    initials={selectedRecord.callerName}
                    sizeClass="w-12 h-12"
                  />
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900 truncate">
                      {selectedRecord.callerName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-mono tabular-nums">{selectedRecord.callerNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedRecord.startedAt}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatSeconds(selectedRecord.durationSeconds)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedRecord.outcome}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteRecord(selectedRecord.id)}
                  aria-label="Delete call log"
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Trilingual Executive Summary */}
              <div className="space-y-3 pb-5 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">Executive Call Summary</div>
                    <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                      {selectedRecord.summary.headline}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                    {(
                      [
                        { id: SupportedLanguage.ENGLISH, label: 'English' },
                        { id: SupportedLanguage.HINDI, label: 'हिन्दी' },
                        { id: SupportedLanguage.TELUGU, label: 'తెలుగు' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSummaryLang(opt.id)}
                        className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                          summaryLang === opt.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-2xl p-4">
                  {selectedRecord.summary[summaryLang] || selectedRecord.summary.English}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Language: {selectedRecord.primaryLanguage}</span>
                    <span aria-hidden="true">·</span>
                    <span>Intent: {selectedRecord.intentCategory}</span>
                    <span aria-hidden="true">·</span>
                    <span>Verdict: {selectedRecord.summary.spamVerdict}</span>
                  </div>

                  <button
                    type="button"
                    disabled={isSpeakingSummary}
                    onClick={handlePlaySummary}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isSpeakingSummary ? 'Reading Aloud…' : `Read ${summaryLang} Summary`}</span>
                  </button>
                </div>
              </div>

              {/* Action Items */}
              {selectedRecord.actionItems.length > 0 && (
                <div className="space-y-2.5 pb-5 border-b border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-700">Follow-Up Action Items</h4>
                  <div className="space-y-2">
                    {selectedRecord.actionItems.map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => onToggleActionItem(selectedRecord.id, act.id)}
                        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center gap-3 text-left transition-colors"
                      >
                        {act.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            act.completed ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {act.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Bilingual Transcript */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-700">
                  Full Call Transcript ({selectedRecord.transcript.length} turns)
                </h4>
                <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
                  {selectedRecord.transcript.map((turn) => {
                    const sub = turn.translations?.[summaryLang];
                    const showSub =
                      sub && sub.trim().toLowerCase() !== turn.text.trim().toLowerCase();
                    return (
                      <div key={turn.id} className="pb-3 border-b border-slate-100 last:border-b-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span className="font-semibold text-slate-800">{turn.speakerLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>{turn.language}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{turn.timestamp}</span>
                        </div>
                        <p className="text-sm text-slate-900 leading-relaxed">{turn.text}</p>
                        {showSub && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {summaryLang}: {sub}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
