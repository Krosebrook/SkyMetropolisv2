/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Grid, BuildingType } from '../../types';
import { WORLD_OFFSET } from '../../constants';

const CAR_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#ffffff', '#1f2937'];
const CAR_GEO = new THREE.BoxGeometry(1, 1, 1);

// Hoisted for performance
const _dummy = new THREE.Object3D();

export const TrafficSystem = ({ grid }: { grid: Grid }) => {
  // Road tiles and their neighbors for fast lookup
  const roadData = useMemo(() => {
    const roads: {x: number, y: number}[] = [];
    const adjMap = new Map<string, {x: number, y: number}[]>();

    grid.forEach((row, y) => row.forEach((tile, x) => {
      if (tile.buildingType === BuildingType.Road) {
        roads.push({x, y});
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

  const carCount = Math.min(roadData.roads.length, 30);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dataRef = useRef<Float32Array | null>(null);

  // Initialize Cars
  useEffect(() => {
    if (roadData.roads.length < 2) {
        dataRef.current = null;
        return;
    }
    
    const count = Math.min(roadData.roads.length, 30);
    const data = new Float32Array(count * 5); 
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const start = roadData.roads[Math.floor(Math.random() * roadData.roads.length)];
        data[i*5] = start.x;
        data[i*5+1] = start.y;
        
        const neighbors = roadData.adjMap.get(`${start.x},${start.y}`) || [];
        const next = neighbors.length > 0 ? neighbors[Math.floor(Math.random() * neighbors.length)] : start;
        
        data[i*5+2] = next.x; 
        data[i*5+3] = next.y;
        data[i*5+4] = Math.random(); // Start at random progress for natural flow

        const c = new THREE.Color(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
        colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    
    dataRef.current = data;
    
    if(meshRef.current) {
        meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [roadData]);

  useFrame((_, delta) => {
    if(!meshRef.current || !dataRef.current || roadData.roads.length < 2) return;

    const currentData = dataRef.current;
    const count = Math.min(roadData.roads.length, 30);

    for(let i=0; i<count; i++) {
        const idx = i*5;
        let x = currentData[idx];
        let y = currentData[idx+1];
        let tx = currentData[idx+2];
        let ty = currentData[idx+3];
        let p = currentData[idx+4];

        p += delta * 1.5;

        if(p >= 1) {
            x = tx; y = ty; p = 0;
            const neighbors = roadData.adjMap.get(`${x},${y}`) || [];
            // Basic pathfinding logic: don't just go back immediately if possible
            const next = neighbors.length > 0 ? neighbors[Math.floor(Math.random() * neighbors.length)] : {x, y};
            tx = next.x; ty = next.y;
        }

        currentData[idx] = x; currentData[idx+1] = y;
        currentData[idx+2] = tx; currentData[idx+3] = ty;
        currentData[idx+4] = p;

        const cx = THREE.MathUtils.lerp(x, tx, p) - WORLD_OFFSET;
        const cy = THREE.MathUtils.lerp(y, ty, p) - WORLD_OFFSET;
        const angle = Math.atan2(ty - y, tx - x);

        _dummy.position.set(cx, -0.25, cy);
        _dummy.rotation.set(0, -angle, 0);
        _dummy.scale.set(0.4, 0.15, 0.2);
        _dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, _dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[CAR_GEO, undefined, carCount]} castShadow>
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  );
};

const Cloud = ({ pos }: { pos: [number, number, number] }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame(() => {
        if(ref.current) {
            ref.current.position.x += 0.005;
            if(ref.current.position.x > 25) ref.current.position.x = -25;
        }
    });
    return (
        <group ref={ref} position={pos}>
            <mesh geometry={new THREE.SphereGeometry(1, 8, 8)} position={[0,0,0]} scale={[1.5, 0.8, 1]} castShadow>
                <meshStandardMaterial color="white" transparent opacity={0.6} flatShading />
            </mesh>
            <mesh geometry={new THREE.SphereGeometry(1, 8, 8)} position={[1,0.2,0]} scale={[1, 0.6, 0.8]} castShadow>
                <meshStandardMaterial color="white" transparent opacity={0.6} flatShading />
            </mesh>
        </group>
    )
}

export const EnvironmentSystem = () => (
    <group>
        <Cloud pos={[-10, 8, 5]} />
        <Cloud pos={[5, 10, -5]} />
        <Cloud pos={[0, 9, 0]} />
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.55, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#0ea5e9" roughness={0.2} metalness={0.1} />
        </mesh>
    </group>
);
