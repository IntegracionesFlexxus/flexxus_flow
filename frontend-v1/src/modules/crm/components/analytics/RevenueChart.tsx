import React from 'react';
import { Card, CardContent, CardHeader, Box, useTheme } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RevenueChartProps {
  data: Array<{
    period: string;
    value: number;
    previousValue?: number;
    change?: number;
    changePercentage?: number;
  }>;
  title?: string;
  height?: number;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  title = 'Revenue Trend',
  height = 300
}) => {
  const theme = useTheme();

  const chartData = {
    labels: data.map(d => d.period),
    datasets: [
      {
        label: 'Current Period',
        data: data.map(d => d.value),
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.light + '33',
        tension: 0.3,
        fill: true
      },
      ...(data.some(d => d.previousValue !== undefined) ? [{
        label: 'Previous Period',
        data: data.map(d => d.previousValue || 0),
        borderColor: theme.palette.grey[500],
        backgroundColor: theme.palette.grey[300] + '33',
        borderDash: [5, 5],
        tension: 0.3,
        fill: false
      }] : [])
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
              }).format(context.parsed.y);
            }

            // Add change percentage if available
            if (context.datasetIndex === 0 && data[context.dataIndex]?.changePercentage) {
              const change = data[context.dataIndex].changePercentage!;
              label += ` (${change > 0 ? '+' : ''}${change.toFixed(1)}%)`;
            }

            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme.palette.divider,
          drawBorder: false
        },
        ticks: {
          color: theme.palette.text.secondary,
          callback: function(value: any) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              notation: 'compact',
              maximumSignificantDigits: 3
            }).format(value);
          }
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: theme.palette.text.secondary
        }
      }
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={title}
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        <Box height={height}>
          <Line data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
};