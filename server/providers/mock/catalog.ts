import type { ScriptOutput, ThemesOutput, TopicsOutput } from '../../../shared/types';

// Conteúdo de exemplo usado pelo provedor mock.
// Matemática do 1º ano segue as unidades temáticas e habilidades da BNCC
// (EF01MA01 a EF01MA22). Os outros cursos recebem um conteúdo genérico.

type ThemeSeed = ThemesOutput['themes'][number];

interface TopicSeed {
  title: string;
  description: string;
  bncc_unit: string;
  themes: ThemeSeed[];
}

export const MATH_GRADE1: TopicSeed[] = [
  {
    title: 'Números e contagem',
    description: 'Para que servem os números, como contar objetos e como comparar quantidades até 100.',
    bncc_unit: 'Números',
    themes: [
      {
        title: 'Para que servem os números?',
        summary: 'Os números aparecem em todo lugar: na idade, na camisa do jogador, no relógio e no telefone.',
        learning_goal: 'Reconhecer números no dia a dia e perceber que eles indicam quantidade, ordem ou código.',
        bncc_codes: ['EF01MA01'],
        people: [],
      },
      {
        title: 'Contando um a um',
        summary: 'Para contar certo, a gente aponta cada coisa uma vez só, sem pular e sem repetir.',
        learning_goal: 'Contar coleções de forma exata usando estratégias como apontar, separar e agrupar.',
        bncc_codes: ['EF01MA02'],
        people: [],
      },
      {
        title: 'Tem mais, tem menos ou tem igual?',
        summary: 'Formando pares, dá para descobrir qual grupo tem mais, qual tem menos ou se são iguais.',
        learning_goal: 'Comparar quantidades por estimativa e por correspondência um a um.',
        bncc_codes: ['EF01MA03'],
        people: [],
      },
      {
        title: 'Contando até 100 de 10 em 10',
        summary: 'Fazer grupinhos de 10 deixa a contagem rápida, como fazia o pequeno Gauss.',
        learning_goal: 'Contar coleções de até 100 elementos agrupando de 10 em 10 e registrar o resultado.',
        bncc_codes: ['EF01MA04'],
        people: ['Carl Friedrich Gauss'],
      },
      {
        title: 'Quem vem antes e quem vem depois?',
        summary: 'Na reta numérica, cada número tem seu lugar: o menor vem antes e o maior vem depois.',
        learning_goal: 'Comparar e ordenar números de até duas ordens, com e sem a reta numérica.',
        bncc_codes: ['EF01MA05'],
        people: [],
      },
    ],
  },
  {
    title: 'Adição e subtração',
    description: 'Juntar, acrescentar, separar e retirar em situações do dia a dia.',
    bncc_unit: 'Números',
    themes: [
      {
        title: 'Juntar e acrescentar: a adição',
        summary: 'Quando a gente junta dois grupos ou ganha mais, a quantidade aumenta.',
        learning_goal: 'Resolver problemas de adição com os sentidos de juntar e acrescentar.',
        bncc_codes: ['EF01MA06', 'EF01MA08'],
        people: [],
      },
      {
        title: 'Separar e retirar: a subtração',
        summary: 'Quando a gente dá, come ou separa, a quantidade diminui.',
        learning_goal: 'Resolver problemas de subtração com os sentidos de separar e retirar.',
        bncc_codes: ['EF01MA08'],
        people: [],
      },
      {
        title: 'Os amigos do 10',
        summary: 'Tem muitos jeitos de formar 10: 9 e 1, 8 e 2, 7 e 3, 6 e 4, 5 e 5.',
        learning_goal: 'Compor e decompor números, com foco nos pares que formam 10.',
        bncc_codes: ['EF01MA07'],
        people: [],
      },
    ],
  },
  {
    title: 'Padrões e sequências',
    description: 'Organizar objetos por atributos e descobrir o que vem depois numa sequência.',
    bncc_unit: 'Álgebra',
    themes: [
      {
        title: 'Organizando por cor, forma e tamanho',
        summary: 'Dá para arrumar os brinquedos juntando os que são parecidos na cor, na forma ou no tamanho.',
        learning_goal: 'Organizar e ordenar objetos familiares por atributos como cor, forma e medida.',
        bncc_codes: ['EF01MA09'],
        people: [],
      },
      {
        title: 'O que vem depois? Descobrindo padrões',
        summary: 'Quando as coisas se repetem sempre do mesmo jeito, a gente consegue adivinhar o que vem depois.',
        learning_goal: 'Descobrir o elemento que falta em sequências de números, objetos ou figuras.',
        bncc_codes: ['EF01MA10'],
        people: [],
      },
    ],
  },
  {
    title: 'Formas e espaço',
    description: 'Localização no espaço e reconhecimento de figuras planas e espaciais.',
    bncc_unit: 'Geometria',
    themes: [
      {
        title: 'Direita, esquerda, frente e atrás',
        summary: 'Para explicar onde as coisas estão, a gente usa palavras como direita, esquerda, frente e atrás.',
        learning_goal: 'Descrever a localização de pessoas e objetos usando pontos de referência.',
        bncc_codes: ['EF01MA11', 'EF01MA12'],
        people: [],
      },
      {
        title: 'Formas que rolam e formas que não rolam',
        summary: 'A bola rola, a caixa não rola: cada forma tem um jeito diferente.',
        learning_goal: 'Relacionar figuras espaciais (esfera, cilindro, cone, bloco) a objetos do dia a dia.',
        bncc_codes: ['EF01MA13'],
        people: [],
      },
      {
        title: 'Círculo, quadrado, triângulo e retângulo',
        summary: 'As formas estão nos desenhos, nas casas e até nos quadros da pintora Tarsila do Amaral.',
        learning_goal: 'Identificar e nomear círculo, quadrado, retângulo e triângulo em diferentes posições.',
        bncc_codes: ['EF01MA14'],
        people: ['Tarsila do Amaral'],
      },
    ],
  },
  {
    title: 'Medidas, tempo e dinheiro',
    description: 'Comparar tamanhos e pesos, entender o calendário e conhecer o dinheiro brasileiro.',
    bncc_unit: 'Grandezas e medidas',
    themes: [
      {
        title: 'Maior, menor, mais pesado, mais leve',
        summary: 'Comparando as coisas, a gente descobre quem é mais alto, mais comprido ou mais pesado.',
        learning_goal: 'Comparar comprimentos, capacidades e massas usando termos como mais alto e mais leve.',
        bncc_codes: ['EF01MA15'],
        people: [],
      },
      {
        title: 'Dias da semana e meses do ano',
        summary: 'O calendário ajuda a saber que dia é hoje, quando é o aniversário e quanto falta para as férias.',
        learning_goal: 'Reconhecer períodos do dia, dias da semana e meses do ano usando o calendário.',
        bncc_codes: ['EF01MA16', 'EF01MA17', 'EF01MA18'],
        people: [],
      },
      {
        title: 'Moedas e notas do Real',
        summary: 'O dinheiro do Brasil é o Real, e cada moeda e cada nota tem um valor diferente.',
        learning_goal: 'Reconhecer e relacionar valores de moedas e cédulas do sistema monetário brasileiro.',
        bncc_codes: ['EF01MA19'],
        people: [],
      },
    ],
  },
  {
    title: 'Dados e acaso',
    description: 'Noção de acaso, leitura de tabelas e gráficos simples e pesquisas com a turma.',
    bncc_unit: 'Probabilidade e estatística',
    themes: [
      {
        title: 'Certo, talvez ou impossível?',
        summary: 'Algumas coisas vão acontecer com certeza, outras talvez aconteçam e outras são impossíveis.',
        learning_goal: 'Classificar eventos do cotidiano em certos, possíveis e impossíveis.',
        bncc_codes: ['EF01MA20'],
        people: [],
      },
      {
        title: 'Lendo tabelas e gráficos de colunas',
        summary: 'Num gráfico de colunas, a coluna mais alta mostra o que tem mais.',
        learning_goal: 'Ler dados em tabelas e em gráficos de colunas simples.',
        bncc_codes: ['EF01MA21'],
        people: [],
      },
      {
        title: 'Fazendo uma pesquisa com a turma',
        summary: 'Perguntando para os colegas e anotando as respostas, a gente descobre a fruta favorita da turma.',
        learning_goal: 'Realizar uma pesquisa simples e organizar os dados em registros pessoais.',
        bncc_codes: ['EF01MA22'],
        people: [],
      },
    ],
  },
];

export function genericTopics(subjectName: string): TopicsOutput['topics'] {
  return [
    {
      title: `${subjectName}: primeiros passos`,
      description: `Ideias básicas de ${subjectName} para começar (conteúdo de exemplo do mock).`,
      bncc_unit: null,
    },
    {
      title: `${subjectName} no dia a dia`,
      description: `Onde ${subjectName} aparece em casa, na escola e na rua (conteúdo de exemplo do mock).`,
      bncc_unit: null,
    },
    {
      title: `${subjectName} com brincadeiras`,
      description: `Jogos e brincadeiras para praticar ${subjectName} (conteúdo de exemplo do mock).`,
      bncc_unit: null,
    },
  ];
}

export function genericThemes(topicTitle: string): ThemeSeed[] {
  return [1, 2, 3].map((n) => ({
    title: `${topicTitle}: parte ${n}`,
    summary: `Parte ${n} do assunto "${topicTitle}" (conteúdo de exemplo do mock).`,
    learning_goal: `Objetivo de aprendizagem da parte ${n} (a definir pela IA real).`,
    bncc_codes: [],
    people: [],
  }));
}

// ---------------------------------------------------------------------------
// Roteiros escritos à mão para dois temas da demo. Os outros temas usam o
// gerador genérico em text.ts.
// ---------------------------------------------------------------------------

const NICO = {
  name: 'Nico',
  role: 'mascote' as const,
  description:
    'Mascote da Matemática: um número com olhos grandes e sorriso que muda de forma e vira o número que a cena precisa.',
};

export function scriptAddition(variant: number): ScriptOutput {
  const fruit = variant % 2 === 0 ? 'bananas' : 'mangas';
  const songs = [
    {
      title: 'Junta, junta!',
      style: 'Marchinha alegre, 120 bpm, palmas e coro infantil.',
      hook: 'Junta, junta, conta tudo, é só somar!',
      parts: [
        { label: 'Refrão', lines: ['Junta, junta, conta tudo,', 'é só somar!', 'Um mais um, mais um, mais um,', 'vem contar!'] },
        {
          label: 'Verso',
          lines: [
            `Duas ${fruit} na cesta da Bia,`,
            'mais três da vovó, que alegria!',
            'Conta comigo: um, dois, três, quatro, cinco,',
            `cinco ${fruit}, eu não minto!`,
          ],
        },
        { label: 'Refrão', lines: ['Junta, junta, conta tudo,', 'é só somar!'] },
      ],
    },
    {
      title: 'Mais um, mais um',
      style: 'Pop infantil, 110 bpm, batida de palmas e assobio.',
      hook: 'Mais um, mais um, junta tudo num montão!',
      parts: [
        { label: 'Refrão', lines: ['Mais um, mais um,', 'junta tudo num montão!', 'Conta nos dedinhos,', 'faz a soma com a mão!'] },
        { label: 'Verso', lines: [`Duas ${fruit} e mais três,`, 'conta tudo de uma vez:', 'um, dois, três, quatro, cinco,', 'somar é fácil, vem comigo!'] },
      ],
    },
  ];
  const song = songs[variant % songs.length];
  const lyrics = song.parts.flatMap((p) => p.lines);

  return {
    title: 'Juntar e acrescentar: a adição',
    logline: `O Nico ajuda a Bia a juntar ${fruit} na feira e descobre que somar é juntar tudo e contar.`,
    characters: [
      NICO,
      { name: 'Bia', role: 'apoio', description: 'Menina de 6 anos, curiosa, que vai à feira com a avó.' },
      { name: 'Vovó Lúcia', role: 'apoio', description: 'Avó da Bia, carinhosa, com avental de feirante.' },
    ],
    scenes: [
      {
        number: 1,
        title: 'Oi, eu sou o Nico!',
        narration:
          'Oi! Eu sou o Nico, o número que muda de forma. Hoje eu vou descobrir um segredo: o que acontece quando a gente junta as coisas?',
        visual:
          'Nico entra pulando no meio da tela e vira o número 1, depois o 2, depois o 3, como mágica. Fundo azul-claro com estrelinhas.',
        on_screen_text: 'Juntar e acrescentar',
        duration_sec: 12,
        is_song: false,
      },
      {
        number: 2,
        title: 'A feira da Bia',
        narration: `Esta é a Bia. Ela tem 2 ${fruit} na cesta. A vovó deu mais 3 ${fruit}. Quantas ${fruit} a Bia tem agora?`,
        visual: `Bia na feira segurando uma cesta com 2 ${fruit}. A vovó entrega mais 3 ${fruit}. Cada fruta brilha quando aparece.`,
        on_screen_text: `2 ${fruit} e mais 3 ${fruit}`,
        duration_sec: 14,
        is_song: false,
      },
      {
        number: 3,
        title: 'Juntar e contar',
        narration: `Vamos juntar tudo na cesta e contar devagar: um, dois, três, quatro, cinco! Agora a Bia tem 5 ${fruit}.`,
        visual: `As 5 ${fruit} ficam em fila. Cada uma acende com um número em cima: 1, 2, 3, 4, 5. Nico vira o número 5 e comemora.`,
        on_screen_text: '1  2  3  4  5',
        duration_sec: 14,
        is_song: false,
      },
      {
        number: 4,
        title: 'O sinal de mais',
        narration: 'Para escrever isso, a gente usa o sinal de mais. Dois mais três é igual a cinco. O sinal de mais quer dizer: junta!',
        visual:
          'Nico se divide em três partes: o número 2, o sinal de mais e o número 3. As partes se abraçam e viram o número 5. A conta 2 + 3 = 5 aparece bem grande.',
        on_screen_text: '2 + 3 = 5',
        duration_sec: 14,
        is_song: false,
      },
      {
        number: 5,
        title: 'Acrescentar é ganhar mais',
        narration: 'No parquinho tem 4 crianças no escorregador. Chega mais 1 amigo. Agora são 5 crianças! Quando chega mais, a gente soma.',
        visual:
          'Parquinho colorido com 4 crianças no escorregador. Uma criança chega correndo e acenando. A placa do parquinho muda de 4 para 5.',
        on_screen_text: '4 + 1 = 5',
        duration_sec: 14,
        is_song: false,
      },
      {
        number: 6,
        title: 'Contando nos dedos',
        narration: 'Um truque: mostre 3 dedos numa mão e 2 dedos na outra. Junte as mãos e conte todos os dedos. Deu 5!',
        visual: 'Duas mãos de criança: uma com 3 dedos levantados e outra com 2. Os dedos acendem um por um e aparece o número 5.',
        on_screen_text: '3 + 2 = 5',
        duration_sec: 12,
        is_song: false,
      },
      {
        number: 7,
        title: 'Hora da música!',
        narration: `Agora canta comigo! ${lyrics.join(' ')}`,
        visual: `Nico, Bia e a vovó dançam com ${fruit} que pulam no ritmo. A letra aparece embaixo, palavra por palavra.`,
        on_screen_text: song.hook,
        duration_sec: 18,
        is_song: true,
      },
      {
        number: 8,
        title: 'Revisão',
        narration: 'Lembrou? Somar é juntar ou ganhar mais. O sinal de mais quer dizer junta. E para achar o resultado, é só contar tudo!',
        visual:
          'Três cartões aparecem um de cada vez: uma cesta juntando frutas, uma criança chegando no parquinho e um sinal de mais gigante. Nico aponta cada cartão.',
        on_screen_text: 'Juntar · Ganhar mais · Contar tudo',
        duration_sec: 13,
        is_song: false,
      },
    ],
    song,
    quiz: [
      {
        question: `A Bia tinha 2 ${fruit} e ganhou mais 3. Quantas ela tem agora?`,
        options: ['4', '5', '6'],
        answer_index: 1,
        explanation: 'Dois mais três é igual a cinco. Junta e conta: 1, 2, 3, 4, 5!',
      },
      {
        question: 'Qual sinal quer dizer "junta"?',
        options: ['+', '−', '='],
        answer_index: 0,
        explanation: 'O sinal de mais (+) quer dizer juntar.',
      },
      {
        question: 'Tinha 4 crianças no parquinho e chegou mais 1. Quantas crianças tem agora?',
        options: ['3', '41', '5'],
        answer_index: 2,
        explanation: 'Chegou mais um: 4 mais 1 é igual a 5.',
      },
    ],
    review: [
      'Somar é juntar dois grupos ou ganhar mais.',
      'O sinal de mais (+) quer dizer: junta!',
      'Para achar o resultado, conte tudo junto: 2 + 3 = 5.',
    ],
  };
}

export function scriptCountingByTens(variant: number): ScriptOutput {
  const thing = variant % 2 === 0 ? 'bolinhas de gude' : 'tampinhas';
  const song = {
    title: 'De dez em dez',
    style: 'Funk infantil leve, 100 bpm, batida simples e palmas.',
    hook: 'De dez em dez, conta comigo, vai, vai, vai!',
    parts: [
      { label: 'Refrão', lines: ['De dez em dez, de dez em dez,', 'conta comigo, vai, vai, vai!'] },
      {
        label: 'Verso',
        lines: [
          'Dez, vinte, trinta, quarenta, cinquenta,',
          'sessenta, setenta, a turma aguenta!',
          'Oitenta, noventa, chegou a vez:',
          'cem é dez grupinhos de dez!',
        ],
      },
      { label: 'Refrão', lines: ['De dez em dez, de dez em dez,', 'conta comigo, vai, vai, vai!'] },
    ],
  };
  const lyrics = song.parts.flatMap((p) => p.lines);

  return {
    title: 'Contando até 100 de 10 em 10',
    logline: `O Gaussinho ensina o Nico a contar um montão de ${thing} fazendo grupinhos de 10.`,
    characters: [
      NICO,
      {
        name: 'Gaussinho',
        role: 'pessoa citada',
        description:
          'Versão criança de Carl Friedrich Gauss, matemático alemão que, segundo a história, achou um jeito rápido de fazer uma conta enorme quando era menino. Cabelo bagunçado, roupa antiga, muito curioso.',
      },
    ],
    scenes: [
      {
        number: 1,
        title: 'Um montão!',
        narration: `Oi, eu sou o Nico! Olha quantas ${thing}! Será que dá para contar tudo isso sem se perder?`,
        visual: `Nico ao lado de um monte enorme de ${thing} coloridas espalhadas no chão. Ele coça a cabeça, confuso.`,
        on_screen_text: null,
        duration_sec: 12,
        is_song: false,
      },
      {
        number: 2,
        title: 'Chega o Gaussinho',
        narration:
          'Este é o Gaussinho. Há muito tempo, ele era um menino que adorava contar e sempre achava jeitos espertos de fazer contas rápidas.',
        visual: 'Gaussinho sai de uma máquina do tempo de papelão, com roupa antiga e cabelo bagunçado, acenando para o Nico.',
        on_screen_text: 'Gaussinho',
        duration_sec: 13,
        is_song: false,
      },
      {
        number: 3,
        title: 'O segredo: grupos de 10',
        narration: `O Gaussinho ensina: em vez de contar uma por uma, vamos fazer grupinhos de 10. Cada saquinho guarda 10 ${thing}.`,
        visual: `As ${thing} pulam para dentro de saquinhos transparentes, 10 em cada um. O número 10 aparece em cada saquinho.`,
        on_screen_text: '10 em cada saquinho',
        duration_sec: 14,
        is_song: false,
      },
      {
        number: 4,
        title: 'De 10 em 10',
        narration: 'Agora é só contar os saquinhos: dez, vinte, trinta, quarenta, cinquenta! São 50.',
        visual: 'Cinco saquinhos em fila. Nico vira o número 10, 20, 30, 40 e 50 conforme pula em cima de cada saquinho.',
        on_screen_text: '10 · 20 · 30 · 40 · 50',
        duration_sec: 14,
        is_song: false,
      },
      {
        number: 5,
        title: 'Até chegar no 100',
        narration: 'Com 10 saquinhos de 10, a gente chega no 100! Dez, vinte, trinta, quarenta, cinquenta, sessenta, setenta, oitenta, noventa, cem!',
        visual: 'Dez saquinhos formam uma escada. Nico sobe degrau por degrau, mudando de número, até virar um 100 gigante com fogos de artifício.',
        on_screen_text: '100',
        duration_sec: 16,
        is_song: false,
      },
      {
        number: 6,
        title: 'E o que sobra?',
        narration: `Se sobrar ${thing} fora do saquinho, a gente conta separado. Três saquinhos e mais 4 soltas: trinta e quatro!`,
        visual: `Três saquinhos cheios e 4 ${thing} soltas ao lado. Aparece 30 + 4 = 34, com cores diferentes para as dezenas e as unidades.`,
        on_screen_text: '30 + 4 = 34',
        duration_sec: 14,
        is_song: false,
      },
      {
        number: 7,
        title: 'Hora da música!',
        narration: `Canta comigo! ${lyrics.join(' ')}`,
        visual: 'Nico e Gaussinho dançam em cima dos saquinhos. A cada "dez" um saquinho acende. A letra aparece embaixo.',
        on_screen_text: song.hook,
        duration_sec: 18,
        is_song: true,
      },
      {
        number: 8,
        title: 'Revisão',
        narration: 'Lembrou? Para contar muita coisa, faça grupos de 10. Depois conte de 10 em 10 e junte o que sobrou.',
        visual: 'Três cartões: um monte bagunçado, saquinhos de 10 arrumados e o número 100. Gaussinho dá um joinha.',
        on_screen_text: 'Grupos de 10 · De 10 em 10 · Junte o que sobrou',
        duration_sec: 12,
        is_song: false,
      },
    ],
    song,
    quiz: [
      {
        question: 'Quantas coisas cabem em cada saquinho do Gaussinho?',
        options: ['5', '10', '100'],
        answer_index: 1,
        explanation: 'Cada saquinho guarda um grupinho de 10.',
      },
      {
        question: 'Dez, vinte, trinta... qual vem depois?',
        options: ['Trinta e um', 'Cinquenta', 'Quarenta'],
        answer_index: 2,
        explanation: 'De 10 em 10: dez, vinte, trinta, quarenta!',
      },
      {
        question: 'Três saquinhos de 10 e mais 4 soltas. Quantas são?',
        options: ['34', '7', '43'],
        answer_index: 0,
        explanation: 'Três saquinhos são 30. Com mais 4, são 34.',
      },
    ],
    review: [
      'Para contar muita coisa, faça grupos de 10.',
      'Conte os grupos de 10 em 10: 10, 20, 30...',
      '10 grupos de 10 formam 100.',
    ],
  };
}
