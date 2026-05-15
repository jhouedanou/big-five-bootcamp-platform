# Prompt for Claude Code — Audit and Fix Subscription Mapping, Access Rules, Dashboard Counters and #BigFiveDécrypte Flow

## Context

There is an issue in the LAVEIYE subscription system.

I subscribed to the **Basic** plan using the following test account:

```txt
vlhzanpqmalrrfoslf@enotj.com
```

However, the account is currently identified as **Pro**.

This is incorrect.

## Test Case

| Item | Value |
|---|---|
| Test account | `vlhzanpqmalrrfoslf@enotj.com` |
| Expected plan | `Basic` |
| Current plan | `Pro` |
| Issue | Incorrect upgrade from Basic to Pro |
| Main objective | Identify why Basic mappings, payment callbacks or webhooks trigger a Pro status, then fix the logic |

---

## Important Note

The pricing and feature details included in this prompt are provided **for reference only**.

They are meant to clarify the expected subscription hierarchy, access rules and user experience.

**Do not reimplement the full pricing page, feature table or subscription page unless it is directly required to fix the bug.**

The priority is to:

- audit the subscription lifecycle;
- fix the incorrect Basic-to-Pro assignment;
- correct plan mappings;
- verify webhook logic;
- enforce the correct fallback behavior;
- adjust restricted access labels;
- fix usage counter wording;
- clean the Pro dashboard;
- implement or adjust the #BigFiveDécrypte access flow if needed.

---

# 1. Main Objective

Audit and fix the subscription system so that each user’s access level always matches their real subscription status.

The expected behavior is:

- a user with no active subscription is assigned to `Free`;
- a user subscribed to `Découverte` remains on `Découverte`;
- a user subscribed to `Basic` remains on `Basic`;
- a user subscribed to `Pro` remains on `Pro`;
- no user is automatically upgraded to Pro by mistake;
- unknown, expired, missing or invalid subscription data always falls back to `Free`;
- `Pro` is never used as a fallback or default value.

---

# 2. Technical Audit — Subscription Lifecycle

Please inspect the full subscription lifecycle:

```txt
Account creation → Plan selection → Payment → Webhook / Callback → Synchronization → User access level update
```

## Areas to inspect

### 2.1 Account creation logic

Check what happens when a user creates an account without an active subscription.

Expected behavior:

```txt
No active subscription = Free
```

The system should not give access to paid features by default.

---

### 2.2 Payment success logic

Inspect the logic executed after a successful payment.

Check whether the correct plan information is retrieved and saved.

Pay attention to:

- payment success handlers;
- checkout success pages;
- backend callbacks;
- plan metadata;
- user metadata;
- subscription status updates.

---

### 2.3 Webhook handlers

Inspect all webhook handlers related to subscription creation, payment confirmation or subscription renewal.

Check if a Basic payment can accidentally trigger a Pro status.

Pay attention to:

- payment provider event types;
- plan ID parsing;
- metadata parsing;
- fallback values;
- hardcoded values;
- default subscription values;
- update queries in the database.

---

### 2.4 Plan ID mapping

Inspect all files where external payment provider plan IDs are mapped to internal subscription levels.

This may include providers such as:

- Stripe;
- CinetPay;
- Chariow;
- or any other payment provider currently used by the project.

Expected mapping rules:

```txt
External Découverte plan ID → découverte
External Basic plan ID      → basic
External Pro plan ID        → pro
Unknown plan ID             → free
Missing plan ID             → free
Expired subscription        → free
Invalid subscription        → free
```

Important rule:

```txt
Basic must never map to Pro.
```

---

### 2.5 User metadata and database fields

Inspect where subscription information is stored.

Check fields such as:

```txt
plan_id
subscription_id
subscription_status
subscription_tier
access_level
role
plan_name
current_plan
is_pro
is_subscriber
```

Verify that there is no outdated or conflicting field causing a Basic user to be treated as Pro.

For example, check if the system still uses a legacy boolean such as:

```txt
is_pro = true
```

instead of a proper tier-based access system.

---

# 3. Business Rules — Subscription Hierarchy

The platform should support the following 4 levels.

| Level | Status | Access | Default value? |
|---|---|---|---|
| Free | No active subscription | Very limited access | Yes — only authorized fallback |
| Découverte | Paid plan — 1,000 XOF | 10 campaigns, 5 searches per month | No |
| Basic | Paid plan — 4,900 XOF | Unlimited campaign views, 30 searches per month | No |
| Pro | Paid plan — 9,900 XOF | Unlimited access + #BigFiveDécrypte | Never |

---

## 3.1 Free

The `Free` level is for users with no active subscription.

Expected behavior:

- very limited or locked access;
- no paid features;
- prompt the user to choose a paid plan;
- used as the only fallback level.

Critical rule:

```txt
Free is the only allowed fallback.
```

Never use:

```txt
Pro
```

as a default, fallback or fail-safe value.

---

## 3.2 Découverte

Reference only.

Expected plan logic:

- paid plan;
- limited library access;
- basic filters;
- 10 campaigns viewable per month;
- 5 searches or filters per month;
- monthly usage counter.

---

## 3.3 Basic

Reference only.

Expected plan logic:

- paid plan;
- unlimited campaign views;
- advanced filters;
- 30 searches or filters per month;
- monthly usage counter;
- must not have Pro-only access.

Important:

```txt
A Basic user must remain Basic.
```

---

## 3.4 Pro

Reference only.

Expected plan logic:

- paid plan;
- unlimited access;
- unlimited searches or filters;
- access to #BigFiveDécrypte;
- no limited usage counter on the dashboard homepage.

Important:

```txt
Pro must never be used as a fallback.
```

---

# 4. Bug to Investigate — Basic User Incorrectly Upgraded to Pro

## Test account

```txt
vlhzanpqmalrrfoslf@enotj.com
```

## Current issue

The user subscribed to:

```txt
Basic
```

But the system currently identifies the account as:

```txt
Pro
```

## Expected result

The account must be identified as:

```txt
Basic
```

## Required investigation

Please identify whether the issue comes from:

- a wrong external plan ID mapping;
- a webhook assigning the wrong internal tier;
- a fallback value incorrectly set to Pro;
- a hardcoded `pro` value;
- an outdated `is_pro` boolean;
- a database synchronization issue;
- duplicated or conflicting subscription records;
- user metadata being overwritten after payment;
- the dashboard reading the wrong subscription field;
- a mismatch between frontend and backend subscription logic.

---

# 5. Fallback Logic

The fallback logic must be strict.

## Expected fallback rules

| Situation | Expected level |
|---|---|
| No subscription found | `free` |
| Subscription expired | `free` |
| Subscription cancelled | `free` |
| Payment failed | `free` |
| Unknown plan ID | `free` |
| Missing plan ID | `free` |
| Invalid subscription status | `free` |
| Webhook payload incomplete | `free` |

## Forbidden behavior

Never fallback to:

```txt
pro
```

Never use Pro as:

- a default plan;
- a fallback plan;
- a temporary access level;
- a fail-safe value;
- a value for unknown plan IDs.

---

# 6. UI / UX Corrections

## 6.1 Restricted content labels

Previously, the platform displayed:

```txt
Reserved for subscribers
```

or its French equivalent:

```txt
Réservé aux abonnés
```

This wording is no longer appropriate.

Before, this made sense when Free users were the only non-subscribers.

However, the old Free experience has now been replaced by `Découverte`, and `Découverte` is a paid subscription plan.

This means a Découverte user is also a subscriber.

So the wording “Reserved for subscribers” creates confusion.

## Required replacement

Replace:

```txt
Reserved for subscribers
```

and:

```txt
Réservé aux abonnés
```

With:

```txt
Accessible with Basic or Pro
```

If the UI has limited space, use the shorter version:

```txt
Basic or Pro required
```

French equivalent if the UI is in French:

```txt
Accessible avec Basic ou Pro
```

Short French version:

```txt
Basic ou Pro requis
```

## Expected logic

Use this label when:

- the user is on Découverte;
- the content or feature is not accessible with Découverte;
- the content or feature is accessible with Basic or Pro.

Do not use generic subscriber wording anymore for this case.

---

## 6.2 Search and replace scope

Search globally for all instances of:

```txt
Reserved for subscribers
Réservé aux abonnés
subscriber required
subscribers only
reserved for subscribers
```

Replace them according to context with:

```txt
Accessible with Basic or Pro
```

or:

```txt
Basic or Pro required
```

Use the shorter version only when the UI space is limited.

---

# 7. Usage Quotas — Replace Daily Wording with Monthly Wording

Usage limits are monthly, not daily.

Please replace all quota-related references to daily usage.

## Replace

```txt
day
daily
today
jour
quotidien
aujourd’hui
```

## With

```txt
month
monthly
this month
mois
mensuel
ce mois-ci
```

## Examples

Replace:

```txt
Searches today
```

With:

```txt
Searches this month
```

Replace:

```txt
Daily usage
```

With:

```txt
Monthly usage
```

Replace:

```txt
Recherches aujourd’hui
```

With:

```txt
Recherches ce mois-ci
```

Replace:

```txt
Utilisation quotidienne
```

With:

```txt
Utilisation mensuelle
```

This applies only to usage limits, counters, quotas and subscription consumption.

Do not blindly replace unrelated uses of the word “day” if they are not connected to quotas.

---

# 8. Pro Dashboard Cleanup

## Rule

Pro users have unlimited access.

Therefore, Pro users should not see a limited usage counter on the dashboard homepage.

## Current incorrect behavior example

A Pro user may currently see something like:

```txt
0/30 this month
```

or:

```txt
0/30 ce mois-ci
```

This is wrong because `30 searches per month` is a Basic limitation.

## Required correction

For Pro users:

- remove the limited usage counter from the dashboard homepage;
- do not display `0/30 this month`;
- do not display `0/30 ce mois-ci`;
- do not show Basic-style limits;
- show unlimited access only if needed.

Expected result:

```txt
Pro dashboard = no limited counter
```

---

# 9. #BigFiveDécrypte Flow

## Context

`#BigFiveDécrypte` is a service reserved exclusively for **Pro subscribers** of the LAVEIYE platform.

It is a monthly session hosted by a Big Five expert.

The goal is to allow Pro subscribers to participate in a debrief session around social media campaigns they are interested in or want to better understand.

The session itself should not be hosted inside the platform.

The platform only needs to collect the contact details of interested Pro users.

The Big Five team will then send an external connection link using a tool such as:

- Zoom;
- Google Meet;
- Mailchimp;
- or another external communication tool.

---

## 9.1 Access control

#BigFiveDécrypte must be accessible only to:

```txt
Pro users
```

It must be blocked for:

```txt
Free users
Découverte users
Basic users
```

## Required blocked-user message

Display:

```txt
Pro plan required
```

French equivalent if needed:

```txt
Plan Pro requis
```

Alternative wording:

```txt
Accessible with Pro
```

French equivalent:

```txt
Accessible avec Pro
```

---

## 9.2 Data collection

Create or adjust the #BigFiveDécrypte flow so that Pro users can submit their contact details.

The flow should be inspired by the existing contact collection system used for weekly email alerts.

The objective is not to host the session in the platform.

The objective is to collect the user’s information so the Big Five team can contact them externally.

## Data to collect

Use the existing user profile data when available.

Suggested fields:

```txt
Full name
Email address
Phone number
Company / organization
Role / job title
Campaigns or topics of interest
Preferred contact channel
Consent to be contacted
```

Use only the fields that are relevant to the current application structure.

---

## 9.3 Storage and export compatibility

Make sure the collected data is stored properly.

The data should be compatible with:

- export;
- Mailchimp synchronization;
- future CRM usage;
- manual follow-up by the Big Five team.

Expected data structure should allow the team to identify:

```txt
who registered
when they registered
which subscription level they had
which session or month they registered for
how to contact them
```

---

# 10. Personalized Competitive Monitoring

Personalized Competitive Monitoring is a separate custom service.

It should not be treated as a standard feature included in Découverte, Basic or Pro.

This section is provided as context only.

Do not reimplement this service unless the current subscription logic incorrectly treats it as a normal plan feature.

## Reference wording

```txt
Custom service
Personalized competitive monitoring
```

Description:

```txt
Receive dedicated creative monitoring for your brand and competitors: campaign tracking, targeted alerts and periodic reports. Pricing is adapted to your scope.
```

Reference items:

```txt
Personalized brief: brands, sectors, countries
Regular creative reports
Proactive alerts on new campaigns
```

CTA:

```txt
Request a quote
```

French CTA if needed:

```txt
Demander un devis
```

---

# 11. Technical Checklist

Please inspect and fix the following.

## 11.1 Mapping files

Check all files that map external payment provider IDs to internal roles or subscription levels.

Confirm:

```txt
Découverte → découverte
Basic → basic
Pro → pro
Unknown → free
Missing → free
Expired → free
```

---

## 11.2 Webhook handlers

Check all webhook handlers related to:

```txt
payment success
subscription creation
subscription renewal
subscription cancellation
subscription expiration
plan change
```

Confirm that no webhook can accidentally assign `pro` when the paid plan is `basic`.

---

## 11.3 Database update logic

Check all database update operations related to subscription status.

Look for fields such as:

```txt
access_level
subscription_tier
plan
plan_name
plan_id
role
is_pro
subscription_status
```

Confirm that the correct field is being used by both backend and frontend.

---

## 11.4 Frontend access guards

Check all frontend guards or permission utilities that determine whether a user can access:

```txt
advanced filters
campaign details
downloads
collections
dashboard counters
#BigFiveDécrypte
restricted content
```

Confirm that `Basic` users are not treated as `Pro`.

Confirm that `Découverte` users are not treated as `Free`.

Confirm that `Free` users are locked or very limited.

---

## 11.5 Backend permission checks

Check backend permission logic for:

```txt
campaign views
search/filter usage
downloads
collections
weekly alerts
#BigFiveDécrypte registration
```

Ensure frontend and backend rules are aligned.

---

## 11.6 Usage counters

Confirm that:

```txt
Découverte has monthly counters
Basic has monthly counters
Pro has no limited counter on the dashboard homepage
```

Confirm that all usage wording refers to monthly usage, not daily usage.

---

## 11.7 Restricted labels

Confirm that all relevant restricted-access labels have been updated from:

```txt
Reserved for subscribers
Réservé aux abonnés
```

to:

```txt
Accessible with Basic or Pro
Accessible avec Basic ou Pro
```

or, when space is limited:

```txt
Basic or Pro required
Basic ou Pro requis
```

---

## 11.8 #BigFiveDécrypte

Confirm that:

```txt
Only Pro users can access the flow
Free users are blocked
Découverte users are blocked
Basic users are blocked
The blocked-user message is clear
Collected data is stored correctly
Collected data is compatible with export or Mailchimp synchronization
```

---

# 12. Required Debugging for the Test Account

Please specifically debug this account:

```txt
vlhzanpqmalrrfoslf@enotj.com
```

Find out:

1. Which plan was actually paid for.
2. Which external plan ID was received.
3. Which webhook event was triggered.
4. Which internal plan was assigned.
5. Which database fields were updated.
6. Why the final status became `Pro`.
7. Whether the issue comes from mapping, webhook logic, fallback logic, metadata, frontend display or database synchronization.
8. What code change prevents this from happening again.

Expected final result for this account:

```txt
vlhzanpqmalrrfoslf@enotj.com = Basic
```

---

# 13. Expected Final Result

After the audit and fixes:

- users with no active subscription are assigned to `Free`;
- `Free` is the only fallback level;
- `Pro` is never used as fallback or default;
- Découverte users remain Découverte;
- Basic users remain Basic;
- Pro users remain Pro;
- Basic is never interpreted as Pro;
- the test account `vlhzanpqmalrrfoslf@enotj.com` is correctly identified as Basic;
- Pro users do not see a `0/30 this month` or `0/30 ce mois-ci` counter;
- all quota-related wording uses monthly terminology;
- restricted content labels use `Accessible with Basic or Pro` or `Basic or Pro required`;
- #BigFiveDécrypte is accessible only to Pro users;
- #BigFiveDécrypte collects Pro user contact details for external communication;
- the collected data can be exported or synchronized with Mailchimp;
- Personalized Competitive Monitoring remains a separate custom service;
- pricing and feature details are treated as reference only and are not unnecessarily reimplemented.

---

# 14. Deliverables

Please provide the following after the audit and implementation:

## 14.1 Root cause analysis

Explain why the Basic subscription was incorrectly converted to Pro.

Include whether the issue came from:

```txt
plan mapping
webhook handling
fallback logic
metadata
database update
frontend display
legacy role logic
```

---

## 14.2 Code changes

List the files and functions modified.

Explain what was changed in:

```txt
subscription mapping
webhook handling
fallback logic
user metadata update
dashboard counter logic
restricted label wording
#BigFiveDécrypte access control
```

---

## 14.3 UI confirmation

Confirm that:

- the Pro dashboard no longer shows a limited counter;
- all quota-related daily wording has been replaced with monthly wording;
- restricted labels now say `Accessible with Basic or Pro` or `Basic or Pro required`;
- the French versions are correctly handled if the interface uses French;
- #BigFiveDécrypte shows `Plan Pro required` or `Plan Pro requis` for non-Pro users.

---

## 14.4 Logic confirmation

Confirm that:

- the test account is now Basic;
- a new user without a subscription becomes Free;
- Découverte users keep Découverte access;
- Basic users keep Basic access;
- Pro users keep Pro access;
- unknown plan IDs fallback to Free;
- expired subscriptions fallback to Free;
- cancelled subscriptions fallback to Free;
- no condition falls back to Pro.

---

## 14.5 Testing recommendations

Please include the test cases that should be run after the fix.

Minimum test cases:

| Scenario | Expected result |
|---|---|
| New account without subscription | Free |
| Découverte payment success | Découverte |
| Basic payment success | Basic |
| Pro payment success | Pro |
| Unknown plan ID | Free |
| Missing plan ID | Free |
| Expired subscription | Free |
| Cancelled subscription | Free |
| Basic user opens dashboard | Basic counter shown |
| Pro user opens dashboard | No limited counter |
| Découverte user sees restricted Basic/Pro content | “Accessible with Basic or Pro” |
| Basic user tries #BigFiveDécrypte | Blocked — Pro plan required |
| Pro user tries #BigFiveDécrypte | Access granted |
| Pro user submits #BigFiveDécrypte form | Data stored for export / Mailchimp |

---

# 15. Priority Order

Please handle the work in this order:

1. Debug the test account.
2. Audit plan mappings.
3. Audit webhook and payment synchronization logic.
4. Fix fallback behavior.
5. Fix incorrect Basic-to-Pro assignment.
6. Clean Pro dashboard counters.
7. Replace daily quota wording with monthly wording.
8. Replace restricted content labels.
9. Verify or adjust #BigFiveDécrypte Pro-only access.
10. Provide the root cause, code summary and testing checklist.
