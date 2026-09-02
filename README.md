# RateConRisk — SEO 版

这版包含：

- 主工具首页（上传 Rate Con）
- 10 个 SEO 指南页
- 3 个免费计算器
- `/guides/`
- `/tools/`
- `sitemap.xml`
- `robots.txt`
- canonical
- Open Graph / Twitter Card
- WebSite / WebApplication / Article / Breadcrumb / FAQ 结构化数据
- 1200x630 OG 图片
- 404 页面
- 完整内链

## 重要：上线前改域名

代码目前统一使用：

`https://rateconrisk.com`

如果最终买的不是这个域名，请在整个项目里全局替换：

`https://rateconrisk.com`

替换成你买的正式域名，例如：

`https://yourdomain.com`

必须在上线前改，因为 canonical、sitemap、Open Graph 都用了它。

## 10 个 SEO 页面

1. `/rate-confirmation/`
2. `/rate-con-red-flags/`
3. `/detention-pay/`
4. `/tonu-pay/`
5. `/layover-pay/`
6. `/lumper-fee/`
7. `/broker-deductions/`
8. `/pod-deadline/`
9. `/tracking-requirements/`
10. `/rate-confirmation-checklist/`

## 3 个免费计算器

- `/tools/detention-pay-calculator/`
- `/tools/rate-per-mile-calculator/`
- `/tools/accessorial-pay-calculator/`

每个计算器和 SEO 页面都导向首页的 Rate Con 上传工具。

## SEO 思路

不要依赖品牌词。

要覆盖的是问题型搜索：

- rate confirmation trucking
- how to read a rate confirmation
- rate con red flags
- detention pay trucking
- detention pay calculator
- TONU pay
- layover pay trucking
- lumper fee reimbursement
- broker deductions trucking
- POD deadline
- tracking deductions
- rate confirmation checklist

## Netlify / 后端

保留之前的 Netlify Function：

`netlify/functions/analyze.mjs`

环境变量：

`GEMINI_API_KEY`

可选：

`GEMINI_MODEL`

## 上线后立刻做

1. 把正式域名替换进所有 canonical / sitemap。
2. Netlify 绑定域名。
3. Google Search Console 添加域名。
4. 提交 `/sitemap.xml`。
5. Bing Webmaster Tools 也提交 sitemap。
6. 给首页和 3 个计算器各找 5–10 个真实 owner-operator 测试。
7. 记录：搜索词、上传率、第二次上传率。

## 不要做的事

- 不要一次生成 500 篇 AI 水文。
- 不要做同义词页面互相抢排名。
- 不要把首页变成百科全书。
- 不要为了 SEO 在主上传流程前增加注册。
- 不要把 FAQ Schema 当成一定会展示富摘要；Schema 主要用于明确页面结构。

## 下一阶段 SEO

验证有真实用户后，再增加：
- broker-specific Rate Con pages
- facility wait-time / detention guides
- state/region freight pages（只有存在真实搜索意图才做）
- real anonymized Rate Con examples
- comparison pages
- original data reports based on anonymized clause statistics

真正能形成护城河的是“真实 Rate Con 条款数据”，不是文章数量。


## V4 结果页优化

结果第一屏现在优先展示：
- Money Risk Score
- Potential deductions
- Detention summary
- Base load pay
- 3 things you must not miss

详细扣款、额外收入、动作、缺失条款和 Broker 问题继续放在下面。

Prompt 也收紧：
- `may result in` 不再写成必扣
- 不把比例费用/开放式 offset 硬凑成美元总额
- missing/unclear 只报告真正缺失或含糊的内容


## V5 MVP cleanup
- Prevents top warning from contradicting the fixed deduction total.
- Replaces awkward wording like "Up to $650+" with a single fixed-dollar summary.
- Excludes optional percentage fees and open-ended offsets from the fixed-dollar total.
- Avoids broker questions already answered by the Rate Con.
- Fixes copied top-action text so numbering reads "1 Accept..." instead of "1Accept...".
- Default Gemini model now matches `gemini-3-flash-preview`.


## CodexCN relay migration

RateConRisk now uses the same relay approach as Velora:

`Browser → Netlify Function → CodexCN Responses API → Codex model`

Defaults:
- Base URL: `https://api2.codexcn.com/v1`
- Endpoint: `/responses`
- Model: `gpt-5.6-sol`

### Netlify environment variables

Required:
`CODEXCN_API_KEY = your relay API key`

Optional:
`CODEXCN_BASE_URL = https://api2.codexcn.com/v1`
`CODEXCN_MODEL = gpt-5.6-sol`

After adding the key, redeploy the RateConRisk Netlify project.

The old `GEMINI_API_KEY` and `GEMINI_MODEL` variables are no longer used and can be removed after confirming the new version works.

Preserved:
- PDF / JPG / PNG / WebP upload
- 4 MB upload limit
- structured money-risk report
- existing SEO pages
- sitemap / robots
- existing GA4 and RateConRisk custom events


## CodexCN V2 diagnostics

This build fixes the raw `Unexpected token '<'` error.

Changes:
- `/api/analyze` is now owned directly by the Netlify Function (no redirect rule).
- `GET /api/analyze` returns a JSON health check.
- The provider request aborts at 55 seconds so Netlify does not return its own HTML timeout page.
- The browser no longer blindly calls `response.json()`.
- Provider HTML/error pages are converted to readable JSON errors and logged.

After deployment, first open:

`https://rateconrisk.com/api/analyze`

Expected:

`{"ok":true,"service":"RateConRisk analyze","provider":"codexcn",...}`

Then test a small Rate Confirmation PDF.

If analysis still fails, the page will now show the real provider error.


## V3 — actual frontend JSON parsing fix

Important correction:
The production homepage contains its upload logic inline inside `index.html`.
V2 patched `assets/app.js`, but the homepage did not use that file for the upload request.

V3 patches the real inline code:
- reads the response as text first
- parses JSON safely
- shows HTTP status + a short response preview when Netlify/provider returns HTML
- adds no-cache headers for HTML so fixes are picked up quickly

After deploying V3:
1. Open `https://rateconrisk.com/api/analyze` and confirm the JSON health response.
2. Reload `https://rateconrisk.com`.
3. Upload the Rate Con again.
4. Copy the NEW full error message if analysis still fails.


## V4 — Background analysis architecture

The relay can exceed Netlify's synchronous function limit. V4 uses a Background Function plus temporary Netlify Blobs and browser polling.

Flow: Browser → Background Function → CodexCN → temporary result → polling → render.


## V5 — Owner-Operator Business Dashboard

New pages:
- `/app/` Dashboard
- `/app/loads/`
- `/app/expenses/`
- `/app/brokers/`
- `/app/documents/`

Rate Con analysis now extracts load metadata and includes a **Save as Load** action.

The V1 business dashboard calculates revenue, expenses, profit and true RPM with normal code, not the language model.

Current MVP storage is browser-local. Before production-grade financial use, add authentication, cloud database and backups.


## V6 — Cloud owner-operator operating system

V6 adds the three major pieces needed for a real daily-use product:

### 1. Login + cloud data
- Email magic-link authentication with Supabase Auth.
- Loads, trucks and expenses sync to PostgreSQL.
- Row Level Security isolates every user's business data.
- Existing local browser data can automatically migrate into the user's cloud account if the cloud account is empty.
- If Supabase has not been configured yet, the app falls back to local preview mode instead of breaking the existing site.

### 2. Invoice / AR / payment speed
Loads now support:
- invoice number
- invoice date
- due date
- paid date
- amount paid
- days outstanding
- days to pay

New page:
`/app/receivables/`

Broker Scorecard now includes average days to pay.

### 3. Trucks + real cost per mile
New page:
`/app/trucks/`

Each truck can store monthly:
- truck payment
- insurance
- permits
- other fixed costs

Current-month True CPM is calculated in normal code:

`(tracked variable expenses + monthly fixed truck costs) / tracked miles`

Load "true profit" allocates monthly fixed truck cost by the truck's tracked miles.

### Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run:
   `supabase/schema.sql`
4. In Authentication → URL Configuration:
   - Site URL: `https://rateconrisk.com`
   - Add redirect URL: `https://rateconrisk.com/app/login/*`
5. In Netlify → RateConRisk → Environment variables, add:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
6. Redeploy.

The publishable key is designed for client-side use. RLS is what protects each user's rows.

Existing `CODEXCN_API_KEY` remains unchanged for Rate Con analysis.


## V7 — Save button / duplicate record hotfix

Fixed:
- Truck modal staying open after a successful cloud insert.
- Repeated clicks creating duplicate truck rows.
- Same async form issue on Expenses.
- Added save locks to Loads too.

Truck page now detects exact duplicate truck records and shows a:
`Clean N duplicates`
button.

Cleanup preserves relationships:
- loads linked to duplicate truck rows are reassigned to the kept truck
- expenses linked to duplicate truck rows are reassigned to the kept truck
- duplicate truck rows are then deleted


## V9 — WhatsApp support

Added site-wide WhatsApp support:
- floating support button on public and `/app/` pages
- compact mobile presentation
- prefilled support message
- analysis-result WhatsApp CTA
- GA event: `whatsapp_support_click`

Destination:
`+1 943 260 1577`
