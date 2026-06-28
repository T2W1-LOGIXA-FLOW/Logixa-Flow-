"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

interface GlobeCanvasProps {
  rotationSpeed: number;
  radius: number;
  scrollOpacity: number;
}

function Globe({
  rotationSpeed,
  radius,
  scrollOpacity,
}: GlobeCanvasProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed;
      groupRef.current.rotation.x += rotationSpeed * 0.3;
      groupRef.current.rotation.z += rotationSpeed * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshBasicMaterial
          color="hsl(var(--foreground))"
          transparent
          opacity={scrollOpacity}
          wireframe
        />
      </mesh>
    </group>
  );
}

export default function GlobeCanvas(props: GlobeCanvasProps) {
  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={75} />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.6} />
      <Globe {...props} />
    </Canvas>
  );
}
