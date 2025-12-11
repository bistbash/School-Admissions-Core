/**
 * Charts Usage Examples
 * 
 * This file demonstrates how to use the chart components
 * You can use this as a reference when building your dashboards
 */

import {
  LineChartComponent,
  AreaChartComponent,
  BarChartComponent,
  PieChartComponent,
  ScatterChartComponent,
  RadarChartComponent,
  ComposedChartComponent,
  ChartJSLineComponent,
  ChartJSBarComponent,
  ChartJSPieComponent,
} from './Charts';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

// Example data
const monthlyData = [
  { month: 'ינואר', students: 120, graduates: 10, newStudents: 15 },
  { month: 'פברואר', students: 125, graduates: 8, newStudents: 12 },
  { month: 'מרץ', students: 130, graduates: 5, newStudents: 18 },
  { month: 'אפריל', students: 135, graduates: 3, newStudents: 20 },
  { month: 'מאי', students: 140, graduates: 2, newStudents: 22 },
  { month: 'יוני', students: 145, graduates: 1, newStudents: 25 },
];

const trackDistribution = [
  { name: 'מגמת מדעים', value: 45 },
  { name: 'מגמת הנדסה', value: 30 },
  { name: 'מגמת מחשבים', value: 25 },
];

const performanceData = [
  { subject: 'מתמטיקה', score: 85 },
  { subject: 'פיזיקה', score: 78 },
  { subject: 'כימיה', score: 82 },
  { subject: 'אנגלית', score: 90 },
  { subject: 'עברית', score: 88 },
];

export function ChartsExample() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">דוגמאות גרפים</h1>

      {/* Line Chart Example */}
      <Card>
        <CardHeader>
          <CardTitle>גרף קו - התפתחות מספר תלמידים</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChartComponent
            data={monthlyData}
            xKey="month"
            yKeys={[
              { key: 'students', label: 'סה"כ תלמידים' },
              { key: 'newStudents', label: 'תלמידים חדשים' },
            ]}
            height={300}
          />
        </CardContent>
      </Card>

      {/* Area Chart Example */}
      <Card>
        <CardHeader>
          <CardTitle>גרף אזור - התפלגות תלמידים</CardTitle>
        </CardHeader>
        <CardContent>
          <AreaChartComponent
            data={monthlyData}
            xKey="month"
            yKeys={[
              { key: 'students', label: 'תלמידים' },
              { key: 'graduates', label: 'בוגרים' },
            ]}
            height={300}
            stacked={true}
          />
        </CardContent>
      </Card>

      {/* Bar Chart Example */}
      <Card>
        <CardHeader>
          <CardTitle>גרף עמודות - השוואה חודשית</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartComponent
            data={monthlyData}
            xKey="month"
            yKeys={[
              { key: 'students', label: 'תלמידים' },
              { key: 'newStudents', label: 'חדשים' },
            ]}
            height={300}
          />
        </CardContent>
      </Card>

      {/* Pie Chart Example */}
      <Card>
        <CardHeader>
          <CardTitle>גרף עוגה - התפלגות מגמות</CardTitle>
        </CardHeader>
        <CardContent>
          <PieChartComponent
            data={trackDistribution}
            nameKey="name"
            valueKey="value"
            height={300}
          />
        </CardContent>
      </Card>

      {/* Composed Chart Example */}
      <Card>
        <CardHeader>
          <CardTitle>גרף משולב - עמודות + קו</CardTitle>
        </CardHeader>
        <CardContent>
          <ComposedChartComponent
            data={monthlyData}
            xKey="month"
            barKeys={[
              { key: 'students', label: 'תלמידים' },
            ]}
            lineKeys={[
              { key: 'graduates', label: 'בוגרים' },
            ]}
            height={300}
          />
        </CardContent>
      </Card>

      {/* Radar Chart Example */}
      <Card>
        <CardHeader>
          <CardTitle>גרף רדאר - ביצועים לפי נושא</CardTitle>
        </CardHeader>
        <CardContent>
          <RadarChartComponent
            data={performanceData}
            dataKey="score"
            angleKey="subject"
            valueKey="score"
            height={300}
          />
        </CardContent>
      </Card>

      {/* Chart.js Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Chart.js - גרף קו</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartJSLineComponent
            data={{
              labels: monthlyData.map(d => d.month),
              datasets: [
                {
                  label: 'תלמידים',
                  data: monthlyData.map(d => d.students),
                  borderColor: '#3B82F6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                },
              ],
            }}
            height={300}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chart.js - גרף עוגה</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartJSPieComponent
            data={{
              labels: trackDistribution.map(d => d.name),
              datasets: [
                {
                  data: trackDistribution.map(d => d.value),
                  backgroundColor: [
                    '#3B82F6',
                    '#10B981',
                    '#F59E0B',
                  ],
                },
              ],
            }}
            height={300}
            doughnut={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
