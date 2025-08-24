'use client';

import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface CandlestickData {
  x: string;
  o: number;
  h: number;
  l: number;
  c: number;
}

interface ChartData {
  labels: string[];
  candlesticks: CandlestickData[];
  volumes: number[];
  sma20: number[];
  sma50: number[];
}

interface ProfessionalChartProps {
  data: ChartData;
  symbol: string;
}

export default function ProfessionalChart({ data, symbol }: ProfessionalChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const handleTradingViewClick = () => {
    const tradingViewUrl = `https://www.tradingview.com/symbols/NASDAQ-${symbol}/`;
    window.open(tradingViewUrl, '_blank');
  };

  useEffect(() => {
    if (!chartRef.current || !data) {
      console.log('Chart not ready:', { chartRef: !!chartRef.current, data: !!data });
      return;
    }

    console.log('Creating chart with data:', data);

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) {
      console.log('Could not get canvas context');
      return;
    }

    // Create a simple chart
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: `${symbol} Price`,
            data: data.candlesticks.map(candle => candle.c),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: 2,
            pointHoverRadius: 6,
          },
          {
            label: 'SMA 20',
            data: data.sma20,
            borderColor: 'rgba(255, 99, 132, 0.8)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'SMA 50',
            data: data.sma50,
            borderColor: 'rgba(255, 159, 64, 0.8)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: 'white',
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: 'white',
            bodyColor: 'white',
            callbacks: {
              title: (context) => {
                return `${symbol} - ${context[0].label}`;
              },
              label: (context) => {
                const index = context.dataIndex;
                const candle = data.candlesticks[index];
                
                if (context.datasetIndex === 0) {
                  return `Close: $${candle.c}`;
                } else if (context.datasetIndex === 1) {
                  return `SMA 20: $${context.parsed.y}`;
                } else if (context.datasetIndex === 2) {
                  return `SMA 50: $${context.parsed.y}`;
                }
                return context.dataset.label + ': ' + context.parsed.y;
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date',
              color: 'white',
            },
            ticks: {
              color: 'white',
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Price ($)',
              color: 'white',
            },
            ticks: {
              color: 'white',
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
          },
        },
      },
    });

    // Force chart resize after a short delay
    setTimeout(() => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    }, 100);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, symbol]);

  return (
    <div className="relative">
      <canvas ref={chartRef} className="w-full h-96" />
      
      {/* Chart Info Panel */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20">
        <div className="text-white text-sm space-y-1">
          <div className="font-bold text-lg">{symbol}</div>
          <div className="flex space-x-4 text-xs">
            <div>
              <span className="text-gray-400">Current:</span>
              <span className="text-green-400 ml-1">${data.candlesticks[data.candlesticks.length - 1]?.c.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-400">Change:</span>
              <span className="text-green-400 ml-1">
                {((data.candlesticks[data.candlesticks.length - 1]?.c - data.candlesticks[data.candlesticks.length - 2]?.c) || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Vol:</span>
              <span className="text-blue-400 ml-1">
                {(data.volumes[data.volumes.length - 1] / 1000000).toFixed(1)}M
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TradingView Button */}
      <button
        onClick={handleTradingViewClick}
        className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 backdrop-blur-sm rounded-lg p-2 border border-white/20 transition-colors z-10"
        title="Open TradingView Chart"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>

      {/* Technical Indicators Legend */}
      <div className="absolute top-16 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20">
        <div className="text-white text-xs space-y-1">
          <div className="font-bold">Indicators</div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-red-400"></div>
            <span>SMA 20</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-orange-400"></div>
            <span>SMA 50</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-2 bg-cyan-400/50"></div>
            <span>Volume</span>
          </div>
        </div>
      </div>
    </div>
  );
}
