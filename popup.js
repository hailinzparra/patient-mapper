/**
 * Patient Mapper - Popup Logic
 * Handles authentication, tab management, and multi-fetch API logic.
 * Features: Hierarchical view, Sorting, and advanced Copy functions.
 */

let tabCounter = 0;
let activeTabId = 'home';
let sidebarCollapsed = false;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setDefaultDate();
    setIDLists();
});

function setupEventListeners() {
    document.getElementById('btn-toggle-sidebar').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-workspace').addEventListener('click', () => switchView('workspace'));
    document.getElementById('sidebar-ids').addEventListener('click', () => switchView('ids'));

    document.getElementById('tab-home').addEventListener('click', () => {
        const idsView = document.getElementById('view-ids');
        if (!idsView.classList.contains('hidden')) {
            switchView('workspace');
        }
        activateTab('home');
    });

    document.getElementById('enable-date').addEventListener('change', toggleDateInput);

    const myForm = document.querySelector('#fetch-form');
    myForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFetch();
    });
}

// --- Authentication Flow ---
async function getSessionToken() {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
        throw new Error("Chrome Extension context not found.");
    }

    try {
        const allTabs = await chrome.tabs.query({ url: "*://*.rsudsoediranms.com/*" });
        const targetTab = allTabs[0];

        if (!targetTab) {
            throw new Error("RSUD Portal not found. Please open the website in another tab.");
        }

        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: () => localStorage.getItem('_lapp-access_token')
        });

        const rawToken = injectionResults[0]?.result;
        if (!rawToken) {
            throw new Error("Token not found. Please log in to the RSUD website first.");
        }

        return rawToken;
    } catch (err) {
        throw err;
    }
}

// --- Decryption Utilities ---
const myBase64 = {
    _str: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    decode: function (z) {
        var A = this;
        var D = "", E, G, w, F, v, x, y, C = 0;
        z = z.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        var B = z.length;
        while (C < B) {
            F = A._str.indexOf(z.charAt(C++));
            v = A._str.indexOf(z.charAt(C++));
            x = A._str.indexOf(z.charAt(C++));
            y = A._str.indexOf(z.charAt(C++));
            E = (F << 2) | (v >> 4);
            G = ((v & 15) << 4) | (x >> 2);
            w = ((x & 3) << 6) | y;
            D = D + String.fromCharCode(E);
            if (x !== 64) { D = D + String.fromCharCode(G); }
            if (y !== 64) { D = D + String.fromCharCode(w); }
        }
        return A._utf8_decode(D);
    },
    _utf8_decode: function (t) {
        var q = "", w = 0, v = 0, s = 0, p = 0, u = t.length;
        while (w < u) {
            v = t.charCodeAt(w);
            if (v < 128) { q += String.fromCharCode(v); w++; }
            else if (v > 191 && v < 224) {
                p = t.charCodeAt(w + 1);
                q += String.fromCharCode(((v & 31) << 6) | (p & 63));
                w += 2;
            } else {
                p = t.charCodeAt(w + 1);
                s = t.charCodeAt(w + 2);
                q += String.fromCharCode(((v & 15) << 12) | ((p & 63) << 6) | (s & 63));
                w += 3;
            }
        }
        return q;
    }
};

const hexToArrayData = (o) => {
    var q = Math.ceil(o.length / 2);
    var s = new Uint8Array(q);
    for (var p = 0; p < q; p++) {
        var n = o.substr(p * 2, 2);
        s[p] = parseInt(n, 16);
    }
    return s;
};

const asciiToHex = (p) => {
    var o = "";
    for (var n = 0; n < p.length; n++) {
        var m = p.charCodeAt(n).toString(16);
        o += m.padStart(2, "0");
    }
    return o;
};

async function decryptData(encryptedBase64, tokenBase64) {
    return new Promise((resolve, reject) => {
        try {
            var C = window.crypto.subtle || window.crypto.webkitSubtle,
                z = myBase64.decode(tokenBase64),
                u = myBase64.decode(encryptedBase64),
                y = u.substring(0, 16),
                A = new TextDecoder(),
                B = hexToArrayData(z),
                uData = u.substring(16);

            if (!C) throw new Error("Crypto API not available");
            const ivArr = hexToArrayData(asciiToHex(y));
            const cipherArr = hexToArrayData(asciiToHex(uData));

            C.importKey("raw", B, { name: "AES-CBC", length: 32 }, false, ["decrypt"])
                .then(f => C.decrypt({ name: "AES-CBC", iv: ivArr }, f, cipherArr))
                .then(g => {
                    const decodedText = A.decode(new Uint8Array(g));
                    const decompressed = LZString.decompressFromEncodedURIComponent(decodedText);
                    try { resolve(JSON.parse(decompressed)); } catch (e) { resolve(decompressed); }
                }).catch(e => reject(e));
        } catch (err) { reject(err); }
    });
}

// --- Core Actions ---

function parseInputToGroups(input) {
    if (!input || input.trim() === '') return [[null]];
    return input.split(';').map(group => {
        const items = group.split(',').map(item => item.trim()).filter(i => i !== '');
        return items.length > 0 ? items : [null];
    });
}

async function handleFetch() {
    const fetchBtn = document.getElementById('main-fetch-btn');
    const authBar = document.getElementById('auth-status');
    const authText = document.getElementById('auth-status-text');

    fetchBtn.disabled = true;
    authBar.classList.remove('hidden');
    authText.innerText = "Finding active session...";

    let rawToken;
    try {
        rawToken = await getSessionToken();
    } catch (authErr) {
        authText.innerText = authErr.message;
        authText.className = "text-rose-500 font-bold";
        fetchBtn.disabled = false;
        return;
    }

    tabCounter++;
    const tabId = `pat-${tabCounter}`;

    const rawDocInput = document.getElementById('form-doc-id').value;
    const rawRoomInput = document.getElementById('form-room-id').value;
    const dateCheckbox = document.getElementById('enable-date');
    const admDate = dateCheckbox.checked ? document.getElementById('form-date').value : null;
    const status = document.getElementById('form-status').value;
    const limit = document.getElementById('form-limit').value;

    const docGroups = parseInputToGroups(rawDocInput);
    const roomGroups = parseInputToGroups(rawRoomInput);
    const maxGroups = Math.max(docGroups.length, roomGroups.length);

    const queryList = [];
    for (let i = 0; i < maxGroups; i++) {
        const currentDocGroup = docGroups[i] || [null];
        const currentRoomGroup = roomGroups[i] || [null];

        currentDocGroup.forEach(d => {
            currentRoomGroup.forEach(r => {
                queryList.push({ doc: d, room: r });
            });
        });
    }

    createTabUI(tabId, tabCounter);
    activateTab(tabId);

    try {
        const decodedToken = atob(rawToken);
        const globalPatientMap = new Map();
        let errorMessages = [];

        for (let i = 0; i < queryList.length; i++) {
            const q = queryList[i];
            updateTabStatus(tabId, "Fetching", "bg-blue-100 text-blue-600", `Running request ${i + 1} of ${queryList.length}...`);

            const dc = Date.now();
            const referensi = JSON.stringify({
                "Ruangan": { "COLUMNS": ["DESKRIPSI", "JENIS_KUNJUNGAN"], "REFERENSI": { "Referensi": true } },
                "Pendaftaran": true, "Referensi": true, "RuangKamarTidur": true, "DPJP": true, "Mutasi": true
            });

            let url = `https://api.rsudsoediranms.com/webservice/pendaftaran/kunjungan?_dc=${dc}&STATUS=${status}&REFERENSI=${encodeURIComponent(referensi)}`;
            if (admDate) url += `&MASUK=${admDate}`;
            if (q.doc) url += `&DPJP=${q.doc}`;
            if (q.room) url += `&RUANGAN=${q.room}`;
            url += `&page=1&start=0&limit=${limit}`;

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${decodedToken}`, 'Accept': 'application/json' }
                });

                const result = await response.json();

                if (result.success && result.data) {
                    const decrypted = await decryptData(result.data, rawToken);
                    const items = Array.isArray(decrypted) ? decrypted : [];

                    items.forEach(item => {
                        const pRef = item.REFERENSI?.PENDAFTARAN?.REFERENSI?.PASIEN;
                        const dedupId = item.ID || `${pRef?.NAMA}_${item.REFERENSI?.RUANG_KAMAR_TIDUR?.TEMPAT_TIDUR}`;
                        if (!globalPatientMap.has(dedupId)) {
                            globalPatientMap.set(dedupId, item);
                        }
                    });
                } else if (result.detail) {
                    errorMessages.push(`Req ${i + 1}: ${result.detail}`);
                }
            } catch (fetchErr) {
                errorMessages.push(`Req ${i + 1}: Network Error`);
            }
        }

        if (globalPatientMap.size === 0 && errorMessages.length > 0) {
            throw new Error(errorMessages.join(' | '));
        }

        const finalData = Array.from(globalPatientMap.values());
        const pane = document.getElementById('pane-' + tabId);
        if (pane) pane.dataset.patients = JSON.stringify(finalData);

        renderResults(tabId, finalData);

    } catch (err) {
        showTabError(tabId, err.message);
    } finally {
        fetchBtn.disabled = false;
        authBar.classList.add('hidden');
    }
}

// --- UI Utilities ---
function setDefaultDate() {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today - offset)).toISOString().slice(0, 10);
    document.getElementById('form-date').value = localISOTime;
}

function setIDLists() {
    const doctors = [
        { name: "dr. Firman", id: 37 },
        { name: "dr. Satria", id: 71 },
        { name: "dr. Andri", id: 36 },
        // { name: "dr. Aris", id: 98 },
        // { name: "dr. Robin", id: 104 },
        { name: "dr. Amir", id: 24 },
        { name: "dr. Twody", id: 10 },
        { name: "dr. Eka", id: 11 },
        { name: "dr. Cakra", id: 27 },
        { name: "dr. Guntur", id: 57 },
        { name: "dr. Khome", id: 62 },
        { name: "dr. Endra", id: 12 },
        { name: "dr. Dar", id: 30 },
        { name: "dr. Diksi", id: 63 },
        { name: "dr. Afandi", id: 89 },
        { name: "dr. Shigma", id: 103 },
        { name: "dr. Enny", id: 19 },
        { name: "dr. Bimo", id: 67 },
        { name: "dr. Ain", id: 28 },
        { name: "dr. Nisa", id: 25 },
        { name: "dr. Sari", id: 32 },
        { name: "dr. Yani", id: 14 },
        { name: "dr. Agung", id: 15 },
    ];

    const rooms = [
        { name: "Poli Anak", id: 101010107 },
        { name: "Instalasi ICU", id: 0 },
        { name: "RD Bedah Umum", id: 0 },
        { name: "RD Kandungan", id: 0 },
        { name: "RD Psikiatri", id: 0 },
        { name: "RD Anak", id: 101020501 },
        { name: "RD Bedah Orthopedi", id: 0 },
        { name: "Bangsal Cempaka", id: 101030112 },
        { name: "Bangsal Amarilis", id: 0 },
        { name: "Bangsal Aster 1", id: 0 },
        { name: "Bangsal Aster 2", id: 0 },
        { name: "Bangsal Teratai", id: 0 },
        { name: "Bangsal Bougenvile", id: 0 },
        { name: "Bangsal Anyelir 1", id: 0 },
        { name: "Bangsal Anggrek 1", id: 0 },
        { name: "Bangsal Anggrek 2", id: 0 },
        { name: "Bangsal Anggrek 3", id: 101030109 },
        { name: "Bangsal Melati", id: 101030110 },
        { name: "Bangsal Asoka", id: 101030111 },
        { name: "Bangsal Dahlia", id: 0 },
        { name: "RD Non Bedah", id: 0 },
        { name: "Bangsal Mawar", id: 0 },
        { name: "Ruang Medik Operatif (IBS)", id: 0 },
        { name: "Bangsal Anyelir 2 (Unit stroke)", id: 0 },
        { name: "RD Bedah Saraf", id: 0 },
    ];

    function renderTable(data, containerId) {
        const tableBody = document.getElementById(containerId);
        if (!tableBody) return;

        const rowsHtml = data.map(item => `
                <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-4 py-1.5 font-medium text-slate-700">
                        ${item.name}
                    </td>
                    <td class="px-4 py-1.5 font-mono text-blue-600">
                        ${item.id}
                    </td>
                </tr>
            `).join('');

        tableBody.innerHTML = rowsHtml;
    }

    renderTable(doctors, 'doctor-table-body');
    renderTable(rooms, 'room-table-body');
}

function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const icon = document.getElementById('toggle-icon');
    sidebar.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    icon.style.transform = sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
}

function toggleDateInput(e) {
    document.getElementById('form-date').disabled = !e.target.checked;
}

function switchView(view) {
    const idsView = document.getElementById('view-ids');
    const homeContent = document.getElementById('content-home');
    const dynamicArea = document.getElementById('dynamic-content-area');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('bg-blue-50', 'text-blue-600', 'font-bold'));

    if (view === 'ids') {
        idsView.classList.remove('hidden');
        homeContent.classList.add('hidden');
        dynamicArea.classList.add('hidden');
        document.getElementById('sidebar-ids').classList.add('bg-blue-50', 'text-blue-600', 'font-bold');

        document.querySelectorAll('#tab-container button').forEach(btn => {
            btn.className = "px-4 h-full text-[11px] font-bold uppercase tracking-wider border-b-2 border-transparent text-slate-400 hover:text-slate-600 flex items-center gap-2 transition-all";
        });

    } else {
        idsView.classList.add('hidden');
        document.getElementById('sidebar-workspace').classList.add('bg-blue-50', 'text-blue-600', 'font-bold');
        activateTab(activeTabId);
    }
}

function activateTab(tabId) {
    activeTabId = tabId;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('bg-blue-50', 'text-blue-600', 'font-bold'));
    document.getElementById('sidebar-workspace').classList.add('bg-blue-50', 'text-blue-600', 'font-bold');
    document.querySelectorAll('#tab-container button').forEach(btn => {
        btn.className = "px-4 h-full text-[11px] font-bold uppercase tracking-wider border-b-2 border-transparent text-slate-400 hover:text-slate-600 flex items-center gap-2 transition-all";
    });

    const activeTabBtn = document.getElementById('tab-' + tabId);
    if (activeTabBtn) activeTabBtn.className = "px-4 h-full text-[11px] font-bold uppercase tracking-wider border-b-2 border-blue-600 text-blue-600 flex items-center gap-2 transition-all";

    document.getElementById('view-ids').classList.add('hidden');
    document.getElementById('content-home').classList.add('hidden');
    document.getElementById('dynamic-content-area').classList.remove('hidden');
    document.querySelectorAll('.tab-content-pane').forEach(pane => pane.classList.add('hidden'));

    if (tabId === 'home') {
        document.getElementById('content-home').classList.remove('hidden');
    } else {
        const targetPane = document.getElementById('pane-' + tabId);
        if (targetPane) targetPane.classList.remove('hidden');
    }
}

function createTabUI(tabId, count) {
    const tabBtn = document.createElement('button');
    tabBtn.id = `tab-${tabId}`;
    tabBtn.className = "px-4 h-full text-[11px] font-bold uppercase tracking-wider border-b-2 border-transparent text-slate-400 hover:text-slate-600 flex items-center gap-2 transition-all";
    tabBtn.innerHTML = `QUERY-${count} <span class="tab-close-icon ml-1 hover:text-rose-500 text-[10px]">✕</span>`;

    tabBtn.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-close-icon')) { closeTab(tabId); }
        else { activateTab(tabId); }
    });

    document.getElementById('tab-container').appendChild(tabBtn);

    const pane = document.createElement('div');
    pane.id = `pane-${tabId}`;
    pane.className = "tab-content-pane p-4 space-y-4";
    pane.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div id="loader-${tabId}" class="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <div>
                <span id="status-pill-${tabId}" class="status-pill bg-blue-100 text-blue-600 mb-2 inline-block">Starting...</span>
                <p id="msg-${tabId}" class="text-sm text-slate-600 leading-relaxed animate-pulse-text">Preparing batch request...</p>
            </div>
        </div>`;
    document.getElementById('dynamic-content-area').appendChild(pane);
}

function closeTab(tabId) {
    const tab = document.getElementById('tab-' + tabId);
    if (tab) tab.remove();
    const pane = document.getElementById('pane-' + tabId);
    if (pane) pane.remove();
    if (activeTabId === tabId) activateTab('home');
}

function updateTabStatus(tabId, label, colorClass, message) {
    const pill = document.getElementById(`status-pill-${tabId}`);
    const msg = document.getElementById(`msg-${tabId}`);
    if (pill) {
        pill.innerText = label;
        pill.className = `status-pill ${colorClass} mb-2 inline-block`;
    }
    if (msg) msg.innerText = message;
}

function showTabError(tabId, errorMessage) {
    const loader = document.getElementById(`loader-${tabId}`);
    if (loader) loader.remove();
    updateTabStatus(tabId, "Error", "bg-rose-100 text-rose-600", errorMessage);
}

// --- Data Rendering ---
function renderResults(tabId, items) {
    const pane = document.getElementById('pane-' + tabId);
    if (!pane) return;

    if (items.length === 0) {
        pane.innerHTML = `<div class="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">No patient records found.</div>`;
        return;
    }

    const viewMode = pane.dataset.viewMode || 'ROOM';
    const sortMode = pane.dataset.sortMode || 'QUERY';

    pane.innerHTML = `
        <div class="space-y-2 mb-4 sticky-controls rounded-b-lg shadow-lg">
             <div class="flex gap-2">
                <button id="copy-all-${tabId}" class="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black py-2 rounded shadow-sm transition-colors uppercase tracking-widest">Copy All Patients</button>
                <button id="copy-summary-${tabId}" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black py-2 rounded border border-slate-200 transition-colors uppercase tracking-widest">Copy Summary Only</button>
            </div>
            <div class="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                <div class="flex gap-1 bg-slate-100 p-1 rounded-md">
                    <button class="toggle-view px-3 py-1 text-[10px] font-bold rounded ${viewMode === 'ROOM' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}" data-mode="ROOM">BY ROOM</button>
                    <button class="toggle-view px-3 py-1 text-[10px] font-bold rounded ${viewMode === 'DOCTOR' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}" data-mode="DOCTOR">BY DOCTOR</button>
                </div>
                <div class="flex gap-1 bg-slate-100 p-1 rounded-md">
                    <button class="toggle-sort px-3 py-1 text-[10px] font-bold rounded ${sortMode === 'QUERY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}" data-sort="QUERY">QUERY ORDER</button>
                    <button class="toggle-sort px-3 py-1 text-[10px] font-bold rounded ${sortMode === 'BED' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}" data-sort="BED">BED SORT</button>
                </div>
            </div>
        </div>
        <div id="results-list-${tabId}"></div>
    `;

    const listContainer = document.getElementById(`results-list-${tabId}`);
    const normalizedData = items.map(item => processPatient(item));

    let html = '';
    const hierarchy = (viewMode === 'ROOM') ? buildRoomHierarchy(normalizedData) : buildDoctorHierarchy(normalizedData);

    // Sort the primary groups alphabetically
    const sortedGroupKeys = Object.keys(hierarchy).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (viewMode === 'ROOM') {
        html = renderByRoom(hierarchy, sortedGroupKeys, sortMode);
    } else {
        html = renderByDoctor(hierarchy, sortedGroupKeys, sortMode);
    }

    listContainer.innerHTML = html + `<p class="text-center text-slate-400 text-[10px] font-bold uppercase py-4">Total ${items.length} records deduplicated</p>`;

    // --- Event Listeners ---
    pane.querySelectorAll('.toggle-view').forEach(btn => {
        btn.addEventListener('click', () => {
            pane.dataset.viewMode = btn.dataset.mode;
            renderResults(tabId, JSON.parse(pane.dataset.patients));
        });
    });
    pane.querySelectorAll('.toggle-sort').forEach(btn => {
        btn.addEventListener('click', () => {
            pane.dataset.sortMode = btn.dataset.sort;
            renderResults(tabId, JSON.parse(pane.dataset.patients));
        });
    });

    pane.querySelectorAll('.btn-copy').forEach(btn => btn.addEventListener('click', () => copyPatientRow(btn)));
    pane.querySelectorAll('.btn-copy-group').forEach(btn => btn.addEventListener('click', () => copyGroup(btn, hierarchy, viewMode, sortMode)));

    document.getElementById(`copy-all-${tabId}`).addEventListener('click', () => copyAllGlobal(hierarchy, sortedGroupKeys, viewMode, sortMode, false));
    document.getElementById(`copy-summary-${tabId}`).addEventListener('click', () => copyAllGlobal(hierarchy, sortedGroupKeys, viewMode, sortMode, true));
}

function processPatient(item) {
    const ref = item.REFERENSI;
    const pendaftaran = ref?.PENDAFTARAN;
    const pasien = pendaftaran?.REFERENSI?.PASIEN;
    const diagObj = pendaftaran?.DIAGNOSAMASUK?.REFERENSI?.DIAGNOSA;
    const rawRoomName = cleanField(ref?.RUANGAN?.DESKRIPSI);

    return {
        fullName: toTitleCase(cleanField(pasien?.NAMA)),
        age: calculateAge(cleanField(pasien?.TANGGAL_LAHIR)),
        diagnosis: diagObj ? `${diagObj.CODE} - ${diagObj.STR}` : "??",
        weight: cleanField(item.BERAT_BADAN),
        bedName: cleanField(ref?.RUANG_KAMAR_TIDUR?.TEMPAT_TIDUR),
        roomName: rawRoomName.replace(/^Bangsal\s+/i, ''),
        doctorName: cleanField(ref?.DPJP?.NAMA) // Preserving original title and case
    };
}

// --- Hierarchical Builders ---
function buildRoomHierarchy(data) {
    const h = {};
    data.forEach(p => {
        if (!h[p.roomName]) h[p.roomName] = { total: 0, subgroups: {} };
        if (!h[p.roomName].subgroups[p.doctorName]) h[p.roomName].subgroups[p.doctorName] = [];
        h[p.roomName].subgroups[p.doctorName].push(p);
        h[p.roomName].total++;
    });
    return h;
}

function buildDoctorHierarchy(data) {
    const h = {};
    data.forEach(p => {
        if (!h[p.doctorName]) h[p.doctorName] = { total: 0, subgroups: {} };
        if (!h[p.doctorName].subgroups[p.roomName]) h[p.doctorName].subgroups[p.roomName] = [];
        h[p.doctorName].subgroups[p.roomName].push(p);
        h[p.doctorName].total++;
    });
    return h;
}

function renderByRoom(hierarchy, sortedRoomKeys, sortMode) {
    let html = '';
    for (const room of sortedRoomKeys) {
        const info = hierarchy[room];
        // Sort subgroups (doctors) within room
        const sortedDocKeys = Object.keys(info.subgroups).sort();

        html += `
        <div class="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-4">
            <div class="bg-blue-600 px-3 py-1.5 flex justify-between items-center">
                <span class="text-[11px] font-black text-white uppercase tracking-widest">${room}</span>
                <div class="flex items-center gap-2">
                    <button class="btn-copy-group text-[9px] bg-blue-500 hover:bg-blue-400 text-white font-bold px-2 py-0.5 rounded transition-colors" data-group="${room}">COPY ROOM</button>
                    <span class="bg-blue-700 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">${info.total} PATIENTS</span>
                </div>
            </div>
            <div class="divide-y divide-slate-100">
                ${sortedDocKeys.map(doc => {
            const patients = info.subgroups[doc];
            const sortedPatients = sortPatients(patients, sortMode);
            return `
                    <div class="bg-slate-50/50">
                        <div class="px-3 py-1 border-b border-slate-100 flex justify-between items-center">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tight italic">${doc}</span>
                            <span class="text-[9px] text-slate-400 font-bold">${patients.length}</span>
                        </div>
                        <div class="divide-y divide-slate-50">
                            ${sortedPatients.map(p => patientRowTemplate(p)).join('')}
                        </div>
                    </div>`;
        }).join('')}
            </div>
        </div>`;
    }
    return html;
}

function renderByDoctor(hierarchy, sortedDocKeys, sortMode) {
    let html = '';
    for (const doc of sortedDocKeys) {
        const info = hierarchy[doc];
        // Sort subgroups (rooms) within doctor
        const sortedRoomKeys = Object.keys(info.subgroups).sort();

        html += `
        <div class="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-4">
            <div class="bg-emerald-600 px-3 py-1.5 flex justify-between items-center">
                <span class="text-[11px] font-black text-white uppercase tracking-widest">${doc}</span>
                <div class="flex items-center gap-2">
                    <button class="btn-copy-group text-[9px] bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-2 py-0.5 rounded transition-colors" data-group="${doc}">COPY DOCTOR</button>
                    <span class="bg-emerald-700 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">${info.total} TOTAL</span>
                </div>
            </div>
            <div class="divide-y divide-slate-100">
                ${sortedRoomKeys.map(room => {
            const patients = info.subgroups[room];
            const sortedPatients = sortPatients(patients, sortMode);
            return `
                    <div class="bg-slate-50/50">
                        <div class="px-3 py-1 border-b border-slate-100 flex justify-between items-center">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tight">${room}</span>
                            <span class="text-[9px] text-slate-400 font-bold">${patients.length}</span>
                        </div>
                        <div class="divide-y divide-slate-50">
                            ${sortedPatients.map(p => patientRowTemplate(p)).join('')}
                        </div>
                    </div>`;
        }).join('')}
            </div>
        </div>`;
    }
    return html;
}

function patientRowTemplate(p) {
    return `
    <div class="compact-row flex items-center justify-between px-3 py-2 hover:bg-white group transition-colors">
        <div class="text-xs font-medium text-slate-700 leading-relaxed patient-data">
            <span class="font-bold text-slate-400">${p.bedName}</span>/<span class="font-bold text-slate-900">${p.fullName}</span>/<span class="text-slate-500">${p.age}</span>/<span class="text-blue-600 font-semibold">${p.diagnosis}</span>/<span class="font-bold">${p.weight === '??' ? '??' : p.weight + ' kg'}</span>
        </div>
        <div class="actions opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="btn-copy text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 border border-blue-200">Copy</button>
        </div>
    </div>`;
}

// --- Copy & Export Logic ---

/**
 * Formats a block of text for a single group or global copy
 */
function formatGroupText(groupName, info, viewMode, sortMode, summaryOnly) {
    let lines = [];

    // Group Header: Simplified to just (count)
    lines.push(`*${groupName} (${info.total})*`);

    const sortedSubKeys = Object.keys(info.subgroups).sort();

    for (const subName of sortedSubKeys) {
        const patients = info.subgroups[subName];
        lines.push(`${subName} (${patients.length})`);

        if (!summaryOnly) {
            const sorted = sortPatients(patients, sortMode);
            sorted.forEach(p => {
                const diag = p.diagnosis;
                const weight = p.weight === '??' ? '??' : `${p.weight} kg`;
                lines.push(`- ${p.bedName}/${p.fullName}/${p.age}/${diag}/${weight}`);
            });
        }
    }
    return lines.join('\n');
}

function copyGroup(btn, hierarchy, viewMode, sortMode) {
    const groupName = btn.dataset.group;
    const info = hierarchy[groupName];
    if (!info) return;

    const output = formatGroupText(groupName, info, viewMode, sortMode, false);
    executeClipboardCopy(output, btn);
}

function copyAllGlobal(hierarchy, sortedGroupKeys, viewMode, sortMode, summaryOnly) {
    let totalOutput = [];
    for (const groupName of sortedGroupKeys) {
        const info = hierarchy[groupName];
        totalOutput.push(formatGroupText(groupName, info, viewMode, sortMode, summaryOnly));
    }

    const finalString = totalOutput.join('\n\n');
    const tempBtn = document.createElement('button'); // Dummy for feedback
    executeClipboardCopy(finalString, tempBtn);

    // Visual feedback on the trigger buttons
    const btnId = summaryOnly ? `copy-summary-${activeTabId}` : `copy-all-${activeTabId}`;
    const btn = document.getElementById(btnId);
    const originalText = btn.innerText;
    btn.innerText = 'COPIED TO CLIPBOARD!';
    setTimeout(() => btn.innerText = originalText, 1500);
}

function copyPatientRow(btn) {
    const row = btn.closest('.compact-row');
    const textContent = row.querySelector('.patient-data').innerText.trim();
    executeClipboardCopy(textContent, btn);
}

function executeClipboardCopy(text, feedbackEl) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);

    if (feedbackEl && feedbackEl.tagName === 'BUTTON') {
        const originalText = feedbackEl.innerText;
        feedbackEl.innerText = 'Copied!';
        setTimeout(() => feedbackEl.innerText = originalText, 1000);
    }
}

// --- Helper Functions ---

function sortPatients(patients, mode) {
    if (mode === 'QUERY') return [...patients];
    return [...patients].sort((a, b) => {
        return a.bedName.localeCompare(b.bedName, undefined, { numeric: true, sensitivity: 'base' });
    });
}

function cleanField(val) {
    return (val === null || val === undefined || String(val).trim() === "" || String(val).trim() === "null") ? "??" : val;
}

function toTitleCase(str) {
    if (!str || str === "??") return "??";
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function calculateAge(dobString) {
    if (!dobString || dobString === "??") return "??";
    try {
        const birthDate = new Date(dobString.split(' ')[0]);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();
        if (days < 0) { months--; const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0); days += prevMonth.getDate(); }
        if (months < 0) { years--; months += 12; }
        return `${years}y, ${months}m, ${days}d`;
    } catch (e) { return "??"; }
}
