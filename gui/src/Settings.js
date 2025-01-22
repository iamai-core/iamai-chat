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
        try {
            const response = await fetch('http://localhost:8080/models');
            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }
            const data = await response.json();
            setAvailableModels(data.models);
        } catch (err) {
            setError('Failed to load models: ' + err.message);
            console.error('Error fetching models:', err);
        }
    };

    const handleModelSelect = async (modelName) => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8080/models/switch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ model: modelName }),
            });

            if (!response.ok) {
                throw new Error('Failed to switch model');
            }

            setSelectedModel(modelName);
        } catch (err) {
            setError('Failed to switch model: ' + err.message);
            console.error('Error switching model:', err);
        } finally {
            setLoading(false);
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
                    title={loading ? "Loading..." : selectedModel}
                    variant="success"
                    disabled={loading}
                >
                    {availableModels.map((model) => (
                        <Dropdown.Item 
                            key={model} 
                            onClick={() => handleModelSelect(model)}
                        >
                            {model}
                        </Dropdown.Item>
                    ))}
                </DropdownButton>
                {error && <div className="error-message text-danger mt-2">{error}</div>}
            </div>

            {/* Rest of your existing settings sections */}
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