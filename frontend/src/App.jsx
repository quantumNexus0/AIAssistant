import { useState } from 'react';
import Layout from './components/Layout';
import ChatTab from './components/ChatTab';
import RightsTab from './components/RightsTab';
import CaseAnalyzerTab from './components/CaseAnalyzerTab';
import DocumentDrafterTab from './components/DocumentDrafterTab';
import LegalToolsTab from './components/LegalToolsTab';
import './App.css';

const LS_MODEL = 'nyayaai_model';
const LS_LANG  = 'nyayaai_language';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [currentChatId, setCurrentChatId] = useState(null);
  const [model, setModelState] = useState(() => localStorage.getItem(LS_MODEL) || 'llama3.2');
  const [language, setLanguageState] = useState(() => localStorage.getItem(LS_LANG) || 'english');
  const [prepopulatedPrompt, setPrepopulatedPrompt] = useState('');

  const setModel = (m) => { setModelState(m); localStorage.setItem(LS_MODEL, m); };
  const setLanguage = (l) => { setLanguageState(l); localStorage.setItem(LS_LANG, l); };

  const handleExploreRight = (promptText) => {
    setCurrentChatId(null); // Open a fresh chat
    setPrepopulatedPrompt(promptText);
    setActiveTab('chat');
  };

  const handleLearnAboutReference = (promptText) => {
    setCurrentChatId(null); // Open a fresh chat
    setPrepopulatedPrompt(promptText);
    setActiveTab('chat');
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentChatId={currentChatId}
      setCurrentChatId={setCurrentChatId}
      model={model}
      setModel={setModel}
      language={language}
      setLanguage={setLanguage}
    >
      {activeTab === 'chat' && (
        <ChatTab
          currentChatId={currentChatId}
          setCurrentChatId={setCurrentChatId}
          model={model}
          setModel={setModel}
          language={language}
          setLanguage={setLanguage}
          prepopulatedPrompt={prepopulatedPrompt}
          onClearPrepopulatedPrompt={() => setPrepopulatedPrompt('')}
        />
      )}
      {activeTab === 'rights' && (
        <RightsTab onExploreRight={handleExploreRight} />
      )}
      {activeTab === 'analyze' && (
        <CaseAnalyzerTab model={model} language={language} />
      )}
      {activeTab === 'docs' && (
        <DocumentDrafterTab model={model} language={language} />
      )}
      {activeTab === 'tools' && (
        <LegalToolsTab
          onLearnAboutReference={handleLearnAboutReference}
          model={model}
        />
      )}
    </Layout>
  );
}
