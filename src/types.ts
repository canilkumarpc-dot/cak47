export enum SupportedLanguage {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  TELUGU = 'Telugu',
}

export enum CallStatus {
  IDLE = 'IDLE',
  RINGING = 'RINGING',
  SCREENING = 'SCREENING',
  OWNER_JOINED = 'OWNER_JOINED',
  ENDED = 'ENDED',
  BLOCKED = 'BLOCKED',
}

export enum CallMode {
  SCENARIO = 'SCENARIO',
  LIVE_MIC = 'LIVE_MIC',
}

export interface TranscriptEntry {
  id: string;
  speaker: 'assistant' | 'caller' | 'owner' | 'whisper';
  speakerLabel: string;
  text: string;
  language: string;
  translations: {
    English: string;
    Hindi: string;
    Telugu: string;
  };
  timestamp: string;
  audioBase64?: string;
}

export interface LiveCallIntelligence {
  detectedLanguage: string;
  intentCategory: string;
  urgency: 'Low' | 'Normal' | 'High' | 'Critical';
  spamConfidence: number;
  extractedFacts: string[];
  otpGuardTriggered: boolean;
  suggestedWhispers: string[];
}

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TrilingualSummary {
  headline: string;
  English: string;
  Hindi: string;
  Telugu: string;
  sentiment: string;
  spamVerdict: 'Safe' | 'Marketing' | 'Suspected Spam';
  timeSavedSeconds: number;
}

export interface CallRecord {
  id: string;
  callerName: string;
  callerNumber: string;
  callerAvatar?: string;
  startedAt: string;
  durationSeconds: number;
  outcome: 'AI Handled' | 'Action Needed' | 'Owner Joined' | 'Spam Blocked';
  primaryLanguage: string;
  intentCategory: string;
  urgency: 'Low' | 'Normal' | 'High' | 'Critical';
  spamConfidence: number;
  transcript: TranscriptEntry[];
  extractedFacts: string[];
  actionItems: ActionItem[];
  summary: TrilingualSummary;
}

export interface PlaybookRule {
  id: string;
  title: string;
  category: 'Delivery' | 'Security' | 'Spam' | 'VIP' | 'Scheduling';
  instruction: string;
  enabled: boolean;
}

export interface AssistantSettings {
  ownerName: string;
  assistantName: string;
  voiceName: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
  statusMode: 'Deep Work' | 'In a Meeting' | 'Driving' | 'After Hours';
  customContextNote: string;
  greetingMode: 'Trilingual Auto' | 'English First' | 'Hindi First' | 'Telugu First';
  preferredReadingLang: SupportedLanguage;
  autoBlockHighSpam: boolean;
  carrier: 'Jio' | 'Airtel' | 'Vi' | 'BSNL';
  virtualBridgeNumber: string;
}

export interface CallerScenario {
  id: string;
  callerName: string;
  callerNumber: string;
  callerRole: string;
  primaryLanguage: string;
  nativeBadge: string;
  callerVoice: 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr';
  avatar?: string;
  personaPrompt: string;
  openingLine: string;
  openingTranslations: {
    English: string;
    Hindi: string;
    Telugu: string;
  };
}
