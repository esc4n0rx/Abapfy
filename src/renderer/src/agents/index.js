import abaper             from './abaper.md?raw'
import codeReview         from './code_review.md?raw'
import consultor          from './consultor.md?raw'
import template           from './template.md?raw'
import efConsultant       from './ef_consultant.md?raw'
import effortEstimator    from './effort_estimator.md?raw'
import dtecConsultant     from './dtec_consultant.md?raw'
import perfAnalyzer       from './performance_analyzer.md?raw'
import enhancementFinder  from './enhancement_finder.md?raw'

export const DEFAULT_AGENTS = [
  {
    id: 'abaper',
    name: 'Abaper',
    description: 'Desenvolvedor ABAP com foco em código direto e performático (Fast Code). Responde em JSON com arquivos organizados.',
    content: abaper
  },
  {
    id: 'code_review',
    name: 'Code Review',
    description: 'Análise e manutenção de código ABAP com escopo mínimo. Preserva o estilo existente, evita refatoração não solicitada.',
    content: codeReview
  },
  {
    id: 'consultor',
    name: 'Consultor SAP',
    description: 'Criação de Especificações Funcionais estruturadas com macro/micro fluxos, regras de negócio e objetos de desenvolvimento.',
    content: consultor
  },
  {
    id: 'ef_consultant',
    name: 'EF Consultant',
    description: 'Especialista em análise e geração de código ABAP a partir de Especificações Funcionais (EF) no padrão do projeto.',
    content: efConsultant
  },
  {
    id: 'effort_estimator',
    name: 'Estimativa de Esforço',
    description: 'Analisa EFs e gera estimativas de esforço de desenvolvimento ABAP com breakdown por complexidade.',
    content: effortEstimator
  },
  {
    id: 'dtec_consultant',
    name: 'DTec Consultant',
    description: 'Gera Documentação Técnica (DTec) estruturada para objetos ABAP com base em código-fonte.',
    content: dtecConsultant
  },
  {
    id: 'performance_analyzer',
    name: 'Performance Analyzer',
    description: 'Analisa código ABAP em busca de gargalos de performance e sugere otimizações baseadas em boas práticas SAP.',
    content: perfAnalyzer
  },
  {
    id: 'enhancement_finder',
    name: 'Enhancement Finder',
    description: 'Identifica BAdIs, User Exits e Enhancement Points adequados para uma necessidade de customização SAP.',
    content: enhancementFinder
  }
]

/** Map id → raw prompt content (build-time, always available) */
export const ALL_AGENT_PROMPTS = Object.fromEntries(
  DEFAULT_AGENTS.map(a => [a.id, a.content])
)

export const AGENT_TEMPLATE = template
