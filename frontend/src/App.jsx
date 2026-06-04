import React, { useState } from 'react';
import Layout from './components/Layout';
import ChatTab from './components/ChatTab';
import RightsTab from './components/RightsTab';
import CaseAnalyzerTab from './components/CaseAnalyzerTab';
import DocumentDrafterTab from './components/DocumentDrafterTab';
import LegalToolsTab from './components/LegalToolsTab';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [currentChatId, setCurrentChatId] = useState(null);
  const [model, setModel] = useState('llama3.2');
  const [language, setLanguage] = useState('english');
  const [prepopulatedPrompt, setPrepopulatedPrompt] = useState('');

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
