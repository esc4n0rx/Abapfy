# Carga de Testes — 03 Estimativa de Esforço

## Objetivo
Testar o componente `EffortSection` que aparece dentro do módulo **Especificações** após gerar uma EF.

## Como testar

### Cenário 1 — EF Simples (baixa complexidade)
1. Abra o módulo **Especificações**
2. Cole o conteúdo de `ef_simples_relatorio_vendas.md` no campo de contexto
3. Clique em **Gerar Especificação**
4. Aguarde a geração da EF
5. Role para o final da EF gerada — deve aparecer a seção **Estimativa de Esforço**
6. Clique em **Calcular Estimativa de Esforço**

**Resultado esperado:**
- Complexidade: `simples` ou `média`
- Total de horas: ~16–40h
- Fases: Análise, Desenvolvimento, Testes, Deploy
- Riscos: poucos e de baixo impacto

---

### Cenário 2 — EF Complexa (alta complexidade)
1. Cole o conteúdo de `ef_complexa_integracao_ecommerce.md` no campo de contexto
2. Gere a EF
3. Calcule a estimativa

**Resultado esperado:**
- Complexidade: `alta` ou `muito alta`
- Total de horas: ~120–200h
- Fases mais detalhadas (incluindo API, NF-e, testes integrados)
- Riscos: ambiente de QA limitado, curva de aprendizado OAuth/ICF, SLA do e-commerce

---

## O que verificar

- [ ] Seção "Estimativa de Esforço" aparece ao final da EF gerada
- [ ] Botão "Calcular Estimativa de Esforço" funciona
- [ ] Loading spinner durante chamada à IA
- [ ] Complexidade exibida com badge colorido (verde/amarelo/vermelho)
- [ ] Total de horas em destaque
- [ ] Barras de progresso por fase (proporcionais ao total)
- [ ] Riscos listados com ícone de alerta
- [ ] Premissas/assumptions exibidas
- [ ] Seção colapsável (clicar no título abre/fecha)
- [ ] Erro exibido corretamente se IA não configurada

## Arquivo de referência
- `ef_simples_relatorio_vendas.md` → espera estimativa baixa
- `ef_complexa_integracao_ecommerce.md` → espera estimativa alta
