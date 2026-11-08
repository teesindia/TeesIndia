-- Reject any inventory update that would make stock negative. D1 rolls back
-- the whole batch when either trigger aborts a reservation batch.
CREATE TRIGGER IF NOT EXISTS products_stock_nonnegative
BEFORE UPDATE OF stock ON products
WHEN NEW.stock < 0
BEGIN
  SELECT RAISE(ABORT, 'INSUFFICIENT_PRODUCT_STOCK');
END;

CREATE TRIGGER IF NOT EXISTS variants_stock_nonnegative
BEFORE UPDATE OF stock ON product_variants
WHEN NEW.stock < 0
BEGIN
  SELECT RAISE(ABORT, 'INSUFFICIENT_VARIANT_STOCK');
END;
