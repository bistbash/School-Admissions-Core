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

// Color palettes for charts
const COLORS = {
  light: {
    primary: '#000000',
    secondary: '#6B7280',
    accent: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
  },
  dark: {
    primary: '#FAFAFA',
    secondary: '#9CA3AF',
    accent: '#60A5FA',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    info: '#22D3EE',
  },
};

const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

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

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colors.secondary} opacity={0.2} />}
          <XAxis 
            dataKey={xKey} 
            stroke={colors.secondary}
            tick={{ fill: colors.secondary }}
          />
          <YAxis 
            stroke={colors.secondary}
            tick={{ fill: colors.secondary }}
          />
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
                border: `1px solid ${colors.secondary}`,
                borderRadius: '8px',
              }}
              labelStyle={{ color: colors.primary }}
            />
          )}
          {showLegend && <Legend />}
          {yKeys.map((yKey, index) => (
            <Line
              key={yKey.key}
              type="monotone"
              dataKey={yKey.key}
              name={yKey.label}
              stroke={yKey.color || CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
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

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colors.secondary} opacity={0.2} />}
          <XAxis 
            dataKey={xKey} 
            stroke={colors.secondary}
            tick={{ fill: colors.secondary }}
          />
          <YAxis 
            stroke={colors.secondary}
            tick={{ fill: colors.secondary }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
              border: `1px solid ${colors.secondary}`,
              borderRadius: '8px',
            }}
            labelStyle={{ color: colors.primary }}
          />
          {showLegend && <Legend />}
          {yKeys.map((yKey, index) => (
            <Area
              key={yKey.key}
              type="monotone"
              dataKey={yKey.key}
              name={yKey.label}
              stackId={stacked ? '1' : undefined}
              stroke={yKey.color || CHART_COLORS[index % CHART_COLORS.length]}
              fill={yKey.color || CHART_COLORS[index % CHART_COLORS.length]}
              fillOpacity={0.6}
            />
          ))}
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

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} layout={horizontal ? 'vertical' : 'horizontal'}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colors.secondary} opacity={0.2} />}
          <XAxis 
            dataKey={horizontal ? undefined : xKey} 
            type={horizontal ? 'number' : 'category'}
            stroke={colors.secondary}
            tick={{ fill: colors.secondary }}
          />
          <YAxis 
            dataKey={horizontal ? xKey : undefined}
            type={horizontal ? 'category' : 'number'}
            stroke={colors.secondary}
            tick={{ fill: colors.secondary }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
              border: `1px solid ${colors.secondary}`,
              borderRadius: '8px',
            }}
            labelStyle={{ color: colors.primary }}
          />
          {showLegend && <Legend />}
          {yKeys.map((yKey, index) => (
            <Bar
              key={yKey.key}
              dataKey={yKey.key}
              name={yKey.label}
              fill={yKey.color || CHART_COLORS[index % CHART_COLORS.length]}
              stackId={stacked ? '1' : undefined}
            />
          ))}
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

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill={colors.accent}
            dataKey={valueKey}
            nameKey={nameKey}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          {showLegend && <Legend />}
          <Tooltip
            contentStyle={{
              backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
              border: `1px solid ${colors.secondary}`,
              borderRadius: '8px',
            }}
            labelStyle={{ color: colors.primary }}
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

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colors.secondary} opacity={0.2} />}
          <XAxis 
            type="number"
            dataKey={xKey}
            name={xKey}
            stroke={colors.secondary}
            tick={{ fill: colors.secondary }}
          />
          <YAxis 
            type="number"
            dataKey={yKey}
            name={yKey}
            stroke={colors.secondary}
            tick={{ fill: colors.secondary }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
              border: `1px solid ${colors.secondary}`,
              borderRadius: '8px',
            }}
            labelStyle={{ color: colors.primary }}
          />
          <Scatter name={dataKey} data={data} fill={colors.accent} />
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

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke={colors.secondary} opacity={0.3} />
          <PolarAngleAxis dataKey={angleKey} tick={{ fill: colors.secondary }} />
          <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fill: colors.secondary }} />
          <Radar
            name={dataKey}
            dataKey={valueKey}
            stroke={colors.accent}
            fill={colors.accent}
            fillOpacity={0.6}
          />
          {showLegend && <Legend />}
          <Tooltip
            contentStyle={{
              backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
              border: `1px solid ${colors.secondary}`,
              borderRadius: '8px',
            }}
            labelStyle={{ color: colors.primary }}
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

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colors.secondary} opacity={0.2} />}
          <XAxis 
            dataKey={xKey} 
            stroke={colors.secondary}
            tick={{ fill: colors.secondary }}
          />
          <YAxis 
            stroke={colors.secondary}
            tick={{ fill: colors.secondary }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
              border: `1px solid ${colors.secondary}`,
              borderRadius: '8px',
            }}
            labelStyle={{ color: colors.primary }}
          />
          {showLegend && <Legend />}
          {barKeys.map((barKey, index) => (
            <Bar
              key={barKey.key}
              dataKey={barKey.key}
              name={barKey.label}
              fill={barKey.color || CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
          {areaKeys.map((areaKey, index) => (
            <Area
              key={areaKey.key}
              type="monotone"
              dataKey={areaKey.key}
              name={areaKey.label}
              stroke={areaKey.color || CHART_COLORS[(barKeys.length + index) % CHART_COLORS.length]}
              fill={areaKey.color || CHART_COLORS[(barKeys.length + index) % CHART_COLORS.length]}
              fillOpacity={0.6}
            />
          ))}
          {lineKeys.map((lineKey, index) => (
            <Line
              key={lineKey.key}
              type="monotone"
              dataKey={lineKey.key}
              name={lineKey.label}
              stroke={lineKey.color || CHART_COLORS[(barKeys.length + areaKeys.length + index) % CHART_COLORS.length]}
              strokeWidth={2}
            />
          ))}
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
    plugins: {
      legend: {
        labels: {
          color: colors.primary,
        },
      },
      tooltip: {
        backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
        titleColor: colors.primary,
        bodyColor: colors.secondary,
        borderColor: colors.secondary,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: colors.secondary },
        grid: { color: colors.secondary, opacity: 0.2 },
      },
      y: {
        ticks: { color: colors.secondary },
        grid: { color: colors.secondary, opacity: 0.2 },
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
    plugins: {
      legend: {
        labels: {
          color: colors.primary,
        },
      },
      tooltip: {
        backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
        titleColor: colors.primary,
        bodyColor: colors.secondary,
        borderColor: colors.secondary,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: colors.secondary },
        grid: { color: colors.secondary, opacity: 0.2 },
      },
      y: {
        ticks: { color: colors.secondary },
        grid: { color: colors.secondary, opacity: 0.2 },
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
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: colors.primary,
        },
      },
      tooltip: {
        backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
        titleColor: colors.primary,
        bodyColor: colors.secondary,
        borderColor: colors.secondary,
        borderWidth: 1,
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
    plugins: {
      legend: {
        labels: {
          color: colors.primary,
        },
      },
      tooltip: {
        backgroundColor: resolvedTheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
        titleColor: colors.primary,
        bodyColor: colors.secondary,
        borderColor: colors.secondary,
        borderWidth: 1,
      },
    },
    scales: {
      r: {
        ticks: {
          color: colors.secondary,
          backdropColor: 'transparent',
        },
        grid: {
          color: colors.secondary,
          opacity: 0.2,
        },
        pointLabels: {
          color: colors.primary,
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
