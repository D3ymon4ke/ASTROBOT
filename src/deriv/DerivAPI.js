export class DerivAPI {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.authorized = false;
    this.token = '';
    this.appId = '1098'; // Default Dev App ID
    this.symbol = 'R_100';
    this.granularity = 60; // Default 1 minute
    this.pingIntervalId = null;
    this.latency = 0;
    this.pingSentTime = 0;
    this.shouldReconnect = false;
    this.reconnectTimeoutId = null;
    this.reconnectAttempts = 0;
    this.pendingRequests = new Map();
    
    // Callbacks
    this.onConnectionChange = () => {};
    this.onAuthSuccess = () => {};
    this.onTickUpdate = () => {};
    this.onCandleHistory = () => {};
    this.onCandleUpdate = () => {};
    this.onContractUpdate = () => {};
    this.onErrorReceived = () => {};
    this.onLogMessage = () => {};
  }

  log(message, type = 'info') {
    this.onLogMessage({ message, type, time: new Date().toLocaleTimeString() });
  }

  async connect(token, appId, isDemo = true) {
    this.token = token ? token.trim() : '';
    this.appId = appId ? appId.trim() : '1098';
    this.isDemo = isDemo;
    this.shouldReconnect = true;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.disconnect();
    
    this.log(`Conectando à Deriv (App ID: ${this.appId})...`, 'info');

    try {
      this.log('Iniciando fluxo de autenticação REST para token PAT...', 'info');
      const patDetails = await this.getPatWSUrl(this.token, this.appId, isDemo);
      const wsUrl = patDetails.url;
      const patAccountInfo = patDetails.accountInfo;
      this.log('URL WebSocket autenticada obtida com sucesso via PAT.', 'success');

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.onConnectionChange(true);
        this.log('Conexão WebSocket estabelecida!', 'success');
        this.reconnectAttempts = 0;
        
        // Start ping loop
        this.startPingLoop();

        // PAT is pre-authorized via the dynamic OTP URL
        this.authorized = true;
        this.onAuthSuccess(patAccountInfo);
        this.subscribeTicksAndCandles();
      };

      this.setupWSEventHandlers();

    } catch (err) {
      this.log(`Fluxo REST PAT indisponível ou recusado (${err.message}). Tentando conexão WebSocket direta...`, 'warning');
      
      try {
        const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.connected = true;
          this.onConnectionChange(true);
          this.log('Conexão WebSocket direta estabelecida. Enviando credenciais...', 'info');
          this.reconnectAttempts = 0;
          
          // Start ping loop
          this.startPingLoop();

          // Send authorize request
          this.ws.send(JSON.stringify({ authorize: this.token }));
        };

        this.setupWSEventHandlers();

      } catch (fallbackErr) {
        this.log(`Falha em ambas as formas de conexão: ${fallbackErr.message}`, 'error');
        this.onErrorReceived(fallbackErr.message);
        this.connected = false;
        this.authorized = false;
        this.onConnectionChange(false);
        if (this.shouldReconnect) {
          this.attemptReconnect();
        }
      }
    }
  }

  setupWSEventHandlers() {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };

    this.ws.onerror = (error) => {
      this.log(`Erro no WebSocket: ${error.message || 'Falha na conexão'}`, 'error');
      this.onErrorReceived(error.message || 'Erro de conexão');
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.authorized = false;
      this.onConnectionChange(false);
      this.log('Conexão WebSocket encerrada.', 'warning');
      this.stopPingLoop();
      if (this.shouldReconnect) {
        this.attemptReconnect();
      }
    };
  }

  async getPatWSUrl(patToken, appId, isDemo) {
    const headers = {
      'Deriv-App-ID': appId,
      'Authorization': `Bearer ${patToken}`,
      'Content-Type': 'application/json'
    };

    // Step 1: Get accounts
    const accountType = isDemo ? 'demo' : 'real';
    this.log(`Buscando contas Deriv (${accountType})...`, 'info');
    
    const accountsRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
      method: 'GET',
      headers
    });

    if (!accountsRes.ok) {
      throw new Error(`Erro REST contas: ${accountsRes.statusText} (${accountsRes.status})`);
    }

    const accountsData = await accountsRes.json();
    if (!accountsData.data || accountsData.data.length === 0) {
      throw new Error('Nenhuma conta Deriv encontrada vinculada a este token.');
    }

    const matchingAccounts = accountsData.data.filter(a => a.account_type === accountType);
    if (matchingAccounts.length === 0) {
      throw new Error(`Nenhuma conta do tipo "${accountType}" encontrada.`);
    }

    this.log(`Contas ${accountType} disponíveis: ` + matchingAccounts.map(a => `${a.account_id} (${a.currency}: $${a.balance || 0})`).join(', '), 'info');

    // Prioritize USD account since trading uses USD, fallback to other fiat currencies, then fallback to first available
    let account = matchingAccounts.find(a => a.currency === 'USD');
    if (!account) {
      account = matchingAccounts.find(a => ['EUR', 'GBP', 'AUD'].includes(a.currency));
    }
    if (!account) {
      account = matchingAccounts[0];
    }

    const accId = account.account_id;
    const balance = parseFloat(account.balance || 0);
    const currency = account.currency || 'USD';
    const email = account.email || 'pat@deriv.com';
    const fullname = account.account_id;
    this.log(`Conta selecionada: ${accId} (${currency}) | Saldo: $${balance}`, 'info');

    // Step 2: Get OTP URL
    this.log('Gerando OTP para autenticação WebSocket...', 'info');
    const otpRes = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accId}/otp`, {
      method: 'POST',
      headers
    });

    if (!otpRes.ok) {
      throw new Error(`Erro REST OTP: ${otpRes.statusText} (${otpRes.status})`);
    }

    const otpData = await otpRes.json();
    if (!otpData.data || !otpData.data.url) {
      throw new Error('Falha ao obter URL autenticada do OTP.');
    }

    return {
      url: otpData.data.url,
      accountInfo: {
        balance,
        currency,
        email,
        fullname
      }
    };
  }

  attemptReconnect() {
    if (!this.shouldReconnect) return;
    if (this.reconnectTimeoutId) return;

    this.reconnectAttempts++;
    this.log(`Conexão perdida. Tentando reconectar (Tentativa ${this.reconnectAttempts}) em 5 segundos...`, 'warning');
    
    this.reconnectTimeoutId = setTimeout(async () => {
      this.reconnectTimeoutId = null;
      try {
        await this.connect(this.token, this.appId, this.isDemo);
      } catch (err) {
        this.log(`Falha na reconexão: ${err.message}`, 'error');
      }
    }, 5000);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.stopPingLoop();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.authorized = false;
    this.onConnectionChange(false);
  }

  startPingLoop() {
    this.stopPingLoop();
    this.pingIntervalId = setInterval(() => {
      if (this.ws && this.connected) {
        this.pingSentTime = Date.now();
        this.ws.send(JSON.stringify({ ping: 1 }));
      }
    }, 5000);
  }

  stopPingLoop() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  subscribeTicksAndCandles(symbol = this.symbol, granularity = this.granularity) {
    if (!this.ws || !this.connected) return;
    
    this.symbol = symbol;
    this.granularity = granularity;

    this.log(`Assinando ticks e candles para ${symbol} (Granularidade: ${granularity}s)...`, 'info');

    // Subscribe to ticks
    this.ws.send(JSON.stringify({ ticks: symbol }));

    // Subscribe to candle history + live feed
    this.ws.send(JSON.stringify({
      ticks_history: symbol,
      end: 'latest',
      style: 'candles',
      granularity: parseInt(granularity),
      subscribe: 1
    }));
  }

  unsubscribeSymbol(symbol) {
    if (!this.ws || !this.connected) return;
    this.log(`Cancelando assinaturas de ${symbol}...`, 'info');
    this.ws.send(JSON.stringify({ forget_all: ['ticks', 'candles'] }));
  }

  changeSymbol(symbol, granularity) {
    this.unsubscribeSymbol(this.symbol);
    setTimeout(() => {
      this.subscribeTicksAndCandles(symbol, granularity);
    }, 1000);
  }

  buyContract(symbol, stake, contractType, duration, durationUnit = 't') {
    if (!this.ws || !this.connected || !this.authorized) {
      this.log('Impossível comprar contrato: Bot desconectado ou não autorizado.', 'error');
      return;
    }

    this.log(`Enviando ordem de Compra: ${contractType} | Stake: $${stake} | Ativo: ${symbol} | Duração: ${duration}${durationUnit}`, 'info');

    const buyMsg = {
      buy: '1',
      price: 100, // max acceptable price
      parameters: {
        amount: parseFloat(stake),
        basis: 'stake',
        contract_type: contractType, // 'CALL', 'PUT', 'DIGITMATCH', 'DIGITDIFF'
        currency: 'USD',
        underlying_symbol: symbol,
        duration: parseInt(duration),
        duration_unit: durationUnit
      }
    };

    this.ws.send(JSON.stringify(buyMsg));
  }

  subscribeContract(contractId) {
    if (!this.ws || !this.connected) return;
    this.ws.send(JSON.stringify({
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: 1
    }));
  }

  sendRequest(requestBody) {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.connected) {
        reject(new Error('WebSocket não conectado.'));
        return;
      }
      const reqId = Math.floor(100000 + Math.random() * 900000); // Must be an integer for Deriv API
      const payload = { ...requestBody, req_id: reqId };
      this.pendingRequests.set(reqId.toString(), { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  async fetchCandleHistory(symbol, granularity, count = 200) {
    const response = await this.sendRequest({
      ticks_history: symbol,
      end: 'latest',
      style: 'candles',
      granularity: parseInt(granularity),
      count: parseInt(count)
    });
    if (!response.candles) {
      throw new Error(`Resposta de candles vazia para o ativo ${symbol}`);
    }
    return response.candles.map(c => ({
      epoch: c.epoch,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close)
    }));
  }

  handleMessage(data) {
    const reqId = data.req_id || (data.echo_req && data.echo_req.req_id);
    if (reqId && this.pendingRequests.has(reqId.toString())) {
      const { resolve, reject } = this.pendingRequests.get(reqId.toString());
      this.pendingRequests.delete(reqId.toString());
      if (data.error) {
        reject(new Error(data.error.message));
      } else {
        resolve(data);
      }
      return;
    }

    if (data.error) {
      this.log(`Erro da API: ${data.error.message}`, 'error');
      this.onErrorReceived(data.error.message);
      
      if (data.msg_type === 'authorize' || data.error.code === 'AuthorizationError') {
        this.disconnect();
      }
      return;
    }

    const msgType = data.msg_type;

    if (msgType === 'ping') {
      const duration = Date.now() - this.pingSentTime;
      this.latency = duration;
      return;
    }

    if (msgType === 'authorize') {
      if (data.error) {
        this.log(`Falha na autorização: ${data.error.message}`, 'error');
        this.onErrorReceived(data.error.message);
        this.disconnect();
      } else {
        this.authorized = true;
        const auth = data.authorize;
        this.log(`Autenticado com sucesso! Conta: ${auth.loginid} | Saldo: $${auth.balance}`, 'success');
        this.onAuthSuccess({
          balance: parseFloat(auth.balance),
          email: auth.email,
          fullname: auth.fullname || auth.loginid,
          currency: auth.currency
        });
        
        // Start subscriptions
        this.subscribeTicksAndCandles();
      }
    }

    else if (msgType === 'tick') {
      if (data.error) return;
      this.onTickUpdate(data.tick);
    }

    else if (msgType === 'candles') {
      if (data.error) {
        this.log(`Erro ao carregar histórico: ${data.error.message}`, 'error');
        return;
      }
      this.onCandleHistory(data.candles);
    }

    else if (msgType === 'ohlc') {
      if (data.error) return;
      this.onCandleUpdate(data.ohlc);
    }

    else if (msgType === 'buy') {
      if (data.error) {
        this.log(`Falha na execução da ordem: ${data.error.message}`, 'error');
        this.onErrorReceived(data.error.message);
      } else {
        const buyDetails = data.buy;
        this.log(`Ordem executada! ID Contrato: ${buyDetails.contract_id} | Compra: $${buyDetails.buy_price}`, 'success');
        this.subscribeContract(buyDetails.contract_id);
      }
    }

    else if (msgType === 'proposal_open_contract') {
      if (data.error) return;
      this.onContractUpdate(data.proposal_open_contract);
    }
  }
}

export const derivAPI = new DerivAPI();
