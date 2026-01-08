
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
    
    const getColors = () => {
        switch(type) {
            case BuildingType.None: return { color: '#0f172a', emissive: '#020617' };
            case BuildingType.Road: return { color: '#020617', emissive: '#000000' };
            case BuildingType.Water: return { color: '#1e3a8a', emissive: '#1e3a8a' };
            default: return { color: '#0f172a', emissive: '#0f172a' };
        }
    };

    const { color, emissive } = getColors();
    
    return (
        <group position={[wx, -0.45, wz]}>
            <mesh 
                receiveShadow 
                onPointerDown={(e) => { e.stopPropagation(); onClick(x, y); }}
                onPointerEnter={(e) => { e.stopPropagation(); onHover(x, y); }}
            >
                <boxGeometry args={[0.995, 0.3, 0.995]} />
                <meshPhysicalMaterial 
                    color={color} 
                    roughness={0.2} 
                    metalness={0.9} 
                    clearcoat={0.3}
                    clearcoatRoughness={0.1}
                    emissive={type === BuildingType.None ? '#2dd4bf' : emissive} 
                    emissiveIntensity={type === BuildingType.None ? 0.05 : 0.01} 
                />
            </mesh>
            
            {/* Precision Grid: Vertex Crosses */}
            <group position={[0, 0.151, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <mesh>
                    <planeGeometry args={[0.98, 0.98]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.015} side={THREE.DoubleSide} wireframe />
                </mesh>
                {/* Center Cross Marker */}
                <mesh scale={[0.08, 0.01, 1]}>
                    <planeGeometry />
                    <meshBasicMaterial color="#2dd4bf" transparent opacity={0.1} />
                </mesh>
                <mesh scale={[0.01, 0.08, 1]}>
                    <planeGeometry />
                    <meshBasicMaterial color="#2dd4bf" transparent opacity={0.1} />
                </mesh>
            </group>
        </group>
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
                                        variant={tile.variant}
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
                        variant={0}
                    />
                </group>
            )}

            <ContactShadows 
                position={[0, -0.3, 0]} 
                opacity={0.7} 
                scale={150} 
                blur={2.5} 
                far={30} 
                color="#000000" 
            />
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
            stencil: false,
            alpha: false
        }}
      >
        <OrthographicCamera makeDefault zoom={40} position={[100, 100, 100]} near={-1000} far={5000} />
        <MapControls 
            enableRotate={false} 
            minZoom={20} 
            maxZoom={120} 
            dampingFactor={0.15} 
            screenSpacePanning={true}
        />
        
        {/* Cinematic High-Contrast Lighting */}
        <ambientLight intensity={0.2} color="#1e293b" />
        <directionalLight 
            position={[100, 150, 50]} 
            intensity={4} 
            castShadow 
            shadow-mapSize={[4096, 4096]}
            shadow-bias={-0.00005}
            shadow-camera-left={-100}
            shadow-camera-right={100}
            shadow-camera-top={100}
            shadow-camera-bottom={-100}
        >
            <orthographicCamera attach="shadow-camera" args={[-100, 100, 100, -100]} />
        </directionalLight>
        
        <pointLight position={[-80, 120, -80]} intensity={5.0} color="#a855f7" distance={300} decay={1.5} />
        <pointLight position={[80, 60, 20]} intensity={4.5} color="#2dd4bf" distance={300} decay={1.5} />
        <pointLight position={[20, 80, 80]} intensity={3.5} color="#3b82f6" distance={300} decay={1.5} />
        
        {/* Subtle Rim Light for Depth */}
        <spotLight position={[-100, 50, -100]} intensity={2.5} color="#ffffff" angle={0.3} penumbra={1} />
        
        <Suspense fallback={null}>
            <Environment preset="night" intensity={0.1} />
            <GameScene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default IsoMap;
