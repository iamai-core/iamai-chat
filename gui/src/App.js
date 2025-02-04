import React, { useState, createContext, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import axios from "axios";
import Settings from "./Settings";
import ChatApp from "./ChatApp";

export const AppContext = createContext();

function App() {
  const [headerColor, setHeaderColor] = useState('#164194');
  const [messageFontSize, setMessageFontSize] = useState(16);
  const [messageSpeed, setMessageSpeed] = useState(1000);
  const [models, setModels] = useState([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    const loadInitialSettings = async () => {
      try {
        const settingsResponse = await axios.get('http://localhost:8080/settings/load');
        const settings = settingsResponse.data;
        setHeaderColor(settings.header_color || '#164194');
        setMessageFontSize(settings.font_size || 16);
        setMessageSpeed(parseInt(settings.text_speed) || 1000);
        const modelsResponse = await axios.get('http://localhost:8080/models');
        setModels(modelsResponse.data.models || []);
      } catch (error) {
        console.error('Failed to load initial settings:', error);
        setHeaderColor('#164194');
        setMessageFontSize(16);
        setMessageSpeed(1000);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadInitialSettings();
  }, []);
  const saveSettings = async () => {
    try {
      await axios.post('http://localhost:8080/settings/save', {
        headerColor,
        gradientColor: headerColor,
        textSpeed: messageSpeed.toString(),
        fontSize: messageFontSize
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <AppContext.Provider value={{
      headerColor,
      messageFontSize,
      messageSpeed,
      setHeaderColor,
      setMessageFontSize,
      setMessageSpeed,
      models,
      saveSettings,
      isLoadingSettings
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