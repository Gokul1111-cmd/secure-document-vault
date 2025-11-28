import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, Sparkles, Icosahedron, Octahedron, Sphere, MeshTransmissionMaterial, Trail, Text } from '@react-three/drei';
import * as THREE from 'three';

// --- HELPER: HASH FUNCTION ---
// Generates a deterministic number from a string (for star-key geometry)
const stringToHash = (str) => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
};

// --- COMPONENT: DOCUMENT STAR ---
// Represents a single encrypted document in orbit
function DocStar({ index, total, focusState, loginStatus, typingPulse }) {
  const mesh = useRef();
  const initialOffset = Math.random() * 100;
  
  useFrame((state, delta) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();

    // 1. ORBIT PHYSICS
    let radius = 6; // Idle radius
    let speed = 0.2;
    
    // Interaction: Gravity Bloom (Email Focus)
    if (focusState === 'email') {
        radius = 3.5; // Pull closer
        speed = 0.5;
    }
    
    // Interaction: Success (Fuse)
    if (loginStatus === 'success') {
        radius = 0.2; // Merge to center
        speed = 4.0;
    }

    // Interaction: Error (Scatter)
    if (loginStatus === 'error') {
        radius = 12; // Blast away
        speed = 0;
    }

    const angle = (t * speed) + (index * (Math.PI * 2 / total)) + initialOffset;
    
    // Smooth lerp to target position
    const targetX = Math.cos(angle) * radius;
    const targetZ = Math.sin(angle) * radius;
    const targetY = Math.sin(t + index) * 1.5; // Vertical oscillation

    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, targetX, delta * 2);
    mesh.current.position.z = THREE.MathUtils.lerp(mesh.current.position.z, targetZ, delta * 2);
    mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, targetY, delta * 2);

    // 2. TYPING PULSE
    // If typing matches this star's index roughly, pulse it
    let targetScale = 0.3; // Base size
    if (typingPulse && index % 5 === Math.floor(t * 10) % 5) {
        targetScale = 0.8;
    }
    mesh.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 10);
  });

  // Unique color per star based on index
  const hue = (index / total) * 360;
  const color = new THREE.Color(`hsl(${hue}, 80%, 60%)`);

  return (
    <mesh ref={mesh}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={color} toneMapped={false} />
      {/* Light trail for motion blur feel */}
      <Trail width={0.2} length={4} color={color} attenuation={(t) => t * t}>
        <mesh />
      </Trail>
    </mesh>
  );
}

// --- COMPONENT: CRYSTALLINE VAULT ---
function CrystallineVault({ focusState, loginStatus }) {
  const group = useRef();
  const plates = useRef();
  
  // State colors
  const glowColor = loginStatus === 'error' ? '#FB7185' : '#00E5FF';

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. ROTATION
    if (group.current) {
        // Idle rotation: 18s per revolution -> 2PI / 18 rad/s
        group.current.rotation.y += delta * (Math.PI / 9); 
        group.current.rotation.z = Math.sin(t * 0.2) * 0.1;
    }

    // 2. PLATES INTERACTION (Password Focus)
    if (plates.current) {
        const tighten = focusState === 'password' || loginStatus === 'error';
        const targetScale = tighten ? 0.95 : 1.05; // Contract or Expand
        
        plates.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2);
        
        // Spin plates faster when tightening
        if (tighten) {
            plates.current.rotation.z += delta * 1;
        }
    }

    // 3. LOGIN SUCCESS (Open)
    if (loginStatus === 'success' && group.current) {
        // Scale down to nothing (implosion/opening)
        group.current.scale.lerp(new THREE.Vector3(0,0,0), delta * 2);
    } 
    // 4. LOGIN ERROR (Shake)
    else if (loginStatus === 'error' && group.current) {
        group.current.position.x = Math.sin(t * 50) * 0.2;
    } 
    else if (group.current) {
        group.current.scale.lerp(new THREE.Vector3(1,1,1), delta * 2);
        group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, 0, delta * 2);
    }
  });

  return (
    <group ref={group}>
      {/* Inner Energy Core */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color={glowColor} wireframe={true} transparent opacity={0.1} />
      </mesh>

      {/* Main Crystalline Hull */}
      <mesh>
        <icosahedronGeometry args={[2, 2]} />
        <MeshTransmissionMaterial 
            backside
            backsideThickness={1}
            thickness={0.5}
            chromaticAberration={0.4}
            anisotropy={0.5}
            color="#ffffff" 
            roughness={0.1}
            ior={1.5}
        />
      </mesh>

      {/* Outer Floating Plates (Tessellated) */}
      <group ref={plates}>
         <mesh rotation={[0.5, 0.5, 0]}>
            <icosahedronGeometry args={[2.2, 0]} />
            <meshStandardMaterial 
                color={glowColor} 
                emissive={glowColor}
                emissiveIntensity={0.5}
                wireframe={true} 
                transparent 
                opacity={0.3} 
            />
         </mesh>
      </group>
    </group>
  );
}

// --- COMPONENT: STAR KEY (Generated from Email) ---
function StarKey({ email, visible }) {
    const group = useRef();
    
    // Determine geometry based on email hash
    const hash = useMemo(() => stringToHash(email), [email]);
    const geometryType = hash % 3; // 0=Sphere, 1=Octahedron, 2=Icosahedron
    const colorHash = hash % 360;
    const color = `hsl(${colorHash}, 80%, 60%)`;

    useFrame((state, delta) => {
        if (!group.current) return;
        // Float and rotate
        group.current.rotation.y += delta * 2;
        group.current.rotation.z += delta;
        // Scale up on success
        const targetScale = visible ? 1 : 0;
        group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 3);
    });

    return (
        <group ref={group} scale={0}>
            <Float speed={5} rotationIntensity={1} floatIntensity={0}>
                <mesh>
                    {geometryType === 0 && <sphereGeometry args={[1, 16, 16]} />}
                    {geometryType === 1 && <octahedronGeometry args={[1, 0]} />}
                    {geometryType === 2 && <icosahedronGeometry args={[1, 0]} />}
                    <MeshDistortMaterial 
                        color={color} 
                        emissive="#ffffff"
                        emissiveIntensity={2}
                        speed={5}
                        distort={0.4}
                    />
                </mesh>
                <Sparkles count={30} scale={3} size={5} speed={0.4} opacity={1} color={color} />
            </Float>
        </group>
    );
}

// --- MAIN EXPORT ---
export default function AstralLock({ focusState, loginStatus, emailInput, typingPulse }) {
  // Generate 15 stars
  const stars = useMemo(() => new Array(15).fill(0), []);

  return (
    <div className="absolute inset-0 z-0 bg-cosmos-void">
      <Canvas camera={{ position: [0, 0, 14], fov: 35 }}>
        <fog attach="fog" args={['#030712', 10, 30]} />
        
        {/* Cinematic Lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00E5FF" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#E879F9" />
        <spotLight position={[0, 10, 0]} intensity={1} angle={0.5} penumbra={1} />

        {/* The Vault Object */}
        <CrystallineVault focusState={focusState} loginStatus={loginStatus} />

        {/* The Star Key (Generated) */}
        <StarKey email={emailInput} visible={loginStatus === 'success'} />

        {/* The Constellation (Documents) */}
        {stars.map((_, i) => (
            <DocStar 
                key={i} 
                index={i} 
                total={stars.length}
                focusState={focusState}
                loginStatus={loginStatus}
                typingPulse={typingPulse}
            />
        ))}

        {/* Environment */}
        <Stars radius={80} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
        <Sparkles count={50} scale={15} size={2} speed={0.2} opacity={0.3} color="#ffffff" />
      </Canvas>
    </div>
  );
}