import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@supa/convex/auth";
{{SCHEMA_IMPORT_LINE}}
const schema = defineSchema({
  ...authTables,
{{SCHEMA_SPREAD_LINES}}
  // Add your app-specific tables here
  // example: defineTable({
  //   name: v.string(),
  //   userId: v.id("users"),
  // }).index("by_user", ["userId"]),
});

export default schema;
