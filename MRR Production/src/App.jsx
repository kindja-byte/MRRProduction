// src/App.jsx
import { useState, useEffect, useMemo } from "react";
import { supabase } from "./utils/supabase";

// Centralized Stateless Calculation & Helper Utilities
import { C, uid, fd, ft, fm, tot, newestPrice, oilSt, predDays, detSt, compressImg, doFifo } from "./utils/helpers";

// Automated Document and External Sync Engines
import { PERM_DEFS, PERM_GROUPS, ROLE_COLS, DEFAULT_ROLE_PERMS, getEffectivePerms } from "./database/permissions";

// Shared Reusable UI Layout Elements
import { generatePDF } from "./utils/pdfGenerator";
import { attemptAccuLynxSync } from "./utils/accuLynxSync";

import { Modal, Fld, Inp, TA, Sel, Btn, Bdg, RoleBdg, Toggle, PhotoUpload } from "./components/UIPrimitives";

// Individual Full-Screen Page Views
import LoginScreen from "./views/LoginScreen";
import Sidebar from "./layouts/Sidebar";
import DashboardView from "./views/DashboardView";
import ProfileView from "./views/ProfileView";
import InventoryView from "./views/InventoryView.jsx";
import BuildJobsView from "./views/BuildJobsView";
import PullInventoryView from "./views/PullInventoryView";
import FleetManagementView from "./views/FleetManagementView";
import MaintenanceRequestsView from "./views/MaintenanceRequestsView";
import ReportsView from "./views/ReportsView";
import UserManagementView from "./views/UserManagementView";
import SettingsView from "./views/SettingsView";


// ── Persistent Storage Wrapper ────────────────────
const storage = typeof window !== 'undefined' && window.storage ? window.storage : {
  get: async key => ({ value: window.localStorage.getItem(key) }),
  set: async (key, value) => { window.localStorage.setItem(key, value); return { ok: true }; },
};

const jSC = { 
  draft: { c: 'gray', l: 'Draft', icon: '📝' }, 
  approved: { c: 'blue', l: 'Approved', icon: '✅' }, 
  active: { c: 'amber', l: 'Active', icon: '🔄' }, 
  completed: { c: 'green', l: 'Completed', icon: '🏁' }, 
  closed: { c: 'purple', l: 'Closed', icon: '🔒' } 
};

// ── Seed Data ─────────────────────────────────────
export const SEED_V = [
  { ...uid => {}, id: 'v1', name: 'Truck 1', type: 'truck', mi: 87500, lomi: 83200, oii: 5000, dii: 90, ldd: '2025-02-15', mil: [{ dt: '2025-05-14', mi: 87500, by: 'u1' }], sl: [{ id: 's1', type: 'Oil Change', dt: '2025-03-01', mi: 83200, by: 'Quick Lube', notes: '5W-30 Synthetic', cost: 89 }], plate: 'MRR-001', yr: 2020, make: 'Ford', model: 'F-250', assignedTo: 'u3' },
  { id: 'v2', name: 'Truck 2', type: 'truck', mi: 62300, lomi: 58900, oii: 5000, dii: 90, ldd: '2025-03-10', mil: [{ dt: '2025-05-14', mi: 62300, by: 'u2' }], sl: [], plate: 'MRR-002', yr: 2021, make: 'Ford', model: 'F-250', assignedTo: 'u7' },
  { id: 'v3', name: 'Truck 3', type: 'truck', mi: 112000, lomi: 108500, oii: 5000, dii: 90, ldd: '2025-01-20', mil: [], sl: [], plate: 'MRR-003', yr: 2019, make: 'Ram', model: '2500', assignedTo: '' },
  { id: 'v4', name: 'Truck 4', type: 'truck', mi: 45200, lomi: 43500, oii: 5000, dii: 90, ldd: '2025-04-01', mil: [], sl: [], plate: 'MRR-004', yr: 2022, make: 'Chevy', model: 'Silverado 2500', assignedTo: '' },
  { id: 'v5', name: 'Truck 5', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-005', yr: 2022, make: 'Ford', model: 'F-250', assignedTo: '' },
  { id: 'v6', name: 'Truck 6', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-006', yr: 2022, make: 'Ford', model: 'F-250', assignedTo: '' },
  { id: 'v7', name: 'Truck 7', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-007', yr: 2023, make: 'Ford', model: 'F-150', assignedTo: '' },
  { id: 'v8', name: 'Truck 8', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-008', yr: 2021, make: 'Ram', model: '1500', assignedTo: '' },
  { id: 'v9', name: 'Truck 9', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-009', yr: 2022, make: 'Chevy', model: 'Silverado', assignedTo: 'u3' },
  { id: 'v10', name: 'Truck 10', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-010', yr: 2022, make: 'Ford', model: 'F-250', assignedTo: '' },
  { id: 'v11', name: 'Truck 11', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-011', yr: 2023, make: 'Ford', model: 'F-250', assignedTo: '' },
  { id: 'v12', name: 'Production Truck 12', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-012', yr: 2022, make: 'GMC', model: 'Sierra 2500', assignedTo: '' },
  { id: 'v16', name: 'Gold F250', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-016', yr: 2021, make: 'Ford', model: 'F-250', assignedTo: 'u1' },
  { id: 'v17', name: 'Blue F150', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-017', yr: 2020, make: 'Ford', model: 'F-150', assignedTo: '' },
  { id: 'v18', name: 'Box Truck', type: 'truck', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'MRR-018', yr: 2019, make: 'Isuzu', model: 'NPR', assignedTo: '' },
  { id: 'v13', name: 'Dump Trailer 13', type: 'trailer', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2025-03-01', mil: [], sl: [], plate: 'TRL-013', yr: 2022, make: 'PJ Trailers', model: 'Dump 14\'', assignedTo: '' },
  { id: 'v14', name: 'Dump Trailer 14', type: 'trailer', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2025-01-15', mil: [], sl: [], plate: 'TRL-014', yr: 2022, make: 'PJ Trailers', model: 'Dump 14\'', assignedTo: '' },
  { id: 'v15', name: 'Dump Trailer 15', type: 'trailer', mi: 0, lomi: 0, oii: 5000, dii: 90, ldd: '2026-05-01', mil: [], sl: [], plate: 'TRL-015', yr: 2023, make: 'Big Tex', model: 'Dump 14\'', assignedTo: '' },
  { id: 'v19', name: 'Equipter Buggy', type: 'trailer', mi: 0, lomi: 0, oii: 5000, dii: 180, ldd: '2026-05-01', mil: [], sl: [], plate: 'EQP-001', yr: 2022, make: 'Equipter', model: '4000', assignedTo: '' }
];

export const SEED_REQ = [
  { id: 'r1', vid: 'v1', vname: 'Truck 1 (MRR-001)', vtype: 'truck', type: 'Oil Change', urgency: 'normal', notes: 'Due soon based on mileage.', uid: 'u3', uname: 'Tyler Field', at: '2025-05-15T08:30:00', status: 'pending', scheduledDate: '', completedAt: '', whNotes: '' },
  { id: 'r2', vid: 'v2', vname: 'Truck 2 (MRR-002)', vtype: 'truck', type: 'Repair', urgency: 'urgent', notes: 'Brakes grinding when stopping.', uid: 'u7', uname: 'Marco Rivera', at: '2025-05-16T14:15:00', status: 'scheduled', scheduledDate: '2025-05-20', completedAt: '', whNotes: 'Scheduled with Toledo Truck Service.' },
];

const mkB = (id, rcvd, qty, price, by, rem) => ({ id, rcvd, qty, price, by, rem });
const mkI = (id, name, cat, unit, alrt, ...batches) => ({ id, name, cat, unit, alrt, batches });
const mkT = (id, name, mi, lomi, oii, dii, ldd, mil, sl) => ({ id, name, type: 'truck', mi, lomi, oii, dii, ldd, mil: mil || [], sl: sl || [] });
const mkTr = (id, name, dii, ldd) => ({ id, name, type: 'trailer', dii, ldd, mi: 0, mil: [], sl: [] });
const mkJI = (iid, iname, icat, unit, planned, pulled = 0, ret = 0, ppu = 0, cost = 0) => ({ iid, iname, icat, unit, planned, pulled, returned: ret, priceAtPull: ppu, pullCost: cost });

const SEED_U = [
  { id: 'u1', name: 'Sam', email: 'sam@maumeeriverroofing.com', pass: 'Admin123!', role: 'admin', active: true },
  { id: 'u2', name: 'Ian', email: 'ian@maumeeriverroofing.com', pass: 'Admin123!', role: 'admin', active: true },
  { id: 'u3', name: 'Adam', email: 'adam@maumeeriverroofing.com', pass: 'Mgr123!', role: 'Project Manager', active: true },
  { id: 'u4', name: 'Jerry', email: 'jerry@maumeeriverroofing.com', pass: 'Coord123!', role: 'Production Coordinator', active: true },
  { id: 'u5', name: 'Jorge', email: 'jorge@maumeeriverroofing.com', pass: 'Super123!', role: 'Site Supervisor', active: true },
  { id: 'u6', name: 'Jason', email: 'jason@maumeeriverroofing.com', pass: 'Super123!', role: 'Site Supervisor', active: true },
];
const SEED_W = [{ id: 'w1', name: 'Saint Joe Road Warehouse', location: 'Toledo, OH', active: true }];
const SEED_I = [
  mkI('i1', 'Underlayment', 'Roofing Materials', 'rolls', 10, mkB('b1', '2025-04-01', 50, 45, 'u1', 12), mkB('b2', '2025-05-01', 50, 47.5, 'u1', 50)),
  mkI('i2', 'Ice & Water Shield', 'Roofing Materials', 'rolls', 5, mkB('b3', '2025-05-01', 20, 85, 'u1', 4)),
  mkI('i3', 'Smooth Shank Coil Nails', 'Fasteners', 'boxes', 20, mkB('b4', '2025-04-15', 100, 52, 'u1', 45)),
  mkI('i4', 'Ring Shank Coil Nails', 'Fasteners', 'boxes', 20, mkB('b5', '2025-04-15', 80, 58, 'u1', 32)),
  mkI('i5', 'SEBS - White', 'Sealants', 'tubes', 15, mkB('b6', '2025-05-01', 48, 12.5, 'u1', 30)),
  mkI('i6', 'SEBS - Black', 'Sealants', 'tubes', 15, mkB('b7', '2025-05-01', 48, 12.5, 'u1', 18)),
  mkI('i7', 'SEBS - Brown', 'Sealants', 'tubes', 15, mkB('b8', '2025-05-01', 48, 12.5, 'u1', 40)),
  mkI('i8', 'Solar Seal - White', 'Sealants', 'tubes', 10, mkB('b9', '2025-05-01', 24, 18, 'u1', 9)),
  mkI('i9', 'Solar Seal - Black', 'Sealants', 'tubes', 10, mkB('b10', '2025-05-01', 24, 18, 'u1', 15)),
  mkI('i10', 'Solar Seal - Brown', 'Sealants', 'tubes', 10, mkB('b11', '2025-05-01', 24, 18, 'u1', 22)),
  mkI('i11', 'Atlas Rolled Ridge Vent', 'Ventilation', 'rolls', 5, mkB('b12', '2025-04-20', 30, 95, 'u1', 14)),
  mkI('i12', 'Atlas Box Vent - Black', 'Ventilation', 'each', 20, mkB('b13', '2025-04-20', 100, 22, 'u1', 65)),
  mkI('i13', 'Atlas Box Vent - Brown', 'Ventilation', 'each', 20, mkB('b14', '2025-04-20', 100, 22, 'u1', 72)),
  mkI('i14', 'OSB', 'Decking', 'each', 30, mkB('b15', '2025-05-05', 200, 28, 'u1', 155)),
  mkI('i15', '3M Tape', 'Accessories', 'rolls', 10, mkB('b16', '2025-05-05', 50, 15, 'u1', 7)),
  mkI('i16', '9" Roller Frames', 'Tools', 'each', 5, mkB('b17', '2025-04-01', 20, 8.5, 'u1', 12)),
  mkI('i17', '9" Roller Covers', 'Tools', 'each', 10, mkB('b18', '2025-04-01', 50, 4.5, 'u1', 23)),
  mkI('i18', "4'x10' Flat Stock - Black", 'Sheet Metal', 'each', 10, mkB('b19', '2025-05-01', 50, 42, 'u1', 33)),
  mkI('i19', "4'x10' Flat Stock - Brown", 'Sheet Metal', 'each', 10, mkB('b20', '2025-05-01', 50, 42, 'u1', 28)),
  mkI('i20', "4'x10' Flat Stock - White", 'Sheet Metal', 'each', 10, mkB('b21', '2025-05-01', 50, 42, 'u1', 41)),
  mkI('i21', '1" Stinger Nail Packs', 'Fasteners', 'boxes', 25, mkB('b22', '2025-04-15', 150, 8, 'u1', 6)),
];
const mkJob = (id, po, name, addr, notes, status, assignedTo, createdBy, createdAt, approvedAt, completedAt, newFor, items, sync = null) => ({ id, po, name, addr, notes, status, assignedTo, createdBy, createdAt, approvedAt, completedAt, newForAssigned: newFor, items, syncStatus: sync, syncedAt: '', syncPayload: null, syncNote: '' });
const SEED_JOBS = [
  mkJob('j1', 'PO-2025-001', 'Smith Residence Re-roof', '1234 Oak St, Toledo OH', 'Full tear-off, GAF Timberline HDZ.', 'completed', 'u3', 'u6', '2025-05-08T10:00:00', '2025-05-09T08:00:00', '2025-05-10T17:00:00', false, [mkJI('i1', 'Underlayment', 'Roofing Materials', 'rolls', 8, 8, 0, 47.5, 380), mkJI('i2', 'Ice & Water Shield', 'Roofing Materials', 'rolls', 3, 3, 0, 85, 255), mkJI('i3', 'Smooth Shank Coil Nails', 'Fasteners', 'boxes', 10, 10, 0, 52, 520), mkJI('i14', 'OSB', 'Decking', 'each', 6, 6, 0, 28, 168)], 'manual'),
  mkJob('j2', 'PO-2025-005', 'Westside Commercial Center', '789 Industrial Blvd, Toledo OH', 'Commercial flat roof + pitched front.', 'approved', 'u3', 'u6', '2025-05-15T09:00:00', '2025-05-16T08:00:00', '', true, [mkJI('i1', 'Underlayment', 'Roofing Materials', 'rolls', 15), mkJI('i11', 'Atlas Rolled Ridge Vent', 'Ventilation', 'rolls', 4), mkJI('i3', 'Smooth Shank Coil Nails', 'Fasteners', 'boxes', 8), mkJI('i14', 'OSB', 'Decking', 'each', 12), mkJI('i5', 'SEBS - White', 'Sealants', 'tubes', 6)]),
  mkJob('j3', 'PO-2025-006', 'Lakewood HOA — Building B', '500 Lakewood Dr, Maumee OH', '', 'draft', '', 'u6', '2025-05-17T14:00:00', '', '', false, [mkJI('i5', 'SEBS - White', 'Sealants', 'tubes', 12), mkJI('i12', 'Atlas Box Vent - Black', 'Ventilation', 'each', 8), mkJI('i1', 'Underlayment', 'Roofing Materials', 'rolls', 10)]),
  mkJob('j4', 'PO-2025-007', 'Henderson Residence', '4521 Sylvania Ave, Maumee OH', 'Insurance claim re-roof.', 'active', 'u7', 'u6', '2025-05-14T11:00:00', '2025-05-15T07:00:00', '', false, [mkJI('i1', 'Underlayment', 'Roofing Materials', 'rolls', 10, 10, 0, 47.5, 475), mkJI('i4', 'Ring Shank Coil Nails', 'Fasteners', 'boxes', 6, 6, 0, 58, 348), mkJI('i11', 'Atlas Rolled Ridge Vent', 'Ventilation', 'rolls', 3, 3, 0, 95, 285), mkJI('i14', 'OSB', 'Decking', 'each', 8, 4, 0, 28, 112)]),
];

// ── App ───────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true);
  const [curUser, setCurUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState(SEED_U);
  const [warehouses, setWH] = useState(SEED_W);
  const [inv, setInv] = useState(SEED_I);
  const [vehs, setVehs] = useState(SEED_V);
  const [reqs, setReqs] = useState([]);
  const [jobs, setJobs] = useState(SEED_JOBS);
  const [rolePerms, setRolePerms] = useState({ warehouse: { ...DEFAULT_ROLE_PERMS.warehouse }, coordinator: { ...DEFAULT_ROLE_PERMS.coordinator }, manager: { ...DEFAULT_ROLE_PERMS.manager }, field: { ...DEFAULT_ROLE_PERMS.field } });
  const [userOverrides, setUserOverrides] = useState({});
  const [acculynxConfig, setAccuLynxConfig] = useState({ apiKey: '', enabled: false, autoSync: true, proxyUrl: '' });
  const [invPhotos, setInvPhotos] = useState({});
  const [vehPhotos, setVehPhotos] = useState({});
  const [logos, setLogos] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: dbInv, error: invErr },
          { data: dbVehs, error: vehErr },
          { data: dbJobs, error: jobErr },
          { data: dbReqs, error: reqErr },
          { data: dbWH, error: whErr },
          ip, vp, lg, rp, uo, ax
        ] = await Promise.all([
          supabase.from('inventory').select('*'),
          supabase.from('vehicles').select('*'),
          supabase.from('jobs').select('*'),
          supabase.from('maintenance_requests').select('*'),
          supabase.from('warehouses').select('*'),
          storage.get('mrr-v7-inv-photos').catch(() => null),
          storage.get('mrr-v7-veh-photos').catch(() => null),
          storage.get('mrr-v7-logos').catch(() => null),
          storage.get('mrr-v7-roleperms').catch(() => null),
          storage.get('mrr-v7-userov').catch(() => null),
          storage.get('mrr-v7-acculynx').catch(() => null),
        ]);

        if (invErr) console.error("Inventory load error:", invErr.message);
        else if (dbInv) setInv(dbInv);

        if (vehErr) console.error("Vehicles load error:", vehErr.message);
        else if (dbVehs) setVehs(dbVehs);

        if (jobErr) console.error("Jobs load error:", jobErr.message);
        else if (dbJobs) setJobs(dbJobs);

        if (reqErr) console.error("Requests load error:", reqErr.message);
        else if (dbReqs) setReqs(dbReqs.sort((a, b) => new Date(b.at) - new Date(a.at)));

        if (whErr) console.error("Warehouses load error:", whErr.message);
        else if (dbWH) setWH(dbWH);

        if (ip?.value) setInvPhotos(JSON.parse(ip.value));
        if (vp?.value) setVehPhotos(JSON.parse(vp.value));
        if (lg?.value) setLogos(JSON.parse(lg.value));
        if (rp?.value) {
          const saved = JSON.parse(rp.value);
          setRolePerms(p => Object.fromEntries(Object.keys(p).map(r => [r, { ...p[r], ...(saved[r] || {}) }])));
        }
        if (uo?.value) setUserOverrides(JSON.parse(uo.value));
        if (ax?.value) setAccuLynxConfig(p => ({ ...p, ...JSON.parse(ax.value) }));
        
      } catch (e) {
        console.error("Critical dashboard loading error:", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => { if (!loading) storage.set('mrr-v7-inv-photos', JSON.stringify(invPhotos)).catch(() => {}); }, [invPhotos, loading]);
  useEffect(() => { if (!loading) storage.set('mrr-v7-veh-photos', JSON.stringify(vehPhotos)).catch(() => {}); }, [vehPhotos, loading]);
  useEffect(() => { if (!loading) storage.set('mrr-v7-logos', JSON.stringify(logos)).catch(() => {}); }, [logos, loading]);
  useEffect(() => { if (!loading) storage.set('mrr-v7-roleperms', JSON.stringify(rolePerms)).catch(() => {}); }, [rolePerms, loading]);
  useEffect(() => { if (!loading) storage.set('mrr-v7-userov', JSON.stringify(userOverrides)).catch(() => {}); }, [userOverrides, loading]);
  useEffect(() => { if (!loading) storage.set('mrr-v7-acculynx', JSON.stringify(acculynxConfig)).catch(() => {}); }, [acculynxConfig, loading]);

  const pendingReqCount = useMemo(() => reqs.filter(r => r.status === 'pending').length, [reqs]);
  const lowStockCount = useMemo(() => inv.filter(i => tot(i) <= i.alrt).length, [inv]);
  const newJobsForMe = useMemo(() => curUser ? jobs.filter(j => j.newForAssigned && j.assignedTo === curUser.id).length : 0, [jobs, curUser]);
  const activeLogo = useMemo(() => logos.find(l => l.isActive)?.data || null, [logos]);
  const userPerms = useMemo(() => { if (!curUser) return {}; return getEffectivePerms(curUser, rolePerms, userOverrides); }, [curUser, rolePerms, userOverrides]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: C.bg, flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 44 }}>🏠</div>
        <div style={{ color: C.navy, fontWeight: 700, fontSize: 16 }}>Loading Maumee River Roofing...</div>
      </div>
    );
  }

  if (!curUser) {
    return <LoginScreen onLogin={u => { setCurUser(u); setView('dashboard'); }} activeLogo={activeLogo} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <Sidebar cur={view} onNav={setView} user={curUser} onLogout={() => setCurUser(null)} collapsed={collapsed} setCollapsed={setCollapsed} pendingReqs={pendingReqCount} lowStock={lowStockCount} newJobsForMe={newJobsForMe} activeLogo={activeLogo} perms={userPerms} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: C.w, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.lg}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, color: C.sub }}>Maumee River Roofing · Saint Joe Road Warehouse</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {newJobsForMe > 0 && <div onClick={() => setView('pull')} style={{ background: C.tB, color: C.tl, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🎉 {newJobsForMe} new job{newJobsForMe !== 1 ? 's' : ''}</div>}
            {pendingReqCount > 0 && userPerms.maint_manage && <div onClick={() => setView('requests')} style={{ background: C.pB, color: C.pu, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🔧 {pendingReqCount} pending</div>}
            {lowStockCount > 0 && userPerms.inv_view && <div onClick={() => setView('inventory')} style={{ background: C.aB, color: C.am, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>⚠️ {lowStockCount} low stock</div>}
            <RoleBdg role={curUser.role} />
          </div>
        </div>
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {view === 'dashboard' && <DashboardView inv={inv} vehs={vehs} reqs={reqs} jobs={jobs} users={users} user={curUser} perms={userPerms} onNav={setView} tot={tot} jSC={jSC} />}
          {view === 'buildjobs' && userPerms.jobs_build && <BuildJobsView jobs={jobs} setJobs={setJobs} inv={inv} users={users} user={curUser} perms={userPerms} />}
          {view === 'pull' && <PullInventoryView jobs={jobs} setJobs={setJobs} inv={inv} setInv={setInv} users={users} user={curUser} perms={userPerms} activeLogo={activeLogo} acculynxConfig={acculynxConfig} />}
          {view === 'inventory' && userPerms.inv_view && <InventoryView inv={inv} setInv={setInv} users={users} user={curUser} perms={userPerms} invPhotos={invPhotos} setInvPhotos={setInvPhotos} />}
          {view === 'fleet' && userPerms.fleet_view && <FleetManagementView vehs={vehs} setVehs={setVehs} reqs={reqs} setReqs={setReqs} users={users} user={curUser} perms={userPerms} vehPhotos={vehPhotos} setVehPhotos={setVehPhotos} oilSt={oilSt} detSt={detSt} predDays={predDays} />}
          {view === 'requests' && (userPerms.maint_submit || userPerms.maint_manage) && <MaintenanceRequestsView reqs={reqs} setReqs={setReqs} vehs={vehs} users={users} user={curUser} perms={userPerms} />}
          {view === 'reports' && userPerms.reports_view && <ReportsView jobs={jobs} users={users} user={curUser} perms={userPerms} />}
          {view === 'users' && userPerms.users_manage && <UserManagementView users={users} setUsers={setUsers} currentUser={curUser} rolePerms={rolePerms} userOverrides={userOverrides} setUserOverrides={setUserOverrides} />}
          {view === 'settings' && userPerms.settings_manage && <SettingsView warehouses={warehouses} setWarehouses={setWH} logos={logos} setLogos={setLogos} rolePerms={rolePerms} setRolePerms={setRolePerms} acculynxConfig={acculynxConfig} setAccuLynxConfig={setAccuLynxConfig} />}
          {view === 'profile' && <ProfileView user={curUser} onUpdateUser={setCurUser} />}
        </div>
      </div>
    </div>
  );
}