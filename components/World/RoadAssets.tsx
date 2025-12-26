
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BuildingType } from '../../types';
import { GRID_SIZE } from '../../constants';

export const ROAD_MASKS = { UP: 1, RIGHT: 2, DOWN: 4, LEFT: 8 };

const ROAD_THEME = {
    asphalt: '#020617', // Deep black-slate
    marking: '#2dd4bf', // Neon Teal
    sidewalk: '#1e293b', // Muted slate
    crosswalk: '#a855f7', // Cyber Purple
};

const GEO = {
    tile: new THREE.BoxGeometry(1, 0.1, 1),
    curb: new THREE.BoxGeometry(1.02, 0.12, 0.03),
    dash: new THREE.PlaneGeometry(0.03, 0.35),
    crosswalkBar: new THREE.PlaneGeometry(0.06, 0.3),
    cornerMark: new THREE.TorusGeometry(0.48, 0.015, 8, 32, Math.PI / 2),
};

const NeonMaterial = ({ color, intensity = 8 }: { color: string, intensity?: number }) => {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.emissiveIntensity = intensity + Math.sin(clock.getElapsedTime() * 4) * (intensity * 0.3);
    }
  });
  return <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={intensity} transparent opacity={0.95} />;
};

const MarkingBase = ({ children, rotation = 0 }: any) => (
    <group rotation={[-Math.PI / 2, 0, rotation]} position={[0, 0.052, 0]}>
        {children}
    </group>
);

const StraightMarkings = () => (
    <MarkingBase>
        <mesh geometry={GEO.dash} position={[0, 0.2, 0]}>
            <NeonMaterial color={ROAD_THEME.marking} />
        </mesh>
        <mesh geometry={GEO.dash} position={[0, -0.2, 0]}>
            <NeonMaterial color={ROAD_THEME.marking} />
        </mesh>
    </MarkingBase>
);

const CornerMarkings = () => (
    <group position={[0, 0.052, 0]}>
        <mesh geometry={GEO.cornerMark} rotation={[Math.PI / 2, 0, 0]} position={[-0.48, 0, -0.48]}>
            <NeonMaterial color={ROAD_THEME.marking} />
        </mesh>
    </group>
);

const Crosswalk = ({ rotation }: { rotation: number }) => (
    <MarkingBase rotation={rotation}>
        <group position={[0, 0.38, 0]}>
            {[-0.25, -0.1, 0.1, 0.25].map((x, i) => (
                <mesh key={i} geometry={GEO.crosswalkBar} position={[x, 0, 0]}>
                    <NeonMaterial color={ROAD_THEME.crosswalk} intensity={3} />
                </mesh>
            ))}
        </group>
    </MarkingBase>
);

const SidewalkCurb = ({ rotation }: { rotation: number }) => (
    <group rotation={[0, rotation, 0]} position={[0, -0.04, 0]}>
        <mesh geometry={GEO.curb} position={[0, 0.05, 0.49]}>
            <meshPhysicalMaterial color={ROAD_THEME.sidewalk} roughness={0.3} metalness={0.7} />
        </mesh>
    </group>
);

const getRoadTopology = (mask: number) => {
    switch (mask) {
        case 5:  return { type: 'straight', rotation: 0 };
        case 10: return { type: 'straight', rotation: Math.PI / 2 };
        case 3:  return { type: 'corner', rotation: Math.PI };
        case 6:  return { type: 'corner', rotation: Math.PI / 2 };
        case 12: return { type: 'corner', rotation: 0 };
        case 9:  return { type: 'corner', rotation: -Math.PI / 2 };
        case 7:  return { type: 'tee', rotation: 0 };
        case 11: return { type: 'tee', rotation: Math.PI / 2 };
        case 13: return { type: 'tee', rotation: Math.PI };
        case 14: return { type: 'tee', rotation: -Math.PI / 2 };
        case 15: return { type: 'cross', rotation: 0 };
        case 1:  return { type: 'end', rotation: 0 };
        case 2:  return { type: 'end', rotation: -Math.PI / 2 };
        case 4:  return { type: 'end', rotation: Math.PI };
        case 8:  return { type: 'end', rotation: Math.PI / 2 };
        default: return { type: 'dead', rotation: 0 };
    }
};

export const RoadMarkings = React.memo(({ x, y, grid, yOffset }: any) => {
    const isRoad = (gx: number, gy: number) => {
        if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return false;
        return grid[gy]?.[gx]?.buildingType === BuildingType.Road;
    };

    const mask = 
        (isRoad(x, y - 1) ? ROAD_MASKS.UP : 0) | 
        (isRoad(x + 1, y) ? ROAD_MASKS.RIGHT : 0) | 
        (isRoad(x, y + 1) ? ROAD_MASKS.DOWN : 0) | 
        (isRoad(x - 1, y) ? ROAD_MASKS.LEFT : 0);

    const topology = useMemo(() => getRoadTopology(mask), [mask]);

    return (
        <group position={[0, yOffset, 0]}>
            <mesh geometry={GEO.tile} receiveShadow>
                <meshPhysicalMaterial color={ROAD_THEME.asphalt} roughness={0.8} metalness={0.2} />
            </mesh>

            {!(mask & ROAD_MASKS.UP) && <SidewalkCurb rotation={0} />}
            {!(mask & ROAD_MASKS.RIGHT) && <SidewalkCurb rotation={-Math.PI / 2} />}
            {!(mask & ROAD_MASKS.DOWN) && <SidewalkCurb rotation={Math.PI} />}
            {!(mask & ROAD_MASKS.LEFT) && <SidewalkCurb rotation={Math.PI / 2} />}

            <group rotation={[0, topology.rotation, 0]}>
                {topology.type === 'straight' && <StraightMarkings />}
                {topology.type === 'corner' && <CornerMarkings />}
                {topology.type === 'tee' && (
                    <>
                        <Crosswalk rotation={0} />
                        <Crosswalk rotation={Math.PI / 2} />
                        <Crosswalk rotation={-Math.PI / 2} />
                    </>
                )}
                {topology.type === 'cross' && (
                    <>
                        <Crosswalk rotation={0} />
                        <Crosswalk rotation={Math.PI / 2} />
                        <Crosswalk rotation={Math.PI} />
                        <Crosswalk rotation={-Math.PI / 2} />
                    </>
                )}
                {topology.type === 'end' && (
                    <Crosswalk rotation={0} />
                )}
            </group>
        </group>
    );
});
