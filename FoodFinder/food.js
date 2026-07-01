// Food Finder — scores a food database against your answers, explains why each
// pick fits, and can pull real nearby restaurants from OpenStreetMap (no API key).

// ---------------------------------------------------------------------------
// FOOD DATABASE
// diets: v = vegetarian-friendly, vg = vegan-friendly, gf = gluten-free-friendly,
// h = commonly halal-available. cuisine = OSM cuisine tag regex for nearby search.
// ---------------------------------------------------------------------------
function food(name, emoji, opts) {
  return { name, emoji, ...opts };
}

const FOODS = [
  food("Pizza", "🍕", {
    cuisine: "pizza",
    moods: ["comfort", "safe", "indulgent"], situations: ["quick", "group", "takeout", "solo"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner", "latenight"],
    hunger: ["normal", "starving"], health: 1, diets: ["v"],
    dishes: ["a classic margherita — the true test of any pizza place", "pepperoni with hot honey", "a detroit-style square if they have it"],
    tip: "Skip the big chains — look for a spot that does wood-fired or New York slices.",
  }),
  food("Smash Burgers", "🍔", {
    cuisine: "burger",
    moods: ["comfort", "safe", "indulgent"], situations: ["quick", "group", "takeout", "solo"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner", "latenight"],
    hunger: ["normal", "starving"], health: 1, diets: [],
    dishes: ["a double smash with grilled onions", "crispy fries — judge the place by them", "a shake if you're going all in"],
    tip: "Thin crispy-edged patties beat thick pub burgers — look for 'smash' on the menu.",
  }),
  food("BBQ", "🍖", {
    cuisine: "bbq|barbecue",
    moods: ["comfort", "indulgent"], situations: ["sitdown", "group"],
    budgets: ["medium", "expensive"], meals: ["lunch", "dinner"],
    hunger: ["starving"], health: 1, diets: ["gf"],
    dishes: ["brisket — order it by the half pound", "burnt ends if they're on the board", "smoked mac & cheese on the side"],
    tip: "Good BBQ sells out. Go early, and if the line is long, that's a good sign.",
  }),
  food("Wings", "🍗", {
    cuisine: "wings|chicken",
    moods: ["comfort", "indulgent"], situations: ["quick", "group", "takeout"],
    budgets: ["cheap", "medium"], meals: ["dinner", "latenight"],
    hunger: ["normal", "starving"], health: 1, diets: ["gf"],
    dishes: ["half classic buffalo, half lemon pepper", "ranch AND blue cheese — settle the debate yourself"],
    tip: "Ask for them extra crispy. Any wing spot worth its salt will oblige.",
  }),
  food("Fried Chicken Sandwich", "🥪", {
    cuisine: "chicken|american",
    moods: ["comfort", "indulgent", "safe"], situations: ["quick", "takeout", "solo"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner", "latenight"],
    hunger: ["normal", "starving"], health: 1, diets: ["h"],
    dishes: ["the spicy version with pickles", "whatever slaw they put on it — trust them"],
    tip: "Local spots beat the chains on this one almost every time.",
  }),
  food("Ramen", "🍜", {
    cuisine: "ramen|japanese",
    moods: ["comfort", "adventurous"], situations: ["sitdown", "date", "solo"],
    budgets: ["medium"], meals: ["lunch", "dinner", "latenight"],
    hunger: ["normal", "starving"], health: 2, diets: ["v"],
    dishes: ["tonkotsu if you want rich, shoyu if you want clean", "add the ajitama (marinated egg) — always", "gyoza to start"],
    tip: "Slurping is correct technique. A good broth should coat the spoon.",
  }),
  food("Sushi", "🍣", {
    cuisine: "sushi|japanese",
    moods: ["healthy", "adventurous", "indulgent"], situations: ["sitdown", "date"],
    budgets: ["medium", "expensive"], meals: ["lunch", "dinner"],
    hunger: ["light", "normal"], health: 4, diets: ["gf"],
    dishes: ["sit at the bar and ask the chef what's freshest", "salmon nigiri as the benchmark", "a hand roll to finish"],
    tip: "Lunch specials at good sushi places are the best value in food. Same fish, half price.",
  }),
  food("Poke Bowls", "🥢", {
    cuisine: "poke|hawaiian",
    moods: ["healthy", "safe"], situations: ["quick", "solo", "takeout"],
    budgets: ["medium"], meals: ["lunch", "dinner"],
    hunger: ["light", "normal"], health: 5, diets: ["gf"],
    dishes: ["ahi tuna base, light on the sauce", "add crispy garlic and seaweed salad"],
    tip: "The fish should look glossy, not dull. If it's pre-scooped from a tub, walk.",
  }),
  food("Pho", "🍲", {
    cuisine: "vietnamese",
    moods: ["comfort", "healthy"], situations: ["sitdown", "solo", "quick"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner"],
    hunger: ["normal"], health: 4, diets: ["gf"],
    dishes: ["pho tai (rare beef) — the classic", "load it with basil, lime, and hoisin at the table", "a cà phê sữa đá to finish"],
    tip: "The best pho spots look the least fancy. Formica tables are a great sign.",
  }),
  food("Banh Mi", "🥖", {
    cuisine: "vietnamese|sandwich",
    moods: ["adventurous", "safe"], situations: ["quick", "solo", "takeout"],
    budgets: ["cheap"], meals: ["breakfast", "lunch"],
    hunger: ["light", "normal"], health: 3, diets: ["v"],
    dishes: ["grilled pork or the classic cold cut combo", "extra pickled daikon and jalapeño"],
    tip: "Under $10 and better than most $18 sandwiches. The bread should shatter a little.",
  }),
  food("Thai", "🍛", {
    cuisine: "thai",
    moods: ["adventurous", "comfort"], situations: ["sitdown", "group", "date", "takeout"],
    budgets: ["medium"], meals: ["lunch", "dinner"],
    hunger: ["normal", "starving"], health: 3, diets: ["v", "vg", "gf"],
    dishes: ["khao soi if it's on the menu — order it immediately", "pad kra pao over pad thai for the real experience", "thai iced tea"],
    tip: "Order 'thai spicy' only if you mean it. 'Medium' is the honest move.",
  }),
  food("Korean BBQ", "🥩", {
    cuisine: "korean",
    moods: ["adventurous", "indulgent"], situations: ["group", "date", "sitdown"],
    budgets: ["expensive"], meals: ["dinner"],
    hunger: ["starving"], health: 2, diets: ["gf"],
    dishes: ["galbi (marinated short rib) and pork belly", "wrap everything in lettuce with ssamjang", "the banchan refills are free — use that power"],
    tip: "Go with at least three people. All-you-can-eat spots are the move when starving.",
  }),
  food("Korean Comfort Food", "🍚", {
    cuisine: "korean",
    moods: ["comfort", "adventurous"], situations: ["sitdown", "solo", "takeout"],
    budgets: ["medium"], meals: ["lunch", "dinner", "latenight"],
    hunger: ["normal", "starving"], health: 3, diets: ["v"],
    dishes: ["kimchi jjigae with a bowl of rice", "korean fried chicken — half soy garlic, half spicy", "bibimbap in a hot stone bowl"],
    tip: "If the kimchi is homemade, everything else will be good too.",
  }),
  food("Tacos", "🌮", {
    cuisine: "mexican|taco",
    moods: ["comfort", "safe", "adventurous"], situations: ["quick", "group", "solo", "takeout", "date"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner", "latenight"],
    hunger: ["light", "normal", "starving"], health: 3, diets: ["gf"],
    dishes: ["al pastor with pineapple — the king of tacos", "corn tortillas, always doubled", "if there's a trompo (spinning spit) in view, you've found the spot"],
    tip: "The best tacos come from the places with the shortest menus.",
  }),
  food("Burritos", "🌯", {
    cuisine: "mexican|burrito",
    moods: ["comfort", "safe"], situations: ["quick", "solo", "takeout"],
    budgets: ["cheap"], meals: ["lunch", "dinner", "latenight"],
    hunger: ["starving", "normal"], health: 2, diets: ["v", "gf"],
    dishes: ["carne asada, everything on it", "get it 'wet' with sauce on top if eating in"],
    tip: "A proper burrito is a two-hands commitment. Plan accordingly.",
  }),
  food("Birria", "🫕", {
    cuisine: "mexican",
    moods: ["adventurous", "comfort", "indulgent"], situations: ["quick", "group", "takeout"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner"],
    hunger: ["normal", "starving"], health: 2, diets: [],
    dishes: ["quesabirria tacos with consommé for dipping", "don't skip the dip — that's the whole point"],
    tip: "If a truck specializes in birria only, get in line.",
  }),
  food("Mediterranean", "🧆", {
    cuisine: "mediterranean|greek|falafel|kebab",
    moods: ["healthy", "safe", "adventurous"], situations: ["quick", "sitdown", "date", "takeout"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner"],
    hunger: ["light", "normal"], health: 5, diets: ["v", "vg", "gf", "h"],
    dishes: ["a mixed shawarma plate over rice", "falafel with extra tahini", "fresh pita — if it comes warm, you won"],
    tip: "The best value-to-quality ratio in the game. Halal carts count and are elite.",
  }),
  food("Greek", "🥙", {
    cuisine: "greek",
    moods: ["healthy", "safe"], situations: ["sitdown", "date", "quick"],
    budgets: ["medium"], meals: ["lunch", "dinner"],
    hunger: ["normal"], health: 5, diets: ["v", "gf", "h"],
    dishes: ["a proper gyro with real pork or lamb off the spit", "greek salad with a full slab of feta", "saganaki (flaming cheese) if you're sitting down"],
    tip: "Look for the place that whitewashes its walls and doesn't translate half the menu.",
  }),
  food("Indian", "🍛", {
    cuisine: "indian",
    moods: ["adventurous", "comfort"], situations: ["sitdown", "group", "date", "takeout"],
    budgets: ["medium"], meals: ["lunch", "dinner"],
    hunger: ["normal", "starving"], health: 3, diets: ["v", "vg", "gf", "h"],
    dishes: ["butter chicken if you're new, chana masala if you know", "garlic naan — order two, you'll fight over one", "a mango lassi"],
    tip: "Lunch buffets are the low-risk way to find your favorites.",
  }),
  food("Chinese (Sichuan)", "🥡", {
    cuisine: "chinese|sichuan",
    moods: ["adventurous", "comfort", "indulgent"], situations: ["group", "sitdown", "takeout"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner", "latenight"],
    hunger: ["normal", "starving"], health: 2, diets: ["v"],
    dishes: ["mapo tofu and dan dan noodles", "cumin lamb if you eat meat", "expect the numbing tingle — that's the málà, it's supposed to do that"],
    tip: "If the menu has a separate 'authentic' section, order exclusively from it.",
  }),
  food("Dumplings", "🥟", {
    cuisine: "chinese|dumpling",
    moods: ["comfort", "adventurous"], situations: ["quick", "sitdown", "date", "solo"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner"],
    hunger: ["light", "normal"], health: 3, diets: ["v"],
    dishes: ["xiao long bao (soup dumplings) — bite, sip, then eat", "pan-fried pork and chive", "black vinegar with fresh ginger for dipping"],
    tip: "Handmade wrappers are non-negotiable. Look for someone folding in the window.",
  }),
  food("Japanese Curry", "🍛", {
    cuisine: "japanese",
    moods: ["comfort", "safe"], situations: ["quick", "solo", "sitdown"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner"],
    hunger: ["normal", "starving"], health: 2, diets: ["v"],
    dishes: ["katsu curry — crispy pork cutlet over rice", "spice level 3 out of 5 is the sweet spot"],
    tip: "The most underrated comfort food on earth. Deeply reliable.",
  }),
  food("Italian", "🍝", {
    cuisine: "italian|pasta",
    moods: ["comfort", "safe", "indulgent"], situations: ["sitdown", "date", "group"],
    budgets: ["medium", "expensive"], meals: ["dinner"],
    hunger: ["normal", "starving"], health: 2, diets: ["v"],
    dishes: ["cacio e pepe — simple, impossible to fake", "whatever pasta is handmade that day", "tiramisu, even if you're full"],
    tip: "Short menu, daily specials, and a wine list they actually care about = the real deal.",
  }),
  food("Steakhouse", "🥩", {
    cuisine: "steak|steak_house",
    moods: ["indulgent", "safe"], situations: ["date", "sitdown"],
    budgets: ["expensive"], meals: ["dinner"],
    hunger: ["normal", "starving"], health: 2, diets: ["gf"],
    dishes: ["ribeye, medium rare — no negotiations", "creamed spinach and a proper wedge salad", "an old fashioned to start"],
    tip: "Order the cut the server actually recommends. They know what's good tonight.",
  }),
  food("Seafood", "🦞", {
    cuisine: "seafood|fish",
    moods: ["healthy", "indulgent", "adventurous"], situations: ["sitdown", "date"],
    budgets: ["medium", "expensive"], meals: ["dinner", "lunch"],
    hunger: ["normal"], health: 4, diets: ["gf"],
    dishes: ["whatever's on the fresh sheet — that's why it exists", "oysters if they list where they're from", "grilled whole fish over fillets"],
    tip: "Good seafood places smell like the ocean, not like fish. There's a difference.",
  }),
  food("French Bistro", "🥐", {
    cuisine: "french",
    moods: ["indulgent", "adventurous"], situations: ["date", "sitdown"],
    budgets: ["expensive"], meals: ["dinner"],
    hunger: ["normal"], health: 2, diets: ["v"],
    dishes: ["steak frites or duck confit", "start with the french onion soup", "split a crème brûlée"],
    tip: "The prix fixe is almost always the best value and the kitchen's best work.",
  }),
  food("Salad & Grain Bowls", "🥗", {
    cuisine: "salad|healthy",
    moods: ["healthy", "safe"], situations: ["quick", "solo", "takeout"],
    budgets: ["medium"], meals: ["lunch"],
    hunger: ["light", "normal"], health: 5, diets: ["v", "vg", "gf"],
    dishes: ["a grain bowl over a pure salad — it'll actually fill you up", "add a protein and a crunchy topping, skip creamy dressings"],
    tip: "If you're still hungry after, that's the salad's fault, not yours. Get the bigger bowl.",
  }),
  food("Vegan Kitchen", "🌱", {
    cuisine: "vegan|vegetarian",
    moods: ["healthy", "adventurous"], situations: ["sitdown", "date", "quick"],
    budgets: ["medium"], meals: ["lunch", "dinner"],
    hunger: ["light", "normal"], health: 5, diets: ["v", "vg", "gf", "h"],
    dishes: ["whatever they do with mushrooms — that's where vegan kitchens flex", "the house burger, which will surprise you"],
    tip: "Dedicated vegan spots beat 'vegan options' at regular places every time.",
  }),
  food("Middle Eastern", "🫓", {
    cuisine: "lebanese|turkish|middle_eastern|kebab",
    moods: ["healthy", "adventurous"], situations: ["sitdown", "date", "group", "takeout"],
    budgets: ["cheap", "medium"], meals: ["lunch", "dinner"],
    hunger: ["normal", "starving"], health: 4, diets: ["v", "vg", "gf", "h"],
    dishes: ["the mezze spread — hummus, baba ganoush, warm bread", "lamb kofta or a mixed grill", "baklava with tea to close"],
    tip: "Order mezze for the table and let it turn into the whole meal. No regrets.",
  }),
  food("Ethiopian", "🍽️", {
    cuisine: "ethiopian|african",
    moods: ["adventurous"], situations: ["group", "date", "sitdown"],
    budgets: ["medium"], meals: ["dinner", "lunch"],
    hunger: ["normal", "starving"], health: 4, diets: ["v", "vg", "gf", "h"],
    dishes: ["a combo platter on injera — half veggie, half meat", "doro wat (chicken stew) is the classic", "eat with your hands, it's the rule"],
    tip: "One platter feeds two. The veggie combos are some of the best vegan food anywhere.",
  }),
  food("Diner Breakfast", "🥞", {
    cuisine: "american|diner|breakfast",
    moods: ["comfort", "safe"], situations: ["sitdown", "solo", "group"],
    budgets: ["cheap", "medium"], meals: ["breakfast"],
    hunger: ["normal", "starving"], health: 2, diets: ["v"],
    dishes: ["pancakes or a proper omelette with hash browns", "bottomless coffee, obviously"],
    tip: "The older the diner, the better the hash browns. It's science.",
  }),
  food("Brunch", "🥂", {
    cuisine: "brunch|breakfast|american",
    moods: ["indulgent", "safe", "comfort"], situations: ["date", "group", "sitdown"],
    budgets: ["medium"], meals: ["breakfast", "lunch"],
    hunger: ["normal"], health: 3, diets: ["v"],
    dishes: ["eggs benedict — the true kitchen test", "something sweet for the table to split"],
    tip: "Go before 10:30 or after 1. The 11-1 window is chaos everywhere.",
  }),
  food("Bagels & Lox", "🥯", {
    cuisine: "bagel|breakfast",
    moods: ["safe", "comfort"], situations: ["quick", "solo", "takeout"],
    budgets: ["cheap"], meals: ["breakfast", "lunch"],
    hunger: ["light", "normal"], health: 3, diets: ["v"],
    dishes: ["everything bagel, scallion schmear, lox if you're living right", "toasted only if it's not fresh — a fresh bagel needs nothing"],
    tip: "If they boil their bagels, you'll taste the difference immediately.",
  }),
  food("Deli Sandwiches", "🥪", {
    cuisine: "deli|sandwich",
    moods: ["safe", "comfort"], situations: ["quick", "solo", "takeout"],
    budgets: ["cheap", "medium"], meals: ["lunch"],
    hunger: ["normal", "starving"], health: 3, diets: [],
    dishes: ["pastrami on rye with mustard — the benchmark", "half sandwich + soup combo is the smart play"],
    tip: "A deli with a line of regulars at noon never misses.",
  }),
  food("Cafe & Pastries", "☕", {
    cuisine: "cafe|coffee_shop|bakery",
    moods: ["safe", "indulgent"], situations: ["date", "solo", "quick"],
    budgets: ["cheap"], meals: ["breakfast", "lunch"],
    hunger: ["light"], health: 3, diets: ["v"],
    dishes: ["a cortado and whatever pastry came out of the oven last", "the almond croissant is usually the sleeper hit"],
    tip: "Great first-date move: low stakes, easy exit, and you learn their coffee order.",
  }),
  food("Halal Cart / Grill", "🍢", {
    cuisine: "kebab|halal|middle_eastern",
    moods: ["comfort", "safe", "adventurous"], situations: ["quick", "solo", "takeout", "latenight"],
    budgets: ["cheap"], meals: ["lunch", "dinner", "latenight"],
    hunger: ["normal", "starving"], health: 3, diets: ["h", "gf"],
    dishes: ["chicken over rice, white sauce, hot sauce — the holy trinity", "mixed lamb + chicken if you can't decide"],
    tip: "The longer the line at 1am, the better the cart. This rule has never failed.",
  }),
  food("Hot Pot", "🍲", {
    cuisine: "hot_pot|chinese",
    moods: ["adventurous", "indulgent"], situations: ["group", "date"],
    budgets: ["medium", "expensive"], meals: ["dinner"],
    hunger: ["starving"], health: 3, diets: ["v", "vg", "gf"],
    dishes: ["split broth: half spicy málà, half mild", "thin-sliced beef, fish balls, and every mushroom they have", "build a sauce at the sauce bar — sesame + garlic + scallion"],
    tip: "It's dinner and an activity at the same time. Budget two hours minimum.",
  }),
];

// ---------------------------------------------------------------------------
// STATE + CHIP CONTROLS
// ---------------------------------------------------------------------------
const state = {
  meal: detectMeal(),
  mood: "any",
  situation: "any",
  budget: "any",
  hunger: "normal",
  diets: new Set(),
  shown: new Set(),
  coords: null,
};

function detectMeal() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 16) return "lunch";
  if (h >= 16 && h < 22) return "dinner";
  return "latenight";
}

const MEAL_LABELS = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner", latenight: "late night" };

function setupSingleSelect(containerId, key, initial) {
  const chips = document.querySelectorAll(`#${containerId} .chip`);
  chips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.value === initial);
    chip.setAttribute("aria-pressed", chip.dataset.value === initial);
    chip.addEventListener("click", () => {
      state[key] = chip.dataset.value;
      chips.forEach((c) => {
        c.classList.toggle("active", c === chip);
        c.setAttribute("aria-pressed", c === chip);
      });
      if (key === "meal") document.getElementById("autoNote").textContent = "";
    });
  });
}

function setupMultiSelect(containerId, set) {
  document.querySelectorAll(`#${containerId} .chip`).forEach((chip) => {
    chip.setAttribute("aria-pressed", "false");
    chip.addEventListener("click", () => {
      const v = chip.dataset.value;
      if (set.has(v)) set.delete(v);
      else set.add(v);
      chip.classList.toggle("active", set.has(v));
      chip.setAttribute("aria-pressed", set.has(v));
    });
  });
}

setupSingleSelect("mealChips", "meal", state.meal);
setupSingleSelect("moodChips", "mood", state.mood);
setupSingleSelect("situationChips", "situation", state.situation);
setupSingleSelect("budgetChips", "budget", state.budget);
setupSingleSelect("hungerChips", "hunger", state.hunger);
setupMultiSelect("dietChips", state.diets);

document.getElementById("autoNote").textContent = `· auto-detected: ${MEAL_LABELS[state.meal]}`;

// ---------------------------------------------------------------------------
// SCORING
// ---------------------------------------------------------------------------
const DIET_KEYS = { vegetarian: "v", vegan: "vg", glutenfree: "gf", halal: "h" };

function rankFoods(excludeShown) {
  const candidates = FOODS.filter((f) => {
    // Dietary needs are hard requirements
    for (const d of state.diets) {
      if (!f.diets.includes(DIET_KEYS[d])) return false;
    }
    if (excludeShown && state.shown.has(f.name)) return false;
    return true;
  });

  const scored = candidates.map((f) => {
    let score = 0;
    const reasons = [];

    if (state.budget !== "any") {
      if (f.budgets.includes(state.budget)) {
        score += 5;
        reasons.push({ text: `fits your ${state.budget === "cheap" ? "$" : state.budget === "medium" ? "$$" : "$$$"} budget`, icon: "💸" });
      } else {
        score -= 4;
      }
    }

    if (state.mood !== "any") {
      if (f.moods.includes(state.mood)) {
        score += 4;
        const moodText = {
          comfort: "peak comfort food", healthy: "genuinely healthy",
          adventurous: "an adventurous pick", safe: "a reliable crowd-pleaser",
          indulgent: "a proper treat",
        }[state.mood];
        reasons.push({ text: moodText, icon: "🎯" });
      } else {
        score -= 2;
      }
    }

    if (state.situation !== "any") {
      if (f.situations.includes(state.situation)) {
        score += 4;
        const sitText = {
          quick: "in and out fast", sitdown: "great for a proper sit-down",
          date: "a strong date move", group: "made for groups",
          solo: "perfect solo mission", takeout: "travels well as takeout",
        }[state.situation];
        reasons.push({ text: sitText, icon: "📍" });
      } else {
        score -= 3;
      }
    }

    if (f.meals.includes(state.meal)) {
      score += 3;
      reasons.push({ text: `right for ${MEAL_LABELS[state.meal]}`, icon: "🕐" });
    } else {
      score -= 3;
    }

    if (f.hunger.includes(state.hunger)) {
      score += 2;
      if (state.hunger === "starving") reasons.push({ text: "will actually fill you up", icon: "💪" });
      if (state.hunger === "light") reasons.push({ text: "won't weigh you down", icon: "🪶" });
    }

    if (state.mood === "healthy") score += f.health;

    if (state.diets.size > 0) {
      reasons.push({ text: `solid ${[...state.diets].map(d => d.replace("glutenfree", "gluten-free")).join(" + ")} options`, icon: "✅" });
    }

    score += Math.random() * 1.5; // variety between rolls

    return { ...f, score, reasons: reasons.slice(0, 3) };
  });

  return scored.sort((a, b) => b.score - a.score);
}

function matchPercent(f) {
  // rough ceiling: budget 5 + mood 4 + situation 4 + meal 3 + hunger 2 (+health 5)
  let max = 3 + 2; // meal + hunger always scored
  if (state.budget !== "any") max += 5;
  if (state.mood !== "any") max += 4;
  if (state.situation !== "any") max += 4;
  if (state.mood === "healthy") max += 5;
  const pct = Math.round(clamp(f.score / (max + 1.5), 0.35, 0.99) * 100);
  return pct;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ---------------------------------------------------------------------------
// RESULTS UI
// ---------------------------------------------------------------------------
const result = document.getElementById("result");

document.getElementById("pickBtn").addEventListener("click", () => {
  state.shown.clear();
  showResults(false);
  result.scrollIntoView({ behavior: "smooth", block: "start" });
});

function budgetLabel(budgets) {
  const map = { cheap: "$", medium: "$$", expensive: "$$$" };
  return budgets.map((b) => map[b]).join("–");
}

function mapsQuery(f) {
  const parts = [];
  if (state.budget === "cheap") parts.push("cheap");
  if (state.budget === "expensive") parts.push("best");
  parts.push(f.name.toLowerCase());
  parts.push("restaurants near me");
  if (state.situation === "takeout") parts.push("takeout");
  return parts.join(" ");
}

function showResults(isReroll) {
  let ranked = rankFoods(true);
  if (ranked.length < 3) {
    state.shown.clear();
    ranked = rankFoods(true);
  }

  const picks = ranked.slice(0, 3);
  picks.forEach((p) => state.shown.add(p.name));

  result.classList.remove("hidden");

  if (picks.length === 0) {
    result.innerHTML = `
      <div class="result-head"><h2>hmm, nothing fits all of that</h2></div>
      <p class="no-match">Those dietary filters are strict together — try removing one and rolling again.</p>
    `;
    return;
  }

  result.innerHTML = `
    <div class="result-head">
      <h2>${isReroll ? "okay, how about these" : "your top picks"}</h2>
      <button id="rerollBtn" class="reroll" type="button">↻ show me different picks</button>
    </div>

    <div class="results-list">
      ${picks.map((f, i) => `
        <article class="food-result ${i === 0 ? "food-result--top" : ""}">
          <div class="fr-head">
            <span class="fr-emoji">${f.emoji}</span>
            <div class="fr-title">
              <div class="fr-rank-row">
                <span class="rank">#${i + 1}${i === 0 ? " · best match" : ""}</span>
                <span class="match">
                  <span class="match-bar"><span class="match-fill" style="width:${matchPercent(f)}%"></span></span>
                  ${matchPercent(f)}%
                </span>
              </div>
              <h3>${f.name} <span class="fr-budget">${budgetLabel(f.budgets)}</span></h3>
            </div>
          </div>

          ${f.reasons.length ? `
            <ul class="reasons">
              ${f.reasons.map((r) => `<li>${r.icon} ${r.text}</li>`).join("")}
            </ul>` : ""}

          <div class="order-box">
            <span class="order-label">what to order</span>
            <ul>${f.dishes.map((d) => `<li>${d}</li>`).join("")}</ul>
          </div>

          <p class="pro-tip">💡 ${f.tip}</p>

          <div class="fr-actions">
            <button class="nearby-btn" type="button" data-food="${f.name}">📍 find real spots near me</button>
            <a class="maps-link" href="https://www.google.com/maps/search/${encodeURIComponent(mapsQuery(f))}" target="_blank" rel="noopener noreferrer">
              open in google maps →
            </a>
          </div>

          <div class="nearby" data-nearby="${f.name}"></div>
        </article>
      `).join("")}
    </div>
  `;

  document.getElementById("rerollBtn").addEventListener("click", () => showResults(true));
  document.querySelectorAll(".nearby-btn").forEach((btn) => {
    btn.addEventListener("click", () => findNearby(btn.dataset.food, btn));
  });
}

// ---------------------------------------------------------------------------
// REAL NEARBY RESTAURANTS — OpenStreetMap Overpass API (free, no key)
// ---------------------------------------------------------------------------
function getCoords() {
  if (state.coords) return Promise.resolve(state.coords);
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("no geolocation"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        resolve(state.coords);
      },
      () => reject(new Error("denied")),
      { timeout: 10000, maximumAge: 600000 }
    );
  });
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function findNearby(foodName, btn) {
  const f = FOODS.find((x) => x.name === foodName);
  const box = document.querySelector(`[data-nearby="${foodName}"]`);
  if (!f || !box) return;

  btn.disabled = true;
  box.innerHTML = `<p class="nearby-status">📡 finding your location…</p>`;

  let coords;
  try {
    coords = await getCoords();
  } catch {
    box.innerHTML = `<p class="nearby-status">couldn't get your location — use the google maps link instead.</p>`;
    btn.disabled = false;
    return;
  }

  box.innerHTML = `<p class="nearby-status">🔎 searching real restaurants nearby…</p>`;

  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"restaurant|fast_food|cafe"]["cuisine"~"${f.cuisine}",i](around:5000,${coords.lat},${coords.lon});
      way["amenity"~"restaurant|fast_food|cafe"]["cuisine"~"${f.cuisine}",i](around:5000,${coords.lat},${coords.lon});
    );
    out center 30;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    const seen = new Set();
    const places = data.elements
      .map((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        const name = el.tags?.name;
        if (!name || lat == null) return null;
        return {
          name,
          dist: haversineKm(coords, { lat, lon }),
          street: el.tags["addr:street"] || "",
        };
      })
      .filter((p) => p && !seen.has(p.name) && seen.add(p.name))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);

    if (places.length === 0) {
      box.innerHTML = `<p class="nearby-status">no tagged ${f.name.toLowerCase()} spots within 5km on OpenStreetMap — the google maps link will do better here.</p>`;
    } else {
      box.innerHTML = `
        <span class="order-label">real spots near you</span>
        <ul class="nearby-list">
          ${places.map((p) => `
            <li>
              <a href="https://www.google.com/maps/search/${encodeURIComponent(p.name + " restaurant")}" target="_blank" rel="noopener noreferrer">${p.name}</a>
              <span class="nearby-meta">${p.dist < 1 ? Math.round(p.dist * 1000) + " m" : p.dist.toFixed(1) + " km"}${p.street ? " · " + p.street : ""}</span>
            </li>
          `).join("")}
        </ul>
        <p class="nearby-credit">data from OpenStreetMap</p>
      `;
    }
  } catch {
    box.innerHTML = `<p class="nearby-status">nearby search is busy right now — use the google maps link instead.</p>`;
  }

  btn.disabled = false;
}
