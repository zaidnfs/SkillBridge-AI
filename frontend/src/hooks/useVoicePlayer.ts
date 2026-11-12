import { useState, useRef, useCallback, useEffect } from 'react';
import { interviewService } from '../services/interviewService';

export interface UseVoicePlayerReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  playSpeech: (text: string, sessionId?: string, voice?: string) => Promise<void>;
  stopSpeech: () => void;
  replay: () => void;
}

const cleanTextForSpeech = (rawText: string): string => {
  return rawText
    .replace(/```[\s\S]*?```/g, ' code block omitted ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/^[#>*\-\+]\s+/gm, '')
    .replace(/(\*\*|\*|__|_)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const useVoicePlayer = (): UseVoicePlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTextRef = useRef<string>('');
  const lastSessionIdRef = useRef<string | undefined>(undefined);
  const lastVoiceRef = useRef<string | undefined>(undefined);

  // Stop playback on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const playViaBrowserSynthesis = useCallback((cleanedText: string) => {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech is not supported in this browser.');
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      setIsPlaying(false);
      setIsLoading(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const playSpeech = useCallback(
    async (text: string, sessionId?: string, voice?: string) => {
      stopSpeech();
      setError(null);
      setIsLoading(true);

      lastTextRef.current = text;
      lastSessionIdRef.current = sessionId;
      lastVoiceRef.current = voice;

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) {
        setIsLoading(false);
        return;
      }

      try {
        // Attempt backend Piper TTS stream first
        const audioBlob = await interviewService.synthesizeSpeech(cleaned, voice, sessionId);

        // If returned blob is valid audio with actual content
        if (audioBlob && audioBlob.size > 200) {
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onplay = () => {
            setIsPlaying(true);
            setIsLoading(false);
          };

          audio.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
          };

          audio.onerror = () => {
            // If backend audio decoding failed, fall back to browser Web Speech API
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            playViaBrowserSynthesis(cleaned);
          };

          await audio.play();
          return;
        }

        // If backend returned tiny dummy wav or fallback, use browser speech synthesis for full natural voice
        playViaBrowserSynthesis(cleaned);
      } catch (err) {
        console.warn('Backend TTS synthesis failed, falling back to Web Speech API:', err);
        playViaBrowserSynthesis(cleaned);
      }
    },
    [stopSpeech, playViaBrowserSynthesis]
  );

  const replay = useCallback(() => {
    if (lastTextRef.current) {
      playSpeech(lastTextRef.current, lastSessionIdRef.current, lastVoiceRef.current);
    }
  }, [playSpeech]);

  return {
    isPlaying,
    isLoading,
    error,
    playSpeech,
    stopSpeech,
    replay,
  };
};
