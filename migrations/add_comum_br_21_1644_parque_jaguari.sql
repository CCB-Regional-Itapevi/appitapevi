-- Inclui a comum Parque Jaguari no cadastro central usado pelo modulo de Visitas.
-- Idempotente: pode ser executada novamente sem criar registros duplicados.
INSERT INTO public.comum (comum, cidade)
SELECT
    'BR-21-1644 - PARQUE JAGUARI',
    'SANTANA DE PARNAÍBA'
WHERE NOT EXISTS (
    SELECT 1
    FROM public.comum
    WHERE UPPER(TRIM(comum)) LIKE 'BR-21-1644%'
);

