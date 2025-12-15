/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BuildingType, Grid } from '../../types';
import { GRID_SIZE } from '../../constants';

// --- Assets & Geometries ---

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
    sidewalkStraight: new THREE.BoxGeometry(0.15, 1, 0.05),
    sidewalkCornerInner: new THREE.RingGeometry(0.4, 0.55, 16, 1, 0, Math.PI / 2), 
    sidewalkCornerOuter: new THREE.RingGeometry(0.1, 0.25, 16, 1, 0, Math.PI / 2), 
    pole: new THREE.BoxGeometry(0.05, 1, 0.05),
    lightBox: new THREE.BoxGeometry(0.3, 0.12, 0.1),
    bench: new THREE.BoxGeometry(0.1, 0.3, 0.05),
    lampPost: new THREE.BoxGeometry(0.05, 0.05, 0.8),
    lampHead: new THREE.BoxGeometry(0.15, 0.15, 0.05),
};

const MASKS = { 
    NONE: 0,
    UP: 1, 
    RIGHT: 2, 
    DOWN: 4, 
    LEFT: 8 
};

// --- Types ---

type RoadStyle = 'standard' | 'worn' | 'modern' | 'brick';
type RoadTopology = 'straight' | 'corner' | 'end' | 'threeWay' | 'fourWay';

interface RoadContextType {
    style: RoadStyle;
    variant: number;
    widthScale: number;
    materials: RoadMaterials;
}

interface RoadMaterials {
    surface: THREE.Material;
    line: THREE.Material;
    stop: THREE.Material;
    island: THREE.Material;
    sidewalk: THREE.Material;
    pole: THREE.Material;
    lightBox: THREE.Material;
    lightRed: THREE.Material;
    lightWhite: THREE.Material;
    wood: THREE.Material;
    decor: {
        manhole: THREE.Material;
        patch: THREE.Material;
    }
}

// --- Hooks ---

const useRoadMaterials = (style: RoadStyle): RoadMaterials => {
    return useMemo(() => {
        const palette = {
            yellow: '#fbbf24',
            fadedYellow: '#d97706',
            white: '#f8fafc',
            fadedWhite: '#cbd5e1',
            grey: '#e5e7eb',
            concrete: '#9ca3af',
            darkMetal: '#4b5563',
            blackMetal: '#1f2937',
            wood: '#78350f',
            asphaltStandard: '#374151',
            asphaltDark: '#111827',
            asphaltWorn: '#6b7280',
            brickRed: '#7f1d1d',
            grass: '#4ade80',
            redLight: '#ef4444',
            warmLight: '#fef3c7'
        };

        let surfaceColor = palette.asphaltStandard;
        let lineColor = palette.yellow;
        let sidewalkColor = palette.concrete;
        let roughness = 0.6;

        if (style === 'modern') {
            surfaceColor = palette.asphaltDark;
            lineColor = palette.white;
            sidewalkColor = palette.grey;
            roughness = 0.4;
        } else if (style === 'worn') {
            surfaceColor = palette.asphaltWorn;
            lineColor = palette.fadedWhite;
            sidewalkColor = '#a8a29e';
            roughness = 0.9;
        } else if (style === 'brick') {
            surfaceColor = palette.brickRed;
            lineColor = 'transparent';
            sidewalkColor = '#78716c';
            roughness = 0.8;
        }

        const baseMatProps = { castShadow: true, receiveShadow: true };

        return {
            surface: new THREE.MeshStandardMaterial({ color: surfaceColor, roughness: roughness, ...baseMatProps }),
            line: new THREE.MeshStandardMaterial({ color: lineColor, roughness: 1, side: THREE.DoubleSide }),
            stop: new THREE.MeshStandardMaterial({ color: palette.grey, roughness: 0.8, ...baseMatProps }),
            island: new THREE.MeshStandardMaterial({ color: palette.grass, roughness: 1, ...baseMatProps }),
            sidewalk: new THREE.MeshStandardMaterial({ color: sidewalkColor, roughness: 0.9, ...baseMatProps }),
            pole: new THREE.MeshStandardMaterial({ color: palette.darkMetal, metalness: 0.6, roughness: 0.4, ...baseMatProps }),
            lightBox: new THREE.MeshStandardMaterial({ color: palette.blackMetal, metalness: 0.2, roughness: 0.8, ...baseMatProps }),
            lightRed: new THREE.MeshBasicMaterial({ color: palette.redLight }),
            lightWhite: new THREE.MeshBasicMaterial({ color: palette.warmLight }),
            wood: new THREE.MeshStandardMaterial({ color: palette.wood, roughness: 0.9, ...baseMatProps }),
            decor: {
                manhole: new THREE.MeshStandardMaterial({ color: palette.darkMetal, roughness: 0.7, metalness: 0.4 }),
                patch: new THREE.MeshStandardMaterial({ color: palette.asphaltDark, roughness: 1, transparent: true, opacity: 0.6 }),
            }
        };
    }, [style]);
};

const useRoadTopology = (x: number, y: number, grid: Grid) => {
    return useMemo(() => {
        const isRoad = (gx: number, gy: number) => {
            if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return false;
            return grid[gy][gx].buildingType === BuildingType.Road;
        };

        const mask = 
            (isRoad(x-1, y) ? MASKS.LEFT : 0) | 
            (isRoad(x, y+1) ? MASKS.DOWN : 0) | 
            (isRoad(x+1, y) ? MASKS.RIGHT : 0) | 
            (isRoad(x, y-1) ? MASKS.UP : 0);

        // Topology Mapping
        if (mask === MASKS.NONE) return null;
        if (mask === MASKS.UP) return { type: 'end', rotation: 0 };
        if (mask === MASKS.RIGHT) return { type: 'end', rotation: -Math.PI / 2 };
        if (mask === MASKS.DOWN) return { type: 'end', rotation: Math.PI };
        if (mask === MASKS.LEFT) return { type: 'end', rotation: Math.PI / 2 };

        if (mask === (MASKS.UP | MASKS.DOWN)) return { type: 'straight', rotation: 0 };
        if (mask === (MASKS.LEFT | MASKS.RIGHT)) return { type: 'straight', rotation: Math.PI / 2 };

        if (mask === (MASKS.UP | MASKS.RIGHT)) return { type: 'corner', rotation: Math.PI };
        if (mask === (MASKS.RIGHT | MASKS.DOWN)) return { type: 'corner', rotation: Math.PI / 2 };
        if (mask === (MASKS.DOWN | MASKS.LEFT)) return { type: 'corner', rotation: 0 };
        if (mask === (MASKS.LEFT | MASKS.UP)) return { type: 'corner', rotation: -Math.PI / 2 };

        if (mask === (MASKS.UP | MASKS.DOWN | MASKS.RIGHT)) return { type: 'threeWay', rotation: 0 };
        if (mask === (MASKS.LEFT | MASKS.RIGHT | MASKS.UP)) return { type: 'threeWay', rotation: Math.PI / 2 };
        if (mask === (MASKS.UP | MASKS.DOWN | MASKS.LEFT)) return { type: 'threeWay', rotation: Math.PI };
        if (mask === (MASKS.LEFT | MASKS.RIGHT | MASKS.DOWN)) return { type: 'threeWay', rotation: -Math.PI / 2 };

        if (mask === (MASKS.UP | MASKS.RIGHT | MASKS.DOWN | MASKS.LEFT)) return { type: 'fourWay', rotation: 0 };

        return null;
    }, [x, y, grid]);
};

// --- Atomic Components ---

const RoadSurface = ({ mat }: { mat: THREE.Material }) => (
    <mesh geometry={ROAD_GEO.surface} material={mat} receiveShadow />
);

const Sidewalk = ({ mat, type = 'straight' }: { mat: THREE.Material, type?: 'straight' | 'inner' | 'outer' }) => {
    if (type === 'inner') {
        return <mesh geometry={ROAD_GEO.sidewalkCornerInner} material={mat} position={[0.5, 0.02, 0.5]} rotation={[0, Math.PI, 0]} receiveShadow />;
    }
    if (type === 'outer') {
        return <mesh geometry={ROAD_GEO.sidewalkCornerOuter} material={mat} position={[0.5, 0.02, 0.5]} rotation={[0, Math.PI, 0]} receiveShadow />;
    }
    return <mesh geometry={ROAD_GEO.sidewalkStraight} material={mat} position={[0.425, 0, 0.02]} receiveShadow />;
};

const Furniture = ({ ctx, side }: { ctx: RoadContextType, side: 'left' | 'right' }) => {
    // Only supported styles
    if (ctx.style !== 'modern' && ctx.style !== 'brick') return null;

    // Deterministic placement logic
    const seed = ctx.variant * 13 + (side === 'left' ? 7 : 0);
    const hasDecor = seed % 5 === 0; 
    if (!hasDecor) return null;

    const isLamp = (seed % 3) === 0;
    const xPos = 0.425;

    return isLamp ? (
        <group position={[xPos, 0, 0]}>
            <mesh geometry={ROAD_GEO.lampPost} material={ctx.materials.pole} position={[0, 0, 0.45]} castShadow />
            <mesh geometry={ROAD_GEO.lampHead} material={ctx.materials.lightWhite} position={[0, 0, 0.875]} />
        </group>
    ) : (
        <mesh 
            geometry={ROAD_GEO.bench} 
            material={ctx.materials.wood} 
            position={[xPos, 0, 0.075]} 
            castShadow 
        />
    );
};

const StopLine = ({ ctx }: { ctx: RoadContextType }) => {
    if (ctx.style === 'brick') {
        return <mesh geometry={ROAD_GEO.stopLine} material={ctx.materials.sidewalk} position={[0, 0.22, 0.005]} scale={[ctx.widthScale, 0.5, 1]} />;
    }
    return (
        <group position={[0, 0.3, 0.005]}>
            <mesh geometry={ROAD_GEO.stopLine} material={ctx.materials.stop} position={[0, -0.08, 0]} scale={[ctx.widthScale, 1, 1]} />
            <group position={[0, 0.08, 0]}>
                {[-0.2, 0, 0.2].map(x => (
                    <mesh key={x} geometry={ROAD_GEO.zebra} material={ctx.materials.stop} position={[x * ctx.widthScale, 0, 0]} />
                ))}
            </group>
        </group>
    );
};

const TrafficLight = ({ ctx }: { ctx: RoadContextType }) => {
    if (ctx.style === 'brick' || ctx.style === 'worn') return null;
    return (
        <group position={[0.4, 0, 0.4]}>
            <mesh geometry={ROAD_GEO.pole} material={ctx.materials.pole} position={[0, 0.5, 0]} castShadow />
            <mesh geometry={ROAD_GEO.pole} material={ctx.materials.pole} position={[-0.2, 0.9, 0]} scale={[8, 0.1, 0.1]} castShadow />
            <mesh geometry={ROAD_GEO.lightBox} material={ctx.materials.lightBox} position={[-0.4, 0.9, 0.06]} />
            <mesh position={[-0.4, 0.9, 0.11]} rotation={[1.57,0,0]}>
                <circleGeometry args={[0.04]} />
                <primitive object={ctx.materials.lightRed} />
            </mesh>
        </group>
    );
};

const DashedLines = ({ ctx }: { ctx: RoadContextType }) => {
    if (ctx.style === 'brick') return null;
    return (
        <group>
            {[0.33, 0, -0.33].map(y => (
                <mesh key={y} geometry={ROAD_GEO.dash} material={ctx.materials.line} position={[0, y, 0.005]} scale={[ctx.widthScale, 1, 1]} />
            ))}
        </group>
    );
};

// --- Topology Components ---

const StraightRoad = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <RoadSurface mat={ctx.materials.surface} />
        <DashedLines ctx={ctx} />
        {ctx.style !== 'standard' && (
            <>
                <Sidewalk mat={ctx.materials.sidewalk} />
                <Furniture ctx={ctx} side="right" />
                <group rotation={[0, 0, Math.PI]}>
                    <Sidewalk mat={ctx.materials.sidewalk} />
                    <Furniture ctx={ctx} side="left" />
                </group>
            </>
        )}
    </group>
);

const CornerRoad = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <RoadSurface mat={ctx.materials.surface} />
        {ctx.style !== 'brick' && (
            <mesh geometry={ROAD_GEO.corner} material={ctx.materials.line} position={[0,0,0.005]} scale={[ctx.widthScale, ctx.widthScale, 1]} />
        )}
        {ctx.style !== 'standard' && (
            <>
                <group rotation={[0,0,Math.PI]}><Sidewalk mat={ctx.materials.sidewalk} type="inner" /></group>
                <Sidewalk mat={ctx.materials.sidewalk} type="outer" />
            </>
        )}
    </group>
);

const EndRoad = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <RoadSurface mat={ctx.materials.surface} />
        <StopLine ctx={ctx} />
        {ctx.style !== 'standard' && (
            <group rotation={[0,0,Math.PI/2]}>
                 <Sidewalk mat={ctx.materials.sidewalk} />
            </group>
        )}
    </group>
);

const ThreeWayRoad = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <RoadSurface mat={ctx.materials.surface} />
        <DashedLines ctx={ctx} />
        {ctx.style !== 'standard' && (
            <>
                <group rotation={[0,0,Math.PI]}><Sidewalk mat={ctx.materials.sidewalk} /></group>
                <Sidewalk mat={ctx.materials.sidewalk} type="outer" />
                <group rotation={[0,0,-Math.PI/2]}><Sidewalk mat={ctx.materials.sidewalk} type="outer" /></group>
            </>
        )}
        <group position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
            <StopLine ctx={ctx} />
        </group>
        <group rotation={[0, 0, Math.PI]}>
            <TrafficLight ctx={ctx} />
        </group>
    </group>
);

const FourWayRoad = ({ ctx }: { ctx: RoadContextType }) => {
    const isRoundabout = ctx.style === 'modern' || (ctx.variant % 10 === 0 && ctx.style !== 'brick');
    
    if (isRoundabout) {
        return (
            <group>
                <RoadSurface mat={ctx.materials.surface} />
                <mesh geometry={ROAD_GEO.roundabout} material={ctx.materials.line} position={[0, 0, 0.005]} />
                <mesh geometry={ROAD_GEO.island} material={ctx.materials.island} position={[0, 0, 0.1]} />
                {ctx.style !== 'standard' && [0, Math.PI/2, Math.PI, -Math.PI/2].map((r, i) => (
                    <group key={i} rotation={[0,0,r]}><Sidewalk mat={ctx.materials.sidewalk} type="outer" /></group>
                ))}
            </group>
        )
    }

    return (
        <group>
            <RoadSurface mat={ctx.materials.surface} />
            {[0, Math.PI, Math.PI/2, -Math.PI/2].map((rot, i) => (
                <group key={i} rotation={[0, 0, rot]}>
                    <StopLine ctx={ctx} />
                    {ctx.style !== 'standard' && <Sidewalk mat={ctx.materials.sidewalk} type="outer" />}
                    {i < 2 && <group position={[0.5, 0.5, 0]} rotation={[0,0, Math.PI/2]}><TrafficLight ctx={ctx} /></group>}
                </group>
            ))}
        </group>
    );
};

const COMPONENTS: Record<RoadTopology, React.FC<{ ctx: RoadContextType }>> = {
    straight: StraightRoad,
    corner: CornerRoad,
    end: EndRoad,
    threeWay: ThreeWayRoad,
    fourWay: FourWayRoad,
};

// --- Main Export ---

export const RoadMarkings = React.memo(({ x, y, grid, yOffset, variant = 0 }: { x: number; y: number; grid: Grid; yOffset: number; variant?: number }) => {
    // 1. Determine Topology
    const topology = useRoadTopology(x, y, grid);
    
    // 2. Determine Style & Materials
    const style: RoadStyle = useMemo(() => {
        if (variant >= 80) return 'modern';
        if (variant >= 60) return 'brick';
        if (variant >= 30) return 'worn';
        return 'standard';
    }, [variant]);

    const materials = useRoadMaterials(style);
    
    const widthScale = useMemo(() => {
        if (style === 'modern') return 1.1;
        if (style === 'brick') return 0.95;
        if (style === 'worn') return 0.9 + (variant % 5) * 0.02;
        return 1.0;
    }, [style, variant]);

    // 3. Render
    if (!topology) return null;

    const Component = COMPONENTS[topology.type] as React.FC<{ ctx: RoadContextType }>;
    const ctx: RoadContextType = { style, variant, widthScale, materials };

    return (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
            <group rotation={[0, 0, topology.rotation]}>
                <Component ctx={ctx} />
            </group>
            {/* Global Decor (e.g. patches on worn roads) */}
            {style === 'worn' && (x*y)%7===0 && (
                 <mesh geometry={ROAD_GEO.patch} material={materials.decor.patch} position={[0, 0, 0.01]} rotation={[0,0,Math.random()]} />
            )}
        </group>
    );
});