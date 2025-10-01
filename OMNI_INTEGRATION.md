# 🔗 CRM-Omni Integration Guide

## Overview

This document describes the real-time integration between the CRM and Omnichannel modules implemented in Sprint N+1.

## Architecture

```
┌─────────────┐      HTTP/REST      ┌──────────────────┐      ┌──────────┐
│ CRM Module  │◀───────────────────▶│ RealOmniChannel  │◀────▶│   Omni   │
│             │                     │    Adapter       │      │  Module  │
└─────────────┘                     └──────────────────┘      └──────────┘
      │                                     │
      │                                     │
      ▼                                     ▼
OmniChannel                           CRMIntegration
IntegrationService                    Controller
```

## Components

### 1. Omni Module - API Endpoints

**Base Path**: `/api/omni/crm-integration/`

#### Conversation Endpoints

- **GET /conversations/qualified**
  - Get qualified conversations ready for lead capture
  - Query params: `?since=2024-01-01T00:00:00Z`
  - Response: Array of conversation objects

- **GET /conversations/:id**
  - Get conversation details by ID
  - Response: Formatted conversation with messages and customer data

- **POST /conversations/:id/link**
  - Link conversation to CRM lead
  - Body: `{ "leadId": number }`
  - Response: Success confirmation

#### Landing Page Endpoints (Not yet implemented)

- **GET /submissions/:id** - Get submission by ID (501)
- **GET /submissions** - Get recent submissions (501)

#### Email Engagement Endpoints (Not yet implemented)

- **GET /email-engagements** - Get engagements by email (501)
- **POST /email-engagements** - Track engagement event (501)

### 2. CRM Module - Adapter Implementation

**File**: `backend/src/modules/crm/adapters/RealOmniChannelAdapter.ts`

**Features**:
- HTTP client with retry logic (exponential backoff)
- Automatic error handling
- Health check capability
- Event subscription support (ready for WebSockets)

### 3. Integration Service

**File**: `backend/src/modules/crm/lead-management/capture/services/OmniChannelIntegrationService.ts`

**Adapter Selection**:
```typescript
// Set via environment variable
OMNICHANNEL_ADAPTER_TYPE=api  // Uses RealOmniChannelAdapter
OMNICHANNEL_ADAPTER_TYPE=mock // Uses MockOmniChannelAdapter
OMNICHANNEL_ADAPTER_TYPE=stub // Uses StubOmniChannelAdapter
```

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Omni Module Integration
OMNICHANNEL_ADAPTER_TYPE=api
OMNI_API_BASE_URL=http://localhost:3000
OMNI_API_TIMEOUT=10000
OMNI_API_RETRIES=3
```

### Local Development

For local development with both modules running:

```bash
# Terminal 1 - Start main backend (includes both CRM and Omni)
cd backend
npm run dev

# The integration will work automatically when:
# - OMNICHANNEL_ADAPTER_TYPE=api
# - OMNI_API_BASE_URL=http://localhost:3000 (or your server URL)
```

## Usage Examples

### 1. Capture Lead from Qualified Conversation

```typescript
// Automatic - happens when OmniChannelIntegrationService receives event
const conversation = await adapter.getConversation(conversationId);

if (conversation && conversation.qualified) {
  const leadData = extractLeadFromConversation(conversation);
  const lead = await leadRepo.create(leadData);

  // Link back to conversation
  await adapter.linkConversationToLead(conversation.id, lead.id);
}
```

### 2. Get Qualified Conversations (Polling)

```typescript
const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24h
const qualifiedConversations = await adapter.getQualifiedConversations(since);

for (const conv of qualifiedConversations) {
  await processConversationAsLead(conv);
}
```

### 3. Health Check

```typescript
const adapter = new RealOmniChannelAdapter(logger);
const isHealthy = await adapter.healthCheck();

if (!isHealthy) {
  logger.warn('Omni module is not responding');
  // Fallback to mock/stub adapter
}
```

## Error Handling

### Automatic Retries

The adapter automatically retries failed requests:
- **Retryable errors**: Network errors, 5xx errors
- **Non-retryable errors**: 4xx errors (except 404)
- **Retry strategy**: Exponential backoff (2^n seconds)
- **Max retries**: 3 (configurable via `OMNI_API_RETRIES`)

### Graceful Degradation

If Omni module is unavailable:
- GET requests return empty arrays or null
- POST requests (linking) log errors but don't throw
- System continues functioning with mock data

## Testing

### Integration Tests

```bash
# Test CRM to Omni integration
npm test -- integration/crm-omni

# Test specific endpoints
npm test -- integration/crm-omni/conversations.test
```

### Manual Testing with curl

```bash
# Get qualified conversations
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/omni/crm-integration/conversations/qualified

# Get conversation by ID
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/omni/crm-integration/conversations/conv_123

# Link conversation to lead
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadId": 456}' \
  http://localhost:3000/api/omni/crm-integration/conversations/conv_123/link
```

## Monitoring

### Logs

All integration activity is logged with `[RealOmniChannelAdapter]` prefix:

```
[RealOmniChannelAdapter] Initialized { baseUrl: 'http://localhost:3000' }
[RealOmniChannelAdapter] Getting conversation { conversationId: 'conv_123' }
[RealOmniChannelAdapter] Successfully linked conversation to lead { conversationId: 'conv_123', leadId: 456 }
```

### Metrics to Monitor

- API response times
- Retry counts
- Failed requests
- Qualified conversations processed
- Successful lead captures

## Roadmap

### Phase 1 (Current - Sprint N+1)
- ✅ Real API integration
- ✅ Conversation capture
- ✅ Link tracking

### Phase 2 (Future)
- ⏳ Landing page submissions
- ⏳ Email engagement tracking
- ⏳ WebSocket for real-time events
- ⏳ Bidirectional sync

### Phase 3 (Future)
- ⏳ CRM activities sync to Omni
- ⏳ Unified customer view
- ⏳ Cross-module analytics

## Troubleshooting

### Adapter Not Connecting

**Symptom**: Logs show "API adapter not implemented, falling back to stub"

**Solution**:
1. Check `OMNICHANNEL_ADAPTER_TYPE` is set to `api`
2. Verify `OMNI_API_BASE_URL` is correct
3. Ensure Omni module is running
4. Check network connectivity

### 404 Errors

**Symptom**: "Conversation not found" errors

**Solution**:
1. Verify conversation ID exists in Omni database
2. Check `company_id` matches between modules
3. Ensure conversation status is "qualified"

### Timeout Errors

**Symptom**: Requests timing out

**Solution**:
1. Increase `OMNI_API_TIMEOUT` (default: 10000ms)
2. Check Omni module performance
3. Check database query performance
4. Consider adding caching

## Security

### Authentication

- All requests include `Authorization: Bearer <token>` header
- Token is extracted from CRM request context
- Omni module validates token using shared auth middleware

### Data Privacy

- Only qualified conversations are accessible via CRM integration API
- Customer PII is only exposed for conversations explicitly linked to leads
- Audit logs track all cross-module data access

## Contributing

When adding new integration endpoints:

1. Add endpoint to `CRMIntegrationController`
2. Update `RealOmniChannelAdapter` interface
3. Implement in adapter
4. Add tests
5. Update this documentation

## Support

For issues or questions:
- Create issue in GitHub repository
- Tag with `integration` label
- Include logs from both CRM and Omni modules
