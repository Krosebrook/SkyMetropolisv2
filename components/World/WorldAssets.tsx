/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BuildingType, Grid } from '../../types';
import { GRID_SIZE } from '../../constants';

// --- Shared Assets ---

const GEOMETRIES = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 4),
  road: {
    dash: new THREE.PlaneGeometry(0.12, 0.25),
    corner: new THREE.RingGeometry(0.44, 0.56, 32, 1, 0, Math.PI / 2),
    stopLine: new THREE.PlaneGeometry(0.6, 0.12),
    zebra: new THREE.PlaneGeometry(0.12, 0.3),
    manhole: new THREE.CircleGeometry(0.14, 16),
    patch: new THREE.PlaneGeometry(0.25, 0.3),
  }
};

// --- Road Sub-Components ---

interface RoadSubComponentProps {
  material: THREE.Material;
}

const DashedLine = ({ horizontal = false, material }: { horizontal?: boolean } & RoadSubComponentProps) => (
  <group rotation={[0, 0, horizontal ? Math.PI / 2 : 0]}>
    <mesh geometry={GEOMETRIES.road.dash} material={material} position={[0, 0.33, 0]} />
    <mesh geometry={GEOMETRIES.road.dash} material={material} position={[0, 0, 0]} />
    <mesh geometry={GEOMETRIES.road.dash} material={material} position={[0, -0.33, 0]} />
  </group>
);

const StopArm = ({ rotation, matLine, matZebra }: { rotation: number, matLine: THREE.Material, matZebra: THREE.Material }) => (
  <group rotation={[0, 0, rotation]}>
    {/* Stop bar */}
    <mesh geometry={GEOMETRIES.road.stopLine} material={matLine} position={[0, 0.22, 0]} />
    {/* Crosswalk */}
    <group position={[0, 0.38, 0]}>
       <mesh geometry={GEOMETRIES.road.zebra} material={matZebra} position={[-0.2, 0, 0]} />
       <mesh geometry={GEOMETRIES.road.zebra} material={matZebra} position={[0, 0, 0]} />
       <mesh geometry={GEOMETRIES.road.zebra} material={matZebra} position={[0.2, 0, 0]} />
    </group>
  </group>
);

// --- Logic Helpers ---

const getAdjacencyMask = (x: number, y: number, grid: Grid) => {
  const hasUp = y > 0 && grid[y - 1][x].buildingType === BuildingType.Road;
  const hasRight = x < GRID_SIZE - 1 && grid[y][x + 1].buildingType === BuildingType.Road;
  const hasDown = y < GRID_SIZE - 1 && grid[y + 1][x].buildingType === BuildingType.Road;
  const hasLeft = x > 0 && grid[y][x - 1].buildingType === BuildingType.Road;
  
  // Bitmask: Left(8) | Down(4) | Right(2) | Up(1)
  return (hasLeft ? 8 : 0) | (hasDown ? 4 : 0) | (hasRight ? 2 : 0) | (hasUp ? 1 : 0);
};

// --- Main Road Component ---

export const RoadMarkings = React.memo(({ x, y, grid, yOffset, variant = 0 }: { x: number; y: number; grid: Grid; yOffset: number; variant?: number }) => {
  const mats = useMemo(() => ({
    yellow: new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.8, depthTest: true }),
    white: new THREE.MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.8, depthTest: true }),
    manhole: new THREE.MeshStandardMaterial({ color: '#4b5563', roughness: 0.7, metalness: 0.4 }),
    patch: new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 1, transparent: true, opacity: 0.6 }),
  }), []);

  const mask = getAdjacencyMask(x, y, grid);
  const groupProps = {
      rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
      position: [0, yOffset, 0] as [number, number, number]
  };

  // Visual Variation Logic
  // 0-39: Standard
  // 40-69: Worn (Patches)
  // 70-99: Utility (Manholes)
  const isWorn = variant >= 40 && variant < 70;
  const isUtility = variant >= 70;

  const renderExtras = () => {
    if (mask === 0) return null;

    if (isUtility) {
        // Manholes appear on straights, dead ends, and intersections, but usually not on sharp corners unless complex
        const isCorner = [3, 6, 9, 12].includes(mask);
        if (!isCorner) {
             return <mesh geometry={GEOMETRIES.road.manhole} material={mats.manhole} position={[0, 0, 0.01]} />
        }
    }

    if (isWorn) {
        // Pseudo-random position based on coordinates
        const seed = (x * 17 + y * 23);
        const px = ((seed % 7) / 10) - 0.3; // -0.3 to 0.3
        const py = ((seed % 5) / 10) - 0.2;
        const r = seed % 3;
        return <mesh geometry={GEOMETRIES.road.patch} material={mats.patch} position={[px, py, 0.005]} rotation={[0, 0, r]} />
    }

    return null;
  };

  const renderConfig = () => {
    switch (mask) {
        // Isolated
        case 0: return null;
        
        // Dead Ends
        case 1: return <StopArm rotation={0} matLine={mats.white} matZebra={mats.white} />;
        case 2: return <StopArm rotation={-Math.PI/2} matLine={mats.white} matZebra={mats.white} />;
        case 4: return <StopArm rotation={Math.PI} matLine={mats.white} matZebra={mats.white} />;
        case 8: return <StopArm rotation={Math.PI/2} matLine={mats.white} matZebra={mats.white} />;

        // Straights
        case 5: return <DashedLine material={mats.yellow} />;
        case 10: return <DashedLine horizontal material={mats.yellow} />;

        // Corners
        case 3: return <mesh geometry={GEOMETRIES.road.corner} material={mats.yellow} position={[0.5, 0.5, 0]} rotation={[0, 0, Math.PI]} />;
        case 6: return <mesh geometry={GEOMETRIES.road.corner} material={mats.yellow} position={[0.5, -0.5, 0]} rotation={[0, 0, Math.PI / 2]} />;
        case 12: return <mesh geometry={GEOMETRIES.road.corner} material={mats.yellow} position={[-0.5, -0.5, 0]} />;
        case 9: return <mesh geometry={GEOMETRIES.road.corner} material={mats.yellow} position={[-0.5, 0.5, 0]} rotation={[0, 0, -Math.PI / 2]} />;

        // T-Junctions
        case 7: return <><DashedLine material={mats.yellow} /><StopArm rotation={-Math.PI/2} matLine={mats.white} matZebra={mats.white} /></>;
        case 13: return <><DashedLine material={mats.yellow} /><StopArm rotation={Math.PI/2} matLine={mats.white} matZebra={mats.white} /></>;
        case 11: return <><DashedLine horizontal material={mats.yellow} /><StopArm rotation={0} matLine={mats.white} matZebra={mats.white} /></>;
        case 14: return <><DashedLine horizontal material={mats.yellow} /><StopArm rotation={Math.PI} matLine={mats.white} matZebra={mats.white} /></>;

        // Cross
        case 15: return (
           <>
              <StopArm rotation={0} matLine={mats.white} matZebra={mats.white} />
              <StopArm rotation={Math.PI} matLine={mats.white} matZebra={mats.white} />
              <StopArm rotation={-Math.PI/2} matLine={mats.white} matZebra={mats.white} />
              <StopArm rotation={Math.PI/2} matLine={mats.white} matZebra={mats.white} />
           </>
        );

        default: return <DashedLine material={mats.yellow} />;
    }
  };

  return (
    <group {...groupProps}>
        {renderConfig()}
        {renderExtras()}
    </group>
  );
});

// --- Building Visuals ---

// Helper for decorative blocks (chimneys, AC units, steps)
const DetailBlock = ({ position, scale, color, matProps }: any) => (
  <mesh geometry={GEOMETRIES.box} position={position} scale={scale} castShadow receiveShadow>
    <meshStandardMaterial color={color} {...matProps} />
  </mesh>
);

const WindowBlock = ({ position, scale }: { position: [number, number, number], scale: [number, number, number] }) => (
  <mesh geometry={GEOMETRIES.box} position={position} scale={scale}>
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
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.cone} position={[0, 0.75, 0]} scale={[0.6, 0.4, 0.6]} rotation={[0, Math.PI/4, 0]} />
                    <WindowBlock position={[0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                    <WindowBlock position={[-0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                    {/* Chimney */}
                    <DetailBlock position={[0.2, 0.7, -0.1]} scale={[0.1, 0.3, 0.1]} color="#78350f" matProps={matProps} />
                </group>
            )}
            {/* Variant B: Townhouse (40-69) */}
            {variant >= 40 && variant < 70 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[-0.15, 0.4, 0]} scale={[0.4, 0.8, 0.7]} />
                    <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.box} position={[0.15, 0.35, 0]} scale={[0.4, 0.7, 0.7]} />
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.box} position={[-0.15, 0.85, 0]} scale={[0.45, 0.1, 0.8]} />
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.box} position={[0.15, 0.75, 0]} scale={[0.45, 0.1, 0.8]} />
                    <WindowBlock position={[-0.15, 0.5, 0.36]} scale={[0.2, 0.2, 0.05]} />
                    <WindowBlock position={[0.15, 0.4, 0.36]} scale={[0.2, 0.2, 0.05]} />
                    {/* Steps/Awning Detail */}
                    <DetailBlock position={[0.15, 0.05, 0.4]} scale={[0.2, 0.1, 0.1]} color="#9ca3af" matProps={matProps} />
                </group>
            )}
            {/* Variant C: Apartment Block (70-99) */}
            {variant >= 70 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.5, 0]} scale={[0.8, 1.0, 0.8]} />
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.box} position={[0, 1.05, 0]} scale={[0.85, 0.1, 0.85]} />
                    {/* Balconies */}
                    <DetailBlock position={[0, 0.3, 0.42]} scale={[0.6, 0.05, 0.1]} color="#e2e8f0" matProps={matProps} />
                    <DetailBlock position={[0, 0.7, 0.42]} scale={[0.6, 0.05, 0.1]} color="#e2e8f0" matProps={matProps} />
                    <WindowBlock position={[-0.2, 0.45, 0.41]} scale={[0.15, 0.2, 0.05]} />
                    <WindowBlock position={[0.2, 0.45, 0.41]} scale={[0.15, 0.2, 0.05]} />
                    <WindowBlock position={[-0.2, 0.85, 0.41]} scale={[0.15, 0.2, 0.05]} />
                    <WindowBlock position={[0.2, 0.85, 0.41]} scale={[0.15, 0.2, 0.05]} />
                </group>
            )}
         </>
      )}
      
      {type === BuildingType.Commercial && (
        <>
            {/* Variant A: Shop (0-49) */}
            {variant < 50 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.5, 0]} scale={[0.8, 1.0, 0.8]} />
                    <WindowBlock position={[0, 0.5, 0.41]} scale={[0.6, 0.8, 0.05]} />
                    {/* Awning */}
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#f43f5e', ...matProps})} geometry={GEOMETRIES.box} position={[0, 0.2, 0.45]} scale={[0.8, 0.1, 0.2]} rotation={[0.2, 0, 0]} />
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.box} position={[0, 1.05, 0]} scale={[0.85, 0.1, 0.85]} />
                    {/* Sign */}
                    <DetailBlock position={[0, 0.8, 0.42]} scale={[0.5, 0.15, 0.05]} color="#fcd34d" matProps={matProps} />
                </group>
            )}
            {/* Variant B: Office Tower (50-99) */}
            {variant >= 50 && (
                <group>
                     <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.75, 0]} scale={[0.5, 1.5, 0.5]} />
                     <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.box} position={[0, 0.2, 0]} scale={[0.7, 0.4, 0.7]} />
                     {/* Glass Facade */}
                     <WindowBlock position={[0, 0.9, 0.26]} scale={[0.3, 1.0, 0.05]} />
                     <WindowBlock position={[0, 0.9, -0.26]} scale={[0.3, 1.0, 0.05]} />
                     {/* Antenna and Roof AC */}
                     <DetailBlock position={[0.1, 1.55, 0]} scale={[0.15, 0.1, 0.15]} color="#94a3b8" matProps={matProps} />
                     <mesh {...commonProps} material={metalMat} geometry={GEOMETRIES.cylinder} position={[-0.1, 1.6, 0]} scale={[0.02, 0.4, 0.02]} />
                </group>
            )}
        </>
      )}

      {type === BuildingType.Industrial && (
        <>
            {/* Variant A: Factory with smokestack (0-59) */}
            {variant < 60 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                    {/* Sawtooth Roof */}
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.box} position={[-0.22, 0.9, 0]} scale={[0.45, 0.15, 0.8]} rotation={[0,0,Math.PI/6]} />
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.box} position={[0.22, 0.9, 0]} scale={[0.45, 0.15, 0.8]} rotation={[0,0,Math.PI/6]} />
                    {/* Smokestack */}
                    <mesh {...commonProps} material={metalMat} geometry={GEOMETRIES.cylinder} position={[0.35, 0.8, 0.3]} scale={[0.1, 1.4, 0.1]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#333', ...matProps})} geometry={GEOMETRIES.cylinder} position={[0.35, 1.5, 0.3]} scale={[0.12, 0.1, 0.12]} />
                </group>
            )}
             {/* Variant B: Storage Tanks (60-99) */}
             {variant >= 60 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.1, 0]} scale={[0.95, 0.2, 0.95]} />
                    <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.cylinder} position={[-0.25, 0.45, -0.25]} scale={[0.3, 0.7, 0.3]} />
                    <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.cylinder} position={[0.25, 0.45, 0.25]} scale={[0.3, 0.7, 0.3]} />
                    {/* Pipes */}
                    <mesh {...commonProps} material={metalMat} geometry={GEOMETRIES.box} position={[0, 0.4, 0]} scale={[0.8, 0.05, 0.05]} rotation={[0, Math.PI/4, 0]} />
                    <mesh {...commonProps} material={metalMat} geometry={GEOMETRIES.cylinder} position={[0, 0.7, 0]} scale={[0.05, 0.6, 0.05]} />
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
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#15803d', ...matProps})} geometry={GEOMETRIES.cone} position={[0.2, 0.3, 0.2]} scale={[0.3, 0.6, 0.3]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#166534', ...matProps})} geometry={GEOMETRIES.cone} position={[-0.2, 0.4, -0.2]} scale={[0.4, 0.8, 0.4]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#14532d', ...matProps})} geometry={GEOMETRIES.cone} position={[-0.3, 0.25, 0.3]} scale={[0.25, 0.5, 0.25]} />
                </>
            )}
            {/* Variant B: Fountain Plaza (50-99) */}
            {variant >= 50 && (
                <>
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#94a3b8', ...matProps})} geometry={GEOMETRIES.cylinder} position={[0, 0.1, 0]} scale={[0.6, 0.2, 0.6]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#60a5fa', ...matProps, transparent: true, opacity: 0.8})} geometry={GEOMETRIES.cylinder} position={[0, 0.15, 0]} scale={[0.5, 0.15, 0.5]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#cbd5e1', ...matProps})} geometry={GEOMETRIES.cylinder} position={[0, 0.3, 0]} scale={[0.1, 0.4, 0.1]} />
                    {/* Benches */}
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#78350f', ...matProps})} geometry={GEOMETRIES.box} position={[0.35, 0.1, 0]} scale={[0.1, 0.15, 0.3]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#78350f', ...matProps})} geometry={GEOMETRIES.box} position={[-0.35, 0.1, 0]} scale={[0.1, 0.15, 0.3]} />
                </>
            )}
         </group>
      )}
    </group>
  );
});