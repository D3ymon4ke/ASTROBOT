# Trader Contínuo e Laboratório

## Operação

Em **Automação**, as abas Linha do tempo, Trader contínuo e Laboratório fazem parte da mesma central. O validador existente também oferece um atalho para a pesquisa cronológica.

O Trader Contínuo executa na VPS mesmo com o navegador fechado. Não depende de `isRunning`, `schedulerState`, do ativo ou do timeframe da agenda. O servidor o chama a cada cinco segundos; o scanner consulta velas M1 fechadas a cada quinze segundos, em até quatro ativos. Entradas devem ocorrer até 25 segundos após o fechamento usado pelo sinal. Não há obrigação de entrar a cada varredura.

Começa **desligado e em observação**, separadamente nas contas demo e real. Iniciar observação consulta propostas e registra resultados indicativos por ticks, sem comprar. Para comprar, selecione explicitamente compras automáticas e inicie na conta pretendida. A execução contínua suporta contas USD, entrada fixa, MHI minoria e pullback EMA 9/21. Essas regras são experimentais: pontuação de confluência não representa probabilidade nem vantagem estatística comprovada.

Os critérios de confluência, payout, intervalo, ativos e estratégias são ajustáveis. Não são afrouxados automaticamente por falta de entradas. Não há martingale no Trader Contínuo.

## Coexistência e recuperação

- Há no máximo um contrato por motor. O limite compartilhado permite escolher uma posição total ou duas, uma por motor. Com duas posições, agenda e contínuo podem manter contratos simultâneos sem trocar de conta nem desligar a agenda.
- Selecionar modo de compras ativa um orçamento comum para agenda, manual, recall e contínuo: perdas brutas realizadas mais entradas abertas mais nova entrada não podem exceder o limite diário. Ganhos não repõem o orçamento. Renovação às 00:00 UTC.
- Exposição e orçamento são verificados novamente depois de receber a proposta e antes da compra. A reserva ocorre antes do envio, com persistência local. Parâmetros não mudam durante uma consulta/compra; pausar novas entradas continua disponível.
- Pausar não vende contratos abertos. Liquidações continuam sendo reconciliadas. Troca de conta/credenciais é bloqueada enquanto o contínuo monitora, tem observações pendentes ou contratos abertos.
- Timeout de compra não dispara uma segunda compra. A reserva permanece; resposta tardia é associada ao motor correto. Sem confirmação automática, informe o ID da corretora no formulário de conciliação. O servidor compara ativo, direção, valor e horário. Uma ordem incerta bloqueia novas compras até a conciliação. Não há botão para simplesmente apagar a reserva.
- Ordens conhecidas da agenda são consultadas mesmo quando o watchdog antigo limpa a contagem visual. Expiração, sem liquidação financeira, não é tratada como resultado final.
- Resultados do contínuo têm histórico próprio e são neutralizados no cálculo por diferença de saldo da sessão da agenda. Reconexões com ordens abertas preservam a contabilidade até a conciliação.
- Estado de cada conta, reservas e sinais processados são salvos em `vps-backend/data/session_*.json`, por escrita temporária e renomeação. O diário de decisões e liquidações é anexado a `session_*_automation.jsonl`. Inclua ambos no backup da VPS. O diário não possui rotação automática; acompanhe uso de disco.

## Laboratório

Fontes separadas: contratos comprados do contínuo, observações indicativas, histórico da agenda/manual e replay de velas. A conta demo/real permanece identificada. Filtros por estratégia e ativo não misturam as fontes.

O teste cronológico usa janelas de treino e teste consecutivas. Seleciona entre as duas estratégias somente no treino, exigindo pelo menos dez sinais e expectativa positiva nesse trecho. O resultado apresentado vem da janela seguinte. Sem candidato elegível, a janela fica sem operações. A escolha não usa os resultados futuros; isso não garante rentabilidade ou significância estatística.

É possível solicitar até 1.500 velas recentes na VPS (a API pode retornar menos; a interface mostra a quantidade efetiva) ou importar JSON M1 com até 10.000 velas/5 MB (`epoch` em segundos, `open`, `high`, `low`, `close`). Velas abertas são excluídas. O replay usa payout constante hipotético e preços OHLC, não execução intravela real; empate é tratado como perda. Duração e confluência vêm dos parâmetros da aba Trader Contínuo.

As métricas incluem resultado líquido, expectativa por contrato e unidade arriscada, taxa de acerto por contrato, fator de lucro, drawdown, sequência de perdas e curva de resultado. O intervalo Wilson de 95% é descritivo e pressupõe independência. A simulação de estresse usa 300 reamostragens de blocos de cinco retornos com entrada fixa; não é previsão.

A exportação JSON contém as linhas carregadas e filtradas, métricas, estresse, janelas e candidatos do teste. O navegador recebe até 1.000 resultados recentes do contínuo, e a tabela exibe os últimos cem da seleção. O estado guarda até 2.000 resultados; o diário da VPS mantém o histórico além desse limite. Resultados indicativos e OHLC não autorizam compras automaticamente. Nenhum teste realizado nesta implementação enviou ordens reais.

## Verificação e publicação

### Base própria e rompimento em observação

Em Laboratório, **Iniciar gravador e observação** habilita uma coleta independente na VPS. Os ativos são copiados da seleção do Trader Contínuo ao iniciar a coleta; não é necessário iniciar esse trader. O gravador consulta ticks a cada 15 segundos, registra propostas recebidas pelo contínuo e os motivos de suas decisões. Somente campos de pesquisa são gravados, sem tokens ou configurações de autenticação. Interrupções de rede podem produzir lacunas: a coleta não promete um histórico completo retroativo.

O candidato `breakout-v1` exige compressão em seis velas M1 fechadas, canal com largura limitada em relação às 23 velas anteriores e fechamento fora do canal com corpo de pelo menos metade da amplitude da vela. Consulta uma proposta de USD 0,35 por um minuto; não compra. A estratégia está ausente da lista permitida para execução real. O payout mínimo indicativo é 80% líquido e o score mínimo é 60; a pontuação do candidato é 65 e não representa probabilidade.

Os arquivos ficam em `data/session_*_research/demo-AAAA-MM-DD.jsonl` e `real-AAAA-MM-DD.jsonl`, com registros `tick`, `proposal` e `decision`. Há retenção dos sete dias UTC mais recentes e limite de 32 MB por dia/conta. Ao ultrapassar o limite, a coleta pausa e informa o motivo. A limpeza só remove arquivos com nomes pertencentes ao gravador. Os contadores exibidos são acumulados, não representam o volume retido. Inclua essa pasta em backups se precisar de retenção maior.

**Reproduzir ticks** lê as propostas do dia selecionado e o payout que foi registrado. A entrada é o primeiro tick após o recebimento da proposta acrescido da latência hipotética; a saída é o primeiro tick após a duração a partir dessa entrada. O replay exige cobertura na entrada, saída e entre elas, conforme a tolerância de lacuna escolhida. Propostas rejeitadas, inválidas ou sem cobertura são contadas separadamente. Consulta também os primeiros minutos do dia seguinte para completar operações que cruzam meia-noite. Não usa propostas desse segundo dia para acrescentar operações.

Essa análise é indicativa: não demonstra que a proposta teria permanecido disponível, não replica preços exatos de compra/liquidação e não aplica o orçamento compartilhado do motor real. Cada estratégia é reconstituída separadamente, com proibição de sobreposição dentro da mesma estratégia/versão/ativo. Use os filtros para comparar candidatas; a soma não é uma simulação de carteira executável. O replay por ticks avalia propostas já registradas, enquanto o teste de seleção cronológica por treino/teste permanece baseado em OHLC. A exportação da análise inclui resultados e motivos de exclusão; os ticks brutos ficam nos arquivos JSONL da VPS.

Além dos módulos anteriores, a publicação deve incluir `automation/ResearchRecorder.js`, `automation/tickReplay.js` e `automation/breakout.js`.

Instale as dependências da raiz e do backend (`npm ci` e `npm ci --prefix vps-backend`). Execute `npm test`, `npm run build` e `npm run lint`. Os testes usam API simulada e cobrem isolamento de contas, reservas concorrentes, pausas, respostas tardias, persistência, liquidação e causalidade do replay.

Publique juntos `UserSession.js`, `server.js`, `deriv/DerivAPI.js` e a pasta `automation/` na VPS; o frontend usa o build Vite. A interface mantém controles indisponíveis enquanto a VPS não informa suporte à versão 1 do recurso. Faça backup antes da atualização e verifique contratos em andamento antes de reiniciar. Preserve `data/`, credenciais e certificados. A atualização não habilita compras por padrão.
