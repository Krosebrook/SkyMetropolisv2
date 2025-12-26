
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Grid, BuildingType, CityStats } from '../../types';
import { WORLD_OFFSET, GRID_SIZE } from '../../constants';

export const EnvironmentSystem = () => {
    return (
        <group>
            <Cloud pos={[-30, 15, 10]} speed={0.01} />
            <Cloud pos={[35, 18, -20]} speed={0.008} />
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.65, 0]} receiveShadow>
                <planeGeometry args={[1000, 1000]} />
                <meshStandardMaterial color="#020617" roughness={1.0} transparent opacity={0.5} />
            </mesh>
        </group>
    );
};

const Cloud = ({ pos, speed }: { pos: [number, number, number], speed: number }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame(() => {
        if(ref.current) {
            ref.current.position.x += speed;
            if(ref.current.position.x > 80) ref.current.position.x = -80;
        }
    });
    return (
        <group ref={ref} position={pos}>
            <mesh scale={[10, 0.5, 6]}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial color="#2dd4bf" transparent opacity={0.05} emissive="#2dd4bf" emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
};

export const WildlifeSystem = ({ grid }: { grid: Grid }) => {
    return (
        <group>
            {Array.from({ length: 8 }).map((_, i) => (
                <SurveyDrone key={`drone-${i}`} />
            ))}
        </group>
    );
};

const SurveyDrone = () => {
    const ref = useRef<THREE.Group>(null);
    const speed = useMemo(() => 0.02 + Math.random() * 0.05, []);
    const radius = useMemo(() => 20 + Math.random() * 30, []);
    const height = useMemo(() => 12 + Math.random() * 6, []);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime() * speed;
        ref.current.position.x = Math.cos(t) * radius;
        ref.current.position.z = Math.sin(t) * radius;
        ref.current.position.y = height + Math.sin(t * 2) * 0.5;
        ref.current.rotation.y = -t;
    });

    return (
        <group ref={ref}>
            <mesh castShadow>
                <boxGeometry args={[0.4, 0.1, 0.4]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
                <sphereGeometry args={[0.1]} />
                <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={5} />
            </mesh>
        </group>
    );
};

export const TrafficSystem = ({ grid, stats }: { grid: Grid, stats: CityStats }) => {
    const roads = useMemo(() => {
        const r: [number, number][] = [];
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile.buildingType === BuildingType.Road) r.push([x, y]);
        }));
        return r;
    }, [grid]);

    const carCount = Math.min(roads.length / 4, 15);
    
    return (
        <group>
            {roads.slice(0, carCount).map(([x, y], i) => (
                <MaglevPod key={`pod-${i}`} x={x} y={y} />
            ))}
        </group>
    );
};

const MaglevPod = ({ x, y }: any) => {
    const ref = useRef<THREE.Group>(null);
    const [wx, _, wz] = useMemo(() => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET], [x, y]);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime() + (x + y);
        ref.current.position.y = -0.15 + Math.sin(t * 3) * 0.02;
    });

    return (
        <group ref={ref} position={[wx, -0.15, wz]} scale={[0.15, 0.08, 0.3]}>
            <mesh castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshPhysicalMaterial color="#334155" roughness={0} metalness={1} />
            </mesh>
            <mesh position={[0, -0.6, 0]} scale={[1.2, 0.1, 1.2]}>
                <boxGeometry />
                <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={4} transparent opacity={0.6} />
            </mesh>
        </group>
    );
};

export const PedestrianSystem = ({ grid, stats }: { grid: Grid, stats: CityStats }) => {
    const activeTiles = useMemo(() => {
        const r: [number, number][] = [];
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile.buildingType === BuildingType.Residential || tile.buildingType === BuildingType.Commercial) r.push([x, y]);
        }));
        return r;
    }, [grid]);

    const personCount = Math.min(stats.population / 8, 30);

    return (
        <group>
            {activeTiles.slice(0, personCount).map(([x, y], i) => (
                <DigitalSprite key={`sprite-${i}`} x={x} y={y} />
            ))}
        </group>
    );
};

const DigitalSprite = ({ x, y }: any) => {
    const ref = useRef<THREE.Group>(null);
    const [wx, _, wz] = useMemo(() => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET], [x, y]);
    const offset = useMemo(() => Math.random() * 10, []);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime() + offset;
        ref.current.scale.y = 0.5 + Math.sin(t * 5) * 0.2;
    });

    return (
        <group ref={ref} position={[wx + 0.2, -0.2, wz + 0.2]}>
            <mesh position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
                <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={3} transparent opacity={0.8} />
            </mesh>
        </group>
    );
};
