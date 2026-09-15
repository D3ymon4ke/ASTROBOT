# Laboratório Forex e Accumulator — fase prospectiva 2

Implementado em 15/09/2026. Cinco variantes exclusivamente simuladas substituem a coleta dos experimentos anteriores. Não há chamadas `buy` ou `sell`, promoção automática para conta real, martingale ou alteração da linha do tempo e do Trader Contínuo.

Os resultados de Evidência V1, Range Break, Quântico e Fakegale foram preservados para exportação e auditoria, mas deixaram de gerar sinais. Uma pendência anterior é apurada normalmente antes de o experimento ser encerrado. Range Break deixa de abrir posições; uma posição já existente, se houver, continua sendo apurada.

## Forex: tendência e retomada

Ativos EUR/USD e GBP/USD. A API confirmou Rise/Fall com duração mínima de 15 minutos, sujeito aos horários do mercado e restrições da Deriv.

- Janela: segunda a sexta, 07:00–17:00 UTC (04:00–14:00 em Brasília no fuso UTC−3 usado na implantação).
- Tendência: 60 candles M15 fechados e contíguos; EMA 20 acima/abaixo da EMA 50, EMA 20 inclinada nos cinco pontos recentes e fechamento do último candle no lado da tendência.
- Controle: entra na direção da tendência a cada nova oportunidade, limitado a uma posição por ativo. Serve para avaliar se o filtro de retomada acrescenta valor.
- Retomada: em 30 candles M5 fechados, o penúltimo candle recua até a EMA 20 e fecha contra a tendência; o último fecha a favor e rompe a máxima/mínima do penúltimo.
- Contrato: Rise/Fall com barreira +0, vencimento explícito 15 minutos após a proposta, stake fixa de US$0,50. Quando a retomada passa, ela e o controle compartilham sinal, proposta, entrada e vencimento.
- Entrada: primeiro tick depois da proposta + um segundo. Vencimento: último tick válido no intervalo de 30 segundos terminado no tempo explícito. Tick posterior ao vencimento nunca altera o resultado.

Não são usados sinais fora da janela, candles em formação, séries com gaps, proposta stale ou payout inválido. Forex não funciona 24/7; essa limitação é exibida no painel.

### Rede adaptativa online

A terceira variante Forex é uma rede neural local 5→4→1, pequena o suficiente para ser auditada e persistida junto ao estado da conta. Não usa serviço externo nem modelo de linguagem. Os cinco atributos são calculados somente com candles já fechados: separação EMA 20/50, inclinação da EMA 20, distância do fechamento à EMA, força direcional do candle M5 e profundidade do recuo.

A previsão é salva antes da entrada. Somente após o vencimento ela recebe o rótulo win/loss e atualiza os pesos por gradiente com regularização e limites numéricos. Esse desenho impede que o próprio resultado entre nas variáveis de entrada. O treinamento usa todas as oportunidades do controle, inclusive quando a carteira adaptativa ainda não pode operar.

A variante adaptativa permanece em observação por pelo menos 100 resultados. Depois disso, ela só simula uma entrada se o erro Brier prequential dos 100 casos mais recentes superar uma referência de frequência histórica por margem de 0,005 e se a probabilidade prevista superar a taxa de equilíbrio do payout em quatro pontos percentuais. A qualificação pode voltar a ser bloqueada quando a qualidade piora. Essa barreira reduz decisões por sobreconfiança, mas não demonstra vantagem econômica.

## Relógios e visualização ao vivo

O painel calcula a abertura/fechamento Forex em UTC, incluindo a passagem do fim de semana, e mostra a próxima fronteira M5 elegível. Para Accumulator, mostra a próxima coleta de um minuto e explicita que o mercado é 24/7. Os contadores indicam varreduras prováveis; uma entrada só aparece se dados, sinal e proposta passarem pelos filtros.

A visualização da rede mostra o fluxo dos cinco atributos pelos quatro neurônios até a probabilidade, seguido por simulação, encerramento e feedback. A animação respeita `prefers-reduced-motion`. Métricas exibidas: amostra, acerto observado, erro Brier e erro da referência.

## Accumulator: 3 e 5 ticks

Ativos R_100 e 1HZ50V, alternados a cada minuto, 24/7. A API confirmou ACCU com crescimento de 1%, stake mínima de US$1, máximo de 250 ticks e parâmetros oficiais de barreira.

- As variantes de 3 e 5 ticks partem da mesma proposta e entrada futura.
- A barreira é recalculada a cada tick usando `preço anterior × tick_size_barrier` da proposta. O preço que toca ou ultrapassa a barreira causa knockout e perda integral de US$1.
- Como a API arredonda as barreiras exibidas, movimentos dentro de uma unidade de exibição do limite ficam como ambíguos: nenhuma vitória ou perda é inventada e o risco permanece reservado.
- Resultado nominal: crescimento composto de 1% até 3 ou 5 ticks, arredondado para baixo em centavos.
- Resultado operacional conservador: a saída só é apurada no tick seguinte ao número planejado. Esse tick adicional pode acrescentar crescimento ou causar knockout. É o cenário que altera as carteiras; o painel permite comparar com o resultado nominal.

O modelo não reproduz o preço de revenda exato do contrato ou slippage; por isso é indicativo. A comparação nominal versus atraso torna esse limite visível em vez de presumir execução instantânea.

## Gestão e persistência

Cada variante possui carteira independente de US$100, stake fixa, uma reserva simultânea, limite de perdas brutas de US$3 por dia UTC e drawdown histórico de US$15. Ganhos não recompõem o orçamento diário. Uma carteira bloqueada não interrompe a coleta de pesquisa não alocada.

Até 1.500 registros por variante permanecem no backend e 300 por variante são enviados ao painel. O estado é isolado por conta real/demo. Pausar impede novos sinais, mas apura posições pendentes. Trocar de conta é bloqueado enquanto existir qualquer posição de pesquisa.

## Validação

104 testes passaram, incluindo causalidade M15/M5, relógio até segunda-feira, previsão anterior ao rótulo, treinamento único após vencimento, trava adaptativa, proposta do Accumulator, barreira móvel, arredondamento ambíguo, entrada futura, knockout após a saída nominal, atraso de um tick, gaps, pausa, orçamento e isolamento entre contas. Build Vite concluído. A interface foi verificada no Edge headless em desktop e mobile, com rede externa interceptada e confirmação de que nenhum comando real foi enviado.

Testes de software não demonstram rentabilidade. O objetivo desta fase é medir lucro líquido, drawdown e estabilidade com regras congeladas antes da coleta.

## Fontes oficiais

- [Deriv: Digital Options e Rise/Fall](https://deriv.com/trade/options/digital-options)
- [Deriv: Accumulator Options](https://deriv.com/trade/options/accumulator-options)
- [Deriv: termos de negociação, entrada no próximo tick e knockout](https://docs.deriv.com/tnc/trading-terms.pdf)
