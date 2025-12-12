/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls, Environment, OrthographicCamera, Outlines } from '@react-three/drei';
import { useGame } from '../context/GameContext';
import { BuildingType, BuildingConfig } from '../types';
import { BUILDINGS, GRID_SIZE } from '../constants';
import { ProceduralBuilding, RoadMarkings } from './World/WorldAssets';
import { TrafficSystem, EnvironmentSystem } from './World/WorldSystems';
import * as THREE from 'three';

const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number) => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET] as [number, number, number];

// --- Sub-components ---

const GroundTile = React.memo(({ x, y, type, onClick, onHover }: any) => {
    const [wx, _, wz] = gridToWorld(x, y);
    const color = type === BuildingType.None ? '#10b981' : type === BuildingType.Road ? '#374151' : '#d1d5db';
    const height = 0.5;
    const yPos = -0.3 - (type === BuildingType.None ? 0 : 0.02); // Roads slightly higher

    return (
        <mesh 
            position={[wx, -0.3 - height/2, wz]} 
            receiveShadow 
            onPointerDown={(e) => { e.stopPropagation(); onClick(x, y); }}
            onPointerEnter={(e) => { e.stopPropagation(); onHover(x, y); }}
        >
            <boxGeometry args={[1, height, 1]} />
            <meshStandardMaterial color={color} flatShading />
        </mesh>
    );
});

const Cursor = ({ x, y, color }: { x: number, y: number, color: string }) => {
    const [wx, _, wz] = gridToWorld(x, y);
    return (
        <mesh position={[wx, -0.24, wz]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} />
            <Outlines thickness={0.05} color="white" />
        </mesh>
    );
}

// --- Main Scene ---

const GameScene = () => {
    const { state, actions } = useGame();
    const { grid, selectedTool } = state;
    const [hovered, setHovered] = useState<{x: number, y: number} | null>(null);

    const handleHover = useCallback((x: number, y: number) => setHovered({ x, y }), []);

    // Preview calculations
    const showPreview = hovered && selectedTool !== BuildingType.None && grid[hovered.y][hovered.x].buildingType === BuildingType.None;
    const isBulldoze = selectedTool === BuildingType.None;
    const cursorColor = isBulldoze ? '#ef4444' : (showPreview ? '#ffffff' : '#fbbf24');

    // Get the variant and rotation from the hovered tile to show exactly what will be built
    const previewVariant = hovered ? grid[hovered.y][hovered.x].variant : 0;
    const previewRotation = hovered ? grid[hovered.y][hovered.x].rotation : 0;

    return (
        <>
            <group>
                {grid.map((row, y) => row.map((tile, x) => {
                    const [wx, _, wz] = gridToWorld(x, y);
                    return (
                        <React.Fragment key={`${x}-${y}`}>
                            <GroundTile 
                                x={x} y={y} 
                                type={tile.buildingType} 
                                onClick={actions.handleTileClick} 
                                onHover={handleHover} 
                            />
                            
                            {/* Static Buildings */}
                            {tile.buildingType !== BuildingType.None && tile.buildingType !== BuildingType.Road && (
                                <group position={[wx, 0, wz]}>
                                    <ProceduralBuilding 
                                        type={tile.buildingType} 
                                        baseColor={BUILDINGS[tile.buildingType].color} 
                                        variant={tile.variant} 
                                        rotation={tile.rotation} 
                                    />
                                </group>
                            )}
                            
                            {/* Road Markings */}
                            {tile.buildingType === BuildingType.Road && (
                                <group position={[wx, 0, wz]}>
                                    <RoadMarkings x={x} y={y} grid={grid} yOffset={-0.29} variant={tile.variant} />
                                </group>
                            )}
                        </React.Fragment>
                    );
                }))}
            </group>

            {/* Systems */}
            <TrafficSystem grid={grid} />
            <EnvironmentSystem />

            {/* UX Overlays */}
            {hovered && <Cursor x={hovered.x} y={hovered.y} color={cursorColor} />}
            
            {showPreview && hovered && (
                <group position={[gridToWorld(hovered.x, hovered.y)[0], 0, gridToWorld(hovered.x, hovered.y)[2]]}>
                    <ProceduralBuilding 
                        type={selectedTool} 
                        baseColor={BUILDINGS[selectedTool].color} 
                        variant={previewVariant} 
                        rotation={previewRotation} 
                        opacity={0.6} 
                        transparent 
                    />
                </group>
            )}
        </>
    );
};

const IsoMap = () => {
  return (
    <div className="absolute inset-0 bg-sky-900 z-0">
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <OrthographicCamera makeDefault zoom={40} position={[20, 20, 20]} near={-50} far={200} />
        <MapControls enableRotate={true} minZoom={20} maxZoom={100} maxPolarAngle={Math.PI/2.2} />
        
        <ambientLight intensity={0.6} color="#e0f2fe" />
        <directionalLight 
            position={[10, 20, 5]} 
            intensity={1.5} 
            castShadow 
            shadow-mapSize={[2048, 2048]} 
        />
        <Environment preset="city" />
        
        <GameScene />
      </Canvas>
    </div>
  );
};

export default IsoMap;