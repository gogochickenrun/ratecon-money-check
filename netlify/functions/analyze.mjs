const MODEL = process.env.CODEXCN_MODEL || "gpt-5.6-sol";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {status, headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}

export default async (request) => {
  if (request.method === "GET") return json({ok:true,service:"RateConRisk analyze",provider:"codexcn",model:MODEL,mode:"background"});
  return json({error:"Analysis runs asynchronously in this build."},405);
};

export const config = { path: "/api/analyze" };
