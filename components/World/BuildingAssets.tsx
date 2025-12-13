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
    parkGreen: new THREE.MeshStandardMaterial({ color: '#15803d', ...matProps }),
    parkFloor: new THREE.MeshStandardMaterial({ color: '#86efac', ...matProps })
  }), [color, matProps]);
  
  const yOffset = -0.3;

  return (
    <group rotation={[0, rotation * (Math.PI/2), 0]} position={[0, yOffset, 0]}>
      {/* --- RESIDENTIAL --- */}
      {type === BuildingType.Residential && (
         <>
            {/* Variant A: Cottage */}
            {variant < 40 && (
                <group>
                    <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                    <mesh {...commonProps} material={materials.roof} geometry={GEO.cone} position={[0, 0.75, 0]} scale={[0.6, 0.4, 0.6]} rotation={[0, Math.PI/4, 0]} />
                    <WindowBlock position={[0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                    <WindowBlock position={[-0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                    <DetailBlock position={[0.2, 0.7, -0.1]} scale={[0.1, 0.3, 0.1]} color="#78350f" matProps={matProps} />
                </group>
            )}
            {/* Variant B: Townhouse */}
            {variant >= 40 && variant < 70 && (
                <group>
                    <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[-0.15, 0.4, 0]} scale={[0.4, 0.8, 0.7]} />
                    <mesh {...commonProps} material={materials.accent} geometry={GEO.box} position={[0.15, 0.35, 0]} scale={[0.4, 0.7, 0.7]} />
                    <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0, 0.8, 0]} scale={[0.8, 0.1, 0.8]} />
                    <WindowBlock position={[-0.15, 0.5, 0.36]} scale={[0.2, 0.2, 0.05]} />
                    <WindowBlock position={[0.15, 0.4, 0.36]} scale={[0.2, 0.2, 0.05]} />
                </group>
            )}
            {/* Variant C: Modern Villa */}
             {variant >= 70 && (
                <group>
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#f8fafc', ...matProps})} geometry={GEO.box} position={[-0.1, 0.3, 0]} scale={[0.6, 0.6, 0.8]} />
                    <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0.1, 0.7, 0]} scale={[0.5, 0.4, 0.9]} />
                    <WindowBlock position={[-0.1, 0.3, 0.41]} scale={[0.4, 0.4, 0.05]} />
                    <WindowBlock position={[0.2, 0.7, 0.46]} scale={[0.3, 0.3, 0.05]} />
                </group>
            )}
         </>
      )}
      
      {/* --- COMMERCIAL --- */}
      {type === BuildingType.Commercial && (
        <>
            {/* Variant A: Shop */}
            {variant < 50 && (
                <group>
                    <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.5, 0]} scale={[0.8, 1.0, 0.8]} />
                    <WindowBlock position={[0, 0.5, 0.41]} scale={[0.6, 0.8, 0.05]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#f43f5e', ...matProps})} geometry={GEO.box} position={[0, 0.2, 0.45]} scale={[0.8, 0.1, 0.2]} rotation={[0.2, 0, 0]} />
                    <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0, 1.05, 0]} scale={[0.85, 0.1, 0.85]} />
                </group>
            )}
             {/* Variant B: Skyscraper */}
            {variant >= 50 && (
                <group>
                     <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 1.25, 0]} scale={[0.6, 2.5, 0.6]} />
                     <mesh {...commonProps} material={materials.accent} geometry={GEO.box} position={[0.31, 1.25, 0]} scale={[0.05, 2.5, 0.4]} />
                     <mesh {...commonProps} material={materials.accent} geometry={GEO.box} position={[-0.31, 1.25, 0]} scale={[0.05, 2.5, 0.4]} />
                     <mesh {...commonProps} material={materials.metal} geometry={GEO.cone} position={[0, 2.6, 0]} scale={[0.1, 0.5, 0.1]} />
                </group>
            )}
        </>
      )}

      {/* --- INDUSTRIAL --- */}
      {type === BuildingType.Industrial && (
        <group>
            <mesh {...commonProps} material={materials.main} geometry={GEO.box} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
            <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[-0.22, 0.9, 0]} scale={[0.45, 0.15, 0.8]} rotation={[0,0,Math.PI/6]} />
            <mesh {...commonProps} material={materials.roof} geometry={GEO.box} position={[0.22, 0.9, 0]} scale={[0.45, 0.15, 0.8]} rotation={[0,0,Math.PI/6]} />
            <mesh {...commonProps} material={materials.metal} geometry={GEO.cylinder} position={[0.35, 0.8, 0.3]} scale={[0.1, 1.4, 0.1]} />
        </group>
      )}
      
      {/* --- PARK --- */}
      {type === BuildingType.Park && (
         <group position={[0, -0.25, 0]}>
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <planeGeometry args={[0.9, 0.9]} />
                <meshStandardMaterial color="#86efac" />
            </mesh>
            <mesh {...commonProps} material={materials.parkGreen} geometry={GEO.cone} position={[0.2, 0.3, 0.2]} scale={[0.3, 0.6, 0.3]} />
            <mesh {...commonProps} material={materials.parkGreen} geometry={GEO.cone} position={[-0.2, 0.4, -0.2]} scale={[0.4, 0.8, 0.4]} />
            <mesh {...commonProps} material={materials.parkGreen} geometry={GEO.cone} position={[-0.3, 0.25, 0.3]} scale={[0.25, 0.5, 0.25]} />
         </group>
      )}
    </group>
  );
});
