"use strict";

// 像素音乐馆：本地歌曲播放 + Web Audio 频谱 + Canvas 动态像素风景。
// 本页不向任何服务器上传或保存你选择的歌曲。
const audio = document.querySelector("#audio");
const fileInput = document.querySelector("#fileInput");
const playlistEl = document.querySelector("#playlist");
const trackTitle = document.querySelector("#trackTitle");
const trackSubtitle = document.querySelector("#trackSubtitle");
const statusText = document.querySelector("#statusText");
const playBtn = document.querySelector("#playBtn");
const prevBtn = document.querySelector("#prevBtn");
const nextBtn = document.querySelector("#nextBtn");
const seek = document.querySelector("#seek");
const volume = document.querySelector("#volume");
const timeCurrent = document.querySelector("#timeCurrent");
const timeTotal = document.querySelector("#timeTotal");
const vinyl = document.querySelector("#vinyl");
const waveSymbol = document.querySelector(".wave-symbol");
const trackCount = document.querySelector("#trackCount");
const sceneLabel = document.querySelector("#sceneLabel");
const canvas = document.querySelector("#mvCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const W = canvas.width, H = canvas.height;
ctx.imageSmoothingEnabled = false;
document.querySelector("#year").textContent = new Date().getFullYear();

const NORMAL_PLAYBACK_RATE = 1;
const sceneNames = {city:"01 // 霓虹夜城", ocean:"02 // 落日海岸", forest:"03 // 星夜森林"};
const sceneNamesList = ["city", "ocean", "forest"];
let scene = "city";
let tracks = [];
let currentIndex = -1;
let audioContext, analyser, frequencyData;
let energy = 0;

function enforceNormalPlaybackRate() {
  if (audio.defaultPlaybackRate !== NORMAL_PLAYBACK_RATE) {
    audio.defaultPlaybackRate = NORMAL_PLAYBACK_RATE;
  }
  if (audio.playbackRate !== NORMAL_PLAYBACK_RATE) {
    audio.playbackRate = NORMAL_PLAYBACK_RATE;
  }
}

function updateDurationDisplay() {
  timeTotal.textContent = formatTime(audio.duration);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const n = Math.floor(Math.max(0, seconds));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2,"0")}`;
}

function updatePlayUI() {
  const playing = !audio.paused && !audio.ended && Boolean(audio.src);
  playBtn.textContent = playing ? "⏸" : "▶";
  playBtn.setAttribute("aria-label", playing ? "暂停" : "播放");
  vinyl.classList.toggle("spinning", playing);
  waveSymbol.classList.toggle("playing", playing);
  statusText.textContent = playing ? "PIXEL WORLD · ON AIR" : "PIXEL WORLD · STANDBY";
  renderPlaylist();
}

function renderPlaylist() {
  playlistEl.replaceChildren();
  trackCount.textContent = String(tracks.length);
  if (tracks.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-list";
    const note = document.createElement("span"); note.className="empty-note"; note.textContent="♫";
    const strong = document.createElement("strong"); strong.textContent="还没有歌曲";
    const hint = document.createElement("span"); hint.textContent="点击上方按钮，挑选你的音乐";
    li.append(note,strong,hint);
    playlistEl.append(li);
    return;
  }
  tracks.forEach((track, i) => {
    const li = document.createElement("li");
    li.className = `track-item${i === currentIndex ? " current" : ""}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "track-button";
    button.setAttribute("aria-label", `播放 ${track.title}`);
    const num = document.createElement("span"); num.className="track-num";
    num.textContent = i === currentIndex && !audio.paused ? "♫" : String(i+1).padStart(2,"0");
    const title = document.createElement("span"); title.className="track-file"; title.textContent=track.title;
    const suffix = document.createElement("span"); suffix.className="track-suffix"; suffix.textContent= i === currentIndex ? "●" : "↗";
    button.append(num,title,suffix);
    button.addEventListener("click", () => { void playTrack(i); });
    li.append(button);
    playlistEl.append(li);
  });
}

function selectScene(next) {
  if (!(next in sceneNames)) return;
  scene = next;
  sceneLabel.textContent = sceneNames[next];
  document.querySelectorAll(".scene-option").forEach(button => {
    const active = button.dataset.scene === next;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

document.querySelectorAll(".scene-option").forEach(button => {
  button.addEventListener("click", () => selectScene(button.dataset.scene));
});

function ensureAudioGraph() {
  if (audioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return; // 旧浏览器仍可播放，只是无法音频响应
  audioContext = new AudioContextClass();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.8;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
}

async function startPlayback() {
  if (!audio.src) { fileInput.click(); return; }
  try {
    ensureAudioGraph();
    if (audioContext && audioContext.state === "suspended") await audioContext.resume();
    await audio.play();
  } catch (err) {
    console.error("播放失败：", err);
    trackSubtitle.textContent = "无法播放这个音频格式，请尝试 MP3 或 WAV。";
  }
  updatePlayUI();
}

async function playTrack(index) {
  if (index < 0 || index >= tracks.length) return;
  if (currentIndex !== index) {
    currentIndex = index;
    audio.src = tracks[index].url;
    audio.load();
    trackTitle.textContent = tracks[index].title;
    trackSubtitle.textContent = "正在播放你选择的本地音乐 · 点击右侧可切换场景";
    selectScene(tracks[index].scene);
    seek.value = 0;
    timeCurrent.textContent = "0:00";
  }
  renderPlaylist();
  await startPlayback();
}

fileInput.addEventListener("change", () => {
  const selected = Array.from(fileInput.files || []);
  const usable = selected.filter(f => f.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|aac|flac|opus)$/i.test(f.name));
  if (!usable.length) {
    if (selected.length) trackSubtitle.textContent = "请选择常见音频格式，例如 MP3 或 WAV。";
    fileInput.value = "";
    return;
  }
  const firstNewIndex = tracks.length;
  usable.forEach((file, i) => {
    tracks.push({title:file.name.replace(/\.[^.]+$/, ""), url:URL.createObjectURL(file), scene:sceneNamesList[(firstNewIndex + i) % 3]});
  });
  renderPlaylist();
  fileInput.value = ""; // 允许再次选择同一首歌
  if (currentIndex < 0) void playTrack(firstNewIndex);
});

playBtn.addEventListener("click", () => {
  if (audio.paused) { void startPlayback(); }
  else audio.pause();
});
prevBtn.addEventListener("click", () => { if (tracks.length) void playTrack((currentIndex - 1 + tracks.length) % tracks.length); });
nextBtn.addEventListener("click", () => { if (tracks.length) void playTrack((currentIndex + 1) % tracks.length); });
audio.addEventListener("ended", () => { if (tracks.length) void playTrack((currentIndex + 1) % tracks.length); });
audio.addEventListener("play", updatePlayUI);
audio.addEventListener("pause", updatePlayUI);
audio.addEventListener("loadedmetadata", () => { timeTotal.textContent = formatTime(audio.duration); });
audio.addEventListener("timeupdate", () => {
  timeCurrent.textContent = formatTime(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration > 0) seek.value = String(Math.round(audio.currentTime / audio.duration * 1000));
});
audio.addEventListener("error", () => {trackSubtitle.textContent = "音频加载失败，请更换一个受支持的文件。";updatePlayUI();});
seek.addEventListener("input", () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number(seek.value) / 1000 * audio.duration;
});
volume.addEventListener("input", () => { audio.volume = Number(volume.value) / 100; });
audio.volume = Number(volume.value) / 100;
document.addEventListener("keydown", event => {
  const el = document.activeElement;
  if (event.code === "Space" && !["INPUT","BUTTON","TEXTAREA","SELECT"].includes(el?.tagName)) {
    event.preventDefault();
    if (audio.paused) void startPlayback(); else audio.pause();
  }
});
window.addEventListener("pagehide", () => { tracks.forEach(track => URL.revokeObjectURL(track.url)); });

// --------------------- Canvas 像素 MV ---------------------
// 画布的逻辑尺寸为 320×180，CSS 拉伸后保持像素块清晰。
function rect(x,y,w,h,color) {
  if (w<=0 || h<=0) return;
  ctx.fillStyle=color;
  ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));
}
function pixelCircle(x,y,r,color) {
  for(let yy=-r; yy<=r; yy+=2) for(let xx=-r; xx<=r; xx+=2)
    if(xx*xx+yy*yy <= r*r) rect(x+xx,y+yy,2,2,color);
}
function hash(n) { const v=Math.sin(n*78.233+19.91)*43758.5453; return v-Math.floor(v); }
function sky(bands) {for(let i=0;i<bands.length;i++) rect(0,i*H/bands.length,W,Math.ceil(H/bands.length)+1,bands[i]);}
function stars(t,color="#dbe5ff", n=40) {
  for(let i=0;i<n;i++) {
    const x=Math.floor(hash(i+37)*W), y=Math.floor(hash(i+99)*100)+5;
    const twinkle=(Math.sin(t*(.8+hash(i)*2)+i*7)>0.5);
    rect(x,y,twinkle?2:1,twinkle?2:1,color);
  }
}
function skyline(t,power) {
  // 背景城市剪影
  for(let i=0;i<27;i++) {
    const x=i*13-5, height=23+Math.floor(hash(i+51)*53);
    rect(x,132-height,13,height,i%3===0?"#242d60":"#1a2553");
    for(let yy=137-height;yy<125;yy+=9) for(let xx=x+3;xx<x+12;xx+=5)
      if(hash(i*31+yy*3+xx)>.43) rect(xx,yy,2,3,hash(i+yy)>.6?"#f6a1dc":"#6ac5d1");
  }
  // 近景楼宇
  for(let i=0;i<15;i++) {
    const x=i*25-6, height=24+Math.floor(hash(i+160)*44);
    rect(x,147-height,24,height,"#101a3e");
    rect(x,147-height,24,2,"#373f83");
    for(let yy=153-height;yy<141;yy+=8) for(let xx=x+5;xx<x+21;xx+=7)
      if(hash(i*57+yy+xx)>.27) rect(xx,yy,3,3,(Math.sin(t*1.8+i+xx+yy)+power*5)>1.3?"#ffd58a":"#e38bb8");
  }
  rect(0,147,W,3,"#653b7d");
  rect(0,150,W,30,"#111a3b");
  for(let k=0;k<18;k++) {const x=(k*23+Math.floor(t*10))%W;rect(x,159+((k%3)*5),10,1,"#29376b");}
  // 慢慢穿过街道的像素车
  const carX=((t*23)%(W+58))-44;
  rect(carX,151,35,10,"#ee83b3");rect(carX+7,146,20,6,"#8bcadd");
  rect(carX+3,162,6,3,"#0a1025");rect(carX+25,162,6,3,"#0a1025");
  rect(carX+31,154,5,3,"#fce59f");
}
function drawCity(t,power) {
  sky(["#111432","#17173c","#1e1b4d","#29215a","#423067","#432f70","#42336c","#2e2a59","#22254f"]);
  stars(t,"#e7baf5",55);
  pixelCircle(256,37,13+Math.floor(power*2),"#f2c1e3");
  pixelCircle(261,33,13,"#28224f"); // 新月
  // 缓慢移动的像素云
  for(let i=0;i<3;i++) { const x=((i*115+t*(4+i*1.8))%(W+80))-60;rect(x,55+i*16,40,5,"#34316a");rect(x+11,51+i*16,25,6,"#34316a"); }
  skyline(t,power);
}
function drawOcean(t,power) {
  sky(["#281c55","#40255c","#613269","#963e72","#cc5c78","#e98376","#f7aa75","#f7bb7b","#f3ac72"]);
  // 风景的像素太阳，跟随低频轻微呼吸
  pixelCircle(236,72,20+Math.floor(power*4),"#ffd69b");
  rect(0,113,W,2,"#ffca8f");
  // 岛屿剪影
  for(let i=0;i<24;i++) { let x=i*15;let h=Math.floor(hash(i+108)*20);rect(x,113-h,16,h+2,"#614167"); }
  // 海面和移动的像素波浪
  rect(0,116,W,64,"#493c7f");rect(0,127,W,53,"#403b74");rect(0,151,W,29,"#302f69");
  for(let i=0;i<35;i++) {
    const x=((hash(i+21)*350+Math.floor(t*(4+i%3)))%370)-20;
    const y=119+(i%11)*5;
    rect(x,y,6+(i%4)*6,1+(i%3===0?1:0), i%4===0?"#ffc38f":i%3===0?"#b382ae":"#8474b9");
  }
  // 阳光在水面的破碎倒影
  for(let i=0;i<10;i++) {
    const w=8+Math.round((i+1)*1.8)+power*10;
    rect(236-w/2+Math.sin(t+i)*3,119+i*5,w,2,"#ffa78e");
  }
}
function tree(x,ground,size,c1,c2) {
  rect(x-2,ground-size*.1,4,size*.17,"#533d5e");
  for(let l=0;l<3;l++) {
    const w=size*(.3+l*.12), y=ground-size*.92+l*size*.2;
    for(let k=0;k<6;k++) { const ww=w*(k+1)/6; rect(x-ww,y+k*size*.035,ww*2,Math.ceil(size*.035)+1,l%2?c1:c2); }
  }
}
function drawForest(t,power) {
  sky(["#091c31","#0c273d","#123447","#194354","#1d4e58","#1c4f55","#1c4750","#20494b","#214c4b"]);
  stars(t,"#b9fcdd",48);
  pixelCircle(250,42,15+Math.floor(power*2),"#cbf8d4");
  // 几层树林提供景深
  for(let i=0;i<13;i++) tree(i*29-10,137,37+hash(i+22)*22,"#215c56","#276a63");
  rect(0,142,W,38,"#173e45");
  for(let i=0;i<11;i++) tree(i*36-9,181,47+hash(i+125)*23,"#0d343a","#165049");
  // 萤火虫闪烁并沿着缓慢曲线运动
  for(let i=0;i<21;i++) {
    const x=hash(i+141)*W+Math.sin(t*.4+i)*7;
    const y=92+hash(i+245)*74+Math.cos(t*.7+i*2)*5;
    if(Math.sin(t*2+i*2.3)+power*2>-.15) rect(x,y,2,2,i%3===0?"#efffa5":"#89f7c1");
  }
}
function spectrumEnergy() {
  let bass=0;
  if (analyser && frequencyData && !audio.paused) {
    analyser.getByteFrequencyData(frequencyData);
    for(let i=1;i<20;i++) bass += frequencyData[i];
    bass=bass/(19*255);
  }
  energy += (bass-energy)*0.18;
  return energy;
}
function musicBars(t,power) {
  const count=28, barW=4, gap=2, groupW=count*(barW+gap);
  const x0=(W-groupW)/2;
  for(let i=0;i<count;i++) {
    let level;
    if (analyser && !audio.paused && frequencyData) level=frequencyData[3+i*3]/255;
    else level=.12+.10*Math.abs(Math.sin(t*2+i*.38));
    const height=Math.max(2,Math.min(36,Math.floor(level*32 + power*5)));
    const x=x0+i*(barW+gap);
    rect(x,175-height,barW,height,i%3===0?"#f7a7dd":i%3===1?"#9ef8d9":"#aab5f4");
  }
}
function loop(timestamp) {
  const t=timestamp/1000;
  const power=spectrumEnergy();
  if(scene==="city") drawCity(t,power);
  else if(scene==="ocean") drawOcean(t,power);
  else drawForest(t,power);
  musicBars(t,power);
  requestAnimationFrame(loop);
}
renderPlaylist();
requestAnimationFrame(loop);
