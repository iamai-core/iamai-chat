// ChatApp.js

import React, { useState, useContext, useEffect } from "react";
import { Link } from 'react-router-dom';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
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
import 'bootstrap/dist/css/bootstrap.min.css';
import ListGroup from 'react-bootstrap/ListGroup';

//import * as im from "./imports" //Use im.[import] - ex: im.useState(false)

var renderType = "text";

function ChatApp() {
    const {
        headerColor,
        messageFontSize,
        messageSpeed,
    } = useContext(AppContext);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [attachFile, setIsAttachOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [aiStatus, setAiStatus] = useState('idle');
    const [userInput, setUserInput] = useState("");
    const [fileSrc, setFileSrc] = useState(null);
    const [chats, setChats] = useState([{ id: 1, name: localStorage.getItem("username") + "'s Chat", messages: [], username: localStorage.getItem("username") || "" }]);
    const [currentChatId, setCurrentChatId] = useState(1);

    useEffect(() => {
        if (!chats[0].username) {
            const name = prompt("Please enter your username for the default chat:");
            if (name) {
                setChats(chats.map(chat => chat.id === 1 ? { ...chat, username: name } : chat));
                localStorage.setItem("username", name);
            }
        }
    }, [chats]);

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);

    const toggleAttach = () => setIsAttachOpen((prev) => !prev);

    function setRenderType(file) {
        renderType = file['type'];
        renderType = renderType.split('/')[0].toLowerCase()
        console.log(renderType);
    };

    function HandleFileChange(event) {
        const file = event.target.files[0];
        setRenderType(file);
        if (file) {
            const reader = new FileReader();// class that allows you to read files
            reader.onload = () => {
                setFileSrc(reader.result); // Set the image source to the data URL
            };
            reader.readAsDataURL(file); // Read the file as a data URL
        }

        handleSend(event, true);
        toggleAttach();
    }

    const handleSend = async (message, isAttachment = false) => {
        const newMessage = {
            message,
            direction: 'outgoing',
            sender: "user"
        };
        // const file = message.target.files[0];

        // if (file && isAttachment === true) {
        //     const reader = new FileReader();// class that allows you to read files
        //     reader.onload = () => {
        //         setFileSrc(reader.result); // Set the image source to the data URL
        //     };
        //     newMessage.message = reader.readAsDataURL(file); // Read the file as a data URL
        // }

        if (isAttachment === true) newMessage.message = message.target.files[0]['name']; // Can use ['name'], ['type'], ['size']
        setChats((prevChats) => prevChats.map(chat =>
            chat.id === currentChatId ?
                { ...chat, messages: [...chat.messages, newMessage] } :
                chat
        ));
        setUserInput("");
        setIsTyping(true);
        setAiStatus('thinking');
        // Simulate AI response
        setTimeout(() => {
            setIsTyping(false);
            const aiResponse = {
                message: "AI's response here",
                direction: 'incoming',
                sender: "AI"
            };
            setChats((prevChats) => prevChats.map(chat =>
                chat.id === currentChatId ?
                    { ...chat, messages: [...chat.messages, aiResponse] } :
                    chat
            ));
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

    const handleInputChange = (innerHtml, textContent) => {
        setUserInput(textContent);
        if (textContent !== "") {
            setAiStatus('listening');
        } else {
            setAiStatus('idle');
        }
    };

    const addNewChat = () => {
        const name = prompt("Please enter a username for the new chat:");
        if (name) {
            localStorage.clear()
            localStorage.setItem("username", name);
            const newChat = {
                id: chats.length + 1,
                name: localStorage.getItem("username") + "'s Chat",
                messages: [],
                username: name
            };
            setChats([...chats, newChat]);
            setCurrentChatId(newChat.id);
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
                        typingIndicator={isTyping ? <TypingIndicator content="Aimi is typing..." /> : null}
                    >
                        {chats.find(chat => chat.id === currentChatId)?.messages.map((message, i) => (
                            <Message key={i} model={{ ...message, style: { fontSize: `${messageFontSize}px` } }} />
                        ))}
                    </MessageList>
                    <MessageInput
                        className="chat-input"
                        placeholder="What’s on your mind?"
                        value={userInput}
                        onChange={handleInputChange}
                        onSend={(message) => handleSend(message)}
                        disabled={isTyping}
                        style={{ fontSize: `${messageFontSize}px` }}
                        onAttachClick={toggleAttach}
                    />
                </ChatContainer>
            </MainContainer>

            {/* Overlay Screen */}

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