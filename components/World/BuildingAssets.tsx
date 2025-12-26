
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
};

const WindowPanels = ({ scale, color }: { scale: [number, number, number], color: string }) => {
    // Procedural window frame look using a single thin mesh or geometry
    return (
        <group scale={scale}>
            {/* Horizontal bands */}
            <mesh position={[0, 0.1, 0]} scale={[1.02, 0.02, 1.02]}>
                <boxGeometry />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
            </mesh>
            <mesh position={[0, -0.1, 0]} scale={[1.02, 0.02, 1.02]}>
                <boxGeometry />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
            </mesh>
            {/* Vertical corners */}
            <mesh position={[0, 0, 0]} scale={[0.9, 0.9, 0.9]}>
                <boxGeometry />
                <meshPhysicalMaterial 
                    color={color} 
                    metalness={1} 
                    roughness={0} 
                    transmission={0.8} 
                    thickness={0.5} 
                    transparent 
                    opacity={0.3} 
                />
            </mesh>
        </group>
    );
};

const CyberLight = ({ position, color, scale = [1, 1, 1], pulse = false }: any) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (pulse && ref.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.2;
      ref.current.scale.set(scale[0] * s, scale[1] * s, scale[2] * s);
    }
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <boxGeometry args={[0.05, 0.05, 0.05]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={15} />
    </mesh>
  );
};

const Antenna = ({ position, color }: any) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 10) * 0.1;
      ref.current.children[1].scale.set(s, s, s);
    }
  });
  return (
    <group position={position} ref={ref}>
      <mesh scale={[0.02, 0.4, 0.02]} position={[0, 0.2, 0]}>
        <boxGeometry />
        <meshStandardMaterial color="#334155" metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={20} />
      </mesh>
    </group>
  );
};

export const ProceduralBuilding = React.memo(({ type, baseColor, rotation, opacity = 1, transparent = false }: any) => {
  
  const renderResidential = () => (
    <group>
        <mesh geometry={GEO.box} position={[0, 0.5, 0]} scale={[0.8, 1.0, 0.8]} castShadow>
          <meshPhysicalMaterial 
            color="#0f172a" 
            roughness={0.05} 
            metalness={0.95}
            clearcoat={1.0}
            transparent={transparent}
            opacity={opacity}
          />
        </mesh>
        <mesh geometry={GEO.box} position={[0, 0.5, 0]} scale={[0.82, 0.85, 0.82]}>
          <meshPhysicalMaterial
            color={baseColor}
            roughness={0}
            metalness={1}
            transmission={0.9}
            thickness={2}
            transparent={transparent}
            opacity={opacity * 0.9}
          />
        </mesh>
        <WindowPanels scale={[0.83, 1.01, 0.83]} color={baseColor} />
        <CyberLight position={[0.42, 0.8, 0.42]} color="#2dd4bf" />
        <CyberLight position={[-0.42, 0.2, 0.42]} color="#2dd4bf" />
        <Antenna position={[0.2, 1, 0.2]} color="#2dd4bf" />
    </group>
  );

  const renderCommercial = () => (
    <group>
        <mesh geometry={GEO.box} position={[0, 0.7, 0]} scale={[0.9, 1.4, 0.9]} castShadow>
          <meshPhysicalMaterial 
            color="#0f172a" 
            roughness={0.05} 
            metalness={0.95}
            clearcoat={1.0}
            transparent={transparent}
            opacity={opacity}
          />
        </mesh>
        <mesh geometry={GEO.box} position={[0, 0.7, 0]} scale={[0.95, 0.6, 0.95]}>
          <meshPhysicalMaterial
            color={baseColor}
            roughness={0}
            metalness={1}
            transmission={0.9}
            thickness={2}
            transparent={transparent}
            opacity={opacity * 0.9}
          />
        </mesh>
        <WindowPanels scale={[0.96, 1.41, 0.96]} color={baseColor} />
        <Antenna position={[0, 1.4, 0]} color="#a855f7" />
        <CyberLight position={[0, 0.2, 0.46]} color="#a855f7" scale={[18, 0.2, 1]} />
    </group>
  );

  const renderIndustrial = () => (
    <group>
        <mesh geometry={GEO.box} position={[0, 0.4, 0]} scale={[1, 0.8, 1]} castShadow>
          <meshPhysicalMaterial 
            color="#1e293b" 
            roughness={0.4} 
            metalness={0.9}
            transparent={transparent}
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0.2, 0.9, 0.2]} scale={[0.3, 0.6, 0.3]}>
          <meshPhysicalMaterial color="#334155" roughness={0.1} metalness={1} clearcoat={1} />
        </mesh>
        <mesh position={[-0.2, 0.9, -0.2]} scale={[0.3, 0.6, 0.3]}>
          <meshPhysicalMaterial color="#334155" roughness={0.1} metalness={1} clearcoat={1} />
        </mesh>
        <CyberLight position={[0, 0.4, 0.51]} color="#f59e0b" scale={[15, 0.5, 1]} pulse />
    </group>
  );

  const renderPark = () => (
    <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[0.95, 0.95]} />
            <meshStandardMaterial color="#064e3b" roughness={1} />
        </mesh>
        <group position={[0, 0.3, 0]}>
            <mesh scale={[0.4, 0.8, 0.4]}>
                <cylinderGeometry args={[0.5, 0.5, 1, 6]} />
                <meshPhysicalMaterial 
                    color="#bef264" 
                    transparent 
                    opacity={0.5} 
                    emissive="#bef264" 
                    emissiveIntensity={2} 
                    metalness={0.5} 
                    roughness={0} 
                />
            </mesh>
            <CyberLight position={[0, 0.5, 0]} color="#bef264" pulse />
        </group>
    </group>
  );

  const renderWater = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <planeGeometry args={[0.98, 0.98]} />
        <meshPhysicalMaterial 
            color="#1d4ed8" 
            transmission={0.9} 
            thickness={3} 
            roughness={0.05} 
            metalness={0.6}
            transparent={transparent} 
            opacity={opacity * 0.8} 
        />
    </mesh>
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
