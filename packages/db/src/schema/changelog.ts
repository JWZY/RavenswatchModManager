import { index, pgTable, primaryKey, text, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const changelogHearts = pgTable(
  'changelog_hearts',
  {
    entryKey: varchar('entry_key', { length: 96 }).notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entryKey, table.userId] }),
    userIdx: index('changelog_hearts_user_idx').on(table.userId),
  }),
);
