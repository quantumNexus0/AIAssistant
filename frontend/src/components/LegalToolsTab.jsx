import { useState } from 'react';
import {
  Search, Compass, BookOpen, Clock, HelpCircle,
  Sword, UserCheck, Landmark, Heart, Home, ShoppingBag,
  Monitor, DollarSign, FileText, Wrench, Building2, Shield,
   CheckCircle
} from 'lucide-react';

 const API_BASE = 'http://localhost:8000/api/v1';

const REFS_DATA = [
  { Icon: Sword, title: 'Bharatiya Nyaya Sanhita (BNS) 2023', desc: 'New criminal code replacing IPC 1860 from July 2024. 358 sections covering all criminal offences.', badge: 'Criminal Law' },
  { Icon: UserCheck, title: 'Bharatiya Nagarik Suraksha Sanhita 2023', desc: 'Replaces CrPC 1973. Governs criminal procedure, trials, bail, and appeals.', badge: 'Procedure' },
  { Icon: Landmark, title: 'Constitution of India 1950', desc: '395 articles, 12 schedules. Supreme law. Includes fundamental rights, DPSP, and federal structure.', badge: 'Constitutional' },
  { Icon: Heart, title: 'Hindu Marriage Act 1955', desc: 'Governs marriage, divorce, alimony, and child custody for Hindus, Buddhists, Jains, and Sikhs.', badge: 'Family Law' },
  { Icon: Home, title: 'Transfer of Property Act 1882', desc: 'Governs transfer of immovable property by act of parties — sale, mortgage, lease, exchange, gift.', badge: 'Property' },
  { Icon: ShoppingBag, title: 'Consumer Protection Act 2019', desc: 'Rights of consumers, product liability, unfair trade practices, and Consumer Commissions.', badge: 'Consumer' },
  { Icon: Monitor, title: 'Information Technology Act 2000', desc: 'Legal recognition for electronic transactions, cybercrime offences, data protection, and intermediary liability.', badge: 'Cyber Law' },
  { Icon: DollarSign, title: 'Income Tax Act 1961', desc: 'Comprehensive law on taxation of income, deductions, TDS, advance tax, and appeals.', badge: 'Tax' },
  { Icon: FileText, title: 'RTI Act 2005', desc: 'Empowers citizens to seek information from public authorities. 30-day response deadline.', badge: 'Transparency' },
  { Icon: Wrench, title: 'Labour Codes 2020', desc: 'Four labour codes consolidating 29 central laws: Wages, Relations, Security, and Safety.', badge: 'Labour' },
  { Icon: Building2, title: 'RERA 2016', desc: 'Real Estate Regulatory Authority Act. Protects homebuyers, regulates developers and agents.', badge: 'Real Estate' },
  { Icon: Shield, title: 'POCSO Act 2012', desc: 'Protection of Children from Sexual Offences. Comprehensive law for child sexual abuse with stringent penalties.', badge: 'Child Protection' },
];

// ─── save a result to the legal_tools collection via the API ────────────────
async function saveToolResult(toolType, title, queryParams, result) {
  try {
    await fetch(`${API_BASE}/legal-tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_type: toolType, title, query_params: queryParams, result }),
    });
  } catch (err) {
    console.warn('[legal-tools] save failed:', err);
  }
}

export default function LegalToolsTab({ onLearnAboutReference, model }) {
  const [activeSubTool, setActiveSubTool] = useState('explainer');

  // ── section explainer state ────────────────────────────────────────────────
  const [expSection, setExpSection] = useState('');
  const [expAct, setExpAct] = useState('');
  const [expContext, setExpContext] = useState('');
  const [expLang, setExpLang] = useState('english');
  const [expResult, setExpResult] = useState(null);
  const [expLoading, setExpLoading] = useState(false);
  const [expSaved, setExpSaved] = useState(false);

  // ── limitation calculator state ────────────────────────────────────────────
  const [limAction, setLimAction] = useState('');
  const [limDate, setLimDate] = useState('');
  const [limCaseType, setLimCaseType] = useState('civil');
  const [limState, setLimState] = useState('');
  const [limResult, setLimResult] = useState(null);
  const [limLoading, setLimLoading] = useState(false);
  const [limSaved, setLimSaved] = useState(false);

  // ── precedent finder state ─────────────────────────────────────────────────
  const [precQuery, setPrecQuery] = useState('');
  const [precCaseType, setPrecCaseType] = useState('');
  const [precCourt, setPrecCourt] = useState('Supreme Court of India');
  const [precResult, setPrecResult] = useState([]);
  const [precLoading, setPrecLoading] = useState(false);
  const [precSaved, setPrecSaved] = useState(false);

  // ── ref search filter ──────────────────────────────────────────────────────
  const [refSearch, setRefSearch] = useState('');

  // ── helpers ────────────────────────────────────────────────────────────────
  const parseJSON = (data) => {
    if (typeof data === 'string') {
      const cleaned = data.trim().replace(/^```json/, '').replace(/```$/, '');
      return JSON.parse(cleaned.trim());
    }
    if (data?.response) {
      const c = data.response.trim().replace(/^```json/, '').replace(/```$/, '');
      return JSON.parse(c);
    }
    if (data?.message?.content) {
      const c = data.message.content.trim().replace(/^```json/, '').replace(/```$/, '');
      return JSON.parse(c);
    }
    return data;
  };

  const renderReportField = (label, value) => {
    if (value === null || value === undefined) return null;
    const lines = String(value).trim().split(/\r?\n/).map(l => l.trim());
    const nodes = [];
    let listItems = [];

    const flushList = (key) => {
      if (!listItems.length) return null;
      const node = (
        <ul key={key} className="report-bullets">
          {listItems.map((item, i) => <li key={`${key}-${i}`}>{item}</li>)}
        </ul>
      );
      listItems = [];
      return node;
    };

    lines.forEach((line, idx) => {
      if (line.match(/^(-|\*|\d+[\.\)])\s+/)) {
        listItems.push(line.replace(/^(-|\*|\d+[\.\)])\s+/, ''));
      } else {
        const listNode = flushList(`list-${idx}`);
        if (listNode) nodes.push(listNode);
        if (!line) nodes.push(<div key={`sp-${idx}`} className="report-spacer" />);
        else nodes.push(<p key={`p-${idx}`} className="report-text">{line}</p>);
      }
    });
    const finalList = flushList('list-final');
    if (finalList) nodes.push(finalList);

    return (
      <div className="report-field">
        <div className="report-section-title">{label}</div>
        <div className="report-section-body">{nodes}</div>
      </div>
    );
  };

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleExplainSection = async (e) => {
    e.preventDefault();
    if (!expSection || !expAct) return;
    setExpLoading(true);
    setExpResult(null);
    setExpSaved(false);
    try {
      const res = await fetch(
        `${API_BASE}/ai/explain-section?section=${encodeURIComponent(expSection)}&act=${encodeURIComponent(expAct)}&context=${encodeURIComponent(expContext)}&language=${expLang}&model=${model}`,
        { method: 'POST' }
      );
      if (res.ok) {
        const parsed = parseJSON(await res.json());
        setExpResult(parsed);
        // auto-save to MongoDB
        await saveToolResult(
          'section_explainer',
          `Section ${expSection} of ${expAct}`,
          { section: expSection, act: expAct, context: expContext, language: expLang },
          parsed
        );
        setExpSaved(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to explain section. Verify Ollama model status.');
    } finally {
      setExpLoading(false);
    }
  };

  const handleCalculateLimitation = async (e) => {
    e.preventDefault();
    if (!limAction || !limDate) return;
    setLimLoading(true);
    setLimResult(null);
    setLimSaved(false);
    try {
      const res = await fetch(
        `${API_BASE}/ai/limitation-check?action_type=${encodeURIComponent(limAction)}&event_date=${encodeURIComponent(limDate)}&case_type=${encodeURIComponent(limCaseType)}&state=${encodeURIComponent(limState)}&model=${model}`,
        { method: 'POST' }
      );
      if (res.ok) {
        const parsed = parseJSON(await res.json());
        setLimResult(parsed);
        await saveToolResult(
          'limitation_check',
          `${limAction} — ${limDate}`,
          { action_type: limAction, event_date: limDate, case_type: limCaseType, state: limState },
          parsed
        );
        setLimSaved(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to calculate limitation period.');
    } finally {
      setLimLoading(false);
    }
  };

  const handleFindPrecedents = async (e) => {
    e.preventDefault();
    if (!precQuery) return;
    setPrecLoading(true);
    setPrecResult([]);
    setPrecSaved(false);
    try {
      const res = await fetch(
        `${API_BASE}/ai/precedents?query=${encodeURIComponent(precQuery)}&case_type=${encodeURIComponent(precCaseType)}&court=${encodeURIComponent(precCourt)}&model=${model}`,
        { method: 'POST' }
      );
      if (res.ok) {
        const parsed = parseJSON(await res.json());
        const results = Array.isArray(parsed) ? parsed : (parsed.cases || []);
        setPrecResult(results);
        await saveToolResult(
          'precedent_finder',
          precQuery.slice(0, 80),
          { query: precQuery, case_type: precCaseType, court: precCourt },
          results
        );
        setPrecSaved(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to find precedents.');
    } finally {
      setPrecLoading(false);
    }
  };

  // ── filtered refs ──────────────────────────────────────────────────────────
  const filteredRefs = REFS_DATA.filter(r =>
    r.title.toLowerCase().includes(refSearch.toLowerCase()) ||
    r.badge.toLowerCase().includes(refSearch.toLowerCase())
  );

  // ── shared save-indicator ──────────────────────────────────────────────────
  const SaveIndicator = ({ saved }) =>
    saved ? (
      <span className="save-indicator">
        <CheckCircle size={12} /> Saved to history
      </span>
    ) : null;

  return (
    <div className="tab-panel-container legal-tools-wrapper">

      {/* ── header ── */}
      <div className="tab-panel-header print-hide">
        <h2>Legal utilities &amp; references</h2>
        <p>Specialized calculators, section explainers, precedent search, and act references.</p>

        <div className="sub-tools-tab-bar mt-3 font-mono">
          {[
            { id: 'explainer', Icon: BookOpen, label: 'Section explainer' },
            { id: 'limitation', Icon: Clock, label: 'Limitation calculator' },
            { id: 'precedents', Icon: Compass, label: 'Precedent finder' },
            { id: 'references', Icon: Search, label: 'Act references' },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              className={activeSubTool === id ? 'active' : ''}
              onClick={() => setActiveSubTool(id)}
            >
              <Icon size={13} style={{ marginRight: 5 }} />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="sub-tool-content-box mt-4">

        {/* ════════════════════════════════════════════
            1. SECTION EXPLAINER
        ════════════════════════════════════════════ */}
        {activeSubTool === 'explainer' && (
          <div className="sub-tool-layout animate-fade-in">
            <div className="analyzer-split-grid">

              <form className="analyzer-form-panel" onSubmit={handleExplainSection}>
                <div className="section-group-card">
                  <h3>Explain legal provision</h3>
                  <div className="form-group">
                    <label>Section number (e.g. 302 or 138)</label>
                    <input type="text" value={expSection} onChange={e => setExpSection(e.target.value)} placeholder="e.g. 420" required />
                  </div>
                  <div className="form-group">
                    <label>Act / Code</label>
                    <input type="text" value={expAct} onChange={e => setExpAct(e.target.value)} placeholder="e.g. BNS 2023" required />
                  </div>
                  <div className="form-group">
                    <label>Context / fact scenario (optional)</label>
                    <textarea value={expContext} onChange={e => setExpContext(e.target.value)} rows={3} placeholder="Provide case details to explain how this section applies…" />
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
                  {expLoading ? 'Explaining section…' : 'Explain section'}
                </button>
                <SaveIndicator saved={expSaved} />
              </form>

              <div className="analyzer-output-panel">
                {expLoading && (
                  <div className="analysis-progress-card">
                    <div className="typing-dots"><span /><span /><span /></div>
                    <p className="mt-2 text-xs font-mono">Fetching section contents &amp; Supreme Court interpretations…</p>
                  </div>
                )}
                {!expResult && !expLoading && (
                  <div className="output-placeholder">
                    <HelpCircle size={40} className="placeholder-icon" />
                    <h3>Section details</h3>
                    <p>Enter a section number and act on the left to view plain-language explanations, legal ingredients, and new equivalents.</p>
                  </div>
                )}
                {expResult && (
                  <div className="analysis-report-sheet font-mono text-xs leading-relaxed border p-4 rounded-lg bg-light-gray">
                    <h3 className="font-serif border-bottom pb-2 mb-3 text-sm font-bold">
                      Section {expSection} of {expAct} — analysis
                    </h3>
                    {renderReportField('Full text / key content', expResult.full_text || expResult.fullText || expResult.text)}
                    {renderReportField('Plain language explanation', expResult.plain_language_explanation || expResult.plainExplanation || expResult.plain_language)}
                    {renderReportField('Essential ingredients / elements', expResult.essential_ingredients || expResult.essentialIngredients || expResult.elements)}
                    {renderReportField('Important Supreme Court interpretations', expResult.important_interpretations || expResult.interpretations || expResult.sc_interpretations)}
                    {renderReportField('Common practical scenarios', expResult.common_scenarios || expResult.commonScenarios || expResult.scenarios)}
                    {renderReportField('New law equivalent', expResult.new_law_equivalent || expResult.newLawEquivalent || expResult.new_law)}
                    {Object.keys(expResult).length === 0 && (
                      <div className="report-field">
                        <div className="report-section-body">No structured fields returned from the model.</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            2. LIMITATION CALCULATOR
        ════════════════════════════════════════════ */}
        {activeSubTool === 'limitation' && (
          <div className="sub-tool-layout animate-fade-in">
            <div className="analyzer-split-grid">

              <form className="analyzer-form-panel" onSubmit={handleCalculateLimitation}>
                <div className="section-group-card">
                  <h3>Limitation period check</h3>
                  <div className="form-group">
                    <label>Action type</label>
                    <input type="text" value={limAction} onChange={e => setLimAction(e.target.value)} placeholder="e.g. Appeal to High Court" required />
                  </div>
                  <div className="form-group">
                    <label>Date of event / cause of action</label>
                    <input type="date" value={limDate} onChange={e => setLimDate(e.target.value)} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Case type context</label>
                      <select value={limCaseType} onChange={e => setLimCaseType(e.target.value)}>
                        <option value="civil">Civil suit</option>
                        <option value="criminal">Criminal case</option>
                        <option value="appeals">Appeal / review / revision</option>
                        <option value="consumer">Consumer forum</option>
                      </select>
                    </div>
                    <div className="form-group flex-1">
                      <label>State (if state-specific)</label>
                      <input type="text" value={limState} onChange={e => setLimState(e.target.value)} placeholder="e.g. Delhi" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-2" disabled={limLoading}>
                  {limLoading ? 'Calculating…' : 'Calculate limitation period'}
                </button>
                <SaveIndicator saved={limSaved} />
              </form>

              <div className="analyzer-output-panel">
                {limLoading && (
                  <div className="analysis-progress-card">
                    <div className="typing-dots"><span /><span /><span /></div>
                    <p className="mt-2 text-xs font-mono">Running dates through Limitation Act schedules…</p>
                  </div>
                )}
                {!limResult && !limLoading && (
                  <div className="output-placeholder">
                    <Clock size={40} className="placeholder-icon" />
                    <h3>Limitation deadline</h3>
                    <p>Enter the legal action type and cause of action date to verify if it is within the filing timeline.</p>
                  </div>
                )}
                {limResult && (
                  <div className="analysis-report-sheet font-mono text-xs leading-relaxed border p-4 rounded-lg bg-light-gray">
                    <h3 className="font-serif border-bottom pb-2 mb-3 text-sm font-bold text-center">
                      Limitation audit report
                    </h3>
                    {Object.entries(limResult).map(([key, val]) => (
                      <div key={key} className="mb-2 border-bottom pb-2 flex-row-justify">
                        <strong className="uppercase text-muted text-xs mr-2">{key.replace(/_/g, ' ')}:</strong>
                        <span className={key === 'is_within_time' ? (val ? 'text-success font-bold' : 'text-danger font-bold') : ''}>
                          {typeof val === 'boolean' ? (val ? 'YES' : 'NO') : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            3. PRECEDENT FINDER
        ════════════════════════════════════════════ */}
        {activeSubTool === 'precedents' && (
          <div className="sub-tool-layout animate-fade-in">
            <div className="analyzer-split-grid">

              <form className="analyzer-form-panel" onSubmit={handleFindPrecedents}>
                <div className="section-group-card">
                  <h3>Indian precedents search</h3>
                  <div className="form-group">
                    <label>Legal point / ratio query</label>
                    <input type="text" value={precQuery} onChange={e => setPrecQuery(e.target.value)} placeholder="e.g. Child custody to mother when minor is under 5" required />
                  </div>
                  <div className="form-group">
                    <label>Area of law</label>
                    <input type="text" value={precCaseType} onChange={e => setPrecCaseType(e.target.value)} placeholder="e.g. family law" />
                  </div>
                  <div className="form-group">
                    <label>Focus court</label>
                    <input type="text" value={precCourt} onChange={e => setPrecCourt(e.target.value)} placeholder="e.g. Supreme Court of India" />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-2" disabled={precLoading}>
                  {precLoading ? 'Searching rulings…' : 'Search precedents'}
                </button>
                <SaveIndicator saved={precSaved} />
              </form>

              <div className="analyzer-output-panel">
                {precLoading && (
                  <div className="analysis-progress-card">
                    <div className="typing-dots"><span /><span /><span /></div>
                    <p className="mt-2 text-xs font-mono">Searching landmark Supreme Court binding cases…</p>
                  </div>
                )}
                {precResult.length === 0 && !precLoading && (
                  <div className="output-placeholder">
                    <Compass size={40} className="placeholder-icon" />
                    <h3>Binding &amp; persuasive rulings</h3>
                    <p>Input a legal question or principle to see binding Supreme Court / High Court case laws and ratios.</p>
                  </div>
                )}
                {precResult.length > 0 && (
                  <div className="precedents-list font-mono text-xs">
                    <h3 className="font-serif border-bottom pb-2 mb-3 text-sm font-bold">Matching precedents</h3>
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

        {/* ════════════════════════════════════════════
            4. ACT REFERENCES  (B&W, clean spacing)
        ════════════════════════════════════════════ */}
        {activeSubTool === 'references' && (
          <div className="sub-tool-layout animate-fade-in">

            {/* search bar */}
            <div className="refs-search-bar">
              <Search size={14} className="refs-search-icon" />
              <input
                type="text"
                placeholder="Filter by act name or category…"
                value={refSearch}
                onChange={e => setRefSearch(e.target.value)}
                className="refs-search-input"
              />
              {refSearch && (
                <button className="refs-search-clear" onClick={() => setRefSearch('')}>✕</button>
              )}
            </div>

            {/* grid */}
            <div className="refs-grid">
              {filteredRefs.map((r, i) => {
                const { Icon } = r;
                return (
                  <div
                    key={i}
                    className="ref-card"
                    onClick={() => onLearnAboutReference(
                      `Give me a comprehensive overview of ${r.title} — key provisions, important sections, rights it provides, penalties, and how to use it.`
                    )}
                  >
                    <div className="ref-card-top">
                      <span className="ref-badge">{r.badge}</span>
                      <div className="ref-card-icon">
                        <Icon size={18} strokeWidth={1.5} />
                      </div>
                    </div>
                    <h3 className="ref-card-title">{r.title}</h3>
                    <p className="ref-card-desc">{r.desc}</p>
                    <button className="ref-card-cta">Search overview with AI →</button>
                  </div>
                );
              })}

              {filteredRefs.length === 0 && (
                <div className="refs-empty">No acts match "{refSearch}"</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}