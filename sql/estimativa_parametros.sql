-- ============================================================
-- Tabela: estimativa_parametros
-- Parâmetros de estimativa de esforço compartilhados entre
-- todos os usuários autenticados.
-- ============================================================

CREATE TABLE IF NOT EXISTS estimativa_parametros (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo          text         NOT NULL DEFAULT '',
  objeto        text         NOT NULL DEFAULT '',
  complexidade  text         NOT NULL DEFAULT 'Média',
  analise_ef    numeric(8,2) NOT NULL DEFAULT 0,
  espec         numeric(8,2) NOT NULL DEFAULT 0,
  codific       numeric(8,2) NOT NULL DEFAULT 0,
  testes        numeric(8,2) NOT NULL DEFAULT 0,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_estimativa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estimativa_updated_at ON estimativa_parametros;
CREATE TRIGGER trg_estimativa_updated_at
  BEFORE UPDATE ON estimativa_parametros
  FOR EACH ROW EXECUTE FUNCTION update_estimativa_updated_at();

-- ============================================================
-- Row Level Security
-- Todos os usuários autenticados podem ler e modificar.
-- A tabela é compartilhada (sem user_id).
-- ============================================================

ALTER TABLE estimativa_parametros ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado
CREATE POLICY "Autenticados podem ler estimativas"
  ON estimativa_parametros
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Inserção: qualquer usuário autenticado
CREATE POLICY "Autenticados podem inserir estimativas"
  ON estimativa_parametros
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Atualização: qualquer usuário autenticado
CREATE POLICY "Autenticados podem atualizar estimativas"
  ON estimativa_parametros
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Exclusão: qualquer usuário autenticado
CREATE POLICY "Autenticados podem excluir estimativas"
  ON estimativa_parametros
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Índice para ordenação padrão por tipo/objeto
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_estimativa_tipo_objeto
  ON estimativa_parametros (tipo, objeto);
