# Laboratório de Evidência · protocolo v1

Implementado em 14/09/2026. Substitui a execução do antigo Quântico no workspace; os dados legados `digitLab` e `fakegale` permanecem preservados. O novo motor ocupa `modeStates[accountMode].evidenceLab` e nunca chama `buy` ou `sell`. O endpoint existente `digit_config` controla somente a nova pesquisa.

## Hipóteses congeladas

| Experimento | Entrada | Contrato | Recuperação |
|---|---|---|---|
| Transição de dígitos | Últimos 300 ticks: estima paridade seguinte condicionada à paridade atual, mínimo de 60 transições relevantes | EVEN/ODD, 1 tick | Nenhuma |
| Controle de dígitos | Alterna EVEN/ODD pelo minuto, sem previsão | EVEN/ODD, 1 tick | Nenhuma |
| Rompimento | Seis velas M1 comprimidas em relação às 23 anteriores; fechamento além do canal e corpo mínimo de 50% | CALL/PUT, 3 minutos | Nenhuma |
| Fakegale fixo | Minoria das três últimas velas do bloco anterior; duas velas seguintes contrárias à previsão | CALL/PUT, 1 minuto | Nenhuma |

O Fakegale fixo é uma hipótese restrita de MHI 1 minoria; não replica a combinação dos seis padrões e a seleção de líder do V2. O controle de dígitos não é um par simultâneo com preço idêntico: são propostas próprias, nos mesmos ativos, sem garantia de mesma contagem por braço. Frequência, modalidade e duração devem acompanhar qualquer comparação. Não selecionar o vencedor pelo maior lucro absoluto de modalidades com frequências distintas.

## Apuração

Precisão decimal obtida por `active_symbols` (`pip`/`pip_size`); não inferida pelo nome do ativo. Rejeitar timestamps duplicados, dados não finitos, histórico incompleto e propostas antigas. Entrada hipotética: primeiro tick posterior ao recebimento da proposta mais um segundo de latência. Para um contrato de um tick, saída no tick seguinte à entrada, não em dois segundos fixos. Para minutos, primeira cotação no vencimento a partir da entrada, com tolerância de cinco segundos. Sem dados confiáveis, registrar exclusão, não vitória/perda inventada. Resultados permanecem indicativos: cotação de proposta e compra real não são equivalentes.

## Pesquisa e carteiras

Todas as oportunidades válidas são apuradas em pesquisa, inclusive depois de bloqueios de risco. Quatro braços no máximo simultâneos, uma pendência por braço e rotação de ativos a cada varredura. Aposta fixa US$ 0,50. Cada carteira parte de US$ 100, sem relação com saldo real; controle nunca recebe alocação.

Antes de cada proposta, a alocação usa exclusivamente resultados já encerrados da mesma estratégia, ativo e tipo de contrato. Janela de até 400; mínimo de 200; duas metades cronológicas positivas em retorno por unidade de stake; limite inferior de Wilson 99% maior que `stake / payout + 0,02`. A decisão fica congelada na pendência, antes do resultado. O score antigo e as taxas legadas não são reutilizados. Este teste é um filtro experimental, não um intervalo de garantia para lucros: dependência temporal, múltiplas hipóteses e consulta repetida exigem cautela na interpretação. A autorização real não é automatizada.

Carteiras reservam a exposição antes da entrada; limite padrão de US$ 3 de perdas brutas por dia UTC e US$ 15 de drawdown acumulado. Ganhos não repõem o orçamento de perdas diárias. Drawdown não é zerado na virada do dia. Resultados pendentes são apurados inclusive com pesquisa pausada e depois de reinícios. Sem martingale, reset destrutivo ou alteração de parâmetros depois de começarem os contratos.

## Interface, retenção e testes

A compatibilidade de precisão foi verificada na API PAT em produção: `pip_size: 0.01` representa incremento de preço e é convertido em duas casas decimais. A API legada pode informar `pip`, e respostas com contagem inteira de casas também são aceitas. Incrementos não decimais e metadados ausentes não são usados para inventar um dígito.

Curvas em eixo temporal comum, pesquisa separada de carteiras, saldo acumulado das carteiras, taxas de equilíbrio, amostra usada na decisão, histórico legado e exportação JSON. Backend retém 6.000 contratos de pesquisa, painel transmite 1.500; os gráficos são explicitamente da janela retida. Os saldos de carteira abrangem todo o experimento. Snapshots não substituem um arquivo histórico ilimitado.

Testes cobrem tick-count, precisão, gaps, empate, pausas, orçamento, limite de drawdown, separação de contas/legado e rejeição de configuração real. Teste de navegador usa VPS simulada para botões, filtros, gráfico, exportação e layout móvel; não envia ordens ou Telegram reais.

## Fundamentação e limites

- [Deriv: termos de negociação](https://docs.deriv.com/tnc/trading-terms.pdf): preço de entrada de opções digitais depende do tick após processamento da compra.
- [Deriv: Even/Odd](https://doc-deriv.readme.io/docs/digit-evenodd): resultado depende da paridade do último dígito do tick final.
- [Deriv: índices sintéticos](https://deriv.com/markets/derived-indices/synthetic-indices): ausência de livro de ofertas; padrões históricos não constituem por si só vantagem preditiva.

As quatro hipóteses não têm rentabilidade comprovada. A finalidade do novo protocolo é medir se existe vantagem prospectiva após payout, latência e risco, e permitir concluir que nenhuma hipótese deve operar. Martingale altera a distribuição das perdas; não transforma automaticamente uma expectativa negativa em positiva.
