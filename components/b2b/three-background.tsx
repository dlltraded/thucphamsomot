"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere, Float, Stars, Environment } from "@react-three/drei";
import * as THREE from "three";

function OrganicSphere() {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      sphereRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={sphereRef} args={[1, 64, 64]} scale={2.5} position={[4, 0, -3]}>
        <MeshDistortMaterial
          color="#4ade80"
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.5}
          roughness={0.2}
          distort={0.4}
          speed={2}
          transmission={0.6}
          transparent={true}
          opacity={0.8}
        />
      </Sphere>
    </Float>
  );
}

function SupplyChainNetwork() {
  const count = 300;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const theta = t * Math.PI * 10;
    const phi = Math.acos(1 - 2 * t);
    const r = 4 + (i % 48) * 0.1;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = ((i % 20) / 19 - 0.5) * 4;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#22c55e"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function ThreeBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.8 }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#4ade80" />
        <Environment preset="city" />
        <Stars radius={100} depth={50} count={1500} factor={4} saturation={0} fade speed={1} />
        <OrganicSphere />
        <SupplyChainNetwork />
      </Canvas>
    </div>
  );
}
