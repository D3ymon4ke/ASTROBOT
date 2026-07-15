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
