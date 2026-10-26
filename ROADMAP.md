# Roadmap — Simulador Político do Brasil

## Visão

Um jogo, jogado principalmente no celular, que mostra a leigos **como a política brasileira funciona de verdade**: o que cada cargo pode e não pode fazer, quanto custa, de onde vem e para onde vai o dinheiro, e por que **nem tudo é o que parece**. Mesmo eleito e com boas intenções, o jogador esbarra em orçamento engessado, Congresso, tribunais, mídia, corporações, crises externas e no cálculo político dos adversários. O objetivo do jogo é tentar construir um país melhor, pior ou ao menos diferente, entendendo os limites reais.

## Princípios (valem para tudo)

1. **Realismo com fonte:** todo número vem com fonte oficial e data. O que é hipótese aparece marcado como "a calibrar".
2. **Neutralidade:** argumentos dos dois lados em todo tema controverso; mesmo critério para todos os campos; partidos fictícios ou paródia leve.
3. **Ludicidade:** decisões curtas, consequências visíveis, objetivos, conquistas e ranking. Explicações aparecem quando o jogador precisa, não como aula.
4. **Celular primeiro:** cada tela é desenhada para 360–430 px de largura, com toque e uma decisão por vez.
5. **Explicar o "porquê":** todo resultado tem um "por que isso aconteceu?" com as causas.
6. **Funciona sem IA:** a IA é opcional, só como assistente.

---

## Já entregue (out/2026)

- **Modelo econômico:** 2 macrorregiões, 27 UFs e municípios (IBGE: Censo 2022, Contas Regionais 2023, PIB municipal).
- **Separação opcional:** Brasil unido por padrão; separação como cenário inicial ou como caminho durante o jogo (movimento separatista).
- **8 cargos jogáveis:** vereador, prefeito, deputado estadual, governador, deputado federal, senador, presidente e ministro do STF, com competências, limites e mandatos (inclusive o limite de 8 anos seguidos no Executivo).
- **Processo legislativo completo:** CCJ, relator e jabutis, pauta, quóruns, casa revisora, sanção e veto, derrubada de veto, ADI no STF (liminar ou plenário).
- **Partidos:** fictícios (7 posições no espectro) ou paródia do Congresso eleito em 2026 (cadeiras reais).
- **Voto estratégico:** separa mérito de cálculo político; orientação partidária; fidelidade.
- **Política e instituições:** eleições a cada 2 anos, aprovação, mídia, fundos, emendas, transparência, ministério técnico ou político, indicações ao STF, segurança jurídica, bolsa.
- **Clima por UF:** secas, enchentes, queimadas, falta de energia e de água; prevenção e resposta.
- **Tela principal no estilo Democracy:** mapa central, teia de indicadores, cartas de evento e turnos.
- **Conteúdo educativo:** Instituições (três poderes, teoria e prática, glossário), Economia (orçamento 2026, promessas, custo da política, previdência, dívida, inflação, FGTS, escala 6x1), "Pode ou não pode?".
- **Infraestrutura:** Firebase (hosting, auth, Firestore, cache do IBGE), ranking por iniciais, 70+ testes.

---

## Feito em outubro de 2026 — cara de jogo

- [x] Tela de título no estilo menu de jogo (logo, emblema, cartões de menu, botão Jogar), sem barra de abas; demais telas com “← Menu”.
- [x] Jogo com 4 abas (País, Agenda com notícias, Leis, Você); laboratório e páginas educativas agrupados em seções.
- [x] Separação recalibrada: canal de **autonomia de política** que depende da qualidade do governo; separação amigável bem gerida pode superar o Brasil unido, conflituosa continua custosa. Missões recalibradas.

## Fase 1 — Dinheiro público de verdade *(em andamento)*

**Objetivo:** o jogador entende para onde vai o orçamento e por que promessas esbarram nele.

- [x] **Quanto custa a política:** subsídios, verbas de gabinete, assessores, cotas e moradia de cada cargo; custo total da Câmara, do Senado e das Assembleias; comparação com os grandes gastos (ordem de grandeza).
- [x] **Orçamento federal 2026:** obrigatórias × discricionárias (92% × 8%), por ministério (38 pastas), pisos de saúde e educação. Vinculação constitucional não é cláusula pétrea.
- [x] **Promessas de campanha, possível ou impossível?** Calculadora: Bolsa Família de R$ X, salário mínimo de R$ Y, contratar professores, dobrar a saúde… Mostra custo, % do orçamento livre, % da receita e como pagar (cortes, impostos, dívida, inflação).
- [x] **Previdência e salário mínimo:** déficit do RGPS, 69% dos benefícios iguais a 1 mínimo, custo de R$ 1 no mínimo, envelhecimento (IBGE) e projeção de 30 anos com cenários.
- [x] **Dívida e juros:** dívida interna × externa, Selic, quem empresta ao governo, dinâmica da dívida ("quanto de superávit estabiliza?").
- [x] **Orçamento anual no jogo (LOA):** o presidente, governador ou prefeito escolhe entre austero, equilibrado, investimento ou social (com prós e contras); o Legislativo cobra emendas ou atrasa a votação conforme o apoio; economia fraca obriga a contingenciar (LRF, art. 9º); investimento rende nos anos seguintes.
- [x] **Emendas parlamentares no jogo:** deputados, senadores e vereadores decidem o destino das emendas individuais (saúde, obra no reduto, emenda Pix, troca com o governo), com valor de 2026 e efeito proporcional ao tamanho da economia local.
- [x] **Promessas no jogo:** na campanha (e no início do jogo) o jogador escolhe uma promessa, viável, difícil ou impossível (Bolsa Família de R$ 10.000, mínimo de R$ 5.000, vereador que promete hospital…). Rende votos na eleição; no fim do mandato o eleitor cobra, com base nas escolhas de orçamento, emendas e leis.
- [x] **Mais pautas econômicas:** isenção do IR até R$ 5 mil (Lei 15.270/2025), tarifa zero (PEC de 2026), reforma tributária do consumo (EC 132/2023, LC 214/2025) e privatizações, com seletor de pautas.
- [x] **Pautas morais:** posse e porte de armas, maioridade penal, cotas e aborto, com a lei vigente, como mudar, argumentos dos dois lados, dados e experiências, e aviso de que o jogo não indica resposta certa nem pontua opinião.

## Fase 1.5 — Leis e temas criados pelo jogador, com IA opcional

**Objetivo:** o jogador testa qualquer ideia, por exemplo "comprar uma antena de internet via satélite para cada escola cívico-militar de Santa Catarina" como deputado estadual, e o jogo se adapta a ela.

- [x] **Chave de IA do próprio jogador**: Gemini, OpenAI, Anthropic, DeepSeek e qualquer API compatível com a da OpenAI (OpenRouter, Groq, Ollama…). A chave fica só no navegador (nunca vai para o servidor nem para o Firebase); o jogo continua funcionando sem IA.
- [x] **Redação livre de propostas:** o jogador escreve a ideia em linguagem comum.
- [x] **A IA estrutura a proposta para o motor do jogo:** competência (União, estado ou município) e vícios possíveis; tipo de norma e quem pode propor; custo anual estimado e fonte de recursos; prós e contras; efeitos esperados; reação provável de cada campo político e por quê; risco de jabuti e de questionamento no tribunal.
- [x] **Validação pelo jogo:** os números são limitados a faixas plausíveis e as referências precisam existir na base constitucional. O jogador revisa e edita antes de protocolar.
- [x] **Tramitação normal:** comissões, votação partido a partido com voto estratégico, casa revisora, sanção ou veto, ADI. Os efeitos entram na simulação.
- [x] **Conversar sobre a proposta:** perguntar à IA por que um partido resiste, como negociar, o que mudar no texto para ganhar votos ou evitar inconstitucionalidade.
- [x] **Modo sem IA:** formulário guiado (área, custo, beneficiados, orientação, prós e contras) que gera a mesma estrutura.
- [ ] **Temas e cenários criados pelo jogador:** crises e pautas personalizadas; compartilhar com amigos ou turmas (com moderação).

## Fase 2 — "Nem tudo é o que parece" (dificuldades reais de governar)

**Objetivo:** mostrar que querer não basta.

- [x] **Patrimônio, propinas e investigação:** patrimônio inicial na faixa real declarada pelos eleitos ao TSE (2024/2026, só estatísticas por cargo, `npm run update-tse`); cresce com o salário poupado e rendimentos. Propostas ilícitas por cargo (licitação dirigida, rachadinha, venda de voto, superfaturamento de emenda, palestra paga por parte interessada): aceitar, recusar ou denunciar. A exposição pode virar reportagem, inquérito, denúncia e julgamento (defesa com advogado, delação ou nada); condenação tira o mandato, cobra o dinheiro e torna inelegível por 8 anos (Ficha Limpa). O patrimônio paga a campanha: autofinanciamento (até 10% do teto de 2026) ou caixa dois.

- [x] **Obstrução:** o parlamentar pode usar o "kit obstrução" (vista, requerimentos, falta de quórum), negociar o texto ou votar e perder.
- [x] **Pautas-bomba:** com o governo fraco, o Legislativo aprova gasto sem fonte (vetar, sancionar ou questionar no tribunal). O Centrão aparece no impeachment. Preço dos votos negociados sobe 50% com aprovação abaixo de 40% e dobra abaixo de 30%.
- [x] **CPIs:** parlamentares decidem se assinam (1/3 da casa) ou ajudam o governo a barrar; governantes reagem a CPIs contra a sua gestão (barrar, colaborar ou contra-atacar), que podem revelar esquemas.
- [x] **Controle (primeira parte):** TCU e TCEs podem suspender obras do orçamento de investimento, atrasando o retorno. Falta: licitações demoram, a Lei de Responsabilidade Fiscal limita gastos com pessoal e há risco de crime de responsabilidade e impeachment.
- [x] **Judicialização:** a oposição leva medidas do governo ao tribunal; liminar de um relator pode suspender por tempo indeterminado (defender, negociar ou atacar o tribunal). Projetos de lei já passam por controle de constitucionalidade.
- [x] **Grupos de interesse (primeira versão):** greves de servidores, agro, indústria, centrais sindicais, ambientalistas, lideranças religiosas e bancos trazem demandas com prós e contras. Ideias originais: servidores, agro, indústria, bancos, sindicatos, igrejas e movimentos sociais têm pautas, greves, lobby e financiamento de campanha.
- [x] **Notícias falsas:** vídeo manipulado sobre o jogador (desmentir, ir à Justiça, ignorar ou contra-atacar com boatos). Ideias originais: narrativas, *fake news*, checagem, crises de imagem; a mídia amplia ou abafa conforme o tema.
- [x] **Federalismo (primeira versão):** repasses voluntários atrasados (marcha a Brasília, alinhar-se, aumentar impostos locais) e guerra fiscal do ICMS (isenção sem CONFAZ, que o STF costuma derrubar). Ideias originais: prefeitos e governadores dependem de transferências e emendas; conflito de competências; guerra fiscal.
- [x] **Execução lenta:** leis de educação, saneamento, transporte, urbanismo, meio ambiente, clima e segurança só têm efeito um ano depois (regulamentação, licitação e obras), com aviso no registro.
- [x] **Escândalos e investigações:** reportagem, inquérito, denúncia, julgamento, delação e Ficha Limpa (ver patrimônio).
- [x] **Impeachment:** jogável dos dois lados: o governante impopular escolhe ceder cargos ao Centrão, mobilizar apoiadores, confiar na defesa ou renunciar; deputados e senadores votam o afastamento do presidente. Regras de presidente (Lei 1.079/1950), governador e prefeito (DL 201/1967).

## Fase 3 — O mundo lá fora (crises externas e geopolítica)

**Objetivo:** o governo também depende do que acontece fora do país.

- [x] **Sistema de crises globais** (primeira versão: guerra com alta do petróleo, pandemia seguida de retomada, crise financeira, tarifas sobre exportações, desaceleração da China e acordo Mercosul–UE; o presidente escolhe a resposta). Ideias para ampliar:
  - guerras (petróleo, fertilizantes, trigo; refugiados);
  - pandemias (saúde, auxílio emergencial, dívida);
  - crises financeiras (fuga de capitais, câmbio, juros);
  - guerras comerciais e tarifas sobre exportações brasileiras;
  - desaceleração da China (minério e soja);
  - boom ou queda de commodities;
  - crise climática global e crises migratórias na fronteira;
  - eleições e mudanças de governo em grandes parceiros.
- [x] **Câmbio, inflação e juros no modelo (didático):** dólar reage a risco fiscal, crises globais e diferença de inflação; inflação ancorada na meta, com repasse do câmbio; Selic reage à inflação; inflação acima do teto custa aprovação. Falta a balança comercial. Ideia original: o dólar afeta inflação, dívida externa, exportadores e importadores.
- [x] **Política externa (primeira versão):** votação na ONU sobre invasão (condenar, abster-se, mediar), refugiados na fronteira, OCDE × BRICS, Fundo Amazônia e comércio em moedas locais. Ideias originais: neutralidade × alinhamentos (EUA, China, UE, BRICS, OCDE), acordos (Mercosul–UE), ajuda humanitária, sanções. Cada escolha tem ganhos e custos.
- [x] **Forças Armadas e soberania:** pedido de GLO, garimpo ilegal em terra indígena, missão de paz da ONU; quadro "podem e não podem" na página de instituições (art. 142, decisão do STF de 2024).

## Fase 4 — Jogo (objetivos, conquistas, ranking)

**Objetivo:** dar vontade de jogar de novo.

- [x] **Objetivos por cargo:** principal, dois secundários e um oculto para cada cargo (leis, território, pobreza, inflação, reeleição, voto pelo mérito, ficha limpa, impeachment, liminares), na aba Você e no fim da partida. Ideias originais: Exemplos: aprovar uma reforma, reduzir a pobreza, reeleger-se sem escândalos, sobreviver a uma crise externa.
- [x] **Conquistas (medalhas):** 16 conquistas (algumas secretas), com aviso ao desbloquear e quadro na aba Você. Ideias originais: por exemplo, "Derrubou um veto", "Aprovou lei da oposição", "Governou 8 anos", "Votou pelo mérito contra o próprio partido", "Evitou uma CPI", "Atravessou uma guerra sem recessão", "Previdência sustentável".
- [x] **Indicadores sociais (primeira versão):** desemprego (lei de Okun), pobreza, extrema pobreza e Gini, a partir dos dados do IBGE de 2023, reagindo ao crescimento e às escolhas sociais (orçamento, auxílio em crises); entram no painel, nas manchetes do legado e na conquista "País mais justo". Agora também mortalidade infantil (IBGE), Ideb do ensino médio (Inep), mortes violentas (Anuário de Segurança Pública) e desmatamento na Amazônia (Prodes/Inpe), ligados às escolhas de orçamento, emendas, crises, leis de segurança e pressões ambientais.
- [ ] **Ranking ampliado:** por cargo, cenário, semana e temporada; ranking de "país mais justo" × "país mais rico" × "mais sustentável".
- [x] **Desafios diário e semanal** com a mesma semente para todos (o diário no Brasil unido); partidas de dias ou semanas anteriores continuam funcionando. Falta: modo "história" com eventos reais de 1988 a 2026.
- [x] **Fim de partida:** manchetes do legado (cargos, leis, território, promessas, patrimônio, condenações), medalhas e botão de compartilhar.
- [x] **Dificuldade:** fácil, realista e "Brasília raiz" (capital inicial, bônus eleitoral, frequência de crises e propostas ilícitas, apoio do Legislativo).

## Fase 5 — Celular e visual

**Objetivo:** a experiência principal acontece no celular.

- [x] **Interface de jogo no celular (primeira versão):** barra inferior com Mapa, País, Agenda, Notícias, Leis e Você; indicadores em lista; guia "Como jogar". Próximo passo:
  - barra inferior com Mapa, Agenda, Leis, País e Perfil;
  - decisões em cartas de deslizar (no estilo Reigns) com confirmação;
  - indicadores em carrossel;
  - [x] mapa com zoom por pinça, roda do mouse e botões, e arraste quando ampliado.
- [ ] **Identidade visual própria:** ilustrações de cargos e eventos, ícones, animações curtas (votações, sanção, veto), sons opcionais e vibração no celular.
- [x] **Votação visual:** semicírculo animado com cada cadeira acendendo com o voto, partidos da esquerda para a direita.
- [x] **Tutorial jogável:** dica curta na primeira vez que cada tipo de decisão aparece (guardada no navegador), além do guia "Como jogar".
- [x] **PWA:** instalável (ícone próprio) e jogável sem internet (service worker com cache por versão; Firebase, IBGE e IA nunca passam pelo cache). Falta: notificações opcionais do desafio da semana.
- [ ] **Acessibilidade:** leitor de tela, contraste, texto ampliado e modo "leitura fácil".

## Fase 6 — Dados vivos e realismo

- [x] **Banco Central ao vivo:** Selic, IPCA em 12 meses e dólar na página de economia, com cache no navegador e no Firestore (12 horas). Demais APIs oficiais com cache no Firestore:
  - Banco Central (SGS: Selic, IPCA, câmbio);
  - Tesouro (dívida, resultado primário);
  - TSE (eleições, bancadas);
  - Câmara e Senado (proposições reais, para pautas inspiradas em projetos de verdade);
  - Portal da Transparência.
- [ ] **Modelo endógeno de inflação, câmbio, desemprego e juros** (Banco Central reagindo), ligado ao orçamento e à dívida.
- [ ] **Calibração e validação:** comparar o modelo com 2003–2023 e revisão por economistas e cientistas políticos de diferentes linhas.
- [ ] **Base de conhecimento** constitucional e legal ampliada, com links para os textos oficiais.

## Fase 7 — Escola e comunidade

- [ ] **Modo professor:** turmas, cenários prontos, relatórios de aprendizagem, roteiros de aula (BNCC).
- [ ] **Multiplayer assíncrono:** cada jogador assume um cargo no mesmo país (presidente, líderes, STF) e negocia de verdade.
- [ ] **Debates:** dois jogadores defendem lados de uma pauta e a turma vota.
- [ ] **Editor de cenários e pautas** (com revisão), para criar crises e propostas.

## Fase 8 — Plataforma

- [ ] **Ranking à prova de trapaça:** recalcular a pontuação numa Cloud Function a partir das decisões.
- [ ] **Cache do IBGE** pré-carregado por conta de serviço (escrita só pelo servidor).
- [ ] **Assistente de IA no servidor** (Genkit e Gemini), com limites e fontes.
- [ ] **Métricas de aprendizagem** (anônimas), telemetria de erros, testes de interface no celular, CI e implantação automática.

---

## Ordem sugerida

1. Fase 1 (dinheiro público) e Fase 1.5 (leis criadas pelo jogador, com IA opcional).
2. Fase 5 (celular), em paralelo, porque é onde está o público.
3. Fase 4 (objetivos, conquistas, indicadores sociais).
4. Fase 2 (dificuldades de governar).
5. Fase 3 (crises externas).
6. Fases 6, 7 e 8, conforme a demanda.

## Riscos e cuidados

- **Neutralidade:** temas morais (aborto, armas, drogas) exigem texto revisado, os dois lados e foco na lei vigente. Nada de "resposta certa" no placar.
- **Precisão:** números mudam todo ano. Manter data e fonte em cada um e uma rotina de atualização (`npm run update-ibge` e afins).
- **Paródia:** evitar ofensas e nomes de pessoas; partidos reais nunca nos extremos.
- **Simplificação:** deixar claro o que é modelo didático e o que é dado real.
