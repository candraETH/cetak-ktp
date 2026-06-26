const form = document.querySelector("#generatorForm");
const usernameInput = document.querySelector("#username");
const generatorPage = document.querySelector("#generatorPage");
const cardPage = document.querySelector("#cardPage");
const deck = document.querySelector("#cardDeck");
const statusText = document.querySelector("#statusText");
const resultStatus = document.querySelector("#resultStatus");
const followModal = document.querySelector("#followModal");
const followAccount = document.querySelector("#followAccount");
const continueDownload = document.querySelector("#continueDownload");
const closeFollowModal = document.querySelector("#closeFollowModal");
const followHint = document.querySelector("#followHint");
const profileImage = document.querySelector("#profileImage");
const avatarFallback = document.querySelector("#avatarFallback");
const portraitFrame = document.querySelector(".portrait-frame");

const fields = {
  nit: document.querySelector("#nitValue"),
  username: document.querySelector("#usernameValue"),
  role: document.querySelector("#roleValue"),
  rank: document.querySelector("#rankValue"),
  xp: document.querySelector("#xpValue"),
  xpBar: document.querySelector("#xpBar"),
  group: document.querySelector("#groupValue"),
  citizenType: document.querySelector("#citizenTypeValue"),
  domicile: document.querySelector("#domicileValue"),
  nationality: document.querySelector("#nationalityValue"),
  validity: document.querySelector("#validityValue"),
  motto: document.querySelector("#mottoValue"),
  signature: document.querySelector("#signatureValue"),
  phrase: document.querySelector("#phraseValue"),
  note: document.querySelector("#noteValue"),
  fortune: document.querySelector("#fortuneValue"),
  profileUrl: document.querySelector("#profileUrl")
};

const badgeList = document.querySelector("#badgeList");
const statList = document.querySelector("#statList");
const qrBox = document.querySelector("#qrBox");
const stage = document.querySelector(".stage");
const followUrl = "https://www.threads.com/@can_lotte";
let pendingDownload = null;
let followTimer = null;

const roles = [
  "Dirjen AI Sejer",
  "Menteri Komentar Tipis",
  "Komandan FYP Senyap",
  "Arsiparis Thread Panas",
  "Diplomat Reply Cepat",
  "Kepala Biro Notifikasi"
];

const ranks = ["Sersan Bot", "Letnan Algoritma", "Kapten Quote", "Mayor Meme", "Kolonel Scroll", "Jenderal FYP"];
const groups = ["Tech Prophet FYP", "Rakyat Reply Cepat", "Kaum Draft Abadi", "Pengawal Trend", "Sindikat Screenshot"];
const citizenTypes = ["Pengamat Kode & Klik", "Pejuang Repost", "Pembaca Sunyi", "Komentator Strategis", "Kurator Meme"];
const domiciles = ["FYP Server Koneksi", "Timeline Timur", "Beranda Random", "Kecamatan Rate Limit", "Distrik Thread Panjang"];
const skills = [
  "Menghubungkan API dengan senyum",
  "Mencari konteks dari satu typo",
  "Menenangkan timeline rusuh",
  "Membalas tanpa kehilangan martabat",
  "Menyusun thread sampai rapi"
];
const notes = [
  "Akun ini lebih suka nge-debug daripada nge-gossip.",
  "Riwayat scrolling stabil, emosi masih dalam pengawasan.",
  "Sering muncul saat topik mulai terlalu teknis.",
  "Punya kecenderungan menyimpan draft lalu lupa publish."
];
const fortunes = [
  "Minggu ini akan menemukan cara baru nge-repost tanpa rate limit.",
  "Akan viral kecil-kecilan karena balasan yang terlalu tepat.",
  "Timeline memberi sinyal baik setelah jam makan siang.",
  "Satu thread lama akan kembali hidup di waktu yang tidak diduga."
];

let activeProfile = buildProfile("can_lotte");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = cleanUsername(usernameInput.value);
  if (!username) return;

  statusText.textContent = "Mengambil data kartu...";
  try {
    const remoteData = await fetchKtpThreads(username);
    activeProfile = normalizeProfile(username, remoteData);
    statusText.textContent = "Data asli dari ktp-threads.com berhasil dimuat. Kartu siap dicetak.";
    renderProfile(activeProfile);
    showCardPage();
  } catch (error) {
    statusText.textContent = error.message || "Data dari ktp-threads.com belum bisa dimuat.";
  }
});

document.querySelector("#flipCard").addEventListener("click", () => {
  deck.dataset.side = deck.dataset.side === "front" ? "back" : "front";
});

document.querySelector("#printCard").addEventListener("click", () => window.print());
document.querySelector("#downloadCard").addEventListener("click", () => requestFollowGate("image"));
document.querySelector("#downloadGif").addEventListener("click", () => requestFollowGate("gif"));
document.querySelector("#newCard").addEventListener("click", showGeneratorPage);
followAccount.addEventListener("click", handleFollowClick);
continueDownload.addEventListener("click", continueAfterFollow);
closeFollowModal.addEventListener("click", closeFollowGate);
followModal.addEventListener("click", (event) => {
  if (event.target === followModal) closeFollowGate();
});
window.addEventListener("resize", fitMobileCard);
window.addEventListener("orientationchange", fitMobileCard);

async function fetchKtpThreads(username) {
  const response = await fetch("/api/ktp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ username })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Gagal mengambil data dari ktp-threads.com.");
  return data;
}

function normalizeProfile(username, data) {
  const fallback = buildProfile(username);
  const source = data.data || data.profile || data.result || data;
  return {
    ...fallback,
    nit: source.nit || source.NIT || source.id || fallback.nit,
    username: cleanUsername(source.uname || source.username || username),
    role: source.gelar || source.jabatan || source.role || fallback.role,
    rank: source.pangkat || source.rank || fallback.rank,
    xp: Number(source.xp || source.XP || fallback.xp),
    group: source.golongan || source.group || fallback.group,
    citizenType: source.jenisWarganet || source.jenis_warganet || source.type || fallback.citizenType,
    domicile: source.domisiliAlgoritma || source.domisili_algoritma || source.domicile || fallback.domicile,
    nationality: source.kewarganegaraan || source.nationality || fallback.nationality,
    validity: source.masaBerlaku || source.masa_berlaku || source.validity || fallback.validity,
    motto: source.motto ? `"${source.motto.replace(/^"|"$/g, "")}"` : fallback.motto,
    phrase: source.frasaSakti || source.frasa_sakti || source.phrase || fallback.phrase,
    badges: source.badges || source.lencana || fallback.badges,
    stats: normalizeStats(source.skor || source.stats) || fallback.stats,
    note: source.catatan_petugas ? `Catatan Petugas: ${source.catatan_petugas}` : source.catatan || source.note || fallback.note,
    fortune: source.ramalan || source.fortune || fallback.fortune,
    photo: source.avatarUrl ? `/api/avatar?url=${encodeURIComponent(source.avatarUrl)}` : source.photo || source.avatar || source.image || fallback.photo,
    signature: titleCase(source.uname || username),
    profileUrl: `https://www.threads.com/@${cleanUsername(source.uname || username)}`,
    blood: source.golongan_darah,
    twin: source.kembaran_netizen,
    rarity: source.tingkat_kelangkaan,
    activeTime: source.jam_aktif,
    weapon: source.senjata_andalan,
    dominant: Array.isArray(source.sifat_dominan) ? source.sifat_dominan.join(", ") : source.sifat_dominan,
    skill: source.skill_utama
  };
}

function normalizeStats(stats) {
  if (!stats || Array.isArray(stats)) return stats || null;
  const colors = {
    asbun: "#e8590c",
    sinis: "#5f3dc4",
    wholesome: "#2b8a3e",
    chaos: "#c2255c",
    baper: "#1971c2",
    receh: "#f59f00",
    halu: "#9c36b5",
    fomo: "#0c8599",
    caper: "#fa5252",
    healing: "#12b886"
  };
  return Object.entries(stats).map(([name, value]) => ({
    name: name.replace(/^\w/, (letter) => letter.toUpperCase()),
    value: Number(value),
    color: colors[name] || "#35526e"
  }));
}

function buildProfile(username) {
  const seed = hash(username);
  const pick = (items, offset = 0) => items[(seed + offset) % items.length];
  const xp = 25 + (seed % 70);
  const firstName = username.replace(/[._-]+/g, " ").split(" ").filter(Boolean)[0] || username;

  return {
    nit: formatNit(seed),
    username,
    role: pick(roles, 1),
    rank: pick(ranks, 2),
    xp,
    group: pick(groups, 3),
    citizenType: pick(citizenTypes, 4),
    domicile: pick(domiciles, 5),
    nationality: "Warga Threads +62",
    validity: "Berlaku s/d dapat verifikasi Google",
    motto: `"${pick(["Semua kode, satu tombol", "Reply pelan, dampak panjang", "Scroll boleh, lupa diri jangan", "Algoritma tajam, hati tetap teduh"], 6)}"`,
    signature: titleCase(firstName),
    phrase: `"${pick([
      "Halo warga Threads, saya hadir membawa notifikasi baik.",
      "Satu thread rapi bisa menyelamatkan satu timeline.",
      "Kalau FYP memanggil, jawab dengan elegan.",
      "Saya bukan buzzer, saya cuma terlalu cepat membaca konteks."
    ], 7)}"`,
    badges: [pick(["Penghubung API Siang Hari", "Anti Skip Konteks", "Penjaga Draft"], 8), pick(["Penyemangat Rate Limit", "Reply Diplomatis", "Kurator Timeline"], 9)],
    stats: makeStats(seed),
    note: `Catatan Petugas: ${pick(notes, 10)}`,
    fortune: `Ramalan: ${pick(fortunes, 11)}`,
    photo: "",
    profileUrl: `https://www.threads.net/@${username}`
  };
}

function makeStats(seed) {
  const names = ["Asbun", "Wholesome", "Baper", "Halu", "Caper", "Sinis", "Chaos", "Receh", "FOMO", "Healing"];
  const colors = ["#f25a12", "#29984d", "#147dc9", "#a93ac4", "#fb5457", "#6742d9", "#d12262", "#f5a400", "#108d9b", "#18b88b"];
  return names.map((name, index) => ({
    name,
    value: 20 + ((seed + index * 13) % 61),
    color: colors[index]
  }));
}

function renderProfile(profile) {
  const initials = getInitials(profile.username);
  fields.nit.textContent = profile.nit;
  fields.username.textContent = `@${profile.username}`;
  fields.role.textContent = profile.role;
  fields.rank.textContent = profile.rank;
  fields.xp.textContent = profile.xp;
  fields.xpBar.style.setProperty("--value", `${Math.max(0, Math.min(100, profile.xp))}%`);
  fields.group.textContent = profile.group;
  fields.citizenType.textContent = profile.citizenType;
  fields.domicile.textContent = profile.domicile;
  fields.nationality.textContent = profile.nationality;
  fields.validity.textContent = profile.validity;
  fields.motto.textContent = profile.motto;
  fields.signature.textContent = profile.signature || titleCase(profile.username);
  fields.phrase.textContent = profile.phrase;
  fields.note.textContent = profile.note;
  fields.fortune.textContent = profile.fortune;
  fields.profileUrl.textContent = profile.profileUrl || `https://www.threads.com/@${profile.username}`;

  avatarFallback.textContent = initials;
  if (profile.photo) {
    profileImage.src = profile.photo;
    portraitFrame.classList.add("has-image");
  } else {
    profileImage.removeAttribute("src");
    portraitFrame.classList.remove("has-image");
  }

  const details = [
    ["Lencana", profile.badges.join(" | ")],
    ["Jam Aktif", profile.activeTime],
    ["Senjata Andalan", profile.weapon],
    ["Gol. Darah Digital", profile.blood],
    ["Kembaran Netizen", profile.twin],
    ["Sifat Dominan", profile.dominant],
    ["Skill Utama", profile.skill],
    ["Kelangkaan", profile.rarity]
  ].filter(([, value]) => value);

  badgeList.replaceChildren(...details.map(([label, value]) => {
    const row = document.createElement("div");
    row.className = "back-detail";
    row.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    return row;
  }));

  statList.replaceChildren(...profile.stats.map((stat) => {
    const item = document.createElement("div");
    item.className = "stat-item";
    item.innerHTML = `
      <div class="stat-head"><span>${escapeHtml(stat.name)}</span><span>${stat.value}</span></div>
      <div class="stat-bar"><i style="--value: ${stat.value}%; --bar-color: ${stat.color}; --bar-color-2: ${stat.color}; --bar-color-3: ${stat.color}"></i></div>
    `;
    return item;
  }));

  renderQr(profile.profileUrl || `https://www.threads.com/@${profile.username}`);
  fitMobileCard();
}

function fitMobileCard() {
  if (!stage || !deck) return;
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  if (!isMobile) {
    deck.style.removeProperty("--preview-scale");
    deck.style.removeProperty("height");
    return;
  }

  const cardWidth = 960;
  const cardHeight = 605;
  const available = Math.max(280, stage.clientWidth || window.innerWidth - 20);
  const scale = Math.min(1, available / cardWidth);
  deck.style.setProperty("--preview-scale", String(scale));
  deck.style.height = `${cardHeight * scale}px`;
}

function showCardPage() {
  generatorPage.hidden = true;
  cardPage.hidden = false;
  deck.dataset.side = "front";
  requestAnimationFrame(fitMobileCard);
}

function showGeneratorPage() {
  cardPage.hidden = true;
  generatorPage.hidden = false;
  statusText.textContent = "Masukkan username. Data akan diambil dari ktp-threads.com lalu dicetak ulang ke kartu ini.";
  requestAnimationFrame(() => usernameInput.focus());
}

function requestFollowGate(type) {
  pendingDownload = type;
  followModal.hidden = false;
  continueDownload.disabled = true;
  continueDownload.textContent = "Saya sudah follow";
  followHint.textContent = "Klik Follow untuk membuka profil @can_lotte.";
  if (followTimer) clearInterval(followTimer);
}

function handleFollowClick() {
  window.open(followUrl, "_blank", "noopener,noreferrer");
  let remaining = 3;
  continueDownload.disabled = true;
  continueDownload.textContent = `Tunggu ${remaining}d`;
  followHint.textContent = "Setelah follow, kembali ke halaman ini untuk melanjutkan download.";
  if (followTimer) clearInterval(followTimer);
  followTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(followTimer);
      followTimer = null;
      continueDownload.disabled = false;
      continueDownload.textContent = pendingDownload === "gif" ? "Download GIF" : "Download gambar";
      followHint.textContent = "Klik tombol download untuk melanjutkan.";
      return;
    }
    continueDownload.textContent = `Tunggu ${remaining}d`;
  }, 1000);
}

async function continueAfterFollow() {
  const type = pendingDownload;
  closeFollowGate();
  if (type === "gif") {
    await downloadGif();
  } else {
    await downloadActiveCard();
  }
}

function closeFollowGate() {
  followModal.hidden = true;
  if (followTimer) {
    clearInterval(followTimer);
    followTimer = null;
  }
}

function renderQr(value) {
  const matrix = createQrMatrix(String(value));
  qrBox.replaceChildren();
  const size = matrix.length;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${size + 4} ${size + 4}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "QR profil Threads");
  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(size + 4));
  bg.setAttribute("height", String(size + 4));
  bg.setAttribute("fill", "#f7fcff");
  svg.appendChild(bg);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!matrix[y][x]) continue;
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", String(x + 2));
      rect.setAttribute("y", String(y + 2));
      rect.setAttribute("width", "1");
      rect.setAttribute("height", "1");
      rect.setAttribute("fill", "#15212b");
      svg.appendChild(rect);
    }
  }
  qrBox.appendChild(svg);
}

function createQrMatrix(text) {
  const size = 33;
  const dataCodewords = 80;
  const eccCodewords = 20;
  const bytes = new TextEncoder().encode(text.slice(0, 78));
  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));
  appendBits(bits, 0, Math.min(4, dataCodewords * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bitsToByte(bits.slice(i, i + 8)));
  for (let pad = 0xec; data.length < dataCodewords; pad ^= 0xfd) data.push(pad);

  const codewords = [...data, ...reedSolomonRemainder(data, eccCodewords)];
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));
  drawFinder(matrix, reserved, 0, 0);
  drawFinder(matrix, reserved, size - 7, 0);
  drawFinder(matrix, reserved, 0, size - 7);
  drawAlignment(matrix, reserved, 26, 26);
  for (let i = 0; i < size; i += 1) {
    setModule(matrix, reserved, 6, i, i % 2 === 0, true);
    setModule(matrix, reserved, i, 6, i % 2 === 0, true);
  }
  setModule(matrix, reserved, 8, size - 8, true, true);
  reserveFormat(reserved, size);
  drawData(matrix, reserved, codewords.flatMap(byteToBits), 0);
  drawFormat(matrix, reserved, size, 0);
  return matrix;
}

function appendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) bits.push((value >> i) & 1);
}

function bitsToByte(bits) {
  return bits.reduce((value, bit) => (value << 1) | bit, 0);
}

function byteToBits(byte) {
  const bits = [];
  appendBits(bits, byte, 8);
  return bits;
}

function setModule(matrix, reserved, x, y, value, reserve = false) {
  if (x < 0 || y < 0 || y >= matrix.length || x >= matrix.length) return;
  matrix[y][x] = Boolean(value);
  if (reserve) reserved[y][x] = true;
}

function drawFinder(matrix, reserved, x, y) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      const on = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 &&
        (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      setModule(matrix, reserved, xx, yy, on, true);
    }
  }
}

function drawAlignment(matrix, reserved, cx, cy) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      setModule(matrix, reserved, cx + dx, cy + dy, dist !== 1, true);
    }
  }
}

function reserveFormat(reserved, size) {
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
}

function drawData(matrix, reserved, bits, mask) {
  const size = matrix.length;
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let row = 0; row < size; row += 1) {
      const y = upward ? size - 1 - row : row;
      for (let col = 0; col < 2; col += 1) {
        const x = right - col;
        if (reserved[y][x]) continue;
        const raw = bits[bitIndex] === 1;
        matrix[y][x] = raw !== maskApplies(mask, x, y);
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

function maskApplies(mask, x, y) {
  return mask === 0 && (x + y) % 2 === 0;
}

function drawFormat(matrix, reserved, size, mask) {
  const eclBits = 1;
  const data = (eclBits << 3) | mask;
  let remainder = data << 10;
  const generator = 0x537;
  for (let i = 14; i >= 10; i -= 1) {
    if ((remainder >> i) & 1) remainder ^= generator << (i - 10);
  }
  const format = ((data << 10) | remainder) ^ 0x5412;
  const coords1 = [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8], [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0]];
  const coords2 = [[8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4], [8, size - 5], [8, size - 6], [8, size - 7], [8, size - 8], [size - 7, 8], [size - 6, 8], [size - 5, 8], [size - 4, 8], [size - 3, 8], [size - 2, 8], [size - 1, 8]];
  for (let i = 0; i < 15; i += 1) {
    const bit = ((format >> i) & 1) === 1;
    setModule(matrix, reserved, coords1[i][0], coords1[i][1], bit, true);
    setModule(matrix, reserved, coords2[i][0], coords2[i][1], bit, true);
  }
}

function reedSolomonRemainder(data, degree) {
  const generator = reedSolomonGenerator(degree);
  const result = Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    generator.forEach((coef, index) => {
      result[index] ^= gfMul(coef, factor);
    });
  }
  return result;
}

function reedSolomonGenerator(degree) {
  let result = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = Array(result.length + 1).fill(0);
    result.forEach((coef, index) => {
      next[index] ^= coef;
      next[index + 1] ^= gfMul(coef, gfPow(2, i));
    });
    result = next;
  }
  return result.slice(1);
}

function gfMul(x, y) {
  let result = 0;
  while (y) {
    if (y & 1) result ^= x;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
    y >>= 1;
  }
  return result;
}

function gfPow(x, power) {
  let result = 1;
  for (let i = 0; i < power; i += 1) result = gfMul(result, x);
  return result;
}

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 32);
}

function hash(text) {
  return [...text].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 17), 0);
}

function formatNit(seed) {
  const digits = String(seed * 982451653).replace(/\D/g, "").padEnd(12, "0").slice(0, 12);
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}.${digits.slice(8, 12)}`;
}

function getInitials(username) {
  const parts = username.replace(/[._-]+/g, " ").split(" ").filter(Boolean);
  const text = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : username.slice(0, 2);
  return text.toUpperCase();
}

function titleCase(value) {
  return String(value)
    .replace(/[._-]+/g, " ")
    .replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function downloadActiveCard() {
  const card = deck.dataset.side === "back" ? document.querySelector("#backCard") : document.querySelector("#frontCard");
  setResultStatus("Menyiapkan gambar...");

  try {
    const canvas = await renderCardCanvas(card, 2);
    triggerDownload(canvas.toDataURL("image/png"), `ktp-threads-${activeProfile.username}-${deck.dataset.side}.png`);
    setResultStatus("Gambar berhasil dibuat.");
  } catch (error) {
    console.error(error);
    setResultStatus(`Download gambar gagal: ${error.message || "browser menolak export"}.`);
  }
}

async function downloadGif() {
  setResultStatus("Menyiapkan GIF flip 3D...");
  const front = document.querySelector("#frontCard");
  const back = document.querySelector("#backCard");

  try {
    const frontCanvas = await renderCardCanvas(front, 0.48);
    const backCanvas = await renderCardCanvas(back, 0.48);
    const frames = buildFlipFrames(frontCanvas, backCanvas);
    const gifBytes = encodeGif(frames, {
      delayCs: 10,
      width: frames[0].width,
      height: frames[0].height
    });
    const blob = new Blob([gifBytes], { type: "image/gif" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `ktp-threads-${activeProfile.username}-depan-belakang.gif`);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    setResultStatus("GIF flip berhasil dibuat.");
  } catch (error) {
    console.error(error);
    setResultStatus(`GIF gagal dibuat: ${error.message || "browser menolak export"}.`);
  }
}

function buildFlipFrames(frontCanvas, backCanvas) {
  const width = 560;
  const height = 420;
  const frames = [];
  const steps = 56;

  for (let i = 0; i < steps; i += 1) {
    const t = i / steps;
    const angle = easeInOutSine(t) * Math.PI * 2;
    const facingFront = Math.cos(angle) >= 0;
    const source = facingFront ? frontCanvas : backCanvas;
    const squash = Math.max(0.08, Math.abs(Math.cos(angle)));
    const sideTilt = Math.sin(angle);
    const brightness = 0.72 + squash * 0.28;
    frames.push(drawFlipFrame(source, {
      width,
      height,
      squash,
      sideTilt,
      brightness,
      angle
    }));
  }

  const frontHold = drawFlipFrame(frontCanvas, {
    width,
    height,
    squash: 1,
    sideTilt: 0,
    brightness: 1,
    angle: 0
  });
  const backHold = drawFlipFrame(backCanvas, {
    width,
    height,
    squash: 1,
    sideTilt: 0,
    brightness: 1,
    angle: Math.PI
  });

  frames.unshift(...Array.from({ length: 8 }, () => frontHold));
  frames.splice(Math.floor(frames.length / 2), 0, ...Array.from({ length: 8 }, () => backHold));

  return frames;
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function drawFlipFrame(source, { width, height, squash, sideTilt, brightness, angle }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#0f1824");
  bg.addColorStop(0.48, "#172536");
  bg.addColorStop(1, "#23314a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "#6e84a2";
  ctx.lineWidth = 1;
  for (let x = -height; x < width; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + height, 0);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#91a7c4";
  ctx.lineWidth = 2;
  roundRect(ctx, 44, 44, width - 88, height - 88, 26);
  ctx.stroke();
  ctx.globalAlpha = 0.12;
  roundRect(ctx, 72, 72, width - 144, height - 144, 20);
  ctx.stroke();
  ctx.restore();

  const maxW = 500;
  const maxH = 315;
  const drawW = maxW * squash;
  const drawH = maxH * (0.94 + squash * 0.06);
  const cx = width / 2;
  const cy = height / 2 + 4;
  const x = cx - drawW / 2 + sideTilt * 10;
  const y = cy - drawH / 2;
  const skew = sideTilt * 18;

  ctx.save();
  const shadowW = maxW * (0.35 + squash * 0.55);
  const shadowH = 18 + (1 - squash) * 16;
  const shadow = ctx.createRadialGradient(cx, cy + maxH / 2 + 28, 8, cx, cy + maxH / 2 + 28, shadowW / 2);
  shadow.addColorStop(0, "rgba(0,0,0,0.55)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + maxH / 2 + 28, shadowW / 2, shadowH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + Math.max(0, skew), y);
  ctx.lineTo(x + drawW + Math.min(0, skew), y + 8);
  ctx.lineTo(x + drawW - Math.max(0, skew), y + drawH - 8);
  ctx.lineTo(x - Math.min(0, skew), y + drawH);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(source, x, y, drawW, drawH);

  if (brightness < 0.98) {
    ctx.fillStyle = `rgba(4, 10, 18, ${Math.min(0.38, (1 - brightness) * 1.1)})`;
    ctx.fillRect(x - 20, y - 20, drawW + 40, drawH + 40);
  }

  const shine = Math.max(0, Math.sin(angle));
  if (shine > 0.2) {
    const grad = ctx.createLinearGradient(x, y, x + drawW, y);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, `rgba(255,255,255,${0.14 * shine})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - 20, y - 20, drawW + 40, drawH + 40);
  }
  ctx.restore();

  return canvas;
}

function setResultStatus(message) {
  if (resultStatus) resultStatus.textContent = message;
  statusText.textContent = message;
}

function triggerDownload(href, filename) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  requestAnimationFrame(() => link.remove());
}

async function renderCardCanvas(card, scale = 1) {
  if (/firefox/i.test(navigator.userAgent)) {
    return renderCanvasFallback(card.id === "backCard" ? "back" : "front", scale);
  }

  try {
    const width = 960;
    const height = 605;
    const clone = await prepareExportClone(card, width, height);
    const styles = getExportStyles();

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            <style>${styles}</style>
            ${clone.outerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);
    return canvas;
  } catch (error) {
    console.warn("DOM export failed, using canvas fallback.", error);
    return renderCanvasFallback(card.id === "backCard" ? "back" : "front", scale);
  }
}

async function prepareExportClone(card, width, height) {
  const clone = card.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.display = "flex";
  clone.style.maxHeight = "none";
  clone.style.transform = "none";

  const images = [...clone.querySelectorAll("img")];
  await Promise.all(images.map(async (image) => {
    const src = image.getAttribute("src");
    if (!src || src.startsWith("data:")) return;
    try {
      image.setAttribute("src", await imageUrlToDataUrl(src));
    } catch (error) {
      image.removeAttribute("src");
    }
  }));

  return clone;
}

function getExportStyles() {
  return [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules]
          .filter((rule) => !String(rule.cssText).includes("@media print"))
          .map((rule) => rule.cssText)
          .join("\n");
      } catch (error) {
        return "";
      }
    })
    .join("\n");
}

async function imageUrlToDataUrl(src) {
  const absoluteUrl = new URL(src, window.location.href).href;
  const response = await fetch(absoluteUrl, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Gambar gagal dimuat: ${src}`);
  const blob = await response.blob();
  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function encodeGif(canvases, { width, height, delayCs }) {
  const out = [];
  writeAscii(out, "GIF89a");
  writeShort(out, width);
  writeShort(out, height);
  out.push(0xf7, 0, 0);
  for (let i = 0; i < 256; i += 1) {
    out.push(((i >> 5) & 7) * 255 / 7, ((i >> 2) & 7) * 255 / 7, (i & 3) * 255 / 3);
  }
  out.push(0x21, 0xff, 0x0b);
  writeAscii(out, "NETSCAPE2.0");
  out.push(0x03, 0x01, 0x00, 0x00, 0x00);

  for (const canvas of canvases) {
    const indices = canvasToGifIndices(canvas);
    out.push(0x21, 0xf9, 0x04, 0x00);
    writeShort(out, delayCs);
    out.push(0x00, 0x00);
    out.push(0x2c);
    writeShort(out, 0);
    writeShort(out, 0);
    writeShort(out, width);
    writeShort(out, height);
    out.push(0x00);
    out.push(0x08);
    writeSubBlocks(out, lzwEncode(indices, 8));
  }

  out.push(0x3b);
  return new Uint8Array(out.map((value) => Math.round(value) & 255));
}

function canvasToGifIndices(canvas) {
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  const indices = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const r = data[i] >> 5;
    const g = data[i + 1] >> 5;
    const b = data[i + 2] >> 6;
    indices[p] = (r << 5) | (g << 2) | b;
  }
  return indices;
}

function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let hasPrevious = false;
  const bytes = [];
  let bitBuffer = 0;
  let bitCount = 0;

  const writeCode = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 255);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  const reset = () => {
    nextCode = endCode + 1;
    codeSize = minCodeSize + 1;
    hasPrevious = false;
  };

  writeCode(clearCode);

  for (const index of indices) {
    writeCode(index);

    if (hasPrevious) {
      nextCode += 1;
      if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1;
      if (nextCode >= 4096) {
        writeCode(clearCode);
        reset();
        continue;
      }
    } else {
      hasPrevious = true;
    }
  }

  writeCode(endCode);
  if (bitCount > 0) bytes.push(bitBuffer & 255);
  return bytes;
}

function lzwEncodeCompressed(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let nextCode = endCode + 1;
  let codeSize = minCodeSize + 1;
  const dict = new Map();
  const bytes = [];
  let bitBuffer = 0;
  let bitCount = 0;

  const writeCode = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 255);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  const resetDict = () => {
    dict.clear();
    nextCode = endCode + 1;
    codeSize = minCodeSize + 1;
  };

  writeCode(clearCode);
  let phrase = String(indices[0]);

  for (let i = 1; i < indices.length; i += 1) {
    const current = String(indices[i]);
    const combined = `${phrase},${current}`;
    if (dict.has(combined)) {
      phrase = combined;
      continue;
    }

    writeCode(codeForPhrase(phrase, dict, clearCode));
    if (nextCode < 4096) {
      dict.set(combined, nextCode);
      nextCode += 1;
      if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1;
    } else {
      writeCode(clearCode);
      resetDict();
    }
    phrase = current;
  }

  writeCode(codeForPhrase(phrase, dict, clearCode));
  writeCode(endCode);
  if (bitCount > 0) bytes.push(bitBuffer & 255);
  return bytes;
}

function codeForPhrase(phrase, dict, clearCode) {
  if (!phrase.includes(",")) return Number(phrase);
  return dict.get(phrase) ?? clearCode;
}

function writeSubBlocks(out, bytes) {
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0);
}

function writeAscii(out, text) {
  for (const char of text) out.push(char.charCodeAt(0));
}

function writeShort(out, value) {
  out.push(value & 255, (value >> 8) & 255);
}

async function renderCanvasFallback(side, scale = 1) {
  const width = 960;
  const height = 605;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  drawCardBase(ctx, width, height);

  if (side === "back") {
    await drawBackFallback(ctx);
  } else {
    await drawFrontFallback(ctx);
  }

  return canvas;
}

function drawCardBase(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  roundRect(ctx, 0, 0, width, height, 18);
  ctx.fillStyle = "#e7f3fb";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#99bdd4";
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#b7d2e3";
  ctx.lineWidth = 1;
  for (let x = -height; x < width; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + height, 0);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(560, 486);
  ctx.rotate(-0.33);
  ctx.fillStyle = "rgba(41,67,92,0.07)";
  ctx.font = "900 52px Arial";
  ctx.fillText("KARTU THREADS PENGENAL", -250, 0);
  ctx.restore();
}

async function drawFrontFallback(ctx) {
  await drawHeaderFallback(ctx, "KARTU TANDA PENDUDUK THREADS");
  drawDividerFallback(ctx, 26, 118, 908);

  const p = activeProfile;
  let y = 150;
  drawField(ctx, "NIT", p.nit, 26, y, true);
  y += 36;
  drawField(ctx, "Username", `@${p.username}`, 26, y);
  y += 34;
  drawRankBlock(ctx, p.role, 26, y, 710);
  y += 72;
  drawField(ctx, "Pangkat", p.rank, 26, y);
  y += 32;
  drawXp(ctx, p.xp, 26, y, 710);
  y += 40;
  drawField(ctx, "Golongan", p.group, 26, y);
  y += 30;
  drawField(ctx, "Jenis Warganet", p.citizenType, 26, y);
  y += 30;
  drawField(ctx, "Domisili Algoritma", p.domicile, 26, y);
  y += 30;
  drawField(ctx, "Kewarganegaraan", p.nationality, 26, y);
  y += 30;
  drawField(ctx, "Berlaku Hingga", p.validity, 26, y);
  y += 30;
  drawField(ctx, "Motto", p.motto, 26, y);

  await drawFallbackImage(ctx, p.photo, 765, 132, 156, 200, 8);
  drawStamp(ctx, 768, 355);
  drawQrToCanvas(ctx, p.profileUrl || `https://www.threads.com/@${p.username}`, 804, 425, 96);
  await drawSeal(ctx, 64, 542);
  drawSignature(ctx, p.signature || titleCase(p.username), 720, 568);
}

async function drawBackFallback(ctx) {
  await drawHeaderFallback(ctx, "PROFIL WARGA THREADS");
  const p = activeProfile;
  drawBox(ctx, 26, 118, 908, 72, "#cceff1", "#21b887");
  ctx.fillStyle = "#0d7d91";
  ctx.font = "900 13px Arial";
  ctx.fillText("FRASA SAKTI", 44, 142);
  ctx.fillStyle = "#172433";
  ctx.font = "italic 18px Arial";
  wrapText(ctx, p.phrase, 44, 166, 850, 22, 2);

  const details = [
    ["Lencana", p.badges.join(" | ")],
    ["Jam Aktif", p.activeTime],
    ["Senjata", p.weapon],
    ["Gol. Darah", p.blood],
    ["Kembaran", p.twin],
    ["Sifat", p.dominant],
    ["Skill", p.skill],
    ["Kelangkaan", p.rarity]
  ].filter(([, value]) => value);
  details.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    drawSmallDetail(ctx, label, value, 26 + col * 454, 210 + row * 36, 430);
  });

  p.stats.forEach((stat, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    drawStat(ctx, stat, 26 + col * 454, 368 + row * 29, 410);
  });

  ctx.strokeStyle = "#9fc1d7";
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(26, 520);
  ctx.lineTo(934, 520);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#35526e";
  ctx.font = "italic 15px Arial";
  wrapText(ctx, p.note, 26, 546, 900, 18, 1);
  wrapText(ctx, p.fortune, 26, 572, 900, 18, 1);
}

async function drawHeaderFallback(ctx, title) {
  await drawFallbackImage(ctx, "bendera-small.png", 26, 34, 66, 48, 0);
  ctx.fillStyle = "#35526e";
  ctx.font = "900 13px Arial";
  ctx.letterSpacing = "2px";
  ctx.fillText("REPUBLIK THREADS +62", 110, 50);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#172433";
  ctx.font = "900 27px Arial";
  ctx.fillText(title, 110, 82);
}

function drawDividerFallback(ctx, x, y, width) {
  ctx.strokeStyle = "#29435c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width * 0.47, y);
  ctx.moveTo(x + width * 0.52, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
}

function drawField(ctx, label, value, x, y, mono = false) {
  ctx.fillStyle = "#35526e";
  ctx.font = "700 15px Arial";
  ctx.fillText(label, x, y);
  ctx.fillText(":", x + 150, y);
  ctx.fillStyle = "#172433";
  ctx.font = mono ? "700 24px 'Courier New'" : "700 15px Arial";
  ctx.fillText(String(value || ""), x + 170, y);
}

function drawRankBlock(ctx, role, x, y, width) {
  drawBox(ctx, x, y - 22, width, 58, "#d9daf4", "#6742d9");
  ctx.fillStyle = "#6742d9";
  ctx.font = "900 12px Arial";
  ctx.fillText("JABATAN", x + 18, y - 2);
  ctx.fillStyle = "#2c1a70";
  ctx.font = "900 23px Arial";
  ctx.fillText(String(role || "").toUpperCase(), x + 18, y + 25);
}

function drawXp(ctx, xp, x, y, width) {
  ctx.fillStyle = "#35526e";
  ctx.font = "900 14px Arial";
  ctx.fillText("XP", x, y);
  ctx.fillText(String(xp), x + width - 20, y);
  roundRect(ctx, x, y + 10, width, 9, 6);
  ctx.fillStyle = "#c7d8e4";
  ctx.fill();
  roundRect(ctx, x, y + 10, width * Math.max(0, Math.min(100, xp)) / 100, 9, 6);
  const grad = ctx.createLinearGradient(x, 0, x + width, 0);
  grad.addColorStop(0, "#f59b08");
  grad.addColorStop(0.55, "#fb5457");
  grad.addColorStop(1, "#6742d9");
  ctx.fillStyle = grad;
  ctx.fill();
}

function drawStamp(ctx, x, y) {
  ctx.save();
  ctx.translate(x + 70, y + 22);
  ctx.rotate(-0.2);
  ctx.strokeStyle = "#d9494d";
  ctx.lineWidth = 5;
  roundRect(ctx, -70, -22, 140, 44, 8);
  ctx.stroke();
  ctx.fillStyle = "#d9494d";
  ctx.textAlign = "center";
  ctx.font = "900 26px Arial";
  ctx.fillText("SAH", 0, 4);
  ctx.font = "900 11px Arial";
  ctx.fillText("SEUMUR HIDUP", 0, 20);
  ctx.restore();
  ctx.textAlign = "left";
}

function drawQrToCanvas(ctx, value, x, y, size) {
  const matrix = createQrMatrix(value);
  drawBox(ctx, x, y, size, size, "#f7fcff", "#99bdd4", 8);
  const quiet = 4;
  const module = (size - quiet * 2) / matrix.length;
  ctx.fillStyle = "#15212b";
  matrix.forEach((row, yy) => {
    row.forEach((on, xx) => {
      if (on) ctx.fillRect(x + quiet + xx * module, y + quiet + yy * module, Math.ceil(module), Math.ceil(module));
    });
  });
}

async function drawSeal(ctx, x, y) {
  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.translate(x, y);
  ctx.rotate(-0.14);
  await drawFallbackImage(ctx, "stempel-small.png", -46, -46, 91, 91, 0);
  ctx.restore();
}

function drawSignature(ctx, text, x, y) {
  ctx.fillStyle = "#6742d9";
  ctx.font = "italic 34px 'Segoe Script', cursive";
  ctx.textAlign = "left";
  const maxWidth = 210;
  let signature = String(text || "");
  while (signature.length > 2 && ctx.measureText(signature).width > maxWidth) {
    signature = signature.slice(0, -1);
  }
  ctx.fillText(signature, x, y);
}

function drawSmallDetail(ctx, label, value, x, y, width) {
  drawBox(ctx, x, y, width, 30, "rgba(217,218,244,0.55)", "#ac9ded", 6, 1);
  ctx.fillStyle = "#35526e";
  ctx.font = "900 11px Arial";
  ctx.fillText(`${label}:`, x + 8, y + 19);
  ctx.fillStyle = "#172433";
  ctx.font = "800 11px Arial";
  wrapText(ctx, String(value), x + 110, y + 19, width - 118, 13, 1);
}

function drawStat(ctx, stat, x, y, width) {
  ctx.fillStyle = "#35526e";
  ctx.font = "900 13px Arial";
  ctx.fillText(stat.name, x, y);
  ctx.fillText(String(stat.value), x + width - 28, y);
  roundRect(ctx, x, y + 7, width, 7, 5);
  ctx.fillStyle = "#c7d8e4";
  ctx.fill();
  roundRect(ctx, x, y + 7, width * stat.value / 100, 7, 5);
  ctx.fillStyle = stat.color;
  ctx.fill();
}

function drawBox(ctx, x, y, width, height, fill, accent, radius = 8, lineWidth = 0) {
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = accent;
    ctx.stroke();
  } else if (accent) {
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 6, height);
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || "").split(/\s+/);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = word;
      if (lines >= maxLines) return;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y);
}

async function drawFallbackImage(ctx, src, x, y, width, height, radius = 0) {
  try {
    const image = await loadImage(new URL(src, window.location.href).href);
    ctx.save();
    if (radius) {
      roundRect(ctx, x, y, width, height, radius);
      ctx.clip();
    }
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
    if (radius) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#29435c";
      roundRect(ctx, x, y, width, height, radius);
      ctx.stroke();
    }
  } catch (error) {
    drawBox(ctx, x, y, width, height, "#ffffff", "#29435c", radius, 3);
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

renderProfile(activeProfile);
fitMobileCard();
