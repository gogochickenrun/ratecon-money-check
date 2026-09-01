import { getStore } from "@netlify/blobs";

const BASE_URL = (process.env.CODEXCN_BASE_URL || "https://api2.codexcn.com/v1").replace(/\/+$/, "");
const MODEL = process.env.CODEXCN_MODEL || "gpt-5.6-sol";

const reportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    load_details: {
      type: "object",
      additionalProperties: false,
      properties: {
        load_number: { type: "string" },
        broker: { type: "string" },
        origin: { type: "string" },
        destination: { type: "string" },
        pickup_date: { type: "string" },
        delivery_date: { type: "string" },
        base_pay_amount: { type: "number", minimum: 0 },
        loaded_miles: { type: "number", minimum: 0 }
      },
      required: [
        "load_number",
        "broker",
        "origin",
        "destination",
        "pickup_date",
        "delivery_date",
        "base_pay_amount",
        "loaded_miles"
      ]
    },
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
    "load_details",
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
17. load_details is used to create a load record for the carrier. Extract load number, broker/company name, origin, destination, pickup date, delivery date, agreed base/total pay as a numeric dollar amount, and loaded miles when explicitly stated.
18. For load_details strings that are not found, return an empty string. For numeric fields not found, return 0. Never infer miles, dates, locations, broker names, or dollar amounts.
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




function cleanBase64(dataUrl){if(typeof dataUrl!=="string")return"";const comma=dataUrl.indexOf(",");return comma>=0?dataUrl.slice(comma+1):dataUrl}
function extractOutputText(data){if(typeof data?.output_text==="string"&&data.output_text.trim())return data.output_text.trim();const chunks=[];for(const item of data?.output||[]){if(item?.type!=="message")continue;for(const part of item?.content||[]){if(part?.type==="output_text"&&typeof part.text==="string")chunks.push(part.text)}}return chunks.join("").trim()}
async function saveJob(store,jobId,payload){await store.setJSON(jobId,{...payload,updatedAt:Date.now()})}

export default async (request)=>{
  const store=getStore({name:"ratecon-analysis-jobs",consistency:"strong"});
  let jobId="";
  try{
    if(request.method!=="POST")return;
    const apiKey=process.env.CODEXCN_API_KEY;
    const body=await request.json();
    jobId=String(body.jobId||"").trim();
    const filename=String(body.filename||"");
    const mimeType=String(body.mimeType||"").toLowerCase();
    const base64=cleanBase64(body.fileData);
    if(!jobId)return;
    await saveJob(store,jobId,{status:"running",createdAt:Date.now(),stage:"validating"});
    if(!apiKey){await saveJob(store,jobId,{status:"error",error:"CODEXCN_API_KEY is not configured in Netlify."});return}
    if(!filename||!base64){await saveJob(store,jobId,{status:"error",error:"Missing file."});return}
    const isPdf=mimeType==="application/pdf"||filename.toLowerCase().endsWith(".pdf");
    const isImage=new Set(["image/jpeg","image/png","image/webp"]).has(mimeType);
    if(!isPdf&&!isImage){await saveJob(store,jobId,{status:"error",error:"Please upload a PDF, JPG, PNG, or WebP file."});return}
    const approxBytes=Math.floor(base64.length*.75);
    if(approxBytes>4*1024*1024){await saveJob(store,jobId,{status:"error",error:"File is too large. Please upload a file under 4 MB."});return}
    await saveJob(store,jobId,{status:"running",createdAt:Date.now(),stage:"analyzing"});
    const fileContent=isPdf?{type:"input_file",filename:filename||"rate-confirmation.pdf",file_data:`data:application/pdf;base64,${base64}`}:{type:"input_image",image_url:`data:${mimeType};base64,${base64}`,detail:"high"};
    const payload={model:MODEL,instructions:"You are reviewing a U.S. trucking Rate Confirmation. Return only valid JSON matching the requested schema. Do not use markdown fences.",input:[{role:"user",content:[fileContent,{type:"input_text",text:reviewPrompt}]}],text:{format:{type:"json_schema",name:"rate_confirmation_risk_report",strict:true,schema:reportSchema}},reasoning:{effort:"low"},max_output_tokens:5000,store:false};
    console.log("[RateConRisk BG] provider request",{jobId,model:MODEL,fileType:isPdf?"pdf":mimeType});
    let response;
    try{response=await fetch(`${BASE_URL}/responses`,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${apiKey}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(12*60*1000)})}
    catch(err){const isTimeout=err?.name==="TimeoutError"||err?.name==="AbortError";await saveJob(store,jobId,{status:"error",error:isTimeout?"The analysis provider took more than 12 minutes to respond.":`Could not reach the analysis provider: ${err?.message||"network error"}`});return}
    const rawText=await response.text();let data;
    try{data=JSON.parse(rawText)}catch{await saveJob(store,jobId,{status:"error",error:`Provider returned HTTP ${response.status} instead of JSON. Preview: ${rawText.slice(0,180).replace(/\\s+/g," ")}`});return}
    if(!response.ok){await saveJob(store,jobId,{status:"error",error:data?.error?.message||data?.message||`Provider returned HTTP ${response.status}.`,providerStatus:response.status});return}
    const outputText=extractOutputText(data);
    if(!outputText){await saveJob(store,jobId,{status:"error",error:data?.incomplete_details?.reason?`Analysis was incomplete: ${data.incomplete_details.reason}.`:"Provider returned no usable text."});return}
    let parsed;try{parsed=JSON.parse(outputText)}catch{await saveJob(store,jobId,{status:"error",error:"The model returned an invalid structured result. Please try again."});return}
    await saveJob(store,jobId,{status:"done",result:parsed});
    console.log("[RateConRisk BG] success",{jobId,model:MODEL,inputTokens:data?.usage?.input_tokens??null,outputTokens:data?.usage?.output_tokens??null});
  }catch(err){console.error("[RateConRisk BG] unexpected",err);if(jobId){try{await saveJob(store,jobId,{status:"error",error:err?.message||"Unexpected background analysis error."})}catch{}}}
};
export const config={path:"/api/analyze-background",background:true};
