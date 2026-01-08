
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
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  fin: new THREE.BoxGeometry(0.02, 0.1, 0.6),
  torus: new THREE.TorusGeometry(0.3, 0.05, 8, 24),
  sphere: new THREE.SphereGeometry(0.5, 16, 16),
  octa: new THREE.OctahedronGeometry(0.5),
  cone: new THREE.ConeGeometry(0.5, 1, 16),
};

const HeatSinks = ({ position, rotation = 0, scale = 1 }: { position: [number, number, number], rotation?: number, scale?: number }) => (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
        {[0, 0.15, -0.15].map((z, i) => (
            <mesh key={i} geometry={GEO.fin} position={[0, 0, z]}>
                <meshPhysicalMaterial color="#334155" metalness={1} roughness={0.1} />
            </mesh>
        ))}
    </group>
);

// Added position to WindowPanels prop type to fix build error and allow modular positioning.
const WindowPanels = ({ scale, color, variant = 0, position = [0, 0, 0] }: { scale: [number, number, number], color: string, variant?: number, position?: [number, number, number] | number[] }) => {
    return (
        <group scale={scale} position={position as any}>
            <mesh scale={[0.96, 0.96, 0.96]}>
                <boxGeometry />
                <meshPhysicalMaterial 
                    color={color} 
                    metalness={1} 
                    roughness={0} 
                    transmission={0.95} 
                    thickness={0.8} 
                    transparent 
                    opacity={0.45} 
                    clearcoat={1}
                />
            </mesh>
            <mesh scale={[1.005, 1.005, 1.005]}>
                <boxGeometry />
                <meshBasicMaterial 
                    color="#ffffff" 
                    transparent 
                    opacity={variant % 2 === 0 ? 0.03 : 0.07} 
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
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={25} />
    </mesh>
  );
};

const Antenna = ({ position, color, variant = 0 }: any) => {
  const ref = useRef<THREE.Group>(null);
  const pulseSpeed = useMemo(() => 6 + (variant % 14), [variant]);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * pulseSpeed) * 0.35;
      ref.current.children[1].scale.set(s, s, s);
    }
  });
  
  return (
    <group position={position} ref={ref}>
      <mesh scale={[0.015, 0.4 + (variant % 6) * 0.1, 0.015]} position={[0, 0.2, 0]}>
        <boxGeometry />
        <meshStandardMaterial color="#475569" metalness={1} roughness={0.05} />
      </mesh>
      <mesh position={[0, 0.4 + (variant % 6) * 0.1, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={50} />
      </mesh>
    </group>
  );
};

export const ProceduralBuilding = React.memo(({ type, baseColor, rotation, variant = 0, opacity = 1, transparent = false }: any) => {
  
  const hScale = useMemo(() => 0.8 + (variant % 10) * 0.12, [variant]);
  const wScale = useMemo(() => 0.65 + (variant % 6) * 0.05, [variant]);

  const renderResidential = () => {
    const arch = variant % 5;
    
    switch(arch) {
      case 0: // Monolith
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.5 * hScale, 0]} scale={[wScale, hScale, wScale]} castShadow>
              <meshPhysicalMaterial color="#0f172a" roughness={0.01} metalness={0.95} clearcoat={1.0} transparent={transparent} opacity={opacity} />
            </mesh>
            <WindowPanels scale={[wScale + 0.01, hScale - 0.05, wScale + 0.01]} position={[0, 0.5 * hScale, 0]} color={baseColor} variant={variant} />
            <CyberLight position={[wScale * 0.52, hScale * 0.9, wScale * 0.52]} color="#2dd4bf" />
            <Antenna position={[0, hScale, 0]} color="#2dd4bf" variant={variant} />
          </group>
        );
      case 1: // Terraced
        return (
          <group>
            {[0, 1, 2].map(i => {
               const h = hScale * (1 - i * 0.3);
               const w = wScale * (1 - i * 0.1);
               return (
                 <group key={i} position={[0, i * 0.25, 0]}>
                    <mesh geometry={GEO.box} position={[0, 0.5 * h, 0]} scale={[w, h, w]} castShadow>
                      <meshPhysicalMaterial color="#0f172a" roughness={0.01} metalness={0.95} clearcoat={1.0} transparent={transparent} opacity={opacity} />
                    </mesh>
                    <WindowPanels scale={[w + 0.01, h - 0.02, w + 0.01]} position={[0, 0.5 * h, 0]} color={baseColor} variant={variant + i} />
                 </group>
               );
            })}
          </group>
        );
      case 2: // Dual-Core
        const coreW = wScale * 0.45;
        return (
          <group>
            <mesh geometry={GEO.box} position={[-wScale*0.25, 0.5*hScale, 0]} scale={[coreW, hScale, wScale]} castShadow>
               <meshPhysicalMaterial color="#0f172a" roughness={0.01} metalness={0.95} transparent={transparent} opacity={opacity} />
            </mesh>
            <mesh geometry={GEO.box} position={[wScale*0.25, 0.4*hScale, 0]} scale={[coreW, hScale * 0.8, wScale]} castShadow>
               <meshPhysicalMaterial color="#0f172a" roughness={0.01} metalness={0.95} transparent={transparent} opacity={opacity} />
            </mesh>
            <WindowPanels scale={[wScale + 0.02, hScale * 0.7, wScale * 0.85]} position={[0, 0.5 * hScale, 0]} color={baseColor} variant={variant} />
          </group>
        );
      case 3: // Circular Tower
        return (
          <group>
            <mesh geometry={GEO.cylinder} position={[0, 0.5 * hScale, 0]} scale={[wScale, hScale, wScale]} castShadow>
              <meshPhysicalMaterial color="#0f172a" roughness={0.01} metalness={0.95} clearcoat={1.0} transparent={transparent} opacity={opacity} />
            </mesh>
            <mesh position={[0, hScale, 0]} scale={[wScale * 1.1, 0.05, wScale * 1.1]}>
              <boxGeometry />
              <meshPhysicalMaterial color="#334155" metalness={1} />
            </mesh>
            <CyberLight position={[0, hScale * 0.5, wScale * 0.52]} color="#2dd4bf" scale={[1, 15, 1]} />
          </group>
        );
      default: // Floating Module
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.2 * hScale, 0]} scale={[wScale * 0.3, hScale * 0.4, wScale * 0.3]}>
              <meshPhysicalMaterial color="#1e293b" metalness={1} />
            </mesh>
            <mesh geometry={GEO.box} position={[0, 0.6 * hScale, 0]} scale={[wScale, 0.4 * hScale, wScale]} castShadow>
              <meshPhysicalMaterial color="#0f172a" roughness={0} metalness={1} transparent={transparent} opacity={opacity} />
            </mesh>
            <WindowPanels scale={[wScale + 0.02, 0.35 * hScale, wScale + 0.02]} position={[0, 0.6*hScale, 0]} color={baseColor} variant={variant} />
          </group>
        );
    }
  };

  const renderCommercial = () => {
    const arch = variant % 5;
    const fHeight = hScale * 1.8;

    switch(arch) {
      case 0: // Monolith
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.5 * fHeight, 0]} scale={[wScale, fHeight, wScale]} castShadow>
              <meshPhysicalMaterial color="#0f172a" roughness={0.01} metalness={0.95} clearcoat={1.0} transparent={transparent} opacity={opacity} />
            </mesh>
            <WindowPanels scale={[wScale + 0.06, fHeight * 0.85, wScale + 0.06]} position={[0, 0.5 * fHeight, 0]} color={baseColor} variant={variant} />
            <Antenna position={[0, fHeight, 0]} color="#a855f7" variant={variant} />
          </group>
        );
      case 1: // Tapered Spire
        return (
          <group>
             <mesh geometry={GEO.cone} position={[0, 0.5 * fHeight, 0]} scale={[wScale, fHeight, wScale]} castShadow>
               <meshPhysicalMaterial color="#0f172a" roughness={0.01} metalness={0.95} clearcoat={1.0} transparent={transparent} opacity={opacity} />
             </mesh>
             <WindowPanels scale={[wScale * 0.7, fHeight * 0.6, wScale * 0.7]} position={[0, 0.4 * fHeight, 0]} color={baseColor} variant={variant} />
             <Antenna position={[0, fHeight, 0]} color="#a855f7" variant={variant} />
          </group>
        );
      case 2: // Floating Ring
        return (
          <group>
              <mesh geometry={GEO.box} position={[0, 0.5 * fHeight, 0]} scale={[wScale * 0.5, fHeight, wScale * 0.5]} castShadow>
                <meshPhysicalMaterial color="#0f172a" roughness={0} metalness={1} transparent={transparent} opacity={opacity} />
              </mesh>
              <mesh geometry={GEO.torus} position={[0, fHeight * 0.8, 0]} rotation={[Math.PI/2, 0, 0]} scale={wScale * 1.3}>
                <meshPhysicalMaterial color={baseColor} emissive={baseColor} emissiveIntensity={3} metalness={1} roughness={0} />
              </mesh>
              <WindowPanels scale={[wScale * 0.4, fHeight * 0.9, wScale * 0.4]} position={[0, 0.5 * fHeight, 0]} color={baseColor} variant={variant} />
          </group>
        );
      case 3: // Sky-Bridge Towers
        return (
          <group>
            <mesh geometry={GEO.box} position={[-wScale*0.3, 0.5*fHeight, 0]} scale={[wScale*0.3, fHeight, wScale*0.7]}>
              <meshPhysicalMaterial color="#0f172a" metalness={1} />
            </mesh>
            <mesh geometry={GEO.box} position={[wScale*0.3, 0.5*fHeight, 0]} scale={[wScale*0.3, fHeight, wScale*0.7]}>
              <meshPhysicalMaterial color="#0f172a" metalness={1} />
            </mesh>
            <mesh position={[0, fHeight * 0.7, 0]} scale={[wScale*0.6, 0.1, wScale*0.4]}>
               <boxGeometry />
               <meshPhysicalMaterial color={baseColor} emissive={baseColor} emissiveIntensity={2} />
            </mesh>
          </group>
        );
      default: // Hollow Cube
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.5 * fHeight, 0]} scale={[wScale, fHeight, wScale]} castShadow>
               <meshPhysicalMaterial color="#0f172a" roughness={0.1} metalness={0.9} transparent opacity={0.6} />
            </mesh>
            <mesh geometry={GEO.box} position={[0, 0.5 * fHeight, 0]} scale={[wScale * 0.6, fHeight + 0.1, wScale * 0.6]}>
               <meshBasicMaterial color="#000000" />
            </mesh>
            <CyberLight position={[0, fHeight*0.5, 0]} color={baseColor} scale={[wScale*8, wScale*8, wScale*8]} pulse />
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
            {[[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]].map((p, i) => (
               <mesh key={i} geometry={GEO.cylinder} position={[p[0], 0.4, p[1]]} scale={[0.35, 0.8, 0.35]} castShadow>
                  <meshPhysicalMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
               </mesh>
            ))}
            <CyberLight position={[0, 0.5, 0.5]} color="#f59e0b" scale={[10, 0.5, 1]} pulse />
          </group>
        );
      case 1: // Refinery
        return (
          <group>
              <mesh geometry={GEO.box} position={[0, 0.35, 0]} scale={[1.1, 0.7, 1.1]} castShadow>
                <meshPhysicalMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
              </mesh>
              <mesh scale={[0.15, 1.4, 0.15]} position={[0.3, 0.7, 0.3]}>
                 <cylinderGeometry />
                 <meshPhysicalMaterial color="#475569" metalness={1} />
              </mesh>
              <CyberLight position={[0.3, 1.4, 0.3]} color="#ef4444" pulse />
          </group>
        );
      case 2: // Energy Core
        return (
          <group>
             <mesh position={[0, 0.5, 0]} scale={0.7}>
                <sphereGeometry />
                <meshPhysicalMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={4} transparent opacity={0.6} />
             </mesh>
             <mesh position={[0, 0.5, 0]} rotation={[Date.now()*0.001, 0, 0]} scale={0.8}>
                <torusGeometry args={[0.5, 0.02, 8, 32]} />
                <meshBasicMaterial color="#ffffff" />
             </mesh>
          </group>
        );
      case 3: // Grid Factory
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.2, 0]} scale={[1.2, 0.4, 1.2]}>
               <meshPhysicalMaterial color="#1e293b" metalness={1} />
            </mesh>
            {[[-0.4, 0], [0.4, 0]].map((p, i) => (
               <mesh key={i} position={[p[0], 0.6, p[1]]} scale={[0.3, 0.8, 0.8]}>
                  <boxGeometry />
                  <meshPhysicalMaterial color="#334155" />
               </mesh>
            ))}
          </group>
        );
      default: // Venting Complex
        return (
          <group>
            <mesh geometry={GEO.box} position={[0, 0.25, 0]} scale={[1, 0.5, 1]}>
               <meshPhysicalMaterial color="#1e293b" roughness={0.5} />
            </mesh>
            <group position={[0, 0.5, 0]}>
               {[0, 1, 2].map(i => (
                 <mesh key={i} position={[-0.3 + i*0.3, 0.4, 0]} scale={[0.2, 0.8, 0.2]}>
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
              <meshStandardMaterial color={variant % 2 === 0 ? "#064e3b" : "#065f46"} roughness={0.9} />
          </mesh>
          <group position={[0, 0.4, 0]}>
              {arch === 0 && (
                <mesh scale={0.4} geometry={GEO.sphere}>
                    <meshPhysicalMaterial color="#bef264" transparent opacity={0.7} emissive="#bef264" emissiveIntensity={3} />
                </mesh>
              )}
              {arch === 1 && (
                <mesh scale={0.4} geometry={GEO.octa} rotation={[Date.now()*0.001, 0, 0]}>
                    <meshPhysicalMaterial color="#bef264" metalness={1} roughness={0} emissive="#bef264" emissiveIntensity={5} />
                </mesh>
              )}
              {arch === 2 && (
                <mesh scale={[0.08, 1, 0.08]} geometry={GEO.box}>
                    <meshStandardMaterial color="#bef264" emissive="#bef264" emissiveIntensity={10} />
                </mesh>
              )}
              {arch === 3 && (
                <mesh rotation={[Math.PI/2, 0, 0]} scale={0.4} geometry={GEO.torus}>
                    <meshPhysicalMaterial color="#bef264" emissive="#bef264" emissiveIntensity={4} />
                </mesh>
              )}
              {arch === 4 && (
                <group>
                   <mesh position={[0, -0.3, 0]} scale={[0.8, 0.05, 0.8]}>
                      <boxGeometry />
                      <meshBasicMaterial color="#bef264" transparent opacity={0.2} />
                   </mesh>
                   <CyberLight position={[0, 0, 0]} color="#bef264" pulse />
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
                thickness={4} 
                roughness={0} 
                metalness={0.7}
                transparent={transparent} 
                opacity={opacity * 0.95} 
            />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.052, 0]}>
            <planeGeometry args={[0.9, 0.9]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.15} wireframe />
        </mesh>
        {variant % 8 === 0 && (
          <group position={[((variant*3)%10)/20-0.25, 0.06, ((variant*7)%10)/20-0.25]}>
             <mesh scale={0.04}>
                <sphereGeometry />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={8} />
             </mesh>
          </group>
        )}
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
