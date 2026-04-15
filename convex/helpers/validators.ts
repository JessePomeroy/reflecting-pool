import { v } from "convex/values";

export const categoryValidator = v.union(v.literal("photography"), v.literal("web"));
