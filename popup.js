document.addEventListener('DOMContentLoaded', async () => {
    const fetchBtn = document.getElementById('fetchBtn');
    const serverSelect = document.getElementById('serverSelect');
    const templateSelect = document.getElementById('templateSelect');
    const serverDisplay = document.getElementById('serverDisplay');
    const doctorIdInput = document.getElementById('doctorIdInput');
    const limitInput = document.getElementById('limitInput');
    const dateInput = document.getElementById('dateInput');
    const patientList = document.getElementById('patientList');
    const statusMessage = document.getElementById('statusMessage');

    // State to store current data grouped by Doctor -> Room -> Patients
    let currentDoctorGroupedData = null;
    let currentTotal = 0;
    let currentFetchIds = []; // Track IDs used for the "Anak" mapping logic

    // Create Share Menu UI
    const shareContainer = document.createElement('div');
    shareContainer.style.cssText = "margin-bottom: 16px; display: flex; gap: 8px; flex-direction: column;";
    shareContainer.innerHTML = `
        <select id="shareFormatSelect" style="flex: 1;">
            <option value="full">Format 1: Detail</option>
            <option value="summary">Format 2: Ringkasan</option>
            <option value="anak_summary">Format 3: Anak (Ringkasan)</option>
        </select>
        <button id="copyBtn" style="background-color: #28a745;">Salin untuk Chat</button>
    `;
    fetchBtn.parentElement.after(shareContainer);
    shareContainer.classList.add('hidden');

    const copyBtn = document.getElementById('copyBtn');
    const shareFormatSelect = document.getElementById('shareFormatSelect');

    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - offset).toISOString().split('T')[0];
    dateInput.value = localISOTime;

    templateSelect.addEventListener('change', () => {
        const val = templateSelect.value;
        if (val === "Anak") doctorIdInput.value = "25, 28, 32";
        else if (val === "Interna") doctorIdInput.value = "12, 13, 14";
        else if (val === "Bedah") doctorIdInput.value = "30, 31";
    });

    doctorIdInput.addEventListener('input', () => {
        if (templateSelect.value !== "Custom") templateSelect.value = "Custom";
    });

    async function detectCurrentServer() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                const url = new URL(tab.url);
                const host = `${url.protocol}//${url.hostname}`;
                const validServers = ["http://192.168.13.6", "http://192.168.13.7", "http://192.168.13.8"];
                if (validServers.includes(host)) {
                    serverSelect.value = host;
                    serverDisplay.textContent = `Terdeteksi Otomatis: ${url.hostname}`;
                    serverDisplay.classList.add('server-detected');
                } else {
                    serverDisplay.textContent = "Pilihan Server Manual";
                }
            }
        } catch (e) {
            serverDisplay.textContent = "Deteksi Server Tidak Tersedia";
        }
    }
    await detectCurrentServer();

    doctorIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchBtn.click();
    });

    function toTitleCase(str) {
        if (!str) return "??";
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    function formatDateIndo(dateStr) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const d = new Date(dateStr);
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    function calculateAge(dobString) {
        if (!dobString || dobString === "??") return "??";
        try {
            const birthDate = new Date(dobString.split(' ')[0]);
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            let days = today.getDate() - birthDate.getDate();
            if (days < 0) {
                months--;
                const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                days += prevMonth.getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }
            return `${years} thn, ${months} bln, ${days} hr`;
        } catch (e) { return "??"; }
    }

    fetchBtn.addEventListener('click', async () => {
        const baseUrl = serverSelect.value + "/webservice/pendaftaran/kunjungan";
        const doctorIds = doctorIdInput.value.split(',').map(id => id.trim()).filter(id => id !== "");
        currentFetchIds = doctorIds; // Save for format 3 logic
        const limit = limitInput.value || 100;
        const selectedDate = dateInput.value;

        if (doctorIds.length === 0) {
            showError("Masukkan minimal satu ID Dokter.");
            return;
        }

        clearUI();
        shareContainer.classList.add('hidden');
        showStatus(`Mengambil data untuk ${doctorIds.length} dokter...`, false);

        try {
            const referensi = JSON.stringify({
                "Ruangan": { "COLUMNS": ["DESKRIPSI", "JENIS_KUNJUNGAN"], "REFERENSI": { "Referensi": true } },
                "Pendaftaran": true,
                "Referensi": true,
                "RuangKamarTidur": true,
                "DPJP": true,
                "Mutasi": true
            });

            // Store data map by ID to preserve "Anak" mapping
            let allPatients = [];
            const dataById = {};

            for (const id of doctorIds) {
                const url = new URL(baseUrl);
                url.searchParams.append('_dc', Date.now());
                url.searchParams.append('STATUS', '1');
                url.searchParams.append('REFERENSI', referensi);
                url.searchParams.append('DPJP', id);
                url.searchParams.append('TANGGAL', selectedDate);
                url.searchParams.append('page', '1');
                url.searchParams.append('start', '0');
                url.searchParams.append('limit', limit);

                const response = await fetch(url.toString(), { method: 'GET', mode: 'cors' });
                if (!response.ok) throw new Error(`Server error ${response.status} pada ID ${id}`);
                
                const result = await response.json();
                const items = result.data || result.items || result;
                if (Array.isArray(items)) {
                    allPatients = allPatients.concat(items);
                    dataById[id] = items;
                }
            }

            if (allPatients.length === 0) {
                showError("Data pasien tidak ditemukan.");
                return;
            }

            currentTotal = allPatients.length;

            // Group: Doctor -> Room -> Patients
            // We use the ID-based grouping internally to help Format 3
            currentDoctorGroupedData = {};
            
            for (const [id, items] of Object.entries(dataById)) {
                items.forEach(item => {
                    const ref = item.REFERENSI;
                    const pendaftaran = ref?.PENDAFTARAN;
                    const pasien = pendaftaran?.REFERENSI?.PASIEN;
                    const diagObj = pendaftaran?.DIAGNOSAMASUK?.REFERENSI?.DIAGNOSA;
                    const diagnosisStr = diagObj ? `${diagObj.CODE} - ${diagObj.STR}` : "??";

                    let rawRoomName = cleanField(ref?.RUANGAN?.DESKRIPSI);
                    let cleanRoomName = rawRoomName.replace(/^Bangsal\s+/i, '');

                    const patient = {
                        fullName: toTitleCase(cleanField(pasien?.NAMA)),
                        age: calculateAge(cleanField(pasien?.TANGGAL_LAHIR)),
                        diagnosis: diagnosisStr,
                        weight: cleanField(item.BERAT_BADAN),
                        bedName: cleanField(ref?.RUANG_KAMAR_TIDUR?.TEMPAT_TIDUR),
                        roomName: cleanRoomName,
                        doctorName: cleanField(ref?.DPJP?.NAMA),
                        doctorId: id
                    };

                    const key = patient.doctorName;
                    if (!currentDoctorGroupedData[key]) currentDoctorGroupedData[key] = {};
                    if (!currentDoctorGroupedData[key][patient.roomName]) currentDoctorGroupedData[key][patient.roomName] = [];
                    currentDoctorGroupedData[key][patient.roomName].push(patient);
                });
            }

            renderList(currentDoctorGroupedData, currentTotal);
            shareContainer.classList.remove('hidden');
            hideStatus();

        } catch (error) {
            showStatus(`${error.message}. Pastikan sudah login.`, true);
        }
    });

    copyBtn.addEventListener('click', () => {
        if (!currentDoctorGroupedData) return;
        const format = shareFormatSelect.value;
        let text = "";

        if (format === 'anak_summary') {
            const idMapping = { "25": "NISA", "32": "SARI", "28": "AIN" };
            const requiredRooms = ["Anggrek III", "Amarilis", "Aster 1", "Aster 2", "Bougenvile", "Dahlia", "Asoka", "Cempaka", "Melati", "IGD"];
            
            // Define strict order for Format 3
            const strictOrder = ["25", "32", "28"];
            // Only process IDs that were actually fetched, but in the strict order
            const idsToProcess = strictOrder.filter(id => currentFetchIds.includes(id));
            // Add any other IDs that were fetched but not in the strict list at the end
            currentFetchIds.forEach(id => {
                if (!idsToProcess.includes(id)) idsToProcess.push(id);
            });
            
            text += `Assalamualaikum Warahmatullahi Wabarakatuh, selamat pagi Dokter. Berikut mapping pasien hari ini,\n${formatDateIndo(dateInput.value)}.\n`;
            
            idsToProcess.forEach((id, idx) => {
                const shortName = idMapping[id] || `Dokter ID ${id}`;
                // Find data for this ID in the grouped object
                const docKey = Object.keys(currentDoctorGroupedData).find(name => {
                    const rooms = currentDoctorGroupedData[name];
                    return Object.values(rooms).flat().some(p => p.doctorId === id);
                });

                const roomsForThisDoc = docKey ? currentDoctorGroupedData[docKey] : {};
                const totalForThisDoc = Object.values(roomsForThisDoc).flat().length;

                text += `\ndr. ${shortName} = ${totalForThisDoc}\n`;

                requiredRooms.forEach(roomName => {
                    // Match room name logic (including Anggrek 3 -> Anggrek III)
                    let count = 0;
                    Object.keys(roomsForThisDoc).forEach(rawName => {
                        const normalizedName = rawName.replace(/Anggrek 3/i, "Anggrek III");
                        if (normalizedName === roomName) count += roomsForThisDoc[rawName].length;
                    });

                    if (count > 0) text += `*${roomName} : ${count}*\n`;
                    else text += `${roomName} : 0\n`;
                });

                if (idx < idsToProcess.length - 1) text += `\n-------------------------------\n`;
            });

        } else {
            // Logic for Format 1 and 2
            const doctors = Object.entries(currentDoctorGroupedData).sort((a, b) => a[0].localeCompare(b[0]));
            const doctorSummary = doctors.map(([name, rooms]) => {
                const count = Object.values(rooms).flat().length;
                return `${name} = ${count}`;
            }).join('\n');

            text = `${doctorSummary}\nTotal = ${currentTotal}\n`;

            doctors.forEach(([docName, rooms]) => {
                text += `\n*DPJP: ${docName}*\n`;
                const sortedRooms = Object.entries(rooms).sort((a, b) => a[0].localeCompare(b[0]));
                sortedRooms.forEach(([roomName, patients]) => {
                    text += `*${roomName}: ${patients.length}*\n`;
                    if (format === 'full') {
                        patients.sort((a, b) => a.bedName.localeCompare(b.bedName)).forEach(p => {
                            const shareAge = p.age.replace(/,/g, '').replace(/thn/g, 'th').replace(/bln/g, 'bl');
                            text += `- ${p.bedName}/${p.fullName}/${shareAge}/${p.diagnosis}/${p.weight}\n`;
                        });
                    }
                });
            });
        }

        const textArea = document.createElement("textarea");
        textArea.value = text.trim();
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Tersalin!";
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });

    function cleanField(val) {
        return (val === null || val === undefined || String(val).trim() === "" || String(val).trim() === "null") ? "??" : val;
    }

    function renderList(groupedData, total) {
        patientList.innerHTML = "";
        const totalHeader = document.createElement('div');
        totalHeader.style.cssText = "background: #e7f1ff; color: #0056b3; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-weight: bold; text-align: center; border: 1px solid #cfe2ff;";
        totalHeader.textContent = `Total Pasien: ${total}`;
        patientList.appendChild(totalHeader);

        const sortedDoctors = Object.entries(groupedData).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [docName, rooms] of sortedDoctors) {
            const docSection = document.createElement('div');
            docSection.style.marginBottom = "24px";
            docSection.innerHTML = `<h2 style="font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 4px; color: #333;">Dokter: ${docName}</h2>`;
            
            const sortedRooms = Object.entries(rooms).sort((a, b) => a[0].localeCompare(b[0]));
            for (const [room, patients] of sortedRooms) {
                const roomSection = document.createElement('div');
                roomSection.className = 'room-group';
                roomSection.innerHTML = `<div class="room-header">${room} (${patients.length})</div>`;
                
                patients.sort((a, b) => a.bedName.localeCompare(b.bedName)).forEach(p => {
                    const card = document.createElement('div');
                    card.className = 'patient-card';
                    card.innerHTML = `
                        <div class="card-header">BED: ${p.bedName}</div>
                        <div class="card-body">${p.fullName}</div>
                        <div class="card-details"><strong>${p.age}</strong> | ${p.diagnosis}</div>
                    `;
                    roomSection.appendChild(card);
                });
                docSection.appendChild(roomSection);
            }
            patientList.appendChild(docSection);
        }
    }

    function showStatus(msg, isError) {
        statusMessage.textContent = msg;
        statusMessage.className = `status-message ${isError ? 'error' : 'info'}`;
        statusMessage.classList.remove('hidden');
    }
    function showError(msg) { showStatus(msg, true); patientList.innerHTML = `<div class="empty-state">${msg}</div>`; }
    function hideStatus() { statusMessage.classList.add('hidden'); }
    function clearUI() { patientList.innerHTML = ""; hideStatus(); }
});
