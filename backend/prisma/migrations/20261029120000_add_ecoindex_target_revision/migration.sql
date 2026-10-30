ALTER TABLE "Compliance" ADD COLUMN "eco_index_target_revision" INTEGER NOT NULL DEFAULT 0;

CREATE FUNCTION increment_ecoindex_target_revision() RETURNS trigger AS $$
BEGIN
  IF NEW.eco_index_target_url IS DISTINCT FROM OLD.eco_index_target_url THEN
    NEW.eco_index_target_revision := OLD.eco_index_target_revision + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compliance_ecoindex_target_revision
BEFORE UPDATE ON "Compliance"
FOR EACH ROW EXECUTE FUNCTION increment_ecoindex_target_revision();
