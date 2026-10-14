---
title: Your board and account
description: Visitor boards, saving to an email, privacy and tokens
---

## Your board

Clicking **Setup My Agents** creates a board and a token for you. No email or sign-up.

Your board lives in this browser. Clearing site data or switching browsers before you save loses it.

## Save your board

1. After your agent's first event, click **Save Board** in the top bar.
2. Enter your email and click **Send link**.
3. Open the link. The same board and token are saved to your account. Your agent keeps working, with nothing to reconfigure.

Each email can have one board for now.

## Retention

| Board | Deleted |
|---|---|
| Unsaved | 7 days after creation |
| Saved | Kept |

## Who can see it

Boards are public to anyone with the link. They are never listed in the demo, feed or any index.

To make a board private, use the visibility pill on your board.

## Tokens

- Tokens start with `flt_` and are shown once, then masked.
- **Regenerate** or **Revoke** from the **⋯** menu on the token row.
- Your token belongs in the `Authorization: Bearer` header, never in a URL. If a token was shared or appears in a screenshot, regenerate it.
- The old `/mcp/<token>` URL form is deprecated and stops working on 2026-11-07. Reconnect with the header form from **Connect an Agent**.
