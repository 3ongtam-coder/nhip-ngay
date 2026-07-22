import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const syncStores = sqliteTable("sync_stores", {
  code: text("code").primaryKey(),
  data: text("data").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
