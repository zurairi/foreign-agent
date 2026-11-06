import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const runs = sqliteTable('runs', { seq:integer('seq').primaryKey({autoIncrement:true}), runId:text('run_id').notNull().unique(), body:text('body').notNull() });
export const items = sqliteTable('items', { itemId:text('item_id').primaryKey(), body:text('body').notNull() });
export const analyses = sqliteTable('analyses', { runId:text('run_id').primaryKey(), body:text('body').notNull() });
export const settings = sqliteTable('settings', { key:text('key').primaryKey(), body:text('body').notNull() });
export const leases = sqliteTable('leases', { key:text('key').primaryKey(), token:text('token').notNull(), expires:integer('expires').notNull() });
