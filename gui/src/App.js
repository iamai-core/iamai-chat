import React, { useState, createContext } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import Settings from "./Settings";
import ChatApp from "./ChatApp";

export const AppContext = createContext();

function App() {
  const [headerColor, setHeaderColor] = useState('#164194');
  const [messageFontSize, setMessageFontSize] = useState(16);
  const [messageSpeed, setMessageSpeed] = useState(1000);

  return (
    <AppContext.Provider value={{
      headerColor,
      messageFontSize,
      messageSpeed,
      setHeaderColor,
      setMessageFontSize,
      setMessageSpeed,
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
