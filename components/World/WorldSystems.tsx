/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Grid, BuildingType } from '../../types';
import { GRID_SIZE, WORLD_OFFSET } from '../../constants';

// --- Traffic System ---

const CAR_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#ffffff', '#1f2937'];
const CAR_GEO = new THREE.BoxGeometry(1, 1, 1);

export const TrafficSystem = ({ grid }: { grid: Grid }) => {
  const roadTiles = useMemo(() => {
    const roads: {x: number, y: number}[] = [];
    grid.forEach(row => row.forEach(tile => {
      if (tile.buildingType === BuildingType.Road) roads.push({x: tile.x, y: tile.y});
    }));
    return roads;
  }, [grid]);

  const carCount = Math.min(roadTiles.length, 30);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dataRef = useRef<Float32Array>(new Float32Array(0));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize Cars
  useEffect(() => {
    if (roadTiles.length < 2) return;
    
    // Data Layout: [x, y, targetX, targetY, progress] per car
    dataRef.current = new Float32Array(carCount * 5); 
    const colors = new Float32Array(carCount * 3);

    for (let i = 0; i < carCount; i++) {
        const start = roadTiles[Math.floor(Math.random() * roadTiles.length)];
        dataRef.current[i*5] = start.x;
        dataRef.current[i*5+1] = start.y;
        dataRef.current[i*5+2] = start.x; 
        dataRef.current[i*5+3] = start.y;
        dataRef.current[i*5+4] = 1.0; // Force immediate retarget

        const c = new THREE.Color(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
        colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    
    if(meshRef.current) {
        meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [roadTiles, carCount]);

  // Animation Loop
  useFrame((_, delta) => {
    if(!meshRef.current || roadTiles.length < 2) return;

    for(let i=0; i<carCount; i++) {
        const idx = i*5;
        let x = dataRef.current[idx];
        let y = dataRef.current[idx+1];
        let tx = dataRef.current[idx+2];
        let ty = dataRef.current[idx+3];
        let p = dataRef.current[idx+4];

        // Move
        p += delta * 1.5;

        // Reached destination?
        if(p >= 1) {
            x = tx; y = ty; p = 0;
            const neighbors = roadTiles.filter(t => (Math.abs(t.x-x) + Math.abs(t.y-y)) === 1);
            const next = neighbors.length > 0 ? neighbors[Math.floor(Math.random() * neighbors.length)] : {x, y};
            tx = next.x; ty = next.y;
        }

        // Store state
        dataRef.current[idx] = x; dataRef.current[idx+1] = y;
        dataRef.current[idx+2] = tx; dataRef.current[idx+3] = ty;
        dataRef.current[idx+4] = p;

        // Update Transform
        const cx = THREE.MathUtils.lerp(x, tx, p) - WORLD_OFFSET;
        const cy = THREE.MathUtils.lerp(y, ty, p) - WORLD_OFFSET;
        const angle = Math.atan2(ty - y, tx - x);

        dummy.position.set(cx, -0.25, cy);
        dummy.rotation.set(0, -angle, 0);
        dummy.scale.set(0.4, 0.15, 0.2);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[CAR_GEO, undefined, carCount]} castShadow>
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  );
};

// --- Environment System ---

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
