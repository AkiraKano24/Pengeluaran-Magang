let dataTransaksi = [];

// ==========================================================
// LOGIN & KOMUNIKASI DENGAN GOOGLE APPS SCRIPT
// ==========================================================
let aplikasiSudahDiinisialisasi = false;

document.addEventListener("DOMContentLoaded", () => {
    cekStatusLogin();
    aturSistemLogin();
    buatKelopakMawar();
    aturParallax();
});

function ambilToken() {
    return sessionStorage.getItem("sessionToken") || "";
}

async function kirimKeApi(payload) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

function cekStatusLogin() {
    if (ambilToken()) {
        tampilkanAplikasiUtama();
    } else {
        tampilkanHalamanLogin();
    }
}

function aturSistemLogin() {
    const loginForm = document.getElementById("loginForm");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginError = document.getElementById("loginError");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const user = document.getElementById("usernameInput").value.trim();
            const pass = document.getElementById("passwordInput").value;
            const tombol = loginForm.querySelector('button[type="submit"]');

            tombol.disabled = true;
            tombol.innerText = "Memeriksa...";

            try {
                const hasil = await kirimKeApi({
                    action: "login",
                    username: user,
                    password: pass
                });

                if (!hasil.success || !hasil.token) {
                    throw new Error(hasil.message || "Username atau password salah");
                }

                sessionStorage.setItem("sessionToken", hasil.token);
                if (loginError) loginError.style.display = "none";
                loginForm.reset();
                tampilkanAplikasiUtama();
            } catch (error) {
                console.error("Login gagal:", error);
                if (loginError) {
                    loginError.innerText = error.message || "Login gagal. Silakan coba lagi.";
                    loginError.style.display = "block";
                }
            } finally {
                tombol.disabled = false;
                tombol.innerText = "Masuk Arsip";
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            const token = ambilToken();
            if (token) kirimKeApi({ action: "logout", token }).catch(() => {});
            sessionStorage.removeItem("sessionToken");
            if (loginError) loginError.style.display = "none";
            tampilkanHalamanLogin();
        });
    }
}

function tampilkanHalamanLogin() {
    const loginPage = document.getElementById("loginPage");
    const appContainer = document.getElementById("appContainer");

    if (loginPage) loginPage.style.display = "flex";
    if (appContainer) appContainer.classList.add("hidden");
    document.body.classList.add("mode-login");
    document.body.classList.remove("mode-app");
}

function tampilkanAplikasiUtama() {
    const loginPage = document.getElementById("loginPage");
    const appContainer = document.getElementById("appContainer");

    if (loginPage) loginPage.style.display = "none";
    if (appContainer) appContainer.classList.remove("hidden");
    document.body.classList.add("mode-app");
    document.body.classList.remove("mode-login");

    if (!aplikasiSudahDiinisialisasi) {
        aturNavigasi();
        aturModalForm();
        aturFilter();
        aturRekapMingguan();
        aplikasiSudahDiinisialisasi = true;
    }

    muatDataSpreadsheet();
}

function perbaruiSemuaTampilan() {
    perbaruiDashboard();
    perbaruiTabelSemua();
    inisialisasiPilihanMinggu();
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function ambilNominal(item) {
    const raw = String(item.Nominal || item['Nominal'] || '0').trim();
    let bersih = raw.replace(/Rp/gi, '').trim();
    if (bersih.includes(',')) bersih = bersih.split(',')[0];
    bersih = bersih.replace(/\./g, '');
    return parseInt(bersih, 10) || 0;
}

function formatRupiah(angka) {
    return `Rp${angka.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
}

function formatTanggalDariSheet(nilai) {
    if (!nilai || nilai === '-') return '-';
    if (!isNaN(nilai) && Number(nilai) > 30000) {
        const tanggalEpoch = new Date(1899, 11, 30);
        tanggalEpoch.setDate(tanggalEpoch.getDate() + Number(nilai));
        return tanggalEpoch.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/ /g, '-');
    }
    return String(nilai);
}

async function muatDataSpreadsheet() {
    try {
        const hasil = await kirimKeApi({
            action: "getData",
            token: ambilToken()
        });

        if (!hasil.success) {
            if (hasil.code === "UNAUTHORIZED") {
                sessionStorage.removeItem("sessionToken");
                tampilkanHalamanLogin();
            }
            throw new Error(hasil.message || "Gagal memuat data");
        }

        dataTransaksi = Array.isArray(hasil.data) ? hasil.data : [];
        perbaruiSemuaTampilan();
    } catch (error) {
        console.error("Error:", error);
        tampilkanToast(error.message || "Gagal memuat data dari Spreadsheet");
    }
}

// ==========================================================
// DASHBOARD
// ==========================================================
function perbaruiDashboard() {
    let totalSemua = 0;
    const hariUnikTotal = new Set();

    dataTransaksi.forEach(item => {
        const nominal = ambilNominal(item);
        totalSemua += nominal;
        const tgl = item['Tanggal'] || item['tanggal'];
        if (tgl && tgl !== '-') hariUnikTotal.add(tgl);
    });

    const totalHari = hariUnikTotal.size > 0 ? hariUnikTotal.size : 1;
    const rataRataKeseluruhan = Math.round(totalSemua / totalHari);

    document.getElementById('totalAll').innerText = formatRupiah(totalSemua);
    document.getElementById('avgAll').innerText = formatRupiah(rataRataKeseluruhan) + ' /hari';

    perbaruiTransaksiTerbaru();
    perbaruiGrafikMingguan();
    perbaruiPengeluaranTerbesar();
}

function perbaruiTransaksiTerbaru() {
    const recentBody = document.getElementById('recentBody');
    const transaksiTerbaru = [...dataTransaksi].reverse().slice(0, 5);

    if (transaksiTerbaru.length === 0) {
        recentBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada data</td></tr>';
        return;
    }

    recentBody.innerHTML = transaksiTerbaru.map(item => {
        const nominal = ambilNominal(item);
        const nominalFmt = formatRupiah(nominal);
        const tglFmt = formatTanggalDariSheet(item['Tanggal']);
        return `
            <tr>
                <td>${escapeHtml(tglFmt)}</td>
                <td>${escapeHtml(item['Keterangan'] || '-')}</td>
                <td>${escapeHtml(item['Jumlah'] || '-')}</td>
                <td style="font-weight:600;">${nominalFmt}</td>
            </tr>
        `;
    }).join('');
}

function perbaruiGrafikMingguan() {
    const chartMinggu = document.getElementById('chartMinggu');
    const chartRataRata = document.getElementById('chartRataRata');

    const mapMinggu = {};
    dataTransaksi.forEach(item => {
        const m = item['Minggu'] || 'Lainnya';
        if (!mapMinggu[m]) {
            mapMinggu[m] = { total: 0, hariSet: new Set() };
        }
        mapMinggu[m].total += ambilNominal(item);
        const tgl = item['Tanggal'];
        if (tgl) mapMinggu[m].hariSet.add(tgl);
    });

    const keys = Object.keys(mapMinggu).sort((a, b) => parseInt(a) - parseInt(b));
    if (keys.length === 0) {
        if (chartMinggu) chartMinggu.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Belum ada data</p>';
        if (chartRataRata) chartRataRata.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Belum ada data</p>';
        return;
    }

    const dataTotalMingguan = keys.map(k => mapMinggu[k].total);
    const dataRataMingguan = keys.map(k => {
        const jmlHari = mapMinggu[k].hariSet.size > 0 ? mapMinggu[k].hariSet.size : 1;
        return Math.round(mapMinggu[k].total / jmlHari);
    });

    const maxTotal = Math.max(...dataTotalMingguan, 1);
    const maxRata = Math.max(...dataRataMingguan, 1);

    if (chartMinggu) {
        chartMinggu.innerHTML = `<div class="chart-bars">${keys.map((k, idx) => {
            const tinggi = Math.max(Math.round((dataTotalMingguan[idx] / maxTotal) * 100), dataTotalMingguan[idx] > 0 ? 6 : 0);
            return `
                <div class="chart-bar-wrap" title="Minggu ${k}: ${formatRupiah(dataTotalMingguan[idx])}">
                    <div class="chart-bar" style="height:${tinggi}%"></div>
                    <span class="chart-bar-label">M${k}</span>
                </div>
            `;
        }).join('')}</div>`;
    }

    if (chartRataRata) {
        chartRataRata.innerHTML = `<div class="chart-bars">${keys.map((k, idx) => {
            const tinggi = Math.max(Math.round((dataRataMingguan[idx] / maxRata) * 100), dataRataMingguan[idx] > 0 ? 6 : 0);
            return `
                <div class="chart-bar-wrap" title="Minggu ${k}: ${formatRupiah(dataRataMingguan[idx])} /hari">
                    <div class="chart-bar chart-bar-alt" style="height:${tinggi}%"></div>
                    <span class="chart-bar-label">M${k}</span>
                </div>
            `;
        }).join('')}</div>`;
    }
}

function perbaruiPengeluaranTerbesar() {
    const container = document.getElementById('topExpenseDetail');
    if (!container) return;
    if (dataTransaksi.length === 0) {
        container.innerHTML = 'Belum ada data';
        return;
    }

    let maxItem = dataTransaksi[0];
    let maxNominal = ambilNominal(maxItem);

    dataTransaksi.forEach(item => {
        const nom = ambilNominal(item);
        if (nom > maxNominal) {
            maxNominal = nom;
            maxItem = item;
        }
    });

    const tglFmt = formatTanggalDariSheet(maxItem['Tanggal']);
    container.innerHTML = `
        <div class="spotlight">
            <p class="spotlight-jp">最高額</p>
            <p class="spotlight-title">${escapeHtml(maxItem['Keterangan'])}</p>
            <p class="spotlight-amount">${formatRupiah(maxNominal)}</p>
            <dl class="spotlight-meta">
                <dt>Minggu</dt><dd>Minggu ke-${escapeHtml(maxItem['Minggu'] || '-')}</dd>
                <dt>Hari / Tanggal</dt><dd>${escapeHtml(maxItem['Hari'] || '-')}, ${escapeHtml(tglFmt)}</dd>
            </dl>
        </div>
    `;
}

// ==========================================================
// REKAPITULASI & FILTER
// ==========================================================
function aturRekapMingguan() {
    const selectMinggu = document.getElementById('selectMinggu');
    if (!selectMinggu) return;

    selectMinggu.addEventListener('change', (e) => {
        hitungDanTampilkanRekap(e.target.value);
    });
}

function inisialisasiPilihanMinggu() {
    const selectMinggu = document.getElementById('selectMinggu');
    if (!selectMinggu) return;

    const daftarMinggu = [...new Set(dataTransaksi.map(item => String(item['Minggu'] || '').trim()).filter(m => m !== "" && m !== "-"))];
    daftarMinggu.sort((a, b) => parseInt(a) - parseInt(b));

    selectMinggu.innerHTML = '<option value="">Pilih Minggu...</option>' + 
        daftarMinggu.map(m => `<option value="${m}">Minggu ke-${m}</option>`).join('');

    if (daftarMinggu.length > 0) {
        selectMinggu.value = daftarMinggu[daftarMinggu.length - 1];
        hitungDanTampilkanRekap(selectMinggu.value);
    } else {
        hitungDanTampilkanRekap("");
    }
}

function hitungDanTampilkanRekap(mingguKe) {
    const elMingguVal = document.getElementById('rekapMingguVal');
    const elTotal = document.getElementById('rekapTotal');
    const elRataRata = document.getElementById('rekapRataRata');

    if (!elTotal || !elRataRata) return;

    if (!mingguKe) {
        if (elMingguVal) elMingguVal.innerText = '-';
        elTotal.innerText = 'Rp0';
        elRataRata.innerText = 'Rp0 /hari';
        return;
    }

    if (elMingguVal) elMingguVal.innerText = `Minggu ke-${mingguKe}`;

    const transaksiMingguIni = dataTransaksi.filter(item => String(item['Minggu']).trim() === String(mingguKe));

    let totalNominal = 0;
    const hariUnikMingguIni = new Set();

    transaksiMingguIni.forEach(item => {
        totalNominal += ambilNominal(item);
        const tgl = item['Tanggal'];
        if (tgl && tgl !== '-') hariUnikMingguIni.add(tgl);
    });

    const jumlahHari = hariUnikMingguIni.size > 0 ? hariUnikMingguIni.size : 1;
    const rataRataPerHari = Math.round(totalNominal / jumlahHari);

    elTotal.innerText = formatRupiah(totalNominal);
    elRataRata.innerText = formatRupiah(rataRataPerHari) + ' /hari';
}

function perbaruiTabelSemua(data) {
    const sumberData = data || dataTransaksi;
    const allBody = document.getElementById('allBody');
    if (!allBody) return;

    if (sumberData.length === 0) {
        allBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada data</td></tr>';
        return;
    }

    const dataTerbalik = [...sumberData].reverse();
    allBody.innerHTML = dataTerbalik.map(item => {
        const nominal = ambilNominal(item);
        const nominalFmt = formatRupiah(nominal);
        const mingguVal = item['Minggu'] || '-';
        const tanggalFmt = formatTanggalDariSheet(item['Tanggal']);

        return `
            <tr>
                <td>${escapeHtml(mingguVal)}</td>
                <td>${escapeHtml(tanggalFmt)}</td>
                <td>${escapeHtml(item['Hari'] || '-')}</td>
                <td>${escapeHtml(item['Keterangan'] || '-')}</td>
                <td>${escapeHtml(item['Jumlah'] || '-')}</td>
                <td style="font-weight:600;">${nominalFmt}</td>
            </tr>
        `;
    }).join('');
}

function aturFilter() {
    const search = document.getElementById('search');
    const reset = document.getElementById('reset');
    if (!search || !reset) return;

    search.addEventListener('input', () => {
        const kataKunci = search.value.trim().toLowerCase();
        const hasil = dataTransaksi.filter(item => {
            return (item['Keterangan'] || '').toLowerCase().includes(kataKunci);
        });
        perbaruiTabelSemua(hasil);
    });

    reset.addEventListener('click', () => {
        search.value = '';
        perbaruiTabelSemua(dataTransaksi);
    });
}

// ==========================================================
// NAVIGASI, MODAL & EFEK KELOPAK MAWAR JATUH
// ==========================================================
function aturNavigasi() {
    const navButtons = document.querySelectorAll('.nav');
    if (!navButtons.length) return;

    function tampilkanView(viewId, buatHistory = false) {
        const targetButton = document.querySelector(`.nav[data-view="${viewId}"]`);
        const targetView = document.getElementById(viewId);

        if (!targetButton || !targetView) return;

        navButtons.forEach(btn => btn.classList.remove('active'));
        targetButton.classList.add('active');

        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });

        targetView.classList.remove('hidden');

        const pageTitle = document.getElementById('pageTitle');
        const labelEl = targetButton.querySelector('.nav-id');
        if (pageTitle) pageTitle.innerText = (labelEl ? labelEl.innerText : targetButton.innerText).trim();

        if (buatHistory) {
            history.pushState({ view: viewId }, '', `#${viewId}`);
        }

        efekLedakanKelopak();
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewId = btn.getAttribute('data-view');
            const currentView = history.state?.view || 'dashboard';

            if (currentView === viewId && !history.state?.modal) return;

            tampilkanView(viewId, true);
        });
    });

    // Tombol Back/Forward browser dan tombol navigasi HP.
    window.addEventListener('popstate', (event) => {
        // Jika modal sedang terbuka, tutup modal lebih dulu.
        const modal = document.getElementById('modal');
        if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }

        const viewId = event.state?.view || 'dashboard';
        tampilkanView(viewId, false);
    });

    const hashView = window.location.hash.replace('#', '');
    const initialView = ['dashboard', 'transactions'].includes(hashView)
        ? hashView
        : 'dashboard';

    history.replaceState({ view: initialView }, '', `#${initialView}`);
    tampilkanView(initialView, false);
}
function aturModalForm() {
    const modal = document.getElementById('modal');
    const btnTambah = document.getElementById('addBtn');
    const btnTutup = document.getElementById('closeModal');
    const form = document.getElementById('form');

    if (!modal || !btnTambah || !btnTutup || !form) return;

    btnTambah.addEventListener('click', () => {
        document.getElementById('date').valueAsDate = new Date();
        modal.classList.remove('hidden');
    });

    btnTutup.addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const tanggalInput = document.getElementById('date').value;
        const dateObj = new Date(tanggalInput);

        const tglFmt = String(dateObj.getDate()).padStart(2, '0') + '-' + dateObj.toLocaleString('en-GB', { month: 'short' });
        const namaHari = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
        const mingguVal = document.getElementById('mingguKe').value;
        const btnSubmit = document.querySelector('#form button[type="submit"]');

        const dataBaru = {
            "Minggu": mingguVal,
            "Tanggal": tglFmt,
            "Hari": namaHari,
            "Keterangan": document.getElementById('description').value,
            "Jumlah": document.getElementById('quantity').value || '1',
            "Nominal": document.getElementById('amount').value
        };

        try {
            btnSubmit.innerText = "Menyimpan...";
            btnSubmit.disabled = true;

            const hasil = await kirimKeApi({
                action: "addData",
                token: ambilToken(),
                data: dataBaru
            });

            if (!hasil.success) {
                if (hasil.code === "UNAUTHORIZED") {
                    sessionStorage.removeItem("sessionToken");
                    tampilkanHalamanLogin();
                }
                throw new Error(hasil.message || "Gagal menyimpan data");
            }

            dataTransaksi.push(hasil.data);
            perbaruiSemuaTampilan();
            form.reset();
            modal.classList.add('hidden');
            tampilkanToast("Data berhasil dicatat! ✅");
        } catch (error) {
            console.error('Error:', error);
            tampilkanToast("Gagal menyimpan data ❌");
        } finally {
            btnSubmit.innerText = "Simpan Pengeluaran";
            btnSubmit.disabled = false;
        }
    });
}

// ==========================================================
// KELOPAK MAWAR: sprite lukisan dengan 3 lapisan kedalaman
// (jauh = kecil & blur, dekat = besar & tajam) supaya terasa 3D
// ==========================================================
const LAPISAN_KELOPAK = [
    { kelas: 'petal-far',  ukuran: [10, 16], durasi: [14, 20] },
    { kelas: 'petal-mid',  ukuran: [16, 24], durasi: [10, 15] },
    { kelas: 'petal-near', ukuran: [22, 30], durasi: [7, 11] }
];

function acak(min, max) { return Math.random() * (max - min) + min; }

function buatSatuKelopak(container, lapisan, opsi = {}) {
    const petal = document.createElement('div');
    petal.classList.add('blue-petal', lapisan.kelas);

    const lebar = opsi.lebar ?? acak(lapisan.ukuran[0], lapisan.ukuran[1]);
    petal.style.width = `${lebar}px`;
    petal.style.height = `${lebar * 1.45}px`;
    petal.style.left = `${opsi.left ?? acak(-2, 100)}vw`;
    if (opsi.top !== undefined) petal.style.top = opsi.top;

    // arah melayang & putaran acak (tiap kelopak beda supaya terlihat hidup)
    petal.style.setProperty('--drift', `${acak(-14, 14)}vw`);
    petal.style.setProperty('--spin', `${acak(-540, 540)}deg`);

    const durasi = opsi.durasi ?? acak(lapisan.durasi[0], lapisan.durasi[1]);
    petal.style.animationDuration = `${durasi}s`;

    container.appendChild(petal);
    setTimeout(() => petal.remove(), durasi * 1000 + 200);
}

function buatKelopakMawar() {
    const container = document.getElementById('rosePetalsContainer');
    if (!container) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setInterval(() => {
        // lapisan jauh muncul paling sering, lapisan dekat paling jarang
        const r = Math.random();
        const lapisan = r < 0.5 ? LAPISAN_KELOPAK[0] : (r < 0.85 ? LAPISAN_KELOPAK[1] : LAPISAN_KELOPAK[2]);
        buatSatuKelopak(container, lapisan);
    }, 1100);
}

function efekLedakanKelopak() {
    const container = document.getElementById('rosePetalsContainer');
    if (!container) return;

    for (let i = 0; i < 14; i++) {
        const lapisan = LAPISAN_KELOPAK[i % 2]; // hanya lapisan jauh & tengah supaya data tetap terbaca
        buatSatuKelopak(container, lapisan, {
            left: acak(10, 90),
            top: '0px',
            durasi: acak(1.5, 3.5)
        });
    }
}

// ==========================================================
// PARALLAX: ornamen bergeser halus mengikuti kursor / kemiringan HP
// Elemen dengan data-depth bergerak; angka lebih besar = lebih "dekat"
// ==========================================================
function aturParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elemen = Array.from(document.querySelectorAll('[data-depth]'));
    if (!elemen.length) return;

    let targetX = 0, targetY = 0, rafId = null;

    const terapkan = () => {
        rafId = null;
        elemen.forEach(el => {
            const depth = parseFloat(el.dataset.depth) || 0;
            el.style.translate = `${targetX * depth * 600}px ${targetY * depth * 600}px`;
        });
    };

    const jadwalkan = () => { if (!rafId) rafId = requestAnimationFrame(terapkan); };

    window.addEventListener('pointermove', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        targetX = e.clientX / window.innerWidth - 0.5;
        targetY = e.clientY / window.innerHeight - 0.5;
        jadwalkan();
    }, { passive: true });

    // HP: gunakan sensor kemiringan bila tersedia (Android tanpa izin tambahan)
    window.addEventListener('deviceorientation', (e) => {
        if (e.gamma === null || e.beta === null) return;
        targetX = Math.max(-0.5, Math.min(0.5, e.gamma / 60));
        targetY = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 60));
        jadwalkan();
    }, { passive: true });
}

function tampilkanToast(pesan) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = pesan;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3000);
}
