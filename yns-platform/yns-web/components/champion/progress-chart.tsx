"use client";

import { Card } from "@/components/ui/card";
import type { ProgressPoint } from "@/types/champion";

interface ProgressChartProps {
  data: ProgressPoint[];
}

// Chart geometry (uses a fixed viewBox; SVG scales responsively to width).
const WIDTH = 720;
const HEIGHT = 240;
const PADDING = { top: 24, right: 24, bottom: 36, left: 40 };
const Y_MIN = 0;
const Y_MAX = 100;
const Y_TICKS = [0, 25, 50, 75, 100];

export function ProgressChart({ data }: ProgressChartProps) {
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const xFor = (i: number) =>
    PADDING.left +
    (data.length <= 1 ? innerW / 2 : (innerW * i) / (data.length - 1));

  const yFor = (score: number) =>
    PADDING.top + innerH - (innerH * (score - Y_MIN)) / (Y_MAX - Y_MIN);

  const linePath = data
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.score)}`)
    .join(" ");

  const areaPath =
    data.length > 0
      ? `${linePath} L ${xFor(data.length - 1)} ${
          PADDING.top + innerH
        } L ${xFor(0)} ${PADDING.top + innerH} Z`
      : "";

  return (
    <Card>
      <div className="p-5">
        <h2 className="mb-1 text-sm font-bold text-brand">Interview Progress</h2>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full min-w-[480px]"
            role="img"
            aria-label="Line chart of interview scores over time"
          >
            <defs>
              <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7a1e2e" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#7a1e2e" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Y axis gridlines + labels */}
            {Y_TICKS.map((tick) => {
              const y = yFor(tick);
              return (
                <g key={tick}>
                  <line
                    x1={PADDING.left}
                    y1={y}
                    x2={WIDTH - PADDING.right}
                    y2={y}
                    stroke="#eef0f3"
                    strokeWidth={1}
                  />
                  <text
                    x={PADDING.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-gray-400"
                    fontSize={11}
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Y axis title */}
            <text
              x={14}
              y={PADDING.top + innerH / 2}
              textAnchor="middle"
              transform={`rotate(-90 14 ${PADDING.top + innerH / 2})`}
              className="fill-gray-400"
              fontSize={11}
            >
              Score %
            </text>

            {/* Area + line */}
            {areaPath && <path d={areaPath} fill="url(#progressFill)" />}
            <path
              d={linePath}
              fill="none"
              stroke="#7a1e2e"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Data points + value labels + x labels */}
            {data.map((p, i) => (
              <g key={p.date}>
                <circle
                  cx={xFor(i)}
                  cy={yFor(p.score)}
                  r={4}
                  fill="#7a1e2e"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <text
                  x={xFor(i)}
                  y={yFor(p.score) - 10}
                  textAnchor="middle"
                  className="fill-gray-600"
                  fontSize={11}
                  fontWeight={600}
                >
                  {p.score}%
                </text>
                <text
                  x={xFor(i)}
                  y={HEIGHT - 12}
                  textAnchor="middle"
                  className="fill-gray-400"
                  fontSize={11}
                >
                  {p.date}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </Card>
  );
}
