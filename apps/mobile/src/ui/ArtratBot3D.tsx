import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as THREE from 'three';

export type BotMood = 'radar' | 'happy' | 'scribe' | 'alert' | 'launch';

interface ArtratBot3DProps {
  mood?: BotMood;
  size?: 'sm' | 'md' | 'lg';
}

const DIMENSIONS: Record<'sm' | 'md' | 'lg', number> = {
  sm: 64,
  md: 112,
  lg: 140,
};

export const ArtratBot3D: React.FC<ArtratBot3DProps> = ({
  mood = 'radar',
  size = 'md',
}) => {
  const mountRef = useRef<React.ComponentRef<typeof View> | null>(null);
  const moodRef = useRef<BotMood>(mood);
  moodRef.current = mood;
  const spinBoostRef = useRef<number>(0);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const pxSize = DIMENSIONS[size];

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const container = mountRef.current as unknown as HTMLElement | null;
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.15, 5.1);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(pxSize, pxSize);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    const domCanvas = renderer.domElement;
    domCanvas.style.width = `${pxSize}px`;
    domCanvas.style.height = `${pxSize}px`;
    domCanvas.style.display = 'block';
    domCanvas.style.cursor = 'pointer';
    container.appendChild(domCanvas);

    const ambientLight = new THREE.AmbientLight(0xf3e8ff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.7);
    keyLight.position.set(3.5, 4.5, 4.0);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xa855f7, 3.4, 12);
    rimLight.position.set(-3.2, 2.0, -2.5);
    scene.add(rimLight);

    const bottomFill = new THREE.PointLight(0x38bdf8, 1.6, 10);
    bottomFill.position.set(0, -3.0, 2.5);
    scene.add(bottomFill);

    const botGroup = new THREE.Group();
    scene.add(botGroup);

    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xf5f3ff),
      emissive: new THREE.Color(0x5b21b6),
      emissiveIntensity: 0.08,
      roughness: 0.16,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    const headGeo = new THREE.SphereGeometry(1.06, 48, 48);
    headGeo.scale(1.08, 0.96, 0.98);
    const headMesh = new THREE.Mesh(headGeo, shellMaterial);
    botGroup.add(headMesh);

    const collarMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x7c3aed),
      roughness: 0.22,
      metalness: 0.3,
      clearcoat: 0.85,
    });
    const collarGeo = new THREE.TorusGeometry(0.68, 0.11, 24, 48);
    collarGeo.rotateX(Math.PI / 2);
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.set(0, -0.86, 0);
    botGroup.add(collarMesh);

    const visorMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x0f0728),
      roughness: 0.06,
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });
    const visorGeo = new THREE.SphereGeometry(0.92, 40, 32);
    visorGeo.scale(1.02, 0.62, 0.55);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.06, 0.56);
    botGroup.add(visorMesh);

    const eyeColorByMood = (m: BotMood): number => {
      if (m === 'alert') return 0xfbbf24;
      if (m === 'launch') return 0x34d399;
      if (m === 'happy') return 0x38bdf8;
      if (m === 'scribe') return 0xc084fc;
      return 0x38bdf8;
    };

    const eyeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(eyeColorByMood(moodRef.current)),
      emissive: new THREE.Color(eyeColorByMood(moodRef.current)),
      emissiveIntensity: 2.3,
      roughness: 0.1,
    });

    const eyeGeo = new THREE.CapsuleGeometry(0.11, 0.14, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.31, 0.09, 1.02);
    rightEye.position.set(0.31, 0.09, 1.02);

    const eyesGroup = new THREE.Group();
    eyesGroup.add(leftEye);
    eyesGroup.add(rightEye);
    botGroup.add(eyesGroup);

    const podMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x8b5cf6),
      roughness: 0.18,
      metalness: 0.25,
      clearcoat: 0.9,
    });
    const podGeo = new THREE.CapsuleGeometry(0.16, 0.34, 16, 24);
    const leftPod = new THREE.Mesh(podGeo, podMat);
    const rightPod = new THREE.Mesh(podGeo, podMat);
    leftPod.position.set(-1.32, 0.05, 0);
    leftPod.rotation.z = 0.18;
    rightPod.position.set(1.32, 0.05, 0);
    rightPod.rotation.z = -0.18;
    botGroup.add(leftPod);
    botGroup.add(rightPod);

    const haloMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xa78bfa),
      emissive: new THREE.Color(0x7c3aed),
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.5,
    });
    const haloGeo = new THREE.TorusGeometry(0.42, 0.045, 16, 48);
    haloGeo.rotateX(Math.PI / 2.2);
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.set(0, 1.18, 0);
    botGroup.add(haloMesh);

    const orbGeo = new THREE.SphereGeometry(0.11, 24, 24);
    const orbMesh = new THREE.Mesh(orbGeo, eyeMat);
    orbMesh.position.set(0, 1.22, 0);
    botGroup.add(orbMesh);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = domCanvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / 240));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / 240));
      pointerRef.current = { x: nx, y: ny };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let frameId = 0;
    const startMs = performance.now();
    let nextBlinkAt = 1.8;
    let blinkEndAt = 1.94;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = (performance.now() - startMs) / 1000;

      const targetHex = eyeColorByMood(moodRef.current);
      eyeMat.color.setHex(targetHex);
      eyeMat.emissive.setHex(targetHex);

      botGroup.position.y = Math.sin(t * 2.4) * 0.11;

      if (spinBoostRef.current > 0.001) {
        spinBoostRef.current *= 0.92;
      } else {
        spinBoostRef.current = 0;
      }

      const targetRotY =
        pointerRef.current.x * 0.45 +
        Math.sin(t * 1.1) * 0.12 +
        spinBoostRef.current;
      const targetRotX = pointerRef.current.y * 0.28 + Math.cos(t * 1.5) * 0.05;
      botGroup.rotation.y += (targetRotY - botGroup.rotation.y) * 0.1;
      botGroup.rotation.x += (targetRotX - botGroup.rotation.x) * 0.1;

      eyesGroup.position.x = pointerRef.current.x * 0.08;
      eyesGroup.position.y = -pointerRef.current.y * 0.06;

      if (t > blinkEndAt) {
        nextBlinkAt = t + 2.6 + Math.random() * 2.2;
        blinkEndAt = nextBlinkAt + 0.14;
      }
      const isBlinking = t >= nextBlinkAt && t <= blinkEndAt;
      const moodScaleY =
        moodRef.current === 'scribe'
          ? 0.55
          : moodRef.current === 'happy'
          ? 1.12
          : 1.0;
      const targetEyeScaleY = isBlinking ? 0.08 : moodScaleY;
      leftEye.scale.y += (targetEyeScaleY - leftEye.scale.y) * 0.35;
      rightEye.scale.y += (targetEyeScaleY - rightEye.scale.y) * 0.35;

      leftPod.position.y = 0.05 + Math.sin(t * 3.1 + 1.0) * 0.07;
      rightPod.position.y = 0.05 + Math.sin(t * 3.1 + 2.4) * 0.07;

      haloMesh.rotation.z = t * 1.4;
      haloMesh.position.y = 1.18 + Math.sin(t * 3.0) * 0.04;
      orbMesh.position.y = 1.22 + Math.sin(t * 3.0 + 0.5) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.dispose();
      headGeo.dispose();
      visorGeo.dispose();
      eyeGeo.dispose();
      podGeo.dispose();
      haloGeo.dispose();
      collarGeo.dispose();
      orbGeo.dispose();
    };
  }, [pxSize]);

  return (
    <Pressable
      onPress={() => {
        spinBoostRef.current += Math.PI * 2;
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.canvasContainer,
        { width: pxSize, height: pxSize },
        hovered && styles.canvasHovered,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Artrat 3D Mascot"
    >
      <View ref={mountRef} style={{ width: pxSize, height: pxSize }} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  canvasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasHovered: {
    transform: [{ scale: 1.04 }],
  },
});
