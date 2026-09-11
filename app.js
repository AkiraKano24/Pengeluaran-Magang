let dataTransaksi = [];

// ==========================================================
// PENGATURAN LOGIN (USERNAME: Lief24, PASSWORD: adogasukidesu)
// ==========================================================
const USERNAME_BENAR = "Lief24";    
const PASSWORD_BENAR = "adogasukidesu"; 

document.addEventListener("DOMContentLoaded", () => {
    cekStatusLogin();
    aturSistemLogin();
    buatKelopakMawar();
});

function cekStatusLogin() {
    const sudahLogin = sessionStorage.getItem("isLoggedIn");
    if (sudahLogin === "true") {
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
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const user = document.getElementById("usernameInput").value.trim();
            const pass = document.getElementById("passwordInput").value.trim();

            if (user === USERNAME_BENAR && pass === PASSWORD_BENAR) {
                sessionStorage.setItem("isLoggedIn", "true");
                if (loginError) loginError.style.display = "none";
                loginForm.reset();
                tampilkanAplikasiUtama();
            } else {
                if (loginError) {
                    loginError.innerText = "Username atau Password salah! Silakan coba lagi.";
                    loginError.style.display = "block";
                }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            sessionStorage.removeItem("isLoggedIn");
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
}

function tampilkanAplikasiUtama() {
    const loginPage = document.getElementById("loginPage");
    const appContainer = document.getElementById("appContainer");

    if (loginPage) loginPage.style.display = "none";
    if (appContainer) appContainer.classList.remove("hidden");

    muatDataSpreadsheet();
    aturNavigasi();
    aturModalForm();
    aturFilter();
    aturRekapMingguan();
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
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Gagal fetch data');
        const data = await response.json();
        dataTransaksi = data;

        perbaruiDashboard();
        perbaruiTabelSemua();
        inisialisasiPilihanMinggu();
    } catch (error) {
        console.error('Error:', error);
        tampilkanToast('Gagal memuat data dari Spreadsheet');
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
            data: [{
                "Minggu": mingguVal,
                "Tanggal": tglFmt,
                "Hari": namaHari,
                "Keterangan": document.getElementById('description').value,
                "Jumlah": document.getElementById('quantity').value || '1',
                "Nominal": document.getElementById('amount').value
            }]
        };

        try {
            btnSubmit.innerText = "Menyimpan...";
            btnSubmit.disabled = true;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(dataBaru)
            });

            if (response.ok) {
                form.reset();
                modal.classList.add('hidden');
                tampilkanToast("Data berhasil dicatat! ✅");
                muatDataSpreadsheet();
            } else {
                tampilkanToast("Gagal menyimpan data ❌");
            }
        } catch (error) {
            console.error('Error:', error);
            tampilkanToast("Gagal menyimpan data ❌");
        } finally {
            btnSubmit.innerText = "Simpan Pengeluaran";
            btnSubmit.disabled = false;
        }
    });
}

function buatKelopakMawar() {
    const container = document.getElementById('rosePetalsContainer');
    if (!container) return;

    setInterval(() => {
        const petal = document.createElement('div');
        petal.classList.add('blue-petal');
        
        const size = Math.random() * 7 + 6;
        petal.style.width = `${size}px`;
        petal.style.height = `${size * 1.9}px`;
        petal.style.left = `${Math.random() * 100}vw`;

        const durasi = Math.random() * 7 + 6;
        petal.style.animationDuration = `${durasi}s`;
        
        container.appendChild(petal);

        setTimeout(() => {
            petal.remove();
        }, durasi * 1000);
    }, 950);
}

function efekLedakanKelopak() {
    const container = document.getElementById('rosePetalsContainer');
    if (!container) return;

    for (let i = 0; i < 18; i++) {
        const petal = document.createElement('div');
        petal.classList.add('blue-petal');
        petal.style.width = '12px';
        petal.style.height = '18px';
        petal.style.left = `${Math.random() * 80 + 10}vw`;
        petal.style.top = '0px';
        petal.style.animationDuration = `${Math.random() * 2 + 1.5}s`;
        container.appendChild(petal);

        setTimeout(() => petal.remove(), 3500);
    }
}

function tampilkanToast(pesan) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = pesan;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3000);
}
