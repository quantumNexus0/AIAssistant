import { useState, useEffect, useRef } from 'react';

import {
  MessageSquare,
  Scale,
  Search,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Layers,
  Menu,
  Globe
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export default function Layout({
  children,
  activeTab,
  setActiveTab,
  currentChatId,
  setCurrentChatId,
  model,
  setModel,
  language,
  setLanguage
}) {
  const [chats, setChats] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState('checking');
  const [availableModels, setAvailableModels] = useState(['llama3.2']);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarRef = useRef(null);

  const LANGUAGES = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'हिन्दी' },
    { value: 'bengali', label: 'বাংলা' },
    { value: 'telugu', label: 'తెలుగు' },
    { value: 'marathi', label: 'मराठी' },
    { value: 'tamil', label: 'தமிழ்' },
    { value: 'gujarati', label: 'ગુજરાતી' },
    { value: 'kannada', label: 'ಕನ್ನಡ' },
    { value: 'malayalam', label: 'മലയാളം' },
    { value: 'punjabi', label: 'ਪੰਜਾਬੀ' },
    { value: 'urdu', label: 'اردو' },
    { value: 'spanish', label: 'Español' },
    { value: 'french', label: 'Français' },
  ];

  const getShortModelName = (name) => {
    if (!name) return '';
    return name.split(':')[0].split('/').pop();
  };

  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_BASE}/chats`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  };

  const SLOW_MODELS = ['deepseek', 'llama3.1:70b', 'llama3.3', 'mixtral', 'qwen2:72b'];
  const isSlowModel = (m) => m && SLOW_MODELS.some(s => m.toLowerCase().includes(s));

  const getModelLabel = (name) => {
    const short = name.split(':')[0].split('/').pop();
    return isSlowModel(name) ? `${short} ⏳` : short;
  };

  const checkOllama = async () => {
    setOllamaStatus('checking');
    try {
      const res = await fetch(`${API_BASE}/ai/health`);
      if (res.ok) {
        const data = await res.json();
        setOllamaStatus(data.status === 'connected' ? 'connected' : 'disconnected');
        if (data.available_models && data.available_models.length > 0) {
          setAvailableModels(data.available_models);
          const savedModel = localStorage.getItem('nyayaai_model');
          const currentChoice = savedModel || model;
          if (!data.available_models.includes(currentChoice)) {
            const fast = data.available_models.find(m => !isSlowModel(m));
            setModel(fast || data.available_models[0]);
          }
        }
      } else {
        setOllamaStatus('disconnected');
      }
    } catch (err) {
      setOllamaStatus('disconnected');
    }
  };

  useEffect(() => {
    fetchChats();
    checkOllama();

    const handleHistoryChange = () => fetchChats();
    window.addEventListener('chat_history_changed', handleHistoryChange);

    // Close mobile menu on outside click
    const handleOutsideClick = (e) => {
      if (
        mobileMenuOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        !e.target.closest('.mobile-hamburger-btn')
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      window.removeEventListener('chat_history_changed', handleHistoryChange);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [mobileMenuOpen]);

  const handleNewChat = async () => {
    try {
      const res = await fetch(`${API_BASE}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "New Consultation",
          model: model,
          language: language,
          mode: "general"
        })
      });
      if (res.ok) {
        const newSession = await res.json();
        setChats(prev => [newSession, ...prev]);
        setCurrentChatId(newSession.id);
        setActiveTab('chat');
        setMobileMenuOpen(false);
      }
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  const handleDeleteChat = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this consultation?")) return;
    try {
      const res = await fetch(`${API_BASE}/chats/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setChats(prev => prev.filter(c => c.id !== id));
        if (currentChatId === id) setCurrentChatId(null);
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  const startEditing = (chat, e) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const saveRename = async (id, e) => {
    e.stopPropagation();
    if (!editingTitle.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/chats/${id}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle })
      });
      if (res.ok) {
        setChats(prev => prev.map(c => c.id === id ? { ...c, title: editingTitle } : c));
        setEditingChatId(null);
      }
    } catch (err) {
      console.error("Error renaming chat:", err);
    }
  };

  const cancelRename = (e) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  const handleChatSelect = (id) => {
    setCurrentChatId(id);
    setActiveTab('chat');
    setMobileMenuOpen(false);
  };

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-container">

      {/* ═══ MOBILE TOP BAR ═══ */}
      <header className="mobile-topbar">
        <button
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label="Toggle navigation menu"
          id="hamburger-btn"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Mobile Logo */}
        <div className="mobile-logo">
          <div className="mobile-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 6V8M12 16V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="mobile-logo-text">Nyaya AI</span>
        </div>

        <div className="mobile-topbar-right">
          {/* Language selector in mobile topbar */}
          <div className="mobile-lang-selector">
            <Globe size={14} />
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              aria-label="Select language"
            >
              {LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* ═══ MOBILE OVERLAY ═══ */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside
        ref={sidebarRef}
        className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
      >

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 5V7M12 17V19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="logo-text">
            <h2>Nyaya AI</h2>
            <span>Indian Legal Assistant</span>
          </div>
        </div>

        {/* New Chat */}
        <div className="new-chat-row">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <Plus size={16} />
            <span>New Consultation</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="sidebar-nav">
          <div className="sidebar-section-title font-mono">Tools</div>
          <button
            className={`nav-item ${activeTab === 'chat' && !currentChatId ? 'active' : ''}`}
            onClick={() => { setCurrentChatId(null); handleNavClick('chat'); }}
          >
            <MessageSquare size={16} />
            <span>AI Legal Chat</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'rights' ? 'active' : ''}`}
            onClick={() => handleNavClick('rights')}
          >
            <Scale size={16} />
            <span>Know Your Rights</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'analyze' ? 'active' : ''}`}
            onClick={() => handleNavClick('analyze')}
          >
            <Search size={16} />
            <span>Case Analyzer</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => handleNavClick('docs')}
          >
            <FileText size={16} />
            <span>Draft Documents</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => handleNavClick('tools')}
          >
            <Layers size={16} />
            <span>Legal Utilities</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="history-section">
          <div className="sidebar-section-title font-mono">History</div>
          <div className="history-list">
            {chats.length === 0 ? (
              <div className="empty-history">No past consultations</div>
            ) : (
              chats.map(chat => (
                <div
                  key={chat.id}
                  className={`history-item ${currentChatId === chat.id && activeTab === 'chat' ? 'active' : ''}`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <MessageSquare size={14} className="history-icon" />
                  {editingChatId === chat.id ? (
                    <div className="rename-container" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveRename(chat.id, e);
                          if (e.key === 'Escape') cancelRename(e);
                        }}
                        autoFocus
                      />
                      <button onClick={e => saveRename(chat.id, e)} className="rename-confirm">
                        <Check size={12} />
                      </button>
                      <button onClick={cancelRename} className="rename-cancel">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="history-title">{chat.title}</span>
                      <div className="history-actions">
                        <button onClick={e => startEditing(chat, e)} title="Rename">
                          <Edit3 size={12} />
                        </button>
                        <button onClick={e => handleDeleteChat(chat.id, e)} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Configuration Footer */}
        <div className="sidebar-footer">
          {/* Language Selector in Sidebar */}
          <div className="sidebar-language-selector">
            <Globe size={13} className="sidebar-lang-icon" />
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="sidebar-lang-select"
              aria-label="Select response language"
            >
              {LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="model-input-wrapper">
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={ollamaStatus === 'disconnected'}
              className="model-dropdown"
              title={isSlowModel(model) ? 'This model is slow — expect long wait times. Use llama3.2 for faster results.' : 'Select AI model'}
            >
              {availableModels.map(m => (
                <option key={m} value={m}>{getModelLabel(m)}</option>
              ))}
            </select>
            {isSlowModel(model) && (
              <div style={{ fontSize: '0.62rem', color: '#d97706', marginTop: '3px', fontFamily: 'var(--font-mono)', padding: '2px 4px', background: 'rgba(245,158,11,0.08)', borderRadius: '3px', border: '1px solid rgba(245,158,11,0.2)' }}>
                ⏳ Slow model — may timeout. Switch to llama3.2 for best results.
              </div>
            )}
          </div>
          <div className="footer-controls" style={{ justifyContent: 'center' }}>
            {/* Footer controls preserved */}
          </div>
        </div>

      </aside>

      {/* ═══ MAIN WORKSPACE ═══ */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}