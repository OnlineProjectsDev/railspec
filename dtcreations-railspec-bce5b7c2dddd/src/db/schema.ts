// /db/schema.ts
import { pgTable, serial, varchar, boolean, timestamp, integer, text, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { FoundationType, PostsType } from "@/app/(rs)/drawingtool/canvas/DropAnalyser";
import type {
  EditorConfigState,
  FoundationPersistedState,
  BalustradePersistedState,
  JobStageDefaults,
} from "@/lib/editor-persistence/types";

type ShopDrawingRevisionFabricationSnapshot = {
  source?: {
    type?: string
    id?: string
    label?: string
  }
  capturedAt?: string
  rawPartsList?: unknown
  metadata?: Record<string, unknown>
}

type ShopDrawingRevisionSheetDetails = {
  title1?: string
  title2?: string
  title3?: string
  defaultScale?: string
  defaultColour?: string
  design?: string
  anchorage?: string
  toprail?: string
  infill?: string
  notes?: string
}

type ShopDrawingRevisionSheetEdits = {
  dimensionOffsets?: Record<string, number>
  hiddenDimensions?: string[]
  movedLabels?: Record<string, { x: number; y: number }>
  continuationSheet?: {
    enabled?: boolean
    page?: number
  }
  [key: string]: unknown
}

type ShopDrawingRevisionSheetSnapshot = {
  meta?: Record<string, unknown>
  plan?: Record<string, unknown>
  posts?: unknown[]
  panels?: unknown[]
  legend?: unknown[]
  editorBalconyState?: Record<string, unknown>
  [key: string]: unknown
}

export const customers = pgTable("customers", {
    id: serial("id").primaryKey(),
    company: varchar("company").notNull(),
    firstName: varchar("first_name").notNull(),
    lastName: varchar("last_name").notNull(),
    email: varchar("email").unique().notNull(),
    phone: varchar("phone").unique().notNull(),
    address1: varchar("address1").notNull(),
    address2: varchar("address2"),
    city: varchar("city").notNull(),
    state: varchar("state", { length: 3 }).notNull(),
    zip: varchar("zip", { length: 10 }).notNull(),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
})

export const tickets = pgTable("tickets", {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").notNull().references(() => customers.id),
    title: varchar("title").notNull(),
    description: text("description"),
    completed: boolean("completed").notNull().default(false),
    tech: varchar("tech").notNull().default("unassigned"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
})

type WindLoad = {
  bldg_height: number;
  wind_region: 'A' | 'B' | 'C' | 'D';
  terrain_category: number;
};

export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    job_number: integer("job_number").notNull(),
    stage: integer("stage").notNull().default(1),
    customerId:integer("customer_id").notNull().references(() => customers.id),
    project_status: integer("project_status").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
    address1: varchar("address1").notNull(),
    address2: varchar("address2"),
    city: varchar("city").notNull(),
    zip: varchar("zip", { length: 10 }).notNull(),
    measurer: varchar("measurer").notNull().default("unassigned"),
    height_default: integer("height_default").notNull().default(1020),
    design_default: varchar("design_default").notNull().default("RD-D1"),
    anchorage_default: varchar("anchorage_default").notNull().default("BP"),
    toprail_default: varchar("toprail_default").notNull().default("Elite"),
    infill_default: varchar("infill_default").notNull().default("6.38mm Clear Laminated"),
    max_height_default: integer("max_height_default").default(1200),
    max_post_spacing: integer("max_post_spacing").default(1280),
    wind_load: jsonb('wind_load').$type<WindLoad>().notNull().default({
      bldg_height: 30,
      wind_region: 'A',
      terrain_category: 2,
    }),
    notes: text("notes"),
    powdercoatColourId: integer("powdercoat_colour_id")
      .references(() => powdercoatColours.id),
    
},
  (t) => [
    uniqueIndex("uq_jobs_jobnum_stage").on(t.job_number, t.stage),
  ]
);

// Create relations 
export const customersRelations = relations(customers,
    ({ many }) => ({
        tickets: many(tickets),
        // jobs: many(jobs),
    })
)

export const ticketsRelations = relations(tickets,
    ({ one }) => ({
        customer: one(customers, {
            fields: [tickets.customerId],
            references: [customers.id],
        })
    })
)

export const jobStages = pgTable(
  "job_stages",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    stage: integer("stage").notNull(), // 1..8
    defaults: jsonb("defaults").$type<JobStageDefaults>().notNull().default({
      design_default: "RD-D1",
      anchorage_default: "BP",
      toprail_default: "Elite",
      infill_default: "6.38mm Clear Laminate",
      powdercoatColourId: null,
      wind_load: {
        bldg_height: 30,
        wind_region: "A",
        terrain_category: 2,
      },
      constraints: {
        minBarrierHeight: 1020,
        maxBarrierHeight: 1200,
        panelHeight: 950,
        maxPanelHeight: 1000,
        maxPostSpacing: 1280,
        maxBottomGap: 100,
        minPostLength: 1020,
        laserLevelY: 0,
        topY: 1020,
      },
      template: {
        preset: "default-rectangular",
      },
    }),
    status: varchar("status").notNull().default("draft"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),

  },
  (t) => [
    uniqueIndex("uq_job_stages_job_stage").on(t.jobId, t.stage),
    index("idx_job_stages_job").on(t.jobId),
  ]
);

export const jobStagesRelations = relations(jobStages, ({ one, many }) => ({
  job: one(jobs, { fields: [jobStages.jobId], references: [jobs.id] }),
  balconies: many(balconies), // legacy
  editorBalconies: many(editorBalconies), // defined below
  shopDrawingRevisions: many(shopDrawingRevisions),
}));

/** =========================
 *  balconies
 *  Editable rows per stage
 *  ========================= */
export const balconies = pgTable(
  "balconies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    jobStageId: integer("job_stage_id").notNull().references(() => jobStages.id, { onDelete: "cascade" }),
    drop: varchar("drop").notNull().default("A"),
    balconyNo: varchar("balcony_no").notNull(), // Use level if possible
    sortOrder: integer("sort_order").notNull().default(0),
    color: jsonb("color").notNull().default({"hex":0xAAAAAA, "name":"TBD"}),
    foundationArray: jsonb("foundation_array")
      .$type<FoundationType[]>()                 // <-- TypeScript type for convenience
      .notNull()
      .default(sql`'[]'::jsonb`),               // <-- empty JSON array by default
    postsArray: jsonb("posts_array")
      .$type<PostsType[]>()                 // <-- TypeScript type for convenience
      .notNull()
      .default(sql`'[]'::jsonb`),               // <-- empty JSON array by default
    foundationArrayRaw: jsonb("foundation_array_raw")
      .$type<FoundationType[]>()                 // <-- TypeScript type for convenience
      .notNull()
      .default(sql`'[]'::jsonb`),               // <-- empty JSON array by default
    postsArrayRaw: jsonb("posts_array_raw")
      .$type<PostsType[]>()                 // <-- TypeScript type for convenience
      .notNull()
      .default(sql`'[]'::jsonb`),               // <-- empty JSON array by default
    heightMm: integer("height_mm").default(1020),
    panelMm: integer("panel_mm").default(1020),
    fflMm: integer("ffl_mm").default(0),
    ffl_use: boolean("ffl_use").default(false),
    design: varchar("design").default("RD-D1"),
    anchorage: varchar("anchorage").default("BP"),
    toprail: varchar("toprail").default("Elite"),
    infill: varchar("infill").default("6.38mm Clear Laminated"),
    metadata: jsonb("metadata").notNull().default({}),
    notes: text("notes"),

    // edit-heavy support
    version: integer("version").notNull().default(1),
    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("uq_stage_balcony_no").on(t.jobStageId, t.balconyNo),
    index("idx_balconies_job").on(t.jobId),
    index("idx_balconies_stage").on(t.jobStageId),
    index("idx_balconies_job_stage_no").on(t.jobId, t.jobStageId, t.balconyNo),
  ]
);

export const balconiesRelations = relations(balconies, ({ one }) => ({
  job: one(jobs, { fields: [balconies.jobId], references: [jobs.id] }),
  jobStage: one(jobStages, { fields: [balconies.jobStageId], references: [jobStages.id] }),
}));

export const editorBalconies = pgTable(
  "editor_balconies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    jobStageId: integer("job_stage_id").notNull().references(() => jobStages.id, { onDelete: "cascade" }),

    drop: varchar("drop").notNull().default("A"),
    balconyNo: varchar("balcony_no").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),

    notes: text("notes"),
    geometryNotes: text("geometry_notes"),

    version: integer("version").notNull().default(1),
    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("uq_editor_stage_drop_balcony_active")
      .on(t.jobStageId, t.drop, t.balconyNo)
      .where(sql`${t.isDeleted} = false`),
    index("idx_editor_balconies_job").on(t.jobId),
    index("idx_editor_balconies_stage").on(t.jobStageId),
    index("idx_editor_balconies_job_stage_no").on(t.jobId, t.jobStageId, t.balconyNo),
  ]
);

export const editorBalconiesRelations = relations(editorBalconies, ({ one, many }) => ({
  job: one(jobs, { fields: [editorBalconies.jobId], references: [jobs.id] }),
  jobStage: one(jobStages, { fields: [editorBalconies.jobStageId], references: [jobStages.id] }),
  editorState: many(balconyEditorState),
  editorRevisions: many(balconyEditorRevisions),
}));

export const shopDrawingRevisions = pgTable(
  "shop_drawing_revisions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),

    jobStageId: integer("job_stage_id")
      .notNull()
      .references(() => jobStages.id, { onDelete: "cascade" }),

    revisionCode: varchar("revision_code").notNull(), // A, B, C...
    notes: text("notes"),

    isCurrent: boolean("is_current").notNull().default(true),

    fabricationSnapshot: jsonb("fabrication_snapshot")
      .$type<ShopDrawingRevisionFabricationSnapshot | null>()
      .default(null),

    createdBy: varchar("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("uq_shop_drawing_revision_stage_code").on(t.jobStageId, t.revisionCode),
    index("idx_shop_drawing_revisions_job").on(t.jobId),
    index("idx_shop_drawing_revisions_stage").on(t.jobStageId),
    index("idx_shop_drawing_revisions_current").on(t.jobStageId, t.isCurrent),
  ]
)

export const shopDrawingRevisionsRelations = relations(shopDrawingRevisions, ({ one, many }) => ({
  job: one(jobs, {
    fields: [shopDrawingRevisions.jobId],
    references: [jobs.id],
  }),
  jobStage: one(jobStages, {
    fields: [shopDrawingRevisions.jobStageId],
    references: [jobStages.id],
  }),
  sheets: many(shopDrawingRevisionSheets),
}))

export const shopDrawingRevisionSheets = pgTable(
  "shop_drawing_revision_sheets",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    revisionId: integer("revision_id")
      .notNull()
      .references(() => shopDrawingRevisions.id, { onDelete: "cascade" }),

    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),

    jobStageId: integer("job_stage_id")
      .notNull()
      .references(() => jobStages.id, { onDelete: "cascade" }),

    editorBalconyId: integer("editor_balcony_id")
      .references(() => editorBalconies.id, { onDelete: "set null" }),

    sheetKey: varchar("sheet_key").notNull(),   // e.g. "A-1", "A-1-P2", "summary-1"
    sheetType: varchar("sheet_type").notNull().default("balcony"), // balcony | continuation | summary | fabrication
    sheetOrder: integer("sheet_order").notNull().default(0),

    sheetDetails: jsonb("sheet_details")
      .$type<ShopDrawingRevisionSheetDetails>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    sheetEdits: jsonb("sheet_edits")
      .$type<ShopDrawingRevisionSheetEdits>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    sourceSnapshot: jsonb("source_snapshot")
      .$type<ShopDrawingRevisionSheetSnapshot>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("uq_shop_drawing_revision_sheet_key")
      .on(t.revisionId, t.sheetKey)
      .where(sql`${t.isDeleted} = false`),

    index("idx_shop_drawing_revision_sheets_revision").on(t.revisionId),
    index("idx_shop_drawing_revision_sheets_stage").on(t.jobStageId),
    index("idx_shop_drawing_revision_sheets_editor_balcony").on(t.editorBalconyId),
    index("idx_shop_drawing_revision_sheets_order").on(t.revisionId, t.sheetOrder),
  ]
)

export const shopDrawingRevisionSheetsRelations = relations(shopDrawingRevisionSheets, ({ one }) => ({
  revision: one(shopDrawingRevisions, {
    fields: [shopDrawingRevisionSheets.revisionId],
    references: [shopDrawingRevisions.id],
  }),
  job: one(jobs, {
    fields: [shopDrawingRevisionSheets.jobId],
    references: [jobs.id],
  }),
  jobStage: one(jobStages, {
    fields: [shopDrawingRevisionSheets.jobStageId],
    references: [jobStages.id],
  }),
  editorBalcony: one(editorBalconies, {
    fields: [shopDrawingRevisionSheets.editorBalconyId],
    references: [editorBalconies.id],
  }),
}))

export const balconyEditorState = pgTable(
  "balcony_editor_state",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    editorBalconyId: integer("editor_balcony_id").notNull().references(() => editorBalconies.id, { onDelete: "cascade" }),
    jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    jobStageId: integer("job_stage_id").notNull().references(() => jobStages.id, { onDelete: "cascade" }),

    editorConfig: jsonb("editor_config").$type<EditorConfigState>().notNull(),
    foundationState: jsonb("foundation_state").$type<FoundationPersistedState>().notNull(),
    balustradeState: jsonb("balustrade_state").$type<BalustradePersistedState>().notNull(),

    version: integer("version").notNull().default(1),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("uq_balcony_editor_state_editor_balcony").on(t.editorBalconyId),
    index("idx_balcony_editor_state_job").on(t.jobId),
    index("idx_balcony_editor_state_stage").on(t.jobStageId),
  ]
);

export const balconyEditorStateRelations = relations(balconyEditorState, ({ one }) => ({
  editorBalcony: one(editorBalconies, { fields: [balconyEditorState.editorBalconyId], references: [editorBalconies.id] }),
  job: one(jobs, { fields: [balconyEditorState.jobId], references: [jobs.id] }),
  jobStage: one(jobStages, { fields: [balconyEditorState.jobStageId], references: [jobStages.id] }),
}));

export const balconyEditorRevisions = pgTable(
  "balcony_editor_revisions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    editorBalconyId: integer("editor_balcony_id").notNull().references(() => editorBalconies.id, { onDelete: "cascade" }),
    jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    jobStageId: integer("job_stage_id").notNull().references(() => jobStages.id, { onDelete: "cascade" }),

    editorConfig: jsonb("editor_config").$type<EditorConfigState>().notNull(),
    foundationState: jsonb("foundation_state").$type<FoundationPersistedState>().notNull(),
    balustradeState: jsonb("balustrade_state").$type<BalustradePersistedState>().notNull(),

    version: integer("version").notNull(),
    changedBy: varchar("changed_by"),
    changedAt: timestamp("changed_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_balcony_editor_revisions_editor_balcony").on(t.editorBalconyId),
    index("idx_balcony_editor_revisions_stage").on(t.jobStageId),
  ]
);

export const balconyEditorRevisionsRelations = relations(balconyEditorRevisions, ({ one }) => ({
  editorBalcony: one(editorBalconies, { fields: [balconyEditorRevisions.editorBalconyId], references: [editorBalconies.id] }),
  job: one(jobs, { fields: [balconyEditorRevisions.jobId], references: [jobs.id] }),
  jobStage: one(jobStages, { fields: [balconyEditorRevisions.jobStageId], references: [jobStages.id] }),
}));

/** =========================
 *  balcony_revisions (optional)
 *  Full audit trail of edits
 *  ========================= */
export const balconyRevisions = pgTable(
  "balcony_revisions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    balconyId: integer("balcony_id").notNull().references(() => balconies.id, { onDelete: "cascade" }),
    jobId: integer("job_id").notNull(),
    jobStageId: integer("job_stage_id").notNull(),
    version: integer("version").notNull(),
    data: jsonb("data").notNull(),        // snapshot of editable columns
    changedBy: varchar("changed_by"),     // user/email if available
    changedAt: timestamp("changed_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_balcony_revisions_balcony").on(t.balconyId),
    index("idx_balcony_revisions_stage").on(t.jobStageId),
  ]
);


export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),

  // Kinde’s unique identifier (email-based)
  // This allows a direct 1:1 mapping between Kinde user and employee row
  kindeUserId: varchar("kinde_user_id").notNull().unique(),

  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),

  // Mirrors Kinde role: 'manager' | 'employee' | 'user'
  role: varchar("role").notNull(),

  // Soft activation/deactivation of staff inside your app
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// Optional relations placeholder (expand later)
export const employeesRelations = relations(employees, ({}) => ({}));


export const powdercoatColours = pgTable("powdercoat_colours", {
  id: serial("id").primaryKey(),

  code: varchar("code").notNull().unique(),          // manufacturer or internal code
  name: varchar("name").notNull(),
  hex: varchar("hex", { length: 7 }).notNull(),      // #RRGGBB

  finishType: varchar("finish_type"),                // Gloss, Satin, Matt, Textured
  range: varchar("range"),                           // Duralloy, Interpon D1000, Custom, etc.
  supplier: varchar("supplier"),                     // Dulux, Interpon, etc.

  imageUrl: varchar("image_url"),                    // swatch preview
  textureUrl: varchar("texture_url"),                // for 3D model

  // Installation / environmental
  exteriorRating: boolean("exterior_rating").notNull().default(true),
  interiorOnly: boolean("interior_only").notNull().default(false),
  marineRating: boolean("marine_rating").notNull().default(false),

  // Warranty
  warrantyYears: integer("warranty_years").notNull().default(0),

  // Pricing / catalogue
  costGroup: varchar("cost_group").notNull().default("standard"), // standard | premium | custom
  isCustomOrder: boolean("is_custom_order").notNull().default(false),

  isDefault: boolean("is_default").notNull().default(false),      // aluminium milled

  // Compatibility rules
  allowedDesigns: jsonb("allowed_designs").$type<string[] | null>().default(null),
  allowedInfillTypes: jsonb("allowed_infill_types").$type<string[] | null>().default(null),
  allowedToprails: jsonb("allowed_toprails").$type<string[] | null>().default(null),
  allowedAnchorages: jsonb("allowed_anchorages").$type<string[] | null>().default(null),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const devlogEntries = pgTable(
  "devlog_entries",
  {
    id: serial("id").primaryKey(),

    // "release" | "issue" | "feature"
    type: varchar("type", { length: 20 }).notNull(),

    // Shared fields
    title: varchar("title", { length: 200 }).notNull(),
    summary: varchar("summary", { length: 500 }),
    body: text("body"),

    // Status varies by type:
    // release: draft|published
    // issue: open|investigating|workaround_available|fixed|wontfix
    // feature: under_consideration|planned|in_progress|shipped|dropped
    status: varchar("status", { length: 40 }).notNull().default("draft"),

    // Priority: 0..3 (P0..P3) OR 1..4; pick one convention and stick to it.
    // Using 0..3 here:
    priority: integer("priority").notNull().default(2),

    // Pin critical items (e.g., P0 issue) to top of lists
    isPinned: boolean("is_pinned").notNull().default(false),

    // Visibility control:
    // - null => draft/internal/unpublished
    // - set => visible on page
    publishedAt: timestamp("published_at"),

    // Versioning / applicability
    // For releases: the release version (e.g. "1.7.0")
    // For issues: "fixedInVersion" can use version as well, and affectedVersions contains impacted versions/ranges.
    version: varchar("version", { length: 30 }),

    // Known issues: affected versions. Keep simple and queryable.
    // Example: ["1.6.0", "1.6.1", "1.6.2"]
    // If you prefer ranges later, add affectedVersionRange string too.
    affectedVersions: jsonb("affected_versions").$type<string[] | null>().default(null),

    // Planned features: optional target version/milestone
    targetVersion: varchar("target_version", { length: 30 }),

    // Optional tags for filtering/search UI
    tags: jsonb("tags").$type<string[] | null>().default(null),

    // Optional: store who edited it (email/kinde id) - safe to add later
    createdBy: varchar("created_by", { length: 255 }),
    updatedBy: varchar("updated_by", { length: 255 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("idx_devlog_entries_type").on(t.type),
    index("idx_devlog_entries_status").on(t.status),
    index("idx_devlog_entries_published_at").on(t.publishedAt),
    index("idx_devlog_entries_updated_at").on(t.updatedAt),
    index("idx_devlog_entries_version").on(t.version),
    index("idx_devlog_entries_pinned").on(t.isPinned),
  ]
);

export const devlogLinks = pgTable(
  "devlog_links",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id").notNull().references(() => devlogEntries.id, { onDelete: "cascade" }),

    // UI label e.g. "Docs", "Workaround", "Video"
    label: varchar("label", { length: 80 }).notNull(),

    url: varchar("url", { length: 2048 }).notNull(),

    // optional: "docs" | "video" | "ticket" | "pr" | "external"
    kind: varchar("kind", { length: 30 }),

    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("idx_devlog_links_entry").on(t.entryId),
    index("idx_devlog_links_sort").on(t.sortOrder),
  ]
);

export const devlogEntriesRelations = relations(devlogEntries, ({ many }) => ({
  links: many(devlogLinks),
}));

export const devlogLinksRelations = relations(devlogLinks, ({ one }) => ({
  entry: one(devlogEntries, { fields: [devlogLinks.entryId], references: [devlogEntries.id] }),
}));