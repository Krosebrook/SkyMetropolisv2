
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Grid, BuildingType, CityStats } from '../../types';
import { WORLD_OFFSET, GRID_SIZE } from '../../constants';

const CAR_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#ffffff', '#1f2937'];
const PED_COLORS = ['#22d3ee', '#f472b6', '#4ade80', '#fb923c', '#ffffff'];

const CAR_GEO = new THREE.BoxGeometry(1, 1, 1);
const PED_TORSO_GEO = new THREE.BoxGeometry(0.3, 0.6, 0.3); 
const PED_HEAD_GEO = new THREE.SphereGeometry(0.15, 8, 8); 
const ANIMAL_GEO = new THREE.CapsuleGeometry(0.18, 0.2, 4, 8); 
const BIRD_GEO = new THREE.ConeGeometry(0.1, 0.35, 3);

const _dummy = new THREE.Object3D();
const _dummyHead = new THREE.Object3D();

/**
 * Traffic System: Cars strictly on roads, obeying traffic lights.
 */
export const TrafficSystem = ({ grid, stats }: { grid: Grid, stats: CityStats }) => {
  const roadData = useMemo(() => {
    const roads: {x: number, y: number, isIntersection?: boolean}[] = [];
    const adjMap = new Map<string, {x: number, y: number}[]>();

    grid.forEach((row, y) => row.forEach((tile, x) => {
      if (tile.buildingType === BuildingType.Road) {
          roads.push({x, y, isIntersection: tile.customId === 'intersection-1'});
      }
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

  // Traffic scales with population (infrastructure usage)
  const carCount = Math.min(Math.floor(stats.population / 40) + 2, 20);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dataRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (roadData.roads.length < 2 || carCount <= 0) { dataRef.current = null; return; }
    const data = new Float32Array(carCount * 6); // x, y, tx, ty, progress, speed
    const colors = new Float32Array(carCount * 3);

    for (let i = 0; i < carCount; i++) {
        const start = roadData.roads[Math.floor(Math.random() * roadData.roads.length)];
        data[i*6] = start.x; data[i*6+1] = start.y;
        const neighbors = roadData.adjMap.get(`${start.x},${start.y}`) || [];
        const next = neighbors.length > 0 ? neighbors[Math.floor(Math.random() * neighbors.length)] : start;
        data[i*6+2] = next.x; data[i*6+3] = next.y;
        data[i*6+4] = Math.random();
        data[i*6+5] = 0.8 + Math.random() * 0.5;
        const c = new THREE.Color(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
        colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    dataRef.current = data;
    if(meshRef.current) {
        meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        meshRef.current.count = carCount;
    }
  }, [roadData, carCount]);

  useFrame(({ clock }, delta) => {
    if(!meshRef.current || !dataRef.current || carCount <= 0) return;
    const time = clock.getElapsedTime();
    const currentData = dataRef.current;

    for(let i=0; i<carCount; i++) {
        const idx = i*6;
        let x = currentData[idx], y = currentData[idx+1], tx = currentData[idx+2], ty = currentData[idx+3], p = currentData[idx+4], speed = currentData[idx+5];
        
        // Traffic Light Logic: Synchronized with RoadAssets.tsx
        // Side 0 = North/South (UP/DOWN), Side 1 = East/West (LEFT/RIGHT)
        const isIntersection = grid[y]?.[x]?.customId === 'intersection-1';
        let waiting = false;
        
        if (isIntersection && p > 0.4 && p < 0.6) {
            const side = (tx !== x) ? 1 : 0; // If moving horizontally, side 1
            const cycle = (time + (side === 1 ? 5 : 0)) % 10;
            if (cycle >= 4.5) waiting = true; // Red/Yellow phase (stop)
        }

        if (!waiting) {
            p += delta * speed;
            if(p >= 1) {
                x = tx; y = ty; p = 0;
                const neighbors = roadData.adjMap.get(`${x},${y}`) || [];
                const next = neighbors.length > 0 ? neighbors[Math.floor(Math.random() * neighbors.length)] : {x, y};
                tx = next.x; ty = next.y;
            }
        }

        currentData[idx] = x; currentData[idx+1] = y; currentData[idx+2] = tx; currentData[idx+3] = ty; currentData[idx+4] = p;
        
        const cx = THREE.MathUtils.lerp(x, tx, p) - WORLD_OFFSET;
        const cy = THREE.MathUtils.lerp(y, ty, p) - WORLD_OFFSET;
        const angle = Math.atan2(ty - y, tx - x);
        
        _dummy.position.set(cx, -0.25, cy);
        _dummy.rotation.set(0, -angle, 0);
        _dummy.scale.set(0.4, 0.18, 0.28);
        _dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, _dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[CAR_GEO, undefined, 50]} castShadow visible={carCount > 0}>
      <meshStandardMaterial roughness={0.2} metalness={0.7} />
    </instancedMesh>
  );
};

/**
 * Pedestrian System: Citizens with lives, spawning from houses.
 */
export const PedestrianSystem = ({ grid, stats }: { grid: Grid, stats: CityStats }) => {
    const torsoRef = useRef<THREE.InstancedMesh>(null);
    const headRef = useRef<THREE.InstancedMesh>(null);
    
    // Number of simulated people linked to city data
    const activePedLimit = Math.min(Math.floor(stats.population / 15) + 1, 40);
    
    const residentialTiles = useMemo(() => {
        const tiles: {x: number, y: number}[] = [];
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile.buildingType === BuildingType.Residential) tiles.push({x, y});
        }));
        return tiles;
    }, [grid]);

    const destinationTiles = useMemo(() => {
        const tiles: {x: number, y: number}[] = [];
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile.buildingType === BuildingType.Commercial || 
                tile.buildingType === BuildingType.Industrial || 
                tile.buildingType === BuildingType.Park) tiles.push({x, y});
        }));
        return tiles;
    }, [grid]);

    const peds = useMemo(() => {
        return Array.from({ length: 50 }, () => ({
            active: false,
            inside: true, // Invisible while inside buildings
            x: 0, y: 0,
            targetX: 0, targetY: 0,
            speed: 0.15 + Math.random() * 0.1,
            phase: Math.random() * Math.PI * 2,
            waitTimer: Math.random() * 5,
            state: 'AT_HOME' // AT_HOME, TO_WORK, AT_WORK, TO_HOME
        }));
    }, []);

    useEffect(() => {
        if (!torsoRef.current) return;
        const colors = new Float32Array(50 * 3);
        for (let i = 0; i < 50; i++) {
            const c = new THREE.Color(PED_COLORS[Math.floor(Math.random() * PED_COLORS.length)]);
            colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
        }
        torsoRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

        peds.forEach((p, i) => {
            if (i < activePedLimit && residentialTiles.length > 0) {
                const res = residentialTiles[Math.floor(Math.random() * residentialTiles.length)];
                p.x = res.x; p.y = res.y;
                p.targetX = res.x; p.targetY = res.y;
                p.active = true;
                p.inside = true; 
                p.state = 'AT_HOME';
            } else {
                p.active = false;
            }
        });
    }, [activePedLimit, residentialTiles.length]);

    useFrame(({ clock }, delta) => {
        if (!torsoRef.current || !headRef.current) return;
        
        const time = clock.getElapsedTime();
        
        peds.forEach((p, i) => {
            if (!p.active) {
                _dummy.position.set(0, -100, 0);
                _dummy.updateMatrix();
                torsoRef.current!.setMatrixAt(i, _dummy.matrix);
                headRef.current!.setMatrixAt(i, _dummy.matrix);
                return;
            }

            if (p.waitTimer > 0) {
                p.waitTimer -= delta;
                p.inside = true; 
            } else {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 0.05) {
                    // State transitions
                    if (p.state === 'AT_HOME') {
                        if (destinationTiles.length > 0) {
                            const dest = destinationTiles[Math.floor(Math.random() * destinationTiles.length)];
                            p.targetX = dest.x; p.targetY = dest.y;
                            p.state = 'TO_WORK';
                            p.inside = false;
                        } else {
                            p.waitTimer = 5; // Idle at home
                        }
                    } else if (p.state === 'TO_WORK') {
                        p.state = 'AT_WORK';
                        p.waitTimer = 5 + Math.random() * 10;
                        p.inside = true;
                    } else if (p.state === 'AT_WORK') {
                        const home = residentialTiles[Math.floor(Math.random() * residentialTiles.length)];
                        if (home) {
                            p.targetX = home.x; p.targetY = home.y;
                            p.state = 'TO_HOME';
                            p.inside = false;
                        }
                    } else if (p.state === 'TO_HOME') {
                        p.state = 'AT_HOME';
                        p.waitTimer = 8 + Math.random() * 12;
                        p.inside = true;
                    }
                } else {
                    p.inside = false;
                    p.x += (dx / dist) * p.speed * delta;
                    p.y += (dy / dist) * p.speed * delta;
                }
            }
            
            // Rendering
            if (p.inside) {
                _dummy.position.set(0, -100, 0);
            } else {
                // Sidewalk offset
                const sidewalkOffset = 0.38;
                const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
                const ox = Math.cos(angle + Math.PI/2) * sidewalkOffset;
                const oz = Math.sin(angle + Math.PI/2) * sidewalkOffset;

                const bob = Math.abs(Math.sin(time * 10 + p.phase)) * 0.06;
                const wx = p.x - WORLD_OFFSET + ox;
                const wz = p.y - WORLD_OFFSET + oz;
                _dummy.position.set(wx, -0.2 + bob, wz);
                _dummy.scale.set(1, 1, 1);
            }
            
            _dummy.updateMatrix();
            torsoRef.current!.setMatrixAt(i, _dummy.matrix);
            
            const headPos = _dummy.position.clone();
            headPos.y += 0.4;
            _dummyHead.position.copy(headPos);
            _dummyHead.updateMatrix();
            headRef.current!.setMatrixAt(i, _dummyHead.matrix);
        });
        
        torsoRef.current.instanceMatrix.needsUpdate = true;
        headRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            <instancedMesh ref={torsoRef} args={[PED_TORSO_GEO, undefined, 50]} castShadow>
                <meshStandardMaterial roughness={0.4} metalness={0.1} />
            </instancedMesh>
            <instancedMesh ref={headRef} args={[PED_HEAD_GEO, undefined, 50]} castShadow>
                <meshStandardMaterial color="#ffe4e6" roughness={0.5} />
            </instancedMesh>
        </group>
    );
};

/**
 * Wildlife System: Minimal presence near nature.
 */
export const WildlifeSystem = ({ grid }: { grid: Grid }) => {
    const birdRef = useRef<THREE.InstancedMesh>(null);
    const animalRef = useRef<THREE.InstancedMesh>(null);
    
    const natureTiles = useMemo(() => {
        const tiles: {x: number, y: number}[] = [];
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile.buildingType === BuildingType.Park || tile.buildingType === BuildingType.Water) tiles.push({x, y});
        }));
        return tiles;
    }, [grid]);

    const birdCount = natureTiles.length > 0 ? 6 : 0;
    const animalCount = natureTiles.length > 0 ? Math.min(natureTiles.length, 3) : 0;

    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();
        
        if (birdRef.current && birdCount > 0) {
            for (let i = 0; i < birdCount; i++) {
                const radius = 18 + i;
                const bx = Math.cos(time * 0.1 + i) * radius;
                const bz = Math.sin(time * 0.1 + i) * radius;
                _dummy.position.set(bx, 14 + Math.sin(time * 0.4) * 1, bz);
                _dummy.rotation.set(0, -time * 0.1 - i + Math.PI/2, Math.PI/2);
                _dummy.updateMatrix();
                birdRef.current.setMatrixAt(i, _dummy.matrix);
            }
            birdRef.current.instanceMatrix.needsUpdate = true;
            birdRef.current.count = birdCount;
        }

        if (animalRef.current && animalCount > 0) {
            for (let i = 0; i < animalCount; i++) {
                const tile = natureTiles[i % natureTiles.length];
                const jump = Math.max(0, Math.sin(time * 3 + i)) * 0.25; 
                _dummy.position.set(
                    tile.x - WORLD_OFFSET + Math.cos(i) * 0.2, 
                    -0.28 + jump, 
                    tile.y - WORLD_OFFSET + Math.sin(i) * 0.2
                );
                _dummy.rotation.set(0, time * 0.3 + i, 0);
                _dummy.updateMatrix();
                animalRef.current.setMatrixAt(i, _dummy.matrix);
            }
            animalRef.current.instanceMatrix.needsUpdate = true;
            animalRef.current.count = animalCount;
        }
    });

    return (
        <group>
            <instancedMesh ref={birdRef} args={[BIRD_GEO, undefined, 10]} visible={birdCount > 0}>
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.1} />
            </instancedMesh>
            <instancedMesh ref={animalRef} args={[ANIMAL_GEO, undefined, 10]} castShadow visible={animalCount > 0}>
                <meshStandardMaterial color="#78350f" roughness={0.9} />
            </instancedMesh>
        </group>
    );
};

export const EnvironmentSystem = () => (
    <group>
        <Cloud pos={[-35, 20, 10]} />
        <Cloud pos={[40, 24, -25]} />
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.65, 0]} receiveShadow>
            <planeGeometry args={[2000, 2000]} />
            <meshStandardMaterial color="#0c4a6e" roughness={1.0} metalness={0.0} transparent opacity={0.05} />
        </mesh>
    </group>
);

const Cloud = ({ pos }: { pos: [number, number, number] }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame(() => {
        if(ref.current) {
            ref.current.position.x += 0.002;
            if(ref.current.position.x > 150) ref.current.position.x = -150;
        }
    });
    return (
        <group ref={ref} position={pos}>
            <mesh geometry={new THREE.SphereGeometry(1, 12, 12)} position={[0,0,0]} scale={[8, 1.5, 3]} castShadow>
                <meshStandardMaterial color="white" transparent opacity={0.4} flatShading />
            </mesh>
        </group>
    );
};
