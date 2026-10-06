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
  histórico   hoje/ontem
  fechado     ou período novo
     │         │
     ▼         ▼
  Supabase    Orpen
                │
             R72 + R74
                │
                ▼
             Supabase
```

- **Não existe atualização automática do Monitor.** O Orpen só é consultado quando uma coleta é solicitada pela tela.
- Quando o Supabase está configurado, uma coleta feita no Orpen é salva como snapshot.
- **Períodos fechados** (até antes de ontem) podem ser lidos do snapshot exato já salvo, sem consultar o Orpen novamente.
- **Hoje, ontem e períodos sem snapshot** continuam sendo consultados diretamente no Orpen.
- Se o Supabase não estiver configurado, o Monitor continua funcionando diretamente com o Orpen.

## Supabase

1. Crie um projeto no Supabase. Para este projeto, a região **South America (São Paulo)** é a mais adequada.
2. No **SQL Editor**, execute `supabase/schema.sql`.
3. Em **Authentication → Sign In / Providers → Email**, mantenha o cadastro público desativado.
4. Crie o usuário autorizado em **Authentication → Users**. Atualmente o Monitor aceita apenas o e-mail configurado no servidor.
5. Em **Project Settings → API Keys**, obtenha:
   - uma **Secret key** para o backend;
   - uma **Publishable key** para validar e-mail/senha no login.

   O código também aceita as chaves legadas `service_role` e `anon` como fallback.

## Variáveis da Vercel

Configure em **Settings → Environment Variables**:

| Variável | Uso |
|---|---|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SECRET_KEY` | chave secreta usada somente no backend |
| `SUPABASE_PUBLISHABLE_KEY` | chave usada para validar o login por e-mail/senha |
| `SUPABASE_SERVICE_ROLE_KEY` | fallback para projetos que ainda usam a chave legada |
| `SUPABASE_ANON_KEY` | fallback para autenticação com a chave legada |
| `MONITOR_AUTH_SECRET` | segredo para assinar a sessão diária |
| `ORPEN_*` | variáveis atuais de conexão com o Orpen |

Depois de salvar as variáveis, faça um novo deploy.

## Login

Quando a chave do Supabase Auth estiver configurada, o Monitor valida a senha usando o usuário do Supabase e, depois, cria a sessão diária do Monitor.

A sessão é válida até o fim do dia. O navegador não acessa a chave secreta do Supabase.

Sem a configuração do Supabase Auth, o modo legado continua aceitando apenas o e-mail autorizado e não exige senha.

## Persistência dos relatórios

Cada coleta bem-sucedida salva dois snapshots em `report_snapshots`:

- R72
- R74

Também é registrado um evento em `sync_runs`.

O Monitor não consulta automaticamente o Orpen. A persistência no Supabase serve principalmente para manter histórico e evitar consultas repetidas para períodos fechados.

## Segurança

- A **Secret key/service_role** fica somente no servidor e nunca deve ser colocada no código do navegador.
- As tabelas criadas pelo schema têm RLS habilitado e acesso revogado para `anon` e `authenticated`; o backend usa a credencial administrativa.
- O `/api/reports` exige uma sessão válida do Monitor.
- O navegador nunca consulta diretamente o banco.

## Limpeza

Para remover snapshots e registros antigos, pode ser usado no SQL Editor:

```sql
select public.monitor_ia_cleanup(365);
```

Isso mantém aproximadamente um ano de histórico.
