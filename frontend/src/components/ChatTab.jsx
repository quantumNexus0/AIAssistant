import { useState, useEffect, useRef } from 'react';
import { Trash2, Download, Scale, ArrowUp, User, Shield, Scroll, Users, Home, HardHat, Briefcase, Cpu, Mic, MicOff, Paperclip, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CHAT_MODES = [
  { id: 'general', name: 'General', icon: Scale },
  { id: 'criminal', name: 'Criminal', icon: Shield },
  { id: 'civil', name: 'Civil', icon: Scroll },
  { id: 'family', name: 'Family', icon: Users },
  { id: 'property', name: 'Property', icon: Home },
  { id: 'labour', name: 'Labour', icon: HardHat },
  { id: 'tax', name: 'Tax', icon: Briefcase },
  { id: 'cyber', name: 'Cyber', icon: Cpu }
];

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export default function ChatTab({
  currentChatId,
  setCurrentChatId,
  model,
  setModel,
  language,
  setLanguage,
  prepopulatedPrompt,
  onClearPrepopulatedPrompt
}) {
  const getShortModelName = (name) => {
    if (!name) return '';
    return name.split(':')[0].split('/').pop();
  };
  const [availableModels, setAvailableModels] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState('checking');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [chatMode, setChatMode] = useState('general');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('New Consultation');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Document upload state
  const [attachedDocuments, setAttachedDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // Check voice support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputValue(transcript);
        autoResizeTextarea();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Voice recognition start error:', e);
      }
    }
  };

  // Load chat messages when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      loadChatHistory(currentChatId);
    } else {
      setMessages([]);
      setSessionTitle('New Consultation');
      setAttachedDocuments([]);
    }
  }, [currentChatId]);

  // Handle prepopulated queries from other tabs
  useEffect(() => {
    if (prepopulatedPrompt) {
      handleSend(prepopulatedPrompt);
      onClearPrepopulatedPrompt();
    }
  }, [prepopulatedPrompt]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating]);

  // Fetch Ollama health & models for compact selector
  useEffect(() => {
    let mounted = true;
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/health`);
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setOllamaStatus(data.status === 'connected' ? 'connected' : 'disconnected');
          if (data.available_models) setAvailableModels(data.available_models);
        } else {
          setOllamaStatus('disconnected');
        }
      } catch (e) {
        if (!mounted) return;
        setOllamaStatus('disconnected');
      }
    };
    fetchHealth();
    const iv = setInterval(fetchHealth, 15000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const loadChatHistory = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/chats/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setSessionTitle(data.title || 'Consultation');
        setAttachedDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    let chatId = currentChatId;

    // Auto-create chat if none exists
    if (!chatId) {
      try {
        const titleText = `Document Analysis - ${file.name}`;
        const res = await fetch(`${API_BASE}/chats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleText.slice(0, 40),
            model,
            language,
            mode: chatMode
          })
        });
        if (res.ok) {
          const newSession = await res.json();
          chatId = newSession.id;
          setCurrentChatId(chatId);
        } else {
          alert("Failed to start chat session for upload.");
          setIsUploading(false);
          return;
        }
      } catch (err) {
        console.error(err);
        alert("Backend server not reachable.");
        setIsUploading(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/chats/${chatId}/documents`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setAttachedDocuments(prev => [...prev, { filename: data.filename, text: data.text }]);
      } else {
        alert("Document upload failed. Make sure the backend has PyMuPDF installed.");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = async (filename) => {
    if (!currentChatId) return;
    try {
      const res = await fetch(`${API_BASE}/chats/${currentChatId}/documents/${filename}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setAttachedDocuments(prev => prev.filter(d => d.filename !== filename));
      }
    } catch (err) {
      console.error("Failed to remove document", err);
    }
  };

  const handleTextareaChange = (e) => {
    setInputValue(e.target.value);
    autoResizeTextarea();
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Build the legal AI prompt system instructions
  const buildSystemPrompt = (mode, lang) => {
    const langNames = {
      english: 'English', hindi: 'हिन्दी', bengali: 'বাংলা', telugu: 'తెలుగు',
      marathi: 'मराठी', tamil: 'தமிழ்', gujarati: 'ગુજરાતી', kannada: 'ಕನ್ನಡ',
      malayalam: 'മലയാളം', punjabi: 'ਪੰਜਾਬੀ', urdu: 'اردو',
      spanish: 'Spanish', french: 'French'
    };

    const langInstr = lang !== 'english'
      ? `CRITICAL: You MUST respond entirely in ${langNames[lang] || 'English'} language. Do not use English unless the user writes in English.`
      : 'Respond in clear English.';

    const modeContexts = {
      general: 'You are a general Indian legal assistant covering all areas of law.',
      criminal: 'You specialize in Indian criminal law: IPC 1860, CrPC 1973, BNS 2023, BNSS 2023, BSA 2023, Evidence Act.',
      civil: 'You specialize in Indian civil law: CPC 1908, Specific Relief Act, Limitation Act.',
      family: 'You specialize in Indian family law: Hindu Marriage Act, Muslim Personal Law, Special Marriage Act, POCSO, DV Act.',
      property: 'You specialize in Indian property law: Transfer of Property Act, RERA, Registration Act, stamp duty.',
      labour: 'You specialize in Indian labour law: Industrial Disputes Act, Factories Act, Minimum Wages Act, ESIC, PF.',
      tax: 'You specialize in Indian tax law: Income Tax Act 1961, GST Acts, customs and excise.',
      cyber: 'You specialize in Indian cyber law: IT Act 2000, IT Amendment Act 2008, DPDP Act 2023, cybercrime under IPC/BNS.'
    };

    let prompt = `You are Nyaya AI, an advanced AI legal assistant specializing in Indian law. ${modeContexts[mode] || modeContexts.general}

${langInstr}

GUIDELINES:
1. Always cite relevant Acts, Sections, and Articles (e.g., IPC Section 302, Article 21 of Constitution).
2. Structure responses with clear headings, bullet points, and steps.
3. Mention time limits (limitation periods) where relevant.
4. Always recommend consulting a qualified advocate for final advice.
5. Include relevant court and government resources (e.g., eCourts, Legal Services Authority).
6. Reference landmark Supreme Court/High Court judgments where applicable.

Format your response with clear sections using **bold headers**, bullet points, and law references in [Section X of Act Y] format.`;

    if (attachedDocuments && attachedDocuments.length > 0) {
      prompt += `\n\n=== ATTACHED DOCUMENTS LIST ===\n`;
      attachedDocuments.forEach((doc, idx) => {
        prompt += `\nDocument ${idx + 1}: ${doc.filename}\n`;
      });
      prompt += `\n=== END OF ATTACHED DOCUMENTS LIST ===\n\nPlease answer the user's queries utilizing the provided document context when relevant.`;
    }

    return prompt;
  };

  const handleSend = async (customText = '') => {
    const text = (customText || inputValue).trim();
    if (!text || isGenerating) return;

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    let chatId = currentChatId;

    // 1. Auto-create session if none active
    if (!chatId) {
      try {
        const titleText = text.length > 28 ? text.slice(0, 28) + '...' : text;
        const res = await fetch(`${API_BASE}/chats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleText,
            model,
            language,
            mode: chatMode
          })
        });
        if (res.ok) {
          const newSession = await res.json();
          chatId = newSession.id;
          setCurrentChatId(chatId);
        } else {
          alert("Could not initialize chat session. Check backend status.");
          return;
        }
      } catch (err) {
        console.error("Error auto-creating chat:", err);
        alert("Backend server not reachable.");
        return;
      }
    }

    // 2. Append User message in DB
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      await fetch(`${API_BASE}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMsg)
      });
    } catch (err) {
      console.error("Failed to persist user message:", err);
    }

    // 3. Prepare streaming
    setIsGenerating(true);
    const systemPrompt = buildSystemPrompt(chatMode, language);
    const messagesForModel = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content
    }));

    // Setup placeholder for assistant message
    const assistantPlaceholder = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, assistantPlaceholder]);

    let accumulatedResponse = '';

    try {
      const response = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: messagesForModel,
          temperature: 0.7,
          system_prompt: systemPrompt,
          session_id: chatId
        })
      });

      if (!response.ok) throw new Error("Ollama stream query failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Parse NDJSON chunks
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);

            // Check for errors
            if (parsed.error) {
              accumulatedResponse += `\n[Error: ${parsed.message || parsed.error}]`;
              break;
            }

            // Extract message content from Ollama response structure
            const token = parsed.message?.content || parsed.response || "";
            accumulatedResponse += token;

            // Update UI state
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: accumulatedResponse
              };
              return updated;
            });
          } catch (e) {
            if (line.includes('"content"')) {
              console.warn("Could not parse NDJSON line:", line);
            }
          }
        }
      }

      // 4. Save completed Assistant message to DB
      await fetch(`${API_BASE}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content: accumulatedResponse
        })
      });

      window.dispatchEvent(new Event('chat_history_changed'));

    } catch (err) {
      console.error("Error in streaming:", err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `❌ Connection Error. Could not stream response. Make sure:\n1. Ollama is running (\`ollama serve\`)\n2. The model \`${model}\` is pulled (\`ollama pull ${model}\`)\n3. The FastAPI backend is running.`
        };
        return updated;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear current chat messages
  const handleClearChat = async () => {
    if (!currentChatId) {
      setMessages([]);
      return;
    }
    if (!confirm("Are you sure you want to clear this conversation?")) return;

    try {
      await fetch(`${API_BASE}/chats/${currentChatId}`, { method: 'DELETE' });
      setCurrentChatId(null);
      setMessages([]);
      window.dispatchEvent(new Event('chat_history_changed'));
    } catch (err) {
      console.error("Error clearing chat:", err);
    }
  };

  // Export current chat as txt
  const handleExportChat = () => {
    if (messages.length === 0) return;
    const text = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${sessionTitle.toLowerCase().replace(/\s+/g, '-')}-consultation.txt`;
    a.click();
  };

  const currentModeName = CHAT_MODES.find(m => m.id === chatMode)?.name || 'General';

  return (
    <div className="chat-tab-container">
      {/* Top Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>{sessionTitle}</h3>
          <div className="chat-header-model-wrapper">
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={ollamaStatus === 'disconnected'}
              className="model-dropdown-compact chat-header-model"
              aria-label="Select model"
            >
              {availableModels.map(m => (
                <option key={m} value={m}>{getShortModelName(m)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="chat-header-actions">
          {messages.length > 0 && (
            <>
              <button className="btn-secondary text-xs" onClick={handleExportChat}>
                <Download size={14} style={{ marginRight: 4 }} /> Export
              </button>
              <button className="btn-danger text-xs" onClick={handleClearChat}>
                <Trash2 size={14} style={{ marginRight: 4 }} /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages-container" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            {/* Clean empty chat box state */}
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, i) => (
              <div key={i} className={`message-bubble-wrapper ${msg.role}`}>
                <div className="msg-avatar">
                  {msg.role === 'user' ? <User size={14} /> : '⚖️'}
                </div>
                <div className="msg-content-wrapper">
                  <div className="msg-meta">
                    {msg.role === 'user' ? 'You' : 'Nyaya AI'}
                  </div>
                  {msg.role === 'user' ? (
                    <div className="msg-bubble user-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </div>
                  ) : (
                    <div className="msg-bubble ai-bubble">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 style={{ fontFamily: 'var(--font-serif)', marginTop: '0.75rem', marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 'bold' }} {...props} />,
                          h2: ({node, ...props}) => <h2 style={{ fontFamily: 'var(--font-serif)', marginTop: '0.75rem', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold' }} {...props} />,
                          h3: ({node, ...props}) => <h3 style={{ fontFamily: 'var(--font-serif)', marginTop: '0.5rem', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 'bold' }} {...props} />,
                          p: ({node, ...props}) => <p style={{ marginBottom: '0.5rem' }} {...props} />,
                          ul: ({node, ...props}) => <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', marginBottom: '0.5rem' }} {...props} />,
                          ol: ({node, ...props}) => <ol style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', marginBottom: '0.5rem' }} {...props} />,
                          li: ({node, ...props}) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
                          strong: ({node, ...props}) => <strong style={{ fontWeight: 700 }} {...props} />
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {!isGenerating && i === messages.length - 1 && (
                        <div className="legal-disclaimer">
                          ⚠️ Disclaimer: This is general legal information based on Indian laws. It does not constitute formal legal advice. Please consult a registered advocate for your specific case.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isGenerating && messages[messages.length - 1]?.content === '' && (
              <div className="message-bubble-wrapper assistant">
                <div className="msg-avatar">⚖️</div>
                <div className="msg-content-wrapper">
                  <div className="msg-meta">Nyaya AI</div>
                  <div className="msg-bubble ai-bubble">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-container">
        {/* Document Badges */}
        {attachedDocuments.length > 0 && (
          <div className="attached-documents-row">
            {attachedDocuments.map((doc, idx) => (
              <div key={idx} className="document-badge">
                <Paperclip size={12} style={{ marginRight: '4px' }} />
                <span>{doc.filename}</span>
                <button type="button" className="remove-doc-btn" onClick={() => handleRemoveDocument(doc.filename)} title="Remove document">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modern Input Box */}
        <div className="chat-input-box">
          {/* Category Trigger & Dropdown Menu */}
          <div className="category-menu-wrapper">
            <button
              className="category-trigger-btn"
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              type="button"
              title="Select Law Category"
              aria-label="Select law category"
            >
              +
            </button>
            {showCategoryMenu && (
              <div className="category-dropdown-menu">
                {CHAT_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setChatMode(mode.id);
                      setShowCategoryMenu(false);
                    }}
                    className={`category-menu-item ${chatMode === mode.id ? 'active' : ''}`}
                    type="button"
                  >
                    <span className="menu-icon"><mode.icon size={16} /></span>
                    <span className="menu-name">{mode.name}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Attachment Button */}
            <button
              className="attachment-btn"
              onClick={() => fileInputRef.current?.click()}
              type="button"
              title="Attach Document (PDF, TXT)"
              aria-label="Attach document"
              disabled={isUploading}
            >
              <Paperclip size={18} className={isUploading ? "spinning" : ""} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.txt,.docx"
              onChange={handleFileUpload}
            />
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={`Describe your legal issue (${currentModeName})... (Enter to send, Shift+Enter for new line)`}
            disabled={isGenerating}
            aria-label="Chat input"
          />

          {/* Voice Input Button */}
          {voiceSupported && (
            <button
              className={`voice-input-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleVoiceInput}
              type="button"
              title={isListening ? 'Stop listening' : 'Voice input'}
              aria-label={isListening ? 'Stop recording' : 'Start voice input'}
            >
              {isListening ? (
                <>
                  <MicOff size={15} />
                  <span className="voice-ripple"></span>
                </>
              ) : (
                <Mic size={15} />
              )}
            </button>
          )}

          <button
            className="send-message-btn"
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isGenerating}
            aria-label="Send message"
          >
            <ArrowUp size={16} />
          </button>
        </div>

        <div className="input-bottom-bar">
          <span className="chat-mode-badge">{currentModeName}</span>
          {isListening && (
            <span className="listening-indicator">
              <span className="listen-dot"></span>
              Listening...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
