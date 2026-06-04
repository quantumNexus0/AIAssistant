// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
let currentLang = 'en';
let currentMode = 'general';
let ollamaConnected = false;
let apiBase = 'http://localhost:8000/api/nyaya';
let chatHistory = [];
let selectedDocType = null;
let isGenerating = false;

const LANG_NAMES = {
  en: 'English', hi: 'हिन्दी', bn: 'বাংলা', te: 'తెలుగు',
  mr: 'मराठी', ta: 'தமிழ்', gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം', pa: 'ਪੰਜਾਬੀ', ur: 'اردو'
};

// ═══════════════════════════════════════════════════
// OLLAMA API
// ═══════════════════════════════════════════════════
async function checkOllama() {
  try {
    const res = await fetch(`${apiBase}/status`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      ollamaConnected = data.connected;
      const dot = document.getElementById('statusDot');
      if (ollamaConnected) {
        dot.classList.add('connected');
        showToast('✅ Backend connected to Ollama');
      } else {
        dot.classList.remove('connected');
        showToast('⚠️ Backend alive, but Ollama not reachable');
      }
    } else throw new Error();
  } catch {
    ollamaConnected = false;
    document.getElementById('statusDot').classList.remove('connected');
    showToast('❌ Backend server not reachable');
  }
}

async function queryOllama(prompt, system = '') {
  const model = document.getElementById('modelSelect').value;
  const messages = system
    ? [{ role: 'system', content: system }, ...chatHistory, { role: 'user', content: prompt }]
    : [...chatHistory, { role: 'user', content: prompt }];

  const res = await fetch(`${apiBase}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true })
  });

  if (!res.ok) throw new Error('Backend request failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // Backend might send raw text or JSON chunks depending on implementation
    // Our implementation in nyaya_ai.py uses StreamingResponse(ollama_service.chat_stream)
    // which yields raw content strings.
    fullText += chunk;
    streamToChat(fullText);
  }
  return fullText;
}

// Non-streaming for analysis
async function queryOllamaSimple(prompt, system = '', endpoint = 'chat') {
  const model = document.getElementById('modelSelect').value;
  const res = await fetch(`${apiBase}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, system, stream: false })
  });

  if (!res.ok) throw new Error('Backend request failed');
  const data = await res.json();
  // Match the keys returned by our backend router
  return data.analysis || data.draft || data.message?.content || '';
}

// ═══════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════
function buildSystemPrompt(mode = 'general') {
  const langInstr = currentLang !== 'en'
    ? `CRITICAL: You MUST respond entirely in ${LANG_NAMES[currentLang]} language. Do not use English unless the user writes in English.`
    : 'Respond in clear English.';

  const modeContexts = {
    general: 'You are a general Indian legal assistant covering all areas of law.',
    criminal: 'You specialize in Indian criminal law: IPC 1860, CrPC 1973, BNSS 2023, Evidence Act.',
    civil: 'You specialize in Indian civil law: CPC 1908, Specific Relief Act, Limitation Act.',
    family: 'You specialize in Indian family law: Hindu Marriage Act, Muslim Personal Law, Special Marriage Act, POCSO, Protection of Women from DV Act.',
    property: 'You specialize in Indian property law: Transfer of Property Act, RERA, Registration Act, stamp duty.',
    labour: 'You specialize in Indian labour law: Industrial Disputes Act, Factories Act, Minimum Wages Act, ESIC, PF.',
    tax: 'You specialize in Indian tax law: Income Tax Act 1961, GST Acts, customs and excise.',
    cyber: 'You specialize in Indian cyber law: IT Act 2000, IT Amendment Act 2008, DPDP Act 2023, cybercrime under IPC.'
  };

  return `You are Nyaya AI, an advanced AI legal assistant specializing in Indian law. ${modeContexts[mode] || modeContexts.general}

${langInstr}

GUIDELINES:
1. Always cite relevant Acts, Sections, and Articles (e.g., IPC Section 302, Article 21 of Constitution).
2. Structure responses with clear headings and bullet points.
3. Mention time limits (limitation periods) where relevant.
4. Always recommend consulting a qualified advocate for final advice.
5. Include relevant court and government resources (e.g., eCourts, NeSL, Legal Services Authority).
6. Be culturally sensitive to India's diverse legal systems (Hindu law, Muslim personal law, customary law).
7. Reference landmark Supreme Court judgments where applicable.
8. ALWAYS end with: "⚠️ Disclaimer: This is general legal information, not legal advice. Please consult a licensed advocate for your specific matter."

Format your response with clear sections using **bold headers**, bullet points, and law references in [Section X of Act Y] format.`;
}

// ═══════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════
let streamBubble = null;

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || isGenerating) return;
  input.value = '';
  autoResize(input);
  askQuestion(text);
}

async function askQuestion(question) {
  if (isGenerating) return;
  document.getElementById('welcomeCard')?.remove();
  isGenerating = true;
  document.getElementById('sendBtn').disabled = true;

  appendUserMessage(question);
  appendTyping();

  chatHistory.push({ role: 'user', content: question });

  try {
    if (!ollamaConnected) {
      await checkOllama();
    }
    const system = buildSystemPrompt(currentMode);
    removeTyping();
    streamBubble = createAIBubble();
    const response = await queryOllama(question, system);
    finalizeAIBubble(streamBubble, response);
    chatHistory.push({ role: 'assistant', content: response });
  } catch (err) {
    removeTyping();
    if (streamBubble) streamBubble.remove();
    appendErrorMessage('Could not connect to the Backend or Ollama. Please ensure:\n\n1. Backend server is running (python -m app.main)\n2. Ollama is running (ollama serve)\n3. Model is pulled (ollama pull ' + document.getElementById('modelSelect').value + ')');
  } finally {
    isGenerating = false;
    document.getElementById('sendBtn').disabled = false;
    streamBubble = null;
  }
}

function appendUserMessage(text) {
  const container = document.getElementById('chatContainer');
  const msg = document.createElement('div');
  msg.className = 'message user';
  msg.innerHTML = `
    <div class="msg-avatar user">👤</div>
    <div class="msg-body">
      <div class="msg-meta">You &nbsp;<span class="msg-lang-badge">${LANG_NAMES[currentLang]}</span></div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    </div>`;
  container.appendChild(msg);
  scrollBottom();
}

function appendTyping() {
  const container = document.getElementById('chatContainer');
  const el = document.createElement('div');
  el.className = 'message'; el.id = 'typingIndicator';
  el.innerHTML = `
    <div class="msg-avatar ai">⚖️</div>
    <div class="msg-body">
      <div class="msg-meta">Nyaya AI</div>
      <div class="msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
    </div>`;
  container.appendChild(el);
  scrollBottom();
}

function removeTyping() {
  document.getElementById('typingIndicator')?.remove();
}

function createAIBubble() {
  const container = document.getElementById('chatContainer');
  const msg = document.createElement('div');
  msg.className = 'message';
  msg.innerHTML = `
    <div class="msg-avatar ai">⚖️</div>
    <div class="msg-body">
      <div class="msg-meta">Nyaya AI &nbsp;<span class="msg-lang-badge">${LANG_NAMES[currentLang]}</span></div>
      <div class="msg-bubble" id="streamTarget"></div>
    </div>`;
  container.appendChild(msg);
  scrollBottom();
  return document.getElementById('streamTarget');
}

function streamToChat(text) {
  if (!streamBubble) return;
  streamBubble.innerHTML = formatLegalText(text);
  scrollBottom();
}

function finalizeAIBubble(bubble, text) {
  if (!bubble) return;
  bubble.id = '';
  bubble.innerHTML = formatLegalText(text) + `<div class="disclaimer">⚠️ This is general legal information, not legal advice. Consult a licensed advocate for your specific matter.</div>`;
}

function appendErrorMessage(text) {
  const container = document.getElementById('chatContainer');
  const msg = document.createElement('div');
  msg.className = 'message';
  msg.innerHTML = `
    <div class="msg-avatar ai">⚠️</div>
    <div class="msg-body">
      <div class="msg-meta" style="color:#f87171">Connection Error</div>
      <div class="msg-bubble" style="border-color:rgba(239,68,68,0.3)">
        <strong style="color:#f87171">Ollama Not Connected</strong><br><br>
        <pre style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#93c5fd;white-space:pre-wrap">${escapeHtml(text)}</pre>
        <br>Then click <strong>Check Connection</strong> in the sidebar.
      </div>
    </div>`;
  container.appendChild(msg);
  scrollBottom();
}

function formatLegalText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/#{1,3} (.+)/g, '<h3>$1</h3>')
    .replace(/\[([^\]]+)\]/g, '<span class="law-ref">$1</span>')
    .replace(/Article (\d+[A-Z]?)/g, '<span class="law-ref">Article $1</span>')
    .replace(/Section (\d+[A-Z]?)/g, '<span class="law-ref">Section $1</span>')
    .replace(/IPC (\d+)/g, '<span class="law-ref">IPC $1</span>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function askTopic(question) {
  document.getElementById('chatInput').value = question;
  sendMessage();
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function clearChat() {
  chatHistory = [];
  document.getElementById('chatContainer').innerHTML = '';
  showToast('🗑 Chat cleared');
}

function exportChat() {
  const text = chatHistory.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nyaya-ai-consultation.txt';
  a.click();
}

function startNewConsultation() {
  clearChat();
  const wc = document.createElement('div');
  wc.className = 'welcome-card'; wc.id = 'welcomeCard';
  wc.innerHTML = document.querySelector('.welcome-card') ? '' : `
    <div class="ashoka">⚖️</div>
    <h2>New Consultation</h2>
    <p>Start a fresh legal consultation. Your previous conversation has been cleared.</p>`;
  document.getElementById('chatContainer').appendChild(wc);
}

function toggleMode(btn, mode) {
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentMode = mode;
}

// ═══════════════════════════════════════════════════
// LANGUAGE
// ═══════════════════════════════════════════════════
function setLanguage(lang) {
  currentLang = lang;
  showToast(`🌐 Language set to ${LANG_NAMES[lang]}`);
}

// ═══════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════
const PAGE_META = {
  chat: { title: 'AI Legal Chat', sub: 'Ask any legal question about Indian law' },
  rights: { title: 'Know Your Rights', sub: 'Fundamental rights under Constitution of India' },
  analyze: { title: 'Case Analyzer', sub: 'AI-powered legal case analysis' },
  docs: { title: 'Document Drafting', sub: 'Generate legal documents with AI' },
  refs: { title: 'Legal References', sub: 'Key Indian laws and acts' }
};

function switchTab(tab, navEl) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('panel-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (navEl) navEl.classList.add('active');
  else document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');

  const meta = PAGE_META[tab];
  document.getElementById('pageTitle').textContent = meta.title;
  document.getElementById('pageBreadcrumb').textContent = meta.sub;
}

// ═══════════════════════════════════════════════════
// RIGHTS DATA
// ═══════════════════════════════════════════════════
const RIGHTS_DATA = [
  { art: 'Article 12–35', title: 'Fundamental Rights Overview', icon: '🏛', desc: 'Part III of the Constitution guarantees six categories of fundamental rights to all citizens.' },
  { art: 'Article 14', title: 'Right to Equality', icon: '⚖️', desc: 'Equality before law and equal protection. No discrimination by State on grounds of religion, race, caste, sex, or birth.' },
  { art: 'Article 19', title: 'Freedom of Speech', icon: '🗣', desc: 'Freedom of speech & expression, assembly, association, movement, residence, and profession.' },
  { art: 'Article 21', title: 'Right to Life & Liberty', icon: '💙', desc: 'No person shall be deprived of life or personal liberty except by procedure established by law.' },
  { art: 'Article 21A', title: 'Right to Education', icon: '📚', desc: 'Free and compulsory education for all children between 6–14 years of age.' },
  { art: 'Article 22', title: 'Protection on Arrest', icon: '🚔', desc: 'Right to be informed of grounds of arrest, consult a legal practitioner, and be produced before magistrate within 24 hours.' },
  { art: 'Article 23–24', title: 'Rights Against Exploitation', icon: '🛡', desc: 'Prohibition of traffic in human beings, forced labour, and employment of children in hazardous occupations.' },
  { art: 'Article 25–28', title: 'Religious Freedom', icon: '🙏', desc: 'Freedom of conscience, right to freely profess, practice, and propagate religion.' },
  { art: 'Article 29–30', title: 'Cultural & Educational Rights', icon: '🎓', desc: 'Protection of interests of minorities; right to establish and administer educational institutions.' },
  { art: 'Article 32', title: 'Right to Constitutional Remedies', icon: '🔔', desc: '"Heart and soul of the Constitution." Right to move Supreme Court for enforcement of fundamental rights. Writ jurisdiction.' },
  { art: 'RTI Act 2005', title: 'Right to Information', icon: '📋', desc: 'Every citizen can request information from public authorities within 30 days.' },
  { art: 'POSH Act 2013', title: 'Protection at Workplace', icon: '👩💼', desc: 'Prevention, prohibition, and redressal of sexual harassment at workplace for women.' }
];

function renderRights() {
  const grid = document.getElementById('rightsGrid');
  grid.innerHTML = RIGHTS_DATA.map(r => `
    <div class="right-card" onclick="exploreRight('${r.title}', '${r.art}')">
      <div class="art-ref">${r.art}</div>
      <div style="font-size:24px;margin-bottom:8px">${r.icon}</div>
      <h4>${r.title}</h4>
      <p>${r.desc}</p>
      <button class="expand-btn">Ask AI about this →</button>
    </div>`).join('');
}

function exploreRight(title, art) {
  switchTab('chat');
  setTimeout(() => askTopic(`Explain ${title} (${art}) in Indian law. Include landmark Supreme Court judgments, how to enforce this right, and practical steps a citizen can take.`), 100);
}

// ═══════════════════════════════════════════════════
// REFERENCES
// ═══════════════════════════════════════════════════
const REFS_DATA = [
  { icon: '⚔️', title: 'Bharatiya Nyaya Sanhita (BNS) 2023', desc: 'New criminal code replacing IPC 1860 from July 2024. 358 sections covering all criminal offences.', badge: 'Criminal Law' },
  { icon: '👮', title: 'Bharatiya Nagarik Suraksha Sanhita 2023', desc: 'Replaces CrPC 1973. Governs criminal procedure, trials, bail, and appeals.', badge: 'Procedure' },
  { icon: '🏛', title: 'Constitution of India 1950', desc: '395 articles, 12 schedules. Supreme law of the land. Includes fundamental rights, DPSP, and federal structure.', badge: 'Constitutional' },
  { icon: '💒', title: 'Hindu Marriage Act 1955', desc: 'Governs marriage, divorce, alimony, and child custody for Hindus, Buddhists, Jains, and Sikhs.', badge: 'Family Law' },
  { icon: '🏠', title: 'Transfer of Property Act 1882', desc: 'Governs transfer of immovable property by act of parties — sale, mortgage, lease, exchange, gift.', badge: 'Property' },
  { icon: '🛒', title: 'Consumer Protection Act 2019', desc: 'Rights of consumers, product liability, unfair trade practices, and establishment of Consumer Commissions.', badge: 'Consumer' },
  { icon: '💻', title: 'Information Technology Act 2000', desc: 'Legal recognition for electronic transactions, cybercrime offences, data protection, and intermediary liability.', badge: 'Cyber Law' },
  { icon: '💰', title: 'Income Tax Act 1961', desc: 'Comprehensive law on taxation of income, deductions, TDS, advance tax, and appeals.', badge: 'Tax' },
  { icon: '📋', title: 'RTI Act 2005', desc: 'Empowers citizens to seek information from public authorities. 30-day response deadline. Central Information Commission.', badge: 'Transparency' },
  { icon: '👷', title: 'Labour Codes 2020', desc: 'Four labour codes consolidating 29 central laws: Wages, Industrial Relations, Social Security, and Occupational Safety.', badge: 'Labour' },
  { icon: '🏗', title: 'RERA 2016', desc: 'Real Estate Regulatory Authority Act. Protects homebuyers, regulates real estate developers and agents.', badge: 'Real Estate' },
  { icon: '🌿', title: 'POCSO Act 2012', desc: 'Protection of Children from Sexual Offences. Comprehensive law for child sexual abuse with stringent penalties.', badge: 'Child Protection' }
];

function renderRefs() {
  const grid = document.getElementById('refGrid');
  grid.innerHTML = REFS_DATA.map(r => `
    <div class="ref-card" onclick="learnAbout('${r.title}')">
      <div class="ref-card-icon">${r.icon}</div>
      <h3>${r.title}</h3>
      <p>${r.desc}</p>
      <span class="ref-badge">${r.badge}</span>
    </div>`).join('');
}

function learnAbout(title) {
  switchTab('chat');
  setTimeout(() => askTopic(`Give me a comprehensive overview of ${title} — key provisions, important sections, rights it provides, penalties, and how to use it.`), 100);
}

// ═══════════════════════════════════════════════════
// CASE ANALYZER
// ═══════════════════════════════════════════════════
async function analyzeCase() {
  const cat = document.getElementById('caseCategory').value;
  const state = document.getElementById('stateSelect').value;
  const desc = document.getElementById('caseDesc').value.trim();

  if (!desc) { showToast('Please describe your situation'); return; }

  const resultEl = document.getElementById('analysisResult');
  resultEl.innerHTML = `<div class="typing-indicator" style="justify-content:center"><span></span><span></span><span></span></div><p style="text-align:center;color:var(--text-muted);font-size:13px;margin-top:8px">Analyzing your case…</p>`;

  const prompt = `Analyze this legal situation in India:
Category: ${cat}
State/Jurisdiction: ${state}
Description: ${desc}

Provide structured analysis with:
1. RISK ASSESSMENT (High/Medium/Low) with reasoning
2. APPLICABLE LAWS & SECTIONS
3. IMMEDIATE STEPS TO TAKE (numbered, priority order)
4. LEGAL REMEDIES AVAILABLE
5. RELEVANT COURTS/FORUMS (which court/commission to approach)
6. TIME LIMITS (limitation periods if applicable)
7. ESTIMATED PROCESS TIMELINE
8. LEGAL AID options if needed

${currentLang !== 'en' ? `Respond in ${LANG_NAMES[currentLang]}.` : ''}`;

  try {
    const system = `You are a senior Indian legal analyst. Provide structured, practical legal analysis for cases in India. Always cite relevant sections and acts. Format clearly.`;
    const result = await queryOllamaSimple(prompt, system, 'analyze');
    resultEl.innerHTML = `<div class="analysis-result">${formatLegalText(result)}</div>`;
  } catch {
    resultEl.innerHTML = `<div class="result-placeholder"><div class="icon">❌</div><div>Could not connect to Ollama. Please check your connection.</div></div>`;
  }
}

// ═══════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════
const DOC_TYPES = [
  { icon: '📜', title: 'Legal Notice', desc: 'Formal notice before litigation' },
  { icon: '🤝', title: 'Sale Agreement', desc: 'Property sale agreement' },
  { icon: '🏠', title: 'Rental Agreement', desc: 'Residential lease deed' },
  { icon: '💼', title: 'Employment Contract', desc: 'Offer letter & contract' },
  { icon: '🤲', title: 'Affidavit', desc: 'Sworn statement format' },
  { icon: '📋', title: 'RTI Application', desc: 'Right to Information request' },
  { icon: '⚖️', title: 'FIR Draft', desc: 'First Information Report help' },
  { icon: '📝', title: 'Consumer Complaint', desc: 'Consumer forum complaint' },
  { icon: '💰', title: 'Loan Agreement', desc: 'Personal loan document' },
  { icon: '🎗', title: 'Will / Testament', desc: 'Last will and testament' },
  { icon: '🏭', title: 'Partnership Deed', desc: 'Business partnership agreement' },
  { icon: '🛡', title: 'Power of Attorney', desc: 'General / Special PoA' }
];

function renderDocTypes() {
  const el = document.getElementById('docTypes');
  el.innerHTML = DOC_TYPES.map((d, i) => `
    <div class="doc-type-card ${selectedDocType === i ? 'selected' : ''}" onclick="selectDocType(${i})">
      <div class="dt-icon">${d.icon}</div>
      <h4>${d.title}</h4>
      <p>${d.desc}</p>
    </div>`).join('');
}

function selectDocType(i) {
  selectedDocType = i;
  renderDocTypes();
  const doc = DOC_TYPES[i];
  const area = document.getElementById('docFormArea');
  area.innerHTML = `
    <div class="analyzer-card" style="margin-top:20px;max-width:600px">
      <h3>${doc.icon} Generate: ${doc.title}</h3>
      <div class="form-group">
        <label>Party 1 (Name / Company)</label>
        <input type="text" id="party1" placeholder="Full legal name or company name" />
      </div>
      <div class="form-group">
        <label>Party 2 (Name / Company)</label>
        <input type="text" id="party2" placeholder="Full legal name or company name" />
      </div>
      <div class="form-group">
        <label>Key Details</label>
        <textarea id="docDetails" placeholder="Describe the specific details for this document (subject matter, amounts, dates, terms, etc.)"></textarea>
      </div>
      <div class="form-group">
        <label>State / Jurisdiction</label>
        <input type="text" id="docState" placeholder="e.g. Maharashtra" />
      </div>
      <button class="analyze-btn" onclick="generateDocument(${i})">✍️ Generate Document Draft</button>
      <div id="docOutput" style="margin-top:16px"></div>
    </div>`;
}

async function generateDocument(i) {
  const doc = DOC_TYPES[i];
  const p1 = document.getElementById('party1').value;
  const p2 = document.getElementById('party2').value;
  const details = document.getElementById('docDetails').value;
  const state = document.getElementById('docState').value;
  const out = document.getElementById('docOutput');

  out.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;

  const prompt = `Draft a professional ${doc.title} for India with these details:
Party 1: ${p1 || 'Party A'}
Party 2: ${p2 || 'Party B'}
Details: ${details}
Jurisdiction: ${state || 'India'}
Date: ${new Date().toLocaleDateString('en-IN')}

Create a legally sound, complete document in the standard Indian legal format. Include all necessary clauses, recitals, and signatures section. Reference applicable Indian laws.
${currentLang !== 'en' ? `Draft in ${LANG_NAMES[currentLang]}.` : ''}`;

  try {
    const result = await queryOllamaSimple(prompt, 'You are an expert Indian legal document drafter. Create professional, legally compliant documents following Indian law and standard Indian legal formatting conventions.', 'draft');
    out.innerHTML = `
      <div class="analysis-result" style="font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.8;white-space:pre-wrap">${escapeHtml(result)}</div>
      <button class="analyze-btn" style="margin-top:12px" onclick="copyDoc()">📋 Copy Document</button>`;
    window._lastDoc = result;
  } catch {
    out.innerHTML = `<div style="color:#f87171">Failed to generate. Check Ollama connection.</div>`;
  }
}

function copyDoc() {
  if (window._lastDoc) {
    navigator.clipboard.writeText(window._lastDoc);
    showToast('📋 Document copied to clipboard!');
  }
}

// ═══════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════
function scrollBottom() {
  const c = document.getElementById('chatContainer');
  if (c) c.scrollTop = c.scrollHeight;
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
renderRights();
renderRefs();
renderDocTypes();
checkOllama();
