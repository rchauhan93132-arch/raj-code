/* STORAGE */
let monthData = JSON.parse(localStorage.getItem("DATA_V12") || "{}");
function saveStore(){ localStorage.setItem("DATA_V12", JSON.stringify(monthData)); }

/* RATES */
const rates = {
  Atulbhai:{
    pakoda:{1:27,2:39},
    sheets:{3:84,4:90,5:96,6:102,7:108,8:114,9:66, 10:120}
  },
  Hiteshbhai:{
    pakoda:{},
    sheets:{1:77,2:82.5,3:88,4:93.5,5:99,6:90}
  },
  Kishan:{
    pakoda:{1:27},
    sheets:{2:60,3:66,4:72,5:78,6:84}
  }
};

/* CUTS (price string -> cut) */
const cuts = {
  Atulbhai: {
    pakoda: { "27": 9, "39": 13 },
    sheets: { "84": 14, "90": 15, "96": 16, "102": 17, "108": 18, "114": 19 ,"66": 19, "120": 20 }
  },
  Hiteshbhai: {
    pakoda: {},
    sheets: { "77": 14, "82.5": 15, "88": 16, "93.5": 17, "99": 18, "90": 19 }
  },
  Kishan: {
    pakoda: { "27": 9 },
    sheets: { "60": 10, "66": 11, "72": 12, "78": 13, "84": 14 }
  }
};

function getCut(customer, mode, price) {
  if (!customer || !mode || price === undefined || price === null) return 0;
  const key = String(price);
  return (cuts[customer] && cuts[customer][mode] && cuts[customer][mode][key] !== undefined) ? cuts[customer][mode][key] : 0;
}

/* DOM refs */
const monthSelect = document.getElementById("monthSelect");
const daySelect = document.getElementById("daySelect");
const datePicker = document.getElementById("datePicker");
const viewMonth = document.getElementById("viewMonth");
const person = document.getElementById("person");
const mode = document.getElementById("mode");
const rate = document.getElementById("rate");
const customRateInput = document.getElementById("customRateInput"); // New Manual Input
const sheetCount = document.getElementById("sheetCount");
const sheetName = document.getElementById("sheetName");
const autoSaveCheckbox = document.getElementById("autoSaveCheckbox");
const resultBox = document.getElementById("resultBox");
const monthlyTotal = document.getElementById("monthlyTotal");
const viewPerson = document.getElementById("viewPerson");
const historyList = document.getElementById("historyList");
const dayTotalsTable = document.getElementById("dayTotalsTable");
const footerMonthlyTotal = document.getElementById("footerMonthlyTotal");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

/* Edit state */
let currentEdit = null; // {month, person, day, idx, entry}

/* Date helpers */
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function getDaysInMonth(year, monthIndex){
  return new Date(year, monthIndex + 1, 0).getDate();
}

function parseMonthLabel(label){
  if(!label) {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  }
  const parts = label.split(" ");
  const name = parts[0];
  const year = parseInt(parts[1],10);
  const monthIndex = MONTH_NAMES.indexOf(name);
  return { year: isNaN(year) ? new Date().getFullYear() : year, monthIndex: monthIndex < 0 ? 0 : monthIndex };
}

/* Populate months & days */
function generateMonths(baseDate){
  const arr=[];
  const base = baseDate || new Date();
  for(let i=0;i<12;i++){
    const d = new Date(base.getFullYear(), base.getMonth()+i, 1);
    arr.push(d.toLocaleString("en-US",{month:"long"})+" "+d.getFullYear());
  }
  return arr;
}

function populateMonthDay(baseDate){
  const months = generateMonths(baseDate);
  monthSelect.innerHTML=""; 
  viewMonth.innerHTML="";
  months.forEach(m=>{
    monthSelect.add(new Option(m,m));
    viewMonth.add(new Option(m,m));
  });
  // daySelect is filled by handleDateChange()
}

/* helpers for monthData */
function ensure(month, per){
  if(!monthData[month]) monthData[month]={};
  if(!monthData[month][per]) monthData[month][per] = { __dayTotals:{}, __monthlyTotal:0 };
}
function recomputeTotals(month, per){
  if(!monthData[month] || !monthData[month][per]) return;
  const days = Object.keys(monthData[month][per]).filter(k=>!k.startsWith("__"));
  days.forEach(d=>{
    monthData[month][per].__dayTotals[d] = monthData[month][per][d].reduce((s,e)=>s+ (Number(e.total)||0),0);
  });
  monthData[month][per].__monthlyTotal = Object.values(monthData[month][per].__dayTotals).reduce((s,v)=>s+ (Number(v)||0),0);
}

/* Migration for older entries */
function migrateOldEntries(){
  let changed=false;
  for(const month in monthData){
    for(const per in monthData[month]){
      if(per.startsWith("__")) continue;
      for(const day of Object.keys(monthData[month][per]).filter(k=>!k.startsWith("__"))){
        const arr = monthData[month][per][day];
        for(const entry of arr){
          if(entry.price === undefined || entry.price === null){
            const r = entry.rate;
            const modeVal = entry.mode;
            const cfg = (rates[per] && rates[per][modeVal]) || {};
            if(cfg && cfg[String(r)] !== undefined){
              entry.price = Number(cfg[String(r)]);
              entry.rate = String(entry.price);
              entry.cut = getCut(per, modeVal, entry.price);
              changed=true;
            } else {
              const maybePrice = parseFloat(String(r));
              if(!isNaN(maybePrice)){
                entry.price = maybePrice;
                entry.rate = String(maybePrice);
                entry.cut = getCut(per, modeVal, maybePrice);
                changed=true;
              }
            }
          } else {
            entry.rate = String(entry.price);
            entry.cut = entry.cut !== undefined ? entry.cut : getCut(per, entry.mode, entry.price);
          }
        }
      }
      recomputeTotals(month, per);
    }
  }
  if(changed) saveStore();
}

/* Date sync */
function handleDateChange(newDate){
  if(!(newDate instanceof Date) || isNaN(newDate)) newDate = new Date();

  const year = newDate.getFullYear();
  const monthIndex = newDate.getMonth();
  const day = newDate.getDate();

  const label = MONTH_NAMES[monthIndex] + " " + year;
  let found = false;
  for(let i=0;i<monthSelect.options.length;i++){
    if(monthSelect.options[i].value === label){
      monthSelect.selectedIndex = i;
      found = true;
      break;
    }
  }
  if(!found){
    populateMonthDay(newDate);
    for(let i=0;i<monthSelect.options.length;i++){
      if(monthSelect.options[i].value === label){
        monthSelect.selectedIndex = i;
        break;
      }
    }
  }
  viewMonth.value = label;

  const dim = getDaysInMonth(year, monthIndex);
  daySelect.innerHTML = "";
  for(let d=1; d<=dim; d++){
    daySelect.add(new Option(d, d));
  }
  const finalDay = Math.min(day, dim);
  daySelect.value = String(finalDay);

  const yyyy = year;
  const mm = String(monthIndex+1).padStart(2,"0");
  const dd = String(finalDay).padStart(2,"0");
  datePicker.value = `${yyyy}-${mm}-${dd}`;

  updateSummary();
  renderHistory();
}

/* update rates: show "price (cut)" label but value is price */
function updateRates() {
  // reset manual input
  customRateInput.style.display = "none";
  customRateInput.value = "";
  
  rate.innerHTML = "<option value=''>-- Select rate --</option>";
  const customer = person.value;
  const m = mode.value;
  if (!customer || !m) return;
  const obj = rates[customer] && rates[customer][m] ? rates[customer][m] : {};
  Object.keys(obj).forEach(key => {
    const price = obj[key];
    const cutVal = getCut(customer, m, price);
    const label = `${price} (${cutVal})`;
    rate.add(new Option(label, String(price)));
  });
  
  // ADD MANUAL ENTRY OPTION
  rate.add(new Option("Manual / Custom", "manual"));
}

/* Logic for Manual Entry Visibility */
rate.addEventListener("change", ()=>{
    if(rate.value === "manual"){
        customRateInput.style.display = "block";
        customRateInput.focus();
    } else {
        customRateInput.style.display = "none";
    }
    scheduleAutoSave();
});
customRateInput.addEventListener("input", scheduleAutoSave);

person.addEventListener("change", ()=>{ updateRates(); updateSummary(); });
mode.addEventListener("change", updateRates);

/* autosave debounce */
let autoTimer=null;
function scheduleAutoSave(){
  clearTimeout(autoTimer);
  autoTimer = setTimeout(()=> {
    // Check if rate is valid (either dropdown is selected, or if manual, input has value)
    let rateIsValid = false;
    if(rate.value && rate.value !== "manual") rateIsValid = true;
    if(rate.value === "manual" && customRateInput.value) rateIsValid = true;

    if(autoSaveCheckbox.checked && person.value && mode.value && rateIsValid && sheetCount.value !== "" && sheetName.value.trim() !== ""){
      if(!currentEdit) calculate(false);
    }
  }, 600);
}
["input","change"].forEach(ev=>{
  sheetCount.addEventListener(ev, scheduleAutoSave);
  // rate listener already handled above
  mode.addEventListener(ev, scheduleAutoSave);
  person.addEventListener(ev, scheduleAutoSave);
  sheetName.addEventListener(ev, scheduleAutoSave);
});

/* save/calculate */
function onSaveClicked(){
  if(currentEdit) saveEditedEntry(); else calculate(true);
}
function calculate(manual=false){
  const month = monthSelect.value;
  const day = String(daySelect.value);
  const per = person.value;
  const m = mode.value;
  let rateVal = rate.value; // price string
  const sheets = parseFloat(sheetCount.value);
  const sheet = sheetName.value.trim();

  // Handle Manual Rate
  let finalPrice = 0;
  if(rateVal === "manual"){
      finalPrice = parseFloat(customRateInput.value);
      if(isNaN(finalPrice)) rateVal = ""; // invalidate if empty
  } else {
      finalPrice = parseFloat(rateVal);
  }

  if(!per || !m || !rateVal || isNaN(sheets) || !sheet || isNaN(finalPrice)){
    if(manual) alert("Fill all fields: customer, mode, rate, sheetCount, sheetName.");
    return;
  }

  ensure(month, per);
  const cutVal = getCut(per, m, finalPrice);
  const total = +(finalPrice * sheets).toFixed(2);
  const timestamp = new Date().toLocaleString();

  if(!monthData[month][per][day]) monthData[month][per][day] = [];

  monthData[month][per][day].push({
    day, mode: m, rate: String(finalPrice), price: finalPrice, cut: cutVal, sheetCount: sheets, total, sheetName: sheet, timestamp
  });

  recomputeTotals(month, per);
  saveStore();

  resultBox.innerHTML = `${sheet} saved → ${sheets}×${finalPrice} = <b>${total}</b><br><small>Cut: ${cutVal} • ${timestamp}</small>`;
  sheetCount.value = "";
  sheetName.value = "";
  // Keep rate as is, or reset if you prefer. 
  updateSummary();
  renderHistory();
}

/* edit entry */
function editEntry(month, per, day, idx){
  if(!monthData[month] || !monthData[month][per] || !monthData[month][per][day]) return;
  const arr = monthData[month][per][day];
  if(idx < 0 || idx >= arr.length) return;

  // remove entry temporarily
  const entry = arr.splice(idx,1)[0];
  if(arr.length === 0) delete monthData[month][per][day];

  recomputeTotals(month, per);
  saveStore();

  currentEdit = { month, person: per, day, idx, entry };

  // set date from entry.day + selected month
  monthSelect.value = month;
  viewMonth.value = month;
  const { year, monthIndex } = parseMonthLabel(month);
  const dim = getDaysInMonth(year, monthIndex);
  daySelect.innerHTML = "";
  for(let d=1; d<=dim; d++){
    daySelect.add(new Option(d, d));
  }
  daySelect.value = String(entry.day || 1);

  const dt = new Date(year, monthIndex, Number(daySelect.value) || 1);
  handleDateChange(dt);

  person.value = per;
  mode.value = entry.mode;
  updateRates();
  
  // Set Rate (Handle Manual vs Preset)
  setTimeout(()=>{
    const priceStr = (entry.rate !== undefined ? String(entry.rate) : (entry.price !== undefined ? String(entry.price) : ""));
    // check if price exists in dropdown options
    let exists = false;
    for(let i=0; i<rate.options.length; i++){
        if(rate.options[i].value === priceStr) { exists = true; break; }
    }
    
    if(exists && priceStr){
        rate.value = priceStr;
        customRateInput.style.display = "none";
    } else {
        // Must be manual
        rate.value = "manual";
        customRateInput.style.display = "block";
        customRateInput.value = priceStr;
    }
  }, 30);
  
  sheetCount.value = entry.sheetCount;
  sheetName.value = entry.sheetName;

  // UI changes
  saveBtn.textContent = "Save Edited Entry";
  saveBtn.classList.remove("btn-blue"); saveBtn.classList.add("btn-green");
  cancelEditBtn.style.display = "inline-block";

  resultBox.innerHTML = `Editing entry from ${entry.timestamp} • Cut: ${entry.cut || 0}`;
  updateSummary();
  renderHistory();
}

function saveEditedEntry(){
  if(!currentEdit) return;
  const month = monthSelect.value;
  const day = String(daySelect.value);
  const per = person.value;
  const m = mode.value;
  let rateVal = rate.value; 
  const sheets = parseFloat(sheetCount.value);
  const sheet = sheetName.value.trim();

  // Handle Manual Rate
  let finalPrice = 0;
  if(rateVal === "manual"){
      finalPrice = parseFloat(customRateInput.value);
      if(isNaN(finalPrice)) rateVal = ""; 
  } else {
      finalPrice = parseFloat(rateVal);
  }

  if(!per || !m || !rateVal || isNaN(sheets) || !sheet || isNaN(finalPrice)){
    alert("Fill all fields before saving edited entry.");
    return;
  }

  const timestamp = currentEdit.entry.timestamp || new Date().toLocaleString();
  ensure(month, per);
  if(!monthData[month][per][day]) monthData[month][per][day] = [];

  const cutVal = getCut(per, m, finalPrice);
  const total = +(finalPrice * sheets).toFixed(2);

  const newEntry = { day, mode: m, rate: String(finalPrice), price: finalPrice, cut: cutVal, sheetCount: sheets, total, sheetName: sheet, timestamp };
  monthData[month][per][day].push(newEntry);

  recomputeTotals(month, per);
  if(currentEdit.month !== month || currentEdit.person !== per || currentEdit.day !== day){
    recomputeTotals(currentEdit.month, currentEdit.person);
  }

  saveStore();

  currentEdit = null;
  saveBtn.textContent = "Save Entry";
  saveBtn.classList.remove("btn-green"); saveBtn.classList.add("btn-blue");
  cancelEditBtn.style.display = "none";

  sheetCount.value = "";
  sheetName.value = "";
  resultBox.innerHTML = `Edited and saved: ${sheet} → ${sheets}×${finalPrice} = <b>${total}</b> • Cut: ${cutVal}`;
  updateSummary();
  renderHistory();
}

function cancelEdit(){
  if(!currentEdit) return;
  const old = currentEdit;
  ensure(old.month, old.person);
  if(!monthData[old.month][old.person][old.day]) monthData[old.month][old.person][old.day] = [];
  monthData[old.month][old.person][old.day].push(old.entry);
  recomputeTotals(old.month, old.person);
  saveStore();

  currentEdit = null;
  saveBtn.textContent = "Save Entry";
  saveBtn.classList.remove("btn-green"); saveBtn.classList.add("btn-blue");
  cancelEditBtn.style.display = "none";
  customRateInput.style.display = "none";

  sheetCount.value = "";
  sheetName.value = "";
  resultBox.innerHTML = "Edit cancelled — original entry restored.";
  updateSummary();
  renderHistory();
}

/* render history (group date once per day in view) */
function renderHistory(){
  const month = viewMonth.value || monthSelect.value;
  const per = viewPerson.value;
  historyList.innerHTML = "";
  dayTotalsTable.innerHTML = "";

  if(!monthData[month] || !monthData[month][per]){
    historyList.innerHTML = "<div class='muted'>No entries.</div>";
    footerMonthlyTotal.innerText = "0";
    monthlyTotal.innerText = "0";
    return;
  }

  const days = Object.keys(monthData[month][per]).filter(k=>!k.startsWith("__")).sort((a,b)=>+a - +b);

  days.forEach(d => {
    let shown = false;
    monthData[month][per][d].forEach((e, idx) => {
      // show date only on first entry of that day
      const dateLabel = shown ? "" : `Day ${e.day}`;
      shown = true;

      const outer = document.createElement("div");
      outer.style.padding = "8px 6px";
      outer.style.borderBottom = "1px solid #e8eef8";

      const row = document.createElement("div");
      row.className = "entry-row";

      const left = document.createElement("div");
      left.className = "entry-left";
      left.innerHTML = `<div><strong>${dateLabel}</strong> ${e.sheetName}</div>
        <div class="muted">Sheets: ${e.sheetCount} • Rate: ${e.price} • Cut: ${e.cut || 0} • Total: <strong>${e.total}</strong></div>
        <div class="muted">${e.timestamp}</div>`;

      const actions = document.createElement("div");
      actions.className = "entry-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ Edit";
      editBtn.className = "btn-blue";
      editBtn.onclick = ()=> editEntry(month, per, d, idx);

      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑 Delete";
      delBtn.className = "btn-red";
      delBtn.onclick = ()=> {
        if(!confirm("Delete this entry?")) return;
        monthData[month][per][d].splice(idx,1);
        if(monthData[month][per][d].length === 0) delete monthData[month][per][d];
        recomputeTotals(month, per);
        saveStore();
        renderHistory();
        updateSummary();
      };

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      row.appendChild(left);
      row.appendChild(actions);
      outer.appendChild(row);
      historyList.appendChild(outer);
    });
  });

  days.forEach(d=>{
    dayTotalsTable.innerHTML += `<tr><td>Day ${d}</td><td class="right">${monthData[month][per].__dayTotals[d]}</td></tr>`;
  });

  footerMonthlyTotal.innerText = monthData[month][per].__monthlyTotal || 0;
  monthlyTotal.innerText = monthData[month][per].__monthlyTotal || 0;
}

/* update summary */
function updateSummary(){
  const month = monthSelect.value;
  const per = person.value;
  let monthly = 0;
  if(monthData[month] && monthData[month][per]) monthly = monthData[month][per].__monthlyTotal || 0;
  monthlyTotal.innerText = monthly;
}

/* reset */
function resetForm(){
  person.value=""; mode.value=""; rate.innerHTML = "<option value=''>-- Select rate --</option>";
  sheetCount.value=""; sheetName.value="";
  customRateInput.style.display="none";
  resultBox.innerHTML = "No entry saved yet.";
  if(currentEdit) cancelEdit();
  updateSummary();
}

function deleteSelectedCustomerEntries() {
  const month = monthSelect.value;
  const per = person.value;

  if (!month || !per) {
    alert("Please select month and customer first.");
    return;
  }

  if (!monthData[month] || !monthData[month][per]) {
    alert("No entries found for this customer.");
    return;
  }

  if (!confirm(`Delete ALL entries for "${per}" in ${month}?`)) return;

  // ✅ delete only selected customer
  delete monthData[month][per];

  // remove empty month
  if (Object.keys(monthData[month]).length === 0) {
    delete monthData[month];
  }

  saveStore();
  resetForm();
  renderHistory();
  updateSummary();

  alert(`All entries for "${per}" deleted.`);
}


/* EXCEL building (unchanged) */
function buildExcel(month, per){
  const rows = [
    ["Name:","Chauhan Harsh Dilipbhai"],
    [],
    ["Day","Date","Sheet Name","Sheet Count","Rate","Cut","Total","Daily Subtotal","Timestamp"]
  ];
  if(monthData[month] && monthData[month][per]){
    const days = Object.keys(monthData[month][per]).filter(d=>!d.startsWith("__")).sort((a,b)=>+a - +b);
    days.forEach(d=>{
      const daily = monthData[month][per].__dayTotals[d];
      monthData[month][per][d].forEach(e=>{
        const dateOnly = (e.timestamp||"").split(",")[0];
        rows.push([e.day, dateOnly, e.sheetName, e.sheetCount, e.price, e.cut || 0, e.total, daily, e.timestamp]);
      });
    });
    rows.push([]);
    rows.push(["","","","","FINAL PRICE", monthData[month][per].__monthlyTotal || 0]);
  }
  return rows;
}
function saveOneExcel(){
  const month = monthSelect.value;
  const per = person.value;
  if(!per) { alert("Select a customer first."); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(buildExcel(month,per));
  XLSX.utils.book_append_sheet(wb, ws, per);
  XLSX.writeFile(wb, `${per}_${month}.xlsx`);
}

function buildDailyExcel(month, per){
  const rows = [
    ["Name:","Chauhan Harsh Dilipbhai"],
    [],
    ["Day","Date","Sheet Name","SheetCount","Rate","Cut","Total","DailySubtotal","Timestamp"]
  ];
  if(monthData[month] && monthData[month][per]){
    const days = Object.keys(monthData[month][per]).filter(d=>!d.startsWith("__")).sort((a,b)=>+a - +b);
    days.forEach(d=>{
      const daily = monthData[month][per].__dayTotals[d];
      monthData[month][per][d].forEach(e=>{
        const dateOnly = (e.timestamp||"").split(",")[0];
        rows.push([e.day, dateOnly, e.sheetName, e.sheetCount, e.price, e.cut || 0, e.total, daily, e.timestamp]);
      });
    });
    rows.push([]);
    rows.push(["","","","FINAL PRICE", monthData[month][per].__monthlyTotal || 0]);
  }
  return rows;
}
function saveDailyExcelsForAll(){
  const month = monthSelect.value;
  ["Atulbhai","Hiteshbhai","Kishan"].forEach(per=>{
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(buildDailyExcel(month,per));
    XLSX.utils.book_append_sheet(wb, ws, per);
    XLSX.writeFile(wb, `${per}_${month}_DAILY.xlsx`);
  });
  alert("Saved daily Excel files for all customers.");
}

/* ====== PDF defaults and titles ====== */
const pdfTitles = {
  Atulbhai: "Chandan Computer and Arts",
  Hiteshbhai: "Kotak",
  Kishan: "Chandan Graphicas"
};

// A4 pts
const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 36;
const borderPadding = 10;
const lineHeight = 14;

// column widths
const cw = {
  date: 70,
  sheet: 240,
  count: 60,
  cut: 60
};

/* draw header - PDF HEADER LOGIC (Updated) */
function drawPageHeader(docObj, customerName, isFirstPage) {
  const doc = docObj;
  
  // 1. Draw Border (Always)
  doc.setLineWidth(1);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  let headerY;

  if (isFirstPage) {
    // --- PAGE 1: TITLE & INFO ---
    const headerTitle = pdfTitles[customerName] || customerName;

    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    const titleWidth = doc.getTextWidth(headerTitle);
    const titleX = (pageWidth - titleWidth) / 2;
    const titleY = margin + 30;
    doc.text(headerTitle, titleX, titleY);

    doc.setLineWidth(1.2);
    doc.line(titleX - 8, titleY + 4, titleX + titleWidth + 8, titleY + 4);
    doc.setLineWidth(0.5);

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("Prepared by: Chauhan Harsh Dilipbhai", margin + 10, margin + 55);
    
    // Date Range top right (Only on page 1)
    if (window.__activeDateRange) {
       doc.setFontSize(12);
       const tr = window.__activeDateRange;
       const x = pageWidth - margin - doc.getTextWidth(tr);
       const y = margin + 55;
       doc.text(tr, x, y);
    }

    headerY = margin + 80; // Start table lower
  } else {
    // --- PAGE 2+: COMPACT HEADER (NO TITLE) ---
    headerY = margin + 30; // Start table higher
  }

  // --- COLUMN HEADERS (Always show these) ---
  doc.setFontSize(11);
  doc.setFont(undefined, "bold"); 
  doc.text("Date", margin + 10, headerY);
  doc.text("Sheet Name", margin + 10 + cw.date, headerY);
  doc.text("Count", margin + 10 + cw.date + cw.sheet, headerY);
  doc.text("Cut", margin + 10 + cw.date + cw.sheet + cw.count, headerY);
  doc.text("Total", margin + 10 + cw.date + cw.sheet + cw.count + cw.cut, headerY);

  doc.setLineWidth(1);
  doc.line(margin + 10, headerY + 4, pageWidth - margin - 10, headerY + 4);
  
  // Reset font for body
  doc.setFont(undefined, "normal"); 

  return headerY + 20; // Return Y position for next row
}

/* helper: get first and last dates for a calendar month label */
function getPDFDateRangeForMonth(monthLabel) {
  if (!monthLabel) return "";
  const parts = monthLabel.split(" ");
  if (parts.length < 2) return "";
  const mName = parts[0];
  const yStr = parts[1];
  const monthIndex = MONTH_NAMES.indexOf(mName);
  const yearNum = Number(yStr);
  if (monthIndex < 0 || isNaN(yearNum)) return "";
  const firstDate = `1-${monthIndex + 1}-${yearNum}`;
  const lastDay = getDaysInMonth(yearNum, monthIndex);
  const lastDate = `${lastDay}-${monthIndex + 1}-${yearNum}`;
  return `${firstDate} to ${lastDate}`;
}

/* ----------------------------
   downloadMonthlyPDF
---------------------------- */
function downloadMonthlyPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "a4");

  // month label selected in UI
  const month = monthSelect.value || (new Date().toLocaleString("en-US",{month:"long", year:"numeric"}));
  let per = prompt("Enter customer: Atulbhai / Hiteshbhai / Kishan / all", "all");
  if (!per) return;
  per = per.trim();
  const customers = per.toLowerCase() === "all" ? ["Atulbhai", "Hiteshbhai", "Kishan"] : [per];

  // automatic calendar month date range label
  const monthRangeLabel = getPDFDateRangeForMonth(month);

  // Ask user for a custom date range (optional). If blank -> use monthRangeLabel
  let customRange = prompt("Enter date range (example: 1-12-2025 to 31-12-2025) or leave empty to use calendar month range", monthRangeLabel);
  if (customRange && customRange.trim() !== "") {
    window.__activeDateRange = customRange.trim();
  } else {
    window.__activeDateRange = monthRangeLabel;
  }

  customers.forEach((cust, custIndex) => {
    if (custIndex > 0) doc.addPage();

    const titleText = pdfTitles[cust] || cust;
    // Call drawPageHeader with isFirstPage = true
    let y = drawPageHeader(doc, titleText, true);

    if (!monthData[month] || !monthData[month][cust]) {
      doc.text("No entries.", margin + borderPadding, y);
      y += 20;
    } else {
      const days = Object.keys(monthData[month][cust]).filter(k=>!k.startsWith("__")).sort((a,b)=>+a - +b);

      const base = parseMonthLabel(month);
      let baseMonthIndex = base.monthIndex;
      let baseYearNum = base.year;

      days.forEach(day => {
        let printedDateForThisDay = false;

        monthData[month][cust][day].forEach(entry => {
          const displayMonthIndex = baseMonthIndex;
          const displayYearNum = baseYearNum;

          const dateOnly = printedDateForThisDay ? "" : `${entry.day}-${displayMonthIndex+1}-${displayYearNum}`;
          printedDateForThisDay = true;

          const lines = doc.splitTextToSize(entry.sheetName, cw.sheet - 8);
          const rowHeight = Math.max(lineHeight, lines.length * lineHeight) + 6;

          // PAGE BREAK CHECK
          if (y + rowHeight + 50 > pageHeight - margin) {
            doc.addPage();
            // Call drawPageHeader with isFirstPage = false (No Title)
            y = drawPageHeader(doc, titleText, false);
            // REMOVED RE-PRINT DATE LOGIC HERE TO FIX YOUR BUG
          }
          
          let pdfSheetCount = entry.sheetCount;
          if(entry.mode === "sheets") {
             pdfSheetCount = entry.sheetCount * 2;
          }

          doc.setFontSize(10);
          doc.text(dateOnly, margin + borderPadding, y);
          doc.text(lines, margin + borderPadding + cw.date, y);
          doc.text(String(pdfSheetCount), margin + borderPadding + cw.date + cw.sheet, y);
          doc.text(String(entry.cut || 0), margin + borderPadding + cw.date + cw.sheet + cw.count, y);
          doc.text(String(entry.total), margin + borderPadding + cw.date + cw.sheet + cw.count + cw.cut, y);

          y += rowHeight;
        });

        y += 4;
      });
    }

    const finalPrice = monthData[month] && monthData[month][cust] && monthData[month][cust].__monthlyTotal ? monthData[month][cust].__monthlyTotal : 0;
    const finalText = `Total: ${finalPrice}`;
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    const fpWidth = doc.getTextWidth(finalText);
    const fpX = pageWidth - margin - borderPadding - fpWidth;
    const finalY = pageHeight - margin - 36;

    if (y + 40 > pageHeight - margin) {
      doc.addPage();
      // Even for just the total, use compact header if spilling over
      drawPageHeader(doc, titleText, false);
    }

    doc.text(finalText, fpX, finalY);
  });

  let fileBase = window.__activeDateRange || month;
  fileBase = fileBase.replace(/\s+to\s+/g, "_to_").replace(/-/g, "_").replace(/\s+/g, "_");
  doc.save(fileBase + "_Report.pdf");
}

/* view & events */
viewMonth.addEventListener("change", renderHistory);
viewPerson.addEventListener("change", renderHistory);

monthSelect.addEventListener("change", ()=>{
  const { year, monthIndex } = parseMonthLabel(monthSelect.value);
  let selectedDay = Number(daySelect.value) || 1;

  let idx = monthSelect.selectedIndex;
  let targetIndex = idx;
  let found = false;
  let dayWanted = selectedDay;

  const dimHere = getDaysInMonth(year, monthIndex);
  if(dayWanted > dimHere){
    for(let i = idx; i < monthSelect.options.length; i++){
      const lbl = monthSelect.options[i].value;
      const parsed = parseMonthLabel(lbl);
      const dim = getDaysInMonth(parsed.year, parsed.monthIndex);
      if(dayWanted <= dim){
        targetIndex = i;
        found = true;
        break;
      }
    }
  }

  if(found && targetIndex !== idx){
    monthSelect.selectedIndex = targetIndex;
    const parsed = parseMonthLabel(monthSelect.value);
    handleDateChange(new Date(parsed.year, parsed.monthIndex, dayWanted));
  } else {
    const dim = getDaysInMonth(year, monthIndex);
    selectedDay = Math.min(dayWanted, dim);
    handleDateChange(new Date(year, monthIndex, selectedDay));
  }
});

daySelect.addEventListener("change", ()=>{
  const { year, monthIndex } = parseMonthLabel(monthSelect.value);
  let d = Number(daySelect.value) || 1;
  const dim = getDaysInMonth(year, monthIndex);
  if(d > dim) d = dim;
  handleDateChange(new Date(year, monthIndex, d));
});

datePicker.addEventListener("change", ()=>{
  if(!datePicker.value) return;
  const [yyyy,mm,dd] = datePicker.value.split("-");
  const d = new Date(Number(yyyy), Number(mm)-1, Number(dd));
  handleDateChange(d);
});

/* initial render */
populateMonthDay();
migrateOldEntries();
handleDateChange(new Date());
updateRates();
