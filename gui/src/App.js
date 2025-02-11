import React, { useState, createContext, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import axios from "axios";
import Settings from "./Settings";
import ChatApp from "./ChatApp";

const DEFAULT_SETTINGS = {
  headerColor: '#164194',
  messageFontSize: 16,
  messageSpeed: 1000,
  currentModel: ''
};

export const AppContext = createContext();

function App() {
  const [headerColor, setHeaderColor] = useState(DEFAULT_SETTINGS.headerColor);
  const [messageFontSize, setMessageFontSize] = useState(DEFAULT_SETTINGS.messageFontSize);
  const [messageSpeed, setMessageSpeed] = useState(DEFAULT_SETTINGS.messageSpeed);
  const [currentModel, setCurrentModel] = useState(DEFAULT_SETTINGS.currentModel);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    loadInitialSettings();
  }, []);

  const loadInitialSettings = async () => {
    try {
      const settingsResponse = await axios.get('http://localhost:8080/settings/load');
      const settings = settingsResponse.data;
      
      if (settings && Object.keys(settings).length > 0) {
        setHeaderColor(settings.headerColor || DEFAULT_SETTINGS.headerColor);
        setMessageFontSize(settings.fontSize || DEFAULT_SETTINGS.messageFontSize);
        setMessageSpeed(parseInt(settings.textSpeed) || DEFAULT_SETTINGS.messageSpeed);
        setCurrentModel(settings.model || DEFAULT_SETTINGS.currentModel);
      } else {
        await saveSettings({
          headerColor: DEFAULT_SETTINGS.headerColor,
          fontSize: DEFAULT_SETTINGS.messageFontSize,
          textSpeed: DEFAULT_SETTINGS.messageSpeed,
          model: DEFAULT_SETTINGS.currentModel,
          isGradient: false
        });
      }
    } catch (error) {
      console.error('Failed to load initial settings:', error);
      setHeaderColor(DEFAULT_SETTINGS.headerColor);
      setMessageFontSize(DEFAULT_SETTINGS.messageFontSize);
      setMessageSpeed(DEFAULT_SETTINGS.messageSpeed);
      setCurrentModel(DEFAULT_SETTINGS.currentModel);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const saveSettings = async (settingsToSave = null) => {
    try {
      const settingsData = settingsToSave || {
        headerColor,
        gradientColor: headerColor,
        textSpeed: messageSpeed,
        fontSize: messageFontSize,
        model: currentModel,
        isGradient: headerColor.includes('linear-gradient')
      };

      console.log('Saving settings:', settingsData);
      
      const response = await axios.post('http://localhost:8080/settings/save', settingsData);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      console.log('Settings saved successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  if (isLoadingSettings) {
    return <div>Loading settings...</div>;
  }

  return (
    <AppContext.Provider value={{
      headerColor,
      messageFontSize,
      messageSpeed,
      currentModel,
      setHeaderColor,
      setMessageFontSize,
      setMessageSpeed,
      setCurrentModel,
      saveSettings,
      isLoadingSettings,
      loadInitialSettings
    }}>
      <Router>
        <Routes>
          <Route path="/" element={<ChatApp />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </AppContext.Provider>
  );
}

export default App;