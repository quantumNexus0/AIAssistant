import { useState, useEffect } from 'react';

import {
  Copy, FileText, Check, Trash2, ArrowRight,
  ScrollText, Lock, Scale, BookOpen, Hand, ClipboardList,
  ShoppingCart, Shield, X
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

const DOC_TEMPLATES = [
  { id: 'legal_notice', Icon: ScrollText, title: 'Legal Notice', desc: 'Formal notice sent to respondent before initiating civil litigation.' },
  { id: 'bail_application', Icon: Lock, title: 'Bail Application', desc: 'Application filed in criminal courts for release under CrPC/BNSS.' },
  { id: 'plaint', Icon: Scale, title: 'Civil Plaint', desc: 'Formal statement of claim to initiate a civil suit in court.' },
  { id: 'written_statement', Icon: BookOpen, title: 'Written Statement', desc: 'Respondent\'s formal written defense in reply to a civil plaint.' },
  { id: 'affidavit', Icon: Hand, title: 'Affidavit Format', desc: 'A sworn statement verified under oath for judicial submissions.' },
  { id: 'rti_application', Icon: ClipboardList, title: 'RTI Application', desc: 'Formal application to request information under RTI Act 2005.' },
  { id: 'consumer_complaint', Icon: ShoppingCart, title: 'Consumer Forum Complaint', desc: 'Complaint filed in Consumer Commission under CP Act 2019.' },
  { id: 'stay_application', Icon: Shield, title: 'Stay Application', desc: 'Interim application seeking temporary injunction / stay orders.' }
];

export default function DocumentDrafterTab({ model, language }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  const [party1, setParty1] = useState('');
  const [party2, setParty2] = useState('');
  const [caseFacts, setCaseFacts] = useState('');
  const [courtDetails, setCourtDetails] = useState('');
  const [advocateName, setAdvocateName] = useState('');
  const [barNo, setBarNo] = useState('');
  const [prayers, setPrayers] = useState([]);
  const [newPrayer, setNewPrayer] = useState('');
  const [supportingFiles, setSupportingFiles] = useState([]);
  const [fileUploadError, setFileUploadError] = useState('');

  const [isDrafting, setIsDrafting] = useState(false);
  const [draftedText, setDraftedText] = useState('');
  const [copied, setCopied] = useState(false);

  const [savedDrafts, setSavedDrafts] = useState([]);
  const [selectedSavedDraftId, setSelectedSavedDraftId] = useState('');

  const fetchSavedDrafts = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`);
      if (res.ok) {
        const data = await res.json();
        setSavedDrafts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadDrafts = async () => {
      await fetchSavedDrafts();
    };
    loadDrafts();
  }, []);

  const handleAddPrayer = () => {
    if (newPrayer.trim()) {
      setPrayers([...prayers, newPrayer.trim()]);
      setNewPrayer('');
    }
  };

  const handleRemovePrayer = (i) => {
    setPrayers(prayers.filter((_, idx) => idx !== i));
  };

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });

  const handleSupportingFilesChange = async (event) => {
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
      setSupportingFiles(prev => [...prev, ...attachments]);
    } catch (err) {
      console.error(err);
      setFileUploadError('Unable to read document attachments. Please try again.');
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveSupportingFile = (index) => {
    setSupportingFiles(supportingFiles.filter((_, idx) => idx !== index));
  };

  const handleDownloadDraft = () => {
    if (!draftedText) return;
    const blob = new Blob([draftedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedTemplateId || 'legal_draft'}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleDraftDocument = async () => {
    if (!caseFacts.trim() || !party1.trim() || !party2.trim()) {
      alert("Parties and Case Facts are required to draft a document.");
      return;
    }

    setIsDrafting(true);
    setDraftedText('');

    const template = DOC_TEMPLATES.find(t => t.id === selectedTemplateId);

    const payload = {
      model,
      temperature: 0.3,
      document_type: selectedTemplateId,
      case_facts: caseFacts,
      parties: { petitioner: party1, respondent: party2 },
      court_details: courtDetails || "IN THE COURT OF APPROPRIATE JURISDICTION",
      specific_prayers: prayers.length > 0 ? prayers : undefined,
      supporting_documents: supportingFiles.length > 0 ? supportingFiles : undefined,
      advocate_name: advocateName || undefined,
      bar_council_number: barNo || undefined,
      language_preference: language || 'english'
    };

    try {
      const res = await fetch(`${API_BASE}/ai/draft-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Drafting failed");
      const data = await res.json();

      let resultText = '';
      if (typeof data === 'string') resultText = data;
      else if (data.response) resultText = data.response;
      else if (data.message?.content) resultText = data.message.content;
      else resultText = JSON.stringify(data, null, 2);

      setDraftedText(resultText);

      const docTitle = `Draft: ${template.title} (${party1.split(',')[0].trim()} vs ${party2.split(',')[0].trim()})`;
      await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle,
          document_type: selectedTemplateId,
          parties: { petitioner: party1, respondent: party2 },
          court_details: courtDetails || undefined,
          advocate_name: advocateName || undefined,
          bar_council_number: barNo || undefined,
          draft_text: resultText,
          word_count: resultText.split(/\s+/).filter(Boolean).length,
          attachments: supportingFiles.length > 0 ? supportingFiles : undefined
        })
      });
      fetchSavedDrafts();
    } catch (err) {
      console.error(err);
      alert("Failed to draft document. Verify connection to backend.");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSavedDraftSelect = async (e) => {
    const id = e.target.value;
    setSelectedSavedDraftId(id);
    if (!id) { setDraftedText(''); return; }
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDraftedText(data.draft_text);
        setSelectedTemplateId(data.document_type);
        setParty1(data.parties?.petitioner || '');
        setParty2(data.parties?.respondent || '');
        setCourtDetails(data.court_details || '');
        setSupportingFiles(data.attachments || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSavedDraft = async (e) => {
    e.stopPropagation();
    if (!selectedSavedDraftId) return;
    if (!confirm("Delete this draft permanently?")) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${selectedSavedDraftId}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedDrafts(prev => prev.filter(d => d.id !== selectedSavedDraftId));
        setSelectedSavedDraftId('');
        setDraftedText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = () => {
    if (draftedText) {
      navigator.clipboard.writeText(draftedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="tab-panel-container doc-drafter-wrapper">
      <div className="tab-panel-header print-hide">
        <h2>Document Drafting Assistant</h2>
        <p>Draft complete, legally sound, court-ready Indian legal documents. Select a template to begin.</p>

        {savedDrafts.length > 0 && (
          <div className="saved-cases-archive font-mono">
            <span>Saved Drafts:</span>
            <select value={selectedSavedDraftId} onChange={handleSavedDraftSelect}>
              <option value="">-- Load Saved Draft --</option>
              {savedDrafts.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
            {selectedSavedDraftId && (
              <button className="archive-delete" onClick={handleDeleteSavedDraft} title="Delete draft">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Templates Grid Selection */}
      {!selectedTemplateId && (
        <div className="doc-templates-selection-grid animate-fade-in print-hide">
          {DOC_TEMPLATES.map(t => {
            const { Icon } = t;
            return (
              <div key={t.id} className="doc-template-card" onClick={() => setSelectedTemplateId(t.id)}>
                <div className="dt-icon">
                  <Icon size={24} strokeWidth={1.5} />
                </div>
                <h4>{t.title}</h4>
                <p>{t.desc}</p>
                <button className="template-select-link font-mono text-xs">
                  Select Template <ArrowRight size={10} style={{ marginLeft: 4 }} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Drafting Form and Output */}
      {selectedTemplateId && (
        <div className="analyzer-split-grid animate-fade-in">
          {/* Form Left */}
          <div className="analyzer-form-panel print-hide">
            <div className="form-navigation-row mb-3">
              <button
                className="btn-secondary text-xs"
                onClick={() => { setSelectedTemplateId(null); setDraftedText(''); setSelectedSavedDraftId(''); }}
              >
                ← Back to Templates
              </button>
            </div>

            <div className="section-group-card">
              <h3>Custom Draft Parameters</h3>

              <div className="form-group">
                <label>Petitioner / First Party (Full Details)</label>
                <input
                  type="text"
                  value={party1}
                  onChange={e => setParty1(e.target.value)}
                  placeholder="e.g. Ramesh Kumar S/o Suresh Kumar, Age 42, R/o G-12 Saket, Delhi"
                />
              </div>

              <div className="form-group">
                <label>Respondent / Second Party (Full Details)</label>
                <input
                  type="text"
                  value={party2}
                  onChange={e => setParty2(e.target.value)}
                  placeholder="e.g. State of NCT Delhi or ICICI Bank Ltd, Connaught Place Branch"
                />
              </div>

              <div className="form-group">
                <label>Court Name / Location</label>
                <input
                  type="text"
                  value={courtDetails}
                  onChange={e => setCourtDetails(e.target.value)}
                  placeholder="e.g. District & Sessions Court, Saket, New Delhi"
                />
              </div>

              <div className="form-group">
                <label>Case Narrative / Material Facts for Document</label>
                <textarea
                  rows={6}
                  value={caseFacts}
                  onChange={e => setCaseFacts(e.target.value)}
                  placeholder="Write details of the claim. Dates of cause of action, details of transaction, violation details..."
                />
              </div>
            </div>

            <div className="section-group-card">
              <h3>Advocate Credentials (Optional)</h3>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Advocate Name</label>
                  <input type="text" value={advocateName} onChange={e => setAdvocateName(e.target.value)} placeholder="e.g. Advocate Rajesh Sen" />
                </div>
                <div className="form-group flex-1">
                  <label>Bar Council Enrollment Number</label>
                  <input type="text" value={barNo} onChange={e => setBarNo(e.target.value)} placeholder="e.g. D/1054/2012" />
                </div>
              </div>
            </div>

            <div className="section-group-card">
              <h3>Specific Prayers / Reliefs Requested</h3>
              <div className="list-adder-input">
                <input
                  type="text"
                  value={newPrayer}
                  onChange={e => setNewPrayer(e.target.value)}
                  placeholder="e.g. Direct respondent to return Rs. 5 Lakhs with interest"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPrayer())}
                />
                <button type="button" onClick={handleAddPrayer}>+</button>
              </div>
              {prayers.length > 0 && (
                <div className="chips-container mt-2">
                  {prayers.map((pr, i) => (
                    <span key={i} className="chip">
                      {pr.slice(0, 30)}...
                      <X size={10} className="chip-remove" onClick={() => handleRemovePrayer(i)} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="section-group-card">
              <h3>Upload Supporting Documents</h3>
              <input
                type="file"
                multiple
                onChange={handleSupportingFilesChange}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
              <p className="help-text">Add supporting court orders, pleadings, or evidence files for the drafter.</p>
              {fileUploadError && <p className="form-error">{fileUploadError}</p>}
              {supportingFiles.length > 0 && (
                <div className="chips-container">
                  {supportingFiles.map((file, i) => (
                    <span key={i} className="chip">
                      {file.filename} <X size={10} className="chip-remove" onClick={() => handleRemoveSupportingFile(i)} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              className="btn-primary w-full py-3 text-sm font-semibold uppercase tracking-wider mt-3"
              onClick={handleDraftDocument}
              disabled={isDrafting}
            >
              {isDrafting ? "Drafting Document..." : "Generate Court-Ready Draft"}
            </button>
          </div>

          {/* Document Preview Right */}
          <div className="analyzer-output-panel">
            {isDrafting ? (
              <div className="analysis-progress-card">
                <div className="welcome-ashoka animate-pulse">
                  <FileText size={40} strokeWidth={1.5} />
                </div>
                <h3>Drafting Document</h3>
                <p>Generating court-ready legal structure in standard cause title format, inserting recitals, factual paragraphs, verification details, and prayer clauses...</p>
              </div>
            ) : !draftedText ? (
              <div className="output-placeholder">
                <FileText size={40} className="placeholder-icon" />
                <h3>Draft Preview</h3>
                <p>Configure custom draft parameters on the left and trigger generation to view the formatted, editable legal document draft.</p>
              </div>
            ) : (
              <div className="draft-preview-dashboard">
                <div className="report-toolbar print-hide">
                  <span className="font-mono text-xs text-muted">LEGAL DRAFT PREVIEW</span>
                  <div className="report-toolbar-actions">
                    <button className="btn-secondary btn-icon text-xs" onClick={handleCopy}>
                      {copied ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
                      <span>{copied ? 'Copied!' : 'Copy Draft'}</span>
                    </button>
                    <button className="btn-secondary btn-icon text-xs" onClick={handleDownloadDraft}>
                      <FileText size={13} />
                      <span>Download Draft</span>
                    </button>
                  </div>
                </div>
                <div className="legal-paper-scroll">
                  <pre className="legal-doc-text font-mono text-xs">{draftedText}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}