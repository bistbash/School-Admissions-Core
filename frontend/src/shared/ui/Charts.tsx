/**
 * Charts Components
 * 
 * Comprehensive charting library components for data analysis
 * Supports both Recharts and Chart.js with dark mode
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
} from 'recharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartJSTooltip,
  Legend as ChartJSLegend,
  Filler,
  RadialLinearScale,
} from 'chart.js';
import { Line as ChartJSLine, Bar as ChartJSBar, Pie as ChartJSPie, Doughnut as ChartJSDoughnut, Radar as ChartJSRadar } from 'react-chartjs-2';
import { useTheme } from '../components/ThemeContext';
import { cn } from '../lib/utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartJSTooltip,
  ChartJSLegend,
  Filler,
  RadialLinearScale
);

// Modern, professional color palettes for charts
const COLORS = {
  light: {
    primary: '#0F172A', // Slate-900
    secondary: '#64748B', // Slate-500
    accent: '#3B82F6', // Blue-500
    success: '#10B981', // Emerald-500
    warning: '#F59E0B', // Amber-500
    danger: '#EF4444', // Red-500
    info: '#06B6D4', // Cyan-500
    background: '#FFFFFF',
    grid: '#E2E8F0', // Slate-200
    tooltip: '#FFFFFF',
    tooltipBorder: '#E2E8F0',
  },
  dark: {
    primary: '#F1F5F9', // Slate-100
    secondary: '#94A3B8', // Slate-400
    accent: '#60A5FA', // Blue-400
    success: '#34D399', // Emerald-400
    warning: '#FBBF24', // Amber-400
    danger: '#F87171', // Red-400
    info: '#22D3EE', // Cyan-400
    background: '#0F172A', // Slate-900
    grid: '#1E293B', // Slate-800
    tooltip: '#1E293B', // Slate-800
    tooltipBorder: '#334155', // Slate-700
  },
};

// Modern gradient-friendly color palette
const CHART_COLORS = [
  '#3B82F6', // Blue - Primary
  '#10B981', // Emerald - Success
  '#F59E0B', // Amber - Warning
  '#EF4444', // Red - Danger
  '#8B5CF6', // Violet - Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];

// Helper function to generate gradient colors
const getGradientColor = (color: string, opacity: number = 0.1) => {
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Custom tooltip styling
const getTooltipStyle = (theme: 'light' | 'dark', colors: typeof COLORS.light) => ({
  backgroundColor: colors.tooltip,
  border: `1px solid ${colors.tooltipBorder}`,
  borderRadius: '12px',
  padding: '12px 16px',
  boxShadow: theme === 'dark' 
    ? '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
    : '0 10px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
  backdropFilter: 'blur(8px)',
});

// Base chart props
interface BaseChartProps {
  data: any[];
  className?: string;
  height?: number;
}

// Line Chart Component
export interface LineChartProps extends BaseChartProps {
  xKey: string;
  yKeys: { key: string; label: string; color?: string }[];
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

export function LineChartComponent({
  data,
  xKey,
  yKeys,
  className,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
}: LineChartProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];
  const themeMode = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.grid} 
              opacity={0.3}
              vertical={true}
              horizontal={true}
            />
          )}
          <XAxis 
            dataKey={xKey} 
            stroke={colors.secondary}
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: colors.grid, strokeWidth: 1 }}
            tickLine={{ stroke: colors.grid }}
          />
          <YAxis 
            stroke={colors.secondary}
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: colors.grid, strokeWidth: 1 }}
            tickLine={{ stroke: colors.grid }}
          />
          {showTooltip && (
            <Tooltip
              contentStyle={getTooltipStyle(themeMode, colors)}
              labelStyle={{ 
                color: colors.primary,
                fontWeight: 600,
                fontSize: 13,
                marginBottom: 8,
              }}
              itemStyle={{
                color: colors.secondary,
                fontSize: 12,
                padding: '4px 0',
              }}
              cursor={{ 
                stroke: colors.secondary, 
                strokeWidth: 1,
                strokeDasharray: '5 5',
                opacity: 0.3,
              }}
            />
          )}
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: 20 }}
              iconType="line"
              formatter={(value) => <span style={{ color: colors.secondary, fontSize: 12 }}>{value}</span>}
            />
          )}
          {yKeys.map((yKey, index) => {
            const color = yKey.color || CHART_COLORS[index % CHART_COLORS.length];
            return (
              <Line
                key={yKey.key}
                type="monotone"
                dataKey={yKey.key}
                name={yKey.label}
                stroke={color}
                strokeWidth={3}
                dot={{ 
                  r: 4, 
                  fill: color,
                  strokeWidth: 2,
                  stroke: colors.background,
                }}
                activeDot={{ 
                  r: 7, 
                  fill: color,
                  strokeWidth: 3,
                  stroke: colors.background,
                  style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' },
                }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Area Chart Component
export interface AreaChartProps extends BaseChartProps {
  xKey: string;
  yKeys: { key: string; label: string; color?: string }[];
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
}

export function AreaChartComponent({
  data,
  xKey,
  yKeys,
  className,
  height = 300,
  showGrid = true,
  showLegend = true,
  stacked = false,
}: AreaChartProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];
  const themeMode = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            {yKeys.map((yKey, index) => {
              const color = yKey.color || CHART_COLORS[index % CHART_COLORS.length];
              return (
                <linearGradient key={`gradient-${yKey.key}`} id={`gradient-${yKey.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              );
            })}
          </defs>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.grid} 
              opacity={0.3}
              vertical={true}
              horizontal={true}
            />
          )}
          <XAxis 
            dataKey={xKey} 
            stroke={colors.secondary}
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: colors.grid, strokeWidth: 1 }}
            tickLine={{ stroke: colors.grid }}
          />
          <YAxis 
            stroke={colors.secondary}
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: colors.grid, strokeWidth: 1 }}
            tickLine={{ stroke: colors.grid }}
          />
          <Tooltip
            contentStyle={getTooltipStyle(themeMode, colors)}
            labelStyle={{ 
              color: colors.primary,
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
            itemStyle={{
              color: colors.secondary,
              fontSize: 12,
              padding: '4px 0',
            }}
            cursor={{ 
              stroke: colors.secondary, 
              strokeWidth: 1,
              strokeDasharray: '5 5',
              opacity: 0.3,
            }}
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: 20 }}
              iconType="square"
              formatter={(value) => <span style={{ color: colors.secondary, fontSize: 12 }}>{value}</span>}
            />
          )}
          {yKeys.map((yKey, index) => {
            const color = yKey.color || CHART_COLORS[index % CHART_COLORS.length];
            return (
              <Area
                key={yKey.key}
                type="monotone"
                dataKey={yKey.key}
                name={yKey.label}
                stackId={stacked ? '1' : undefined}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#gradient-${yKey.key})`}
                fillOpacity={1}
                animationDuration={800}
                animationEasing="ease-out"
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Bar Chart Component
export interface BarChartProps extends BaseChartProps {
  xKey: string;
  yKeys: { key: string; label: string; color?: string }[];
  showGrid?: boolean;
  showLegend?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
}

export function BarChartComponent({
  data,
  xKey,
  yKeys,
  className,
  height = 300,
  showGrid = true,
  showLegend = true,
  horizontal = false,
  stacked = false,
}: BarChartProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];
  const themeMode = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }} 
          layout={horizontal ? 'vertical' : 'horizontal'}
          barCategoryGap={stacked ? '10%' : '20%'}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.grid} 
              opacity={0.3}
              vertical={!horizontal}
              horizontal={horizontal}
            />
          )}
          <XAxis 
            dataKey={horizontal ? undefined : xKey} 
            type={horizontal ? 'number' : 'category'}
            stroke={colors.secondary}
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: colors.grid, strokeWidth: 1 }}
            tickLine={{ stroke: colors.grid }}
          />
          <YAxis 
            dataKey={horizontal ? xKey : undefined}
            type={horizontal ? 'category' : 'number'}
            stroke={colors.secondary}
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: colors.grid, strokeWidth: 1 }}
            tickLine={{ stroke: colors.grid }}
          />
          <Tooltip
            contentStyle={getTooltipStyle(themeMode, colors)}
            labelStyle={{ 
              color: colors.primary,
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
            itemStyle={{
              color: colors.secondary,
              fontSize: 12,
              padding: '4px 0',
            }}
            cursor={{ 
              fill: getGradientColor(colors.secondary, 0.1),
            }}
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: 20 }}
              iconType="square"
              formatter={(value) => <span style={{ color: colors.secondary, fontSize: 12 }}>{value}</span>}
            />
          )}
          {yKeys.map((yKey, index) => {
            const color = yKey.color || CHART_COLORS[index % CHART_COLORS.length];
            return (
              <Bar
                key={yKey.key}
                dataKey={yKey.key}
                name={yKey.label}
                fill={color}
                stackId={stacked ? '1' : undefined}
                radius={[8, 8, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Pie Chart Component
export interface PieChartProps extends BaseChartProps {
  nameKey: string;
  valueKey: string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export function PieChartComponent({
  data,
  nameKey,
  valueKey,
  className,
  height = 300,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80,
}: PieChartProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];
  const themeMode = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => {
              const percentage = percent ? (percent * 100).toFixed(0) : 0;
              return percentage > 5 ? `${name}: ${percentage}%` : '';
            }}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill={colors.accent}
            dataKey={valueKey}
            nameKey={nameKey}
            paddingAngle={innerRadius > 0 ? 2 : 1}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                stroke={colors.background}
                strokeWidth={2}
              />
            ))}
          </Pie>
          {showLegend && (
            <Legend 
              iconType="circle"
              formatter={(value) => <span style={{ color: colors.secondary, fontSize: 12 }}>{value}</span>}
            />
          )}
          <Tooltip
            contentStyle={getTooltipStyle(themeMode, colors)}
            labelStyle={{ 
              color: colors.primary,
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
            itemStyle={{
              color: colors.secondary,
              fontSize: 12,
              padding: '4px 0',
            }}
            formatter={(value: any, name: any, props: any) => {
              const total = data.reduce((sum, item) => sum + (item[valueKey] as number), 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return [`${value} (${percentage}%)`, name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Scatter Chart Component
export interface ScatterChartProps extends BaseChartProps {
  xKey: string;
  yKey: string;
  dataKey: string;
  showGrid?: boolean;
}

export function ScatterChartComponent({
  data,
  xKey,
  yKey,
  dataKey,
  className,
  height = 300,
  showGrid = true,
}: ScatterChartProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];
  const themeMode = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.grid} 
              opacity={0.3}
              vertical={true}
              horizontal={true}
            />
          )}
          <XAxis 
            type="number"
            dataKey={xKey}
            name={xKey}
            stroke={colors.secondary}
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: colors.grid, strokeWidth: 1 }}
            tickLine={{ stroke: colors.grid }}
          />
          <YAxis 
            type="number"
            dataKey={yKey}
            name={yKey}
            stroke={colors.secondary}
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: colors.grid, strokeWidth: 1 }}
            tickLine={{ stroke: colors.grid }}
          />
          <Tooltip
            cursor={{ 
              strokeDasharray: '5 5',
              stroke: colors.secondary,
              strokeWidth: 1,
              opacity: 0.3,
            }}
            contentStyle={getTooltipStyle(themeMode, colors)}
            labelStyle={{ 
              color: colors.primary,
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
            itemStyle={{
              color: colors.secondary,
              fontSize: 12,
              padding: '4px 0',
            }}
          />
          <Scatter 
            name={dataKey} 
            data={data} 
            fill={colors.accent}
            shape="circle"
            animationDuration={800}
            animationEasing="ease-out"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// Radar Chart Component
export interface RadarChartProps extends BaseChartProps {
  dataKey: string;
  angleKey: string;
  valueKey: string;
  showLegend?: boolean;
}

export function RadarChartComponent({
  data,
  dataKey,
  angleKey,
  valueKey,
  className,
  height = 300,
  showLegend = true,
}: RadarChartProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];
  const themeMode = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <PolarGrid 
            stroke={colors.grid} 
            opacity={0.3}
            gridType="polygon"
          />
          <PolarAngleAxis 
            dataKey={angleKey} 
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }} 
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 'auto']} 
            tick={{ 
              fill: colors.secondary, 
              fontSize: 11,
            }}
            axisLine={{ stroke: colors.grid }}
          />
          <Radar
            name={dataKey}
            dataKey={valueKey}
            stroke={colors.accent}
            fill={colors.accent}
            fillOpacity={0.4}
            strokeWidth={2.5}
            animationDuration={800}
            animationEasing="ease-out"
          />
          {showLegend && (
            <Legend 
              iconType="square"
              formatter={(value) => <span style={{ color: colors.secondary, fontSize: 12 }}>{value}</span>}
            />
          )}
          <Tooltip
            contentStyle={getTooltipStyle(themeMode, colors)}
            labelStyle={{ 
              color: colors.primary,
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
            itemStyle={{
              color: colors.secondary,
              fontSize: 12,
              padding: '4px 0',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Composed Chart (Line + Bar)
export interface ComposedChartProps extends BaseChartProps {
  xKey: string;
  barKeys?: { key: string; label: string; color?: string }[];
  lineKeys?: { key: string; label: string; color?: string }[];
  areaKeys?: { key: string; label: string; color?: string }[];
  showGrid?: boolean;
  showLegend?: boolean;
}

export function ComposedChartComponent({
  data,
  xKey,
  barKeys = [],
  lineKeys = [],
  areaKeys = [],
  className,
  height = 300,
  showGrid = true,
  showLegend = true,
}: ComposedChartProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];
  const themeMode = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            {areaKeys.map((areaKey, index) => {
              const color = areaKey.color || CHART_COLORS[(barKeys.length + index) % CHART_COLORS.length];
              return (
                <linearGradient key={`gradient-${areaKey.key}`} id={`gradient-${areaKey.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              );
            })}
          </defs>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.grid} 
              opacity={0.3}
              vertical={true}
              horizontal={true}
            />
          )}
          <XAxis 
            dataKey={xKey} 
            stroke={colors.secondary}
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: colors.grid, strokeWidth: 1 }}
            tickLine={{ stroke: colors.grid }}
          />
          <YAxis 
            stroke={colors.secondary}
            tick={{ 
              fill: colors.secondary, 
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: colors.grid, strokeWidth: 1 }}
            tickLine={{ stroke: colors.grid }}
          />
          <Tooltip
            contentStyle={getTooltipStyle(themeMode, colors)}
            labelStyle={{ 
              color: colors.primary,
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
            itemStyle={{
              color: colors.secondary,
              fontSize: 12,
              padding: '4px 0',
            }}
            cursor={{ 
              stroke: colors.secondary, 
              strokeWidth: 1,
              strokeDasharray: '5 5',
              opacity: 0.3,
            }}
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => <span style={{ color: colors.secondary, fontSize: 12 }}>{value}</span>}
            />
          )}
          {barKeys.map((barKey, index) => {
            const color = barKey.color || CHART_COLORS[index % CHART_COLORS.length];
            return (
              <Bar
                key={barKey.key}
                dataKey={barKey.key}
                name={barKey.label}
                fill={color}
                radius={[8, 8, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
            );
          })}
          {areaKeys.map((areaKey, index) => {
            const color = areaKey.color || CHART_COLORS[(barKeys.length + index) % CHART_COLORS.length];
            return (
              <Area
                key={areaKey.key}
                type="monotone"
                dataKey={areaKey.key}
                name={areaKey.label}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#gradient-${areaKey.key})`}
                fillOpacity={1}
                animationDuration={800}
                animationEasing="ease-out"
              />
            );
          })}
          {lineKeys.map((lineKey, index) => {
            const color = lineKey.color || CHART_COLORS[(barKeys.length + areaKeys.length + index) % CHART_COLORS.length];
            return (
              <Line
                key={lineKey.key}
                type="monotone"
                dataKey={lineKey.key}
                name={lineKey.label}
                stroke={color}
                strokeWidth={3}
                dot={{ 
                  r: 4, 
                  fill: color,
                  strokeWidth: 2,
                  stroke: colors.background,
                }}
                activeDot={{ 
                  r: 7, 
                  fill: color,
                  strokeWidth: 3,
                  stroke: colors.background,
                }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Chart.js Line Chart
export interface ChartJSLineProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
      fill?: boolean;
    }[];
  };
  className?: string;
  height?: number;
  options?: any;
}

export function ChartJSLineComponent({ data, className, height = 300, options }: ChartJSLineProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOut' as const,
    },
    plugins: {
      legend: {
        labels: {
          color: colors.secondary,
          font: {
            size: 12,
            weight: 500,
          },
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: colors.tooltip,
        titleColor: colors.primary,
        bodyColor: colors.secondary,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 13,
          weight: 600,
        },
        bodyFont: {
          size: 12,
        },
        cornerRadius: 12,
        displayColors: true,
        boxPadding: 6,
        boxHeight: 12,
        boxWidth: 12,
      },
    },
    scales: {
      x: {
        ticks: { 
          color: colors.secondary,
          font: {
            size: 12,
            weight: 500,
          },
        },
        grid: { 
          color: colors.grid, 
          opacity: 0.3,
          lineWidth: 1,
        },
        border: {
          color: colors.grid,
          width: 1,
        },
      },
      y: {
        ticks: { 
          color: colors.secondary,
          font: {
            size: 12,
            weight: 500,
          },
        },
        grid: { 
          color: colors.grid, 
          opacity: 0.3,
          lineWidth: 1,
        },
        border: {
          color: colors.grid,
          width: 1,
        },
      },
    },
    ...options,
  }), [resolvedTheme, colors, options]);

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ChartJSLine data={data} options={chartOptions} />
    </div>
  );
}

// Chart.js Bar Chart
export interface ChartJSBarProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
    }[];
  };
  className?: string;
  height?: number;
  horizontal?: boolean;
  options?: any;
}

export function ChartJSBarComponent({ data, className, height = 300, horizontal = false, options }: ChartJSBarProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];

  const chartOptions = useMemo(() => ({
    indexAxis: horizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOut' as const,
    },
    plugins: {
      legend: {
        labels: {
          color: colors.secondary,
          font: {
            size: 12,
            weight: 500,
          },
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: colors.tooltip,
        titleColor: colors.primary,
        bodyColor: colors.secondary,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 13,
          weight: 600,
        },
        bodyFont: {
          size: 12,
        },
        cornerRadius: 12,
        displayColors: true,
        boxPadding: 6,
        boxHeight: 12,
        boxWidth: 12,
      },
    },
    scales: {
      x: {
        ticks: { 
          color: colors.secondary,
          font: {
            size: 12,
            weight: 500,
          },
        },
        grid: { 
          color: colors.grid, 
          opacity: 0.3,
          lineWidth: 1,
        },
        border: {
          color: colors.grid,
          width: 1,
        },
      },
      y: {
        ticks: { 
          color: colors.secondary,
          font: {
            size: 12,
            weight: 500,
          },
        },
        grid: { 
          color: colors.grid, 
          opacity: 0.3,
          lineWidth: 1,
        },
        border: {
          color: colors.grid,
          width: 1,
        },
      },
    },
    ...options,
  }), [resolvedTheme, colors, horizontal, options]);

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ChartJSBar data={data} options={chartOptions} />
    </div>
  );
}

// Chart.js Pie/Doughnut Chart
export interface ChartJSPieProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor?: string[];
      borderColor?: string[];
    }[];
  };
  className?: string;
  height?: number;
  doughnut?: boolean;
  options?: any;
}

export function ChartJSPieComponent({ data, className, height = 300, doughnut = false, options }: ChartJSPieProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOut' as const,
    },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: colors.secondary,
          font: {
            size: 12,
            weight: 500,
          },
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: colors.tooltip,
        titleColor: colors.primary,
        bodyColor: colors.secondary,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 13,
          weight: 600,
        },
        bodyFont: {
          size: 12,
        },
        cornerRadius: 12,
        displayColors: true,
        boxPadding: 6,
        boxHeight: 12,
        boxWidth: 12,
      },
    },
    ...options,
  }), [resolvedTheme, colors, options]);

  const ChartComponent = doughnut ? ChartJSDoughnut : ChartJSPie;

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ChartComponent data={data} options={chartOptions} />
    </div>
  );
}

// Chart.js Radar Chart
export interface ChartJSRadarProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
      fill?: boolean;
    }[];
  };
  className?: string;
  height?: number;
  options?: any;
}

export function ChartJSRadarComponent({ data, className, height = 300, options }: ChartJSRadarProps) {
  const { resolvedTheme } = useTheme();
  const colors = COLORS[resolvedTheme];

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOut' as const,
    },
    plugins: {
      legend: {
        labels: {
          color: colors.secondary,
          font: {
            size: 12,
            weight: 500,
          },
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: colors.tooltip,
        titleColor: colors.primary,
        bodyColor: colors.secondary,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 13,
          weight: 600,
        },
        bodyFont: {
          size: 12,
        },
        cornerRadius: 12,
        displayColors: true,
        boxPadding: 6,
        boxHeight: 12,
        boxWidth: 12,
      },
    },
    scales: {
      r: {
        ticks: {
          color: colors.secondary,
          backdropColor: 'transparent',
          font: {
            size: 11,
            weight: 500,
          },
        },
        grid: {
          color: colors.grid,
          opacity: 0.3,
          lineWidth: 1,
        },
        pointLabels: {
          color: colors.secondary,
          font: {
            size: 12,
            weight: 500,
          },
        },
        angleLines: {
          color: colors.grid,
          opacity: 0.3,
        },
      },
    },
    ...options,
  }), [resolvedTheme, colors, options]);

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ChartJSRadar data={data} options={chartOptions} />
    </div>
  );
}
