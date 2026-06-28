"use client";

import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Smaller & Elegant 3D GeometricSphere
 */

function SphereMesh() {
  // Use a clean geometric wireframe
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.2, 2), []);

  return (
    <group rotation={[Math.PI / 6, Math.PI / 4, 0]}>
      {/* Main Cyan Wireframe */}
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial 
          color="#00ffff" 
          opacity={0.4} 
          transparent 
          linewidth={2}
        />
      </lineSegments>

      {/* Secondary Orange Wireframe */}
      <lineSegments rotation={[Math.PI / 3, Math.PI / 4, Math.PI / 2]}>
        <edgesGeometry args={[new THREE.IcosahedronGeometry(1.21, 1)]} />
        <lineBasicMaterial 
          color="#ff8c00" 
          opacity={0.25} 
          transparent 
        />
      </lineSegments>
    </group>
  );
}

export default function GeometricSphere() {
  return (
    // Reduced container size from 45vw to 30vw
    <div className="fixed top-1/2 right-0 -translate-y-1/2 w-[30vw] h-[30vw] pointer-events-none z-10 overflow-visible">
      <Canvas 
        camera={{ position: [0, 0, 3.5], fov: 40 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={1} />
        <SphereMesh />
      </Canvas>
    </div>
  );
}
