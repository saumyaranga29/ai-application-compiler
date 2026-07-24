# Intermediate Representation (IR) Specification

This document details the schema format of the compiler payloads passed between stages in the compilation pipeline.

---

## Stage 1: Intent Extraction IR

Extracts the raw user requirements into structured intentions, target audience, core features, primary roles, and documented assumptions.

### JSON Schema Structure
```json
{
  "appName": "string",
  "description": "string",
  "targetAudience": "string",
  "features": ["string"],
  "roles": ["string"],
  "entities": ["string"],
  "assumptions": ["string"]
}
```

---

## Stage 2: System Design IR

Formulates the application architecture. Bridges logical concepts into concrete tables, routes, pages, and system permission bounds.

### JSON Schema Structure
```json
{
  "pages": [
    {
      "id": "string",
      "title": "string",
      "allowedRoles": ["string"]
    }
  ],
  "dbEntities": [
    {
      "name": "string",
      "fields": [
        {
          "name": "string",
          "type": "string",
          "primaryKey": "boolean",
          "nullable": "boolean"
        }
      ]
    }
  ],
  "apiEndpoints": [
    {
      "path": "string",
      "method": "GET | POST | PUT | DELETE",
      "description": "string",
      "allowedRoles": ["string"],
      "dbOperation": {
        "type": "SELECT | INSERT | UPDATE | DELETE",
        "table": "string",
        "fields": ["string"]
      }
    }
  ],
  "authPermissions": {
    "role_name": {
      "permissions": ["string"]
    }
  },
  "businessRules": [
    {
      "ruleId": "string",
      "description": "string"
    }
  ]
}
```

---

## Stage 3 & 4: Full System Schema IR

Compiles and refines the architectural parameters into a final executable package. This JSON represents the complete specification of the application, which is read and executed by the React Runtime Sandbox simulator.

### JSON Schema Structure
```json
{
  "appName": "string",
  "description": "string",
  "roles": ["string"],
  "dbSchema": {
    "tables": [
      {
        "name": "string",
        "fields": [
          {
            "name": "string",
            "type": "string",
            "primaryKey": "boolean",
            "autoIncrement": "boolean",
            "nullable": "boolean"
          }
        ]
      }
    ]
  },
  "apiSchema": {
    "endpoints": [
      {
        "path": "string",
        "method": "GET | POST | PUT | DELETE",
        "description": "string",
        "allowedRoles": ["string"],
        "dbOperation": {
          "type": "SELECT | INSERT | UPDATE | DELETE",
          "table": "string"
        },
        "response": {
          "status": 200 | 201
        }
      }
    ]
  },
  "uiSchema": {
    "layout": {
      "theme": "light | dark | glass-dark | glass-light",
      "navigation": [
        {
          "label": "string",
          "icon": "LayoutDashboard | Users | BarChart3 | CreditCard | Shield | Sliders | Database",
          "targetPage": "string",
          "allowedRoles": ["string"]
        }
      ]
    },
    "pages": [
      {
        "id": "string",
        "title": "string",
        "components": [
          {
            "id": "string",
            "type": "stats-grid | table | crud-table | chart | form",
            "title": "string",
            "dataSource": "string",
            "columns": ["string"],
            "actions": {
              "create": { "method": "POST", "endpoint": "string" },
              "delete": { "method": "DELETE", "endpoint": "string" }
            }
          }
        ]
      }
    ]
  },
  "authSchema": {
    "roles": {
      "role_name": {
        "permissions": ["string"]
      }
    },
    "gating": {
      "premium": {
        "gatedPages": ["string"],
        "message": "string"
      }
    }
  },
  "logicSchema": {
    "rules": [
      {
        "ruleId": "string",
        "description": "string"
      }
    ]
  }
}
```
