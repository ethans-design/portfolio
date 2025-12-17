const img = document.getElementById("pokeImg");
const guess = document.getElementById("guess");
const msg = document.getElementById("msg");
const scoreEl = document.getElementById("score");

const newBtn = document.getElementById("newBtn");
const checkBtn = document.getElementById("checkBtn");
const revealBtn = document.getElementById("revealBtn");

let answer = "";
let answerId = 0;
let revealed = false;
let score = 0;

function say(text){
  msg.textContent = text;
}

function clean(s){
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function setSilhouette(on){
  img.style.filter = on ? "brightness(0) contrast(200%)" : "none";
}

async function loadPokemon(){
  revealed = false;
  say("loading…");
  guess.value = "";
  guess.focus();

  checkBtn.disabled = true;
  revealBtn.disabled = true;

  const id = Math.floor(Math.random() * 649) + 1;

  try{
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await res.json();

    answer = data.name;
    answerId = data.id;

    const art =
      data.sprites.other["official-artwork"].front_default ||
      data.sprites.front_default;

    img.src = art;
    img.alt = "mystery pokémon";

    setSilhouette(true);
    say("who is it?");

    checkBtn.disabled = false;
    revealBtn.disabled = false;
  } catch {
    say("couldn’t load. try again.");
  }
}

function check(){
  if (revealed) return;

  const g = clean(guess.value);
  if (!g){
    say("type a guess first.");
    return;
  }

  if (g === clean(answer)){
    setSilhouette(false);
    revealed = true;

    score++;
    scoreEl.textContent = score;

    say(`correct! it’s ${answer}.`);
  } else {
    say("nope. try again.");
  }
}

function reveal(){
  // 🔁 RESET SCORE ON REVEAL
  score = 0;
  scoreEl.textContent = score;

  setSilhouette(false);
  revealed = true;
  say(`it’s ${answer}! (#${answerId})`);
}

newBtn.addEventListener("click", loadPokemon);
checkBtn.addEventListener("click", check);
revealBtn.addEventListener("click", reveal);

guess.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !checkBtn.disabled) check();
});

loadPokemon();
