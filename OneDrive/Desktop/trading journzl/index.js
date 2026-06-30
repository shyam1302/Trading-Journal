// STATE MANAGEMENT
    let trades = [];
    let pnlLineChartInstance = null;
    let marketBarChartInstance = null;
    let currentScreenshots = [];
    let lightboxScreenshots = [];
    let lightboxIndex = 0;
    let editTradeId = null;
    let activeNotesTradeId = null;
    let prevMetricValues = {
      totalPnl: 0,
      totalTrades: 0,
      winRate: 0
    };
    let assets = [
      { symbol: "BTC/USD", price: 67340.50, decimals: 2, change: 1.25 },
      { symbol: "ETH/USD", price: 3480.20, decimals: 2, change: 0.85 },
      { symbol: "XAU/USD", price: 4044.68, decimals: 2, change: -1.61 },
      { symbol: "EUR/USD", price: 1.08455, decimals: 5, change: 0.12 },
      { symbol: "GBP/USD", price: 1.27210, decimals: 5, change: 0.38 },
      { symbol: "TSLA", price: 187.60, decimals: 2, change: -1.22 },
      { symbol: "AAPL", price: 294.30, decimals: 2, change: -0.91 },
      { symbol: "NVDA", price: 200.04, decimals: 2, change: -4.13 },
      { symbol: "SOL/USD", price: 148.25, decimals: 2, change: -2.15 },
      { symbol: "SPY", price: 543.10, decimals: 2, change: 0.75 }
    ];

    // LOCAL STORAGE FUNCTIONS
    function loadTrades() {
      const stored = localStorage.getItem("trading_journal_trades");
      if (stored) {
        try {
          trades = JSON.parse(stored);
        } catch (e) {
          console.error("Error parsing stored trades, resetting.", e);
          trades = [];
          saveTradesToStorage();
        }
      } else {
        trades = [];
        showToast("Welcome to PulseJournal! Start logging your trades.", "success");
      }
    }

    function saveTradesToStorage() {
      localStorage.setItem("trading_journal_trades", JSON.stringify(trades));
    }

    // UTILITY: FORMAT CURRENCY
    function formatCurrency(amount) {
      const isNegative = amount < 0;
      const absAmount = Math.abs(amount);

      // Smart formatting: If very small decimals (like Forex prices), keep up to 4 places. Otherwise 2.
      let formatted = absAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      });

      return `${isNegative ? '-' : ''}$${formatted}`;
    }

    // TOAST NOTIFICATIONS
    function showToast(message, type = "success") {
      const container = document.getElementById("toast-container");
      const toast = document.createElement("div");
      toast.className = `toast ${type}`;

      let icon = "info";
      if (type === "success") icon = "check-circle";
      if (type === "error") icon = "alert-circle";

      toast.innerHTML = `<i data-lucide="${icon}" style="width:18px;height:18px;"></i> <span>${message}</span>`;
      container.appendChild(toast);
      lucide.createIcons();

      setTimeout(() => {
        toast.classList.add("toast-fadeOut");
        toast.addEventListener("animationend", () => {
          toast.remove();
        });
      }, 3500);
    }

    // THEME HANDLING
    function initTheme() {
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

      const theme = savedTheme || (prefersDark ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", theme);
      updateThemeTogglerUI(theme);
    }

    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const nextTheme = currentTheme === "dark" ? "light" : "dark";

      document.documentElement.setAttribute("data-theme", nextTheme);
      localStorage.setItem("theme", nextTheme);
      updateThemeTogglerUI(nextTheme);

      // Update charts to reflect theme font/grid color modifications
      renderCharts();
    }

    function updateThemeTogglerUI(theme) {
      const sunIcon = document.getElementById("theme-icon-sun");
      const moonIcon = document.getElementById("theme-icon-moon");
      if (theme === "dark") {
        sunIcon.style.display = "block";
        moonIcon.style.display = "none";
      } else {
        sunIcon.style.display = "none";
        moonIcon.style.display = "block";
      }
    }

    // NAVIGATION TABS SWITCHING
    function initNavigation() {
      const buttons = document.querySelectorAll(".tab-btn");
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          const tabId = btn.getAttribute("data-tab");

          // Toggle navigation classes
          buttons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");

          // Toggle visibility of panels
          document.querySelectorAll(".tab-content").forEach(content => {
            content.classList.remove("active");
          });
          document.getElementById(tabId).classList.add("active");

          // Chart rendering refresh on display
          if (tabId === "dashboard") {
            setTimeout(() => {
              renderCharts();
            }, 50);
          }
        });
      });
    }

    // UPDATE METRIC WIDGETS
    function updateMetrics() {
      const totalTrades = trades.length;

      let totalPnl = 0;
      let winningTrades = 0;
      let bestTradePnl = -Infinity;
      let bestSymbol = "N/A";
      let worstTradePnl = Infinity;
      let worstSymbol = "N/A";

      trades.forEach(trade => {
        totalPnl += trade.pnl;

        if (trade.pnl > 0) {
          winningTrades++;
        }

        if (trade.pnl > bestTradePnl) {
          bestTradePnl = trade.pnl;
          bestSymbol = `${trade.symbol} (${trade.market})`;
        }

        if (trade.pnl < worstTradePnl) {
          worstTradePnl = trade.pnl;
          worstSymbol = `${trade.symbol} (${trade.market})`;
        }
      });

      // Standardize empty variables if no trades logged
      if (totalTrades === 0) {
        bestTradePnl = 0;
        worstTradePnl = 0;
        bestSymbol = "No trades";
        worstSymbol = "No trades";
      }

      // Display metrics in widgets
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      // PNL UI updating
      const pnlElement = document.getElementById("val-pnl");
      const pnlCard = document.getElementById("metric-pnl");
      const pnlSub = document.getElementById("val-pnl-sub");

      animateValue(pnlElement, prevMetricValues.totalPnl, totalPnl, 800, true);

      pnlCard.classList.remove("profit", "loss");
      if (totalPnl > 0) {
        pnlCard.classList.add("profit");
        pnlElement.className = "metric-value text-profit";
        pnlSub.innerText = "Net Profit accrued";
      } else if (totalPnl < 0) {
        pnlCard.classList.add("loss");
        pnlElement.className = "metric-value text-loss";
        pnlSub.innerText = "Net Loss incurred";
      } else {
        pnlElement.className = "metric-value";
        pnlSub.innerText = "Net breakeven";
      }

      const totalTradesEl = document.getElementById("val-total-trades");
      animateValue(totalTradesEl, prevMetricValues.totalTrades, totalTrades, 800, false);

      const winRateEl = document.getElementById("val-win-rate");
      animateValue(winRateEl, prevMetricValues.winRate, winRate, 800, false, "%");

      document.getElementById("val-win-rate-ratio").innerText = `${winningTrades} of ${totalTrades} trades profitable`;

      document.getElementById("val-best-trade").innerText = formatCurrency(bestTradePnl);
      document.getElementById("val-best-symbol").innerText = bestSymbol;

      document.getElementById("val-worst-trade").innerText = formatCurrency(worstTradePnl);
      document.getElementById("val-worst-symbol").innerText = worstSymbol;

      // Save current metrics for next animations transition
      prevMetricValues.totalPnl = totalPnl;
      prevMetricValues.totalTrades = totalTrades;
      prevMetricValues.winRate = winRate;
    }

    // DRAW CUSTOM PREMIUM CHARTS
    function renderCharts() {
      drawSvgPnlChart();
      drawMarketBars();
      renderCalendar();
      updateSessionAnalysis();
    }

    // P&L CALENDAR
    let calendarMonth = new Date().getMonth();
    let calendarYear = new Date().getFullYear();

    function renderCalendar() {
      const grid = document.getElementById("calendar-grid");
      const label = document.getElementById("cal-month-label");
      if (!grid || !label) return;

      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      label.textContent = `${monthNames[calendarMonth]} ${calendarYear}`;

      // Aggregate daily P&L for the selected month
      const dailyPnl = {};
      trades.forEach(t => {
        if (!t.date) return;
        const dateStr = t.date.includes('T') ? t.date.split('T')[0] : t.date.split(' ')[0];
        const d = new Date(dateStr);
        if (d.getMonth() === calendarMonth && d.getFullYear() === calendarYear) {
          if (!dailyPnl[dateStr]) dailyPnl[dateStr] = { pnl: 0, count: 0 };
          dailyPnl[dateStr].pnl += t.pnl;
          dailyPnl[dateStr].count += 1;
        }
      });

      // Find best & worst day in this month
      let bestDay = null, worstDay = null;
      let bestPnl = -Infinity, worstPnl = Infinity;
      Object.entries(dailyPnl).forEach(([dateStr, data]) => {
        if (data.pnl > bestPnl) { bestPnl = data.pnl; bestDay = dateStr; }
        if (data.pnl < worstPnl) { worstPnl = data.pnl; worstDay = dateStr; }
      });

      // Build the calendar grid
      const firstDay = new Date(calendarYear, calendarMonth, 1);
      const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startDow = firstDay.getDay(); // 0=Sun

      let html = '';
      // Day-of-week labels
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      dayLabels.forEach(d => {
        html += `<div class="calendar-day-label">${d}</div>`;
      });

      // Empty cells before 1st
      for (let i = 0; i < startDow; i++) {
        html += '<div class="calendar-cell empty"></div>';
      }

      // Day cells
      for (let day = 1; day <= daysInMonth; day++) {
        const yyyy = calendarYear;
        const mm = String(calendarMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;
        const data = dailyPnl[dateKey];

        let cellClass = 'calendar-cell';
        let pnlHtml = '';
        let starHtml = '';
        let countHtml = '';

        if (data) {
          const pnl = data.pnl;
          const rounded = Math.round(pnl * 100) / 100;
          if (pnl > 0) {
            cellClass += ' profit';
            pnlHtml = `<span class="cal-pnl positive">+$${Math.abs(rounded).toFixed(2)}</span>`;
          } else if (pnl < 0) {
            cellClass += ' loss';
            pnlHtml = `<span class="cal-pnl negative">-$${Math.abs(rounded).toFixed(2)}</span>`;
          } else {
            cellClass += ' breakeven';
            pnlHtml = `<span class="cal-pnl zero">$0.00</span>`;
          }
          countHtml = `<span class="cal-trade-count">${data.count} trade${data.count > 1 ? 's' : ''}</span>`;

          // Best / Worst day markers
          if (dateKey === bestDay && bestPnl > 0) {
            cellClass += ' best-day';
            starHtml = '<span class="cal-star" title="Best Day">⭐</span>';
          }
          if (dateKey === worstDay && worstPnl < 0) {
            cellClass += ' worst-day';
            starHtml = '<span class="cal-star" title="Worst Day">⚠️</span>';
          }
        } else {
          cellClass += ' no-trade';
        }

        html += `
          <div class="${cellClass}${data ? ' has-trades' : ''}" title="${data ? `${dateKey}: $${data.pnl.toFixed(2)} (${data.count} trade${data.count > 1 ? 's' : ''})` : dateKey}" ${data ? `onclick="openDayTradesModal('${dateKey}')"` : ''}>
            ${starHtml}
            <span class="cal-day-num">${day}</span>
            ${pnlHtml}
            ${countHtml}
          </div>
        `;
      }

      grid.innerHTML = html;
    }

    function initCalendar() {
      document.getElementById("cal-prev").addEventListener("click", () => {
        calendarMonth--;
        if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
        renderCalendar();
      });
      document.getElementById("cal-next").addEventListener("click", () => {
        calendarMonth++;
        if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
        renderCalendar();
      });

      // Day-trades modal close
      document.getElementById("day-trades-modal-close").addEventListener("click", () => {
        document.getElementById("day-trades-modal").style.display = "none";
      });
      document.getElementById("day-trades-modal").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
          document.getElementById("day-trades-modal").style.display = "none";
        }
      });
    }

    // OPEN DAY TRADES MODAL
    window.openDayTradesModal = function (dateKey) {
      const modal = document.getElementById("day-trades-modal");
      const title = document.getElementById("day-trades-modal-title");
      const summary = document.getElementById("day-trades-summary");
      const list = document.getElementById("day-trades-list");

      // Get trades for this date
      const dayTrades = trades.filter(t => {
        if (!t.date) return false;
        const tDate = t.date.includes('T') ? t.date.split('T')[0] : t.date.split(' ')[0];
        return tDate === dateKey;
      });

      if (dayTrades.length === 0) return;

      // Format the date nicely
      const d = new Date(dateKey + 'T00:00:00');
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      const dateDisplay = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

      title.innerHTML = `
        <i data-lucide="calendar-days" style="color: var(--color-violet); width: 22px; height: 22px;"></i>
        <span>Trades on ${dateDisplay}</span>
      `;

      // Summary stats
      const totalPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      const wins = dayTrades.filter(t => t.pnl > 0).length;
      const losses = dayTrades.filter(t => t.pnl < 0).length;
      const pnlClass = totalPnl >= 0 ? 'text-profit' : 'text-loss';
      summary.innerHTML = `
        <span><strong>Trades:</strong> ${dayTrades.length}</span>
        <span><strong>Wins:</strong> <span style="color: var(--color-lime);">${wins}</span></span>
        <span><strong>Losses:</strong> <span style="color: var(--color-coral);">${losses}</span></span>
        <span><strong>Day P&L:</strong> <span class="${pnlClass}">${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}</span></span>
      `;

      // Render each trade as a card
      let cardsHtml = '';
      dayTrades.forEach(t => {
        const pnlColor = t.pnl >= 0 ? 'var(--color-lime)' : 'var(--color-coral)';
        const dirBadge = t.direction === 'Long'
          ? '<span style="background: rgba(200,255,63,0.12); color: var(--color-lime); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Long</span>'
          : '<span style="background: rgba(255,77,109,0.12); color: var(--color-coral); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Short</span>';

        const sessionBadge = t.session ? getSessionBadgeHtml(t.session) : '';
        const timeStr = t.date.includes(' ') ? t.date.split(' ')[1] : (t.date.includes('T') ? t.date.split('T')[1] : '');

        cardsHtml += `
          <div style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 800; font-size: 15px; color: var(--text-title); font-family: var(--font-display);">${t.symbol}</span>
                ${dirBadge}
                <span style="font-size: 11px; color: var(--text-muted);">${t.market}</span>
                ${sessionBadge}
              </div>
              <span style="font-weight: 800; font-size: 16px; color: ${pnlColor}; font-family: var(--font-mono);">${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}</span>
            </div>
            <div style="display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); flex-wrap: wrap;">
              ${timeStr ? `<span><strong>Time:</strong> ${timeStr}</span>` : ''}
              <span><strong>Entry:</strong> ${t.entryPrice}</span>
              <span><strong>Exit:</strong> ${t.exitPrice}</span>
              <span><strong>Qty:</strong> ${t.quantity}</span>
              ${t.strategy ? `<span><strong>Strategy:</strong> ${t.strategy}</span>` : ''}
              ${t.exitTrigger && t.exitTrigger !== 'Manual' ? `<span><strong>Exit:</strong> ${t.exitTrigger} Hit</span>` : ''}
            </div>
            ${t.notes ? `<div style="font-size: 12px; color: var(--text-body); border-top: 1px solid var(--border-color); padding-top: 6px; margin-top: 2px; line-height: 1.5; white-space: pre-wrap;">${t.notes}</div>` : ''}
          </div>
        `;
      });

      list.innerHTML = cardsHtml;
      modal.style.display = "block";
      lucide.createIcons();
    };

    // SESSION ANALYSIS GENERATOR
    function updateSessionAnalysis() {
      const tbody = document.getElementById("session-summary-tbody");
      if (!tbody) return;

      const sessionConfig = [
        { key: 'London', label: 'London', icon: 'building' },
        { key: 'New York', label: 'NY', icon: 'sunrise' },
        { key: 'Asian', label: 'Asian', icon: 'globe' },
        { key: 'London/NY', label: 'London/NY Overlap', icon: 'shuffle' },
        { key: 'Outside', label: 'Outside of Sessions', icon: 'circle-ellipsis' }
      ];

      let html = '';

      sessionConfig.forEach(item => {
        let sessionTrades;
        if (item.key === 'Outside') {
          sessionTrades = trades.filter(t => !t.session || !['London', 'New York', 'Asian', 'London/NY'].includes(t.session));
        } else {
          sessionTrades = trades.filter(t => t.session === item.key);
        }

        const count = sessionTrades.length;

        let netPnl = 0;
        let totalProfit = 0;
        let totalLoss = 0;
        let wins = 0;

        sessionTrades.forEach(t => {
          netPnl += t.pnl;
          if (t.pnl > 0) {
            totalProfit += t.pnl;
            wins++;
          } else if (t.pnl < 0) {
            totalLoss += Math.abs(t.pnl);
          }
        });

        const winRate = count > 0 ? (wins / count) * 100 : 0;

        // PNL formatting and colors
        const pnlColorClass = netPnl > 0 ? 'text-profit' : (netPnl < 0 ? 'text-loss' : '');
        const pnlSign = netPnl > 0 ? '+' : (netPnl < 0 ? '-' : '');

        // Format absolute values to avoid double negatives
        const formattedNetPnl = formatCurrency(Math.abs(netPnl));
        const formattedTotalProfit = totalProfit > 0 ? formatCurrency(totalProfit) : '$0.00';
        const formattedTotalLoss = totalLoss > 0 ? formatCurrency(totalLoss) : '$0.00';

        const barWidth = winRate.toFixed(1);

        html += `
          <tr>
            <td>
              <div class="session-cell-name">
                <span class="session-cell-icon">
                  <i data-lucide="${item.icon}"></i>
                </span>
                <span>${item.label}</span>
              </div>
            </td>
            <td style="text-align: right;" class="session-pnl-cell ${pnlColorClass}">
              ${netPnl !== 0 ? pnlSign : ''}${formattedNetPnl}
            </td>
            <td>
              <div class="session-win-rate-cell">
                <div class="session-win-rate-bar-container">
                  <div class="session-win-rate-bar" style="width: ${barWidth}%;"></div>
                </div>
                <span class="session-win-rate-text">${barWidth}%</span>
              </div>
            </td>
            <td style="text-align: right;" class="session-currency-cell text-profit">
              ${formattedTotalProfit}
            </td>
            <td style="text-align: right;" class="session-currency-cell text-loss">
              ${formattedTotalLoss}
            </td>
            <td style="text-align: right;" class="session-trades-cell">
              ${count}
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
      lucide.createIcons();
    }

    // SVG P&L CHART GENERATOR
    function drawSvgPnlChart() {
      const container = document.getElementById("pnl-chart-container");
      if (!container) return;

      const chronTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningTotal = 0;
      const labels = ["Start"];
      const dataPoints = [0];

      chronTrades.forEach(t => {
        runningTotal += t.pnl;
        const formattedDate = t.date.split(' ')[0].slice(5); // MM-DD
        labels.push(`${formattedDate} ${t.symbol}`);
        dataPoints.push(runningTotal);
      });

      const viewBoxWidth = 800;
      const viewBoxHeight = 280;
      const paddingLeft = 70;
      const paddingRight = 30;
      const paddingTop = 30;
      const paddingBottom = 40;

      const minVal = Math.min(...dataPoints);
      const maxVal = Math.max(...dataPoints);
      const valRange = maxVal - minVal;

      // Pad range to avoid lines hugging absolute top/bottom boundaries
      const paddingRatio = 0.15;
      let adjustedMin = minVal - valRange * paddingRatio;
      let adjustedMax = maxVal + valRange * paddingRatio;

      if (Math.abs(valRange) < 0.01) {
        adjustedMin = minVal - 100;
        adjustedMax = maxVal + 100;
      }

      // Generate horizontal grid lines
      let gridLinesHtml = '';
      let gridTicksHtml = '';
      const divisions = 4;
      for (let j = 0; j <= divisions; j++) {
        const yLine = paddingTop + (j / divisions) * (viewBoxHeight - paddingTop - paddingBottom);
        const val = adjustedMax - (j / divisions) * (adjustedMax - adjustedMin);
        gridLinesHtml += `<line class="pnl-grid-line" x1="${paddingLeft}" y1="${yLine}" x2="${viewBoxWidth - paddingRight}" y2="${yLine}" />`;
        gridTicksHtml += `<text class="pnl-axis-text" x="${paddingLeft - 12}" y="${yLine + 4}" text-anchor="end">${formatCurrency(val)}</text>`;
      }

      let xTicksHtml = '';
      let pathD = '';
      let points = [];
      const n = dataPoints.length;

      for (let i = 0; i < n; i++) {
        const x = paddingLeft + (i / (n - 1 || 1)) * (viewBoxWidth - paddingLeft - paddingRight);
        const y = viewBoxHeight - paddingBottom - ((dataPoints[i] - adjustedMin) / (adjustedMax - adjustedMin || 1)) * (viewBoxHeight - paddingTop - paddingBottom);
        points.push({ x, y, val: dataPoints[i], label: labels[i] });

        if (i === 0) {
          pathD += `M ${x} ${y}`;
        } else {
          pathD += ` L ${x} ${y}`;
        }
      }

      // Generate vertical grids and x-axis labels (cap at 5 to prevent labels overlapping)
      const labelCount = Math.min(5, n);
      const stride = Math.max(1, Math.floor((n - 1) / (labelCount - 1)));
      for (let i = 0; i < n; i += stride) {
        const x = points[i].x;
        gridLinesHtml += `<line class="pnl-grid-line" x1="${x}" y1="${paddingTop}" x2="${x}" y2="${viewBoxHeight - paddingBottom}" />`;
        xTicksHtml += `<text class="pnl-axis-text" x="${x}" y="${viewBoxHeight - paddingBottom + 20}" text-anchor="middle">${labels[i]}</text>`;
      }
      if (n > 1 && (n - 1) % stride !== 0) {
        const x = points[n - 1].x;
        xTicksHtml += `<text class="pnl-axis-text" x="${x}" y="${viewBoxHeight - paddingBottom + 20}" text-anchor="middle">${labels[n - 1]}</text>`;
      }

      // Closed Area Polygon path
      let areaD = '';
      if (points.length > 0) {
        areaD = `${pathD} L ${points[points.length - 1].x} ${viewBoxHeight - paddingBottom} L ${points[0].x} ${viewBoxHeight - paddingBottom} Z`;
      }

      // Draw point circles
      let dotsHtml = '';
      points.forEach((pt) => {
        const radius = n > 30 ? 1.5 : 4;
        const tooltipText = `${pt.label}\nCumulative P&L: ${formatCurrency(pt.val)}`;
        dotsHtml += `
          <circle class="pnl-dot" cx="${pt.x}" cy="${pt.y}" r="${radius}" style="opacity: 0;">
            <title>${tooltipText}</title>
          </circle>
        `;
      });

      const svgContent = `
        <svg width="100%" height="100%" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" style="overflow: visible;">
          <defs>
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--color-violet)" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="var(--color-violet)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          
          <!-- Grid Overlay -->
          <g>${gridLinesHtml}</g>
          
          <!-- Border Axes -->
          <line class="pnl-axis-line" x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${viewBoxHeight - paddingBottom}" />
          <line class="pnl-axis-line" x1="${paddingLeft}" y1="${viewBoxHeight - paddingBottom}" x2="${viewBoxWidth - paddingRight}" y2="${viewBoxHeight - paddingBottom}" />
          
          <!-- Axes Ticks -->
          <g>${gridTicksHtml}</g>
          <g>${xTicksHtml}</g>
          
          <!-- Area Shading -->
          <path class="pnl-area-fill" d="${areaD}" />
          
          <!-- Glow Filter Path -->
          <path class="pnl-line-glow" d="${pathD}" />
          
          <!-- Main Line Path -->
          <path class="pnl-line-main" d="${pathD}" />
          
          <!-- Points Dots -->
          <g>${dotsHtml}</g>
        </svg>
      `;

      container.innerHTML = svgContent;

      // Animate line path drawing stroke-dashoffset
      const pathEl = container.querySelector('.pnl-line-main');
      const glowEl = container.querySelector('.pnl-line-glow');
      const areaEl = container.querySelector('.pnl-area-fill');
      const dots = container.querySelectorAll('.pnl-dot');

      if (pathEl && points.length > 1) {
        const length = pathEl.getTotalLength();

        pathEl.style.strokeDasharray = length;
        pathEl.style.strokeDashoffset = length;
        glowEl.style.strokeDasharray = length;
        glowEl.style.strokeDashoffset = length;

        // Force reflow
        pathEl.getBoundingClientRect();

        pathEl.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        pathEl.style.strokeDashoffset = '0';

        glowEl.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        glowEl.style.strokeDashoffset = '0';

        setTimeout(() => {
          if (areaEl) {
            areaEl.style.opacity = '1';
          }
          dots.forEach(dot => {
            dot.style.opacity = '1';
          });
        }, 1300);
      } else {
        if (areaEl) areaEl.style.opacity = '1';
        dots.forEach(dot => {
          dot.style.opacity = '1';
        });
      }
    }

    // HTML CUSTOM WIN RATE BARS GENERATOR
    function drawMarketBars() {
      const container = document.getElementById("market-bars-container");
      if (!container) return;

      const markets = ["Stocks", "Forex", "Crypto"];
      const colors = {
        "Stocks": "var(--color-violet)",
        "Forex": "var(--color-cyan)",
        "Crypto": "var(--color-lime)"
      };

      const winRates = markets.map(market => {
        const marketTrades = trades.filter(t => t.market === market);
        if (marketTrades.length === 0) return 0;

        const wins = marketTrades.filter(t => t.pnl > 0).length;
        return (wins / marketTrades.length) * 100;
      });

      let barsHtml = `
        <div style="display: flex; justify-content: space-around; align-items: flex-end; height: 100%; width: 100%; padding-top: 20px;">
      `;

      markets.forEach((market, idx) => {
        const color = colors[market];
        barsHtml += `
          <div class="market-bar-wrapper">
            <div class="market-bar-val" id="bar-val-${market}">0.0%</div>
            <div class="market-bar-outer">
              <div class="market-bar-inner" id="bar-inner-${market}" style="background: ${color}; height: 0%;">
                <div class="shimmer-effect"></div>
              </div>
            </div>
            <div class="market-bar-label">${market}</div>
          </div>
        `;
      });

      barsHtml += `</div>`;
      container.innerHTML = barsHtml;

      // Trigger staggered growth animation
      markets.forEach((market, idx) => {
        const targetRate = winRates[idx];
        const barInner = document.getElementById(`bar-inner-${market}`);
        const barVal = document.getElementById(`bar-val-${market}`);

        setTimeout(() => {
          if (barInner) {
            barInner.style.transition = 'height 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            barInner.style.height = `${targetRate}%`;
          }

          let currentVal = 0;
          const totalSteps = 1.2 * 1000 / 16; // 60fps for 1.2s
          const increment = targetRate / totalSteps;

          function animateRate() {
            currentVal += increment;
            if (currentVal >= targetRate) {
              if (barVal) barVal.innerText = `${targetRate.toFixed(1)}%`;
            } else {
              if (barVal) {
                barVal.innerText = `${currentVal.toFixed(1)}%`;
                requestAnimationFrame(animateRate);
              }
            }
          }
          animateRate();
        }, idx * 250); // Stagger by 250ms
      });
    }

    // AMBIENT CANDLESTICK canvas drift background
    function initCandlestickBackground() {
      const canvas = document.getElementById("bg-candlesticks");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      let width = canvas.width = window.innerWidth;
      let height = canvas.height = window.innerHeight;

      window.addEventListener("resize", () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      });

      const candles = [];
      const candleWidth = 12;
      const spacing = 20;
      const speed = 0.3;

      const count = Math.ceil(width / (candleWidth + spacing)) + 2;
      for (let i = 0; i < count; i++) {
        candles.push(createCandle(i * (candleWidth + spacing)));
      }

      function createCandle(startX) {
        const isGreen = Math.random() > 0.5;
        const candleHeight = 25 + Math.random() * 85;
        const centerY = height / 2 + (Math.random() - 0.5) * (height * 0.6);
        const highOffset = 8 + Math.random() * 25;
        const lowOffset = 8 + Math.random() * 25;

        return {
          x: startX,
          y: centerY - candleHeight / 2,
          w: candleWidth,
          h: candleHeight,
          highY: centerY - candleHeight / 2 - highOffset,
          lowY: centerY + candleHeight / 2 + lowOffset,
          isGreen
        };
      }

      function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < candles.length; i++) {
          const c = candles[i];
          c.x -= speed;

          const strokeColor = c.isGreen ? 'rgba(200, 255, 63, 0.05)' : 'rgba(255, 77, 109, 0.05)';
          const fillColor = c.isGreen ? 'rgba(200, 255, 63, 0.02)' : 'rgba(255, 77, 109, 0.02)';

          ctx.strokeStyle = strokeColor;
          ctx.fillStyle = fillColor;
          ctx.lineWidth = 1.5;

          // Draw wick line
          ctx.beginPath();
          ctx.moveTo(c.x + c.w / 2, c.highY);
          ctx.lineTo(c.x + c.w / 2, c.lowY);
          ctx.stroke();

          // Draw body rect
          ctx.fillRect(c.x, c.y, c.w, c.h);
          ctx.strokeRect(c.x, c.y, c.w, c.h);
        }

        if (candles.length > 0 && candles[0].x < -candleWidth) {
          candles.shift();
          const lastX = candles[candles.length - 1].x;
          candles.push(createCandle(lastX + candleWidth + spacing));
        }

        requestAnimationFrame(animate);
      }

      animate();
    }    // TICKER MARQUEE PRICE LOOP WITH TRADINGVIEW LINKS & REAL DATA
    // Store previous close prices for forex/gold to compute real % change
    let forexPrevClose = {};
    let tickerInitialized = false;

    function initScrollingTicker() {
      const tickerTrack = document.getElementById("ticker-track");
      if (!tickerTrack) return;

      function getTvSymbol(symbol) {
        if (symbol === "BTC/USD") return "BINANCE:BTCUSDT";
        if (symbol === "ETH/USD") return "BINANCE:ETHUSDT";
        if (symbol === "SOL/USD") return "BINANCE:SOLUSDT";
        if (symbol === "XAU/USD") return "OANDA:XAUUSD";
        if (symbol === "EUR/USD") return "FX:EURUSD";
        if (symbol === "GBP/USD") return "FX:GBPUSD";
        if (["TSLA", "AAPL", "NVDA"].includes(symbol)) return "NASDAQ:" + symbol;
        if (symbol === "SPY") return "AMEX:SPY";
        return symbol.replace("/", "");
      }

      function createItemHtml(asset, idx, copyNum) {
        const isUp = asset.change >= 0;
        const changeText = `${isUp ? '+' : ''}${asset.change.toFixed(2)}%`;
        const classText = isUp ? 'ticker-up' : 'ticker-down';
        const icon = isUp ? '▲' : '▼';
        const formattedPrice = asset.price.toLocaleString(undefined, {
          minimumFractionDigits: asset.decimals,
          maximumFractionDigits: asset.decimals
        });
        const tvSymbol = getTvSymbol(asset.symbol);

        return `
          <a href="https://www.tradingview.com/chart/?symbol=${tvSymbol}" target="_blank" class="ticker-item" id="ticker-item-${idx}-${copyNum}">
            <span style="color: var(--text-title); font-weight: 700;">${asset.symbol}</span>
            <span class="ticker-price" style="color: var(--text-body); font-family: var(--font-mono);">${formattedPrice}</span>
            <span class="ticker-change ${classText}" style="font-family: var(--font-mono);">${icon} ${changeText}</span>
          </a>
        `;
      }

      let html0 = assets.map((a, i) => createItemHtml(a, i, 0)).join('');
      let html1 = assets.map((a, i) => createItemHtml(a, i, 1)).join('');
      tickerTrack.innerHTML = html0 + html1;

      // Initial live pull and periodic sync every 30 seconds
      fetchLivePrices();
      setInterval(fetchLivePrices, 30000);
    }

    // FETCH REAL LIVE PRICES FROM PUBLIC APIS
    async function fetchLivePrices() {
      // 1. Fetch Cryptocurrencies from Binance API (provides real 24hr price change %)
      try {
        const symbolsArg = encodeURIComponent(JSON.stringify(["BTCUSDT", "ETHUSDT", "SOLUSDT"]));
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsArg}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach(item => {
              let symbol = "";
              if (item.symbol === "BTCUSDT") symbol = "BTC/USD";
              else if (item.symbol === "ETHUSDT") symbol = "ETH/USD";
              else if (item.symbol === "SOLUSDT") symbol = "SOL/USD";

              const asset = assets.find(a => a.symbol === symbol);
              if (asset) {
                asset.price = parseFloat(item.lastPrice);
                asset.change = parseFloat(item.priceChangePercent);
              }
            });
          }
        }
      } catch (e) {
        console.error("Error fetching crypto rates from Binance:", e);
      }

      // 2. Fetch Forex & Gold from Open ER-API (provides daily rates)
      // We track the first fetch as "previous close" and compute % change from that baseline
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) {
            const eurRate = 1 / data.rates.EUR;
            const gbpRate = 1 / data.rates.GBP;
            // XAU rate from ER-API is ounces per USD, so 1/rate = USD per ounce
            const xauRate = data.rates.XAU ? (1 / data.rates.XAU) : null;

            const forexPairs = [
              { symbol: "EUR/USD", rate: eurRate },
              { symbol: "GBP/USD", rate: gbpRate }
            ];
            if (xauRate) forexPairs.push({ symbol: "XAU/USD", rate: xauRate });

            forexPairs.forEach(pair => {
              const asset = assets.find(a => a.symbol === pair.symbol);
              if (asset) {
                // Store previous close on first fetch for % change calculation
                if (!forexPrevClose[pair.symbol]) {
                  forexPrevClose[pair.symbol] = asset.price; // Use initial hardcoded as "yesterday's close"
                }
                asset.price = pair.rate;
                // Calculate % change from the stored previous close
                const prevClose = forexPrevClose[pair.symbol];
                if (prevClose && prevClose > 0) {
                  asset.change = ((pair.rate - prevClose) / prevClose) * 100;
                }
              }
            });
          }
        }
      } catch (e) {
        console.error("Error fetching forex/gold rates:", e);
      }

      // 3. Fetch US Stocks from Yahoo Finance via AllOrigins proxy
      const stockSymbols = ["AAPL", "NVDA", "TSLA", "SPY"];
      for (const sym of stockSymbols) {
        try {
          const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const data = await res.json();
            if (data && data.chart && data.chart.result && data.chart.result[0]) {
              const meta = data.chart.result[0].meta;
              const price = meta.regularMarketPrice;
              const prevClose = meta.chartPreviousClose || meta.previousClose;
              const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0.0;

              const asset = assets.find(a => a.symbol === sym);
              if (asset) {
                asset.price = price;
                asset.change = change;
              }
            }
          }
        } catch (e) {
          console.error(`Error fetching stock chart for ${sym}:`, e);
        }
      }

      tickerInitialized = true;
      updateTickerUI();
    }

    // UPDATE TICKER DOM TEXT IN-PLACE WITH FLASH EFFECT
    let prevTickerPrices = {};
    function updateTickerUI() {
      assets.forEach((a, idx) => {
        const formattedPrice = a.price.toLocaleString(undefined, {
          minimumFractionDigits: a.decimals,
          maximumFractionDigits: a.decimals
        });
        const isUp = a.change >= 0;
        const changeText = `${isUp ? '+' : ''}${a.change.toFixed(2)}%`;
        const classText = isUp ? 'ticker-up' : 'ticker-down';
        const icon = isUp ? '▲' : '▼';

        // Detect if price changed for flash effect
        const priceChanged = prevTickerPrices[a.symbol] !== undefined && prevTickerPrices[a.symbol] !== formattedPrice;
        prevTickerPrices[a.symbol] = formattedPrice;

        [0, 1].forEach(copyNum => {
          const itemEl = document.getElementById(`ticker-item-${idx}-${copyNum}`);
          if (itemEl) {
            const priceEl = itemEl.querySelector(".ticker-price");
            const changeEl = itemEl.querySelector(".ticker-change");
            if (priceEl) {
              priceEl.textContent = formattedPrice;
              // Brief flash animation on price update
              if (priceChanged && tickerInitialized) {
                priceEl.style.color = isUp ? 'var(--color-lime)' : 'var(--color-coral)';
                setTimeout(() => {
                  priceEl.style.color = 'var(--text-body)';
                }, 800);
              }
            }
            if (changeEl) {
              changeEl.textContent = `${icon} ${changeText}`;
              changeEl.className = `ticker-change ${classText}`;
            }
          }
        });
      });
    }

    // DYNAMIC SESSION INDICATOR
    function updateTradingSessionIndicator() {
      const label = document.getElementById("current-session-label");
      if (!label) return;

      const utcHour = new Date().getUTCHours();
      let session = "Asian Session";

      if (utcHour >= 8 && utcHour < 13) {
        session = "London Session";
      } else if (utcHour >= 13 && utcHour < 17) {
        session = "London / NY Session";
      } else if (utcHour >= 17 && utcHour < 22) {
        session = "New York Session";
      } else if (utcHour >= 22 || utcHour < 8) {
        session = "Asian Session";
      }

      label.innerText = session;
    }

    // 3D CARD TILT ON CURSOR
    function initCardTilt() {
      const cards = document.querySelectorAll(".metric-card");
      cards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotateX = ((centerY - y) / centerY) * 7;
          const rotateY = ((x - centerX) / centerX) * 7;

          card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.style.transition = 'transform 0.1s ease-out, border-color 0.3s, box-shadow 0.3s';

        card.addEventListener("mouseleave", () => {
          card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
      });
    }

    // NUMERIC WIDGET EASING COUNTER
    function animateValue(element, start, end, duration, isCurrency = false, suffix = '') {
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // Cubic Ease Out
        const current = start + ease * (end - start);

        if (isCurrency) {
          element.innerText = formatCurrency(current);
        } else {
          if (suffix === '%') {
            element.innerText = `${current.toFixed(1)}%`;
          } else {
            element.innerText = Math.floor(current).toLocaleString() + suffix;
          }
        }

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          if (isCurrency) {
            element.innerText = formatCurrency(end);
          } else {
            if (suffix === '%') {
              element.innerText = `${end.toFixed(1)}%`;
            } else {
              element.innerText = end.toLocaleString() + suffix;
            }
          }
        }
      };
      window.requestAnimationFrame(step);
    }

    // BUTTON PARTICLE SPARKS BURST ON SAVE
    function spawnSubmitParticles(btn) {
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const colors = ['var(--color-violet)', 'var(--color-lime)', 'var(--color-coral)', 'var(--color-cyan)'];
      const count = 24;

      for (let i = 0; i < count; i++) {
        const p = document.createElement("div");
        const size = Math.random() * 5 + 4;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        p.style.position = 'fixed';
        p.style.left = `${startX}px`;
        p.style.top = `${startY}px`;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.backgroundColor = color;
        p.style.borderRadius = '50%';
        p.style.pointerEvents = 'none';
        p.style.zIndex = '99999';
        p.style.boxShadow = `0 0 8px ${color}`;

        document.body.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 5 + 3;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        let opacity = 1;
        let x = startX;
        let y = startY;

        function move() {
          x += vx;
          y += vy + 0.12; // Gravitational drop
          opacity -= 0.022;

          p.style.left = `${x}px`;
          p.style.top = `${y}px`;
          p.style.opacity = opacity;

          if (opacity > 0) {
            requestAnimationFrame(move);
          } else {
            p.remove();
          }
        }
        requestAnimationFrame(move);
      }
    }

    // SESSION BADGE HELPER
    function getSessionBadgeHtml(session) {
      if (!session) return '<span style="color: var(--text-muted); font-size: 12px;">-</span>';
      let badgeClass = 'badge-session ';
      if (session === 'Asian') badgeClass += 'badge-session-asian';
      else if (session === 'London') badgeClass += 'badge-session-london';
      else if (session === 'London/NY') badgeClass += 'badge-session-london-ny';
      else if (session === 'New York') badgeClass += 'badge-session-newyork';
      return `<span class="badge ${badgeClass}">${session}</span>`;
    }

    // RENDER TRADE LOG TABLE
    function renderTable() {
      const tbody = document.getElementById("trades-table-body");
      tbody.innerHTML = "";

      const marketFilter = document.getElementById("filter-market").value;
      const directionFilter = document.getElementById("filter-direction").value;
      const sessionFilter = document.getElementById("filter-session").value;

      // Filter trades
      let filtered = trades.filter(t => {
        const matchesMarket = (marketFilter === "All" || t.market === marketFilter);
        const matchesDirection = (directionFilter === "All" || t.direction === directionFilter);
        const matchesSession = (sessionFilter === "All" || t.session === sessionFilter);
        return matchesMarket && matchesDirection && matchesSession;
      });

      // Sort chronological descending (newest trades at top of table log)
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="12">
              <div class="empty-state">
                <i class="empty-icon" data-lucide="inbox" style="width:48px;height:48px;"></i>
                <h3>No trades found</h3>
                <p>Add new trades or clear filters to see logged items.</p>
              </div>
            </td>
          </tr>
        `;
        lucide.createIcons();
        return;
      }

      filtered.forEach(trade => {
        const row = document.createElement("tr");

        const isProfit = trade.pnl > 0;
        const isLoss = trade.pnl < 0;
        let pnlClass = "";
        if (isProfit) pnlClass = "text-profit";
        if (isLoss) pnlClass = "text-loss";

        // Badges styling
        const marketBadgeClass = `badge badge-${trade.market.toLowerCase()}`;
        const dirBadgeClass = `badge badge-${trade.direction.toLowerCase()}`;

        // Chart preview cell
        let chartCell = '<span style="color: var(--text-muted); font-size: 12px;">-</span>';
        const screenshots = trade.screenshots || (trade.screenshot ? [trade.screenshot] : []);
        if (screenshots.length > 0) {
          const badgeHtml = screenshots.length > 1 ? `<div class="chart-badge">+${screenshots.length}</div>` : '';
          chartCell = `
            <button class="btn-chart-preview" onclick="openLightbox('${trade.id}')" title="View Chart Screenshots" style="position: relative;">
              <img src="${screenshots[0]}" style="width: 36px; height: 24px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);" />
              ${badgeHtml}
            </button>
          `;
        }

        const displayExitDate = trade.exitDate ? trade.exitDate.replace('T', ' ') : '-';

        let exitPriceCell = trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
        if (trade.exitTrigger && trade.exitTrigger !== 'Manual') {
          let badgeClass = "";
          let badgeText = "";
          if (trade.exitTrigger === 'TP') {
            badgeClass = "badge-tp";
            badgeText = "TP Hit";
          } else if (trade.exitTrigger === 'SL') {
            badgeClass = "badge-sl";
            badgeText = "SL Hit";
          } else if (trade.exitTrigger === 'TSL') {
            badgeClass = "badge-tsl";
            badgeText = "TSL Hit";
          }
          exitPriceCell += `<br><span class="${badgeClass}">${badgeText}</span>`;
        }

        row.innerHTML = `
          <td style="white-space: nowrap;">
            <div style="font-weight: 600; font-size: 13px; color: var(--text-title);">In: ${trade.date.replace('T', ' ')}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Out: ${displayExitDate}</div>
          </td>
          <td style="font-weight: 700; color: var(--text-title);">${trade.symbol}</td>
          <td><span class="${marketBadgeClass}">${trade.market}</span></td>
          <td><span class="${dirBadgeClass}">${trade.direction}</span></td>
          <td>${trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</td>
          <td>${exitPriceCell}</td>
          <td>${trade.quantity.toLocaleString()}</td>
          <td><span class="${pnlClass}">${formatCurrency(trade.pnl)}</span></td>
          <td style="text-align: center;">${chartCell}</td>
          <td>${getSessionBadgeHtml(trade.session)}</td>
          <td style="color: var(--text-muted); font-size: 13px;">${trade.strategy || '-'}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn-notes" onclick="openNotesModal('${trade.id}')" title="${trade.notes && trade.notes.trim().length > 0 ? 'View/Edit Trade Notes' : 'Add Trade Notes'}" style="${trade.notes && trade.notes.trim().length > 0 ? 'color: var(--color-primary); background: var(--color-primary-light);' : 'opacity: 0.6;'}">
              <i data-lucide="file-text" style="width:16px;height:16px;"></i>
            </button>
            <button class="btn-edit" onclick="startEditTrade('${trade.id}')" title="Edit Trade">
              <i data-lucide="edit-3" style="width:16px;height:16px;"></i>
            </button>
            <button class="btn-delete" onclick="deleteTrade('${trade.id}')" title="Delete Trade">
              <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });

      lucide.createIcons();
    }

    // DETERMINE TRADING SESSION FROM LOCAL TIME
    function determineSessionFromTime(dateStr, timeStr) {
      if (!dateStr || !timeStr) return '';
      // Build a local Date object from the form inputs
      const localDate = new Date(`${dateStr}T${timeStr}:00`);
      if (isNaN(localDate.getTime())) return '';
      // Convert to UTC hours
      const utcHour = localDate.getUTCHours();
      // Forex session windows (UTC):
      // Asian:       22:00 – 08:00
      // London:      08:00 – 13:00
      // London/NY:   13:00 – 17:00
      // New York:    17:00 – 22:00
      if (utcHour >= 8 && utcHour < 13) return 'London';
      if (utcHour >= 13 && utcHour < 17) return 'London/NY';
      if (utcHour >= 17 && utcHour < 22) return 'New York';
      return 'Asian'; // 22:00 – 08:00 UTC
    }

    function autoDetectSession() {
      const dateStr = document.getElementById("trade-date").value;
      const timeStr = document.getElementById("trade-time").value;
      const session = determineSessionFromTime(dateStr, timeStr);
      if (session) {
        document.getElementById("trade-session").value = session;
      }
    }

    // FORM HANDLER & ACTIONS
    function getTodayAndCurrentTime() {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return { today, time: `${hours}:${minutes}` };
    }

    function initForm() {
      // Set today's date & time in form as default
      const defaults = getTodayAndCurrentTime();
      document.getElementById("trade-date").value = defaults.today;
      document.getElementById("trade-time").value = defaults.time;
      document.getElementById("trade-exit-date").value = defaults.today;
      document.getElementById("trade-exit-time").value = defaults.time;

      // Auto-detect session from current time on load
      autoDetectSession();

      // Listen for entry time/date changes to auto-detect session
      document.getElementById("trade-time").addEventListener("change", autoDetectSession);
      document.getElementById("trade-date").addEventListener("change", autoDetectSession);

      const form = document.getElementById("trade-form");
      form.addEventListener("submit", (e) => {
        e.preventDefault();

        // Spawn absolute neon particle burst
        const submitBtn = document.getElementById("btn-submit-trade");
        spawnSubmitParticles(submitBtn);

        const dateVal = document.getElementById("trade-date").value;
        const timeVal = document.getElementById("trade-time").value;
        const date = dateVal + ' ' + timeVal;

        const exitDateVal = document.getElementById("trade-exit-date").value;
        const exitTimeVal = document.getElementById("trade-exit-time").value;
        const exitDate = exitDateVal + ' ' + exitTimeVal;

        const market = document.getElementById("trade-market").value;
        const symbol = document.getElementById("trade-symbol").value.trim().toUpperCase();
        const direction = document.getElementById("trade-direction").value;
        const entryPrice = parseFloat(document.getElementById("trade-entry").value);
        const quantity = parseFloat(document.getElementById("trade-qty").value);
        const strategy = document.getElementById("trade-strategy").value.trim();
        const session = document.getElementById("trade-session").value;
        const notes = document.getElementById("trade-notes").value.trim();

        // New fields
        const stopLoss = parseFloat(document.getElementById("trade-sl").value) || null;
        const takeProfit = parseFloat(document.getElementById("trade-tp").value) || null;
        const trailingStop = parseFloat(document.getElementById("trade-tsl").value) || null;
        const exitTrigger = document.getElementById("trade-exit-trigger").value;

        // Calculate exit price dynamically from target hit
        let exitPrice = entryPrice; // Default fallback to entryPrice (breakeven) if Manual/None
        if (exitTrigger === 'TP') {
          if (takeProfit === null) {
            showToast("Please enter a Take Profit (TP) value for TP Hit outcome.", "error");
            return;
          }
          exitPrice = takeProfit;
        } else if (exitTrigger === 'SL') {
          if (stopLoss === null) {
            showToast("Please enter a Stop Loss (SL) value for SL Hit outcome.", "error");
            return;
          }
          exitPrice = stopLoss;
        } else if (exitTrigger === 'TSL') {
          if (trailingStop === null) {
            showToast("Please enter a Trailing Stop Loss (TSL) value for TSL Hit outcome.", "error");
            return;
          }
          exitPrice = trailingStop;
        }

        // Validations
        if (!date || !exitDate || !symbol || isNaN(entryPrice) || isNaN(quantity)) {
          showToast("Please fill in all required fields with valid parameters.", "error");
          return;
        }

        if (new Date(exitDate) < new Date(date)) {
          showToast("Exit date and time must be after the entry date and time.", "error");
          return;
        }

        if (entryPrice <= 0 || quantity <= 0) {
          showToast("Entry price and Quantity must be positive numeric values.", "error");
          return;
        }

        if ((stopLoss !== null && stopLoss <= 0) || (takeProfit !== null && takeProfit <= 0) || (trailingStop !== null && trailingStop <= 0)) {
          showToast("Stop Loss, Take Profit, and Trailing SL must be positive numeric values.", "error");
          return;
        }

        // PNL Formula
        // Long: (Exit - Entry) * Qty
        // Short: (Entry - Exit) * Qty
        let pnl = 0;
        if (direction === "Long") {
          pnl = (exitPrice - entryPrice) * quantity;
        } else {
          pnl = (entryPrice - exitPrice) * quantity;
        }

        // Round PNL to standard precision depending on scale (e.g. 4 decimals max for pips calculation if small forex value, otherwise 2)
        pnl = Math.round(pnl * 10000) / 10000;

        if (editTradeId) {
          const idx = trades.findIndex(t => t.id === editTradeId);
          if (idx !== -1) {
            trades[idx] = {
              ...trades[idx],
              date,
              exitDate,
              market,
              symbol,
              direction,
              entryPrice,
              exitPrice,
              quantity,
              strategy,
              session,
              notes,
              pnl,
              stopLoss,
              takeProfit,
              trailingStop,
              exitTrigger,
              screenshot: currentScreenshots[0] || null,
              screenshots: currentScreenshots
            };
            showToast(`Trade updated successfully! P&L: ${formatCurrency(pnl)}`, pnl >= 0 ? "success" : "error");
          }
          cancelEditMode();
        } else {
          const newTrade = {
            id: 'trade-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            date,
            exitDate,
            market,
            symbol,
            direction,
            entryPrice,
            exitPrice,
            quantity,
            strategy,
            session,
            notes,
            pnl,
            stopLoss,
            takeProfit,
            trailingStop,
            exitTrigger,
            screenshot: currentScreenshots[0] || null,
            screenshots: currentScreenshots
          };
          trades.push(newTrade);
          showToast(`Trade saved! P&L: ${formatCurrency(pnl)}`, pnl >= 0 ? "success" : "error");
        }

        saveTradesToStorage();

        // Refresh calculations and UI widgets
        updateMetrics();
        renderCharts();
        renderTable();

        // Clear Form fields keeping the Date & Market defaults
        document.getElementById("trade-symbol").value = "";
        document.getElementById("trade-entry").value = "";
        document.getElementById("trade-qty").value = "";
        document.getElementById("trade-strategy").value = "";
        document.getElementById("trade-notes").value = "";
        document.getElementById("trade-sl").value = "";
        document.getElementById("trade-tp").value = "";
        document.getElementById("trade-tsl").value = "";
        document.getElementById("trade-exit-trigger").value = "Manual";
        autoDetectSession();
        clearScreenshotPreview();

        // Auto-navigate to Dashboard tab to view charts update
        document.querySelector('[data-tab="dashboard"]').click();
      });

      // Clear Form Fields Button
      document.getElementById("btn-reset-form").addEventListener("click", () => {
        form.reset();
        const defaults = getTodayAndCurrentTime();
        document.getElementById("trade-date").value = defaults.today;
        document.getElementById("trade-time").value = defaults.time;
        document.getElementById("trade-exit-date").value = defaults.today;
        document.getElementById("trade-exit-time").value = defaults.time;
        document.getElementById("trade-sl").value = "";
        document.getElementById("trade-tp").value = "";
        document.getElementById("trade-tsl").value = "";
        document.getElementById("trade-exit-trigger").value = "Manual";
        autoDetectSession();
        clearScreenshotPreview();
        if (editTradeId) {
          cancelEditMode();
        }
      });
    }

    // ACTIONS FOR DELETE / DUSTBIN & SEEDING DEMO
    window.deleteTrade = function (id) {
      if (confirm("Are you sure you want to delete this trade?")) {
        trades = trades.filter(t => t.id !== id);
        saveTradesToStorage();
        updateMetrics();
        renderCharts();
        renderTable();
        showToast("Trade deleted successfully.", "success");
      }
    };

    window.openNotesModal = function (tradeId) {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) return;

      activeNotesTradeId = tradeId;

      const modal = document.getElementById("notes-modal");
      const meta = document.getElementById("notes-modal-meta");
      const body = document.getElementById("notes-modal-body");

      let slTpInfo = "";
      if (trade.stopLoss || trade.takeProfit || trade.trailingStop) {
        const slText = trade.stopLoss ? `${trade.stopLoss}` : '-';
        const tpText = trade.takeProfit ? `${trade.takeProfit}` : '-';
        const tslText = trade.trailingStop ? `${trade.trailingStop}` : '-';
        const triggerText = trade.exitTrigger && trade.exitTrigger !== 'Manual' ? ` (${trade.exitTrigger} Hit)` : '';
        slTpInfo = `
          <div style="width: 100%; border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 8px; font-size: 13px; color: var(--text-muted); display: flex; gap: 16px;">
            <span><strong>SL:</strong> ${slText}</span>
            <span><strong>TP:</strong> ${tpText}</span>
            <span><strong>Trailing SL:</strong> ${tslText}${triggerText}</span>
          </div>
        `;
      }
      meta.innerHTML = `
        <div style="display: flex; gap: 16px; flex-wrap: wrap; width: 100%;">
          <span><strong>Date:</strong> ${trade.date.replace('T', ' ')}</span>
          <span><strong>Symbol:</strong> ${trade.symbol}</span>
          <span><strong>Market:</strong> ${trade.market}</span>
          <span><strong>Direction:</strong> ${trade.direction}</span>
          <span><strong>Session:</strong> ${trade.session || 'N/A'}</span>
          <span><strong>P&L:</strong> <span class="${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}">${formatCurrency(trade.pnl)}</span></span>
        </div>
        ${slTpInfo}
      `;

      body.innerText = trade.notes || "No notes recorded for this trade.";

      modal.style.display = "block";

      // Auto-enter edit mode if no notes exist
      if (!trade.notes || trade.notes.trim().length === 0) {
        enterNotesEditMode();
      } else {
        exitNotesEditMode();
      }

      lucide.createIcons();
    };

    window.enterNotesEditMode = function () {
      const trade = trades.find(t => t.id === activeNotesTradeId);
      if (!trade) return;

      document.getElementById("notes-modal-body").style.display = "none";
      document.getElementById("notes-modal-edit-container").style.display = "flex";
      document.getElementById("btn-edit-modal-notes").style.display = "none";

      const textarea = document.getElementById("notes-modal-textarea");
      textarea.value = trade.notes || "";
      setTimeout(() => textarea.focus(), 50);
    };

    window.exitNotesEditMode = function () {
      document.getElementById("notes-modal-body").style.display = "block";
      document.getElementById("notes-modal-edit-container").style.display = "none";
      document.getElementById("btn-edit-modal-notes").style.display = "inline-flex";
    };

    window.saveModalNotes = function () {
      const trade = trades.find(t => t.id === activeNotesTradeId);
      if (!trade) return;

      const notesValue = document.getElementById("notes-modal-textarea").value.trim();
      trade.notes = notesValue;

      saveTradesToStorage();
      renderTable();

      document.getElementById("notes-modal-body").innerText = notesValue || "No notes recorded for this trade.";

      exitNotesEditMode();
      showToast("Trade notes updated successfully!", "success");
    };

    // FILTER REGISTRATIONS
    function initFilters() {
      document.getElementById("filter-market").addEventListener("change", renderTable);
      document.getElementById("filter-direction").addEventListener("change", renderTable);
      document.getElementById("filter-session").addEventListener("change", renderTable);

      // Clear All Trades button
      document.getElementById("btn-clear-all").addEventListener("click", () => {
        if (confirm("WARNING: This will delete ALL logged trades. Are you sure you want to clear your journal?")) {
          trades = [];
          saveTradesToStorage();
          updateMetrics();
          renderCharts();
          renderTable();
          showToast("All journal trades deleted.", "error");
        }
      });
    }

    // SCREENSHOT PROCESSING FUNCTIONS
    window.clearScreenshotPreview = function () {
      currentScreenshots = [];
      const fileInput = document.getElementById("trade-screenshot");
      if (fileInput) fileInput.value = "";
      renderUploadPreviewGrid();
    };

    window.renderUploadPreviewGrid = function () {
      const grid = document.getElementById("upload-preview-grid");
      if (!grid) return;
      grid.innerHTML = "";

      if (currentScreenshots.length === 0) {
        grid.style.display = "none";
        return;
      }

      currentScreenshots.forEach((src, idx) => {
        const item = document.createElement("div");
        item.className = "preview-item";
        item.innerHTML = `
          <img src="${src}" alt="Preview image ${idx + 1}">
          <button type="button" class="btn-remove-preview" onclick="removeUploadedScreenshot(event, ${idx})" title="Remove Screenshot">&times;</button>
        `;
        grid.appendChild(item);
      });

      grid.style.display = "grid";
    };

    window.removeUploadedScreenshot = function (event, idx) {
      event.stopPropagation();
      currentScreenshots.splice(idx, 1);
      renderUploadPreviewGrid();
    };

    window.processAndPreviewFile = function (file) {
      if (!file) return;
      if (!file.type.match('image.*')) {
        showToast("Only image files (JPEG, PNG, WebP) are supported.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
          // Client-side image scaling to save localStorage space
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Limit max dimension to 900px
          const MAX_DIM = 900;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with a balance of size & readability (0.75 compression ratio)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);

          currentScreenshots.push(compressedDataUrl);
          renderUploadPreviewGrid();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    };

    // LIGHTBOX FUNCTIONS
    window.openLightbox = function (tradeId) {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) return;

      // Handle backward compatibility
      lightboxScreenshots = trade.screenshots || (trade.screenshot ? [trade.screenshot] : []);
      if (lightboxScreenshots.length === 0) return;

      lightboxIndex = 0;

      const modal = document.getElementById("image-modal");
      modal.style.display = "block";

      updateLightboxImage(trade);
    };

    window.updateLightboxImage = function (trade) {
      const modalImg = document.getElementById("modal-img");
      const captionText = document.getElementById("modal-caption");
      const counter = document.getElementById("lightbox-counter");
      const prevBtn = document.getElementById("lightbox-prev");
      const nextBtn = document.getElementById("lightbox-next");
      const thumbsContainer = document.getElementById("lightbox-thumbnails");

      // Update main image and details
      modalImg.src = lightboxScreenshots[lightboxIndex];
      captionText.innerText = `${trade.date} - ${trade.symbol} (${trade.direction} on ${trade.market}) | P&L: ${formatCurrency(trade.pnl)}`;

      // Update counter
      if (lightboxScreenshots.length > 1) {
        counter.innerText = `${lightboxIndex + 1} of ${lightboxScreenshots.length}`;
        counter.style.display = "block";
        prevBtn.style.display = "flex";
        nextBtn.style.display = "flex";
      } else {
        counter.style.display = "none";
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
      }

      // Render thumbnails inside lightbox
      thumbsContainer.innerHTML = "";
      if (lightboxScreenshots.length > 1) {
        lightboxScreenshots.forEach((src, idx) => {
          const thumb = document.createElement("img");
          thumb.className = `lightbox-thumb ${idx === lightboxIndex ? 'active' : ''}`;
          thumb.src = src;
          thumb.onclick = () => {
            lightboxIndex = idx;
            updateLightboxImage(trade);
          };
          thumbsContainer.appendChild(thumb);
        });
      }
    };

    window.prevLightboxImage = function () {
      if (lightboxScreenshots.length <= 1) return;
      lightboxIndex = (lightboxIndex - 1 + lightboxScreenshots.length) % lightboxScreenshots.length;

      // Find the trade associated with the current lightbox view
      const modalImg = document.getElementById("modal-img");
      const trade = trades.find(t => {
        const list = t.screenshots || (t.screenshot ? [t.screenshot] : []);
        return list.includes(lightboxScreenshots[lightboxIndex]);
      });
      if (trade) updateLightboxImage(trade);
    };

    window.nextLightboxImage = function () {
      if (lightboxScreenshots.length <= 1) return;
      lightboxIndex = (lightboxIndex + 1) % lightboxScreenshots.length;

      const trade = trades.find(t => {
        const list = t.screenshots || (t.screenshot ? [t.screenshot] : []);
        return list.includes(lightboxScreenshots[lightboxIndex]);
      });
      if (trade) updateLightboxImage(trade);
    };

    window.startEditTrade = function (id) {
      const trade = trades.find(t => t.id === id);
      if (!trade) return;

      editTradeId = id;

      // Populate form values
      let datePart = "";
      let timePart = "";
      if (trade.date) {
        const separator = trade.date.includes('T') ? 'T' : ' ';
        const parts = trade.date.split(separator);
        datePart = parts[0] || "";
        timePart = parts[1] ? parts[1].slice(0, 5) : "00:00";
      }
      document.getElementById("trade-date").value = datePart;
      document.getElementById("trade-time").value = timePart;

      let exitDatePart = "";
      let exitTimePart = "";
      const exitDateStr = trade.exitDate || trade.date;
      if (exitDateStr) {
        const separator = exitDateStr.includes('T') ? 'T' : ' ';
        const parts = exitDateStr.split(separator);
        exitDatePart = parts[0] || "";
        exitTimePart = parts[1] ? parts[1].slice(0, 5) : "00:00";
      }
      document.getElementById("trade-exit-date").value = exitDatePart;
      document.getElementById("trade-exit-time").value = exitTimePart;

      document.getElementById("trade-market").value = trade.market;
      document.getElementById("trade-symbol").value = trade.symbol;
      document.getElementById("trade-direction").value = trade.direction;
      document.getElementById("trade-entry").value = trade.entryPrice;
      document.getElementById("trade-qty").value = trade.quantity;
      document.getElementById("trade-strategy").value = trade.strategy || "";
      document.getElementById("trade-notes").value = trade.notes || "";

      // Populate targets
      document.getElementById("trade-sl").value = trade.stopLoss || "";
      document.getElementById("trade-tp").value = trade.takeProfit || "";
      document.getElementById("trade-tsl").value = trade.trailingStop || "";
      document.getElementById("trade-exit-trigger").value = trade.exitTrigger || "Manual";
      document.getElementById("trade-session").value = trade.session || "";

      // Populate screenshots
      currentScreenshots = trade.screenshots || (trade.screenshot ? [trade.screenshot] : []);
      renderUploadPreviewGrid();

      // Update UI headings
      document.getElementById("form-card-title").innerHTML = `<i data-lucide="edit-3"></i> Edit Trade Details`;
      document.getElementById("btn-submit-trade").innerHTML = `<i data-lucide="check-circle"></i> <span>Update Trade</span>`;
      lucide.createIcons();

      // Switch tab to add-trade form
      document.querySelector('[data-tab="add-trade"]').click();
    };

    window.cancelEditMode = function () {
      editTradeId = null;
      document.getElementById("form-card-title").innerHTML = `<i data-lucide="plus-circle"></i> Log a New Trade`;
      document.getElementById("btn-submit-trade").innerHTML = `<i data-lucide="save"></i> <span>Save Trade</span>`;
      lucide.createIcons();
    };

    function initScreenshotHandlers() {
      const uploadZone = document.getElementById("upload-zone");
      const fileInput = document.getElementById("trade-screenshot");

      if (!uploadZone || !fileInput) return;

      // Click zone triggers file dialog
      uploadZone.addEventListener("click", () => {
        fileInput.click();
      });

      // Prevent bubbling click from fileInput to uploadZone
      fileInput.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      // File input change (loops to support multiple files selection)
      fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          for (let i = 0; i < e.target.files.length; i++) {
            processAndPreviewFile(e.target.files[i]);
          }
          // Reset file input value so selecting the same file again triggers change event
          fileInput.value = "";
        }
      });

      // Drag and drop support
      uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = "var(--color-primary)";
        uploadZone.style.background = "var(--color-primary-light)";
      });

      uploadZone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = "var(--border-color)";
        uploadZone.style.background = "var(--bg-input)";
      });

      uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = "var(--border-color)";
        uploadZone.style.background = "var(--bg-input)";
        if (e.dataTransfer.files.length > 0) {
          for (let i = 0; i < e.dataTransfer.files.length; i++) {
            processAndPreviewFile(e.dataTransfer.files[i]);
          }
          fileInput.value = "";
        }
      });

      // Clipboard Paste listener on Add Trade panel
      document.addEventListener("paste", (e) => {
        const addTradePanel = document.getElementById("add-trade");
        if (!addTradePanel || !addTradePanel.classList.contains("active")) return;

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
          const item = items[index];
          if (item.kind === 'file' && item.type.indexOf('image') === 0) {
            const blob = item.getAsFile();
            processAndPreviewFile(blob);
            showToast("Chart screenshot pasted from clipboard!", "success");
            break;
          }
        }
      });

      // Lightbox navigation clicks
      document.getElementById("lightbox-prev").addEventListener("click", (e) => {
        e.stopPropagation();
        prevLightboxImage();
      });
      document.getElementById("lightbox-next").addEventListener("click", (e) => {
        e.stopPropagation();
        nextLightboxImage();
      });

      // Lightbox Modal closing triggers
      const modal = document.getElementById("image-modal");
      const closeBtn = document.querySelector(".modal-close");

      if (modal) {
        // Close on clicking 'X'
        if (closeBtn) {
          closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
          });
        }
        // Close on backdrop click
        modal.addEventListener("click", (e) => {
          if (e.target === modal || e.target.closest(".modal-content-wrapper") === null) {
            // But don't close if they clicked on the next/prev buttons, caption, img or thumbnails
            if (!e.target.closest(".lightbox-nav") && !e.target.closest(".lightbox-thumbnails")) {
              modal.style.display = "none";
            }
          }
        });
        // Keyboard navigation and closing listener
        document.addEventListener("keydown", (e) => {
          const notesModalEl = document.getElementById("notes-modal");
          if (e.key === "Escape") {
            if (modal.style.display === "block") {
              modal.style.display = "none";
            }
            if (notesModalEl && notesModalEl.style.display === "block") {
              const editContainer = document.getElementById("notes-modal-edit-container");
              if (editContainer && editContainer.style.display === "flex") {
                exitNotesEditMode();
              } else {
                notesModalEl.style.display = "none";
              }
            }
          } else if (modal.style.display === "block") {
            if (e.key === "ArrowLeft") {
              prevLightboxImage();
            } else if (e.key === "ArrowRight") {
              nextLightboxImage();
            }
          }
        });
      }

      // Notes Modal closing triggers
      const notesModal = document.getElementById("notes-modal");
      const notesCloseBtn = document.getElementById("notes-modal-close");
      if (notesModal) {
        if (notesCloseBtn) {
          notesCloseBtn.addEventListener("click", () => {
            notesModal.style.display = "none";
          });
        }
        notesModal.addEventListener("click", (e) => {
          if (e.target === notesModal || e.target.closest(".modal-content-wrapper") === null) {
            notesModal.style.display = "none";
          }
        });

        // Notes Modal edit flow listeners
        const editModalNotesBtn = document.getElementById("btn-edit-modal-notes");
        const cancelModalNotesBtn = document.getElementById("btn-cancel-modal-notes");
        const saveModalNotesBtn = document.getElementById("btn-save-modal-notes");
        const modalTextarea = document.getElementById("notes-modal-textarea");

        if (editModalNotesBtn) {
          editModalNotesBtn.addEventListener("click", () => enterNotesEditMode());
        }
        if (cancelModalNotesBtn) {
          cancelModalNotesBtn.addEventListener("click", () => exitNotesEditMode());
        }
        if (saveModalNotesBtn) {
          saveModalNotesBtn.addEventListener("click", () => saveModalNotes());
        }
        if (modalTextarea) {
          modalTextarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              saveModalNotes();
            }
          });
        }
      }
    }

    // INITIALIZATION ON PAGE LOAD
    window.addEventListener("DOMContentLoaded", () => {
      initTheme();
      loadTrades();
      initNavigation();
      initForm();
      initFilters();
      initScreenshotHandlers();
      initCalendar();

      // Premium visual initializers
      initCandlestickBackground();
      initScrollingTicker();
      initCardTilt();

      // Dynamic session indicators
      updateTradingSessionIndicator();
      setInterval(updateTradingSessionIndicator, 30000);

      // UI Initial Renders
      updateMetrics();
      renderCharts();
      renderTable();

      // Bind theme click trigger
      document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

      // Compile lucide SVG icons
      lucide.createIcons();
    });
