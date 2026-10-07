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
- A Visão geral ganhou o painel **O que merece atenção**, que prioriza automaticamente não resolvidos, falhas de conhecimento, satisfação baixa, recontatos e protocolos aguardando confirmação.
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
