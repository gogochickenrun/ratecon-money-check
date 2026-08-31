const BASE_URL = (process.env.CODEXCN_BASE_URL || "https://api2.codexcn.com/v1").replace(/\/+$/, "");
const MODEL = process.env.CODEXCN_MODEL || "gpt-5.6-sol";

const reportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        base_pay: { type: "string" },
        risk_score: { type: "integer", minimum: 0, maximum: 100 },
        potential_deductions: { type: "string" },
        detention_summary: { type: "string" },
        top_warning: { type: "string" },
        top_actions: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" }
        }
      },
      required: ["base_pay", "risk_score", "potential_deductions", "detention_summary", "top_warning", "top_actions"]
    },
    deductions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          amount_or_rule: { type: "string" },
          trigger: { type: "string" },
          source: { type: "string" }
        },
        required: ["name", "amount_or_rule", "trigger", "source"]
      }
    },
    extra_pay: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          amount_or_rule: { type: "string" },
          conditions: { type: "string" },
          source: { type: "string" }
        },
        required: ["name", "amount_or_rule", "conditions", "source"]
      }
    },
    actions: {
      type: "object",
      additionalProperties: false,
      properties: {
        before_pickup: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              action: { type: "string" },
              deadline: { type: "string" },
              source: { type: "string" }
            },
            required: ["action", "deadline", "source"]
          }
        },
        at_facility: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              action: { type: "string" },
              deadline: { type: "string" },
              source: { type: "string" }
            },
            required: ["action", "deadline", "source"]
          }
        },
        before_leaving: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              action: { type: "string" },
              deadline: { type: "string" },
              source: { type: "string" }
            },
            required: ["action", "deadline", "source"]
          }
        },
        after_delivery: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              action: { type: "string" },
              deadline: { type: "string" },
              source: { type: "string" }
            },
            required: ["action", "deadline", "source"]
          }
        }
      },
      required: ["before_pickup", "at_facility", "before_leaving", "after_delivery"]
    },
    missing_or_unclear: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          item: { type: "string" },
          why_it_matters: { type: "string" },
          source: { type: "string" }
        },
        required: ["item", "why_it_matters", "source"]
      }
    },
    questions_for_broker: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: [
    "summary",
    "deductions",
    "extra_pay",
    "actions",
    "missing_or_unclear",
    "questions_for_broker"
  ]
};

const reviewPrompt = `
Review the uploaded U.S. trucking Rate Confirmation for an owner-operator or small motor carrier.

Focus only on operational terms that can increase or reduce what the carrier gets paid.

Extract and evaluate:
- total agreed rate / linehaul / fuel surcharge if separately stated
- deductions, chargebacks, fixed penalties, offsets
- tracking requirements and stated deductions
- check-call requirements and stated deductions
- late pickup or delivery deductions
- POD / BOL submission deadlines
- exact required submission method if stated
- detention free time, hourly rate, cap, notice requirements and proof requirements
- TONU
- layover
- lumper reimbursement
- driver assist
- extra stop
- storage
- redelivery
- quick-pay fees
- paperwork requirements
- clauses that may materially affect settlement

Rules:
1. Never invent an industry default.
2. If a term is not present, do not assume it.
3. Do not state that a clause is legally enforceable.
4. Do not guarantee payment.
5. Use concise plain English suitable for a truck driver.
6. For every important finding, identify the page/section when visible. If page numbering is unavailable, cite a short heading or identifying phrase.
7. risk_score = operational risk of preventable lost pay based ONLY on this uploaded document:
   0-29 low, 30-59 moderate, 60-100 high.
8. top_warning = the single most important action or risk affecting payment. Do NOT calculate or restate a combined deduction total here; potential_deductions is the only summary field that should contain a combined fixed-dollar figure.
9. For action deadlines, use the exact timing from the document when stated. Otherwise use "No exact deadline stated."
10. base_pay should contain the exact total/base rate if found, otherwise "Not found".
11. potential_deductions should summarize ONLY fixed-dollar deductions explicitly stated in the document.
    - Prefer wording like: "Fixed deductions identified: $650 across listed requirements, plus repeatable/variable charges."
    - Never use contradictory phrasing such as "Up to $650+".
    - If a deduction can repeat per occurrence, you may include ONE occurrence in the fixed-dollar figure, but explicitly note that repeatable charges can increase the total.
    - Do NOT call deductions automatic unless the document explicitly says automatic.
    - Do NOT combine percentage fees, open-ended offsets, cargo claims, unknown amounts, or optional quick-pay fees into the fixed-dollar total.
12. detention_summary should be one short line such as "$75/hr after 2 free hours" using only the document's exact terms. If detention is not found, return "Not found".
13. top_actions must contain exactly 3 short, concrete actions that most protect payment on this load.
14. Missing-or-unclear items must be genuinely missing or ambiguous. If the document explicitly states pickup and delivery check calls, do not call the frequency unclear merely because no additional periodic schedule is listed.
15. Preserve uncertainty. If the document says "may result in", "subject to", "can be deducted", or similar, keep that uncertainty in the output.
16. questions_for_broker must ask only about information that is genuinely unanswered in the document AND could materially affect payment or eligibility. Do not ask whether extra check-call times exist when the document already states the required check calls, unless the document itself indicates another schedule. It is acceptable to return fewer than 3 questions.
`;

function extractText(interaction) {
  if (typeof interaction?.output_text === "string" && interaction.output_text.trim()) {
    return interaction.output_text.trim();
  }

  const steps = interaction?.steps || [];
  for (const step of steps) {
    if (step?.type !== "model_output") continue;
    const content = step?.content || [];
    for (const block of content) {
      if (block?.type === "text" && typeof block.text === "string" && block.text.trim()) {
        return block.text.trim();
      }
    }
  }
  return null;
}


function cleanBase64(dataUrl) {
  if (typeof dataUrl !== "string") return "";
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks = [];
  for (const item of data?.output || []) {
    if (item?.type !== "message") continue;
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join("").trim();
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed." })
    };
  }

  const apiKey = process.env.CODEXCN_API_KEY;
  if (!apiKey) {
    console.error("[RateConRisk] CODEXCN_API_KEY missing");
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Service is not configured yet." })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const filename = String(body.filename || "");
    const mimeType = String(body.mimeType || "").toLowerCase();
    const base64 = cleanBase64(body.fileData);

    if (!filename || !base64) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing file." })
      };
    }

    const isPdf =
      mimeType === "application/pdf" ||
      filename.toLowerCase().endsWith(".pdf");

    const allowedImages = new Set(["image/jpeg", "image/png", "image/webp"]);
    const isImage = allowedImages.has(mimeType);

    if (!isPdf && !isImage) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Please upload a PDF, JPG, PNG, or WebP file." })
      };
    }

    const approxBytes = Math.floor(base64.length * 0.75);
    if (approxBytes > 4 * 1024 * 1024) {
      return {
        statusCode: 413,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "File is too large. Please upload a file under 4 MB." })
      };
    }

    const fileContent = isPdf
      ? {
          type: "input_file",
          filename: filename || "rate-confirmation.pdf",
          file_data: `data:application/pdf;base64,${base64}`
        }
      : {
          type: "input_image",
          image_url: `data:${mimeType};base64,${base64}`,
          detail: "high"
        };

    const payload = {
      model: MODEL,
      instructions:
        "You are reviewing a U.S. trucking Rate Confirmation. " +
        "Return only valid JSON matching the requested schema. Do not use markdown fences.",
      input: [
        {
          role: "user",
          content: [
            fileContent,
            { type: "input_text", text: reviewPrompt }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "rate_confirmation_risk_report",
          strict: true,
          schema: reportSchema
        }
      },
      reasoning: { effort: "low" },
      max_output_tokens: 5000,
      store: false
    };

    const response = await fetch(`${BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const rawText = await response.text();
    let data = null;

    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[RateConRisk] Provider returned non-JSON", {
        status: response.status,
        body: rawText.slice(0, 1000)
      });
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `Analysis provider returned HTTP ${response.status} with a non-JSON response.`
        })
      };
    }

    if (!response.ok) {
      const providerMessage =
        data?.error?.message ||
        data?.message ||
        `Analysis provider returned HTTP ${response.status}.`;

      console.error("[RateConRisk] Provider error", {
        status: response.status,
        model: MODEL,
        message: providerMessage
      });

      return {
        statusCode: response.status >= 400 && response.status < 600 ? response.status : 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: providerMessage })
      };
    }

    const outputText = extractOutputText(data);

    if (!outputText) {
      console.error("[RateConRisk] No text output", {
        model: MODEL,
        providerStatus: data?.status,
        incompleteDetails: data?.incomplete_details,
        body: JSON.stringify(data).slice(0, 1500)
      });

      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: data?.incomplete_details?.reason
            ? `Analysis was incomplete: ${data.incomplete_details.reason}.`
            : "No usable result was returned."
        })
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      console.error("[RateConRisk] Invalid JSON output", outputText.slice(0, 2000));
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "The analysis result could not be parsed. Please try again."
        })
      };
    }

    console.log("[RateConRisk] analysis success", {
      provider: "codexcn",
      model: MODEL,
      fileType: isPdf ? "pdf" : mimeType,
      inputTokens: data?.usage?.input_tokens ?? null,
      outputTokens: data?.usage?.output_tokens ?? null
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(parsed)
    };
  } catch (err) {
    console.error("[RateConRisk] Unexpected error", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err?.message || "Unexpected error." })
    };
  }
};
