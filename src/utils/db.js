// Database utility using Electron fs (fallback to localStorage)
let fs = null;
let path = null;
let dbPath = '';

try {
  if (typeof window !== 'undefined' && typeof window.require === 'function') {
    fs = window.require('fs');
    path = window.require('path');
    // Save to local directory
    const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '';
    dbPath = path && cwd ? path.join(cwd, 'trades_db.json') : '';
  }
} catch (e) {
  console.warn("Node/Electron fs modules not available. Using localStorage fallback.");
}

export const loadDbTrades = () => {
  try {
    if (fs && dbPath) {
      if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data);
      }
    } else {
      const data = localStorage.getItem('astrobot_trades_db');
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch (err) {
    console.error("Error reading database:", err);
  }
  return [];
};

export const saveDbTrade = (trade) => {
  try {
    const trades = loadDbTrades();
    // Add unique timestamp if not present
    const newTrade = {
      id: trade.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: trade.timestamp || Date.now(),
      ...trade
    };
    trades.push(newTrade);
    
    if (fs && dbPath) {
      fs.writeFileSync(dbPath, JSON.stringify(trades, null, 2), 'utf-8');
    } else {
      localStorage.setItem('astrobot_trades_db', JSON.stringify(trades));
    }
    return trades;
  } catch (err) {
    console.error("Error saving to database:", err);
  }
  return [];
};

export const saveDbTrades = (newTradesList) => {
  try {
    const trades = loadDbTrades();
    let updated = false;
    newTradesList.forEach(trade => {
      const exists = trades.some(t => 
        t.id === trade.id || 
        (t.epoch && trade.epoch && t.epoch === trade.epoch) ||
        (t.timestamp && trade.timestamp && t.timestamp === trade.timestamp)
      );
      if (!exists) {
        const newTrade = {
          id: trade.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: trade.timestamp || Date.now(),
          ...trade
        };
        trades.push(newTrade);
        updated = true;
      }
    });
    
    if (updated) {
      if (fs && dbPath) {
        fs.writeFileSync(dbPath, JSON.stringify(trades, null, 2), 'utf-8');
      } else {
        localStorage.setItem('astrobot_trades_db', JSON.stringify(trades));
      }
      return trades;
    }
    return trades;
  } catch (err) {
    console.error("Error saving trades list to database:", err);
  }
  return [];
};

export const clearDbTrades = () => {
  try {
    if (fs && dbPath) {
      fs.writeFileSync(dbPath, JSON.stringify([], null, 2), 'utf-8');
    } else {
      localStorage.setItem('astrobot_trades_db', JSON.stringify([]));
    }
  } catch (err) {
    console.error("Error clearing database:", err);
  }
};

// Monthly Reports Database Operations
export const loadMonthlyReports = () => {
  try {
    if (fs && dbPath) {
      const monthlyPath = path.join(path.dirname(dbPath), 'monthly_reports_db.json');
      if (fs.existsSync(monthlyPath)) {
        const data = fs.readFileSync(monthlyPath, 'utf-8');
        return JSON.parse(data);
      }
    } else {
      const data = localStorage.getItem('astrobot_monthly_reports_db');
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch (err) {
    console.error("Error reading monthly database:", err);
  }
  return [];
};

export const saveMonthlyReport = (report) => {
  try {
    const reports = loadMonthlyReports();
    const existingIndex = reports.findIndex(r => r.id === report.id);
    const newReport = {
      ...report,
      createdAt: report.createdAt || Date.now()
    };
    if (existingIndex >= 0) {
      reports[existingIndex] = newReport;
    } else {
      reports.push(newReport);
    }

    if (fs && dbPath) {
      const monthlyPath = path.join(path.dirname(dbPath), 'monthly_reports_db.json');
      fs.writeFileSync(monthlyPath, JSON.stringify(reports, null, 2), 'utf-8');
    } else {
      localStorage.setItem('astrobot_monthly_reports_db', JSON.stringify(reports));
    }
    return reports;
  } catch (err) {
    console.error("Error saving monthly report:", err);
  }
  return [];
};

export const deleteMonthlyReport = (id) => {
  try {
    const reports = loadMonthlyReports();
    const updated = reports.filter(r => r.id !== id);
    if (fs && dbPath) {
      const monthlyPath = path.join(path.dirname(dbPath), 'monthly_reports_db.json');
      fs.writeFileSync(monthlyPath, JSON.stringify(updated, null, 2), 'utf-8');
    } else {
      localStorage.setItem('astrobot_monthly_reports_db', JSON.stringify(updated));
    }
    return updated;
  } catch (err) {
    console.error("Error deleting monthly report:", err);
  }
  return [];
};
