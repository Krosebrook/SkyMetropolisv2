
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BuildingType } from '../../types';

// --- Types ---
interface MaterialProps extends THREE.MeshStandardMaterialParameters {
    flatShading?: boolean;
    opacity?: number;
    transparent?: boolean;
    roughness?: number;
    metalness?: number;
}

interface CommonMeshProps {
    position?: [number, number, number];
    scale?: [number, number, number];
    rotation?: [number, number, number];
    castShadow?: boolean;
    receiveShadow?: boolean;
}

interface BuildingProps {
  type: BuildingType;
  baseColor: string;
  variant: number;
  rotation: number;
  opacity?: number;
  transparent?: boolean;
}

// --- Geometries ---
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 4),
  plane: new THREE.PlaneGeometry(1, 1, 24, 24),
};

const SHARED_MATS = {
    concrete: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.8, metalness: 0.1 }),
};

const WindowBlock: React.FC<CommonMeshProps & { intensity?: number }> = ({ position, scale, intensity = 1.2 }) => (
  <mesh geometry={GEO.box} position={position} scale={scale}>
    <meshStandardMaterial 
        color="#fff9db" 
        emissive="#fde047" 
        emissiveIntensity={intensity} 
        roughness={0.0} 
        metalness={1.0} 
    />
  </mesh>
);

const WaterAsset = ({ opacity = 0.95 }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const sparkleRef = useRef<THREE.Points>(null);
    
    const sparkleGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const count = 30;
        const positions = new Float32Array(count * 3);
        for(let i=0; i<count; i++) {
            positions[i*3] = (Math.random() - 0.5) * 0.95;
            positions[i*3+1] = (Math.random() - 0.5) * 0.95;
            positions[i*3+2] = 0.08;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geo;
    }, []);

    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();
        if (meshRef.current) {
            const pos = meshRef.current.geometry.attributes.position;
            const mat = meshRef.current.material as THREE.MeshStandardMaterial;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = Math.sin(x * 5 + time * 2) * 0.05 + Math.cos(y * 5 + time) * 0.05;
                pos.setZ(i, z);
            }
            pos.needsUpdate = true;
            mat.emissiveIntensity = 0.6 + Math.sin(time * 3) * 0.4; // Pulse effect
        }
        if (sparkleRef.current) {
            sparkleRef.current.material.opacity = (Math.sin(time * 15) + 1) / 2;
        }
    });

    return (
        <group>
            <mesh ref={meshRef} geometry={GEO.plane} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
                <meshStandardMaterial 
                    color="#0891b2" 
                    metalness={1.0} 
                    roughness={0.0} 
                    emissive="#06b6d4" 
                    emissiveIntensity={1.0} 
                    transparent 
                    opacity={opacity} 
                />
            </mesh>
            <points ref={sparkleRef} geometry={sparkleGeo} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.1, 0]}>
                <pointsMaterial color="white" size={0.08} transparent />
            </points>
        </group>
    );
};

export const ProceduralBuilding = React.memo(({ type, baseColor, variant, rotation, opacity = 1, transparent = false }: BuildingProps) => {
  const commonProps = { castShadow: true, receiveShadow: true };
  const matProps: MaterialProps = { flatShading: false, opacity, transparent, roughness: 0.35, metalness: 0.2 };
  
  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    if (!transparent) c.offsetHSL(0, 0, (variant % 10 - 5) / 100);
    return c;
  }, [baseColor, variant, transparent]);

  const materials = useMemo(() => ({
    main: new THREE.MeshStandardMaterial({ color: color, ...matProps }),
    roof: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.6), ...matProps, roughness: 0.8 }),
  }), [color, matProps]);
  
  const yOffset = -0.3;

  const renderResidential = () => (
    <group>
        <mesh {...commonProps} material={variant < 50 ? materials.main : SHARED_MATS.concrete} geometry={GEO.box} position={[0, 0.45, 0]} scale={[0.85, 0.9, 0.85]} />
        <mesh {...commonProps} material={materials.roof} geometry={GEO.cone} position={[0, 1.0, 0]} scale={[0.9, 0.5, 0.9]} rotation={[0, Math.PI/4, 0]} />
        <WindowBlock position={[0, 0.5, 0.44]} scale={[0.6, 0.5, 0.02]} />
    </group>
  );

  const renderCommercial = () => (
    <group>
        <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.55, 0]} scale={[0.95, 1.1, 0.95]} />
        <WindowBlock position={[0, 0.7, 0.48]} scale={[0.8, 0.3, 0.02]} />
        <WindowBlock position={[0, 0.3, 0.48]} scale={[0.8, 0.2, 0.02]} />
    </group>
  );

  const renderIndustrial = () => (
    <group>
        <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.5, 0]} scale={[1.1, 1, 1.1]} />
        <mesh geometry={GEO.cylinder} position={[-0.4, 1.0, -0.4]} scale={[0.2, 0.8, 0.2]} {...commonProps}>
            <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh geometry={GEO.cylinder} position={[0.4, 1.0, 0.4]} scale={[0.2, 0.8, 0.2]} {...commonProps}>
            <meshStandardMaterial color="#475569" />
        </mesh>
    </group>
  );

  const renderPark = () => (
    <group position={[0, -0.25, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[0.98, 0.98]} />
            <meshStandardMaterial color="#065f46" roughness={1.0} />
        </mesh>
        <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#064e3b'})} geometry={GEO.cone} position={[0, 0.6, 0]} scale={[0.6, 1.2, 0.6]} />
    </group>
  );

  return (
    <group rotation={[0, rotation * (Math.PI/2), 0]} position={[0, yOffset, 0]}>
      {type === BuildingType.Residential && renderResidential()}
      {type === BuildingType.Commercial && renderCommercial()}
      {type === BuildingType.Industrial && renderIndustrial()}
      {type === BuildingType.Park && renderPark()}
      {type === BuildingType.Water && <WaterAsset opacity={opacity} />}
    </group>
  );
});
