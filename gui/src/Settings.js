import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import 'bootstrap/dist/css/bootstrap.min.css';
import ReactSlider from "react-slider";
import Wheel from '@uiw/react-color-wheel';
import { AppContext } from "./App";
import { hsvaToHex } from '@uiw/color-convert';

function Settings() {
    const [selectedModel, setSelectedModel] = useState("Select a Model");
    const [availableModels, setAvailableModels] = useState([]);
    const [selectedRuntime, setSelectedRuntime] = useState("Select Run Time");
    const { headerColor, setHeaderColor, messageFontSize, setMessageFontSize, messageSpeed, setMessageSpeed } = useContext(AppContext);
    const [hsva, setHsva] = useState({ h: 214, s: 43, v: 90, a: 1 });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            
            const data = await response.json();
            if (data?.models?.length) {
                setAvailableModels(data.models);
                if (selectedModel === "Select a Model") {
                    setSelectedModel(data.models[0]);
                }
            }
        } catch (err) {
            setError('Failed to load models: ' + err.message);
        }
    };
    
    const handleModelSelect = async (modelName) => {
        setIsLoading(true);
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
    
            if (!response.ok) {
                throw new Error(`Failed to switch model: ${response.status}`);
            }
    
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
    
            setSelectedModel(modelName);
        } catch (err) {
            setError('Failed to switch model: ' + err.message);
            await fetchModels();
        } finally {
            setIsLoading(false);
        }
    };

    function generateGradient(h, s, v) {
        const lightnessValues = [90, 70, 50, 30, 10];
        const gradientColors = lightnessValues.map(l => `hsl(${h}, ${s}%, ${l}%)`);
        return `linear-gradient(to left, ${gradientColors.join(', ')})`;
    }

    return (
        <div>
            <div className="settings-header">
                <button onClick={() => navigate('/')} className="back-button">
                    Back to Main Page
                </button>
                <h2 className="settings-title">Settings</h2>
            </div>
            
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

            {/* Runtime settings section */}
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
            
            {/* Color picker section */}
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
                ></div>
            </div>

            {/* Font size slider section */}
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

            {/* Speech speed slider section */}
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