import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

interface UsePronunciationOptions {
  audioUrl: string | null;
  text: string;
}

interface UsePronunciationReturn {
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  error: string | null;
  play: () => Promise<void>;
}

function getChineseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();

  return voices.find((voice) => /^zh([-_]|$)/i.test(voice.lang));
}

export function usePronunciation({
  audioUrl,
  text,
}: UsePronunciationOptions): UsePronunciationReturn {
  const audioRef = useRef<HTMLAudioElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(async (): Promise<void> => {
    setError(null);

    // Local MP3 playback
    if (audioUrl) {
      const audio = audioRef.current;

      if (!audio) {
        setError("Audio player is unavailable.");
        return;
      }

      // Stop speech synthesis before playing an audio file.
      if (utteranceRef.current && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }

      if (!audio.paused) {
        audio.pause();
        return;
      }

      try {
        if (audio.ended) {
          audio.currentTime = 0;
        }

        await audio.play();
      } catch {
        setIsPlaying(false);
        setError("Audio playback failed.");
      }

      return;
    }

    // Browser speech synthesis
    if (!("speechSynthesis" in window)) {
      setError("Speech synthesis is not supported in this browser.");
      return;
    }

    const speech = window.speechSynthesis;

    // Pause or resume the current utterance.
    if (utteranceRef.current && (speech.speaking || speech.pending)) {
      if (speech.paused) {
        speech.resume();
      } else {
        speech.pause();
      }

      return;
    }

    speech.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "zh-CN";
    utterance.rate = 0.8;

    const chineseVoice = getChineseVoice();

    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setError(null);
    };

    utterance.onpause = () => {
      setIsPlaying(false);
    };

    utterance.onresume = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      setIsPlaying(false);
      utteranceRef.current = null;

      if (event.error !== "canceled" && event.error !== "interrupted") {
        setError(
          "Speech playback failed. Check your browser's Chinese voice settings.",
        );
      }
    };

    utteranceRef.current = utterance;
    speech.speak(utterance);
  }, [audioUrl, text]);

  // Listen for local audio events.
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setError(null);
    };

    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    const handleError = () => {
      setIsPlaying(false);
      setError("Could not load the audio file.");
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Stop previous playback when the example changes.
  useEffect(() => {
    const audio = audioRef.current;

    audio?.pause();

    if (audio) {
      audio.currentTime = 0;
    }

    if (utteranceRef.current && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
  }, [audioUrl, text]);

  // Cleanup on unmount.
  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      audio?.pause();

      if (utteranceRef.current && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
    };
  }, []);

  return {
    audioRef,
    isPlaying,
    error,
    play,
  };
}
