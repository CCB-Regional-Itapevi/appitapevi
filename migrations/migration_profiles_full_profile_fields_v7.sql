-- Migration v7: Comprehensive Profile Fields
-- Adiciona todos os campos necessários para a tela de Perfil do Usuário.
-- Esta migração resolve o erro: "Could not find the 'bairro' column of 'profiles' in the schema cache"

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS cargo TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS comum TEXT,
    ADD COLUMN IF NOT EXISTS municipio TEXT,
    ADD COLUMN IF NOT EXISTS cidade TEXT,
    ADD COLUMN IF NOT EXISTS telefone TEXT,
    ADD COLUMN IF NOT EXISTS celular TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp TEXT,
    ADD COLUMN IF NOT EXISTS cep TEXT,
    ADD COLUMN IF NOT EXISTS logradouro_numero TEXT,
    ADD COLUMN IF NOT EXISTS endereco TEXT,
    ADD COLUMN IF NOT EXISTS complemento TEXT,
    ADD COLUMN IF NOT EXISTS bairro TEXT;

-- Comentários para documentação no banco de dados
COMMENT ON COLUMN public.profiles.full_name IS 'Nome completo do usuário.';
COMMENT ON COLUMN public.profiles.comum IS 'Nome da congregação comum do usuário.';
COMMENT ON COLUMN public.profiles.municipio IS 'Município da comum (preenchido automaticamente).';
COMMENT ON COLUMN public.profiles.cidade IS 'Cidade de residência do usuário (redundante para compatibilidade).';
COMMENT ON COLUMN public.profiles.telefone IS 'Telefone fixo de contato.';
COMMENT ON COLUMN public.profiles.celular IS 'Telefone celular de contato.';
COMMENT ON COLUMN public.profiles.whatsapp IS 'Número de WhatsApp para contato.';
COMMENT ON COLUMN public.profiles.cep IS 'CEP do endereço residencial.';
COMMENT ON COLUMN public.profiles.logradouro_numero IS 'Rua e número do endereço.';
COMMENT ON COLUMN public.profiles.endereco IS 'Campo de endereço (redundante para compatibilidade).';
COMMENT ON COLUMN public.profiles.complemento IS 'Complemento do endereço (casa, bloco, apto).';
COMMENT ON COLUMN public.profiles.bairro IS 'Bairro do endereço residencial.';
