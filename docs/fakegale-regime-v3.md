# Fakegale Regime V3 — reversão × continuação

Implementado em 15/09/2026 como substituto prospectivo do Fakegale V2. O V3 é exclusivamente simulado, não aceita `execution`, não chama `buy`/`sell`, não altera o saldo Deriv e não usa martingale ou aumento de stake.

## Motivo da substituição

Na auditoria anterior à migração, o V2 real-mode retido tinha 4.000 entradas simuladas e resultado de −US$1.197,96. As 2.281 primeiras entradas depois das duas perdas virtuais somavam −US$195,41. O subconjunto marcado como líder teve resultado positivo quando incluía progressão, mas sua primeira entrada fixa continuou negativa; o resultado também se concentrou no R_100, enquanto o 1HZ50V permaneceu negativo. Isso não sustentava promover ou continuar ajustando o mesmo funil.

O estado V2 foi congelado dentro de `legacyV2`. Ele permanece resumido no painel e disponível na exportação, mas não participa do V3.

## Hipótese e desenho pareado

A cada fechamento M1, em R_100 e 1HZ50V, o motor usa somente candles fechados, válidos e contíguos. Quando identifica duas velas seguidas da mesma cor, cria o coorte de profundidade 2. Se as três velas recentes têm a mesma cor, cria o coorte de profundidade 3.

Para o mesmo evento são cotadas duas alternativas Rise/Fall de um minuto:

- reversão: direção oposta à sequência;
- continuação: direção da sequência.

As duas alternativas aguardam um único tick futuro após as propostas. Esse tick é a entrada compartilhada. Ambas vencem 60 segundos depois e usam o mesmo primeiro tick válido na janela de cinco segundos de saída. Portanto, a diferença observada vem da direção e do payout cotado, não de horários ou preços diferentes. Empate perde nas duas alternativas.

Os quatro braços são `reverse_2`, `follow_2`, `reverse_3` e `follow_3`. Eles são carteiras hipotéticas mutuamente exclusivas e suas curvas não devem ser somadas.

## Qualidade e risco

Propostas sem identificador, spot atual, stake exata ou payout líquido mínimo são rejeitadas como par completo. A coleta não usa o spot da proposta como entrada. Dados ausentes não viram loss ou win.

Cada braço tem carteira simulada de US$100, stake padrão de US$1, perda bruta diária máxima de US$3 e drawdown máximo de US$15. Quando uma carteira bloqueia alocação, a pesquisa continua registrando o resultado não alocado para evitar viés de sobrevivência.

Pausar impede novos pares e continua apurando posições abertas. A linha do tempo, o Trader Contínuo e o Laboratório de Evidência permanecem independentes.

## Validação

103 testes passaram. A cobertura do V3 verifica candles fechados e contíguos, profundidades 2/3, migração do V2, propostas pareadas, entrada e saída compartilhadas, ausência de compras, pausa, isolamento de saldo e limites independentes. Build Vite e navegador Edge desktop/mobile passaram.

O V3 mede uma hipótese; não existe evidência inicial de rentabilidade. Uma decisão futura deverá comparar expectativa líquida, drawdown e estabilidade por ativo em amostra prospectiva suficiente.

## Referência oficial

- [Deriv — termos de negociação e entrada no próximo tick](https://deriv.com/pt/terms-and-conditions/trading-terms)
