import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userStores = sqliteTable("user_stores", {
  ownerId: text("owner_id").primaryKey(),
  data: text("data").notNull().default("{}"),
  apiKey: text("api_key").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
