"use strict";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBtehGB6Sc1uVlKiihIks8HChfoliNqK4",
  authDomain: "kobeitdos-ai.firebaseapp.com",
  projectId: "kobeitdos-ai",
  storageBucket: "kobeitdos-ai.firebasestorage.app",
  messagingSenderId: "983414230108",
  appId: "1:983414230108:web:16dbae3502556e47056a99"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const TABLES = Array.from({ length: 8 }, (_, index) => index + 2);
const STORAGE_KEY = "kobeitdos-class-results-v1";
const state = { name: localStorage.getItem("kobeitdos-name") || "", diagnostic: null, weakNumber: null, practice: null, game: null };
const $ = (selector) => document.querySelector(selector);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

function toast(message) {
  const element = $("#toast"); element.textContent = message; element.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove("show"), 2400);
}

function saveName() {
  const name = $("#student-name").value.trim();
  if (!name) { toast("Аты-жөніңді жазып көр 😊"); $("#student-name").focus(); return false; }
  state.name = name; localStorage.setItem("kobeitdos-name", name); toast(`Қош келдің, ${name}! 🌟`); return true;
}

function showSection(id) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  document.querySelectorAll("[data-section]").forEach((button) => button.classList.toggle("active", button.dataset.section === id));
  $("#main-nav").classList.remove("open"); $("#menu-toggle").setAttribute("aria-expanded", "false");
  if (id === "game") startGame();
  if (id === "diagnostic") renderDiagnosticIntro();
  if (id === "practice") renderPracticeIntro();
  if (id === "result") renderResult();
  if (id === "class") renderClassResult();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupLearn() {
  $("#number-picker").innerHTML = TABLES.map((n) => `<button class="number-button" data-number="${n}">${n}</button>`).join("");
  $("#number-picker").addEventListener("click", (event) => {
    const button = event.target.closest("[data-number]"); if (!button) return;
    document.querySelectorAll(".number-button").forEach((item) => item.classList.toggle("active", item === button));
    const number = Number(button.dataset.number);
    $("#learn-content").className = "panel";
    $("#learn-content").innerHTML = `<h2>🌟 ${number}-ге көбейту кестесі</h2><p>Дауыстап оқып, есте сақтауға тырыс!</p><div class="table-grid">${Array.from({ length: 10 }, (_, i) => `<div class="fact">${number} × ${i + 1} = <b>${number * (i + 1)}</b></div>`).join("")}</div>`;
  });
}

const introCard = (icon, title, text, buttonText, action) => `<div class="quiz-card empty-state"><div class="big-icon">${icon}</div><h3>${title}</h3><p>${text}</p><button class="button primary" data-action="${action}">${buttonText}</button></div>`;

function startGame() {
  state.game = { index: 0, score: 0, mistakes: [], questions: Array.from({ length: 5 }, () => [randomInt(2, 9), randomInt(2, 9)]) };
  renderQuiz("game");
}

function quizMarkup(kind, index, total, a, b, helper) {
  return `<div class="quiz-card"><div class="quiz-top"><span>${helper}</span><span>${index + 1} / ${total}</span></div><div class="progress"><span style="width:${(index / total) * 100}%"></span></div><div class="equation">${a} <span class="times">×</span> ${b} = ?</div><form class="answer-form" data-quiz="${kind}"><input inputmode="numeric" pattern="[0-9]*" aria-label="Жауап" placeholder="Жауабыңды жаз" autofocus><button class="button primary">Тексеру ✓</button></form><div class="feedback" aria-live="polite"></div></div>`;
}

function renderQuiz(kind) {
  const target = $(`#${kind}-content`); const quiz = state[kind];
  if (quiz.index >= quiz.questions.length) { finishQuiz(kind); return; }
  const [a, b] = quiz.questions[quiz.index];
  target.innerHTML = quizMarkup(kind, quiz.index, quiz.questions.length, a, b, kind === "game" ? `Ұпай: ${quiz.score} ⭐` : kind === "diagnostic" ? "Әр кестеден 2 есеп" : `${quiz.number}-ге көбейту`);
  target.querySelector("input").focus();
}

function answerQuiz(kind, answer) {
  const quiz = state[kind]; const [a, b] = quiz.questions[quiz.index]; const correct = a * b;
  if (!/^\d+$/.test(answer)) { const feedback = $(`#${kind}-content .feedback`); feedback.textContent = "⚠️ Жауапқа сан жаз."; feedback.className = "feedback bad"; return false; }
  const isCorrect = Number(answer) === correct;
  if (isCorrect) quiz.score += 1; else quiz.mistakes.push(`${a} × ${b} = ${correct}`);
  if (kind === "diagnostic") { quiz.results[a].total += 1; if (isCorrect) quiz.results[a].correct += 1; }
  const feedback = $(`#${kind}-content .feedback`); feedback.textContent = isCorrect ? "✅ Дұрыс! Жарайсың!" : `❌ Дұрыс жауап: ${correct}`; feedback.className = `feedback ${isCorrect ? "good" : "bad"}`;
  quiz.index += 1; setTimeout(() => renderQuiz(kind), 650); return true;
}

function finishQuiz(kind) {
  if (kind === "game") {
    const q = state.game; $(`#game-content`).innerHTML = `<div class="quiz-card"><div class="big-icon">🏆</div><h2>Ойын аяқталды!</h2><div class="score-stars">${"⭐".repeat(q.score)}${"☆".repeat(5 - q.score)}</div><h3>${q.score} / 5 · ${q.score * 20}%</h3>${q.mistakes.length ? `<p>Қайталап көр: <b>${q.mistakes.join(", ")}</b></p>` : "<p>Барлық есеп дұрыс! Керемет!</p>"}<button class="button primary" data-action="start-game">Қайта ойнау 🔄</button></div>`; return;
  }
  if (kind === "diagnostic") {
    const percentages = {}; TABLES.forEach((n) => { const row = state.diagnostic.results[n]; percentages[n] = Math.round(row.correct / row.total * 100); });
    state.diagnostic.percentages = percentages; state.weakNumber = TABLES.reduce((weak, n) => percentages[n] < percentages[weak] ? n : weak, TABLES[0]);
    const weak = state.weakNumber;
    $("#diagnostic-content").innerHTML = `<div class="report"><div class="big-icon">🎉</div><h2>Диагностика аяқталды!</h2><div class="result-grid">${resultTiles(percentages)}</div><div class="weak-callout"><b>🤖 KobeitDos AI анықтады:</b><br>Саған <b>${weak}-ге көбейтуді</b> көбірек жаттықтыру керек.</div><button class="button primary" data-action="go-practice">Жеке жаттығуға өту 🎯</button></div>`; return;
  }
  const q = state.practice; const after = q.score * 20; const before = state.diagnostic.percentages[q.number];
  state.practice = { ...q, before, after, change: after - before, completedAt: new Date().toISOString() }; saveStudentResult();
  $("#practice-content").innerHTML = `<div class="quiz-card"><div class="big-icon">🎉</div><h2>Жеке жаттығу аяқталды!</h2><h3>${q.number}-ге көбейту</h3><div class="comparison"><div class="compare-card">Диагностика<strong>${before}%</strong></div><span>➜</span><div class="compare-card">Жаттығудан кейін<strong>${after}%</strong></div></div><p class="change">${after > before ? `📈 Нәтижең ${after - before}% жақсарды!` : after === before ? "➡️ Нәтижең тұрақты. Тағы жаттығып көр!" : "💪 Бұл кестені тағы қайталап көрейік."}</p><button class="button primary" data-action="show-result">Нәтижемді көру 📊</button></div>`;
}

function renderDiagnosticIntro() {
  if (state.diagnostic?.percentages) return;
  $("#diagnostic-content").innerHTML = introCard("🧠", "Дайынсың ба?", "2-ден 9-ға дейінгі әр кестеден 2 есеп — барлығы 16 сұрақ. Соңында AI әлсіз кестеңді анықтайды.", "Диагностиканы бастау", "start-diagnostic");
}
function startDiagnostic() {
  if (!state.name && !saveName()) { showSection("home"); return; }
  const questions = shuffle(TABLES.flatMap((n) => Array.from({ length: 2 }, () => [n, randomInt(2, 9)])));
  state.diagnostic = { index: 0, score: 0, mistakes: [], questions, results: Object.fromEntries(TABLES.map((n) => [n, { correct: 0, total: 0 }])) }; state.weakNumber = null; state.practice = null; renderQuiz("diagnostic");
}
function renderPracticeIntro() {
  if (!state.diagnostic?.percentages) { $("#practice-content").innerHTML = introCard("🔒", "Алдымен диагностикадан өт", "AI саған лайық жаттығуды ұсыну үшін қай кестеде қиналатыныңды анықтауы керек.", "Диагностикаға өту", "go-diagnostic"); return; }
  $("#practice-content").innerHTML = introCard("🎯", `${state.weakNumber}-ге көбейтуді жаттықтырамыз`, "Саған арнайы дайындалған 5 есепті шығар. Кейін нәтижеңді диагностикамен салыстырамыз.", "Жаттығуды бастау", "start-practice");
}
function startPractice() {
  const n = state.weakNumber; state.practice = { index: 0, score: 0, mistakes: [], number: n, questions: Array.from({ length: 5 }, () => [n, randomInt(2, 9)]) }; renderQuiz("practice");
}
function resultTiles(percentages) { return TABLES.map((n) => `<div class="result-tile"><header><span>${n}-ге көбейту</span><b>${percentages[n]}%</b></header><div class="bar"><span style="width:${percentages[n]}%"></span></div><small>${percentages[n] === 100 ? "🌟 Өте жақсы" : percentages[n] >= 50 ? "👍 Жақсы" : "📚 Жаттығу керек"}</small></div>`).join(""); }

function renderResult() {
  if (!state.diagnostic?.percentages) { $("#result-content").innerHTML = `<div class="panel empty-state"><div class="big-icon">📋</div><h3>Әзірге нәтиже жоқ</h3><p>Жеке есебіңді көру үшін диагностикадан өт.</p><button class="button primary" data-action="go-diagnostic">Диагностикаға өту</button></div>`; return; }
  const practice = state.practice?.after !== undefined ? `<div class="comparison"><div class="compare-card">Диагностика<strong>${state.practice.before}%</strong></div><span>➜</span><div class="compare-card">Жаттығудан кейін<strong>${state.practice.after}%</strong></div></div><div class="ai-callout">🤖 ${state.practice.change > 0 ? `Тамаша! Нәтижең <b>${state.practice.change}%</b>-ға жақсарды.` : "Күн сайын қысқа жаттығу жасап, біліміңді бекіт."}</div>` : `<div class="ai-callout">🎯 Әлсіз кестеңе жеке жаттығудан өтсең, бастапқы және кейінгі нәтижеңді салыстырамыз.</div>`;
  $("#result-content").innerHTML = `<div class="report"><h2>👤 ${escapeHtml(state.name || "Оқушы")}</h2><p>Көбейту кестелері бойынша нәтиже</p><div class="result-grid">${resultTiles(state.diagnostic.percentages)}</div><div class="weak-callout">Назар аударатын кесте: <b>${state.weakNumber}-ге көбейту</b></div>${practice}</div>`;
}

function getRecords() { try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(data) ? data : []; } catch { return []; } }
function saveStudentResult() {
  if (!state.practice || !state.name) return; const records = getRecords();
  records.push({ name: state.name, weak: state.practice.number, before: state.practice.before, after: state.practice.after, change: state.practice.change, date: state.practice.completedAt }); localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function renderClassResult() {
  const records = getRecords(); if (!records.length) { $("#class-content").innerHTML = `<div class="panel empty-state"><div class="big-icon">📂</div><h3>Әзірге сақталған нәтиже жоқ</h3><p>Оқушылар диагностика мен жеке жаттығуды аяқтағанда, сынып есебі осында жиналады.</p></div>`; return; }
  const avg = (key) => records.reduce((sum, item) => sum + Number(item[key]), 0) / records.length;
  const weakCounts = records.reduce((all, item) => ({ ...all, [item.weak]: (all[item.weak] || 0) + 1 }), {}); const hardest = Object.keys(weakCounts).sort((a, b) => weakCounts[b] - weakCounts[a])[0]; const improved = records.filter((item) => item.change > 0).length;
  $("#class-content").innerHTML = `<div class="report"><div class="stats-grid"><div class="stat"><span>👥 Оқушы нәтижесі</span><strong>${records.length}</strong></div><div class="stat"><span>🧠 Бастапқы орташа</span><strong>${avg("before").toFixed(1)}%</strong></div><div class="stat"><span>🎯 Жаттығудан кейін</span><strong>${avg("after").toFixed(1)}%</strong></div><div class="stat"><span>📈 Орташа өзгеріс</span><strong>${avg("change") >= 0 ? "+" : ""}${avg("change").toFixed(1)}%</strong></div></div><div class="weak-callout">🎯 Ең жиі әлсіз кесте: <b>${hardest}-ге көбейту</b> · 🌟 Нәтижесі жақсарған: <b>${improved} / ${records.length}</b></div><div class="table-scroll"><table class="class-table"><thead><tr><th>Оқушы</th><th>Әлсіз кесте</th><th>Бастапқы</th><th>Кейін</th><th>Өзгеріс</th></tr></thead><tbody>${records.map((r) => `<tr><td>👤 ${escapeHtml(r.name)}</td><td>${r.weak}-ге</td><td>${r.before}%</td><td>${r.after}%</td><td><span class="pill">${r.change > 0 ? "+" : ""}${r.change}%</span></td></tr>`).join("")}</tbody></table></div><div class="ai-callout">🤖 KobeitDos AI қорытындысы: сыныптың орташа нәтижесі <b>${Math.abs(avg("change")).toFixed(1)}%</b>${avg("change") >= 0 ? "-ға өскен" : "-ға төмендеген"}. <b>${hardest}-ге көбейтуге</b> қосымша көңіл бөліңіз.</div></div>`;
}

document.addEventListener("click", (event) => {
  const section = event.target.closest("[data-section]"); if (section) { event.preventDefault(); showSection(section.dataset.section); return; }
  const action = event.target.closest("[data-action]")?.dataset.action;
  ({ "start-game": startGame, "start-diagnostic": startDiagnostic, "go-diagnostic": () => showSection("diagnostic"), "go-practice": () => showSection("practice"), "start-practice": startPractice, "show-result": () => showSection("result") }[action] || (() => {}))();
});
document.addEventListener("submit", (event) => { const form = event.target.closest("[data-quiz]"); if (!form) return; event.preventDefault(); const input = form.querySelector("input"); if (answerQuiz(form.dataset.quiz, input.value.trim())) { input.disabled = true; form.querySelector("button").disabled = true; } });
$("#save-name").addEventListener("click", saveName); $("#student-name").addEventListener("keydown", (event) => { if (event.key === "Enter") saveName(); });
$("#menu-toggle").addEventListener("click", () => { const open = $("#main-nav").classList.toggle("open"); $("#menu-toggle").setAttribute("aria-expanded", String(open)); });
$("#student-name").value = state.name; setupLearn(); startGame(); renderDiagnosticIntro(); renderPracticeIntro();
