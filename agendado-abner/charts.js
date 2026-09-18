/**
 * charts.js — Gráficos simples desenhados em <canvas>
 * ------------------------------------------------------------
 * Implementação leve, sem bibliotecas externas, para manter o
 * projeto 100% independente de internet/CDN. Cobre apenas os
 * tipos de gráfico usados no app: barras, linha e rosca (donut).
 * ------------------------------------------------------------
 */

const Charts = (() => {

  function setupCanvas(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    return { ctx, w: rect.width, h: rect.height };
  }

  function barChart(canvas, { labels, values, colors, maxValue, suffix = '' }) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    if (!values.length) return;
    const max = maxValue || Math.max(...values, 1);
    const padding = { top: 16, bottom: 28, left: 8, right: 8 };
    const chartH = h - padding.top - padding.bottom;
    const gap = 14;
    const barW = (w - padding.left - padding.right - gap * (values.length - 1)) / values.length;

    values.forEach((val, i) => {
      const barH = max === 0 ? 0 : (val / max) * chartH;
      const x = padding.left + i * (barW + gap);
      const y = padding.top + (chartH - barH);
      const color = (colors && colors[i]) || 'var(--accent)';
      ctx.fillStyle = getComputedColor(color);
      roundRect(ctx, x, y, barW, barH, 6);
      ctx.fill();

      ctx.fillStyle = getComputedColor('--text-secondary');
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(val) + suffix, x + barW / 2, y - 6 < 10 ? 12 : y - 6);

      ctx.fillStyle = getComputedColor('--text-secondary');
      ctx.fillText(labels[i], x + barW / 2, h - 10);
    });
  }

  function lineChart(canvas, { labels, values, color = '--accent', fill = true }) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    if (!values.length) return;
    const padding = { top: 16, bottom: 24, left: 8, right: 8 };
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = (max - min) || 1;
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const stepX = values.length > 1 ? chartW / (values.length - 1) : 0;

    const points = values.map((v, i) => ({
      x: padding.left + i * stepX,
      y: padding.top + chartH - ((v - min) / range) * chartH
    }));

    if (fill) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      const c = getComputedColor(color);
      grad.addColorStop(0, hexToRgba(c, 0.25));
      grad.addColorStop(1, hexToRgba(c, 0.02));
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = getComputedColor(color);
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = getComputedColor(color);
      ctx.fill();
    });

    ctx.fillStyle = getComputedColor('--text-secondary');
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((l, i) => ctx.fillText(l, points[i].x, h - 6));
  }

  function donutChart(canvas, { value, max = 100, color = '--accent', trackColor = '--border', label = '' }) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) / 2 - 8;
    const lineWidth = Math.max(8, radius * 0.22);
    const pct = Math.max(0, Math.min(1, value / max));

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = getComputedColor(trackColor);
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.strokeStyle = getComputedColor(color);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = getComputedColor('--text-primary');
    ctx.font = '700 20px Sora, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(pct * 100)}%`, cx, cy - (label ? 8 : 0));
    if (label) {
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = getComputedColor('--text-secondary');
      ctx.fillText(label, cx, cy + 14);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, Math.max(h, 0.001) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function getComputedColor(varNameOrColor) {
    if (varNameOrColor.startsWith('--')) {
      return getComputedStyle(document.documentElement).getPropertyValue(varNameOrColor).trim() || '#2FA4C9';
    }
    return varNameOrColor;
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return { barChart, lineChart, donutChart };
})();
