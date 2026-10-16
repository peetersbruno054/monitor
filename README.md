# Monitor IA · Safeweb

Versão web do Monitor IA na Vercel. Consulta o Orpen (R72 e R74), pode persistir os resultados no Supabase e funciona no computador e no celular.

## Arquitetura atual

```
Tela: "Atualizar dados"
          │
          ▼
     /api/reports
          │
     ┌────┴────┐
     │         │
  histórico   período novo
  fechado     / hoje / ontem
     │         │
     ▼         ▼
  Supabase    Orpen
                │
             R72 + R74
                │
                ▼
             Supabase
```

- **Não existe atualização automática do Monitor por padrão.** O Orpen é consultado quando uma coleta é solicitada pela tela.
- Quando o Supabase está configurado, as coletas são salvas como snapshots.
- **Períodos fechados** (até antes de ontem) podem ser reutilizados do snapshot exato.
- Para validar a regra de retorno em até 24h, a tela pode solicitar também o dia seguinte ao período; esse dia extra é usado como contexto e **não altera o período exibido**.
- O snapshot continua identificado pelo período solicitado, mesmo quando contém linhas extras usadas somente para o cruzamento de 24h.

## Melhorias de performance e uso

- O vínculo entre protocolos do R72 e pesquisas do R74 usa um índice por protocolo no navegador, evitando buscas repetidas e reduzindo o custo quando há muitos registros.
- A Visão geral ganhou o painel **O que merece atenção**, no final da aba, que prioriza automaticamente não resolvidos, satisfação baixa, recontatos e protocolos aguardando confirmação.
- Quando o período anterior está disponível, o radar considera **tendência** (alta/queda) além do volume absoluto e destaca um **Principal ponto de atenção**.
- Os alertas levam diretamente para a lista/painel correspondente, para reduzir o tempo entre detectar um problema e investigá-lo.
- O botão **Ver conversa** abre a conversa real do protocolo no Monitor, com mensagens agrupadas por cliente/atendimento; o código continua permitindo copiar o número do protocolo.
- O cache de períodos fechados no Supabase continua sendo reutilizado, enquanto o dia extra da regra de 24h permanece apenas como contexto de cálculo.

## Supabase

1. Crie um projeto no Supabase.
2. No **SQL Editor**, execute `supabase/schema.sql`.
3. Em **Authentication → Sign In / Providers → Email**, desative o cadastro público de novos usuários.
4. Crie o usuário autorizado em **Authentication → Users**.
5. Em **Project Settings → API Keys**, use no backend uma chave secreta e, para o login por senha, uma chave publicável/compatível com Auth.

O código aceita tanto as chaves atuais quanto as legadas:

- `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY`

## Variáveis da Vercel

Configure em **Settings → Environment Variables**:

| Variável | Uso |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase, sem `/rest/v1` ou `/auth/v1` |
| `SUPABASE_SECRET_KEY` | chave secreta do backend |
| `SUPABASE_SERVICE_ROLE_KEY` | fallback para a chave legada |
| `SUPABASE_PUBLISHABLE_KEY` | chave para autenticação por senha |
| `SUPABASE_ANON_KEY` | fallback para autenticação |
| `MONITOR_AUTH_SECRET` | segredo usado para assinar a sessão diária |
| `ORPEN_*` | variáveis de conexão com o Orpen |
| `RESEND_API_KEY` | opcional: chave do Resend para o e-mail de alerta de falhas |
| `ALERT_EMAIL` | opcional: quem recebe o alerta (vários separados por vírgula) |
| `ALERT_FROM` | opcional: remetente (padrão `Monitor IA <onboarding@resend.dev>`) |

Depois de alterar variáveis da Vercel, faça um novo deploy.

## Login

O Monitor aceita apenas o e-mail autorizado configurado no backend. Quando o Supabase Auth está configurado, a senha é validada pelo Supabase.

Depois da validação, o Monitor cria uma sessão própria em cookie `HttpOnly`, válida até o fim do dia.

O navegador nunca recebe a chave secreta do Supabase.

## Regra de retorno em até 24h

A regra está centralizada em um único fluxo para evitar dupla aplicação.

O cálculo usa:

- mesmo telefone/contato normalizado;
- fim do último evento do protocolo anterior;
- início do primeiro evento do protocolo seguinte;
- intervalo de até 24 horas;
- cadeia de retornos (por exemplo: protocolo A → B → C).

Regras principais:

- Retorno dentro de 24h marca o protocolo anterior com o contexto do retorno e propaga o desfecho final da cadeia quando aplicável.
- **“Problema não resolvido” é sticky**: depois que esse bot point aparece em um protocolo, ele continua como “Não resolvido”, mesmo que depois exista retomada, transferência ou outro evento.
- “Aguardando confirmação” só vira “Resolvido” depois que as 24 horas realmente passaram sem retorno.
- Protocolos sem telefone suficiente não são considerados recontato verificável.

## Rotas

- `/api/auth` — login e sessão
- `/api/reports` — R72/R74
- `/api/conversation` — consulta de conversa por protocolo
- `/api/settings` — metas por IA (leitura para todos, gravação só administradores) e situação das coletas
- `/api/users` — gestão de acessos (administradores)
- `/api/check-config` — diagnóstico protegido
- `/api/health` — verificação simples do serviço

As rotas que retornam dados do Orpen exigem sessão válida do Monitor.

## Segurança

- Chaves secretas ficam somente no servidor.
- As tabelas do Supabase têm RLS habilitado e acesso revogado para `anon` e `authenticated`; o backend usa a credencial administrativa.
- `/api/reports`, `/api/conversation` e `/api/check-config` exigem login.
- O navegador não consulta diretamente o banco.

## Limpeza

Para remover snapshots e registros antigos:

```sql
select public.monitor_ia_cleanup(365);
```

Isso mantém aproximadamente um ano de histórico.

## Acessos dos colegas

Com o Supabase configurado (`SUPABASE_URL`, chave **secret** e chave **publishable** na Vercel), o botão **Acessos** aparece para administradores, na faixa azul (no celular, junto do botão Atualizar).

- **Criar acesso:** informe o e-mail e o perfil (*Leitura* ou *Administrador*). O site gera uma senha temporária, mostrada uma única vez, com botão para copiar os dados de acesso.
- **Na lista:** gerar nova senha, tornar admin/leitura, bloquear/desbloquear e remover (com confirmação). O responsável e o próprio acesso não podem ser bloqueados nem removidos.
- **Bloquear ou remover** corta o acesso em até 2 minutos, mesmo para quem já está com o site aberto.
- **Minha senha:** todos podem trocar a própria senha (pede a senha atual).
- Administradores: o responsável, os e-mails em `MONITOR_ADMINS` e quem recebeu o perfil *Administrador* na tela. Mudança de perfil vale a partir do próximo login.
- Opcional: `MONITOR_ALLOWED_DOMAINS=safeweb.com.br` impede criar acessos com outros domínios.
- Deixe desligado no Supabase o cadastro aberto (*Authentication → Sign In / Providers → Email → Allow new users to sign up*). A criação pela tela continua funcionando.

## Períodos longos, metas e relatório mensal

- Os dados são buscados **um dia por vez** (no máximo 3 ao mesmo tempo). Cada dia fica guardado no Supabase:
  dias fechados não voltam a consultar o Orpen; hoje é reaproveitado por 3 minutos e ontem por 10.
  Por isso "Últimos 30 dias", "Este mês" e "Mês passado" ficam leves depois da primeira carga.
- A sessão do Orpen é reaproveitada por até 4 minutos entre consultas seguidas.
- **Semana a semana** aparece na Visão geral quando o período tem 14 dias ou mais.
- **Relatório por IA** (Desempenho por IA) baixa um CSV com o total do período e a quebra por semana de cada IA, com as metas.
- **Metas**: rode `supabase/metas.sql` uma vez no SQL Editor do Supabase. Depois, administradores definem as metas no botão **Metas**.
- **Alerta de falhas**: toda falha de coleta fica em `sync_runs`. Com 3 falhas seguidas, administradores veem um aviso no painel
  e, se `RESEND_API_KEY` e `ALERT_EMAIL` estiverem configurados, recebem um e-mail (no máximo um a cada 2 horas).
- **Economia da IA**: em **Metas e economia**, administradores informam o tempo médio de um atendimento humano (e, se quiserem, o custo da hora). A Visão geral, o Semana a semana, o CSV, o resumo copiado e o PDF passam a mostrar as horas evitadas (só atendimentos resolvidos pela IA).
- **Mapa de pico** (Visão geral): dia da semana × hora do primeiro contato, por IA, em volume, % transferidos ou % resolvidos. O expediente considerado é segunda a sexta, das 8h às 18h (constante `BIZ` em `padroes.js`).
- **Clientes que mais voltam** (aba Protocolos): telefones com 2 ou mais atendimentos no período, com desfecho de cada um, protocolos (clique para copiar) e CSV da lista completa. O telefone aparece parcialmente oculto; clique para ver.
- **Relatório mensal** (botão no topo): abre uma página limpa, sempre em fundo branco, com indicadores, destaques, pontos de atenção, desempenho por IA, semana a semana, horário de pico e clientes que mais voltaram. Use **Imprimir / salvar PDF**. Compara com o mês anterior quando o período é um mês fechado.

## Aba BI

Quinta aba do site (atalho **5**), com a mesma lógica de uma planilha de BI: filtrar, comparar e exportar. Respeita o período escolhido no topo da página.

- **Filtros:** IA (várias ao mesmo tempo), recorte por semana, dia da semana, faixa horária (madrugada, manhã, tarde, noite) e agrupamento da evolução (automático, por dia ou por semana). Clicar numa IA em qualquer gráfico ou tabela também filtra. **Limpar filtros** volta ao período todo.
- **Indicadores:** atendimentos com desfecho, % resolvidos, transferidos, não resolvidos e inatividade, nota média, respostas da pesquisa e metas atingidas. Com uma única IA selecionada, cada indicador mostra ✔/✖ conforme a meta definida em **Metas e economia**.
- **Gráficos:** composição dos desfechos por IA, nota da pesquisa por IA, evolução dos percentuais e volume por desfecho. As tabelas "Comparativo entre IAs" e "Evolução" trazem os mesmos números.
- **Exportar:** **↓ Excel** gera um `.xlsx` com os filtros aplicados (abas Resumo, Comparativo IAs, Evolução semanal, Evolução diária e Dados, com filtro e cabeçalho fixo). **↓ CSV** baixa só os atendimentos filtrados. O telefone do cliente não vai na exportação.
- **Comparação:** os indicadores mostram a variação (▲/▼, em pontos percentuais) contra o período anterior, o mesmo da Visão geral, já com os filtros aplicados. Com uma semana escolhida, compara com a semana anterior.
- **Filtros no link:** a barra de endereço guarda os filtros (`#bi?ia=IA SPC&wd=0&band=1`). **🔗 Link** copia o endereço; o período continua vindo do seletor do topo. Ao rolar a página, uma barra fixa mostra o resumo dos filtros, com **Ajustar** e **Limpar**.
- Os números usam as mesmas regras da Visão geral (`byIA` em `desempenho.js`). Arquivos: `bi.js` (aba) e `xlsx.js` (gerador de planilha, sem bibliotecas externas).
- As cores de desfecho da aba BI (verde, vermelho, azul, âmbar) foram escolhidas para serem distinguíveis por quem tem daltonismo; o restante do site mantém as cores atuais.

## Alertas, motivos de transferência e painéis recolhíveis

Arquivo `insights.js`. Tudo é calculado no navegador; nada é enviado por e-mail.

- **Alertas** (ícone de sino na barra de navegação, visível em todas as abas; no celular fica ao lado do nome, no topo; o número vermelho é a quantidade de alertas e o ponto verde indica que não há nenhum; clique para abrir a lista): (1) IAs fora da meta no período, com os indicadores que falharam; (2) dias fora do padrão: resolvidos caindo, transferências subindo ou volume muito baixo, comparando cada dia com os 14 dias anteriores da mesma IA (exige 8 atendimentos no dia e 40 na base, e uma diferença de pelo menos 10 pp, acima de 2 desvios). O dia de hoje não entra. **Ver no BI →** abre o BI já filtrado.
- **Painéis recolhíveis**: clique no título (ou Enter) para recolher/abrir os painéis da Visão geral, da aba Protocolos e do BI. O estado fica salvo no navegador; "Semana a semana" começa recolhido. Na impressão tudo aparece aberto.
- **Cores de desfecho unificadas**: verde (resolvidos), azul (transferidos), vermelho (não resolvidos) e âmbar (inatividade) em todo o site, no claro e no escuro. As variáveis estão em `styles.css` e `ui.css`.
- Os 14 dias de base dos alertas e a comparação do BI usam o período anterior que a Visão geral já carrega (`monPrev`, em `extras.js`).

## Regras de desfecho (atualização)
- **Possível solução sem resposta = Resolvido.** Se o cliente recebeu a “Pesquisa encaminhada – Possível solução” e não respondeu (o protocolo fechou em “Inatividade – Finalizado”), o desfecho é **Resolvido**, não Inatividade. Transferido e Não resolvido continuam como estão. Se o próprio cliente voltar em até 24h, vale o desfecho do novo atendimento.
- **Aguardando confirmação** (possível solução ainda dentro das 24h) vira Resolvido depois de 24h sem retorno.
- **Finaliza SafeNota** voltou a ser um desfecho próprio (ver a seção “Finaliza SafeNota” abaixo).
- **Outros** (aba BI e Padrões) = **Finalizado (não retornou)** — “Não retomou atendimento” — mais os protocolos ainda em “Aguardando confirmação” dentro das 24h.

## Canais de entrada (WhatsApp, Webchat)
- O canal vem da coluna **“Tipo de Entrada”** do R72. O servidor passou a guardar essa coluna junto das demais; períodos já salvos no Supabase antes dessa mudança são coletados de novo no Orpen na primeira vez que forem abertos (uma vez só).
- **BI:** filtro “Canal” (chips), painel “Por onde o cliente chega” (quantidade e % de cada canal, com a composição de desfechos), planilha “Comparativo canais” e coluna “Canal” na aba “Dados” do Excel/CSV. O link do BI guarda o canal (`ch=`).
- **Protocolos:** filtro por canal, e cada protocolo mostra o canal e o telefone parcialmente oculto.
- O canal vem **somente** da coluna “Tipo de Entrada” (Webchat ou WhatsApp); não há estimativa pelo telefone, porque no Webchat o cliente também informa telefone. Se a coluna não chegar ou trouxer outro valor, o painel avisa o que veio e os protocolos ficam “Não informado”. O servidor lê o cabeçalho exato e, em linha com colunas deslocadas, procura a célula “Webchat”/“WhatsApp” na própria linha. Os períodos são coletados de novo uma vez (marca `Ent` no snapshot).
- Nomes reconhecidos: WhatsApp, Webchat, Telegram, Instagram, Facebook, E-mail. Qualquer outro valor aparece com o nome original, e o BI lista os valores lidos (nota no fim do painel). Protocolos sem a coluna ficam em “Não informado”.

## Aba Protocolos unificada
- A antiga aba **Qualidade** foi incorporada à aba **Protocolos** (`#quality` abre `#protocols`). Ordem: atalhos (“Ir para”), indicadores (protocolos e recontatos), lista de protocolos, recontatos em 24h + funil, clientes que mais voltam e bot points.
- Lista: filtro rápido por desfecho com contagem, filtro por canal, busca, IA e ordenação; no computador cada protocolo ocupa uma linha (dados do protocolo, pesquisa e botão copiar).
- O card “Por que os atendimentos são transferidos” foi removido.

## Faixa azul de navegação
- Conta com inicial (“Acessos” para administrador, “Minha senha” para os demais), abas em pílulas com indicador que desliza e sino de alertas.
- “Pesquisas” agora tem o ícone de carinha e a sigla CSAT. A própria senha se troca só em “Trocar minha senha” (a linha “você” na lista de acessos não tem mais “Nova senha”).

## Relatório Excel do BI (botão “Excel”)
Arquivos: `xlsx.js` (gerador: estilos, fórmulas, gráficos nativos, filtros, validação de dados) e `bi-xlsx.js` (monta as abas extras). Se `bi-xlsx.js` falhar, o Excel sai no formato simples anterior.
- **Painel** (1ª aba): quatro caixas amarelas de filtro (IA, canal, dia da semana, faixa horária); indicadores, desfechos (rosca) e quadros por IA, canal, dia e faixa horária com gráficos. Tudo é fórmula sobre a aba Dados e se recalcula ao trocar a caixa. Cada quadro ignora o filtro da própria dimensão para permitir comparar.
- **Gráficos:** desfechos por período, taxas, nota média e avaliações.
- **Canais no tempo**, **Canal × IA** (quantidade e % por IA), **Dia × hora** (mapa de calor + volume por hora).
- Abas já existentes: Resumo, Comparativos (IAs e canais), Evolução semanal/diária, Dados (com filtro automático e coluna Canal).
- A base é o recorte do BI no momento do download (filtros, período, semana).

## Aba BI — layout
- Cabeçalho com período e ações (Excel, CSV, Link); filtros num painel próprio (no celular ficam recolhidos atrás do botão “Filtros”, com contador e resumo dos filtros ativos).
- Seis indicadores em uma faixa (Atendimentos, Resolvidos, Transferidos, Não resolvidos, Inatividade, Nota média, com variação e metas); “Metas atingidas” fica na linha de status.
- “Desempenho por IA” junta a composição dos desfechos e a nota da pesquisa; canais e gráficos de evolução ficam lado a lado no computador.

## Finaliza SafeNota (bot point de desfecho)
- “Finaliza SafeNota” voltou como desfecho próprio: aparece na Visão geral (linha “Finaliza SafeNota”, quando há protocolos), na aba BI (cartão, linha do gráfico, coluna nas tabelas e barras), na aba Protocolos (filtro, lista e selo) e na lista dos bot points do R72.
- Regra: protocolos cujo último bot point de desfecho é “Finaliza SafeNota” (a trilha decide quando o desfecho ficou como “outro”). Conta como “com desfecho”; o “Outros (não retornou)” desconta esse grupo.
- Excel e CSV do BI: coluna/linha “Finaliza SafeNota” em Resumo, comparativos, evoluções, Painel (cartão, tabela de desfechos, quadros por IA/canal/dia/faixa) e gráficos. A coluna só entra quando há protocolos nesse desfecho; sem eles, a planilha fica como antes.

## Movimento e cenas (cenas.js + cenas.css, junto do efeitos.css)
- Cena “Jornada do atendimento” (Visão geral e BI): canais de entrada → IA → desfechos, com partículas em movimento proporcionais ao volume; no BI acompanha os filtros.
- Gráficos do BI: linhas se desenham, colunas sobem e barras empilhadas se revelam; números dos cartões contam até o valor.
- Painéis entram em sequência, cartões sobem ao passar o mouse, fio de luz no topo; tela de login com aurora e fluxo de conversas.
- Tudo respeita “reduzir movimento” do sistema (cena fica estática, sem partículas) e não aparece na impressão.
- Extras: passar o mouse (ou tocar/focar com Tab) num desfecho da cena destaca só o caminho dele; sparklines dos cartões se revelam; estrelas da pesquisa acendem uma a uma; o sino balança e o contador pulsa enquanto houver alertas; painéis abaixo da dobra aparecem ao rolar.

## Visão geral redesenhada (visao.css + visao.js)
- Indicadores do topo: brilho na cor de cada um, ícone em relevo e anel de progresso (percentual; a nota vai de 0 a 5; some no celular).
- Desfechos da IA: rosca animada com o % de resolvidos no centro; passar o mouse na rosca destaca a linha do desfecho e vice-versa. Cada linha virou um cartão com barra em degradê com brilho.
- Desempenho por IA: ícone com status (verde = com atendimentos, cinza = sem), barra de composição resolvidos/transferidos/não resolvidos e números maiores.
- Atendimentos por hora e Economia da IA seguem o mesmo estilo. Tudo respeita “reduzir movimento”.

## FCR — resolução no 1º contato da IA (fcr.js)
- **Definição:** resolvidos pela IA **sem retorno do cliente em 24h** ÷ **casos avaliados**. Casos avaliados = resolvidos (voltaram ou não) + **inativos** e **não resolvidos** *sem transferência* que **voltaram** em 24h. Inativo/não resolvido que não voltou fica fora (não dá para saber se desistiu); **transferidos** ficam fora (quem tratou foi uma pessoa).
- Cliente = mesmo telefone (11 últimos dígitos) ou, sem telefone, o mesmo contato; “voltou” = outro protocolo iniciado até 24h depois do início do protocolo.
- **Fora do cálculo (informado na tela):** resolvidos sem telefone/contato e casos cuja janela de 24h não terminou dentro do período (ex.: últimas 24h). Se já voltou mas a janela está incompleta, também fica de fora, para não puxar o número para baixo.
- **Onde aparece:** cartão na Visão geral (com variação vs. período anterior) e selo “FCR xx%” em cada IA; cartão e coluna por IA no BI (acompanha os filtros); faixa na aba Protocolos com a divisão dos que voltaram (resolvidos / inativos / não resolvidos); Excel: tile no Painel (fórmula, reage aos filtros), linhas no Resumo, colunas no Comparativo IAs e coluna “Retorno em 24h” na aba Dados (e no CSV).
- A regra fica em `window.monFCR` (state/stats/byAgent) para reaproveitar em metas ou alertas.
