import React, { useState, useContext, useEffect, useRef, Suspense } from "react";
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
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import menu_Img from "./assets/menu_btn.PNG";
import logo from "./assets/iamai_logo.png";
import listening from "./assets/iamailistening.jpg";
import speaking from "./assets/iamaispeaking.jpg";
import thinking from "./assets/iamaithinking.jpg";
import add_Img from "./assets/add_btn.PNG";
import gear_Icon from "./assets/gear_icon.PNG";
import close_Img from "./assets/close_btn.PNG";
import file_Icon from "./assets/file_inpt.PNG";
import img_Icon from "./assets/img_inpt.PNG";
import vid_Icon from "./assets/video_inpt.PNG";
import mic_Icon from "./assets/mic-filled.PNG";
import mic2_Icon from "./assets/mic.PNG";

const loader = new GLTFLoader();

function AiModelViewer({ aiStatus }) {
    const [modelLoaded, setModelLoaded] = useState(false);
    const [modelError, setModelError] = useState(null);

    useEffect(() => {
        const modelPath = `${window.location.origin}/models/face.glb`;
        console.log("Attempting to load model from:", modelPath);

        const loader = new GLTFLoader();
        loader.load(
            modelPath,
            () => {
                console.log("Model loaded successfully!");
                setModelLoaded(true);
            },
            (progress) => {
                console.log(`Loading progress: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
            },
            (error) => {
                console.error('Error loading model:', error);
                setModelError(error.message || "Failed to load model");
            }
        );
    }, []);

    switch (aiStatus) {
        case 'listening':
            return <img className="iamai" src={listening} alt="Iamai listening" />;
        case 'thinking':
            return <img className="iamai" src={thinking} alt="Iamai thinking" />;
        case 'speaking':
            return <img className="iamai" src={speaking} alt="Iamai speaking" />;
        default:
            return (
                <div className="iamai-model">
                    {modelError && (
                        <div className="model-error">
                            Error loading model: {modelError}
                        </div>
                    )}
                    <Canvas>
                        <ambientLight intensity={0.5} />
                        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                        <Suspense fallback={
                            <Html>
                                <div style={{ color: 'white', background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
                                    Loading model...
                                </div>
                            </Html>
                        }>
                            <Model modelPath="/models/face.glb" />
                        </Suspense>
                        <OrbitControls />
                    </Canvas>
                </div>
            );
    }
}

function Model({ modelPath }) {
    const [modelError, setModelError] = useState(false);
    const gltf = useGLTF(modelPath, undefined,
        (error) => {
            console.error('Error loading model:', error);
            setModelError(true);
        });

    if (modelError) {
        return (
            <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="red" />
                <Html position={[0, 1.5, 0]}>
                    <div style={{ color: 'white', background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
                        Error loading model
                    </div>
                </Html>
            </mesh>
        );
    }

    return <primitive object={gltf.scene} scale={1} position={[0, -1, 0]} />;
}

function ModelDiagnostics() {
    const [diagnostics, setDiagnostics] = useState({
        modelPath: '/models/face.glb',
        fileExists: null,
        loadable: null,
        error: null,
        directFetch: null,
        contentType: null,
        fileSize: null,
        alternativePaths: [
            '/models/face.glb',
            'models/face.glb',
            './models/face.glb'
        ]
    });

    useEffect(() => {
        const testPaths = async () => {
            await checkPath(diagnostics.modelPath);

            if (diagnostics.fileExists === false) {
                for (const path of diagnostics.alternativePaths) {
                    if (path !== diagnostics.modelPath) {
                        const result = await checkPath(path, false);
                        if (result.fileExists) {
                            setDiagnostics(prev => ({
                                ...prev,
                                modelPath: path,
                                fileExists: result.fileExists,
                                contentType: result.contentType,
                                fileSize: result.fileSize,
                                error: null
                            }));
                            break;
                        }
                    }
                }
            }
        };

        testPaths();
    }, []);

    const checkPath = async (path, updateState = true) => {
        const result = {
            path,
            fileExists: false,
            contentType: null,
            fileSize: null,
            error: null
        };

        try {
            const response = await fetch(path);
            result.fileExists = response.ok;
            result.contentType = response.headers.get('content-type');

            if (response.ok) {
                const blob = await response.blob();
                result.fileSize = blob.size;
            } else {
                result.error = `HTTP ${response.status}: ${response.statusText}`;
            }
        } catch (error) {
            result.error = `Fetch error: ${error.message}`;
        }

        if (updateState) {
            setDiagnostics(prev => ({
                ...prev,
                fileExists: result.fileExists,
                contentType: result.contentType,
                fileSize: result.fileSize,
                error: result.error
            }));
        }

        return result;
    };

    useEffect(() => {
        if (diagnostics.fileExists) {
            const loader = new GLTFLoader();
            loader.load(
                diagnostics.modelPath,
                (gltf) => setDiagnostics(prev => ({ ...prev, loadable: true })),
                undefined,
                (error) => setDiagnostics(prev => ({
                    ...prev,
                    loadable: false,
                    error: `Loading error: ${error.message}`
                }))
            );
        }
    }, [diagnostics.fileExists, diagnostics.modelPath]);

    useEffect(() => {
        if (diagnostics.fileExists) {
            fetch(diagnostics.modelPath)
                .then(response => response.arrayBuffer())
                .then(buffer => {
                    setDiagnostics(prev => ({
                        ...prev,
                        directFetch: true,
                        fileSize: buffer.byteLength
                    }));
                })
                .catch(error => {
                    setDiagnostics(prev => ({
                        ...prev,
                        directFetch: false,
                        error: `Direct fetch error: ${error.message}`
                    }));
                });
        }
    }, [diagnostics.fileExists, diagnostics.modelPath]);

    const testCustomPath = () => {
        const path = prompt('Enter model path:', diagnostics.modelPath);
        if (path) {
            setDiagnostics(prev => ({
                ...prev,
                modelPath: path,
                fileExists: null,
                loadable: null,
                directFetch: null,
                error: null,
                contentType: null,
                fileSize: null
            }));
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '15px',
            fontSize: '14px',
            zIndex: 9999,
            maxWidth: '400px',
            borderRadius: '8px',
            maxHeight: '80vh',
            overflow: 'auto'
        }}>
            <h4>3D Model Diagnostics</h4>
            <p><strong>Current Path:</strong> {diagnostics.modelPath}</p>
            <p>
                <strong>File accessible:</strong> {diagnostics.fileExists === null ? 'Checking...' :
                    diagnostics.fileExists ? '✅ Yes' : '❌ No'}
            </p>
            <p>
                <strong>Content Type:</strong> {diagnostics.contentType || 'Unknown'}
            </p>
            <p>
                <strong>File Size:</strong> {diagnostics.fileSize ?
                    `${(diagnostics.fileSize / 1024).toFixed(2)} KB` : 'Unknown'}
            </p>
            <p>
                <strong>Direct Fetch:</strong> {diagnostics.directFetch === null ? 'Not tested' :
                    diagnostics.directFetch ? '✅ Success' : '❌ Failed'}
            </p>
            <p>
                <strong>Loadable by Three.js:</strong> {diagnostics.loadable === null ? 'Not tested' :
                    diagnostics.loadable ? '✅ Yes' : '❌ No'}
            </p>
            {diagnostics.error && (
                <div style={{ color: 'red', marginTop: '10px', whiteSpace: 'pre-wrap' }}>
                    <strong>Error:</strong><br />{diagnostics.error}
                </div>
            )}

            <h5 style={{ marginTop: '15px' }}>Alternative Paths Tested:</h5>
            <ul style={{ paddingLeft: '20px' }}>
                {diagnostics.alternativePaths.map((path, index) => (
                    <li key={index}>{path}</li>
                ))}
            </ul>

            <div style={{ marginTop: '15px' }}>
                <button onClick={testCustomPath} style={{
                    padding: '5px 10px',
                    background: '#4a90e2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}>
                    Test different path
                </button>
            </div>
        </div>
    );
}
// Add this component temporarily to your main component's render method
// {process.env.NODE_ENV !== 'production' && <ModelDiagnostics />}

const CONFIG = {
    API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
    WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws'
};

const ffmpeg = new FFmpeg();

async function convertWebMToWAV(webmBlob) {
    if (!ffmpeg.loaded) {
        await ffmpeg.load();
    }
    const webmFileName = 'input.webm';
    const wavFileName = 'output.wav';
    const webmData = await fetchFile(webmBlob);

    await ffmpeg.writeFile(webmFileName, webmData);
    await ffmpeg.exec([
        '-i', webmFileName,
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        wavFileName
    ]);

    const data = await ffmpeg.readFile(wavFileName);

    return new Blob([data.buffer], { type: 'audio/wav' });
}

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
    const audioChunks = useRef([]);

    const [wsReady, setWsReady] = useState(false);
    const wsResponseTimeout = useRef(null);

    const [loading, setLoading] = useState(true);

    const [showCreateChatModal, setShowCreateChatModal] = useState(false);
    const [newChatName, setNewChatName] = useState("");
    const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);

    useEffect(() => {
        const loadFFmpeg = async () => {
            await ffmpeg.load();
            setLoading(false);
        };

        loadFFmpeg();
    }, []);

    useEffect(() => {
        loadChats();
    }, []);

    useEffect(() => {
        if (chats.length === 0 && initialLoadCompleted) {
            setShowCreateChatModal(true);
        }
    }, [chats, initialLoadCompleted]);

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
        wsRef.current.onclose = () => {
            setIsConnected(false);
            setWsReady(false);
            console.log("WebSocket disconnected");

            setTimeout(() => {
                console.log("Attempting to reconnect WebSocket...");
                setupWebSocket();
            }, 2000);
        };
        wsRef.current.onmessage = (event) => {
            handleWebSocketMessage(event);
        };

        wsRef.current.onerror = (error) => {
            console.error("WebSocket error:", error);
            setError("WebSocket connection error");
        };
    };

    const handleWebSocketMessage = async (event) => {
        try {
            if (typeof event.data === 'string') {
                const response = JSON.parse(event.data);
                if (response.type === "response" && response.chatId === currentChatId) {
                    setIsTyping(false);
                    const newMessage = {
                        message: response.content,
                        direction: 'incoming',
                        sender: "AI"
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

    const loadMessages = async (chatId) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/chat/messages?chat_id=${chatId}`);
            const data = await response.json();

            if (response.ok) {
                const formattedMessages = data.map(msg => ({
                    message: msg.content,
                    direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
                    sender: msg.sender
                }));
                setMessages(formattedMessages);
            } else {
                console.error('Failed to load messages:', data.error);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const sendAudioToServer = async (wavBlob) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            setError("WebSocket is not connected");
            setAiStatus('idle');
            return;
        }

        try {
            console.log("Sending audio blob to server for transcription...");
            wsRef.current.send(wavBlob);
        } catch (error) {
            console.error("Error sending audio:", error);
            setError("Failed to send audio for transcription");
            setAiStatus('idle');
        }
    };

    const addNewChat = async () => {
        setIsMenuOpen(false);
        if (showCreateChatModal) {
            if (!newChatName) {
                setError("Chat name is required");
                return;
            }

            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: newChatName })
                });
                const data = await response.json();
                if (response.ok) {
                    setChats(prev => [...prev, data]);
                    setCurrentChatId(data.id);
                    setMessages([]);
                    setShowCreateChatModal(false);
                    setNewChatName("");
                } else {
                    setError('Failed to create chat');
                    console.error('Failed to create chat:', data.error);
                }
            } catch (error) {
                setError('Failed to create chat');
                console.error('Error creating chat:', error);
            }
        } else {
            setShowCreateChatModal(true);
        }
    };

    const handleCloseModal = () => {
        if (chats.length > 0) {
            setShowCreateChatModal(false);
            setNewChatName("");
        }
    };

    const handleCreateChatSubmit = (e) => {
        e.preventDefault();
        addNewChat();
    };

    const saveMessageToDatabase = async (chatId, sender, content, is_attachment, file_type) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    sender,
                    content
                })
            });

            if (!response.ok) {
                console.error('Failed to save message:', await response.json());
            }
        } catch (error) {
            console.error('Error saving message:', error);
        }
    };
    const handleSend = async (message) => {
        if (!isConnected || !currentChatId) {
            setError("Not connected or no chat selected");
            return;
        }

        try {
            const newMessage = {
                message,
                direction: 'outgoing',
                sender: "user"
            };

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

    const handleChatSwitch = (chatId) => {
        setCurrentChatId(chatId);
        setMessages([]);
        setUserInput("");
        setIsTyping(false);
        setAiStatus('idle');
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

    return (
        <div className="chat-app">
            <header className="header" style={{ background: headerColor }}>
                <div className="menu-container">
                    <button className="menu-btn" onClick={() => setIsMenuOpen(prev => !prev)} type="button">
                        <img className="menu" src={menu_Img} alt="menu" />
                    </button>
                    {process.env.NODE_ENV !== 'production' && <ModelDiagnostics />}
                    <AiModelViewer aiStatus={aiStatus} />
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
                        {messages.map((message, i) => (
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
                        ))}
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
                        style={{ fontSize: `${messageFontSize}px` }}
                        onAttachClick={() => setAttachFile(prev => !prev)}
                    />
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

            {/* Create Chat Modal */}
            <Modal show={showCreateChatModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Create New Chat</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleCreateChatSubmit}>
                        <Form.Group>
                            <Form.Label>Chat Name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter chat name"
                                value={newChatName}
                                onChange={(e) => setNewChatName(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    {chats.length > 0 && (
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                    )}
                    <Button variant="primary" onClick={addNewChat}>
                        Create
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
export default ChatApp;
