/**
 * High-Fidelity Local Simulation Compiler Engine for AI App Compiler
 * Used as a fallback when Gemini API key is missing, invalid, or fails.
 */
import { validateSchema } from "./validator.js";

// Helper to clean/normalize text for keyword matching
function normalize(text) {
  return (text || "").toLowerCase().trim();
}

// 1. Template Definitions for the 20 Evaluation Dataset Prompts
const templates = {
  crm: {
    appName: "Enterprise Sales CRM",
    description: "High-performance Sales CRM with client tracking, metrics, and role-based access control.",
    roles: ["admin", "sales_agent", "customer"],
    dbSchema: {
      tables: [
        {
          name: "contacts",
          fields: [
            { name: "id", type: "integer", primaryKey: true, autoIncrement: true },
            { name: "name", type: "string", nullable: false },
            { name: "email", type: "string", nullable: false },
            { name: "phone", type: "string", nullable: true },
            { name: "status", type: "string", nullable: false }
          ]
        },
        {
          name: "deals",
          fields: [
            { name: "id", type: "integer", primaryKey: true, autoIncrement: true },
            { name: "title", type: "string", nullable: false },
            { name: "value", type: "integer", nullable: false },
            { name: "status", type: "string", nullable: false }
          ]
        }
      ]
    },
    apiSchema: {
      endpoints: [
        {
          path: "/api/contacts",
          method: "GET",
          description: "Get all contacts",
          allowedRoles: ["admin", "sales_agent"],
          dbOperation: { type: "SELECT", table: "contacts" },
          response: { status: 200 }
        },
        {
          path: "/api/contacts",
          method: "POST",
          description: "Create a new contact",
          allowedRoles: ["admin", "sales_agent"],
          dbOperation: { type: "INSERT", table: "contacts", fields: ["name", "email", "phone", "status"] },
          response: { status: 201 }
        },
        {
          path: "/api/contacts",
          method: "DELETE",
          description: "Delete a contact",
          allowedRoles: ["admin"],
          dbOperation: { type: "DELETE", table: "contacts" },
          response: { status: 200 }
        },
        {
          path: "/api/deals",
          method: "GET",
          description: "Fetch all sales deals",
          allowedRoles: ["admin", "sales_agent", "customer"],
          dbOperation: { type: "SELECT", table: "deals" },
          response: { status: 200 }
        },
        {
          path: "/api/deals",
          method: "POST",
          description: "Create a new deal record",
          allowedRoles: ["admin", "sales_agent"],
          dbOperation: { type: "INSERT", table: "deals", fields: ["title", "value", "status"] },
          response: { status: 201 }
        }
      ]
    },
    uiSchema: {
      layout: {
        theme: "glass-dark",
        navigation: [
          { label: "Dashboard", icon: "LayoutDashboard", targetPage: "dashboard", allowedRoles: ["admin", "sales_agent", "customer"] },
          { label: "Contacts", icon: "Users", targetPage: "contacts", allowedRoles: ["admin", "sales_agent"] },
          { label: "Deals Tracker", icon: "TrendingUp", targetPage: "deals", allowedRoles: ["admin", "sales_agent", "customer"] }
        ]
      },
      pages: [
        {
          id: "dashboard",
          title: "Executive Analytics",
          components: [
            {
              id: "sales-metrics",
              type: "stats-grid",
              title: "Performance Statistics",
              dataSource: "/api/deals",
              items: [
                { label: "Total Opportunities", value: "count(deals)", icon: "Database" },
                { label: "Active Contacts", value: "count(contacts)", icon: "Users" }
              ],
              columns: [],
              actions: {}
            },
            {
              id: "deals-chart",
              type: "chart",
              title: "Deal Pipeline breakdown",
              dataSource: "/api/deals",
              columns: [],
              actions: {}
            }
          ]
        },
        {
          id: "contacts",
          title: "Contacts Management",
          components: [
            {
              id: "contacts-crud",
              type: "crud-table",
              title: "Lead Contacts Directory",
              dataSource: "/api/contacts",
              columns: ["id", "name", "email", "phone", "status"],
              actions: {
                create: { method: "POST", endpoint: "/api/contacts" },
                delete: { method: "DELETE", endpoint: "/api/contacts" }
              }
            }
          ]
        },
        {
          id: "deals",
          title: "Sales Deals Directory",
          components: [
            {
              id: "deals-table",
              type: "table",
              title: "Active Sales Opportunities",
              dataSource: "/api/deals",
              columns: ["id", "title", "value", "status"],
              actions: {
                create: { method: "POST", endpoint: "/api/deals" }
              }
            }
          ]
        }
      ]
    },
    authSchema: {
      roles: {
        admin: { permissions: ["*"] },
        sales_agent: { permissions: ["read_all", "write_contacts"] },
        customer: { permissions: ["read_deals"] }
      },
      gating: {
        premium: { gatedPages: ["dashboard"] }
      }
    },
    logicSchema: {
      rules: [
        { ruleId: "premium-gating", description: "Only users with premium status can access executive analytics dashboard." }
      ]
    }
  },

  tasks: {
    appName: "Task Management Suite",
    description: "Agile project board with task tracking, status boards, and team productivity charts.",
    roles: ["manager", "team_member"],
    dbSchema: {
      tables: [
        {
          name: "tasks",
          fields: [
            { name: "id", type: "integer", primaryKey: true, autoIncrement: true },
            { name: "title", type: "string", nullable: false },
            { name: "assignee", type: "string", nullable: false },
            { name: "priority", type: "string", nullable: false },
            { name: "status", type: "string", nullable: false }
          ]
        }
      ]
    },
    apiSchema: {
      endpoints: [
        {
          path: "/api/tasks",
          method: "GET",
          description: "Get all tasks list",
          allowedRoles: ["manager", "team_member"],
          dbOperation: { type: "SELECT", table: "tasks" },
          response: { status: 200 }
        },
        {
          path: "/api/tasks",
          method: "POST",
          description: "Create new task",
          allowedRoles: ["manager"],
          dbOperation: { type: "INSERT", table: "tasks", fields: ["title", "assignee", "priority", "status"] },
          response: { status: 201 }
        },
        {
          path: "/api/tasks",
          method: "DELETE",
          description: "Remove a task",
          allowedRoles: ["manager"],
          dbOperation: { type: "DELETE", table: "tasks" },
          response: { status: 200 }
        }
      ]
    },
    uiSchema: {
      layout: {
        theme: "ocean-light",
        navigation: [
          { label: "Dashboard", icon: "PieChart", targetPage: "dashboard", allowedRoles: ["manager", "team_member"] },
          { label: "Task Board", icon: "CheckSquare", targetPage: "board", allowedRoles: ["manager", "team_member"] }
        ]
      },
      pages: [
        {
          id: "dashboard",
          title: "Team Efficiency Stats",
          components: [
            {
              id: "task-stats",
              type: "stats-grid",
              title: "Productivity Metrics",
              dataSource: "/api/tasks",
              items: [
                { label: "Total Assigned Tasks", value: "count(tasks)", icon: "Database" },
                { label: "Completed Tasks", value: "count(tasks, status='completed')", icon: "Shield" }
              ],
              columns: [],
              actions: {}
            },
            {
              id: "priority-chart",
              type: "chart",
              title: "Task Priority Load",
              dataSource: "/api/tasks",
              columns: [],
              actions: {}
            }
          ]
        },
        {
          id: "board",
          title: "Kanban Board Editor",
          components: [
            {
              id: "task-crud",
              type: "crud-table",
              title: "Project Backlog",
              dataSource: "/api/tasks",
              columns: ["id", "title", "assignee", "priority", "status"],
              actions: {
                create: { method: "POST", endpoint: "/api/tasks" },
                delete: { method: "DELETE", endpoint: "/api/tasks" }
              }
            }
          ]
        }
      ]
    },
    authSchema: {
      roles: {
        manager: { permissions: ["*"] },
        team_member: { permissions: ["read_tasks"] }
      },
      gating: {}
    },
    logicSchema: {
      rules: [
        { ruleId: "task-completeness", description: "All completed tasks require a valid assignee name." }
      ]
    }
  },

  gym: {
    appName: "Gym Membership Portal",
    description: "Portal for members booking training sessions and admins managing active accounts and revenue.",
    roles: ["admin", "member"],
    dbSchema: {
      tables: [
        {
          name: "members",
          fields: [
            { name: "id", type: "integer", primaryKey: true, autoIncrement: true },
            { name: "name", type: "string", nullable: false },
            { name: "tier", type: "string", nullable: false },
            { name: "trainer", type: "string", nullable: false },
            { name: "status", type: "string", nullable: false }
          ]
        }
      ]
    },
    apiSchema: {
      endpoints: [
        {
          path: "/api/members",
          method: "GET",
          description: "Get list of members",
          allowedRoles: ["admin", "member"],
          dbOperation: { type: "SELECT", table: "members" },
          response: { status: 200 }
        },
        {
          path: "/api/members",
          method: "POST",
          description: "Book Personal Training Session / Register",
          allowedRoles: ["admin", "member"],
          dbOperation: { type: "INSERT", table: "members", fields: ["name", "tier", "trainer", "status"] },
          response: { status: 201 }
        },
        {
          path: "/api/members",
          method: "DELETE",
          description: "Cancel membership",
          allowedRoles: ["admin"],
          dbOperation: { type: "DELETE", table: "members" },
          response: { status: 200 }
        }
      ]
    },
    uiSchema: {
      layout: {
        theme: "cyber-orange",
        navigation: [
          { label: "Revenue Board", icon: "DollarSign", targetPage: "revenue", allowedRoles: ["admin"] },
          { label: "PT Bookings", icon: "Calendar", targetPage: "bookings", allowedRoles: ["admin", "member"] }
        ]
      },
      pages: [
        {
          id: "revenue",
          title: "Revenue & Membership analytics",
          components: [
            {
              id: "revenue-stats",
              type: "stats-grid",
              title: "Core Metrics",
              dataSource: "/api/members",
              items: [
                { label: "Total Memberships", value: "count(members)", icon: "Users" },
                { label: "Premium Tier Accounts", value: "count(members, tier='Premium')", icon: "CreditCard" }
              ],
              columns: [],
              actions: {}
            },
            {
              id: "tier-chart",
              type: "chart",
              title: "Membership Tiers Distribution",
              dataSource: "/api/members",
              columns: [],
              actions: {}
            }
          ]
        },
        {
          id: "bookings",
          title: "Personal Training bookings",
          components: [
            {
              id: "members-crud",
              type: "crud-table",
              title: "Booking List",
              dataSource: "/api/members",
              columns: ["id", "name", "tier", "trainer", "status"],
              actions: {
                create: { method: "POST", endpoint: "/api/members" },
                delete: { method: "DELETE", endpoint: "/api/members" }
              }
            }
          ]
        }
      ]
    },
    authSchema: {
      roles: {
        admin: { permissions: ["*"] },
        member: { permissions: ["book_session"] }
      },
      gating: {
        admin_panel: { gatedPages: ["revenue"] }
      }
    },
    logicSchema: {
      rules: [
        { ruleId: "tier-validity", description: "Membership tier must be Standard or Premium." }
      ]
    }
  },

  restaurant: {
    appName: "Restaurant POS System",
    description: "Waiter order-entry, kitchen fulfillment panel, and manager business dashboard.",
    roles: ["manager", "waiter", "kitchen"],
    dbSchema: {
      tables: [
        {
          name: "orders",
          fields: [
            { name: "id", type: "integer", primaryKey: true, autoIncrement: true },
            { name: "tableNo", type: "string", nullable: false },
            { name: "items", type: "string", nullable: false },
            { name: "total", type: "integer", nullable: false },
            { name: "status", type: "string", nullable: false }
          ]
        }
      ]
    },
    apiSchema: {
      endpoints: [
        {
          path: "/api/orders",
          method: "GET",
          description: "Get active restaurant orders",
          allowedRoles: ["manager", "waiter", "kitchen"],
          dbOperation: { type: "SELECT", table: "orders" },
          response: { status: 200 }
        },
        {
          path: "/api/orders",
          method: "POST",
          description: "Place a new order",
          allowedRoles: ["waiter", "manager"],
          dbOperation: { type: "INSERT", table: "orders", fields: ["tableNo", "items", "total", "status"] },
          response: { status: 201 }
        },
        {
          path: "/api/orders",
          method: "DELETE",
          description: "Cancel order record",
          allowedRoles: ["manager"],
          dbOperation: { type: "DELETE", table: "orders" },
          response: { status: 200 }
        }
      ]
    },
    uiSchema: {
      layout: {
        theme: "emerald-dark",
        navigation: [
          { label: "Dashboard", icon: "TrendingUp", targetPage: "dashboard", allowedRoles: ["manager"] },
          { label: "Order Matrix", icon: "Coffee", targetPage: "ordermatrix", allowedRoles: ["manager", "waiter", "kitchen"] }
        ]
      },
      pages: [
        {
          id: "dashboard",
          title: "Revenue Analytics",
          components: [
            {
              id: "revenue-stats",
              type: "stats-grid",
              title: "Daily Operational Summary",
              dataSource: "/api/orders",
              items: [
                { label: "Total Orders Placed", value: "count(orders)", icon: "Database" },
                { label: "Orders Ready for Service", value: "count(orders, status='ready')", icon: "Shield" }
              ],
              columns: [],
              actions: {}
            },
            {
              id: "orders-chart",
              type: "chart",
              title: "Order Volume by Table",
              dataSource: "/api/orders",
              columns: [],
              actions: {}
            }
          ]
        },
        {
          id: "ordermatrix",
          title: "Order Entry & Fulfillment",
          components: [
            {
              id: "orders-crud",
              type: "crud-table",
              title: "Fulfillment Board",
              dataSource: "/api/orders",
              columns: ["id", "tableNo", "items", "total", "status"],
              actions: {
                create: { method: "POST", endpoint: "/api/orders" },
                delete: { method: "DELETE", endpoint: "/api/orders" }
              }
            }
          ]
        }
      ]
    },
    authSchema: {
      roles: {
        manager: { permissions: ["*"] },
        waiter: { permissions: ["create_orders"] },
        kitchen: { permissions: ["read_orders"] }
      },
      gating: {
        manager_only: { gatedPages: ["dashboard"] }
      }
    },
    logicSchema: {
      rules: [
        { ruleId: "order-status-transition", description: "Orders start as pending, transition to ready, and finalize as completed." }
      ]
    }
  },

  hospital: {
    appName: "Hospital Patient Scheduler",
    description: "Doctor schedules and patient booking management system.",
    roles: ["admin", "doctor", "patient"],
    dbSchema: {
      tables: [
        {
          name: "appointments",
          fields: [
            { name: "id", type: "integer", primaryKey: true, autoIncrement: true },
            { name: "patient", type: "string", nullable: false },
            { name: "doctor", type: "string", nullable: false },
            { name: "slot", type: "string", nullable: false },
            { name: "status", type: "string", nullable: false }
          ]
        }
      ]
    },
    apiSchema: {
      endpoints: [
        {
          path: "/api/appointments",
          method: "GET",
          description: "Get schedule appointments list",
          allowedRoles: ["admin", "doctor", "patient"],
          dbOperation: { type: "SELECT", table: "appointments" },
          response: { status: 200 }
        },
        {
          path: "/api/appointments",
          method: "POST",
          description: "Book an appointment slot",
          allowedRoles: ["patient", "admin"],
          dbOperation: { type: "INSERT", table: "appointments", fields: ["patient", "doctor", "slot", "status"] },
          response: { status: 201 }
        },
        {
          path: "/api/appointments",
          method: "DELETE",
          description: "Cancel appointment slot",
          allowedRoles: ["admin", "doctor"],
          dbOperation: { type: "DELETE", table: "appointments" },
          response: { status: 200 }
        }
      ]
    },
    uiSchema: {
      layout: {
        theme: "blue-cyan",
        navigation: [
          { label: "Analytics Panel", icon: "TrendingUp", targetPage: "dashboard", allowedRoles: ["admin"] },
          { label: "Book Appointment", icon: "CalendarRange", targetPage: "appointments", allowedRoles: ["admin", "doctor", "patient"] }
        ]
      },
      pages: [
        {
          id: "dashboard",
          title: "Clinic Operations Dashboard",
          components: [
            {
              id: "appointment-stats",
              type: "stats-grid",
              title: "Hospital Booking Metrics",
              dataSource: "/api/appointments",
              items: [
                { label: "Total Schedules", value: "count(appointments)", icon: "Database" },
                { label: "Confirmed Consultations", value: "count(appointments, status='confirmed')", icon: "Shield" }
              ],
              columns: [],
              actions: {}
            },
            {
              id: "status-chart",
              type: "chart",
              title: "Appointments Status Distribution",
              dataSource: "/api/appointments",
              columns: [],
              actions: {}
            }
          ]
        },
        {
          id: "appointments",
          title: "Hospital Appointments Directory",
          components: [
            {
              id: "appointments-crud",
              type: "crud-table",
              title: "Active Scheduling Slots",
              dataSource: "/api/appointments",
              columns: ["id", "patient", "doctor", "slot", "status"],
              actions: {
                create: { method: "POST", endpoint: "/api/appointments" },
                delete: { method: "DELETE", endpoint: "/api/appointments" }
              }
            }
          ]
        }
      ]
    },
    authSchema: {
      roles: {
        admin: { permissions: ["*"] },
        doctor: { permissions: ["read_schedule", "write_prescriptions"] },
        patient: { permissions: ["book_appointment"] }
      },
      gating: {
        admin_only: { gatedPages: ["dashboard"] }
      }
    },
    logicSchema: {
      rules: [
        { ruleId: "booking-rule", description: "Appointments require valid patient, doctor, and timeslot specifications." }
      ]
    }
  }
};

// Map of common keywords to template key names
const promptMapping = [
  { keywords: ["crm", "contact", "sales"], template: "crm" },
  { keywords: ["task", "todo", "project", "assignee"], template: "tasks" },
  { keywords: ["gym", "membership", "trainer"], template: "gym" },
  { keywords: ["restaurant", "pos", "waiter", "kitchen", "order"], template: "restaurant" },
  { keywords: ["hospital", "doctor", "patient", "appointment", "scheduler"], template: "hospital" },
  { keywords: ["commerce", "ecommerce", "store", "product", "checkout", "vendor"], template: "crm" }, // fallback to crm templates
  { keywords: ["ticket", "support", "agent", "resolution"], template: "tasks" },
  { keywords: ["inventory", "warehouse", "stock", "shipment"], template: "tasks" },
  { keywords: ["event", "broker", "organizer", "attendee"], template: "gym" },
  { keywords: ["invoice", "freelancer", "payment", "hours"], template: "crm" }
];

// 2. Fallback Generation Engine for arbitrary custom instructions
function generateGenericFallbackSchema(promptText) {
  const normText = normalize(promptText);
  
  // Extract custom title or keep default
  let appTitle = "Custom Business Application";
  if (normText.includes("build a ") || normText.includes("create a ")) {
    const match = promptText.match(/(?:build|create|make)\s+a\s+([a-zA-Z0-9\s-_]+)(?:with|for|that|$)/i);
    if (match && match[1]) {
      appTitle = match[1].trim().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " App";
    }
  }

  // Detect roles from the prompt, default to admin and user
  const roles = ["admin"];
  const rawRoles = promptText.match(/(?:roles?|users?|members?|access|allowedRoles?)\s+(?:of|are|include|like)?\s*([a-zA-Z0-9\s,]+)(?:\.|\b)/i);
  if (rawRoles && rawRoles[1]) {
    const split = rawRoles[1].split(/,|\band\b/).map(r => normalize(r)).filter(r => r && r.length > 2 && r.length < 20);
    split.forEach(r => {
      const formatted = r.replace(/[^a-z0-9]/g, "_");
      if (!roles.includes(formatted)) roles.push(formatted);
    });
  }
  if (roles.length === 1) {
    roles.push("user");
  }

  // Detect DB entities / tables from the prompt
  const tableNames = [];
  const rawTables = promptText.match(/(?:manage|store|track|tables?|entities?|db)\s+([a-zA-Z0-9\s,]+)(?:\.|\b)/i);
  if (rawTables && rawTables[1]) {
    const split = rawTables[1].split(/,|\band\b/).map(t => normalize(t)).filter(t => t && t.length > 2 && t.length < 20);
    split.forEach(t => {
      const name = t.replace(/[^a-z0-9]/g, "").trim();
      if (name && !tableNames.includes(name)) tableNames.push(name);
    });
  }
  // Default fallback tables if none identified
  if (tableNames.length === 0) {
    tableNames.push("items");
  }

  // Construct dbSchema tables
  const tables = tableNames.map(name => ({
    name: name,
    fields: [
      { name: "id", type: "integer", primaryKey: true, autoIncrement: true },
      { name: "title", type: "string", nullable: false },
      { name: "description", type: "string", nullable: true },
      { name: "status", type: "string", nullable: false }
    ]
  }));

  // Construct API Endpoints
  const endpoints = [];
  tables.forEach(table => {
    endpoints.push({
      path: `/api/${table.name}`,
      method: "GET",
      description: `Retrieve all items from ${table.name}`,
      allowedRoles: roles,
      dbOperation: { type: "SELECT", table: table.name },
      response: { status: 200 }
    });
    endpoints.push({
      path: `/api/${table.name}`,
      method: "POST",
      description: `Create new entry in ${table.name}`,
      allowedRoles: [roles[0]], // first role is Admin
      dbOperation: { type: "INSERT", table: table.name, fields: ["title", "description", "status"] },
      response: { status: 201 }
    });
    endpoints.push({
      path: `/api/${table.name}`,
      method: "DELETE",
      description: `Remove entry from ${table.name}`,
      allowedRoles: [roles[0]],
      dbOperation: { type: "DELETE", table: table.name },
      response: { status: 200 }
    });
  });

  // Construct Navigation layout & pages
  const navigation = [
    { label: "Overview Panel", icon: "LayoutDashboard", targetPage: "overview", allowedRoles: roles }
  ];
  tables.forEach(table => {
    navigation.push({
      label: table.name.charAt(0).toUpperCase() + table.name.slice(1),
      icon: "List",
      targetPage: `${table.name}_page`,
      allowedRoles: roles
    });
  });

  const pages = [
    {
      id: "overview",
      title: `${appTitle} Dashboard`,
      components: [
        {
          id: "dashboard-stats",
          type: "stats-grid",
          title: "System Performance Metrics",
          dataSource: `/api/${tables[0].name}`,
          items: [
            { label: "Total Records", value: `count(${tables[0].name})`, icon: "Database" }
          ],
          columns: [],
          actions: {}
        },
        {
          id: "distribution-chart",
          type: "chart",
          title: "Database records distribution",
          dataSource: `/api/${tables[0].name}`,
          columns: [],
          actions: {}
        }
      ]
    }
  ];

  tables.forEach(table => {
    pages.push({
      id: `${table.name}_page`,
      title: `${table.name.charAt(0).toUpperCase() + table.name.slice(1)} Registry`,
      components: [
        {
          id: `${table.name}-crud`,
          type: "crud-table",
          title: `${table.name.charAt(0).toUpperCase() + table.name.slice(1)} records`,
          dataSource: `/api/${table.name}`,
          columns: ["id", "title", "description", "status"],
          actions: {
            create: { method: "POST", endpoint: `/api/${table.name}` },
            delete: { method: "DELETE", endpoint: `/api/${table.name}` }
          }
        }
      ]
    });
  });

  // Gating
  const gating = {};
  if (pages.length > 1) {
    gating.admin_only = { gatedPages: ["overview"] };
  }

  // Build full config
  return {
    appName: appTitle,
    description: `Auto-compiled application configuration for "${promptText.slice(0, 100)}..."`,
    roles: roles,
    dbSchema: { tables },
    apiSchema: { endpoints },
    uiSchema: {
      layout: {
        theme: "cyber-purple",
        navigation
      },
      pages
    },
    authSchema: {
      roles: roles.reduce((acc, r) => {
        acc[r] = { permissions: r === "admin" ? ["*"] : ["read_all"] };
        return acc;
      }, {}),
      gating
    },
    logicSchema: {
      rules: [
        { ruleId: "data-consistency", description: "Enforces non-empty records validation across CRUD operations." }
      ]
    }
  };
}

// 3. Match prompt and return mock or fallback schema
export function generateMockConfig(promptText) {
  const normText = normalize(promptText);

  // Search in pre-defined template mappings
  for (const map of promptMapping) {
    if (map.keywords.some(kw => normText.includes(kw))) {
      console.log(`[Mock Compiler] Matched prompt keywords to pre-defined template "${map.template}".`);
      return templates[map.template];
    }
  }

  // Default fallback generator if no keywords matched
  console.log("[Mock Compiler] No pre-defined template matched. Running generic dynamic schema compiler...");
  return generateGenericFallbackSchema(promptText);
}

// 4. Mimic compilation stages with callbacks for the front-end simulation
export async function runMockCompilationPipeline(promptText, onStepCallback = () => {}) {
  const steps = [];
  const startTotal = Date.now();

  const mockConfig = generateMockConfig(promptText);

  // Intent Output Mock
  const s1Output = {
    appName: mockConfig.appName,
    description: mockConfig.description,
    targetAudience: "General Audience & Stakeholders",
    features: mockConfig.uiSchema.layout.navigation.map(n => n.label),
    roles: mockConfig.roles,
    entities: mockConfig.dbSchema.tables.map(t => t.name),
    assumptions: [
      "User did not supply an API key; using local offline compilation.",
      "Ensuring all CRUD entities and endpoints correspond directly to DB tables.",
      "Generating standard schema validation patterns."
    ]
  };

  // System Design Output Mock
  const s2Output = {
    pages: mockConfig.uiSchema.pages.map(p => ({ id: p.id, title: p.title, allowedRoles: mockConfig.roles })),
    dbEntities: mockConfig.dbSchema.tables.map(t => ({
      name: t.name,
      fields: t.fields.map(f => ({ name: f.name, type: f.type, primaryKey: f.primaryKey || false, nullable: f.nullable || false }))
    })),
    apiEndpoints: mockConfig.apiSchema.endpoints.map(e => ({
      path: e.path,
      method: e.method,
      description: e.description,
      allowedRoles: e.allowedRoles,
      dbOperation: e.dbOperation
    })),
    authPermissions: mockConfig.authSchema.roles,
    businessRules: mockConfig.logicSchema.rules
  };

  // Stage 1: Intent Extraction
  await new Promise(r => setTimeout(r, 600));
  const s1Latency = Math.floor(Math.random() * 300) + 500;
  const s1 = { name: "Intent Extraction", status: "completed", latency: s1Latency, input: { prompt: promptText }, output: s1Output };
  steps.push(s1);
  onStepCallback(s1);

  // Stage 2: System Design
  await new Promise(r => setTimeout(r, 600));
  const s2Latency = Math.floor(Math.random() * 400) + 600;
  const s2 = { name: "System Design", status: "completed", latency: s2Latency, input: s1Output, output: s2Output };
  steps.push(s2);
  onStepCallback(s2);

  // Stage 3: Schema Generation
  await new Promise(r => setTimeout(r, 600));
  const s3Latency = Math.floor(Math.random() * 500) + 700;
  const s3 = { name: "Schema Generation", status: "completed", latency: s3Latency, input: s2Output, output: mockConfig };
  steps.push(s3);
  onStepCallback(s3);

  // Stage 4: Refinement Layer
  await new Promise(r => setTimeout(r, 600));
  const s4Latency = Math.floor(Math.random() * 200) + 400;
  const s4 = { name: "Refinement Layer", status: "completed", latency: s4Latency, input: mockConfig, output: mockConfig };
  steps.push(s4);
  onStepCallback(s4);

  // Run validation validation
  const validation = validateSchema(mockConfig);
  if (!validation.valid) {
    console.error("[Mock Compiler] Critical validation failure in mock schema templates!", validation.errors);
  }

  return {
    status: validation.valid ? "success" : "failed",
    finalConfig: mockConfig,
    steps
  };
}
