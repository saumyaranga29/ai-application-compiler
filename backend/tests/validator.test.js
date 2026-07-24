import test from "node:test";
import assert from "node:assert";
import { validateSchema } from "../validator.js";

// Helper dummy schema
const createValidSchema = () => ({
  appName: "Test CRM",
  description: "A test crm app",
  roles: ["admin", "agent"],
  dbSchema: {
    tables: [
      {
        name: "contacts",
        fields: [
          { name: "id", type: "integer", primaryKey: true, autoIncrement: true },
          { name: "name", type: "string" }
        ]
      }
    ]
  },
  apiSchema: {
    endpoints: [
      {
        path: "/api/contacts",
        method: "GET",
        description: "Get contacts",
        allowedRoles: ["admin", "agent"],
        dbOperation: { type: "SELECT", table: "contacts" }
      },
      {
        path: "/api/contacts",
        method: "POST",
        description: "Create contact",
        allowedRoles: ["admin"],
        dbOperation: { type: "INSERT", table: "contacts", fields: ["name"] }
      }
    ]
  },
  uiSchema: {
    layout: {
      theme: "dark",
      navigation: [
        { label: "Contacts", icon: "Users", targetPage: "contacts", allowedRoles: ["admin", "agent"] }
      ]
    },
    pages: [
      {
        id: "contacts",
        title: "Contacts Page",
        components: [
          {
            id: "contacts-table",
            type: "crud-table",
            dataSource: "/api/contacts",
            columns: ["id", "name"],
            actions: {
              create: { method: "POST", endpoint: "/api/contacts" }
            }
          }
        ]
      }
    ]
  },
  authSchema: {
    roles: {
      admin: { permissions: ["*"] }
    },
    gating: {
      premium: { gatedPages: ["contacts"] }
    }
  },
  logicSchema: {
    rules: []
  }
});

test("Validator Rules Engine - Valid Schema succeeds", () => {
  const schema = createValidSchema();
  const res = validateSchema(schema);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.errors.length, 0);
});

test("Validator Rules Engine - Catches missing top level key", () => {
  const schema = createValidSchema();
  delete schema.uiSchema;
  const res = validateSchema(schema);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('Missing required top-level configuration key: "uiSchema"')));
});

test("Validator Rules Engine - Catches empty roles array", () => {
  const schema = createValidSchema();
  schema.roles = [];
  const res = validateSchema(schema);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes("Roles configuration must be a non-empty array of strings")));
});

test("Validator Rules Engine - Catches missing primary key in db table", () => {
  const schema = createValidSchema();
  schema.dbSchema.tables[0].fields[0].primaryKey = false;
  const res = validateSchema(schema);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('Database table "contacts" is missing a primaryKey field.')));
});

test("Validator Rules Engine - Catches API endpoints mapping to undefined DB table", () => {
  const schema = createValidSchema();
  schema.apiSchema.endpoints[0].dbOperation.table = "nonexistent";
  const res = validateSchema(schema);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('references undefined database table "nonexistent"')));
});

test("Validator Rules Engine - Catches UI Component referencing undefined GET API endpoint", () => {
  const schema = createValidSchema();
  schema.uiSchema.pages[0].components[0].dataSource = "/api/nonexistent";
  const res = validateSchema(schema);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('specifies dataSource "/api/nonexistent" but no GET API endpoint matches this path')));
});

test("Validator Rules Engine - Catches UI Component CRUD action referencing undefined API endpoint", () => {
  const schema = createValidSchema();
  schema.uiSchema.pages[0].components[0].actions.create.endpoint = "/api/nonexistent";
  const res = validateSchema(schema);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('references API') && e.includes('POST /api/nonexistent')));
});

test("Validator Rules Engine - Catches auth gating targeting undefined page", () => {
  const schema = createValidSchema();
  schema.authSchema.gating.premium.gatedPages = ["nonexistent"];
  const res = validateSchema(schema);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('gates page "nonexistent" which is not defined in uiSchema.pages')));
});
