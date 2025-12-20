
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls, Environment, OrthographicCamera, Outlines, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../context/GameContext';
import { BuildingType, Grid } from '../types';
import { BUILDINGS, WORLD_OFFSET } from '../constants';
import { ProceduralBuilding } from './World/BuildingAssets';
import { RoadMarkings, TrafficLight, useRoadMaterials, ROUNDABOUT_THRESHOLD } from './World/RoadAssets';
import { TrafficSystem, PedestrianSystem, WildlifeSystem, EnvironmentSystem } from './World/WorldSystems';

// --- Helpers ---

const gridToWorld = (x: number, y: number): [number, number, number] => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET];

// --- Sub-components ---

const GroundTile = memo(({ x, y, type, onClick, onHover }: any) => {
    const [wx, _, wz] = gridToWorld(x, y);
    const color = type === BuildingType.None ? '#14532d' : type === BuildingType.Road ? '#020617' : type === BuildingType.Water ? '#083344' : '#334155';
    const height = 0.5;

    return (
        <mesh 
            position={[wx, -0.3 - height/2, wz]} 
            receiveShadow 
            onPointerDown={(e) => { e.stopPropagation(); onClick(x, y); }}
            onPointerEnter={(e) => { e.stopPropagation(); onHover(x, y); }}
        >
            <boxGeometry args={[1, height, 1]} />
            <meshStandardMaterial color={color} roughness={0.9} metalness={0.1} />
        </mesh>
    );
}, (prev, next) => prev.type === next.type);

const SelectionCursor = memo(({ x, y, color }: { x: number, y: number, color: string }) => {
    const [wx, _, wz] = gridToWorld(x, y);
    return (
        <mesh position={[wx, -0.24, wz]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={color} transparent opacity={0.35} />
            <Outlines thickness={0.04} color="white" />
        </mesh>
    );
});

const IntersectionTrafficLights = memo(({ materials }: { materials: any }) => {
    return (
        <group rotation={[-Math.PI/2, 0, 0]} position={[0, -0.29, 0]}>
            <TrafficLight materials={materials} position={[0.42, 0.42, 0]} rotation={-Math.PI / 4} side={0} />
            <TrafficLight materials={materials} position={[-0.42, -0.42, 0]} rotation={3 * Math.PI / 4} side={0} />
            <TrafficLight materials={materials} position={[-0.42, 0.42, 0]} rotation={Math.PI / 4} side={1} />
            <TrafficLight materials={materials} position={[0.42, -0.42, 0]} rotation={-3 * Math.PI / 4} side={1} />
        </group>
    );
});

// --- Main Scene ---

const GameScene = () => {
    const { state, actions } = useGame();
    const { grid, selectedTool } = state;
    const [hovered, setHovered] = useState<{x: number, y: number} | null>(null);
    const standardRoadMaterials = useRoadMaterials('standard');

    const handleHover = useCallback((x: number, y: number) => {
        setHovered(prev => (prev?.x === x && prev?.y === y) ? prev : { x, y });
    }, []);

    const isBulldoze = selectedTool === BuildingType.None;
    const showPreview = hovered && !isBulldoze && grid[hovered.y] && grid[hovered.y][hovered.x]?.buildingType === BuildingType.None;
    const cursorColor = isBulldoze ? '#ef4444' : (showPreview ? '#ffffff' : '#fbbf24');

    return (
        <>
            <group>
                {grid.map((row, y) => row.map((tile, x) => {
                    const [wx, _, wz] = gridToWorld(x, y);
                    const isRoad = tile.buildingType === BuildingType.Road;
                    const isIntersection = tile.customId === 'intersection-1';

                    return (
                        <group key={`${x}-${y}`}>
                            <GroundTile 
                                x={x} y={y} 
                                type={tile.buildingType} 
                                onClick={actions.handleTileClick} 
                                onHover={handleHover} 
                            />
                            
                            {tile.buildingType !== BuildingType.None && !isRoad && (
                                <group position={[wx, 0, wz]}>
                                    <ProceduralBuilding 
                                        type={tile.buildingType} 
                                        baseColor={BUILDINGS[tile.buildingType]?.color || '#ffffff'} 
                                        variant={tile.variant} 
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
                                    {isIntersection && tile.variant <= ROUNDABOUT_THRESHOLD && (
                                        <IntersectionTrafficLights materials={standardRoadMaterials} />
                                    )}
                                </group>
                            )}
                        </group>
                    );
                }))}
            </group>

            <TrafficSystem grid={grid} />
            <PedestrianSystem grid={grid} />
            <WildlifeSystem grid={grid} />
            <EnvironmentSystem />

            {hovered && <SelectionCursor x={hovered.x} y={hovered.y} color={cursorColor} />}
            
            {showPreview && hovered && (
                <group position={[gridToWorld(hovered.x, hovered.y)[0], 0, gridToWorld(hovered.x, hovered.y)[2]]}>
                    <ProceduralBuilding 
                        type={selectedTool} 
                        baseColor={BUILDINGS[selectedTool]?.color || '#ffffff'} 
                        variant={grid[hovered.y][hovered.x]?.variant || 0} 
                        rotation={0} 
                        opacity={0.5} 
                        transparent 
                    />
                </group>
            )}

            <ContactShadows 
                position={[0, -0.3, 0]} 
                opacity={0.25} 
                scale={120} 
                blur={3} 
                far={10} 
                resolution={512} 
                color="#000000" 
            />
        </>
    );
};

const IsoMap = () => {
  return (
    <div className="absolute inset-0 bg-slate-950 z-0">
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ 
            antialias: true, 
            toneMapping: THREE.ACESFilmicToneMapping,
            outputEncoding: THREE.sRGBEncoding,
            preserveDrawingBuffer: false
        }}
      >
        <OrthographicCamera makeDefault zoom={20} position={[100, 100, 100]} near={-500} far={2500} />
        <MapControls 
            enableRotate={true} 
            minZoom={4} 
            maxZoom={150} 
            maxPolarAngle={Math.PI/2.05} 
            dampingFactor={0.08}
        />
        
        <ambientLight intensity={1.5} color="#f8fafc" />
        <directionalLight 
            position={[80, 120, 80]} 
            intensity={4.0} 
            castShadow 
            shadow-mapSize={[4096, 4096]} 
            shadow-camera-left={-100}
            shadow-camera-right={100}
            shadow-camera-top={100}
            shadow-camera-bottom={-100}
            shadow-bias={-0.0001}
            shadow-normalBias={0.04}
        />
        <Environment preset="city" intensity={0.5} />
        
        <GameScene />
      </Canvas>
    </div>
  );
};

export default IsoMap;
