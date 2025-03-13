import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Html } from '@react-three/drei';

THREE.GLTFLoader = GLTFLoader;

useEffect(() => {
    window.THREE = THREE;
    const handleModelLoadError = (event) => {
        console.error('Model loading error:', event);
    };

    window.addEventListener('error', handleModelLoadError);

    return () => {
        window.removeEventListener('error', handleModelLoadError);
    };
}, []);