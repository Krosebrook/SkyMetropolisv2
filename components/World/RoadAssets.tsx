/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BuildingType, Grid } from '../../types';
import { GRID_SIZE } from '../../constants';

// --- Configuration & Constants ---

const ROAD_GEO = {
    dash: new THREE.PlaneGeometry(0.12, 0.25),
    corner: new THREE.RingGeometry(0.44, 0.56, 32, 1, 0, Math.PI / 2),
    stopLine: new THREE.PlaneGeometry(0.6, 0.12),
    zebra: new THREE.PlaneGeometry(0.12, 0.3),
    manhole: new THREE.CircleGeometry(0.14, 16),
    patch: new THREE.PlaneGeometry(0.25, 0.3),
    yieldDash: new THREE.PlaneGeometry(0.12, 0.12),
    roundabout: new THREE.RingGeometry(0.2, 0.3, 32),
    island: new THREE.CircleGeometry(0.18, 32),
    sidewalk: new THREE.BoxGeometry(0.15, 0.05, 1),
};

const MASKS = { UP: 1, RIGHT: 2, DOWN: 4, LEFT: 8 };

type RoadStyle = 'standard' | 'worn' | 'modern';
type RoadTopology = 'straight' | 'corner' | 'end' | 'threeWay' | 'fourWay';

interface RoadContext {
    style: RoadStyle;
    mats: {
        line: THREE.Material;
        stop: THREE.Material;
        island: THREE.Material;
        sidewalk: THREE.Material;
        decor: {
            manhole: THREE.Material;
            patch: THREE.Material;
        }
    }
}

// --- Topology Resolver ---

const getAdjacencyMask = (x: number, y: number, grid: Grid) => {
  const isRoad = (gx: number, gy: number) => {
      if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return false;
      return grid[gy][gx].buildingType === BuildingType.Road;
  };

  return (isRoad(x-1, y) ? MASKS.LEFT : 0) | 
         (isRoad(x, y+1) ? MASKS.DOWN : 0) | 
         (isRoad(x+1, y) ? MASKS.RIGHT : 0) | 
         (isRoad(x, y-1) ? MASKS.UP : 0);
};

const resolveTopology = (mask: number): { type: RoadTopology; rotation: number } | null => {
  if (mask === 0) return null;

  // Straight
  if (mask === (MASKS.UP | MASKS.DOWN)) return { type: 'straight', rotation: 0 };
  if (mask === (MASKS.LEFT | MASKS.RIGHT)) return { type: 'straight', rotation: Math.PI / 2 };

  // Ends (Dead ends)
  if (mask === MASKS.UP) return { type: 'end', rotation: 0 };
  if (mask === MASKS.RIGHT) return { type: 'end', rotation: -Math.PI / 2 };
  if (mask === MASKS.DOWN) return { type: 'end', rotation: Math.PI };
  if (mask === MASKS.LEFT) return { type: 'end', rotation: Math.PI / 2 };

  // Corners
  if (mask === (MASKS.UP | MASKS.RIGHT)) return { type: 'corner', rotation: Math.PI };
  if (mask === (MASKS.RIGHT | MASKS.DOWN)) return { type: 'corner', rotation: Math.PI / 2 };
  if (mask === (MASKS.DOWN | MASKS.LEFT)) return { type: 'corner', rotation: 0 };
  if (mask === (MASKS.LEFT | MASKS.UP)) return { type: 'corner', rotation: -Math.PI / 2 };

  // 3-Way (T-Junctions) - Rotation aligns the "top" of the T
  if (mask === (MASKS.UP | MASKS.DOWN | MASKS.RIGHT)) return { type: 'threeWay', rotation: -Math.PI / 2 };
  if (mask === (MASKS.UP | MASKS.DOWN | MASKS.LEFT)) return { type: 'threeWay', rotation: Math.PI / 2 };
  if (mask === (MASKS.LEFT | MASKS.RIGHT | MASKS.UP)) return { type: 'threeWay', rotation: 0 };
  if (mask === (MASKS.LEFT | MASKS.RIGHT | MASKS.DOWN)) return { type: 'threeWay', rotation: Math.PI };

  // 4-Way
  if (mask === 15) return { type: 'fourWay', rotation: 0 };

  // Default fallback for single connections not caught above or errors
  return { type: 'straight', rotation: 0 };
};

// --- Atomic Render Components ---

const Sidewalks = ({ material }: { material: THREE.Material }) => (
    <group>
        <mesh geometry={ROAD_GEO.sidewalk} material={material} position={[0.425, 0.02, 0]} receiveShadow />
        <mesh geometry={ROAD_GEO.sidewalk} material={material} position={[-0.425, 0.02, 0]} receiveShadow />
    </group>
);

const DashedLine = ({ material }: { material: THREE.Material }) => (
  <group>
    <mesh geometry={ROAD_GEO.dash} material={material} position={[0, 0.33, 0]} />
    <mesh geometry={ROAD_GEO.dash} material={material} position={[0, 0, 0]} />
    <mesh geometry={ROAD_GEO.dash} material={material} position={[0, -0.33, 0]} />
  </group>
);

const StopBar = ({ material }: { material: THREE.Material }) => (
    <group position={[0, 0.3, 0]}>
        <mesh geometry={ROAD_GEO.stopLine} material={material} position={[0, -0.08, 0]} />
        <group position={[0, 0.08, 0]}>
            <mesh geometry={ROAD_GEO.zebra} material={material} position={[-0.2, 0, 0]} />
            <mesh geometry={ROAD_GEO.zebra} material={material} position={[0, 0, 0]} />
            <mesh geometry={ROAD_GEO.zebra} material={material} position={[0.2, 0, 0]} />
        </group>
    </group>
);

// --- Topological Components ---

const RenderStraight = ({ ctx }: { ctx: RoadContext }) => (
    <group>
        <DashedLine material={ctx.mats.line} />
        {ctx.style === 'modern' && <Sidewalks material={ctx.mats.sidewalk} />}
    </group>
);

const RenderCorner = ({ ctx }: { ctx: RoadContext }) => (
    <mesh geometry={ROAD_GEO.corner} material={ctx.mats.line} />
);

const RenderEnd = ({ ctx }: { ctx: RoadContext }) => (
    <StopBar material={ctx.mats.stop} />
);

const RenderThreeWay = ({ ctx }: { ctx: RoadContext }) => (
    <group>
        {/* The straight part through the T */}
        <group rotation={[0, 0, Math.PI/2]}>
             <DashedLine material={ctx.mats.line} />
             {ctx.style === 'modern' && (
                 // Only one sidewalk on the flat side of the T
                 <mesh geometry={ROAD_GEO.sidewalk} material={ctx.mats.sidewalk} position={[0.425, 0.02, 0]} receiveShadow />
             )}
        </group>
        {/* The connecting leg */}
        <group position={[0, -0.5, 0]} rotation={[0, 0, 0]}>
            <StopBar material={ctx.mats.stop} />
        </group>
    </group>
);

const RenderFourWay = ({ ctx, isRoundabout }: { ctx: RoadContext, isRoundabout: boolean }) => {
    if (isRoundabout) {
        return (
            <group>
                <mesh geometry={ROAD_GEO.roundabout} material={ctx.mats.line} position={[0, 0, 0.005]} />
                <mesh geometry={ROAD_GEO.island} material={ctx.mats.island} position={[0, 0, 0.1]} />
            </group>
        );
    }
    return (
        <group>
            <group rotation={[0,0,0]}><StopBar material={ctx.mats.stop} /></group>
            <group rotation={[0,0,Math.PI]}><StopBar material={ctx.mats.stop} /></group>
            <group rotation={[0,0,Math.PI/2]}><StopBar material={ctx.mats.stop} /></group>
            <group rotation={[0,0,-Math.PI/2]}><StopBar material={ctx.mats.stop} /></group>
        </group>
    );
};

// --- Main Export ---

export const RoadMarkings = React.memo(({ x, y, grid, yOffset, variant = 0 }: { x: number; y: number; grid: Grid; yOffset: number; variant?: number }) => {
  
  // 1. Determine Style
  const style: RoadStyle = variant >= 70 ? 'modern' : (variant >= 40 ? 'worn' : 'standard');

  // 2. Prepare Materials
  const mats = useMemo(() => {
    const palette = {
        yellow: '#fbbf24',
        darkYellow: '#d97706',
        white: '#f8fafc',
        grey: '#e5e7eb',
        concrete: '#9ca3af',
        darkMetal: '#4b5563',
        asphaltDark: '#1f2937',
        grass: '#4ade80'
    };

    const lineBase = style === 'modern' ? palette.white : (style === 'worn' ? palette.darkYellow : palette.yellow);
    const roughness = style === 'worn' ? 1.0 : 0.6;

    return {
        line: new THREE.MeshStandardMaterial({ color: lineBase, roughness }),
        stop: new THREE.MeshStandardMaterial({ color: palette.grey, roughness: 0.8 }),
        island: new THREE.MeshStandardMaterial({ color: palette.grass, roughness: 1 }),
        sidewalk: new THREE.MeshStandardMaterial({ color: palette.concrete, roughness: 0.9 }),
        decor: {
            manhole: new THREE.MeshStandardMaterial({ color: palette.darkMetal, roughness: 0.7, metalness: 0.4 }),
            patch: new THREE.MeshStandardMaterial({ color: palette.asphaltDark, roughness: 1, transparent: true, opacity: 0.6 }),
        }
    };
  }, [style]);

  const context: RoadContext = { style, mats };

  // 3. Resolve Topology
  const mask = getAdjacencyMask(x, y, grid);
  const topology = resolveTopology(mask);

  if (!topology) return null;

  // 4. Render
  const { type, rotation } = topology;
  const isRoundabout = type === 'fourWay' && style === 'modern';

  const renderContent = () => {
      switch (type) {
          case 'straight': return <RenderStraight ctx={context} />;
          case 'corner': return <RenderCorner ctx={context} />;
          case 'end': return <RenderEnd ctx={context} />;
          case 'threeWay': return <RenderThreeWay ctx={context} />;
          case 'fourWay': return <RenderFourWay ctx={context} isRoundabout={isRoundabout} />;
          default: return null;
      }
  };

  const renderDecor = () => {
    if (isRoundabout) return null;
    
    // Manholes on straights for Modern/Utility
    if (variant > 80 && type === 'straight') {
         return <mesh geometry={ROAD_GEO.manhole} material={mats.decor.manhole} position={[0, 0, 0.01]} />
    }
    // Patches for Worn
    if (style === 'worn') {
        const seed = (x * 12.9898 + y * 78.233); // simple hash
        const r = (seed % 1) * Math.PI;
        return <mesh geometry={ROAD_GEO.patch} material={mats.decor.patch} position={[0, 0, 0.005]} rotation={[0,0,r]} />
    }
    return null;
  };

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
        <group rotation={[0, 0, rotation]}>
            {renderContent()}
        </group>
        {renderDecor()}
    </group>
  );
});
