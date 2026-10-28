import React, { useEffect, useRef, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Languages,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AssistantSettings,
  CallerScenario,
  CallMode,
  CallRecord,
  CallStatus,
  LiveCallIntelligence,
  PlaybookRule,
  SupportedLanguage,
  TranscriptEntry,
} from '../types';
import { AVATAR_VAANI, CALLER_SCENARIOS } from '../data/initialData';
import { AvatarWithFallback } from './AvatarWithFallback';
import { stopCurrentSpeech, synthesizeAndPlaySpeech } from '../utils/audioPlayer';
import { useLiveVoiceCall } from '../hooks/useLiveVoiceCall';

interface LiveScreeningViewProps {
  settings: AssistantSettings;
  rules: PlaybookRule[];
  onUpdateReadingLang: (lang: SupportedLanguage) => void;
  onSaveCallRecord: (record: CallRecord) => void;
  externalTriggerCount: number;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function nowTimeStr(): string {
  return new Date().toTimeString().slice(0, 8);
}

export const LiveScreeningView: React.FC<LiveScreeningViewProps> = ({
  settings,
  rules,
  onUpdateReadingLang,
  onSaveCallRecord,
  externalTriggerCount,
}) => {
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [callMode, setCallMode] = useState<CallMode>(CallMode.SCENARIO);
  const [activeScenario, setActiveScenario] = useState<CallerScenario>(CALLER_SCENARIOS[0]);
  const [customCallerName, setCustomCallerName] = useState('Unknown Caller');
  const [customCallerNumber, setCustomCallerNumber] = useState('+91 98480 62910');

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [intel, setIntel] = useState<LiveCallIntelligence>({
    detectedLanguage: 'Auto-Detecting',
    intentCategory: 'Screening Caller',
    urgency: 'Normal',
    spamConfidence: 5,
    extractedFacts: [],
    otpGuardTriggered: false,
    suggestedWhispers: [
      'Ask what this call is regarding',
      'Say I am in a meeting, call after 5:30 PM',
      'Leave parcel at Tower B MyGate desk',
    ],
  });

  const [durationSec, setDurationSec] = useState(0);
  const [autoSpeakVoices, setAutoSpeakVoices] = useState(true);
  const [isBusyThinking, setIsBusyThinking] = useState(false);
  const [speakingTurnId, setSpeakingTurnId] = useState<string | null>(null);
  const [whisperInput, setWhisperInput] = useState('');
  const [callerCustomInput, setCallerCustomInput] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [secretNotice, setSecretNotice] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const liveAssistantBufferRef = useRef('');
  const liveCallerBufferRef = useRef('');

  const {
    isConnected: isLiveWsConnected,
    isMicMuted,
    audioLevel,
    startLiveCall,
    stopLiveCall,
    toggleMute,
    sendLiveWhisper,
    sendLiveCallerText,
  } = useLiveVoiceCall({
    onAssistantTextChunk: (chunk, isTurnComplete) => {
      if (chunk) {
        liveAssistantBufferRef.current += chunk;
        const textNow = liveAssistantBufferRef.current.trim();
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.id.startsWith('live-ai-streaming')) {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                text: textNow,
                translations: { English: textNow, Hindi: textNow, Telugu: textNow },
              },
            ];
          }
          return [
            ...prev,
            {
              id: `live-ai-streaming-${Date.now()}`,
              speaker: 'assistant',
              speakerLabel: `${settings.assistantName} AI`,
              text: textNow,
              language: intel.detectedLanguage || 'Multilingual',
              translations: { English: textNow, Hindi: textNow, Telugu: textNow },
              timestamp: nowTimeStr(),
            },
          ];
        });
      }
      if (isTurnComplete && liveAssistantBufferRef.current.trim()) {
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.id.startsWith('live-ai-streaming')) {
            return [...prev.slice(0, -1), { ...last, id: `live-ai-final-${Date.now()}` }];
          }
          return prev;
        });
        liveAssistantBufferRef.current = '';
      }
    },
    onCallerTextChunk: (chunk) => {
      if (!chunk) return;
      liveCallerBufferRef.current += chunk;
      const textNow = liveCallerBufferRef.current.trim();
      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.id.startsWith('live-caller-streaming')) {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              text: textNow,
              translations: { English: textNow, Hindi: textNow, Telugu: textNow },
            },
          ];
        }
        return [
          ...prev,
          {
            id: `live-caller-streaming-${Date.now()}`,
            speaker: 'caller',
            speakerLabel: customCallerName,
            text: textNow,
            language: 'Live Mic',
            translations: { English: textNow, Hindi: textNow, Telugu: textNow },
            timestamp: nowTimeStr(),
          },
        ];
      });
    },
    onIntelUpdate: (newIntel) => {
      setIntel((prev) => ({
        ...prev,
        detectedLanguage: newIntel.detectedLanguage || prev.detectedLanguage,
        intentCategory: newIntel.intentCategory || prev.intentCategory,
        urgency: newIntel.urgency || prev.urgency,
        spamConfidence:
          typeof newIntel.spamConfidence === 'number'
            ? newIntel.spamConfidence
            : prev.spamConfidence,
        extractedFacts: newIntel.extractedFact
          ? Array.from(new Set([...prev.extractedFacts, newIntel.extractedFact]))
          : prev.extractedFacts,
      }));
    },
    onSpamTerminated: () => {
      stopLiveCall();
      setCallStatus(CallStatus.BLOCKED);
    },
    onFallbackNotice: (notice) => {
      setSecretNotice(notice);
    },
    onError: (msg) => {
      setErrorBanner(msg);
    },
  });

  // External CTA button from header triggers immediate scenario screening if idle
  useEffect(() => {
    if (externalTriggerCount > 0 && callStatus === CallStatus.IDLE) {
      void launchScenarioCall(CALLER_SCENARIOS[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTriggerCount]);

  // Call duration timer
  useEffect(() => {
    if (callStatus !== CallStatus.SCREENING && callStatus !== CallStatus.OWNER_JOINED) {
      return;
    }
    const timer = window.setInterval(() => {
      setDurationSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callStatus]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [transcript, isBusyThinking]);

  const speakTurn = async (turnId: string, text: string, voiceName: string) => {
    if (!autoSpeakVoices) return;
    setSpeakingTurnId(turnId);
    await synthesizeAndPlaySpeech({ text, voiceName });
    setSpeakingTurnId((curr) => (curr === turnId ? null : curr));
  };

  // Start a realistic Multilingual Scenario Call (Telugu / Hindi / English / Spam)
  const launchScenarioCall = async (scenario: CallerScenario) => {
    stopLiveCall();
    stopCurrentSpeech();
    setErrorBanner(null);
    setActiveScenario(scenario);
    setCallMode(CallMode.SCENARIO);
    setTranscript([]);
    setDurationSec(0);
    setIntel({
      detectedLanguage: scenario.primaryLanguage,
      intentCategory: 'Incoming Screening',
      urgency: 'Normal',
      spamConfidence: scenario.id.includes('spam') ? 68 : 6,
      extractedFacts: [],
      otpGuardTriggered: false,
      suggestedWhispers: [
        'Ask who is calling and why',
        'Leave parcel at Tower B MyGate desk',
        'Ask them to call back after 5:30 PM',
      ],
    });
    setCallStatus(CallStatus.SCREENING);
    setIsBusyThinking(true);

    try {
      // Step 1: AI Assistant picks up the phone
      const greetRes = await fetch('/api/call/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          rules,
          callerName: scenario.callerName,
          callerNumber: scenario.callerNumber,
          history: [],
          isOpeningGreeting: true,
        }),
      });
      const greetData = await greetRes.json();
      if (!greetRes.ok) throw new Error(greetData.error || 'Greeting failed');
      if (greetData.geminiConfigured === false) {
        setSecretNotice(
          'Local multilingual call engine active. Check or select GEMINI_API_KEY in Settings > Secrets for full Gemini Live neural voice.'
        );
      } else {
        setSecretNotice(null);
      }

      const aiOpenId = `turn-open-${Date.now()}`;
      const openTurn: TranscriptEntry = {
        id: aiOpenId,
        speaker: 'assistant',
        speakerLabel: `${settings.assistantName} AI`,
        text: greetData.assistantReply,
        language: greetData.replyLanguage || 'English',
        translations: greetData.assistantTranslations || {
          English: greetData.assistantReply,
          Hindi: greetData.assistantReply,
          Telugu: greetData.assistantReply,
        },
        timestamp: nowTimeStr(),
      };
      setTranscript([openTurn]);

      if (autoSpeakVoices) {
        await speakTurn(aiOpenId, openTurn.text, settings.voiceName);
      }

      // Step 2: Caller speaks their opening line in Telugu / Hindi / English
      const callerTurnId = `turn-caller-1-${Date.now()}`;
      const callerTurn: TranscriptEntry = {
        id: callerTurnId,
        speaker: 'caller',
        speakerLabel: scenario.callerName,
        text: scenario.openingLine,
        language: scenario.primaryLanguage,
        translations: scenario.openingTranslations,
        timestamp: nowTimeStr(),
      };
      const updatedHistory = [openTurn, callerTurn];
      setTranscript(updatedHistory);

      if (autoSpeakVoices) {
        await speakTurn(callerTurnId, callerTurn.text, scenario.callerVoice);
      }

      // Step 3: Vaani analyzes caller's native Telugu/Hindi/English turn and responds in that language!
      await processAssistantReply(updatedHistory, scenario.openingLine, undefined, scenario);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to start AI screening.');
      setIsBusyThinking(false);
    }
  };

  const processAssistantReply = async (
    currentHistory: TranscriptEntry[],
    callerUtterance?: string,
    ownerWhisper?: string,
    scenarioOverride?: CallerScenario
  ) => {
    const scen = scenarioOverride || activeScenario;
    setIsBusyThinking(true);
    try {
      const res = await fetch('/api/call/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          rules,
          callerName: scen.callerName,
          callerNumber: scen.callerNumber,
          history: currentHistory.map((h) => ({ speaker: h.speaker, text: h.text })),
          callerUtterance,
          ownerWhisper,
          isOpeningGreeting: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assistant response failed');
      if (data.geminiConfigured === true) {
        setSecretNotice(null);
      }

      // Update caller translations if callerUtterance was custom-typed
      let nextList = [...currentHistory];
      if (callerUtterance && data.callerTranslations && nextList.length > 0) {
        const lastIdx = nextList.length - 1;
        if (nextList[lastIdx].speaker === 'caller') {
          nextList[lastIdx] = {
            ...nextList[lastIdx],
            translations: data.callerTranslations,
          };
        }
      }

      const aiTurnId = `turn-ai-${Date.now()}`;
      const aiTurn: TranscriptEntry = {
        id: aiTurnId,
        speaker: 'assistant',
        speakerLabel: `${settings.assistantName} AI`,
        text: data.assistantReply,
        language: data.replyLanguage || data.detectedLanguage || 'English',
        translations: data.assistantTranslations || {
          English: data.assistantReply,
          Hindi: data.assistantReply,
          Telugu: data.assistantReply,
        },
        timestamp: nowTimeStr(),
      };

      nextList = [...nextList, aiTurn];
      setTranscript(nextList);

      const newSpam = typeof data.spamConfidence === 'number' ? data.spamConfidence : 5;
      setIntel({
        detectedLanguage: data.detectedLanguage || scen.primaryLanguage,
        intentCategory: data.intentCategory || 'General Inquiry',
        urgency: data.urgency || 'Normal',
        spamConfidence: newSpam,
        extractedFacts: Array.isArray(data.extractedFacts) ? data.extractedFacts : [],
        otpGuardTriggered: Boolean(data.otpGuardTriggered),
        suggestedWhispers:
          Array.isArray(data.suggestedWhispers) && data.suggestedWhispers.length > 0
            ? data.suggestedWhispers
            : intel.suggestedWhispers,
      });

      setIsBusyThinking(false);

      if (autoSpeakVoices) {
        await speakTurn(aiTurnId, aiTurn.text, settings.voiceName);
      }

      if (settings.autoBlockHighSpam && newSpam >= 85) {
        setCallStatus(CallStatus.BLOCKED);
      }
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Assistant failed to respond.');
      setIsBusyThinking(false);
    }
  };

  // Let simulated caller dynamically reply to Vaani's latest question/instruction!
  const handleSimulateNextCallerTurn = async () => {
    if (isBusyThinking || callStatus !== CallStatus.SCREENING) return;
    setIsBusyThinking(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/call/simulate-caller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaPrompt: activeScenario.personaPrompt,
          primaryLanguage: activeScenario.primaryLanguage,
          history: transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not simulate caller turn');

      const callerId = `turn-caller-${Date.now()}`;
      const newCallerTurn: TranscriptEntry = {
        id: callerId,
        speaker: 'caller',
        speakerLabel: activeScenario.callerName,
        text: data.callerText,
        language: data.language || activeScenario.primaryLanguage,
        translations: data.translations || {
          English: data.callerText,
          Hindi: data.callerText,
          Telugu: data.callerText,
        },
        timestamp: nowTimeStr(),
      };
      const updated = [...transcript, newCallerTurn];
      setTranscript(updated);

      if (autoSpeakVoices) {
        await speakTurn(callerId, newCallerTurn.text, activeScenario.callerVoice);
      }

      await processAssistantReply(updated, newCallerTurn.text);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Caller simulation failed.');
      setIsBusyThinking(false);
    }
  };

  // Custom message spoken/typed AS the caller (in English, Hindi, or Telugu)
  const handleCustomCallerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = callerCustomInput.trim();
    if (!text || isBusyThinking) return;
    setCallerCustomInput('');

    if (callMode === CallMode.LIVE_MIC && isLiveWsConnected) {
      liveCallerBufferRef.current = '';
      setTranscript((prev) => [
        ...prev,
        {
          id: `live-caller-typed-${Date.now()}`,
          speaker: 'caller',
          speakerLabel: customCallerName,
          text,
          language: 'Typed Input',
          translations: { English: text, Hindi: text, Telugu: text },
          timestamp: nowTimeStr(),
        },
      ]);
      sendLiveCallerText(text);
      return;
    }

    if (callStatus === CallStatus.OWNER_JOINED) {
      // Owner is directly conversing with caller
      setTranscript((prev) => [
        ...prev,
        {
          id: `owner-direct-${Date.now()}`,
          speaker: 'owner',
          speakerLabel: `${settings.ownerName} (You)`,
          text,
          language: 'Owner',
          translations: { English: text, Hindi: text, Telugu: text },
          timestamp: nowTimeStr(),
        },
      ]);
      return;
    }

    const callerTurn: TranscriptEntry = {
      id: `turn-custom-caller-${Date.now()}`,
      speaker: 'caller',
      speakerLabel: activeScenario.callerName,
      text,
      language: 'Caller',
      translations: { English: text, Hindi: text, Telugu: text },
      timestamp: nowTimeStr(),
    };
    const updated = [...transcript, callerTurn];
    setTranscript(updated);
    await processAssistantReply(updated, text);
  };

  // Owner sends a live Whisper / Nudge to Vaani mid-call!
  const handleSendWhisper = async (instructionText: string) => {
    const clean = instructionText.trim();
    if (!clean || isBusyThinking) return;
    setWhisperInput('');
    liveCallerBufferRef.current = '';

    const whisperEntry: TranscriptEntry = {
      id: `whisper-${Date.now()}`,
      speaker: 'whisper',
      speakerLabel: 'Your Whisper to AI',
      text: clean,
      language: 'Owner Whisper',
      translations: { English: clean, Hindi: clean, Telugu: clean },
      timestamp: nowTimeStr(),
    };

    const nextHistory = [...transcript, whisperEntry];
    setTranscript(nextHistory);

    if (callMode === CallMode.LIVE_MIC && isLiveWsConnected) {
      sendLiveWhisper(clean);
      return;
    }

    await processAssistantReply(nextHistory, undefined, clean);
  };

  // Start Live Real-Time Microphone Voice Call (Gemini 3.8 Live API)
  const handleStartLiveMicMode = async () => {
    stopCurrentSpeech();
    setErrorBanner(null);
    liveAssistantBufferRef.current = '';
    liveCallerBufferRef.current = '';
    setCallMode(CallMode.LIVE_MIC);
    setTranscript([]);
    setDurationSec(0);
    setIntel({
      detectedLanguage: 'Listening (EN / HI / TE)',
      intentCategory: 'Live Voice Screening',
      urgency: 'Normal',
      spamConfidence: 0,
      extractedFacts: ['Real-time Gemini 3.8 Live duplex voice active'],
      otpGuardTriggered: false,
      suggestedWhispers: [
        'Ask for their callback number',
        'Tell them to leave parcel at security desk',
        'Say I can talk after 5:30 PM today',
      ],
    });
    setCallStatus(CallStatus.SCREENING);
    await startLiveCall({
      settings,
      rules,
      callerName: customCallerName,
      callerNumber: customCallerNumber,
    });
  };

  // Finalize call & save structured Trilingual Intelligence Record to Inbox
  const handleFinishAndSaveCall = async (forcedOutcome?: CallRecord['outcome']) => {
    stopLiveCall();
    stopCurrentSpeech();
    const finalStatus =
      forcedOutcome === 'Spam Blocked' ? CallStatus.BLOCKED : CallStatus.ENDED;
    setCallStatus(finalStatus);

    if (transcript.length === 0) return;

    setIsBusyThinking(true);
    const displayCallerName =
      callMode === CallMode.LIVE_MIC ? customCallerName : activeScenario.callerName;
    const displayCallerNum =
      callMode === CallMode.LIVE_MIC ? customCallerNumber : activeScenario.callerNumber;

    try {
      const res = await fetch('/api/call/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          callerName: displayCallerName,
          callerNumber: displayCallerNum,
          durationSeconds: Math.max(durationSec, 12),
        }),
      });
      const sumData = await res.json();

      const record: CallRecord = {
        id: `call-${Date.now()}`,
        callerName: displayCallerName,
        callerNumber: displayCallerNum,
        callerAvatar: callMode === CallMode.SCENARIO ? activeScenario.avatar : undefined,
        startedAt: `Today · ${new Date().toTimeString().slice(0, 5)}`,
        durationSeconds: Math.max(durationSec, 12),
        outcome:
          forcedOutcome ||
          (intel.spamConfidence >= 80
            ? 'Spam Blocked'
            : callStatus === CallStatus.OWNER_JOINED
              ? 'Owner Joined'
              : Array.isArray(sumData.actionItems) && sumData.actionItems.length > 0
                ? 'Action Needed'
                : 'AI Handled'),
        primaryLanguage: sumData.primaryLanguage || intel.detectedLanguage || 'English',
        intentCategory: sumData.intentCategory || intel.intentCategory || 'General',
        urgency: intel.urgency,
        spamConfidence: intel.spamConfidence,
        transcript,
        extractedFacts:
          Array.isArray(sumData.extractedFacts) && sumData.extractedFacts.length > 0
            ? sumData.extractedFacts
            : intel.extractedFacts,
        actionItems: Array.isArray(sumData.actionItems)
          ? sumData.actionItems.map((txt: string, i: number) => ({
              id: `act-${Date.now()}-${i}`,
              text: txt,
              completed: false,
            }))
          : [],
        summary: {
          headline: sumData.headline || `${displayCallerName} call screened by ${settings.assistantName}`,
          English: sumData.English || 'Call screened and logged successfully.',
          Hindi: sumData.Hindi || 'कॉल सफलतापूर्वक स्क्रीन और रिकॉर्ड की गई।',
          Telugu: sumData.Telugu || 'కాల్ విజయవంతంగా స్క్రీన్ చేయబడి నమోదు చేయబడింది.',
          sentiment: sumData.sentiment || 'Polite',
          spamVerdict: sumData.spamVerdict || 'Safe',
          timeSavedSeconds: Math.max(60, durationSec * 2),
        },
      };

      onSaveCallRecord(record);
    } catch {
      // Save fallback record even if network summary fails
      onSaveCallRecord({
        id: `call-${Date.now()}`,
        callerName: displayCallerName,
        callerNumber: displayCallerNum,
        startedAt: `Today · ${new Date().toTimeString().slice(0, 5)}`,
        durationSeconds: Math.max(durationSec, 12),
        outcome: forcedOutcome || 'AI Handled',
        primaryLanguage: intel.detectedLanguage,
        intentCategory: intel.intentCategory,
        urgency: intel.urgency,
        spamConfidence: intel.spamConfidence,
        transcript,
        extractedFacts: intel.extractedFacts,
        actionItems: [],
        summary: {
          headline: `Call with ${displayCallerName} handled`,
          English: 'Transcript saved to your call inbox.',
          Hindi: 'ट्रांसक्रिप्ट आपके कॉल इनबॉक्स में सहेजा गया है।',
          Telugu: 'ట్రాన్స్‌క్రిప్ట్ మీ కాల్ ఇన్‌బాక్స్‌లో సేవ్ చేయబడింది.',
          sentiment: 'Polite',
          spamVerdict: forcedOutcome === 'Spam Blocked' ? 'Suspected Spam' : 'Safe',
          timeSavedSeconds: 60,
        },
      });
    } finally {
      setIsBusyThinking(false);
    }
  };

  const activeCallerTitle =
    callMode === CallMode.LIVE_MIC ? customCallerName : activeScenario.callerName;
  const activeCallerPhone =
    callMode === CallMode.LIVE_MIC ? customCallerNumber : activeScenario.callerNumber;
  const isCallActive =
    callStatus === CallStatus.SCREENING || callStatus === CallStatus.OWNER_JOINED;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT / PRIMARY COLUMN: Live Call Screening Console */}
      <section className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 overflow-hidden">
        {/* Call Console Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-slate-900 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <AvatarWithFallback
                src={callMode === CallMode.SCENARIO ? activeScenario.avatar : AVATAR_VAANI}
                alt={activeCallerTitle}
                initials={activeCallerTitle}
                sizeClass="w-12 h-12"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span>
                    {callStatus === CallStatus.IDLE
                      ? 'Ready to Screen Incoming Calls'
                      : callStatus === CallStatus.SCREENING
                        ? `${settings.assistantName} AI Answering Call`
                        : callStatus === CallStatus.OWNER_JOINED
                          ? 'You Joined the Call'
                          : callStatus === CallStatus.BLOCKED
                            ? 'Spam Call Blocked & Terminated'
                            : 'Call Completed & Summarized'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{formatDuration(durationSec)}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-wide truncate mt-0.5">
                  {callStatus === CallStatus.IDLE
                    ? `${settings.assistantName} Multilingual Shield`
                    : activeCallerTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                  <span className="font-mono tabular-nums">{activeCallerPhone}</span>
                  <span aria-hidden="true">·</span>
                  <span>{intel.detectedLanguage}</span>
                  <span aria-hidden="true">·</span>
                  <span>{intel.intentCategory}</span>
                </div>
              </div>
            </div>

            {/* Audio Mute / Auto-Voice Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              {callMode === CallMode.LIVE_MIC && isCallActive ? (
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                    isMicMuted
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                  }`}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isMicMuted ? 'Mic Muted' : 'Mic Live'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (autoSpeakVoices) stopCurrentSpeech();
                    setAutoSpeakVoices((v) => !v);
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-100 hover:bg-slate-700 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  {autoSpeakVoices ? (
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                  <span>{autoSpeakVoices ? 'Voice Audio On' : 'Voice Muted'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Real Acoustic Activity Bars when live mic or TTS speech is active */}
          {(isLiveWsConnected || speakingTurnId) && (
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-300">
                {isLiveWsConnected
                  ? 'Speak in English, हिन्दी, or తెలుగు — Vaani responds live'
                  : 'Playing synthesized phone audio'}
              </span>
              <div className="flex items-end gap-1 h-4" aria-hidden="true">
                {[0.5, 0.9, 1.3, 0.8, 1.1, 0.6].map((mult, idx) => {
                  const activeHeight = isLiveWsConnected
                    ? Math.max(4, Math.min(16, Math.round((audioLevel || 0.18) * 16 * mult)))
                    : Math.max(5, Math.round(12 * mult));
                  return (
                    <span
                      key={idx}
                      className="w-1 bg-indigo-400 rounded-full transition-transform duration-150"
                      style={{ height: `${activeHeight}px` }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Translation Subtitles Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Languages className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Live Subtitle Translation:</span>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
            {(
              [
                { id: SupportedLanguage.ENGLISH, label: 'English' },
                { id: SupportedLanguage.HINDI, label: 'हिन्दी' },
                { id: SupportedLanguage.TELUGU, label: 'తెలుగు' },
              ] as const
            ).map((langOpt) => (
              <button
                key={langOpt.id}
                type="button"
                onClick={() => onUpdateReadingLang(langOpt.id)}
                className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  settings.preferredReadingLang === langOpt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {langOpt.label}
              </button>
            ))}
          </div>
        </div>

        {secretNotice && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200/80 text-xs text-amber-900 flex items-center justify-between gap-3">
            <span>{secretNotice}</span>
            <button
              type="button"
              onClick={() => setSecretNotice(null)}
              className="font-semibold underline whitespace-nowrap shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {errorBanner && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-200 text-xs text-red-800 flex items-center justify-between gap-3">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="font-semibold underline whitespace-nowrap shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Live Transcript Feed */}
        <div className="p-5 sm:p-6 min-h-[340px] max-h-[460px] overflow-y-auto space-y-5">
          {transcript.length === 0 && !isBusyThinking ? (
            <div className="py-12 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-4">
                <PhoneIncoming className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900" style={{ textWrap: 'balance' }}>
                Screen calls in English, हिन्दी, and తెలుగు without picking up
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Launch a realistic Telugu delivery, Hindi banking, or English work call on the right,
                or start a live microphone call to speak directly with {settings.assistantName}.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => launchScenarioCall(CALLER_SCENARIOS[0])}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
                >
                  Test Telugu Delivery Call
                </button>
                <button
                  type="button"
                  onClick={handleStartLiveMicMode}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Mic className="w-4 h-4" />
                  <span>Speak Live via Mic</span>
                </button>
              </div>
            </div>
          ) : (
            transcript.map((item) => {
              if (item.speaker === 'whisper') {
                return (
                  <div key={item.id} className="flex justify-center">
                    <div className="max-w-md rounded-xl bg-amber-50 border border-amber-200/80 px-4 py-2.5 text-xs text-amber-950">
                      <span className="font-semibold">Whispered to {settings.assistantName}:</span>{' '}
                      <span>“{item.text}”</span>
                    </div>
                  </div>
                );
              }

              const isAssistantOrOwner =
                item.speaker === 'assistant' || item.speaker === 'owner';
              const preferredText = item.translations?.[settings.preferredReadingLang];
              const showSubtitle =
                preferredText &&
                preferredText.trim().toLowerCase() !== item.text.trim().toLowerCase();

              return (
                <div
                  key={item.id}
                  className={`flex flex-col ${isAssistantOrOwner ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 px-1">
                    <span className="font-medium text-slate-700">{item.speakerLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.language}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{item.timestamp}</span>
                    <button
                      type="button"
                      onClick={() =>
                        synthesizeAndPlaySpeech({
                          text: item.text,
                          voiceName: isAssistantOrOwner
                            ? settings.voiceName
                            : activeScenario.callerVoice,
                        })
                      }
                      aria-label="Replay spoken audio"
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      item.speaker === 'owner'
                        ? 'bg-emerald-700 text-white'
                        : isAssistantOrOwner
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p>{item.text}</p>
                    {showSubtitle && (
                      <p
                        className={`mt-2 pt-2 border-t text-xs leading-relaxed ${
                          isAssistantOrOwner
                            ? 'border-slate-700 text-slate-300'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-medium">{settings.preferredReadingLang}:</span>{' '}
                        {preferredText}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isBusyThinking && (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <span className="font-medium text-indigo-600">
                {settings.assistantName} is processing multilingual audio & context…
              </span>
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Owner Live Whisper & Call Controls (Shown whenever call is active) */}
        {isCallActive && (
          <div className="p-5 bg-slate-50 border-t border-slate-200/80 space-y-4">
            {/* 1-Tap Context-Aware Smart Whispers */}
            {callStatus === CallStatus.SCREENING && (
              <div>
                <div className="text-xs font-medium text-slate-600 mb-2">
                  Whisper instruction to {settings.assistantName} (spoken in caller’s language):
                </div>
                <div className="flex flex-wrap gap-2">
                  {intel.suggestedWhispers.map((w, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isBusyThinking}
                      onClick={() => handleSendWhisper(w)}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 hover:border-indigo-400 hover:text-indigo-700 transition-colors disabled:opacity-50 text-left"
                    >
                      {w}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendWhisper(whisperInput);
                  }}
                  className="mt-2.5 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={whisperInput}
                    onChange={(e) => setWhisperInput(e.target.value)}
                    placeholder={`Whisper to ${settings.assistantName} in English, हिन्दी, or తెలుగు…`}
                    className="flex-1 min-h-[44px] rounded-xl bg-white border border-slate-200 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="submit"
                    disabled={!whisperInput.trim() || isBusyThinking}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Whisper</span>
                  </button>
                </form>
              </div>
            )}

            {/* Caller Interactive Simulator Bar (Scenario Mode or Owner Direct Mode) */}
            <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  {callMode === CallMode.LIVE_MIC
                    ? 'Speak into your mic or type as the caller below:'
                    : callStatus === CallStatus.OWNER_JOINED
                      ? 'You took over the call — speak/type directly:'
                      : 'Test caller response:'}
                </span>
                {callMode === CallMode.SCENARIO && callStatus === CallStatus.SCREENING && (
                  <button
                    type="button"
                    disabled={isBusyThinking}
                    onClick={handleSimulateNextCallerTurn}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300/70 text-xs font-semibold text-slate-900 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    Simulate Caller’s Next {activeScenario.primaryLanguage} Reply
                  </button>
                )}
              </div>

              <form onSubmit={handleCustomCallerSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={callerCustomInput}
                  onChange={(e) => setCallerCustomInput(e.target.value)}
                  placeholder={
                    callStatus === CallStatus.OWNER_JOINED
                      ? 'Type what you say to the caller…'
                      : 'Or type custom words as the caller (EN / हिन्दी / తెలుగు)…'
                  }
                  className="flex-1 min-h-[44px] rounded-xl bg-white border border-slate-200 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                />
                <button
                  type="submit"
                  disabled={!callerCustomInput.trim() || isBusyThinking}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                >
                  Send Turn
                </button>
              </form>
            </div>

            {/* Bottom Call Action Controls */}
            <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {callStatus === CallStatus.SCREENING && (
                <button
                  type="button"
                  onClick={() => {
                    stopLiveCall();
                    setCallStatus(CallStatus.OWNER_JOINED);
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Take Over Call</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleFinishAndSaveCall()}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End & Summarize</span>
              </button>

              <button
                type="button"
                onClick={() => handleFinishAndSaveCall('Spam Blocked')}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Ban className="w-4 h-4" />
                <span>Block Spam</span>
              </button>
            </div>
          </div>
        )}

        {/* Post-Call Saved Banner */}
        {(callStatus === CallStatus.ENDED || callStatus === CallStatus.BLOCKED) && (
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>
                {callStatus === CallStatus.BLOCKED
                  ? 'Caller blocked and logged in Call Inbox.'
                  : 'Trilingual summary & action items saved to Call Inbox.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCallStatus(CallStatus.IDLE)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Reset Screen
            </button>
          </div>
        )}
      </section>

      {/* RIGHT COLUMN: Live Microphone Call + Scenario Launcher + Real-Time Call Intelligence */}
      <aside className="lg:col-span-5 space-y-6">
        {/* Live Intelligence Readout */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Real-Time Call Intelligence
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live intent, language, and OTP security guardrails
              </p>
            </div>
            {intel.spamConfidence >= 70 ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                <ShieldAlert className="w-4 h-4" />
                <span>High Spam Risk</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
                <span>OTP Shield Active</span>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Detected Language</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{intel.detectedLanguage}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Caller Intent</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{intel.intentCategory}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Priority Level</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{intel.urgency}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Spam Probability</dt>
              <dd className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                {intel.spamConfidence}%
              </dd>
            </div>
          </dl>

          <div className="pt-4">
            <h4 className="text-xs font-medium text-slate-500 mb-2">
              Extracted Key Details ({intel.extractedFacts.length})
            </h4>
            {intel.extractedFacts.length === 0 ? (
              <p className="text-xs text-slate-500">
                Key entities (courier name, gate number, callback times, reference IDs) appear here
                automatically as the caller speaks.
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs text-slate-800">
                {intel.extractedFacts.map((fact, idx) => (
                  <li key={idx} className="leading-relaxed">
                    • {fact}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Real-Time Duplex Voice Call via Microphone (Gemini 3.8 Live) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Speak Live as Any Caller (Microphone)
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Test {settings.assistantName} with your own voice in English, हिन्दी, or తెలుగు using
            low-latency Gemini Live audio.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
            <input
              type="text"
              value={customCallerName}
              onChange={(e) => setCustomCallerName(e.target.value)}
              placeholder="Caller name"
              className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
            <input
              type="text"
              value={customCallerNumber}
              onChange={(e) => setCustomCallerNumber(e.target.value)}
              placeholder="+91 number"
              className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (callMode === CallMode.LIVE_MIC && isCallActive) {
                void handleFinishAndSaveCall();
              } else {
                void handleStartLiveMicMode();
              }
            }}
            className={`mt-3 w-full min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              callMode === CallMode.LIVE_MIC && isCallActive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {callMode === CallMode.LIVE_MIC && isCallActive ? (
              <>
                <PhoneOff className="w-4 h-4" />
                <span>End Live Microphone Call</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Start Live Voice Call (EN / HI / TE)</span>
              </>
            )}
          </button>
        </div>

        {/* 1-Tap Multilingual Incoming Call Scenarios */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Simulate Incoming Multilingual Calls
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Tap a caller below to watch and hear {settings.assistantName} answer in their language:
          </p>

          <div className="mt-4 divide-y divide-slate-100">
            {CALLER_SCENARIOS.map((scen) => {
              const isSelected =
                isCallActive && callMode === CallMode.SCENARIO && activeScenario.id === scen.id;
              return (
                <button
                  key={scen.id}
                  type="button"
                  disabled={isBusyThinking}
                  onClick={() => launchScenarioCall(scen)}
                  className="w-full py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left hover:bg-slate-50/90 rounded-xl px-2 -mx-2 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarWithFallback
                      src={scen.avatar}
                      alt={scen.callerName}
                      initials={scen.callerName}
                      sizeClass="w-10 h-10"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {scen.callerName}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mt-0.5">
                        <span>{scen.nativeBadge}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{scen.callerRole}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                    <Phone className="w-4 h-4" />
                    <span>{isSelected ? 'Active' : 'Ring'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};
