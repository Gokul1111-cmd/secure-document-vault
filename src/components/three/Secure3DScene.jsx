import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, Sparkles, Cylinder, Torus, Box, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// --- ORBITING DATA CUBES ---
function FloatingDocs() {
  const group = useRef();
  const docs = useMemo(() => {
    return new Array(8).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 5,
      offset: Math.random() * Math.PI
    }));
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y += 0.001;
  });

  return (
    <group ref={group}>
      {docs.map((d, i) => (
        <Float key={i} speed={2} rotationIntensity={2} floatIntensity={1}>
          <Box args={[0.4, 0.5, 0.1]} position={[d.x, d.y, d.z]}>
             <meshStandardMaterial color="#00D2FF" wireframe={true} transparent opacity={0.3} />
          </Box>
        </Float>
      ))}
    </group>
  );
}

// --- LASER SCANNER (Active on Email Focus) ---
function ScannerRing({ active }) {
  const ref = useRef();
  
  useFrame((state, delta) => {
    if (!ref.current) return;
    const targetScale = active ? 1 : 0;
    ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);
    
    if (active) {
       ref.current.position.z = Math.sin(state.clock.elapsedTime * 3) * 2;
    } else {
       ref.current.position.z = 0;
    }
  });

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
       <mesh ref={ref}>
         <torusGeometry args={[3.5, 0.05, 16, 100]} />
         <meshBasicMaterial color="#00D2FF" toneMapped={false} />
       </mesh>
    </group>
  );
}

// --- MAIN VAULT DOOR ---
function VaultDoor({ focusState, loginStatus }) {
  const doorRef = useRef();
  const boltsRef = useRef();
  const handleRef = useRef();
  const shakeRef = useRef();

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. SUCCESS: Open Door
    if (loginStatus === 'success') {
       handleRef.current.rotation.z -= delta * 10;
       boltsRef.current.scale.lerp(new THREE.Vector3(0.8, 0.8, 0.8), delta * 2);
       if (handleRef.current.rotation.z < -5) {
          doorRef.current.rotation.y = THREE.MathUtils.lerp(doorRef.current.rotation.y, -1.5, delta * 2);
       }
    } 
    // 2. ERROR: Shake
    else if (loginStatus === 'error') {
       shakeRef.current.position.x = Math.sin(t * 50) * 0.1;
       doorRef.current.rotation.y = 0;
    } 
    // 3. IDLE / INTERACTIVE
    else {
       shakeRef.current.position.x = 0;
       doorRef.current.rotation.y = THREE.MathUtils.lerp(doorRef.current.rotation.y, 0, delta * 2);
       
       // Password Focus: Lock Tight
       if (focusState === 'password') {
          boltsRef.current.rotation.z = THREE.MathUtils.lerp(boltsRef.current.rotation.z, Math.PI / 4, delta * 5);
          handleRef.current.rotation.z = THREE.MathUtils.lerp(handleRef.current.rotation.z, Math.PI / 2, delta * 5);
       } else {
          boltsRef.current.rotation.z = THREE.MathUtils.lerp(boltsRef.current.rotation.z, 0, delta * 2);
          handleRef.current.rotation.z = THREE.MathUtils.lerp(handleRef.current.rotation.z, 0, delta * 2);
       }
    }
  });

  const glowColor = loginStatus === 'error' ? '#ef4444' : (loginStatus === 'success' ? '#10b981' : '#1D4DF0');
  const neonColor = loginStatus === 'error' ? '#ef4444' : '#00D2FF';

  return (
    <group ref={shakeRef}>
      <group ref={doorRef}>
        {/* Frame */}
        <Torus args={[3, 0.4, 32, 64]}>
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
        </Torus>

        {/* Door Body */}
        <group>
           <Cylinder args={[2.8, 2.8, 0.5, 64]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.9} />
           </Cylinder>
           {/* Core Glow */}
           <mesh position={[0, 0, 0.3]}>
              <circleGeometry args={[1, 32]} />
              <MeshDistortMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2} speed={2} distort={0.2} />
           </mesh>
        </group>

        {/* Bolts */}
        <group ref={boltsRef} position={[0, 0, 0.3]}>
           {[0, 1, 2, 3, 4, 5].map((i) => (
              <group key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
                 <mesh position={[2, 0, 0]}>
                    <boxGeometry args={[0.8, 0.3, 0.3]} />
                    <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0.1} />
                 </mesh>
              </group>
           ))}
        </group>

        {/* Handle */}
        <group ref={handleRef} position={[0, 0, 0.6]}>
           <Torus args={[0.8, 0.1, 16, 32]}>
              <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={1} />
           </Torus>
           <mesh>
              <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} rotation={[Math.PI/2, 0, 0]} />
              <meshStandardMaterial color="#cbd5e1" metalness={1} />
           </mesh>
        </group>
      </group>
    </group>
  );
}

export default function Secure3DScene({ focusState = 'none', loginStatus = 'idle' }) {
  return (
    <div className="absolute inset-0 z-0 bg-navy-900">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <fog attach="fog" args={['#0B1120', 5, 20]} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={2} color="#1D4DF0" />
        <pointLight position={[-10, -10, -10]} color="#00D2FF" intensity={1} />

        <VaultDoor focusState={focusState} loginStatus={loginStatus} />
        <ScannerRing active={focusState === 'email'} />
        <FloatingDocs />
        <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={50} scale={12} size={3} speed={0.2} opacity={0.5} color="#1D4DF0" />
      </Canvas>
    </div>
  );
}