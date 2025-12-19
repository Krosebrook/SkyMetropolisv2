/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BuildingType, Grid } from '../../types';
import { GRID_SIZE } from '../../constants';

// --- Constants & Config ---

export const MASKS = { 
    NONE: 0,
    UP: 1, 
    RIGHT: 2, 
    DOWN: 4, 
    LEFT: 8 
};

export const ROUNDABOUT_THRESHOLD = 75;

const Z_OFFSETS = {
    SKIRT: -0.002,
    SURFACE: 0,
    MARKING_BASE: 0.005,
    MARKING_OVERLAY: 0.007,
    DECOR: 0.01,
    FURNITURE: 0.03,
};

// --- Geometries ---

const ROAD_GEO = {
    surface: new THREE.PlaneGeometry(1, 1),
    dash: new THREE.PlaneGeometry(0.1, 0.25),
    corner: new THREE.RingGeometry(0.44, 0.56, 32, 1, 0, Math.PI / 2),
    stopLine: new THREE.PlaneGeometry(0.6, 0.1),
    zebra: new THREE.PlaneGeometry(0.12, 0.3),
    manhole: new THREE.CircleGeometry(0.14, 16),
    patch: new THREE.PlaneGeometry(0.25, 0.3),
    roundaboutBase: new THREE.CircleGeometry(0.5, 32),
    roundaboutCenter: new THREE.CylinderGeometry(0.25, 0.25, 0.1, 32),
    roundaboutInner: new THREE.RingGeometry(0.42, 0.48, 32),
    island: new THREE.CircleGeometry(0.18, 32),
    sidewalkStraight: new THREE.BoxGeometry(0.15, 1, 0.05),
    sidewalkCornerInner: new THREE.RingGeometry(0.4, 0.55, 16, 1, 0, Math.PI / 2), 
    sidewalkCornerOuter: new THREE.RingGeometry(0.1, 0.25, 16, 1, 0, Math.PI / 2), 
    pole: new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8),
    lightBox: new THREE.BoxGeometry(0.1, 0.25, 0.1),
    lightLens: new THREE.CircleGeometry(0.03, 16),
    skirt: new THREE.PlaneGeometry(1.2, 1.2),
    benchSeat: new THREE.BoxGeometry(0.12, 0.02, 0.05),
    benchBack: new THREE.BoxGeometry(0.12, 0.05, 0.01),
    benchLeg: new THREE.BoxGeometry(0.01, 0.03, 0.04),
    lampPole: new THREE.CylinderGeometry(0.01, 0.015, 0.4, 8),
    lampHead: new THREE.BoxGeometry(0.06, 0.03, 0.08),
};

// --- Topology Mapping ---

const TOPOLOGY_LOOKUP: Record<number, { type: RoadTopology, rotation: number }> = {
    [0]: { type: 'straight', rotation: 0 },
    [1]: { type: 'end', rotation: 0 },
    [2]: { type: 'end', rotation: -Math.PI / 2 },
    [3]: { type: 'corner', rotation: Math.PI },
    [4]: { type: 'end', rotation: Math.PI },
    [5]: { type: 'straight', rotation: 0 },
    [6]: { type: 'corner', rotation: Math.PI / 2 },
    [7]: { type: 'threeWay', rotation: 0 },
    [8]: { type: 'end', rotation: Math.PI / 2 },
    [9]: { type: 'corner', rotation: -Math.PI / 2 },
    [10]: { type: 'straight', rotation: Math.PI / 2 },
    [11]: { type: 'threeWay', rotation: Math.PI / 2 },
    [12]: { type: 'corner', rotation: 0 },
    [13]: { type: 'threeWay', rotation: Math.PI },
    [14]: { type: 'threeWay', rotation: -Math.PI / 2 },
    [15]: { type: 'fourWay', rotation: 0 },
};

// --- Types ---

export type RoadStyle = 'standard' | 'worn' | 'modern' | 'brick' | 'modern-worn';
export type RoadTopology = 'straight' | 'corner' | 'end' | 'threeWay' | 'fourWay' | 'roundabout';

export interface RoadMaterials {
    surface: THREE.Material;
    line: THREE.Material;
    stop: THREE.Material;
    island: THREE.Material;
    sidewalk: THREE.Material;
    pole: THREE.Material;
    lightBox: THREE.Material;
    lightRed: THREE.Material;
    lightYellow: THREE.Material;
    lightGreen: THREE.Material;
    lightOff: THREE.Material;
    wood: THREE.Material;
    bench: THREE.Material;
    lamp: THREE.Material;
    decor: {
        manhole: THREE.Material;
        patch: THREE.Material;
    }
}

export interface RoadContextType {
    style: RoadStyle;
    variant: number;
    widthScale: number;
    materials: RoadMaterials;
}

// --- Hooks ---

export const useRoadMaterials = (style: RoadStyle): RoadMaterials => {
    return useMemo(() => {
        const palette = {
            yellow: '#fcd34d', 
            white: '#ffffff',
            grey: '#94a3b8',
            concrete: '#cbd5e1',
            darkMetal: '#1e293b',
            blackMetal: '#020617',
            asphaltStandard: '#1e293b', 
            asphaltDark: '#0f172a', 
            asphaltWorn: '#334155',
            brickRed: '#991b1b',
            grass: '#22c55e',
            redLight: '#ff0000',
            yellowLight: '#ffcc00',
            greenLight: '#00ff44',
            offLight: '#0a0a0a',
            benchWood: '#78350f',
            lampGold: '#fbbf24',
        };

        let surfaceColor = palette.asphaltStandard;
        let lineColor = palette.yellow;
        let sidewalkColor = palette.concrete;
        let roughness = 0.5;
        let metalness = 0.02;

        if (style === 'modern' || style === 'modern-worn') {
            surfaceColor = style === 'modern-worn' ? palette.asphaltDark : palette.asphaltDark;
            lineColor = palette.white;
            sidewalkColor = palette.grey;
            roughness = 0.25;
            metalness = 0.15;
        } else if (style === 'worn') {
            surfaceColor = palette.asphaltWorn;
            lineColor = '#64748b';
            sidewalkColor = '#475569';
            roughness = 0.85;
            metalness = 0.0;
        } else if (style === 'brick') {
            surfaceColor = palette.brickRed;
            lineColor = 'transparent';
            sidewalkColor = '#451a03';
            roughness = 0.7;
            metalness = 0.0;
        }

        return {
            surface: new THREE.MeshStandardMaterial({ color: surfaceColor, roughness, metalness, flatShading: false }),
            line: new THREE.MeshStandardMaterial({ color: lineColor, roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide }),
            stop: new THREE.MeshStandardMaterial({ color: palette.white, roughness: 0.1, metalness: 0.3 }),
            island: new THREE.MeshStandardMaterial({ color: palette.grass, roughness: 1, metalness: 0 }),
            sidewalk: new THREE.MeshStandardMaterial({ color: sidewalkColor, roughness: 0.6, metalness: 0.1 }),
            pole: new THREE.MeshStandardMaterial({ color: palette.darkMetal, metalness: 0.8, roughness: 0.2 }),
            lightBox: new THREE.MeshStandardMaterial({ color: palette.blackMetal, metalness: 0.4, roughness: 0.6 }),
            lightRed: new THREE.MeshStandardMaterial({ color: palette.redLight, emissive: palette.redLight, emissiveIntensity: 3 }),
            lightYellow: new THREE.MeshStandardMaterial({ color: palette.yellowLight, emissive: palette.yellowLight, emissiveIntensity: 3 }),
            lightGreen: new THREE.MeshStandardMaterial({ color: palette.greenLight, emissive: palette.greenLight, emissiveIntensity: 3 }),
            lightOff: new THREE.MeshStandardMaterial({ color: palette.offLight, roughness: 0.9 }),
            wood: new THREE.MeshStandardMaterial({ color: palette.benchWood, roughness: 0.9 }),
            bench: new THREE.MeshStandardMaterial({ color: palette.benchWood, roughness: 0.8 }),
            lamp: new THREE.MeshStandardMaterial({ color: style === 'brick' ? palette.lampGold : palette.grey, metalness: 0.9, roughness: 0.1 }),
            decor: {
                manhole: new THREE.MeshStandardMaterial({ color: palette.blackMetal, roughness: 0.3, metalness: 0.9 }),
                patch: new THREE.MeshStandardMaterial({ color: '#020617', roughness: 1, transparent: true, opacity: 0.7 }),
            }
        };
    }, [style]);
};

export const getRoadTopologyData = (x: number, y: number, grid: Grid, variant: number) => {
    const isRoad = (gx: number, gy: number) => {
        if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return false;
        return grid[gy]?.[gx]?.buildingType === BuildingType.Road;
    };

    const mask = 
        (isRoad(x-1, y) ? MASKS.LEFT : 0) | 
        (isRoad(x, y+1) ? MASKS.DOWN : 0) | 
        (isRoad(x+1, y) ? MASKS.RIGHT : 0) | 
        (isRoad(x, y-1) ? MASKS.UP : 0);

    let data = TOPOLOGY_LOOKUP[mask] || { type: 'straight', rotation: 0 };
    
    // Explicit override for Roundabouts
    if (mask === 15 && variant > ROUNDABOUT_THRESHOLD) {
        data = { type: 'roundabout', rotation: 0 };
    }

    return { ...data, mask };
};

// --- Modular Rendering Elements ---

const Furniture = ({ materials, variant }: { materials: RoadMaterials, variant: number }) => {
    const showBench = variant % 3 === 0;
    const showLamp = variant % 5 === 0;

    return (
        <group>
            {showBench && (
                <group position={[0.42, 0.2, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
                    <mesh geometry={ROAD_GEO.benchSeat} material={materials.bench} position={[0, 0, 0.03]} />
                    <mesh geometry={ROAD_GEO.benchBack} material={materials.bench} position={[0, 0.03, 0.06]} rotation={[-Math.PI / 8, 0, 0]} />
                    <mesh geometry={ROAD_GEO.benchLeg} material={materials.pole} position={[0.04, 0, 0.015]} />
                    <mesh geometry={ROAD_GEO.benchLeg} material={materials.pole} position={[-0.04, 0, 0.015]} />
                </group>
            )}
            {showLamp && (
                <group position={[0.42, -0.3, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
                    <mesh geometry={ROAD_GEO.lampPole} material={materials.lamp} position={[0, 0, 0.2]} />
                    <mesh geometry={ROAD_GEO.lampHead} material={materials.lamp} position={[0, -0.05, 0.4]} rotation={[0.2, 0, 0]} castShadow />
                    <mesh geometry={ROAD_GEO.lightLens} material={materials.lightYellow} position={[0, -0.05, 0.38]} rotation={[Math.PI / 2, 0, 0]} scale={[0.8, 0.8, 0.8]} />
                </group>
            )}
        </group>
    );
};

const Sidewalks = ({ materials, type = 'straight' }: { materials: RoadMaterials, type?: 'straight' | 'corner' }) => {
    if (type === 'corner') {
        return (
            <>
                <group rotation={[0, 0, Math.PI]}><mesh geometry={ROAD_GEO.sidewalkCornerInner} material={materials.sidewalk} position={[0.5, 0.02, 0.5]} rotation={[0, Math.PI, 0]} receiveShadow /></group>
                <mesh geometry={ROAD_GEO.sidewalkCornerOuter} material={materials.sidewalk} position={[0.5, 0.02, 0.5]} rotation={[0, Math.PI, 0]} receiveShadow />
            </>
        );
    }
    return (
        <>
            <mesh geometry={ROAD_GEO.sidewalkStraight} material={materials.sidewalk} position={[0.425, 0, 0.02]} receiveShadow />
            <group rotation={[0, 0, Math.PI]}>
                <mesh geometry={ROAD_GEO.sidewalkStraight} material={materials.sidewalk} position={[0.425, 0, 0.02]} receiveShadow />
            </group>
        </>
    );
};

const Markings = ({ ctx, type }: { ctx: RoadContextType, type: RoadTopology }) => {
    const { materials, widthScale, variant } = ctx;
    
    if (type === 'straight') {
        const isCrossing = variant % 10 === 0;
        return (
            <group>
                <group position={[0, 0, Z_OFFSETS.MARKING_BASE]}>
                    {[0.33, 0, -0.33].map(y => (
                        <mesh key={y} geometry={ROAD_GEO.dash} material={materials.line} position={[0, y, 0]} scale={[widthScale, 1, 1]} />
                    ))}
                </group>
                {isCrossing && (
                    <group position={[0, 0.3, Z_OFFSETS.MARKING_OVERLAY]}>
                        <mesh geometry={ROAD_GEO.stopLine} material={materials.stop} position={[0, -0.08, 0]} scale={[widthScale, 1, 1]} />
                        <group position={[0, 0.08, 0]}>
                            {[-0.2, 0, 0.2].map(x => (
                                <mesh key={x} geometry={ROAD_GEO.zebra} material={materials.stop} position={[x * widthScale, 0, 0]} />
                            ))}
                        </group>
                    </group>
                )}
            </group>
        );
    }
    
    if (type === 'corner') {
        return (
            <mesh geometry={ROAD_GEO.corner} material={materials.line} position={[0, 0, Z_OFFSETS.MARKING_BASE]} scale={[widthScale, widthScale, 1]} />
        );
    }

    if (type === 'roundabout') {
        return (
            <group position={[0, 0, Z_OFFSETS.MARKING_BASE]}>
                <mesh geometry={ROAD_GEO.roundaboutInner} material={materials.line} />
                {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((rot, i) => (
                    <group key={i} rotation={[0, 0, rot]}>
                        <mesh geometry={ROAD_GEO.zebra} material={materials.stop} position={[0, 0.4, Z_OFFSETS.MARKING_OVERLAY]} rotation={[0, 0, Math.PI/2]} scale={[0.5, 0.5, 1]} />
                    </group>
                ))}
            </group>
        );
    }

    return null;
};

// --- Topology Components ---

const TopologyStraight = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <mesh geometry={ROAD_GEO.skirt} material={ctx.materials.surface} position={[0, 0, Z_OFFSETS.SKIRT]} receiveShadow />
        <mesh geometry={ROAD_GEO.surface} material={ctx.materials.surface} receiveShadow />
        <Markings ctx={ctx} type="straight" />
        <Sidewalks materials={ctx.materials} />
        <Furniture materials={ctx.materials} variant={ctx.variant} />
        <group rotation={[0, 0, Math.PI]}>
            <Furniture materials={ctx.materials} variant={ctx.variant + 1} />
        </group>
    </group>
);

const TopologyCorner = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <mesh geometry={ROAD_GEO.skirt} material={ctx.materials.surface} position={[0, 0, Z_OFFSETS.SKIRT]} receiveShadow />
        <mesh geometry={ROAD_GEO.surface} material={ctx.materials.surface} receiveShadow />
        <Markings ctx={ctx} type="corner" />
        <Sidewalks materials={ctx.materials} type="corner" />
    </group>
);

const TopologyEnd = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <mesh geometry={ROAD_GEO.skirt} material={ctx.materials.surface} position={[0, 0, Z_OFFSETS.SKIRT]} receiveShadow />
        <mesh geometry={ROAD_GEO.surface} material={ctx.materials.surface} receiveShadow />
        <group position={[0, 0.3, Z_OFFSETS.MARKING_OVERLAY]}>
            <mesh geometry={ROAD_GEO.stopLine} material={ctx.materials.stop} scale={[ctx.widthScale, 1, 1]} />
            <group position={[0, 0.1, 0]}>
                {[-0.2, 0, 0.2].map(x => (
                    <mesh key={x} geometry={ROAD_GEO.zebra} material={ctx.materials.stop} position={[x * ctx.widthScale, 0, 0]} />
                ))}
            </group>
        </group>
    </group>
);

const TopologyThreeWay = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <mesh geometry={ROAD_GEO.skirt} material={ctx.materials.surface} position={[0, 0, Z_OFFSETS.SKIRT]} receiveShadow />
        <mesh geometry={ROAD_GEO.surface} material={ctx.materials.surface} receiveShadow />
        <group position={[0, 0, Z_OFFSETS.MARKING_BASE]}>
             {[0.33, 0, -0.33].map(y => (
                <mesh key={y} geometry={ROAD_GEO.dash} material={ctx.materials.line} position={[0, y, 0]} scale={[ctx.widthScale, 1, 1]} />
            ))}
        </group>
        <group rotation={[0, 0, -Math.PI / 2]} position={[0.4, 0, Z_OFFSETS.MARKING_OVERLAY]}>
             <mesh geometry={ROAD_GEO.stopLine} material={ctx.materials.stop} scale={[ctx.widthScale, 1, 1]} />
        </group>
    </group>
);

const TopologyFourWay = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <mesh geometry={ROAD_GEO.skirt} material={ctx.materials.surface} position={[0, 0, Z_OFFSETS.SKIRT]} receiveShadow />
        <mesh geometry={ROAD_GEO.surface} material={ctx.materials.surface} receiveShadow />
        {[0, Math.PI, Math.PI/2, -Math.PI/2].map((rot, i) => (
            <group key={i} rotation={[0, 0, rot]} position={[0, 0.4, Z_OFFSETS.MARKING_OVERLAY]}>
                 <mesh geometry={ROAD_GEO.stopLine} material={ctx.materials.stop} scale={[ctx.widthScale, 1, 1]} />
                 <group position={[0, 0.1, 0]}>
                    {[-0.2, 0, 0.2].map(x => (
                        <mesh key={x} geometry={ROAD_GEO.zebra} material={ctx.materials.stop} position={[x * ctx.widthScale, 0, 0]} />
                    ))}
                </group>
            </group>
        ))}
    </group>
);

const TopologyRoundabout = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <mesh geometry={ROAD_GEO.skirt} material={ctx.materials.surface} position={[0, 0, Z_OFFSETS.SKIRT]} receiveShadow />
        <mesh geometry={ROAD_GEO.roundaboutBase} material={ctx.materials.surface} receiveShadow />
        <Markings ctx={ctx} type="roundabout" />
        <mesh geometry={ROAD_GEO.roundaboutCenter} material={ctx.materials.island} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]} castShadow receiveShadow />
        
        {/* Landmark Monument */}
        <group position={[0, 0, 0.1]}>
             <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                 <cylinderGeometry args={[0.08, 0.1, 0.2, 8]} />
                 <meshStandardMaterial color={ctx.materials.pole.color} metalness={1} roughness={0.1} />
             </mesh>
             <mesh position={[0, 0, 0.25]} castShadow>
                 <sphereGeometry args={[0.06, 8, 8]} />
                 <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={4} metalness={1} roughness={0} transparent opacity={0.8} />
             </mesh>
        </group>
    </group>
);

const TOPOLOGY_COMPONENTS: Record<RoadTopology, React.FC<{ ctx: RoadContextType }>> = {
    straight: TopologyStraight,
    corner: TopologyCorner,
    end: TopologyEnd,
    threeWay: TopologyThreeWay,
    fourWay: TopologyFourWay,
    roundabout: TopologyRoundabout,
};

// --- Exported Components ---

export const TrafficLight = ({ materials, position = [0.4, 0.4, 0], rotation = 0, side = 0 }: { materials: RoadMaterials, position?: [number, number, number], rotation?: number, side?: number }) => {
    const [phase, setPhase] = useState(0); 

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        const cycle = (time + (side === 1 ? 5 : 0)) % 10;
        
        if (cycle < 4) setPhase(0);      // Green
        else if (cycle < 5) setPhase(1); // Yellow
        else setPhase(2);                // Red
    });

    return (
        <group position={position} rotation={[Math.PI / 2, 0, rotation]}>
            <mesh geometry={ROAD_GEO.pole} material={materials.pole} position={[0, 0.4, 0]} castShadow />
            <group position={[0, 0.7, 0.06]}>
                <mesh geometry={ROAD_GEO.lightBox} material={materials.lightBox} castShadow />
                <mesh geometry={ROAD_GEO.lightLens} material={phase === 2 ? materials.lightRed : materials.lightOff} position={[0, 0.08, 0.051]} />
                <mesh geometry={ROAD_GEO.lightLens} material={phase === 1 ? materials.lightYellow : materials.lightOff} position={[0, 0, 0.051]} />
                <mesh geometry={ROAD_GEO.lightLens} material={phase === 0 ? materials.lightGreen : materials.lightOff} position={[0, -0.08, 0.051]} />
            </group>
        </group>
    );
};

export const RoadMarkings = React.memo(({ x, y, grid, yOffset, variant = 0, customId }: { x: number; y: number; grid: Grid; yOffset: number; variant?: number, customId?: string }) => {
    const topology = useMemo(() => getRoadTopologyData(x, y, grid, variant), [x, y, grid, variant]);

    const style: RoadStyle = useMemo(() => {
        if (customId === 'main-road-texture') return 'modern-worn';
        if (variant >= 80) return 'modern';
        if (variant >= 60) return 'brick';
        if (variant >= 30) return 'worn';
        return 'standard';
    }, [variant, customId]);

    const materials = useRoadMaterials(style);
    const widthScale = style === 'modern' || style === 'modern-worn' ? 1.1 : 1.0;
    const ctx: RoadContextType = { style, variant, widthScale, materials };
    
    const RenderComponent = TOPOLOGY_COMPONENTS[topology.type];

    return (
        <group name={customId} rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
            <group rotation={[0, 0, topology.rotation]}>
                <RenderComponent ctx={ctx} />
            </group>
            
            {/* Common Overlays (Manholes, Patches) */}
            {(style === 'worn' || style === 'modern-worn') && (x*y)%7===0 && (
                 <mesh geometry={ROAD_GEO.patch} material={materials.decor.patch} position={[0.1, -0.1, Z_OFFSETS.DECOR]} rotation={[0,0,Math.random()]} />
            )}
            {(x+y)%11===0 && (
                <mesh geometry={ROAD_GEO.manhole} material={materials.decor.manhole} position={[-0.2, 0.2, Z_OFFSETS.DECOR]} />
            )}
        </group>
    );
});
