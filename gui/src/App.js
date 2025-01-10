import menu_Img from "./../src/assets/menu_btn.PNG";
import robot_Img from "./../src/assets/Robot.png";
import add_Img from "./../src/assets/add_btn.PNG";
import gear_Icon from "./../src/assets/gear_icon.PNG";
import React, { useState } from "react";

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [attachFile, setIsAttachOpen] = useState(false);

  function toggleMenu(){
    setIsMenuOpen((toggle) => !toggle);
  };
  
  function toggleAttach(){
    setIsAttachOpen((toggle) => !toggle);
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
        <main className="chat-main">
          <div className="chat-input-container">
            <input type="text" className="chat-input" placeholder="What’s on your mind?" />
            <button className="send-button">Send</button>
          </div>
        </main>
        
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
};

export default App;