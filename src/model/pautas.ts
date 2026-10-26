// Pautas em debate: temas que costumam aparecer em campanhas e no Congresso,
// explicados de forma neutra, com argumentos dos dois lados e uma conta
// simples do impacto.

export interface Pauta {
  id: string
  title: string
  /** Situação atual, em linguagem simples */
  today: string
  /** O que a proposta muda */
  proposal: string
  /** Quem decide e como */
  howToChange: string
  /** Argumentos a favor, por grupo */
  pros: { who: string; text: string }[]
  /** Argumentos contra, por grupo */
  cons: { who: string; text: string }[]
  /** Efeitos na economia, com a incerteza explicitada */
  economy: string[]
  /** Experiências de outros países ou do passado */
  experiences: string[]
  /** Referências da base constitucional */
  refs: string[]
  /** Projeto de lei jogável relacionado */
  billId?: string
  /** Tema moral: o jogo apresenta os lados sem indicar resposta certa */
  moral?: boolean
  /** Título da seção de efeitos (padrão: impacto na economia) */
  effectsTitle?: string
}

export const PAUTAS: Pauta[] = [
  {
    id: 'escala-6x1',
    title: 'Fim da escala 6x1 e redução da jornada',
    today:
      'A Constituição limita a jornada a 8 horas por dia e 44 por semana (art. 7º, XIII) e garante um descanso semanal remunerado, de preferência aos domingos (art. 7º, XV). A escala 6x1 (seis dias de trabalho para um de folga) é permitida e comum no comércio, em serviços e em atividades que funcionam todos os dias.',
    proposal:
      'Propostas em discussão no Congresso reduzem o limite semanal (por exemplo, para 40 ou 36 horas) e garantem ao menos dois dias de folga por semana, sem redução de salário. Algumas preveem transição gradual.',
    howToChange:
      'Como o limite de 44 horas está na Constituição, reduzi-lo exige uma emenda constitucional (PEC): 3/5 dos votos em dois turnos na Câmara e no Senado, sem sanção presidencial. Detalhes de escalas podem ser regulados pela CLT e por acordos e convenções coletivas.',
    pros: [
      { who: 'Trabalhadores', text: 'Mais tempo de descanso, convívio familiar, estudo e cuidado com a saúde, sem perder salário.' },
      { who: 'Saúde pública', text: 'Jornadas longas estão associadas a estresse, acidentes e afastamentos, que também custam ao sistema de saúde e à previdência.' },
      { who: 'Economia', text: 'Trabalhadores descansados tendem a produzir mais por hora; parte das empresas pode contratar mais gente para cobrir os turnos.' },
      { who: 'Consumo', text: 'Com mais tempo livre, as pessoas consomem mais lazer, turismo e serviços.' },
    ],
    cons: [
      { who: 'Empresários', text: 'Pagar o mesmo salário por menos horas aumenta o custo de cada hora trabalhada: de 44 para 36 horas, cerca de 22% a mais por hora.' },
      { who: 'Pequenos negócios', text: 'Comércio, bares, restaurantes e serviços que abrem todos os dias precisariam contratar mais para manter o horário, com margens apertadas.' },
      { who: 'Empregos', text: 'Se o custo subir mais que a produtividade, empresas podem contratar menos, automatizar ou recorrer à informalidade, que no Brasil já é alta.' },
      { who: 'Consumidores', text: 'Parte do custo extra pode ser repassada aos preços.' },
    ],
    economy: [
      'O efeito líquido depende de quanto a produtividade por hora sobe: se subir na mesma proporção da redução de horas, o custo para as empresas não muda; se subir pouco, o custo aumenta.',
      'Setores com muita mão de obra e funcionamento contínuo (comércio, serviços, saúde, segurança) sentem mais; setores industriais automatizados, menos.',
      'Num país com grande parte dos trabalhadores fora da CLT (informais e por conta própria), a mudança alcança só os empregados formais, e um custo maior pode empurrar parte deles para a informalidade.',
      'Estudos e experiências internacionais chegam a conclusões diferentes; os resultados dependem de transição gradual, negociação coletiva e da situação da economia.',
    ],
    experiences: [
      'França: reduziu a jornada legal para 35 horas a partir de 2000; o debate sobre efeitos no emprego continua até hoje.',
      'Chile: aprovou em 2023 a redução gradual de 45 para 40 horas, até 2028.',
      'Brasil: a Constituição de 1988 reduziu a jornada de 48 para 44 horas semanais.',
    ],
    refs: ['art60'],
    billId: 'jornada-36h',
  },
  {
    id: 'isencao-ir',
    title: 'Isenção do Imposto de Renda até R$ 5 mil',
    today:
      'Desde janeiro de 2026 (Lei 15.270/2025), quem recebe até R$ 5.000 por mês não paga Imposto de Renda; entre R$ 5.000 e R$ 7.350 há um desconto que diminui aos poucos. Em compensação, rendas muito altas passaram a ter um imposto mínimo e dividendos acima de R$ 50 mil por mês têm retenção de 10% na fonte.',
    proposal:
      'O debate agora é sobre os próximos passos: corrigir a tabela todo ano pela inflação, ampliar a faixa isenta ou rever a tributação das altas rendas e dos dividendos.',
    howToChange:
      'Imposto de Renda é tributo federal: muda por lei ordinária aprovada pela Câmara e pelo Senado e sancionada pelo presidente. Pela Lei de Responsabilidade Fiscal (art. 14), toda renúncia precisa de estimativa de impacto e compensação.',
    pros: [
      { who: 'Trabalhadores', text: 'Mais dinheiro no bolso de quem ganha menos, que gasta quase tudo em consumo.' },
      { who: 'Justiça tributária', text: 'No Brasil, quem ganha muito paga proporcionalmente menos imposto sobre a renda total, porque dividendos eram isentos; o imposto mínimo reduz essa diferença.' },
      { who: 'Inflação', text: 'Sem correção da tabela, a inflação faz quem ganha pouco passar a pagar imposto sem ter ficado mais rico.' },
    ],
    cons: [
      { who: 'Contas públicas', text: 'Cada ampliação da faixa isenta custa dezenas de bilhões por ano; sem compensação, aumenta o déficit.' },
      { who: 'Empresas e investidores', text: 'A tributação de dividendos e o imposto mínimo podem reduzir investimentos ou levar à mudança de domicílio fiscal.' },
      { who: 'Desenho do imposto', text: 'Quanto mais gente isenta, menor a base do imposto e maior a dependência de poucos contribuintes.' },
    ],
    economy: [
      'O efeito no consumo é rápido, porque quem ganha menos gasta a maior parte da renda.',
      'O impacto nas contas depende de a compensação (imposto mínimo e dividendos) arrecadar o que foi previsto; isso só se verá com as declarações de 2027.',
      'Os estados e municípios recebem parte do Imposto de Renda pelos fundos de participação: uma isenção maior reduz também a receita deles, se não for compensada.',
    ],
    experiences: [
      'A tabela do IR ficou sem correção de 2015 a 2022, e a faixa isenta encolheu em termos reais.',
      'A maioria dos países da OCDE tributa dividendos na pessoa física; o Brasil os isentava desde 1996.',
    ],
    refs: ['art150', 'lrf14'],
    billId: 'isencao-ir',
  },
  {
    id: 'tarifa-zero',
    title: 'Tarifa zero no transporte público',
    today:
      'Cerca de 145 municípios brasileiros têm ônibus gratuito para todos, quase sempre cidades pequenas e médias; outras dezenas têm gratuidade em alguns dias ou para alguns grupos. Transporte é direito social na Constituição (art. 6º, desde 2015), e o transporte coletivo local é responsabilidade do município (art. 30, V).',
    proposal:
      'Ampliar a tarifa zero para mais cidades. Em outubro de 2026 o governo federal enviou ao Congresso uma PEC para gratuidade nos fins de semana em todo o país, estimada em R$ 8 a 12 bilhões por ano, paga com parte das emendas parlamentares impositivas.',
    howToChange:
      'Cada prefeitura pode adotar a tarifa zero por lei municipal, se tiver recursos. Uma regra nacional que muda a destinação de emendas exige emenda constitucional (PEC).',
    pros: [
      { who: 'Moradores da periferia', text: 'Quem mora longe e ganha pouco gasta parte grande da renda com passagens; a gratuidade amplia o acesso a emprego, escola e saúde.' },
      { who: 'Comércio local', text: 'Mais gente circulando e com dinheiro sobrando para consumir.' },
      { who: 'Cidade', text: 'Menos carros nas ruas, menos trânsito e menos poluição, se o serviço for bom.' },
    ],
    cons: [
      { who: 'Contas da prefeitura', text: 'Alguém paga o custo do sistema: sem a tarifa, a conta vai para o orçamento, que já é apertado.' },
      { who: 'Qualidade', text: 'Com mais passageiros e o mesmo dinheiro, ônibus podem ficar lotados e a frota envelhecer; algumas cidades já recuaram.' },
      { who: 'Emendas', text: 'Usar emendas parlamentares para pagar a gratuidade tira recursos de outras áreas e enfrenta resistência no Congresso.' },
    ],
    economy: [
      'O custo depende do tamanho do sistema: em cidades pequenas é parcela pequena do orçamento; em capitais, chega a bilhões por ano.',
      'Experiências mostram aumento grande no número de passageiros, o que exige ampliar a frota.',
      'O financiamento pode vir do orçamento geral, de taxas sobre empregadores (como o vale-transporte) ou sobre estacionamentos e combustíveis.',
    ],
    experiences: [
      'Maricá (RJ) e Caucaia (CE) estão entre as cidades com tarifa zero há vários anos.',
      'Tallinn (Estônia) e Luxemburgo adotaram transporte gratuito para moradores.',
    ],
    refs: ['art30'],
    billId: 'tarifa-zero',
  },
  {
    id: 'reforma-tributaria',
    title: 'Reforma tributária do consumo',
    today:
      'A Emenda Constitucional 132/2023 e a Lei Complementar 214/2025 trocam cinco tributos sobre o consumo (PIS, Cofins, IPI, ICMS e ISS) por um IVA dual: a CBS, federal, e o IBS, de estados e municípios, além de um Imposto Seletivo sobre produtos que fazem mal à saúde ou ao meio ambiente. Em 2026 a cobrança está em teste (CBS de 0,9% e IBS de 0,1%, compensáveis).',
    proposal:
      'A transição já está em lei: CBS cheia e fim do PIS e da Cofins em 2027; troca gradual de ICMS e ISS pelo IBS de 2029 a 2032; sistema novo completo em 2033. O debate atual é sobre exceções, alíquotas e o funcionamento do comitê gestor do IBS.',
    howToChange:
      'As regras básicas estão na Constituição (exigem PEC); alíquotas e detalhes estão em lei complementar (maioria absoluta nas duas casas). Estados e municípios participam pelo Comitê Gestor do IBS.',
    pros: [
      { who: 'Empresas', text: 'Fim da “guerra fiscal” e de 27 legislações de ICMS e milhares de ISS; menos custo para cumprir as regras e menos disputas na Justiça.' },
      { who: 'Economia', text: 'O imposto deixa de se acumular ao longo da cadeia, o que favorece investimento e exportação.' },
      { who: 'Consumidores', text: 'Cesta básica com alíquota zero e devolução de parte do imposto (cashback) para famílias de baixa renda.' },
    ],
    cons: [
      { who: 'Alíquota', text: 'Com muitas exceções e regimes favorecidos, a alíquota padrão estimada ficou entre as mais altas do mundo para um IVA, perto de 26% a 28%.' },
      { who: 'Serviços', text: 'Setores de serviços, que pagavam pouco ISS, podem ter aumento de carga.' },
      { who: 'Estados e municípios', text: 'Perdem autonomia para definir seus impostos e dependem do comitê gestor e de fundos de compensação.' },
    ],
    economy: [
      'Estudos estimam ganho de crescimento de longo prazo pela simplificação, mas o tamanho depende de quantas exceções sobreviverem.',
      'A transição longa (até 2033) reduz choques, mas obriga empresas a conviver com dois sistemas ao mesmo tempo.',
      'A cobrança no destino (onde o produto é consumido) muda a arrecadação entre estados: os mais consumidores ganham, os mais produtores perdem, com fundos de compensação no meio.',
    ],
    experiences: [
      'Mais de 170 países usam um IVA; o Brasil era um dos poucos com impostos sobre consumo divididos entre três níveis de governo.',
      'Canadá e Índia têm IVAs duais, com parte federal e parte estadual, como o modelo adotado.',
    ],
    refs: ['art60', 'art155'],
  },
  {
    id: 'privatizacoes',
    title: 'Privatizações de estatais',
    today:
      'A União controla dezenas de estatais, como Petrobras, Banco do Brasil, Caixa e Correios; estados controlam companhias de saneamento, energia e bancos. Desde os anos 1990 houve ondas de privatização; as mais recentes incluem a Eletrobras (2022) e a Sabesp, de São Paulo (2024). O futuro das estatais foi tema central da eleição de 2026, com propostas que vão de privatizar a maioria delas a fortalecê-las.',
    proposal:
      'De um lado, vender estatais para reduzir a dívida, atrair investimento e tirar o governo de setores que o mercado atende. De outro, manter e fortalecer estatais estratégicas para investimento público, soberania e serviços em regiões que não dão lucro.',
    howToChange:
      'A venda do controle de uma estatal federal precisa de autorização em lei (o STF decidiu em 2019 que subsidiárias podem ser vendidas sem lei específica). Estados decidem sobre as próprias companhias, por lei estadual.',
    pros: [
      { who: 'Contas públicas', text: 'A venda gera receita para abater dívida e reduz o risco de o Tesouro cobrir prejuízos.' },
      { who: 'Eficiência', text: 'Empresas privadas tendem a ter metas de lucro e menos indicações políticas; serviços podem melhorar com investimento.' },
      { who: 'Mercado', text: 'Concorrência e regras de agências reguladoras podem baixar preços no longo prazo.' },
    ],
    cons: [
      { who: 'Soberania', text: 'Setores como petróleo, energia e bancos públicos são vistos como estratégicos para o desenvolvimento e para enfrentar crises.' },
      { who: 'Regiões remotas', text: 'Empresas privadas podem deixar de atender lugares que não dão lucro, como cidades pequenas no interior.' },
      { who: 'Tarifas e empregos', text: 'Há casos de aumento de tarifas e demissões após privatizações; o resultado depende da qualidade da regulação.' },
    ],
    economy: [
      'O efeito para as contas é uma receita única; os dividendos que a estatal pagaria deixam de entrar todo ano.',
      'Estatais com prejuízo recorrente (como os Correios nos últimos anos) pesam no resultado das contas públicas; a solução pode ser reestruturação ou venda.',
      'Os resultados de privatizações passadas variam muito por setor: telecomunicações e siderurgia são citadas como sucessos; em outros, tarifas e qualidade são alvo de críticas.',
    ],
    experiences: [
      'A privatização das telecomunicações em 1998 ampliou o acesso a telefone e internet.',
      'Reino Unido privatizou água e trens nos anos 1980 e 1990; parte dos trens voltou ao controle público.',
    ],
    refs: ['art21'],
  },
  {
    id: 'armas',
    moral: true,
    effectsTitle: 'O que dizem os dados',
    title: 'Posse e porte de armas',
    today:
      'O Estatuto do Desarmamento (Lei 10.826/2003) permite a posse (ter arma em casa ou no trabalho) para quem tem 25 anos ou mais, comprova aptidão técnica e psicológica e não tem antecedentes criminais, com registro na Polícia Federal. O porte (andar armado) é proibido em regra, exceto para categorias como policiais e em casos excepcionais autorizados. Em 2005, num referendo, 63,9% dos eleitores rejeitaram proibir o comércio de armas. Decretos de 2019 ampliaram o acesso, principalmente para caçadores, atiradores e colecionadores; um decreto de 2023 voltou a restringir.',
    proposal: 'Há propostas nos dois sentidos: ampliar a posse e o porte para cidadãos comuns, ou restringir ainda mais o acesso e o número de armas por pessoa.',
    howToChange:
      'As regras gerais estão em lei federal (Congresso); os detalhes, em decretos do presidente, que mudam a cada governo. Estados e municípios não podem legislar sobre armas (competência da União, art. 22, XXI).',
    pros: [
      { who: 'Quem defende ampliar', text: 'Autodefesa é um direito, sobretudo onde a polícia demora a chegar, como no campo.' },
      { who: 'Quem defende ampliar', text: 'Criminosos já têm armas ilegais; restringir atinge só o cidadão que segue a lei.' },
      { who: 'Quem defende ampliar', text: 'O resultado do referendo de 2005 deveria ser respeitado.' },
    ],
    cons: [
      { who: 'Quem defende restringir', text: 'Mais armas em circulação tendem a aumentar homicídios, suicídios e acidentes, segundo boa parte dos estudos.' },
      { who: 'Quem defende restringir', text: 'Armas legais são furtadas ou desviadas e abastecem o crime.' },
      { who: 'Quem defende restringir', text: 'Brigas e violência doméstica ficam mais letais quando há arma em casa.' },
    ],
    economy: [
      'Muitos estudos brasileiros associam a queda de homicídios após 2003 ao Estatuto do Desarmamento; outros pesquisadores contestam e atribuem a queda a outros fatores.',
      'Os registros de armas de caçadores, atiradores e colecionadores cresceram fortemente depois de 2019.',
      'O Brasil tem uma das maiores taxas de mortes violentas do mundo, o que torna o debate ainda mais sensível.',
    ],
    experiences: [
      'Estados Unidos: acesso amplo a armas e taxa de homicídios por arma muito maior que a de outros países ricos.',
      'Austrália: recompra obrigatória de armas após um massacre em 1996.',
    ],
    refs: ['art22'],
  },
  {
    id: 'maioridade-penal',
    moral: true,
    effectsTitle: 'O que dizem os dados',
    title: 'Redução da maioridade penal',
    today:
      'A Constituição diz que menores de 18 anos são penalmente inimputáveis (art. 228): não vão para a prisão comum, mas respondem pelo Estatuto da Criança e do Adolescente (Lei 8.069/1990), com medidas socioeducativas que vão de advertência à internação por até 3 anos.',
    proposal:
      'Reduzir a idade para 16 anos, pelo menos para crimes graves como homicídio e estupro. Uma proposta nesse sentido foi aprovada na Câmara em 2015 (PEC 171/1993) e não avançou no Senado. Outra alternativa em debate é ampliar o tempo máximo de internação no ECA.',
    howToChange:
      'Exige emenda constitucional (3/5 em dois turnos na Câmara e no Senado). Há divergência sobre se o art. 228 é cláusula pétrea, por ser um direito individual; se for, nem uma emenda poderia mudá-lo, e o STF teria a palavra final.',
    pros: [
      { who: 'Quem defende reduzir', text: 'Jovens de 16 e 17 anos sabem o que fazem; a punição deveria ser proporcional ao crime.' },
      { who: 'Quem defende reduzir', text: 'Facções recrutam adolescentes justamente porque eles recebem penas menores.' },
      { who: 'Quem defende reduzir', text: 'Pesquisas de opinião mostram apoio majoritário à redução.' },
    ],
    cons: [
      { who: 'Quem é contra', text: 'Adolescentes cometem uma parcela pequena dos crimes graves; a medida teria pouco efeito na violência.' },
      { who: 'Quem é contra', text: 'O sistema prisional está superlotado e é dominado por facções, que recrutariam esses jovens.' },
      { who: 'Quem é contra', text: 'Melhor seria fazer cumprir o ECA, com escola, emprego e internação de qualidade.' },
    ],
    economy: [
      'A maioria dos adolescentes internados responde por roubo e tráfico, não por crimes contra a vida.',
      'Estudos internacionais não mostram efeito claro de idades penais menores sobre a criminalidade juvenil.',
      'Prender mais pessoas tem custo alto: cada vaga no sistema prisional custa dezenas de milhares de reais por ano.',
    ],
    experiences: [
      'Muitos países fixam a responsabilidade penal plena aos 18 anos, com regimes especiais para jovens a partir de 12 a 16.',
      'Estados Unidos: alguns estados julgam adolescentes como adultos em crimes graves; o tema é debatido por lá também.',
    ],
    refs: ['art60'],
  },
  {
    id: 'cotas',
    moral: true,
    effectsTitle: 'O que dizem os dados',
    title: 'Cotas em universidades e concursos',
    today:
      'A Lei de Cotas (Lei 12.711/2012, revista pela Lei 14.723/2023) reserva metade das vagas das universidades e institutos federais para alunos de escola pública, com parte para pessoas de baixa renda, pretas, pardas, indígenas, quilombolas e com deficiência. O STF considerou as cotas raciais constitucionais por unanimidade em 2012 (ADPF 186). Em concursos federais, há reserva de vagas para pessoas negras desde 2014, ampliada em 2025.',
    proposal:
      'Há quem proponha manter e ampliar as cotas, inclusive para pós-graduação e cargos de chefia, e quem proponha trocar critérios raciais por critérios só de renda ou encerrar as cotas.',
    howToChange:
      'Por lei federal (Congresso). A Lei de Cotas prevê avaliação periódica; universidades estaduais têm regras próprias.',
    pros: [
      { who: 'Quem defende as cotas', text: 'Corrigem desigualdades históricas: a renda e o acesso à universidade ainda variam muito por cor e origem escolar.' },
      { who: 'Quem defende as cotas', text: 'Estudos mostram desempenho de cotistas próximo ao dos demais e mais diversidade nas profissões.' },
      { who: 'Quem defende as cotas', text: 'A política é temporária e revista periodicamente.' },
    ],
    cons: [
      { who: 'Quem critica', text: 'O mérito deveria ser o único critério de acesso; a seleção por cor pode ser vista como injusta.' },
      { who: 'Quem critica', text: 'Critérios só de renda alcançariam os mais pobres de qualquer cor e evitariam disputas sobre autodeclaração.' },
      { who: 'Quem critica', text: 'O problema começa antes: seria melhor investir na educação básica pública.' },
    ],
    economy: [
      'A presença de estudantes pretos, pardos e de escola pública nas universidades federais cresceu muito depois de 2012.',
      'Comissões de heteroidentificação foram criadas para checar autodeclarações e evitar fraudes, o que também gera controvérsia.',
    ],
    experiences: [
      'Estados Unidos: a Suprema Corte proibiu critérios raciais em admissões universitárias em 2023.',
      'Índia: tem um dos sistemas de cotas mais antigos do mundo, por casta e grupo social.',
    ],
    refs: ['art22'],
  },
  {
    id: 'aborto',
    moral: true,
    effectsTitle: 'O que dizem os dados',
    title: 'Aborto',
    today:
      'O Código Penal (arts. 124 a 128) trata o aborto como crime, com duas exceções: quando não há outro meio de salvar a vida da gestante e quando a gravidez resulta de estupro. Em 2012, o STF incluiu a gravidez de feto anencéfalo (ADPF 54). Uma ação no STF pede a descriminalização até a 12ª semana (ADPF 442); o julgamento começou em 2023 e foi suspenso.',
    proposal:
      'De um lado, propostas para descriminalizar ou legalizar o aborto nas primeiras semanas. De outro, propostas para proteger a vida desde a concepção, endurecer penas ou limitar até os casos hoje permitidos.',
    howToChange:
      'Pelo Congresso, alterando o Código Penal (lei federal) ou a Constituição; ou pelo STF, se ele interpretar a Constituição de forma diferente, o que muitos parlamentares criticam como interferência no Legislativo.',
    pros: [
      { who: 'Quem defende descriminalizar', text: 'A criminalização não impede abortos, mas leva mulheres pobres a procedimentos inseguros, com mortes e sequelas.' },
      { who: 'Quem defende descriminalizar', text: 'A decisão sobre o próprio corpo e a saúde reprodutiva é um direito da mulher.' },
      { who: 'Quem defende descriminalizar', text: 'Muitos países democráticos permitem o aborto nas primeiras semanas.' },
    ],
    cons: [
      { who: 'Quem é contra', text: 'A vida começa na concepção e deve ser protegida desde então; o feto também tem direitos.' },
      { who: 'Quem é contra', text: 'A maioria da população brasileira é contra a legalização, segundo pesquisas de opinião.' },
      { who: 'Quem é contra', text: 'Mudanças desse porte cabem ao Congresso, eleito pelo povo, e não ao STF.' },
    ],
    economy: [
      'Os números exatos de abortos clandestinos são incertos por serem ilegais; pesquisas estimam centenas de milhares por ano.',
      'Complicações de abortos inseguros estão entre as causas de internação e de morte materna no SUS.',
      'Pesquisas de opinião mostram maioria contrária à legalização, com variação por idade, religião e escolaridade.',
    ],
    experiences: [
      'Argentina (2020), México (por decisão da Suprema Corte, 2023) e Colômbia (2022) ampliaram o acesso ao aborto legal.',
      'Estados Unidos: em 2022 a Suprema Corte devolveu o tema aos estados, e vários restringiram o acesso.',
    ],
    refs: ['art22'],
  },
]

export function findPauta(id: string): Pauta | undefined {
  return PAUTAS.find((p) => p.id === id)
}

export interface WorkweekInput {
  /** Jornada atual, horas por semana */
  current: number
  /** Nova jornada, horas por semana */
  proposed: number
  /** Ganho de produtividade por hora esperado com mais descanso, % */
  productivityGain: number
  /** Peso da mão de obra no custo total da empresa, % */
  laborShare: number
}

export const DEFAULT_WORKWEEK: WorkweekInput = { current: 44, proposed: 36, productivityGain: 5, laborShare: 30 }

export interface WorkweekResult {
  /** Aumento do custo de cada hora trabalhada, % */
  hourlyCost: number
  /** Aumento do custo por unidade produzida, descontado o ganho de produtividade, % */
  unitLaborCost: number
  /** Aumento do custo total da empresa, % */
  totalCost: number
  /** Contratações extras para manter as mesmas horas de funcionamento, % do quadro */
  extraHires: number
}

/** Conta simples: mesmo salário, menos horas. */
export function workweekImpact(x: WorkweekInput): WorkweekResult {
  const hourly = (x.current / x.proposed - 1) * 100
  const output = (x.proposed / x.current) * (1 + x.productivityGain / 100)
  const unit = (1 / output - 1) * 100
  return {
    hourlyCost: hourly,
    unitLaborCost: unit,
    totalCost: (unit * x.laborShare) / 100,
    extraHires: Math.max(0, (x.current / x.proposed - 1) * 100),
  }
}
