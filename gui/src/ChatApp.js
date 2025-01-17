import menu_Img from "./../src/assets/menu_btn.PNG";
import close_Img from "./../src/assets/close_btn.PNG";
import robot_Img from "./../src/assets/Robot.png";
import add_Img from "./../src/assets/add_btn.PNG";
import gear_Icon from "./../src/assets/gear_icon.PNG";
import file_Icon from "./../src/assets/file_inpt.PNG";
import img_Icon from "./../src/assets/img_inpt.PNG";
import vid_Icon from "./../src/assets/video_inpt.PNG";
import React, { useState } from "react";
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
import 'bootstrap/dist/css/bootstrap.min.css';
import ListGroup from 'react-bootstrap/ListGroup';

//import * as im from "./imports" //Use im.[import] - ex: im.useState(false)

var renderType = "text";

function ChatApp() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [attachFile, setIsAttachOpen] = useState(false);

    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);

    const [fileSrc, setFileSrc] = useState(null);

    function setRenderType(file) {
        renderType = file['type'];
        renderType = renderType.split('/')[0].toLowerCase()
        console.log(renderType);
    }

    function toggleMenu() {
        setIsMenuOpen((toggle) => !toggle);
    };

    function toggleAttach() {
        setIsAttachOpen((toggle) => !toggle);
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

        if (isAttachment === true)
            newMessage.message = message.target.files[0]['name']; // Can use ['name'], ['type'], ['size']

        const newMessages = [...messages, newMessage];
        setMessages(newMessages);
        setIsTyping(true);

    };

    const handleAttachmentClick = () => {
        toggleAttach();
    }

    return (
        <div className="chat-app">
            <header className="header">
                <div className="menu-container">
                    <button className="menu-btn" onClick={toggleMenu} type="Submit" >
                        <img className="menu" src={menu_Img} alt="menu" />
                    </button>
                    <img className="Iamai" src={robot_Img} alt="Iamai" />
                    <h1 className="app-name">iamai</h1>
                </div>
            </header>
            <MainContainer className="chat-main">
                <ChatContainer className="chat-container">
                    <MessageList
                        scrollBehavior="smooth"
                        typingIndicator={isTyping ? <TypingIndicator content="Aimi is typing..." /> : null}
                    >

                        {messages.map((message, i) => {
                            return <Message key={i} model={message} content="" >
                                {fileSrc && renderType === "image" &&
                                    <img src={fileSrc} alt="Selected" style={{ marginTop: '20px', maxWidth: '100%' }} />
                                }
                                {fileSrc && renderType === "video" &&
                                    <video src={fileSrc} controls style={{ marginTop: '20px', maxWidth: '100%' }}> Your browser does not support the video tag. </video>
                                }
                            </Message>
                        })}
                    </MessageList>
                    <MessageInput className="chat-input" placeholder="What’s on your mind?" onSend={handleSend} onAttachClick={handleAttachmentClick} />
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