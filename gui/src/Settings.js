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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    // Fetch available models when component mounts
    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        console.log('Fetching models...');
        try {
            console.log('Making GET request to /models');
            const response = await fetch('http://localhost:8080/models', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors'
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries([...response.headers]));
            
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
            }
            
            const text = await response.text();
            console.log('Raw response:', text);
            
            const data = JSON.parse(text);
            console.log('Parsed response:', data);
            
            if (data && Array.isArray(data.models)) {
                setAvailableModels(data.models);
                if (data.models.length > 0 && selectedModel === "Select a Model") {
                    setSelectedModel(data.models[0]);
                }
            } else {
                console.error('Invalid data format:', data);
                throw new Error('Invalid data format received from server');
            }
        } catch (err) {
            const errorMessage = 'Failed to load models: ' + err.message;
            setError(errorMessage);
            console.error(errorMessage);
        }
    };
    
    const handleModelSelect = async (modelName) => {
        console.log('Switching to model:', modelName);
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('http://localhost:8080/models/switch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ model: modelName }),
            });
            
            console.log('Switch model response status:', response.status);
            
            const result = await response.json();
            console.log('Switch model result:', result);
    
            if (!response.ok) {
                throw new Error(result.error || `Failed to switch model: ${response.status}`);
            }
    
            setSelectedModel(modelName);
            setError(null);
        } catch (err) {
            const errorMessage = 'Failed to switch model: ' + (err.message || 'Unknown error');
            setError(errorMessage);
            console.error(errorMessage);
            // Reset selected model if switch failed
            await fetchModels();
        } finally {
            setLoading(false);
        }
    };
    // Generate gradient for header color
    function generateGradient(h, s, v) {
        const lightnessValues = [90, 70, 50, 30, 10];
        const gradientColors = lightnessValues.map(l => `hsl(${h}, ${s}%, ${l}%)`);
        return `linear-gradient(to left, ${gradientColors.join(', ')})`;
    }

    return (
        <div>
            <div className="settings-header">
                <button onClick={() => navigate('/')} className="back-button">Back to Main Page</button>
                <h2 className="settings-title">Settings</h2>
            </div>
            
            <div className="settings-section">
                <label htmlFor="model-dropdown">Model:</label>
                <div>
                    <DropdownButton
                        id="model-dropdown"
                        title={loading ? "Loading..." : selectedModel}
                        variant="success"
                        disabled={loading}
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
                    {loading && <div className="text-info mt-2">Loading...</div>}
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
                    <div className="text-muted mt-1">
                        Available models: {availableModels.length > 0 ? availableModels.join(', ') : 'None found'}
                    </div>
                </div>
            </div>

            {/* Rest of your existing settings sections */}

            {/* Runtime Dropdown */}
            <div className="settings-section">
                <label htmlFor="run-time-dropdown">Message Run Time:</label>
                <DropdownButton id="run-time-dropdown" title={selectedRuntime} variant="success">
                    <Dropdown.Item onClick={() => setSelectedRuntime("Realtime")}>Realtime</Dropdown.Item>
                    <Dropdown.Item onClick={() => setSelectedRuntime("Instant")}>Instant</Dropdown.Item>
                </DropdownButton>
            </div>

            {/* Header Color Wheel */}
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
                    onChange={(value) => setMessageFontSize(value)}
                />
                <p>Current Value: {messageFontSize}</p>
            </div>
            {/* Speed Slider */}
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