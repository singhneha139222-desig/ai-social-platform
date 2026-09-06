import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function StickerPicker({ onSelect, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={`p-2 text-gray-500 hover:text-blue-500 rounded-full transition-colors ${isOpen ? 'text-blue-500' : ''}`}
        title="Add Emoji"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Smile size={24} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl">
          <EmojiPicker 
            onEmojiClick={(emojiData) => {
              onSelect(emojiData.emoji);
              setIsOpen(false);
            }} 
            theme="light"
            lazyLoadEmojis={true}
          />
        </div>
      )}
    </div>
  );
}
