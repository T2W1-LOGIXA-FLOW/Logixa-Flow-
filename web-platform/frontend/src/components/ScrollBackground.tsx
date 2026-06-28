"use client";

import { useEffect, useState } from "react";
import styles from "./ScrollBackground.module.css";

interface ScrollBackgroundProps {
  opacity?: number;
}

const images = [
  "/images/cargo-plane.jpg.png",
  "/images/container-ship.jpg.png",
  "/images/container-truck.jpg.png",
  "/images/warehouse-complex.jpg.png",
];

export default function ScrollBackground({ opacity = 0.08 }: ScrollBackgroundProps) {
  const [currentImage, setCurrentImage] = useState<string>("");
  const [previousImage, setPreviousImage] = useState<string>("");
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPosition = window.scrollY;
      
      // Prevent division by zero
      if (scrollHeight <= 0) return;
      
      const scrollPercentage = Math.min(scrollPosition / scrollHeight, 1);

      let targetImage = "";

      if (scrollPercentage < 0.25) {
        targetImage = images[0]; // 0-25%: cargo-plane
      } else if (scrollPercentage < 0.50) {
        targetImage = images[1]; // 25-50%: container-ship
      } else if (scrollPercentage < 0.75) {
        targetImage = images[2]; // 50-75%: container-truck
      } else {
        targetImage = images[3]; // 75-100%: warehouse-complex
      }

      if (targetImage !== currentImage && targetImage !== previousImage) {
        setTransitioning(true);
        setPreviousImage(currentImage);
        setCurrentImage(targetImage);

        // Reset transition after animation completes
        setTimeout(() => {
          setTransitioning(false);
          setPreviousImage("");
        }, 800);
      }
    };

    // Initialize first image
    setCurrentImage(images[0]);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
    // Intentionally mount-only: adding currentImage/previousImage deps causes scroll transition loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      {/* Previous image for fade out */}
      {previousImage && (
        <div
          className={styles.image}
          style={{
            backgroundImage: `url(${previousImage})`,
            opacity: transitioning ? 0 : opacity * 0.5,
          }}
        />
      )}

      {/* Current image for fade in */}
      {currentImage && (
        <div
          className={styles.image}
          style={{
            backgroundImage: `url(${currentImage})`,
            opacity: transitioning ? opacity : opacity,
          }}
        />
      )}
    </div>
  );
}