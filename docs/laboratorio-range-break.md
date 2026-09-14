# Range Break: pesquisa de viabilidade, versão 1

Implementado em 14/09/2026. **Nenhuma rentabilidade demonstrada.** São duas hipóteses exclusivamente simuladas, com parâmetros congelados, integradas ao botão de iniciar/pausar do Laboratório de Evidência. Não há chamadas `buy` ou `sell`, promoção automática para conta real ou alteração da linha do tempo.

## Descoberta e limite prático

A API PAT da conta retornou RB100 e RB200 com MULTUP/MULTDOWN, sem Rise/Fall. Propostas de $1 com multiplicador 20 retornaram comissão de $0,02 e stop-out de -$0,90. A disponibilidade e os custos são conferidos novamente nas propostas de cada oportunidade.

Uma inspeção de cerca de 999 candles M1 por ativo encontrou 9 rejeições e 2 rompimentos em RB100 e 7 rejeições e 1 rompimento em RB200. **Nenhum passou no filtro econômico.** Exemplo: canal de 38 pontos em preço 53.414; o resultado no alvo, já descontada a comissão, seria aproximadamente -$0,017. M5 também não aprovou oportunidades no recorte consultado. A inspeção contou sinais e custos, não fez um backtest de resultados nem demonstrou desempenho. M1 permanece o protocolo implementado; não se afrouxaram filtros para produzir entradas.

Por isso o módulo deve ser descrito como pesquisa de viabilidade, não estratégia eficaz ou rentável. É esperado ficar sem operações enquanto os custos consumirem o movimento potencial. O painel mostra o motivo e os valores condicionais da última proposta.

## Regras congeladas

- Ativos RB100/RB200, canal dos 20 candles M1 anteriores ao candle de confirmação, apenas candles fechados e contíguos. Dois testes separados em cada borda (faixa de 10% da largura); deslocamento entre primeiro e último fechamento inferior ou igual a 35% da largura.
- Rejeição: teste da borda, sem ultrapassá-la mais de 5%, candle contrário à aproximação e fechamento entre 15% e 30% da largura a partir da borda. Alvo no centro; stop 10% além da borda.
- Rompimento: corpo de pelo menos 60% da vela, fechamento de 5% a 30% além da borda. Stop 10% para dentro do canal; alvo a 1,5 vezes a distância ao stop.
- Entrada fixa $1, multiplicador 20. Resultado líquido condicional no alvo >= $0,05 e >= três comissões; resultado no alvo / perda no stop >= 1,2; perda estimada no stop <= $0,50. Esses valores são cenários condicionais, não valores esperados probabilísticos.
- Duas carteiras independentes de $100; uma posição por estratégia entre ambos os ativos. Reserva do valor integral de $1, perda bruta diária UTC $3 e drawdown histórico $15. Ganhos não recompõem o orçamento diário. Não há martingale.

## Execução indicativa

Cotação com precisão e comissão oficiais. Entrada no primeiro tick posterior ao recebimento da proposta + 1 segundo, com nova validação de custo/risco nesse preço. Fórmula: direção × (saída/entrada − 1) × multiplicador × stake − comissão, limitada à perda da stake.

O caminho é apurado incrementalmente em blocos de até 120 segundos; o primeiro gatilho de alvo/stop/30 minutos programa saída no próximo tick. Stop-out tem precedência e encerra no tick de cruzamento; gaps de preço podem piorar a perda, limitada à stake. Slippage e preços de venda reais podem diferir desse modelo.

Ticks ausentes ou lacunas acima de cinco segundos bloqueiam a posição, conservam reserva e não fabricam P&L. A pausa interrompe novas posições, mas mantém apuração. Estado persistido por modo de conta, separado dos resultados antigos; troca de conta bloqueada enquanto houver posições. Até 2.000 operações retidas; saldos e contadores das carteiras são cumulativos. Sem aplicar Wilson a resultados de multiplicadores, cuja distribuição não é binária de payout fixo.

## Validação

90 testes do projeto passaram, incluindo sinais causais, custos, entrada futura, reserva, orçamento, latência de saída, stop-out, lacunas, pausa e isolamento. Build passou. Painel validado no Edge headless com backend simulado, filtros, exportação, gráfico e viewport móvel. Testes de software não comprovam vantagem financeira.

## Fontes primárias

- [Deriv: estrutura dos Synthetic Indices e ressalva sobre indicadores](https://deriv.com/markets/derived-indices/synthetic-indices)
- [Deriv: fórmula, comissão e slippage de Multipliers](https://deriv.com/options-types/multipliers)

A descrição de canais pela Deriv fundamenta a hipótese, não demonstra que estes parâmetros sejam lucrativos. Não interpretar uma taxa de acerto alta ou melhora por martingale como vantagem econômica.
