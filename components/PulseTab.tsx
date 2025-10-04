'use client';
 import { useEffect, useMemo, useState } from 'react';

type BarChartProps = {
  data: number[];
  width?: number;
  height?: number;
  barColor?: string;
  average?: number;
};

function BarChart({ data, width = 520, height = 280, barColor = '#5E6AD2', average }: BarChartProps) {
  const maxValue = Math.max(...data, 1);
  const totalValue = Math.max(1, data.reduce((sum, v) => sum + v, 0));
  const padding = 16;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const gap = 8;
  const barWidth = (chartWidth - gap * (data.length - 1)) / data.length;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[280px]">
      {/* Axes */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E5E5E5" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E5E5E5" />

      {data.map((value, i) => {
        const x = padding + i * (barWidth + gap);
        const h = (value / maxValue) * chartHeight;
        const y = height - padding - h;
        const pct = Math.round((value / totalValue) * 100);
        const isHover = hoverIndex === i;
        const tooltipLabel = `${value} (${pct}%)`;
        const tooltipW = Math.max(52, 10 + tooltipLabel.length * 6);
        const tooltipH = 18;
        const tooltipX = x + barWidth / 2 - tooltipW / 2;
        const tooltipY = Math.max(padding + 2, y - tooltipH - 6);
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={4}
              fill={barColor}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <title>{`Level ${i + 1}: ${value} messages (${pct}%)`}</title>
            </rect>
            {isHover && (
              <g pointerEvents="none">
                <rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} rx={6} fill="#FFFFFF" stroke="#CDEFE3" />
                <text x={tooltipX + tooltipW / 2} y={tooltipY + tooltipH - 5} textAnchor="middle" fontSize="12" fill="#00B386" fontWeight={600}>
                  {tooltipLabel}
                </text>
              </g>
            )}
            <text x={x + barWidth / 2} y={height - padding + 14} textAnchor="middle" fontSize="10" fill="#6B6F76">
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* Average marker */}
      {typeof average === 'number' && average > 0 && (
        (() => {
          const avgIndex = Math.min(Math.max(average, 1), data.length);
          const x = padding + (avgIndex - 1) * (barWidth + gap) + barWidth / 2;
          return (
            <g>
              <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="#00B386" strokeWidth={2} strokeDasharray="4 4" />
              {(() => {
                const label = average.toFixed(2);
                const labelW = 38;
                const labelH = 18;
                const rectX = x - labelW / 2;
                const rectY = padding + 4;
                return (
                  <g>
                    <rect x={rectX} y={rectY} width={labelW} height={labelH} rx={6} fill="#FFFFFF" stroke="#00B386" />
                    <text x={x} y={rectY + labelH - 5} textAnchor="middle" fontSize="12" fill="#00B386" fontWeight={600}>
                      {label}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })()
      )}

      {/* Max tick label */}
      <text x={padding - 8} y={padding - 4} textAnchor="end" fontSize="10" fill="#8B8D98">
        {maxValue}
      </text>
    </svg>
  );
}

// LineChart removed along with its usage, per latest requirements

export default function PulseTab() {
  // Time window controls
  const [minutes, setMinutes] = useState<number>(120);

  // Summary stats
  const [totalMessages, setTotalMessages] = useState<number>(0);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [activeStudents, setActiveStudents] = useState<number>(0);

  // Distribution 1..5
  const [sentimentDistribution, setSentimentDistribution] = useState<number[]>([0, 0, 0, 0, 0]);

  // Top/bottom students
  const [topStudents, setTopStudents] = useState<Array<{ student_id: string; name?: string; avg_conf: number }>>([]);
  const [bottomStudents, setBottomStudents] = useState<Array<{ student_id: string; name?: string; avg_conf: number }>>([]);

  const averageSelfReport = useMemo(() => {
    const total = sentimentDistribution.reduce((acc, n) => acc + n, 0);
    if (!total) return 0;
    return sentimentDistribution.reduce((sum, count, i) => sum + count * (i + 1), 0) / total;
  }, [sentimentDistribution]);

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      try {
        const res = await fetch(`/api/pulse/summary?minutes=${minutes}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!json?.ok) return;
        if (cancelled) return;
        const d = json.data || {};
        setTotalMessages(Number(d.total_messages || 0));
        setQuestionCount(Number(d.question_count || 0));
        setActiveStudents(Number(d.active_students || 0));
      } catch {}
    };

    const fetchDistribution = async () => {
      try {
        const res = await fetch(`/api/pulse/distribution?minutes=${minutes}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!json?.ok) return;
        if (cancelled) return;
        const rows: Array<{ confidence: number; cnt: number }> = json.data || [];
        const bins = [0, 0, 0, 0, 0];
        for (const r of rows) {
          const idx = Math.min(5, Math.max(1, Number(r.confidence))) - 1;
          bins[idx] = Number(r.cnt || 0);
        }
        setSentimentDistribution(bins);
      } catch {}
    };

    const fetchTopBottom = async () => {
      try {
        const [topRes, bottomRes] = await Promise.all([
          fetch(`/api/pulse/top-students?minutes=${minutes}&limit=5`),
          fetch(`/api/pulse/bottom-students?minutes=${minutes}&limit=5`)
        ]);
        if (topRes.ok) {
          const j = await topRes.json();
          if (!cancelled && j?.ok) setTopStudents((j.data || []).map((r: any) => ({ student_id: String(r.student_id), name: r.name, avg_conf: Number(r.avg_conf) })));
        }
        if (bottomRes.ok) {
          const j = await bottomRes.json();
          if (!cancelled && j?.ok) setBottomStudents((j.data || []).map((r: any) => ({ student_id: String(r.student_id), name: r.name, avg_conf: Number(r.avg_conf) })));
        }
      } catch {
        // Fallback mock data if endpoints are not ready yet
        if (!cancelled) {
          setTopStudents([
            { student_id: 'S1', name: 'Alex', avg_conf: 4.6 },
            { student_id: 'S2', name: 'Jamie', avg_conf: 4.3 },
            { student_id: 'S3', name: 'Riley', avg_conf: 4.2 },
            { student_id: 'S4', name: 'Jordan', avg_conf: 4.1 },
            { student_id: 'S5', name: 'Taylor', avg_conf: 4.0 }
          ]);
          setBottomStudents([
            { student_id: 'S9', name: 'Sam', avg_conf: 1.9 },
            { student_id: 'S8', name: 'Avery', avg_conf: 2.0 },
            { student_id: 'S7', name: 'Quinn', avg_conf: 2.1 },
            { student_id: 'S6', name: 'Casey', avg_conf: 2.2 },
            { student_id: 'S10', name: 'Morgan', avg_conf: 2.3 }
          ]);
        }
      }
    };

    fetchSummary();
    fetchDistribution();
    fetchTopBottom();

    const interval = setInterval(() => {
      fetchSummary();
      fetchDistribution();
      fetchTopBottom();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [minutes]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
            <p className="text-[11px] text-[#8B8D98] font-medium mb-1">Active Students</p>
            <p className="text-2xl font-semibold text-[#0D0D0D]">{activeStudents}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
            <p className="text-[11px] text-[#8B8D98] font-medium mb-1">Question Count</p>
            <p className="text-2xl font-semibold text-[#5E6AD2]">{questionCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
            <p className="text-[11px] text-[#8B8D98] font-medium mb-1">Total Messages</p>
            <p className="text-2xl font-semibold text-[#0D0D0D]">{totalMessages}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] text-[#0D0D0D] font-semibold">Sentiment Report</p>
              <span className="inline-flex items-center gap-1 whitespace-nowrap leading-none px-2 py-0.5 rounded-full border border-[#00B386] bg-white text-[#00B386] text-[12px] font-semibold">Avg {averageSelfReport.toFixed(2)}</span>
            </div>
            <div className="h-[240px] overflow-y-auto">
              <BarChart data={sentimentDistribution} height={480} average={averageSelfReport} />
            </div>
          </div>
        </div>
        {/* Student rankings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
            <p className="text-[13px] text-[#0D0D0D] font-semibold mb-3">Highest Sentiment Students</p>
            <ol className="space-y-2 text-[13px]">
              {topStudents.slice(0, 5).map((s, idx) => (
                <li key={`${s.student_id}-${idx}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 inline-flex items-center justify-center rounded bg-[#F5F5F5] text-[#6B6F76] text-[11px]">{idx + 1}</span>
                    <span className="text-[#0D0D0D] font-medium">{s.name || s.student_id}</span>
                  </div>
                  <span className="text-[#00B386] font-semibold">{s.avg_conf.toFixed(2)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
            <p className="text-[13px] text-[#0D0D0D] font-semibold mb-3">Lowest Sentiment Students</p>
            <ol className="space-y-2 text-[13px]">
              {bottomStudents.slice(0, 5).map((s, idx) => (
                <li key={`${s.student_id}-${idx}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 inline-flex items-center justify-center rounded bg-[#F5F5F5] text-[#6B6F76] text-[11px]">{idx + 1}</span>
                    <span className="text-[#0D0D0D] font-medium">{s.name || s.student_id}</span>
                  </div>
                  <span className="text-[#DF2D36] font-semibold">{s.avg_conf.toFixed(2)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

