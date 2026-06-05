/**
 * Static Validation Engine for AI App Compiler
 * Checks cross-layer consistency and structural validity.
 */
export function validateSchema(schema) {
  const errors = [];

  if (!schema || typeof schema !== 'object') {
    return { valid: false, errors: ['Output is not a valid JSON object'] };
  }

  // 1. Check Top-Level Keys
  const requiredTopKeys = ['appName', 'description', 'roles', 'dbSchema', 'apiSchema', 'uiSchema', 'authSchema', 'logicSchema'];
  for (const key of requiredTopKeys) {
    if (schema[key] === undefined) {
      errors.push(`Missing required top-level configuration key: "${key}"`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Extract layers
  const { appName, roles, dbSchema, apiSchema, uiSchema, authSchema, logicSchema } = schema;

  // 2. Roles Validation
  if (!Array.isArray(roles) || roles.length === 0) {
    errors.push('Roles configuration must be a non-empty array of strings.');
  }
  const roleSet = new Set(roles || []);

  // 3. Database Schema Validation
  const dbTablesMap = new Map(); // name -> Set of fields
  if (!dbSchema || !Array.isArray(dbSchema.tables)) {
    errors.push('Database schema (dbSchema.tables) must be an array.');
  } else {
    for (const table of dbSchema.tables) {
      if (!table.name || typeof table.name !== 'string') {
        errors.push('Database tables must have a valid string name.');
        continue;
      }
      if (!Array.isArray(table.fields) || table.fields.length === 0) {
        errors.push(`Database table "${table.name}" must have a non-empty array of fields.`);
        continue;
      }
      
      const fieldsSet = new Set();
      let hasPrimaryKey = false;

      for (const field of table.fields) {
        if (!field.name || typeof field.name !== 'string') {
          errors.push(`Field in table "${table.name}" is missing a valid string name.`);
          continue;
        }
        if (!field.type || typeof field.type !== 'string') {
          errors.push(`Field "${field.name}" in table "${table.name}" is missing a valid type.`);
        }
        if (field.primaryKey) {
          hasPrimaryKey = true;
        }
        fieldsSet.add(field.name);
      }

      if (!hasPrimaryKey) {
        errors.push(`Database table "${table.name}" is missing a primaryKey field.`);
      }
      dbTablesMap.set(table.name, fieldsSet);
    }
  }

  // 4. API Schema Validation
  const getEndpoints = new Set(); // path
  const postEndpoints = new Set(); // path
  const deleteEndpoints = new Set(); // path
  const putEndpoints = new Set(); // path

  if (!apiSchema || !Array.isArray(apiSchema.endpoints)) {
    errors.push('API schema (apiSchema.endpoints) must be an array.');
  } else {
    for (const endpoint of apiSchema.endpoints) {
      if (!endpoint.path || typeof endpoint.path !== 'string') {
        errors.push('API endpoint is missing a valid path string.');
        continue;
      }
      const method = (endpoint.method || '').toUpperCase();
      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
        errors.push(`API endpoint "${endpoint.path}" has an invalid method "${method}". Must be GET, POST, PUT, or DELETE.`);
      }

      // Catalog endpoints
      if (method === 'GET') getEndpoints.add(endpoint.path);
      if (method === 'POST') postEndpoints.add(endpoint.path);
      if (method === 'PUT') putEndpoints.add(endpoint.path);
      if (method === 'DELETE') deleteEndpoints.add(endpoint.path);

      // Verify roles in API endpoints
      if (Array.isArray(endpoint.allowedRoles)) {
        for (const r of endpoint.allowedRoles) {
          if (!roleSet.has(r)) {
            errors.push(`API endpoint "${method} ${endpoint.path}" references undefined role "${r}".`);
          }
        }
      }

      // Verify dbOperation mapping
      if (endpoint.dbOperation) {
        const { type, table, fields } = endpoint.dbOperation;
        if (!['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(type)) {
          errors.push(`API endpoint "${method} ${endpoint.path}" has invalid dbOperation type "${type}".`);
        }
        if (!dbTablesMap.has(table)) {
          errors.push(`API endpoint "${method} ${endpoint.path}" references undefined database table "${table}".`);
        } else if (fields && Array.isArray(fields)) {
          const tableFields = dbTablesMap.get(table);
          for (const f of fields) {
            if (!tableFields.has(f)) {
              errors.push(`API endpoint "${method} ${endpoint.path}" dbOperation references undefined field "${f}" in table "${table}".`);
            }
          }
        }
      }
    }
  }

  // 5. UI Schema Validation
  const uiPageIds = new Set();
  if (!uiSchema || !Array.isArray(uiSchema.pages)) {
    errors.push('UI schema (uiSchema.pages) must be an array.');
  } else {
    // Check Navigation targets
    if (uiSchema.layout && Array.isArray(uiSchema.layout.navigation)) {
      for (const nav of uiSchema.layout.navigation) {
        if (nav.allowedRoles) {
          for (const r of nav.allowedRoles) {
            if (!roleSet.has(r)) {
              errors.push(`UI Sidebar navigation "${nav.label}" references undefined role "${r}".`);
            }
          }
        }
      }
    }

    for (const page of uiSchema.pages) {
      if (!page.id || typeof page.id !== 'string') {
        errors.push('UI page is missing a valid id.');
        continue;
      }
      uiPageIds.add(page.id);

      if (!Array.isArray(page.components)) {
        errors.push(`UI page "${page.id}" components must be an array.`);
        continue;
      }

      for (const component of page.components) {
        if (!component.id) {
          errors.push(`Component in page "${page.id}" is missing a unique id.`);
        }
        
        // Check dataSource endpoints
        if (component.dataSource) {
          if (!getEndpoints.has(component.dataSource)) {
            errors.push(`UI Component "${component.id}" in page "${page.id}" specifies dataSource "${component.dataSource}" but no GET API endpoint matches this path.`);
          }
        }

        // Check CRUD actions endpoints
        if (component.actions) {
          for (const [actionName, actionDetails] of Object.entries(component.actions)) {
            const actPath = actionDetails.endpoint;
            const actMethod = (actionDetails.method || '').toUpperCase();
            if (!actPath) {
              errors.push(`UI Component "${component.id}" action "${actionName}" is missing an endpoint path.`);
              continue;
            }

            let pathExists = false;
            if (actMethod === 'POST' && postEndpoints.has(actPath)) pathExists = true;
            if (actMethod === 'PUT' && putEndpoints.has(actPath)) pathExists = true;
            if (actMethod === 'DELETE' && deleteEndpoints.has(actPath)) pathExists = true;
            if (actMethod === 'GET' && getEndpoints.has(actPath)) pathExists = true;

            if (!pathExists) {
              errors.push(`UI Component "${component.id}" action "${actionName}" references API "${actMethod} ${actPath}" but no such endpoint is defined in apiSchema.`);
            }
          }
        }
      }
    }

    // Verify nav targets map to defined pages
    if (uiSchema.layout && Array.isArray(uiSchema.layout.navigation)) {
      for (const nav of uiSchema.layout.navigation) {
        if (!uiPageIds.has(nav.targetPage)) {
          errors.push(`UI Sidebar navigation targets page "${nav.targetPage}" which is not defined in uiSchema.pages.`);
        }
      }
    }
  }

  // 6. Auth Schema Validation
  if (authSchema) {
    if (authSchema.roles) {
      for (const r of Object.keys(authSchema.roles)) {
        if (!roleSet.has(r)) {
          errors.push(`Auth schema contains rules for undefined role "${r}".`);
        }
      }
    }
    if (authSchema.gating) {
      for (const [gateName, gate] of Object.entries(authSchema.gating)) {
        if (Array.isArray(gate.gatedPages)) {
          for (const pageId of gate.gatedPages) {
            if (!uiPageIds.has(pageId)) {
              errors.push(`Auth gating rule "${gateName}" gates page "${pageId}" which is not defined in uiSchema.pages.`);
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
