# Como votar?

Simulador político do Brasil: assuma um cargo, de vereador a ministro do STF, proponha leis, negocie votos e veja o impacto no país.

Simulador político e econômico, educativo e hipotético. O Brasil é dividido em dois blocos (por padrão, S + SE + CO e N + NE; no laboratório, qualquer divisão estado a estado) e o jogador assume um cargo — vereador, prefeito, deputado estadual, governador, deputado federal, senador, presidente ou ministro do STF — tomando apenas as decisões que a Constituição permite a esse cargo.

> Exercício hipotético. A Constituição Federal (art. 1º) define a federação como união indissolúvel.

## Rodar

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # testes do modelo (vitest)
npm run build
npm run update-ibge  # atualiza o snapshot embutido (UFs + malha do mapa) a partir da API do IBGE
```

Sem `.env.local`, o app roda em **modo local** (cenários e ranking só no navegador). Com Firebase, copie `.env.example` para `.env.local` e preencha.

## Firebase (projeto `comovotar`)

1. Console → **Authentication** → Sign-in method: ative **Anônimo** e **Google**. Em *Settings → Authorized domains*, inclua o domínio de hospedagem.
2. Console → **Firestore Database** → criar banco (sugestão: `southamerica-east1`, São Paulo).
3. `firebase deploy --only firestore:rules,firestore:indexes`
4. `npm run deploy` (build + hosting + regras).

Coleções:
- `users/{uid}/scenarios/{id}` — cenários do laboratório (só o dono lê/escreve).
- `leaderboard/{missionId}__{cargo}__{uid}` — ranking público, só iniciais; a regra valida a soma da pontuação e só aceita melhoria.
- `datasets/ibge-uf` e `datasets/ibge-municipios-{UF}` — cache público dos dados do IBGE (renovável após 30 dias).

## Automação (GitHub Actions)

- **CI** (`.github/workflows/ci.yml`): tipos, testes, build e teste de interface no celular (`npm run e2e`) a cada commit.
- **Deploy** (`deploy.yml`): publica no Firebase Hosting a cada commit na `main`. Regras e índices do Firestore continuam com `npm run deploy` (manual).
- **Robôs** (`robots.yml`, diário às 9h UTC): verificador do ranking (`npm run verify-ranking`), dados do Banco Central e, às segundas, do IBGE (`npm run refresh-data`).
- Segredo `FIREBASE_SERVICE_ACCOUNT`: chave da conta de serviço `github-robo@comovotar.iam.gserviceaccount.com` (Firestore, Hosting). Variáveis `VITE_FIREBASE_*`: configuração pública do app web.
- A API do IBGE costuma recusar conexões de fora do Brasil; se a etapa falhar, rode `npm run refresh-data -- ibge` localmente com `FIREBASE_SERVICE_ACCOUNT` definido.
- Ranking verificado: cada envio guarda o registro de ações (`proofs/`); o verificador repete a partida com o motor do jogo (`src/state/gameCore.ts`) e confirma (✓) ou remove a pontuação.

## Arquitetura

Todo o modelo é TypeScript puro em `src/model/`, testável e sem dependência de interface:

| Módulo | Função |
|---|---|
| `baseline.ts`, `ibge.ts`, `states.ts` | Dados por UF (IBGE: Censo 2022, Contas Regionais 2023, idosos 65+) e municípios |
| `partition.ts` | Divisão em blocos, divisões prontas, por população, sugestão de parâmetros |
| `simulation.ts` | Passo anual por bloco e por UF; componentes do crescimento |
| `politics.ts` | Eleições a cada 2 anos, aprovação, mídia, fundos, emendas, transparência, impostos |
| `institutions.ts` | Ministério técnico/político, tribunal, Congresso, segurança jurídica, bolsa |
| `climate.ts` | Secas, enchentes, queimadas, falta de energia e de água por UF |
| `legislature.ts`, `bills.ts`, `lawmaking.ts` | Cadeiras pelas regras constitucionais, partidos fictícios, catálogo de projetos e processo legislativo completo |
| `constitution.ts`, `roles.ts`, `quizzes.ts` | Base constitucional, competências de cada cargo, perguntas |
| `career.ts` | Motor do jogo: agenda por cargo, atores simulados, eleições, pontuação |
| `explain.ts` | Explicações geradas por regras |

A IA é opcional (`src/lib/gemini.ts`, chave do próprio jogador); o jogo funciona inteiramente sem ela.

## Limitações

Modelo de forma reduzida, coeficientes ilustrativos e atores simulados por regras simples. Partidos são fictícios. Ver a página **Dados** no app.
