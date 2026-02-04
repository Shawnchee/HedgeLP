"use client";

import { useMemo } from "react";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
} from "recharts";

interface CompoundingChartProps {
    investment: number;
    days: number;
    dailyYield: number; // Daily yield rate (e.g., 0.001 for 0.1% daily)
    showCompound: boolean;
    showNonCompound: boolean;
}

export function CompoundingChart({
    investment,
    days,
    dailyYield,
    showCompound,
    showNonCompound,
}: CompoundingChartProps) {
    const data = useMemo(() => {
        const points: Array<{
            day: number;
            compound: number;
            simple: number;
            label: string;
        }> = [];

        // Generate data points (max 50 points for performance)
        const step = Math.max(1, Math.floor(days / 50));
        
        for (let day = 0; day <= days; day += step) {
            // Compound: P * (1 + r)^n
            const compound = investment * Math.pow(1 + dailyYield, day);
            
            // Simple: P * (1 + r * n)
            const simple = investment * (1 + dailyYield * day);

            points.push({
                day,
                compound: Math.round(compound * 100) / 100,
                simple: Math.round(simple * 100) / 100,
                label: day === 0 ? "Start" : `Day ${day}`,
            });
        }

        // Ensure last day is included
        if (points[points.length - 1]?.day !== days) {
            const compound = investment * Math.pow(1 + dailyYield, days);
            const simple = investment * (1 + dailyYield * days);
            points.push({
                day: days,
                compound: Math.round(compound * 100) / 100,
                simple: Math.round(simple * 100) / 100,
                label: `Day ${days}`,
            });
        }

        return points;
    }, [investment, days, dailyYield]);

    const finalCompound = data[data.length - 1]?.compound || investment;
    const finalSimple = data[data.length - 1]?.simple || investment;
    const compoundBonus = finalCompound - finalSimple;
    const compoundBonusPercent = ((compoundBonus / investment) * 100).toFixed(2);

    return (
        <div className="w-full">
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="compoundGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FF007A" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#FF007A" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="simpleGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#98A1C0" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#98A1C0" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="day" 
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => value === 0 ? "0" : `${value}d`}
                            stroke="currentColor"
                            className="text-secondary-foreground"
                        />
                        <YAxis 
                            hide 
                            domain={['dataMin - 100', 'dataMax + 100']}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-popover border p-3 rounded-xl shadow-xl">
                                            <p className="text-xs text-secondary-foreground mb-2">
                                                Day {payload[0]?.payload?.day}
                                            </p>
                                            {showCompound && (
                                                <p className="text-sm font-mono">
                                                    <span className="text-primary">Compound:</span>{" "}
                                                    <span className="font-bold">${payload[0]?.value?.toLocaleString()}</span>
                                                </p>
                                            )}
                                            {showNonCompound && (
                                                <p className="text-sm font-mono">
                                                    <span className="text-secondary-foreground">Simple:</span>{" "}
                                                    <span className="font-bold">${payload[1]?.value?.toLocaleString()}</span>
                                                </p>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        {showCompound && (
                            <Area
                                type="monotone"
                                dataKey="compound"
                                stroke="#FF007A"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#compoundGradient)"
                                name="Compound"
                            />
                        )}
                        {showNonCompound && (
                            <Area
                                type="monotone"
                                dataKey="simple"
                                stroke="#98A1C0"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                fillOpacity={1}
                                fill="url(#simpleGradient)"
                                name="Simple"
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-2">
                {showCompound && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="text-xs font-medium">Compound: ${finalCompound.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                )}
                {showNonCompound && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-secondary-foreground" />
                        <span className="text-xs font-medium">Simple: ${finalSimple.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                )}
            </div>

            {/* Compound bonus */}
            {showCompound && showNonCompound && compoundBonus > 0 && (
                <div className="text-center mt-2">
                    <span className="text-xs text-primary font-bold">
                        +${compoundBonus.toFixed(0)} compound bonus ({compoundBonusPercent}% extra)
                    </span>
                </div>
            )}
        </div>
    );
}
