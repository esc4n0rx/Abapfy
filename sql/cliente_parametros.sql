-- ============================================================
-- Tabela: cliente_parametros
-- Parâmetros de estimativa por cliente/empresa compartilhados
-- entre todos os usuários autenticados.
-- ============================================================

CREATE TABLE IF NOT EXISTS cliente_parametros (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa         text         NOT NULL DEFAULT '',
  levantamento    numeric(8,2) NOT NULL DEFAULT 0,
  impl_proposal   numeric(8,2) NOT NULL DEFAULT 0,
  esp_func        numeric(8,2) NOT NULL DEFAULT 0,
  esp_tec         numeric(8,2) NOT NULL DEFAULT 0,
  codific         numeric(8,2) NOT NULL DEFAULT 0,
  traducao_en     numeric(8,2) NOT NULL DEFAULT 0,
  traducao_es     numeric(8,2) NOT NULL DEFAULT 0,
  teste_unitario  numeric(8,2) NOT NULL DEFAULT 0,
  teste_qas       numeric(8,2) NOT NULL DEFAULT 0,
  bpp_pt          numeric(8,2) NOT NULL DEFAULT 0,
  bpp_en          numeric(8,2) NOT NULL DEFAULT 0,
  bpp_es          numeric(8,2) NOT NULL DEFAULT 0,
  teste_volume    numeric(8,2) NOT NULL DEFAULT 0,
  homologacao     numeric(8,2) NOT NULL DEFAULT 0,
  access_control  numeric(8,2) NOT NULL DEFAULT 0,
  homologacao_2   numeric(8,2) NOT NULL DEFAULT 0,
  go_live         numeric(8,2) NOT NULL DEFAULT 0,
  documentacao    numeric(8,2) NOT NULL DEFAULT 0,
  gerencia        numeric(8,2) NOT NULL DEFAULT 0,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_cliente_parametros_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cliente_parametros_updated_at ON cliente_parametros;
CREATE TRIGGER trg_cliente_parametros_updated_at
  BEFORE UPDATE ON cliente_parametros
  FOR EACH ROW EXECUTE FUNCTION update_cliente_parametros_updated_at();

-- ============================================================
-- Row Level Security
-- Todos os usuários autenticados podem ler e modificar.
-- A tabela é compartilhada (sem user_id).
-- ============================================================

ALTER TABLE cliente_parametros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler params cliente"
  ON cliente_parametros FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem inserir params cliente"
  ON cliente_parametros FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar params cliente"
  ON cliente_parametros FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem excluir params cliente"
  ON cliente_parametros FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Índice para ordenação por empresa
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cliente_parametros_empresa
  ON cliente_parametros (empresa);
