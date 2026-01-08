
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BuildingType } from '../../types';

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
  fin: new THREE.BoxGeometry(0.02, 0.1, 0.6),
  torus: new THREE.TorusGeometry(0.3, 0.05, 8, 32),
  sphere: new THREE.SphereGeometry(0.5, 32, 32),
  octa: new THREE.OctahedronGeometry(0.5),
  cone: new THREE.ConeGeometry(0.5, 1, 32),
};

const WindowPanels = ({ scale, color, variant = 0, position = [0, 0, 0] }: { scale: [number, number, number], color: string, variant?: number, position?: [number, number, number] | number[] }) => {
    const isCommercial = color === '#a855f7';
    
    return (
        <group scale={scale} position={position as any}>
            <mesh scale={[0.96, 0.96, 0.96]}>
                <boxGeometry />
                <meshPhysicalMaterial 
                    color={color} 
                    metalness={0.9} 
                    roughness={0.05} 
                    transmission={0.8} 
                    thickness={1.2} 
                    transparent 
                    opacity={0.5} 
                    clearcoat={1.0}
                    clearcoatRoughness={0.02}
                    iridescence={isCommercial ? 0.4 : 0}
                    iridescenceIOR={1.5}
                />
            </mesh>
            <mesh scale={[1.006, 1.006, 1.006]}>
                <boxGeometry />
                <meshBasicMaterial 
                    color="#ffffff" 
                    transparent 
                    opacity={variant % 2 === 0 ? 0.04 : 0.08} 
                    wireframe={variant % 4 !== 0} 
                />
            </mesh>
        </group>
    );
};

const CyberLight = ({ position, color, scale = [1, 1, 1], pulse = false }: any) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (pulse && ref.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 6) * 0.4;
      ref.current.scale.set(scale[0] * s, scale[1] * s, scale[2] * s);
    }
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <boxGeometry args={[0.07, 0.07, 0.07]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={30} />
    </mesh>
  );
};

const Antenna = ({ position, color, variant = 0 }: any) => {
  const ref = useRef<THREE.Group>(null);
  const pulseSpeed = useMemo(() => 5 + (variant % 12), [variant]);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * pulseSpeed) * 0.4;
      ref.current.children[1].scale.set(s, s, s);
    }
  });
  
  return (
    <group position={position} ref={ref}>
      <mesh scale={[0.012, 0.4 + (variant % 6) * 0.1, 0.012]} position={[0, 0.2, 0]}>
        <boxGeometry />
        <meshStandardMaterial color="#475569" metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.4 + (variant % 6) * 0.1, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={60} />
      </mesh>
    </group>
  );
};

export const ProceduralBuilding = React.memo(({ type, baseColor, rotation, variant = 0, opacity = 1, transparent = false }: any) => {
  
  const hScale = useMemo(() => 0.8 + (variant % 10) * 0.15, [variant]);
  const wScale = useMemo(() => 0.6 + (variant % 6) * 0.06, [variant]);

  const sharedMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#0f172a',
    roughness: 0.15,
    metalness: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transparent,
    opacity
  }), [transparent, opacity]);

  const renderResidential = () => {
    const arch = variant % 5;
    
    switch(arch) {
      case 0: // Monolith
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.5 * hScale, 0]} scale={[wScale, hScale, wScale]} castShadow material={sharedMaterial} />
            <WindowPanels scale={[wScale + 0.01, hScale - 0.05, wScale + 0.01]} position={[0, 0.5 * hScale, 0]} color={baseColor} variant={variant} />
            <CyberLight position={[wScale * 0.52, hScale * 0.9, wScale * 0.52]} color="#2dd4bf" />
            <Antenna position={[0, hScale, 0]} color="#2dd4bf" variant={variant} />
          </group>
        );
      case 1: // Terraced
        return (
          <group>
            {[0, 1, 2].map(i => {
               const h = hScale * (1 - i * 0.32);
               const w = wScale * (1 - i * 0.12);
               return (
                 <group key={i} position={[0, i * 0.28, 0]}>
                    <mesh geometry={GEO.box} position={[0, 0.5 * h, 0]} scale={[w, h, w]} castShadow material={sharedMaterial} />
                    <WindowPanels scale={[w + 0.012, h - 0.02, w + 0.012]} position={[0, 0.5 * h, 0]} color={baseColor} variant={variant + i} />
                 </group>
               );
            })}
          </group>
        );
      case 2: // Dual-Core
        const coreW = wScale * 0.48;
        return (
          <group>
            <mesh geometry={GEO.box} position={[-wScale*0.26, 0.5*hScale, 0]} scale={[coreW, hScale, wScale]} castShadow material={sharedMaterial} />
            <mesh geometry={GEO.box} position={[wScale*0.26, 0.4*hScale, 0]} scale={[coreW, hScale * 0.82, wScale]} castShadow material={sharedMaterial} />
            <WindowPanels scale={[wScale + 0.03, hScale * 0.72, wScale * 0.88]} position={[0, 0.5 * hScale, 0]} color={baseColor} variant={variant} />
          </group>
        );
      case 3: // Circular Tower
        return (
          <group>
            <mesh geometry={GEO.cylinder} position={[0, 0.5 * hScale, 0]} scale={[wScale, hScale, wScale]} castShadow material={sharedMaterial} />
            <mesh position={[0, hScale, 0]} scale={[wScale * 1.15, 0.06, wScale * 1.15]}>
              <boxGeometry />
              <meshPhysicalMaterial color="#334155" metalness={1} roughness={0.1} />
            </mesh>
            <CyberLight position={[0, hScale * 0.5, wScale * 0.53]} color="#2dd4bf" scale={[1, 18, 1]} />
          </group>
        );
      default: // Floating Module
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.22 * hScale, 0]} scale={[wScale * 0.32, hScale * 0.45, wScale * 0.32]}>
              <meshPhysicalMaterial color="#1e293b" metalness={1} roughness={0.2} />
            </mesh>
            <mesh geometry={GEO.box} position={[0, 0.65 * hScale, 0]} scale={[wScale, 0.42 * hScale, wScale]} castShadow material={sharedMaterial} />
            <WindowPanels scale={[wScale + 0.02, 0.38 * hScale, wScale + 0.02]} position={[0, 0.65*hScale, 0]} color={baseColor} variant={variant} />
          </group>
        );
    }
  };

  const renderCommercial = () => {
    const arch = variant % 5;
    const fHeight = hScale * 2.0;

    switch(arch) {
      case 0: // Monolith
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.5 * fHeight, 0]} scale={[wScale, fHeight, wScale]} castShadow material={sharedMaterial} />
            <WindowPanels scale={[wScale + 0.08, fHeight * 0.88, wScale + 0.08]} position={[0, 0.5 * fHeight, 0]} color={baseColor} variant={variant} />
            <Antenna position={[0, fHeight, 0]} color="#a855f7" variant={variant} />
          </group>
        );
      case 1: // Tapered Spire
        return (
          <group>
             <mesh geometry={GEO.cone} position={[0, 0.5 * fHeight, 0]} scale={[wScale, fHeight, wScale]} castShadow material={sharedMaterial} />
             <WindowPanels scale={[wScale * 0.72, fHeight * 0.62, wScale * 0.72]} position={[0, 0.4 * fHeight, 0]} color={baseColor} variant={variant} />
             <Antenna position={[0, fHeight, 0]} color="#a855f7" variant={variant} />
          </group>
        );
      case 2: // Floating Ring
        return (
          <group>
              <mesh geometry={GEO.box} position={[0, 0.5 * fHeight, 0]} scale={[wScale * 0.55, fHeight, wScale * 0.55]} castShadow material={sharedMaterial} />
              <mesh geometry={GEO.torus} position={[0, fHeight * 0.82, 0]} rotation={[Math.PI/2, 0, 0]} scale={wScale * 1.35}>
                <meshPhysicalMaterial color={baseColor} emissive={baseColor} emissiveIntensity={5} metalness={1} roughness={0} />
              </mesh>
              <WindowPanels scale={[wScale * 0.45, fHeight * 0.92, wScale * 0.45]} position={[0, 0.5 * fHeight, 0]} color={baseColor} variant={variant} />
          </group>
        );
      case 3: // Sky-Bridge Towers
        return (
          <group>
            <mesh geometry={GEO.box} position={[-wScale*0.32, 0.5*fHeight, 0]} scale={[wScale*0.32, fHeight, wScale*0.75]} material={sharedMaterial} />
            <mesh geometry={GEO.box} position={[wScale*0.32, 0.5*fHeight, 0]} scale={[wScale*0.32, fHeight, wScale*0.75]} material={sharedMaterial} />
            <mesh position={[0, fHeight * 0.72, 0]} scale={[wScale*0.65, 0.12, wScale*0.45]}>
               <boxGeometry />
               <meshPhysicalMaterial color={baseColor} emissive={baseColor} emissiveIntensity={4} />
            </mesh>
          </group>
        );
      default: // Hollow Cube
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.5 * fHeight, 0]} scale={[wScale, fHeight, wScale]} castShadow>
               <meshPhysicalMaterial color="#0f172a" roughness={0.1} metalness={0.9} transparent opacity={0.65} clearcoat={1} iridescence={0.3} />
            </mesh>
            <mesh geometry={GEO.box} position={[0, 0.5 * fHeight, 0]} scale={[wScale * 0.62, fHeight + 0.12, wScale * 0.62]}>
               <meshBasicMaterial color="#000000" />
            </mesh>
            <CyberLight position={[0, fHeight*0.5, 0]} color={baseColor} scale={[wScale*8.5, wScale*8.5, wScale*8.5]} pulse />
          </group>
        );
    }
  };

  const renderIndustrial = () => {
    const arch = variant % 5;
    
    switch(arch) {
      case 0: // Silo Complex
        return (
          <group>
            {[[-0.22, -0.22], [0.22, -0.22], [0.22, 0.22], [-0.22, 0.22]].map((p, i) => (
               <mesh key={i} geometry={GEO.cylinder} position={[p[0], 0.45, p[1]]} scale={[0.38, 0.9, 0.38]} castShadow>
                  <meshPhysicalMaterial color="#1e293b" metalness={0.95} roughness={0.3} clearcoat={0.5} />
               </mesh>
            ))}
            <CyberLight position={[0, 0.55, 0.55]} color="#f59e0b" scale={[11, 0.55, 1]} pulse />
          </group>
        );
      case 1: // Refinery
        return (
          <group>
              <mesh geometry={GEO.box} position={[0, 0.38, 0]} scale={[1.15, 0.75, 1.15]} castShadow>
                <meshPhysicalMaterial color="#1e293b" roughness={0.4} metalness={0.85} clearcoat={0.2} />
              </mesh>
              <mesh scale={[0.16, 1.5, 0.16]} position={[0.32, 0.75, 0.32]}>
                 <cylinderGeometry />
                 <meshPhysicalMaterial color="#475569" metalness={1} roughness={0.2} />
              </mesh>
              <CyberLight position={[0.32, 1.5, 0.32]} color="#ef4444" pulse />
          </group>
        );
      case 2: // Energy Core
        return (
          <group>
             <mesh position={[0, 0.5, 0]} scale={0.72}>
                <sphereGeometry />
                <meshPhysicalMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={6} transparent opacity={0.65} metalness={0.5} roughness={0} />
             </mesh>
             <mesh position={[0, 0.5, 0]} rotation={[Date.now()*0.001, 0, 0]} scale={0.85}>
                <torusGeometry args={[0.5, 0.025, 8, 48]} />
                <meshBasicMaterial color="#ffffff" />
             </mesh>
          </group>
        );
      case 3: // Grid Factory
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.22, 0]} scale={[1.25, 0.45, 1.25]}>
               <meshPhysicalMaterial color="#1e293b" metalness={1} roughness={0.3} />
            </mesh>
            {[[-0.42, 0], [0.42, 0]].map((p, i) => (
               <mesh key={i} position={[p[0], 0.65, p[1]]} scale={[0.32, 0.85, 0.85]}>
                  <boxGeometry />
                  <meshPhysicalMaterial color="#334155" metalness={0.5} />
               </mesh>
            ))}
          </group>
        );
      default: // Venting Complex
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.28, 0]} scale={[1.05, 0.55, 1.05]}>
               <meshPhysicalMaterial color="#1e293b" roughness={0.55} clearcoat={0.1} />
            </mesh>
            <group position={[0, 0.55, 0]}>
               {[0, 1, 2].map(i => (
                 <mesh key={i} position={[-0.32 + i*0.32, 0.45, 0]} scale={[0.22, 0.9, 0.22]}>
                    <cylinderGeometry />
                    <meshPhysicalMaterial color="#475569" metalness={1} />
                 </mesh>
               ))}
            </group>
          </group>
        );
    }
  };

  const renderPark = () => {
    const arch = variant % 5;
    return (
      <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <planeGeometry args={[0.98, 0.98]} />
              <meshStandardMaterial color={variant % 2 === 0 ? "#064e3b" : "#065f46"} roughness={0.95} />
          </mesh>
          <group position={[0, 0.42, 0]}>
              {arch === 0 && (
                <mesh scale={0.42} geometry={GEO.sphere}>
                    <meshPhysicalMaterial color="#bef264" transparent opacity={0.7} emissive="#bef264" emissiveIntensity={5} metalness={0.2} roughness={0.1} />
                </mesh>
              )}
              {arch === 1 && (
                <mesh scale={0.42} geometry={GEO.octa} rotation={[Date.now()*0.001, 0, 0]}>
                    <meshPhysicalMaterial color="#bef264" metalness={1} roughness={0} emissive="#bef264" emissiveIntensity={8} clearcoat={1} />
                </mesh>
              )}
              {arch === 2 && (
                <mesh scale={[0.09, 1.1, 0.09]} geometry={GEO.box}>
                    <meshStandardMaterial color="#bef264" emissive="#bef264" emissiveIntensity={15} />
                </mesh>
              )}
              {arch === 3 && (
                <mesh rotation={[Math.PI/2, 0, 0]} scale={0.42} geometry={GEO.torus}>
                    <meshPhysicalMaterial color="#bef264" emissive="#bef264" emissiveIntensity={6} metalness={0.8} />
                </mesh>
              )}
              {arch === 4 && (
                <group>
                   <mesh position={[0, -0.32, 0]} scale={[0.85, 0.06, 0.85]}>
                      <boxGeometry />
                      <meshBasicMaterial color="#bef264" transparent opacity={0.25} />
                   </mesh>
                   <CyberLight position={[0, 0, 0]} color="#bef264" pulse scale={[1.5, 1.5, 1.5]} />
                </group>
              )}
          </group>
      </group>
    );
  };

  const renderWater = () => (
    <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <planeGeometry args={[1, 1]} />
            <meshPhysicalMaterial 
                color="#1d4ed8" 
                transmission={0.98} 
                thickness={5} 
                roughness={0} 
                metalness={0.8}
                transparent={transparent} 
                opacity={opacity * 0.98}
                clearcoat={1.0}
            />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.054, 0]}>
            <planeGeometry args={[0.92, 0.92]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.2} wireframe />
        </mesh>
    </group>
  );

  return (
    <group rotation={[0, rotation * (Math.PI/2), 0]}>
      {type === BuildingType.Residential && renderResidential()}
      {type === BuildingType.Commercial && renderCommercial()}
      {type === BuildingType.Industrial && renderIndustrial()}
      {type === BuildingType.Park && renderPark()}
      {type === BuildingType.Water && renderWater()}
    </group>
  );
});
