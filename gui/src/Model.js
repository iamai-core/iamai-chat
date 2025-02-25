import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";

function Model({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} scale={1} />;
}

function BlenderModelViewer() {
  return (
    <Canvas style={{ height: "500px" }} camera={{ position: [0, 1, 3] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Suspense fallback={<span>Loading model...</span>}>
        <Model modelPath="/models/myModel.glb" />
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
}

export default BlenderModelViewer;
