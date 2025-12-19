/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls, Environment, OrthographicCamera, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../context/GameContext';
import { BuildingType, Grid } from '../types';
import { BUILDINGS, WORLD_OFFSET, GRID_SIZE } from '../constants';
import { ProceduralBuilding } from './World/BuildingAssets';
import { RoadMarkings, TrafficLight, useRoadMaterials, getRoadTopologyData } from './World/RoadAssets';
import { TrafficSystem, EnvironmentSystem } from './World/WorldSystems';

// --- Helpers ---

const gridToWorld = (x: number, y: number): [number, number, number] => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET];

// Helper to determine if a tile is a roundabout for light suppression
const isTileRoundabout = (x: number, y: number, grid: Grid, variant: number) => {
    const topo = getRoadTopologyData(x, y, grid, variant);
    return topo.type === 'roundabout';
};

// --- Sub-components ---

const GroundTile = memo(({ x, y, type, onClick, onHover }: any) => {
    const [wx, _, wz] = gridToWorld(x, y);
    const color = type === BuildingType.None ? '#16a34a' : type === BuildingType.Road ? '#1e293b' : '#94a3b8';
    const height = 0.5;

    return (
        <mesh 
            position={[wx, -0.3 - height/2, wz]} 
            receiveShadow 
            onPointerDown={(e) => { e.stopPropagation(); onClick(x, y); }}
            onPointerEnter={(e) => { e.stopPropagation(); onHover(x, y); }}
        >
            <boxGeometry args={[1, height, 1]} />
            <meshStandardMaterial color={color} roughness={0.9} flatShading={false} />
        </mesh>
    );
}, (prev, next) => prev.type === next.type);

const SelectionCursor = memo(({ x, y, color }: { x: number, y: number, color: string }) => {
    const [wx, _, wz] = gridToWorld(x, y);
    return (
        <mesh position={[wx, -0.24, wz]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
            <Outlines thickness={0.04} color="white" />
        </mesh>
    );
});

const IntersectionTrafficLights = ({ materials }: { materials: any }) => {
    return (
        <group rotation={[-Math.PI/2, 0, 0]} position={[0, -0.29, 0]} name="intersection-1">
            {/* North-South Lights (Side 0) */}
            <TrafficLight materials={materials} position={[0.42, 0.42, 0]} rotation={-Math.PI / 4} side={0} />
            <TrafficLight materials={materials} position={[-0.42, -0.42, 0]} rotation={3 * Math.PI / 4} side={0} />
            
            {/* East-West Lights (Side 1) */}
            <TrafficLight materials={materials} position={[-0.42, 0.42, 0]} rotation={Math.PI / 4} side={1} />
            <TrafficLight materials={materials} position={[0.42, -0.42, 0]} rotation={-3 * Math.PI / 4} side={1} />
        </group>
    );
};

// --- Scene ---

const GameScene = () => {
    const { state, actions } = useGame();
    const { grid, selectedTool } = state;
    const [hovered, setHovered] = useState<{x: number, y: number} | null>(null);
    const roadMaterials = useRoadMaterials('standard');

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
                    return (
                        <group key={`${x}-${y}`} name={tile.customId}>
                            <GroundTile 
                                x={x} y={y} 
                                type={tile.buildingType} 
                                onClick={actions.handleTileClick} 
                                onHover={handleHover} 
                            />
                            
                            {tile.buildingType !== BuildingType.None && tile.buildingType !== BuildingType.Road && (
                                <group position={[wx, 0, wz]}>
                                    <ProceduralBuilding 
                                        type={tile.buildingType} 
                                        baseColor={BUILDINGS[tile.buildingType]?.color || '#ffffff'} 
                                        variant={tile.variant} 
                                        rotation={tile.rotation} 
                                    />
                                </group>
                            )}
                            
                            {tile.buildingType === BuildingType.Road && (
                                <group position={[wx, 0, wz]}>
                                    <RoadMarkings 
                                        x={x} y={y} 
                                        grid={grid} 
                                        yOffset={-0.29} 
                                        variant={tile.variant} 
                                        customId={tile.customId}
                                    />
                                    {/* Exclusively render animated lights for the intersection identified by #intersection-1 */}
                                    {tile.customId === 'intersection-1' && !isTileRoundabout(x, y, grid, tile.variant) && (
                                        <IntersectionTrafficLights materials={roadMaterials} />
                                    )}
                                </group>
                            )}
                        </group>
                    );
                }))}
            </group>

            <TrafficSystem grid={grid} />
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
        </>
    );
};

const IsoMap = () => {
  return (
    <div className="absolute inset-0 bg-sky-950 z-0">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <OrthographicCamera makeDefault zoom={45} position={[30, 30, 30]} near={-50} far={200} />
        <MapControls 
            enableRotate={true} 
            minZoom={20} 
            maxZoom={150} 
            maxPolarAngle={Math.PI/2.1} 
            dampingFactor={0.05}
        />
        
        <ambientLight intensity={1.4} color="#ffffff" />
        <directionalLight 
            position={[20, 40, 20]} 
            intensity={3.2} 
            castShadow 
            shadow-mapSize={[4096, 4096]} 
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
            shadow-bias={-0.0001}
            shadow-radius={2}
        />
        <Environment preset="city" />
        
        <GameScene />
      </Canvas>
    </div>
  );
};

export default IsoMap;
