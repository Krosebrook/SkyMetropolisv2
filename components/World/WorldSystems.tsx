
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Grid, BuildingType } from '../../types';
import { WORLD_OFFSET, GRID_SIZE } from '../../constants';

const CAR_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#ffffff', '#1f2937'];
const PED_COLORS = ['#22d3ee', '#f472b6', '#4ade80', '#fb923c', '#ffffff'];

const CAR_GEO = new THREE.BoxGeometry(1, 1, 1);
const PED_TORSO_GEO = new THREE.BoxGeometry(0.4, 0.7, 0.4); 
const PED_HEAD_GEO = new THREE.SphereGeometry(0.2, 8, 8); 
const ANIMAL_GEO = new THREE.CapsuleGeometry(0.25, 0.3, 4, 8); 

const BIRD_GEO = new THREE.ConeGeometry(0.15, 0.5, 3);

const _dummy = new THREE.Object3D();
const _dummyHead = new THREE.Object3D();

export const TrafficSystem = ({ grid }: { grid: Grid }) => {
  const roadData = useMemo(() => {
    const roads: {x: number, y: number}[] = [];
    const adjMap = new Map<string, {x: number, y: number}[]>();

    grid.forEach((row, y) => row.forEach((tile, x) => {
      if (tile.buildingType === BuildingType.Road) roads.push({x, y});
    }));

    roads.forEach(r => {
      const neighbors = roads.filter(other => 
        (Math.abs(other.x - r.x) === 1 && other.y === r.y) ||
        (Math.abs(other.y - r.y) === 1 && other.x === r.x)
      );
      adjMap.set(`${r.x},${r.y}`, neighbors);
    });

    return { roads, adjMap };
  }, [grid]);

  // Reduced car density factor from 2.0 to 0.7
  const carCount = Math.min(Math.floor(roadData.roads.length * 0.7), 60);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dataRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (roadData.roads.length < 2) { dataRef.current = null; return; }
    const data = new Float32Array(carCount * 5); 
    const colors = new Float32Array(carCount * 3);

    for (let i = 0; i < carCount; i++) {
        const start = roadData.roads[Math.floor(Math.random() * roadData.roads.length)];
        data[i*5] = start.x; data[i*5+1] = start.y;
        const neighbors = roadData.adjMap.get(`${start.x},${start.y}`) || [];
        const next = neighbors.length > 0 ? neighbors[Math.floor(Math.random() * neighbors.length)] : start;
        data[i*5+2] = next.x; data[i*5+3] = next.y;
        data[i*5+4] = Math.random();
        const c = new THREE.Color(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
        colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    dataRef.current = data;
    if(meshRef.current) {
        meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        meshRef.current.count = carCount;
    }
  }, [roadData, carCount]);

  useFrame((_, delta) => {
    if(!meshRef.current || !dataRef.current || roadData.roads.length < 2) return;
    const currentData = dataRef.current;
    for(let i=0; i<carCount; i++) {
        const idx = i*5;
        let x = currentData[idx], y = currentData[idx+1], tx = currentData[idx+2], ty = currentData[idx+3], p = currentData[idx+4];
        p += delta * 1.1; // Slightly slower cars
        if(p >= 1) {
            x = tx; y = ty; p = 0;
            const neighbors = roadData.adjMap.get(`${x},${y}`) || [];
            const next = neighbors.length > 0 ? neighbors[Math.floor(Math.random() * neighbors.length)] : {x, y};
            tx = next.x; ty = next.y;
        }
        currentData[idx] = x; currentData[idx+1] = y; currentData[idx+2] = tx; currentData[idx+3] = ty; currentData[idx+4] = p;
        const cx = THREE.MathUtils.lerp(x, tx, p) - WORLD_OFFSET;
        const cy = THREE.MathUtils.lerp(y, ty, p) - WORLD_OFFSET;
        const angle = Math.atan2(ty - y, tx - x);
        _dummy.position.set(cx, -0.25, cy);
        _dummy.rotation.set(0, -angle, 0);
        _dummy.scale.set(0.5, 0.2, 0.3);
        _dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, _dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[CAR_GEO, undefined, 250]} castShadow>
      <meshStandardMaterial roughness={0.2} metalness={0.7} />
    </instancedMesh>
  );
};

export const PedestrianSystem = ({ grid }: { grid: Grid }) => {
    const torsoRef = useRef<THREE.InstancedMesh>(null);
    const headRef = useRef<THREE.InstancedMesh>(null);
    const pedCount = 120; // Reduced from 500
    
    const peds = useMemo(() => {
        return Array.from({ length: pedCount }, () => ({
            x: Math.random() * GRID_SIZE, y: Math.random() * GRID_SIZE,
            targetX: Math.random() * GRID_SIZE, targetY: Math.random() * GRID_SIZE,
            speed: 0.12 + Math.random() * 0.15, phase: Math.random() * Math.PI * 2
        }));
    }, []);

    const walkableTiles = useMemo(() => {
        const tiles: {x: number, y: number}[] = [];
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile.buildingType === BuildingType.Road || tile.buildingType === BuildingType.Park) tiles.push({x, y});
        }));
        return tiles;
    }, [grid]);

    useEffect(() => {
        if (!torsoRef.current) return;
        const colors = new Float32Array(pedCount * 3);
        for (let i = 0; i < pedCount; i++) {
            const c = new THREE.Color(PED_COLORS[Math.floor(Math.random() * PED_COLORS.length)]);
            colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
        }
        torsoRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    }, []);

    useFrame(({ clock }) => {
        if (!torsoRef.current || !headRef.current || walkableTiles.length === 0) return;
        const time = clock.getElapsedTime();
        
        peds.forEach((p, i) => {
            if (Math.random() < 0.005) {
                const rt = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
                p.targetX = rt.x + (Math.random() - 0.5) * 0.7;
                p.targetY = rt.y + (Math.random() - 0.5) * 0.7;
            }
            p.x += (p.targetX - p.x) * 0.015;
            p.y += (p.targetY - p.y) * 0.015;
            
            const bob = Math.abs(Math.sin(time * 10 + p.phase)) * 0.1;
            const wx = p.x - WORLD_OFFSET;
            const wz = p.y - WORLD_OFFSET;
            
            _dummy.position.set(wx, -0.15 + bob, wz);
            _dummy.updateMatrix();
            torsoRef.current!.setMatrixAt(i, _dummy.matrix);
            
            _dummyHead.position.set(wx, 0.3 + bob, wz);
            _dummyHead.updateMatrix();
            headRef.current!.setMatrixAt(i, _dummyHead.matrix);
        });
        
        torsoRef.current.instanceMatrix.needsUpdate = true;
        headRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            <instancedMesh ref={torsoRef} args={[PED_TORSO_GEO, undefined, pedCount]} castShadow>
                <meshStandardMaterial roughness={0.3} metalness={0.2} />
            </instancedMesh>
            <instancedMesh ref={headRef} args={[PED_HEAD_GEO, undefined, pedCount]} castShadow>
                <meshStandardMaterial color="#ffe4e6" roughness={0.5} />
            </instancedMesh>
        </group>
    );
};

export const WildlifeSystem = ({ grid }: { grid: Grid }) => {
    const birdRef = useRef<THREE.InstancedMesh>(null);
    const animalRef = useRef<THREE.InstancedMesh>(null);
    const birdCount = 35; // Reduced from 150
    const animalCount = 25; // Reduced from 120

    const natureTiles = useMemo(() => {
        const tiles: {x: number, y: number}[] = [];
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile.buildingType === BuildingType.Park || tile.buildingType === BuildingType.Water) tiles.push({x, y});
        }));
        return tiles;
    }, [grid]);

    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();
        
        if (birdRef.current) {
            for (let i = 0; i < birdCount; i++) {
                const flockId = Math.floor(i / 10);
                const offsetInFlock = (i % 10) * 0.7;
                const radius = 12 + flockId * 6;
                const speed = 0.2 + flockId * 0.03; // Slower birds
                
                const bx = Math.cos(time * speed + flockId) * radius + Math.cos(offsetInFlock) * 0.5;
                const bz = Math.sin(time * speed + flockId) * radius + Math.sin(offsetInFlock) * 0.5;
                const flap = Math.sin(time * 18 + i) * 0.2;
                
                _dummy.position.set(bx, 12 + Math.sin(time * 0.5 + flockId) * 2, bz);
                _dummy.rotation.set(flap, -time * speed - flockId + Math.PI/2, Math.PI/2);
                _dummy.scale.set(1.5, 1.5, 1.5);
                _dummy.updateMatrix();
                birdRef.current.setMatrixAt(i, _dummy.matrix);
            }
            birdRef.current.instanceMatrix.needsUpdate = true;
        }

        if (animalRef.current && natureTiles.length > 0) {
            for (let i = 0; i < animalCount; i++) {
                const tile = natureTiles[i % natureTiles.length];
                const jump = Math.max(0, Math.sin(time * 4 + i * 2)) * 0.7; 
                _dummy.position.set(
                    tile.x - WORLD_OFFSET + Math.cos(i) * 0.35, 
                    -0.2 + jump, 
                    tile.y - WORLD_OFFSET + Math.sin(i) * 0.35
                );
                _dummy.rotation.set(jump * 0.5, 0, 0);
                _dummy.scale.set(1, 1, 1);
                _dummy.updateMatrix();
                animalRef.current.setMatrixAt(i, _dummy.matrix);
            }
            animalRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <group>
            <instancedMesh ref={birdRef} args={[BIRD_GEO, undefined, birdCount]}>
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
            </instancedMesh>
            <instancedMesh ref={animalRef} args={[ANIMAL_GEO, undefined, animalCount]} castShadow>
                <meshStandardMaterial color="#78350f" roughness={0.9} />
            </instancedMesh>
        </group>
    );
};

export const EnvironmentSystem = () => (
    <group>
        <Cloud pos={[-30, 18, 15]} />
        <Cloud pos={[35, 22, -20]} />
        <Cloud pos={[10, 15, 35]} />
        <Cloud pos={[-40, 25, -30]} />
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.65, 0]} receiveShadow>
            <planeGeometry args={[2000, 2000]} />
            <meshStandardMaterial color="#0c4a6e" roughness={1.0} metalness={0.0} transparent opacity={0.2} />
        </mesh>
    </group>
);

const Cloud = ({ pos }: { pos: [number, number, number] }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame(() => {
        if(ref.current) {
            ref.current.position.x += 0.008;
            if(ref.current.position.x > 100) ref.current.position.x = -100;
        }
    });
    return (
        <group ref={ref} position={pos}>
            <mesh geometry={new THREE.SphereGeometry(1, 16, 16)} position={[0,0,0]} scale={[8, 2, 5]} castShadow>
                <meshStandardMaterial color="white" transparent opacity={0.8} flatShading />
            </mesh>
            <mesh geometry={new THREE.SphereGeometry(1, 16, 16)} position={[5,0.8,0]} scale={[5, 1.5, 4]} castShadow>
                <meshStandardMaterial color="white" transparent opacity={0.8} flatShading />
            </mesh>
        </group>
    );
};
