/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BuildingType } from '../../types';

// --- Geometries ---
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 4),
  dome: new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
};

// --- Helpers ---
const DetailBlock = ({ position, scale, color, matProps }: any) => (
  <mesh geometry={GEO.box} position={position} scale={scale} castShadow receiveShadow>
    <meshStandardMaterial color={color} {...matProps} />
  </mesh>
);

const WindowBlock = ({ position, scale }: { position: [number, number, number], scale: [number, number, number] }) => (
  <mesh geometry={GEO.box} position={position} scale={scale}>
    <meshStandardMaterial color="#bfdbfe" emissive="#bfdbfe" emissiveIntensity={0.2} roughness={0.1} metalness={0.8} />
  </mesh>
);

interface BuildingProps {
  type: BuildingType;
  baseColor: string;
  variant: number;
  rotation: number;
  opacity?: number;
  transparent?: boolean;
}

export const ProceduralBuilding = React.memo(({ type, baseColor, variant, rotation, opacity = 1, transparent = false }: BuildingProps) => {
  const commonProps = { castShadow: true, receiveShadow: true };
  const matProps = { flatShading: true, opacity, transparent, roughness: 0.8 };
  
  // Procedural Color Variation
  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    if (!transparent) {
        c.offsetHSL(0, 0, (variant % 10 - 5) / 100);
    }
    return c;
  }, [baseColor, variant, transparent]);

  const materials = useMemo(() => ({
    main: new THREE.MeshStandardMaterial({ color: color, ...matProps }),
    roof: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.6), ...matProps }),
    accent: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL(0,0,-0.15), ...matProps }),
    metal: new THREE.MeshStandardMaterial({ color: '#64748b', ...matProps, metalness: 0.6, roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: '#93c5fd', ...matProps, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.7 }),
    wood: new THREE.MeshStandardMaterial({ color: '#78350f', ...matProps }),
    brick: new THREE.MeshStandardMaterial({ color: '#7f1d1d', ...matProps }),
    concrete: new THREE.MeshStandardMaterial({ color: '#9ca3af', ...matProps }),
    parkGreen: new THREE.MeshStandardMaterial({ color: '#15803d', ...matProps }),
    parkFloor: new THREE.MeshStandardMaterial({ color: '#86efac', ...matProps }),
    water: new THREE.MeshStandardMaterial({ color: '#3b82f6', ...matProps, metalness: 0.8, roughness: 0.2 }),
    sport: new THREE.MeshStandardMaterial({ color: '#ef4444', ...matProps }),
  }), [color, matProps]);
  
  const yOffset = -0.3;

  const renderResidential = () => {
      // 0-24: Cottage (Small, peaked roof)
      if (variant < 25) {
        return (
            <group>
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.cone} position={[0, 0.75, 0]} scale={[0.6, 0.4, 0.6]} rotation={[0, Math.PI/4, 0]} />
                <WindowBlock position={[0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                <WindowBlock position={[-0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                <DetailBlock position={[0.2, 0.7, -0.1]} scale={[0.1, 0.3, 0.1]} color="#78350f" matProps={matProps} />
                {/* Small Porch */}
                <mesh {...commonProps} material={materials.wood} geometry={GEO.box} position={[0, 0.1, 0.35]} scale={[0.3, 0.1, 0.2]} />
            </group>
        );
      }
      // 25-49: Suburban House (L-shape with garage)
      if (variant < 50) {
          return (
            <group>
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[-0.15, 0.3, 0]} scale={[0.5, 0.6, 0.6]} />
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0.2, 0.25, 0.1]} scale={[0.3, 0.5, 0.4]} />
                {/* Roofs */}
                <mesh {...commonProps} material={materials.roof} geometry={GEO.cone} position={[-0.15, 0.7, 0]} scale={[0.4, 0.3, 0.4]} rotation={[0, Math.PI/4, 0]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0.2, 0.55, 0.1]} scale={[0.35, 0.1, 0.45]} />
                {/* Garage */}
                <DetailBlock position={[0.2, 0.15, 0.31]} scale={[0.2, 0.25, 0.05]} color="#94a3b8" matProps={matProps} />
                <WindowBlock position={[-0.15, 0.3, 0.31]} scale={[0.2, 0.2, 0.05]} />
            </group>
          );
      }
      // 50-74: Townhouse
      if (variant < 75) {
          return (
            <group>
                <mesh {...commonProps} material={materials.brick} geometry={GEO.box} position={[-0.15, 0.4, 0]} scale={[0.4, 0.8, 0.7]} />
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0.15, 0.35, 0]} scale={[0.4, 0.7, 0.7]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0, 0.8, 0]} scale={[0.8, 0.1, 0.8]} />
                <WindowBlock position={[-0.15, 0.5, 0.36]} scale={[0.2, 0.2, 0.05]} />
                <WindowBlock position={[0.15, 0.4, 0.36]} scale={[0.2, 0.2, 0.05]} />
                <mesh {...commonProps} material={materials.concrete} geometry={GEO.box} position={[0, 0.05, 0.4]} scale={[0.8, 0.1, 0.2]} />
            </group>
          );
      }
      // 75-89: Apartment Block
      if (variant < 90) {
          return (
            <group>
                <mesh {...commonProps} material={materials.concrete} geometry={GEO.box} position={[0, 0.6, 0]} scale={[0.8, 1.2, 0.8]} />
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.6, 0]} scale={[0.7, 1.1, 0.82]} />
                
                {/* Balconies */}
                <mesh {...commonProps} material={materials.metal} geometry={GEO.box} position={[0, 0.4, 0.45]} scale={[0.6, 0.05, 0.1]} />
                <mesh {...commonProps} material={materials.metal} geometry={GEO.box} position={[0, 0.8, 0.45]} scale={[0.6, 0.05, 0.1]} />
                
                <WindowBlock position={[-0.2, 0.5, 0.41]} scale={[0.15, 0.2, 0.05]} />
                <WindowBlock position={[0.2, 0.5, 0.41]} scale={[0.15, 0.2, 0.05]} />
                <WindowBlock position={[-0.2, 0.9, 0.41]} scale={[0.15, 0.2, 0.05]} />
                <WindowBlock position={[0.2, 0.9, 0.41]} scale={[0.15, 0.2, 0.05]} />
            </group>
          );
      }
      // 90-99: Modern Luxury
      return (
        <group>
            <mesh {...commonProps} material={materials.concrete} geometry={GEO.box} position={[-0.1, 0.3, 0]} scale={[0.6, 0.6, 0.8]} />
            <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0.1, 0.7, 0]} scale={[0.5, 0.4, 0.9]} />
            <WindowBlock position={[-0.1, 0.3, 0.41]} scale={[0.4, 0.4, 0.05]} />
            <WindowBlock position={[0.2, 0.7, 0.46]} scale={[0.3, 0.3, 0.05]} />
            
            {/* Pool/Water Feature */}
            <mesh {...commonProps} material={materials.water} geometry={GEO.box} position={[0.3, 0.1, 0.2]} scale={[0.3, 0.05, 0.4]} />
            <mesh {...commonProps} material={materials.wood} geometry={GEO.box} position={[0.3, 0.1, -0.2]} scale={[0.3, 0.05, 0.3]} />
        </group>
      );
  };

  const renderCommercial = () => {
    // 0-29: Small Shop
    if (variant < 30) {
        return (
            <group>
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                <WindowBlock position={[0, 0.4, 0.41]} scale={[0.7, 0.4, 0.05]} />
                {/* Awning */}
                <mesh {...commonProps} material={materials.accent} geometry={GEO.box} position={[0, 0.55, 0.5]} scale={[0.9, 0.05, 0.2]} rotation={[0.2, 0, 0]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0, 0.85, 0]} scale={[0.95, 0.1, 0.85]} />
            </group>
        );
    }
    // 30-59: Diner / Restaurant
    if (variant < 60) {
        return (
            <group>
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.3, 0]} scale={[0.8, 0.6, 0.8]} />
                <WindowBlock position={[0, 0.3, 0.41]} scale={[0.6, 0.3, 0.05]} />
                <mesh {...commonProps} material={materials.metal} geometry={GEO.box} position={[0, 0.65, 0]} scale={[0.9, 0.1, 0.9]} />
                {/* Signage */}
                <DetailBlock position={[0, 0.8, 0.3]} scale={[0.4, 0.3, 0.1]} color="#f43f5e" matProps={matProps} />
                <DetailBlock position={[0, 0.75, 0.3]} scale={[0.5, 0.05, 0.15]} color="#fcd34d" matProps={matProps} />
            </group>
        );
    }
    // 60-84: Office Mid-rise
    if (variant < 85) {
        return (
            <group>
                 <mesh {...commonProps} material={materials.glass} geometry={GEO.box} position={[0, 0.75, 0]} scale={[0.6, 1.5, 0.6]} />
                 <mesh {...commonProps} material={materials.concrete} geometry={GEO.box} position={[0, 0.75, 0]} scale={[0.5, 1.55, 0.5]} />
                 <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.1, 0]} scale={[0.7, 0.2, 0.7]} />
                 <mesh {...commonProps} material={materials.metal} geometry={GEO.box} position={[0, 1.5, 0]} scale={[0.6, 0.1, 0.6]} />
                 {/* Antenna */}
                 <mesh {...commonProps} material={materials.metal} geometry={GEO.cylinder} position={[0.1, 1.6, 0.1]} scale={[0.02, 0.4, 0.02]} />
            </group>
        );
    }
    // 85-99: Skyscraper
    return (
        <group>
             <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 1.25, 0]} scale={[0.6, 2.5, 0.6]} />
             <mesh {...commonProps} material={materials.glass} geometry={GEO.box} position={[0.31, 1.25, 0]} scale={[0.05, 2.4, 0.4]} />
             <mesh {...commonProps} material={materials.glass} geometry={GEO.box} position={[-0.31, 1.25, 0]} scale={[0.05, 2.4, 0.4]} />
             <mesh {...commonProps} material={materials.glass} geometry={GEO.box} position={[0, 1.25, 0.31]} scale={[0.4, 2.4, 0.05]} />
             <mesh {...commonProps} material={materials.glass} geometry={GEO.box} position={[0, 1.25, -0.31]} scale={[0.4, 2.4, 0.05]} />
             <mesh {...commonProps} material={materials.metal} geometry={GEO.cone} position={[0, 2.6, 0]} scale={[0.1, 0.5, 0.1]} />
        </group>
    );
  };

  const renderIndustrial = () => {
    // 0-39: Old Factory
    if (variant < 40) {
        return (
            <group>
                <mesh {...commonProps} material={materials.brick} geometry={GEO.box} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                {/* Sawtooth Roof */}
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[-0.22, 0.85, 0]} scale={[0.45, 0.15, 0.8]} rotation={[0,0,Math.PI/6]} />
                <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0.22, 0.85, 0]} scale={[0.45, 0.15, 0.8]} rotation={[0,0,Math.PI/6]} />
                {/* Smokestack */}
                <mesh {...commonProps} material={materials.concrete} geometry={GEO.cylinder} position={[0.35, 0.8, 0.3]} scale={[0.1, 1.4, 0.1]} />
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#111', ...matProps})} geometry={GEO.cylinder} position={[0.35, 1.5, 0.3]} scale={[0.08, 0.05, 0.08]} />
            </group>
        );
    }
    // 40-69: Storage Tanks
    if (variant < 70) {
        return (
            <group>
                <mesh {...commonProps} material={materials.concrete} geometry={GEO.box} position={[0, 0.1, 0]} scale={[0.95, 0.2, 0.95]} />
                <mesh {...commonProps} material={materials.metal} geometry={GEO.cylinder} position={[-0.25, 0.45, -0.25]} scale={[0.3, 0.7, 0.3]} />
                <mesh {...commonProps} material={materials.metal} geometry={GEO.cylinder} position={[0.25, 0.45, 0.25]} scale={[0.3, 0.7, 0.3]} />
                {/* Piping */}
                <mesh {...commonProps} material={materials.metal} geometry={GEO.box} position={[0, 0.4, 0]} scale={[0.8, 0.05, 0.05]} rotation={[0, Math.PI/4, 0]} />
            </group>
        );
    }
    // 70-99: Tech Warehouse / Server Farm
    return (
        <group>
            <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.35, 0]} scale={[0.9, 0.7, 0.9]} />
            <mesh {...commonProps} material={materials.metal} geometry={GEO.box} position={[0, 0.71, 0]} scale={[0.8, 0.05, 0.8]} />
            {/* Cooling Units */}
            <DetailBlock position={[-0.25, 0.8, 0]} scale={[0.2, 0.2, 0.2]} color="#cbd5e1" matProps={matProps} />
            <DetailBlock position={[0.25, 0.8, 0]} scale={[0.2, 0.2, 0.2]} color="#cbd5e1" matProps={matProps} />
            {/* Loading Docks */}
            <mesh {...commonProps} material={materials.concrete} geometry={GEO.box} position={[0, 0.2, 0.46]} scale={[0.2, 0.3, 0.05]} />
            <mesh {...commonProps} material={materials.concrete} geometry={GEO.box} position={[-0.3, 0.2, 0.46]} scale={[0.2, 0.3, 0.05]} />
            <mesh {...commonProps} material={materials.concrete} geometry={GEO.box} position={[0.3, 0.2, 0.46]} scale={[0.2, 0.3, 0.05]} />
        </group>
    );
  };

  const renderPark = () => {
    // Base
    const base = (
         <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[0.9, 0.9]} />
            <meshStandardMaterial color="#86efac" />
        </mesh>
    );

    // 0-39: Forest
    if (variant < 40) {
        return (
            <group position={[0, -0.25, 0]}>
                {base}
                <mesh {...commonProps} material={materials.parkGreen} geometry={GEO.cone} position={[0.2, 0.3, 0.2]} scale={[0.3, 0.6, 0.3]} />
                <mesh {...commonProps} material={materials.parkGreen} geometry={GEO.cone} position={[-0.2, 0.4, -0.2]} scale={[0.4, 0.8, 0.4]} />
                <mesh {...commonProps} material={materials.parkGreen} geometry={GEO.cone} position={[-0.3, 0.25, 0.3]} scale={[0.25, 0.5, 0.25]} />
            </group>
        );
    }
    // 40-69: Plaza
    if (variant < 70) {
        return (
            <group position={[0, -0.25, 0]}>
                {base}
                <mesh {...commonProps} material={materials.concrete} geometry={GEO.cylinder} position={[0, 0.1, 0]} scale={[0.6, 0.2, 0.6]} />
                <mesh {...commonProps} material={materials.water} geometry={GEO.cylinder} position={[0, 0.15, 0]} scale={[0.5, 0.15, 0.5]} />
                {/* Fountain Jet */}
                <mesh {...commonProps} material={materials.water} geometry={GEO.cone} position={[0, 0.4, 0]} scale={[0.1, 0.4, 0.1]} />
                {/* Benches */}
                <mesh {...commonProps} material={materials.wood} geometry={GEO.box} position={[0.35, 0.1, 0]} scale={[0.1, 0.15, 0.3]} />
                <mesh {...commonProps} material={materials.wood} geometry={GEO.box} position={[-0.35, 0.1, 0]} scale={[0.1, 0.15, 0.3]} />
            </group>
        );
    }
    // 70-84: Playground
    if (variant < 85) {
        return (
            <group position={[0, -0.25, 0]}>
                {base}
                {/* Slide */}
                <mesh {...commonProps} material={materials.accent} geometry={GEO.box} position={[-0.2, 0.2, 0.2]} scale={[0.1, 0.4, 0.1]} />
                <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[-0.05, 0.15, 0.2]} scale={[0.3, 0.05, 0.1]} rotation={[0,0,-0.5]} />
                {/* Sandbox */}
                <mesh {...commonProps} material={materials.wood} geometry={GEO.box} position={[0.2, 0.05, -0.2]} scale={[0.4, 0.1, 0.4]} />
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#fcd34d', ...matProps})} geometry={GEO.box} position={[0.2, 0.06, -0.2]} scale={[0.35, 0.1, 0.35]} />
            </group>
        );
    }
    // 85-99: Sports Court
    return (
        <group position={[0, -0.25, 0]}>
            {base}
            {/* Court Floor */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <planeGeometry args={[0.8, 0.6]} />
                <meshStandardMaterial color="#3b82f6" roughness={0.5} />
            </mesh>
            {/* Hoop/Net */}
            <mesh {...commonProps} material={materials.metal} geometry={GEO.cylinder} position={[0, 0.3, -0.25]} scale={[0.05, 0.6, 0.05]} />
            <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.5, -0.22]} scale={[0.3, 0.2, 0.02]} />
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
