# EF Complexa — Integração SAP ↔ E-commerce (REST API)

## Contexto para gerar a EF

Cole o texto abaixo no campo de **contexto** do módulo Especificações para gerar uma EF complexa e testar a Estimativa de Esforço com cenário de alta complexidade.

---

## Descrição do Requisito

**Solicitante:** Gerência de TI + Diretoria de E-commerce
**Data:** Março/2026
**Sistema:** SAP S/4HANA 2023 (on-premise)
**Módulo:** SD + MM + FI + Integration Suite
**Prazo solicitado pelo negócio:** 60 dias

### Contexto de negócio
A empresa está lançando uma loja virtual integrada ao SAP. O e-commerce (plataforma VTEX) precisa se comunicar com o SAP em tempo real para: consultar estoque, criar pedidos, atualizar status e emitir NF-e automaticamente.

### Escopo técnico detalhado

#### 1. API REST exposta pelo SAP (Inbound)
Criar endpoints via SAP ICF (Internet Communication Framework):
- `GET /api/v1/estoque/{matnr}/{werks}` — Consulta disponibilidade
- `POST /api/v1/pedidos` — Cria pedido de venda (BAPI_SALESORDER_CREATEFROMDAT2)
- `GET /api/v1/pedidos/{vbeln}/status` — Consulta status do pedido
- `PUT /api/v1/pedidos/{vbeln}/cancelar` — Cancela pedido (VA02)
- `POST /api/v1/nfe/emitir` — Dispara emissão de NF-e

#### 2. Autenticação
- OAuth 2.0 via SAP Identity Provider
- Rate limiting: máximo 100 req/min por token
- Log de todas as chamadas em tabela Z

#### 3. Criação de pedido de venda
- Mapear payload JSON → estruturas BAPI
- Criar parceiro de negócios automaticamente se CNPJ não existir (BDT)
- Calcular frete via tabela de condições (VKOA)
- Reservar estoque imediatamente (MIGO)
- Retornar VBELN + estimated delivery date

#### 4. Emissão de NF-e
- Integrar com SEFAZ via certificado A1 (já parametrizado)
- Usar BAdI J_1B_NF_OUTPUT_PARTNER
- Reprocessamento automático em caso de rejeição codes 200-299 (erros corrigíveis)
- Persistir XML e protocolo em tabela Z

#### 5. Monitoramento
- Dashboard ABAP (tela SE38) com status das integrações das últimas 24h
- Alert por email em caso de falha (SO_NEW_DOCUMENT_SEND_API1)
- Reprocessamento manual de mensagens com erro

### Requisitos não-funcionais
- Tempo de resposta < 800ms para consulta de estoque
- Disponibilidade 99,5% (SLA do e-commerce)
- Suportar 500 pedidos/hora em pico (Black Friday)
- LGPD: dados pessoais criptografados em trânsito e em repouso

### Restrições técnicas
- Não pode usar middleware externo (PI/PO está sendo descontinuado)
- Deve usar apenas recursos nativos SAP
- Ambiente de QA disponível apenas às sextas-feiras para testes integrados
