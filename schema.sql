-- =====================================================
-- NEXORA Corp · Cadastro de funcionários (Supabase / PostgreSQL)
-- Supabase > SQL Editor > New query > cole tudo > Run
-- =====================================================

-- 1) Cria a tabela de cadastros exigida pelo projeto.
CREATE TABLE IF NOT EXISTS cadastros (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    salario VARCHAR(100),
    cargo VARCHAR(200),
    departamento VARCHAR(200),
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 2) Migração segura para preservar dados antigos em tabelas anteriores.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'funcionarios'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'cadastros' AND column_name = 'cargo'
    ) THEN
        -- Ajuste manual pode ser necessário se a base antiga tiver nomes diferentes.
        ALTER TABLE funcionarios RENAME TO cadastros;
    END IF;
END $$;

-- 3) Garante que colunas críticas existam, sem apagar dados.
ALTER TABLE IF EXISTS cadastros
    ADD COLUMN IF NOT EXISTS nome VARCHAR(200),
    ADD COLUMN IF NOT EXISTS email VARCHAR(200),
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS salario VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cargo VARCHAR(200),
    ADD COLUMN IF NOT EXISTS departamento VARCHAR(200),
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT NOW();

-- 4) Mantém a unicidade do e-mail em caso de registros existentes.
CREATE UNIQUE INDEX IF NOT EXISTS cadastros_email_key
ON cadastros (email);

-- 5) Insere dados de exemplo sem duplicar registros existentes.
INSERT INTO cadastros (nome, email, telefone, salario, cargo, departamento)
VALUES
    ('Filipe Pieroni', 'filipinhodograu@email.com', '(11) 96767-6767', '100', 'administrativo', 'tecnologia'),
    ('Ednaldo Pereira', 'ednaldo@email.com', '(21) 96969-6969', '100', 'administrativo', 'primeiro'),
    ('Jair Inacio Bolsonaro Lula', 'jairinacio@email', '(31) 98137-6722', '100', 'administrativo', 'roubo')
ON CONFLICT (email) DO NOTHING;

-- 6) Ativar RLS (obrigatório em ambientes com autenticação restrita).
ALTER TABLE cadastros ENABLE ROW LEVEL SECURITY;

-- 7) Políticas mínimas para o formulário público.
DROP POLICY IF EXISTS "Permitir leitura pública" ON cadastros;
DROP POLICY IF EXISTS "Permitir inserção pública" ON cadastros;
DROP POLICY IF EXISTS "Permitir atualização pública" ON cadastros;
DROP POLICY IF EXISTS "Permitir deleção pública" ON cadastros;

CREATE POLICY "Permitir leitura pública"
ON cadastros FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção pública"
ON cadastros FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização pública"
ON cadastros FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir deleção pública"
ON cadastros FOR DELETE
USING (true);

-- 8) Verificações rápidas.
SELECT * FROM cadastros ORDER BY id;
