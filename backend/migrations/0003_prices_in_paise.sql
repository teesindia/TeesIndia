-- Keep the existing rupee columns during a compatibility period, while adding
-- integer paise columns as the canonical values used by checkout and reports.
ALTER TABLE products ADD COLUMN pricePaise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN comparePricePaise INTEGER;
ALTER TABLE orders ADD COLUMN totalAmountPaise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN pricePaise INTEGER NOT NULL DEFAULT 0;

UPDATE products
SET pricePaise = CAST(ROUND(price * 100) AS INTEGER),
    comparePricePaise = CASE
      WHEN comparePrice IS NULL THEN NULL
      ELSE CAST(ROUND(comparePrice * 100) AS INTEGER)
    END;

UPDATE orders
SET totalAmountPaise = CAST(ROUND(totalAmount * 100) AS INTEGER);

UPDATE order_items
SET pricePaise = CAST(ROUND(price * 100) AS INTEGER);
