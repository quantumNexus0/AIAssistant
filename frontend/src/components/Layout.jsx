import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Scale, 
  Search, 
  FileText, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Sun, 
  Moon, 
  Activity,
  Layers
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

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
  const [ollamaStatus, setOllamaStatus] = useState('checking'); // 'connected' | 'disconnected' | 'checking'
  const [availableModels, setAvailableModels] = useState(['llama3.2']);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Fetch chats list
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

  // Check Ollama connection status & models
  const checkOllama = async () => {
    setOllamaStatus('checking');
    try {
      const res = await fetch(`${API_BASE}/ai/health`);
      if (res.ok) {
        const data = await res.json();
        setOllamaStatus(data.status === 'connected' ? 'connected' : 'disconnected');
        if (data.available_models && data.available_models.length > 0) {
          setAvailableModels(data.available_models);
          // Set to first recommended model if current model is not in list
          if (!data.available_models.includes(model)) {
            setModel(data.available_models[0]);
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

    const handleHistoryChange = () => {
      fetchChats();
    };

    window.addEventListener('chat_history_changed', handleHistoryChange);
    return () => {
      window.removeEventListener('chat_history_changed', handleHistoryChange);
    };
  }, []);

  // Create a new chat session
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
      }
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  // Delete chat session
  const handleDeleteChat = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this consultation?")) return;
    try {
      const res = await fetch(`${API_BASE}/chats/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setChats(prev => prev.filter(c => c.id !== id));
        if (currentChatId === id) {
          setCurrentChatId(null);
        }
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  // Start editing title
  const startEditing = (chat, e) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  // Save renamed title
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
  };

  return (
    <div className="app-container">
      {/* ═══ SIDEBAR ═══ */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">न्</div>
          <div className="logo-text">
            <h2>Nyaya AI</h2>
            <span>Indian Legal Assistant</span>
          </div>
        </div>

        {/* Action Button: New Consultation */}
        <button className="new-chat-btn" onClick={handleNewChat}>
          <Plus size={16} />
          <span>New Consultation</span>
        </button>

        {/* Navigation Tabs */}
        <div className="sidebar-nav">
          <div className="sidebar-section-title font-mono">Tools</div>
          <button 
            className={`nav-item ${activeTab === 'chat' && !currentChatId ? 'active' : ''}`}
            onClick={() => { setCurrentChatId(null); setActiveTab('chat'); }}
          >
            <MessageSquare size={16} />
            <span>AI Legal Chat</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'rights' ? 'active' : ''}`}
            onClick={() => setActiveTab('rights')}
          >
            <Scale size={16} />
            <span>Know Your Rights</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'analyze' ? 'active' : ''}`}
            onClick={() => setActiveTab('analyze')}
          >
            <Search size={16} />
            <span>Case Analyzer</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            <FileText size={16} />
            <span>Draft Documents</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            <Layers size={16} />
            <span>Legal Utilities</span>
          </button>
        </div>

        {/* Chat History list (stored in MongoDB) */}
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
          {/* Ollama Status & Refresh */}
          <div className="ollama-status-card">
            <div className="status-header">
              <span className="status-label">Ollama Service</span>
              <span className={`status-badge ${ollamaStatus}`}>
                <Activity size={10} style={{ marginRight: 4 }} />
                {ollamaStatus === 'checking' && 'Checking...'}
                {ollamaStatus === 'connected' && 'Online'}
                {ollamaStatus === 'disconnected' && 'Offline'}
              </span>
            </div>
            <select 
              value={model} 
              onChange={e => setModel(e.target.value)} 
              disabled={ollamaStatus === 'disconnected'}
              className="model-dropdown"
            >
              {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button className="refresh-status-btn" onClick={checkOllama}>
              Sync Models & Connection
            </button>
          </div>

          {/* Language selector */}
          <div className="footer-controls" style={{ justifyContent: 'center' }}>
            <div className="language-selector">
              <select value={language} onChange={e => setLanguage(e.target.value)}>
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
      </aside>

      {/* ═══ MAIN WORKSPACE ═══ */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
