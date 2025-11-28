import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, Sparkles, Text, MeshTransmissionMaterial, MeshDistortMaterial, Octahedron, Icosahedron, Torus } from '@react-three/drei';
import * as THREE from 'three';

// --- 1. DOCUMENT CAPSULE COMPONENT ---
// Represents an encrypted file type (PDF, DOC, etc.)
function DocCapsule({ type, label, color, position, focusState, loginStatus, index, total }) {
  const group = useRef();
  
  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();

    // --- ORBIT LOGIC ---
    // Base radius
    let targetRadius = 5.5; 
    let orbitSpeed = 0.2;
    let bobSpeed = 1;

    // Interaction: Email Focus -> Shift Closer
    if (focusState === 'email') {
        targetRadius = 3.8; 
        orbitSpeed = 0.5; // Speed up slightly
    }
    
    // Interaction: Success -> Merge into Core
    if (loginStatus === 'success') {
        targetRadius = 0.2;
        orbitSpeed = 5;
    }

    // Interaction: Failure -> Scatter
    if (loginStatus === 'error') {
        targetRadius = 15;
        orbitSpeed = 0;
    }

    // Calculate orbit position
    const angle = (t * orbitSpeed) + (index * (Math.PI * 2 / total));
    const targetX = Math.cos(angle) * targetRadius;
    const targetZ = Math.sin(angle) * targetRadius;

    // Smoothly move to target position (Lerp)
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, delta * 3);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, targetZ, delta * 3);
    
    // Gentle bobbing
    const bobOffset = Math.sin(t * bobSpeed + index) * 0.5;
    // On success, center Y to 0
    const targetY = loginStatus === 'success' ? 0 : (position[1] + bobOffset);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY, delta * 3);

    // Rotate capsule to face outward
    group.current.lookAt(0, group.current.position.y, 0);
  });

  // Hide on success after merge
  const visible = loginStatus !== 'success' || group.current?.position.x > 0.5;

  return (
    <group ref={group} visible={visible}>
      {/* Holographic Label */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.35}
        color={color}
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/jetbrainsmono/v13/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0Pn5qRSN.woff"
      >
        {label}
      </Text>

      {/* Capsule Body */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <capsuleGeometry args={[0.3, 1, 4, 8]} />
        <MeshTransmissionMaterial 
            backside
            backsideThickness={0.1}
            thickness={0.2}
            chromaticAberration={0.1}
            anisotropy={0.1}
            color="#ffffff" 
            opacity={0.5}
            roughness={0.2}
        />
      </mesh>

      {/* Inner Data Core (Glowing) */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
         <cylinderGeometry args={[0.15, 0.15, 0.8, 16]} />
         <meshStandardMaterial 
            color={color} 
            emissive={color}
            emissiveIntensity={3}
            toneMapped={false}
         />
      </mesh>

      {/* Tech Ring */}
      <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.5, 0.02, 16, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// --- 2. LOCK CORE COMPONENT ---
function LockCore({ focusState, loginStatus }) {
  const groupRef = useRef();
  const platesRef = useRef();
  const scannerRef = useRef();
  const centerRef = useRef();

  // Dynamic Colors
  const baseColor = loginStatus === 'error' ? '#ef4444' : (loginStatus === 'success' ? '#10b981' : '#1D4DF0');
  
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // --- A. LOCK PLATES (Password Focus) ---
    if (platesRef.current) {
        const isLocking = focusState === 'password';
        
        // Scale: Tighten (0.9) or Idle (1.1)
        const targetScale = isLocking ? 0.9 : 1.1;
        platesRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 4);

        // Rotation Speed
        const rotSpeed = isLocking ? 2 : 0.2;
        platesRef.current.rotation.z += delta * rotSpeed;
        platesRef.current.rotation.x = Math.sin(t * 0.2) * 0.2;
    }

    // --- B. SCANNER RING (Email Focus) ---
    if (scannerRef.current) {
        const isScanning = focusState === 'email';
        const targetScale = isScanning ? 1.4 : 0;
        
        scannerRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);
        
        if (isScanning) {
            scannerRef.current.rotation.x = Math.PI / 2;
            scannerRef.current.position.y = Math.sin(t * 4) * 2.5; // Fast scan
        }
    }

    // --- C. FAILURE SHAKE ---
    if (loginStatus === 'error' && groupRef.current) {
        groupRef.current.position.x = Math.sin(t * 50) * 0.2; // Violent shake
    } else if (groupRef.current) {
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, delta * 5);
    }

    // --- D. SUCCESS OPEN ---
    if (loginStatus === 'success' && groupRef.current) {
        groupRef.current.rotation.y += delta * 5; // Fast spin
        // Scale down to "absorb" key
        groupRef.current.scale.lerp(new THREE.Vector3(0,0,0), delta * 1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Inner Reactor */}
      <mesh ref={centerRef}>
        <icosahedronGeometry args={[1.2, 2]} />
        <MeshDistortMaterial 
            color={baseColor}
            emissive={baseColor}
            emissiveIntensity={2}
            distort={0.3}
            speed={2}
            roughness={0.2}
        />
      </mesh>

      {/* Armored Plates */}
      <group ref={platesRef}>
         <mesh>
            <icosahedronGeometry args={[1.8, 0]} />
            <meshStandardMaterial 
                color="#1e293b" 
                metalness={0.9} 
                roughness={0.2} 
                wireframe={false}
            />
         </mesh>
         <mesh scale={1.01}>
            <icosahedronGeometry args={[1.8, 0]} />
            <meshStandardMaterial 
                color="#334155" 
                wireframe={true}
                emissive={baseColor}
                emissiveIntensity={0.2}
            />
         </mesh>
      </group>

      {/* Scanning Laser */}
      <mesh ref={scannerRef}>
         <torusGeometry args={[2.5, 0.05, 16, 64]} />
         <meshBasicMaterial color="#00E5FF" toneMapped={false} />
      </mesh>
    </group>
  );
}

// --- 3. ACCESS KEY (Success State) ---
function AccessKey({ visible, emailHash }) {
    const ref = useRef();
    
    useFrame((state, delta) => {
        if(!ref.current || !visible) return;
        ref.current.rotation.y += delta * 2;
        ref.current.rotation.z += delta;
    });

    if (!visible) return null;

    return (
        <group ref={ref} scale={0}> 
           <Float speed={5} rotationIntensity={2} floatIntensity={0}>
              <mesh>
                 <octahedronGeometry args={[1.5, 0]} />
                 <MeshTransmissionMaterial 
                    color="#00E5FF" 
                    emissive="#ffffff"
                    emissiveIntensity={2}
                    background="#000"
                    thickness={2}
                    anisotropy={1}
                 />
              </mesh>
              <Sparkles count={50} scale={4} size={6} speed={0.4} color="#00E5FF" />
           </Float>
        </group>
    )
}

// --- MAIN EXPORT ---
export default function Secure3DScene({ focusState = 'none', loginStatus = 'idle' }) {
  
  // Static Data for Capsules
  const capsules = useMemo(() => [
    { type: 'PDF', label: 'CONFIDENTIAL.PDF', color: '#ef4444', y: 0 },
    { type: 'DOC', label: 'CONTRACT_V2.DOCX', color: '#3b82f6', y: 1.5 },
    { type: 'XLS', label: 'FINANCE_Q4.XLSX', color: '#10b981', y: -1.5 },
    { type: 'IMG', label: 'BLUEPRINT.PNG', color: '#a855f7', y: 0.5 },
    { type: 'ZIP', label: 'ARCHIVE_24.ZIP', color: '#f59e0b', y: -0.5 },
    { type: 'DAT', label: 'KEY_FRAG_01.DAT', color: '#64748b', y: 2 },
  ], []);

  return (
    <div className="absolute inset-0 z-0 bg-space-950">
      <Canvas camera={{ position: [0, 0, 14], fov: 35 }} dpr={[1, 2]}>
        {/* Cinematic Environment */}
        <fog attach="fog" args={['#02040a', 10, 30]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#1D4DF0" />
        <pointLight position={[-10, -10, -10]} intensity={2} color="#00E5FF" />
        <spotLight position={[0, 10, 0]} intensity={1} angle={0.5} />

        {/* The Vault */}
        <LockCore focusState={focusState} loginStatus={loginStatus} />
        
        {/* The Documents */}
        {capsules.map((c, i) => (
            <DocCapsule 
                key={i} 
                index={i}
                total={capsules.length}
                type={c.type} 
                label={c.label}
                color={c.color}
                position={[0, c.y, 0]}
                focusState={focusState}
                loginStatus={loginStatus}
            />
        ))}

        {/* Success Crystal (Hidden by default logic inside component) */}
        {/* <AccessKey visible={loginStatus === 'success'} /> */} 
        {/* Note: For this version, we let the lock implode instead of swapping geometries to keep transitions smooth */}

        {/* Atmosphere */}
        <Stars radius={80} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
        <Sparkles count={60} scale={15} size={3} speed={0.2} opacity={0.4} color="#1D4DF0" />
      </Canvas>
    </div>
  );
}