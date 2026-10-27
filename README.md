# Sinilink XY-C100L Web Bluetooth Audio Dashboard

Aplikasi Web Dashboard modern berbasis **Web Bluetooth API** berarsitektur modular yang bersih untuk memonitor dan mengontrol modul amplifier Bluetooth **Sinilink XY-C100L** (serta seri XY-AP50L, XY-C50L, dll.) secara langsung dari browser Google Chrome atau Microsoft Edge di PC, Mac, Linux, maupun Android.

---

## 📁 Struktur Direktori Modular

Kode aplikasi telah dipisahkan menjadi modul-modul independen sesuai tanggung jawabnya (*separation of concerns*):

```text
ZANADAUDIO/
├── index.html          # Struktur layout HTML semantic, modal, & UI components
├── README.md           # Dokumentasi teknis & panduan lengkap
├── css/
│   └── style.css       # Custom studio styling, glassmorphism, knob, LED, & animasi
└── js/
    ├── constants.js    # UUID GATT BLE, Command ID, Source maps, & EQ presets
    ├── state.js        # Objek state reaktif pusat aplikasi
    ├── elements.js     # Cache selector DOM Elements
    ├── protocol.js     # Encoder/decoder paket, checksum 8-bit, & buffer parser
    ├── ui.js           # Kontrol UI, rotary knob drag math, VU meter, & logger
    ├── ble.js          # Web Bluetooth lifecycle, GATT connection, retry, & write
    └── app.js          # Inisialisasi aplikasi utama & event listeners binding
```

---

## ⚡ Fitur Utama

1. **Koneksi BLE Cepat & Fleksibel**:
   - Mode default: **`acceptAllDevices: true`** dengan `optionalServices: [0xae00, '0000ae00-0000-1000-8000-00805f9b34fb']` agar seluruh perangkat Bluetooth BLE di sekitar (termasuk yang bertuliskan `Sinilink-APP`, `SINILINK-APP`, `XY-*`) pasti muncul tanpa terhalang case-sensitivity.
   - Pilihan mode filter alternatif: mencakup variasi penulisan `Sinilink-APP`, `SINILINK-APP`, `sinilink-app`, serta prefix `XY-`.
   - Layanan Utama GATT: `0xAE00` (`0000ae00-0000-1000-8000-00805f9b34fb`).
   - Penulisan Perintah: `0xAE10` (*Write With Response*) sebagai karakteristik utama (didukung fallback ke `0xAE03`, `0xAE01`, atau mode `ALL Broadcast`).
   - Penerimaan Status Real-Time: `0xAE04` (*Notify Notifications*).
   - **Handshake Resilience**: Dilengkapi jeda waktu (delay) 300ms setelah `gatt.connect()` untuk stabilisasi peripheral chip BLE serta fitur **Auto-Retry 2x** jika terjadi pemutusan koneksi mendadak saat inisialisasi GATT.

2. **Real-Time 2-Way Volume Synchronization**:
   - Knob putar analog audio modern (*rotary knob* dengan interaksi drag pointer, touch, dan mouse wheel skala 0–29 MAX).
   - Slider volume presisi (rentang 0 – 29, level persentase %, dan estimasi dB gain).
   - Tombol cepat **MUTE / UNMUTE**, Prev, Play/Pause, Next dengan standar ergonomis Android (44px).
   - Pembaruan layar otomatis ketika knob fisik pada modul amplifier diputar secara manual.

3. **Input Source & Equalizer Switcher**:
   - **Mode Input**: Bluetooth (`0x14`), PC Soundcard (`0x15`), AUX In (`0x16`), USB Disk (`0x04`).
   - **Preset EQ (6 Kurva)**: Normal (`0x09`), Rock (`0x0A`), Pop (`0x0B`), Classic (`0x0C`), Jazz (`0x0D`), Country (`0x0E`).
   - **Manual 7-Band Equalizer**: Sliders grafis 60Hz, 150Hz, 400Hz, 1kHz, 2.4kHz, 6kHz, 15kHz dengan kurva respons SVG dinamis dan auto-sync ke hardware DSP.

4. **Live BLE Logger & Custom Hex Payload Tester**:
   - Terminal log langsung menampilkan paket `TX` (Write ke `0xAE10` / `0xAE03`) dan `RX` (Notify dari `0xAE04`) beserta timestamp milidetik, panjang paket, dan penjelasan isi paket.
   - Filter log (ALL, RX, TX), tombol Clear Log, dan Copy to Clipboard.
   - Kolom inject perintah Hex kustom dengan kalkulasi otomatis *Checksum 8-bit* (`sum & 0xFF`) dan opsi pemilihan target Characteristic.
   - Dilengkapi **Virtual Demo Mode** untuk mencoba seluruh animasi dan alur data tanpa perangkat fisik.

---

## 🚀 Cara Menjalankan

### Persyaratan Browser
- **PC / Laptop**: Google Chrome, Microsoft Edge, Opera, atau Brave.
- **Android**: Google Chrome untuk Android (pastikan Bluetooth & Location/Nearby Devices diaktifkan).
- *Catatan*: Web Bluetooth API memerlukan konteks aman (**HTTPS** atau **Localhost**).

### Opsi 1: Menjalankan via Localhost (PC & Android dalam 1 Wi-Fi)
Jalankan web server lokal sederhana di folder ini:
```bash
# Menggunakan Node.js
npx serve .

# ATAU menggunakan Python
python -m http.server 5173
```
Buka browser:
- Di PC: `http://localhost:5173`
- Di Android (dalam jaringan Wi-Fi yang sama): `http://<IP-Komputer-Anda>:5173`

### Opsi 2: Host di GitHub Pages (Sangat Direkomendasikan untuk Android)
Karena repositori ini sudah berada di GitHub:
1. Masuk ke **Settings** > **Pages** di repositori GitHub Anda.
2. Pilih branch `main` dan folder `/ (root)`.
3. Buka URL HTTPS yang dihasilkan di ponsel Android Anda. Web Bluetooth akan langsung bekerja 100% tanpa konfigurasi tambahan!

---

## 🛠️ Format Protokol & Byte Frame Sinilink

### 1. Struktur Paket Status (Notify dari `0xAE04`)
Paket status 16-byte:
```text
7E 10 1F 01 00 1B 31 32 33 34 00 00 00 00 01 93
```
- `Byte 0` (`0x7E`): Header tetap.
- `Byte 1` (`0x10`): Panjang total paket (16 byte).
- `Byte 2` (`0x1F`): Command ID status query.
- `Byte 3` (`0x01`): Prompt Tone status (1: aktif, 0: nonaktif).
- `Byte 4` (`0x00`): Mute / status byte.
- `Byte 5` (`0x1B`): Volume saat ini (`0x1B` = 27 dari skala hardware 0-29 [0x1D mentok kanan]).
- `Byte 6-9` (`31 32 33 34`): Password ASCII (`"1234"`).
- `Byte 15` (`0x93`): Checksum 8-bit (`sum(byte[0]..byte[14]) & 0xFF`).

### 2. Struktur Paket Perintah (Write ke `0xAE10` / `0xAE03`)
- **Set Volume (15 Byte)**:
  `7E 0F 1D <vol_hex> 00 00 00 00 00 00 00 00 00 00 <checksum>`
  *Catatan Skala Hardware*: Modul Sinilink XY-C100L memiliki skala volume rotary encoder fisik dari **0 hingga 29** (`0x00` s/d `0x1D` = 30 level langkah). Nilai `0x1D` adalah posisi mentok kanan (100% / 0 dB Gain). Aplikasi kini terkalibrasi secara native ke skala 29 dengan dukungan adaptif otomatis jika modul melaporkan 30/31.
- **Switch Source (5 Byte)**:
  - Bluetooth: `7E 05 14 00 97`
  - AUX: `7E 05 16 00 99`
  - USB: `7E 05 04 00 87`
  - PC Audio: `7E 05 15 00 98`
- **Set EQ (5 Byte)**:
  - Normal: `7E 05 09 00 8C`
  - Rock: `7E 05 0A 00 8D`
  - Pop: `7E 05 0B 00 8E`
  - Classic: `7E 05 0C 00 8F`
  - Jazz: `7E 05 0D 00 90`
  - Country: `7E 05 0E 00 91`
- **Transport**:
  - Play/Pause: `7E 05 01 00 84`
  - Prev: `7E 05 07 00 8A`
  - Next: `7E 05 08 00 8B`
  - Poll Status: `7E 05 1F 00 A2`

---

## 🔍 Mengapa Harus "Remove Device" di Windows Agar Terdeteksi Saat Scan Ulang?

Jika Anda pernah mengalami kendala di mana `Sinilink-APP` **tidak muncul saat di-scan ulang** kecuali jika perangkat di-*remove/lupakan* terlebih dahulu di menu Bluetooth Windows:

### Penyebab Teknis (Chip JieLi & BLE Stack OS):
1. **Single BLE Link Policy**: Modul Sinilink XY-C100L menggunakan chip Bluetooth JieLi (JL AC69xx). Chip ini dirancang hanya mengizinkan **1 koneksi BLE aktif**.
2. **Advertising Dimatikan**: Ketika komputer Windows atau HP Android sudah terhubung atau dipasangkan (*paired*) dengan `Sinilink-APP`, firmware chip JieLi **otomatis mematikan siaran paket sinyal (advertising `ADV_IND`)**.
3. **Scan Dialog Membutuhkan Advertising**: Dialog scan browser (`navigator.bluetooth.requestDevice`) hanya dapat menemukan perangkat yang sedang aktif memancarkan sinyal advertising. Karena modul tidak memancarkannya saat terkoneksi di background Windows, modul tidak akan pernah muncul di daftar scan.

### Solusi Terbaik (Tersedia Langsung di Aplikasi):
1. **⚡ Gunakan Tombol "Sambung Cepat" (Tanpa Perlu Scan & Tanpa Remove Device)**:
   Aplikasi ini telah dilengkapi dengan `navigator.bluetooth.getDevices()`. Begitu modul sudah pernah dikoneksikan ke browser, browser akan mengingatnya. Cukup klik tombol **"Sambung Cepat"** — koneksi GATT akan langsung tersambung dalam waktu kurang dari 1 detik tanpa memindai paket advertising!
2. **🔄 Matikan Saklar Ampli 3 Detik (Restart Power)**:
   Jika ingin melakukan scan baru dari nol, Anda tidak perlu repot membuka Settings Windows. Cukup matikan saklar power amplifier selama 3 detik lalu nyalakan kembali. Modul akan restart dan memancarkan sinyal BLE advertising kembali.
3. **📱 Tutup Aplikasi di HP**:
   Pastikan aplikasi Sinilink di HP Android/iOS Anda tidak sedang berjalan/terhubung, karena HP akan merebut koneksi BLE modul dan mematikan sinyal scan untuk PC.
4. **🗑️ Tombol "Lupakan & Reset BLE Cache"**:
   Tersedia di menu opsi BLE jika Anda ingin mencabut izin lama (`device.forget()`) secara bersih dari browser.

---


## 💾 Panduan Menghilangkan Drive Kosong G: (BR21 DEVICE V1.00) di Windows

Saat menghubungkan modul amplifier ke PC via kabel USB-A to USB-A, Windows akan memunculkan drive kosong bernama **`USB Drive (G:)`** atau **`BR21 DEVICE V1.00`** di File Explorer.

### Mengapa Drive G: Ini Muncul?
Chipset JieLi (JL AC69xx) pada modul Sinilink dikonfigurasi sebagai **USB Composite Device** dengan 3 interface perangkat keras sekaligus:
1. `MI_01`: **USB Audio Class (UAC)** &rarr; `Speakers (JieLi BR21)` untuk audio komputer (*ini yang kita pakai*).
2. `MI_04`: **USB HID** &rarr; Kontrol media (Play, Pause, Next, Volume).
3. `MI_00`: **USB Mass Storage** &rarr; Controller Card Reader dummy firmware yang disiapkan pabrik untuk membaca file MP3 dari flashdisk/MicroSD. Karena modul ini tidak memiliki slot MicroSD yang terpasang kartu, Windows mendeteksi drive kosong (*No Media*).

### Cara Menghilangkan Drive G: Secara Permanen:

#### Cara 1 (Paling Bersih & Direkomendasikan via Device Manager):
1. Colokkan kabel USB amplifier ke PC.
2. Tekan tombol **`Windows + X`** di keyboard, lalu pilih **Device Manager** (Pengelola Perangkat).
3. Buka kategori **Disk drives** (Drive disk).
4. Cari perangkat bernama **`BR21 DEVICE V1.00 USB Device`**.
5. Klik kanan pada perangkat tersebut &rarr; pilih **Disable device** (Nonaktifkan perangkat).
6. Klik **Yes**.

> **Hasil**: Drive G: akan hilang seketika dari File Explorer dan tidak akan muncul lagi meskipun kabel dicabut-colok. **Speaker USB (JieLi BR21) tetap berfungsi normal 100%** karena driver soundcard berada di interface audio yang terpisah.

#### Cara 2 (Hapus Huruf Drive via Disk Management):
1. Tekan tombol **`Windows + X`** &rarr; pilih **Disk Management**.
2. Di daftar bawah, cari disk Removable dengan kapasitas *No Media* (huruf `G:`).
3. Klik kanan pada partisi `(G:)` &rarr; pilih **Change Drive Letter and Paths...**.
4. Klik tombol **Remove** &rarr; klik **Yes**.

#### Cara 3 (Sembunyikan Drive Kosong di Folder Options Windows):
1. Buka File Explorer &rarr; klik menu titik tiga `...` di toolbar atas &rarr; pilih **Options**.
2. Buka tab **View**.
3. Centang opsi **"Hide empty drives"** (Sembunyikan drive kosong) &rarr; klik **Apply** &rarr; **OK**.
