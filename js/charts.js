// CHARTS & ANALYTICS: THỰC PHẨM SỐ MỘT

(function() {
  let funnelChartInstance = null;
  let sourceChartInstance = null;

  // Khởi tạo biểu đồ lúc đầu
  function initCharts() {
    const funnelCtx = document.getElementById('funnel-chart');
    const sourceCtx = document.getElementById('source-chart');

    if (!funnelCtx || !sourceCtx) return;

    // Cấu hình font chữ mặc định của Chart.js phù hợp theme
    Chart.defaults.font.family = "'Be Vietnam Pro', 'Inter', sans-serif";
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.borderColor = '#1E2F25';

    // 1. BIỂU ĐỒ PHỄU CHUYỂN ĐỔI (Horizontal Bar Chart)
    funnelChartInstance = new Chart(funnelCtx, {
      type: 'bar',
      data: {
        labels: ['Mới Nhận', 'Đang Liên Hệ', 'Đã Gửi Báo Giá', 'Thương Lượng', 'Chốt Đơn', 'Thất Bại'],
        datasets: [{
          label: 'Số lượng leads',
          data: [0, 0, 0, 0, 0, 0],
          backgroundColor: [
            'rgba(59, 130, 246, 0.7)',   // Mới - Blue
            'rgba(245, 158, 11, 0.7)',   // Liên hệ - Amber
            'rgba(139, 92, 246, 0.7)',   // Báo giá - Purple
            'rgba(236, 72, 153, 0.7)',   // Thương lượng - Pink
            'rgba(16, 185, 129, 0.7)',   // Chốt đơn - Green
            'rgba(239, 68, 68, 0.7)'     // Thất bại - Red
          ],
          borderColor: [
            '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981', '#EF4444'
          ],
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y', // Chuyển thành biểu đồ nằm ngang (Horizontal)
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#142018',
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            borderColor: '#1E2F25',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: {
              color: '#1E2F25'
            },
            ticks: {
              stepSize: 1
            }
          },
          y: {
            grid: {
              display: false
            }
          }
        }
      }
    });

    // 2. BIỂU ĐỒ NGUỒN KÊNH MARKETING (Doughnut Chart)
    sourceChartInstance = new Chart(sourceCtx, {
      type: 'doughnut',
      data: {
        labels: ['Facebook Ads', 'Google Ads', 'TikTok Ads', 'Zalo', 'Website', 'Hotline', 'Giới thiệu'],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: [
            '#1877F2', // Facebook Blue
            '#EA4335', // Google Red
            '#00F2FE', // TikTok Cyan
            '#0068FF', // Zalo Blue
            '#10B981', // Website Emerald
            '#F59E0B', // Hotline Amber
            '#8B5CF6'  // Referral Purple
          ],
          borderWidth: 2,
          borderColor: '#142018', // Màu khớp với nền card
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            backgroundColor: '#142018',
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            borderColor: '#1E2F25',
            borderWidth: 1
          }
        },
        cutout: '65%' // Biến thành hình khuyên mỏng cao cấp
      }
    });

    // Cập nhật dữ liệu ngay khi khởi tạo
    updateCharts();
  }

  // Cập nhật lại số liệu biểu đồ dựa trên state hiện tại
  function updateCharts() {
    if (!funnelChartInstance || !sourceChartInstance) return;

    // 1. Tính toán phễu chuyển đổi
    const funnelCounts = { new: 0, contacting: 0, quoted: 0, negotiating: 0, won: 0, lost: 0 };
    
    // 2. Tính toán phân bổ nguồn leads
    const sourceCounts = {
      'Facebook Ads': 0,
      'Google Ads': 0,
      'TikTok Ads': 0,
      'Zalo': 0,
      'Website': 0,
      'Hotline': 0,
      'Giới thiệu': 0
    };

    state.leads.forEach(lead => {
      // Đếm phễu
      if (funnelCounts[lead.status] !== undefined) {
        funnelCounts[lead.status]++;
      }
      
      // Đếm nguồn
      if (sourceCounts[lead.source] !== undefined) {
        sourceCounts[lead.source]++;
      } else {
        // Fallback cho nguồn khác nếu có
        sourceCounts['Website']++;
      }
    });

    // Cập nhật dữ liệu biểu đồ Phễu
    funnelChartInstance.data.datasets[0].data = [
      funnelCounts.new,
      funnelCounts.contacting,
      funnelCounts.quoted,
      funnelCounts.negotiating,
      funnelCounts.won,
      funnelCounts.lost
    ];
    funnelChartInstance.update();

    // Cập nhật dữ liệu biểu đồ Nguồn
    sourceChartInstance.data.datasets[0].data = [
      sourceCounts['Facebook Ads'],
      sourceCounts['Google Ads'],
      sourceCounts['TikTok Ads'],
      sourceCounts['Zalo'],
      sourceCounts['Website'],
      sourceCounts['Hotline'],
      sourceCounts['Giới thiệu']
    ];
    sourceChartInstance.update();
  }

  // Export module để sử dụng toàn cục
  window.chartsModule = {
    initCharts: initCharts,
    updateCharts: updateCharts
  };
})();
