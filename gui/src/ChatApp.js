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
import mic_Icon from "./assets/video_inpt.PNG";

const CONFIG = {
    API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
    WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws'
};

var renderType = "text";


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
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        loadChats();
    }, []);

    useEffect(() => {
        if (currentChatId) {
            loadMessages(currentChatId);
        }
    }, [currentChatId]);

    useEffect(() => {
        setupWebSocket();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [currentChatId]);

    const setupWebSocket = () => {
        wsRef.current = new WebSocket(CONFIG.WS_URL);

        wsRef.current.onopen = () => {
            setIsConnected(true);
            console.log("WebSocket connected");
        };

        wsRef.current.onmessage = (event) => {
            try {
                const response = JSON.parse(event.data);
                if (response.type === "response" && response.chatId === currentChatId) {
                    setIsTyping(false);
                    const newMessage = {
                        message: response.content,
                        direction: 'incoming',
                        sender: "AI",
                        attachment: {
                            type: "text",
                            src: null
                        }
                    };
                    setMessages(prev => [...prev, newMessage]);
                    saveMessageToDatabase(currentChatId, 'AI', response.content);
                    setAiStatus('speaking');
                    setTimeout(() => setAiStatus('idle'), 1000);
                }
            } catch (error) {
                console.error("Error processing WebSocket message:", error);
            }
        };

        wsRef.current.onclose = () => {
            setIsConnected(false);
            console.log("WebSocket disconnected");
        };
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.onload = () => {
                    handleSend('Audio message', true, reader.result);
                };
                reader.readAsDataURL(audioBlob);
                audioChunksRef.current = [];
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setAiStatus('listening');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Unable to access microphone. Please check your permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setAiStatus('idle');
        }
    };


    const loadChats = async () => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/chats`);
            const data = await response.json();
            

            if (response.ok) {
                setChats(data);
                if (data.length > 0 && !currentChatId) {
                    setCurrentChatId(data[0].id);
                }
            } else {
                setError('Failed to load chats');
                console.error('Failed to load chats:', data.error);
            }
        } catch (error) {
            setError('Failed to load chats');
            console.error('Error loading chats:', error);
        }
    };

    const addNewChat = async () => {
        const chatName = prompt("Enter a name for your new chat:");
    

        if (!chatName) {
            alert("Chat creation canceled. Chat name required.");
            return;
        }
    

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: chatName,
                })
            });
    
            const data = await response.json();
            
            if (response.ok) {
                setChats(prev => [...prev, data]);
                setCurrentChatId(data.id);
                setMessages([]);
            } else {
                setError('Failed to create chat');
                console.error('Failed to create chat:', data.error);
            }
        } catch (error) {
            setError('Failed to create chat');
            console.error('Error creating chat:', error);
        }
    };
    const saveMessageToDatabase = async (chatId, sender, content) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    sender,
                    content,
                    is_attachment: false  // Add this line to match backend
                })
            });
    
            if (!response.ok) {
                console.error('Failed to save message:', await response.json());
            }
        } catch (error) {
            console.error('Error saving message:', error);
        }
    };
    
    const handleSend = async (message, isAttachment = false, Src = null) => {
        if (!isConnected || !currentChatId) {
            setError("Not connected or no chat selected");
            return;
        }
    
        try {
            const newMessage = {
                message,
                direction: 'outgoing',
                sender: "user",
                attachment: {
                    type: "text",
                    src: Src
                }
            };
            if (isAttachment == true) {
                newMessage.attachment.type = renderType;
                newMessage.message = message['name'];
            }
    
            setMessages(prev => [...prev, newMessage]);
            await saveMessageToDatabase(currentChatId, 'user', message);
    
            setUserInput("");
            setIsTyping(true);
            setAiStatus('thinking');
    
            if (wsRef.current?.readyState === WebSocket.OPEN) {
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

    const loadMessages = async (chatId) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/chat/messages?chat_id=${chatId}`);
            const data = await response.json();

            if (response.ok) {
                const formattedMessages = data.map(msg => ({
                    message: msg.content,
                    direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
                    sender: msg.sender,
                    attachment: {
                        type: msg.is_attachment ? renderType : "text",
                        src: null
                    }
                }));
                setMessages(formattedMessages);
            } else {
                console.error('Failed to load messages:', data.error);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    function setRenderType(file) {
        renderType = file['type'];
        renderType = renderType.split('/')[0].toLowerCase()
        console.log(renderType);
    };

    const handleChatSwitch = (chatId) => {
        setCurrentChatId(chatId);
        setMessages([]);
        setUserInput("");
        setIsTyping(false);
        setAiStatus('idle');
    };

    const HandleFileChange = (event) => {
        const file = event.target.files[0];
        setRenderType(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                handleSend(file.name, true,  reader.result);
            };
            reader.readAsDataURL(file);
            toggleAttach();
        }
        toggleAttach();
    };
    const toggleAttach = () => setAttachFile(prev => !prev);

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
                    <button className="menu-btn" onClick={() => setIsMenuOpen(prev => !prev)} type="button">
                        <img className="menu" src={menu_Img} alt="menu" />
                    </button>
                    <img className="iamai" src={getAiImage()} alt="Iamai" />
                    <img className="logo" src={logo} alt="Logo" />
                </div>
            </header>
            <MainContainer className="chat-main" style={{ fontSize: `${messageFontSize}px` }}>
                <ChatContainer className="chat-container" style={{ fontSize: `${messageFontSize}px` }}>
                    <MessageList
                        scrollBehavior="smooth"
                        typingIndicator={isTyping ?
                            <TypingIndicator
                                content="Aimi is typing..."
                                style={{ fontSize: `${messageFontSize}px` }}
                            /> : null
                        }
                        style={{ fontSize: `${messageFontSize}px` }}
                    >
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
                            return (
                                <Message
                                    key={i}
                                    model={{
                                        ...message,
                                        style: {
                                            fontSize: `${messageFontSize}px`,
                                            '--message-content-font-size': `${messageFontSize}px`,
                                            '--message-metadata-font-size': `${messageFontSize - 2}px`
                                        }
                                    }}
                                />
                            );
                        })}
                    </MessageList>
                                    <MessageInput
                    className="chat-input"
                    placeholder="What's on your mind?"
                    value={userInput}
                    onChange={(html, text) => {
                        setUserInput(text);
                        setAiStatus(text ? 'listening' : 'idle');
                    }}
                    onSend={handleSend}
                    disabled={isTyping || !isConnected}
                    style={{ fontSize: `${messageFontSize}px`, flex: 1 }}
                    onAttachClick={() => setAttachFile(prev => !prev)}
                />
                <button
                    className={`mic-button ${isRecording ? 'recording' : ''}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    style={{
                        marginLeft: '10px',
                        padding: '8px',
                        borderRadius: '50%',
                        border: 'none',
                        background: isRecording ? '#ff4444' : '#f0f0f0',
                        cursor: 'pointer'
                    }}
                >
                    <img 
                        src={mic_Icon} 
                        alt="Microphone" 
                        style={{ 
                            width: '20px', 
                            height: '20px',
                            filter: isRecording ? 'invert(1)' : 'none'
                        }} 
                    />
                </button>
                </ChatContainer>
            </MainContainer>

            {isMenuOpen && (
                <div className="sidebar-overlay">
                    <div className="sidebar">
                        <nav>
                            <button className="close-menu" onClick={() => setIsMenuOpen(false)} type="button">
                                <img src={menu_Img} alt="close" />
                            </button>
                            <button className="add-button" onClick={addNewChat}>
                                <img src={add_Img} alt="Add" />
                            </button>
                        </nav>
                        <hr className="divider" />
                        <div className="chat-list">
                            {chats.map(chat => (
                                <div
                                    key={chat.id}
                                    className={`chat-item ${chat.id === currentChatId ? 'active' : ''}`}
                                    onClick={() => handleChatSwitch(chat.id)}
                                >
                                    <span className="chat-name">{chat.name}</span>
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
