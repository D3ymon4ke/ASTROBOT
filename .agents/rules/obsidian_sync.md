# Diretriz de Registro Contínuo no Segundo Cérebro (Obsidian)

> **Regra Obrigatória para o Agente Antigravity:**
> Todas as criações, melhorias, correções e atualizações realizadas no projeto **ASTROBOT** DEVEM ser documentadas e registradas no vault do Obsidian em:
> `C:\Users\deymo\Documents\Segundo Cerebro`

## Procedimento Padrão a Cada Modificação

1. **Atualização da Nota Técnica Específica:**
   - Se uma alteração foi feita em um motor (ex: `ContinuousTrader`, `DigitTrader`, etc.), atualizar a nota correspondente em `02 - ⚡ Motores de Execução/`.
   - Se uma nova estratégia foi adicionada ou ajustada, atualizar em `03 - 📈 Catálogo de Estratégias & Análise Quant/`.
   - Se o backend, API Deriv, endpoints ou scripts de deploy mudaram, atualizar em `04 - 🖥️ Backend VPS & Conexão Deriv/`.
   - Se a interface, design ou componentes React mudaram, atualizar em `05 - 🎨 Frontend & Experiência do Usuário/`.
   - Se o schema ou persistência mudaram, atualizar em `06 - 🗄️ Dados, Persistência & Supabase/`.
   - Se novos testes foram criados, atualizar em `07 - 🧪 Qualidade, Testes & Métricas/`.

2. **Registro no Diário de Atualizações (Changelog):**
   - Registrar no arquivo `00 - 🧭 Início (MOC)/📝 Diário de Atualizações e Mudanças.md`.
   - Incluir: Data/Hora, Arquivos modificados, Descrição do que foi criado/melhorado, Justificativa técnica e links para as notas afetadas.

3. **Padrão de Qualidade do Obsidian:**
   - Utilizar links bidirecionais `[[Nome da Nota]]`.
   - Preservar a sintaxe de callouts do Obsidian (`> [!info]`, `> [!tip]`, `> [!warning]`).
   - Manter os diagramas Mermaid atualizados quando houver alteração de fluxo ou topologia.
