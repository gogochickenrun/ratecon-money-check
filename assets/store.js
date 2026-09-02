(() => {
  const LOCAL_KEY = "rateconrisk_fleet_v1";
  let mode = "local";
  let db = null;
  let user = null;

  const blank = () => ({ trucks: [], loads: [], expenses: [] });
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const money = v => new Intl.NumberFormat("en-US", {
    style:"currency", currency:"USD", maximumFractionDigits:0
  }).format(num(v));
  const money2 = v => new Intl.NumberFormat("en-US", {
    style:"currency", currency:"USD", minimumFractionDigits:2, maximumFractionDigits:2
  }).format(num(v));

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));

  const safeInternalPath = (value, fallback="/app/") => {
    const s = String(value || "");
    if (!s.startsWith("/") || s.startsWith("//")) return fallback;
    if (!s.startsWith("/app")) return fallback;
    return s;
  };

  function localRead() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
      if (raw) return {
        trucks: Array.isArray(raw.trucks) ? raw.trucks : [],
        loads: Array.isArray(raw.loads) ? raw.loads : [],
        expenses: Array.isArray(raw.expenses) ? raw.expenses : []
      };
    } catch {}
    return blank();
  }

  function localWrite(data) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  }

  function localId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  }

  function mapTruck(row) {
    return {
      id: row.id,
      unitNumber: row.unit_number ?? row.unitNumber ?? "",
      nickname: row.nickname ?? "",
      year: row.year ?? "",
      make: row.make ?? "",
      model: row.model ?? "",
      monthlyTruckPayment: num(row.monthly_truck_payment ?? row.monthlyTruckPayment),
      monthlyInsurance: num(row.monthly_insurance ?? row.monthlyInsurance),
      monthlyPermits: num(row.monthly_permits ?? row.monthlyPermits),
      monthlyOtherFixed: num(row.monthly_other_fixed ?? row.monthlyOtherFixed),
      createdAt: row.created_at ?? row.createdAt ?? ""
    };
  }

  function mapLoad(row) {
    return {
      id: row.id,
      truckId: row.truck_id ?? row.truckId ?? "",
      loadNumber: row.load_number ?? row.loadNumber ?? "",
      broker: row.broker ?? "",
      origin: row.origin ?? "",
      destination: row.destination ?? "",
      pickupDate: row.pickup_date ?? row.pickupDate ?? "",
      deliveryDate: row.delivery_date ?? row.deliveryDate ?? "",
      status: row.status ?? "Booked",
      revenue: num(row.revenue),
      loadedMiles: num(row.loaded_miles ?? row.loadedMiles),
      deadheadMiles: num(row.deadhead_miles ?? row.deadheadMiles),
      riskScore: num(row.risk_score ?? row.riskScore),
      potentialDeductions: row.potential_deductions ?? row.potentialDeductions ?? "",
      sourceFilename: row.source_filename ?? row.sourceFilename ?? "",
      invoiceNumber: row.invoice_number ?? row.invoiceNumber ?? "",
      invoiceDate: row.invoice_date ?? row.invoiceDate ?? "",
      dueDate: row.due_date ?? row.dueDate ?? "",
      paidDate: row.paid_date ?? row.paidDate ?? "",
      amountPaid: num(row.amount_paid ?? row.amountPaid),
      documents: row.documents || {
        rateCon:false,bol:false,pod:false,invoice:false,lumper:false
      },
      createdAt: row.created_at ?? row.createdAt ?? ""
    };
  }

  function mapExpense(row) {
    return {
      id: row.id,
      loadId: row.load_id ?? row.loadId ?? "",
      truckId: row.truck_id ?? row.truckId ?? "",
      category: row.category ?? "Other",
      amount: num(row.amount),
      date: row.expense_date ?? row.date ?? "",
      note: row.note ?? "",
      createdAt: row.created_at ?? row.createdAt ?? ""
    };
  }

  function toTruckRow(t) {
    return {
      user_id: user?.id,
      unit_number: String(t.unitNumber || ""),
      nickname: String(t.nickname || ""),
      year: t.year ? Number(t.year) : null,
      make: String(t.make || ""),
      model: String(t.model || ""),
      monthly_truck_payment: num(t.monthlyTruckPayment),
      monthly_insurance: num(t.monthlyInsurance),
      monthly_permits: num(t.monthlyPermits),
      monthly_other_fixed: num(t.monthlyOtherFixed)
    };
  }

  function toLoadRow(l) {
    return {
      user_id: user?.id,
      truck_id: l.truckId || null,
      load_number: String(l.loadNumber || ""),
      broker: String(l.broker || ""),
      origin: String(l.origin || ""),
      destination: String(l.destination || ""),
      pickup_date: l.pickupDate || null,
      delivery_date: l.deliveryDate || null,
      status: String(l.status || "Booked"),
      revenue: num(l.revenue),
      loaded_miles: num(l.loadedMiles),
      deadhead_miles: num(l.deadheadMiles),
      risk_score: num(l.riskScore),
      potential_deductions: String(l.potentialDeductions || ""),
      source_filename: String(l.sourceFilename || ""),
      invoice_number: String(l.invoiceNumber || ""),
      invoice_date: l.invoiceDate || null,
      due_date: l.dueDate || null,
      paid_date: l.paidDate || null,
      amount_paid: num(l.amountPaid),
      documents: l.documents || {
        rateCon:false,bol:false,pod:false,invoice:false,lumper:false
      }
    };
  }

  function toExpenseRow(e) {
    return {
      user_id: user?.id,
      load_id: e.loadId || null,
      truck_id: e.truckId || null,
      category: String(e.category || "Other"),
      amount: num(e.amount),
      expense_date: e.date || new Date().toISOString().slice(0,10),
      note: String(e.note || "")
    };
  }

  async function init({ requireAuth = true } = {}) {
    const cloud = await window.RateConCloud.init();
    if (cloud.configured && cloud.user) {
      mode = "cloud";
      user = cloud.user;
      db = window.RateConCloud.getClient();
      await migrateLocalIfNeeded();
      return { mode, user };
    }

    if (cloud.configured && !cloud.user && requireAuth) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `/app/login/?next=${next}`;
      return { mode:"cloud", user:null, redirected:true };
    }

    mode = "local";
    user = null;
    return { mode, user:null, configured: cloud.configured };
  }

  async function read() {
    if (mode !== "cloud") return localRead();

    const [{ data: trucks, error: te }, { data: loads, error: le }, { data: expenses, error: ee }] =
      await Promise.all([
        db.from("trucks").select("*").order("created_at", { ascending:false }),
        db.from("loads").select("*").order("created_at", { ascending:false }),
        db.from("expenses").select("*").order("expense_date", { ascending:false })
      ]);

    const error = te || le || ee;
    if (error) throw error;

    return {
      trucks: (trucks || []).map(mapTruck),
      loads: (loads || []).map(mapLoad),
      expenses: (expenses || []).map(mapExpense)
    };
  }

  async function migrateLocalIfNeeded() {
    if (mode !== "cloud" || !user?.id) return;

    const markerKey = `${LOCAL_KEY}_migrated_${user.id}`;
    if (localStorage.getItem(markerKey)) return;

    const local = localRead();
    if (!local.loads.length && !local.expenses.length && !local.trucks.length) {
      localStorage.setItem(markerKey, new Date().toISOString());
      return;
    }

    const [
      { count: loadCount, error: loadCountError },
      { count: truckCount, error: truckCountError },
      { count: expenseCount, error: expenseCountError }
    ] = await Promise.all([
      db.from("loads").select("*", { count:"exact", head:true }),
      db.from("trucks").select("*", { count:"exact", head:true }),
      db.from("expenses").select("*", { count:"exact", head:true })
    ]);

    const countError = loadCountError || truckCountError || expenseCountError;
    if (countError) throw countError;

    // Only auto-migrate into a completely empty cloud account.
    if ((loadCount || 0) > 0 || (truckCount || 0) > 0 || (expenseCount || 0) > 0) {
      localStorage.setItem(markerKey, new Date().toISOString());
      return;
    }

    const truckMap = new Map();
    for (const t of local.trucks || []) {
      const { data, error } = await db.from("trucks").insert(toTruckRow(t)).select().single();
      if (error) throw error;
      if (data) truckMap.set(t.id, data.id);
    }

    const loadMap = new Map();
    for (const l of local.loads || []) {
      const row = toLoadRow({ ...l, truckId: truckMap.get(l.truckId) || null });
      const { data, error } = await db.from("loads").insert(row).select().single();
      if (error) throw error;
      if (data) loadMap.set(l.id, data.id);
    }

    for (const e of local.expenses || []) {
      const row = toExpenseRow({
        ...e,
        loadId: loadMap.get(e.loadId) || null,
        truckId: truckMap.get(e.truckId) || null
      });
      const { error } = await db.from("expenses").insert(row);
      if (error) throw error;
    }

    localStorage.setItem(markerKey, new Date().toISOString());
    window.rateconTrack?.("fleet_local_data_migrated", {
      loads: local.loads.length,
      expenses: local.expenses.length,
      trucks: local.trucks.length
    });
  }

  async function addTruck(t) {
    if (mode !== "cloud") {
      const data = localRead();
      const record = mapTruck({
        id: localId("truck"),
        ...t,
        createdAt: new Date().toISOString()
      });
      data.trucks.unshift(record);
      localWrite(data);
      return record;
    }
    const { data, error } = await db.from("trucks").insert(toTruckRow(t)).select().single();
    if (error) throw error;
    window.rateconTrack?.("fleet_truck_created");
    return mapTruck(data);
  }

  async function updateTruck(id, patch) {
    if (mode !== "cloud") {
      const data = localRead();
      const i = data.trucks.findIndex(x=>x.id===id);
      if (i<0) return null;
      data.trucks[i] = { ...data.trucks[i], ...patch };
      localWrite(data);
      return data.trucks[i];
    }
    const { data, error } = await db.from("trucks").update(toTruckRow(patch)).eq("id",id).select().single();
    if (error) throw error;
    return mapTruck(data);
  }

  async function removeTruck(id) {
    if (mode !== "cloud") {
      const data=localRead();
      data.trucks=data.trucks.filter(x=>x.id!==id);
      data.loads=data.loads.map(l=>l.truckId===id?{...l,truckId:""}:l);
      data.expenses=data.expenses.map(e=>e.truckId===id?{...e,truckId:""}:e);
      localWrite(data);
      return;
    }
    const { error } = await db.from("trucks").delete().eq("id",id);
    if (error) throw error;
  }

  async function addLoad(l) {
    if (mode !== "cloud") {
      const data=localRead();
      const record=mapLoad({
        id:localId("load"),
        ...l,
        documents:l.documents||{rateCon:false,bol:false,pod:false,invoice:false,lumper:false},
        createdAt:new Date().toISOString()
      });
      data.loads.unshift(record);localWrite(data);
      window.rateconTrack?.("fleet_load_created",{source:l.sourceFilename?"ratecon":"manual"});
      return record;
    }
    const { data, error } = await db.from("loads").insert(toLoadRow(l)).select().single();
    if (error) throw error;
    window.rateconTrack?.("fleet_load_created",{source:l.sourceFilename?"ratecon":"manual"});
    return mapLoad(data);
  }

  async function updateLoad(id, patch) {
    if (mode !== "cloud") {
      const data=localRead(),i=data.loads.findIndex(x=>x.id===id);
      if(i<0)return null;
      data.loads[i]={...data.loads[i],...patch,documents:patch.documents?{...data.loads[i].documents,...patch.documents}:data.loads[i].documents};
      localWrite(data);return data.loads[i];
    }
    const current = (await read()).loads.find(x=>x.id===id);
    const merged = {
      ...current, ...patch,
      documents: patch.documents ? { ...current.documents, ...patch.documents } : current.documents
    };
    const { data, error } = await db.from("loads").update(toLoadRow(merged)).eq("id",id).select().single();
    if (error) throw error;
    return mapLoad(data);
  }

  async function removeLoad(id) {
    if (mode !== "cloud") {
      const data=localRead();
      data.loads=data.loads.filter(x=>x.id!==id);
      data.expenses=data.expenses.filter(x=>x.loadId!==id);
      localWrite(data);return;
    }
    const { error } = await db.from("loads").delete().eq("id",id);
    if (error) throw error;
  }

  async function addExpense(e) {
    let normalized = { ...e };

    // A load is the source of truth for truck assignment.
    // This prevents one expense from being counted against two trucks.
    if (normalized.loadId) {
      const current = await read();
      const linkedLoad = current.loads.find(l => l.id === normalized.loadId);
      if (linkedLoad) normalized.truckId = linkedLoad.truckId || "";
    }

    if (mode !== "cloud") {
      const data=localRead();
      const record=mapExpense({
        id:localId("exp"),
        ...normalized,
        date: normalized.date || new Date().toISOString().slice(0,10),
        createdAt:new Date().toISOString()
      });
      data.expenses.unshift(record);localWrite(data);
      window.rateconTrack?.("fleet_expense_added",{category:record.category});
      return record;
    }

    const { data, error } = await db.from("expenses").insert(toExpenseRow(normalized)).select().single();
    if (error) throw error;
    window.rateconTrack?.("fleet_expense_added",{category:normalized.category});
    return mapExpense(data);
  }

  async function removeExpense(id) {
    if (mode !== "cloud") {
      const data=localRead();data.expenses=data.expenses.filter(x=>x.id!==id);localWrite(data);return;
    }
    const { error } = await db.from("expenses").delete().eq("id",id);
    if (error) throw error;
  }

  function loadMiles(l) { return num(l.loadedMiles) + num(l.deadheadMiles); }
  function loadDirectExpenses(loadId, data) {
    return data.expenses.filter(e=>e.loadId===loadId).reduce((s,e)=>s+num(e.amount),0);
  }
  function truckFixedMonthly(t) {
    return num(t.monthlyTruckPayment)+num(t.monthlyInsurance)+num(t.monthlyPermits)+num(t.monthlyOtherFixed);
  }

  function monthKey(value=new Date()) {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return "";
      return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}`;
    }

    const s = String(value || "").trim();
    if (!s) return "";

    // ISO/date inputs can be read directly without appending another time suffix.
    const isoMatch = s.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function currentMonthMetrics(data) {
    const mk=monthKey(new Date());
    const loads=data.loads.filter(l=>monthKey(l.pickupDate||l.createdAt)===mk);
    const expenses=data.expenses.filter(e=>monthKey(e.date||e.createdAt)===mk);
    const revenue=loads.reduce((s,l)=>s+num(l.revenue),0);
    const miles=loads.reduce((s,l)=>s+loadMiles(l),0);
    const variableExpenses=expenses.reduce((s,e)=>s+num(e.amount),0);
    const fixedCosts=data.trucks.reduce((s,t)=>s+truckFixedMonthly(t),0);
    const totalCosts=variableExpenses+fixedCosts;
    const unpaid=loads.filter(l=>l.status!=="Paid").reduce((s,l)=>s+Math.max(0,num(l.revenue)-num(l.amountPaid)),0);
    return {
      loads:loads.length,revenue,miles,variableExpenses,fixedCosts,totalCosts,
      profit:revenue-totalCosts,cpm:miles?totalCosts/miles:0,rpm:miles?revenue/miles:0,unpaid
    };
  }

  function truckMetricsForMonth(truck, data, targetMonth) {
    const mk = targetMonth || monthKey(new Date());
    const loads=data.loads.filter(l=>l.truckId===truck.id && monthKey(l.pickupDate||l.createdAt)===mk);
    const loadIds=new Set(loads.map(l=>l.id));
    const expenses=data.expenses.filter(e =>
      monthKey(e.date||e.createdAt)===mk &&
      (e.truckId===truck.id || loadIds.has(e.loadId))
    );
    const revenue=loads.reduce((s,l)=>s+num(l.revenue),0);
    const miles=loads.reduce((s,l)=>s+loadMiles(l),0);
    const variable=expenses.reduce((s,e)=>s+num(e.amount),0);
    const fixed=truckFixedMonthly(truck);
    const costs=variable+fixed;
    return {
      month:mk,loads:loads.length,revenue,miles,variable,fixed,costs,
      profit:revenue-costs,cpm:miles?costs/miles:0,rpm:miles?revenue/miles:0,
      fixedCpm:miles?fixed/miles:0
    };
  }

  function truckMetrics(truck, data) {
    return truckMetricsForMonth(truck, data, monthKey(new Date()));
  }

  function loadTrueProfit(load, data) {
    const direct=loadDirectExpenses(load.id,data);
    const miles=loadMiles(load);
    const truck=data.trucks.find(t=>t.id===load.truckId);
    let allocatedFixed=0;

    if(truck && miles){
      const loadMonth = monthKey(load.pickupDate || load.createdAt);
      const tm=truckMetricsForMonth(truck,data,loadMonth);
      allocatedFixed=miles*(tm.fixedCpm||0);
    }

    return num(load.revenue)-direct-allocatedFixed;
  }

  function daysBetween(a,b) {
    if(!a||!b)return null;
    const x=new Date(`${a}T00:00:00`),y=new Date(`${b}T00:00:00`);
    if(Number.isNaN(x.getTime())||Number.isNaN(y.getTime()))return null;
    return Math.round((y-x)/86400000);
  }

  function daysToPay(load) {
    if(load.paidDate && load.invoiceDate) return daysBetween(load.invoiceDate, load.paidDate);
    return null;
  }

  function daysOutstanding(load) {
    if(load.status==="Paid") return 0;
    const start=load.invoiceDate||load.deliveryDate;
    if(!start)return null;
    return daysBetween(start,new Date().toISOString().slice(0,10));
  }

  function receivables(data) {
    const open=data.loads.filter(l => {
      const invoiced = l.status === "Invoiced" || Boolean(l.invoiceDate) || Boolean(l.invoiceNumber);
      const balance = num(l.revenue) - num(l.amountPaid);
      return invoiced && l.status !== "Paid" && balance > 0;
    });

    const total=open.reduce((s,l)=>s+Math.max(0,num(l.revenue)-num(l.amountPaid)),0);
    const overdue=open.filter(l=>l.dueDate && new Date(`${l.dueDate}T23:59:59`) < new Date());
    const overdueTotal=overdue.reduce((s,l)=>s+Math.max(0,num(l.revenue)-num(l.amountPaid)),0);
    const paidDays=data.loads.map(daysToPay).filter(v=>v!==null);
    const avgDaysPaid=paidDays.length?paidDays.reduce((a,b)=>a+b,0)/paidDays.length:0;
    return {open,total,overdue:overdue.length,overdueTotal,avgDaysPaid};
  }

  function brokers(data) {
    const map=new Map();
    for(const l of data.loads){
      const name=l.broker.trim()||"Unknown broker";
      if(!map.has(name))map.set(name,{broker:name,loads:0,revenue:0,miles:0,expenses:0,unpaid:0,risk:0,paidDays:[]});
      const r=map.get(name);
      r.loads++;r.revenue+=num(l.revenue);r.miles+=loadMiles(l);r.expenses+=loadDirectExpenses(l.id,data);
      r.unpaid+=l.status==="Paid"?0:Math.max(0,num(l.revenue)-num(l.amountPaid));
      r.risk+=num(l.riskScore);
      const d=daysToPay(l);if(d!==null)r.paidDays.push(d);
    }
    return [...map.values()].map(r=>({
      ...r,profit:r.revenue-r.expenses,rpm:r.miles?r.revenue/r.miles:0,
      avgRisk:r.loads?r.risk/r.loads:0,
      avgDaysToPay:r.paidDays.length?r.paidDays.reduce((a,b)=>a+b,0)/r.paidDays.length:null
    })).sort((a,b)=>b.revenue-a.revenue);
  }

  async function exportLoadsCSV() {
    const data=await read();
    const rows=[["Load #","Truck","Broker","Origin","Destination","Pickup","Delivery","Status","Revenue","Amount Paid","Invoice #","Invoice Date","Due Date","Paid Date","Loaded Miles","Deadhead Miles","Direct Expenses","True Profit"]];
    for(const l of data.loads){
      const truck=data.trucks.find(t=>t.id===l.truckId);
      rows.push([
        l.loadNumber,truck?.unitNumber||"",l.broker,l.origin,l.destination,l.pickupDate,l.deliveryDate,l.status,l.revenue,l.amountPaid,
        l.invoiceNumber,l.invoiceDate,l.dueDate,l.paidDate,l.loadedMiles,l.deadheadMiles,loadDirectExpenses(l.id,data),loadTrueProfit(l,data)
      ]);
    }
    const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=`rateconrisk-loads-${new Date().toISOString().slice(0,10)}.csv`;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }


  function truckFingerprint(t) {
    return [
      String(t.unitNumber || "").trim().toLowerCase(),
      String(t.nickname || "").trim().toLowerCase(),
      String(t.year || "").trim(),
      String(t.make || "").trim().toLowerCase(),
      String(t.model || "").trim().toLowerCase(),
      num(t.monthlyTruckPayment).toFixed(2),
      num(t.monthlyInsurance).toFixed(2),
      num(t.monthlyPermits).toFixed(2),
      num(t.monthlyOtherFixed).toFixed(2)
    ].join("|");
  }

  async function truckDuplicateCount() {
    const data = await read();
    const seen = new Set();
    let duplicates = 0;
    for (const t of data.trucks) {
      const fp = truckFingerprint(t);
      if (seen.has(fp)) duplicates++;
      else seen.add(fp);
    }
    return duplicates;
  }

  async function dedupeTrucks() {
    const data = await read();
    const keepByFingerprint = new Map();
    const duplicateToKeep = new Map();

    // read() returns newest first; keep the newest exact copy.
    for (const t of data.trucks) {
      const fp = truckFingerprint(t);
      if (!keepByFingerprint.has(fp)) keepByFingerprint.set(fp, t);
      else duplicateToKeep.set(t.id, keepByFingerprint.get(fp).id);
    }

    if (!duplicateToKeep.size) return 0;

    if (mode !== "cloud") {
      const local = localRead();

      local.loads = local.loads.map(l => ({
        ...l,
        truckId: duplicateToKeep.get(l.truckId) || l.truckId
      }));

      local.expenses = local.expenses.map(e => ({
        ...e,
        truckId: duplicateToKeep.get(e.truckId) || e.truckId
      }));

      local.trucks = local.trucks.filter(t => !duplicateToKeep.has(t.id));
      localWrite(local);
      return duplicateToKeep.size;
    }

    for (const [duplicateId, keepId] of duplicateToKeep.entries()) {
      const { error: loadError } = await db
        .from("loads")
        .update({ truck_id: keepId })
        .eq("truck_id", duplicateId);
      if (loadError) throw loadError;

      const { error: expenseError } = await db
        .from("expenses")
        .update({ truck_id: keepId })
        .eq("truck_id", duplicateId);
      if (expenseError) throw expenseError;

      const { error: deleteError } = await db
        .from("trucks")
        .delete()
        .eq("id", duplicateId);
      if (deleteError) throw deleteError;
    }

    window.rateconTrack?.("fleet_truck_duplicates_cleaned", {
      removed: duplicateToKeep.size
    });

    return duplicateToKeep.size;
  }

  function getMode(){return mode;}
  function getUser(){return user;}

  window.RateConStore = {
    init,read,addTruck,updateTruck,removeTruck,addLoad,updateLoad,removeLoad,
    addExpense,removeExpense,loadMiles,loadDirectExpenses,truckFixedMonthly,
    currentMonthMetrics,truckMetrics,loadTrueProfit,daysToPay,daysOutstanding,
    receivables,brokers,exportLoadsCSV,money,money2,num,esc,safeInternalPath,
    truckDuplicateCount,dedupeTrucks,getMode,getUser
  };
})();