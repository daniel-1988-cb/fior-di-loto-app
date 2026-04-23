-- URL diretto alla pagina recensioni Google Business (es. https://g.page/r/.../review).
-- Usato dalla landing /recensione/[token] per reindirizzare i cliente con rating
-- 4-5 stelle sulla recensione pubblica.
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS google_review_url TEXT;
