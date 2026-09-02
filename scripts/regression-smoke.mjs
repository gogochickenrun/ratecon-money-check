import fs from "fs";
import vm from "vm";

class LocalStorage {
  constructor(){ this.map=new Map(); }
  getItem(k){ return this.map.has(k)?this.map.get(k):null; }
  setItem(k,v){ this.map.set(k,String(v)); }
  removeItem(k){ this.map.delete(k); }
}

const ctx={
  console,
  localStorage:new LocalStorage(),
  location:{pathname:"/app/",search:"",href:"",origin:"https://rateconrisk.com"},
  CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},
  Blob:globalThis.Blob,URL:globalThis.URL,
  document:{createElement(){return{click(){},href:"",download:""}}},
  setTimeout,clearTimeout
};
ctx.window=ctx;
ctx.window.dispatchEvent=()=>{};
ctx.window.rateconTrack=()=>{};
ctx.window.RateConCloud={init:async()=>({configured:false,user:null})};

vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("../assets/store.js",import.meta.url),"utf8"),ctx);
const S=ctx.RateConStore;

const assert=(v,m)=>{if(!v)throw new Error(m)};
await S.init({requireAuth:true});
assert(S.getMode()==="local","local mode");

const t=await S.addTruck({
  unitNumber:"001",nickname:"<img src=x onerror=alert(1)>",year:2022,
  make:"Peterbilt",model:"579",monthlyTruckPayment:2000,
  monthlyInsurance:1000,monthlyPermits:100,monthlyOtherFixed:100
});

const now=new Date();
const thisMonth=now.toISOString().slice(0,7);
const today=`${thisMonth}-01`;

const l1=await S.addLoad({
  truckId:t.id,loadNumber:"L1",broker:"<b>Broker</b>",origin:"A",destination:"B",
  pickupDate:today,status:"Invoiced",revenue:3000,loadedMiles:900,deadheadMiles:100,
  invoiceDate:today,dueDate:today
});
await S.addExpense({loadId:l1.id,truckId:"wrong-truck",category:"Fuel",amount:500,date:today,note:"x"});
let data=await S.read();
assert(data.expenses[0].truckId===t.id,"expense truck must follow linked load");
assert(S.receivables(data).open.length===1,"invoiced load should be receivable");

await S.addLoad({
  truckId:t.id,loadNumber:"L2",broker:"Broker2",origin:"A",destination:"B",
  pickupDate:today,status:"Booked",revenue:1500,loadedMiles:400
});
data=await S.read();
assert(S.receivables(data).open.length===1,"booked load must not be receivable");

assert(S.esc('<img onerror="x">')==='&lt;img onerror=&quot;x&quot;&gt;',"HTML escaping");

const m=S.currentMonthMetrics(data);
assert(m.loads===2,"current month should include dated loads");
assert(Number.isFinite(S.loadTrueProfit(l1,data)),"true profit should be finite");

console.log("RateConRisk V8 smoke tests: PASS");
