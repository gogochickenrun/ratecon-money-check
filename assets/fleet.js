(() => {
  const KEY = "rateconrisk_fleet_v1";
  const blank = () => ({ loads: [], expenses: [] });

  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (v && Array.isArray(v.loads) && Array.isArray(v.expenses)) return v;
    } catch {}
    return blank();
  }

  function write(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("rateconfleet:change"));
  }

  const id = (prefix="id") =>
    `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;

  const num = v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const money = v => new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0
  }).format(num(v));

  const decimalMoney = v => new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(num(v));

  function addLoad(load) {
    const data = read();
    const record = {
      id: load.id || id("load"),
      loadNumber: String(load.loadNumber || ""),
      broker: String(load.broker || ""),
      origin: String(load.origin || ""),
      destination: String(load.destination || ""),
      pickupDate: String(load.pickupDate || ""),
      deliveryDate: String(load.deliveryDate || ""),
      revenue: num(load.revenue),
      loadedMiles: num(load.loadedMiles),
      deadheadMiles: num(load.deadheadMiles),
      status: String(load.status || "Booked"),
      riskScore: num(load.riskScore),
      potentialDeductions: String(load.potentialDeductions || ""),
      sourceFilename: String(load.sourceFilename || ""),
      documents: {
        rateCon: Boolean(load.documents?.rateCon),
        bol: Boolean(load.documents?.bol),
        pod: Boolean(load.documents?.pod),
        invoice: Boolean(load.documents?.invoice),
        lumper: Boolean(load.documents?.lumper)
      },
      createdAt: load.createdAt || new Date().toISOString()
    };
    data.loads.unshift(record);
    write(data);
    window.rateconTrack?.("fleet_load_created", {
      source: load.sourceFilename ? "ratecon" : "manual",
      status: record.status
    });
    return record;
  }

  function updateLoad(idValue, patch) {
    const data = read();
    const i = data.loads.findIndex(x => x.id === idValue);
    if (i < 0) return null;
    data.loads[i] = {
      ...data.loads[i],
      ...patch,
      documents: patch.documents
        ? { ...data.loads[i].documents, ...patch.documents }
        : data.loads[i].documents
    };
    write(data);
    return data.loads[i];
  }

  function removeLoad(idValue) {
    const data = read();
    data.loads = data.loads.filter(x => x.id !== idValue);
    data.expenses = data.expenses.filter(x => x.loadId !== idValue);
    write(data);
  }

  function addExpense(expense) {
    const data = read();
    const record = {
      id: id("exp"),
      loadId: String(expense.loadId || ""),
      category: String(expense.category || "Other"),
      amount: num(expense.amount),
      date: String(expense.date || new Date().toISOString().slice(0,10)),
      note: String(expense.note || ""),
      createdAt: new Date().toISOString()
    };
    data.expenses.unshift(record);
    write(data);
    window.rateconTrack?.("fleet_expense_added", { category: record.category });
    return record;
  }

  function removeExpense(idValue) {
    const data = read();
    data.expenses = data.expenses.filter(x => x.id !== idValue);
    write(data);
  }

  function loadExpenseTotal(loadId, data=read()) {
    return data.expenses
      .filter(e => e.loadId === loadId)
      .reduce((s,e) => s + num(e.amount), 0);
  }

  function loadMiles(load) {
    return num(load.loadedMiles) + num(load.deadheadMiles);
  }

  function loadProfit(load, data=read()) {
    return num(load.revenue) - loadExpenseTotal(load.id, data);
  }

  function metrics(data=read()) {
    const revenue = data.loads.reduce((s,l) => s + num(l.revenue), 0);
    const expenses = data.expenses.reduce((s,e) => s + num(e.amount), 0);
    const miles = data.loads.reduce((s,l) => s + loadMiles(l), 0);
    const unpaid = data.loads
      .filter(l => l.status !== "Paid")
      .reduce((s,l) => s + num(l.revenue), 0);
    return {
      revenue, expenses, profit: revenue - expenses, miles,
      rpm: miles ? revenue / miles : 0,
      unpaid, loads: data.loads.length
    };
  }

  function brokers(data=read()) {
    const map = new Map();
    for (const load of data.loads) {
      const name = load.broker.trim() || "Unknown broker";
      if (!map.has(name)) map.set(name, {
        broker: name, loads: 0, revenue: 0, miles: 0, expenses: 0,
        unpaid: 0, riskTotal: 0
      });
      const row = map.get(name);
      row.loads += 1;
      row.revenue += num(load.revenue);
      row.miles += loadMiles(load);
      row.expenses += loadExpenseTotal(load.id, data);
      if (load.status !== "Paid") row.unpaid += num(load.revenue);
      row.riskTotal += num(load.riskScore);
    }
    return [...map.values()].map(r => ({
      ...r,
      profit: r.revenue - r.expenses,
      rpm: r.miles ? r.revenue / r.miles : 0,
      avgRisk: r.loads ? r.riskTotal / r.loads : 0
    })).sort((a,b) => b.revenue - a.revenue);
  }

  function exportLoadsCSV() {
    const data = read();
    const rows = [[
      "Load #","Broker","Origin","Destination","Pickup","Delivery",
      "Status","Revenue","Loaded Miles","Deadhead Miles","Expenses","Profit","RPM"
    ]];
    data.loads.forEach(l => {
      const exp = loadExpenseTotal(l.id, data);
      const miles = loadMiles(l);
      rows.push([
        l.loadNumber,l.broker,l.origin,l.destination,l.pickupDate,l.deliveryDate,
        l.status,l.revenue,l.loadedMiles,l.deadheadMiles,exp,l.revenue-exp,
        miles ? (l.revenue/miles).toFixed(2) : ""
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rateconrisk-loads-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  window.RateConFleet = {
    read, write, addLoad, updateLoad, removeLoad,
    addExpense, removeExpense, loadExpenseTotal,
    loadMiles, loadProfit, metrics, brokers,
    money, decimalMoney, num, exportLoadsCSV
  };
})();