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
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload),
        redirect: "follow"
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

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
    const loginForm =
        document.getElementById("loginForm");

    const logoutBtn =
        document.getElementById("logoutBtn");

    const loginError =
        document.getElementById("loginError");

    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                const usernameInput =
                    document.getElementById(
                        "usernameInput"
                    );

                const passwordInput =
                    document.getElementById(
                        "passwordInput"
                    );

                const tombol =
                    loginForm.querySelector(
                        'button[type="submit"]'
                    );

                const user =
                    usernameInput
                        ? usernameInput.value.trim()
                        : "";

                const pass =
                    passwordInput
                        ? passwordInput.value
                        : "";

                if (tombol) {
                    tombol.disabled = true;
                    tombol.innerText =
                        "Memeriksa...";
                }

                try {
                    const hasil =
                        await kirimKeApi({
                            action: "login",
                            username: user,
                            password: pass
                        });

                    if (
                        !hasil.success ||
                        !hasil.token
                    ) {
                        throw new Error(
                            hasil.message ||
                            "Username atau password salah"
                        );
                    }

                    sessionStorage.setItem(
                        "sessionToken",
                        hasil.token
                    );

                    if (loginError) {
                        loginError.style.display =
                            "none";
                    }

                    loginForm.reset();
                    tampilkanAplikasiUtama();
                } catch (error) {
                    console.error(
                        "Login gagal:",
                        error
                    );

                    if (loginError) {
                        loginError.innerText =
                            error.message ||
                            "Login gagal. Silakan coba lagi.";

                        loginError.style.display =
                            "block";
                    }
                } finally {
                    if (tombol) {
                        tombol.disabled = false;
                        tombol.innerText =
                            "Masuk Arsip";
                    }
                }
            }
        );
    }

    if (logoutBtn) {
        logoutBtn.addEventListener(
            "click",
            () => {
                const token = ambilToken();

                if (token) {
                    kirimKeApi({
                        action: "logout",
                        token
                    }).catch(() => {});
                }

                sessionStorage.removeItem(
                    "sessionToken"
                );

                dataTransaksi = [];

                if (loginError) {
                    loginError.style.display =
                        "none";
                }

                tampilkanHalamanLogin();
            }
        );
    }
}

function tampilkanHalamanLogin() {
    const loginPage =
        document.getElementById("loginPage");

    const appContainer =
        document.getElementById("appContainer");

    if (loginPage) {
        loginPage.style.display = "flex";
    }

    if (appContainer) {
        appContainer.classList.add("hidden");
    }

    document.body.classList.add(
        "mode-login"
    );

    document.body.classList.remove(
        "mode-app"
    );
}

function tampilkanAplikasiUtama() {
    const loginPage =
        document.getElementById("loginPage");

    const appContainer =
        document.getElementById("appContainer");

    if (loginPage) {
        loginPage.style.display = "none";
    }

    if (appContainer) {
        appContainer.classList.remove(
            "hidden"
        );
    }

    document.body.classList.add(
        "mode-app"
    );

    document.body.classList.remove(
        "mode-login"
    );

    if (!aplikasiSudahDiinisialisasi) {
        aturNavigasi();
        aturModalForm();
        aturFilter();
        aturRekapMingguan();

        aplikasiSudahDiinisialisasi = true;
    }

    muatDataSpreadsheet();
}

// ==========================================================
// FUNGSI BANTU
// ==========================================================

function perbaruiSemuaTampilan() {
    perbaruiDashboard();
    perbaruiTabelSemua();
    inisialisasiPilihanMinggu();
}

function escapeHtml(str) {
    if (
        str === null ||
        str === undefined
    ) {
        return "";
    }

    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Menampilkan tanda strip hanya jika nilai benar-benar kosong.
 * Angka nol tetap ditampilkan sebagai 0.
 */
function nilaiAtauStrip(nilai) {
    if (
        nilai === null ||
        nilai === undefined ||
        String(nilai).trim() === ""
    ) {
        return "-";
    }

    return nilai;
}

/**
 * Mengubah nominal dari Spreadsheet menjadi angka.
 *
 * Mendukung:
 * Rp20.000
 * Rp20,000
 * 20000
 */
function ambilNominal(item) {
    const raw = String(
        item && item.Nominal !== undefined
            ? item.Nominal
            : "0"
    ).trim();

    const bersih =
        raw.replace(/[^0-9]/g, "");

    return parseInt(bersih, 10) || 0;
}

function formatRupiah(angka) {
    const nilai = Number(angka) || 0;

    return `Rp${nilai.toLocaleString(
        "id-ID",
        {
            maximumFractionDigits: 0
        }
    )}`;
}

function formatTanggalDariSheet(nilai) {
    if (
        nilai === null ||
        nilai === undefined ||
        nilai === "" ||
        nilai === "-"
    ) {
        return "-";
    }

    /*
     * Mendukung tanggal serial Google Sheets.
     */
    if (
        !isNaN(nilai) &&
        Number(nilai) > 30000
    ) {
        const tanggalEpoch =
            new Date(1899, 11, 30);

        tanggalEpoch.setDate(
            tanggalEpoch.getDate() +
            Number(nilai)
        );

        return tanggalEpoch
            .toLocaleDateString(
                "en-GB",
                {
                    day: "2-digit",
                    month: "short"
                }
            )
            .replace(/ /g, "-");
    }

    return String(nilai);
}

function merupakanPlaceholder(item) {
    const keterangan = String(
        item?.Keterangan || ""
    )
        .trim()
        .toLowerCase();

    return (
        keterangan ===
        "tidak ada pengeluaran"
    );
}

/**
 * Menghasilkan tanggal hari ini dalam format yyyy-MM-dd
 * berdasarkan waktu lokal pengguna.
 */
function tanggalHariIniLokal() {
    const sekarang = new Date();

    const tahun =
        sekarang.getFullYear();

    const bulan =
        String(sekarang.getMonth() + 1)
            .padStart(2, "0");

    const tanggal =
        String(sekarang.getDate())
            .padStart(2, "0");

    return `${tahun}-${bulan}-${tanggal}`;
}

// ==========================================================
// MEMUAT DATA
// ==========================================================

async function muatDataSpreadsheet(
    tampilkanPesanError = true
) {
    try {
        const hasil =
            await kirimKeApi({
                action: "getData",
                token: ambilToken()
            });

        if (!hasil.success) {
            if (
                hasil.code ===
                "UNAUTHORIZED"
            ) {
                sessionStorage.removeItem(
                    "sessionToken"
                );

                tampilkanHalamanLogin();
            }

            throw new Error(
                hasil.message ||
                "Gagal memuat data"
            );
        }

        dataTransaksi =
            Array.isArray(hasil.data)
                ? hasil.data
                : [];

        perbaruiSemuaTampilan();

        return true;
    } catch (error) {
        console.error(
            "Gagal memuat data:",
            error
        );

        if (tampilkanPesanError) {
            tampilkanToast(
                error.message ||
                "Gagal memuat data dari Spreadsheet"
            );
        }

        return false;
    }
}

// ==========================================================
// DASHBOARD
// ==========================================================

function perbaruiDashboard() {
    let totalSemua = 0;

    const mingguUnikTotal =
        new Set();

    dataTransaksi.forEach(item => {
        totalSemua +=
            ambilNominal(item);

        const minggu = String(
            item["Minggu"] || ""
        ).trim();

        if (
            minggu !== "" &&
            minggu !== "-" &&
            Number.isInteger(
                Number(minggu)
            )
        ) {
            /*
             * Number digunakan agar Minggu 01
             * dianggap sama dengan Minggu 1.
             */
            mingguUnikTotal.add(
                Number(minggu)
            );
        }
    });

    /*
     * Setiap minggu dihitung sebagai tujuh hari.
     */
    const jumlahMinggu =
        mingguUnikTotal.size;

    const totalHari =
        jumlahMinggu * 7;

    const rataRataKeseluruhan =
        totalHari > 0
            ? Math.round(
                totalSemua / totalHari
            )
            : 0;

    const totalAll =
        document.getElementById(
            "totalAll"
        );

    const avgAll =
        document.getElementById(
            "avgAll"
        );

    if (totalAll) {
        totalAll.innerText =
            formatRupiah(totalSemua);
    }

    if (avgAll) {
        avgAll.innerText =
            formatRupiah(
                rataRataKeseluruhan
            ) + " /hari";
    }

    perbaruiTransaksiTerbaru();
    perbaruiGrafikMingguan();
    perbaruiPengeluaranTerbesar();
}

function perbaruiTransaksiTerbaru() {
    const recentBody =
        document.getElementById(
            "recentBody"
        );

    if (!recentBody) {
        return;
    }

    /*
     * Baris otomatis "Tidak ada pengeluaran"
     * tidak dianggap sebagai transaksi pengguna.
     *
     * filter() menghasilkan array baru sehingga
     * reverse() tidak membalik dataTransaksi asli.
     */
    const transaksiTerbaru =
        dataTransaksi
            .filter(item =>
                !merupakanPlaceholder(item)
            )
            .reverse()
            .slice(0, 5);

    if (
        transaksiTerbaru.length === 0
    ) {
        recentBody.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    style="text-align:center;"
                >
                    Belum ada data
                </td>
            </tr>
        `;

        return;
    }

    recentBody.innerHTML =
        transaksiTerbaru
            .map(item => {
                const nominal =
                    ambilNominal(item);

                const nominalFmt =
                    formatRupiah(nominal);

                const tanggalFmt =
                    formatTanggalDariSheet(
                        item["Tanggal"]
                    );

                return `
                    <tr>
                        <td>
                            ${escapeHtml(
                                tanggalFmt
                            )}
                        </td>
                        <td>
                            ${escapeHtml(
                                nilaiAtauStrip(
                                    item["Keterangan"]
                                )
                            )}
                        </td>
                        <td>
                            ${escapeHtml(
                                nilaiAtauStrip(
                                    item["Jumlah"]
                                )
                            )}
                        </td>
                        <td style="font-weight:600;">
                            ${nominalFmt}
                        </td>
                    </tr>
                `;
            })
            .join("");
}

function perbaruiGrafikMingguan() {
    const chartMinggu =
        document.getElementById(
            "chartMinggu"
        );

    const chartRataRata =
        document.getElementById(
            "chartRataRata"
        );

    const mapMinggu = {};

    dataTransaksi.forEach(item => {
        const minggu = String(
            item["Minggu"] || ""
        ).trim();

        if (
            !minggu ||
            minggu === "-" ||
            !Number.isInteger(
                Number(minggu)
            )
        ) {
            return;
        }

        if (!mapMinggu[minggu]) {
            mapMinggu[minggu] = {
                total: 0
            };
        }

        mapMinggu[minggu].total +=
            ambilNominal(item);
    });

    const keys =
        Object.keys(mapMinggu)
            .sort(
                (a, b) =>
                    Number(a) - Number(b)
            );

    if (keys.length === 0) {
        const pesan = `
            <p
                style="
                    color:var(--text-muted);
                    font-size:14px;
                "
            >
                Belum ada data
            </p>
        `;

        if (chartMinggu) {
            chartMinggu.innerHTML =
                pesan;
        }

        if (chartRataRata) {
            chartRataRata.innerHTML =
                pesan;
        }

        return;
    }

    const dataTotalMingguan =
        keys.map(
            minggu =>
                mapMinggu[minggu].total
        );

    /*
     * Rata-rata setiap minggu selalu
     * menggunakan pembagi tujuh.
     */
    const dataRataMingguan =
        keys.map(minggu =>
            Math.round(
                mapMinggu[minggu].total /
                7
            )
        );

    const maxTotal =
        Math.max(
            ...dataTotalMingguan,
            1
        );

    const maxRata =
        Math.max(
            ...dataRataMingguan,
            1
        );

    if (chartMinggu) {
        chartMinggu.innerHTML = `
            <div class="chart-bars">
                ${keys
                    .map(
                        (minggu, index) => {
                            const total =
                                dataTotalMingguan[
                                    index
                                ];

                            const tinggi =
                                Math.max(
                                    Math.round(
                                        (
                                            total /
                                            maxTotal
                                        ) * 100
                                    ),
                                    total > 0
                                        ? 6
                                        : 0
                                );

                            return `
                                <div
                                    class="chart-bar-wrap"
                                    title="Minggu ${escapeHtml(
                                        minggu
                                    )}: ${formatRupiah(
                                        total
                                    )}"
                                >
                                    <div
                                        class="chart-bar"
                                        style="height:${tinggi}%"
                                    ></div>

                                    <span
                                        class="chart-bar-label"
                                    >
                                        M${escapeHtml(
                                            minggu
                                        )}
                                    </span>
                                </div>
                            `;
                        }
                    )
                    .join("")}
            </div>
        `;
    }

    if (chartRataRata) {
        chartRataRata.innerHTML = `
            <div class="chart-bars">
                ${keys
                    .map(
                        (minggu, index) => {
                            const rataRata =
                                dataRataMingguan[
                                    index
                                ];

                            const tinggi =
                                Math.max(
                                    Math.round(
                                        (
                                            rataRata /
                                            maxRata
                                        ) * 100
                                    ),
                                    rataRata > 0
                                        ? 6
                                        : 0
                                );

                            return `
                                <div
                                    class="chart-bar-wrap"
                                    title="Minggu ${escapeHtml(
                                        minggu
                                    )}: ${formatRupiah(
                                        rataRata
                                    )} /hari"
                                >
                                    <div
                                        class="
                                            chart-bar
                                            chart-bar-alt
                                        "
                                        style="height:${tinggi}%"
                                    ></div>

                                    <span
                                        class="chart-bar-label"
                                    >
                                        M${escapeHtml(
                                            minggu
                                        )}
                                    </span>
                                </div>
                            `;
                        }
                    )
                    .join("")}
            </div>
        `;
    }
}

function perbaruiPengeluaranTerbesar() {
    const container =
        document.getElementById(
            "topExpenseDetail"
        );

    if (!container) {
        return;
    }

    /*
     * Baris placeholder tidak dimasukkan
     * sebagai kandidat pengeluaran terbesar.
     */
    const transaksiAsli =
        dataTransaksi.filter(
            item =>
                !merupakanPlaceholder(item)
        );

    if (transaksiAsli.length === 0) {
        container.innerHTML =
            "Belum ada data";

        return;
    }

    let maxItem =
        transaksiAsli[0];

    let maxNominal =
        ambilNominal(maxItem);

    transaksiAsli.forEach(item => {
        const nominal =
            ambilNominal(item);

        if (nominal > maxNominal) {
            maxNominal = nominal;
            maxItem = item;
        }
    });

    const tanggalFmt =
        formatTanggalDariSheet(
            maxItem["Tanggal"]
        );

    container.innerHTML = `
        <div class="spotlight">
            <p class="spotlight-jp">
                最高額
            </p>

            <p class="spotlight-title">
                ${escapeHtml(
                    nilaiAtauStrip(
                        maxItem["Keterangan"]
                    )
                )}
            </p>

            <p class="spotlight-amount">
                ${formatRupiah(maxNominal)}
            </p>

            <dl class="spotlight-meta">
                <dt>Minggu</dt>

                <dd>
                    Minggu ke-${escapeHtml(
                        nilaiAtauStrip(
                            maxItem["Minggu"]
                        )
                    )}
                </dd>

                <dt>Hari / Tanggal</dt>

                <dd>
                    ${escapeHtml(
                        nilaiAtauStrip(
                            maxItem["Hari"]
                        )
                    )},
                    ${escapeHtml(
                        tanggalFmt
                    )}
                </dd>
            </dl>
        </div>
    `;
}

// ==========================================================
// REKAPITULASI MINGGUAN
// ==========================================================

function aturRekapMingguan() {
    const selectMinggu =
        document.getElementById(
            "selectMinggu"
        );

    if (!selectMinggu) {
        return;
    }

    selectMinggu.addEventListener(
        "change",
        event => {
            hitungDanTampilkanRekap(
                event.target.value
            );
        }
    );
}

function inisialisasiPilihanMinggu() {
    const selectMinggu =
        document.getElementById(
            "selectMinggu"
        );

    if (!selectMinggu) {
        return;
    }

    const mingguSebelumnya =
        selectMinggu.value;

    const daftarMinggu = [
        ...new Set(
            dataTransaksi
                .map(item =>
                    String(
                        item["Minggu"] || ""
                    ).trim()
                )
                .filter(minggu =>
                    minggu !== "" &&
                    minggu !== "-" &&
                    Number.isInteger(
                        Number(minggu)
                    )
                )
        )
    ];

    daftarMinggu.sort(
        (a, b) =>
            Number(a) - Number(b)
    );

    selectMinggu.innerHTML =
        '<option value="">' +
        "Pilih Minggu..." +
        "</option>" +
        daftarMinggu
            .map(minggu => {
                const mingguAman =
                    escapeHtml(minggu);

                return `
                    <option value="${mingguAman}">
                        Minggu ke-${mingguAman}
                    </option>
                `;
            })
            .join("");

    /*
     * Pertahankan pilihan pengguna jika
     * minggu tersebut masih tersedia.
     */
    if (
        mingguSebelumnya &&
        daftarMinggu.includes(
            mingguSebelumnya
        )
    ) {
        selectMinggu.value =
            mingguSebelumnya;
    } else if (
        daftarMinggu.length > 0
    ) {
        selectMinggu.value =
            daftarMinggu[
                daftarMinggu.length - 1
            ];
    } else {
        selectMinggu.value = "";
    }

    hitungDanTampilkanRekap(
        selectMinggu.value
    );
}

function hitungDanTampilkanRekap(
    mingguKe
) {
    const elMingguVal =
        document.getElementById(
            "rekapMingguVal"
        );

    const elTotal =
        document.getElementById(
            "rekapTotal"
        );

    const elRataRata =
        document.getElementById(
            "rekapRataRata"
        );

    if (!elTotal || !elRataRata) {
        return;
    }

    if (!mingguKe) {
        if (elMingguVal) {
            elMingguVal.innerText = "-";
        }

        elTotal.innerText = "Rp0";
        elRataRata.innerText =
            "Rp0 /hari";

        return;
    }

    if (elMingguVal) {
        elMingguVal.innerText =
            `Minggu ke-${mingguKe}`;
    }

    const transaksiMingguIni =
        dataTransaksi.filter(item => {
            return (
                String(
                    item["Minggu"] || ""
                ).trim() ===
                String(mingguKe).trim()
            );
        });

    let totalNominal = 0;

    transaksiMingguIni.forEach(item => {
        totalNominal +=
            ambilNominal(item);
    });

    /*
     * Senin sampai Minggu selalu dihitung.
     */
    const rataRataPerHari =
        Math.round(
            totalNominal / 7
        );

    elTotal.innerText =
        formatRupiah(totalNominal);

    elRataRata.innerText =
        formatRupiah(
            rataRataPerHari
        ) + " /hari";
}

// ==========================================================
// TABEL SEMUA DATA
// ==========================================================

function perbaruiTabelSemua(data) {
    const sumberData =
        data === undefined
            ? dataTransaksi
            : data;

    const allBody =
        document.getElementById(
            "allBody"
        );

    if (!allBody) {
        return;
    }

    if (
        !Array.isArray(sumberData) ||
        sumberData.length === 0
    ) {
        allBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="text-align:center;"
                >
                    Belum ada data
                </td>
            </tr>
        `;

        return;
    }

    /*
     * Spreadsheet disimpan urut dari Minggu terkecil.
     * Salinan dibalik agar data terbaru tampil di atas.
     */
    const dataTerbalik =
        [...sumberData].reverse();

    allBody.innerHTML =
        dataTerbalik
            .map(item => {
                const nominal =
                    ambilNominal(item);

                const nominalFmt =
                    formatRupiah(nominal);

                const mingguVal =
                    nilaiAtauStrip(
                        item["Minggu"]
                    );

                const tanggalFmt =
                    formatTanggalDariSheet(
                        item["Tanggal"]
                    );

                return `
                    <tr>
                        <td>
                            ${escapeHtml(
                                mingguVal
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                tanggalFmt
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                nilaiAtauStrip(
                                    item["Hari"]
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                nilaiAtauStrip(
                                    item["Keterangan"]
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                nilaiAtauStrip(
                                    item["Jumlah"]
                                )
                            )}
                        </td>

                        <td style="font-weight:600;">
                            ${nominalFmt}
                        </td>
                    </tr>
                `;
            })
            .join("");
}

// ==========================================================
// FILTER
// ==========================================================

function aturFilter() {
    const search =
        document.getElementById(
            "search"
        );

    const reset =
        document.getElementById(
            "reset"
        );

    if (!search || !reset) {
        return;
    }

    search.addEventListener(
        "input",
        () => {
            const kataKunci =
                search.value
                    .trim()
                    .toLowerCase();

            const hasil =
                dataTransaksi.filter(
                    item => {
                        const keterangan =
                            String(
                                item[
                                    "Keterangan"
                                ] || ""
                            ).toLowerCase();

                        return keterangan.includes(
                            kataKunci
                        );
                    }
                );

            perbaruiTabelSemua(
                hasil
            );
        }
    );

    reset.addEventListener(
        "click",
        () => {
            search.value = "";

            perbaruiTabelSemua(
                dataTransaksi
            );
        }
    );
}

// ==========================================================
// NAVIGASI
// ==========================================================

function aturNavigasi() {
    const navButtons =
        document.querySelectorAll(
            ".nav"
        );

    if (!navButtons.length) {
        return;
    }

    function tampilkanView(
        viewId,
        buatHistory = false
    ) {
        const targetButton =
            document.querySelector(
                `.nav[data-view="${viewId}"]`
            );

        const targetView =
            document.getElementById(
                viewId
            );

        if (
            !targetButton ||
            !targetView
        ) {
            return;
        }

        navButtons.forEach(button => {
            button.classList.remove(
                "active"
            );
        });

        targetButton.classList.add(
            "active"
        );

        document
            .querySelectorAll(".view")
            .forEach(view => {
                view.classList.add(
                    "hidden"
                );
            });

        targetView.classList.remove(
            "hidden"
        );

        const pageTitle =
            document.getElementById(
                "pageTitle"
            );

        const label =
            targetButton.querySelector(
                ".nav-id"
            );

        if (pageTitle) {
            pageTitle.innerText =
                (
                    label
                        ? label.innerText
                        : targetButton.innerText
                ).trim();
        }

        if (buatHistory) {
            history.pushState(
                {
                    view: viewId
                },
                "",
                `#${viewId}`
            );
        }

        efekLedakanKelopak();
    }

    navButtons.forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const viewId =
                    button.getAttribute(
                        "data-view"
                    );

                const currentView =
                    history.state?.view ||
                    "dashboard";

                if (
                    currentView === viewId &&
                    !history.state?.modal
                ) {
                    return;
                }

                tampilkanView(
                    viewId,
                    true
                );
            }
        );
    });

    window.addEventListener(
        "popstate",
        event => {
            const modal =
                document.getElementById(
                    "modal"
                );

            if (
                modal &&
                !modal.classList.contains(
                    "hidden"
                )
            ) {
                modal.classList.add(
                    "hidden"
                );
            }

            const viewId =
                event.state?.view ||
                "dashboard";

            tampilkanView(
                viewId,
                false
            );
        }
    );

    const hashView =
        window.location.hash.replace(
            "#",
            ""
        );

    const initialView = [
        "dashboard",
        "transactions"
    ].includes(hashView)
        ? hashView
        : "dashboard";

    history.replaceState(
        {
            view: initialView
        },
        "",
        `#${initialView}`
    );

    tampilkanView(
        initialView,
        false
    );
}

// ==========================================================
// MODAL & FORM TAMBAH PENGELUARAN
// ==========================================================

function aturModalForm() {
    const modal =
        document.getElementById(
            "modal"
        );

    const btnTambah =
        document.getElementById(
            "addBtn"
        );

    const btnTutup =
        document.getElementById(
            "closeModal"
        );

    const form =
        document.getElementById(
            "form"
        );

    if (
        !modal ||
        !btnTambah ||
        !btnTutup ||
        !form
    ) {
        return;
    }

    btnTambah.addEventListener(
        "click",
        () => {
            const dateInput =
                document.getElementById(
                    "date"
                );

            if (dateInput) {
                dateInput.value =
                    tanggalHariIniLokal();
            }

            modal.classList.remove(
                "hidden"
            );
        }
    );

    btnTutup.addEventListener(
        "click",
        () => {
            modal.classList.add(
                "hidden"
            );
        }
    );

    form.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const dateInput =
                document.getElementById(
                    "date"
                );

            const mingguInput =
                document.getElementById(
                    "mingguKe"
                );

            const descriptionInput =
                document.getElementById(
                    "description"
                );

            const quantityInput =
                document.getElementById(
                    "quantity"
                );

            const amountInput =
                document.getElementById(
                    "amount"
                );

            const btnSubmit =
                form.querySelector(
                    'button[type="submit"]'
                );

            const tanggalInput =
                dateInput
                    ? dateInput.value
                    : "";

            if (!tanggalInput) {
                tampilkanToast(
                    "Tanggal wajib diisi"
                );

                return;
            }

            /*
             * Buat Date menggunakan zona waktu lokal.
             * Pukul 12.00 mencegah tanggal bergeser.
             */
            const bagianTanggal =
                tanggalInput
                    .split("-")
                    .map(Number);

            if (
                bagianTanggal.length !== 3 ||
                bagianTanggal.some(
                    nilai =>
                        !Number.isInteger(
                            nilai
                        )
                )
            ) {
                tampilkanToast(
                    "Format tanggal tidak valid"
                );

                return;
            }

            const [
                tahun,
                bulan,
                tanggal
            ] = bagianTanggal;

            const dateObj =
                new Date(
                    tahun,
                    bulan - 1,
                    tanggal,
                    12,
                    0,
                    0
                );

            if (
                dateObj.getFullYear() !==
                    tahun ||
                dateObj.getMonth() !==
                    bulan - 1 ||
                dateObj.getDate() !==
                    tanggal
            ) {
                tampilkanToast(
                    "Tanggal tidak valid"
                );

                return;
            }

            const tglFmt =
                String(
                    dateObj.getDate()
                ).padStart(2, "0") +
                "-" +
                dateObj.toLocaleString(
                    "en-GB",
                    {
                        month: "short"
                    }
                );

            const namaHari =
                dateObj.toLocaleDateString(
                    "id-ID",
                    {
                        weekday: "long"
                    }
                );

            const mingguVal =
                mingguInput
                    ? mingguInput.value
                    : "";

            const dataBaru = {
                Minggu: mingguVal,
                Tanggal: tglFmt,
                Hari: namaHari,
                Keterangan:
                    descriptionInput
                        ? descriptionInput.value
                        : "",
                Jumlah:
                    quantityInput &&
                    quantityInput.value
                        ? quantityInput.value
                        : "1",
                Nominal:
                    amountInput
                        ? amountInput.value
                        : ""
            };

            try {
                if (btnSubmit) {
                    btnSubmit.innerText =
                        "Menyimpan...";

                    btnSubmit.disabled =
                        true;
                }

                const hasil =
                    await kirimKeApi({
                        action: "addData",
                        token: ambilToken(),
                        data: dataBaru
                    });

                if (!hasil.success) {
                    if (
                        hasil.code ===
                        "UNAUTHORIZED"
                    ) {
                        sessionStorage
                            .removeItem(
                                "sessionToken"
                            );

                        tampilkanHalamanLogin();
                    }

                    throw new Error(
                        hasil.message ||
                        "Gagal menyimpan data"
                    );
                }

                /*
                 * Muat ulang dari Spreadsheet karena
                 * backend mungkin menghapus placeholder
                 * dan mengurutkan ulang seluruh data.
                 */
                const sinkronBerhasil =
                    await muatDataSpreadsheet(
                        false
                    );

                form.reset();

                modal.classList.add(
                    "hidden"
                );

                if (sinkronBerhasil) {
                    tampilkanToast(
                        "Data berhasil dicatat! ✅"
                    );
                } else {
                    tampilkanToast(
                        "Data tersimpan, tetapi tampilan perlu dimuat ulang."
                    );
                }
            } catch (error) {
                console.error(
                    "Gagal menyimpan:",
                    error
                );

                tampilkanToast(
                    error.message ||
                    "Gagal menyimpan data ❌"
                );
            } finally {
                if (btnSubmit) {
                    btnSubmit.innerText =
                        "Simpan Pengeluaran";

                    btnSubmit.disabled =
                        false;
                }
            }
        }
    );
}

// ==========================================================
// KELOPAK MAWAR
// ==========================================================

const LAPISAN_KELOPAK = [
    {
        kelas: "petal-far",
        ukuran: [10, 16],
        durasi: [14, 20]
    },
    {
        kelas: "petal-mid",
        ukuran: [16, 24],
        durasi: [10, 15]
    },
    {
        kelas: "petal-near",
        ukuran: [22, 30],
        durasi: [7, 11]
    }
];

function acak(min, max) {
    return (
        Math.random() *
        (max - min) +
        min
    );
}

function buatSatuKelopak(
    container,
    lapisan,
    opsi = {}
) {
    const petal =
        document.createElement("div");

    petal.classList.add(
        "blue-petal",
        lapisan.kelas
    );

    const lebar =
        opsi.lebar ??
        acak(
            lapisan.ukuran[0],
            lapisan.ukuran[1]
        );

    petal.style.width =
        `${lebar}px`;

    petal.style.height =
        `${lebar * 1.45}px`;

    petal.style.left =
        `${
            opsi.left ??
            acak(-2, 100)
        }vw`;

    if (opsi.top !== undefined) {
        petal.style.top = opsi.top;
    }

    petal.style.setProperty(
        "--drift",
        `${acak(-14, 14)}vw`
    );

    petal.style.setProperty(
        "--spin",
        `${acak(-540, 540)}deg`
    );

    const durasi =
        opsi.durasi ??
        acak(
            lapisan.durasi[0],
            lapisan.durasi[1]
        );

    petal.style.animationDuration =
        `${durasi}s`;

    container.appendChild(petal);

    setTimeout(
        () => petal.remove(),
        durasi * 1000 + 200
    );
}

function buatKelopakMawar() {
    const container =
        document.getElementById(
            "rosePetalsContainer"
        );

    if (!container) {
        return;
    }

    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    setInterval(() => {
        const angkaAcak =
            Math.random();

        const lapisan =
            angkaAcak < 0.5
                ? LAPISAN_KELOPAK[0]
                : angkaAcak < 0.85
                    ? LAPISAN_KELOPAK[1]
                    : LAPISAN_KELOPAK[2];

        buatSatuKelopak(
            container,
            lapisan
        );
    }, 1100);
}

function efekLedakanKelopak() {
    const container =
        document.getElementById(
            "rosePetalsContainer"
        );

    if (!container) {
        return;
    }

    for (
        let index = 0;
        index < 14;
        index++
    ) {
        const lapisan =
            LAPISAN_KELOPAK[
                index % 2
            ];

        buatSatuKelopak(
            container,
            lapisan,
            {
                left: acak(10, 90),
                top: "0px",
                durasi: acak(
                    1.5,
                    3.5
                )
            }
        );
    }
}

// ==========================================================
// PARALLAX
// ==========================================================

function aturParallax() {
    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    const elemen =
        Array.from(
            document.querySelectorAll(
                "[data-depth]"
            )
        );

    if (!elemen.length) {
        return;
    }

    let targetX = 0;
    let targetY = 0;
    let rafId = null;

    const terapkan = () => {
        rafId = null;

        elemen.forEach(element => {
            const depth =
                parseFloat(
                    element.dataset.depth
                ) || 0;

            element.style.translate =
                `${
                    targetX *
                    depth *
                    600
                }px ${
                    targetY *
                    depth *
                    600
                }px`;
        });
    };

    const jadwalkan = () => {
        if (!rafId) {
            rafId =
                requestAnimationFrame(
                    terapkan
                );
        }
    };

    window.addEventListener(
        "pointermove",
        event => {
            if (
                event.pointerType &&
                event.pointerType !==
                    "mouse"
            ) {
                return;
            }

            targetX =
                event.clientX /
                window.innerWidth -
                0.5;

            targetY =
                event.clientY /
                window.innerHeight -
                0.5;

            jadwalkan();
        },
        {
            passive: true
        }
    );

    window.addEventListener(
        "deviceorientation",
        event => {
            if (
                event.gamma === null ||
                event.beta === null
            ) {
                return;
            }

            targetX =
                Math.max(
                    -0.5,
                    Math.min(
                        0.5,
                        event.gamma / 60
                    )
                );

            targetY =
                Math.max(
                    -0.5,
                    Math.min(
                        0.5,
                        (
                            event.beta - 45
                        ) / 60
                    )
                );

            jadwalkan();
        },
        {
            passive: true
        }
    );
}

// ==========================================================
// TOAST
// ==========================================================

function tampilkanToast(pesan) {
    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {
        return;
    }

    toast.innerText = pesan;
    toast.classList.remove(
        "hidden"
    );

    setTimeout(() => {
        toast.classList.add(
            "hidden"
        );
    }, 3000);
}
