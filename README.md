# Monitor IA · Safeweb

Versão web do Monitor IA, preparada para rodar em Vercel e consultar o Orpen sem depender do Chrome nem do computador do operador.

## Escopo

- Visão geral
- Pesquisas R74
- Protocolos / problemas não resolvidos
- Base para Qualidade
- R72/R74 sob consulta manual
- Sem Ao Vivo
- Sem o antigo Relatório da coordenação

## Segurança

As credenciais do Orpen ficam somente nas variáveis de ambiente da Vercel. Nunca coloque usuário ou senha em arquivos versionados.

Configure:
- ORPEN_BASE_URL
- ORPEN_AUTH_URL
- ORPEN_USERNAME
- ORPEN_PASSWORD
- opcionalmente ORPEN_REPORT_URL

## Autenticação Orpen

O acesso foi isolado em lib/orpen.js. O endpoint e o formato exatos da Autenticação Orpen API ainda precisam ser confirmados pela documentação oficial do serviço; o código aceita token/access_token e usa Bearer para o relatório.

## Desenvolvimento

```bash
npm install
npx vercel dev
```
