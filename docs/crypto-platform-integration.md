# ASTROBOT Multimercado — início da integração OKX Spot

## Estado entregue

- `/`: portal de escolha Deriv ou Cripto; `/#/deriv` preserva o aplicativo anterior e `/#/crypto` usa identidade verde-água e âmbar. Rotas com hash mantêm o caminho dos assets estável também na versão Electron.
- A área Cripto consulta tickers e velas M15 públicas da OKX por `/api/okx?kind=market`. No desenvolvimento, o Vite executa o mesmo handler do endpoint serverless.
- Observação não envia ordens. Demo local registra compras pelo ask e vendas pelo bid, taxa hipotética de 0,10%, posição spot sem venda a descoberto e histórico no `localStorage` deste navegador. Essa carteira não é a conta Demo oficial da OKX e não sincroniza entre dispositivos.
- Laboratório compara EMA 9/21, rompimento de 20 velas e compra/manutenção no mesmo período recente. O sinal usa uma vela fechada e a ordem hipotética acontece na abertura seguinte. Custos estimados entram na conta; spread e slippage não são modelados pelo backtest.
- Análise mostra patrimônio estimado, posições e operações demo. Cotações dos pares em carteira são atualizadas; pares momentaneamente sem preço usam custo médio e a interface informa isso.
- Demo OKX oficial é uma quarta modalidade independente: `/api/okx?kind=demo` consulta configuração, saldo, cotação Demo, instrumento, ordens pendentes e estado por `clOrdId`. Permite apenas ordens **limite spot Demo** BTC/ETH/SOL-USDT, com valor de US$1 a US$25, incrementos da OKX, saldo disponível, cotação recente, desvio de preço até 2% e uma ordem pendente por par. O envio confirmado pela API é exibido como aceito, não como preenchido; timeout e cancelamento sem confirmação aparecem como estado incerto, sem reenvio automático.
- A seção **Histórico de execução** consulta, sob demanda, ordens concluídas dos últimos sete dias (`/trade/orders-history`) e preenchimentos (`/trade/fills-history`) do par. Identifica ordens criadas pelo ASTROBOT pelo prefixo `AstroD`, marca as demais como externas e mostra estado final, quantidade, preço médio e taxa na moeda cobrada. Se o endpoint de fills estiver indisponível, preserva o histórico de ordens com aviso. Nenhum P/L spot é inferido apenas de compras ou ordens aceitas.
- As três credenciais Demo são enviadas ao endpoint do próprio domínio e armazenadas por até uma hora apenas num cookie HttpOnly, SameSite Strict, cifrado com AES-256-GCM. O navegador não persiste a chave no `localStorage`. Em produção, configurar `OKX_DEMO_COOKIE_KEY` como segredo aleatório de 32 bytes em hexadecimal (64 caracteres) e servir somente por HTTPS. O Vite gera chave efêmera para desenvolvimento local. A chave usada na conexão deve vir de **Trade → Demo Trading → Personal Center → Demo Trading API**; o servidor usa exclusivamente o cabeçalho `x-simulated-trading: 1` e aceita somente Read, opcionalmente Trade, recusando Withdraw, Transfer e outras permissões. Uma chave da conta Real não substitui a chave Demo.
- Os três campos são mascarados e limpos após qualquer tentativa de conexão, inclusive falha 401. A resposta 401 não repete mensagem bruta da corretora nem material de autenticação.
- O modo Real mostra preparação de conta e permanece sem execução. A validação de uma chave Demo não equivale a login de usuário no ASTROBOT; autenticação verificável, cofre persistente por conta e política de risco durável continuam pendentes para Real.

## Sequência restante para Real

1. Substituir a identidade por e-mail do WebSocket existente por uma sessão de usuário verificável e curta para a área Cripto. Nunca confiar em e-mail ou CDKey enviada pelo cliente como autorização de uma ordem.
2. Criar cofre persistente de credenciais cifradas em repouso, restrito por conta e sessão autenticada. Separar fisicamente Demo e Real; o cookie efêmero atual cobre somente a Demo e não serve como cofre Real.
3. Persistir intenção, `clOrdId`, respostas e estado de cada ordem num ledger por conta. Reconciliar ordens incertas após timeout/reinício e impedir duplicatas simultâneas entre instâncias; a Demo atual expõe a consulta manual, mas ainda não possui ledger durável.
4. Aplicar limites duráveis no servidor: orçamento total, perda diária, exposição agregada, frequência, pausa manual, cotação antiga e falhas de mercado. O limite atual de US$25 é somente por ordem Demo, não é limite de perda diária.
5. Executar observação com dados reais e testes prospectivos antes de permitir ordens Real. O Demo oficial da OKX não deve ser usado sozinho para julgar rentabilidade, pois seus preços podem diferir dos preços reais.
6. Habilitar Real por conta após confirmação explícita do usuário e mostrar estado da ordem vindo da corretora, jamais inferido apenas da resposta de envio.

## Como testar a integração privada

No desenvolvimento, iniciar `npm run dev`, abrir `/#/crypto`, escolher **Demo OKX**, criar uma chave API na área Demo Trading da corretora com Read e Trade, sem Withdraw, e conectá-la. A chave de cifra é gerada para a sessão local do Vite; ao reiniciar, reconecte. Para implantação, adicionar `OKX_DEMO_COOKIE_KEY` ao ambiente serverless e habilitar HTTPS. Sem uma chave Demo do usuário, os testes automatizados usam cliente simulado e verificam assinatura, rejeição de saque, cifra, limites e tratamento de envios incertos; não comprovam execução em uma conta OKX específica.

Uma chave fornecida para esta etapa foi testada **apenas por configuração/saldo Demo**, usando `x-simulated-trading: 1`, e a OKX respondeu HTTP 401. O conector não abriu sessão nem enviou ordem. Esse retorno pode indicar chave de outro ambiente, passphrase diferente ou restrição da conta; não identifica a causa sozinho. Credenciais completas não foram registradas neste plano. Como chave e segredo apareceram no histórico da conversa, a recomendação operacional é revogá-los e criar novos antes de usar mesmo a conta Demo.

Uma chave posterior criada para a **Demo** foi aceita pelo conector: configuração, saldo e histórico de BTC-USDT foram consultados com `x-simulated-trading: 1`, e a interface exibiu Read + Trade. O histórico não encontrou ordens concluídas nesse par na janela da OKX. A sessão local foi desconectada; nenhuma ordem foi enviada. Para a implantação web, `OKX_DEMO_COOKIE_KEY` foi cadastrado como segredo da Vercel para Production e Preview. A chave API da corretora permanece individual, digitada pelo usuário na interface e jamais salva como variável global do projeto. Como suas credenciais foram exibidas na conversa, rotacione a chave depois da validação.

## Compatibilidade com o plano Hobby da Vercel

O primeiro deploy de prévia falhou após o build porque a pasta `api` ultrapassou 12 arquivos de função. Os dois serviços OKX foram reunidos em **uma única função** `api/okx.js`, que exige `kind=market` ou `kind=demo`; os módulos de implementação foram movidos para `server/` para não virarem endpoints independentes. As URLs internas da interface e o middleware Vite foram atualizados. A pasta `api` voltou a 12 arquivos. A cifra Demo usa cookie com `Path=/api/okx`, compartilhado somente com a função unificada. Serviços desconhecidos retornam 400. O backend Deriv da VPS não participa deste roteamento.

## Compatibilidade

O roteador monta o aplicativo Deriv existente somente na rota Deriv. Dados e estados do módulo Cripto usam chaves próprias e não modificam `UserSession`, agenda, Trader Contínuo nem tokens Deriv. A execução Cripto deverá viver em serviço isolado da atual sessão Deriv.
