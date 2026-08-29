# RateConRisk production setup

Domain: https://rateconrisk.com

## Google Analytics 4
1. Create a GA4 property and Web data stream for https://rateconrisk.com
2. Copy the Measurement ID (format: G-XXXXXXXXXX)
3. Open assets/analytics.js
4. Replace:
   const RATECONRISK_GA_ID = "";
   with your real ID.
5. Commit to GitHub; Netlify will redeploy.

## Google Search Console
Use a Domain property:
rateconrisk.com

Google will give you a TXT verification value.
Because the domain uses Netlify DNS, add that TXT record in Netlify DNS, not Namecheap.
After verification, submit:
https://rateconrisk.com/sitemap.xml
