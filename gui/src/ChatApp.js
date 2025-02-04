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
import { AppContext } from "./App";
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
import close_Img from "./assets/close_btn.PNG";
import file_Icon from "./assets/file_inpt.PNG";
import img_Icon from "./assets/img_inpt.PNG";
import vid_Icon from "./assets/video_inpt.PNG";

const CONFIG = {
    API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
    WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws'
};

async function fetchWithErrorHandling(url, options = {}) {
    try {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        });

        const data = await response.json();
        
        return {
            success: response.ok,
            data: response.ok ? data : null,
            error: !response.ok ? data : null
        };
    } catch (error) {
        console.error('Fetch error:', error);
        return {
            success: false,
            data: null,
            error: error.message
        };
    }
}

function ChatApp() {
    const { headerColor, messageFontSize, messageSpeed } = useContext(AppContext);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [attachFile, setAttachFile] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [aiStatus, setAiStatus] = useState('idle');
    const [userInput, setUserInput] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    const wsRef = useRef(null);

    const loadChats = async () => {
        const result = await fetchWithErrorHandling(`${CONFIG.API_BASE_URL}/chats`);
        
        if (result.success) {
            if (result.data.length === 0) {
                await addNewChat();
            } else {
                setChats(result.data);
                const firstChatId = result.data[0].id;
                setCurrentChatId(firstChatId);
                await loadMessages(firstChatId);
            }
        } else {
            setError('Failed to load existing chats');
        }
    };

    const loadMessages = async (chatId) => {
        const result = await fetchWithErrorHandling(`${CONFIG.API_BASE_URL}/chat/messages?chat_id=${chatId}`);
        
        if (result.success) {
            const formattedMessages = result.data.map(msg => ({
                message: msg.content,
                direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
                sender: msg.sender
            }));
            setMessages(formattedMessages);
        }
    };

    const addNewChat = async () => {
        const chatName = prompt("Enter a name for your new chat:");
        const modelSelection = prompt("Choose the model you wish to use (e.g., AI, Chatbot, etc.):");
    
        if (!chatName || !modelSelection) {
            alert("Chat creation canceled. Both chat name and model selection are required.");
            return;
        }
    
        const result = await fetchWithErrorHandling(`${CONFIG.API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: chatName,
                model: modelSelection
            })
        });
    
        if (result.success) {
            setChats(prev => [...prev, result.data]);
            setCurrentChatId(result.data.id);
            setMessages([]);
        } else {
            setError('Failed to create chat');
        }
    };
    

    useEffect(() => {
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        const reconnectDelay = 3000;

        const connectWebSocket = () => {
            wsRef.current = new WebSocket(CONFIG.WS_URL);

            wsRef.current.onopen = () => {
                console.log('WebSocket Connected');
                setIsConnected(true);
                setError(null);
                reconnectAttempts = 0;
            };

            wsRef.current.onclose = () => {
                console.log('WebSocket Disconnected');
                setIsConnected(false);
                
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    setTimeout(connectWebSocket, reconnectDelay);
                } else {
                    setError('Connection lost. Please refresh the page.');
                }
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'response') {
                        const aiMessage = {
                            message: data.content,
                            direction: 'incoming',
                            sender: 'ai',
                            chatId: data.chatId
                        };
                        
                        setMessages(prev => [...prev, aiMessage]);
                        saveMessageToDatabase(data.chatId, 'ai', data.content);
                        setIsTyping(false);
                        setAiStatus('idle');
                    }
                } catch (err) {
                    console.error('Error processing message:', err);
                    setError('Error processing response');
                    setIsTyping(false);
                    setAiStatus('idle');
                }
            };
        };

        connectWebSocket();
        loadChats();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const saveMessageToDatabase = async (chatId, sender, content) => {
        await fetchWithErrorHandling(`${CONFIG.API_BASE_URL}/chat/message`, {
            method: 'POST',
            body: JSON.stringify({
                chat_id: chatId,
                sender,
                content
            })
        });
    };

    const handleSend = async (message, isAttachment = false, attachment = null) => {
        if (!isConnected || !currentChatId) {
            setError("Not connected or no chat selected");
            return;
        }
    
        try {
            const newMessage = {
                message,
                direction: 'outgoing',
                sender: "user",
                chatId: currentChatId
            };
    
            setMessages(prev => [...prev, newMessage]);
            await saveMessageToDatabase(currentChatId, 'user', message);
            
            setUserInput("");
            setIsTyping(true);
            setAiStatus('thinking');
    
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                try {
                    wsRef.current.send(isAttachment ? JSON.stringify(attachment) : message);
                } catch (error) {
                    console.error("WebSocket error:", error);
                    setIsTyping(false);
                    setAiStatus('idle');
                }
                wsRef.current.send(JSON.stringify({
                    type: 'message',
                    content: message,
                    chatId: currentChatId
                }));
            } else {
                throw new Error('WebSocket not connected');
            }
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Failed to send message');
            setIsTyping(false);
            setAiStatus('idle');
        }
    };

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

    const toggleMenu = () => setIsMenuOpen(prev => !prev);
    const toggleAttach = () => setAttachFile(prev => !prev);

    const handleInputChange = (innerHtml, textContent) => {
        setUserInput(textContent);
        setAiStatus(textContent ? 'listening' : 'idle');
    };

    const getAiImage = () => {
        switch (aiStatus) {
            case 'listening': return listening;
            case 'thinking': return thinking;
            case 'speaking': return speaking;
            default: return idle;
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
                                    return (<video key={i} controls src={src} style={{ maxWidth: '30%', marginLeft: '70%' }} />);
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
