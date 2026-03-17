import abaper    from './abaper.md?raw'
import codeReview from './code_review.md?raw'
import consultor  from './consultor.md?raw'
import template   from './template.md?raw'

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
  }
]

export const AGENT_TEMPLATE = template
