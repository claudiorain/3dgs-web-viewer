export function useMetrics() {
  const roundMetric = (val, metric) => {
    if (!val && val !== 0) return '';
    
    switch(metric) {
      case 'psnr': return parseFloat(val.toFixed(1));
      case 'ssim': return parseFloat(val.toFixed(3));
      case 'lpips': return parseFloat(val.toFixed(3));
      default: return parseFloat(val.toFixed(3));
    }
  }

  const getMetricColor = (value, metric) => {
    switch(metric) {
      case 'psnr': return value > 30 ? 'success' : value > 25 ? 'warning' : 'error';
      case 'ssim': return value > 0.9 ? 'success' : value > 0.8 ? 'warning' : 'error';
      case 'lpips': return value < 0.2 ? 'success' : value < 0.4 ? 'warning' : 'error';
      default: return 'primary';
    }
  }

  return {
    roundMetric,
    getMetricColor
  }
}