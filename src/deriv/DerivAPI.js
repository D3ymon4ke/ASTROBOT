export class DerivAPI {
  constructor() {
    this.ws = null;
    this.connected = false; // Connection to VPS
    this.authorized = false; // Authorized with VPS
    this.email = '';
    
    // Server status from VPS state sync
    this.derivConnected = false;
    this.derivAuthorized = false;
    this.latency = 0;

    // Callbacks to UI
    this.onConnectionChange = () => {};
    this.onAuthSuccess = () => {};
    this.onTickUpdate = () => {};
    this.onCandleHistory = () => {};
    this.onCandleUpdate = () => {};
    this.onContractUpdate = () => {};
    this.onErrorReceived = () => {};
    this.onLogMessage = () => {};
    this.onSyncReceived = () => {};
  }

  log(message, type = 'info') {
    this.onLogMessage({ message, type, time: new Date().toLocaleTimeString() });
  }

  authenticateUser(email) {
    if (!email) return;
    this.email = email.trim().toLowerCase();
    this.connectVps();
  }

  connectVps() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const vpsUrl = isLocal ? 'ws://localhost:8080' : 'wss://187-127-40-228.sslip.io:443';
    
    console.log(`[VPS WS] Connecting to ${vpsUrl}...`);
    this.ws = new WebSocket(vpsUrl);

    this.ws.onopen = () => {
      console.log('[VPS WS] Connected to VPS backend.');
      this.connected = true;
      this.onConnectionChange(true);

      // Authenticate with user email
      if (this.email) {
        this.ws.send(JSON.stringify({
          type: 'auth',
          email: this.email
        }));
        this.authorized = true;
        this.onAuthSuccess({ email: this.email });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = payload.type;

        if (type === 'sync') {
          const syncData = payload.data;
          this.derivConnected = syncData.derivConnected;
          this.derivAuthorized = syncData.derivAuthorized;
          this.latency = syncData.derivLatency;
          
          this.onSyncReceived(syncData);
        } else if (type === 'tick') {
          this.onTickUpdate(payload.tick);
        } else if (type === 'candle_update') {
          this.onCandleUpdate(payload.ohlc);
        } else if (type === 'log') {
          this.onLogMessage(payload.log);
        } else if (type === 'error') {
          this.onErrorReceived(payload.message);
        }
      } catch (err) {
        console.error('[VPS WS] Error processing message:', err);
      }
    };

    this.ws.onclose = () => {
      console.warn('[VPS WS] Connection closed. Reconnecting in 3 seconds...');
      this.connected = false;
      this.authorized = false;
      this.onConnectionChange(false);
      
      setTimeout(() => {
        this.connectVps();
      }, 3000);
    };

    this.ws.onerror = (err) => {
      console.error('[VPS WS] WebSocket error:', err);
    };
  }

  // Mimic old DerivAPI connection calls - updates VPS token/settings instead
  async connect(token, appId, isDemo = true) {
    if (!token) return;
    this.send({
      type: 'update_settings',
      settings: {
        token,
        appId,
        isDemo
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  startBot() {
    this.send({ type: 'start_bot' });
  }

  stopBot() {
    this.send({ type: 'stop_bot' });
  }

  buyContract(symbol, stake, contractType, durationMin, durationUnit) {
    // The VPS now fully controls buying logic, but we keep this interface stub
  }

  changeSymbol(symbol, granularity) {
    this.send({
      type: 'update_settings',
      settings: {
        symbol,
        granularity: granularity.toString()
      }
    });
  }

  updateSettings(settings) {
    this.send({
      type: 'update_settings',
      settings
    });
  }

  updatePlanning(planning) {
    this.send({
      type: 'update_planning',
      planning
    });
  }

  updateCycles(cycles) {
    this.send({
      type: 'update_cycles',
      cycles
    });
  }

  triggerCycle(cycleId) {
    this.send({
      type: 'trigger_cycle',
      cycleId
    });
  }

  triggerAutoReset() {
    this.send({
      type: 'trigger_auto_reset'
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[VPS WS] Cannot send, connection not open.');
    }
  }
}

export const derivAPI = new DerivAPI();
