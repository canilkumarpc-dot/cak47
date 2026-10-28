import { useCallback, useEffect, useRef, useState } from 'react';
import { AssistantSettings, PlaybookRule } from '../types';
import { stopCurrentSpeech, synthesizeAndPlaySpeech } from '../utils/audioPlayer';

interface LiveVoiceCallbacks {
  onAssistantTextChunk: (text: string, isTurnComplete: boolean) => void;
  onCallerTextChunk: (text: string) => void;
  onIntelUpdate: (intel: {
    detectedLanguage?: string;
    intentCategory?: string;
    urgency?: 'Low' | 'Normal' | 'High' | 'Critical';
    spamConfidence?: number;
    extractedFact?: string;
  }) => void;
  onSpamTerminated: (reason: string) => void;
  onFallbackNotice?: (notice: string) => void;
  onError: (message: string) => void;
}

function float32ToBase64Pcm16(float32: Float32Array): string {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }
  return float32;
}

export function useLiveVoiceCall(callbacks: LiveVoiceCallbacks) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const fallbackModeRef = useRef(false);
  const sessionConfigRef = useRef<{
    settings: AssistantSettings;
    rules: PlaybookRule[];
    callerName: string;
    callerNumber: string;
  } | null>(null);

  const mutedRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const clearPlaybackQueue = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // Ignore
      }
    }
    activeSourcesRef.current.clear();
    if (outputCtxRef.current) {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
  }, []);

  const stopLiveCall = useCallback(() => {
    clearPlaybackQueue();
    stopCurrentSpeech();
    fallbackModeRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      inputCtxRef.current.close().catch(() => {});
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      outputCtxRef.current.close().catch(() => {});
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }
    setIsConnected(false);
    setAudioLevel(0);
  }, [clearPlaybackQueue]);

  const runFallbackTurn = useCallback(
    async (opts: {
      callerUtterance?: string;
      ownerWhisper?: string;
      isOpeningGreeting?: boolean;
    }) => {
      const cfg = sessionConfigRef.current;
      if (!cfg) return;
      try {
        const res = await fetch('/api/call/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: cfg.settings,
            rules: cfg.rules,
            callerName: cfg.callerName,
            callerNumber: cfg.callerNumber,
            history: [],
            callerUtterance: opts.callerUtterance,
            ownerWhisper: opts.ownerWhisper,
            isOpeningGreeting: opts.isOpeningGreeting,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.assistantReply) {
          callbacksRef.current.onAssistantTextChunk(data.assistantReply, true);
          callbacksRef.current.onIntelUpdate({
            detectedLanguage: data.detectedLanguage,
            intentCategory: data.intentCategory,
            urgency: data.urgency,
            spamConfidence: data.spamConfidence,
            extractedFact: data.extractedFacts?.[0],
          });
          await synthesizeAndPlaySpeech({
            text: data.assistantReply,
            voiceName: cfg.settings.voiceName,
          });
        }
      } catch {
        // Ignore
      }
    },
    []
  );

  const activateBrowserSpeechFallback = useCallback(() => {
    fallbackModeRef.current = true;
    setIsConnected(true);
    void runFallbackTurn({ isOpeningGreeting: true });

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec() as {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((ev: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
        start: () => void;
        stop: () => void;
      };
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-IN';
      rec.onresult = (event) => {
        if (mutedRef.current) return;
        const idx = event.results.length - 1;
        const result = event.results[idx];
        if (result?.isFinal && result[0]?.transcript) {
          const spoken = result[0].transcript.trim();
          if (spoken) {
            callbacksRef.current.onCallerTextChunk(spoken + ' ');
            void runFallbackTurn({ callerUtterance: spoken });
          }
        }
      };
      rec.start();
      recognitionRef.current = rec;
    } catch {
      // Ignore browser recognition unsupported error
    }
  }, [runFallbackTurn]);

  const startLiveCall = useCallback(
    async (params: {
      settings: AssistantSettings;
      rules: PlaybookRule[];
      callerName: string;
      callerNumber: string;
    }) => {
      stopLiveCall();
      sessionConfigRef.current = params;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;

        const inputCtx = new AudioContext({ sampleRate: 16000 });
        const outputCtx = new AudioContext({ sampleRate: 24000 });
        inputCtxRef.current = inputCtx;
        outputCtxRef.current = outputCtx;
        nextStartTimeRef.current = outputCtx.currentTime;

        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${proto}//${window.location.host}/ws/live-call`);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'start',
              config: {
                ownerName: params.settings.ownerName,
                assistantName: params.settings.assistantName,
                voiceName: params.settings.voiceName,
                statusMode: params.settings.statusMode,
                customContextNote: params.settings.customContextNote,
                greetingMode: params.settings.greetingMode,
                rules: params.rules,
                callerName: params.callerName,
                callerNumber: params.callerNumber,
              },
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'fallbackSpeechMode') {
              callbacksRef.current.onFallbackNotice?.(
                msg.info ||
                  'Select your GEMINI_API_KEY in Settings > Secrets to enable full Gemini Live duplex neural audio.'
              );
              activateBrowserSpeechFallback();
              return;
            }
            if (msg.type === 'ready') {
              setIsConnected(true);
              const source = inputCtx.createMediaStreamSource(stream);
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                if (mutedRef.current || ws.readyState !== WebSocket.OPEN) return;
                const channelData = e.inputBuffer.getChannelData(0);
                let sum = 0;
                for (let i = 0; i < channelData.length; i++) {
                  sum += channelData[i] * channelData[i];
                }
                const rms = Math.min(1, Math.sqrt(sum / channelData.length) * 6);
                setAudioLevel(rms);

                const base64Audio = float32ToBase64Pcm16(channelData);
                ws.send(JSON.stringify({ type: 'audio', data: base64Audio }));
              };

              source.connect(processor);
              processor.connect(inputCtx.destination);
            } else if (msg.type === 'audio' && msg.data && outputCtxRef.current) {
              const outCtx = outputCtxRef.current;
              const floatSamples = base64Pcm16ToFloat32(msg.data);
              const audioBuffer = outCtx.createBuffer(1, floatSamples.length, 24000);
              audioBuffer.getChannelData(0).set(floatSamples);

              let sum = 0;
              for (let i = 0; i < floatSamples.length; i += 8) {
                sum += floatSamples[i] * floatSamples[i];
              }
              const outRms = Math.min(1, Math.sqrt(sum / (floatSamples.length / 8)) * 4.5);
              setAudioLevel(outRms);

              const sourceNode = outCtx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(outCtx.destination);

              const startTime = Math.max(outCtx.currentTime, nextStartTimeRef.current);
              sourceNode.start(startTime);
              nextStartTimeRef.current = startTime + audioBuffer.duration;
              activeSourcesRef.current.add(sourceNode);

              sourceNode.onended = () => {
                activeSourcesRef.current.delete(sourceNode);
                if (activeSourcesRef.current.size === 0) {
                  setAudioLevel(0.05);
                }
              };
            } else if (msg.type === 'inputTranscript' && msg.text) {
              callbacksRef.current.onCallerTextChunk(msg.text);
            } else if (msg.type === 'outputTranscript' && msg.text) {
              callbacksRef.current.onAssistantTextChunk(msg.text, false);
            } else if (msg.type === 'turnComplete') {
              callbacksRef.current.onAssistantTextChunk('', true);
            } else if (msg.type === 'interrupted') {
              clearPlaybackQueue();
            } else if (msg.type === 'intel' && msg.intel) {
              callbacksRef.current.onIntelUpdate(msg.intel);
            } else if (msg.type === 'spamTerminated') {
              callbacksRef.current.onSpamTerminated(msg.reason || 'Spam call ended');
            } else if (msg.type === 'error') {
              callbacksRef.current.onError(msg.error || 'Live voice connection interrupted.');
            }
          } catch {
            // Ignore malformed socket packet
          }
        };

        ws.onerror = () => {
          callbacksRef.current.onError(
            'Could not connect to Live Voice WebSocket. Check network or microphone permissions.'
          );
          stopLiveCall();
        };

        ws.onclose = () => {
          if (!fallbackModeRef.current) {
            setIsConnected(false);
          }
        };
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Microphone permission was denied or no audio input device found.';
        callbacksRef.current.onError(message);
        stopLiveCall();
      }
    },
    [activateBrowserSpeechFallback, clearPlaybackQueue, stopLiveCall]
  );

  const toggleMute = useCallback(() => {
    setIsMicMuted((prev) => {
      mutedRef.current = !prev;
      return !prev;
    });
  }, []);

  const sendLiveWhisper = useCallback(
    (instruction: string) => {
      if (fallbackModeRef.current) {
        void runFallbackTurn({ ownerWhisper: instruction });
        return;
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'whisper', instruction }));
      }
    },
    [runFallbackTurn]
  );

  const sendLiveCallerText = useCallback(
    (text: string) => {
      if (fallbackModeRef.current) {
        void runFallbackTurn({ callerUtterance: text });
        return;
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'callerText', text }));
      }
    },
    [runFallbackTurn]
  );

  useEffect(() => {
    return () => {
      stopLiveCall();
    };
  }, [stopLiveCall]);

  return {
    isConnected,
    isMicMuted,
    audioLevel,
    startLiveCall,
    stopLiveCall,
    toggleMute,
    sendLiveWhisper,
    sendLiveCallerText,
  };
}
