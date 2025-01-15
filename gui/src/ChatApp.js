import React, { useState, useContext, useEffect } from "react";
import { Link } from 'react-router-dom';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
import menu_Img from "./assets/menu_btn.PNG";
import idle from "./assets/iamaiidle.jpg";
import listening from "./assets/iamailistening.jpg";
import speaking from "./assets/iamaispeaking.jpg";
import thinking from "./assets/iamaithinking.jpg";
import add_Img from "./assets/add_btn.PNG";
import gear_Icon from "./assets/gear_icon.PNG";
import { AppContext } from "./App";

function ChatApp() {
    const { headerColor, messageFontSize, messageSpeed } = useContext(AppContext);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [aiStatus, setAiStatus] = useState('idle');
    const [userInput, setUserInput] = useState("");

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);
    const handleSend = async (message) => {
        const newMessage = {
            message,
            direction: 'outgoing',
            sender: "user"
        };
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setIsTyping(true);
        setAiStatus('thinking');
        setTimeout(() => {
            setIsTyping(false);
            setMessages((prevMessages) => [...prevMessages, { message: "AI's response here", direction: 'incoming', sender: "AI" }]);
            setAiStatus('speaking');
            setTimeout(() => setAiStatus('idle'), 1000);
        }, messageSpeed);
    };

    const getAiImage = () => {
        switch (aiStatus) {
            case 'listening':
                return listening;
            case 'thinking':
                return thinking;
            case 'speaking':
                return speaking;
            default:
                return idle;
        }
    };

    const handleInputChange = (event) => {
        if (event?.target?.value !== undefined) {
            const inputValue = event.target.value;
            setUserInput(inputValue);
            if (inputValue.trim()) {
                setAiStatus('listening');
            } else {
                setAiStatus('idle');
            }
        }
    };

    useEffect(() => {
        if (userInput.trim()) {
            const typingTimeout = setTimeout(() => {
                if (!userInput.trim()) {
                    setAiStatus('idle');
                }
            }, 1000);
            return () => clearTimeout(typingTimeout);
        } else {
            setAiStatus('idle');
        }
    }, [userInput]);

    return (
        <div className="chat-app" style={{ backgroundColor: headerColor }}>
            <header className="header" style={{ backgroundColor: headerColor }}>
                <div className="menu-container">
                    <button className="menu-btn" onClick={toggleMenu} type="button">
                        <img className="menu" src={menu_Img} alt="menu" />
                    </button>
                    <img className="iamai" src={getAiImage()} alt="Iamai" />
                    <h1 className="app-name">Iamai</h1>
                </div>
            </header>
            <MainContainer className="chat-main">
                <ChatContainer className="chat-container">
                    <MessageList
                        scrollBehavior="smooth"
                        typingIndicator={isTyping ? <TypingIndicator content="Aimi is typing..." /> : null}
                    >
                        {messages.map((message, i) => (
                            <Message key={i} model={{ ...message, style: { fontSize: `${messageFontSize}px` } }} />
                        ))}
                    </MessageList>
                    <MessageInput
                        className="chat-input"
                        placeholder="What’s on your mind?"
                        //value={userInput}
                        onChange={handleInputChange}
                        onSend={handleSend}
                        disabled={isTyping}
                        style={{ fontSize: `${messageFontSize}px` }}
                    />
                </ChatContainer>
            </MainContainer>

            {isMenuOpen && (
                <div className="sidebar-overlay">
                    <div className="sidebar">
                        <nav>
                            <button className="close-menu" onClick={toggleMenu} type="button">
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
                        <Link to="/settings" className="settings-button">
                            <img src={gear_Icon} alt="Settings Icon" />
                            <span>Settings</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatApp;
