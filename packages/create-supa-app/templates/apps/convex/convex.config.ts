import { defineApp } from "convex/server";
import { supaComponent } from "@supa/convex";

const app = defineApp();

app.use(supaComponent);

export default app;
