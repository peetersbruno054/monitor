# Monitor IA · Safeweb

Versão web do Monitor IA na Vercel. Consulta o Orpen (R72 e R74), guarda os dados no Supabase e funciona no computador e no celular.

```
 GitHub Actions (a cada 30 min) ──► /api/sync ──┐
                                                ├─► Orpen (R72/R74) ──► Supabase (São Paulo)
 Tela: "Atualizar dados" ─────────► /api/reports┘                         │
                                        ▲                                  │
                                        └──────── lê os dias já guardados ◄┘
```

- **Dias fechados** (até anteontem) são lidos do banco, sem consultar o Orpen de novo.
- **Hoje e ontem** são atualizados no Orpen quando a última busca tem mais de 3 minutos, e a cada 30 minutos pelo agendamento.
- Se o Orpen cair, a tela mostra o que já está guardado, com um aviso.
- Sem as variáveis do Supabase, o site funciona como antes (direto no Orpen, login só com e-mail).

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) na região **South America (São Paulo)**.
2. **SQL Editor** → cole `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**: desligue **Allow new users to sign up**.
4. **Authentication → Users → Add user**: crie o login de cada pessoa (marque *Auto Confirm User*). Para trocar uma senha, use o mesmo menu.
5. Em **Project Settings → API**, copie a `Project URL`, a chave `anon` e a chave `service_role`.

## 2. Vercel → Settings → Environment Variables

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | Project URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` (secreta) |
| `SUPABASE_ANON_KEY` | chave `anon` (opcional, usada no login) |
| `MONITOR_AUTH_SECRET` | um texto longo e aleatório (assina o cookie de sessão) |
| `SYNC_SECRET` | outro texto longo e aleatório (protege a sincronização) |
| `ORPEN_*` | as mesmas de antes |

Faça um novo deploy depois de salvar. A partir daí o login pede **e-mail e senha** (as contas do passo 1.4).

## 3. GitHub → Settings → Secrets and variables → Actions

| Secret | Valor |
|---|---|
| `SITE_URL` | endereço do site, ex.: `https://monitor-ia.vercel.app` |
| `SYNC_SECRET` | o mesmo valor colocado na Vercel |

Teste em **Actions → Sincronizar Orpen → Run workflow**. Horários: a cada 30 min das 07:00 às 21:30 e às 00:10 (Brasília).

## Segurança

- O navegador nunca acessa o banco: as tabelas não têm acesso para `anon`/`authenticated`; só as funções da Vercel, com a `service_role`.
- Todas as rotas de dados exigem login (`/api/reports`, `/api/conversation`, `/api/check-config`).
- Login com até 8 tentativas a cada 10 minutos por e-mail e por IP.
- Recomendado: deixar este repositório **privado**.
- Para apagar dados antigos: `select public.monitor_ia_cleanup(365);` no SQL Editor (mantém 1 ano).

## Limites dos planos gratuitos (conferir antes)

- **Supabase Free**: 500 MB de banco; projetos sem atividade por 7 dias são pausados (o agendamento mantém ativo).
- **GitHub Actions**: grátis em repositório público; em privado, 2.000 min/mês (este agendamento usa cerca de 900).
- **Vercel Hobby**: só para uso pessoal/não comercial; para uso da empresa, plano Pro.

## Diagnóstico

- `/api/check-config` (logado): mostra quais variáveis estão configuradas, sem revelar valores.
- Tabela `sync_runs` no Supabase: cada sincronização, com sucesso ou erro.
