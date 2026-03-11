import { useState, useRef, useCallback } from 'react';

// Voice Recognition Hook
export const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  
  // Check if Speech Recognition is available
  const isSpeechRecognitionAvailable = () => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  };
  
  const startListening = useCallback(() => {
    if (!isSpeechRecognitionAvailable() || !recognitionRef.current) {
      setError('Speech recognition not available');
      return false;
    }
    
    try {
      // Cancel any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Start recognition
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log('Voice recognition started');
      };
      
      recognitionRef.current.onresult = (event) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        console.log('Voice recognized:', currentTranscript);
      };
      
      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        console.error('Speech recognition error:', event.error);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        console.log('Voice recognition ended');
      };
      
      recognitionRef.current.start();
      
      // Set timeout to stop listening after 5 seconds of silence
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop();
          setIsListening(false);
          console.log('Voice recognition timeout - stopped listening');
        }
      }, 5000);
      
      return true;
    } catch (err) {
      setError(`Failed to start voice recognition: ${err}`);
      setIsListening(false);
      console.error('Error starting voice recognition:', err);
      return false;
    }
  }, [isListening, transcript, error]);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log('Voice recognition stopped manually');
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [isListening]);
  
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);
  
  return {
    isSpeechRecognitionAvailable,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
};