import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { messageAPI, userAPI } from '../services/api';
import { Search, Send, ArrowLeft, Check, CheckCheck, Edit } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');

export default function MessagesPage() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const toast = useToast();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  // UI State
  const [viewMode, setViewMode] = useState('inbox'); // 'inbox' | 'requests'
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch initial conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await messageAPI.getConversations();
      setConversations(res.data.data.conversations);
    } catch (err) {
      toast.error('Failed to load conversations');
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (activeConversation && activeConversation._id === message.conversationId) {
        setMessages((prev) => [message, ...prev]);
        socket.emit('message:delivered', { messageId: message._id, senderId: message.senderId, conversationId: message.conversationId });
        messageAPI.markAsRead(message.conversationId).catch(() => {});
      } else {
        fetchConversations();
        toast.success('New message received');
      }
    };

    const handleMessageDelivered = ({ messageId }) => {
      setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, status: 'delivered' } : m));
    };

    const handleMessageRead = ({ conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        setMessages((prev) => prev.map(m => m.senderId === user.id ? { ...m, status: 'read' } : m));
      }
    };

    const handleTypingStart = ({ senderId, conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        setOtherUserTyping(true);
      }
    };

    const handleTypingStop = ({ senderId, conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        setOtherUserTyping(false);
      }
    };

    const handlePresence = ({ userId, status }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return next;
      });
    };
    
    const handlePresenceInitial = (userIds) => {
      setOnlineUsers(new Set(userIds));
    };
    
    const handleRequestAccepted = ({ conversationId }) => {
      fetchConversations();
      if (activeConversation && activeConversation._id === conversationId) {
        setActiveConversation(prev => ({ ...prev, status: 'accepted' }));
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:read', handleMessageRead);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('presence:update', handlePresence);
    socket.on('presence:initial_state', handlePresenceInitial);
    socket.on('request:accepted', handleRequestAccepted);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:read', handleMessageRead);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('presence:update', handlePresence);
      socket.off('presence:initial_state', handlePresenceInitial);
      socket.off('request:accepted', handleRequestAccepted);
    };
  }, [socket, activeConversation, user.id, toast]);

  // Handle user search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await userAPI.searchUsers(searchQuery);
        setSearchResults(res.data.data.users.filter(u => u._id !== user.id));
      } catch (err) {
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user.id]);

  // Load messages when conversation selected
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation._id);
      if (activeConversation.unreadCount > 0) {
        messageAPI.markAsRead(activeConversation._id)
          .then(() => fetchConversations()).catch(() => {});
      }
    }
  }, [activeConversation]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (convId) => {
    try {
      const res = await messageAPI.getMessages(convId);
      setMessages(res.data.data.messages);
      setOtherUserTyping(false);
    } catch (err) {
      toast.error('Failed to load messages');
    }
  };

  const startConversation = async (targetUserId) => {
    try {
      const res = await messageAPI.createConversation(targetUserId);
      const newConv = res.data.data.conversation;
      setActiveConversation(newConv);
      setSearchQuery('');
      setSearchResults([]);
      setViewMode('inbox');
      fetchConversations();
    } catch (err) {
      toast.error('Failed to start conversation');
    }
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);
    
    if (!socket || !activeConversation || activeConversation.status !== 'accepted') return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing:start', { 
        receiverId: activeConversation.otherParticipant._id, 
        conversationId: activeConversation._id 
      });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing:stop', { 
        receiverId: activeConversation.otherParticipant._id, 
        conversationId: activeConversation._id 
      });
    }, 2000);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation) return;
    
    const text = messageText.trim();
    setMessageText('');
    setIsTyping(false);
    clearTimeout(typingTimeoutRef.current);
    socket?.emit('typing:stop', { 
      receiverId: activeConversation.otherParticipant._id, 
      conversationId: activeConversation._id 
    });

    try {
      const res = await messageAPI.sendMessage(activeConversation._id, text);
      setMessages(prev => [res.data.data.message, ...prev]);
      fetchConversations(); 
    } catch (err) {
      toast.error('Failed to send message');
      setMessageText(text);
    }
  };
  
  const acceptRequest = async () => {
    try {
      await messageAPI.acceptRequest(activeConversation._id);
      setActiveConversation(prev => ({ ...prev, status: 'accepted' }));
      setViewMode('inbox');
      fetchConversations();
      toast.success('Request accepted');
    } catch (err) {
      toast.error('Failed to accept request');
    }
  };

  const declineRequest = async () => {
    try {
      await messageAPI.deleteConversation(activeConversation._id);
      setActiveConversation(null);
      fetchConversations();
      toast.success('Conversation deleted');
    } catch (err) {
      toast.error('Failed to delete conversation');
    }
  };

  const getAvatar = (u) => {
    if (u?.avatar) return `${BASE_URL}${u.avatar}`;
    return null;
  };

  const inboxConversations = conversations.filter(c => !c.status || c.status === 'accepted' || c.initiator === user.id);
  const requestConversations = conversations.filter(c => c.status === 'pending' && c.initiator !== user.id);

  const displayedConversations = viewMode === 'inbox' ? inboxConversations : requestConversations;

  return (
    <div className="messages-container" style={{ display: 'flex', height: 'calc(100vh - 60px)', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      
      {/* Sidebar: Conversations List */}
      <div className={`messages-sidebar ${activeConversation ? 'hidden-mobile' : ''}`} style={{ width: '350px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header matching Instagram */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {viewMode === 'inbox' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{user.username}</h2>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => document.getElementById('searchInput').focus()}>
                  <Edit size={24} />
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="searchInput"
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px 8px 35px', borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>
              
              {!searchQuery && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>Messages</span>
                  {requestConversations.length > 0 && (
                    <button 
                      onClick={() => setViewMode('requests')}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                    >
                      Request ({requestConversations.length})
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '10px' }}>
              <button 
                onClick={() => setViewMode('inbox')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', marginRight: '15px' }}
              >
                <ArrowLeft size={24} />
              </button>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Message requests</h2>
            </div>
          )}
        </div>

        {viewMode === 'requests' && !searchQuery && (
          <div style={{ padding: '15px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
            Open a chat to get more info about who's messaging you. They won't know you've seen it until you accept.
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {searchQuery ? (
            <div style={{ padding: '10px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px', paddingLeft: '10px' }}>Search Results</div>
              {isSearching ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map(resultUser => (
                  <div 
                    key={resultUser._id} 
                    onClick={() => startConversation(resultUser._id)}
                    style={{ display: 'flex', alignItems: 'center', padding: '10px', cursor: 'pointer', borderRadius: '10px', ':hover': { background: 'var(--bg-secondary)' } }}
                  >
                    {getAvatar(resultUser) ? (
                      <img src={getAvatar(resultUser)} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {resultUser.displayName?.[0] || resultUser.username[0]}
                      </div>
                    )}
                    <div style={{ marginLeft: '12px' }}>
                      <div style={{ fontWeight: 'bold' }}>{resultUser.displayName || resultUser.username}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>@{resultUser.username}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No users found.</div>
              )}
            </div>
          ) : (
            <div>
              {displayedConversations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  {viewMode === 'inbox' ? 'No messages found.' : 'No message requests.'}
                </div>
              ) : (
                displayedConversations.map(conv => (
                  <div 
                    key={conv._id}
                    onClick={() => setActiveConversation(conv)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '12px 20px', 
                      cursor: 'pointer',
                      background: activeConversation?._id === conv._id ? 'var(--bg-secondary)' : 'transparent',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      {getAvatar(conv.otherParticipant) ? (
                        <img src={getAvatar(conv.otherParticipant)} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                          {conv.otherParticipant.displayName?.[0] || conv.otherParticipant.username[0]}
                        </div>
                      )}
                      {onlineUsers.has(conv.otherParticipant._id) && (
                        <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--success-color)', border: '2px solid var(--bg-primary)' }}></div>
                      )}
                    </div>
                    
                    <div style={{ marginLeft: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: conv.unreadCount > 0 ? 'bold' : 'normal', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conv.otherParticipant.displayName || conv.otherParticipant.username}
                        </span>
                        {conv.lastMessage?.createdAt && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {new Date(conv.lastMessage.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ 
                          fontSize: '0.9rem', 
                          color: conv.unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)', 
                          fontWeight: conv.unreadCount > 0 ? 'bold' : 'normal',
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }}>
                          {conv.lastMessage ? (conv.lastMessage.senderId === user.id ? `You: ${conv.lastMessage.text}` : conv.lastMessage.text) : 'Started a conversation'}
                        </span>
                        {conv.unreadCount > 0 && viewMode === 'inbox' && (
                          <span style={{ background: 'var(--accent-primary)', color: 'white', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '10px', marginLeft: '10px' }}>
                            {conv.unreadCount}
                          </span>
                        )}
                        {viewMode === 'requests' && conv.unreadCount > 0 && (
                           <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', marginLeft: '10px' }}></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        {viewMode === 'requests' && requestConversations.length > 0 && (
          <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <button 
              onClick={() => {}} 
              style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}
            >
              Delete All
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={`messages-main ${!activeConversation ? 'hidden-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
              <button className="mobile-only" style={{ background: 'none', border: 'none', marginRight: '15px', color: 'var(--text-primary)' }} onClick={() => setActiveConversation(null)}>
                <ArrowLeft size={24} />
              </button>
              
              {getAvatar(activeConversation.otherParticipant) ? (
                <img src={getAvatar(activeConversation.otherParticipant)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeConversation.otherParticipant.displayName?.[0] || activeConversation.otherParticipant.username[0]}
                </div>
              )}
              
              <div style={{ marginLeft: '12px' }}>
                <div style={{ fontWeight: 'bold' }}>{activeConversation.otherParticipant.displayName || activeConversation.otherParticipant.username}</div>
                <div style={{ fontSize: '0.8rem', color: onlineUsers.has(activeConversation.otherParticipant._id) ? 'var(--success-color)' : 'var(--text-muted)' }}>
                  {onlineUsers.has(activeConversation.otherParticipant._id) ? 'Active now' : 'Offline'}
                </div>
              </div>
            </div>

            {/* Messages feed */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column-reverse' }}>
              <div ref={messagesEndRef} />
              
              {otherUserTyping && (
                <div style={{ alignSelf: 'flex-start', marginBottom: '15px', padding: '10px 15px', background: 'var(--bg-secondary)', borderRadius: '18px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  Typing...
                </div>
              )}

              {messages.map((msg, index) => {
                const isMe = msg.senderId === user.id;
                return (
                  <div key={msg._id} style={{ 
                    alignSelf: isMe ? 'flex-end' : 'flex-start', 
                    maxWidth: '70%', 
                    marginBottom: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{ 
                      padding: '10px 15px', 
                      borderRadius: '18px', 
                      background: isMe ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                      color: isMe ? 'white' : 'var(--text-primary)',
                      borderBottomRightRadius: isMe ? '4px' : '18px',
                      borderBottomLeftRadius: isMe ? '18px' : '4px',
                      wordBreak: 'break-word'
                    }}>
                      {msg.text}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span style={{ color: msg.status === 'read' ? '#3498db' : 'var(--text-muted)' }}>
                          {msg.status === 'sent' ? <Check size={14} /> : <CheckCheck size={14} />}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                  Say hi to {activeConversation.otherParticipant.displayName || activeConversation.otherParticipant.username}!
                </div>
              )}
            </div>

            {/* Composer or Action Banner */}
            {activeConversation.status === 'pending' && activeConversation.initiator !== user.id ? (
              <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                  Do you want to let {activeConversation.otherParticipant.username} message you? They won't know you've seen their messages until you accept.
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                  <button 
                    onClick={declineRequest}
                    style={{ flex: 1, maxWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                  <button 
                    onClick={acceptRequest}
                    style={{ flex: 1, maxWidth: '200px', padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--accent-primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Accept
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                <form onSubmit={sendMessage} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Message..."
                    value={messageText}
                    onChange={handleTyping}
                    style={{ 
                      flex: 1, 
                      padding: '12px 20px', 
                      borderRadius: '24px', 
                      border: '1px solid var(--border-color)', 
                      background: 'var(--bg-secondary)', 
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                    maxLength={1000}
                  />
                  <button 
                    type="submit" 
                    disabled={!messageText.trim()}
                    style={{ 
                      background: messageText.trim() ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                      color: messageText.trim() ? 'white' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: messageText.trim() ? 'pointer' : 'default',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Send size={18} style={{ marginLeft: '2px' }} />
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ width: 96, height: 96, border: '2px solid var(--text-muted)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Send size={48} />
            </div>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
              {viewMode === 'inbox' ? 'Your messages' : 'Message requests'}
            </h3>
            <p>
              {viewMode === 'inbox' ? 'Send private photos and messages to a friend or group.' : 'These messages are from people you don\'t follow.'}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile {
            display: none !important;
          }
          .messages-sidebar {
            width: 100% !important;
            border-right: none !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
