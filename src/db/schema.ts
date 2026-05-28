import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  note: text('note'),
  createdAt: text('created_at').notNull(),
});

export const inventory = sqliteTable('inventory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  stock: integer('stock').notNull(),
  price: real('price').notNull(), // The selling price per item
});