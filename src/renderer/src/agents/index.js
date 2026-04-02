/**
 * agents/index.js
 *
 * Agentes padrão vivem na tabela `default_agents` do Supabase.
 * Este arquivo não importa mais arquivos locais .md.
 */

/** Sem fallback local — banco é a fonte de verdade */
export const ALL_AGENT_PROMPTS = {}

/** Template em branco para criação de novos agentes na UI */
export const AGENT_TEMPLATE = `# Agente: [Nome do Agente]

## Identidade
[Descreva o papel, especialidade e personalidade do agente.]

---

## Objetivo Principal
[Qual o propósito central deste agente? O que ele resolve?]

---

## Regras de Comportamento
- [O que o agente SEMPRE faz]
- [O que o agente NUNCA faz]
- [Como lida com ambiguidade]

---

## Contexto e Domínio de Conhecimento
[Descreva o contexto técnico ou de negócio que o agente domina.]

---

## Formato de Resposta

\`\`\`json
{
  "campo_exemplo": "valor",
  "lista_exemplo": ["item1", "item2"]
}
\`\`\`

---

## Restrições
- [O que este agente NÃO deve fazer]
- [Limites de escopo]
- [Quando pedir mais informações antes de responder]
`
