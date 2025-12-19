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
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12), // Smoother cylinders
  cone: new THREE.ConeGeometry(1, 1, 4),
  dome: new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
};

// --- Static Materials for Global Use ---
const SHARED_MATS = {
    glass: new THREE.MeshStandardMaterial({ color: '#bae6fd', metalness: 1.0, roughness: 0.05, transparent: true, opacity: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.15 }),
    concrete: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.8, metalness: 0.1 }),
    wood: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.95 }),
    brick: new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.75 }),
    water: new THREE.MeshStandardMaterial({ color: '#0ea5e9', metalness: 1.0, roughness: 0.1, emissive: '#0284c7', emissiveIntensity: 0.2 }),
    solar: new THREE.MeshStandardMaterial({ color: '#1e1b4b', metalness: 0.8, roughness: 0.05, emissive: '#1e40af', emissiveIntensity: 0.3 }),
    roofGravel: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 1.0, metalness: 0.0 }),
};

// --- Helpers ---
const DetailBlock: React.FC<DetailBlockProps> = ({ position, scale, color, matProps, ...rest }) => (
  <mesh geometry={GEO.box} position={position} scale={scale} castShadow receiveShadow {...rest}>
    <meshStandardMaterial color={color} {...matProps} />
  </mesh>
);

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

const ACUnit: React.FC<CommonMeshProps> = ({ position, scale }) => (
    <group position={position} scale={scale}>
        <mesh geometry={GEO.box} castShadow receiveShadow>
            <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh geometry={GEO.cylinder} position={[0, 0.5, 0]} scale={[0.3, 0.1, 0.3]}>
            <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </mesh>
    </group>
);

const RoofDetail: React.FC<CommonMeshProps> = ({ position, scale }) => (
    <group position={position} scale={scale}>
        <mesh geometry={GEO.box} scale={[0.8, 0.05, 0.8]} position={[0, 0.025, 0]} material={SHARED_MATS.roofGravel} receiveShadow />
        <mesh geometry={GEO.box} scale={[0.1, 0.1, 0.1]} position={[0.2, 0.1, 0.2]} material={SHARED_MATS.metal} castShadow />
        <mesh geometry={GEO.box} scale={[0.15, 0.05, 0.15]} position={[-0.2, 0.05, -0.2]} material={SHARED_MATS.concrete} castShadow />
    </group>
);

export const ProceduralBuilding = React.memo(({ type, baseColor, variant, rotation, opacity = 1, transparent = false }: BuildingProps) => {
  const commonProps = { castShadow: true, receiveShadow: true };
  const matProps: MaterialProps = { flatShading: false, opacity, transparent, roughness: 0.35, metalness: 0.2 };
  
  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    if (!transparent) {
        c.offsetHSL(0, 0, (variant % 10 - 5) / 100);
    }
    return c;
  }, [baseColor, variant, transparent]);

  const materials = useMemo(() => ({
    main: new THREE.MeshStandardMaterial({ color: color, ...matProps }),
    roof: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.6), ...matProps, roughness: 0.8 }),
    accent: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL(0, 0.1, -0.15), ...matProps, metalness: 0.5 }),
  }), [color, matProps]);
  
  const yOffset = -0.3;

  const renderResidential = () => {
      if (variant < 25) {
        return (
            <group>
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.cone} position={[0, 0.75, 0]} scale={[0.65, 0.45, 0.65]} rotation={[0, Math.PI/4, 0]} />
                <WindowBlock position={[0.2, 0.35, 0.31]} scale={[0.15, 0.18, 0.05]} />
                <WindowBlock position={[-0.2, 0.35, 0.31]} scale={[0.15, 0.18, 0.05]} />
                <DetailBlock position={[0.2, 0.75, -0.1]} scale={[0.08, 0.35, 0.08]} color="#451a03" matProps={matProps} />
                <mesh {...commonProps} material={SHARED_MATS.wood} geometry={GEO.box} position={[0, 0.1, 0.35]} scale={[0.25, 0.08, 0.15]} />
            </group>
        );
      }
      if (variant < 50) {
          return (
            <group>
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[-0.15, 0.3, 0]} scale={[0.5, 0.6, 0.65]} />
                <mesh {...commonProps} material={materials.accent} geometry={GEO.box} position={[0.2, 0.25, 0.1]} scale={[0.3, 0.5, 0.45]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.cone} position={[-0.15, 0.7, 0]} scale={[0.45, 0.35, 0.45]} rotation={[0, Math.PI/4, 0]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0.2, 0.55, 0.1]} scale={[0.35, 0.08, 0.5]} />
                <WindowBlock position={[-0.15, 0.35, 0.33]} scale={[0.2, 0.2, 0.05]} />
            </group>
          );
      }
      if (variant < 75) {
          return (
            <group>
                <mesh {...commonProps} material={SHARED_MATS.brick} geometry={GEO.box} position={[-0.15, 0.4, 0]} scale={[0.45, 0.8, 0.75]} />
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0.15, 0.35, 0]} scale={[0.45, 0.7, 0.75]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0, 0.82, 0]} scale={[0.9, 0.08, 0.85]} />
                <WindowBlock position={[-0.15, 0.55, 0.38]} scale={[0.18, 0.2, 0.05]} />
                <WindowBlock position={[0.15, 0.45, 0.38]} scale={[0.18, 0.2, 0.05]} />
                <mesh {...commonProps} material={SHARED_MATS.concrete} geometry={GEO.box} position={[0, 0.05, 0.4]} scale={[0.85, 0.1, 0.15]} />
            </group>
          );
      }
      return (
        <group>
            <mesh {...commonProps} material={SHARED_MATS.concrete} geometry={GEO.box} position={[-0.1, 0.3, 0]} scale={[0.65, 0.6, 0.85]} />
            <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0.1, 0.7, 0]} scale={[0.55, 0.4, 0.95]} />
            <WindowBlock position={[-0.1, 0.35, 0.43]} scale={[0.45, 0.35, 0.05]} />
            <WindowBlock position={[0.2, 0.75, 0.48]} scale={[0.3, 0.25, 0.05]} />
            <mesh {...commonProps} material={SHARED_MATS.water} geometry={GEO.box} position={[0.3, 0.1, 0.2]} scale={[0.3, 0.04, 0.45]} />
            <mesh {...commonProps} material={SHARED_MATS.solar} geometry={GEO.box} position={[0.1, 0.92, 0]} scale={[0.45, 0.02, 0.8]} rotation={[0.05,0,0]} />
        </group>
      );
  };

  const renderCommercial = () => {
    if (variant < 30) {
        return (
            <group>
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.4, 0]} scale={[0.95, 0.8, 0.85]} />
                <WindowBlock position={[0, 0.4, 0.43]} scale={[0.75, 0.35, 0.05]} />
                <mesh {...commonProps} material={materials.accent} geometry={GEO.box} position={[0, 0.6, 0.5]} scale={[0.95, 0.08, 0.15]} rotation={[0.1, 0, 0]} />
                <RoofDetail position={[0, 0.8, 0]} scale={[1.1, 1, 1]} />
                <ACUnit position={[0, 0.9, 0]} scale={[0.25, 0.25, 0.25]} />
            </group>
        );
    }
    if (variant < 85) {
        return (
            <group>
                 <mesh {...commonProps} material={SHARED_MATS.glass} geometry={GEO.box} position={[0, 0.75, 0]} scale={[0.65, 1.5, 0.65]} />
                 <mesh {...commonProps} material={SHARED_MATS.concrete} geometry={GEO.box} position={[0, 0.75, 0]} scale={[0.55, 1.55, 0.55]} />
                 <mesh {...commonProps} material={materials.accent} geometry={GEO.box} position={[0, 0.1, 0]} scale={[0.75, 0.2, 0.75]} />
                 <mesh {...commonProps} material={SHARED_MATS.metal} geometry={GEO.box} position={[0, 1.52, 0]} scale={[0.7, 0.08, 0.7]} />
                 <mesh {...commonProps} material={SHARED_MATS.metal} geometry={GEO.cylinder} position={[0, 1.7, 0]} scale={[0.03, 0.4, 0.03]} />
            </group>
        );
    }
    return (
        <group>
             <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 1.25, 0]} scale={[0.7, 2.5, 0.7]} />
             <mesh {...commonProps} material={SHARED_MATS.glass} geometry={GEO.box} position={[0.36, 1.25, 0]} scale={[0.05, 2.45, 0.45]} />
             <mesh {...commonProps} material={SHARED_MATS.glass} geometry={GEO.box} position={[-0.36, 1.25, 0]} scale={[0.05, 2.45, 0.45]} />
             <mesh {...commonProps} material={SHARED_MATS.glass} geometry={GEO.box} position={[0, 1.25, 0.36]} scale={[0.45, 2.45, 0.05]} />
             <mesh {...commonProps} material={SHARED_MATS.glass} geometry={GEO.box} position={[0, 1.25, -0.36]} scale={[0.45, 2.45, 0.05]} />
             <mesh {...commonProps} material={SHARED_MATS.metal} geometry={GEO.cone} position={[0, 2.6, 0]} scale={[0.15, 0.6, 0.15]} />
             <mesh position={[0, 2.9, 0]}>
                 <sphereGeometry args={[0.06]} />
                 <meshBasicMaterial color="#ef4444" />
             </mesh>
        </group>
    );
  };

  const renderIndustrial = () => {
    if (variant < 40) {
        return (
            <group>
                <mesh {...commonProps} material={SHARED_MATS.brick} geometry={GEO.box} position={[0, 0.4, 0]} scale={[0.95, 0.8, 0.9]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[-0.25, 0.85, 0]} scale={[0.5, 0.18, 0.85]} rotation={[0,0,Math.PI/6]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0.25, 0.85, 0]} scale={[0.5, 0.18, 0.85]} rotation={[0,0,-Math.PI/6]} />
                <mesh {...commonProps} material={SHARED_MATS.concrete} geometry={GEO.cylinder} position={[0.38, 0.8, 0.35]} scale={[0.12, 1.5, 0.12]} />
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#1e293b', roughness: 0.1, metalness: 0.9})} geometry={GEO.cylinder} position={[0.38, 1.55, 0.35]} scale={[0.1, 0.08, 0.1]} />
                {variant % 2 === 0 && <ACUnit position={[-0.2, 0.9, -0.2]} scale={[0.35, 0.25, 0.35]} />}
            </group>
        );
    }
    return (
        <group>
            <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.4, 0]} scale={[1.0, 0.8, 1.0]} />
            <mesh {...commonProps} material={SHARED_MATS.metal} geometry={GEO.box} position={[0, 0.82, 0]} scale={[0.9, 0.05, 0.9]} />
            <DetailBlock position={[-0.3, 0.9, 0]} scale={[0.25, 0.25, 0.25]} color="#64748b" matProps={{ roughness: 0.2, metalness: 0.8 }} />
            <DetailBlock position={[0.3, 0.9, 0]} scale={[0.25, 0.25, 0.25]} color="#64748b" matProps={{ roughness: 0.2, metalness: 0.8 }} />
            <mesh {...commonProps} material={SHARED_MATS.solar} geometry={GEO.box} position={[0, 0.85, 0]} scale={[0.6, 0.02, 0.6]} />
        </group>
    );
  };

  const renderPark = () => {
    const base = (
         <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[0.95, 0.95]} />
            <meshStandardMaterial color="#22c55e" roughness={1.0} metalness={0.0} />
        </mesh>
    );

    if (variant < 40) {
        return (
            <group position={[0, -0.25, 0]}>
                {base}
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#14532d', roughness: 0.85})} geometry={GEO.cone} position={[0.25, 0.35, 0.25]} scale={[0.35, 0.7, 0.35]} />
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#064e3b', roughness: 0.85})} geometry={GEO.cone} position={[-0.25, 0.45, -0.25]} scale={[0.45, 0.9, 0.45]} />
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#14532d', roughness: 0.85})} geometry={GEO.cone} position={[-0.35, 0.3, 0.35]} scale={[0.3, 0.6, 0.3]} />
            </group>
        );
    }
    if (variant < 70) {
        return (
            <group position={[0, -0.25, 0]}>
                {base}
                <mesh {...commonProps} material={SHARED_MATS.concrete} geometry={GEO.cylinder} position={[0, 0.1, 0]} scale={[0.65, 0.25, 0.65]} />
                <mesh {...commonProps} material={SHARED_MATS.water} geometry={GEO.cylinder} position={[0, 0.18, 0]} scale={[0.55, 0.2, 0.55]} />
                <mesh {...commonProps} material={SHARED_MATS.wood} geometry={GEO.box} position={[0.4, 0.15, 0]} scale={[0.12, 0.2, 0.35]} />
            </group>
        );
    }
    return (
        <group position={[0, -0.25, 0]}>
            {base}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <planeGeometry args={[0.85, 0.65]} />
                <meshStandardMaterial color={variant % 2 === 0 ? "#1d4ed8" : "#b91c1c"} roughness={0.4} metalness={0.4} />
            </mesh>
            <mesh {...commonProps} material={SHARED_MATS.metal} geometry={GEO.cylinder} position={[0, 0.35, -0.3]} scale={[0.06, 0.7, 0.06]} />
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
