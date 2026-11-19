-- Development seed data for Cloudflare D1. Change the admin password after first login.
INSERT OR IGNORE INTO users (id, name, email, passwordHash, role, createdAt, updatedAt)
VALUES ('a308db94-605d-4485-8e4d-2f445e509d85', 'Admin', 'teesindiastore@gmail.com', '$2a$12$LSGXo699JJRnsB0MIUJFPOemRWwwV42D3fmWLCI63JY2bgPauxA1u', 'ADMIN', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO categories (id, name, slug, description, createdAt) VALUES
('aa86ae5a-d0d9-4003-a28d-895ecf654803', 'Men', 'men', 'Men''s clothing collection', datetime('now')),
('bbeff045-c67e-41db-a0cd-1e91a092332a', 'Women', 'women', 'Women''s clothing collection', datetime('now')),
('8997cbe0-171d-4a89-9fc8-e5023a49a66a', 'Oversized', 'oversized', 'Oversized streetwear', datetime('now')),
('6f5f9871-3b09-408e-b4ce-e5f733738d31', 'Accessories', 'accessories', 'Fashion accessories', datetime('now')),
('278efea8-6c0b-480e-8df8-2cb955eeee88', 'Hoodies', 'hoodies', 'Premium hoodies', datetime('now'));

INSERT OR IGNORE INTO products (id, name, slug, description, price, comparePrice, categoryId, stock, isFeatured, isActive, tags, material, careInstr, createdAt, updatedAt) VALUES
('981d6da0-4e24-4b76-9e56-0ca8d91e151f', 'Classic Black Tee', 'classic-black-tee', 'Premium quality classic black tee crafted from 100% combed cotton. Designed for comfort and style. Made in India.', 599, 799, 'aa86ae5a-d0d9-4003-a28d-895ecf654803', 50, 1, 1, 'tshirt,premium,india,cotton', '100% Combed Cotton, 180 GSM', 'Machine wash cold with similar colors.', datetime('now'), datetime('now')),
('bfd3f6f5-c824-4787-b907-e74627dbc991', 'Essential White Tee', 'essential-white-tee', 'Premium quality essential white tee crafted from 100% combed cotton. Designed for comfort and style. Made in India.', 599, 799, 'aa86ae5a-d0d9-4003-a28d-895ecf654803', 45, 1, 1, 'tshirt,premium,india,cotton', '100% Combed Cotton, 180 GSM', 'Machine wash cold with similar colors.', datetime('now'), datetime('now')),
('312d04be-a523-4a8d-bd0b-75da42f03468', 'Drop Shoulder Oversized', 'drop-shoulder-oversized', 'Premium oversized streetwear tee crafted from 100% combed cotton.', 899, 1299, '8997cbe0-171d-4a89-9fc8-e5023a49a66a', 25, 1, 1, 'tshirt,oversized,premium,india', '100% Combed Cotton, 240 GSM', 'Machine wash cold with similar colors.', datetime('now'), datetime('now'));

-- Backfill canonical integer paise values for seeded catalog prices.
UPDATE products
SET pricePaise = CAST(ROUND(price * 100) AS INTEGER),
    comparePricePaise = CASE WHEN comparePrice IS NULL THEN NULL ELSE CAST(ROUND(comparePrice * 100) AS INTEGER) END
WHERE pricePaise = 0;

INSERT OR IGNORE INTO product_variants (id, productId, size, color, stock, sku) VALUES
('9edb158a-cab5-4bb2-90e0-4a950ea26994', '981d6da0-4e24-4b76-9e56-0ca8d91e151f', 'S', 'Black', 10, 'CLASSIC-BLACK-S'),
('902e24f4-a295-444e-87c9-401e4f5ef4fe', '981d6da0-4e24-4b76-9e56-0ca8d91e151f', 'M', 'Black', 16, 'CLASSIC-BLACK-M'),
('7ba39537-74cf-40a8-aa76-ffc559ff1581', '981d6da0-4e24-4b76-9e56-0ca8d91e151f', 'L', 'Black', 16, 'CLASSIC-BLACK-L'),
('7919f2b3-02cc-4567-b809-3be3e5cc33c2', 'bfd3f6f5-c824-4787-b907-e74627dbc991', 'S', 'White', 9, 'ESSENTIAL-WHITE-S'),
('d199791b-d1b2-454e-b728-a086f7758622', 'bfd3f6f5-c824-4787-b907-e74627dbc991', 'M', 'White', 15, 'ESSENTIAL-WHITE-M'),
('6c0751b0-82bf-4ada-b217-ce1208d18a4a', '312d04be-a523-4a8d-bd0b-75da42f03468', 'M', 'Grey', 8, 'OVERSIZED-GREY-M');
