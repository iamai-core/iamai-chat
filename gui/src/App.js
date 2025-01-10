import menu_Img from "./../src/assets/menu_btn.PNG";
import robot_Img from "./../src/assets/Robot.png";
import add_Img from "./../src/assets/add_btn.PNG";
import gear_Icon from "./../src/assets/gear_icon.PNG";
import React, { useState } from "react";
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [attachFile, setIsAttachOpen] = useState(false);
  
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false);

  function toggleMenu(){
    setIsMenuOpen((toggle) => !toggle);
  };
  
  function toggleAttach(){
    setIsAttachOpen((toggle) => !toggle);
  };
  
  
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
          <button className="menu-btn" onClick={toggleMenu} type="Submit" >
            <img className="menu" src={menu_Img} alt="menu"/>
          </button>
          <img className="Iamai" src={robot_Img} alt="Iamai" />
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
        
        {/* Overlay Screen */}
        {isMenuOpen && (
        <div className="sidebar-overlay">
          <div className="sidebar">
            <nav>
              <button className="close-menu" onClick={toggleMenu} type="Submit" >
                <img src={menu_Img} alt="close" />
              </button>
              <button className="add-button">
                <img src={add_Img} alt="Add" />
              </button>
            </nav>
            <hr className="divider" />
            <div className="profile-section">
              <div className="profile-circle"></div>
              <div className="profile-name">John Doe</div>
            </div>
            <button className="settings-button">
              <img src={gear_Icon} alt="Settings Icon" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Attach Screen */}
      {setIsAttachOpen && (
        <div>
        </div>
      )}
      
      </div>
  );
}

export default App;