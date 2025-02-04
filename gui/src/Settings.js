import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import 'bootstrap/dist/css/bootstrap.min.css';
import ReactSlider from "react-slider";
import Wheel from '@uiw/react-color-wheel';
import { AppContext } from "./App";
import { hsvaToHex } from '@uiw/color-convert';
import axios from 'axios';

function Settings() {
    const [selectedModel, setSelectedModel] = useState("");
    const [availableModels, setAvailableModels] = useState([]);
    const [currentModel, setCurrentModel] = useState("");
    const [switching, setSwitching] = useState(false);
    const [selectedRuntime, setSelectedRuntime] = useState("Select Run Time");
    const { 
        headerColor, 
        setHeaderColor, 
        messageFontSize, 
        setMessageFontSize, 
        messageSpeed, 
        setMessageSpeed 
    } = useContext(AppContext);
    const [hsva, setHsva] = useState({ h: 214, s: 43, v: 90, a: 1 });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await axios.get('http://localhost:8080/settings/load');
                const settings = response.data;
                setHeaderColor(settings.header_color);
                setMessageFontSize(settings.font_size);
                setMessageSpeed(parseInt(settings.text_speed));
                setSelectedRuntime(settings.text_speed || "Select Run Time");
            } catch (err) {
                console.error('Failed to load settings:', err);
            }
        };

        loadSettings();
    }, [setHeaderColor, setMessageFontSize, setMessageSpeed]);
    useEffect(() => {
        const saveSettingsToBackend = async () => {
            try {
                setSavingSettings(true);
                setSaveError(null);
                const finalColor = headerColor.includes(',') 
                    ? headerColor.split(', ').pop() 
                    : headerColor;
                const settingsPayload = {
                    headerColor: finalColor,
                    gradientColor: headerColor,
                    textSpeed: messageSpeed.toString(),
                    fontSize: messageFontSize
                };
                await axios.post('http://localhost:8080/settings/save', settingsPayload);
            } catch (error) {
                console.error('Error saving settings:', error);
                setSaveError('Failed to save settings');
            } finally {
                setSavingSettings(false);
            }
        };
        const timeoutId = setTimeout(saveSettingsToBackend, 500);
        return () => clearTimeout(timeoutId);
    }, [headerColor, messageFontSize, messageSpeed]);

    const fetchModels = async () => {
        try {
            const response = await fetch('/api/models', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }

            const data = await response.json();

            if (data && Array.isArray(data.models)) {
                setAvailableModels(data.models);
                if (selectedModel === "Select a Model") {
                    setSelectedModel(data.models[0]);
                }
            } else {
                throw new Error('Invalid data format received from server');
            }
        } catch (err) {
            setError('Failed to load models: ' + err.message);
            console.error('Failed to load models:', err);
        }
    };

    const handleModelSelect = async (modelName) => {
        setSwitching(true);
        setError(null);

        try {
            const response = await fetch('/api/models/switch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({ model: modelName })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error("Failed to switch model");
            }
    
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            setSelectedModel(modelName);
            setCurrentModel(modelName);
        } catch (err) {
            setError('Failed to switch model: ' + err.message);
            console.error('Failed to switch model:', err);
        } finally {
            setSwitching(false);
        }
    };

    function generateGradient(h, s, v) {
        const lightnessValues = [90, 70, 50, 30, 10];
        const gradientColors = lightnessValues.map(l => `hsl(${h}, ${s}%, ${l}%)`);
        return `linear-gradient(to left, ${gradientColors.join(', ')})`;
    }

    const handleHeaderColorChange = (color) => {
        const newGradient = generateGradient(color.hsva.h, color.hsva.s, color.hsva.v);
        const hexColor = hsvaToHex(color.hsva);
        setHsva({ ...hsva, ...color.hsva });
        setHeaderColor(`${newGradient}, ${hexColor}`);
    };

    const handleFontSizeChange = (value) => {
        setMessageFontSize(value);
    };

    const handleSpeedChange = (value) => {
        setMessageSpeed(value);
    };

    return (
        <div>
            <div className="settings-header">
                <button 
                    onClick={() => navigate('/')} 
                    className="back-button"
                    disabled={savingSettings}
                >
                    Back to Main Page
                </button>
                <h2 className="settings-title">Settings</h2>
                {savingSettings && <span className="saving-indicator">Saving...</span>}
                {saveError && <span className="save-error">{saveError}</span>}
            </div>
            
            {/* Model Selection */}
            <div className="settings-section">
                <label htmlFor="model-dropdown">Model:</label>
                <div>
                    <DropdownButton
                        id="model-dropdown"
                        title={isLoading ? "Loading..." : selectedModel}
                        variant="success"
                        disabled={isLoading}
                    >
                        {availableModels.map((model) => (
                            <Dropdown.Item 
                                key={model} 
                                onClick={() => handleModelSelect(model)}
                                active={model === selectedModel}
                            >
                                {model}
                            </Dropdown.Item>
                        ))}
                    </DropdownButton>
                    {isLoading && <div className="text-info mt-2">Loading...</div>}
                    {error && (
                        <div className="text-danger mt-2">
                            {error}
                            <button 
                                className="btn btn-link p-0 ml-2"
                                onClick={fetchModels}
                            >
                                Retry
                            </button>
                        </div>
                    )}
            </div>
        </div>

            {/* Runtime Selection */}
            <div className="settings-section">
                <label htmlFor="run-time-dropdown">Message Run Time:</label>
                <DropdownButton 
                    id="run-time-dropdown" 
                    title={selectedRuntime} 
                    variant="success"
                >
                    <Dropdown.Item onClick={() => setSelectedRuntime("Realtime")}>
                        Realtime
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => setSelectedRuntime("Instant")}>
                        Instant
                    </Dropdown.Item>
                </DropdownButton>
            </div>

            {/* Header Color */}
            <div className="settings-section">
                <label htmlFor="header-color">Header Color:</label>
                <div className="color-wheel-container">
                    <Wheel
                        className="color-wheel-gradient"
                        color={hsva}
                        onChange={(color) => {
                            setHsva({ ...hsva, ...color.hsva });
                            const newGradient = generateGradient(color.hsva.h, color.hsva.s, color.hsva.v);
                            const hexColor = hsvaToHex(color.hsva);
                            setHeaderColor(`${newGradient}, ${hexColor}`);
                        }}
                        title="Gradient Color Picker"
                    />
                    <Wheel
                        className="color-wheel"
                        color={hsva}
                        onChange={(color) => {
                            setHsva({ ...hsva, ...color.hsva });
                            setHeaderColor(hsvaToHex(color.hsva));
                        }}
                        title="Solid Color Picker"
                    />
                </div>
                <div
                    style={{
                        width: '100%',
                        height: 34,
                        marginTop: 20,
                        background: headerColor
                    }}
                />
            </div>

            {/* Font Size */}
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
                    onChange={handleFontSizeChange}
                />
                <p>Current Size: {messageFontSize}px</p>
            </div>

            {/* Message Speed */}
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
                    onChange={handleSpeedChange}
                />
                <p>Current Speed: {messageSpeed}ms</p>
            </div>
        </div>
    );
}

export default Settings;