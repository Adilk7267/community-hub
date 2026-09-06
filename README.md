# Community Hub

You are a senior software architect, product designer, full-stack developer, security engineer, database engineer, QA engineer, and DevOps engineer.

Your job is to independently design and build a complete production-ready system from scratch based on the requirements below.

IMPORTANT:

I am a beginner and I do NOT have technical knowledge of WhatsApp APIs, backend architecture, databases, authentication, deployment, security, or system design.

Therefore, YOU must make the technical decisions yourself.

Do not repeatedly ask me which technology, architecture, database, API, UI layout, or implementation approach to choose.

Choose the most reliable, secure, scalable, maintainable, and beginner-friendly solution yourself.

If something is technically impossible through the official WhatsApp platform, do not fake it or implement an unofficial workaround. Explain the limitation briefly and automatically implement the closest possible official/compliant architecture.

Do not stop after creating a plan.

Actually build the complete project.

==================================================
PRODUCT NAME

Create a professional private community platform called:

"Private WhatsApp Community Manager"

The final system consists of:

WhatsApp-based USER EXPERIENCE

Private ADMIN WEB PANEL

Secure BACKEND

DATABASE

OFFICIAL WHATSAPP BUSINESS PLATFORM INTEGRATION

VERIFICATION SYSTEM

MODERATION SYSTEM

BOYS/GIRLS SECTION ISOLATION

QUESTION & ANSWER SYSTEM

BROADCAST SYSTEM

COMPLETE AUDIT LOGGING

TESTING

DEPLOYMENT CONFIGURATION

==================================================
MOST IMPORTANT PRODUCT RULE

USERS MUST NOT NEED:

A separate mobile application

A separate user website

A separate user dashboard

Users interact with the system through WhatsApp.

ONLY THE ADMIN uses the web-based Admin Panel.

The Admin Panel must never be exposed to normal users.

==================================================
WHATSAPP REQUIREMENT

Use ONLY the official Meta WhatsApp Business Platform / WhatsApp Cloud API and official webhook mechanisms.

Do NOT use:

WhatsApp Web automation

Selenium WhatsApp automation

Playwright WhatsApp automation

QR-session bots

unofficial WhatsApp libraries

scraping

reverse engineering

unofficial group manipulation

The system must be designed around official WhatsApp capabilities and policies.

==================================================
SYSTEM CONCEPT

Create a private moderated WhatsApp community with two isolated sections:

SECTION 1:
BOYS

SECTION 2:
GIRLS

The administrator has complete administrative control.

The administrator can see member phone numbers and internal member information.

Normal members must NOT receive a member directory or another member's phone number through the application.

Members must not have an application-provided private chat system with one another.

Members must not have an application-provided member-to-member calling system.

All communication should be routed through the controlled WhatsApp community workflow.

==================================================
ADMIN CONTROL

Create ONE Super Admin role initially.

The Super Admin can:

View all members

View phone numbers

View member profile

Approve members

Reject members

Suspend members

Block members

Remove members

Restore members

Assign Boys section

Assign Girls section

Change section

View verification status

Review questions

Review answers

Broadcast messages

Send individual administrative messages

Moderate content

View message history

View delivery status

View audit logs

Add internal notes

Search members

Filter members

Manage system settings

All sensitive operations must require proper authorization.

==================================================
MEMBER REGISTRATION FLOW

When a new person contacts the official WhatsApp number:

Create a member record.

Initial state:

status = pending

section = null

verification_status = pending

The WhatsApp conversation should guide the user through onboarding.

Design the onboarding yourself.

Possible flow:

WELCOME
↓
COMMUNITY RULES
↓
CONSENT
↓
NAME
↓
REQUIRED INFORMATION
↓
SECTION REQUEST
↓
VERIFICATION
↓
ADMIN REVIEW
↓
APPROVED / REJECTED

Do not collect unnecessary personal information.

==================================================
VERIFICATION

Build a proper verification workflow.

The system may support:

WhatsApp verification

OTP verification where officially supported

Admin verification

Optional identity verification integration

Optional face verification

Optional voice verification

IMPORTANT:

Do NOT use face recognition or voice recognition to automatically infer whether somebody is a boy or girl.

Do NOT make gender classification based on facial appearance or voice.

Section assignment must be handled through a legitimate verification process and/or administrator review.

If biometric verification is used:

Prefer privacy-preserving verification

Do not unnecessarily store raw biometric files

Store verification status/result where possible

Keep sensitive verification information restricted to authorized admins

Include deletion/retention controls

Verification states:

pending
in_review
verified
rejected
expired

==================================================
MEMBER STATES

Support:

pending
verification_required
in_review
approved
suspended
blocked
removed

Only APPROVED members can receive normal community content.

SUSPENDED, BLOCKED, and REMOVED users must not receive normal community content.

==================================================
BOYS/GIRLS ISOLATION

This is a critical security requirement.

Create strict server-side isolation.

BOYS members can access only Boys content.

GIRLS members can access only Girls content.

A Boys member must never receive Girls content.

A Girls member must never receive Boys content.

Users cannot change their own section.

Only the Super Admin can change section assignment.

Do not rely only on frontend hiding.

Enforce isolation at:

Backend

Database query layer

Message routing

Broadcast layer

Webhook processing

Question routing

Answer routing

Create automated tests specifically for this isolation.

==================================================
WHATSAPP USER EXPERIENCE

The user should be able to interact through WhatsApp using simple commands/buttons where officially supported.

Design a conversational flow such as:

START
HELP
MY STATUS
ASK QUESTION
COMMUNITY RULES
REPORT
STOP

Use official interactive WhatsApp message capabilities where supported.

Do not create unsupported WhatsApp UI.

==================================================
QUESTION SYSTEM

A user can submit a question through WhatsApp.

Example:

User:

"Kal session kis time hai?"

The backend creates:

question_id
member_id
section
question_text
status
created_at

The member's actual phone number must not be exposed in the community-generated question.

Use an internal identifier such as:

Question #102

or:

Member #102

where appropriate.

The Super Admin can:

View question

Approve

Reject

Edit

Publish

Hide

Delete

Answer

Close

When published, the question should be distributed only to the appropriate section.

==================================================
ANSWER SYSTEM

Members can submit answers to approved questions through WhatsApp.

Answers go through moderation.

Admin can:

Approve answer

Reject answer

Hide answer

Delete answer

Publish answer

When an answer is distributed, do not intentionally expose the answerer's private contact information through your application.

==================================================
ADMIN BROADCAST SYSTEM

Create a professional Broadcast Center.

Admin can select:

Boys

Girls

Both

Selected members

Admin writes message.

Before sending show:

TARGET
RECIPIENT COUNT
MESSAGE PREVIEW

Require confirmation.

Then send through official WhatsApp Business Platform capabilities.

Track:

Queued

Sent

Delivered

Read

Failed

Store message history.

==================================================
INDIVIDUAL ADMIN MESSAGE

Admin can select one member and send a private administrative message through the official WhatsApp channel.

Examples:

Verification update

Approval message

Warning

Suspension notification

Important announcement

The member's phone number remains private from other members.

==================================================
MODERATION

Create a moderation system.

Admin can:

Review incoming messages

Review questions

Review answers

Warn member

Suspend member

Block member

Remove member

Restore member

Create moderation history.

Every moderation action must be logged.

==================================================
ADMIN DASHBOARD

Create a premium but simple Admin Dashboard.

Dashboard statistics:

TOTAL MEMBERS
PENDING MEMBERS
VERIFIED MEMBERS
BOYS
GIRLS
SUSPENDED
BLOCKED

Communication statistics:

MESSAGES TODAY
QUESTIONS TODAY
ANSWERS TODAY
BROADCASTS TODAY

Verification statistics:

PENDING VERIFICATION
IN REVIEW
VERIFIED
REJECTED

Show recent activity.

Examples:

New Member
Member Approved
Member Rejected
Verification Completed
Question Received
Answer Approved
Broadcast Sent
Member Suspended

==================================================
ADMIN PANEL PAGES

Create:

Login

Dashboard

Pending Members

All Members

Boys

Girls

Member Details

Verification

Questions

Answers

Broadcast Center

Message History

Moderation

Blocked Members

Audit Logs

Settings

Admin Profile

==================================================
MEMBERS TABLE

Create a professional member management table.

Columns:

Member ID
Name
Phone Number
Section
Status
Verification
Joined Date
Last Activity
Actions

Actions:

View
Approve
Reject
Suspend
Block
Remove
Assign Section

Add:

Search
Filters
Pagination
Sorting

Search by:

Member ID
Name
Phone Number

Filters:

Section
Status
Verification Status
Date

==================================================
MEMBER DETAILS

Show:

Internal Member ID
Name
WhatsApp identifier
Phone Number
Section
Status
Verification Status
Joined Date
Approved Date
Last Activity
Message History
Questions
Answers
Moderation History
Admin Notes

Admin actions:

Approve
Reject
Suspend
Block
Remove
Restore
Assign Section

Use confirmation dialogs for destructive actions.

==================================================
DATABASE

Choose a reliable relational database.

Prefer PostgreSQL.

Create proper relational schema.

Minimum tables:

admins
members
verification_records
messages
questions
answers
broadcasts
broadcast_recipients
moderation_actions
audit_logs
system_settings

Design relationships correctly.

Do not duplicate sensitive information unnecessarily.

Use indexes for:

phone number
WhatsApp user ID
member ID
section
status
verification status
created_at

==================================================
MEMBERS TABLE

Suggested fields:

id
internal_member_id
whatsapp_user_id
phone_number
display_name
section
status
verification_status
verification_reference
created_at
approved_at
approved_by
suspended_at
blocked_at
removed_at
last_message_at

Use appropriate data types.

==================================================
MESSAGES TABLE

Suggested fields:

id
whatsapp_message_id
member_id
section
direction
message_type
message_text
status
created_at
sent_at
delivered_at
read_at
failed_at

Prevent duplicate WhatsApp message processing.

==================================================
QUESTIONS TABLE

Suggested:

id
question_reference
member_id
section
question_text
status
created_at
published_at
closed_at

==================================================
ANSWERS TABLE

Suggested:

id
question_id
member_id
answer_text
status
created_at
approved_at
published_at

==================================================
BROADCAST TABLES

Create:

broadcasts

id
created_by
target_type
section
message_text
status
created_at
sent_at

broadcast_recipients

id
broadcast_id
member_id
status
sent_at
delivered_at
read_at
failed_at

==================================================
AUDIT LOGS

Log all important administrative actions.

Examples:

ADMIN_LOGIN
ADMIN_LOGOUT
MEMBER_CREATED
MEMBER_APPROVED
MEMBER_REJECTED
MEMBER_SUSPENDED
MEMBER_BLOCKED
MEMBER_REMOVED
MEMBER_RESTORED
SECTION_ASSIGNED
VERIFICATION_APPROVED
VERIFICATION_REJECTED
QUESTION_CREATED
QUESTION_PUBLISHED
ANSWER_APPROVED
ANSWER_REJECTED
BROADCAST_CREATED
BROADCAST_SENT
MESSAGE_SENT
SETTINGS_CHANGED

==================================================
WHATSAPP WEBHOOK

Implement secure webhook handling.

Support:

Webhook verification

Incoming messages

Message statuses

Delivery status

Read status

Failed status

Interactive replies

Button/list replies where supported

Validate webhook authenticity.

Implement idempotency.

If the same webhook event arrives multiple times, it must not create duplicate records or duplicate actions.

==================================================
WHATSAPP SERVICE

Create a dedicated WhatsApp service layer.

Do not put WhatsApp API logic throughout the application.

Example architecture:

services/
whatsapp_service.py
member_service.py
verification_service.py
broadcast_service.py
moderation_service.py
question_service.py

The WhatsApp service should handle:

send text
send template
send interactive message
send notification
process webhook
process status
map WhatsApp user
handle errors

==================================================
BACKEND

Use Python + FastAPI.

Build clean modular architecture.

Suggested:

app/
main.py
config.py

api/
    auth.py
    members.py
    verification.py
    questions.py
    answers.py
    broadcasts.py
    messages.py
    moderation.py
    webhooks.py
    audit.py
    settings.py

models/
schemas/
services/
database/
middleware/
utils/


Use:

Pydantic validation

Proper HTTP status codes

Centralized exception handling

Structured logging

Environment variables

Dependency injection where useful

==================================================
ADMIN AUTHENTICATION

Implement secure Admin authentication.

Only authenticated admins can access Admin Panel.

Protect every admin API endpoint.

Use secure password handling.

Support logout.

Implement session/token expiration.

Add optional 2FA architecture if practical.

Never store plain-text admin passwords.

Never expose authentication secrets to frontend.

==================================================
SECURITY

Implement:

Authentication

Authorization

Role checks

Server-side validation

Rate limiting

Webhook signature validation

Secure headers

CORS

CSRF protection where applicable

Input sanitization

SQL injection protection

Parameterized queries

Secret management

Audit logging

Error sanitization

Never return:

API tokens
database credentials
environment variables
stack traces
internal secrets

to users.

==================================================
PRIVACY

Follow privacy-by-design principles.

Collect only required information.

Protect phone numbers.

Do not expose member contact information.

Do not create a public member directory.

Do not unnecessarily store biometric information.

Implement configurable retention/deletion mechanisms.

Clearly separate:

ADMIN-ONLY DATA

from:

MEMBER-VISIBLE DATA

==================================================
ADMIN UI/UX

Create a clean, premium, modern Admin Panel.

The UI must be:

Simple

Professional

Easy to understand

Responsive

Fast

Accessible

Consistent

Not cluttered

Do not use unnecessary animations.

Use consistent:

Buttons

Forms

Tables

Status badges

Modals

Cards

Typography

Spacing

Create a sidebar:

Dashboard

Members
Pending
All Members
Boys
Girls

Verification

Questions

Answers

Broadcast

Messages

Moderation

Audit Logs

Settings

Top bar:

Admin Profile
Notifications
Logout

==================================================
DASHBOARD DESIGN

Do not make the dashboard visually overloaded.

Use clear cards and sections.

Priority:

Member statistics

Pending verification

Recent activity

Questions

Broadcast activity

System status

==================================================
ERROR & EMPTY STATES

Every page must have proper:

Loading state
Empty state
Error state
Success state

Examples:

"No pending members"

"No questions yet"

"No broadcast history"

"WhatsApp connection unavailable"

Use clear user-friendly messages.

==================================================
SEARCH / FILTER UX

Search should be fast and intuitive.

Add:

Search box
Filter button
Reset filters

Do not create confusing filters.

Preserve filters when navigating where appropriate.

==================================================
RESPONSIVE DESIGN

Admin Panel must work on:

Desktop
Tablet
Mobile

Users do NOT receive this interface.

The responsive requirement applies to Admin Panel only.

==================================================
TESTING

Create automated tests.

Test:

Admin login
Unauthorized admin access
Member creation
Member approval
Member rejection
Member suspension
Member blocking
Member removal
Member restoration
Section assignment
Boys isolation
Girls isolation
Question creation
Question moderation
Answer moderation
Broadcast
Message delivery
Webhook verification
Webhook duplication
Invalid webhook
Unauthorized API request
Phone number privacy
Blocked member behavior

CRITICAL TESTS:

A Boys member cannot access Girls content.

A Girls member cannot access Boys content.

A normal member cannot access Admin APIs.

A member cannot retrieve another member's phone number.

A blocked member cannot receive normal content.

Duplicate webhook events must not duplicate messages.

==================================================
LOGGING

Create structured application logs.

Include:

timestamp
request ID
event
severity

Never log:

passwords
access tokens
full sensitive verification information

Mask sensitive phone numbers in general application logs.

==================================================
CONFIGURATION

Create:

.env.example

Include placeholders such as:

DATABASE_URL=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
ADMIN_SECRET=
FRONTEND_URL=
BACKEND_URL=

Never commit real secrets.

Create proper .gitignore.

==================================================
DEPLOYMENT

Prepare production deployment.

Recommend appropriate hosting based on the architecture.

Possible:

Frontend:
Vercel

Backend:
Render / Railway / Fly.io / AWS / another appropriate production service

Database:
Supabase PostgreSQL or managed PostgreSQL

WhatsApp:
Meta WhatsApp Business Platform

Choose the simplest reliable deployment architecture.

Create deployment documentation.

==================================================
ENVIRONMENT SETUP

Provide:

Installation instructions
Environment setup
Database setup
Migration instructions
WhatsApp configuration
Webhook configuration
Local development
Production deployment
Testing commands

Make instructions beginner-friendly.

==================================================
DATABASE MIGRATIONS

Use a proper migration system.

Never require manually editing production database tables.

Create initial migration.

==================================================
API DOCUMENTATION

Provide API documentation.

Document:

Authentication
Members
Verification
Questions
Answers
Broadcast
Messages
Moderation
Webhook
Audit Logs

FastAPI OpenAPI documentation should work.

==================================================
WHATSAPP TEMPLATE HANDLING

Where Meta requires approved message templates, design the system to support templates.

Do not assume every outbound WhatsApp message can be sent freely.

Build a template management/configuration layer where appropriate.

==================================================
RATE LIMITING

Protect:

Login
Webhook
Admin APIs
Message sending
Broadcast

against abuse.

==================================================
ANTI-DUPLICATION

Implement idempotency for:

WhatsApp webhooks
message sending
broadcast recipients
question processing

Never accidentally send duplicate broadcasts.

==================================================
ADMIN CONFIRMATIONS

For dangerous actions:

Block
Remove
Suspend
Broadcast
Delete

show a confirmation dialog.

For broadcasts show recipient count and message preview before sending.

==================================================
AUDITABILITY

The admin should always be able to determine:

Who performed an action
What action happened
Which member was affected
When it happened

Use audit logs.

==================================================
NO FAKE FEATURES

Do not create fake WhatsApp integration.

Do not create fake verification.

Do not show "Connected" when WhatsApp credentials are not configured.

Do not simulate delivery status in production.

If credentials are missing, clearly show:

"WhatsApp integration is not configured."

Provide a development/mock mode separately if needed for testing.

==================================================
DEVELOPMENT MODE

Create a safe development mode.

Development mode can simulate:

Incoming WhatsApp message
Outgoing WhatsApp message
Delivery
Read
Question
Answer

But clearly separate it from production mode.

Never mix fake data with production data.

==================================================
CODE QUALITY

Write clean maintainable code.

Avoid:

unnecessary duplication

giant files

hard-coded secrets

hard-coded member IDs

hard-coded phone numbers

insecure shortcuts

unofficial WhatsApp automation

Use meaningful names.

Add comments only where they provide value.

==================================================
FINAL PROJECT STRUCTURE

Create a professional repository structure similar to:

project/
│
├── backend/
│ ├── app/
│ ├── tests/
│ ├── migrations/
│ ├── requirements.txt
│ ├── .env.example
│ └── README.md
│
├── admin-panel/
│ ├── src/
│ ├── public/
│ ├── package.json
│ └── README.md
│
├── docs/
│ ├── architecture.md
│ ├── whatsapp-setup.md
│ ├── deployment.md
│ ├── security.md
│ └── testing.md
│
├── .gitignore
└── README.md

You may modify this structure if you determine a better professional architecture.

==================================================
IMPORTANT DECISION-MAKING RULE

Do not ask me to make technical decisions that you can make yourself.

You are responsible for deciding:

framework

database

folder structure

API architecture

UI architecture

authentication approach

deployment architecture

validation

security

testing strategy

WhatsApp integration strategy

If there are multiple valid choices, choose the simplest production-ready option.

==================================================
IMPORTANT WHATSAPP LIMITATION

Understand and respect this distinction:

The application can control how your backend routes, stores, moderates, and sends messages.

However, the application cannot rewrite WhatsApp's native UI or guarantee that WhatsApp itself hides every piece of identity information in every native interaction.

Therefore:

Do not promise impossible anonymity.

Do not attempt to manipulate native WhatsApp Groups unofficially.

Use official WhatsApp Business Platform capabilities.

If the desired "group" behavior cannot be implemented as a native WhatsApp Group, implement the system as a WhatsApp-based conversational/broadcast/community workflow through the official API.

The user should still interact only through WhatsApp.

==================================================
FINAL UX GOAL

The final experience should feel like:

"One private WhatsApp community controlled completely by one administrator."

For the USER:

WhatsApp only.

For the ADMIN:

Professional web Admin Panel.

The administrator should have maximum practical control over:

Members
Verification
Sections
Messages
Questions
Answers
Broadcasts
Moderation
Blocking
Suspension
Audit Logs

while maintaining official WhatsApp platform compliance and strong privacy/security.

==================================================
BUILD ORDER

Follow this implementation order:

STEP 1:
Analyze requirements and identify official WhatsApp capabilities and limitations.

STEP 2:
Create architecture.

STEP 3:
Create database schema and migrations.

STEP 4:
Create FastAPI backend.

STEP 5:
Create authentication and authorization.

STEP 6:
Create member management.

STEP 7:
Create verification workflow.

STEP 8:
Create Boys/Girls isolation.

STEP 9:
Create WhatsApp webhook integration.

STEP 10:
Create WhatsApp messaging service.

STEP 11:
Create Question & Answer system.

STEP 12:
Create Broadcast system.

STEP 13:
Create moderation.

STEP 14:
Create audit logging.

STEP 15:
Create Admin Panel.

STEP 16:
Connect Admin Panel to backend.

STEP 17:
Create tests.

STEP 18:
Run tests and fix issues.

STEP 19:
Review security.

STEP 20:
Prepare deployment.

STEP 21:
Provide final setup instructions.

==================================================
QUALITY GATE

Before declaring the project complete, verify:

[ ] Admin login works
[ ] Unauthorized users cannot access Admin Panel
[ ] Members can be created
[ ] Members can be approved
[ ] Members can be rejected
[ ] Members can be suspended
[ ] Members can be blocked
[ ] Sections work
[ ] Boys/Girls isolation works
[ ] Questions work
[ ] Answers work
[ ] Broadcast works
[ ] WhatsApp webhook works
[ ] Duplicate webhooks are handled
[ ] Message statuses work
[ ] Phone numbers are protected
[ ] Audit logs work
[ ] Error handling works
[ ] Responsive Admin Panel works
[ ] Database migrations work
[ ] Environment variables are used
[ ] No secrets are hard-coded
[ ] Tests pass
[ ] Production configuration is documented

Do not mark the project complete if critical functionality is broken.

==================================================
FINAL INSTRUCTION

Take ownership of the entire implementation.

Do not only generate a conceptual prototype.

Build the actual working application.

Make reasonable technical decisions yourself.

Keep the user experience extremely simple.

Users use WhatsApp only.

Admin uses the web Admin Panel.

Use official WhatsApp Business Platform APIs.

Do not use unofficial WhatsApp automation.

Do not invent unsupported capabilities.

If a requirement conflicts with WhatsApp limitations, automatically redesign that specific part while preserving the intended user experience as closely as technically possible.

Start by creating the architecture and then implement the complete system end-to-end.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a57bc37e-e2c1-488a-9a6f-b69dadb01c1d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
