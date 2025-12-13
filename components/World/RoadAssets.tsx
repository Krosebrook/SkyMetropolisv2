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
    surface: new THREE.PlaneGeometry(1, 1),
    dash: new THREE.PlaneGeometry(0.12, 0.25),
    corner: new THREE.RingGeometry(0.44, 0.56, 32, 1, 0, Math.PI / 2),
    stopLine: new THREE.PlaneGeometry(0.6, 0.12),
    zebra: new THREE.PlaneGeometry(0.12, 0.3),
    manhole: new THREE.CircleGeometry(0.14, 16),
    patch: new THREE.PlaneGeometry(0.25, 0.3),
    roundabout: new THREE.RingGeometry(0.2, 0.3, 32),
    island: new THREE.CircleGeometry(0.18, 32),
    // Improved Sidewalk Geometries
    sidewalkStraight: new THREE.BoxGeometry(0.15, 0.05, 1),
    sidewalkCornerInner: new THREE.RingGeometry(0.4, 0.55, 16, 1, 0, Math.PI / 2), // Outer curve for turns
    sidewalkCornerOuter: new THREE.RingGeometry(0.1, 0.25, 16, 1, 0, Math.PI / 2), // Inner fillet for intersections
    pole: new THREE.BoxGeometry(0.05, 1, 0.05),
    lightBox: new THREE.BoxGeometry(0.3, 0.12, 0.1),
};

const MASKS = { 
    NONE: 0,
    UP: 1, 
    RIGHT: 2, 
    DOWN: 4, 
    LEFT: 8 
};

const CONNECTABLE_TYPES = new Set([BuildingType.Road]);

type RoadStyle = 'standard' | 'worn' | 'modern';
type RoadTopology = 'straight' | 'corner' | 'end' | 'threeWay' | 'fourWay';

interface RoadContext {
    style: RoadStyle;
    variant: number;
    widthScale: number;
    mats: {
        surface: THREE.Material;
        line: THREE.Material;
        stop: THREE.Material;
        island: THREE.Material;
        sidewalk: THREE.Material;
        pole: THREE.Material;
        lightBox: THREE.Material;
        lightRed: THREE.Material;
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

const TOPOLOGY_MAP: Record<number, { type: RoadTopology; rotation: number } | null> = {
    [MASKS.NONE]: null,
    
    // Dead Ends
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

    // T-Junctions
    [MASKS.UP | MASKS.DOWN | MASKS.RIGHT]: { type: 'threeWay', rotation: 0 },
    [MASKS.LEFT | MASKS.RIGHT | MASKS.UP]: { type: 'threeWay', rotation: Math.PI / 2 },
    [MASKS.UP | MASKS.DOWN | MASKS.LEFT]: { type: 'threeWay', rotation: Math.PI },
    [MASKS.LEFT | MASKS.RIGHT | MASKS.DOWN]: { type: 'threeWay', rotation: -Math.PI / 2 },

    // Intersections
    [MASKS.UP | MASKS.RIGHT | MASKS.DOWN | MASKS.LEFT]: { type: 'fourWay', rotation: 0 },
};

// --- Helpers ---

const getAdjacencyMask = (x: number, y: number, grid: Grid): number => {
    const isConnected = (gx: number, gy: number) => {
        if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return false;
        return CONNECTABLE_TYPES.has(grid[gy][gx].buildingType);
    };
    return (isConnected(x-1, y) ? MASKS.LEFT : 0) | 
           (isConnected(x, y+1) ? MASKS.DOWN : 0) | 
           (isConnected(x+1, y) ? MASKS.RIGHT : 0) | 
           (isConnected(x, y-1) ? MASKS.UP : 0);
};

const useRoadContext = (variant: number): RoadContext => {
    const style: RoadStyle = variant >= 70 ? 'modern' : (variant >= 40 ? 'worn' : 'standard');

    // Dynamic width scale based on variant
    const widthScale = style === 'modern' ? 1.1 : (style === 'worn' ? 0.9 : 1.0);

    const mats = useMemo(() => {
        const palette = {
            yellow: '#fbbf24',
            darkYellow: '#d97706',
            white: '#f8fafc',
            grey: '#e5e7eb',
            concrete: '#9ca3af',
            darkMetal: '#4b5563',
            blackMetal: '#1f2937',
            asphaltDark: '#1f2937',
            asphaltLight: '#374151',
            asphaltWorn: '#4b5563',
            grass: '#4ade80',
            redLight: '#ef4444'
        };

        const lineBase = style === 'modern' ? palette.white : (style === 'worn' ? palette.darkYellow : palette.yellow);
        const roughness = style === 'worn' ? 0.9 : 0.6;
        
        let surfaceColor = palette.asphaltLight;
        if (style === 'modern') surfaceColor = palette.asphaltDark;
        if (style === 'worn') surfaceColor = palette.asphaltWorn;

        return {
            surface: new THREE.MeshStandardMaterial({ color: surfaceColor, roughness: roughness + 0.1 }),
            line: new THREE.MeshStandardMaterial({ color: lineBase, roughness, side: THREE.DoubleSide }),
            stop: new THREE.MeshStandardMaterial({ color: palette.grey, roughness: 0.8 }),
            island: new THREE.MeshStandardMaterial({ color: palette.grass, roughness: 1 }),
            sidewalk: new THREE.MeshStandardMaterial({ color: palette.concrete, roughness: 0.9 }),
            pole: new THREE.MeshStandardMaterial({ color: palette.darkMetal, metalness: 0.6, roughness: 0.4 }),
            lightBox: new THREE.MeshStandardMaterial({ color: palette.blackMetal, metalness: 0.2, roughness: 0.8 }),
            lightRed: new THREE.MeshBasicMaterial({ color: palette.redLight }),
            decor: {
                manhole: new THREE.MeshStandardMaterial({ color: palette.darkMetal, roughness: 0.7, metalness: 0.4 }),
                patch: new THREE.MeshStandardMaterial({ color: palette.asphaltDark, roughness: 1, transparent: true, opacity: 0.6 }),
            }
        };
    }, [style]);

    return { style, variant, widthScale, mats };
};

// --- Sub-Components (Visuals) ---

const RoadSurface = ({ material }: { material: THREE.Material }) => (
    <mesh geometry={ROAD_GEO.surface} material={material} receiveShadow />
);

const SidewalkStraight = ({ material }: { material: THREE.Material }) => (
    <mesh geometry={ROAD_GEO.sidewalkStraight} material={material} position={[0.425, 0.02, 0]} receiveShadow />
);

const SidewalkCornerInner = ({ material }: { material: THREE.Material }) => (
    // Used for outer turn radius
    <mesh geometry={ROAD_GEO.sidewalkCornerInner} material={material} position={[0.5, 0.02, 0.5]} rotation={[0, Math.PI, 0]} receiveShadow />
);

const SidewalkCornerOuter = ({ material }: { material: THREE.Material }) => (
    // Used for intersection corners (fillets)
    <mesh geometry={ROAD_GEO.sidewalkCornerOuter} material={material} position={[0.5, 0.02, 0.5]} rotation={[0, Math.PI, 0]} receiveShadow />
);

const DashedLine = ({ ctx }: { ctx: RoadContext }) => {
    const scale = ctx.widthScale;
    return (
        <group>
            <mesh geometry={ROAD_GEO.dash} material={ctx.mats.line} position={[0, 0.33, 0.005]} scale={[scale, 1, 1]} />
            <mesh geometry={ROAD_GEO.dash} material={ctx.mats.line} position={[0, 0, 0.005]} scale={[scale, 1, 1]} />
            <mesh geometry={ROAD_GEO.dash} material={ctx.mats.line} position={[0, -0.33, 0.005]} scale={[scale, 1, 1]} />
        </group>
    );
};

const StopBar = ({ ctx }: { ctx: RoadContext }) => (
    <group position={[0, 0.3, 0.005]}>
        <mesh geometry={ROAD_GEO.stopLine} material={ctx.mats.stop} position={[0, -0.08, 0]} scale={[ctx.widthScale, 1, 1]} />
        <group position={[0, 0.08, 0]}>
            <mesh geometry={ROAD_GEO.zebra} material={ctx.mats.stop} position={[-0.2 * ctx.widthScale, 0, 0]} />
            <mesh geometry={ROAD_GEO.zebra} material={ctx.mats.stop} position={[0, 0, 0]} />
            <mesh geometry={ROAD_GEO.zebra} material={ctx.mats.stop} position={[0.2 * ctx.widthScale, 0, 0]} />
        </group>
    </group>
);

const TrafficLight = ({ ctx }: { ctx: RoadContext }) => (
    <group position={[0.4, 0, 0.4]}>
        <mesh geometry={ROAD_GEO.pole} material={ctx.mats.pole} position={[0, 0.5, 0]} castShadow />
        <mesh geometry={ROAD_GEO.pole} material={ctx.mats.pole} position={[-0.2, 0.9, 0]} scale={[8, 0.1, 0.1]} rotation={[0,0,0]} castShadow />
        <mesh geometry={ROAD_GEO.lightBox} material={ctx.mats.lightBox} position={[-0.4, 0.9, 0.06]} />
        <mesh position={[-0.4, 0.9, 0.11]} rotation={[1.57,0,0]}>
            <circleGeometry args={[0.04]} />
            <primitive object={ctx.mats.lightRed} />
        </mesh>
    </group>
);

// --- Topology Renderers ---

const RenderStraight: React.FC<RendererProps> = ({ ctx }) => (
    <group>
        <RoadSurface material={ctx.mats.surface} />
        <DashedLine ctx={ctx} />
        {/* Sidewalks on Left and Right edges (rotated by parent to align) */}
        {ctx.style === 'modern' && (
            <>
                <SidewalkStraight material={ctx.mats.sidewalk} />
                <group rotation={[0, 0, Math.PI]}>
                    <SidewalkStraight material={ctx.mats.sidewalk} />
                </group>
            </>
        )}
        
        {/* Decor */}
        {ctx.variant > 80 && ctx.style !== 'standard' && (
             <mesh geometry={ROAD_GEO.manhole} material={ctx.mats.decor.manhole} position={[0, 0, 0.01]} />
        )}
        {ctx.style === 'worn' && (ctx.variant % 3 === 0) && (
            <mesh geometry={ROAD_GEO.patch} material={ctx.mats.decor.patch} position={[0, 0.1, 0.01]} rotation={[0,0,0.2]} />
        )}
    </group>
);

const RenderCorner: React.FC<RendererProps> = ({ ctx }) => (
    <group>
        <RoadSurface material={ctx.mats.surface} />
        <mesh geometry={ROAD_GEO.corner} material={ctx.mats.line} position={[0,0,0.005]} scale={[ctx.widthScale, ctx.widthScale, 1]} />
        {/* Sidewalk on the outer edge of the turn */}
        {ctx.style === 'modern' && (
             <group rotation={[0,0,Math.PI]}>
                <SidewalkCornerInner material={ctx.mats.sidewalk} />
             </group>
        )}
        {/* Fillet for the inner corner (tight turn) */}
        {ctx.style === 'modern' && (
            <SidewalkCornerOuter material={ctx.mats.sidewalk} />
        )}
    </group>
);

const RenderEnd: React.FC<RendererProps> = ({ ctx }) => (
    <group>
        <RoadSurface material={ctx.mats.surface} />
        <StopBar ctx={ctx} />
        {/* Sidewalk capping the end? */}
        {ctx.style === 'modern' && (
            <group rotation={[0,0,Math.PI/2]}>
               <mesh geometry={ROAD_GEO.sidewalkStraight} material={ctx.mats.sidewalk} position={[0.425, 0, 0]} />
            </group>
        )}
    </group>
);

const RenderThreeWay: React.FC<RendererProps> = ({ ctx }) => (
    <group>
        <RoadSurface material={ctx.mats.surface} />
        <DashedLine ctx={ctx} />
        
        {/* Sidewalk on the flat side (Left side of the T) */}
        {ctx.style === 'modern' && (
             <group rotation={[0,0,Math.PI]}>
                <SidewalkStraight material={ctx.mats.sidewalk} />
             </group>
        )}

        {/* Curved fillets on the corners of the T */}
        {ctx.style === 'modern' && (
            <>
                <group rotation={[0,0,0]}>
                    <SidewalkCornerOuter material={ctx.mats.sidewalk} />
                </group>
                <group rotation={[0,0,-Math.PI/2]}>
                    <SidewalkCornerOuter material={ctx.mats.sidewalk} />
                </group>
            </>
        )}

        {/* Stop bar on the incoming road */}
        <group position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
            <StopBar ctx={ctx} />
        </group>

        {ctx.style === 'modern' && (
            <group rotation={[0, 0, Math.PI]}>
               <TrafficLight ctx={ctx} />
            </group>
        )}
    </group>
);

const RenderFourWay: React.FC<RendererProps> = ({ ctx }) => {
    const isRoundabout = ctx.style === 'modern' || ctx.variant % 10 === 0;

    if (isRoundabout) {
        return (
            <group>
                <RoadSurface material={ctx.mats.surface} />
                <mesh geometry={ROAD_GEO.roundabout} material={ctx.mats.line} position={[0, 0, 0.005]} />
                <mesh geometry={ROAD_GEO.island} material={ctx.mats.island} position={[0, 0, 0.1]} />
                {/* Roundabout usually needs corner fillets on all 4 corners to round off the square tile */}
                {ctx.style === 'modern' && [0, Math.PI/2, Math.PI, -Math.PI/2].map((rot, i) => (
                    <group key={i} rotation={[0,0,rot]}>
                         <SidewalkCornerOuter material={ctx.mats.sidewalk} />
                    </group>
                ))}
            </group>
        );
    }

    return (
        <group>
            <RoadSurface material={ctx.mats.surface} />
            {/* Standard Intersection */}
            {[0, Math.PI, Math.PI/2, -Math.PI/2].map((rot, i) => (
                <group key={i} rotation={[0, 0, rot]}>
                    <StopBar ctx={ctx} />
                    {/* Fillets on all corners */}
                    {ctx.style === 'modern' && (
                        <SidewalkCornerOuter material={ctx.mats.sidewalk} />
                    )}
                    {ctx.style === 'standard' && i < 2 && (
                         <group position={[0.5, 0.5, 0]} rotation={[0,0, Math.PI/2]}>
                            <TrafficLight ctx={ctx} />
                         </group>
                    )}
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
    const mask = useMemo(() => getAdjacencyMask(x, y, grid), [x, y, grid]);
    const topology = TOPOLOGY_MAP[mask];

    if (!topology) return null;

    const Renderer = RENDERERS[topology.type];

    const renderGlobalDecor = () => {
        if (ctx.style === 'worn' && topology.type !== 'straight') {
             const seed = (x * 12.98 + y * 78.23);
             const r = (seed % 1) * Math.PI;
             return <mesh geometry={ROAD_GEO.patch} material={ctx.mats.decor.patch} position={[0, 0, 0.01]} rotation={[0,0,r]} />
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
