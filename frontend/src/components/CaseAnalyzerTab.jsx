import { useState, useEffect, Component } from 'react';

import {
  Plus,
  Trash2,
  FileText,
  Award,
  Printer,
  X
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// ── Error Boundary: catches any render crash in the report panel ──────────────
class ReportErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, errorMsg: err?.message || String(err) };
  }
  componentDidUpdate(prevProps) {
    // Reset when analysisResult changes so a new result can re-render
    if (prevProps.resultKey !== this.props.resultKey) {
      this.setState({ hasError: false, errorMsg: '' });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="analysis-error-card" style={{ margin: '2rem' }}>
          <h3>⚠ Report Render Error</h3>
          <p>An unexpected error occurred while displaying the report. The AI response may have an unusual format.</p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.7 }}>{this.state.errorMsg}</p>
          <button
            className="btn-secondary mt-3 text-xs"
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CaseAnalyzerTab({ model, language }) {
  const safeStr = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      if (val.action) return val.action;
      if (val.description) return val.description;
      if (val.issue) return val.issue;
      if (val.step) return val.step;
      if (val.name) return val.name;
      if (val.title) return val.title;
      // Fallback: join all string values
      return Object.values(val).filter(v => typeof v === 'string' || typeof v === 'number').join(' — ');
    }
    return String(val);
  };

  const ensureArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') {
      // If it's an object with a single array property, return that array
      const arrays = Object.values(val).filter(Array.isArray);
      if (arrays.length === 1) return arrays[0];
      return [val];
    }
    return [val];
  };

  // Input Form State
  const [caseType, setCaseType] = useState('criminal');
  const [caseDescription, setCaseDescription] = useState('');
  const [clientSide, setClientSide] = useState('petitioner');
  const [jurisdictionState, setJurisdictionState] = useState('Delhi');
  const [targetCourt, setTargetCourt] = useState('District Court');
  const [petitionerDetails, setPetitionerDetails] = useState('');
  const [respondentDetails, setRespondentDetails] = useState('');

  // Previous decisions
  const [previousDecisions, setPreviousDecisions] = useState([]);
  const [newDecCourt, setNewDecCourt] = useState('');
  const [newDecDate, setNewDecDate] = useState('');
  const [newDecNo, setNewDecNo] = useState('');
  const [newDecSummary, setNewDecSummary] = useState('');
  const [newDecOutcome, setNewDecOutcome] = useState('favour');
  const [newDecJudge, setNewDecJudge] = useState('');
  const [showAddDecisionForm, setShowAddDecisionForm] = useState(false);

  // Evidence, Witnesses, Reliefs (Simple Lists)
  const [evidenceList, setEvidenceList] = useState([]);
  const [newEvidence, setNewEvidence] = useState('');
  const [witnessesList, setWitnessesList] = useState([]);
  const [newWitness, setNewWitness] = useState('');
  const [reliefsList, setReliefsList] = useState([]);
  const [newRelief, setNewRelief] = useState('');
  const [caseFiles, setCaseFiles] = useState([]);
  const [fileUploadError, setFileUploadError] = useState('');

  // Additional options
  const [urgencyLevel, setUrgencyLevel] = useState('normal');
  const [caseStage, setCaseStage] = useState('pre-filing');
  const [financialStakes, setFinancialStakes] = useState('');
  const [specialCircumstances, setSpecialCircumstances] = useState('');
  const [opposingArguments, setOpposingArguments] = useState('');

  // Report state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisRawOutput, setAnalysisRawOutput] = useState('');
  const [activeReportTab, setActiveReportTab] = useState('summary');

  // Past reports archive (MongoDB)
  const [savedCases, setSavedCases] = useState([]);
  const [selectedSavedCaseId, setSelectedSavedCaseId] = useState('');

  const fetchSavedCases = async () => {
    try {
      const res = await fetch(`${API_BASE}/cases`);
      if (res.ok) {
        const data = await res.json();
        setSavedCases(data);
      }
    } catch (err) {
      console.error("Error loading saved cases:", err);
    }
  };

  useEffect(() => {
    fetchSavedCases();
  }, []);

  const handleAddDecision = () => {
    if (!newDecCourt || !newDecSummary) {
      alert("Court Name and Summary are required.");
      return;
    }
    const order = {
      court_name: newDecCourt,
      decision_date: newDecDate || new Date().toISOString().split('T')[0],
      case_number: newDecNo || undefined,
      decision_summary: newDecSummary,
      outcome: newDecOutcome,
      judge_name: newDecJudge || undefined,
      appeal_filed: false
    };
    setPreviousDecisions([...previousDecisions, order]);
    setNewDecCourt('');
    setNewDecDate('');
    setNewDecNo('');
    setNewDecSummary('');
    setNewDecOutcome('favour');
    setNewDecJudge('');
    setShowAddDecisionForm(false);
  };

  const handleRemoveDecision = (index) => {
    setPreviousDecisions(previousDecisions.filter((_, i) => i !== index));
  };

  const handleAddEvidence = () => {
    if (newEvidence.trim()) {
      setEvidenceList([...evidenceList, newEvidence.trim()]);
      setNewEvidence('');
    }
  };

  const handleAddWitness = () => {
    if (newWitness.trim()) {
      setWitnessesList([...witnessesList, newWitness.trim()]);
      setNewWitness('');
    }
  };

  const handleAddRelief = () => {
    if (newRelief.trim()) {
      setReliefsList([...reliefsList, newRelief.trim()]);
      setNewRelief('');
    }
  };

  const parseOllamaResponse = (data) => {
    // Backend already pre-parses the JSON from Ollama.
    // If the data has known top-level keys from our schema, it's already parsed.
    const KNOWN_KEYS = ['analysis_metadata', 'executive_summary', 'applicable_laws',
      'legal_issues', 'procedural_roadmap', 'legal_strategy', 'risk_assessment',
      'estimated_timeline', 'precedents_and_case_law', 'recommended_actions',
      'raw_text', 'parse_error'];
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // Check if it looks like a backend-pre-parsed result (has at least one known key)
      const hasKnownKey = KNOWN_KEYS.some(k => k in data);
      // NOT an Ollama envelope (those have 'model', 'message', 'response' at top level)
      const isOllamaEnvelope = 'model' in data && ('message' in data || 'response' in data);
      if (hasKnownKey && !isOllamaEnvelope) {
        return { parsed: data, raw: JSON.stringify(data, null, 2) };
      }
    }

    let raw = '';
    if (typeof data === 'string') {
      raw = data.trim();
    } else if (data?.message?.content) {
      raw = data.message.content;
    } else if (data?.response) {
      raw = data.response;
    } else {
      raw = JSON.stringify(data, null, 2);
    }

    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
    cleaned = cleaned.trim();

    try {
      const parsed = JSON.parse(cleaned);
      return { parsed, raw };
    } catch (err) {
      // Return raw text as a pseudo-result so the UI can show it
      return { parsed: { raw_text: raw, parse_error: 'Model did not return structured JSON.' }, raw };
    }
  };

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });

  const handleCaseFilesChange = async (event) => {
    setFileUploadError('');
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    try {
      const attachments = await Promise.all(files.map(async (file) => ({
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        size: file.size,
        content_base64: await readFileAsBase64(file),
      })));
      setCaseFiles(prev => [...prev, ...attachments]);
    } catch (err) {
      console.error('File upload error', err);
      setFileUploadError('Unable to read one or more files. Please try again.');
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveCaseFile = (index) => {
    setCaseFiles(caseFiles.filter((_, idx) => idx !== index));
  };

  // Run deep analysis via FastAPI
  const handleAnalyze = async () => {
    if (!caseDescription.trim()) {
      alert("Please enter the case description facts.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError('');
    setAnalysisRawOutput('');

    const payload = {
      model,
      temperature: 0.4,
      case_type: caseType,
      case_description: caseDescription,
      client_side: clientSide,
      jurisdiction_state: jurisdictionState || undefined,
      target_court: targetCourt || undefined,
      petitioner_details: petitionerDetails || undefined,
      respondent_details: respondentDetails || undefined,
      previous_decisions: previousDecisions.length > 0 ? previousDecisions : undefined,
      available_evidence: evidenceList.length > 0 ? evidenceList : undefined,
      key_witnesses: witnessesList.length > 0 ? witnessesList : undefined,
      attached_documents: caseFiles.length > 0 ? caseFiles : undefined,
      reliefs_sought: reliefsList.length > 0 ? reliefsList : undefined,
      urgency_level: urgencyLevel,
      case_stage: caseStage || undefined,
      financial_stakes: financialStakes || undefined,
      special_circumstances: specialCircumstances || undefined,
      opposing_arguments: opposingArguments || undefined,
      language_preference: language
    };

    // Abort controller for 3-minute timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000);

    try {
      const res = await fetch(`${API_BASE}/ai/analyze-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        let errorText;
        try {
          const errJson = await res.json();
          errorText = errJson.detail || errJson.message || JSON.stringify(errJson, null, 2);
        } catch (parseErr) {
          errorText = await res.text();
        }
        setAnalysisError(`AI server returned ${res.status}: ${errorText}`);
        setAnalysisRawOutput(errorText);
        return;
      }

      const data = await res.json();
      const { parsed } = parseOllamaResponse(data);
      // parsed is always truthy — either real structured data or { raw_text, parse_error }
      setAnalysisResult(parsed);

      // Auto-save to MongoDB cases collection
      const title = `${caseType.toUpperCase()} Analysis — ${new Date().toLocaleDateString('en-IN')}`;
      await fetch(`${API_BASE}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          case_type: caseType,
          client_side: clientSide,
          jurisdiction_state: jurisdictionState || undefined,
          target_court: targetCourt || undefined,
          urgency_level: urgencyLevel || 'normal',
          case_stage: caseStage || undefined,
          request_data: payload,
          analysis_result: parsed
        })
      });
      fetchSavedCases();

    } catch (err) {
      clearTimeout(timeoutId);
      console.error(err);
      if (err.name === 'AbortError') {
        setAnalysisError('Request timed out after 3 minutes. The model may be too slow or unavailable. Try a faster model like llama3.2.');
      } else {
        setAnalysisError('Failed to analyze case. Check the model server and raw output.');
        setAnalysisRawOutput(err.message || String(err));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSavedCaseSelect = async (e) => {
    const id = e.target.value;
    setSelectedSavedCaseId(id);
    if (!id) {
      setAnalysisResult(null);
      setAnalysisError('');
      setAnalysisRawOutput('');
      return;
    }

    // Clear any previous error and reset to summary tab
    setAnalysisError('');
    setAnalysisRawOutput('');
    setActiveReportTab('summary');

    // Load from MongoDB
    try {
      const res = await fetch(`${API_BASE}/cases/${id}`);
      if (res.ok) {
        const data = await res.json();
        // The stored analysis_result is already a plain parsed object
        setAnalysisResult(data.analysis_result || null);

        // Repopulate form from saved request
        const req = data.request_data || {};
        setCaseType(req.case_type || 'criminal');
        setCaseDescription(req.case_description || '');
        setClientSide(req.client_side || 'petitioner');
        setJurisdictionState(req.jurisdiction_state || '');
        setTargetCourt(req.target_court || '');
        setPetitionerDetails(req.petitioner_details || '');
        setRespondentDetails(req.respondent_details || '');
        setPreviousDecisions(req.previous_decisions || []);
        setEvidenceList(req.available_evidence || []);
        setWitnessesList(req.key_witnesses || []);
        setReliefsList(req.reliefs_sought || []);
        setCaseFiles(req.attached_documents || []);
        setUrgencyLevel(req.urgency_level || 'normal');
        setCaseStage(req.case_stage || 'pre-filing');
        setFinancialStakes(req.financial_stakes || '');
        setSpecialCircumstances(req.special_circumstances || '');
        setOpposingArguments(req.opposing_arguments || '');
      } else {
        setAnalysisError('Failed to load saved case. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setAnalysisError('Network error loading saved case.');
    }
  };

  const handleDeleteSavedCase = async (e) => {
    e.stopPropagation();
    if (!selectedSavedCaseId) return;
    if (!confirm("Delete this case report permanently?")) return;
    try {
      const res = await fetch(`${API_BASE}/cases/${selectedSavedCaseId}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedCases(prev => prev.filter(c => c.id !== selectedSavedCaseId));
        setSelectedSavedCaseId('');
        setAnalysisResult(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="tab-panel-container case-analyzer-wrapper">
      <div className="tab-panel-header print-hide">
        <h2>AI Case Analyzer</h2>
        <p>Input comprehensive facts of your matter to receive senior advocate-level structured legal intelligence.</p>

        {/* Saved archive selection */}
        {savedCases.length > 0 && (
          <div className="saved-cases-archive font-mono">
            <span>Archive:</span>
            <select value={selectedSavedCaseId} onChange={handleSavedCaseSelect}>
              <option value="">-- Load Saved Analysis Report --</option>
              {savedCases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.case_type})
                </option>
              ))}
            </select>
            {selectedSavedCaseId && (
              <button className="archive-delete" onClick={handleDeleteSavedCase} title="Delete report">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="analyzer-split-grid">
        {/* Left Side: Rich Form (Input) */}
        <div className="analyzer-form-panel print-hide">
          <div className="section-group-card">
            <h3>📋 Basic Case Facts</h3>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Case Classification</label>
                <select value={caseType} onChange={e => setCaseType(e.target.value)}>
                  <option value="criminal">Criminal Law (IPC/BNS)</option>
                  <option value="civil">Civil Dispute (CPC)</option>
                  <option value="property">Property & Real Estate</option>
                  <option value="family">Family Law</option>
                  <option value="labour">Labour & Employment</option>
                  <option value="corporate">Corporate & Contract</option>
                  <option value="tax">Taxation & Finance</option>
                  <option value="consumer">Consumer Dispute</option>
                  <option value="pil">PIL (Public Interest)</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Client Role/Position</label>
                <select value={clientSide} onChange={e => setClientSide(e.target.value)}>
                  <option value="petitioner">Petitioner / Plaintiff</option>
                  <option value="respondent">Respondent</option>
                  <option value="accused">Accused / Defendant</option>
                  <option value="complainant">Complainant</option>
                  <option value="appellant">Appellant</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Jurisdiction (State/UT)</label>
                <input
                  type="text"
                  value={jurisdictionState}
                  onChange={e => setJurisdictionState(e.target.value)}
                  placeholder="e.g. Maharashtra, Delhi"
                />
              </div>
              <div className="form-group flex-1">
                <label>Target Forum/Court</label>
                <input
                  type="text"
                  value={targetCourt}
                  onChange={e => setTargetCourt(e.target.value)}
                  placeholder="e.g. High Court, DRT, NCLT"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Full Case Narrative Facts</label>
              <textarea
                rows={5}
                value={caseDescription}
                onChange={e => setCaseDescription(e.target.value)}
                placeholder="Detail what happened, key events, disputes, parties, dates, and what outcome you need. Be as comprehensive as possible..."
              />
            </div>
          </div>

          <div className="section-group-card">
            <h3>👥 Parties Details (Optional)</h3>
            <div className="form-group">
              <label>Petitioner details</label>
              <input
                type="text"
                value={petitionerDetails}
                onChange={e => setPetitionerDetails(e.target.value)}
                placeholder="Name, Age, Address, Occupation"
              />
            </div>
            <div className="form-group">
              <label>Respondent details</label>
              <input
                type="text"
                value={respondentDetails}
                onChange={e => setRespondentDetails(e.target.value)}
                placeholder="Name, Age, Address, Occupation"
              />
            </div>
          </div>

          {/* Previous Litigation Decisions list */}
          <div className="section-group-card">
            <div className="card-header-with-action">
              <h3>⚖️ Litigation Proceedings / Orders History</h3>
              <button
                type="button"
                className="btn-link"
                onClick={() => setShowAddDecisionForm(!showAddDecisionForm)}
              >
                {showAddDecisionForm ? "Cancel" : "+ Add Order"}
              </button>
            </div>

            {showAddDecisionForm && (
              <div className="nested-form-box">
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Court/Forum Name</label>
                    <input type="text" value={newDecCourt} onChange={e => setNewDecCourt(e.target.value)} placeholder="e.g. District Court Pune" />
                  </div>
                  <div className="form-group flex-1">
                    <label>Decision Date</label>
                    <input type="date" value={newDecDate} onChange={e => setNewDecDate(e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Case Number (if available)</label>
                    <input type="text" value={newDecNo} onChange={e => setNewDecNo(e.target.value)} placeholder="e.g. CR/102/2023" />
                  </div>
                  <div className="form-group flex-1">
                    <label>Judge Name</label>
                    <input type="text" value={newDecJudge} onChange={e => setNewDecJudge(e.target.value)} placeholder="e.g. Justice Deshmukh" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Outcome</label>
                    <select value={newDecOutcome} onChange={e => setNewDecOutcome(e.target.value)}>
                      <option value="favour">In Favour</option>
                      <option value="against">Against</option>
                      <option value="partial">Partial</option>
                      <option value="remand">Remand / Pending</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Order Decision Summary</label>
                  <textarea value={newDecSummary} onChange={e => setNewDecSummary(e.target.value)} rows={2} placeholder="What did the court rule or order?" />
                </div>
                <button type="button" className="btn-secondary text-xs" onClick={handleAddDecision}>Save Order to List</button>
              </div>
            )}

            {previousDecisions.length > 0 && (
              <div className="added-items-list font-mono text-xs">
                {previousDecisions.map((dec, idx) => (
                  <div key={idx} className="added-item">
                    <div>
                      <strong>{dec.court_name}</strong> ({dec.decision_date}): {dec.decision_summary.slice(0, 50)}...
                      <span className={`outcome-badge ${dec.outcome}`}>[{dec.outcome}]</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveDecision(idx)} className="item-delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evidence, Witnesses & Relief Lists */}
          <div className="section-group-card">
            <h3>📑 Materials & Claims</h3>

            <div className="form-group">
              <label>Evidence in Hand</label>
              <div className="list-adder-input">
                <input
                  type="text"
                  value={newEvidence}
                  onChange={e => setNewEvidence(e.target.value)}
                  placeholder="e.g. FIR copy, Bank Statement, Email log"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddEvidence())}
                />
                <button type="button" onClick={handleAddEvidence} aria-label="Add evidence"><Plus size={14} /></button>
              </div>
              {evidenceList.length > 0 && (
                <div className="chips-container">
                  {evidenceList.map((ev, i) => (
                    <span key={i} className="chip">
                      {ev} <X size={10} className="chip-remove" onClick={() => setEvidenceList(evidenceList.filter((_, idx) => idx !== i))} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Upload Supporting Documents</label>
              <input
                type="file"
                multiple
                onChange={handleCaseFilesChange}
                className="file-input"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
              <p className="help-text">Upload evidence, court orders, FIRs or document scans to attach to case analysis.</p>
              {fileUploadError && <p className="form-error">{fileUploadError}</p>}
              {caseFiles.length > 0 && (
                <div className="chips-container">
                  {caseFiles.map((file, i) => (
                    <span key={i} className="chip">
                      {file.filename} <X size={10} className="chip-remove" onClick={() => handleRemoveCaseFile(i)} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Key Witnesses</label>
              <div className="list-adder-input">
                <input
                  type="text"
                  value={newWitness}
                  onChange={e => setNewWitness(e.target.value)}
                  placeholder="e.g. Eyewitness, Doctor, Accountant"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddWitness())}
                />
                <button type="button" onClick={handleAddWitness}><Plus size={14} /></button>
              </div>
              {witnessesList.length > 0 && (
                <div className="chips-container">
                  {witnessesList.map((wt, i) => (
                    <span key={i} className="chip">
                      {wt} <X size={10} className="chip-remove" onClick={() => setWitnessesList(witnessesList.filter((_, idx) => idx !== i))} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Specific Reliefs Sought</label>
              <div className="list-adder-input">
                <input
                  type="text"
                  value={newRelief}
                  onChange={e => setNewRelief(e.target.value)}
                  placeholder="e.g. Return of property, Compensation of 5 Lakhs"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddRelief())}
                />
                <button type="button" onClick={handleAddRelief}><Plus size={14} /></button>
              </div>
              {reliefsList.length > 0 && (
                <div className="chips-container">
                  {reliefsList.map((rl, i) => (
                    <span key={i} className="chip">
                      {rl} <X size={10} className="chip-remove" onClick={() => setReliefsList(reliefsList.filter((_, idx) => idx !== i))} />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="section-group-card">
            <h3>⚙️ Context & Settings</h3>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Urgency Level</label>
                <select value={urgencyLevel} onChange={e => setUrgencyLevel(e.target.value)}>
                  <option value="low">Low (Standard proceedings)</option>
                  <option value="normal">Normal</option>
                  <option value="high">High (Needs interim stay)</option>
                  <option value="urgent">Urgent (Bail / Immediate threat)</option>
                </select>
              </div>
              <div className="form-group flex-1">
                <label>Case Stage</label>
                <select value={caseStage} onChange={e => setCaseStage(e.target.value)}>
                  <option value="pre-filing">Pre-filing Consultation</option>
                  <option value="filed">Filed & Plaint Served</option>
                  <option value="trial">Under Trial / Evidence Stage</option>
                  <option value="appeal">Appellate Stage</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Financial Stakes / Claim Amount</label>
              <input type="text" value={financialStakes} onChange={e => setFinancialStakes(e.target.value)} placeholder="e.g. Property dispute worth Rs. 50 Lakhs" />
            </div>

            <div className="form-group">
              <label>Special Circumstances (e.g. Senior Citizen, Minor, SC/ST, Domestic Violence)</label>
              <input type="text" value={specialCircumstances} onChange={e => setSpecialCircumstances(e.target.value)} placeholder="Describe any legal provisions favoring faster trials" />
            </div>

            <div className="form-group">
              <label>Anticipated Arguments of the Opposing Side</label>
              <textarea rows={2} value={opposingArguments} onChange={e => setOpposingArguments(e.target.value)} placeholder="What defense or points will they raise?" />
            </div>
          </div>

          <button
            className="btn-primary w-full py-3 text-sm font-semibold uppercase tracking-wider"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? "Processing Legal Intelligence..." : "🔍 Perform Structured AI Case Analysis"}
          </button>
        </div>

        {/* Right Side: Structured Analysis Output */}
        <div className="analyzer-output-panel">
          {isAnalyzing ? (
            <div className="analysis-progress-card">
              <div className="welcome-ashoka animate-spin-slow">⚖️</div>
              <h3>NyayaAI Core Legal Engine Running</h3>
              <p>Analyzing case facts against BNS, BNSS, BSA, Civil Codes, and Supreme Court binding precedents. Building roadmaps, assessing risks, and drafting advocate briefing notes...</p>
              <div className="progress-bar-container">
                <div className="progress-bar-fill"></div>
              </div>
            </div>
          ) : analysisError ? (
            <div className="analysis-error-card">
              <h3>Error Generating Analysis</h3>
              <p>{analysisError}</p>
              {analysisRawOutput && (
                <div className="raw-output-box">
                  <h4>Raw AI Output</h4>
                  <pre>{analysisRawOutput}</pre>
                </div>
              )}
            </div>
          ) : !analysisResult ? (
            <div className="output-placeholder">
              <FileText size={40} className="placeholder-icon" />
              <h3>Report Dashboard</h3>
              <p>Fill out the case facts on the left and run analysis to view the complete diagnostic report, timelines, strategy, and risk scorecard.</p>
            </div>
          ) : (
            <ReportErrorBoundary resultKey={JSON.stringify(analysisResult).slice(0, 80)}>
            <div className="analysis-report-dashboard">
              {/* Report Control Toolbar */}
              <div className="report-toolbar print-hide">
                <div className="report-tabs">
                  <button className={activeReportTab === 'summary' ? 'active' : ''} onClick={() => setActiveReportTab('summary')}>Summary</button>
                  <button className={activeReportTab === 'roadmap' ? 'active' : ''} onClick={() => setActiveReportTab('roadmap')}>Roadmap & Laws</button>
                  <button className={activeReportTab === 'strategy' ? 'active' : ''} onClick={() => setActiveReportTab('strategy')}>Strategy</button>
                  <button className={activeReportTab === 'risk' ? 'active' : ''} onClick={() => setActiveReportTab('risk')}>Risk & Timeline</button>
                </div>
                <button className="btn-secondary btn-icon text-xs" onClick={handlePrint}>
                  <Printer size={13} /> <span>Print</span>
                </button>
              </div>

              <div className="printable-report-sheet">
                <div className="report-header-badge font-mono text-center text-xs border-bottom pb-2 mb-4">
                  CONFIDENTIAL · ATTORNEY-CLIENT WORK PRODUCT · GENERATED BY NYAYAAI
                </div>

                {/* TAB 1: EXECUTIVE SUMMARY */}
                {activeReportTab === 'summary' && (
                  <div className="report-tab-content animate-fade-in">
                    <div className="summary-banner border-bottom pb-4 mb-4">
                      <div className="badge-row">
                        <span className={`risk-level-badge ${analysisResult.risk_assessment?.risk_level || 'medium'}`}>
                          Risk: {analysisResult.risk_assessment?.risk_level?.toUpperCase() || 'MEDIUM'}
                        </span>
                        <span className="confidence-badge font-mono">
                          Confidence: {analysisResult.analysis_metadata?.analysis_confidence || 'medium'}
                        </span>
                      </div>
                      <h2 className="mt-3 font-serif">
                        {analysisResult.analysis_metadata?.case_type
                          ? `${analysisResult.analysis_metadata.case_type} — ${analysisResult.analysis_metadata.client_position || clientSide}`
                          : `${caseType.toUpperCase()} Case Analysis`}
                      </h2>
                      <p className="case-desc-summary leading-relaxed mt-2 italic text-sm">
                        {analysisResult.executive_summary?.case_overview}
                      </p>
                    </div>

                    <div className="dashboard-grid">
                      <div className="db-card">
                        <h4 className="font-mono text-xs text-muted uppercase">Client Position Strength</h4>
                        <div className="text-xl font-bold uppercase tracking-wide mt-1">
                          {analysisResult.executive_summary?.client_position_strength || 'mixed'}
                        </div>
                      </div>
                      <div className="db-card">
                        <h4 className="font-mono text-xs text-muted uppercase">Immediate Bottom Line</h4>
                        <p className="mt-1 text-sm font-semibold">
                          {analysisResult.executive_summary?.bottom_line}
                        </p>
                      </div>
                    </div>

                    <div className="actions-card mt-4">
                      <h4 className="font-mono text-xs uppercase text-danger mb-2">Critical Immediate Actions Required</h4>
                      <ul>
                        {ensureArray(analysisResult.executive_summary?.critical_immediate_actions).map((act, i) => (
                          <li key={i} className="text-sm font-semibold mt-1">⚠️ {safeStr(act)}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="facts-card mt-4 border pb-3 px-3 rounded-lg">
                      <h4 className="font-mono text-xs uppercase mt-3 mb-2">Established vs Disputed Facts</h4>
                      <div className="facts-split">
                        <div>
                          <h5 className="text-xs font-bold font-mono">Legally Provable Facts</h5>
                          <ul>
                            {analysisResult.case_facts_analysis?.established_facts?.map((f, i) => (
                              <li key={i} className="text-xs">✓ {safeStr(f)}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="border-left pl-3 ml-3">
                          <h5 className="text-xs font-bold font-mono">Opposing Contested Facts</h5>
                          <ul>
                            {analysisResult.case_facts_analysis?.disputed_facts?.map((f, i) => (
                              <li key={i} className="text-xs text-warning">⚠ {safeStr(f)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Key dates timeline */}
                    {analysisResult.case_facts_analysis?.key_dates_timeline?.length > 0 && Array.isArray(analysisResult.case_facts_analysis.key_dates_timeline) && (
                      <div className="mt-4 border p-3 rounded-lg">
                        <h4 className="font-mono text-xs uppercase mb-2">Key Dates Timeline</h4>
                        {analysisResult.case_facts_analysis.key_dates_timeline.map((ev, i) => (
                          <div key={i} className="font-mono text-xs border-bottom py-1">
                            <span className="text-danger font-bold">{safeStr(ev.date)}</span> — {safeStr(ev.event)}
                            {ev.legal_significance && <span className="text-muted ml-2">({safeStr(ev.legal_significance)})</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Legal Issues */}
                    {analysisResult.legal_issues?.length > 0 && (
                      <div className="mt-4 border p-3 rounded-lg">
                        <h4 className="font-mono text-xs uppercase mb-2">Legal Issues Identified</h4>
                        {analysisResult.legal_issues.map((issue, i) => (
                          <div key={i} className="mb-3 border-bottom pb-2">
                            <div className="font-bold text-xs">
                              #{issue.issue_number} — {issue.issue}
                              <span className={`ml-2 favours-badge ${issue.importance === 'critical' ? 'danger' : issue.importance === 'high' ? 'warning' : 'neutral'}`}>
                                {issue.importance?.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-xs mt-1"><strong>Our position:</strong> {issue.client_position}</div>
                            <div className="text-xs mt-1 text-muted"><strong>Likely outcome:</strong> {issue.likely_outcome}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Raw text fallback */}
                    {analysisResult.raw_text && (
                      <div className="raw-output-box mt-4">
                        <h4>AI Response (Raw Text)</h4>
                        <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{analysisResult.raw_text}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ROADMAP & LAW */}
                {activeReportTab === 'roadmap' && (
                  <div className="report-tab-content animate-fade-in">
                    <h3 className="font-serif border-bottom pb-2 mb-3">Applicable Statutes & Legal Bases</h3>

                    <div className="applicable-laws-list">
                      {ensureArray(analysisResult.applicable_laws).map((law, i) => (
                        <div key={i} className="law-item-card border p-3 rounded-lg mb-3">
                          <div className="law-item-title font-bold text-sm">
                            {safeStr(law.act_name)} — {safeStr(law.section)}
                          </div>
                          {law.new_law_equivalent && (
                            <div className="new-law-badge text-xs font-mono text-muted mb-2">
                              BNS/BNSS Equivalent: {law.new_law_equivalent}
                            </div>
                          )}
                          <p className="law-exact-text text-xs italic mt-1 font-mono text-muted">
                            {law.exact_text}
                          </p>
                          <p className="law-item-description text-xs mt-2 leading-relaxed">
                            <strong>Applicability:</strong> {law.applicability}
                          </p>
                          <div className="law-badge-row mt-2">
                            <span className={`favours-badge ${law.favours}`}>Favours: {law.favours}</span>
                            {law.punishment_or_relief && (
                              <span className="punishment-badge text-xs font-mono">Relief: {law.punishment_or_relief}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {ensureArray(analysisResult.constitutional_provisions).length > 0 && (
                      <>
                        <h3 className="font-serif border-bottom pb-2 mt-4 mb-3">Constitutional Angles & Writs</h3>
                        {ensureArray(analysisResult.constitutional_provisions).map((c, i) => (
                          <div key={i} className="constitutional-card border p-3 rounded-lg mb-3">
                            <div className="font-bold text-sm">{safeStr(c.article)} ({safeStr(c.title)})</div>
                            <p className="text-xs mt-1">{safeStr(c.relevance)}</p>
                            <span className="badge text-xs font-mono mt-1">Enforcement: {safeStr(c.enforcement_mechanism)}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Procedural Roadmap */}
                    {analysisResult.procedural_roadmap && (
                      <>
                        <h3 className="font-serif border-bottom pb-2 mt-4 mb-3">Procedural Roadmap — Immediate Steps</h3>
                        {ensureArray(analysisResult.procedural_roadmap.immediate_steps).map((step, i) => (
                          <div key={i} className="law-item-card border p-3 rounded-lg mb-3">
                            <div className="font-bold text-sm">Step {i+1}: {safeStr(step.action)}</div>
                            <div className="text-xs mt-1 font-mono text-muted">Forum: {safeStr(step.forum)} | Timeline: {safeStr(step.timeline)}</div>
                            {step.court_fee && <div className="text-xs mt-1">Court Fee: {safeStr(step.court_fee)}</div>}
                            {step.legal_basis && <div className="text-xs mt-1"><strong>Legal basis:</strong> {safeStr(step.legal_basis)}</div>}
                            {step.documents_needed?.length > 0 && Array.isArray(step.documents_needed) && (
                              <div className="text-xs mt-2">
                                <strong>Documents needed:</strong>
                                <ul className="mt-1">{step.documents_needed.map((d, j) => <li key={j}>• {safeStr(d)}</li>)}</ul>
                              </div>
                            )}
                          </div>
                        ))}

                        {ensureArray(analysisResult.procedural_roadmap.short_term_steps).length > 0 && (
                          <>
                            <h4 className="font-mono text-xs uppercase mt-3 mb-2">Short-term Steps</h4>
                            {ensureArray(analysisResult.procedural_roadmap.short_term_steps).map((step, i) => (
                              <div key={i} className="font-mono text-xs border-bottom py-2">
                                <strong>{safeStr(step.action)}</strong> — {safeStr(step.timeline)}
                                {step.dependencies && <span className="text-muted ml-2">(depends: {safeStr(step.dependencies)})</span>}
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* TAB 3: STRATEGY */}
                {activeReportTab === 'strategy' && (
                  <div className="report-tab-content animate-fade-in">
                    <h3 className="font-serif border-bottom pb-2 mb-3">Attorney Litigation Strategy</h3>

                    <div className="strategy-card border p-3 rounded-lg bg-light-gray mb-3">
                      <div className="strategy-header">
                        <Award size={16} />
                        <span className="font-mono font-bold text-sm">Primary Strategy: {analysisResult.legal_strategy?.primary_strategy?.approach}</span>
                        <span className="probability-success font-mono">Prob. of Success: {analysisResult.legal_strategy?.primary_strategy?.probability_of_success}</span>
                      </div>
                      <p className="text-xs leading-relaxed mt-2">{analysisResult.legal_strategy?.primary_strategy?.description}</p>

                      <h4 className="text-xs font-mono font-bold mt-3">Action Steps:</h4>
                      <ol className="font-mono text-xs leading-relaxed mt-1">
                        {analysisResult.legal_strategy?.primary_strategy?.steps?.map((st, i) => (
                          <li key={i} className="mt-1">
                            Step {st.step}: {st.action} ({st.timeline}) - <em>{st.purpose}</em>
                          </li>
                        ))}
                      </ol>

                      {analysisResult.legal_strategy?.primary_strategy?.strengths?.length > 0 && (
                        <>
                          <h4 className="text-xs font-mono font-bold mt-3">Strategy Strengths:</h4>
                          <ul className="font-mono text-xs">
                            {analysisResult.legal_strategy.primary_strategy.strengths.map((s, i) => (
                              <li key={i} className="text-success">✓ {s}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {analysisResult.legal_strategy?.primary_strategy?.risks?.length > 0 && (
                        <>
                          <h4 className="text-xs font-mono font-bold mt-3">Risks:</h4>
                          <ul className="font-mono text-xs">
                            {analysisResult.legal_strategy.primary_strategy.risks.map((r, i) => (
                              <li key={i} className="text-danger">⚠ {r}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>

                    {/* Alternative Strategy */}
                    {analysisResult.legal_strategy?.alternative_strategy && (
                      <div className="strategy-card border p-3 rounded-lg mb-3">
                        <div className="font-mono font-bold text-xs">Alternative Strategy: {analysisResult.legal_strategy.alternative_strategy.approach}</div>
                        <p className="text-xs mt-1 leading-relaxed">{analysisResult.legal_strategy.alternative_strategy.description}</p>
                      </div>
                    )}

                    <div className="strategy-grid-split">
                      <div className="strategy-card border p-3 rounded-lg">
                        <h4 className="text-xs font-mono font-bold mb-2">Recommended Interim Relief</h4>
                        <ul className="text-xs leading-relaxed">
                          {analysisResult.legal_strategy?.interim_reliefs_strategy?.available_reliefs?.map((rl, i) => (
                            <li key={i}>• {rl}</li>
                          ))}
                        </ul>
                        <p className="text-xs mt-2 italic font-semibold">{analysisResult.legal_strategy?.interim_reliefs_strategy?.recommended_application}</p>
                      </div>

                      <div className="strategy-card border p-3 rounded-lg">
                        <h4 className="text-xs font-mono font-bold mb-2">Settlement & Mediation Alternative</h4>
                        <div className="text-xs">
                          <div><strong>Advisable:</strong> {analysisResult.legal_strategy?.settlement_strategy?.advisable ? "YES" : "NO"}</div>
                          <div><strong>Optimal Timing:</strong> {analysisResult.legal_strategy?.settlement_strategy?.optimal_time_to_settle}</div>
                          <div><strong>Settlement Range:</strong> {analysisResult.legal_strategy?.settlement_strategy?.settlement_range}</div>
                          <div><strong>Leverage Point:</strong> {analysisResult.legal_strategy?.settlement_strategy?.negotiation_leverage}</div>
                        </div>
                      </div>
                    </div>

                    {/* Opposing Counsel Counter-args */}
                    {analysisResult.opposing_counsel_strategy?.counter_arguments?.length > 0 && (
                      <div className="strategy-card border p-3 rounded-lg mt-3">
                        <h4 className="text-xs font-mono font-bold mb-2">Counter-Arguments to Opposing Counsel</h4>
                        {analysisResult.opposing_counsel_strategy.counter_arguments.map((ca, i) => (
                          <div key={i} className="mb-2 border-bottom pb-2 text-xs">
                            <div className="text-muted"><em>Their argument:</em> {ca.their_argument}</div>
                            <div className="mt-1"><strong>Our counter:</strong> {ca.our_counter}</div>
                            {ca.supporting_law && <div className="font-mono text-muted mt-1">Law: {ca.supporting_law}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    <h3 className="font-serif border-bottom pb-2 mt-4 mb-3">Advocate Oral Briefing Notes</h3>
                    <div className="strategy-card border p-3 rounded-lg">
                      <h4 className="text-xs font-mono font-bold mb-1">Key Points to Emphasize to Bench</h4>
                      <ul className="text-xs">
                        {analysisResult.advocate_briefing_notes?.key_points_to_stress?.map((p, i) => (
                          <li key={i} className="mt-1">• {p}</li>
                        ))}
                      </ul>
                      <h4 className="text-xs font-mono font-bold mt-3 mb-1">Anticipated Judicial Questions</h4>
                      <ul className="text-xs">
                        {analysisResult.advocate_briefing_notes?.suggested_answers?.map((qa, i) => (
                          <li key={i} className="mt-2">
                            <strong>Q: "{qa.question}"</strong>
                            <p className="text-muted italic">A: {qa.suggested_answer}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* TAB 4: RISK & TIMELINE */}
                {activeReportTab === 'risk' && (
                  <div className="report-tab-content animate-fade-in">
                    <h3 className="font-serif border-bottom pb-2 mb-3">Risk Assessment Scorecard</h3>

                    <div className="risk-scorecard border p-3 rounded-lg mb-4">
                      <div className="overall-risk-meter">
                        <span className="font-mono text-xs">OVERALL LITIGATION RISK INDEX:</span>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${analysisResult.risk_assessment?.overall_risk_score || 50}%`, backgroundColor: '#e11d48' }} />
                        </div>
                        <span className="font-bold text-sm font-mono mt-1 block">Score: {analysisResult.risk_assessment?.overall_risk_score || 50}/100</span>
                      </div>

                      <div className="risk-breakdown-table mt-3 font-mono text-xs">
                        <div className="risk-table-row border-bottom py-1 font-bold">
                          <span>Risk Sector</span>
                          <span>Score</span>
                        </div>
                        <div className="risk-table-row border-bottom py-1">
                          <span>Statutory/Legal Risk</span>
                          <span>{analysisResult.risk_assessment?.risk_breakdown?.legal_risk?.score || 0}/100</span>
                        </div>
                        <div className="risk-table-row border-bottom py-1">
                          <span>Evidence Strength Risk</span>
                          <span>{analysisResult.risk_assessment?.risk_breakdown?.evidence_risk?.score || 0}/100</span>
                        </div>
                        <div className="risk-table-row border-bottom py-1">
                          <span>Procedural/Technical Risk</span>
                          <span>{analysisResult.risk_assessment?.risk_breakdown?.procedural_risk?.score || 0}/100</span>
                        </div>
                        <div className="risk-table-row border-bottom py-1">
                          <span>Financial/Cost Risk</span>
                          <span>{analysisResult.risk_assessment?.risk_breakdown?.financial_risk?.score || 0}/100</span>
                        </div>
                      </div>

                      {/* Best/Worst/Likely outcomes */}
                      {analysisResult.risk_assessment?.most_likely_outcome && (
                        <div className="mt-3 text-xs">
                          <div className="mb-1"><strong className="text-success">Best case:</strong> {analysisResult.risk_assessment.best_case_scenario}</div>
                          <div className="mb-1"><strong className="text-danger">Worst case:</strong> {analysisResult.risk_assessment.worst_case_scenario}</div>
                          <div><strong>Most likely:</strong> {analysisResult.risk_assessment.most_likely_outcome}</div>
                        </div>
                      )}

                      {/* Critical risks */}
                      {analysisResult.risk_assessment?.critical_risks?.length > 0 && (
                        <div className="mt-3">
                          <h4 className="font-mono text-xs font-bold uppercase mb-1">Critical Risks</h4>
                          {analysisResult.risk_assessment.critical_risks.map((cr, i) => (
                            <div key={i} className="border-bottom py-1 text-xs">
                              <div><strong>{cr.risk}</strong> — Probability: {cr.probability} | Impact: {cr.impact}</div>
                              <div className="text-muted italic">Mitigation: {cr.mitigation}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <h3 className="font-serif border-bottom pb-2 mb-3">Litigation Timelines & Deadlines</h3>
                    <div className="timeline-card border p-3 rounded-lg font-mono text-xs">
                      <div><strong>Best case duration:</strong> {analysisResult.estimated_timeline?.best_case_duration}</div>
                      <div><strong>Estimated typical case duration:</strong> {analysisResult.estimated_timeline?.typical_duration || '12-24 months'}</div>
                      <div><strong>Worst case duration:</strong> {analysisResult.estimated_timeline?.worst_case_duration}</div>

                      {analysisResult.estimated_timeline?.key_milestones?.length > 0 && (
                        <>
                          <div className="mt-2 font-bold uppercase">Key Milestones:</div>
                          <ul>
                            {analysisResult.estimated_timeline.key_milestones.map((m, i) => (
                              <li key={i} className="mt-1">• {m.milestone} — <span className="text-danger">{m.estimated_time_from_now}</span></li>
                            ))}
                          </ul>
                        </>
                      )}

                      <div className="mt-2 font-bold uppercase">Limitation Periods (Critical Deadlines):</div>
                      <ul>
                        {analysisResult.procedural_roadmap?.limitation_periods?.map((lim, i) => (
                          <li key={i} className="mt-2 border-left pl-2">
                            <strong>File: {safeStr(lim.action)}</strong>
                            <div>Deadline: <span className="text-danger">{safeStr(lim.deadline)}</span> ({safeStr(lim.applicable_law)})</div>
                            <div>Condonation possible: {lim.condonation_possible ? "YES" : "NO"}</div>
                            {lim.consequence_of_missing && <div className="text-danger text-xs italic">If missed: {safeStr(lim.consequence_of_missing)}</div>}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <h3 className="font-serif border-bottom pb-2 mt-4 mb-3">Precedents & Citation Library</h3>
                    <div className="precedents-card">
                      {analysisResult.precedents_and_case_law?.binding_precedents?.map((pr, i) => (
                        <div key={i} className="precedent-item border-bottom pb-2 mb-2">
                          <span className="font-bold text-xs">{safeStr(pr.case_name)} ({safeStr(pr.year)})</span>
                          <div className="text-xs text-muted font-mono">{safeStr(pr.citation)} | Bench: {safeStr(pr.bench_strength)}</div>
                          <p className="text-xs italic mt-1 font-mono">Ratio: "{safeStr(pr.ratio_decidendi)}"</p>
                          <p className="text-xs mt-1"><strong>Relevance:</strong> {safeStr(pr.applicability_to_case)}</p>
                          <span className={`favours-badge ${pr.favours}`}>Favours: {safeStr(pr.favours)}</span>
                        </div>
                      ))}

                      {/* Recommended actions */}
                      {analysisResult.recommended_actions?.length > 0 && Array.isArray(analysisResult.recommended_actions) && (
                        <>
                          <h4 className="font-mono text-xs font-bold uppercase mt-4 mb-2">Recommended Priority Actions</h4>
                          {analysisResult.recommended_actions.map((act, i) => (
                            <div key={i} className="border p-2 rounded mb-2 text-xs">
                              <div className="font-bold">#{safeStr(act.priority)} — {safeStr(act.action)}</div>
                              <div className="text-muted">Responsible: {safeStr(act.responsible)} | Deadline: {safeStr(act.deadline)}</div>
                              {act.consequence_of_inaction && <div className="text-danger italic">If skipped: {safeStr(act.consequence_of_inaction)}</div>}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="disclaimer-footer text-center font-mono mt-5 pt-3 border-top text-muted">
                  {analysisResult.analysis_metadata?.disclaimer}
                </div>
              </div>
            </div>
            </ReportErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
