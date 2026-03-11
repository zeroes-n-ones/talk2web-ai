import { useState, useCallback } from 'react';

// Text-to-Speech Hook
export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  
  // Check if Speech Synthesis is available
  const isSpeechSynthesisAvailable = () => {
    return 'speechSynthesis' in window;
  };
  
  const speak = useCallback((text, options = {}) => {
    if (!isSpeechSynthesisAvailable() || !text || !text.trim()) {
      setError('Speech synthesis not available or empty text');
      return false;
    }
    
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      utterance.lang = options.lang || 'en-US';
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setError(null);
        console.log('Started speaking:', text);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('Finished speaking:', text);
      };
      
      utterance.onerror = (event) => {
        setError(`Speech synthesis error: ${event.error}`);
        setIsSpeaking(false);
        console.error('Speech synthesis error:', event.error);
      };
      
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      setError(`Failed to speak: ${err}`);
      setIsSpeaking(false);
      console.error('Error speaking text:', err);
      return false;
    }
  }, [isSpeaking, error]);
  
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      console.log('Speech synthesis stopped');
    }
  }, [isSpeaking]);
  
  const getAvailableVoices = useCallback(() => {
    if (!isSpeechSynthesisAvailable()) {
      return [];
    }
    
    const voices = window.speechSynthesis.getVoices();
    return voices.filter(voice => voice.lang.includes('en') || voice.lang.includes('en-US'));
  }, []);
  
  return {
    isSpeechSynthesisAvailable,
    isSpeaking,
    error,
    speak,
    stopSpeaking,
    getAvailableVoices
  };
};
