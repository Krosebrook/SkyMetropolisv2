
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, memo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls, Environment, OrthographicCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../context/GameContext';
import { BuildingType } from '../types';
import { BUILDINGS, WORLD_OFFSET } from '../constants';
import { ProceduralBuilding } from './World/BuildingAssets';
import { RoadMarkings } from './World/RoadAssets';
import { WildlifeSystem, EnvironmentSystem, TrafficSystem, PedestrianSystem } from './World/WorldSystems';

const gridToWorld = (x: number, y: number): [number, number, number] => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET];

const GroundTile = memo(({ x, y, type, onClick, onHover }: any) => {
    const [wx, _, wz] = gridToWorld(x, y);
    
    // Cyber-grid palette for 8-13 year olds (Professional/Sleek)
    const getColors = () => {
        switch(type) {
            case BuildingType.None: return { color: '#0f172a', emissive: '#1e293b' };
            case BuildingType.Road: return { color: '#020617', emissive: '#0f172a' };
            case BuildingType.Water: return { color: '#1e3a8a', emissive: '#1e40af' };
            default: return { color: '#1e293b', emissive: '#334155' };
        }
    };

    const { color, emissive } = getColors();
    
    return (
        <mesh 
            position={[wx, -0.45, wz]} 
            receiveShadow 
            onPointerDown={(e) => { e.stopPropagation(); onClick(x, y); }}
            onPointerEnter={(e) => { e.stopPropagation(); onHover(x, y); }}
        >
            <boxGeometry args={[0.99, 0.3, 0.99]} />
            <meshPhysicalMaterial 
                color={color} 
                roughness={0.2} 
                metalness={0.8} 
                clearcoat={1.0}
                clearcoatRoughness={0.1}
                emissive={type === BuildingType.None ? '#2dd4bf' : emissive} 
                emissiveIntensity={type === BuildingType.None ? 0.08 : 0.02} 
            />
            {/* Subtle inner grid line for detail */}
            <mesh position={[0, 0.151, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.9, 0.9]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.02} side={THREE.DoubleSide} />
            </mesh>
        </mesh>
    );
});

const GameScene = () => {
    const { state, actions } = useGame();
    const { grid, selectedTool, stats } = state;
    const [hovered, setHovered] = useState<{x: number, y: number} | null>(null);

    const handleHover = useCallback((x: number, y: number) => {
        setHovered(prev => (prev?.x === x && prev?.y === y) ? prev : { x, y });
    }, []);

    const showPreview = hovered && grid[hovered.y]?.[hovered.x]?.buildingType === BuildingType.None;

    return (
        <>
            <group>
                {grid.map((row, y) => row.map((tile, x) => {
                    const [wx, _, wz] = gridToWorld(x, y);
                    const isRoad = tile.buildingType === BuildingType.Road;

                    return (
                        <group key={`${x}-${y}`}>
                            <GroundTile x={x} y={y} type={tile.buildingType} onClick={actions.handleTileClick} onHover={handleHover} />
                            
                            {tile.buildingType !== BuildingType.None && !isRoad && (
                                <group position={[wx, -0.3, wz]}>
                                    <ProceduralBuilding 
                                        type={tile.buildingType} 
                                        baseColor={BUILDINGS[tile.buildingType]?.color} 
                                        rotation={tile.rotation} 
                                    />
                                </group>
                            )}

                            {isRoad && (
                                <group position={[wx, 0, wz]}>
                                    <RoadMarkings 
                                        x={x} y={y} 
                                        grid={grid} 
                                        yOffset={-0.29} 
                                        variant={tile.variant} 
                                        customId={tile.customId}
                                    />
                                </group>
                            )}
                        </group>
                    );
                }))}
            </group>

            <TrafficSystem grid={grid} stats={stats} />
            <PedestrianSystem grid={grid} stats={stats} />
            <WildlifeSystem grid={grid} />
            <EnvironmentSystem />

            {showPreview && hovered && (
                <group position={[gridToWorld(hovered.x, hovered.y)[0], -0.3, gridToWorld(hovered.x, hovered.y)[2]]}>
                    <ProceduralBuilding 
                        type={selectedTool} 
                        baseColor={BUILDINGS[selectedTool]?.color} 
                        opacity={0.4} 
                        transparent 
                    />
                </group>
            )}

            <ContactShadows position={[0, -0.3, 0]} opacity={0.7} scale={150} blur={2} far={15} color="#000000" />
        </>
    );
};

const IsoMap = () => {
  return (
    <div className="absolute inset-0 bg-[#020617] z-0">
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ 
            antialias: true, 
            toneMapping: THREE.ACESFilmicToneMapping,
            powerPreference: 'high-performance',
            stencil: false
        }}
      >
        <OrthographicCamera makeDefault zoom={40} position={[100, 100, 100]} near={-1000} far={5000} />
        <MapControls enableRotate={false} minZoom={20} maxZoom={100} dampingFactor={0.1} />
        
        <ambientLight intensity={0.4} color="#1e293b" />
        <directionalLight 
            position={[50, 100, 50]} 
            intensity={2.5} 
            castShadow 
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0001}
        />
        <pointLight position={[-30, 40, -30]} intensity={2} color="#a855f7" />
        <pointLight position={[60, 20, 0]} intensity={1.5} color="#2dd4bf" />
        
        <Suspense fallback={null}>
            <Environment preset="night" intensity={0.15} />
            <GameScene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default IsoMap;
