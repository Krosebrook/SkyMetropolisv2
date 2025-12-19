/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import * as THREE from 'three';
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

interface DetailBlockProps extends CommonMeshProps {
    color: string;
    matProps?: MaterialProps;
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
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 4),
  dome: new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
};

// --- Static Materials for Global Use ---
const SHARED_MATS = {
    glass: new THREE.MeshStandardMaterial({ color: '#a5f3fc', metalness: 1.0, roughness: 0.02, transparent: true, opacity: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.1 }),
    concrete: new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.7, metalness: 0.2 }),
    wood: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 }),
    brick: new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.7 }),
    water: new THREE.MeshStandardMaterial({ color: '#0ea5e9', metalness: 0.9, roughness: 0.05 }),
    solar: new THREE.MeshStandardMaterial({ color: '#172554', metalness: 0.7, roughness: 0.1 }),
};

// --- Helpers ---
const DetailBlock: React.FC<DetailBlockProps> = ({ position, scale, color, matProps, ...rest }) => (
  <mesh geometry={GEO.box} position={position} scale={scale} castShadow receiveShadow {...rest}>
    <meshStandardMaterial color={color} {...matProps} />
  </mesh>
);

const WindowBlock: React.FC<CommonMeshProps> = ({ position, scale }) => (
  <mesh geometry={GEO.box} position={position} scale={scale}>
    <meshStandardMaterial 
        color="#fef9c3" 
        emissive="#fef08a" 
        emissiveIntensity={0.8} 
        roughness={0.0} 
        metalness={1.0} 
    />
  </mesh>
);

const ACUnit: React.FC<CommonMeshProps> = ({ position, scale }) => (
    <group position={position} scale={scale}>
        <mesh geometry={GEO.box} castShadow receiveShadow>
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh geometry={GEO.cylinder} position={[0, 0.5, 0]} scale={[0.3, 0.1, 0.3]}>
            <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
    </group>
);

export const ProceduralBuilding = React.memo(({ type, baseColor, variant, rotation, opacity = 1, transparent = false }: BuildingProps) => {
  const commonProps = { castShadow: true, receiveShadow: true };
  const matProps: MaterialProps = { flatShading: false, opacity, transparent, roughness: 0.4, metalness: 0.15 };
  
  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    if (!transparent) {
        c.offsetHSL(0, 0, (variant % 10 - 5) / 100);
    }
    return c;
  }, [baseColor, variant, transparent]);

  const materials = useMemo(() => ({
    main: new THREE.MeshStandardMaterial({ color: color, ...matProps }),
    roof: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), ...matProps, roughness: 0.6 }),
    accent: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL(0,0,-0.1), ...matProps, metalness: 0.4 }),
  }), [color, matProps]);
  
  const yOffset = -0.3;

  const renderResidential = () => {
      if (variant < 25) {
        return (
            <group>
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.cone} position={[0, 0.75, 0]} scale={[0.6, 0.4, 0.6]} rotation={[0, Math.PI/4, 0]} />
                <WindowBlock position={[0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                <WindowBlock position={[-0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                <DetailBlock position={[0.2, 0.7, -0.1]} scale={[0.1, 0.3, 0.1]} color="#78350f" matProps={matProps} />
                <mesh {...commonProps} material={SHARED_MATS.wood} geometry={GEO.box} position={[0, 0.1, 0.35]} scale={[0.3, 0.1, 0.2]} />
                {variant % 2 === 0 && (
                     <mesh {...commonProps} material={SHARED_MATS.brick} geometry={GEO.box} position={[0.2, 0.7, 0.1]} scale={[0.1, 0.4, 0.1]} />
                )}
            </group>
        );
      }
      if (variant < 50) {
          return (
            <group>
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[-0.15, 0.3, 0]} scale={[0.5, 0.6, 0.6]} />
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0.2, 0.25, 0.1]} scale={[0.3, 0.5, 0.4]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.cone} position={[-0.15, 0.7, 0]} scale={[0.4, 0.3, 0.4]} rotation={[0, Math.PI/4, 0]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0.2, 0.55, 0.1]} scale={[0.35, 0.1, 0.45]} />
                <DetailBlock position={[0.2, 0.15, 0.31]} scale={[0.2, 0.25, 0.05]} color="#94a3b8" matProps={matProps} />
                <WindowBlock position={[-0.15, 0.3, 0.31]} scale={[0.2, 0.2, 0.05]} />
            </group>
          );
      }
      if (variant < 75) {
          return (
            <group>
                <mesh {...commonProps} material={SHARED_MATS.brick} geometry={GEO.box} position={[-0.15, 0.4, 0]} scale={[0.4, 0.8, 0.7]} />
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0.15, 0.35, 0]} scale={[0.4, 0.7, 0.7]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0, 0.8, 0]} scale={[0.8, 0.1, 0.8]} />
                <WindowBlock position={[-0.15, 0.5, 0.36]} scale={[0.2, 0.2, 0.05]} />
                <WindowBlock position={[0.15, 0.4, 0.36]} scale={[0.2, 0.2, 0.05]} />
                <mesh {...commonProps} material={SHARED_MATS.concrete} geometry={GEO.box} position={[0, 0.05, 0.4]} scale={[0.8, 0.1, 0.2]} />
            </group>
          );
      }
      return (
        <group>
            <mesh {...commonProps} material={SHARED_MATS.concrete} geometry={GEO.box} position={[-0.1, 0.3, 0]} scale={[0.6, 0.6, 0.8]} />
            <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0.1, 0.7, 0]} scale={[0.5, 0.4, 0.9]} />
            <WindowBlock position={[-0.1, 0.3, 0.41]} scale={[0.4, 0.4, 0.05]} />
            <WindowBlock position={[0.2, 0.7, 0.46]} scale={[0.3, 0.3, 0.05]} />
            <mesh {...commonProps} material={SHARED_MATS.water} geometry={GEO.box} position={[0.3, 0.1, 0.2]} scale={[0.3, 0.05, 0.4]} />
            <mesh {...commonProps} material={SHARED_MATS.wood} geometry={GEO.box} position={[0.3, 0.1, -0.2]} scale={[0.3, 0.05, 0.3]} />
            <mesh {...commonProps} material={SHARED_MATS.solar} geometry={GEO.box} position={[0.1, 0.92, 0]} scale={[0.4, 0.02, 0.7]} rotation={[0.1,0,0]} />
        </group>
      );
  };

  const renderCommercial = () => {
    if (variant < 30) {
        return (
            <group>
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                <WindowBlock position={[0, 0.4, 0.41]} scale={[0.7, 0.4, 0.05]} />
                <mesh {...commonProps} material={materials.accent} geometry={GEO.box} position={[0, 0.55, 0.5]} scale={[0.9, 0.05, 0.2]} rotation={[0.2, 0, 0]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0, 0.85, 0]} scale={[0.95, 0.1, 0.85]} />
                <ACUnit position={[0, 0.95, 0]} scale={[0.2, 0.2, 0.2]} />
            </group>
        );
    }
    if (variant < 85) {
        return (
            <group>
                 <mesh {...commonProps} material={SHARED_MATS.glass} geometry={GEO.box} position={[0, 0.75, 0]} scale={[0.6, 1.5, 0.6]} />
                 <mesh {...commonProps} material={SHARED_MATS.concrete} geometry={GEO.box} position={[0, 0.75, 0]} scale={[0.5, 1.55, 0.5]} />
                 <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.1, 0]} scale={[0.7, 0.2, 0.7]} />
                 <mesh {...commonProps} material={SHARED_MATS.metal} geometry={GEO.box} position={[0, 1.5, 0]} scale={[0.6, 0.1, 0.6]} />
                 <mesh {...commonProps} material={SHARED_MATS.metal} geometry={GEO.cylinder} position={[0, 1.6, 0]} scale={[0.02, 0.4, 0.02]} />
            </group>
        );
    }
    return (
        <group>
             <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 1.25, 0]} scale={[0.6, 2.5, 0.6]} />
             <mesh {...commonProps} material={SHARED_MATS.glass} geometry={GEO.box} position={[0.31, 1.25, 0]} scale={[0.05, 2.4, 0.4]} />
             <mesh {...commonProps} material={SHARED_MATS.glass} geometry={GEO.box} position={[-0.31, 1.25, 0]} scale={[0.05, 2.4, 0.4]} />
             <mesh {...commonProps} material={SHARED_MATS.glass} geometry={GEO.box} position={[0, 1.25, 0.31]} scale={[0.4, 2.4, 0.05]} />
             <mesh {...commonProps} material={SHARED_MATS.glass} geometry={GEO.box} position={[0, 1.25, -0.31]} scale={[0.4, 2.4, 0.05]} />
             <mesh {...commonProps} material={SHARED_MATS.metal} geometry={GEO.cone} position={[0, 2.6, 0]} scale={[0.1, 0.5, 0.1]} />
             <mesh position={[0, 2.85, 0]}>
                 <sphereGeometry args={[0.05]} />
                 <meshBasicMaterial color="#ff0000" />
             </mesh>
        </group>
    );
  };

  const renderIndustrial = () => {
    if (variant < 40) {
        return (
            <group>
                <mesh {...commonProps} material={SHARED_MATS.brick} geometry={GEO.box} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[-0.22, 0.85, 0]} scale={[0.45, 0.15, 0.8]} rotation={[0,0,Math.PI/6]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0.22, 0.85, 0]} scale={[0.45, 0.15, 0.8]} rotation={[0,0,Math.PI/6]} />
                <mesh {...commonProps} material={SHARED_MATS.concrete} geometry={GEO.cylinder} position={[0.35, 0.8, 0.3]} scale={[0.1, 1.4, 0.1]} />
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#111', roughness: 0.1, metalness: 0.9})} geometry={GEO.cylinder} position={[0.35, 1.5, 0.3]} scale={[0.08, 0.05, 0.08]} />
                {variant % 2 === 0 && <ACUnit position={[-0.2, 0.9, -0.2]} scale={[0.3, 0.2, 0.3]} />}
            </group>
        );
    }
    return (
        <group>
            <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.35, 0]} scale={[0.9, 0.7, 0.9]} />
            <mesh {...commonProps} material={SHARED_MATS.metal} geometry={GEO.box} position={[0, 0.71, 0]} scale={[0.8, 0.05, 0.8]} />
            <DetailBlock position={[-0.25, 0.8, 0]} scale={[0.2, 0.2, 0.2]} color="#94a3b8" matProps={{ roughness: 0.3, metalness: 0.8 }} />
            <DetailBlock position={[0.25, 0.8, 0]} scale={[0.2, 0.2, 0.2]} color="#94a3b8" matProps={{ roughness: 0.3, metalness: 0.8 }} />
            <mesh {...commonProps} material={SHARED_MATS.solar} geometry={GEO.box} position={[0, 0.75, 0]} scale={[0.5, 0.02, 0.5]} />
        </group>
    );
  };

  const renderPark = () => {
    const base = (
         <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[0.9, 0.9]} />
            <meshStandardMaterial color="#4ade80" roughness={1.0} metalness={0.0} />
        </mesh>
    );

    if (variant < 40) {
        return (
            <group position={[0, -0.25, 0]}>
                {base}
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#166534', roughness: 0.8})} geometry={GEO.cone} position={[0.2, 0.3, 0.2]} scale={[0.3, 0.6, 0.3]} />
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#14532d', roughness: 0.8})} geometry={GEO.cone} position={[-0.2, 0.4, -0.2]} scale={[0.4, 0.8, 0.4]} />
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#166534', roughness: 0.8})} geometry={GEO.cone} position={[-0.3, 0.25, 0.3]} scale={[0.25, 0.5, 0.25]} />
            </group>
        );
    }
    if (variant < 70) {
        return (
            <group position={[0, -0.25, 0]}>
                {base}
                <mesh {...commonProps} material={SHARED_MATS.concrete} geometry={GEO.cylinder} position={[0, 0.1, 0]} scale={[0.6, 0.2, 0.6]} />
                <mesh {...commonProps} material={SHARED_MATS.water} geometry={GEO.cylinder} position={[0, 0.15, 0]} scale={[0.5, 0.15, 0.5]} />
                <mesh {...commonProps} material={SHARED_MATS.wood} geometry={GEO.box} position={[0.35, 0.1, 0]} scale={[0.1, 0.15, 0.3]} />
            </group>
        );
    }
    return (
        <group position={[0, -0.25, 0]}>
            {base}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <planeGeometry args={[0.8, 0.6]} />
                <meshStandardMaterial color={variant % 2 === 0 ? "#2563eb" : "#dc2626"} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh {...commonProps} material={SHARED_MATS.metal} geometry={GEO.cylinder} position={[0, 0.3, -0.25]} scale={[0.05, 0.6, 0.05]} />
        </group>
    );
  };

  return (
    <group rotation={[0, rotation * (Math.PI/2), 0]} position={[0, yOffset, 0]}>
      {type === BuildingType.Residential && renderResidential()}
      {type === BuildingType.Commercial && renderCommercial()}
      {type === BuildingType.Industrial && renderIndustrial()}
      {type === BuildingType.Park && renderPark()}
    </group>
  );
});
