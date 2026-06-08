import { useState, useEffect, useRef } from 'react';
import { Trash2, Download, Scale, ArrowRight, User, Shield, Scroll, Users, Home, HardHat, Briefcase, Cpu } from 'lucide-react';
import { API_BASE } from '../config';

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
// const API_BASE = 'http://localhost:8000/api/v1';
// const SUGGESTED_TOPICS = [
//   "What are my fundamental rights under the Indian Constitution?",
//   "Explain the RTI Act and how to file a complaint",
//   "What should I do if I am wrongfully arrested in India?",
//   "Explain divorce laws in India under Hindu Marriage Act",
//   "What is the process to file a consumer complaint in India?",
//   "Explain cybercrime laws in India under IT Act 2000",
//   "What are tenant rights in India?",
//   "How to register an FIR and what are my rights?",
//   "What are women rights and protection laws in India?"
// ];

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

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load chat messages when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      loadChatHistory(currentChatId);
    } else {
      setMessages([]);
      setSessionTitle('New Consultation');
    }
  }, [currentChatId]);

  // Handle prepopulated queries from other tabs
  useEffect(() => {
    if (prepopulatedPrompt) {
      handleSend(prepopulatedPrompt);
      onClearPrepopulatedPrompt();
    }
  }, [prepopulatedPrompt]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
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
      malayalam: 'മലയാളം', punjabi: 'ਪੰਜਾਬੀ', urdu: 'اردو'
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

    return `You are Nyaya AI, an advanced AI legal assistant specializing in Indian law. ${modeContexts[mode] || modeContexts.general}

${langInstr}

GUIDELINES:
1. Always cite relevant Acts, Sections, and Articles (e.g., IPC Section 302, Article 21 of Constitution).
2. Structure responses with clear headings, bullet points, and steps.
3. Mention time limits (limitation periods) where relevant.
4. Always recommend consulting a qualified advocate for final advice.
5. Include relevant court and government resources (e.g., eCourts, Legal Services Authority).
6. Reference landmark Supreme Court/High Court judgments where applicable.
7. ALWAYS end with: "⚠️ Disclaimer: This is general legal information, not legal advice. Please consult a licensed advocate for your specific matter."

Format your response with clear sections using **bold headers**, bullet points, and law references in [Section X of Act Y] format.`;
  };

  const handleSend = async (customText = '') => {
    const text = (customText || inputValue).trim();
    if (!text || isGenerating) return;

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
          // Refresh parent list (using a trigger if Layout handles it, since layout checks periodically or we can let history reload on render)
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
          system_prompt: systemPrompt
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
            // Chunk might be incomplete, let's treat it as raw text if JSON parse fails
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

      // Notify parent to fetch new titles / reload history (we can force a custom event or let it poll)
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

    // We can delete and create a new chat, or just delete session
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

  // Format legal text formatting rules
  const formatLegalText = (text) => {
    if (!text) return '';

    const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inlineParse = (str) => {
      return str
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]/g, '<span class="law-ref">$1</span>')
        .replace(/Article (\d+[A-Z]?)/gi, '<span class="law-ref">Article $1</span>')
        .replace(/Section (\d+[A-Z]?)/gi, '<span class="law-ref">Section $1</span>')
        .replace(/IPC (\d+)/gi, '<span class="law-ref">IPC $1</span>')
        .replace(/BNS (\d+)/gi, '<span class="law-ref">BNS $1</span>');
    };

    const lines = text.split('\n');
    let html = '';
    let inUl = false;
    let inOl = false;

    lines.forEach(line => {
      const trimmed = line.trim();

      // Handle unordered lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        if (inOl) {
          html += '</ol>';
          inOl = false;
        }
        if (!inUl) {
          html += '<ul>';
          inUl = true;
        }
        const content = trimmed.substring(2);
        html += `<li>${inlineParse(escapeHTML(content))}</li>`;
        return;
      }

      // Handle ordered lists
      const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (olMatch) {
        if (inUl) {
          html += '</ul>';
          inUl = false;
        }
        if (!inOl) {
          html += '<ol>';
          inOl = true;
        }
        const content = olMatch[2];
        html += `<li>${inlineParse(escapeHTML(content))}</li>`;
        return;
      }

      // If we reach here, we are not on a list item
      if (inUl) {
        html += '</ul>';
        inUl = false;
      }
      if (inOl) {
        html += '</ol>';
        inOl = false;
      }

      if (!trimmed) {
        return;
      }

      // Handle headings
      if (trimmed.startsWith('### ')) {
        html += `<h3>${inlineParse(escapeHTML(trimmed.substring(4)))}</h3>`;
      } else if (trimmed.startsWith('## ')) {
        html += `<h2>${inlineParse(escapeHTML(trimmed.substring(3)))}</h2>`;
      } else if (trimmed.startsWith('# ')) {
        html += `<h1>${inlineParse(escapeHTML(trimmed.substring(2)))}</h1>`;
      } else {
        // Plain paragraph
        html += `<p>${inlineParse(escapeHTML(trimmed))}</p>`;
      }
    });

    // Close any unclosed lists
    if (inUl) html += '</ul>';
    if (inOl) html += '</ol>';

    return html;
  };

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
      <div className="chat-messages-container">
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
                    <div className="msg-bubble user-bubble">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="msg-bubble ai-bubble">
                      <div dangerouslySetInnerHTML={{ __html: formatLegalText(msg.content) }} />
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
        {/* Input box */}
        <div className="chat-input-box">
          {/* Category Trigger & Dropdown Menu */}
          <div className="category-menu-wrapper">
            <button
              className="category-trigger-btn"
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              type="button"
              title="Select Law Category"
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
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={`Describe your legal issue (${CHAT_MODES.find(m => m.id === chatMode)?.name || 'General'})... (Press Enter to send, Shift+Enter for new line)`}
            disabled={isGenerating}
          />

          <button
            className="send-message-btn"
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isGenerating}
          >
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="input-bottom-bar">
          <label htmlFor="language-select" className="input-language-label">Language: </label>
          <select
            id="language-select"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="input-language-selector-outside"
          >
            <option value="english">English</option>
            <option value="hindi">हिन्दी (Hindi)</option>
            <option value="bengali">বাংলা (Bengali)</option>
            <option value="telugu">తెలుగు (Telugu)</option>
            <option value="marathi">मराठी (Marathi)</option>
            <option value="tamil">தமிழ் (Tamil)</option>
            <option value="gujarati">ગુજરાતી (Gujarati)</option>
            <option value="kannada">ಕನ್ನಡ (Kannada)</option>
            <option value="malayalam">മലയാളം (Malayalam)</option>
            <option value="punjabi">ਪੰਜਾਬੀ (Punjabi)</option>
            <option value="urdu">اردو (Urdu)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
