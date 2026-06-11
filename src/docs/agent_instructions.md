# Agent Flow Instructions

Purpose
- Define the progressive 6-question WhatsApp agent onboarding flow and required follow-ups.

High-level flow (strict, sequential)
1. `agent_start` — "What would you like our WhatsApp agent to help you with?"
   - Expect: free-text goal/summary (store as history[0]).
2. `agent_problem` — "What is the main business problem or task you want the agent to solve?"
   - Expect: free-text problem (store as history[1]).
3. `agent_scale` — "What size is your team or business?"
   - Expect: free-text scale (store as history[2]).
4. `agent_priority` — "Which process would you like to automate first?"
   - Expect: free-text priority (store as history[3]).
5. `agent_timeline` — "When would you like the WhatsApp agent to be ready?"
   - Expect: timeline text (store as history[4]).
6. `agent_budget` — "How much are you willing to pay to use our WhatsApp agent?"
   - Expect: budget text (store as history[5]).

Completion behavior
- After receiving step 6 (`agent_budget`):
  - Summarize all collected answers and send confirmation to the user.
  - Notify the business owner JID with a formatted summary message.
  - Grant `allowDirectChat = true` by updating conversation state to `chatting` (or similar) so the user may message directly.

Strictness rules (enforced in `handleDirectMessage`)
- New users (no conversation state) must be shown the `start` menu and nothing else is accepted.
- While a user has a conversation state and `allowDirectChat` is `false`, all incoming messages must be interpreted only as answers to the current menu step.
- If a user sends unexpected input (e.g., non-number when a numbered option is expected), re-prompt with a clear instruction and do NOT accept free-form chat.
- Only when `allowDirectChat` is true do we accept free-form messages.

Owner notifications
- Owner receives a concise summary with fields:
  - From: JID
  - Goal, Problem, Scale, Priority, Timeline, Budget
- Example owner message:
```
 New WhatsApp Agent Request:

From: <jid>
Goal: <history[0]>
Problem: <history[1]>
Scale: <history[2]>
Priority: <history[3]>
Timeline: <history[4]>
Budget: <history[5]>
```

Follow-up actions (suggested)
- After completion, offer user buttons or menu options:
  - "Book a live consultation"
  - "Request a tailored quote"
  - "Subscribe to agent updates"
- Implement quick replies as numbered menu options or detect simple keywords.

Testing checklist
- New user receives `start` menu on first message.
- Replies to start menu numeric options navigate correctly.
- Selecting "Get access to our WhatsApp agent" starts `agent_start`.
- Each agent step stores the response in history in order.
- After final budget step, owner gets notification and user receives confirmation.
- After completion, user may send free-form messages and they are accepted.

Implementation notes
- `updateConversationState(jid, currentMenuId, depth, history, allowDirectChat)` persists `allowDirectChat`.
- Use `formatMenuMessage(menuId)` to present prompts that expect a reply.
- Keep the DM handler strict: never reset state to null until you explicitly grant `allowDirectChat` (or delete state when desired).

If you want, I can also:
- Add quick-reply buttons (WhatsApp interactive messages) for the final follow-up options.
- Add unit tests or end-to-end tests that simulate message flows.
