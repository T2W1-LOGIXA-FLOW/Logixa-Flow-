"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useWindowSize } from "@/lib/useWindowSize";

gsap.registerPlugin(ScrollTrigger);

interface Scene3DProps {
  id: string;
  title: string;
  description: string;
  geometry: "box" | "sphere" | "torus" | "cylinder";
  color: string;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
}

export default function Scene3D({
  id,
  title,
  description,
  geometry,
  color,
  position = { x: 0, y: 0, z: 0 },
  rotation = { x: 0, y: 0, z: 0 },
}: Scene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const { isMobile } = useWindowSize();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Disable 3D on mobile for performance
    if (isMobile) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 3;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: "lowp", // Mobile optimization
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap pixel ratio for mobile
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create geometry based on type
    let geom: THREE.BufferGeometry;
    switch (geometry) {
      case "sphere":
        geom = new THREE.SphereGeometry(1, 32, 32);
        break;
      case "torus":
        geom = new THREE.TorusGeometry(1, 0.4, 16, 32);
        break;
      case "cylinder":
        geom = new THREE.CylinderGeometry(1, 1, 2, 32);
        break;
      default:
        geom = new THREE.BoxGeometry(2, 2, 2);
    }

    // Material with custom color
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.2,
      shininess: 100,
    });

    // Mesh
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshRef.current = mesh;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x00c7ff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xff6400, 0.5);
    pointLight.position.set(-5, -5, 5);
    scene.add(pointLight);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // GSAP animation with ScrollTrigger
    gsap.to(mesh.rotation, {
      x: rotation.x + Math.PI * 2,
      y: rotation.y + Math.PI * 4,
      z: rotation.z + Math.PI,
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top center",
        end: "bottom center",
        scrub: 1.5,
        markers: false,
      },
      duration: 1,
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Auto-rotation when not scrolling
      if (meshRef.current) {
        meshRef.current.rotation.x += 0.001;
        meshRef.current.rotation.y += 0.002;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geom.dispose();
      material.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [geometry, color, position, rotation, isMobile]);

  return (
    <div
      ref={containerRef}
      id={id}
      className="relative w-full h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.6) 100%)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/50" />
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-transparent">
          {title}
        </h2>
        <p className="text-lg md:text-xl text-slate-300 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
