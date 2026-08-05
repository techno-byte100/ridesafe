import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook to safely play audio files avoiding browser autoplay bans.
 * Manages caching and programmatic triggers.
 */
export function useAudio(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if window is defined (Next.js SSR safety)
    if (typeof window !== 'undefined') {
      const audio = new Audio(src);
      // Preload completely 
      audio.preload = 'auto';
      
      const setReady = () => setIsReady(true);
      audio.addEventListener('canplaythrough', setReady);

      audioRef.current = audio;

      return () => {
        audio.removeEventListener('canplaythrough', setReady);
        audioRef.current = null;
      };
    }
  }, [src]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // reset
      audioRef.current.play().catch(e => {
        console.warn(`[Audio] Blocked by browser rules for ${src}:`, e);
      });
    }
  }, [src]);

  return { play, isReady };
}
