/**
 * data.js — Base de conteúdos do ENEM
 * ------------------------------------------------------------
 * Estrutura estática com as 4 áreas do ENEM, suas matérias e
 * respectivos tópicos. Cada tópico recebe um "id" único (slug)
 * usado para referenciar seu status de estudo no localStorage.
 *
 * Esta estrutura é intencionalmente separada da lógica de
 * agendamento (scheduler.js) e da camada de persistência
 * (storage.js) para que, no futuro, os dados possam vir de uma
 * API/banco de dados em vez de um arquivo estático.
 * ------------------------------------------------------------
 */

// Gera um id "slug" simples e estável a partir do nome do tópico
function slugify(text) {
  return text
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildTopics(subjectId, names) {
  return names.map((name, i) => ({
    id: `${subjectId}__${slugify(name)}`,
    name,
    order: i
  }));
}

const ENEM_AREAS = {
  linguagens: {
    id: 'linguagens',
    name: 'Linguagens, Códigos e suas Tecnologias',
    short: 'Linguagens',
    color: '#2FA4C9',
    subjects: {
      portugues: {
        id: 'portugues',
        name: 'Língua Portuguesa',
        topics: buildTopics('portugues', [
          'Interpretação de textos', 'Compreensão textual', 'Gêneros textuais',
          'Tipos textuais', 'Funções da linguagem', 'Variação linguística',
          'Norma-padrão', 'Coesão textual', 'Coerência textual', 'Conectivos',
          'Figuras de linguagem', 'Argumentação', 'Recursos expressivos',
          'Relação entre linguagem verbal e não verbal',
          'Leitura de gráficos, charges, tirinhas e anúncios'
        ])
      },
      literatura: {
        id: 'literatura',
        name: 'Literatura',
        topics: buildTopics('literatura', [
          'Literatura brasileira', 'Escolas literárias', 'Contexto histórico e social',
          'Gêneros literários', 'Poesia', 'Prosa', 'Modernismo', 'Pré-Modernismo',
          'Romantismo', 'Realismo', 'Naturalismo', 'Simbolismo', 'Parnasianismo',
          'Literatura contemporânea'
        ])
      },
      linguaEstrangeira: {
        id: 'lingua-estrangeira',
        name: 'Língua Estrangeira',
        topics: buildTopics('lingua-estrangeira', [
          'Interpretação de textos em inglês', 'Interpretação de textos em espanhol',
          'Vocabulário contextual', 'Cognatos e falsos cognatos',
          'Identificação de ideia principal', 'Identificação de informações específicas',
          'Gêneros textuais em língua estrangeira'
        ])
      },
      artesEducacaoFisica: {
        id: 'artes-ed-fisica',
        name: 'Artes, Educação Física e Tecnologias',
        topics: buildTopics('artes-ed-fisica', [
          'Artes visuais', 'Música', 'Teatro', 'Dança', 'Cultura e sociedade',
          'Corpo e movimento', 'Esporte', 'Saúde', 'Mídias e tecnologias',
          'Comunicação digital'
        ])
      }
    }
  },

  matematica: {
    id: 'matematica',
    name: 'Matemática e suas Tecnologias',
    short: 'Matemática',
    color: '#E0A526',
    subjects: {
      matematica: {
        id: 'matematica',
        name: 'Matemática',
        topics: buildTopics('matematica', [
          'Operações básicas', 'Frações', 'Razão e proporção', 'Regra de três',
          'Porcentagem', 'Juros simples', 'Juros compostos',
          'Grandezas e unidades de medida', 'Escalas', 'Matemática financeira',
          'Equações', 'Inequações', 'Sistemas', 'Funções', 'Função afim',
          'Função quadrática', 'Função exponencial', 'Função logarítmica',
          'Progressão aritmética', 'Progressão geométrica', 'Análise combinatória',
          'Princípio fundamental da contagem', 'Probabilidade', 'Estatística',
          'Média', 'Mediana', 'Moda', 'Interpretação de gráficos',
          'Interpretação de tabelas', 'Geometria plana', 'Geometria espacial',
          'Áreas', 'Perímetros', 'Volumes', 'Semelhança de triângulos',
          'Teorema de Pitágoras', 'Trigonometria', 'Circunferência',
          'Geometria analítica'
        ])
      }
    }
  },

  natureza: {
    id: 'natureza',
    name: 'Ciências da Natureza e suas Tecnologias',
    short: 'C. da Natureza',
    color: '#2E8B57',
    subjects: {
      fisica: {
        id: 'fisica',
        name: 'Física',
        topics: buildTopics('fisica', [
          'Cinemática', 'Movimento uniforme', 'Movimento uniformemente variado',
          'Leis de Newton', 'Força', 'Atrito', 'Trabalho', 'Energia', 'Potência',
          'Quantidade de movimento', 'Impulso', 'Gravitação', 'Hidrostática',
          'Pressão', 'Densidade', 'Termologia', 'Calor', 'Temperatura',
          'Termodinâmica', 'Ondas', 'Som', 'Óptica', 'Eletricidade',
          'Corrente elétrica', 'Tensão', 'Resistência', 'Circuitos elétricos',
          'Consumo de energia'
        ])
      },
      quimica: {
        id: 'quimica',
        name: 'Química',
        topics: buildTopics('quimica', [
          'Matéria e suas transformações', 'Propriedades da matéria', 'Estados físicos',
          'Separação de misturas', 'Modelos atômicos', 'Estrutura do átomo',
          'Tabela periódica', 'Ligações químicas', 'Funções inorgânicas', 'Ácidos',
          'Bases', 'Sais', 'Óxidos', 'Reações químicas', 'Balanceamento', 'Mol',
          'Massa molar', 'Estequiometria', 'Soluções', 'Concentração',
          'Termoquímica', 'Cinética química', 'Equilíbrio químico', 'Oxirredução',
          'Pilhas', 'Eletrólise', 'Química orgânica', 'Hidrocarbonetos',
          'Funções orgânicas', 'Polímeros', 'Petróleo', 'Biocombustíveis',
          'Química ambiental'
        ])
      },
      biologia: {
        id: 'biologia',
        name: 'Biologia',
        topics: buildTopics('biologia', [
          'Citologia', 'Membrana plasmática', 'Organelas', 'Metabolismo celular',
          'Respiração celular', 'Fotossíntese', 'Divisão celular', 'Mitose',
          'Meiose', 'Genética', 'DNA', 'RNA', 'Síntese de proteínas',
          'Hereditariedade', 'Biotecnologia', 'Evolução', 'Seleção natural',
          'Classificação dos seres vivos', 'Vírus', 'Bactérias', 'Protozoários',
          'Fungos', 'Plantas', 'Animais', 'Fisiologia humana',
          'Sistema digestório', 'Sistema respiratório', 'Sistema circulatório',
          'Sistema nervoso', 'Sistema endócrino', 'Imunologia', 'Saúde e doenças',
          'Ecologia', 'Cadeias alimentares', 'Teias alimentares',
          'Relações ecológicas', 'Ciclos biogeoquímicos', 'Biomas',
          'Impactos ambientais', 'Sustentabilidade'
        ])
      }
    }
  },

  humanas: {
    id: 'humanas',
    name: 'Ciências Humanas e suas Tecnologias',
    short: 'C. Humanas',
    color: '#8E6BC7',
    subjects: {
      historia: {
        id: 'historia',
        name: 'História',
        topics: buildTopics('historia', [
          'História Antiga', 'História Medieval', 'História Moderna',
          'História Contemporânea', 'Brasil Colonial', 'Escravidão',
          'Resistência indígena e africana', 'Independência do Brasil',
          'Brasil Império', 'República Velha', 'Era Vargas', 'Ditadura Militar',
          'Redemocratização', 'Revolução Industrial', 'Iluminismo',
          'Revolução Francesa', 'Imperialismo', 'Primeira Guerra Mundial',
          'Revolução Russa', 'Segunda Guerra Mundial', 'Guerra Fria',
          'Totalitarismos', 'Movimentos sociais', 'Cidadania', 'Direitos humanos'
        ])
      },
      geografia: {
        id: 'geografia',
        name: 'Geografia',
        topics: buildTopics('geografia', [
          'Cartografia', 'Escalas', 'Coordenadas geográficas', 'Mapas', 'Relevo',
          'Clima', 'Vegetação', 'Hidrografia', 'Questões ambientais',
          'Sustentabilidade', 'Fontes de energia', 'Recursos naturais',
          'Agricultura', 'Industrialização', 'Urbanização', 'População',
          'Migrações', 'Globalização', 'Geopolítica', 'Conflitos internacionais',
          'Economia', 'Desigualdade social', 'Espaço agrário', 'Espaço urbano'
        ])
      },
      sociologia: {
        id: 'sociologia',
        name: 'Sociologia',
        topics: buildTopics('sociologia', [
          'Cultura', 'Identidade', 'Indivíduo e sociedade', 'Socialização',
          'Classes sociais', 'Desigualdade', 'Trabalho', 'Capitalismo',
          'Movimentos sociais', 'Cidadania', 'Democracia', 'Estado', 'Poder',
          'Direitos humanos', 'Indústria cultural', 'Globalização',
          'Relações sociais'
        ])
      },
      filosofia: {
        id: 'filosofia',
        name: 'Filosofia',
        topics: buildTopics('filosofia', [
          'Filosofia Antiga', 'Filosofia Medieval', 'Filosofia Moderna',
          'Filosofia Contemporânea', 'Ética', 'Moral', 'Justiça', 'Política',
          'Conhecimento', 'Ciência', 'Razão', 'Liberdade', 'Sociedade', 'Estado',
          'Democracia', 'Direitos humanos', 'Principais filósofos e suas ideias'
        ])
      }
    }
  }
};

// Tipos de atividade possíveis para uma tarefa de estudo
const ACTIVITY_TYPES = [
  'Aula', 'Leitura', 'Resumo', 'Exercícios', 'Revisão',
  'Redação', 'Simulado', 'Correção de questões', 'Descanso'
];

// Status possíveis de uma tarefa da agenda
const TASK_STATUS = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  REAGENDADO: 'Reagendado',
  ATRASADO: 'Atrasado'
};

// Status possíveis de um conteúdo (página "Conteúdos")
const CONTENT_STATUS = {
  NAO_INICIADO: 'Não iniciado',
  ESTUDANDO: 'Estudando',
  REVISADO: 'Revisado',
  DOMINADO: 'Dominado',
  PRECISA_REVISAR: 'Precisa revisar'
};

const WEEKDAYS = [
  { value: 0, short: 'Dom', label: 'Domingo' },
  { value: 1, short: 'Seg', label: 'Segunda-feira' },
  { value: 2, short: 'Ter', label: 'Terça-feira' },
  { value: 3, short: 'Qua', label: 'Quarta-feira' },
  { value: 4, short: 'Qui', label: 'Quinta-feira' },
  { value: 5, short: 'Sex', label: 'Sexta-feira' },
  { value: 6, short: 'Sáb', label: 'Sábado' }
];

// Retorna uma lista plana [{areaId, subjectId, topicId, name}] na ordem
// de intercalação entre as áreas (para distribuição equilibrada)
function getInterleavedTopics() {
  const queues = Object.values(ENEM_AREAS).map(area => {
    const list = [];
    Object.values(area.subjects).forEach(subject => {
      subject.topics.forEach(topic => {
        list.push({
          areaId: area.id, areaName: area.short, color: area.color,
          subjectId: subject.id, subjectName: subject.name,
          topicId: topic.id, topicName: topic.name
        });
      });
    });
    return list;
  });

  const result = [];
  let added = true;
  let idx = 0;
  while (added) {
    added = false;
    for (const q of queues) {
      if (q[idx]) { result.push(q[idx]); added = true; }
    }
    idx++;
  }
  return result;
}

function getAllTopicsFlat() {
  const list = [];
  Object.values(ENEM_AREAS).forEach(area => {
    Object.values(area.subjects).forEach(subject => {
      subject.topics.forEach(topic => {
        list.push({
          areaId: area.id, areaName: area.short, areaFullName: area.name, color: area.color,
          subjectId: subject.id, subjectName: subject.name,
          topicId: topic.id, topicName: topic.name
        });
      });
    });
  });
  return list;
}
