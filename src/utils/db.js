// Database utility using Electron fs (fallback to localStorage)
import { fileURLToPath } from 'url';

let fs = null;
let path = null;

try {
  if (typeof window !== 'undefined' && typeof window.require === 'function') {
    fs = window.require('fs');
    path = window.require('path');
  }
} catch (e) {
  console.warn("Node/Electron fs modules not available. Using localStorage fallback.");
}

const getDbPaths = (isDemo) => {
  const suffix = isDemo ? '_demo' : '_real';
  const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '';
  if (path && cwd) {
    return {
      trades: path.join(cwd, `trades_db${suffix}.json`),
      monthly: path.join(cwd, `monthly_reports_db${suffix}.json`)
    };
  }
  return { trades: '', monthly: '' };
};

const getLocalStorageKeys = (isDemo) => {
  const suffix = isDemo ? '_demo' : '_real';
  return {
    trades: `astrobot_trades_db${suffix}`,
    monthly: `astrobot_monthly_reports_db${suffix}`
  };
};

// Auto-migration for old files/keys to demo
try {
  const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '';
  if (fs && cwd && path) {
    const oldTrades = path.join(cwd, 'trades_db.json');
    const newDemoTrades = path.join(cwd, 'trades_db_demo.json');
    if (fs.existsSync(oldTrades) && !fs.existsSync(newDemoTrades)) {
      fs.copyFileSync(oldTrades, newDemoTrades);
      console.log("[Migration] Copied old trades_db.json to trades_db_demo.json");
    }
    const oldMonthly = path.join(cwd, 'monthly_reports_db.json');
    const newDemoMonthly = path.join(cwd, 'monthly_reports_db_demo.json');
    if (fs.existsSync(oldMonthly) && !fs.existsSync(newDemoMonthly)) {
      fs.copyFileSync(oldMonthly, newDemoMonthly);
      console.log("[Migration] Copied old monthly_reports_db.json to monthly_reports_db_demo.json");
    }
  } else if (typeof localStorage !== 'undefined') {
    const oldTradesData = localStorage.getItem('astrobot_trades_db');
    const newDemoTradesKey = 'astrobot_trades_db_demo';
    if (oldTradesData && !localStorage.getItem(newDemoTradesKey)) {
      localStorage.setItem(newDemoTradesKey, oldTradesData);
      console.log("[Migration] Copied old astrobot_trades_db in localStorage to astrobot_trades_db_demo");
    }
    const oldMonthlyData = localStorage.getItem('astrobot_monthly_reports_db');
    const newDemoMonthlyKey = 'astrobot_monthly_reports_db_demo';
    if (oldMonthlyData && !localStorage.getItem(newDemoMonthlyKey)) {
      localStorage.setItem(newDemoMonthlyKey, oldMonthlyData);
      console.log("[Migration] Copied old astrobot_monthly_reports_db in localStorage to astrobot_monthly_reports_db_demo");
    }
  }
} catch (e) {
  console.warn("Migration failed or not applicable:", e);
}

export const loadDbTrades = (isDemo = true) => {
  try {
    const paths = getDbPaths(isDemo);
    if (fs && paths.trades) {
      if (fs.existsSync(paths.trades)) {
        const data = fs.readFileSync(paths.trades, 'utf-8');
        return JSON.parse(data);
      }
    } else {
      const keys = getLocalStorageKeys(isDemo);
      const data = localStorage.getItem(keys.trades);
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch (err) {
    console.error("Error reading database:", err);
  }
  return [];
};

export const saveDbTrade = (trade, isDemo = true) => {
  try {
    const trades = loadDbTrades(isDemo);
    const newTrade = {
      id: trade.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: trade.timestamp || Date.now(),
      ...trade
    };
    trades.push(newTrade);
    
    const paths = getDbPaths(isDemo);
    if (fs && paths.trades) {
      fs.writeFileSync(paths.trades, JSON.stringify(trades, null, 2), 'utf-8');
    } else {
      const keys = getLocalStorageKeys(isDemo);
      localStorage.setItem(keys.trades, JSON.stringify(trades));
    }
    return trades;
  } catch (err) {
    console.error("Error saving to database:", err);
  }
  return [];
};

export const saveDbTrades = (newTradesList, isDemo = true) => {
  try {
    const trades = loadDbTrades(isDemo);
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
      const paths = getDbPaths(isDemo);
      if (fs && paths.trades) {
        fs.writeFileSync(paths.trades, JSON.stringify(trades, null, 2), 'utf-8');
      } else {
        const keys = getLocalStorageKeys(isDemo);
        localStorage.setItem(keys.trades, JSON.stringify(trades));
      }
      return trades;
    }
    return trades;
  } catch (err) {
    console.error("Error saving trades list to database:", err);
  }
  return [];
};

export const clearDbTrades = (isDemo = true) => {
  try {
    const paths = getDbPaths(isDemo);
    if (fs && paths.trades) {
      fs.writeFileSync(paths.trades, JSON.stringify([], null, 2), 'utf-8');
    } else {
      const keys = getLocalStorageKeys(isDemo);
      localStorage.setItem(keys.trades, JSON.stringify([]));
    }
  } catch (err) {
    console.error("Error clearing database:", err);
  }
};

// Monthly Reports Database Operations
export const loadMonthlyReports = (isDemo = true) => {
  try {
    const paths = getDbPaths(isDemo);
    if (fs && paths.monthly) {
      if (fs.existsSync(paths.monthly)) {
        const data = fs.readFileSync(paths.monthly, 'utf-8');
        return JSON.parse(data);
      }
    } else {
      const keys = getLocalStorageKeys(isDemo);
      const data = localStorage.getItem(keys.monthly);
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch (err) {
    console.error("Error reading monthly database:", err);
  }
  return [];
};

export const saveMonthlyReport = (report, isDemo = true) => {
  try {
    const reports = loadMonthlyReports(isDemo);
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

    const paths = getDbPaths(isDemo);
    if (fs && paths.monthly) {
      fs.writeFileSync(paths.monthly, JSON.stringify(reports, null, 2), 'utf-8');
    } else {
      const keys = getLocalStorageKeys(isDemo);
      localStorage.setItem(keys.monthly, JSON.stringify(reports));
    }
    return reports;
  } catch (err) {
    console.error("Error saving monthly report:", err);
  }
  return [];
};

export const deleteMonthlyReport = (id, isDemo = true) => {
  try {
    const reports = loadMonthlyReports(isDemo);
    const updated = reports.filter(r => r.id !== id);
    const paths = getDbPaths(isDemo);
    if (fs && paths.monthly) {
      fs.writeFileSync(paths.monthly, JSON.stringify(updated, null, 2), 'utf-8');
    } else {
      const keys = getLocalStorageKeys(isDemo);
      localStorage.setItem(keys.monthly, JSON.stringify(updated));
    }
    return updated;
  } catch (err) {
    console.error("Error deleting monthly report:", err);
  }
  return [];
};
