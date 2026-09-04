import { useState, useEffect, useRef } from 'react';
import { userAPI } from '../services/api';

/**
 * Custom hook to manage username availability checking with debouncing and race condition protection.
 * 
 * @param {string} username - The current username input value
 * @param {string} currentUsername - The user's existing username (to bypass check if unchanged)
 * @param {number} delay - Debounce delay in ms
 * @returns {Object} - { status, suggestions, error }
 */
export default function useUsernameAvailability(username, currentUsername = '', delay = 500) {
  const [status, setStatus] = useState('idle'); // 'idle', 'invalid', 'checking', 'available', 'taken'
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  
  // Ref to track the latest request sequence to prevent stale closures/race conditions
  const requestSeq = useRef(0);

  useEffect(() => {
    // 1. Handle empty input
    if (!username) {
      setStatus('idle');
      setSuggestions([]);
      setError('');
      return;
    }

    const normalizedInput = username.trim().toLowerCase();

    // 2. Handle matching current username
    if (currentUsername && normalizedInput === currentUsername.trim().toLowerCase()) {
      setStatus('available');
      setSuggestions([]);
      setError('');
      return;
    }

    // 3. Handle basic synchronous validation
    if (normalizedInput.length < 3 || normalizedInput.length > 30) {
      setStatus('invalid');
      setError('Username must be between 3 and 30 characters');
      setSuggestions([]);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(normalizedInput)) {
      setStatus('invalid');
      setError('Username can only contain letters, numbers, and underscores');
      setSuggestions([]);
      return;
    }

    // 4. Setup async debounced check
    setStatus('checking');
    setError('');
    setSuggestions([]);

    const seq = ++requestSeq.current;

    const handler = setTimeout(async () => {
      try {
        const res = await userAPI.checkUsername(normalizedInput);
        
        // If a newer request has been dispatched, discard this result
        if (seq !== requestSeq.current) return;

        if (res.data.data.available) {
          setStatus('available');
        } else {
          setStatus('taken');
          setSuggestions(res.data.data.suggestions || []);
        }
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setStatus('invalid');
        setError(err.response?.data?.message || 'Failed to check username');
      }
    }, delay);

    // Cleanup timeout if input changes before timeout completes
    return () => clearTimeout(handler);
  }, [username, currentUsername, delay]);

  return { status, suggestions, error };
}
