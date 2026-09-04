# Chat Session Enhancement

## Feature summary

Admin chat sessions are owner-scoped and support safe restoration, explicit ownership transfer, and soft cleanup of stale sessions. Public chat remains separate and does not create admin sessions.

- Restore returns an active owned session with its ordered transcript.
- Ownership transfer requires the current owner and records an audit event.
- Cleanup soft-deletes only the authenticated owner's sessions older than the requested age.
- Existing title updates, message history, statistics, and soft deletion remain compatible.

## API endpoints

All endpoints require the existing admin authentication dependency.

### Session listing and restore

- `GET /api/chat/sessions?limit=<1-100>&offset=<n>` lists active sessions owned by the authenticated administrator.
- `GET /api/chat/sessions/{session_id}` returns one active owned session.
- `GET /api/chat/sessions/{session_id}/messages?limit=<1-200>&offset=<n>` returns its ordered messages.
- `GET /api/chat/sessions/{session_id}/restore` returns the session and its complete ordered transcript.

### Session management

- `PATCH /api/chat/sessions/{session_id}/title` updates an active owned title.
- `POST /api/chat/sessions/{session_id}/transfer` accepts `{ "new_owner_id": "..." }` and transfers an active owned session.
- `DELETE /api/chat/sessions/{session_id}` performs an audited soft delete.
- `POST /api/chat/sessions/cleanup?older_than_days=<1-3650>` soft-deletes the authenticated owner's stale sessions.
- `GET /api/chat/stats` returns owner-scoped active-session statistics.

Foreign, inactive, and ownerless sessions return not-found responses rather than exposing their state.

## UI components

- `/admin/agent-chat`: existing interactive admin chat with local-draft protection, persisted-session selection, race-safe restore, and explicit unavailable states.
- `/admin/chat`: session management page with owner-scoped restore, soft cleanup, and ownership transfer controls.

All requests use the existing authenticated admin API helper. No transcript is written to browser storage by these features.

## Configuration options

| Option | Default | Purpose |
| --- | --- | --- |
| Session list limit | `20` | Default number of sessions returned. |
| Session message limit | `50` | Default number of messages returned. |
| Cleanup age | `30 days` | Admin UI threshold for stale-session cleanup. |
| Cleanup maximum age | `3650 days` | API validation upper bound. |

The enhancement does not add environment variables, migrations, schedulers, hard deletion, or external services.

## Known limitations

- Cleanup is soft-delete only and does not purge historical rows.
- Transfer accepts an owner identifier but does not provide an administrator directory or approval workflow.
- Restore loads the full transcript and does not yet paginate the restore response.
- Session cleanup is operator-triggered; no retention scheduler was added.
- Existing unrelated React `act(...)` and test logging warnings may appear in the broader frontend suite.

## Future improvements

- Add paginated restore and transcript export with explicit retention controls.
- Add administrator lookup, transfer confirmation, and role-based transfer permissions.
- Add a reviewable retention policy and a separately approved purge workflow.
- Add session activity search and operational audit reporting.

## Next phase recommendations

1. Define retention and privacy requirements before adding durable purge workflows.
2. Introduce administrator directory integration only after ownership-transfer authorization is specified.
3. Add pagination and search for large session histories.
4. Keep public chat and admin session data paths isolated during future enhancements.
