
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BuildingType, Grid } from '../../types';
import { GRID_SIZE } from '../../constants';

// --- Constants & Types ---

export const ROAD_MASKS = { UP: 1, RIGHT: 2, DOWN: 4, LEFT: 8 };

const ROAD_THEME = {
    asphalt: '#020617', 
    marking: '#2dd4bf', 
    sidewalk: '#1e293b', 
    crosswalk: '#a855f7', 
    joint: '#1e293b',
    manhole: '#0f172a',
    patch: '#050a14'
};

const GEO = {
    tile: new THREE.BoxGeometry(1, 0.1, 1),
    curb: new THREE.BoxGeometry(1.01, 0.15, 0.035),
    dash: new THREE.PlaneGeometry(0.025, 0.48),
    crosswalkBar: new THREE.PlaneGeometry(0.045, 0.42),
    cornerMark: new THREE.TorusGeometry(0.485, 0.012, 8, 48, Math.PI / 2),
    joint: new THREE.PlaneGeometry(1, 0.015),
    manhole: new THREE.CircleGeometry(0.125, 32),
    patch: new THREE.PlaneGeometry(0.38, 0.28),
};

interface TopologyInfo {
    type: 'straight' | 'corner' | 'tee' | 'cross' | 'end' | 'dead';
    rotation: number;
    crosswalks: number[]; // Rotations of crosswalks relative to the topology rotation
}

// --- Sub-Components ---

const NeonMaterial = ({ color, intensity = 15 }: { color: string, intensity?: number }) => {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.emissiveIntensity = intensity + Math.sin(clock.getElapsedTime() * 10) * (intensity * 0.4);
    }
  });
  return <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={intensity} transparent opacity={0.98} />;
};

const MarkingBase = ({ children, rotation = 0, position = [0, 0.056, 0] }: any) => (
    <group rotation={[-Math.PI / 2, 0, rotation]} position={position as any}>
        {children}
    </group>
);

const StraightMarkings = () => (
    <MarkingBase>
        <mesh geometry={GEO.dash} position={[0, 0.25, 0]}>
            <NeonMaterial color={ROAD_THEME.marking} />
        </mesh>
        <mesh geometry={GEO.dash} position={[0, -0.25, 0]}>
            <NeonMaterial color={ROAD_THEME.marking} />
        </mesh>
    </MarkingBase>
);

const CornerMarkings = () => (
    <group position={[0, 0.056, 0]}>
        <mesh geometry={GEO.cornerMark} rotation={[Math.PI / 2, 0, 0]} position={[-0.485, 0, -0.485]}>
            <NeonMaterial color={ROAD_THEME.marking} />
        </mesh>
    </group>
);

const Crosswalk = ({ rotation, centered = false, key }: { rotation: number, centered?: boolean, key?: React.Key }) => (
    <MarkingBase rotation={rotation}>
        <group position={[0, centered ? 0 : 0.43, 0]}>
            {[-0.35, -0.15, 0.15, 0.35].map((x, i) => (
                <mesh key={i} geometry={GEO.crosswalkBar} position={[x, 0, 0]}>
                    <NeonMaterial color={ROAD_THEME.crosswalk} intensity={8} />
                </mesh>
            ))}
        </group>
    </MarkingBase>
);

const SidewalkCurb = ({ rotation }: { rotation: number }) => (
    <group rotation={[0, rotation, 0]} position={[0, -0.045, 0]}>
        <mesh geometry={GEO.curb} position={[0, 0.065, 0.482]}>
            <meshPhysicalMaterial 
                color={ROAD_THEME.sidewalk} 
                roughness={0.1} 
                metalness={0.95} 
                clearcoat={1.0} 
                clearcoatRoughness={0.05}
            />
        </mesh>
    </group>
);

const RoadJoint = ({ rotation }: { rotation: number }) => (
    <mesh geometry={GEO.joint} rotation={[-Math.PI / 2, 0, rotation]} position={[0, 0.052, 0]}>
        <meshBasicMaterial color={ROAD_THEME.joint} transparent opacity={0.4} />
    </mesh>
);

const Manhole = () => (
    <mesh geometry={GEO.manhole} rotation={[-Math.PI / 2, 0, 0]} position={[0.22, 0.053, 0.22]}>
        <meshPhysicalMaterial 
            color={ROAD_THEME.manhole} 
            metalness={1} 
            roughness={0.3} 
            clearcoat={0.3}
        />
    </mesh>
);

const AsphaltPatch = ({ x, y }: { x: number, y: number }) => {
    const px = ((x * 19) % 10) / 20 - 0.25;
    const pz = ((y * 29) % 10) / 20 - 0.25;
    const rot = (x * y) % Math.PI;

    return (
        <mesh geometry={GEO.patch} rotation={[-Math.PI / 2, 0, rot]} position={[px, 0.052, pz]}>
            <meshBasicMaterial color={ROAD_THEME.patch} transparent opacity={0.8} />
        </mesh>
    );
};

// --- Logic Helpers ---

const getRoadTopology = (mask: number): TopologyInfo => {
    switch (mask) {
        case 5:  return { type: 'straight', rotation: 0, crosswalks: [] };
        case 10: return { type: 'straight', rotation: Math.PI / 2, crosswalks: [] };
        case 3:  return { type: 'corner', rotation: Math.PI, crosswalks: [] };
        case 6:  return { type: 'corner', rotation: Math.PI / 2, crosswalks: [] };
        case 12: return { type: 'corner', rotation: 0, crosswalks: [] };
        case 9:  return { type: 'corner', rotation: -Math.PI / 2, crosswalks: [] };
        case 7:  return { type: 'tee', rotation: 0, crosswalks: [0, Math.PI / 2, -Math.PI / 2] };
        case 11: return { type: 'tee', rotation: Math.PI / 2, crosswalks: [0, Math.PI / 2, -Math.PI / 2] };
        case 13: return { type: 'tee', rotation: Math.PI, crosswalks: [0, Math.PI / 2, -Math.PI / 2] };
        case 14: return { type: 'tee', rotation: -Math.PI / 2, crosswalks: [0, Math.PI / 2, -Math.PI / 2] };
        case 15: return { type: 'cross', rotation: 0, crosswalks: [0, Math.PI / 2, Math.PI, -Math.PI / 2] };
        case 1:  return { type: 'end', rotation: 0, crosswalks: [0] };
        case 2:  return { type: 'end', rotation: -Math.PI / 2, crosswalks: [0] };
        case 4:  return { type: 'end', rotation: Math.PI, crosswalks: [0] };
        case 8:  return { type: 'end', rotation: Math.PI / 2, crosswalks: [0] };
        default: return { type: 'dead', rotation: 0, crosswalks: [] };
    }
};

/**
 * Renders the basic road surface including asphalt and random wear details.
 */
const RoadSurface = memo(({ x, y }: { x: number, y: number }) => {
    const hasManhole = (x + y) % 11 === 0;
    const hasPatch = (x * y) % 7 === 0;

    return (
        <group>
            <mesh geometry={GEO.tile} receiveShadow>
                <meshPhysicalMaterial 
                    color={ROAD_THEME.asphalt} 
                    roughness={0.75} 
                    metalness={0.6} 
                    clearcoat={0.2}
                    clearcoatRoughness={0.1}
                />
            </mesh>
            <RoadJoint rotation={0} />
            <RoadJoint rotation={Math.PI / 2} />
            {hasManhole && <Manhole />}
            {hasPatch && <AsphaltPatch x={x} y={y} />}
        </group>
    );
});

/**
 * Renders the curbs based on the neighborhood mask.
 */
const RoadEdges = memo(({ mask }: { mask: number }) => (
    <group>
        {!(mask & ROAD_MASKS.UP) && <SidewalkCurb rotation={0} />}
        {!(mask & ROAD_MASKS.RIGHT) && <SidewalkCurb rotation={-Math.PI / 2} />}
        {!(mask & ROAD_MASKS.DOWN) && <SidewalkCurb rotation={Math.PI} />}
        {!(mask & ROAD_MASKS.LEFT) && <SidewalkCurb rotation={Math.PI / 2} />}
    </group>
));

/**
 * Renders the functional markings (lines, crosswalks) based on topology.
 */
const RoadFunctionalMarkings = memo(({ topology, isSpecialCrossing }: { topology: TopologyInfo, isSpecialCrossing: boolean }) => (
    <group rotation={[0, topology.rotation, 0]}>
        {topology.type === 'straight' && !isSpecialCrossing && <StraightMarkings />}
        {topology.type === 'corner' && <CornerMarkings />}
        
        {/* Render standard crosswalks defined by topology */}
        {!isSpecialCrossing && topology.crosswalks.map((rot, i) => (
            <Crosswalk key={i} rotation={rot} />
        ))}

        {/* Specialized crossing for identified segments */}
        {isSpecialCrossing && (
            <Crosswalk rotation={0} centered={true} />
        )}
    </group>
));

// --- Main Export ---

export const RoadMarkings = React.memo(({ x, y, grid, yOffset, customId }: any) => {
    const isRoad = (gx: number, gy: number) => {
        if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return false;
        return grid[gy]?.[gx]?.buildingType === BuildingType.Road;
    };

    const mask = useMemo(() => 
        (isRoad(x, y - 1) ? ROAD_MASKS.UP : 0) | 
        (isRoad(x + 1, y) ? ROAD_MASKS.RIGHT : 0) | 
        (isRoad(x, y + 1) ? ROAD_MASKS.DOWN : 0) | 
        (isRoad(x - 1, y) ? ROAD_MASKS.LEFT : 0)
    , [x, y, grid]);

    const topology = useMemo(() => getRoadTopology(mask), [mask]);
    const isSpecialCrossing = customId === 'road-segment-a';

    return (
        <group position={[0, yOffset, 0]} name={customId}>
            <RoadSurface x={x} y={y} />
            <RoadEdges mask={mask} />
            <RoadFunctionalMarkings topology={topology} isSpecialCrossing={isSpecialCrossing} />
        </group>
    );
});

// Helper for pure component memoization
function memo<T>(component: React.FC<T>) {
    return React.memo(component);
}
