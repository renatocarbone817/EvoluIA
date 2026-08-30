/**
 * 50 Dicas e Frases Inspiradoras de Psicopedagogia, Neuroaprendizagem & Afetividade
 */

export const DAILY_TIPS: string[] = [
  "O vínculo afetivo é a chave que abre as portas do cérebro para a aprendizagem.",
  "Cada criança floresce no seu próprio tempo e no seu próprio ritmo.",
  "O olhar psicopedagógico enxerga além do sintoma: enxerga a pessoa.",
  "A escuta acolhedora transforma o medo de errar em vontade de tentar.",
  "Brincar é a linguagem natural onde o desenvolvimento cognitivo acontece.",
  "Pequenas intervenções diárias geram grandes evoluções para a vida toda.",
  "A confiança que você deposita na criança é o primeiro passo para a autoconfiança dela.",
  "Aprender é um ato de coragem; acolher é o solo fértil onde essa coragem brota.",
  "Celebrar as micro-conquistas fortalece a autoestima e a persistência.",
  "Antes de ensinar a mente, conecte-se com o coração do seu paciente.",
  "A neuroplasticidade nos ensina que nenhum diagnóstico é um ponto final, mas um ponto de partida.",
  "O cérebro aprende muito melhor quando há entusiasmo, curiosidade e significado.",
  "O erro não é o oposto do aprendizado, é parte fundamental do processo neurológico.",
  "Estimular a autonomia é construir pontes neurais para o futuro.",
  "A emoção é a cola da memória: o que emociona, permanece.",
  "Descubra o hiperfoco ou interesse da criança e você terá a atenção plena dela.",
  "A repetição com afeto e ludicidade constrói caminhos cognitivos duradouros.",
  "Não existe mente preguiçosa; existem caminhos de aprendizagem que ainda precisam ser descobertos.",
  "O movimento corporal organiza o cérebro para o raciocínio.",
  "A curiosidade é o combustível biológico da neuroaprendizagem.",
  "A mediação psicopedagógica transforma a dificuldade em oportunidade de descoberta.",
  "Adapte a estratégia à criança, nunca tente forçar a criança a caber na estratégia.",
  "Um bom relatório psicopedagógico traduz desafios em caminhos claros de superação.",
  "Respeite o tempo de maturação de cada habilidade cognitiva.",
  "Observar o não-dito em sessão revela mais do que qualquer teste padronizado.",
  "A consistência dos atendimentos é o que consolida os avanços cognitivos.",
  "Jogos e recursos lúdicos são ferramentas sérias de reabilitação cognitiva.",
  "A cada sessão, plante uma semente de autonomia e autovalorização.",
  "O consultório é um espaço seguro onde o erro é acolhido como oportunidade.",
  "Avaliar com precisão é a base para intervir com maestria e empatia.",
  "Rotina e previsibilidade são os melhores remédios para a ansiedade e o TDAH.",
  "Divida grandes tarefas em pequenos passos para vencer a sobrecarga cognitiva.",
  "A neurodiversidade nos lembra que mentes diferentes criam soluções extraordinárias.",
  "Fortalecer as funções executivas é dar à criança as rédeas da própria vida.",
  "O controle inibitório se desenvolve com treino, paciência e estratégias visuais.",
  "Acomodações simples no ambiente geram saltos gigantes no foco e na produtividade.",
  "Não julgue o comportamento sem antes entender a sobrecarga sensorial ou emocional.",
  "Trabalhar a memória de trabalho com pistas visuais transforma o rendimento escolar.",
  "Valorize o esforço individual antes mesmo de comemorar a nota final.",
  "Enxergar o potencial único da criança é a maior ferramenta terapêutica que você possui.",
  "A família não é plateia: é parceira indispensável no processo de evolução.",
  "Orientar os pais com clareza multiplica os resultados obtidos em consultório.",
  "A ponte entre consultório, família e escola constrói redes fortes de apoio à criança.",
  "Sua dedicação diária como psicopedagoga transforma destinos e reescreve histórias.",
  "Cada paciente que evolui carrega para sempre a marca do seu carinho e profissionalismo.",
  "Cuidar do outro exige cuidar de si: respeite seu tempo e renove suas energias.",
  "A psicopedagogia é a arte de devolver o prazer de aprender a quem já havia desistido.",
  "A paciência e o método superam qualquer barreira de aprendizagem.",
  "Quando a criança percebe que você acredita nela, ela passa a acreditar em si mesma.",
  "Seu trabalho no consultório abre janelas para o mundo de cada paciente.",
]

/**
 * Retorna o índice da frase do dia com base no dia do ano
 */
export function getDailyTipIndex(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  const dayOfYear = Math.floor(diff / oneDay)
  return dayOfYear % DAILY_TIPS.length
}

/**
 * Retorna a frase oficial do dia
 */
export function getDailyTip(): string {
  return DAILY_TIPS[getDailyTipIndex()]
}

/**
 * Sorteia uma frase diferente da atual
 */
export function getNextRandomTip(currentIndex: number): { tip: string; index: number } {
  let nextIndex = Math.floor(Math.random() * DAILY_TIPS.length)
  if (nextIndex === currentIndex) {
    nextIndex = (currentIndex + 1) % DAILY_TIPS.length
  }
  return { tip: DAILY_TIPS[nextIndex], index: nextIndex }
}
