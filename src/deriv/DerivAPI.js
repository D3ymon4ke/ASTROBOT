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
    this.onCloudTradesSynced = () => {};
    this.onCloudReportsSynced = () => {};
    this.onCloudBackupReceived = () => {};
    this.onLaboratoryResult = () => {};
    this.onAutomationMessage = () => {};
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

    const forceLocal = localStorage.getItem('force_local_vps') === 'true';
    const vpsUrl = forceLocal ? 'ws://localhost:8080' : 'wss://187-127-40-228.sslip.io:443';
    
    console.log(`[VPS WS] Connecting to ${vpsUrl}...`);
    this.ws = new WebSocket(vpsUrl);
    const socket = this.ws;

    this.ws.onopen = () => {
      if (this.ws !== socket) return;
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
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    this.ws.onmessage = (event) => {
      if (this.ws !== socket) return;
      try {
        const payload = JSON.parse(event.data);
        const type = payload.type;

        if (type === 'pong') {
          return;
        } else if (type === 'sync') {
          const syncData = payload.data;
          this.derivConnected = syncData.derivConnected;
          this.derivAuthorized = syncData.derivAuthorized;
          this.latency = syncData.derivLatency;
          
          this.onSyncReceived(syncData);
        } else if (type === 'sync_trades_result') {
          this.onCloudTradesSynced(payload);
        } else if (type === 'sync_monthly_reports_result') {
          this.onCloudReportsSynced(payload);
        } else if (type === 'get_cloud_backup_result') {
          this.onCloudBackupReceived(payload.backup);
        } else if (type === 'tick') {
          this.onTickUpdate(payload.tick);
        } else if (type === 'candle_update') {
          this.onCandleUpdate(payload.ohlc);
        } else if (type === 'log') {
          this.onLogMessage(payload.log);
        } else if (type === 'error') {
          this.onAutomationMessage(payload);
          this.onErrorReceived(payload.message);
        } else if (type === 'laboratory_result') {
          this.onLaboratoryResult(payload.result);
        } else if (type === 'automation_result') {
          this.onAutomationMessage(payload);
        }
      } catch (err) {
        console.error('[VPS WS] Error processing message:', err);
      }
    };

    this.ws.onclose = () => {
      if (this.ws !== socket) return;
      if (this.pingInterval) clearInterval(this.pingInterval);
      console.warn('[VPS WS] Connection closed. Reconnecting in 3 seconds...');
      this.connected = false;
      this.authorized = false;
      this.onConnectionChange(false);
      
      this.reconnectTimer = setTimeout(() => {
        this.connectVps();
      }, 3000);
    };

    this.ws.onerror = (err) => {
      if (this.ws !== socket) return;
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
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingInterval);
    const socket = this.ws;
    this.ws = null;
    this.connected = false;
    this.authorized = false;
    socket?.close();
  }

  startBot() {
    this.send({ type: 'start_bot' });
  }

  configureFakegale(config) { this.send({ type: 'fakegale_config', config }); }
  configureContinuous(config) { this.send({ type: 'continuous_config', config }); }
  reconcileContinuous(contractId, source = 'continuous') { this.send({ type: 'continuous_reconcile', contractId, source }); }
  runLaboratory(symbol, options) { this.send({ type: 'laboratory_run', symbol, options }); }
  configureResearch(enabled, symbols) { this.send({ type: 'research_config', enabled, symbols }); }
  replayResearch(date, symbol, options) { this.send({ type: 'laboratory_ticks', date, symbol, options }); }

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

  sendDecisionTreeTelegram(cycleId) {
    this.send({
      type: 'send_decision_tree_telegram',
      cycleId
    });
  }

  syncTrades(trades, isDemo = true) {
    this.send({
      type: 'sync_trades',
      isDemo,
      trades
    });
  }

  syncMonthlyReports(reports, isDemo = true) {
    this.send({
      type: 'sync_monthly_reports',
      isDemo,
      reports
    });
  }

  getCloudBackup(isDemo = true) {
    this.send({
      type: 'get_cloud_backup',
      isDemo
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
