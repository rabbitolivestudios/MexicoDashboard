import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// [id, plant, owner, country, region, simpleType, steelType, productsStr,
//  ftaStatus, ftaName, effectiveTariff, mfnRef, specialDuty]
import RAW from "./data.json";

const MILLS = RAW.map(r => ({
  id: r[0], plant: r[1], owner: r[2], country: r[3],
  region: r[4], simpleType: r[5], steelType: r[6],
  products: r[7] ? r[7].split(", ") : [],
  ftaStatus: r[8] || "Unknown", ftaName: r[9] || "",
  effectiveTariff: r[10] || "N/A", mfnRef: r[11] || "N/A",
  specialDuty: r[12] || "None"
}));

const COLORS = {
  Flats: "#2563eb", Longs: "#dc2626", "Flats & Longs": "#7c3aed",
  Stainless: "#059669", "Special / SBQ": "#d97706", "Pipes / Tubes": "#0891b2",
  "Heavy Plates": "#4338ca", "Service Centers": "#6b7280", "Semis / DRI": "#a3a3a3",
  "Stainless / Special": "#10b981", Other: "#9ca3af"
};

const REGION_COLORS = {
  "North America": "#2563eb", Europe: "#7c3aed", China: "#dc2626",
  India: "#d97706", Japan: "#059669", "South Korea": "#0891b2",
  "Latin America": "#e11d48", Taiwan: "#4338ca", Turkey: "#a16207",
  CIS: "#6b7280", "Asia-Pacific": "#10b981", "Middle East": "#be185d",
  "Africa & Other": "#a3a3a3"
};

const FTA_COLORS = { "Yes": "#16a34a", "No": "#dc2626", "Domestic": "#2563eb", "Unknown": "#9ca3af" };

const countBy = (arr, key) => {
  const m = {};
  arr.forEach(x => { const v = typeof key === "function" ? key(x) : x[key]; m[v] = (m[v] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
};

const Badge = ({ text, color, onRemove }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: color || "#e0e7ff", color: "#1e3a5f", borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 500, margin: 2, whiteSpace: "nowrap" }}>
    {text}
    {onRemove && <span onClick={onRemove} style={{ cursor: "pointer", marginLeft: 2, fontWeight: 700, fontSize: 14 }}>&times;</span>}
  </span>
);

const Dropdown = ({ label, options, selected, onChange, color }) => {
  const [open, setOpen] = useState(false);
  const filtered = options.filter(o => !selected.includes(o));
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(!open)} style={{ background: selected.length ? "#dbeafe" : "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#334155", display: "flex", alignItems: "center", gap: 4 }}>
        {label} {selected.length > 0 && <span style={{ background: "#2563eb", color: "#fff", borderRadius: 10, padding: "0 6px", fontSize: 11 }}>{selected.length}</span>}
        <span style={{ fontSize: 10 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 999, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 260, overflowY: "auto", minWidth: 220, marginTop: 4 }}>
          {selected.length > 0 && <div onClick={() => { onChange([]); setOpen(false); }} style={{ padding: "8px 12px", cursor: "pointer", color: "#dc2626", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>Clear all</div>}
          {filtered.map(o => (
            <div key={o} onClick={() => { onChange([...selected, o]); }} style={{ padding: "7px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f8fafc" }}
              onMouseEnter={e => e.target.style.background = "#f1f5f9"} onMouseLeave={e => e.target.style.background = "transparent"}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const KPI = ({ value, label, sub, color }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.08)", borderTop: `3px solid ${color || "#2563eb"}`, minWidth: 120, flex: 1 }}>
    <div style={{ fontSize: 28, fontWeight: 700, color: color || "#1e3a5f", lineHeight: 1.1 }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
  </div>
);

const FTABadge = ({ status }) => {
  const bg = status === "Yes" ? "#dcfce7" : status === "No" ? "#fef2f2" : status === "Domestic" ? "#dbeafe" : "#f1f5f9";
  const fg = status === "Yes" ? "#16a34a" : status === "No" ? "#dc2626" : status === "Domestic" ? "#2563eb" : "#64748b";
  const label = status === "Yes" ? "FTA" : status === "No" ? "No FTA" : status === "Domestic" ? "Domestic" : "N/A";
  return <span style={{ background: bg, color: fg, borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 600 }}>{label}</span>;
};

const TariffBadge = ({ tariff }) => {
  if (!tariff || tariff === "N/A") return <span style={{ color: "#94a3b8", fontSize: 11 }}>N/A</span>;
  if (tariff.startsWith("0%")) return <span style={{ background: "#dcfce7", color: "#16a34a", borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 600 }}>0% FTA</span>;
  const num = parseInt(tariff);
  const bg = num >= 35 ? "#fef2f2" : num >= 25 ? "#fff7ed" : "#fefce8";
  const fg = num >= 35 ? "#dc2626" : num >= 25 ? "#ea580c" : "#ca8a04";
  return <span style={{ background: bg, color: fg, borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 600 }}>{tariff}</span>;
};

const DataTable = ({ data, page, setPage, sortCol, sortDir, onSort }) => {
  const pageSize = 20;
  const cols = [
    { key: "id", label: "ID", w: 80 },
    { key: "plant", label: "Plant", w: 220 },
    { key: "owner", label: "Owner", w: 180 },
    { key: "country", label: "Country", w: 130 },
    { key: "region", label: "Region", w: 110 },
    { key: "steelType", label: "Steel Type", w: 120 },
    { key: "productsStr", label: "Products", w: 220 },
    { key: "ftaStatus", label: "FTA", w: 70 },
    { key: "ftaName", label: "Agreement", w: 130 },
    { key: "effectiveTariff", label: "Tariff", w: 90 },
    { key: "specialDuty", label: "Special Duties", w: 150 },
  ];
  const sorted = useMemo(() => {
    if (!sortCol) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      let va, vb;
      if (sortCol === "productsStr") { va = a.products.join(", ").toLowerCase(); vb = b.products.join(", ").toLowerCase(); }
      else { va = (a[sortCol] || "").toString().toLowerCase(); vb = (b[sortCol] || "").toString().toLowerCase(); }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return copy;
  }, [data, sortCol, sortDir]);
  const totalPages = Math.ceil(sorted.length / pageSize);
  const slice = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const thBase = { padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#fff", background: "#1e3a5f", position: "sticky", top: 0, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" };
  const tdStyle = { padding: "6px 10px", fontSize: 12, borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const arrow = (key) => sortCol === key ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : " \u25BD";
  const pgBtn = (disabled, onClick, label) => (
    <button disabled={disabled} onClick={onClick} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 4, border: "1px solid #e2e8f0", background: disabled ? "#f8fafc" : "#fff", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, fontWeight: 500 }}>{label}</button>
  );
  return (
    <div>
      <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>{cols.map(c => <col key={c.key} style={{ width: c.w }} />)}</colgroup>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c.key} style={thBase} onClick={() => onSort(c.key)}>
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((m, i) => (
              <tr key={m.id + i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}
                onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 ? "#f8fafc" : "#fff"}>
                <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{m.id}</td>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{m.plant}</td>
                <td style={tdStyle}>{m.owner}</td>
                <td style={tdStyle}>{m.country}</td>
                <td style={tdStyle}><span style={{ background: REGION_COLORS[m.region] || "#6b7280", color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{m.region}</span></td>
                <td style={tdStyle}><span style={{ background: COLORS[m.simpleType] || "#6b7280", color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 11, whiteSpace: "nowrap" }}>{m.steelType}</span></td>
                <td style={{ ...tdStyle, color: "#475569" }}>{m.products.join(", ")}</td>
                <td style={tdStyle}><FTABadge status={m.ftaStatus} /></td>
                <td style={{ ...tdStyle, fontSize: 11, color: "#475569" }}>{m.ftaName || "—"}</td>
                <td style={tdStyle}><TariffBadge tariff={m.effectiveTariff} /></td>
                <td style={{ ...tdStyle, fontSize: 11, color: m.specialDuty !== "None" ? "#dc2626" : "#94a3b8" }}>{m.specialDuty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, padding: "0 4px" }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Showing <strong>{sorted.length > 0 ? page * pageSize + 1 : 0}</strong>-<strong>{Math.min((page + 1) * pageSize, sorted.length)}</strong> of <strong>{sorted.length.toLocaleString()}</strong> mills
        </span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {pgBtn(page === 0, () => setPage(0), "\u00AB")}
          {pgBtn(page === 0, () => setPage(p => p - 1), "\u2039 Prev")}
          <span style={{ padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "#1e3a5f" }}>Page {page + 1} / {totalPages || 1}</span>
          {pgBtn(page >= totalPages - 1, () => setPage(p => p + 1), "Next \u203A")}
          {pgBtn(page >= totalPages - 1, () => setPage(totalPages - 1), "\u00BB")}
        </div>
      </div>
    </div>
  );
};

const MiniBar = ({ data, color, labelKey = "name", valueKey = "value" }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    {data.slice(0, 12).map(d => {
      const max = data[0]?.[valueKey] || 1;
      return (
        <div key={d[labelKey]} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 110, fontSize: 11, color: "#475569", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{d[labelKey]}</div>
          <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 18, position: "relative", overflow: "hidden" }}>
            <div style={{ width: `${(d[valueKey] / max) * 100}%`, background: color || "#2563eb", height: "100%", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
          <div style={{ width: 36, fontSize: 11, color: "#64748b", textAlign: "right", flexShrink: 0 }}>{d[valueKey]}</div>
        </div>
      );
    })}
  </div>
);

const exportCSV = (data) => {
  const hdr = ["ID","Plant","Owner","Country","Region","Steel Type","Products","FTA Status","FTA Agreement","Effective Tariff","MFN Reference","Special Duties"];
  const rows = data.map(m => [m.id, m.plant, m.owner, m.country, m.region, m.steelType, m.products.join(", "), m.ftaStatus, m.ftaName, m.effectiveTariff, m.mfnRef, m.specialDuty].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
  const csv = [hdr.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `steel_mills_trade_export_${data.length}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const ChartCard = ({ title, children, style: s, headerRight }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.08)", ...s }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1e3a5f" }}>{title}</div>
      {headerRight}
    </div>
    {children}
  </div>
);

const SearchBox = ({ value, onChange }) => (
  <input type="text" placeholder="Search mills, owners, products..." value={value} onChange={e => onChange(e.target.value)}
    style={{ width: 260, padding: "8px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" }} />
);

export default function Dashboard() {
  const [filterRegion, setFilterRegion] = useState([]);
  const [filterCountry, setFilterCountry] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterProduct, setFilterProduct] = useState([]);
  const [filterOwner, setFilterOwner] = useState([]);
  const [filterFTA, setFilterFTA] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const allRegions = useMemo(() => [...new Set(MILLS.map(m => m.region))].sort(), []);
  const allCountries = useMemo(() => [...new Set(MILLS.map(m => m.country))].sort(), []);
  const allTypes = useMemo(() => [...new Set(MILLS.map(m => m.simpleType))].sort(), []);
  const allFTA = useMemo(() => ["Yes", "No", "Domestic"], []);
  const allOwners = useMemo(() => {
    const oc = {};
    MILLS.forEach(m => { oc[m.owner] = (oc[m.owner] || 0) + 1; });
    return Object.entries(oc).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([o]) => o);
  }, []);
  const allProducts = useMemo(() => {
    const pc = {};
    MILLS.forEach(m => m.products.forEach(p => { pc[p] = (pc[p] || 0) + 1; }));
    return Object.entries(pc).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([p]) => p);
  }, []);

  const filtered = useMemo(() => {
    let result = MILLS;
    if (filterRegion.length) result = result.filter(m => filterRegion.includes(m.region));
    if (filterCountry.length) result = result.filter(m => filterCountry.includes(m.country));
    if (filterType.length) result = result.filter(m => filterType.includes(m.simpleType));
    if (filterProduct.length) result = result.filter(m => filterProduct.some(p => m.products.includes(p)));
    if (filterOwner.length) result = result.filter(m => filterOwner.includes(m.owner));
    if (filterFTA.length) result = result.filter(m => filterFTA.includes(m.ftaStatus));
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(m => m.plant.toLowerCase().includes(s) || m.owner.toLowerCase().includes(s) || m.products.some(p => p.toLowerCase().includes(s)) || m.id.toLowerCase().includes(s) || m.country.toLowerCase().includes(s) || m.ftaName.toLowerCase().includes(s));
    }
    return result;
  }, [filterRegion, filterCountry, filterType, filterProduct, filterOwner, filterFTA, search]);

  const resetPage = useCallback(() => setPage(0), []);

  const typeData = useMemo(() => countBy(filtered, "simpleType"), [filtered]);
  const regionData = useMemo(() => countBy(filtered, "region"), [filtered]);
  const countryData = useMemo(() => countBy(filtered, "country").slice(0, 15), [filtered]);
  const productData = useMemo(() => {
    const pc = {};
    filtered.forEach(m => m.products.forEach(p => { pc[p] = (pc[p] || 0) + 1; }));
    return Object.entries(pc).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, value]) => ({ name, value }));
  }, [filtered]);
  const ownerData = useMemo(() => countBy(filtered, "owner").slice(0, 10), [filtered]);
  const uniqueCountries = useMemo(() => new Set(filtered.map(m => m.country)).size, [filtered]);

  // Trade intelligence data
  const ftaData = useMemo(() => countBy(filtered, "ftaStatus"), [filtered]);
  const ftaYes = ftaData.find(d => d.name === "Yes")?.value || 0;
  const ftaNo = ftaData.find(d => d.name === "No")?.value || 0;
  const ftaDomestic = ftaData.find(d => d.name === "Domestic")?.value || 0;
  const withDuties = useMemo(() => filtered.filter(m => m.specialDuty !== "None").length, [filtered]);

  // FTA by agreement name
  const ftaAgreementData = useMemo(() => {
    const m = {};
    filtered.filter(x => x.ftaStatus === "Yes").forEach(x => { const name = x.ftaName || "Other"; m[name] = (m[name] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Tariff distribution for non-FTA countries
  const tariffDistro = useMemo(() => {
    const bins = { "0% (FTA)": 0, "10%": 0, "20%": 0, "25%": 0, "25-35%": 0, "35%": 0, "35-50%": 0, "50%": 0, "N/A": 0 };
    filtered.forEach(m => {
      const t = m.effectiveTariff;
      if (t.startsWith("0%")) bins["0% (FTA)"]++;
      else if (bins[t] !== undefined) bins[t]++;
      else if (t === "N/A") bins["N/A"]++;
      else {
        const num = parseInt(t);
        if (num <= 10) bins["10%"]++;
        else if (num <= 20) bins["20%"]++;
        else if (num <= 25) bins["25%"]++;
        else if (num <= 35) bins["35%"]++;
        else bins["50%"]++;
      }
    });
    return Object.entries(bins).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const hasFilters = filterRegion.length || filterCountry.length || filterType.length || filterProduct.length || filterOwner.length || filterFTA.length || search;

  const clearAll = () => {
    setFilterRegion([]); setFilterCountry([]); setFilterType([]);
    setFilterProduct([]); setFilterOwner([]); setFilterFTA([]); setSearch(""); setPage(0);
  };

  const setRegion = v => { setFilterRegion(v); resetPage(); };
  const setCountry = v => { setFilterCountry(v); resetPage(); };
  const setType = v => { setFilterType(v); resetPage(); };
  const setProduct = v => { setFilterProduct(v); resetPage(); };
  const setOwner = v => { setFilterOwner(v); resetPage(); };
  const setFTA = v => { setFilterFTA(v); resetPage(); };

  const TARIFF_COLORS = { "0% (FTA)": "#16a34a", "10%": "#84cc16", "20%": "#eab308", "25%": "#f59e0b", "25-35%": "#ea580c", "35%": "#dc2626", "35-50%": "#b91c1c", "50%": "#7f1d1d", "N/A": "#94a3b8" };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#f1f5f9", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", padding: "20px 28px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Global Steel Mills Dashboard</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Siderurgical Catalog — Trade Intelligence & Interactive Analysis</div>
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "right" }}>
            <span style={{ color: "#60a5fa", fontWeight: 600, fontSize: 20 }}>{filtered.length.toLocaleString()}</span>
            <span style={{ marginLeft: 4 }}>mills shown</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: "#fff", padding: "10px 28px", borderBottom: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <SearchBox value={search} onChange={v => { setSearch(v); resetPage(); }} />
        <div style={{ width: 1, height: 28, background: "#e2e8f0" }} />
        <Dropdown label="Region" options={allRegions} selected={filterRegion} onChange={setRegion} />
        <Dropdown label="Country" options={allCountries} selected={filterCountry} onChange={setCountry} />
        <Dropdown label="Steel Type" options={allTypes} selected={filterType} onChange={setType} />
        <Dropdown label="Product" options={allProducts} selected={filterProduct} onChange={setProduct} />
        <Dropdown label="Owner" options={allOwners} selected={filterOwner} onChange={setOwner} />
        <div style={{ width: 1, height: 28, background: "#e2e8f0" }} />
        <Dropdown label="FTA Status" options={allFTA} selected={filterFTA} onChange={setFTA} />
        {hasFilters && (
          <button onClick={clearAll} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
            Clear All
          </button>
        )}
      </div>

      {/* Active Filters */}
      {hasFilters && (
        <div style={{ padding: "6px 28px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b", marginRight: 4 }}>Active:</span>
          {filterRegion.map(f => <Badge key={f} text={f} color="#dbeafe" onRemove={() => setRegion(filterRegion.filter(x => x !== f))} />)}
          {filterCountry.map(f => <Badge key={f} text={f} color="#dcfce7" onRemove={() => setCountry(filterCountry.filter(x => x !== f))} />)}
          {filterType.map(f => <Badge key={f} text={f} color="#fef3c7" onRemove={() => setType(filterType.filter(x => x !== f))} />)}
          {filterProduct.map(f => <Badge key={f} text={f} color="#fce7f3" onRemove={() => setProduct(filterProduct.filter(x => x !== f))} />)}
          {filterOwner.map(f => <Badge key={f} text={f.substring(0, 25)} color="#e0e7ff" onRemove={() => setOwner(filterOwner.filter(x => x !== f))} />)}
          {filterFTA.map(f => <Badge key={f} text={`FTA: ${f}`} color={f === "Yes" ? "#dcfce7" : f === "No" ? "#fef2f2" : "#dbeafe"} onRemove={() => setFTA(filterFTA.filter(x => x !== f))} />)}
          {search && <Badge text={`"${search}"`} color="#f1f5f9" onRemove={() => setSearch("")} />}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "16px 28px" }}>
        {/* KPIs Row 1 */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <KPI value={filtered.length} label="Total Mills" sub={hasFilters ? `of ${MILLS.length.toLocaleString()} total` : null} color="#2563eb" />
          <KPI value={uniqueCountries} label="Countries" color="#7c3aed" />
          <KPI value={typeData.find(d => d.name === "Flats")?.value || 0} label="Flat Products" color={COLORS.Flats} />
          <KPI value={typeData.find(d => d.name === "Longs")?.value || 0} label="Long Products" color={COLORS.Longs} />
          <KPI value={typeData.find(d => d.name === "Stainless")?.value || 0} label="Stainless" color={COLORS.Stainless} />
          <KPI value={typeData.find(d => d.name === "Pipes / Tubes")?.value || 0} label="Pipes / Tubes" color={COLORS["Pipes / Tubes"]} />
        </div>

        {/* KPIs Row 2 - Trade Intelligence */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <KPI value={ftaYes} label="FTA Partners" sub={`${((ftaYes / filtered.length) * 100).toFixed(0)}% of shown`} color="#16a34a" />
          <KPI value={ftaNo} label="No FTA" sub={`Subject to MFN tariffs`} color="#dc2626" />
          <KPI value={ftaDomestic} label="Domestic" sub="Mexican mills" color="#2563eb" />
          <KPI value={withDuties} label="Special Duties" sub="AD / CVD active or monitoring" color="#d97706" />
          <KPI value="25-50%" label="MFN Tariff Range" sub="Non-FTA steel (2026 reform)" color="#ea580c" />
          <KPI value="0%" label="FTA Tariff Rate" sub="Preferential access" color="#16a34a" />
        </div>

        {/* Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Steel Type Pie */}
          <ChartCard title="Steel Type Distribution">
            <div style={{ display: "flex", alignItems: "center" }}>
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2}>
                    {typeData.map(d => <Cell key={d.name} fill={COLORS[d.name] || "#6b7280"} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} mills (${((v / filtered.length) * 100).toFixed(1)}%)`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                {typeData.map(d => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}
                    onClick={() => { if (filterType.includes(d.name)) setType(filterType.filter(x => x !== d.name)); else setType([...filterType, d.name]); }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[d.name] || "#6b7280", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#475569", flex: 1 }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a5f" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* FTA Status Pie */}
          <ChartCard title="FTA Status with Mexico">
            <div style={{ display: "flex", alignItems: "center" }}>
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={ftaData} dataKey="value" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2}>
                    {ftaData.map(d => <Cell key={d.name} fill={FTA_COLORS[d.name] || "#6b7280"} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} mills (${((v / filtered.length) * 100).toFixed(1)}%)`, n === "Yes" ? "Has FTA" : n === "No" ? "No FTA" : n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                {ftaData.map(d => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}
                    onClick={() => { if (filterFTA.includes(d.name)) setFTA(filterFTA.filter(x => x !== d.name)); else setFTA([...filterFTA, d.name]); }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: FTA_COLORS[d.name] || "#6b7280", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#475569", flex: 1 }}>{d.name === "Yes" ? "FTA Partner" : d.name === "No" ? "No FTA" : d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1e3a5f" }}>{d.value}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, lineHeight: 1.3 }}>
                  Mills from FTA countries enjoy 0% tariff on steel imports to Mexico
                </div>
              </div>
            </div>
          </ChartCard>

          {/* Region Bar */}
          <ChartCard title="Mills by Region">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={regionData} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => [`${v} mills`, "Count"]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {regionData.map(d => <Cell key={d.name} fill={REGION_COLORS[d.name] || "#6b7280"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Tariff Distribution */}
          <ChartCard title="Effective Tariff Distribution (Mexico Import)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tariffDistro} margin={{ left: 10, right: 20, top: 5, bottom: 30 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, angle: -15, textAnchor: "end" }} interval={0} height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} mills`, "Count"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {tariffDistro.map(d => <Cell key={d.name} fill={TARIFF_COLORS[d.name] || "#6b7280"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top Countries */}
          <ChartCard title="Top 15 Countries">
            <MiniBar data={countryData} color="#2563eb" />
          </ChartCard>

          {/* FTA Agreements Breakdown */}
          <ChartCard title="Mills by FTA Agreement">
            <MiniBar data={ftaAgreementData} color="#16a34a" />
          </ChartCard>

          {/* Top Products */}
          <ChartCard title="Top 15 Products">
            <MiniBar data={productData} color="#d97706" />
          </ChartCard>

          {/* Top Owners */}
          <ChartCard title="Top 10 Owners">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ownerData} margin={{ left: 10, right: 20, top: 5, bottom: 40 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, angle: -25, textAnchor: "end" }} interval={0} height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} mills`, "Count"]} />
                <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Trade Intelligence Note */}
        <div style={{ marginTop: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 6 }}>Trade Intelligence Notes (Mexico 2026)</div>
          <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.6 }}>
            Mexico maintains <strong>14 FTAs with 50+ countries</strong>. FTA partners (USMCA, EU, CPTPP, EFTA, Pacific Alliance, etc.) enjoy <strong>0% preferential tariff</strong> on steel imports.
            Non-FTA countries face <strong>25-50% MFN tariffs</strong> under the 2026 LIGIE reform (effective Jan 1, 2026).
            Steel products (HS 72-73) generally face <strong>35% MFN</strong> for flat/long products, <strong>50% for wire rod</strong>, <strong>25% for semis/castings</strong>, and <strong>10-20% for raw materials and specialty alloys</strong>.
            Active anti-dumping investigations include HRC from China/Vietnam. AD duties apply to seamless pipes from India ($206.7/mt), South Korea ($131.2/mt), and Ukraine ($170.1/mt).
          </div>
        </div>

        {/* Mills List */}
        <div style={{ marginTop: 16 }}>
          <ChartCard title={`Mills List (${filtered.length.toLocaleString()} records)`}
            headerRight={
              <button onClick={() => exportCSV(filtered)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, border: "1px solid #2563eb", background: "#eff6ff", color: "#2563eb", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#2563eb"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export CSV
              </button>
            }>
            <DataTable data={filtered} page={page} setPage={setPage} sortCol={sortCol} sortDir={sortDir}
              onSort={(col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } setPage(0); }} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
