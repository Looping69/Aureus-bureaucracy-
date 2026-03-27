/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';
import { VoxelData } from './types';
import { COLORS, CONFIG } from './utils/voxelConstants';

// Helper to prevent overlapping voxels
function setBlock(map: Map<string, VoxelData>, x: number, y: number, z: number, color: number) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rz = Math.round(z);
    const key = `${rx},${ry},${rz}`;
    map.set(key, { x: rx, y: ry, z: rz, color });
}

function generateSphere(map: Map<string, VoxelData>, cx: number, cy: number, cz: number, r: number, col: number, sy = 1) {
    const r2 = r * r;
    const xMin = Math.floor(cx - r);
    const xMax = Math.ceil(cx + r);
    const yMin = Math.floor(cy - r * sy);
    const yMax = Math.ceil(cy + r * sy);
    const zMin = Math.floor(cz - r);
    const zMax = Math.ceil(cz + r);

    for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
            for (let z = zMin; z <= zMax; z++) {
                const dx = x - cx;
                const dy = (y - cy) / sy;
                const dz = z - cz;
                if (dx * dx + dy * dy + dz * dz <= r2) {
                    setBlock(map, x, y, z, col);
                }
            }
        }
    }
}

export const Generators = {
    Eagle: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y_OFFSET = 12; // High in the sky

        // Body (Horizontal oval, streamlined)
        for (let z = -3; z <= 5; z++) {
             const r = 2.5 - Math.abs(z - 1) * 0.15;
             generateSphere(map, 0, Y_OFFSET, z, r, COLORS.DARK, 0.9);
             // White neck feathers
             if (z > 3) generateSphere(map, 0, Y_OFFSET + 0.5, z, r * 0.9, COLORS.WHITE);
        }

        // Head
        const HZ = 6;
        generateSphere(map, 0, Y_OFFSET + 0.5, HZ, 1.8, COLORS.WHITE);
        
        // Beak (Sharp and yellow)
        setBlock(map, 0, Y_OFFSET, HZ + 2.5, COLORS.GOLD);
        setBlock(map, 0, Y_OFFSET + 0.5, HZ + 2.5, COLORS.GOLD);
        setBlock(map, 0, Y_OFFSET + 1, HZ + 2, COLORS.GOLD);
        setBlock(map, 1, Y_OFFSET + 0.5, HZ + 2, COLORS.GOLD); // Width
        setBlock(map, -1, Y_OFFSET + 0.5, HZ + 2, COLORS.GOLD);

        // Eyes (Fierce)
        setBlock(map, -1.2, Y_OFFSET + 1, HZ + 0.5, COLORS.BLACK);
        setBlock(map, 1.2, Y_OFFSET + 1, HZ + 0.5, COLORS.BLACK);
        // Brows
        setBlock(map, -1.2, Y_OFFSET + 1.8, HZ + 0.5, COLORS.WHITE);
        setBlock(map, 1.2, Y_OFFSET + 1.8, HZ + 0.5, COLORS.WHITE);

        // Wings (Massive span, curved upwards slightly at tips)
        for (let x = 1; x < 16; x++) {
            const zWidth = 4 - (x * 0.2); // Tapering width
            const yCurve = Math.pow(x, 1.3) * 0.15; // Curve up
            
            for (let z = -zWidth; z < zWidth; z++) {
                // Main wing
                setBlock(map, x + 1, Y_OFFSET + yCurve, z + 1, COLORS.DARK);
                setBlock(map, -(x + 1), Y_OFFSET + yCurve, z + 1, COLORS.DARK);

                // Feathers trailing edge
                if (z < -zWidth + 1.5) {
                    setBlock(map, x + 1, Y_OFFSET + yCurve, z, COLORS.LIGHT);
                    setBlock(map, -(x + 1), Y_OFFSET + yCurve, z, COLORS.LIGHT);
                }
            }
        }

        // Tail (Wide fan)
        for (let z = -8; z < -3; z++) {
            const spread = (z + 9) * 0.8;
            for (let x = -spread; x <= spread; x++) {
                 const yFan = (z + 8) * -0.2; // Angle down slightly
                 setBlock(map, x, Y_OFFSET + yFan, z, COLORS.WHITE);
            }
        }

        // Talons (Tucked up against body)
        const TY = Y_OFFSET - 2.5;
        const TZ = 1;
        setBlock(map, -1.5, TY, TZ, COLORS.TALON);
        setBlock(map, -1.5, TY, TZ + 1, COLORS.TALON);
        setBlock(map, 1.5, TY, TZ, COLORS.TALON);
        setBlock(map, 1.5, TY, TZ + 1, COLORS.TALON);

        return Array.from(map.values());
    },

    Cat: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const CY = CONFIG.FLOOR_Y + 1; const CX = 0, CZ = 0;
        // Paws
        generateSphere(map, CX - 3, CY + 2, CZ, 2.2, COLORS.DARK, 1.2);
        generateSphere(map, CX + 3, CY + 2, CZ, 2.2, COLORS.DARK, 1.2);
        // Body
        for (let y = 0; y < 7; y++) {
            const r = 3.5 - (y * 0.2);
            generateSphere(map, CX, CY + 2 + y, CZ, r, COLORS.DARK);
            generateSphere(map, CX, CY + 2 + y, CZ + 2, r * 0.6, COLORS.WHITE);
        }
        // Legs
        for (let y = 0; y < 5; y++) {
            setBlock(map, CX - 1.5, CY + y, CZ + 3, COLORS.WHITE); setBlock(map, CX + 1.5, CY + y, CZ + 3, COLORS.WHITE);
            setBlock(map, CX - 1.5, CY + y, CZ + 2, COLORS.WHITE); setBlock(map, CX + 1.5, CY + y, CZ + 2, COLORS.WHITE);
        }
        // Head
        const CHY = CY + 9;
        generateSphere(map, CX, CHY, CZ, 3.2, COLORS.LIGHT, 0.8);
        // Ears
        [[-2, 1], [2, 1]].forEach(side => {
            setBlock(map, CX + side[0], CHY + 3, CZ, COLORS.DARK); setBlock(map, CX + side[0] * 0.8, CHY + 3, CZ + 1, COLORS.WHITE);
            setBlock(map, CX + side[0], CHY + 4, CZ, COLORS.DARK);
        });
        // Tail
        for (let i = 0; i < 12; i++) {
            const a = i * 0.3, tx = Math.cos(a) * 4.5, tz = Math.sin(a) * 4.5;
            if (tz > -2) { setBlock(map, CX + tx, CY, CZ + tz, COLORS.DARK); setBlock(map, CX + tx, CY + 1, CZ + tz, COLORS.DARK); }
        }
        // Face
        setBlock(map, CX - 1, CHY + 0.5, CZ + 2.5, COLORS.GOLD); setBlock(map, CX + 1, CHY + 0.5, CZ + 2.5, COLORS.GOLD);
        setBlock(map, CX - 1, CHY + 0.5, CZ + 3, COLORS.BLACK); setBlock(map, CX + 1, CHY + 0.5, CZ + 3, COLORS.BLACK);
        setBlock(map, CX, CHY, CZ + 3, COLORS.TALON);
        return Array.from(map.values());
    },

    Rabbit: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const LOG_Y = CONFIG.FLOOR_Y + 2.5;
        const RX = 0, RZ = 0;
        // Log
        for (let x = -6; x <= 6; x++) {
            const radius = 2.8 + Math.sin(x * 0.5) * 0.2;
            generateSphere(map, x, LOG_Y, 0, radius, COLORS.DARK);
            if (x === -6 || x === 6) generateSphere(map, x, LOG_Y, 0, radius - 0.5, COLORS.WOOD);
            if (Math.random() > 0.8) setBlock(map, x, LOG_Y + radius, (Math.random() - 0.5) * 2, COLORS.GREEN);
        }
        // Body
        const BY = LOG_Y + 2.5;
        generateSphere(map, RX - 1.5, BY + 1.5, RZ - 1.5, 1.8, COLORS.WHITE);
        generateSphere(map, RX + 1.5, BY + 1.5, RZ - 1.5, 1.8, COLORS.WHITE);
        generateSphere(map, RX, BY + 2, RZ, 2.2, COLORS.WHITE, 0.8);
        generateSphere(map, RX, BY + 2.5, RZ + 1.5, 1.5, COLORS.WHITE);
        setBlock(map, RX - 1.2, BY, RZ + 2.2, COLORS.LIGHT); setBlock(map, RX + 1.2, BY, RZ + 2.2, COLORS.LIGHT);
        setBlock(map, RX - 2.2, BY, RZ - 0.5, COLORS.WHITE); setBlock(map, RX + 2.2, BY, RZ - 0.5, COLORS.WHITE);
        generateSphere(map, RX, BY + 1.5, RZ - 2.5, 1.0, COLORS.WHITE);
        // Head
        const HY = BY + 4.5; const HZ = RZ + 1;
        generateSphere(map, RX, HY, HZ, 1.7, COLORS.WHITE);
        generateSphere(map, RX - 1.1, HY - 0.5, HZ + 0.5, 1.0, COLORS.WHITE);
        generateSphere(map, RX + 1.1, HY - 0.5, HZ + 0.5, 1.0, COLORS.WHITE);
        // Ears
        for (let y = 0; y < 5; y++) {
            const curve = y * 0.2;
            setBlock(map, RX - 0.8, HY + 1.5 + y, HZ - curve, COLORS.WHITE); setBlock(map, RX - 1.2, HY + 1.5 + y, HZ - curve, COLORS.WHITE);
            setBlock(map, RX - 1.0, HY + 1.5 + y, HZ - curve + 0.5, COLORS.LIGHT);
            setBlock(map, RX + 0.8, HY + 1.5 + y, HZ - curve, COLORS.WHITE); setBlock(map, RX + 1.2, HY + 1.5 + y, HZ - curve, COLORS.WHITE);
            setBlock(map, RX + 1.0, HY + 1.5 + y, HZ - curve + 0.5, COLORS.LIGHT);
        }
        setBlock(map, RX - 0.8, HY + 0.2, HZ + 1.5, COLORS.BLACK); setBlock(map, RX + 0.8, HY + 0.2, HZ + 1.5, COLORS.BLACK);
        setBlock(map, RX, HY - 0.5, HZ + 1.8, COLORS.TALON);
        return Array.from(map.values());
    },

    Twins: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        function buildMiniEagle(offsetX: number, offsetZ: number, mirror: boolean) {
            // Branch
            for (let x = -5; x < 5; x++) {
                const y = Math.sin(x * 0.4) * 0.5;
                generateSphere(map, offsetX + x, y, offsetZ, 1.2, COLORS.WOOD);
                if (Math.random() > 0.8) generateSphere(map, offsetX + x, y + 1, offsetZ, 1, COLORS.GREEN);
            }
            const EX = offsetX, EY = 1.5, EZ = offsetZ;
            generateSphere(map, EX, EY + 4, EZ, 3.0, COLORS.DARK, 1.4);
            for (let x = EX - 1; x <= EX + 1; x++) for (let y = EY + 2; y <= EY + 6; y++) setBlock(map, x, y, EZ + 2, COLORS.LIGHT);
            for (let x = EX - 1; x <= EX + 1; x++) for (let y = EY + 2; y <= EY + 3; y++) setBlock(map, x, y, EZ - 3, COLORS.WHITE);
            for (let y = EY + 2; y <= EY + 6; y++) for (let z = EZ - 1; z <= EZ + 2; z++) { setBlock(map, EX - 3, y, z, COLORS.DARK); setBlock(map, EX + 3, y, z, COLORS.DARK); }
            const HY = EY + 8, HZ = EZ + 1;
            generateSphere(map, EX, HY, HZ, 2.0, COLORS.WHITE);
            setBlock(map, EX, HY, HZ + 2, COLORS.GOLD); setBlock(map, EX, HY - 0.5, HZ + 2, COLORS.GOLD);
            setBlock(map, EX - 1, HY + 0.5, HZ + 1, COLORS.BLACK); setBlock(map, EX + 1, HY + 0.5, HZ + 1, COLORS.BLACK);
            setBlock(map, EX - 1, EY, EZ, COLORS.TALON); setBlock(map, EX + 1, EY, EZ, COLORS.TALON);
        }
        buildMiniEagle(-10, 2, false);
        buildMiniEagle(10, -2, true);
        return Array.from(map.values());
    },

    GrandKhalifa: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => {
            const rx = Math.round(x);
            const ry = Math.round(y);
            const rz = Math.round(z);
            map.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, color: c });
        };

        const C_GLASS = 0x88ccff; // Light blue glass
        const C_FRAME = 0xaaaaaa; // Silver/grey frame
        const C_CORE = 0x555555;
        const C_SPIRE = 0xdddddd;
        const C_BASE = 0x333333;

        const MAX_HEIGHT = 120;
        const CENTER_X = 0;
        const CENTER_Z = 0;

        const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
        
        // Central core
        for (let y = 0; y < MAX_HEIGHT; y++) {
            let coreR = 4;
            if (y > 40) coreR = 3;
            if (y > 70) coreR = 2;
            if (y > 90) coreR = 1;
            if (y > 105) coreR = 0; // Spire

            for (let x = -coreR; x <= coreR; x++) {
                for (let z = -coreR; z <= coreR; z++) {
                    if (x*x + z*z <= coreR*coreR + 0.5) {
                        const isEdge = x*x + z*z > (coreR-1)*(coreR-1);
                        const isBand = y % 4 === 0;
                        let color = C_GLASS;
                        if (y > 105) color = C_SPIRE;
                        else if (isEdge || isBand) color = C_FRAME;
                        else color = C_CORE;
                        
                        add(CENTER_X + x, Y + y, CENTER_Z + z, color);
                    }
                }
            }
        }

        // Wings
        for (let w = 0; w < 3; w++) {
            const angle = angles[w];
            const dx = Math.cos(angle);
            const dz = Math.sin(angle);
            
            // Setbacks
            const setbacks = [
                { h: 20, l: 20 },
                { h: 35, l: 16 },
                { h: 50, l: 12 },
                { h: 65, l: 8 },
                { h: 80, l: 4 }
            ];
            
            // Offset setbacks for each wing to create the spiral effect
            const wingSetbacks = setbacks.map(sb => ({
                h: sb.h + w * 5,
                l: sb.l
            }));
            
            for (let y = 0; y < 95; y++) {
                let maxL = 0;
                for (const sb of wingSetbacks) {
                    if (y < sb.h) {
                        maxL = Math.max(maxL, sb.l);
                    }
                }
                
                if (maxL <= 2) continue;
                
                for (let l = 3; l <= maxL; l++) {
                    const wx = CENTER_X + l * dx;
                    const wz = CENTER_Z + l * dz;
                    
                    // Wing width tapers towards the end
                    const width = Math.max(1, 4 - l / 6);
                    
                    for (let wx_off = -width; wx_off <= width; wx_off++) {
                        for (let wz_off = -width; wz_off <= width; wz_off++) {
                            if (wx_off*wx_off + wz_off*wz_off <= width*width) {
                                const isEdge = wx_off*wx_off + wz_off*wz_off > (width-1)*(width-1);
                                const isBand = y % 4 === 0;
                                
                                // Check if this is the top of the current wing section
                                let isTop = false;
                                for (const sb of wingSetbacks) {
                                    if (y === sb.h - 1 && l <= sb.l && l > (wingSetbacks.find(s => s.h > sb.h)?.l || 0)) {
                                        isTop = true;
                                    }
                                }
                                
                                let color = C_GLASS;
                                if (isTop) color = C_FRAME; // Flat roof at setback
                                else if (isEdge || isBand) color = C_FRAME;
                                
                                add(wx + wx_off, Y + y, wz + wz_off, color);
                            }
                        }
                    }
                }
            }
        }
        
        // Podium/Base
        for (let y = 0; y < 4; y++) {
            for (let x = -25; x <= 25; x++) {
                for (let z = -25; z <= 25; z++) {
                    let inPodium = false;
                    for (let w = 0; w < 3; w++) {
                        const angle = angles[w];
                        const dx = Math.cos(angle);
                        const dz = Math.sin(angle);
                        
                        const distAlong = x * dx + z * dz;
                        const distPerp = Math.abs(x * -dz + z * dx);
                        
                        if (distAlong > -5 && distAlong < 22 && distPerp < 8 - (distAlong/5)) {
                            inPodium = true;
                            break;
                        }
                    }
                    if (x*x + z*z < 12*12) inPodium = true;
                    
                    if (inPodium) {
                        const isEdge = y === 3;
                        add(CENTER_X + x, Y + y, CENTER_Z + z, isEdge ? C_FRAME : C_BASE);
                    }
                }
            }
        }

        return Array.from(map.values());
    },

    GoldPlant: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        // Constants for the build
        const Y_FLOOR = CONFIG.FLOOR_Y;
        const C_METAL = COLORS.GREY;       // Silver/Metal
        const C_DARK_METAL = COLORS.DARK_GREY; // Structural Steel
        const C_PIPE = COLORS.DARK;        // Axles/Pipes
        const C_CONVEYOR = COLORS.BLACK;   // Rubber belt
        const C_HOPPER = COLORS.DARK_GREY;
        const C_GENERATOR = COLORS.RED;    // Power Unit
        const C_WATER = COLORS.BLUE;

        // --- 1. TROMMEL DRUM ASSEMBLY (The rotating cylinder) ---
        // Snippet Params
        const radius = 4;
        const wall = 1; // Thinner wall for better visuals
        const length = 14;
        const startX = -7;
        
        // We need to lift the drum up so it sits on a frame.
        // The snippet centers Y at 8 relative to its own origin.
        // We will shift everything by TROMMEL_Y_OFFSET.
        const TROMMEL_Y_OFFSET = Y_FLOOR + 6; // Lifted 6 units off the ground floor

        // Barrel shell (thick hollow cylinder)
        for (let x = 0; x < length; x++) {
            const px = startX + x;
            for (let y = -radius; y <= radius; y++) {
                for (let z = -radius; z <= radius; z++) {
                    const d = Math.sqrt(y*y + z*z);
                    if (d <= radius && d >= radius - wall) {
                        setBlock(map, px, TROMMEL_Y_OFFSET + 8 + y, z, C_METAL);
                    }
                }
            }
        }

        // End caps (Rings)
        for (let y = -radius+1; y <= radius-1; y++) {
            for (let z = -radius+1; z <= radius-1; z++) {
                if (Math.sqrt(y*y+z*z) <= radius-1 && Math.sqrt(y*y+z*z) >= radius-2) {
                    setBlock(map, startX-1, TROMMEL_Y_OFFSET + 8+y, z, C_DARK_METAL);
                    setBlock(map, startX+length, TROMMEL_Y_OFFSET + 8+y, z, C_DARK_METAL);
                }
            }
        }

        // Axle / Drive Shaft
        for (let x = startX-2; x <= startX+length+1; x++) {
            setBlock(map, x, TROMMEL_Y_OFFSET + 8, 0, C_PIPE);
        }

        // Internal lifter fins
        for (let x = startX+1; x < startX+length-1; x++) {
            for (let y = 1; y <= radius-1; y++) {
                // Cross pattern inside
                if (x % 2 === 0) {
                     setBlock(map, x, TROMMEL_Y_OFFSET + 8+y, 0, C_DARK_METAL);
                     setBlock(map, x, TROMMEL_Y_OFFSET + 8-y, 0, C_DARK_METAL);
                } else {
                     setBlock(map, x, TROMMEL_Y_OFFSET + 8, y, C_DARK_METAL);
                     setBlock(map, x, TROMMEL_Y_OFFSET + 8, -y, C_DARK_METAL);
                }
            }
        }

        // --- 2. STRUCTURAL SUPPORT FRAME ---
        // Holding the trommel up
        const drumCenterY = TROMMEL_Y_OFFSET + 8;
        const frameWidth = radius + 1;
        
        // Vertical Legs
        const legX_positions = [startX, startX + length/2, startX + length];
        legX_positions.forEach(lx => {
            [-frameWidth, frameWidth].forEach(lz => {
                 for(let y = Y_FLOOR; y < drumCenterY; y++) {
                     setBlock(map, lx, y, lz, C_DARK_METAL);
                 }
                 // Feet
                 setBlock(map, lx, Y_FLOOR, lz, COLORS.BLACK);
            });
            // Horizontal Crossbars under drum
            for(let z = -frameWidth; z <= frameWidth; z++) {
                setBlock(map, lx, drumCenterY - radius - 1, z, C_DARK_METAL);
            }
        });

        // --- 3. SLUICE BOX / CATCH TRAY ---
        // Underneath the trommel to catch the "gold"
        const sluiceY = drumCenterY - radius - 2;
        for(let x = startX; x < startX + length - 2; x++) {
            for(let z = -2; z <= 2; z++) {
                // Bottom
                setBlock(map, x, sluiceY, z, C_DARK_METAL);
                // Sides
                if (Math.abs(z) === 2) {
                    setBlock(map, x, sluiceY + 1, z, C_DARK_METAL);
                } else {
                    // Water/Mat
                    setBlock(map, x, sluiceY + 1, z, C_WATER);
                    // Gold flakes
                    if (Math.random() > 0.8) setBlock(map, x, sluiceY + 1, z, COLORS.GOLD);
                }
            }
        }
        // Angle the sluice output to the side? Or straight down. 
        // Let's add a collection pile under the sluice end.
        generateSphere(map, startX + length/2, Y_FLOOR + 1, 0, 3, COLORS.DARK);

        // --- 4. FEED HOPPER ---
        // Placed far to the left (negative X)
        const hopperX = startX - 12;
        const hopperY = Y_FLOOR + 8;
        const hopperSize = 5;
        
        // Hopper Legs
        [-hopperSize, hopperSize].forEach(hx => {
            [-hopperSize, hopperSize].forEach(hz => {
                for(let y=Y_FLOOR; y < hopperY; y++) setBlock(map, hopperX+hx, y, hz, C_DARK_METAL);
            });
        });
        
        // Hopper Bin (Inverted Pyramid-ish)
        for(let y=0; y<5; y++) {
             const spread = 2 + y;
             for(let x=-spread; x<=spread; x++) {
                 for(let z=-spread; z<=spread; z++) {
                     if (Math.abs(x)===spread || Math.abs(z)===spread) {
                         setBlock(map, hopperX+x, hopperY+y, z, C_HOPPER);
                     }
                 }
             }
        }

        // --- 5. CONVEYOR BELT ---
        // From Hopper (low) to Trommel Inlet (high)
        // Hopper outlet: hopperX, hopperY
        // Trommel inlet: startX - 2, drumCenterY
        
        const convStart = new THREE.Vector3(hopperX + 2, hopperY - 2, 0);
        const convEnd = new THREE.Vector3(startX - 1, drumCenterY, 0);
        const dist = convStart.distanceTo(convEnd);
        const steps = Math.ceil(dist);
        
        for(let i=0; i<=steps; i++) {
            const t = i/steps;
            const cx = THREE.MathUtils.lerp(convStart.x, convEnd.x, t);
            const cy = THREE.MathUtils.lerp(convStart.y, convEnd.y, t);
            const cz = THREE.MathUtils.lerp(convStart.z, convEnd.z, t);
            
            // Belt
            for(let z=-1; z<=1; z++) {
                setBlock(map, cx, cy, z + cz, C_CONVEYOR);
            }
            // Railings
            setBlock(map, cx, cy + 0.5, cz - 1.5, COLORS.RED);
            setBlock(map, cx, cy + 0.5, cz + 1.5, COLORS.RED);
            
            // Supports for conveyor
            if (i % 6 === 0 && cy > Y_FLOOR + 2) {
                 for(let y=Y_FLOOR; y < cy; y++) {
                     setBlock(map, cx, y, cz, C_DARK_METAL);
                 }
            }
        }

        // --- 6. POWER UNIT (GENERATOR) ---
        // Red box on the ground
        const genX = startX + 5;
        const genZ = 12;
        
        // Main block
        for(let x=genX-3; x<=genX+3; x++) {
            for(let y=Y_FLOOR; y<=Y_FLOOR+4; y++) {
                for(let z=genZ-2; z<=genZ+2; z++) {
                     setBlock(map, x, y, z, C_GENERATOR);
                }
            }
        }
        // Exhaust
        setBlock(map, genX+2, Y_FLOOR+5, genZ, C_DARK_METAL);
        setBlock(map, genX+2, Y_FLOOR+6, genZ, C_DARK_METAL);
        
        // Cables connecting to Trommel
        for(let z=genZ-2; z > radius+2; z--) {
             setBlock(map, genX, Y_FLOOR, z, COLORS.BLACK);
        }

        // --- 7. TAILINGS PILE ---
        // Waste output at end of trommel
        const tailX = startX + length + 2;
        generateSphere(map, tailX, Y_FLOOR + 1, 0, 4, COLORS.LIGHT); // Dirt pile

        return Array.from(map.values());
    },

    StaffQuarters: (): VoxelData[] => {
         const map = new Map<string, VoxelData>();
         const Y = CONFIG.FLOOR_Y;
         const W = 7; 
         const D = 5; 
         const H = 6; 
         
         // Foundation
         for(let x=-W; x<=W; x++) for(let z=-D; z<=D; z++) setBlock(map, x, Y, z, COLORS.GREY);

         // Walls & Room Structure
         for(let y=1; y<=H; y++) {
             for(let x=-W; x<=W; x++) {
                 for(let z=-D; z<=D; z++) {
                     if (x===-W || x===W || z===-D || z===D) {
                        setBlock(map, x, Y+y, z, COLORS.WHITE);
                     }
                     if (x===0 && z > -2 && y < H) {
                        setBlock(map, x, Y+y, z, COLORS.WHITE); // Partition
                     }
                 }
             }
         }

         // Roof (A-Frame)
         for(let h=0; h<=D; h++) {
             for(let x=-W; x<=W; x++) {
                 setBlock(map, x, Y+H+h, -D+h, COLORS.WOOD);
                 setBlock(map, x, Y+H+h, D-h, COLORS.WOOD);
                 for(let z=-D+h+1; z<D-h; z++) setBlock(map, x, Y+H+h, z, COLORS.WOOD);
             }
         }

         // Windows
         [ -4, 4 ].forEach(x => {
             setBlock(map, x, Y+3, D, COLORS.GLASS);
             setBlock(map, x+1, Y+3, D, COLORS.GLASS);
             setBlock(map, x, Y+3, -D, COLORS.GLASS);
             setBlock(map, x+1, Y+3, -D, COLORS.GLASS);
         });

         // Door
         for(let y=1; y<4; y++) {
             setBlock(map, 0, Y+y, D, COLORS.WOOD);
         }
         // Door Knob
         setBlock(map, -0.5, Y+2, D+0.5, COLORS.GOLD);

         return Array.from(map.values());
    },

    WindTurbine: (): VoxelData[] => {
         const map = new Map<string, VoxelData>();
         const Y = CONFIG.FLOOR_Y;
         
         // Base Foundation
         for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) setBlock(map, x, Y, z, COLORS.GREY);
         
         // Tower (Tall and sleek)
         const HEIGHT = 28;
         for(let y=0; y<HEIGHT; y++) {
             const r = 2.5 - (y * 0.05); // Very slight taper
             const xMax = Math.ceil(r);
             for(let x=-xMax; x<=xMax; x++) {
                 for(let z=-xMax; z<=xMax; z++) {
                     if (x*x + z*z <= r*r) {
                         setBlock(map, x, Y+y, z, COLORS.WHITE);
                     }
                 }
             }
         }
         
         // Nacelle (The box at top)
         const topY = Y + HEIGHT;
         const nacL = 6;
         for(let z=-2; z<nacL; z++) {
             for(let x=-2; x<=2; x++) {
                 for(let y=0; y<3; y++) {
                     setBlock(map, x, topY+y, z, COLORS.WHITE);
                 }
             }
         }
         // Detail on Nacelle
         setBlock(map, 0, topY+3, 2, COLORS.RED); // Aviation light

         // Rotor Hub
         const hubZ = -3;
         const hubY = topY + 1;
         generateSphere(map, 0, hubY, hubZ, 2, COLORS.GREY);
         
         // Blades (3 blades, 120 deg apart roughly)
         // Vertical Up
         for(let i=2; i<16; i++) {
             setBlock(map, 0, hubY+i, hubZ, COLORS.WHITE);
             setBlock(map, 0, hubY+i, hubZ+0.5, COLORS.WHITE); // Thickness
         }
         // Down Left
         for(let i=2; i<16; i++) {
             const x = -i * 0.866; // sin(60)
             const y = -i * 0.5;   // cos(60)
             setBlock(map, x, hubY+y, hubZ, COLORS.WHITE);
             setBlock(map, x, hubY+y, hubZ+0.5, COLORS.WHITE);
         }
         // Down Right
         for(let i=2; i<16; i++) {
             const x = i * 0.866;
             const y = -i * 0.5;
             setBlock(map, x, hubY+y, hubZ, COLORS.WHITE);
             setBlock(map, x, hubY+y, hubZ+0.5, COLORS.WHITE);
         }

         return Array.from(map.values());
    },

    SolarArrays: (): VoxelData[] => {
         const map = new Map<string, VoxelData>();
         const Y = CONFIG.FLOOR_Y;
         
         for(let row=0; row<3; row++) {
             const zOffset = (row * 8) - 8;
             
             // Panel Row
             for(let x=-10; x<=10; x++) {
                 // Angled Panel
                 setBlock(map, x, Y+2, zOffset-1, COLORS.SOLAR_PANEL); 
                 setBlock(map, x, Y+3, zOffset, COLORS.SOLAR_PANEL);   
                 setBlock(map, x, Y+4, zOffset+1, COLORS.SOLAR_PANEL); 
                 
                 // Grid
                 if(x%4===0) {
                     setBlock(map, x, Y+2, zOffset-1, COLORS.GREY);
                     setBlock(map, x, Y+3, zOffset, COLORS.GREY);
                     setBlock(map, x, Y+4, zOffset+1, COLORS.GREY);
                 }
             }
             
             // Stand
             [-9, 0, 9].forEach(legX => {
                 setBlock(map, legX, Y, zOffset, COLORS.GREY);
                 setBlock(map, legX, Y+1, zOffset, COLORS.GREY);
                 setBlock(map, legX, Y, zOffset+1, COLORS.GREY);
                 setBlock(map, legX, Y+1, zOffset+1, COLORS.GREY);
                 setBlock(map, legX, Y+2, zOffset+1, COLORS.GREY);
                 setBlock(map, legX, Y+3, zOffset+1, COLORS.GREY);
             });
         }
         
         // Inverter
         setBlock(map, 12, Y, 0, COLORS.WHITE); setBlock(map, 12, Y+1, 0, COLORS.WHITE);
         setBlock(map, 13, Y, 0, COLORS.WHITE); setBlock(map, 13, Y+1, 0, COLORS.WHITE);
         setBlock(map, 12, Y+1, 1, COLORS.GREEN); 
         
         return Array.from(map.values());
    },
    
    SecurityHQ: (): VoxelData[] => {
         const map = new Map<string, VoxelData>();
         const Y = CONFIG.FLOOR_Y;
         
         // Main Building Block (2 stories)
         const W = 8, D = 6;
         for(let y=0; y<9; y++) {
             for(let x=-W; x<=W; x++) {
                 for(let z=-D; z<=D; z++) {
                     // Foundation
                     if (y===0) { setBlock(map, x, Y, z, COLORS.DARK_GREY); continue; }
                     
                     // Walls
                     if (x===-W || x===W || z===-D || z===D) {
                         // Windows strip
                         if ((y===3 || y===7) && Math.abs(x) < W-1 && Math.abs(z) < D-1) {
                             setBlock(map, x, Y+y, z, COLORS.GLASS);
                         } else {
                             setBlock(map, x, Y+y, z, COLORS.GREY);
                         }
                     }
                     // Floors
                     if (y===4 || y===8) setBlock(map, x, Y+y, z, COLORS.DARK_GREY);
                 }
             }
         }
         
         // Entrance
         for(let x=-2; x<=2; x++) for(let y=1; y<4; y++) setBlock(map, x, Y+y, D, COLORS.GLASS);
         setBlock(map, 0, Y+4, D+1, COLORS.BLUE); // Sign
         
         // Comms Tower on Roof
         const rY = Y+9;
         for(let y=0; y<8; y++) {
             setBlock(map, -4, rY+y, -3, COLORS.DARK_GREY);
             if (y%2===0) {
                 setBlock(map, -4, rY+y, -2, COLORS.GREY); // Ladder rungs?
             }
         }
         // Dish
         const dY = rY+5;
         generateSphere(map, -4, dY, -3, 2.5, COLORS.WHITE);

         // Helipad
         for(let x=1; x<7; x++) for(let z=-4; z<2; z++) setBlock(map, x, rY, z, COLORS.DARK);
         // H
         setBlock(map, 3, rY+1, -3, COLORS.WHITE); setBlock(map, 3, rY+1, -2, COLORS.WHITE); setBlock(map, 3, rY+1, -1, COLORS.WHITE);
         setBlock(map, 5, rY+1, -3, COLORS.WHITE); setBlock(map, 5, rY+1, -2, COLORS.WHITE); setBlock(map, 5, rY+1, -1, COLORS.WHITE);
         setBlock(map, 4, rY+1, -2, COLORS.WHITE);

         // Gate Arm outside
         setBlock(map, 10, Y, D+2, COLORS.DARK_GREY); setBlock(map, 10, Y+1, D+2, COLORS.DARK_GREY);
         for(let x=11; x<16; x++) setBlock(map, x, Y+1, D+2, COLORS.RED);

         return Array.from(map.values());
    },
    
    ModernHouse: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => setBlock(map, x, y, z, c);

        // Materials
        const C_CONCRETE = COLORS.WHITE;
        const C_WOOD = COLORS.WOOD;
        const C_GLASS = COLORS.GLASS;
        const C_FRAME = COLORS.DARK_GREY;
        const C_GRASS = COLORS.GREEN;
        const C_WATER = COLORS.BLUE;
        const C_STONE = COLORS.GREY;
        const C_LIGHT = COLORS.GOLD;

        // --- 1. Main Structure (L-Shape) ---
        // Ground Floor (Living Area)
        for(let x=-8; x<=4; x++) {
            for(let z=-6; z<=6; z++) {
                for(let y=0; y<=5; y++) {
                    // Floor
                    if(y===0) { add(x, Y+y, z, C_CONCRETE); continue; }
                    // Ceiling
                    if(y===5) { add(x, Y+y, z, C_CONCRETE); continue; }
                    
                    // Walls (Back and Side)
                    if(x===-8 || z===-6) {
                        add(x, Y+y, z, C_CONCRETE);
                    }
                    // Glass Front (Large Windows)
                    else if(z===6 || x===4) {
                        if (y > 0 && y < 5) {
                            // Frames
                            if (x%4===0 || z%4===0) add(x, Y+y, z, C_FRAME);
                            else add(x, Y+y, z, C_GLASS);
                        }
                    }
                }
            }
        }

        // Second Floor (Cantilevered Bedroom)
        // Overhangs the front
        for(let x=-8; x<=6; x++) {
            for(let z=-6; z<=2; z++) {
                for(let y=5; y<=9; y++) {
                    // Floor/Ceiling
                    if(y===5 || y===9) { add(x, Y+y, z, C_WOOD); continue; }
                    
                    // Walls
                    if(x===-8 || z===-6 || x===6) {
                        add(x, Y+y, z, C_WOOD);
                    }
                    // Front Window
                    else if(z===2) {
                        add(x, Y+y, z, C_GLASS);
                    }
                }
            }
        }

        // --- 2. Outdoor Area ---
        // Pool Deck
        for(let x=4; x<=10; x++) {
            for(let z=0; z<=8; z++) {
                add(x, Y, z, C_STONE);
            }
        }
        // Infinity Pool
        for(let x=6; x<=12; x++) {
            for(let z=2; z<=7; z++) {
                if (x > 10 || z > 6 || x < 7 || z < 3) {
                     // Pool Border
                     add(x, Y, z, C_CONCRETE);
                } else {
                     // Water
                     add(x, Y, z, C_WATER);
                     add(x, Y-1, z, C_WATER); // Deep end
                }
            }
        }

        // --- 3. Details ---
        // Entrance Path
        for(let z=7; z<=10; z++) {
            add(-2, Y, z, C_STONE);
            add(-3, Y, z, C_STONE);
        }
        
        // Front Door
        for(let y=1; y<=3; y++) {
            add(-2, Y+y, 6, C_WOOD);
            add(-3, Y+y, 6, C_WOOD);
        }
        add(-2, Y+2, 6.2, C_LIGHT); // Handle

        // Interior Lights
        add(0, Y+4.5, 0, C_LIGHT);
        add(-4, Y+8.5, -2, C_LIGHT);

        // Planter Box
        for(let x=5; x<=9; x++) {
            add(x, Y+1, -6, C_CONCRETE);
            add(x, Y+2, -6, C_GRASS); // Plants
            if(x%2===0) add(x, Y+3, -6, C_GRASS); // Tall grass
        }

        // Chimney / Vertical Element
        for(let y=0; y<=11; y++) {
            for(let z=-4; z<=-2; z++) {
                add(-9, Y+y, z, C_STONE);
            }
        }

        return Array.from(map.values());
    },

    GoldOre: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const CENTER_Y = CONFIG.FLOOR_Y + 1;
        
        // Large natural mound
        for(let x=-8; x<=8; x++) {
            for(let y=0; y<=8; y++) {
                for(let z=-8; z<=8; z++) {
                    // Ellipsoid equation
                    const dx = x*x;
                    const dy = (y*1.5)*(y*1.5); // Squish Y for natural ground look
                    const dz = z*z;
                    
                    // Add some roughness
                    const r = 7 + (Math.random() * 0.5); 
                    
                    if (dx + dy + dz <= r*r) {
                        let color = COLORS.DARK_GREY; // Stone base
                        
                        // Top layer dirt/soil
                        if (y > 3 && Math.random() > 0.3) color = COLORS.DARK;
                        
                        // Gold Veins
                        // 3D Sine wave for "veins" to simulate natural ore distribution
                        const vein = Math.sin(x*0.4 + y*0.2) * Math.cos(z*0.4 + x*0.1);
                        
                        // Gold concentrated deeper inside (y < 5)
                        if (vein > 0.7 && y < 5) { 
                            color = COLORS.GOLD;
                        }
                        
                        setBlock(map, x, CENTER_Y + y, z, color);
                    }
                }
            }
        }
        
        return Array.from(map.values());
    },

    HeavyPlant: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const add = (x: number, y: number, z: number, c: number) => setBlock(map, x, y, z, c);

        const C_METAL = COLORS.GREY;
        const C_DARK_METAL = COLORS.DARK_GREY;
        const C_DIRT = COLORS.LIGHT; // Use light brown for dirt/tailings
        const C_WATER = COLORS.BLUE;
        const C_CAUTION = COLORS.GOLD; // Caution tape yellow
        const C_RED = COLORS.RED;
        const C_PIPE = COLORS.BLACK;
        const C_CONTROL_PANEL = COLORS.WHITE;
        const C_SCREEN = COLORS.GLASS;
        const C_BUTTON_R = COLORS.RED;
        const C_BUTTON_G = COLORS.GREEN;
        const C_CABLE = COLORS.GOLD; 

        // Shift everything down because user snippet likely assumes y=0 is base, 
        // but our world floor is CONFIG.FLOOR_Y (-12).
        const Y_SHIFT = CONFIG.FLOOR_Y;

        // Chassis rails
        for (let x = -8; x <= 8; x++) {
            for (const z of [-4, 4]) {
                for (let y = 0; y <= 2; y++) add(x, y + Y_SHIFT, z, C_DARK_METAL);
            }
        }

        // Trommel drum (skin version from user snippet)
        const radius = 4, length = 12, startX = -6;
        for (let i = 0; i < length; i++) {
            const px = startX + i;
            for (let angle = 0; angle < Math.PI * 2; angle += 0.4) {
                if ((i + Math.floor(angle * 5)) % 2 === 0) {
                    const y = Math.round(8 + Math.sin(angle) * radius);
                    const z = Math.round(Math.cos(angle) * radius);
                    add(px, y + Y_SHIFT, z, C_METAL);
                }
            }
        }

        // Intake hopper
        for (let y = 12; y < 18; y++) {
            const flare = y - 12;
            for (let x = 6 - flare; x <= 10 + flare; x++) {
                for (let z = -5 - flare; z <= 5 + flare; z++) {
                    // Walls
                    if (Math.abs(x - 8) === 2 + flare || Math.abs(z) === 5 + flare || y === 12) {
                        add(x, y + Y_SHIFT, z, C_METAL);
                    }
                    // Grate on top
                    if (y === 17 && z % 2 === 0) {
                        add(x, y + Y_SHIFT, z, C_DARK_METAL);
                    }
                }
            }
        }

        // Dual sluices (water + frame)
        [{ z: -6, a: 1 }, { z: 6, a: -1 }].forEach(p => {
            for (let i = 0; i < 10; i++) {
                for (let sx = -3; sx <= 3; sx++) {
                    const sz = p.z + (i * p.a);
                    const sy = 6 - i * 0.4;
                    const yInt = Math.round(sy);
                    
                    add(sx, yInt + Y_SHIFT, sz, C_METAL); // Sluice floor
                    
                    if (sx !== -3 && sx !== 3) {
                         add(sx, yInt + 1 + Y_SHIFT, sz, C_WATER); // Water
                    }
                }
            }
        });

        // Engine room & stack
        for (let x = -14; x <= -9; x++)
            for (let z = -3; z <= 3; z++)
                for (let y = 0; y < 6; y++) add(x, y + Y_SHIFT, z, C_RED);

        for (let ey = 6; ey < 12; ey++) add(-13, ey + Y_SHIFT, 0, C_DARK_METAL);

        // DETAILED COMPONENTS START

        // 1. Water Pump & High Pressure Piping
        // Pump unit near engine
        for(let x=-12; x<=-10; x++) {
            for(let y=0; y<=3; y++) {
                add(x, y+Y_SHIFT, 5, C_DARK_METAL);
            }
        }
        // Vertical riser pipe
        for(let y=0; y<18; y++) add(-11, y+Y_SHIFT, 5, C_WATER);
        // Horizontal overhead pipe run to hopper
        for(let x=-11; x<=6; x++) add(x, 18+Y_SHIFT, 5, C_WATER);
        // Cross pipe into hopper spray bars
        for(let z=-4; z<=4; z++) add(6, 18+Y_SHIFT, z, C_WATER);
        
        // 2. Hydraulic Hoses (Engine -> Trommel Motor)
        // Simulate curved hoses using small steps
        const motorX = -8;
        const motorY = 8;
        const motorZ = 0;
        // Motor block
        add(motorX, motorY+Y_SHIFT, motorZ, C_DARK_METAL);
        add(motorX, motorY+1+Y_SHIFT, motorZ, C_DARK_METAL);
        
        // Hoses from engine to motor
        for(let x=-10; x<=-8; x++) {
             add(x, 6+Y_SHIFT, 1, C_PIPE); // Hose 1
             add(x, 7+Y_SHIFT, -1, C_PIPE); // Hose 2
        }

        // 3. Electrical Cabling Trays
        // Yellow/Gold cables running along the main chassis frame
        for(let x=-14; x<=8; x++) {
             add(x, 2+Y_SHIFT, 4.5, C_CABLE); 
        }

        // 4. Control Station (Operator Panel)
        // Located on a small platform extension
        const cpX = -6;
        const cpZ = 7;
        // Platform
        for(let x=cpX-1; x<=cpX+1; x++) {
            for(let z=cpZ-1; z<=cpZ+1; z++) {
                add(x, 2+Y_SHIFT, z, C_DARK_METAL);
            }
        }
        // Stand leg
        for(let y=2; y<=5; y++) add(cpX, y+Y_SHIFT, cpZ, C_DARK_METAL);
        // Control Box
        add(cpX, 6+Y_SHIFT, cpZ, C_CONTROL_PANEL);
        // Screen
        add(cpX, 6+Y_SHIFT, cpZ-0.6, C_SCREEN);
        // Buttons
        add(cpX+0.3, 6.4+Y_SHIFT, cpZ-0.6, C_BUTTON_R);
        add(cpX-0.3, 6.4+Y_SHIFT, cpZ-0.6, C_BUTTON_G);
        
        // Wires going from cable tray up to control panel
        add(cpX, 3+Y_SHIFT, 4.5, C_CABLE);
        add(cpX, 4+Y_SHIFT, 5.5, C_CABLE);
        add(cpX, 5+Y_SHIFT, 6.5, C_CABLE);

        // DETAILED COMPONENTS END

        // Safety rails
        for (let x = -8; x <= 12; x++) {
            for (const z of [-6, 6]) {
                for (let ry = 8; ry <= 11; ry++) add(x, ry + Y_SHIFT, z, C_CAUTION);
            }
        }

        // Tailings pile (Deterministic-ish placement)
        const tailingsCount = 1000;
        for (let i = 0; i < tailingsCount; i++) {
            // Simple pseudo-random using index to ensure rebuild stability if needed
            const r1 = Math.abs(Math.sin(i * 12.9898));
            const r2 = Math.abs(Math.sin(i * 78.233));
            
            const angle = r1 * Math.PI * 2;
            const dist = Math.pow(r2, 0.7) * 18;
            
            const tx = Math.round(-20 + Math.cos(angle) * dist);
            const ty = Math.round(Math.max(0, 8 - dist * 0.5));
            const tz = Math.round(Math.sin(angle) * dist);

            // ensure y is relative to our floor
            add(tx, ty + Y_SHIFT, tz, C_DIRT);
        }

        return Array.from(map.values());
    },

    Trees: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => setBlock(map, x, y, z, c);

        // Helper for randomized leaf clusters
        const leafCluster = (cx: number, cy: number, cz: number, r: number, color: number) => {
             for(let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
                 for(let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
                     for(let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
                         const dx = x - cx;
                         const dy = y - cy;
                         const dz = z - cz;
                         if (dx*dx + dy*dy + dz*dz <= r*r) {
                             if (Math.random() > 0.2) add(x, y, z, color);
                         }
                     }
                 }
             }
        };

        // 1. ANCIENT OAK (Center)
        const oakX = 0, oakZ = 0;
        const oakC = COLORS.WOOD;
        const leafC = COLORS.GREEN;
        
        // Roots
        for(let i=0; i<4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const rx = Math.cos(angle) * 4;
            const rz = Math.sin(angle) * 4;
            add(Math.round(oakX+rx), Y, Math.round(oakZ+rz), oakC);
            add(Math.round(oakX+rx*0.7), Y+1, Math.round(oakZ+rz*0.7), oakC);
            add(Math.round(oakX+rx*0.4), Y+2, Math.round(oakZ+rz*0.4), oakC);
        }
        
        // Main Trunk
        for(let y=0; y<12; y++) {
            add(oakX, Y+y, oakZ, oakC);
            add(oakX+1, Y+y, oakZ, oakC);
            add(oakX, Y+y, oakZ+1, oakC);
            add(oakX+1, Y+y, oakZ+1, oakC);
            if (y < 4) { // Thicker base
                 add(oakX-1, Y+y, oakZ, oakC); add(oakX-1, Y+y, oakZ+1, oakC);
                 add(oakX+2, Y+y, oakZ, oakC); add(oakX+2, Y+y, oakZ+1, oakC);
                 add(oakX, Y+y, oakZ-1, oakC); add(oakX+1, Y+y, oakZ-1, oakC);
                 add(oakX, Y+y, oakZ+2, oakC); add(oakX+1, Y+y, oakZ+2, oakC);
            }
        }
        
        // Branches & Leaves
        [
            {x: 4, y: 8, z: 4}, {x: -4, y: 9, z: -4}, 
            {x: 4, y: 10, z: -4}, {x: -4, y: 7, z: 4},
            {x: 0, y: 14, z: 0}
        ].forEach(offset => {
             const steps = 6;
             for(let i=0; i<steps; i++) {
                 add(oakX + Math.round(offset.x * (i/steps)), Y + 8 + Math.round(offset.y * (i/steps)/2), oakZ + Math.round(offset.z * (i/steps)), oakC);
             }
             leafCluster(oakX + offset.x, Y + 8 + offset.y/2, oakZ + offset.z, 3.5, leafC);
        });

        // 2. TALL PINE (Left)
        const pineX = -12, pineZ = 4;
        const pineWood = 0x2d241e;
        const pineLeaf = 0x1e3f28; // Dark green
        
        for(let y=0; y<20; y++) {
             add(pineX, Y+y, pineZ, pineWood);
             if(y<3) {
                 add(pineX+1, Y+y, pineZ, pineWood);
                 add(pineX-1, Y+y, pineZ, pineWood);
                 add(pineX, Y+y, pineZ+1, pineWood);
                 add(pineX, Y+y, pineZ-1, pineWood);
             }
        }
        
        for(let l=0; l<6; l++) {
            const ly = Y + 6 + (l * 3);
            const r = 4 - (l * 0.6);
            for(let y=0; y<2; y++) {
                for(let x=Math.floor(-r); x<=Math.ceil(r); x++) {
                    for(let z=Math.floor(-r); z<=Math.ceil(r); z++) {
                        if (x*x + z*z <= r*r && Math.random() > 0.3) {
                            add(pineX+x, ly+y, pineZ+z, pineLeaf);
                        }
                    }
                }
            }
        }
        add(pineX, Y+20, pineZ, pineLeaf);
        add(pineX, Y+21, pineZ, pineLeaf);

        // 3. CHERRY BLOSSOM (Right)
        const cherryX = 12, cherryZ = -2;
        const cherryWood = 0x5c4033;
        const cherryLeaf = 0xffb7c5; // Pink
        
        let cx = cherryX, cz = cherryZ;
        for(let y=0; y<10; y++) {
             add(Math.round(cx), Y+y, Math.round(cz), cherryWood);
             cx += (Math.random() - 0.5) * 0.5;
             cz += (Math.random() - 0.5) * 0.5;
             if (y === 5 || y === 8) {
                 let bx = cx, bz = cz;
                 for(let b=0; b<4; b++) {
                     bx += 1; bz += (Math.random()-0.5);
                     add(Math.round(bx), Y+y+b, Math.round(bz), cherryWood);
                     if(b===3) leafCluster(bx, Y+y+b, bz, 2.5, cherryLeaf);
                 }
             }
        }
        leafCluster(cx, Y+10, cz, 4, cherryLeaf);
        
        for(let i=0; i<20; i++) {
             const px = cherryX + (Math.random()-0.5)*8;
             const pz = cherryZ + (Math.random()-0.5)*8;
             add(Math.round(px), Y, Math.round(pz), cherryLeaf);
        }

        return Array.from(map.values());
    },

    WaterBlock: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y_FLOOR = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => setBlock(map, x, y, z, c);

        const SIZE = 7; // Radius
        const HEIGHT = 10;

        // Sand Bed
        for(let x = -SIZE; x <= SIZE; x++) {
            for(let z = -SIZE; z <= SIZE; z++) {
                // Irregular floor
                const h = Math.floor(Math.random() * 2);
                add(x, Y_FLOOR + h, z, COLORS.SAND);
            }
        }

        // Water Volume
        for(let x = -SIZE; x <= SIZE; x++) {
            for(let z = -SIZE; z <= SIZE; z++) {
                for(let y = 1; y <= HEIGHT; y++) {
                     let color = COLORS.BLUE;
                     if (y === HEIGHT) color = COLORS.GLASS; // Surface
                     
                     // Only add water if not sand
                     if (!map.has(`${x},${Y_FLOOR+y},${z}`)) {
                         add(x, Y_FLOOR + y, z, color);
                     }
                }
            }
        }
        
        // Decor: Seaweed
        for(let i=0; i<8; i++) {
            const sx = Math.floor((Math.random() - 0.5) * SIZE * 1.5);
            const sz = Math.floor((Math.random() - 0.5) * SIZE * 1.5);
            const h = 3 + Math.random() * 5;
            for(let y=1; y<h; y++) {
                add(sx, Y_FLOOR + y, sz, COLORS.GREEN);
            }
        }

        // Decor: Coral
        for(let i=0; i<5; i++) {
            const cx = Math.floor((Math.random() - 0.5) * SIZE * 1.5);
            const cz = Math.floor((Math.random() - 0.5) * SIZE * 1.5);
            add(cx, Y_FLOOR + 1, cz, COLORS.RED);
            add(cx+1, Y_FLOOR + 2, cz, COLORS.RED);
            add(cx-1, Y_FLOOR + 2, cz, COLORS.RED);
        }

        // Fish
        for(let i=0; i<10; i++) {
            const fx = Math.floor((Math.random() - 0.5) * SIZE * 1.8);
            const fy = Math.floor(2 + Math.random() * (HEIGHT - 4));
            const fz = Math.floor((Math.random() - 0.5) * SIZE * 1.8);
            
            add(fx, Y_FLOOR + fy, fz, COLORS.GOLD);
            add(fx+1, Y_FLOOR + fy, fz, COLORS.ORANGE); // Tail
        }

        return Array.from(map.values());
    },

    City: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => setBlock(map, x, y, z, c);

        const PLOT_SIZE = 8;
        const ROAD_WIDTH = 2;
        const GRID_DIM = 4; // 4x4 grid of plots
        const OFFSET = -((GRID_DIM * (PLOT_SIZE + ROAD_WIDTH)) / 2);

        // --- 1. Roads & Sidewalks ---
        const totalSize = GRID_DIM * (PLOT_SIZE + ROAD_WIDTH) + ROAD_WIDTH;
        
        for (let i = 0; i < totalSize; i++) {
            for (let j = 0; j < totalSize; j++) {
                const x = OFFSET + i;
                const z = OFFSET + j;
                
                // Determine if road or plot
                const isRoadX = i % (PLOT_SIZE + ROAD_WIDTH) < ROAD_WIDTH;
                const isRoadZ = j % (PLOT_SIZE + ROAD_WIDTH) < ROAD_WIDTH;

                if (isRoadX || isRoadZ) {
                    add(x, Y, z, COLORS.DARK_GREY); // Asphalt
                    // Lane markers
                    if (isRoadX && !isRoadZ && i % 2 === 0 && j % 4 === 0) add(x + 0.5, Y + 0.1, z, COLORS.WHITE);
                    if (isRoadZ && !isRoadX && j % 2 === 0 && i % 4 === 0) add(x, Y + 0.1, z + 0.5, COLORS.WHITE);
                } else {
                    add(x, Y, z, COLORS.GREY); // Sidewalk/Plot Base
                }
            }
        }

        // --- 2. Buildings ---
        for (let gx = 0; gx < GRID_DIM; gx++) {
            for (let gz = 0; gz < GRID_DIM; gz++) {
                const plotX = OFFSET + ROAD_WIDTH + gx * (PLOT_SIZE + ROAD_WIDTH);
                const plotZ = OFFSET + ROAD_WIDTH + gz * (PLOT_SIZE + ROAD_WIDTH);
                
                // Center of plot
                const cx = plotX + PLOT_SIZE / 2;
                const cz = plotZ + PLOT_SIZE / 2;

                const buildingType = Math.random();

                if (buildingType > 0.7) {
                    // SKYSCRAPER
                    const h = 15 + Math.floor(Math.random() * 20);
                    const w = PLOT_SIZE - 2;
                    const color = Math.random() > 0.5 ? COLORS.GLASS : COLORS.BLUE;
                    
                    for (let y = 1; y <= h; y++) {
                        for (let x = 0; x < w; x++) {
                            for (let z = 0; z < w; z++) {
                                // Hollow-ish
                                if (x === 0 || x === w - 1 || z === 0 || z === w - 1 || Math.random() > 0.1) {
                                    add(plotX + 1 + x, Y + y, plotZ + 1 + z, color);
                                }
                            }
                        }
                    }
                    // Antenna
                    for(let y=0; y<5; y++) add(cx, Y + h + y, cz, COLORS.GREY);
                    add(cx, Y+h+5, cz, COLORS.RED);

                } else if (buildingType > 0.4) {
                    // APARTMENT / OFFICE
                    const h = 8 + Math.floor(Math.random() * 8);
                    const w = PLOT_SIZE - 2;
                    const color = Math.random() > 0.5 ? COLORS.WHITE : COLORS.ORANGE;

                    for (let y = 1; y <= h; y++) {
                        for (let x = 0; x < w; x++) {
                            for (let z = 0; z < w; z++) {
                                const isWall = x === 0 || x === w - 1 || z === 0 || z === w - 1;
                                if (isWall) {
                                    // Windows every other block roughly
                                    if (y % 3 !== 0 && (x + z) % 2 === 0) {
                                        add(plotX + 1 + x, Y + y, plotZ + 1 + z, COLORS.GLASS);
                                    } else {
                                        add(plotX + 1 + x, Y + y, plotZ + 1 + z, color);
                                    }
                                } else if (y === h) {
                                    add(plotX + 1 + x, Y + y, plotZ + 1 + z, COLORS.DARK_GREY); // Roof
                                }
                            }
                        }
                    }

                } else {
                    // PARK
                    for(let x=0; x<PLOT_SIZE; x++) for(let z=0; z<PLOT_SIZE; z++) add(plotX+x, Y+0.5, plotZ+z, COLORS.GREEN);
                    
                    // Simple Tree
                    const tx = plotX + 2 + Math.floor(Math.random()*4);
                    const tz = plotZ + 2 + Math.floor(Math.random()*4);
                    for(let y=0; y<4; y++) add(tx, Y+1+y, tz, COLORS.WOOD);
                    for(let x=-2; x<=2; x++) for(let z=-2; z<=2; z++) for(let y=0; y<2; y++) {
                        if(x*x+z*z <= 4) add(tx+x, Y+4+y, tz+z, COLORS.GREEN);
                    }
                }
            }
        }

        // --- 3. Traffic ---
        for(let i=0; i<15; i++) {
            // Random position on road grid
            const isHoriz = Math.random() > 0.5;
            const lane = Math.floor(Math.random() * GRID_DIM) * (PLOT_SIZE + ROAD_WIDTH); // Road index
            const posAlong = Math.floor(Math.random() * totalSize);
            
            let cx, cz;
            if (isHoriz) {
                cx = OFFSET + posAlong;
                cz = OFFSET + lane;
            } else {
                cx = OFFSET + lane;
                cz = OFFSET + posAlong;
            }
            
            // Car Body
            add(cx, Y+1, cz, COLORS.RED);
            add(cx+(isHoriz?1:0), Y+1, cz+(isHoriz?0:1), COLORS.RED);
            add(cx, Y+2, cz, COLORS.GLASS); // Top
        }

        return Array.from(map.values());
    },

    AFrameCabin: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => {
            const rx = Math.round(x);
            const ry = Math.round(y);
            const rz = Math.round(z);
            map.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, color: c });
        };
        
        // Base
        for(let x=-6; x<=6; x++) for(let z=-8; z<=8; z++) add(x, Y, z, COLORS.WOOD);
        
        // A-Frame
        for(let y=1; y<=10; y++) {
            const width = 10 - y;
            for(let z=-7; z<=7; z++) {
                // Roof slopes
                add(-width, Y+y, z, COLORS.DARK_GREY);
                add(width, Y+y, z, COLORS.DARK_GREY);
                
                // Front and back walls
                if (z === -7 || z === 7) {
                    for(let x=-width+1; x<width; x++) {
                        if (z === 7 && x >= -2 && x <= 2 && y <= 4) {
                            if (x === 0 && y <= 3) add(x, Y+y, z, COLORS.WOOD); // Door
                            else add(x, Y+y, z, COLORS.GLASS); // Window
                        } else {
                            add(x, Y+y, z, COLORS.WOOD);
                        }
                    }
                }
            }
        }
        return Array.from(map.values());
    },

    CozyCottage: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => {
            const rx = Math.round(x);
            const ry = Math.round(y);
            const rz = Math.round(z);
            map.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, color: c });
        };
        
        // Base
        for(let x=-5; x<=5; x++) for(let z=-4; z<=4; z++) add(x, Y, z, COLORS.GREY);
        
        // Walls
        for(let y=1; y<=4; y++) {
            for(let x=-4; x<=4; x++) {
                for(let z=-3; z<=3; z++) {
                    if (x===-4 || x===4 || z===-3 || z===3) {
                        if (z===3 && x===0 && y<=3) add(x, Y+y, z, COLORS.WOOD); // Door
                        else if (y===2 && (x===-2 || x===2)) add(x, Y+y, z, COLORS.GLASS); // Windows
                        else add(x, Y+y, z, COLORS.WHITE); // Walls
                    }
                }
            }
        }
        
        // Pitched Roof
        for(let y=0; y<=4; y++) {
            for(let x=-5; x<=5; x++) {
                add(x, Y+5+y, -4+y, COLORS.RED);
                add(x, Y+5+y, 4-y, COLORS.RED);
                // Fill gables
                if (x===-4 || x===4) {
                    for(let z=-3+y; z<=3-y; z++) add(x, Y+5+y, z, COLORS.WHITE);
                }
            }
        }
        // Chimney
        for(let y=1; y<=8; y++) add(-3, Y+y, -1, COLORS.DARK_GREY);
        
        return Array.from(map.values());
    },

    BeachHouse: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => {
            const rx = Math.round(x);
            const ry = Math.round(y);
            const rz = Math.round(z);
            map.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, color: c });
        };
        
        // Stilts
        [-4, 4].forEach(x => [-3, 5].forEach(z => {
            for(let y=0; y<=3; y++) add(x, Y+y, z, COLORS.WOOD);
        }));
        
        // Deck
        for(let x=-6; x<=6; x++) for(let z=-5; z<=7; z++) add(x, Y+4, z, COLORS.WOOD);
        
        // House
        for(let y=5; y<=9; y++) {
            for(let x=-4; x<=4; x++) {
                for(let z=-3; z<=3; z++) {
                    if (x===-4 || x===4 || z===-3 || z===3) {
                        if (z===3 && x===0 && y<=7) add(x, Y+y, z, COLORS.GLASS); // Sliding door
                        else add(x, Y+y, z, COLORS.BLUE);
                    } else if (y===9) {
                        add(x, Y+y, z, COLORS.WHITE); // Flat roof
                    }
                }
            }
        }
        // Deck railing
        for(let x=-6; x<=6; x++) {
            add(x, Y+5, 7, COLORS.WHITE);
            add(x, Y+5, -5, COLORS.WHITE);
        }
        for(let z=-5; z<=7; z++) {
            add(-6, Y+5, z, COLORS.WHITE);
            add(6, Y+5, z, COLORS.WHITE);
        }
        
        return Array.from(map.values());
    },

    DesertVilla: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => {
            const rx = Math.round(x);
            const ry = Math.round(y);
            const rz = Math.round(z);
            map.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, color: c });
        };
        const C_SAND = COLORS.GOLD; // Sandstone look
        
        // Courtyard Base
        for(let x=-8; x<=8; x++) for(let z=-8; z<=8; z++) add(x, Y, z, C_SAND);
        
        // Pool
        for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) add(x, Y, z, COLORS.BLUE);
        
        // U-Shaped Building
        for(let y=1; y<=5; y++) {
            for(let x=-8; x<=8; x++) {
                for(let z=-8; z<=8; z++) {
                    if (z <= -4 || x <= -4 || x >= 4) {
                        if (y===5) add(x, Y+y, z, C_SAND); // Roof
                        else if (x===-8 || x===8 || z===-8 || z===8) add(x, Y+y, z, C_SAND); // Outer walls
                        else if (z===-4 || x===-4 || x===4) {
                            if (y===2 && x%3===0) add(x, Y+y, z, COLORS.DARK); // Windows facing pool
                            else add(x, Y+y, z, C_SAND); // Inner walls
                        }
                    }
                }
            }
        }
        
        // Second story on one side
        for(let y=6; y<=9; y++) {
            for(let x=-8; x<=-4; x++) {
                for(let z=-8; z<=8; z++) {
                    if (y===9) add(x, Y+y, z, C_SAND);
                    else if (x===-8 || x===-4 || z===-8 || z===8) add(x, Y+y, z, C_SAND);
                }
            }
        }
        
        return Array.from(map.values());
    },

    TinyHouse: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => {
            const rx = Math.round(x);
            const ry = Math.round(y);
            const rz = Math.round(z);
            map.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, color: c });
        };
        
        // Wheels
        [-3, 3].forEach(x => [-1, 1].forEach(z => {
            add(x, Y+1, z, COLORS.BLACK);
        }));
        
        // Trailer Base
        for(let x=-5; x<=5; x++) for(let z=-2; z<=2; z++) add(x, Y+2, z, COLORS.DARK_GREY);
        
        // Cabin
        for(let y=3; y<=7; y++) {
            for(let x=-4; x<=4; x++) {
                for(let z=-2; z<=2; z++) {
                    if (x===-4 || x===4 || z===-2 || z===2) {
                        if (x===0 && z===2 && y<=5) add(x, Y+y, z, COLORS.WOOD); // Door
                        else if (x===2 && z===2 && y===5) add(x, Y+y, z, COLORS.GLASS); // Window
                        else add(x, Y+y, z, COLORS.WHITE);
                    }
                }
            }
        }
        
        // Slanted Roof
        for(let x=-5; x<=5; x++) {
            for(let z=-3; z<=3; z++) {
                add(x, Y+8 + (z > 0 ? 1 : 0), z, COLORS.DARK_GREY);
            }
        }
        
        return Array.from(map.values());
    },

    SuburbanHome: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => {
            const rx = Math.round(x);
            const ry = Math.round(y);
            const rz = Math.round(z);
            map.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, color: c });
        };
        
        // Base
        for(let x=-8; x<=6; x++) for(let z=-5; z<=5; z++) add(x, Y, z, COLORS.GREY);
        
        // Garage (Left)
        for(let y=1; y<=4; y++) {
            for(let x=-7; x<=-1; x++) {
                for(let z=-4; z<=4; z++) {
                    if (x===-7 || x===-1 || z===-4 || z===4) {
                        if (z===4 && x>=-5 && x<=-3 && y<=3) add(x, Y+y, z, COLORS.WHITE); // Garage Door
                        else add(x, Y+y, z, COLORS.LIGHT);
                    }
                }
            }
        }
        
        // Main House (Right)
        for(let y=1; y<=8; y++) {
            for(let x=-1; x<=5; x++) {
                for(let z=-4; z<=4; z++) {
                    if (x===-1 || x===5 || z===-4 || z===4) {
                        if (z===4 && x===2 && y<=3) add(x, Y+y, z, COLORS.WOOD); // Front Door
                        else if (z===4 && x===4 && (y===2 || y===6)) add(x, Y+y, z, COLORS.GLASS); // Windows
                        else add(x, Y+y, z, COLORS.LIGHT);
                    } else if (y===4) {
                        add(x, Y+y, z, COLORS.WOOD); // Floor 2
                    }
                }
            }
        }
        
        // Roofs
        for(let y=0; y<=3; y++) {
            // Garage Roof
            for(let x=-8; x<=0; x++) {
                add(x, Y+5+y, -5+y, COLORS.DARK_GREY);
                add(x, Y+5+y, 5-y, COLORS.DARK_GREY);
            }
            // Main Roof
            for(let x=-2; x<=6; x++) {
                add(x, Y+9+y, -5+y, COLORS.DARK_GREY);
                add(x, Y+9+y, 5-y, COLORS.DARK_GREY);
            }
        }
        
        return Array.from(map.values());
    },

    TreeHouse: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => {
            const rx = Math.round(x);
            const ry = Math.round(y);
            const rz = Math.round(z);
            map.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, color: c });
        };
        
        // Tree Trunk
        for(let y=0; y<=12; y++) {
            for(let x=-1; x<=1; x++) {
                for(let z=-1; z<=1; z++) {
                    if (x*x + z*z <= 2) add(x, Y+y, z, COLORS.WOOD);
                }
            }
        }
        
        // Tree Leaves (Top)
        for(let y=10; y<=16; y++) {
            const r = y < 14 ? 5 : 3;
            for(let x=-r; x<=r; x++) {
                for(let z=-r; z<=r; z++) {
                    if (x*x + z*z <= r*r && Math.random() > 0.2) add(x, Y+y, z, COLORS.GREEN);
                }
            }
        }
        
        // Platform
        for(let x=-4; x<=4; x++) {
            for(let z=-4; z<=4; z++) {
                if (x*x + z*z > 2) add(x, Y+6, z, COLORS.WOOD);
            }
        }
        
        // House on Platform
        for(let y=7; y<=10; y++) {
            for(let x=-3; x<=3; x++) {
                for(let z=-3; z<=3; z++) {
                    if (x===-3 || x===3 || z===-3 || z===3) {
                        if (z===3 && x===0 && y<=8) add(x, Y+y, z, COLORS.DARK); // Door
                        else if (y===8 && (x===-3 || x===3)) add(x, Y+y, z, COLORS.GLASS); // Window
                        else add(x, Y+y, z, COLORS.WOOD);
                    } else if (y===10) {
                        add(x, Y+y, z, COLORS.WOOD); // Roof
                    }
                }
            }
        }
        
        // Ladder
        for(let y=0; y<=6; y++) {
            add(0, Y+y, 2, COLORS.WOOD);
            if (y%2===0) add(0, Y+y, 3, COLORS.WOOD);
        }
        
        return Array.from(map.values());
    },

    VictorianHouse: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => {
            const rx = Math.round(x);
            const ry = Math.round(y);
            const rz = Math.round(z);
            map.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, color: c });
        };
        
        // Base
        for(let x=-4; x<=4; x++) for(let z=-5; z<=5; z++) add(x, Y, z, COLORS.DARK_GREY);
        
        // Main Body (3 stories)
        for(let y=1; y<=12; y++) {
            for(let x=-3; x<=3; x++) {
                for(let z=-4; z<=4; z++) {
                    if (x===-3 || x===3 || z===-4 || z===4) {
                        // Windows
                        if ((y===2 || y===6 || y===10) && (x===0 || z===0)) add(x, Y+y, z, COLORS.GLASS);
                        else if (z===4 && x===-1 && y<=3) add(x, Y+y, z, COLORS.WOOD); // Door
                        else add(x, Y+y, z, COLORS.RED); // Brick walls
                    } else if (y%4===0) {
                        add(x, Y+y, z, COLORS.WOOD); // Floors
                    }
                }
            }
        }
        
        // Turret (Corner)
        for(let y=1; y<=15; y++) {
            for(let x=2; x<=5; x++) {
                for(let z=3; z<=6; z++) {
                    const dx = x - 3.5;
                    const dz = z - 4.5;
                    if (dx*dx + dz*dz <= 2.5) {
                        if (y > 12) {
                            // Turret Roof (Cone)
                            if (dx*dx + dz*dz <= (16-y)*0.5) add(x, Y+y, z, COLORS.DARK_GREY);
                        } else {
                            if (y%4===2) add(x, Y+y, z, COLORS.GLASS);
                            else add(x, Y+y, z, COLORS.RED);
                        }
                    }
                }
            }
        }
        
        // Main Roof
        for(let y=0; y<=4; y++) {
            for(let x=-4+y; x<=4-y; x++) {
                for(let z=-5+y; z<=5-y; z++) {
                    add(x, Y+13+y, z, COLORS.DARK_GREY);
                }
            }
        }
        
        return Array.from(map.values());
    },

    CyberpunkHouse: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => {
            const rx = Math.round(x);
            const ry = Math.round(y);
            const rz = Math.round(z);
            map.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, color: c });
        };
        
        // Base
        for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) add(x, Y, z, COLORS.DARK_GREY);
        
        // Asymmetrical Blocks
        // Block 1
        for(let x=-5; x<=1; x++) for(let z=-5; z<=2; z++) for(let y=1; y<=6; y++) {
            if (x===-5 || x===1 || z===-5 || z===2) add(x, Y+y, z, COLORS.DARK);
            else if (y===6) add(x, Y+y, z, COLORS.DARK_GREY);
        }
        // Block 2 (Taller, overlapping)
        for(let x=-2; x<=4; x++) for(let z=-1; z<=4; z++) for(let y=1; y<=10; y++) {
            if (x===-2 || x===4 || z===-1 || z===4) add(x, Y+y, z, COLORS.GREY);
            else if (y===10) add(x, Y+y, z, COLORS.DARK_GREY);
        }
        
        // Neon Accents
        for(let y=1; y<=6; y++) add(-5, Y+y, -5, COLORS.RED); // Corner neon
        for(let x=-2; x<=4; x++) add(x, Y+8, 4, COLORS.BLUE); // Strip neon
        add(1, Y+3, 2, COLORS.GREEN); add(2, Y+3, 2, COLORS.GREEN); // Sign
        
        // Cables/Pipes
        for(let y=1; y<=10; y++) add(4, Y+y, -1, COLORS.BLACK);
        for(let x=1; x<=4; x++) add(x, Y+11, -1, COLORS.BLACK);
        
        // Windows
        for(let x=-4; x<=0; x+=2) add(x, Y+3, 2, COLORS.GLASS);
        for(let y=4; y<=8; y+=2) add(4, Y+y, 1, COLORS.GLASS);
        
        return Array.from(map.values());
    },

    CityHall: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => map.set(`${Math.round(x)},${Math.round(y)},${Math.round(z)}`, { x: Math.round(x), y: Math.round(y), z: Math.round(z), color: c });
        // Base Plaza
        for(let x=-12; x<=12; x++) for(let z=-8; z<=10; z++) add(x, Y, z, COLORS.GREY);
        // Fountains in plaza
        for(let x of [-8, 8]) {
            for(let z=7; z<=9; z++) {
                add(x-1, Y+1, z, COLORS.WHITE); add(x+1, Y+1, z, COLORS.WHITE);
                add(x, Y+1, z-1, COLORS.WHITE); add(x, Y+1, z+1, COLORS.WHITE);
                add(x, Y+1, z, COLORS.BLUE); add(x, Y+2, z, COLORS.BLUE); // Water
            }
        }
        // Steps
        for(let y=1; y<=3; y++) for(let x=-4; x<=4; x++) for(let z=6+y; z<=9; z++) add(x, Y+y, z, COLORS.GREY);
        // Main Building
        for(let y=1; y<=8; y++) {
            for(let x=-10; x<=10; x++) {
                for(let z=-6; z<=6; z++) {
                    if (x===-10 || x===10 || z===-6 || z===6) {
                        if (z===6 && x>=-2 && x<=2 && y<=4) add(x, Y+y, z, COLORS.WOOD); // Doors
                        else if (y%3===0 && x%2!==0) add(x, Y+y, z, COLORS.GLASS); // Windows
                        else add(x, Y+y, z, COLORS.WHITE);
                    }
                }
            }
        }
        // Pillars
        for(let x=-4; x<=4; x+=2) for(let y=4; y<=8; y++) add(x, Y+y, 7, COLORS.WHITE);
        // Pediment
        for(let y=0; y<=4; y++) for(let x=-5+y; x<=5-y; x++) for(let z=6; z<=8; z++) add(x, Y+9+y, z, COLORS.WHITE);
        // Clock on Pediment
        add(0, Y+10, 8, COLORS.GOLD); add(0, Y+10, 8.1, COLORS.BLACK);
        // Roof
        for(let x=-11; x<=11; x++) for(let z=-7; z<=7; z++) add(x, Y+9, z, COLORS.DARK_GREY);
        // Dome Base
        for(let y=0; y<=2; y++) {
            for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) {
                if (x*x + z*z <= 36) {
                    if (y===1 && x%2===0) add(x, Y+10+y, z, COLORS.GLASS);
                    else add(x, Y+10+y, z, COLORS.WHITE);
                }
            }
        }
        // Dome
        for(let y=0; y<=6; y++) {
            const r = 6 - y*0.8;
            for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) {
                if (x*x + z*z <= r*r) add(x, Y+13+y, z, COLORS.GOLD);
            }
        }
        // Lantern on top
        add(0, Y+20, 0, COLORS.WHITE); add(0, Y+21, 0, COLORS.GOLD);
        // Flags
        for(let y=1; y<=5; y++) { add(-9, Y+9+y, 6, COLORS.BLACK); add(9, Y+9+y, 6, COLORS.BLACK); }
        add(-8, Y+13, 6, COLORS.RED); add(8, Y+13, 6, COLORS.BLUE);
        return Array.from(map.values());
    },

    Library: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => map.set(`${x},${y},${z}`, { x, y, z, color: c });
        // Base Plaza
        for(let x=-10; x<=10; x++) for(let z=-10; z<=10; z++) add(x, Y, z, COLORS.GREY);
        // Grand Staircase
        for(let y=1; y<=3; y++) for(let x=-3; x<=3; x++) for(let z=7+y; z<=10; z++) add(x, Y+y, z, COLORS.WHITE);
        // Planters
        for(let x of [-6, 6]) for(let z=8; z<=9; z++) { add(x, Y+1, z, COLORS.DARK_GREY); add(x, Y+2, z, COLORS.GREEN); }
        // Building
        for(let y=1; y<=8; y++) {
            for(let x=-8; x<=8; x++) {
                for(let z=-8; z<=8; z++) {
                    if (x===-8 || x===8 || z===-8 || z===8) {
                        if (z===8 && x>=-2 && x<=2 && y<=4) add(x, Y+y, z, COLORS.GLASS); // Grand Entrance
                        else if (y>2 && y<7 && (x%3===0 || z%3===0)) add(x, Y+y, z, COLORS.GLASS); // Tall windows
                        else add(x, Y+y, z, COLORS.WOOD); // Wood paneling
                    }
                }
            }
        }
        // Roof
        for(let x=-9; x<=9; x++) for(let z=-9; z<=9; z++) add(x, Y+9, z, COLORS.DARK_GREY);
        // Skylight
        for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) {
            add(x, Y+9, z, COLORS.GLASS);
            add(x, Y+10, z, COLORS.GLASS);
        }
        // Interior Details (visible through windows/skylight)
        for(let x=-6; x<=6; x+=4) for(let z=-6; z<=-2; z++) for(let y=1; y<=5; y++) {
            add(x, Y+y, z, COLORS.WOOD);
            if (y%2===0) add(x, Y+y, z+0.5, COLORS.RED); // Books
            if (y%2!==0) add(x, Y+y, z-0.5, COLORS.BLUE); // Books
        }
        // Reading tables
        for(let x=-4; x<=4; x+=4) {
            add(x, Y+1, 4, COLORS.WOOD); add(x, Y+2, 4, COLORS.WOOD);
            add(x, Y+2, 4.5, COLORS.GOLD); // Lamp
        }
        return Array.from(map.values());
    },

    FireStation: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => map.set(`${x},${y},${z}`, { x, y, z, color: c });
        // Base & Driveway
        for(let x=-10; x<=10; x++) for(let z=-8; z<=10; z++) {
            if (z > 6 && x >= -6 && x <= 6) {
                if (x === 0) add(x, Y, z, COLORS.GOLD); // Yellow line
                else add(x, Y, z, COLORS.DARK_GREY); // Asphalt
            } else {
                add(x, Y, z, COLORS.GREY);
            }
        }
        // Main Building
        for(let y=1; y<=8; y++) {
            for(let x=-8; x<=8; x++) {
                for(let z=-6; z<=6; z++) {
                    if (x===-8 || x===8 || z===-6 || z===6) {
                        // Garage Doors (Two bays)
                        if (z===6 && ((x>=-6 && x<=-1) || (x>=1 && x<=6)) && y<=6) {
                            if (y%2===0) add(x, Y+y, z, COLORS.GLASS);
                            else add(x, Y+y, z, COLORS.WHITE);
                        }
                        else add(x, Y+y, z, COLORS.RED); // Brick
                    }
                }
            }
        }
        // Hose Tower
        for(let y=9; y<=18; y++) {
            for(let x=-8; x<=-4; x++) {
                for(let z=-6; z<=-2; z++) {
                    if (x===-8 || x===-4 || z===-6 || z===-2) {
                        if (y===17) add(x, Y+y, z, COLORS.WHITE); // Trim
                        else add(x, Y+y, z, COLORS.RED);
                    }
                }
            }
        }
        // Roofs
        for(let x=-9; x<=9; x++) for(let z=-7; z<=7; z++) add(x, Y+9, z, COLORS.DARK_GREY);
        for(let x=-9; x<=-3; x++) for(let z=-7; z<=-1; z++) add(x, Y+19, z, COLORS.DARK_GREY);
        // Siren/Bell
        add(-6, Y+20, -4, COLORS.GOLD);
        
        // Fire Engine 1 (Parked outside)
        for(let x=2; x<=5; x++) for(let z=7; z<=10; z++) for(let y=1; y<=4; y++) {
            if (y===1) add(x, Y+y, z, COLORS.BLACK); // Wheels/base
            else if (y===3 && z===10) add(x, Y+y, z, COLORS.GLASS); // Windshield
            else add(x, Y+y, z, COLORS.RED); // Body
        }
        add(3, Y+5, 8, COLORS.BLUE); add(4, Y+5, 8, COLORS.WHITE); // Lights
        add(2, Y+2, 8, COLORS.WHITE); // Ladder on side
        
        // Fire Engine 2 (Inside bay 1)
        for(let x=-5; x<=-2; x++) for(let z=1; z<=5; z++) for(let y=1; y<=4; y++) {
            if (y===1) add(x, Y+y, z, COLORS.BLACK);
            else if (y===3 && z===5) add(x, Y+y, z, COLORS.GLASS);
            else add(x, Y+y, z, COLORS.RED);
        }
        add(-4, Y+5, 3, COLORS.BLUE);
        
        // Dalmatian
        add(-7, Y+1, 7, COLORS.WHITE); add(-7, Y+2, 7, COLORS.BLACK);
        
        return Array.from(map.values());
    },

    PoliceStation: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => map.set(`${x},${y},${z}`, { x, y, z, color: c });
        // Base & Secure Yard
        for(let x=-12; x<=12; x++) for(let z=-10; z<=10; z++) {
            if (x < -6 && z > 0) add(x, Y, z, COLORS.DARK_GREY); // Parking
            else add(x, Y, z, COLORS.GREY);
        }
        // Fence
        for(let x=-12; x<=-6; x++) { add(x, Y+1, 10, COLORS.DARK_GREY); add(x, Y+2, 10, COLORS.DARK_GREY); }
        for(let z=0; z<=10; z++) { add(-12, Y+1, z, COLORS.DARK_GREY); add(-12, Y+2, z, COLORS.DARK_GREY); }
        
        // Building
        for(let y=1; y<=10; y++) {
            for(let x=-8; x<=8; x++) {
                for(let z=-6; z<=6; z++) {
                    if (x===-8 || x===8 || z===-6 || z===6) {
                        if (z===6 && x>=-1 && x<=1 && y<=3) add(x, Y+y, z, COLORS.GLASS); // Door
                        else if (y===5 || y===9) add(x, Y+y, z, COLORS.BLUE); // Blue stripes
                        else if (y%2===0 && x%3===0 && y<9) add(x, Y+y, z, COLORS.GLASS); // Windows
                        else add(x, Y+y, z, COLORS.WHITE);
                    }
                }
            }
        }
        // Helipad on roof
        for(let x=-9; x<=9; x++) for(let z=-7; z<=7; z++) add(x, Y+11, z, COLORS.DARK_GREY);
        for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) add(x, Y+12, z, COLORS.GREY);
        add(-2, Y+12, 0, COLORS.WHITE); add(-1, Y+12, 0, COLORS.WHITE); add(0, Y+12, 0, COLORS.WHITE); add(1, Y+12, 0, COLORS.WHITE); add(2, Y+12, 0, COLORS.WHITE); // H
        add(-2, Y+12, -2, COLORS.WHITE); add(-2, Y+12, -1, COLORS.WHITE); add(-2, Y+12, 1, COLORS.WHITE); add(-2, Y+12, 2, COLORS.WHITE);
        add(2, Y+12, -2, COLORS.WHITE); add(2, Y+12, -1, COLORS.WHITE); add(2, Y+12, 1, COLORS.WHITE); add(2, Y+12, 2, COLORS.WHITE);
        // Helicopter
        for(let x=-1; x<=1; x++) for(let z=-1; z<=3; z++) add(x, Y+14, z, COLORS.BLACK);
        add(0, Y+14, 4, COLORS.BLACK); add(0, Y+15, 4, COLORS.BLACK); // Tail
        for(let x=-3; x<=3; x++) add(x, Y+15, 1, COLORS.DARK_GREY); // Blades
        for(let z=-2; z<=4; z++) add(0, Y+15, z, COLORS.DARK_GREY);
        
        // Antennas
        for(let y=12; y<=18; y++) add(7, Y+y, -5, COLORS.BLACK);
        add(7, Y+19, -5, COLORS.RED); // Blinking light
        
        // Police Cruiser
        for(let x=-10; x<=-8; x++) for(let z=3; z<=7; z++) for(let y=1; y<=3; y++) {
            if (y===1) add(x, Y+y, z, COLORS.BLACK);
            else if (y===3 && (z===4 || z===6)) add(x, Y+y, z, COLORS.GLASS);
            else if (y===2 && z%2===0) add(x, Y+y, z, COLORS.WHITE);
            else add(x, Y+y, z, COLORS.BLACK);
        }
        add(-9, Y+4, 5, COLORS.BLUE); add(-9, Y+4, 6, COLORS.RED); // Sirens
        
        return Array.from(map.values());
    },

    Hospital: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => map.set(`${x},${y},${z}`, { x, y, z, color: c });
        // Base & Grounds
        for(let x=-12; x<=12; x++) for(let z=-10; z<=10; z++) {
            if (x > 5 && z > 0) add(x, Y, z, COLORS.GREEN); // Healing garden
            else if (x < -5 && z > 0) add(x, Y, z, COLORS.DARK_GREY); // Ambulance bay
            else add(x, Y, z, COLORS.GREY);
        }
        // Trees in garden
        for(let x of [8, 10]) for(let z of [4, 8]) {
            for(let y=1; y<=3; y++) add(x, Y+y, z, COLORS.WOOD);
            for(let dx=-1; dx<=1; dx++) for(let dz=-1; dz<=1; dz++) add(x+dx, Y+4, z+dz, COLORS.GREEN);
        }
        // Main Tower
        for(let y=1; y<=14; y++) {
            for(let x=-4; x<=4; x++) {
                for(let z=-4; z<=4; z++) {
                    if (x===-4 || x===4 || z===-4 || z===4) {
                        if (y%3!==0 && x%2===0) add(x, Y+y, z, COLORS.GLASS);
                        else add(x, Y+y, z, COLORS.WHITE);
                    }
                }
            }
        }
        // Wings
        for(let y=1; y<=6; y++) {
            for(let x=-10; x<=10; x++) {
                for(let z=-2; z<=2; z++) {
                    if (Math.abs(x) > 4) {
                        if (x===-10 || x===10 || z===-2 || z===2) {
                            if (y%2===0 && x%2===0) add(x, Y+y, z, COLORS.GLASS);
                            else add(x, Y+y, z, COLORS.WHITE);
                        }
                    }
                }
            }
        }
        // Main Entrance
        for(let x=-3; x<=3; x++) for(let z=4; z<=7; z++) for(let y=1; y<=4; y++) {
            if (y===4) add(x, Y+y, z, COLORS.WHITE);
            else if (x===-3 || x===3 || z===7) {
                if (z===7 && x>=-1 && x<=1) add(x, Y+y, z, COLORS.GLASS); // Doors
                else if (x%2===0) add(x, Y+y, z, COLORS.GLASS);
                else add(x, Y+y, z, COLORS.WHITE);
            }
        }
        // ER Entrance Canopy (Left)
        for(let x=-10; x<=-6; x++) for(let z=3; z<=6; z++) {
            add(x, Y+4, z, COLORS.WHITE);
            if ((x===-10 || x===-6) && z===6) for(let y=1; y<=3; y++) add(x, Y+y, z, COLORS.WHITE); // Pillars
        }
        // Red Cross on Tower
        add(0, Y+12, 5, COLORS.RED); add(0, Y+11, 5, COLORS.RED); add(0, Y+13, 5, COLORS.RED);
        add(-1, Y+12, 5, COLORS.RED); add(1, Y+12, 5, COLORS.RED);
        
        // Helipad on Tower
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) add(x, Y+15, z, COLORS.DARK_GREY);
        add(-1, Y+15, 0, COLORS.WHITE); add(0, Y+15, 0, COLORS.WHITE); add(1, Y+15, 0, COLORS.WHITE); // H
        add(-1, Y+15, -1, COLORS.WHITE); add(-1, Y+15, 1, COLORS.WHITE);
        add(1, Y+15, -1, COLORS.WHITE); add(1, Y+15, 1, COLORS.WHITE);
        
        // Helicopter
        for(let x=-1; x<=1; x++) for(let z=-1; z<=2; z++) add(x, Y+16, z, COLORS.RED);
        add(0, Y+16, 3, COLORS.RED); add(0, Y+17, 3, COLORS.RED); // Tail
        for(let x=-3; x<=3; x++) add(x, Y+17, 0, COLORS.DARK_GREY); // Blades
        for(let z=-3; z<=3; z++) add(0, Y+17, z, COLORS.DARK_GREY);
        
        // Ambulance
        for(let x=-9; x<=-6; x++) for(let z=3; z<=6; z++) for(let y=1; y<=3; y++) {
            if (y===1) add(x, Y+y, z, COLORS.BLACK);
            else if (y===3 && z===6) add(x, Y+y, z, COLORS.GLASS);
            else add(x, Y+y, z, COLORS.WHITE);
        }
        add(-9, Y+2, 4, COLORS.RED); add(-6, Y+2, 4, COLORS.RED); // Cross on side
        add(-8, Y+4, 4, COLORS.RED); add(-7, Y+4, 4, COLORS.BLUE); // Lights
        
        return Array.from(map.values());
    },

    School: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => map.set(`${x},${y},${z}`, { x, y, z, color: c });
        // Base & Playground
        for(let x=-12; x<=12; x++) for(let z=-10; z<=10; z++) {
            if (x > 0 && z < -2) add(x, Y, z, COLORS.GREEN); // Grass
            else if (x > 2 && z > 2) add(x, Y, z, COLORS.DARK_GREY); // Basketball court
            else add(x, Y, z, COLORS.GREY);
        }
        // Basketball Court Lines & Hoops
        for(let x=4; x<=10; x++) { add(x, Y+1, 4, COLORS.WHITE); add(x, Y+1, 8, COLORS.WHITE); }
        for(let z=4; z<=8; z++) { add(4, Y+1, z, COLORS.WHITE); add(10, Y+1, z, COLORS.WHITE); add(7, Y+1, z, COLORS.WHITE); }
        for(let y=1; y<=3; y++) { add(4, Y+y, 6, COLORS.GREY); add(10, Y+y, 6, COLORS.GREY); } // Poles
        add(4, Y+3, 6, COLORS.WHITE); add(10, Y+3, 6, COLORS.WHITE); // Backboards
        
        // Playground
        add(8, Y+1, -6, COLORS.WOOD); add(8, Y+2, -6, COLORS.WOOD); add(8, Y+3, -6, COLORS.WOOD); // Slide ladder
        add(7, Y+3, -6, COLORS.RED); add(6, Y+2, -6, COLORS.RED); add(5, Y+1, -6, COLORS.RED); // Slide
        
        // Flagpole
        for(let y=1; y<=6; y++) add(-2, Y+y, 4, COLORS.WHITE);
        add(-1, Y+5, 4, COLORS.BLUE); add(0, Y+5, 4, COLORS.RED); add(1, Y+5, 4, COLORS.WHITE);
        
        // L-Shape Building
        for(let y=1; y<=5; y++) {
            for(let x=-10; x<=0; x++) {
                for(let z=-8; z<=8; z++) {
                    if (z >= 2 || x <= -4) { // L-shape
                        if (x===-10 || x===0 || z===-8 || z===8 || (z===1 && x>-4) || (x===-3 && z<2)) {
                            if (z===8 && x===-2 && y<=3) add(x, Y+y, z, COLORS.GLASS); // Main Doors
                            else if (y===2 && x%3===0) add(x, Y+y, z, COLORS.GLASS); // Windows
                            else if (y===4 && z%3===0) add(x, Y+y, z, COLORS.GLASS); // Windows
                            else add(x, Y+y, z, COLORS.RED); // Brick
                        }
                    }
                }
            }
        }
        // Roof
        for(let x=-11; x<=1; x++) for(let z=-9; z<=9; z++) {
            if (z >= 1 || x <= -3) add(x, Y+6, z, COLORS.DARK_GREY);
        }
        
        // School Bus
        for(let x=-8; x<=-2; x++) for(let z=-5; z<=-3; z++) for(let y=1; y<=4; y++) {
            if (y===1) add(x, Y+y, z, COLORS.BLACK);
            else if (y===3 && (x===-8 || x===-2 || z===-5 || z===-3)) add(x, Y+y, z, COLORS.GLASS);
            else add(x, Y+y, z, COLORS.GOLD); // Yellow bus
        }
        add(-8, Y+2, -4, COLORS.WHITE); // Headlights
        add(-2, Y+2, -4, COLORS.RED); // Taillights
        
        return Array.from(map.values());
    },

    Museum: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => map.set(`${x},${y},${z}`, { x, y, z, color: c });
        // Base Plaza
        for(let x=-12; x<=12; x++) for(let z=-10; z<=10; z++) add(x, Y, z, COLORS.GREY);
        // Banners
        for(let y=1; y<=5; y++) { add(-6, Y+y, 8, COLORS.RED); add(6, Y+y, 8, COLORS.BLUE); }
        // Lion Statues
        for(let x of [-4, 4]) {
            add(x, Y+1, 7, COLORS.WHITE); add(x, Y+2, 7, COLORS.WHITE);
            add(x, Y+2, 8, COLORS.WHITE); // Head
        }
        // Classical Building
        for(let y=1; y<=8; y++) {
            for(let x=-10; x<=10; x++) {
                for(let z=-6; z<=6; z++) {
                    if (x===-10 || x===10 || z===-6 || z===6) {
                        if (z===6 && x>=-2 && x<=2 && y<=4) add(x, Y+y, z, COLORS.WOOD); // Doors
                        else add(x, Y+y, z, COLORS.WHITE); // Marble
                    }
                }
            }
        }
        // Colonnade Front
        for(let x=-10; x<=10; x+=2) {
            for(let y=1; y<=8; y++) add(x, Y+y, 9, COLORS.WHITE);
        }
        // Roof over colonnade
        for(let x=-11; x<=11; x++) for(let z=7; z<=9; z++) add(x, Y+9, z, COLORS.WHITE);
        // Main Roof
        for(let x=-11; x<=11; x++) for(let z=-7; z<=6; z++) add(x, Y+9, z, COLORS.DARK_GREY);
        // Glass Pyramid Extension (Back)
        for(let y=1; y<=5; y++) {
            const r = 6 - y;
            for(let x=-r; x<=r; x++) for(let z=-r; z<=r; z++) {
                if (x===-r || x===r || z===-r || z===r) add(x, Y+y, z-10, COLORS.GLASS);
            }
        }
        // Dinosaur skeleton inside (visible if you look)
        add(0, Y+2, 1, COLORS.WHITE); add(1, Y+2, 1, COLORS.WHITE); add(-1, Y+2, 1, COLORS.WHITE);
        add(0, Y+3, 1, COLORS.WHITE); add(2, Y+4, 1, COLORS.WHITE); // Head
        add(-2, Y+2, 1, COLORS.WHITE); // Tail
        // Gem Display
        add(-5, Y+1, 0, COLORS.DARK_GREY); add(-5, Y+2, 0, COLORS.GLASS); add(-5, Y+1.5, 0, COLORS.BLUE);
        // Modern Art
        add(5, Y+1, 0, COLORS.RED); add(5, Y+2, 1, COLORS.GOLD); add(6, Y+3, 0, COLORS.BLUE);
        return Array.from(map.values());
    },

    PostOffice: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => map.set(`${x},${y},${z}`, { x, y, z, color: c });
        // Base & Grounds
        for(let x=-12; x<=12; x++) for(let z=-10; z<=10; z++) {
            if (x < -4 && z < 0) add(x, Y, z, COLORS.DARK_GREY); // Loading dock area
            else add(x, Y, z, COLORS.GREY);
        }
        // Building
        for(let y=1; y<=6; y++) {
            for(let x=-8; x<=8; x++) {
                for(let z=-5; z<=5; z++) {
                    if (x===-8 || x===8 || z===-5 || z===5) {
                        if (z===5 && x>=-1 && x<=1 && y<=3) add(x, Y+y, z, COLORS.GLASS); // Front Door
                        else if (z===-5 && x>=-5 && x<=-1 && y<=4) add(x, Y+y, z, COLORS.DARK_GREY); // Loading dock door
                        else if (y===3 && x%3===0 && z===5) add(x, Y+y, z, COLORS.GLASS); // Front windows
                        else add(x, Y+y, z, COLORS.WHITE);
                    }
                }
            }
        }
        // Blue trim
        for(let x=-8; x<=8; x++) { add(x, Y+6, 5, COLORS.BLUE); add(x, Y+6, -5, COLORS.BLUE); }
        for(let z=-5; z<=5; z++) { add(-8, Y+6, z, COLORS.BLUE); add(8, Y+6, z, COLORS.BLUE); }
        // Roof
        for(let x=-9; x<=9; x++) for(let z=-6; z<=6; z++) add(x, Y+7, z, COLORS.DARK_GREY);
        
        // Mailboxes outside
        add(3, Y+1, 6, COLORS.BLUE); add(3, Y+2, 6, COLORS.BLUE); add(3, Y+2, 6.5, COLORS.WHITE);
        add(5, Y+1, 6, COLORS.BLUE); add(5, Y+2, 6, COLORS.BLUE); add(5, Y+2, 6.5, COLORS.WHITE);
        
        // Flagpole
        for(let y=1; y<=6; y++) add(-5, Y+y, 6, COLORS.WHITE);
        add(-4, Y+5, 6, COLORS.BLUE); add(-3, Y+5, 6, COLORS.RED); add(-2, Y+5, 6, COLORS.WHITE);
        
        // Mail Truck 1 (Loading dock)
        for(let x=-5; x<=-2; x++) for(let z=-9; z<=-6; z++) for(let y=1; y<=4; y++) {
            if (y===1) add(x, Y+y, z, COLORS.BLACK);
            else if (y===3 && z===-6) add(x, Y+y, z, COLORS.GLASS);
            else add(x, Y+y, z, COLORS.WHITE);
        }
        add(-5, Y+3, -8, COLORS.BLUE); add(-5, Y+3, -7, COLORS.BLUE); // Logo stripe
        
        // Mail Truck 2 (Parked front)
        for(let x=6; x<=9; x++) for(let z=7; z<=10; z++) for(let y=1; y<=4; y++) {
            if (y===1) add(x, Y+y, z, COLORS.BLACK);
            else if (y===3 && z===7) add(x, Y+y, z, COLORS.GLASS);
            else add(x, Y+y, z, COLORS.WHITE);
        }
        add(6, Y+3, 8, COLORS.BLUE); add(6, Y+3, 9, COLORS.BLUE); // Logo stripe
        
        return Array.from(map.values());
    },

    Courthouse: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => map.set(`${x},${y},${z}`, { x, y, z, color: c });
        // Base Plaza
        for(let x=-12; x<=12; x++) for(let z=-10; z<=10; z++) add(x, Y, z, COLORS.GREY);
        // Benches
        for(let x of [-8, 8]) {
            add(x, Y+1, 8, COLORS.WOOD); add(x+1, Y+1, 8, COLORS.WOOD);
            add(x, Y+1, 9, COLORS.WOOD); add(x+1, Y+1, 9, COLORS.WOOD);
        }
        // Steps
        for(let y=1; y<=3; y++) for(let x=-6; x<=6; x++) for(let z=5+y; z<=8; z++) add(x, Y+y, z, COLORS.GREY);
        // Building
        for(let y=1; y<=10; y++) {
            for(let x=-9; x<=9; x++) {
                for(let z=-5; z<=5; z++) {
                    if (x===-9 || x===9 || z===-5 || z===5) {
                        if (z===5 && x>=-1 && x<=1 && y<=5) add(x, Y+y, z, COLORS.WOOD); // Grand Door
                        else if (y>3 && y<8 && x%3===0) add(x, Y+y, z, COLORS.GLASS); // Windows
                        else add(x, Y+y, z, COLORS.WHITE); // Stone
                    }
                }
            }
        }
        // Grand Pillars
        for(let x=-7; x<=7; x+=2) {
            add(x, Y+4, 6, COLORS.GREY); // Base
            for(let y=5; y<=9; y++) add(x, Y+y, 6, COLORS.WHITE); // Shaft
            add(x, Y+10, 6, COLORS.GREY); // Capital
        }
        // Pediment
        for(let y=0; y<=4; y++) for(let x=-8+y*2; x<=8-y*2; x++) for(let z=5; z<=7; z++) add(x, Y+11+y, z, COLORS.WHITE);
        // Roof
        for(let x=-10; x<=10; x++) for(let z=-6; z<=6; z++) add(x, Y+11, z, COLORS.DARK_GREY);
        // Cupola/Dome
        for(let y=1; y<=3; y++) for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) {
            if (x===-3 || x===3 || z===-3 || z===3) add(x, Y+11+y, z, COLORS.WHITE);
        }
        for(let y=0; y<=3; y++) {
            const r = 3 - y*0.8;
            for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) {
                if (x*x + z*z <= r*r) add(x, Y+14+y, z, COLORS.GOLD);
            }
        }
        // Statue of Lady Justice (simplified)
        add(0, Y+18, 0, COLORS.GOLD); add(0, Y+19, 0, COLORS.GOLD);
        add(-1, Y+18, 0, COLORS.GOLD); add(1, Y+18, 0, COLORS.GOLD); // Scales arms
        
        return Array.from(map.values());
    },

    TrainStation: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x: number, y: number, z: number, c: number) => map.set(`${x},${y},${z}`, { x, y, z, color: c });
        // Base
        for(let x=-14; x<=14; x++) for(let z=-10; z<=10; z++) add(x, Y, z, COLORS.GREY);
        // Tracks (2 sets)
        for(let x=-14; x<=14; x++) {
            add(x, Y+1, -8, COLORS.DARK_GREY); add(x, Y+1, -6, COLORS.DARK_GREY);
            if (x%2===0) add(x, Y+1, -7, COLORS.WOOD); // Ties
            add(x, Y+1, -4, COLORS.DARK_GREY); add(x, Y+1, -2, COLORS.DARK_GREY);
            if (x%2===0) add(x, Y+1, -3, COLORS.WOOD); // Ties
        }
        // Platform
        for(let x=-12; x<=12; x++) for(let z=-1; z<=3; z++) add(x, Y+1, z, COLORS.GREY);
        // Platform Benches & Luggage
        for(let x of [-8, -4, 4, 8]) {
            add(x, Y+2, 1, COLORS.WOOD); add(x+1, Y+2, 1, COLORS.WOOD); // Bench
        }
        add(-6, Y+2, 2, COLORS.RED); add(-6, Y+3, 2, COLORS.RED); // Luggage
        add(6, Y+2, 2, COLORS.BLUE); // Luggage
        
        // Station Building
        for(let y=1; y<=7; y++) {
            for(let x=-8; x<=8; x++) {
                for(let z=4; z<=9; z++) {
                    if (x===-8 || x===8 || z===4 || z===9) {
                        if (z===4 && x>=-2 && x<=2 && y<=4) add(x, Y+y, z, COLORS.GLASS); // Doors to platform
                        else if (z===9 && x>=-2 && x<=2 && y<=4) add(x, Y+y, z, COLORS.GLASS); // Street doors
                        else if (y===3 || y===6) add(x, Y+y, z, COLORS.WHITE); // Trim
                        else if (y>2 && y<6 && x%3===0) add(x, Y+y, z, COLORS.GLASS); // Windows
                        else add(x, Y+y, z, COLORS.RED); // Brick
                    }
                }
            }
        }
        // Ticket Booth (Inside visible through doors)
        for(let x=-5; x<=-3; x++) for(let z=6; z<=7; z++) for(let y=1; y<=3; y++) {
            if (y===3) add(x, Y+y, z, COLORS.GLASS);
            else add(x, Y+y, z, COLORS.WOOD);
        }
        
        // Platform Canopy
        for(let x=-11; x<=11; x+=4) for(let y=2; y<=5; y++) add(x, Y+y, 1, COLORS.DARK_GREY); // Pillars
        for(let x=-12; x<=12; x++) for(let z=-1; z<=3; z++) add(x, Y+6, z, COLORS.DARK_GREY); // Canopy roof
        
        // Grand Arched Roof over main building
        for(let x=-9; x<=9; x++) for(let z=3; z<=10; z++) add(x, Y+8, z, COLORS.DARK_GREY);
        for(let x=-7; x<=7; x++) for(let z=4; z<=9; z++) add(x, Y+9, z, COLORS.DARK_GREY);
        for(let x=-5; x<=5; x++) for(let z=5; z<=8; z++) add(x, Y+10, z, COLORS.GLASS); // Skylight
        
        // Clock
        add(0, Y+8, 4, COLORS.WHITE); add(0, Y+8, 3.9, COLORS.BLACK);
        add(0, Y+8, 9, COLORS.WHITE); add(0, Y+8, 9.1, COLORS.BLACK);
        
        // Train on back track
        for(let x=-10; x<=10; x++) for(let z=-8; z<=-6; z++) for(let y=2; y<=5; y++) {
            if (x===10 && y>2 && y<5) add(x, Y+y, z, COLORS.GLASS); // Front window
            else if (y===4 && x%3===0) add(x, Y+y, z, COLORS.GLASS); // Side windows
            else if (y===2) add(x, Y+y, z, COLORS.BLACK); // Base
            else add(x, Y+y, z, COLORS.BLUE); // Train body
        }
        add(9, Y+6, -7, COLORS.BLACK); // Exhaust/detail
        
        return Array.from(map.values());
    }
};
