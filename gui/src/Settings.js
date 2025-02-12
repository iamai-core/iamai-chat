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
    const [availableModels, setAvailableModels] = useState([]);
    const [selectedRuntime, setSelectedRuntime] = useState("Select Run Time");
    const {
        headerColor,
        setHeaderColor,
        messageFontSize,
        setMessageFontSize,
        messageSpeed,
        setMessageSpeed,
        currentModel,
        setCurrentModel,
        saveSettings
    } = useContext(AppContext);
    
    const [hsva, setHsva] = useState({ h: 214, s: 43, v: 90, a: 1 });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [gradientColors, setGradientColors] = useState([]);
    const [isGradient, setIsGradient] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchModels();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await axios.get('http://localhost:8080/settings/load');
            const settings = response.data;
            
            if (settings.headerColor?.includes('linear-gradient')) {
                setIsGradient(true);
                const colorMatch = settings.headerColor.match(/linear-gradient\(([^)]+)\)/);
                if (colorMatch) {
                    const gradientParts = colorMatch[1].split(',').map(part => part.trim());
                    setGradientColors(gradientParts.slice(1));
                    setHeaderColor(settings.headerColor);
                }
            } else {
                setIsGradient(false);
                setHeaderColor(settings.headerColor || '#164194');
            }
            
            setMessageFontSize(settings.fontSize || 16);
            setMessageSpeed(settings.textSpeed || 1000);
            setSelectedRuntime ("Select Run Time");
            if (settings.model) {
                setCurrentModel(settings.model);
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
            setSaveError('Failed to load settings');
        }
    };
    

    const handleSaveSettings = async () => {
        try {
            setSavingSettings(true);
            setSaveError(null);
            await saveSettings();
        } catch (err) {
            setSaveError('Failed to save settings: ' + err.message);
        } finally {
            setSavingSettings(false);
        }
    };

    useEffect(() => {
        const saveTimeout = setTimeout(() => {
            handleSaveSettings();
        }, 500);

        return () => clearTimeout(saveTimeout);
    }, [headerColor, messageFontSize, messageSpeed, currentModel, isGradient]);

    const fetchModels = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get('http://localhost:8080/api/models');
            if (response.data?.models?.length) {
                setAvailableModels(response.data.models);
                if (!currentModel && response.data.models.length > 0) {
                    handleModelSelect(response.data.models[0]);
                }
            }
        } catch (err) {
            setError('Failed to load models: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModelSelect = async (modelName) => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await axios.post('http://localhost:8080/api/models/switch', {
                model: modelName
            });

            if (response.data.error) {
                throw new Error(response.data.error);
            }

            setCurrentModel(modelName);
            handleSaveSettings();
        } catch (err) {
            setError('Failed to switch model: ' + err.message);
            await fetchModels();
        } finally {
            setIsLoading(false);
        }
    };

    function generateGradient(h, s, v) {
        const lightnessValues = [90, 70, 50, 30, 10];
        const colors = lightnessValues.map(l => `hsl(${h}, ${s}%, ${l}%)`);
        setGradientColors(colors);
        return `linear-gradient(to left, ${colors.join(', ')})`;
    }

    const handleFontSizeChange = (value) => {
        setMessageFontSize(value);
    };

    const handleSpeedChange = (value) => {
        setMessageSpeed(value);
    };

    const handleRuntimeSelect = (runtime) => {
        setSelectedRuntime(runtime);
        setMessageSpeed(runtime === "Instant" ? 0 : 1000);
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
                        title={isLoading ? "Loading..." : (currentModel || "Select a Model")}
                        variant="success"
                        disabled={isLoading}
                    >
                        {availableModels.map((model) => (
                            <Dropdown.Item
                                key={model}
                                onClick={() => handleModelSelect(model)}
                                active={model === currentModel}
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
                    <Dropdown.Item onClick={() => handleRuntimeSelect("Realtime")}>
                        Realtime
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleRuntimeSelect("Instant")}>
                        Instant
                    </Dropdown.Item>
                </DropdownButton>
            </div>

            {/* Color Picker */}
            <div className="settings-section">
                <label htmlFor="header-color">Header Color:</label>
                <div className="color-mode-toggle">
                    <button 
                        className={`mode-button ${!isGradient ? 'active' : ''}`}
                        onClick={() => setIsGradient(false)}
                    >
                        Solid
                    </button>
                    <button 
                        className={`mode-button ${isGradient ? 'active' : ''}`}
                        onClick={() => setIsGradient(true)}
                    >
                        Gradient
                    </button>
                </div>
                <div className="color-wheel-container">
                    <Wheel
                        className={isGradient ? "color-wheel-gradient" : "color-wheel"}
                        color={hsva}
                        onChange={(color) => {
                            setHsva({ ...hsva, ...color.hsva });
                            if (isGradient) {
                                const newGradient = generateGradient(color.hsva.h, color.hsva.s, color.hsva.v);
                                setHeaderColor(newGradient);
                            } else {
                                setHeaderColor(hsvaToHex(color.hsva));
                            }
                        }}
                    />
                </div>
                <div
                    className="color-preview"
                    style={{
                        width: '100%',
                        height: 34,
                        marginTop: 20,
                        background: headerColor
                    }}
                />
            </div>

            {/* Font Size Slider */}
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

            {/* Message Speed Slider */}
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
                    max={2000}
                    value={messageSpeed}
                    onChange={handleSpeedChange}
                />
                <p>Current Speed: {messageSpeed}ms</p>
            </div>
        </div>
    );
}

export default Settings;