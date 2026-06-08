import { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import {
  Plus,
  Trash2,
  // ChevronRight,
  // AlertTriangle,
  // Calendar,
  FileText,
  Award,
  // Map,
  // Bookmark,
  // TrendingUp,
  Printer,
  // Clock,
  // BookmarkCheck,
  // ChevronDown,
  X
} from 'lucide-react';

// const API_BASE = 'http://localhost:8000/api/v1';

export default function CaseAnalyzerTab({ model, language }) {
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
    if (typeof data === 'object' && !data.response && !data.message?.content) {
      return { parsed: data, raw: JSON.stringify(data, null, 2) };
    }

    let raw = '';
    if (typeof data === 'string') {
      raw = data.trim();
    } else if (data.response) {
      raw = data.response;
    } else if (data.message?.content) {
      raw = data.message.content;
    } else {
      raw = JSON.stringify(data, null, 2);
    }

    let cleaned = raw;
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
    cleaned = cleaned.trim();

    try {
      const parsed = JSON.parse(cleaned);
      return { parsed, raw };
    } catch (err) {
      return { parsed: null, raw };
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

    try {
      const res = await fetch(`${API_BASE}/ai/analyze-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
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
      const { parsed, raw } = parseOllamaResponse(data);
      if (!parsed) {
        setAnalysisError('Unable to parse AI response into structured JSON. Raw response shown below.');
        setAnalysisRawOutput(raw);
        return;
      }

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
      console.error(err);
      setAnalysisError('Failed to analyze case. Check the model server and raw output.');
      setAnalysisRawOutput(err.message || String(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSavedCaseSelect = async (e) => {
    const id = e.target.value;
    setSelectedSavedCaseId(id);
    if (!id) {
      setAnalysisResult(null);
      return;
    }

    // Load from MongoDB
    try {
      const res = await fetch(`${API_BASE}/cases/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data.analysis_result);

        // Repopulate form
        const req = data.request_data;
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
      }
    } catch (err) {
      console.error(err);
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
                        "{analysisResult.executive_summary?.case_overview}"
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
                        {analysisResult.executive_summary?.critical_immediate_actions?.map((act, i) => (
                          <li key={i} className="text-sm font-semibold mt-1">⚠️ {act}</li>
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
                              <li key={i} className="text-xs">{f}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="border-left pl-3 ml-3">
                          <h5 className="text-xs font-bold font-mono">Opposing Contested Facts</h5>
                          <ul>
                            {analysisResult.case_facts_analysis?.disputed_facts?.map((f, i) => (
                              <li key={i} className="text-xs text-warning">{f}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ROADMAP & LAW */}
                {activeReportTab === 'roadmap' && (
                  <div className="report-tab-content animate-fade-in">
                    <h3 className="font-serif border-bottom pb-2 mb-3">Applicable Statutes & Legal Bases</h3>

                    <div className="applicable-laws-list">
                      {analysisResult.applicable_laws?.map((law, i) => (
                        <div key={i} className="law-item-card border p-3 rounded-lg mb-3">
                          <div className="law-item-title font-bold text-sm">
                            {law.act_name} — {law.section}
                          </div>
                          {law.new_law_equivalent && (
                            <div className="new-law-badge text-xs font-mono text-muted mb-2">
                              BNS/BNSS Equivalent: {law.new_law_equivalent}
                            </div>
                          )}
                          <p className="law-exact-text text-xs italic mt-1 font-mono text-muted">
                            "{law.exact_text}"
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

                    {analysisResult.constitutional_provisions && analysisResult.constitutional_provisions.length > 0 && (
                      <>
                        <h3 className="font-serif border-bottom pb-2 mt-4 mb-3">Constitutional Angles & Writs</h3>
                        {analysisResult.constitutional_provisions.map((c, i) => (
                          <div key={i} className="constitutional-card border p-3 rounded-lg mb-3">
                            <div className="font-bold text-sm">{c.article} ({c.title})</div>
                            <p className="text-xs mt-1">{c.relevance}</p>
                            <span className="badge text-xs font-mono mt-1">Enforcement: {c.enforcement_mechanism}</span>
                          </div>
                        ))}
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
                    </div>

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
                            <p className="text-muted italic">A: "{qa.suggested_answer}"</p>
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
                    </div>

                    <h3 className="font-serif border-bottom pb-2 mb-3">Litigation Timelines & Deadlines</h3>
                    <div className="timeline-card border p-3 rounded-lg font-mono text-xs">
                      <div><strong>Estimated typical case duration:</strong> {analysisResult.estimated_timeline?.typical_duration || '12-24 months'}</div>
                      <div className="mt-2 font-bold uppercase">Limitation Periods (Critical Deadlines):</div>
                      <ul>
                        {analysisResult.procedural_roadmap?.limitation_periods?.map((lim, i) => (
                          <li key={i} className="mt-2 border-left pl-2">
                            <strong>File: {lim.action}</strong>
                            <div>Deadline: <span className="text-danger">{lim.deadline}</span> ({lim.applicable_law})</div>
                            <div>Condonation possible: {lim.condonation_possible ? "YES" : "NO"}</div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <h3 className="font-serif border-bottom pb-2 mt-4 mb-3">Precedents & Citation Library</h3>
                    <div className="precedents-card">
                      {analysisResult.precedents_and_case_law?.binding_precedents?.map((pr, i) => (
                        <div key={i} className="precedent-item border-bottom pb-2 mb-2">
                          <span className="font-bold text-xs">{pr.case_name} ({pr.year})</span>
                          <div className="text-xs text-muted font-mono">{pr.citation} | Bench: {pr.bench_strength}</div>
                          <p className="text-xs italic mt-1 font-mono">Ratio: "{pr.ratio_decidendi}"</p>
                          <p className="text-xs mt-1"><strong>Relevance:</strong> {pr.applicability_to_case}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="disclaimer-footer text-center font-mono mt-5 pt-3 border-top text-muted">
                  {analysisResult.analysis_metadata?.disclaimer}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
