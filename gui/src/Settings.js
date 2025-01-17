import React, { useState, Fragment, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import 'bootstrap/dist/css/bootstrap.min.css';
import ReactSlider from "react-slider";
import Wheel from '@uiw/react-color-wheel';
import { hsvaToHex } from '@uiw/color-convert';
import { AppContext } from "./App";

function Settings() {
    const [selectedModel, setSelectedModel] = useState("Select a Model");
    const [selectedRuntime, setSelectedRuntime] = useState("Select Run Time");
    const { headerColor, setHeaderColor, messageFontSize, setMessageFontSize, messageSpeed, setMessageSpeed } = useContext(AppContext);
    const [hsva, setHsva] = useState({ h: 214, s: 43, v: 90, a: 1 });

    const navigate = useNavigate();

    return (
        <div>
            <div className="settings-header">
                <button 
                    onClick={() => navigate('/')}
                    className="back-button"
                >
                    Back to Main Page
                </button>
                <h2 className="settings-title">Settings</h2>
            </div>
            <div className="settings-section">
                <label htmlFor="model-dropdown">Model:</label>
                <DropdownButton
                    id="model-dropdown"
                    title={selectedModel}
                    variant="success"
                >
                    <Dropdown.Item onClick={() => setSelectedModel("Model 1")}>Model 1</Dropdown.Item>
                    <Dropdown.Item onClick={() => setSelectedModel("Model 2")}>Model 2</Dropdown.Item>
                    <Dropdown.Item onClick={() => setSelectedModel("Model 3")}>Model 3</Dropdown.Item>
                </DropdownButton>
            </div>
            <div className="settings-section">
                <label htmlFor="run-time-dropdown">Message Run Time:</label>
                <DropdownButton
                    id="run-time-dropdown"
                    title={selectedRuntime}
                    variant="success"
                >
                    <Dropdown.Item onClick={() => setSelectedRuntime("Realtime")}>Realtime</Dropdown.Item>
                    <Dropdown.Item onClick={() => setSelectedRuntime("Instant")}>Instant</Dropdown.Item>
                </DropdownButton>
            </div>
            <div className="settings-section">
                <label htmlFor="header-color">Header Color:</label>
                <Wheel
                    color={hsva}
                    onChange={(color) => {
                        setHsva({ ...hsva, ...color.hsva });
                        setHeaderColor(hsvaToHex(color.hsva));
                    }}
                />
                <div style={{ width: '100%', height: 34, marginTop: 20, background: hsvaToHex(hsva) }}></div>
            </div>
            <div className="settings-section">
                <label htmlFor="font-slider">Message Font Size:</label>
                <ReactSlider
                    id="font-slider"
                    className="font-slider"
                    trackClassName="slider-track"
                    thumbClassName="slider-thumb"
                    markClassName="slider-mark"
                    marks={5}
                    min={0}
                    max={100}
                    value={messageFontSize}
                    onChange={(value) => setMessageFontSize(value)}
                />
                <p>Current Value: {messageFontSize}</p>
            </div>
            <div className="settings-section">
                <label htmlFor="speed-slider">Text to Speech Speed:</label>
                <ReactSlider
                    id="speed-slider"
                    className="speed-slider"
                    trackClassName="slider-track"
                    thumbClassName="slider-thumb"
                    markClassName="slider-mark"
                    marks={5}
                    min={0}
                    max={100}
                    value={messageSpeed}
                    onChange={(value) => setMessageSpeed(value)}
                />
                <p>Current Value: {messageSpeed}</p>
            </div>
        </div>
    );
}


export default Settings;

