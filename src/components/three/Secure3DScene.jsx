import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, Sparkles, Icosahedron, Octahedron, Sphere, MeshDistortMaterial, Trail } from '@react-three/drei';
import * as THREE from 'three';

// --- HELPER: Generate "Star Key" Geometry from Email Hash ---
// This makes the key look different for every user
function StarKeyGeometry({ email }) {
    const seed = email.length > 0 ? email.charCodeAt(0) + email.charCodeAt(email.length-1) : 100;
    // Simple pseudo-random visual
    if (seed % 3 === 0) return <Icosahedron args={[0.8, 0]} />;
    if (seed % 3 === 1) return <Octahedron args={[0.8, 0]} />;
    return <Sphere args={[0.8, 16, 16]} />;
}

// --- COMPONENT: THE ASTRAL VAULT ---
function AstralVault({ loginStatus, focusState }) {
  const vaultRef = useRef();
  const platesRef = useRef();
  
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Base Rotation (Idle: 18s revolution)
    if (vaultRef.current) {
       vaultRef.current.rotation.y += delta * 0.05; 
    }

    // 2. INTERACTION: Password Focus -> Tighten Plates
    if (focusState === 'password') {
        if (platesRef.current) {
            platesRef.current.scale.lerp(new THREE.Vector3(0.9, 0.9, 0.9), delta * 2);
            platesRef.current.rotation.z = THREE.MathUtils.lerp(platesRef.current.rotation.z, Math.PI/4, delta * 2);
        }
    } else {
        if (platesRef.current) {
            platesRef.current.scale.lerp(new THREE.Vector3(1.1, 1.1, 1.1), delta * 2); // "Breathing" open state
            platesRef.current.rotation.z = THREE.MathUtils.lerp(platesRef.current.rotation.z, 0, delta * 2);
        }
    }

    // 3. LOGIN STATUS: Success/Fail
    if (loginStatus === 'success') {
        // Cinematic Open
        vaultRef.current.scale.lerp(new THREE.Vector3(0, 0, 0), delta * 3); // Implode to reveal content
    } else if (loginStatus === 'error') {
        // Glitch Shake
        vaultRef.current.position.x = Math.sin(t * 50) * 0.2;
    } else {
        vaultRef.current.position.x = THREE.MathUtils.lerp(vaultRef.current.position.x, 0, delta * 5);
        vaultRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 2);
    }
  });

  const color = loginStatus === 'error' ? '#ff2a6d' : '#1D4DF0';
  const emissive = loginStatus === 'error' ? '#ff2a6d' : '#00E5FF';

  return (
    <group ref={vaultRef}>
      {/* Core Crystalline Structure */}
      <mesh>
        <icosahedronGeometry args={[2, 1]} />
        <meshPhysicalMaterial 
            color={color}
            emissive={emissive}
            emissiveIntensity={0.5}
            roughness={0}
            metalness={0.9}
            transmission={0.6} // Glass-like
            thickness={2}
            wireframe={false}
        />
      </mesh>
      
      {/* Floating Outer Plates */}
      <group ref={platesRef}>
         <mesh>
            <icosahedronGeometry args={[2.2, 0]} />
            <meshStandardMaterial 
                color={emissive} 
                wireframe={true} 
                transparent 
                opacity={0.3} 
            />
         </mesh>
      </group>
    </group>
  );
}

// --- COMPONENT: DOCUMENT STARS ---
function DocumentStars({ focusState, emailInput }) {
    const group = useRef();
    
    // Create 20 "stars" (documents)
    const stars = useMemo(() => {
        return new Array(20).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 15,
            y: (Math.random() - 0.5) * 15,
            z: (Math.random() - 0.5) * 10,
            scale: Math.random() * 0.5 + 0.2,
            speed: Math.random() * 0.2
        }));
    }, []);

    useFrame((state, delta) => {
        if (!group.current) return;
        
        // "Gravity Bloom" - Pull stars closer on Email Focus
        const targetScale = focusState === 'email' ? 0.8 : 1.5; // 0.8 = closer orbit
        
        group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2);
        group.current.rotation.y += delta * 0.1;
        
        // Typing Pulse Effect
        if (emailInput.length > 0) {
             group.current.children[0].scale.setScalar(1.5 + Math.sin(state.clock.elapsedTime * 10) * 0.5);
        }
    });

    return (
        <group ref={group}>
            {stars.map((s, i) => (
                <Float key={i} speed={2} rotationIntensity={2} floatIntensity={2}>
                    <mesh position={[s.x, s.y, s.z]}>
                        <octahedronGeometry args={[s.scale, 0]} />
                        <meshStandardMaterial 
                            color={i === 0 ? "#00E5FF" : "#60a5fa"} // One "hero" star
                            emissive="#1D4DF0"
                            emissiveIntensity={2}
                            toneMapped={false}
                        />
                    </mesh>
                </Float>
            ))}
        </group>
    );
}

// --- COMPONENT: THE STAR KEY (Appears on Success) ---
function StarKey({ visible, email }) {
    if (!visible) return null;

    return (
        <group position={[0, 0, 3]}>
            <Float speed={5} rotationIntensity={2} floatIntensity={0.5}>
                <mesh>
                    <StarKeyGeometry email={email} />
                    <MeshDistortMaterial 
                        color="#00E5FF" 
                        emissive="#ffffff"
                        emissiveIntensity={4}
                        speed={5}
                        distort={0.6}
                    />
                </mesh>
            </Float>
            <Sparkles count={50} scale={4} size={5} speed={2} color="#00E5FF" />
        </group>
    );
}


// --- MAIN EXPORT ---
export default function Secure3DScene({ focusState = 'none', loginStatus = 'idle', emailInput = '' }) {
  return (
    <div className="absolute inset-0 z-0 bg-space-900">
      <Canvas camera={{ position: [0, 0, 10], fov: 40 }}>
        {/* Environment */}
        <fog attach="fog" args={['#050a14', 5, 25]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#1D4DF0" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#00E5FF" />
        
        {/* Main Elements */}
        <AstralVault loginStatus={loginStatus} focusState={focusState} />
        
        {/* The Constellation */}
        <DocumentStars focusState={focusState} emailInput={emailInput} />
        
        {/* Success Animation Object */}
        <StarKey visible={loginStatus === 'success'} email={emailInput} />

        {/* Background */}
        <Stars radius={80} depth={60} count={3000} factor={4} saturation={0} fade speed={0.5} />
      </Canvas>
    </div>
  );
}