import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, MeshDistortMaterial } from '@react-three/drei';

function SecureCore() {
  const meshRef = useRef(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      // Rotate the core
      meshRef.current.rotation.x = t * 0.2;
      meshRef.current.rotation.y = t * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} scale={2.2}>
        <icosahedronGeometry args={[1, 0]} />
        {/* Distort material makes it look like liquid metal/shield */}
        <MeshDistortMaterial
          color="#3b82f6" // Blue-500
          attach="material"
          distort={0.4} 
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </Float>
  );
}

function SecurityRing({ rotation, scale, color, speed = 0.2 }) {
    const ringRef = useRef(null);
    
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if(ringRef.current) {
            ringRef.current.rotation.x = rotation[0] + t * speed;
            ringRef.current.rotation.y = rotation[1] + t * speed;
            ringRef.current.rotation.z = t * (speed * 0.5);
        }
    });

    return (
        <group rotation={rotation}>
            <mesh ref={ringRef} scale={scale}>
                <torusGeometry args={[3.5, 0.02, 16, 100]} />
                <meshStandardMaterial 
                    color={color} 
                    emissive={color} 
                    emissiveIntensity={2} 
                    toneMapped={false}
                    transparent 
                    opacity={0.8} 
                />
            </mesh>
        </group>
    )
}

export default function Secure3DScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#60a5fa" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#a78bfa" />
        
        {/* Objects */}
        <SecureCore />
        <SecurityRing rotation={[0.5, 0, 0]} scale={1} color="#60a5fa" speed={0.1} />
        <SecurityRing rotation={[0, 0.5, 0]} scale={1.2} color="#818cf8" speed={0.15} />
        
        {/* Background */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Canvas>
    </div>
  );
}