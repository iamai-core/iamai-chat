import React, { useState, createContext } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import Settings from "./Settings";
import ChatApp from "./ChatApp";

export const AppContext = createContext();

function App() {
  const [headerColor, setHeaderColor] = useState("#1d1d1d");
  const [messageFontSize, setMessageFontSize] = useState(15);
  const [messageSpeed, setMessageSpeed] = useState(5);

  return (
    <AppContext.Provider value={{ headerColor, setHeaderColor, messageFontSize, setMessageFontSize, messageSpeed, setMessageSpeed }}>
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
