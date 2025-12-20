
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useState, useRef } from 'react';
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
    DECOR_PATCH: 0.008,
    DECOR_MANHOLE: 0.009,
    FURNITURE: 0.03,
};

// --- Geometries ---

const ROAD_GEO = {
    surface: new THREE.PlaneGeometry(1, 1),
    dash: new THREE.PlaneGeometry(0.1, 0.25),
    corner: new THREE.RingGeometry(0.44, 0.56, 48, 1, 0, Math.PI / 2),
    stopLine: new THREE.PlaneGeometry(0.65, 0.12),
    zebra: new THREE.PlaneGeometry(0.14, 0.35),
    manhole: new THREE.CircleGeometry(0.16, 24),
    patch: new THREE.PlaneGeometry(0.35, 0.4),
    roundaboutBase: new THREE.CircleGeometry(0.5, 48),
    roundaboutCenter: new THREE.CylinderGeometry(0.28, 0.28, 0.12, 48),
    roundaboutInner: new THREE.RingGeometry(0.42, 0.48, 48),
    island: new THREE.CircleGeometry(0.2, 48),
    sidewalkStraight: new THREE.BoxGeometry(0.16, 1, 0.06),
    sidewalkCornerInner: new THREE.RingGeometry(0.38, 0.56, 24, 1, 0, Math.PI / 2), 
    sidewalkCornerOuter: new THREE.RingGeometry(0.08, 0.26, 24, 1, 0, Math.PI / 2), 
    pole: new THREE.CylinderGeometry(0.02, 0.02, 0.8, 12),
    lightBox: new THREE.BoxGeometry(0.12, 0.28, 0.12),
    lightLens: new THREE.CircleGeometry(0.035, 20),
    skirt: new THREE.PlaneGeometry(1.22, 1.22),
    benchSeat: new THREE.BoxGeometry(0.14, 0.025, 0.06),
    benchBack: new THREE.BoxGeometry(0.14, 0.06, 0.015),
    benchLeg: new THREE.BoxGeometry(0.012, 0.035, 0.045),
    lampPole: new THREE.CylinderGeometry(0.012, 0.018, 0.5, 12),
    lampHead: new THREE.BoxGeometry(0.08, 0.04, 0.1),
};

// --- Topology Mapping ---

const BASIC_TOPOLOGY: Record<number, { type: RoadTopology, rotation: number }> = {
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

// --- Material Management ---

const roadMaterialCache: Record<string, RoadMaterials> = {};

const createRoadMaterials = (style: RoadStyle): RoadMaterials => {
    const palette = {
        yellow: '#fde047', 
        white: '#f8fafc',
        grey: '#64748b',
        concrete: '#cbd5e1',
        darkMetal: '#1e293b',
        blackMetal: '#020617',
        asphaltStandard: '#1e293b', 
        asphaltDark: '#0f172a', 
        asphaltWorn: '#334155',
        brickRed: '#7f1d1d',
        grass: '#15803d',
        redLight: '#ef4444',
        yellowLight: '#fbbf24',
        greenLight: '#22c55e',
        offLight: '#0f172a',
        benchWood: '#78350f',
        lampGold: '#fbbf24',
    };

    let surfaceColor = palette.asphaltStandard;
    let lineColor = palette.yellow;
    let sidewalkColor = palette.concrete;
    let roughness = 0.6;
    let metalness = 0.05;

    if (style === 'modern' || style === 'modern-worn') {
        surfaceColor = palette.asphaltDark;
        lineColor = palette.white;
        sidewalkColor = palette.grey;
        roughness = 0.4;
        metalness = 0.15;
    } else if (style === 'worn') {
        surfaceColor = palette.asphaltWorn;
        lineColor = '#94a3b8';
        sidewalkColor = '#475569';
        roughness = 0.9;
        metalness = 0.0;
    } else if (style === 'brick') {
        surfaceColor = palette.brickRed;
        lineColor = 'transparent';
        sidewalkColor = '#451a03';
        roughness = 0.8;
        metalness = 0.0;
    }

    return {
        surface: new THREE.MeshStandardMaterial({ color: surfaceColor, roughness, metalness }),
        line: new THREE.MeshStandardMaterial({ color: lineColor, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide, emissive: lineColor, emissiveIntensity: 0.1 }),
        stop: new THREE.MeshStandardMaterial({ color: palette.white, roughness: 0.1, metalness: 0.3, emissive: palette.white, emissiveIntensity: 0.1 }),
        island: new THREE.MeshStandardMaterial({ color: palette.grass, roughness: 1, metalness: 0 }),
        sidewalk: new THREE.MeshStandardMaterial({ color: sidewalkColor, roughness: 0.7, metalness: 0.15 }),
        pole: new THREE.MeshStandardMaterial({ color: palette.darkMetal, metalness: 0.8, roughness: 0.2 }),
        lightBox: new THREE.MeshStandardMaterial({ color: palette.blackMetal, metalness: 0.5, roughness: 0.5 }),
        lightRed: new THREE.MeshStandardMaterial({ color: palette.redLight, emissive: palette.redLight, emissiveIntensity: 4 }),
        lightYellow: new THREE.MeshStandardMaterial({ color: palette.yellowLight, emissive: palette.yellowLight, emissiveIntensity: 4 }),
        lightGreen: new THREE.MeshStandardMaterial({ color: palette.greenLight, emissive: palette.greenLight, emissiveIntensity: 4 }),
        lightOff: new THREE.MeshStandardMaterial({ color: palette.offLight, roughness: 1.0 }),
        wood: new THREE.MeshStandardMaterial({ color: palette.benchWood, roughness: 0.95 }),
        bench: new THREE.MeshStandardMaterial({ color: palette.benchWood, roughness: 0.85 }),
        lamp: new THREE.MeshStandardMaterial({ color: style === 'brick' ? palette.lampGold : palette.concrete, metalness: 0.9, roughness: 0.1 }),
        decor: {
            manhole: new THREE.MeshStandardMaterial({ color: palette.blackMetal, roughness: 0.45, metalness: 0.7 }),
            patch: new THREE.MeshStandardMaterial({ color: '#020617', roughness: 1, transparent: true, opacity: 0.6 }),
        }
    };
};

// --- Types ---

export type RoadStyle = 'standard' | 'worn' | 'modern' | 'brick' | 'modern-worn';
export type RoadTopology = 'straight' | 'corner' | 'end' | 'threeWay' | 'fourWay' | 'roundabout' | 'culdesac';

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

// --- Logic ---

export const useRoadMaterials = (style: RoadStyle): RoadMaterials => {
    return useMemo(() => {
        if (!roadMaterialCache[style]) {
            roadMaterialCache[style] = createRoadMaterials(style);
        }
        return roadMaterialCache[style];
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

    let topology = BASIC_TOPOLOGY[mask] || { type: 'straight', rotation: 0 };
    if (mask === 15 && variant > ROUNDABOUT_THRESHOLD) {
        topology = { type: 'roundabout', rotation: 0 };
    }
    return { ...topology, mask };
};

// --- Modular Components ---

const RoadBase = ({ materials, isSkirt = true }: { materials: RoadMaterials, isSkirt?: boolean }) => (
    <>
        {isSkirt && <mesh geometry={ROAD_GEO.skirt} material={materials.surface} position={[0, 0, Z_OFFSETS.SKIRT]} receiveShadow />}
        <mesh geometry={ROAD_GEO.surface} material={materials.surface} receiveShadow />
    </>
);

const SidewalkLayout = ({ materials, type, style }: { materials: RoadMaterials, type: RoadTopology, style: RoadStyle }) => {
    const isModern = style === 'modern' || style === 'modern-worn' || style === 'brick';
    if (type === 'corner') {
        return (
            <>
                <group rotation={[0, 0, Math.PI]}>
                    <mesh geometry={ROAD_GEO.sidewalkCornerInner} material={materials.sidewalk} position={[0.5, 0.02, 0.5]} rotation={[0, Math.PI, 0]} receiveShadow />
                </group>
                <mesh geometry={ROAD_GEO.sidewalkCornerOuter} material={materials.sidewalk} position={[0.5, 0.02, 0.5]} rotation={[0, Math.PI, 0]} receiveShadow />
            </>
        );
    }
    if (type === 'straight') {
        const swOffset = isModern ? 0.44 : 0.42;
        return (
            <>
                <mesh geometry={ROAD_GEO.sidewalkStraight} material={materials.sidewalk} position={[swOffset, 0, 0.02]} receiveShadow />
                <group rotation={[0, 0, Math.PI]}>
                    <mesh geometry={ROAD_GEO.sidewalkStraight} material={materials.sidewalk} position={[swOffset, 0, 0.02]} receiveShadow />
                </group>
            </>
        );
    }
    return null;
};

const FurnitureSet = ({ materials, variant, style }: { materials: RoadMaterials, variant: number, style: RoadStyle }) => {
    const showBench = variant % 4 === 0;
    const showLamp = variant % 6 === 0;
    const isModern = style === 'modern' || style === 'modern-worn' || style === 'brick';
    const offset = isModern ? 0.46 : 0.42;

    return (
        <group>
            {showBench && (
                <group position={[offset, 0.25, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
                    <mesh geometry={ROAD_GEO.benchSeat} material={materials.bench} position={[0, 0, 0.035]} />
                    <mesh geometry={ROAD_GEO.benchBack} material={materials.bench} position={[0, 0.03, 0.07]} rotation={[-Math.PI / 8, 0, 0]} />
                    <mesh geometry={ROAD_GEO.benchLeg} material={materials.pole} position={[0.045, 0, 0.018]} />
                    <mesh geometry={ROAD_GEO.benchLeg} material={materials.pole} position={[-0.045, 0, 0.018]} />
                </group>
            )}
            {showLamp && (
                <group position={[offset, -0.35, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
                    <mesh geometry={ROAD_GEO.lampPole} material={materials.lamp} position={[0, 0, 0.25]} />
                    <mesh geometry={ROAD_GEO.lampHead} material={materials.lamp} position={[0, -0.06, 0.5]} rotation={[0.2, 0, 0]} castShadow />
                    <mesh geometry={ROAD_GEO.lightLens} material={materials.lightYellow} position={[0, -0.06, 0.48]} rotation={[Math.PI / 2, 0, 0]} scale={[0.9, 0.9, 0.9]} />
                    <pointLight position={[0, -0.1, 0.45]} intensity={0.5} distance={2.5} color={materials.lightYellow.color} />
                </group>
            )}
        </group>
    );
};

// --- Specialized Topology Components ---

const TopologyStraight = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <RoadBase materials={ctx.materials} />
        <Markings ctx={ctx} type="straight" />
        <SidewalkLayout materials={ctx.materials} type="straight" style={ctx.style} />
        <FurnitureSet materials={ctx.materials} variant={ctx.variant} style={ctx.style} />
        <group rotation={[0, 0, Math.PI]}>
            <FurnitureSet materials={ctx.materials} variant={ctx.variant + 1} style={ctx.style} />
        </group>
    </group>
);

const TopologyCorner = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <RoadBase materials={ctx.materials} />
        <Markings ctx={ctx} type="corner" />
        <SidewalkLayout materials={ctx.materials} type="corner" style={ctx.style} />
    </group>
);

const TopologyEnd = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <RoadBase materials={ctx.materials} />
        <group position={[0, 0.35, Z_OFFSETS.MARKING_OVERLAY]}>
            <mesh geometry={ROAD_GEO.stopLine} material={ctx.materials.stop} scale={[ctx.widthScale, 1, 1]} />
            <group position={[0, 0.12, 0]}>
                {[-0.2, 0, 0.2].map(x => (
                    <mesh key={x} geometry={ROAD_GEO.zebra} material={ctx.materials.stop} position={[x * ctx.widthScale, 0, 0]} />
                ))}
            </group>
        </group>
    </group>
);

const TopologyIntersection = ({ ctx, type }: { ctx: RoadContextType, type: 'threeWay' | 'fourWay' }) => (
    <group>
        <RoadBase materials={ctx.materials} />
        {type === 'threeWay' ? (
            <group>
                <group position={[0, 0, Z_OFFSETS.MARKING_BASE]}>
                    {[0.33, 0, -0.33].map(y => (
                        <mesh key={y} geometry={ROAD_GEO.dash} material={ctx.materials.line} position={[0, y, 0]} scale={[ctx.widthScale, 1, 1]} />
                    ))}
                </group>
                <group rotation={[0, 0, -Math.PI / 2]} position={[0.45, 0, Z_OFFSETS.MARKING_OVERLAY]}>
                    <mesh geometry={ROAD_GEO.stopLine} material={ctx.materials.stop} scale={[ctx.widthScale, 1, 1]} />
                </group>
            </group>
        ) : (
            <group>
                {[0, Math.PI, Math.PI/2, -Math.PI/2].map((rot, i) => (
                    <group key={i} rotation={[0, 0, rot]} position={[0, 0.45, Z_OFFSETS.MARKING_OVERLAY]}>
                        <mesh geometry={ROAD_GEO.stopLine} material={ctx.materials.stop} scale={[ctx.widthScale, 1, 1]} />
                        <group position={[0, 0.12, 0]}>
                            {[-0.2, 0, 0.2].map(x => (
                                <mesh key={x} geometry={ROAD_GEO.zebra} material={ctx.materials.stop} position={[x * ctx.widthScale, 0, 0]} />
                            ))}
                        </group>
                    </group>
                ))}
            </group>
        )}
    </group>
);

const TopologyRoundabout = ({ ctx }: { ctx: RoadContextType }) => (
    <group>
        <mesh geometry={ROAD_GEO.skirt} material={ctx.materials.surface} position={[0, 0, Z_OFFSETS.SKIRT]} receiveShadow />
        <mesh geometry={ROAD_GEO.roundaboutBase} material={ctx.materials.surface} receiveShadow />
        <Markings ctx={ctx} type="roundabout" />
        <mesh geometry={ROAD_GEO.roundaboutCenter} material={ctx.materials.island} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]} castShadow receiveShadow />
        <group position={[0, 0, 0.12]}>
             <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                 <cylinderGeometry args={[0.08, 0.12, 0.25, 12]} />
                 <meshStandardMaterial color={ctx.materials.pole.color} metalness={1} roughness={0.15} />
             </mesh>
             <mesh position={[0, 0, 0.32]} castShadow>
                 <sphereGeometry args={[0.08, 16, 16]} />
                 <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={5} metalness={1} roughness={0} transparent opacity={0.9} />
             </mesh>
        </group>
    </group>
);

const TOPOLOGY_COMPONENTS: Record<RoadTopology, React.FC<{ ctx: RoadContextType }>> = {
    straight: TopologyStraight,
    corner: TopologyCorner,
    end: TopologyEnd,
    threeWay: (props) => <TopologyIntersection {...props} type="threeWay" />,
    fourWay: (props) => <TopologyIntersection {...props} type="fourWay" />,
    roundabout: TopologyRoundabout,
    culdesac: TopologyEnd,
};

// --- Markings ---

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
                    <group position={[0, 0.35, Z_OFFSETS.MARKING_OVERLAY]}>
                        <mesh geometry={ROAD_GEO.stopLine} material={materials.stop} position={[0, -0.1, 0]} scale={[widthScale, 1, 1]} />
                        <group position={[0, 0.1, 0]}>
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
        return <mesh geometry={ROAD_GEO.corner} material={materials.line} position={[0, 0, Z_OFFSETS.MARKING_BASE]} scale={[widthScale, widthScale, 1]} />;
    }
    if (type === 'roundabout') {
        return (
            <group position={[0, 0, Z_OFFSETS.MARKING_BASE]}>
                <mesh geometry={ROAD_GEO.roundaboutInner} material={materials.line} />
                {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((rot, i) => (
                    <group key={i} rotation={[0, 0, rot]}>
                        <mesh geometry={ROAD_GEO.zebra} material={materials.stop} position={[0, 0.45, Z_OFFSETS.MARKING_OVERLAY]} rotation={[0, 0, Math.PI/2]} scale={[0.6, 0.6, 1]} />
                    </group>
                ))}
            </group>
        );
    }
    return null;
};

// --- Exported Components ---

export const TrafficLight = ({ materials, position = [0.4, 0.4, 0], rotation = 0, side = 0 }: { materials: RoadMaterials, position?: [number, number, number], rotation?: number, side?: number }) => {
    const redRef = useRef<THREE.Mesh>(null);
    const yellowRef = useRef<THREE.Mesh>(null);
    const greenRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        const cycle = (time + (side === 1 ? 5 : 0)) % 10;
        if (redRef.current && yellowRef.current && greenRef.current) {
            redRef.current.material = cycle >= 5 ? materials.lightRed : materials.lightOff;
            yellowRef.current.material = (cycle >= 4 && cycle < 5) ? materials.lightYellow : materials.lightOff;
            greenRef.current.material = cycle < 4 ? materials.lightGreen : materials.lightOff;
        }
    });

    return (
        <group position={position} rotation={[Math.PI / 2, 0, rotation]}>
            <mesh geometry={ROAD_GEO.pole} material={materials.pole} position={[0, 0.4, 0]} castShadow />
            <group position={[0, 0.72, 0.08]}>
                <mesh geometry={ROAD_GEO.lightBox} material={materials.lightBox} castShadow />
                <mesh ref={redRef} geometry={ROAD_GEO.lightLens} material={materials.lightOff} position={[0, 0.08, 0.062]} />
                <mesh ref={yellowRef} geometry={ROAD_GEO.lightLens} material={materials.lightOff} position={[0, 0, 0.062]} />
                <mesh ref={greenRef} geometry={ROAD_GEO.lightLens} material={materials.lightOff} position={[0, -0.08, 0.062]} />
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
    const widthScale = style === 'modern' || style === 'modern-worn' ? 1.15 : 1.05;
    const ctx: RoadContextType = { style, variant, widthScale, materials };
    const RenderComponent = TOPOLOGY_COMPONENTS[topology.type] || TOPOLOGY_COMPONENTS.straight;
    const decorSeed = ( (x + 1) * 37 + (y + 1) * 13 + variant) % 100;
    const showManhole = ( (x + 1) + (y + 1) ) % 11 === 0;
    const showPatch = (style === 'worn' || style === 'modern-worn') && ( (x + 1) * (y + 1) ) % 7 === 0;

    return (
        <group name={customId} rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
            <group rotation={[0, 0, topology.rotation]}>
                <RenderComponent ctx={ctx} />
            </group>
            {showPatch && (
                 <mesh 
                    geometry={ROAD_GEO.patch} material={materials.decor.patch} 
                    position={[((decorSeed % 10) - 5) / 25, (((decorSeed / 10) | 0) % 10 - 5) / 25, Z_OFFSETS.DECOR_PATCH]} 
                    rotation={[0, 0, (decorSeed / 100) * Math.PI * 2]} 
                    scale={[0.75 + (decorSeed % 5) / 10, 0.75 + (decorSeed % 7) / 10, 1]}
                 />
            )}
            {showManhole && (
                <mesh 
                    geometry={ROAD_GEO.manhole} material={materials.decor.manhole} 
                    position={[-0.2 + ((decorSeed % 4) - 2) / 25, 0.2 + (((decorSeed / 4) | 0) % 4 - 2) / 25, Z_OFFSETS.DECOR_MANHOLE]} 
                />
            )}
        </group>
    );
});
