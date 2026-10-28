let currentAudio: HTMLAudioElement | null = null;

export function stopCurrentSpeech(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function speakWithBrowserFallback(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);

      // Select appropriate locale based on script
      if (/[\u0C00-\u0C7F]/.test(text)) {
        utter.lang = 'te-IN';
      } else if (/[\u0900-\u097F]/.test(text)) {
        utter.lang = 'hi-IN';
      } else {
        utter.lang = 'en-IN';
      }

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === utter.lang.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(utter.lang.slice(0, 2).toLowerCase()));
      if (matchedVoice) {
        utter.voice = matchedVoice;
      }

      utter.rate = 1.02;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    } catch {
      resolve();
    }
  });
}

export async function playWavBase64(base64Audio: string): Promise<void> {
  stopCurrentSpeech();
  return new Promise((resolve) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      currentAudio = audio;
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      audio.play().catch(() => {
        if (currentAudio === audio) currentAudio = null;
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

export async function synthesizeAndPlaySpeech(params: {
  text: string;
  voiceName?: string;
  style?: string;
}): Promise<string | null> {
  try {
    const res = await fetch('/api/call/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      await speakWithBrowserFallback(params.text);
      return null;
    }
    const data = await res.json();
    if (data?.audioBase64) {
      await playWavBase64(data.audioBase64);
      return data.audioBase64 as string;
    }
    if (data?.useBrowserSpeech) {
      await speakWithBrowserFallback(params.text);
    }
    return null;
  } catch {
    await speakWithBrowserFallback(params.text);
    return null;
  }
}
