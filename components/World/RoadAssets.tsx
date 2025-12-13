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
    roundabout: new THREE.RingGeometry(0.2, 0.3, 32),
    island: new THREE.CircleGeometry(0.18, 32),
    sidewalk: new THREE.BoxGeometry(0.15, 0.05, 1),
};

const MASKS = { 
    NONE: 0,
    UP: 1, 
    RIGHT: 2, 
    DOWN: 4, 
    LEFT: 8 
};

type RoadStyle = 'standard' | 'worn' | 'modern';
type RoadTopology = 'straight' | 'corner' | 'end' | 'threeWay' | 'fourWay';

interface RoadContext {
    style: RoadStyle;
    variant: number;
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

interface RendererProps {
    ctx: RoadContext;
}

// --- Topology Mapping ---

/**
 * Maps 4-bit adjacency mask (0-15) to specific road topology and rotation.
 * Mask bits: UP=1, RIGHT=2, DOWN=4, LEFT=8
 */
const TOPOLOGY_MAP: Record<number, { type: RoadTopology; rotation: number } | null> = {
    [MASKS.NONE]: null,
    
    // Dead Ends (End points pointing towards the connection)
    [MASKS.UP]: { type: 'end', rotation: 0 },
    [MASKS.RIGHT]: { type: 'end', rotation: -Math.PI / 2 },
    [MASKS.DOWN]: { type: 'end', rotation: Math.PI },
    [MASKS.LEFT]: { type: 'end', rotation: Math.PI / 2 },

    // Straights
    [MASKS.UP | MASKS.DOWN]: { type: 'straight', rotation: 0 },
    [MASKS.LEFT | MASKS.RIGHT]: { type: 'straight', rotation: Math.PI / 2 },

    // Corners
    [MASKS.UP | MASKS.RIGHT]: { type: 'corner', rotation: Math.PI },
    [MASKS.RIGHT | MASKS.DOWN]: { type: 'corner', rotation: Math.PI / 2 },
    [MASKS.DOWN | MASKS.LEFT]: { type: 'corner', rotation: 0 },
    [MASKS.LEFT | MASKS.UP]: { type: 'corner', rotation: -Math.PI / 2 },

    // T-Junctions (Rotation orients the "top" of the T)
    [MASKS.UP | MASKS.DOWN | MASKS.RIGHT]: { type: 'threeWay', rotation: 0 },     // Right Leg
    [MASKS.LEFT | MASKS.RIGHT | MASKS.UP]: { type: 'threeWay', rotation: Math.PI / 2 }, // Up Leg
    [MASKS.UP | MASKS.DOWN | MASKS.LEFT]: { type: 'threeWay', rotation: Math.PI },     // Left Leg
    [MASKS.LEFT | MASKS.RIGHT | MASKS.DOWN]: { type: 'threeWay', rotation: -Math.PI / 2 }, // Down Leg

    // Intersections
    [MASKS.UP | MASKS.RIGHT | MASKS.DOWN | MASKS.LEFT]: { type: 'fourWay', rotation: 0 },
};

// --- Helpers ---

const getAdjacencyMask = (x: number, y: number, grid: Grid): number => {
    const isRoad = (gx: number, gy: number) => {
        if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return false;
        return grid[gy][gx].buildingType === BuildingType.Road;
    };
    return (isRoad(x-1, y) ? MASKS.LEFT : 0) | 
           (isRoad(x, y+1) ? MASKS.DOWN : 0) | 
           (isRoad(x+1, y) ? MASKS.RIGHT : 0) | 
           (isRoad(x, y-1) ? MASKS.UP : 0);
};

const useRoadContext = (variant: number): RoadContext => {
    // Style determination logic
    const style: RoadStyle = variant >= 70 ? 'modern' : (variant >= 40 ? 'worn' : 'standard');

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
            line: new THREE.MeshStandardMaterial({ color: lineBase, roughness, side: THREE.DoubleSide }),
            stop: new THREE.MeshStandardMaterial({ color: palette.grey, roughness: 0.8 }),
            island: new THREE.MeshStandardMaterial({ color: palette.grass, roughness: 1 }),
            sidewalk: new THREE.MeshStandardMaterial({ color: palette.concrete, roughness: 0.9 }),
            decor: {
                manhole: new THREE.MeshStandardMaterial({ color: palette.darkMetal, roughness: 0.7, metalness: 0.4 }),
                patch: new THREE.MeshStandardMaterial({ color: palette.asphaltDark, roughness: 1, transparent: true, opacity: 0.6 }),
            }
        };
    }, [style]);

    return { style, variant, mats };
};

// --- Sub-Components (Visuals) ---

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

// --- Topology Renderers ---

const RenderStraight: React.FC<RendererProps> = ({ ctx }) => (
    <group>
        <DashedLine material={ctx.mats.line} />
        {ctx.style === 'modern' && <Sidewalks material={ctx.mats.sidewalk} />}
        
        {/* Decor: Manholes for Modern/Utility */}
        {ctx.variant > 80 && ctx.style !== 'standard' && (
             <mesh geometry={ROAD_GEO.manhole} material={ctx.mats.decor.manhole} position={[0, 0, 0.01]} />
        )}
        {/* Decor: Patches for Worn */}
        {ctx.style === 'worn' && (ctx.variant % 3 === 0) && (
            <mesh geometry={ROAD_GEO.patch} material={ctx.mats.decor.patch} position={[0, 0.1, 0.005]} rotation={[0,0,0.2]} />
        )}
    </group>
);

const RenderCorner: React.FC<RendererProps> = ({ ctx }) => (
    <mesh geometry={ROAD_GEO.corner} material={ctx.mats.line} />
);

const RenderEnd: React.FC<RendererProps> = ({ ctx }) => (
    <StopBar material={ctx.mats.stop} />
);

const RenderThreeWay: React.FC<RendererProps> = ({ ctx }) => (
    <group>
        {/* Main straight through the T (Vertical) */}
        <DashedLine material={ctx.mats.line} />
        {ctx.style === 'modern' && (
            // Single sidewalk on the flat side of the T (Left side, since leg is Right)
            <mesh geometry={ROAD_GEO.sidewalk} material={ctx.mats.sidewalk} position={[-0.425, 0.02, 0]} receiveShadow />
        )}
        
        {/* The intersecting stop (Right) */}
        <group position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
            <StopBar material={ctx.mats.stop} />
        </group>
    </group>
);

const RenderFourWay: React.FC<RendererProps> = ({ ctx }) => {
    const isRoundabout = ctx.style === 'modern';

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
            {[0, Math.PI, Math.PI/2, -Math.PI/2].map((rot, i) => (
                <group key={i} rotation={[0, 0, rot]}>
                    <StopBar material={ctx.mats.stop} />
                </group>
            ))}
        </group>
    );
};

const RENDERERS: Record<RoadTopology, React.FC<RendererProps>> = {
    straight: RenderStraight,
    corner: RenderCorner,
    end: RenderEnd,
    threeWay: RenderThreeWay,
    fourWay: RenderFourWay,
};

// --- Main Export ---

export const RoadMarkings = React.memo(({ x, y, grid, yOffset, variant = 0 }: { x: number; y: number; grid: Grid; yOffset: number; variant?: number }) => {
    const ctx = useRoadContext(variant);
    
    // 1. Calculate Adjacency Mask
    const mask = useMemo(() => getAdjacencyMask(x, y, grid), [x, y, grid]);

    // 2. Resolve Topology
    const topology = TOPOLOGY_MAP[mask];

    if (!topology) return null;

    // 3. Select Renderer
    const Renderer = RENDERERS[topology.type];

    // 4. Global Decor (Worn patches on corners/junctions)
    const renderGlobalDecor = () => {
        if (ctx.style === 'worn' && topology.type !== 'straight') {
             const seed = (x * 12.98 + y * 78.23);
             const r = (seed % 1) * Math.PI;
             return <mesh geometry={ROAD_GEO.patch} material={ctx.mats.decor.patch} position={[0, 0, 0.005]} rotation={[0,0,r]} />
        }
        return null;
    };

    return (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
            <group rotation={[0, 0, topology.rotation]}>
                <Renderer ctx={ctx} />
            </group>
            {renderGlobalDecor()}
        </group>
    );
});
