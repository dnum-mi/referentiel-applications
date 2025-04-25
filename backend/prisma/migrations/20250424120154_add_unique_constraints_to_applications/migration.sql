-- Create a compound unique index for label and description
CREATE UNIQUE INDEX "applications_label_description_unique" ON "applications" ("label", "description");