const img = document.getElementById("pokeImg");
const guess = document.getElementById("guess");
const msg = document.getElementById("msg");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");

const newBtn = document.getElementById("newBtn");
const checkBtn = document.getElementById("checkBtn");
const revealBtn = document.getElementById("revealBtn");
const genChips = document.querySelectorAll(".gen-chip[data-gen]");
const genAllBtn = document.getElementById("genAll");

// National dex ID ranges per generation
const GEN_RANGES = {
  1: [1, 151],
  2: [152, 251],
  3: [252, 386],
  4: [387, 493],
  5: [494, 649],
  6: [650, 721],
  7: [722, 809],
  8: [810, 905],
  9: [906, 1025],
};

let answer = "";
let answerId = 0;
let solved = false;   // current pokémon guessed correctly or revealed
let loading = false;
let streak = 0;
let best = Number(localStorage.getItem("wtp-best")) || 0;
let selectedGens = loadGens();

bestEl.textContent = best;

function loadGens() {
  try {
    const saved = JSON.parse(localStorage.getItem("wtp-gens"));
    const valid = Array.isArray(saved) ? saved.filter((g) => GEN_RANGES[g]) : [];
    if (valid.length) return new Set(valid);
  } catch {}
  return new Set(Object.keys(GEN_RANGES).map(Number));
}

function saveGens() {
  localStorage.setItem("wtp-gens", JSON.stringify([...selectedGens]));
}

function renderGens() {
  genChips.forEach((chip) => {
    const on = selectedGens.has(Number(chip.dataset.gen));
    chip.classList.toggle("active", on);
    chip.setAttribute("aria-pressed", on);
  });
  const allOn = selectedGens.size === Object.keys(GEN_RANGES).length;
  genAllBtn.classList.toggle("active", allOn);
  genAllBtn.setAttribute("aria-pressed", allOn);
}

function randomId() {
  const ranges = [...selectedGens].map((g) => GEN_RANGES[g]);
  const total = ranges.reduce((sum, [lo, hi]) => sum + (hi - lo + 1), 0);
  let r = Math.floor(Math.random() * total);
  for (const [lo, hi] of ranges) {
    const size = hi - lo + 1;
    if (r < size) return lo + r;
    r -= size;
  }
  return 1;
}

function say(text, tone) {
  msg.textContent = text;
  msg.className = tone ? `msg-${tone}` : "";
}

function clean(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/[♀]/g, "-f")
    .replace(/[♂]/g, "-m")
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function setSilhouette(on) {
  img.classList.toggle("hidden-mon", on);
}

function updateStreak(value) {
  streak = value;
  scoreEl.textContent = streak;
  if (streak > best) {
    best = streak;
    bestEl.textContent = best;
    localStorage.setItem("wtp-best", best);
  }
}

function setSolvedUI() {
  solved = true;
  newBtn.textContent = "next →";
  checkBtn.disabled = true;
  revealBtn.disabled = true;
}

async function loadPokemon() {
  if (loading) return;

  // Skipping an unsolved pokémon breaks the streak
  const skipped = answer && !solved;
  if (skipped) updateStreak(0);

  loading = true;
  solved = false;
  newBtn.textContent = "skip →";
  say(skipped ? "skipped — streak reset" : "loading…", skipped ? "bad" : "");
  guess.value = "";
  guess.focus();

  checkBtn.disabled = true;
  revealBtn.disabled = true;
  img.classList.add("loading");

  const id = randomId();

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    answer = data.name;
    answerId = data.id;

    const art =
      data.sprites.other["official-artwork"].front_default ||
      data.sprites.front_default;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = art;
    });

    img.alt = "mystery pokémon silhouette";
    setSilhouette(true);
    if (!skipped) say("who’s that pokémon?");

    checkBtn.disabled = false;
    revealBtn.disabled = false;
  } catch {
    answer = "";
    say("couldn’t reach the pokédex — try again.", "bad");
  } finally {
    loading = false;
    img.classList.remove("loading");
  }
}

function check() {
  if (solved || loading) return;

  const g = clean(guess.value);
  if (!g) {
    say("type a guess first.");
    return;
  }

  // Accept base name for forms like "giratina-altered"
  const target = clean(answer);
  if (g === target || g === target.split("-")[0]) {
    setSilhouette(false);
    setSolvedUI();
    updateStreak(streak + 1);
    img.alt = `it's ${answer}!`;
    say(`correct! it’s ${answer}. (#${answerId})`, "good");
  } else {
    say("not quite — try again.", "bad");
    guess.classList.remove("shake");
    void guess.offsetWidth; // restart animation
    guess.classList.add("shake");
  }
}

function reveal() {
  if (solved || loading) return;

  updateStreak(0);
  setSilhouette(false);
  setSolvedUI();
  img.alt = `it's ${answer}!`;
  say(`it’s ${answer}! (#${answerId}) — streak reset`, "bad");
}

genChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const gen = Number(chip.dataset.gen);
    if (selectedGens.has(gen)) {
      if (selectedGens.size === 1) return; // keep at least one
      selectedGens.delete(gen);
    } else {
      selectedGens.add(gen);
    }
    saveGens();
    renderGens();
  });
});

genAllBtn.addEventListener("click", () => {
  selectedGens = new Set(Object.keys(GEN_RANGES).map(Number));
  saveGens();
  renderGens();
});

newBtn.addEventListener("click", loadPokemon);
checkBtn.addEventListener("click", check);
revealBtn.addEventListener("click", reveal);

guess.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (solved) {
    loadPokemon();
  } else if (!checkBtn.disabled) {
    check();
  }
});

renderGens();
loadPokemon();
