-- Add image_url to products + create product-images storage bucket
-- (public, for CDN-served catalog images). Upload via server action
-- uploadProductImage in src/lib/actions/products.ts (extension).

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Storage bucket for product images (public, readable by anyone).
-- Safe re-run: ON CONFLICT DO NOTHING preserves existing bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;
