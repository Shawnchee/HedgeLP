"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Shield, Droplets } from "lucide-react";

interface AllocationDonutProps {
    lpPercent: number;
    onChange: (lpPercent: number) => void;
    size?: number;
    disabled?: boolean;
}

export function AllocationDonut({ 
    lpPercent, 
    onChange, 
    size = 220,
    disabled = false 
}: AllocationDonutProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    const hedgePercent = 100 - lpPercent;
    
    // Layout Calculations
    const strokeWidth = size * 0.1; // Thinner, cleaner stroke
    const padding = 20; // Padding to prevent clipping of handle/shadows
    const width = size;
    const height = size / 2 + padding; // Height for semi-circle + padding
    
    // Radius fits within the padded area
    const radius = (width - padding * 2) / 2;
    const centerX = width / 2;
    const centerY = height - padding/2; // Base of the semi-circle

    // Convert percentage to angle (0% = -180deg, 100% = 0deg)
    const percentToAngle = (percent: number) => {
        return -180 + (percent / 100) * 180;
    };

    // Convert angle to percentage
    const angleToPercent = (angle: number) => {
        // Clamp angle between -180 and 0
        const clampedAngle = Math.max(-180, Math.min(0, angle));
        return ((clampedAngle + 180) / 180) * 100;
    };

    // Get point on arc from angle
    const getPointOnArc = (angleDeg: number) => {
        const angleRad = (angleDeg * Math.PI) / 180;
        return {
            x: centerX + radius * Math.cos(angleRad),
            y: centerY + radius * Math.sin(angleRad),
        };
    };

    // Create arc path
    const createArcPath = (startAngle: number, endAngle: number) => {
        const start = getPointOnArc(startAngle);
        const end = getPointOnArc(endAngle);
        const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
        const sweepFlag = endAngle > startAngle ? 1 : 0;
        
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
    };

    const lpAngle = percentToAngle(lpPercent);
    const handlePoint = getPointOnArc(lpAngle);

    // Handle drag
    const handleDrag = useCallback((clientX: number, clientY: number) => {
        if (!svgRef.current || disabled) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = clientX - rect.left - centerX;
        const y = clientY - rect.top - centerY;

        // Calculate angle from center
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        
        // Clamp to upper half (-180 to 0)
        if (angle > 0) angle = 0;
        if (angle < -180) angle = -180;

        const newPercent = Math.round(angleToPercent(angle));
        // Clamp between 50% and 100% LP (0-50% hedge)
        const clampedPercent = Math.max(50, Math.min(100, newPercent));
        onChange(clampedPercent);
    }, [centerX, centerY, onChange, disabled]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled) return;
        setIsDragging(true);
        handleDrag(e.clientX, e.clientY);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            handleDrag(e.clientX, e.clientY);
        }
    }, [isDragging, handleDrag]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled) return;
        setIsDragging(true);
        handleDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (isDragging) {
            handleDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, [isDragging, handleDrag]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("touchmove", handleTouchMove);
            window.addEventListener("touchend", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

    return (
        <div className="flex flex-col items-center">
            <div 
                className="relative" 
                style={{ width, height }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <svg
                    ref={svgRef}
                    width={width}
                    height={height}
                    className={`${disabled ? "opacity-50" : "cursor-pointer"} select-none`}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <filter id="handleShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
                        </filter>
                    </defs>

                    {/* Background track (Full semi-circle) */}
                    <path
                        d={createArcPath(-180, 0)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className="text-secondary/20"
                    />

                    {/* LP portion (Pink) */}
                    <path
                        d={createArcPath(-180, lpAngle)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-75"
                        style={{ filter: "url(#glow)" }}
                    />

                    {/* Hedge portion (Green) */}
                    {hedgePercent > 0 && (
                        <path
                            d={createArcPath(lpAngle, 0)}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            className="text-success transition-all duration-75"
                        />
                    )}

                    {/* Handle */}
                    <g 
                        className="transition-transform duration-100 ease-out" 
                        style={{ 
                            transform: `translate(${handlePoint.x}px, ${handlePoint.y}px) scale(${isDragging || isHovering ? 1.1 : 1})` 
                        }}
                    >
                        {/* Simple White Dot Handle */}
                        <circle
                            r={strokeWidth * 0.4}
                            fill="white"
                            className="drop-shadow-lg"
                        />
                    </g>

                    {/* Labels */}
                    <text
                        x={centerX - radius - padding}
                        y={centerY + 20}
                        className="text-[10px] font-bold fill-secondary-foreground uppercase tracking-wider"
                        textAnchor="middle"
                    >
                        100% LP
                    </text>
                    <text
                        x={centerX}
                        y={centerY - radius - 15}
                        className="text-[10px] font-bold fill-secondary-foreground uppercase tracking-wider"
                        textAnchor="middle"
                    >
                        50/50
                    </text>
                    <text
                        x={centerX + radius + padding}
                        y={centerY + 20}
                        className="text-[10px] font-bold fill-secondary-foreground uppercase tracking-wider"
                        textAnchor="middle"
                    >
                        100% Hedge
                    </text>
                </svg>

                {/* Center Value */}
                <div 
                    className="absolute left-1/2 bottom-0 -translate-x-1/2 text-center pointer-events-none"
                    style={{ bottom: padding }}
                >
                    <div className="text-[10px] text-secondary-foreground font-bold uppercase tracking-widest mb-1">
                        Current Split
                    </div>
                </div>
            </div>

            {/* Value display cards */}
            <div className="flex items-center justify-center gap-4 mt-2 w-full max-w-[300px]">
                <div 
                    className={`flex-1 p-3 rounded-xl border transition-colors ${
                        lpPercent > 50 ? "bg-primary/5 border-primary/20" : "bg-card"
                    }`}
                >
                    <div className="flex items-center gap-2 justify-center mb-1">
                        <Droplets className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-secondary-foreground uppercase tracking-wider">LP</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-primary text-center">{lpPercent}%</div>
                </div>
                
                <div 
                    className={`flex-1 p-3 rounded-xl border transition-colors ${
                        hedgePercent > 0 ? "bg-success/5 border-success/20" : "bg-card"
                    }`}
                >
                    <div className="flex items-center gap-2 justify-center mb-1">
                        <Shield className="w-4 h-4 text-success" />
                        <span className="text-xs font-bold text-secondary-foreground uppercase tracking-wider">Hedge</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-success text-center">{hedgePercent}%</div>
                </div>
            </div>
        </div>
    );
}
