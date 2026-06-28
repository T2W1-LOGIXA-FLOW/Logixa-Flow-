"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
// @ts-expect-error - three JSM modules lack type declarations
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useWindowSize } from "@/lib/useWindowSize";

gsap.registerPlugin(ScrollTrigger);

interface GLTFResult {
  scene: THREE.Group;
}

interface GLTFModelViewerProps {
  modelPath: string;
  title: string;
  description: string;
  position?: { x: number; y: number; z: number };
  scale?: number;
  rotation?: { x: number; y: number; z: number };
  className?: string;
  autoRotate?: boolean;
  enableZoom?: boolean;
}

export default function GLTFModelViewer({
  modelPath,
  title,
  description,
  position = { x: 0, y: 0, z: 0 },
  scale = 1,
  rotation = { x: 0, y: 0, z: 0 },
  className = "",
  autoRotate = true,
  enableZoom = true,
}: GLTFModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const { isMobile } = useWindowSize();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || isMobile) return;

    try {
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f172a);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      camera.position.set(3, 3, 4);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Renderer with premium settings
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        precision: "highp",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Lighting - Professional setup
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0x00c7ff, 1.2);
      directionalLight.position.set(5, 10, 7);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.far = 50;
      scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0xff6400, 0.8);
      pointLight.position.set(-5, -5, 5);
      scene.add(pointLight);

      const rimLight = new THREE.DirectionalLight(0x00a3ff, 0.5);
      rimLight.position.set(-5, 3, -5);
      scene.add(rimLight);

      // Load model
      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf: GLTFResult) => {
          const model = gltf.scene;
          model.scale.set(scale, scale, scale);
          model.position.set(position.x, position.y, position.z);
          model.rotation.set(rotation.x, rotation.y, rotation.z);

          // Enable shadows on all meshes
          model.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          scene.add(model);
          modelRef.current = model;
          setLoading(false);

          // Animate model entry
          gsap.from(model.position, {
            x: position.x + 2,
            y: position.y + 2,
            z: position.z + 2,
            duration: 1.5,
            ease: "power2.out",
          });

          gsap.from(model.rotation, {
            x: rotation.x + Math.PI,
            y: rotation.y + Math.PI,
            z: rotation.z + Math.PI,
            duration: 1.5,
            ease: "power2.out",
          });

          // Scroll animation
          gsap.to(model.rotation, {
            x: rotation.x + Math.PI * 2,
            y: rotation.y + Math.PI * 4,
            z: rotation.z + Math.PI,
            scrollTrigger: {
              trigger: container,
              start: "top center",
              end: "bottom center",
              scrub: 1.5,
              markers: false,
            },
            duration: 1,
          });
        },
        undefined,
        (err: unknown) => {
          console.error("Error loading model:", err);
          setError("Failed to load 3D model");
          setLoading(false);
        }
      );

      // Handle resize
      const handleResize = () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      };

      window.addEventListener("resize", handleResize);

      // Mouse control for zoom
      if (enableZoom) {
        let mouseDown = false;
        let mouseX = 0;
        let mouseY = 0;

        container.addEventListener("mousedown", (e) => {
          mouseDown = true;
          mouseX = e.clientX;
          mouseY = e.clientY;
        });

        container.addEventListener("mousemove", (e) => {
          if (mouseDown && modelRef.current) {
            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;
            modelRef.current.rotation.y += deltaX * 0.005;
            modelRef.current.rotation.x += deltaY * 0.005;
          }
        });

        container.addEventListener("mouseup", () => {
          mouseDown = false;
        });

        container.addEventListener("wheel", (e) => {
          e.preventDefault();
          const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
          const newScale = Math.max(0.5, Math.min(3, (modelRef.current?.scale.x || 1) * scaleFactor));
          if (modelRef.current) {
            modelRef.current.scale.set(newScale, newScale, newScale);
          }
        });
      }

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);

        if (autoRotate && modelRef.current) {
          modelRef.current.rotation.x += 0.0005;
          modelRef.current.rotation.y += 0.001;
        }

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        window.removeEventListener("resize", handleResize);
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch (err) {
      console.error("Scene setup error:", err);
      setError("Failed to initialize 3D scene");
    }
  }, [modelPath, isMobile, scale, position, rotation, autoRotate, enableZoom]);

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div
        ref={containerRef}
        className="relative w-full h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.7) 100%)",
        }}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-300">Loading 3D Model...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-red-400 font-semibold mb-2">⚠️ {error}</p>
              <p className="text-slate-400 text-sm">Please try refreshing the page</p>
            </div>
          </div>
        )}
      </div>

      {/* Content overlay - Lenis.dev inspired */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 md:p-12">
        {/* Top gradient */}
        <div className="absolute inset-0 top-0 h-32 bg-gradient-to-b from-slate-900/50 via-transparent to-transparent pointer-events-none" />

        {/* Text content */}
        <div className="relative z-10 max-w-2xl">
          <div className="opacity-0 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-orange-400 bg-clip-text text-transparent leading-tight">
              {title}
            </h2>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-xl">
              {description}
            </p>
          </div>
        </div>

        {/* Bottom hint - Lenis inspired */}
        <div className="relative z-10 flex flex-col items-start gap-3">
          <p className="text-xs md:text-sm text-slate-500 uppercase tracking-widest font-semibold">Scroll to rotate</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-10 border border-slate-500/30 rounded-full flex items-center justify-center">
              <div className="w-1 h-2 bg-slate-500 rounded-full animate-bounce" />
            </div>
            <p className="text-xs text-slate-500">Drag to explore</p>
          </div>
        </div>
      </div>

      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none" />
    </div>
  );
}
