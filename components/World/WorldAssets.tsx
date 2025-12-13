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

// --- Road Marking Sub-Components ---

interface RoadSubComponentProps {
  material: THREE.Material;
}

// 1. Straight Road Segment (Dashed Line)
const MarkingStraight = ({ horizontal = false, material }: { horizontal?: boolean } & RoadSubComponentProps) => (
  <group rotation={[0, 0, horizontal ? Math.PI / 2 : 0]}>
    <mesh geometry={GEOMETRIES.road.dash} material={material} position={[0, 0.33, 0]} />
    <mesh geometry={GEOMETRIES.road.dash} material={material} position={[0, 0, 0]} />
    <mesh geometry={GEOMETRIES.road.dash} material={material} position={[0, -0.33, 0]} />
  </group>
);

// 2. Corner Segment (Curved Yellow Line)
const MarkingCorner = ({ rotation, material }: { rotation: number } & RoadSubComponentProps) => (
    <mesh geometry={GEOMETRIES.road.corner} material={material} position={[0,0,0]} rotation={[0, 0, rotation]} />
);

// 3. Stop Segment (Stop Line + Crosswalk)
const MarkingStop = ({ rotation, matLine, matZebra }: { rotation: number, matLine: THREE.Material, matZebra: THREE.Material }) => (
  <group rotation={[0, 0, rotation]}>
    <mesh geometry={GEOMETRIES.road.stopLine} material={matLine} position={[0, 0.22, 0]} />
    <group position={[0, 0.38, 0]}>
       <mesh geometry={GEOMETRIES.road.zebra} material={matZebra} position={[-0.2, 0, 0]} />
       <mesh geometry={GEOMETRIES.road.zebra} material={matZebra} position={[0, 0, 0]} />
       <mesh geometry={GEOMETRIES.road.zebra} material={matZebra} position={[0.2, 0, 0]} />
    </group>
  </group>
);

// --- Adjacency Logic ---

const MASKS = {
    UP: 1,
    RIGHT: 2,
    DOWN: 4,
    LEFT: 8
};

const getAdjacencyMask = (x: number, y: number, grid: Grid) => {
  const hasUp = y > 0 && grid[y - 1][x].buildingType === BuildingType.Road;
  const hasRight = x < GRID_SIZE - 1 && grid[y][x + 1].buildingType === BuildingType.Road;
  const hasDown = y < GRID_SIZE - 1 && grid[y + 1][x].buildingType === BuildingType.Road;
  const hasLeft = x > 0 && grid[y][x - 1].buildingType === BuildingType.Road;
  
  return (hasLeft ? MASKS.LEFT : 0) | (hasDown ? MASKS.DOWN : 0) | (hasRight ? MASKS.RIGHT : 0) | (hasUp ? MASKS.UP : 0);
};

// --- Main Component ---

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

  // --- Render Strategy ---
  const renderMarkings = () => {
    // 0. Isolated or Unknown
    if (mask === 0) return null;

    // 1. Straight Roads
    if (mask === (MASKS.UP | MASKS.DOWN)) 
        return <MarkingStraight material={mats.yellow} />;
    
    if (mask === (MASKS.LEFT | MASKS.RIGHT)) 
        return <MarkingStraight horizontal material={mats.yellow} />;

    // 2. Dead Ends (Single connection)
    if (mask === MASKS.UP) return <MarkingStop rotation={0} matLine={mats.white} matZebra={mats.white} />;
    if (mask === MASKS.RIGHT) return <MarkingStop rotation={-Math.PI/2} matLine={mats.white} matZebra={mats.white} />;
    if (mask === MASKS.DOWN) return <MarkingStop rotation={Math.PI} matLine={mats.white} matZebra={mats.white} />;
    if (mask === MASKS.LEFT) return <MarkingStop rotation={Math.PI/2} matLine={mats.white} matZebra={mats.white} />;

    // 3. Corners
    if (mask === (MASKS.UP | MASKS.RIGHT)) 
        return <group position={[0.5, 0.5, 0]}><MarkingCorner rotation={Math.PI} material={mats.yellow} /></group>;
    
    if (mask === (MASKS.RIGHT | MASKS.DOWN)) 
        return <group position={[0.5, -0.5, 0]}><MarkingCorner rotation={Math.PI/2} material={mats.yellow} /></group>;
    
    if (mask === (MASKS.DOWN | MASKS.LEFT)) 
        return <group position={[-0.5, -0.5, 0]}><MarkingCorner rotation={0} material={mats.yellow} /></group>;
    
    if (mask === (MASKS.LEFT | MASKS.UP)) 
        return <group position={[-0.5, 0.5, 0]}><MarkingCorner rotation={-Math.PI/2} material={mats.yellow} /></group>;

    // 4. T-Junctions
    if (mask === (MASKS.UP | MASKS.DOWN | MASKS.RIGHT)) 
        return <><MarkingStraight material={mats.yellow} /><MarkingStop rotation={-Math.PI/2} matLine={mats.white} matZebra={mats.white} /></>;
    
    if (mask === (MASKS.UP | MASKS.DOWN | MASKS.LEFT)) 
        return <><MarkingStraight material={mats.yellow} /><MarkingStop rotation={Math.PI/2} matLine={mats.white} matZebra={mats.white} /></>;
    
    if (mask === (MASKS.LEFT | MASKS.RIGHT | MASKS.UP)) 
        return <><MarkingStraight horizontal material={mats.yellow} /><MarkingStop rotation={0} matLine={mats.white} matZebra={mats.white} /></>;
    
    if (mask === (MASKS.LEFT | MASKS.RIGHT | MASKS.DOWN)) 
        return <><MarkingStraight horizontal material={mats.yellow} /><MarkingStop rotation={Math.PI} matLine={mats.white} matZebra={mats.white} /></>;

    // 5. Cross (4-Way)
    if (mask === 15) return (
       <>
          <MarkingStop rotation={0} matLine={mats.white} matZebra={mats.white} />
          <MarkingStop rotation={Math.PI} matLine={mats.white} matZebra={mats.white} />
          <MarkingStop rotation={-Math.PI/2} matLine={mats.white} matZebra={mats.white} />
          <MarkingStop rotation={Math.PI/2} matLine={mats.white} matZebra={mats.white} />
       </>
    );

    return <MarkingStraight material={mats.yellow} />;
  };

  const renderDetails = () => {
    const isWorn = variant >= 40 && variant < 70;
    const isUtility = variant >= 70;

    if (mask === 0) return null;

    if (isUtility) {
        const isCorner = [3, 6, 9, 12].includes(mask);
        if (!isCorner) {
             return <mesh geometry={GEOMETRIES.road.manhole} material={mats.manhole} position={[0, 0, 0.01]} />
        }
    }

    if (isWorn) {
        const seed = (x * 17 + y * 23);
        const px = ((seed % 7) / 10) - 0.3;
        const py = ((seed % 5) / 10) - 0.2;
        const r = seed % 3;
        return <mesh geometry={GEOMETRIES.road.patch} material={mats.patch} position={[px, py, 0.005]} rotation={[0, 0, r]} />
    }
    return null;
  };

  return (
    <group {...groupProps}>
        {renderMarkings()}
        {renderDetails()}
    </group>
  );
});

// --- Building Visuals ---

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
                    <DetailBlock position={[0.15, 0.05, 0.4]} scale={[0.2, 0.1, 0.1]} color="#9ca3af" matProps={matProps} />
                </group>
            )}
            {/* Variant C: Apartment Block (70-89) */}
            {variant >= 70 && variant < 90 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.5, 0]} scale={[0.8, 1.0, 0.8]} />
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.box} position={[0, 1.05, 0]} scale={[0.85, 0.1, 0.85]} />
                    <DetailBlock position={[0, 0.3, 0.42]} scale={[0.6, 0.05, 0.1]} color="#e2e8f0" matProps={matProps} />
                    <DetailBlock position={[0, 0.7, 0.42]} scale={[0.6, 0.05, 0.1]} color="#e2e8f0" matProps={matProps} />
                    <WindowBlock position={[-0.2, 0.45, 0.41]} scale={[0.15, 0.2, 0.05]} />
                    <WindowBlock position={[0.2, 0.45, 0.41]} scale={[0.15, 0.2, 0.05]} />
                    <WindowBlock position={[-0.2, 0.85, 0.41]} scale={[0.15, 0.2, 0.05]} />
                    <WindowBlock position={[0.2, 0.85, 0.41]} scale={[0.15, 0.2, 0.05]} />
                </group>
            )}
             {/* Variant D: Modern Villa (90-99) */}
             {variant >= 90 && (
                <group>
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#f8fafc', ...matProps})} geometry={GEOMETRIES.box} position={[-0.1, 0.3, 0]} scale={[0.6, 0.6, 0.8]} />
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0.1, 0.7, 0]} scale={[0.5, 0.4, 0.9]} />
                    <WindowBlock position={[-0.1, 0.3, 0.41]} scale={[0.4, 0.4, 0.05]} />
                    <WindowBlock position={[0.2, 0.7, 0.46]} scale={[0.3, 0.3, 0.05]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#38bdf8', ...matProps})} geometry={GEOMETRIES.box} position={[0.3, 0.1, 0]} scale={[0.3, 0.05, 0.6]} />
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
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#f43f5e', ...matProps})} geometry={GEOMETRIES.box} position={[0, 0.2, 0.45]} scale={[0.8, 0.1, 0.2]} rotation={[0.2, 0, 0]} />
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.box} position={[0, 1.05, 0]} scale={[0.85, 0.1, 0.85]} />
                    <DetailBlock position={[0, 0.8, 0.42]} scale={[0.5, 0.15, 0.05]} color="#fcd34d" matProps={matProps} />
                </group>
            )}
            {/* Variant B: Office Tower (50-79) */}
            {variant >= 50 && variant < 80 && (
                <group>
                     <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.75, 0]} scale={[0.5, 1.5, 0.5]} />
                     <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.box} position={[0, 0.2, 0]} scale={[0.7, 0.4, 0.7]} />
                     <WindowBlock position={[0, 0.9, 0.26]} scale={[0.3, 1.0, 0.05]} />
                     <WindowBlock position={[0, 0.9, -0.26]} scale={[0.3, 1.0, 0.05]} />
                     <DetailBlock position={[0.1, 1.55, 0]} scale={[0.15, 0.1, 0.15]} color="#94a3b8" matProps={matProps} />
                     <mesh {...commonProps} material={metalMat} geometry={GEOMETRIES.cylinder} position={[-0.1, 1.6, 0]} scale={[0.02, 0.4, 0.02]} />
                </group>
            )}
             {/* Variant C: Skyscraper (80-99) */}
            {variant >= 80 && (
                <group>
                     <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 1.25, 0]} scale={[0.6, 2.5, 0.6]} />
                     <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.3, 0]} scale={[0.9, 0.6, 0.9]} />
                     <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.box} position={[0.31, 1.25, 0]} scale={[0.05, 2.5, 0.4]} />
                     <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.box} position={[-0.31, 1.25, 0]} scale={[0.05, 2.5, 0.4]} />
                     <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.box} position={[0, 1.25, 0.31]} scale={[0.4, 2.5, 0.05]} />
                     <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.box} position={[0, 1.25, -0.31]} scale={[0.4, 2.5, 0.05]} />
                     <mesh {...commonProps} material={metalMat} geometry={GEOMETRIES.cone} position={[0, 2.6, 0]} scale={[0.1, 0.5, 0.1]} />
                </group>
            )}
        </>
      )}

      {type === BuildingType.Industrial && (
        <>
            {/* Variant A: Factory (0-59) */}
            {variant < 60 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.box} position={[-0.22, 0.9, 0]} scale={[0.45, 0.15, 0.8]} rotation={[0,0,Math.PI/6]} />
                    <mesh {...commonProps} material={roofMat} geometry={GEOMETRIES.box} position={[0.22, 0.9, 0]} scale={[0.45, 0.15, 0.8]} rotation={[0,0,Math.PI/6]} />
                    <mesh {...commonProps} material={metalMat} geometry={GEOMETRIES.cylinder} position={[0.35, 0.8, 0.3]} scale={[0.1, 1.4, 0.1]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color:'#333', ...matProps})} geometry={GEOMETRIES.cylinder} position={[0.35, 1.5, 0.3]} scale={[0.12, 0.1, 0.12]} />
                </group>
            )}
             {/* Variant B: Storage Tanks (60-79) */}
             {variant >= 60 && variant < 80 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.1, 0]} scale={[0.95, 0.2, 0.95]} />
                    <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.cylinder} position={[-0.25, 0.45, -0.25]} scale={[0.3, 0.7, 0.3]} />
                    <mesh {...commonProps} material={accentMat} geometry={GEOMETRIES.cylinder} position={[0.25, 0.45, 0.25]} scale={[0.3, 0.7, 0.3]} />
                    <mesh {...commonProps} material={metalMat} geometry={GEOMETRIES.box} position={[0, 0.4, 0]} scale={[0.8, 0.05, 0.05]} rotation={[0, Math.PI/4, 0]} />
                    <mesh {...commonProps} material={metalMat} geometry={GEOMETRIES.cylinder} position={[0, 0.7, 0]} scale={[0.05, 0.6, 0.05]} />
                </group>
             )}
             {/* Variant C: Warehouse (80-99) */}
             {variant >= 80 && (
                <group>
                    <mesh {...commonProps} material={mainMat} geometry={GEOMETRIES.box} position={[0, 0.35, 0]} scale={[0.9, 0.7, 0.9]} />
                    <DetailBlock position={[-0.2, 0.75, 0]} scale={[0.15, 0.15, 0.15]} color="#94a3b8" matProps={matProps} />
                    <DetailBlock position={[0.2, 0.75, 0]} scale={[0.15, 0.15, 0.15]} color="#94a3b8" matProps={matProps} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#334155', ...matProps})} geometry={GEOMETRIES.box} position={[0, 0.2, 0.46]} scale={[0.2, 0.3, 0.05]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#334155', ...matProps})} geometry={GEOMETRIES.box} position={[-0.3, 0.2, 0.46]} scale={[0.2, 0.3, 0.05]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#334155', ...matProps})} geometry={GEOMETRIES.box} position={[0.3, 0.2, 0.46]} scale={[0.2, 0.3, 0.05]} />
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
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#78350f', ...matProps})} geometry={GEOMETRIES.box} position={[0.35, 0.1, 0]} scale={[0.1, 0.15, 0.3]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#78350f', ...matProps})} geometry={GEOMETRIES.box} position={[-0.35, 0.1, 0]} scale={[0.1, 0.15, 0.3]} />
                </>
            )}
         </group>
      )}
    </group>
  );
});