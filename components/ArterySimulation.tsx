import React, { useEffect, useState, useMemo } from 'react';
import { Stage } from '../types';

interface Props {
  stage: Stage;
}

const ArterySimulation: React.FC<Props> = ({ stage }) => {
  // Visual state derived from stage
  const [plaqueCompression, setPlaqueCompression] = useState(1); // 1 = full size, 0.2 = compressed
  const [clotOpacity, setClotOpacity] = useState(0);
  const [wireProgress, setWireProgress] = useState(0); // 0 to 400
  const [balloonInflation, setBalloonInflation] = useState(0); // 0 to 1
  const [stentExpansion, setStentExpansion] = useState(0); // 0 to 1
  const [flowSpeed, setFlowSpeed] = useState(3); 
  
  // Muscle (Myocardium) state
  const [muscleColor, setMuscleColor] = useState('#fda4af'); // pink-300 default
  const [isMuscleDying, setIsMuscleDying] = useState(false);

  useEffect(() => {
    switch (stage) {
      case Stage.HEALTHY:
        setPlaqueCompression(0); // No plaque
        setClotOpacity(0);
        setWireProgress(0);
        setBalloonInflation(0);
        setStentExpansion(0);
        setFlowSpeed(2);
        setMuscleColor('#fda4af');
        setIsMuscleDying(false);
        break;
      case Stage.ATHEROSCLEROSIS:
        setPlaqueCompression(0.75); // Narrow channel
        setClotOpacity(0);
        setWireProgress(0);
        setBalloonInflation(0);
        setStentExpansion(0);
        setFlowSpeed(2.5);
        setMuscleColor('#fda4af');
        setIsMuscleDying(false);
        break;
      case Stage.RUPTURE_THROMBOSIS:
        setPlaqueCompression(0.75);
        setClotOpacity(1);
        setWireProgress(0);
        setBalloonInflation(0);
        setStentExpansion(0);
        setFlowSpeed(100); // Stopped
        setMuscleColor('#d8b4fe'); // Ischemic
        setIsMuscleDying(true);
        break;
      case Stage.NECROSIS:
        setPlaqueCompression(0.75);
        setClotOpacity(1);
        setWireProgress(0);
        setBalloonInflation(0);
        setStentExpansion(0);
        setFlowSpeed(100);
        setMuscleColor('#334155'); // Necrotic
        setIsMuscleDying(true);
        break;
      case Stage.GUIDEWIRE:
        setPlaqueCompression(0.75);
        setClotOpacity(0.8);
        setWireProgress(400);
        setBalloonInflation(0);
        setStentExpansion(0);
        setFlowSpeed(100);
        setMuscleColor('#475569');
        setIsMuscleDying(false);
        break;
      case Stage.BALLOON:
        // Pre-dilatation: Balloon inflates, no stent yet (or stent hidden for clarity of step)
        setPlaqueCompression(0.25); 
        setClotOpacity(0.2);
        setWireProgress(400);
        setBalloonInflation(1);
        setStentExpansion(0); 
        setFlowSpeed(100);
        setMuscleColor('#64748b');
        setIsMuscleDying(false);
        break;
      case Stage.STENT_DEPLOY:
        // Stent Implantation: Balloon expanded + Stent expanded
        setPlaqueCompression(0.25);
        setClotOpacity(0);
        setWireProgress(400);
        setBalloonInflation(1); // Balloon holds stent up
        setStentExpansion(1);   // Stent fully open
        setFlowSpeed(100);
        setMuscleColor('#94a3b8');
        setIsMuscleDying(false);
        break;
      case Stage.RESTORED:
        // Balloon removed, Stent stays
        setPlaqueCompression(0.25);
        setClotOpacity(0);
        setWireProgress(0);
        setBalloonInflation(0); // Balloon gone
        setStentExpansion(1);   // Stent remains
        setFlowSpeed(2); // Restored flow
        setMuscleColor('#cbd5e1');
        setIsMuscleDying(false);
        break;
    }
  }, [stage]);

  // Blood Cells constrained to center lumen
  const bloodCells = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      // Constrain Y to 70-130 to avoid walls (which are at 20-40 and 160-180)
      y: 70 + Math.random() * 60, 
      delay: Math.random() * 2,
      size: 3 + Math.random() * 4,
      speedVar: 0.8 + Math.random() * 0.4
    }));
  }, []);

  // --- Dynamic Geometry Generators ---

  // Generate Balloon Path (Tapered Cylinder)
  // Center (200, 100). Max Width ~80. Max Height ~100 (diameter).
  const getBalloonPath = (inflation: number) => {
    const w = 80; // Total width
    const h = 50 * inflation; // Half height (radius)
    const taper = 15; // Length of tapered end
    const cx = 200;
    const cy = 100;
    
    // If inflation is 0, return a flat line or tiny rect
    if (inflation < 0.05) return "";

    return `
      M ${cx - w/2},${cy} 
      L ${cx - w/2 + taper},${cy - h} 
      L ${cx + w/2 - taper},${cy - h} 
      L ${cx + w/2},${cy} 
      L ${cx + w/2 - taper},${cy + h} 
      L ${cx - w/2 + taper},${cy + h} 
      Z
    `;
  };

  // Generate Stent Path (ZigZag Mesh)
  const getStentPaths = (expansion: number) => {
    const cx = 200;
    const cy = 100;
    // When crimped (0): radius ~5px. When expanded (1): radius ~50px (diameter 100)
    const radius = 6 + (expansion * 44); 
    const width = 70; // Stent length
    const startX = cx - width/2;
    const segments = 8;
    const segWidth = width / segments;

    let path1 = ""; // Forward zigzag
    let path2 = ""; // Backward zigzag (to form diamond lattice)

    // We draw multiple longitudinal struts
    const struts = 5; // simplified 2D view struts (top, mid-top, mid, mid-bot, bot)
    // Actually, to look like a mesh tube, we draw zigzags across the length.
    
    // Let's draw 2 main zigzag lines representing the top and bottom profiles, 
    // and a mesh pattern in between.
    // Better: Draw the mesh as a single complex path.
    
    for (let i = 0; i < segments; i++) {
        const x0 = startX + i * segWidth;
        const x1 = x0 + segWidth/2;
        const x2 = x0 + segWidth;
        
        // Top edge strut
        path1 += ` M ${x0},${cy - radius} L ${x1},${cy - radius + (expansion * 5)} L ${x2},${cy - radius}`;
        // Bottom edge strut
        path1 += ` M ${x0},${cy + radius} L ${x1},${cy + radius - (expansion * 5)} L ${x2},${cy + radius}`;
        
        // Middle cross struts (creating the diamond look)
        if (expansion > 0.1) {
            path2 += ` M ${x0},${cy - radius} L ${x1},${cy} L ${x2},${cy - radius}`;
            path2 += ` M ${x0},${cy + radius} L ${x1},${cy} L ${x2},${cy + radius}`;
        }
    }

    return { path1, path2 };
  };

  const stentPaths = getStentPaths(stentExpansion);

  return (
    <div className="w-full h-full min-h-[300px] md:min-h-[400px] bg-slate-950 rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl flex flex-col">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <svg viewBox="0 0 400 250" className="w-full h-full max-w-[800px] preserve-3d">
            <defs>
                <linearGradient id="arteryWall" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#b91c1c" />
                    <stop offset="50%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                <clipPath id="lumenClip">
                   <rect x="0" y="40" width="400" height="120" />
                </clipPath>
                
                {/* Balloon 3D Effect */}
                <radialGradient id="balloonGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                    <stop offset="60%" stopColor="rgba(100,200,255,0.4)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                </radialGradient>
            </defs>

            {/* --- Layer 1: Myocardium (Background) --- */}
            <path 
                d="M0,180 Q200,185 400,180 L400,250 L0,250 Z" 
                fill={muscleColor}
                className="transition-colors duration-[2000ms] ease-in-out"
            />
            
            {/* --- Layer 2: Artery Walls (Outer Shell) --- */}
            <rect x="0" y="20" width="400" height="20" fill="url(#arteryWall)" />
            <rect x="0" y="160" width="400" height="20" fill="url(#arteryWall)" />

            {/* --- Layer 3: Plaque (Under Blood) --- */}
            {/* Top Plaque */}
            <g 
                className="transition-transform duration-1000 ease-in-out" 
                style={{ 
                    transformOrigin: '200px 40px', 
                    transform: `scaleY(${stage === Stage.HEALTHY ? 0 : plaqueCompression})`
                }}
            >
                <path d="M100,40 Q200,120 300,40 Z" fill="#facc15" stroke="#eab308" strokeWidth="1" />
            </g>
            {/* Bottom Plaque */}
            <g 
                className="transition-transform duration-1000 ease-in-out" 
                style={{ 
                    transformOrigin: '200px 160px', 
                    transform: `scaleY(${stage === Stage.HEALTHY ? 0 : plaqueCompression})`
                }}
            >
                <path d="M100,160 Q200,80 300,160 Z" fill="#facc15" stroke="#eab308" strokeWidth="1" />
            </g>

            {/* --- Layer 4: Blood Flow (Middle) --- */}
            {/* Z-index: Behind balloon/stent but in front of back plaque visually if we were 3D. 
                In 2D cutaway, blood flows through the gap. We put it BEHIND tools for clarity. */}
            <g clipPath="url(#lumenClip)">
                {bloodCells.map(cell => (
                    <circle 
                        key={cell.id}
                        cx="0" 
                        cy={cell.y} 
                        r={cell.size} 
                        fill="#ef4444" 
                        opacity="0.8"
                        className="animate-flow"
                        style={{ 
                            animationDuration: `${flowSpeed * cell.speedVar}s`, 
                            animationDelay: `-${cell.delay}s`,
                            display: (stage === Stage.RUPTURE_THROMBOSIS || stage === Stage.NECROSIS) && (cell.y > 90 && cell.y < 110) ? 'none' : 'block'
                        }}
                    />
                ))}
            </g>

            {/* --- Layer 5: Thrombus (Clot) --- */}
            <g className="transition-opacity duration-500" style={{ opacity: clotOpacity }}>
                <circle cx="200" cy="100" r="28" fill="#7f1d1d" filter="url(#glow)" />
                <path d="M180,90 L220,110 M180,110 L220,90" stroke="#991b1b" strokeWidth="2" opacity="0.5" />
                <circle cx="190" cy="95" r="10" fill="#991b1b" />
                <circle cx="210" cy="105" r="12" fill="#991b1b" />
            </g>

            {/* --- Layer 6: Guide Wire --- */}
            <line 
                x1="-10" y1="100" 
                x2={wireProgress} 
                y2="100" 
                stroke="#94a3b8" 
                strokeWidth="2" 
                className="transition-all duration-1000 ease-out"
                style={{ opacity: wireProgress > 0 ? 1 : 0 }}
            />

            {/* --- Layer 7: Balloon (Realistic) --- */}
            <g 
                 className="transition-all duration-1000 ease-in-out"
                 style={{ opacity: balloonInflation > 0 ? 1 : 0 }}
            >
                {/* Balloon Body with Gradient */}
                <path 
                    d={getBalloonPath(balloonInflation)} 
                    fill="url(#balloonGradient)" 
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth="1"
                />
                {/* Inner Highlighting for Plastic feel */}
                <path 
                    d={getBalloonPath(balloonInflation * 0.8)} 
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="0.5"
                />
            </g>

            {/* --- Layer 8: Stent (Realistic Mesh) --- */}
            <g 
                className="transition-all duration-1000 ease-in-out"
                style={{ 
                    opacity: (stentExpansion > 0 || stage === Stage.STENT_DEPLOY) ? 1 : 0,
                    filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.5))"
                }}
            >
                {/* Main Struts */}
                <path 
                    d={stentPaths.path1} 
                    fill="none" 
                    stroke="#cbd5e1" // Slate-300 (Silver)
                    strokeWidth={stentExpansion > 0.5 ? 2 : 3} // Thinner when expanded
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                 {/* Cross Struts (Diamond Mesh) */}
                 <path 
                    d={stentPaths.path2} 
                    fill="none" 
                    stroke="#94a3b8" // Slate-400 (Darker Silver)
                    strokeWidth={1.5} 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>

        </svg>

        {/* Overlay Labels */}
        <div className="absolute top-2 left-2 text-white/60 text-xs bg-black/30 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
            Просвет сосуда
        </div>
        
        <div className="absolute bottom-2 left-2 text-xs font-bold px-2 py-1 rounded backdrop-blur-sm transition-colors duration-500 pointer-events-none" style={{ color: stage === Stage.NECROSIS ? '#fff' : '#94a3b8', backgroundColor: stage === Stage.NECROSIS ? 'rgba(255,0,0,0.5)' : 'rgba(0,0,0,0.3)' }}>
            Миокард (Сердечная мышца)
        </div>
      
        {(stage === Stage.RUPTURE_THROMBOSIS || stage === Stage.NECROSIS) && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white bg-red-600/90 px-4 py-2 rounded-lg font-bold text-xl drop-shadow-md shadow-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse z-10 pointer-events-none">
                ТРОМБОЗ!
            </div>
        )}
        
        {isMuscleDying && (
             <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white font-bold text-sm bg-slate-900/80 px-3 py-1 rounded border border-red-500/50 animate-bounce pointer-events-none">
                ГИБЕЛЬ КЛЕТОК
             </div>
        )}
      </div>
    </div>
  );
};

export default ArterySimulation;