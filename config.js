// Ganti URL ini dengan URL API dari akun SheetDB kamu.
//
// CATATAN KEAMANAN: karena ini aplikasi frontend murni (tanpa server),
// URL/endpoint ini bisa dilihat siapa saja lewat "View Source" browser.
// Kalau endpoint SheetDB ini punya akses tulis publik, orang lain yang
// tahu URL-nya berpotensi menulis data ke spreadsheet kamu juga.
// Untuk pemakaian pribadi umumnya masih dianggap wajar, tapi kalau web
// ini akan di-deploy publik, sebaiknya batasi akses di pengaturan
// SheetDB (misalnya read-only publik + write lewat API key terpisah)
// atau taruh di belakang server/proxy sederhana.
const API_URL = 'https://script.google.com/macros/s/AKfycbyxQ1riaRosChv378l7KAagI03ZYbAUiV3eBDXEfbbTL8cAWYLc5azvN3A0FMGznoq6eA/exec';
