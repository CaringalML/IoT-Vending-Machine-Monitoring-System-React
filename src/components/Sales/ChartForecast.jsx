import React, { useMemo, useState } from 'react';
import './ChartForecast.css';
import { TrendingUp, AlertTriangle } from 'lucide-react';

/**
 * An intelligent forecast chart that uses linear regression to project future revenue.
 * @param {{ data: any[], formatCurrency: (amount: number) => string }} props
 */
const ChartForecast = ({ data, formatCurrency }) => {
  const [tooltip, setTooltip] = useState(null);

  const {
    chartData,
    yAxisLabels,
    xAxisLabels,
    trendLine,
    confidencePath,
    chartPath,
    forecastPath,
    noDataReason,
    chartWidth,
    needsScrolling
  } = useMemo(() => {
    const defaults = {
      chartData: [], yAxisLabels: [], xAxisLabels: [],
      trendLine: '', confidencePath: '', chartPath: '', forecastPath: '',
      noDataReason: null
    };

    if (!data || data.length === 0) {
      return { ...defaults, noDataReason: 'No sales data available.' };
    }

    const dailyData = data.reduce((acc, sale) => {
      if (!sale.timestamp?.seconds) return acc;
      const date = new Date(sale.timestamp.seconds * 1000).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + (sale.price || 0);
      return acc;
    }, {});

    const sortedDays = Object.keys(dailyData).sort();

    if (sortedDays.length < 5) {
      return {
        ...defaults,
        noDataReason: `At least 5 days of data are needed for a reliable forecast. Only ${sortedDays.length} available.`
      };
    }

    const historicalPoints = sortedDays.map((date, index) => ({
      x: index,
      y: dailyData[date],
      date: new Date(date),
    }));

    const totalDataPoints = historicalPoints.length + 7;
    if (totalDataPoints > 30);
    if (totalDataPoints > 60);

    const n = historicalPoints.length;
    const { sumX, sumY, sumXY, sumX2 } = historicalPoints.reduce(
      (acc, p) => {
        acc.sumX += p.x;
        acc.sumY += p.y;
        acc.sumXY += p.x * p.y;
        acc.sumX2 += p.x * p.x;
        return acc;
      },
      { sumX: 0, sumY: 0, sumXY: 0, sumX2: 0 }
    );

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predict = (x) => slope * x + intercept;

    const forecastDays = 7;
    const forecastPoints = [];
    for (let i = 0; i < forecastDays; i++) {
      const x = n + i;
      const lastDate = historicalPoints[n - 1].date;
      const newDate = new Date(lastDate);
      newDate.setDate(lastDate.getDate() + i + 1);
      forecastPoints.push({ x, y: predict(x), date: newDate, isForecast: true });
    }

    const allPoints = [...historicalPoints, ...forecastPoints];

    const stdError = Math.sqrt(
      historicalPoints.reduce((sum, p) => sum + Math.pow(p.y - predict(p.x), 2), 0) / (n - 2)
    );
    const confidenceMargin = 1.96 * stdError;

    const allValues = allPoints.map(p => p.y);
    const minY = Math.min(...allValues) - confidenceMargin;
    const maxY = Math.max(...allValues) + confidenceMargin;

    const chartHeight = 250;
    const containerWidth = 600;
    const minPointWidth = 40;
    const idealChartWidth = totalDataPoints * minPointWidth;

    const needsScrolling = idealChartWidth > containerWidth;
    const chartWidth = needsScrolling ? idealChartWidth : containerWidth;

    const toSvgX = (x) => (x / (n + forecastDays - 1)) * chartWidth;
    const toSvgY = (y) => chartHeight - ((y - minY) / (maxY - minY)) * chartHeight;

    const finalChartPath = historicalPoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x)} ${toSvgY(p.y)}`
    ).join(' ');

    const finalForecastPath = forecastPoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x)} ${toSvgY(p.y)}`
    ).join(' ');

    const connectingPoint = `L ${toSvgX(forecastPoints[0].x)} ${toSvgY(forecastPoints[0].y)}`;
    const finalTrendLine = `M ${toSvgX(0)} ${toSvgY(predict(0))} L ${toSvgX(n + forecastDays - 1)} ${toSvgY(predict(n + forecastDays - 1))}`;

    const confidenceBandPoints = allPoints.map((p) => ({
      x: toSvgX(p.x),
      y0: toSvgY(predict(p.x) - confidenceMargin),
      y1: toSvgY(predict(p.x) + confidenceMargin),
    }));

    const finalConfidencePath = `M ${confidenceBandPoints.map(p => `${p.x} ${p.y1}`).join(' L ')} L ${[...confidenceBandPoints].reverse().map(p => `${p.x} ${p.y0}`).join(' L ')} Z`;

    const finalYAxisLabels = Array.from({ length: 5 }, (_, i) => {
      const val = minY + (i / 4) * (maxY - minY);
      return { y: toSvgY(val), label: formatCurrency(val) };
    });

    const finalXAxisLabels = allPoints
      .filter((_, i) => i % Math.ceil(allPoints.length / Math.min(8, allPoints.length)) === 0)
      .map(p => ({
        x: toSvgX(p.x),
        label: p.date.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' })
      }));

    return {
      chartData: allPoints.map(p => ({ ...p, svgX: toSvgX(p.x), svgY: toSvgY(p.y) })),
      chartPath: finalChartPath + connectingPoint,
      forecastPath: finalForecastPath,
      yAxisLabels: finalYAxisLabels,
      xAxisLabels: finalXAxisLabels,
      trendLine: finalTrendLine,
      confidencePath: finalConfidencePath,
      noDataReason: null,
      chartWidth,
      needsScrolling
    };
  }, [data, formatCurrency]);

  const handleMouseMove = (e) => {
    if (!chartData || chartData.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const svgX = e.clientX - rect.left;

    const closestPoint = chartData.reduce((closest, p) => {
      const dist = Math.abs(p.svgX - svgX);
      return dist < Math.abs(closest.svgX - svgX) ? p : closest;
    }, chartData[0]);

    setTooltip({
      ...closestPoint,
      top: rect.top + closestPoint.svgY - 10,
      left: rect.left + closestPoint.svgX,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  if (noDataReason) {
    return (
      <div className="forecast-chart-container">
        <div className="forecast-chart-no-data">
          <AlertTriangle size={32} className="no-data-icon" />
          <h4 className="no-data-title">Could Not Generate Forecast</h4>
          <p className="no-data-subtitle">{noDataReason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="forecast-chart-container">
      <div className="forecast-chart-header">
        <div className="forecast-chart-title-group">
          <TrendingUp size={20} />
          <h4>Revenue Forecast</h4>
        </div>
        <div className="forecast-chart-legend">
          <div className="legend-item"><span className="legend-color-box actual"></span>Actual</div>
          <div className="legend-item"><span className="legend-color-box forecast"></span>Forecast</div>
          <div className="legend-item"><span className="legend-color-box trend"></span>Trend</div>
        </div>
      </div>

      <div className="forecast-chart-scroll-wrapper">
        <div className="forecast-chart-main">
          <div className="y-axis-labels">
            {yAxisLabels.map(({ y, label }) => (
              <div key={y} className="axis-label y-label" style={{ top: `${y}px` }}>{label}</div>
            ))}
          </div>
          <div 
            className={`chart-area ${needsScrolling ? 'scrollable' : 'fit-content'}`}
            style={needsScrolling ? { width: `${chartWidth + 40}px` } : {}}
          >
            <svg
              width={chartWidth}
              height="250"
              className="forecast-chart-svg"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {yAxisLabels.map(({ y }) => (
                <line key={y} x1="0" x2="100%" y1={y} y2={y} className="grid-line" />
              ))}

              <path d={confidencePath} className="confidence-band" />
              <path d={trendLine} className="line trend" />
              <path d={chartPath} className="line actual" />
              <path d={forecastPath} className="line forecast" />

              {chartData.map((p, index) => (
                <circle key={index} cx={p.svgX} cy={p.svgY} r="6" className="data-point-hover" />
              ))}

              {tooltip && (
                <circle
                  cx={tooltip.svgX}
                  cy={tooltip.svgY}
                  r="4"
                  className={`data-point-active ${tooltip.isForecast ? 'forecast' : 'actual'}`}
                />
              )}
            </svg>
            <div className="x-axis-labels">
              {xAxisLabels.map(({ x, label }) => (
                <div key={label} className="axis-label x-label" style={{ left: `${x}px` }}>{label}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="custom-tooltip"
          style={{
            top: `${tooltip.top}px`,
            left: `${tooltip.left}px`,
            transform: 'translate(-50%, -100%) translateY(-5px)',
            borderColor: tooltip.isForecast ? '#38a169' : '#667eea'
          }}
        >
          <div className="tooltip-title">
            {tooltip.date.toLocaleDateString('en-NZ', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            })}
          </div>
          <div className="tooltip-row">
            <span>{tooltip.isForecast ? 'Forecasted:' : 'Revenue:'}</span>
            <span>{formatCurrency(tooltip.y)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartForecast;