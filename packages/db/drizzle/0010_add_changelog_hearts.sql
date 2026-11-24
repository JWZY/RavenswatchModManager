-- Match databases managed with db:push as well as migration-only installs.
CREATE TABLE IF NOT EXISTS "changelog_hearts" (
  "entry_key" varchar(96) NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  PRIMARY KEY ("entry_key", "user_id")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "changelog_hearts_user_idx" ON "changelog_hearts" ("user_id");
