import React, { useState } from 'react';
import { Search, Compass, BookOpen, Clock, HelpCircle, ArrowRight } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

const REFS_DATA = [
  { icon: '⚔️', title: 'Bharatiya Nyaya Sanhita (BNS) 2023', desc: 'New criminal code replacing IPC 1860 from July 2024. 358 sections covering all criminal offences.', badge: 'Criminal Law' },
  { icon: '👮', title: 'Bharatiya Nagarik Suraksha Sanhita 2023', desc: 'Replaces CrPC 1973. Governs criminal procedure, trials, bail, and appeals.', badge: 'Procedure' },
  { icon: '🏛', title: 'Constitution of India 1950', desc: '395 articles, 12 schedules. Supreme law of the land. Includes fundamental rights, DPSP, and federal structure.', badge: 'Constitutional' },
  { icon: '💒', title: 'Hindu Marriage Act 1955', desc: 'Governs marriage, divorce, alimony, and child custody for Hindus, Buddhists, Jains, and Sikhs.', badge: 'Family Law' },
  { icon: '🏠', title: 'Transfer of Property Act 1882', desc: 'Governs transfer of immovable property by act of parties — sale, mortgage, lease, exchange, gift.', badge: 'Property' },
  { icon: '🛒', title: 'Consumer Protection Act 2019', desc: 'Rights of consumers, product liability, unfair trade practices, and establishment of Consumer Commissions.', badge: 'Consumer' },
  { icon: '💻', title: 'Information Technology Act 2000', desc: 'Legal recognition for electronic transactions, cybercrime offences, data protection, and intermediary liability.', badge: 'Cyber Law' },
  { icon: '💰', title: 'Income Tax Act 1961', desc: 'Comprehensive law on taxation of income, deductions, TDS, advance tax, and appeals.', badge: 'Tax' },
  { icon: '📋', title: 'RTI Act 2005', desc: 'Empowers citizens to seek information from public authorities. 30-day response deadline.', badge: 'Transparency' },
  { icon: '👷', title: 'Labour Codes 2020', desc: 'Four labour codes consolidating 29 central laws: Wages, Relations, Security, and Safety.', badge: 'Labour' },
  { icon: '🏗', title: 'RERA 2016', desc: 'Real Estate Regulatory Authority Act. Protects homebuyers, regulates real estate developers and agents.', badge: 'Real Estate' },
  { icon: '🌿', title: 'POCSO Act 2012', desc: 'Protection of Children from Sexual Offences. Comprehensive law for child sexual abuse with stringent penalties.', badge: 'Child Protection' }
];

export default function LegalToolsTab({ onLearnAboutReference, model }) {
  const [activeSubTool, setActiveSubTool] = useState('explainer'); // 'explainer' | 'limitation' | 'precedents' | 'references'

  // Section Explainer state
  const [expSection, setExpSection] = useState('');
  const [expAct, setExpAct] = useState('');
  const [expContext, setExpContext] = useState('');
  const [expLang, setExpLang] = useState('english');
  const [expResult, setExpResult] = useState(null);
  const [expLoading, setExpLoading] = useState(false);

  // Limitation Calculator state
  const [limAction, setLimAction] = useState('');
  const [limDate, setLimDate] = useState('');
  const [limCaseType, setLimCaseType] = useState('civil');
  const [limState, setLimState] = useState('');
  const [limResult, setLimResult] = useState(null);
  const [limLoading, setLimLoading] = useState(false);

  // Precedents search state
  const [precQuery, setPrecQuery] = useState('');
  const [precCaseType, setPrecCaseType] = useState('');
  const [precCourt, setPrecCourt] = useState('Supreme Court of India');
  const [precResult, setPrecResult] = useState([]);
  const [precLoading, setPrecLoading] = useState(false);

  // Explainer request
  const handleExplainSection = async (e) => {
    e.preventDefault();
    if (!expSection || !expAct) return;
    setExpLoading(true);
    setExpResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/explain-section?section=${encodeURIComponent(expSection)}&act=${encodeURIComponent(expAct)}&context=${encodeURIComponent(expContext)}&language=${expLang}&model=${model}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        let parsed = data;
        if (typeof data === 'string') {
          // Parse if returned as markdown/string from Ollama
          let cleaned = data.trim();
          if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "");
          parsed = JSON.parse(cleaned.trim());
        } else if (data.response) {
          let content = data.response.trim();
          if (content.startsWith("```json")) content = content.replace(/^```json/, "").replace(/```$/, "");
          parsed = JSON.parse(content);
        } else if (data.message?.content) {
          let content = data.message.content.trim();
          if (content.startsWith("```json")) content = content.replace(/^```json/, "").replace(/```$/, "");
          parsed = JSON.parse(content);
        }
        setExpResult(parsed);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to explain section. Verify Ollama model status.");
    } finally {
      setExpLoading(false);
    }
  };

  // Limitation request
  const handleCalculateLimitation = async (e) => {
    e.preventDefault();
    if (!limAction || !limDate) return;
    setLimLoading(true);
    setLimResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/limitation-check?action_type=${encodeURIComponent(limAction)}&event_date=${encodeURIComponent(limDate)}&case_type=${encodeURIComponent(limCaseType)}&state=${encodeURIComponent(limState)}&model=${model}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        let parsed = data;
        if (typeof data === 'string') {
          let cleaned = data.trim();
          if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "");
          parsed = JSON.parse(cleaned.trim());
        } else if (data.response) {
          let content = data.response.trim();
          if (content.startsWith("```json")) content = content.replace(/^```json/, "").replace(/```$/, "");
          parsed = JSON.parse(content);
        } else if (data.message?.content) {
          let content = data.message.content.trim();
          if (content.startsWith("```json")) content = content.replace(/^```json/, "").replace(/```$/, "");
          parsed = JSON.parse(content);
        }
        setLimResult(parsed);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to calculate limitation period.");
    } finally {
      setLimLoading(false);
    }
  };

  // Precedents request
  const handleFindPrecedents = async (e) => {
    e.preventDefault();
    if (!precQuery) return;
    setPrecLoading(true);
    setPrecResult([]);
    try {
      const res = await fetch(`${API_BASE}/ai/precedents?query=${encodeURIComponent(precQuery)}&case_type=${encodeURIComponent(precCaseType)}&court=${encodeURIComponent(precCourt)}&model=${model}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        let parsed = data;
        if (typeof data === 'string') {
          let cleaned = data.trim();
          if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "");
          parsed = JSON.parse(cleaned.trim());
        } else if (data.response) {
          let content = data.response.trim();
          if (content.startsWith("```json")) content = content.replace(/^```json/, "").replace(/```$/, "");
          parsed = JSON.parse(content);
        } else if (data.message?.content) {
          let content = data.message.content.trim();
          if (content.startsWith("```json")) content = content.replace(/^```json/, "").replace(/```$/, "");
          parsed = JSON.parse(content);
        }
        setPrecResult(Array.isArray(parsed) ? parsed : (parsed.cases || []));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to find precedents.");
    } finally {
      setPrecLoading(false);
    }
  };

  return (
    <div className="tab-panel-container legal-tools-wrapper">
      <div className="tab-panel-header print-hide">
        <h2>Legal Utilities & References</h2>
        <p>Use specialized calculators, statutory section explainers, and search precedents, or browse reference acts.</p>
        
        {/* Tool selector */}
        <div className="sub-tools-tab-bar mt-3 font-mono">
          <button className={activeSubTool === 'explainer' ? 'active' : ''} onClick={() => setActiveSubTool('explainer')}>
            <BookOpen size={13} style={{ marginRight: 5 }} /> Section Explainer
          </button>
          <button className={activeSubTool === 'limitation' ? 'active' : ''} onClick={() => setActiveSubTool('limitation')}>
            <Clock size={13} style={{ marginRight: 5 }} /> Limitation Calculator
          </button>
          <button className={activeSubTool === 'precedents' ? 'active' : ''} onClick={() => setActiveSubTool('precedents')}>
            <Compass size={13} style={{ marginRight: 5 }} /> Precedent Finder
          </button>
          <button className={activeSubTool === 'references' ? 'active' : ''} onClick={() => setActiveSubTool('references')}>
            <Search size={13} style={{ marginRight: 5 }} /> Act References
          </button>
        </div>
      </div>

      <div className="sub-tool-content-box mt-4">
        {/* 1. SECTION EXPLAINER */}
        {activeSubTool === 'explainer' && (
          <div className="sub-tool-layout animate-fade-in">
            <div className="analyzer-split-grid">
              <form className="analyzer-form-panel" onSubmit={handleExplainSection}>
                <div className="section-group-card">
                  <h3>📖 Explain Legal Provision</h3>
                  <div className="form-group">
                    <label>Section Number (e.g. 302 or 138)</label>
                    <input type="text" value={expSection} onChange={e => setExpSection(e.target.value)} placeholder="e.g. 420" required />
                  </div>
                  <div className="form-group">
                    <label>Act / Code (e.g. IPC, CrPC, BNS, or Income Tax Act)</label>
                    <input type="text" value={expAct} onChange={e => setExpAct(e.target.value)} placeholder="e.g. BNS 2023" required />
                  </div>
                  <div className="form-group">
                    <label>Context / Fact Scenario (Optional)</label>
                    <textarea value={expContext} onChange={e => setExpContext(e.target.value)} rows={3} placeholder="Provide case details to explain how this section applies specifically..." />
                  </div>
                  <div className="form-group">
                    <label>Language</label>
                    <select value={expLang} onChange={e => setExpLang(e.target.value)}>
                      <option value="english">English</option>
                      <option value="hindi">Hindi</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-2" disabled={expLoading}>
                  {expLoading ? "Explaining section..." : "Explain Section"}
                </button>
              </form>

              <div className="analyzer-output-panel">
                {expLoading && (
                  <div className="analysis-progress-card">
                    <div className="typing-dots"><span></span><span></span><span></span></div>
                    <p className="mt-2 text-xs font-mono">Fetching section contents & Supreme Court interpretations...</p>
                  </div>
                )}
                {!expResult && !expLoading && (
                  <div className="output-placeholder">
                    <HelpCircle size={40} className="placeholder-icon" />
                    <h3>Section Details</h3>
                    <p>Enter a Section number and Act on the left to view plain-language explanations, legal ingredients, and new equivalents.</p>
                  </div>
                )}
                {expResult && (
                  <div className="analysis-report-sheet font-mono text-xs leading-relaxed border p-4 rounded-lg bg-light-gray">
                    <h3 className="font-serif border-bottom pb-2 mb-3 text-sm font-bold">
                      Section {expSection} of {expAct} Analysis
                    </h3>
                    {Object.entries(expResult).map(([key, val]) => (
                      <div key={key} className="mb-3 border-bottom pb-2">
                        <strong className="uppercase text-muted text-xs block mb-1">
                          {key.replace(/_/g, ' ')}:
                        </strong>
                        <div className="whitespace-pre-wrap">{typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. LIMITATION CALCULATOR */}
        {activeSubTool === 'limitation' && (
          <div className="sub-tool-layout animate-fade-in">
            <div className="analyzer-split-grid">
              <form className="analyzer-form-panel" onSubmit={handleCalculateLimitation}>
                <div className="section-group-card">
                  <h3>⏱ Limitation period check</h3>
                  <div className="form-group">
                    <label>Action Type (e.g. Suit for recovery, Appeal against decree, Filing FIR)</label>
                    <input type="text" value={limAction} onChange={e => setLimAction(e.target.value)} placeholder="e.g. Appeal to High Court" required />
                  </div>
                  <div className="form-group">
                    <label>Date of Event / Cause of Action</label>
                    <input type="date" value={limDate} onChange={e => setLimDate(e.target.value)} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Case Type Context</label>
                      <select value={limCaseType} onChange={e => setLimCaseType(e.target.value)}>
                        <option value="civil">Civil Suit</option>
                        <option value="criminal">Criminal Case</option>
                        <option value="appeals">Appeal / Review / Revision</option>
                        <option value="consumer">Consumer Forum</option>
                      </select>
                    </div>
                    <div className="form-group flex-1">
                      <label>State (if state specific)</label>
                      <input type="text" value={limState} onChange={e => setLimState(e.target.value)} placeholder="e.g. Delhi" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-2" disabled={limLoading}>
                  {limLoading ? "Calculating..." : "Calculate Limitation Period"}
                </button>
              </form>

              <div className="analyzer-output-panel">
                {limLoading && (
                  <div className="analysis-progress-card">
                    <div className="typing-dots"><span></span><span></span><span></span></div>
                    <p className="mt-2 text-xs font-mono">Running dates through Limitation Act schedules...</p>
                  </div>
                )}
                {!limResult && !limLoading && (
                  <div className="output-placeholder">
                    <Clock size={40} className="placeholder-icon" />
                    <h3>Limitation Deadline</h3>
                    <p>Enter the legal action type and cause of action date on the left to verify if it is within filing timeline.</p>
                  </div>
                )}
                {limResult && (
                  <div className="analysis-report-sheet font-mono text-xs leading-relaxed border p-4 rounded-lg bg-light-gray">
                    <h3 className="font-serif border-bottom pb-2 mb-3 text-sm font-bold text-center">
                      Limitation Audit Report
                    </h3>
                    {Object.entries(limResult).map(([key, val]) => (
                      <div key={key} className="mb-2 border-bottom pb-2 flex-row-justify">
                        <strong className="uppercase text-muted text-xs mr-2">{key.replace(/_/g, ' ')}:</strong>
                        <span className={key === 'is_within_time' ? (val ? 'text-success font-bold' : 'text-danger font-bold') : ''}>
                          {typeof val === 'boolean' ? (val ? "YES" : "NO") : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. PRECEDENTS FINDER */}
        {activeSubTool === 'precedents' && (
          <div className="sub-tool-layout animate-fade-in">
            <div className="analyzer-split-grid">
              <form className="analyzer-form-panel" onSubmit={handleFindPrecedents}>
                <div className="section-group-card">
                  <h3>🔍 Indian Precedents Search</h3>
                  <div className="form-group">
                    <label>Legal Point / Ratio query</label>
                    <input type="text" value={precQuery} onChange={e => setPrecQuery(e.target.value)} placeholder="e.g. Child custody to mother when minor is under 5" required />
                  </div>
                  <div className="form-group">
                    <label>Area of Law (e.g. family, criminal, corporate)</label>
                    <input type="text" value={precCaseType} onChange={e => setPrecCaseType(e.target.value)} placeholder="e.g. family law" />
                  </div>
                  <div className="form-group">
                    <label>Focus Court</label>
                    <input type="text" value={precCourt} onChange={e => setPrecCourt(e.target.value)} placeholder="e.g. Supreme Court of India" />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-2" disabled={precLoading}>
                  {precLoading ? "Searching rulings..." : "Search Precedents"}
                </button>
              </form>

              <div className="analyzer-output-panel">
                {precLoading && (
                  <div className="analysis-progress-card">
                    <div className="typing-dots"><span></span><span></span><span></span></div>
                    <p className="mt-2 text-xs font-mono">Searching landwork Supreme Court binding cases...</p>
                  </div>
                )}
                {precResult.length === 0 && !precLoading && (
                  <div className="output-placeholder">
                    <Compass size={40} className="placeholder-icon" />
                    <h3>Binding & Persuasive Rulings</h3>
                    <p>Input a legal question or principle on the left to see binding Supreme Court / High Court case laws and ratios.</p>
                  </div>
                )}
                {precResult.length > 0 && (
                  <div className="precedents-list font-mono text-xs">
                    <h3 className="font-serif border-bottom pb-2 mb-3 text-sm font-bold">Matching Precedents</h3>
                    {precResult.map((pr, idx) => (
                      <div key={idx} className="precedent-item border p-3 rounded-lg mb-3">
                        <div className="font-bold">{pr.case_name} ({pr.year})</div>
                        <div className="text-muted">{pr.citation} | {pr.court}</div>
                        <p className="italic mt-1">Ratio: "{pr.ratio || pr.ratio_decidendi}"</p>
                        <p className="mt-1"><strong>Applicability:</strong> {pr.applicability}</p>
                        <span className={`favours-badge ${pr.favours}`}>Favours: {pr.favours}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. ACT REFERENCES */}
        {activeSubTool === 'references' && (
          <div className="sub-tool-layout animate-fade-in">
            <div className="rights-grid">
              {REFS_DATA.map((r, i) => (
                <div 
                  key={i} 
                  className="ref-card"
                  onClick={() => onLearnAboutReference(`Give me a comprehensive overview of ${r.title} — key provisions, important sections, rights it provides, penalties, and how to use it.`)}
                >
                  <div className="ref-card-icon">{r.icon}</div>
                  <h3>{r.title}</h3>
                  <p>{r.desc}</p>
                  <span className="ref-badge font-mono text-xs">{r.badge}</span>
                  <button className="expand-btn block mt-2 text-xs">Search overview with AI →</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
