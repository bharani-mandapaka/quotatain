-- Add contacts cache fields to companies table
ALTER TABLE "companies" ADD COLUMN "contacts" JSONB;
ALTER TABLE "companies" ADD COLUMN "contactsFetchedAt" TIMESTAMP(3);
