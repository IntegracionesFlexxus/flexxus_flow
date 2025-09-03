# 🔒 Row-Level Security (RLS) Implementation

## 📋 Overview

Row-Level Security (RLS) has been fully implemented in the Flexxus Flow database to ensure complete data isolation between companies (multi-tenancy). This implementation follows PostgreSQL best practices and Sprint 1 requirements.

## ✅ What Was Implemented

### 1. RLS Functions (005_setup_rls_functions.sql)
- `get_current_user_id()` - Gets current user from session context
- `get_current_company_id()` - Gets current company from session context
- `is_company_admin()` - Checks if user is admin of company
- `user_belongs_to_company()` - Verifies user membership
- `get_user_role_in_company()` - Returns user's role
- `has_permission()` - Checks specific permissions

### 2. RLS Policies (006_enable_rls_tables.sql)
Policies implemented for all core tables:

#### Companies Table
- **SELECT**: Users see only companies they belong to
- **INSERT**: Only during registration or super admins
- **UPDATE**: Only company admins can update
- **DELETE**: Only super admins can delete

#### Users Table  
- **SELECT**: Users see their profile and company members
- **INSERT**: Public registration or company admins
- **UPDATE**: Own profile or admins update company users
- **DELETE**: Only super admins

#### User_Companies Table
- **SELECT**: Own relationships or company relationships (admins)
- **INSERT**: Admins add users to their company
- **UPDATE**: Admins update or users accept invitations
- **DELETE**: Admins remove or users leave (except last admin)

### 3. Contacts Table RLS (007_rls_contacts_table.sql)
- Isolated by company_id
- Users see only their company's contacts
- Special case: assigned contacts visible across companies

### 4. Automatic Triggers (008_automatic_timestamps.sql)
- `updated_at` automatic update on all tables
- Soft delete handling with data cleanup
- Email uniqueness validation
- Ensure at least one admin per company

### 5. Node.js Integration
- **RLSContext** class for setting session context
- **BaseRepositoryRLS** with automatic RLS handling
- **RLSQueries** helper for common operations
- **RLSTestHelper** for verification

## 🚀 How to Use

### 1. Apply RLS Migrations

```bash
# Make script executable
chmod +x database/scripts/apply-rls.sh

# Run RLS setup
cd database/scripts
./apply-rls.sh
```

### 2. Test RLS Implementation

```bash
# Run RLS tests
cd database
node test-rls.js
```

### 3. Use in Backend Code

#### Basic Usage with Context

```javascript
const { RLSContext } = require('./database/config/rls-context');
const pool = require('./database/config/database');

// Execute query with RLS context
const result = await RLSContext.withContext(
  pool,
  userId,
  companyId,
  async (client) => {
    // All queries here automatically filtered by RLS
    const users = await client.query('SELECT * FROM users');
    return users.rows;
  }
);
```

#### Using BaseRepositoryRLS

```javascript
const BaseRepositoryRLS = require('./database/repositories/BaseRepositoryRLS');

class UserRepository extends BaseRepositoryRLS {
  constructor(pool) {
    super(pool, 'users');
  }
}

// Usage
const userRepo = new UserRepository(pool);
const context = { userId: 'xxx', companyId: 'yyy' };

// All operations automatically apply RLS
const user = await userRepo.findById(id, context);
const users = await userRepo.findAll(context);
const newUser = await userRepo.create(userData, context);
```

#### Express Middleware Integration

```javascript
const { RLSContext } = require('./database/config/rls-context');

// Add to Express app
app.use(RLSContext.middleware(pool));

// In routes
app.get('/api/users', async (req, res) => {
  // Use req.withRLSContext for automatic context
  const users = await req.withRLSContext(async (client) => {
    const result = await client.query('SELECT * FROM users');
    return result.rows;
  });
  
  res.json(users);
});
```

## 🔐 Security Guarantees

### What RLS Prevents:
1. ❌ Cross-company data access
2. ❌ Unauthorized data modification
3. ❌ Data leakage between tenants
4. ❌ Privilege escalation
5. ❌ Viewing users from other companies

### What RLS Allows:
1. ✅ Users see only their company data
2. ✅ Admins manage their company users
3. ✅ Users update their own profiles
4. ✅ Proper role-based access control
5. ✅ Safe multi-company operations

## 🧪 Testing RLS

### Manual Testing

```sql
-- Set context for testing
SET app.current_user_id = '11111111-2222-2222-2222-222222222222';
SET app.current_company_id = '11111111-1111-1111-1111-111111111111';

-- This will only show data from company 11111111-1111-1111-1111-111111111111
SELECT * FROM companies;
SELECT * FROM users;
```

### Automated Testing

The `test-rls.js` script tests:
- ✅ RLS enabled on all tables
- ✅ Company isolation
- ✅ User isolation  
- ✅ Repository with RLS
- ✅ Cross-company access prevention

## 📊 Performance Considerations

### Indexes Created for RLS:
```sql
-- Companies
idx_companies_status
idx_companies_plan

-- Users
idx_users_email_active
idx_users_status

-- User_Companies
idx_user_companies_user_id
idx_user_companies_company_id
idx_user_companies_default

-- Contacts
idx_contacts_company_id_active
idx_contacts_assigned_user
```

### Performance Tips:
1. Always include company_id in WHERE clauses when possible
2. Use connection pooling to reuse RLS contexts
3. Batch operations within single transactions
4. Monitor slow queries with `pg_stat_statements`

## ⚠️ Important Notes

### 1. Context Must Be Set
RLS policies only work when context is set. Without context, queries return no data (fail-safe).

### 2. Super Admin Bypass
Email addresses `admin@flexxus.com` and `superadmin@flexxus.com` have special privileges in policies.

### 3. Public Operations
Registration and login don't require context (UUID `00000000-0000-0000-0000-000000000000`).

### 4. Transaction Scope
RLS context is transaction-scoped. Always use transactions for multi-query operations.

## 🔧 Troubleshooting

### Problem: Queries return no data
**Solution**: Ensure context is set properly
```javascript
await RLSContext.setContext(client, userId, companyId);
```

### Problem: User can see data from other companies
**Solution**: Verify RLS is enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Problem: Performance degradation
**Solution**: Check query plans
```sql
EXPLAIN ANALYZE SELECT * FROM users;
```

## 📝 Migration Rollback

If needed to disable RLS:

```sql
-- Disable RLS on tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS companies_select_policy ON companies;
-- ... repeat for all policies

-- Drop functions
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS get_current_company_id();
-- ... repeat for all functions
```

## 🚦 Checklist

- [x] RLS functions created
- [x] RLS enabled on all tables
- [x] Policies created for all operations
- [x] Automatic timestamps triggers
- [x] Node.js integration helpers
- [x] Test suite implemented
- [x] Documentation complete

## 📚 References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-tenant Best Practices](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATTERNS)
- [Performance Tuning RLS](https://www.postgresql.org/docs/current/performance-tips.html)

---

**Implementation Date**: 2025-09-03
**Sprint**: Sprint 1 - Database Team
**Status**: ✅ Complete and Tested