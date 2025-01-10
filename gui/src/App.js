import React, { useState } from 'react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';

function App() {

  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (message) => {
    const newMessage = {
      message,
      direction: 'outgoing',
      sender: "user"
    };
    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setIsTyping(true);
  };
  return (
    <div className="chat-app">
      <header className="header">
        <div className="menu-container">
        <button type="submit">
        <img src="" alt="Menu" className="menu"/>
      </button>
          <img className="iamai" src="" alt="Iamai" />
          <h1 className="app-name">Iamai</h1>
        </div>
      </header>
      <MainContainer className="chat-main">
          <ChatContainer className="chat-container">       
            <MessageList 
              scrollBehavior="smooth" 
              typingIndicator={isTyping ? <TypingIndicator content="Aimi is typing..." /> : null}
            >
              {messages.map((message, i) => {
                console.log(message)
                return <Message key={i} model={message} />
              })}
            </MessageList>
            <MessageInput className="chat-input" placeholder="What’s on your mind?" onSend={handleSend} />        
          </ChatContainer>
        </MainContainer>
      </div>
  );
}

export default App;
