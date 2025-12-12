/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BuildingType, Grid } from '../../types';
import { BUILDINGS, GRID_SIZE } from '../../constants';
import { useFrame } from '@react-three/fiber';

// Constants
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const PLANE_GEO = new THREE.PlaneGeometry(1, 1);
const CYLINDER_GEO = new THREE.CylinderGeometry(1, 1, 1, 8);
const CONE_GEO = new THREE.ConeGeometry(1, 1, 4);

// --- Road Marking Logic ---
export const RoadMarkings = React.memo(({ x, y, grid, yOffset }: { x: number; y: number; grid: Grid; yOffset: number }) => {
  const lineMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 1, depthTest: true }), []);
  
  // Geometries for different road segments
  const geos = useMemo(() => ({
    full: new THREE.PlaneGeometry(0.12, 1),
    short: new THREE.PlaneGeometry(0.12, 0.35),
    corner: new THREE.RingGeometry(0.44, 0.56, 32, 1, 0, Math.PI / 2),
    dot: new THREE.CircleGeometry(0.12, 12),
    centerFill: new THREE.PlaneGeometry(0.12, 0.32) // Fills the gap in T-junctions
  }), []);

  // Determine connections
  const hasUp = y > 0 && grid[y - 1][x].buildingType === BuildingType.Road;
  const hasRight = x < GRID_SIZE - 1 && grid[y][x + 1].buildingType === BuildingType.Road;
  const hasDown = y < GRID_SIZE - 1 && grid[y + 1][x].buildingType === BuildingType.Road;
  const hasLeft = x > 0 && grid[y][x - 1].buildingType === BuildingType.Road;

  // Bitmask: Left(8) | Down(4) | Right(2) | Up(1)
  const mask = (hasLeft ? 8 : 0) | (hasDown ? 4 : 0) | (hasRight ? 2 : 0) | (hasUp ? 1 : 0);

  const groupProps = {
      rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
      position: [0, yOffset, 0] as [number, number, number]
  };

  const renderMarkings = () => {
    switch (mask) {
        // Isolated
        case 0: return <mesh geometry={geos.dot} material={lineMaterial} />;
        
        // Dead Ends (Render dot for emphasis)
        case 1: case 2: case 4: case 8:
            return <mesh geometry={geos.dot} material={lineMaterial} />;

        // Straights
        case 5: return <mesh geometry={geos.full} material={lineMaterial} />; // |
        case 10: return <mesh geometry={geos.full} material={lineMaterial} rotation={[0, 0, Math.PI / 2]} />; // -

        // Corners
        case 3: return <mesh geometry={geos.corner} material={lineMaterial} position={[0.5, 0.5, 0]} rotation={[0, 0, Math.PI]} />; // └
        case 6: return <mesh geometry={geos.corner} material={lineMaterial} position={[0.5, -0.5, 0]} rotation={[0, 0, Math.PI / 2]} />; // ┌
        case 12: return <mesh geometry={geos.corner} material={lineMaterial} position={[-0.5, -0.5, 0]} />; // ┐
        case 9: return <mesh geometry={geos.corner} material={lineMaterial} position={[-0.5, 0.5, 0]} rotation={[0, 0, -Math.PI / 2]} />; // ┘

        // Complex (T-Junctions & Cross) - Default handler
        default:
            return (
                <>
                    {/* Render Arms */}
                    {hasUp && <mesh geometry={geos.short} material={lineMaterial} position={[0, 0.325, 0]} />}
                    {hasDown && <mesh geometry={geos.short} material={lineMaterial} position={[0, -0.325, 0]} />}
                    {hasLeft && <mesh geometry={geos.short} material={lineMaterial} position={[-0.325, 0, 0]} rotation={[0, 0, Math.PI / 2]} />}
                    {hasRight && <mesh geometry={geos.short} material={lineMaterial} position={[0.325, 0, 0]} rotation={[0, 0, Math.PI / 2]} />}

                    {/* Center Fills for Continuous Flow (T-Junctions) */}
                    {/* Vertical Flow (Up+Down present) */}
                    {(mask & 5) === 5 && <mesh geometry={geos.centerFill} material={lineMaterial} />}
                    {/* Horizontal Flow (Left+Right present) */}
                    {(mask & 10) === 10 && <mesh geometry={geos.centerFill} material={lineMaterial} rotation={[0, 0, Math.PI / 2]} />}
                </>
            );
    }
  };

  return <group {...groupProps}>{renderMarkings()}</group>;
});

// --- Building Visuals ---
const WindowBlock = ({ position, scale }: { position: [number, number, number], scale: [number, number, number] }) => (
  <mesh geometry={BOX_GEO} position={position} scale={scale}>
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
  
  // Create color variations based on variant (only if not preview/transparent)
  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    if (!transparent) {
        c.offsetHSL(0, 0, (variant % 10 - 5) / 100);
    }
    return c;
  }, [baseColor, variant, transparent]);

  const mainMat = useMemo(() => new THREE.MeshStandardMaterial({ color: color, ...matProps }), [color, matProps]);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.6), ...matProps }), [color, matProps]);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL(0,0,-0.15), ...matProps }), [color, matProps]);
  const metalMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#64748b', ...matProps, metalness: 0.6, roughness: 0.4 }), [matProps]);
  
  const yOffset = -0.3;

  return (
    <group rotation={[0, rotation * (Math.PI/2), 0]} position={[0, yOffset, 0]}>
      {type === BuildingType.Residential && (
         <>
            {/* Variant A: Cottage (0-39) */}
            {variant < 40 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={BOX_GEO} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                    <mesh {...commonProps} material={roofMat} geometry={CONE_GEO} position={[0, 0.75, 0]} scale={[0.6, 0.4, 0.6]} rotation={[0, Math.PI/4, 0]} />
                    <WindowBlock position={[0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                    <WindowBlock position={[-0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                </group>
            )}
            {/* Variant B: Townhouse (40-69) */}
            {variant >= 40 && variant < 70 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={BOX_GEO} position={[-0.15, 0.4, 0]} scale={[0.4, 0.8, 0.7]} />
                    <mesh {...commonProps} material={accentMat} geometry={BOX_GEO} position={[0.15, 0.35, 0]} scale={[0.4, 0.7, 0.7]} />
                    <mesh {...commonProps} material={roofMat} geometry={BOX_GEO} position={[-0.15, 0.85, 0]} scale={[0.45, 0.1, 0.8]} />
                    <mesh {...commonProps} material={roofMat} geometry={BOX_GEO} position={[0.15, 0.75, 0]} scale={[0.45, 0.1, 0.8]} />
                    <WindowBlock position={[-0.15, 0.5, 0.36]} scale={[0.2, 0.2, 0.05]} />
                    <WindowBlock position={[0.15, 0.4, 0.36]} scale={[0.2, 0.2, 0.05]} />
                </group>
            )}
            {/* Variant C: Modern Box (70-99) */}
            {variant >= 70 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={BOX_GEO} position={[0, 0.35, 0]} scale={[0.6, 0.7, 0.6]} />
                    <mesh {...commonProps} material={accentMat} geometry={BOX_GEO} position={[0.2, 0.25, 0.2]} scale={[0.4, 0.5, 0.4]} />
                    <WindowBlock position={[-0.1, 0.5, 0.31]} scale={[0.3, 0.2, 0.05]} />
                </group>
            )}
         </>
      )}
      
      {type === BuildingType.Commercial && (
        <>
            {/* Variant A: Shop (0-49) */}
            {variant < 50 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={BOX_GEO} position={[0, 0.5, 0]} scale={[0.8, 1.0, 0.8]} />
                    <WindowBlock position={[0, 0.5, 0.41]} scale={[0.6, 0.8, 0.05]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#f43f5e', ...matProps})} geometry={BOX_GEO} position={[0, 0.2, 0.45]} scale={[0.8, 0.1, 0.1]} />
                    <mesh {...commonProps} material={roofMat} geometry={BOX_GEO} position={[0, 1.05, 0]} scale={[0.85, 0.1, 0.85]} />
                </group>
            )}
            {/* Variant B: Office Tower (50-99) */}
            {variant >= 50 && (
                <group>
                     <mesh {...commonProps} material={mainMat} geometry={BOX_GEO} position={[0, 0.75, 0]} scale={[0.5, 1.5, 0.5]} />
                     <mesh {...commonProps} material={accentMat} geometry={BOX_GEO} position={[0, 0.2, 0]} scale={[0.7, 0.4, 0.7]} />
                     {/* Glass Facade */}
                     <WindowBlock position={[0, 0.9, 0.26]} scale={[0.3, 1.0, 0.05]} />
                     <WindowBlock position={[0, 0.9, -0.26]} scale={[0.3, 1.0, 0.05]} />
                     {/* Antenna */}
                     <mesh {...commonProps} material={metalMat} geometry={CYLINDER_GEO} position={[0, 1.6, 0]} scale={[0.05, 0.5, 0.05]} />
                </group>
            )}
        </>
      )}

      {type === BuildingType.Industrial && (
        <>
            {/* Variant A: Factory with smokestack (0-59) */}
            {variant < 60 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={BOX_GEO} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                    <mesh {...commonProps} material={roofMat} geometry={BOX_GEO} position={[-0.2, 0.9, 0]} scale={[0.4, 0.2, 0.8]} rotation={[0,0,Math.PI/4]} />
                    <mesh {...commonProps} material={roofMat} geometry={BOX_GEO} position={[0.2, 0.9, 0]} scale={[0.4, 0.2, 0.8]} rotation={[0,0,Math.PI/4]} />
                    <mesh {...commonProps} material={metalMat} geometry={CYLINDER_GEO} position={[0.3, 0.7, 0.3]} scale={[0.15, 1.2, 0.15]} />
                </group>
            )}
             {/* Variant B: Storage Tanks (60-99) */}
             {variant >= 60 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={BOX_GEO} position={[0, 0.1, 0]} scale={[0.9, 0.2, 0.9]} />
                    <mesh {...commonProps} material={accentMat} geometry={CYLINDER_GEO} position={[-0.25, 0.45, -0.25]} scale={[0.3, 0.7, 0.3]} />
                    <mesh {...commonProps} material={accentMat} geometry={CYLINDER_GEO} position={[0.25, 0.45, 0.25]} scale={[0.3, 0.7, 0.3]} />
                    <mesh {...commonProps} material={metalMat} geometry={BOX_GEO} position={[0, 0.7, 0]} scale={[0.8, 0.05, 0.05]} rotation={[0, Math.PI/4, 0]} />
                </group>
             )}
        </>
      )}
      
      {type === BuildingType.Park && (
         <group position={[0, -0.25, 0]}>
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <planeGeometry args={[0.9, 0.9]} />
                <meshStandardMaterial color="#86efac" />
            </mesh>
            {/* Variant A: Forest (0-49) */}
            {variant < 50 && (
                <>
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#15803d', ...matProps})} geometry={CONE_GEO} position={[0.2, 0.3, 0.2]} scale={[0.3, 0.6, 0.3]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#166534', ...matProps})} geometry={CONE_GEO} position={[-0.2, 0.4, -0.2]} scale={[0.4, 0.8, 0.4]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#14532d', ...matProps})} geometry={CONE_GEO} position={[-0.3, 0.25, 0.3]} scale={[0.25, 0.5, 0.25]} />
                </>
            )}
            {/* Variant B: Fountain Plaza (50-99) */}
            {variant >= 50 && (
                <>
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#94a3b8', ...matProps})} geometry={CYLINDER_GEO} position={[0, 0.1, 0]} scale={[0.6, 0.2, 0.6]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#60a5fa', ...matProps, transparent: true, opacity: 0.8})} geometry={CYLINDER_GEO} position={[0, 0.15, 0]} scale={[0.5, 0.15, 0.5]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#cbd5e1', ...matProps})} geometry={CYLINDER_GEO} position={[0, 0.3, 0]} scale={[0.1, 0.4, 0.1]} />
                    {/* Benches */}
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#78350f', ...matProps})} geometry={BOX_GEO} position={[0.35, 0.1, 0]} scale={[0.1, 0.15, 0.3]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#78350f', ...matProps})} geometry={BOX_GEO} position={[-0.35, 0.1, 0]} scale={[0.1, 0.15, 0.3]} />
                </>
            )}
         </group>
      )}
    </group>
  );
});