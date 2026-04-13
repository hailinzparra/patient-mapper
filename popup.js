/**
 * Patient Mapper - Popup Logic
 * Handles authentication, tab management, and multi-fetch API logic.
 * Features: Hierarchical view, Sorting, and advanced Copy functions.
 */

let tabCounter = 0;
let activeTabId = 'home';
let sidebarCollapsed = false;

// Data
const doctorDatabase = [
    { name: "dr. Firman, Sp.B", id: "37" },
    { name: "dr. Satria, Sp.B", id: "71" },
    { name: "dr. Andri, Sp.U", id: "36" },
    // { name: "dr. Aris, Sp.BS", id: "98" },
    // { name: "dr. Robin, Sp.BA", id: "104" },
    { name: "dr. Amir, Sp.OT", id: "24" },
    { name: "dr. Twody, Sp.OT", id: "10" },
    { name: "dr. Eka, Sp.OG", id: "11" },
    { name: "dr. Cakra, Sp.OG", id: "27" },
    { name: "dr. Guntur, Sp.OG", id: "57" },
    { name: "dr. Khome, Sp.OG", id: "62" },
    { name: "dr. Endra, Sp.PD", id: "12" },
    { name: "dr. Dar, Sp.PD", id: "30" },
    { name: "dr. Diksi, Sp.PD", id: "63" },
    { name: "dr. Afandi, Sp.JP", id: "89" },
    { name: "dr. Shigma, Sp.JP", id: "103" },
    { name: "dr. Enny, Sp.P", id: "19" },
    { name: "dr. Bimo, Sp.P", id: "67" },
    { name: "dr. Ain, Sp.A", id: "28" },
    { name: "dr. Nisa, Sp.A", id: "25" },
    { name: "dr. Sari, Sp.A", id: "32" },
    { name: "dr. Yani, Sp.S", id: "14" },
    { name: "dr. Agung, Sp.S", id: "15" },
    { name: "dr. Palma, Sp.N", id: "109" },
    { name: "dr. Romy, Sp.KJ", id: "29" },
    { name: "dr. Har, Sp.KJ", id: "59" },
    { name: "dr. Tavip, Sp.THT-KL", id: "16" },
    { name: "dr. Yoice, Sp.THT-KL", id: "17" },
    { name: "dr. Retna, Sp.M", id: "80" },
    { name: "dr. Anin, Sp.DVE", id: "101" },
];

const roomDatabase = [
    { name: "Poli Anak", id: "101010107" },
    { name: "Instalasi ICU", id: "101150101" },
    { name: "RD Bedah Umum", id: "101020101" },
    { name: "RD Kandungan", id: "101020301" },
    { name: "RD Psikiatri", id: "101020401" },
    { name: "RD Anak", id: "101020501" },
    { name: "RD Bedah Orthopedi", id: "101020601" },
    { name: "Bangsal Amarilis", id: "101030101" },
    { name: "Bangsal Aster 1", id: "101030102" },
    { name: "Bangsal Aster 2", id: "101030103" },
    { name: "Bangsal Teratai", id: "101030104" },
    { name: "Bangsal Bougenvile", id: "101030105" },
    { name: "Bangsal Anyelir 1", id: "101030106" },
    { name: "Bangsal Anggrek 1", id: "101030107" },
    { name: "Bangsal Anggrek 2", id: "101030108" },
    { name: "Bangsal Anggrek 3", id: "101030109" },
    { name: "Bangsal Melati", id: "101030110" },
    { name: "Bangsal Asoka", id: "101030111" },
    { name: "Bangsal Cempaka", id: "101030112" },
    { name: "Bangsal Dahlia", id: "101030113" },
    { name: "RD Non Bedah", id: "101020201" },
    // { name: "Bangsal Mawar", id: "101030114" },
    { name: "Ruang Medik Operatif (IBS)", id: "101080201" },
    { name: "Bangsal Anyelir 2 (Unit stroke)", id: "101030115" },
    // { name: "RD Bedah Saraf", id: "101020701" },
];

const templates = [
    {
        id: "igd",
        name: "IGD",
        docs: [],
        rooms: ["101020101", "101020301", "101020401", "101020501", "101020601", "101020201"],
    },
    {
        id: "anak",
        name: "Anak",
        docs: ["28", "25", "32"],
        rooms: [],
    },
    {
        id: "anak-bangsal",
        name: "Anak + Bangsal Anak",
        docs: ["28", "25", "32"],
        rooms: [";", "101030109", "101030111", "101030112", "101030110", "101020501", "101020301"],
    },
    {
        id: "bedah",
        name: "Bedah Umum",
        docs: ["37", "71"],
        rooms: [],
    },
    {
        id: "uro",
        name: "Uro",
        docs: ["36"],
        rooms: [],
    },
    {
        id: "ortho",
        name: "Ortho",
        docs: ["24", "10"],
        rooms: [],
    },
    {
        id: "obgyn",
        name: "Obgyn",
        docs: ["11", "27", "57", "62"],
        rooms: [],
    },
    {
        id: "interna",
        name: "Interna",
        docs: ["12", "30", "63"],
        rooms: [],
    },
    {
        id: "jantung",
        name: "Jantung",
        docs: ["89", "103"],
        rooms: [],
    },
    {
        id: "paru",
        name: "Paru",
        docs: ["19", "67"],
        rooms: [],
    },
    {
        id: "saraf",
        name: "Saraf",
        docs: ["14", "15", "109"],
        rooms: [],
    },
    {
        id: "jiwa",
        name: "Jiwa",
        docs: ["29", "59"],
        rooms: [],
    },
    {
        id: "tht",
        name: "THT",
        docs: ["16", "17"],
        rooms: [],
    },
    {
        id: "mata",
        name: "Mata",
        docs: ["80"],
        rooms: [],
    },
    {
        id: "kulit",
        name: "Kulit",
        docs: ["101"],
        rooms: [],
    },
];

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupForm();
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
}

function setupForm() {
    // State
    let selectedDocs = [];
    let selectedRooms = [];

    // DOM Elements
    const form = document.getElementById("fetch-form");
    const docTagContainer = document.getElementById("doc-tag-container");
    const docInput = document.getElementById("doc-input-field");
    const docAutocomplete = document.getElementById("doc-autocomplete");
    const roomTagContainer = document.getElementById("room-tag-container");
    const roomInput = document.getElementById("room-input-field");
    const roomAutocomplete = document.getElementById("room-autocomplete");

    function getSerializedData(itemArray) {
        if (itemArray.length === 0) return "";

        let result = "";
        let isFirstInBatch = true;

        itemArray.forEach((item) => {
            if (item.type === 'batch') {
                result += "; ";
                isFirstInBatch = true;
            } else {
                if (!isFirstInBatch) {
                    result += ", ";
                }
                result += item.id;
                isFirstInBatch = false;
            }
        });
        return result;
    }

    // --- Multi-Select Logic ---
    function updateUI(targetInput = null) {
        renderTags(
            docTagContainer,
            selectedDocs,
            doctorDatabase,
            "doc",
        );
        renderTags(
            roomTagContainer,
            selectedRooms,
            roomDatabase,
            "room",
        );
        renderTemplates();

        if (targetInput) {
            targetInput.focus();
        }
    }

    function renderTags(container, selectedItems, database, type) {
        const input = container.querySelector("input");
        container.innerHTML = "";

        let currentBatchNumber = 1;

        // Color schemes for 5 batches
        const colorSchemes = [
            {
                bg: "bg-blue-50",
                text: "text-blue-700",
                border: "border-blue-200",
                hover: "hover:text-blue-900",
            }, // Batch 1
            {
                bg: "bg-emerald-50",
                text: "text-emerald-700",
                border: "border-emerald-200",
                hover: "hover:text-emerald-900",
            }, // Batch 2
            {
                bg: "bg-amber-50",
                text: "text-amber-700",
                border: "border-amber-200",
                hover: "hover:text-amber-900",
            }, // Batch 3
            {
                bg: "bg-rose-50",
                text: "text-rose-700",
                border: "border-rose-200",
                hover: "hover:text-rose-900",
            }, // Batch 4
            {
                bg: "bg-indigo-50",
                text: "text-indigo-700",
                border: "border-indigo-200",
                hover: "hover:text-indigo-900",
            }, // Batch 5
        ];

        selectedItems.forEach((itemObj, index) => {
            const tag = document.createElement("div");

            if (itemObj.type === "batch") {
                tag.className =
                    "flex items-center gap-1 px-2 py-1 bg-slate-800 text-white rounded-md text-[10px] font-black uppercase tracking-tighter shadow-sm";
                tag.innerHTML = `
                            <span>BATCH</span>
                            <button type="button" class="hover:text-red-300 ml-1" data-index="${index}">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="3"></path></svg>
                            </button>
                        `;
                currentBatchNumber++;
            } else {
                const data = database.find(
                    (d) => d.id === itemObj.id,
                ) || { id: itemObj.id, name: itemObj.id };

                // Pick color scheme based on current batch (cycle through if more than 5)
                const scheme =
                    colorSchemes[
                    (currentBatchNumber - 1) %
                    colorSchemes.length
                    ];

                tag.className = `flex items-center gap-1.5 px-2 py-1 border rounded-md text-[11px] font-bold shadow-sm transition-colors ${scheme.bg} ${scheme.text} ${scheme.border}`;
                tag.innerHTML = `
                            <span>${data.name}</span>
                            <button type="button" class="${scheme.hover} transition-colors" data-index="${index}">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"></path></svg>
                            </button>
                        `;
            }

            tag.querySelector("button").addEventListener(
                "click",
                (e) => {
                    e.stopPropagation();
                    removeItem(index, type);
                },
            );
            container.appendChild(tag);
        });
        container.appendChild(input);
    }

    function removeItem(index, type) {
        if (type === "doc") {
            selectedDocs.splice(index, 1);
            updateUI(docInput);
        } else {
            selectedRooms.splice(index, 1);
            updateUI(roomInput);
        }
    }

    function pickItem(item, type, input, list) {
        const listObj =
            type === "doc" ? selectedDocs : selectedRooms;
        if (item.type === "batch") {
            listObj.push({ type: "batch" });
        } else {
            listObj.push({ id: item.id, type: "item" });
        }
        if (input) input.value = "";
        if (list) list.classList.add("hidden");
        updateUI(input);
    }

    function handleAutocomplete(input, list, database, type) {
        let currentSelectedIndex = 0;
        let currentMatches = [];

        const getMatches = () => {
            const val = input.value.trim().toLowerCase();
            if (!val) return [];

            let filtered = [];
            if (val.includes(";")) {
                filtered.push({
                    id: ";",
                    name: "NEW BATCH",
                    type: "batch",
                });
            }

            const currentList =
                type === "doc" ? selectedDocs : selectedRooms;
            const lastBatchIndex = currentList
                .map((i) => i.type)
                .lastIndexOf("batch");
            const itemsInCurrentBatch = currentList
                .slice(lastBatchIndex + 1)
                .map((i) => i.id);

            const dbMatches = database
                .filter(
                    (item) =>
                        (item.name.toLowerCase().includes(val) ||
                            item.id.includes(val)) &&
                        !itemsInCurrentBatch.includes(item.id),
                )
                .map((item) => ({ ...item, type: "item" }));

            return [...filtered, ...dbMatches];
        };

        const renderList = () => {
            list.innerHTML = "";
            currentMatches.forEach((item, idx) => {
                const div = document.createElement("div");
                const isSelected = idx === currentSelectedIndex;
                const highlightClass = isSelected
                    ? "autocomplete-item-highlight"
                    : "";

                div.className = `px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs border-b border-slate-50 last:border-0 flex items-center justify-between transition-colors ${highlightClass}`;

                if (item.type === "batch") {
                    div.innerHTML = `
                                <span><span class="font-black text-slate-800 tracking-widest">NEXT BATCH (;)</span></span>
                                ${isSelected ? '<span class="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">Enter to Pick</span>' : ""}
                            `;
                } else {
                    div.innerHTML = `
                                <span><span class="font-bold text-blue-600">${item.id}</span> - <span class="text-slate-600">${item.name}</span></span>
                                ${isSelected ? '<span class="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">Enter to Pick</span>' : ""}
                            `;
                }

                div.addEventListener("click", () =>
                    pickItem(item, type, input, list),
                );
                list.appendChild(div);
            });
        };

        input.addEventListener("input", () => {
            currentMatches = getMatches();
            currentSelectedIndex = 0;
            if (currentMatches.length === 0) {
                list.classList.add("hidden");
                return;
            }
            renderList();
            list.classList.remove("hidden");
        });

        input.addEventListener("keydown", (e) => {
            const listObj =
                type === "doc" ? selectedDocs : selectedRooms;

            if (
                currentMatches.length > 0 &&
                !list.classList.contains("hidden")
            ) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    currentSelectedIndex =
                        (currentSelectedIndex + 1) %
                        currentMatches.length;
                    renderList();
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    currentSelectedIndex =
                        (currentSelectedIndex -
                            1 +
                            currentMatches.length) %
                        currentMatches.length;
                    renderList();
                }
            }

            if (
                e.key === "Enter" ||
                e.key === "," ||
                e.key === ";"
            ) {
                e.preventDefault();
                const val = input.value.trim();

                if (e.key === ";" || val.includes(";")) {
                    pickItem({ type: "batch" }, type, input, list);
                } else {
                    if (
                        currentMatches.length > 0 &&
                        !list.classList.contains("hidden")
                    ) {
                        pickItem(
                            currentMatches[currentSelectedIndex],
                            type,
                            input,
                            list,
                        );
                    } else if (val) {
                        const cleanVal = val.replace(",", "");
                        pickItem(
                            { id: cleanVal, type: "item" },
                            type,
                            input,
                            list,
                        );
                    }
                }
            }

            if (e.key === "Backspace" && !input.value) {
                e.preventDefault();
                listObj.pop();
                updateUI(input);
            }
        });
    }

    // --- Template & General Logic ---
    const templateDropdownBtn = document.getElementById("template-dropdown-btn");
    const templateMenu = document.getElementById("template-menu");
    const templateSearch = document.getElementById("template-search");
    const templateList = document.getElementById("template-list");
    const selectedLabel = document.getElementById("selected-template-label");

    let selectedIndex = 0;

    templateSearch.addEventListener("click", e => e.stopPropagation());
    templateSearch.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        renderTemplates(searchTerm);

        const items = templateList.querySelectorAll("button");
        selectedIndex = 0;
        updateVisualFocus(items);
    });
    templateSearch.addEventListener("keydown", (e) => {
        const items = templateList.querySelectorAll("button");

        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateVisualFocus(items);
        }
        else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateVisualFocus(items);
        }
        else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) {
                items[selectedIndex].click(); // Trigger the selection logic
            }
        }
    });

    function updateVisualFocus(items) {
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                // Apply highlight styles
                item.classList.add("bg-blue-50", "text-blue-600");
                // Auto-scroll if the list is long
                item.scrollIntoView({ block: "nearest" });
            } else {
                item.classList.remove("bg-blue-50", "text-blue-600");
            }
        });
    }

    function renderTemplates(filter = "") {
        templateList.innerHTML = "";

        // Filter the templates based on the search term
        const filteredTemplates = templates.filter(t =>
            t.name.toLowerCase().includes(filter)
        );

        if (filteredTemplates.length === 0) {
            const noResult = document.createElement("div");
            noResult.className = "px-4 py-2 text-[11px] text-slate-400 italic";
            noResult.textContent = "No templates found.";
            templateList.appendChild(noResult);
            return;
        }

        let itemIndex = 0;
        filteredTemplates.forEach((t) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className =
                "w-full text-left px-4 py-2 text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors";
            if (itemIndex === selectedIndex) {
                btn.className += " bg-blue-50 text-blue-600";
            }
            itemIndex++;
            btn.textContent = t.name;
            btn.addEventListener("click", () => {
                // Logic to handle strings or batch markers in templates
                selectedDocs = t.docs.map((id) =>
                    id === ";"
                        ? { type: "batch" }
                        : { id, type: "item" },
                );
                selectedRooms = t.rooms.map((id) =>
                    id === ";"
                        ? { type: "batch" }
                        : { id, type: "item" },
                );

                selectedLabel.textContent = t.name;
                templateMenu.classList.add("hidden");
                updateUI();
            });
            btn.addEventListener("mouseenter", () => {
                const currentItems = Array.from(templateList.querySelectorAll("button"));
                selectedIndex = currentItems.indexOf(btn);
                updateVisualFocus(currentItems);
            });
            templateList.appendChild(btn);
        });
    }

    handleAutocomplete(
        docInput,
        docAutocomplete,
        doctorDatabase,
        "doc",
    );
    handleAutocomplete(
        roomInput,
        roomAutocomplete,
        roomDatabase,
        "room",
    );

    window.addEventListener("click", () => {
        docAutocomplete.classList.add("hidden");
        roomAutocomplete.classList.add("hidden");
        templateMenu.classList.add("hidden");
    });

    templateDropdownBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        templateMenu.classList.toggle("hidden");
        if (!templateMenu.classList.contains("hidden")) {
            templateSearch.focus();
        }
    });

    document
        .getElementById("toggle-advanced-btn")
        .addEventListener("click", function () {
            const adv = document.getElementById("advanced-options");
            adv.classList.toggle("open");
            document
                .getElementById("chevron-icon")
                .classList.toggle("rotate-180");
        });

    document
        .getElementById("enable-date")
        .addEventListener("change", (e) => {
            document.getElementById("form-date").disabled =
                !e.target.checked;
        });

    form.addEventListener("reset", (e) => {
        setTimeout(() => {
            selectedDocs = [];
            selectedRooms = [];
            selectedLabel.textContent = "Select a template...";
            document.getElementById("form-date").disabled = true;
            document
                .getElementById("advanced-options")
                .classList.remove("open");
            document
                .getElementById("chevron-icon")
                .classList.remove("rotate-180");
            updateUI();
        }, 0);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const serializedDocs = getSerializedData(selectedDocs);
        const serializedRooms = getSerializedData(selectedRooms);
        handleFetch(serializedDocs, serializedRooms);
    });


    [docTagContainer, roomTagContainer].forEach((c) => {
        c.addEventListener("click", () =>
            c.querySelector("input").focus(),
        );
    });

    renderTemplates();
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
            func: () => {
                return {
                    token: localStorage.getItem('_lapp-access_token'),
                    isEncrypted: localStorage.getItem('_lapp-https_encrypt') === 'true'
                };
            }
        });

        const result = injectionResults[0]?.result;

        if (!result || !result.token) {
            throw new Error("Token not found. Please log in to the RSUD website first.");
        }

        return {
            rawToken: result.token,
            isEncryptionEnabled: result.isEncrypted
        };
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

async function getAuthenticatedToken() {
    try {
        const sessionData = await getSessionToken();
        return atob(sessionData.rawToken);
    } catch (err) {
        throw new Error("Active session not found. Please re-login.");
    }
}

async function handleFetch(serializedDocs, serializedRooms) {
    const fetchBtn = document.getElementById('main-fetch-btn');
    const authBar = document.getElementById('auth-status');
    const authText = document.getElementById('auth-status-text');

    fetchBtn.disabled = true;
    authBar.classList.remove('hidden');
    authText.innerText = "Finding active session...";

    let rawToken;
    let isEncryptionEnabled;
    try {
        const sessionData = await getSessionToken();
        rawToken = sessionData.rawToken;
        isEncryptionEnabled = sessionData.isEncryptionEnabled;
    } catch (authErr) {
        authText.innerText = authErr.message;
        authText.className = "text-rose-500 font-bold";
        fetchBtn.disabled = false;
        return;
    }

    tabCounter++;
    const tabId = `pat-${tabCounter}`;

    const rawDocInput = serializedDocs;
    const rawRoomInput = serializedRooms;
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
                    const finalItems = isEncryptionEnabled
                        ? await decryptData(result.data, rawToken)
                        : result.data;
                    const items = Array.isArray(finalItems) ? finalItems : [];

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

function setIDLists() {
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

    renderTable(doctorDatabase, 'doctor-table-body');
    renderTable(roomDatabase, 'room-table-body');
}

function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const icon = document.getElementById('toggle-icon');
    sidebar.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    icon.style.transform = sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
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
    pane.querySelectorAll('.btn-more').forEach(btn => btn.addEventListener('click', () => {
        const patientData = JSON.parse(btn.getAttribute("data-patient"));
        openPatientModal(patientData);
    }));
    pane.querySelectorAll('.btn-copy-group').forEach(btn => btn.addEventListener('click', () => copyGroup(btn, hierarchy, viewMode, sortMode)));

    document.getElementById(`copy-all-${tabId}`).addEventListener('click', () => copyAllGlobal(hierarchy, sortedGroupKeys, viewMode, sortMode, false));
    document.getElementById(`copy-summary-${tabId}`).addEventListener('click', () => copyAllGlobal(hierarchy, sortedGroupKeys, viewMode, sortMode, true));
}

function processPatient(item) {
    const no = item.NOMOR;
    const ref = item.REFERENSI;
    const pendaftaran = ref?.PENDAFTARAN;
    const pasien = pendaftaran?.REFERENSI?.PASIEN;
    const diagObj = pendaftaran?.DIAGNOSAMASUK?.REFERENSI?.DIAGNOSA;
    const rawRoomName = cleanField(ref?.RUANGAN?.DESKRIPSI);

    return {
        no: String(cleanField(no, "")),
        fullName: toTitleCase(cleanField(pasien?.NAMA)),
        mrn: cleanField(pasien?.NORM),
        age: calculateAge(cleanField(pasien?.TANGGAL_LAHIR)),
        diagnosis: diagObj ? `${diagObj.CODE} - ${diagObj.STR}` : "??",
        bedName: cleanField(ref?.RUANG_KAMAR_TIDUR?.TEMPAT_TIDUR),
        roomName: rawRoomName.replace(/^Bangsal\s+/i, ''),
        doctorName: cleanField(ref?.DPJP?.NAMA)
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
                    <span class="bg-blue-700 text-white text-center text-[9px] font-bold px-2 py-0.5 rounded-full">${info.total} ${info.total === 1 ? 'PATIENT' : 'PATIENTS'}</span>
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
                    <span class="bg-emerald-700 text-white text-center text-[9px] font-bold px-2 py-0.5 rounded-full">${info.total} ${info.total === 1 ? 'PATIENT' : 'PATIENTS'}</span>
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
            <span class="font-bold text-slate-400">${p.bedName}</span>/<span class="font-bold text-slate-900">${p.fullName}</span>/<span class="font-bold text-slate-400">${p.mrn}</span>/<span class="text-slate-500">${p.age}</span>/<span class="text-blue-600 font-semibold">${p.diagnosis}</span>
        </div>
        <div class="actions flex flex-col sm:flex-row gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-end sm:items-center">
            <button class="btn-copy text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 border border-blue-200 transition-colors">
                Copy
            </button>
            <button 
                class="btn-more text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded hover:bg-slate-100 border border-slate-200 transition-colors"
                data-patient='${JSON.stringify(p)}'
            >
                More
            </button>
        </div>
    </div>`;
}

// --- Copy, More, and Export Logic ---

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
                lines.push(`- ${p.bedName}/${p.fullName}/${p.mrn}/${p.age}/${diag}`);
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
    executeClipboardCopy(output, btn, 'COPIED!');
}

function copyAllGlobal(hierarchy, sortedGroupKeys, viewMode, sortMode, summaryOnly) {
    let totalOutput = [];
    for (const groupName of sortedGroupKeys) {
        const info = hierarchy[groupName];
        totalOutput.push(formatGroupText(groupName, info, viewMode, sortMode, summaryOnly));
    }

    const btnId = summaryOnly ? `copy-summary-${activeTabId}` : `copy-all-${activeTabId}`;
    const btn = document.getElementById(btnId);
    const finalString = totalOutput.join('\n\n');
    executeClipboardCopy(finalString, btn, 'COPIED TO CLIPBOARD!');
}

function copyPatientRow(btn) {
    const row = btn.closest('.compact-row');
    const textContent = row.querySelector('.patient-data').innerText.trim();
    executeClipboardCopy(textContent, btn);
}

async function executeClipboardCopy(text, feedbackEl, copiedText = 'Copied!') {
    try {
        await navigator.clipboard.writeText(text);

        if (feedbackEl && feedbackEl.tagName === 'BUTTON') {
            const originalText = feedbackEl.innerText;
            feedbackEl.innerText = copiedText;
            setTimeout(() => {
                feedbackEl.innerText = originalText;
            }, 1000);
        }
    } catch (err) {
        console.error('Failed to copy text: ', err);
        if (feedbackEl) feedbackEl.innerText = 'Error';
    }
}

// --- Detailed Patient Modal ---
function openPatientModal(p) {
    const modal = document.createElement('div');
    modal.id = "patient-modal";
    modal.className = "fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4";

    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="font-bold text-slate-800 text-sm">Patient Details</h3>
                <button id="modal-close-x" class="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
                ${renderField("Room", p.roomName || 'N/A')}
                ${renderField("Bed", p.bedName)}
                ${renderField("Full Name", p.fullName, "font-bold text-slate-900")}
                ${renderField("MRN", p.mrn)}
                ${renderField("Age", p.age)}
                ${renderField("Diagnosis", p.diagnosis, "text-blue-600 font-semibold")}
                ${renderField("Physician in Charge (DPJP)", p.doctorName || 'Not Assigned')}
            </div>
            <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button id="modal-close-btn" class="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">Close</button>
                <button id="modal-cppt-btn" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-colors flex items-center justify-center gap-2">CPPT</button>
            </div>
        </div>`;

    document.body.appendChild(modal);

    // Event Listeners
    modal.querySelector("#modal-close-x").onclick = () => modal.remove();
    modal.querySelector("#modal-close-btn").onclick = () => modal.remove();
    modal.querySelector("#modal-cppt-btn").onclick = () => {
        modal.remove();
        openCPPTModal(p);
    };
}

// Helper for modal fields
function renderField(label, value, valueClass = "font-semibold text-slate-800") {
    return `
        <section>
            <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400">${label}</p>
            <p class="${valueClass}">${value || '-'}</p>
        </section>`;
}

// --- CPPT Modal ---
async function fetchCPPTData(visitId, signal) {
    const decodedToken = await getAuthenticatedToken();
    const dc = Date.now();
    const url = `https://api.rsudsoediranms.com/webservice/medicalrecord/cppt?_dc=${dc}&KUNJUNGAN=${visitId}&STATUS=1&page=1&start=0&limit=25`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${decodedToken}`,
            'Accept': 'application/json'
        },
        signal: signal
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (!result.success) throw new Error(result.detail || "API Error");

    return result.data || [];
}

async function openCPPTModal(p) {
    const controller = new AbortController();
    const visitId = p.no;

    const modal = document.createElement('div');
    modal.className = "fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4";

    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div class="px-5 py-4 border-b border-slate-200 bg-white">
                <div class="flex justify-between items-start mb-2">
                    <div class="leading-tight">
                        <h3 class="font-black text-slate-900 text-sm uppercase">${p.fullName}</h3>
                        <p class="text-[10px] text-slate-500 font-mono">${p.mrn} • ${p.age} • ${p.no}</p>
                    </div>
                    <button id="cppt-close-x" class="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                </div>
                <div class="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded inline-block">
                    ${p.roomName} / ${p.bedName} — ${p.diagnosis}
                </div>
            </div>

            <div class="sticky top-0 z-10 bg-white border-b border-slate-100">
                <div class="px-5 py-2 bg-slate-50 flex items-center justify-between border-b border-slate-200/50">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filter</span>
                    <div class="flex bg-slate-200 p-0.5 rounded-md">
                        <button id="filter-all" class="px-3 py-1 text-[9px] font-bold rounded shadow-sm bg-white text-slate-800 transition-all">ALL</button>
                        <button id="filter-docs" class="px-3 py-1 text-[9px] font-bold rounded text-slate-500 transition-all">DOCTORS</button>
                    </div>
                </div>
                
                <div id="date-pagination" class="px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-white">
                    </div>
            </div>
            
            <div id="cppt-content" class="p-4 overflow-y-auto space-y-4 bg-slate-100 flex-grow min-h-[300px]">
                <div class="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                    <p class="text-[10px] font-bold uppercase tracking-widest">Accessing Records...</p>
                </div>
            </div>

            <div class="px-5 py-3 bg-white border-t border-slate-100">
                <button id="cppt-back-btn" class="w-full px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700">Close</button>
            </div>
        </div>`;

    document.body.appendChild(modal);

    let fullData = [];
    let activeDate = null;
    let showOnlyDocs = false;

    const close = () => { controller.abort(); modal.remove(); };
    modal.querySelector("#cppt-close-x").onclick = close;
    modal.querySelector("#cppt-back-btn").onclick = close;

    const refreshUI = () => {
        const filteredByProfession = showOnlyDocs
            ? fullData.filter(r => r.REFERENSI?.JENIS?.ID === "1")
            : fullData;

        const filteredByDate = filteredByProfession.filter(r => r.TANGGAL.startsWith(activeDate));

        renderPagination(fullData, activeDate, (newDate) => {
            activeDate = newDate;
            refreshUI();
        });

        renderCPPTData(filteredByDate, modal.querySelector("#cppt-content"), showOnlyDocs);
    };

    // Filter Listeners
    modal.querySelector("#filter-all").onclick = () => {
        showOnlyDocs = false;
        modal.querySelector("#filter-all").className = "px-3 py-1 text-[9px] font-bold rounded shadow-sm bg-white text-slate-800";
        modal.querySelector("#filter-docs").className = "px-3 py-1 text-[9px] font-bold rounded text-slate-500";
        refreshUI();
    };
    modal.querySelector("#filter-docs").onclick = () => {
        showOnlyDocs = true;
        modal.querySelector("#filter-docs").className = "px-3 py-1 text-[9px] font-bold rounded shadow-sm bg-white text-blue-600";
        modal.querySelector("#filter-all").className = "px-3 py-1 text-[9px] font-bold rounded text-slate-500";
        refreshUI();
    };

    try {
        fullData = await fetchCPPTData(visitId, controller.signal);
        if (fullData.length > 0) {
            // Sort descending so index 0 is the newest date
            const uniqueDates = [...new Set(fullData.map(r => r.TANGGAL.split(' ')[0]))].sort().reverse();
            activeDate = uniqueDates[0]; // Set default to the newest date
        }
        refreshUI();
    } catch (err) {
        if (err.name === 'AbortError') return;
        modal.querySelector("#cppt-content").innerHTML = `<p class="text-center text-red-500 text-[10px] font-bold py-10">${err.message}</p>`;
    }
}

function renderPagination(fullData, activeDate, onDateSelect) {
    const nav = document.getElementById("date-pagination");
    const uniqueDates = [...new Set(fullData.map(r => r.TANGGAL.split(' ')[0]))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];

    nav.innerHTML = uniqueDates.map(date => {
        const isActive = date === activeDate;
        const isToday = date === today;

        // Base styles
        let styles = "flex-shrink-0 px-3 py-1.5 rounded-md text-[10px] font-bold border transition-all whitespace-nowrap ";

        if (isActive) {
            // Active selection: Blue highlight
            styles += "bg-blue-600 border-blue-600 text-white shadow-md z-10 scale-105";
        } else if (isToday) {
            // Today but not active: Distinct Amber/Gold highlight
            styles += "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100";
        } else {
            // Regular historical dates: Clean Slate
            styles += "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100";
        }

        return `
            <button class="${styles}" data-date="${date}">
                ${isToday ? '★ TODAY' : date}
            </button>`;
    }).join('');

    // Attach click events
    nav.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => onDateSelect(btn.dataset.date);
    });
}

function renderCPPTData(records, container, isDoctorFilterActive) {
    if (records.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 px-10 text-center">
                <div class="bg-white p-4 rounded-full mb-3 shadow-sm italic text-slate-300 text-xl">!</div>
                <p class="text-slate-800 text-[11px] font-bold uppercase">No records found</p>
                <p class="text-slate-400 text-[10px] mt-1">
                    ${isDoctorFilterActive ? "There are no physician entries for this specific date." : "No clinical notes available for this date."}
                </p>
            </div>`;
        return;
    }

    container.innerHTML = records.map(r => {
        const isDoctor = r.REFERENSI?.JENIS?.ID === "1";
        const badgeColor = isDoctor ? "bg-blue-600" : "bg-emerald-600";

        const formatForCopy = (val) => {
            if (!val) return '-';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = val.replace(/<br\s*\/?>/gi, '\n');
            return tempDiv.textContent || tempDiv.innerText || "";
        };
        const soapText = `S:\n${formatForCopy(r.SUBYEKTIF)}\n\nO:\n${formatForCopy(r.OBYEKTIF)}\n\nA:\n${formatForCopy(r.ASSESMENT)}\n\nP:\n${formatForCopy(r.PLANNING)}`;

        return `
            <div class="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col mb-4">
                <div class="px-4 py-1.5 flex justify-between items-center ${badgeColor}">
                    <span class="text-white text-[9px] font-black uppercase tracking-tighter">${r.REFERENSI?.JENIS?.DESKRIPSI || 'Staff'}</span>
                    <button class="cppt-copy-btn bg-white/20 hover:bg-white/40 text-white text-[9px] font-bold px-2 py-0.5 rounded border border-white/30 transition-all" 
                            data-soap="${encodeURIComponent(soapText)}">Copy SOAP</button>
                </div>
                <div class="p-4 space-y-3">
                    <div class="flex justify-between items-start border-b border-slate-50 pb-2">
                        <p class="text-[10px] font-bold text-slate-800 uppercase flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full ${isDoctor ? 'bg-blue-600' : 'bg-emerald-600'}"></span>
                            ${r.REFERENSI?.TENAGA_MEDIS?.NAMA || 'Unknown'}
                        </p>
                        <p class="text-[9px] font-mono text-slate-400 font-bold">${r.TANGGAL.split(' ')[1]}</p>
                    </div>

                    <div class="space-y-3 text-[11px] leading-relaxed text-slate-700">
                        <div><b class="text-blue-500 block text-[9px] uppercase tracking-widest mb-1">Subjective (S)</b><p>${r.SUBYEKTIF || '-'}</p></div>
                        <div><b class="text-blue-500 block text-[9px] uppercase tracking-widest mb-1">Objective (O)</b><p>${r.OBYEKTIF || '-'}</p></div>
                        <div><b class="text-blue-500 block text-[9px] uppercase tracking-widest mb-1">Assessment (A)</b><p>${r.ASSESMENT || '-'}</p></div>
                        <div><b class="text-blue-500 block text-[9px] uppercase tracking-widest mb-1">Planning (P)</b><p>${r.PLANNING || '-'}</p></div>
                    </div>
                </div>
            </div>`;
    }).join('');

    container.querySelectorAll('.cppt-copy-btn').forEach(btn => {
        btn.onclick = (e) => executeClipboardCopy(decodeURIComponent(e.currentTarget.dataset.soap), e.currentTarget);
    });
}

// --- Helper Functions ---

function sortPatients(patients, mode) {
    if (mode === 'QUERY') return [...patients];
    return [...patients].sort((a, b) => {
        return a.bedName.localeCompare(b.bedName, undefined, { numeric: true, sensitivity: 'base' });
    });
}

function cleanField(val, placeholder = '??') {
    return (val === null || val === undefined || String(val).trim() === "" || String(val).trim() === "null") ? placeholder : val;
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
