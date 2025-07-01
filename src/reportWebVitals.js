/**
 * 性能监控工具
 * 用于测量和报告应用程序的性能指标
 */

/**
 * 测量并报告Web Vitals性能指标
 * @param {Function} onPerfEntry - 性能指标回调函数
 */
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // 累积布局偏移 (Cumulative Layout Shift)
      getCLS(onPerfEntry);
      // 首次输入延迟 (First Input Delay)
      getFID(onPerfEntry);
      // 首次内容绘制 (First Contentful Paint)
      getFCP(onPerfEntry);
      // 最大内容绘制 (Largest Contentful Paint)
      getLCP(onPerfEntry);
      // 首次字节时间 (Time to First Byte)
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
