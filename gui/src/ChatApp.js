import React, { useState, useContext, useEffect, useRef } from "react";
import { Link } from 'react-router-dom';
import {
    MainContainer,
    ChatContainer,
    MessageList,
    Message,
    MessageInput,
    TypingIndicator,
} from '@chatscope/chat-ui-kit-react';
import ListGroup from 'react-bootstrap/ListGroup';
import 'bootstrap/dist/css/bootstrap.min.css';

import menu_Img from "./assets/menu_btn.PNG";
import logo from "./assets/iamai_logo.png";
import idle from "./assets/iamaiidle.jpg";
import listening from "./assets/iamailistening.jpg";
import speaking from "./assets/iamaispeaking.jpg";
import thinking from "./assets/iamaithinking.jpg";
import add_Img from "./assets/add_btn.PNG";
import gear_Icon from "./assets/gear_icon.PNG";
import close_Img from "./../src/assets/close_btn.PNG";
import file_Icon from "./../src/assets/file_inpt.PNG";
import img_Icon from "./../src/assets/img_inpt.PNG";
import vid_Icon from "./../src/assets/video_inpt.PNG";

import { AppContext } from "./App";

function ChatApp() {
    const { headerColor, messageFontSize, messageSpeed } = useContext(AppContext);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [attachFile, setAttachFile] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [aiStatus, setAiStatus] = useState('idle');
    const [userInput, setUserInput] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(1);
    const [messages, setMessages] = useState([]);

    const wsRef = useRef(null);

    useEffect(() => {
        wsRef.current = new WebSocket('ws://localhost:8080/ws');

        wsRef.current.onopen = () => setIsConnected(true);

        wsRef.current.onmessage = (event) => {
            setIsTyping(false);
            const aiMessage = {
                message: event.data,
                direction: 'incoming',
                sender: "AI",
            };
            setMessages((prevMessages) => [...prevMessages, aiMessage]);
            setAiStatus('speaking');
            setTimeout(() => setAiStatus('idle'), 1000);
        };

        wsRef.current.onclose = () => setIsConnected(false);

        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);
    const toggleAttach = () => setAttachFile((prev) => !prev);

    const HandleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                handleSend(file.name, true, { type: file.type.split('/')[0], src: reader.result });
            };
            reader.readAsDataURL(file);
            toggleAttach();
        }
    };

    const handleSend = async (message, isAttachment = false, attachment = null) => {
        const newMessage = {
            message,
            direction: 'outgoing',
            sender: "user",
            attachment,
        };

        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setUserInput("");
        setIsTyping(true);
        setAiStatus('thinking');

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                wsRef.current.send(isAttachment ? JSON.stringify(attachment) : message);
            } catch (error) {
                console.error("WebSocket error:", error);
                setIsTyping(false);
                setAiStatus('idle');
            }
        } else {
            setIsTyping(false);
            const errorMessage = {
                message: "Sorry, I'm currently disconnected. Please try again later.",
                direction: 'incoming',
                sender: "AI",
            };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
            setAiStatus('idle');
        }
    };

    const handleInputChange = (innerHtml, textContent) => {
        setUserInput(textContent);
        setAiStatus(textContent ? 'listening' : 'idle');
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

    const addNewChat = () => {
        const chatName = prompt("Please enter a name for the chat:");
        const modelSelection = prompt("Please choose the model you wish to use (e.g., AI, Chatbot, etc.):");

        if (chatName && modelSelection) {
            const newChatId = Date.now();
            const newChat = { id: newChatId, name: chatName, messages: [] };
            setChats((prevChats) => [...prevChats, newChat]);
            setCurrentChatId(newChatId);
        }
    };

    return (
        <div className="chat-app">
            <header className="header" style={{ background: headerColor }}>
                <div className="menu-container">
                    <button className="menu-btn" onClick={toggleMenu} type="button">
                        <img className="menu" src={menu_Img} alt="menu" />
                    </button>
                    <img className="iamai" src={getAiImage()} alt="Iamai" />
                    <img className="logo" src={logo} alt="Logo" />
                </div>
            </header>
            <MainContainer className="chat-main">
                <ChatContainer className="chat-container">
                    <MessageList
                        scrollBehavior="smooth"
                        typingIndicator={isTyping ? <TypingIndicator content="Aimi is typing..." /> : null}>
                        {messages.map((message, i) => {
                            if (message.attachment) {
                                const { type, src } = message.attachment;
                                if (type === "image") {
                                    return (<img key={i} src={src} alt="attachment" style={{ maxWidth: '30%', marginLeft: '70%' }} />);
                                } else if (type === "video") {
                                    return (
                                        <video key={i} src={src} controls style={{ maxWidth: '30%', marginLeft: '70%' }} />
                                    );
                                }
                            }
                            return <Message key={i} model={{ ...message, style: { fontSize: `${messageFontSize}px` } }} />;
                        })
                        }

                    </MessageList>
                    <MessageInput
                        className="chat-input"
                        placeholder="What’s on your mind?"
                        value={userInput}
                        onChange={handleInputChange}
                        onSend={handleSend}
                        disabled={isTyping || !isConnected}
                        style={{ fontSize: `${messageFontSize}px` }}
                        onAttachClick={toggleAttach}
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
                            <button className="add-button" onClick={addNewChat}>
                                <img src={add_Img} alt="Add" />
                            </button>
                        </nav>
                        <hr className="divider" />
                        <div className="profile-section">
                            <div className="profile-circle"></div>
                            <div className="profile-name">
                                {chats.find(chat => chat.id === currentChatId)?.username}
                            </div>
                        </div>
                        <div className="chat-list">
                            {chats.map(chat => (
                                <div key={chat.id} className={`chat-item ${chat.id === currentChatId ? 'active' : ''}`} onClick={() => setCurrentChatId(chat.id)}>
                                    {chat.name}
                                </div>
                            ))}
                        </div>
                        <Link to="/settings" className="settings-button">
                            <img src={gear_Icon} alt="Settings Icon" />
                            <span>Settings</span>
                        </Link>
                    </div>
                </div>
            )}

            {/* Attach Screen */}
            {attachFile && (
                <div className="attach-overlay">
                    <ListGroup className="attach-container">
                        <ListGroup.Item className="item-top">
                            <button className="close-attach" onClick={toggleAttach}>
                                <img src={close_Img} alt="Close Icon" />
                            </button>
                        </ListGroup.Item>
                        <ListGroup.Item action className="item">Files
                            <input type="file" id="selected_file" onChange={HandleFileChange} />
                            <img src={file_Icon} alt="file" />
                        </ListGroup.Item>
                        <ListGroup.Item action className="item">Image
                            <input type="file" id="img_file" accept="image/*" onChange={HandleFileChange} />
                            <img src={img_Icon} alt="img" />
                        </ListGroup.Item>
                        <ListGroup.Item action className="item">Video
                            <input type="file" id="vid_file" accept="video/*" onChange={HandleFileChange} />
                            <img src={vid_Icon} alt="video" />
                        </ListGroup.Item>
                        <ListGroup.Item action className="item">Folder
                            <input type="file" id="selected_folder" multiple onChange={HandleFileChange} disabled />
                            <img src={vid_Icon} alt="folder" />
                        </ListGroup.Item>
                    </ListGroup>
                </div>
            )}
        </div>
    );
}
export default ChatApp;