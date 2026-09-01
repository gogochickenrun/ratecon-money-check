# RateConRisk V6 — Supabase setup

## Create the project
Create a new Supabase project for RateConRisk.

## Database
Open **SQL Editor → New query** and run the full contents of:

`supabase/schema.sql`

This creates:
- trucks
- loads
- expenses
- indexes
- Row Level Security policies

## Authentication
Use email magic links.

In **Authentication → URL Configuration**:

Site URL:
`https://rateconrisk.com`

Redirect URLs:
`https://rateconrisk.com/app/login/*`
`https://rateconrisk.com/app/*`

## Netlify
Add these environment variables to the RateConRisk project:

`SUPABASE_URL`
`SUPABASE_PUBLISHABLE_KEY`

You can copy them from the Supabase project API settings.

Do not use the service-role secret in frontend configuration.

After adding the variables, redeploy.

## Test
1. Open `https://rateconrisk.com/app/`
2. You should be redirected to `/app/login/`
3. Enter your email.
4. Open the magic link.
5. Add a truck.
6. Add/save a load.
7. Refresh or use another browser/device while signed in and verify the cloud data remains.
