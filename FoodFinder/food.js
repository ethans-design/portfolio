const foodIdeas = [
  food("Pizza", ["comfort", "safe"], ["quick", "group"], ["cheap", "medium"], ["Comfort Food"], 1),
  food("Burgers", ["comfort", "safe"], ["quick", "group"], ["cheap", "medium"], ["Comfort Food"], 1),
  food("BBQ", ["comfort"], ["sitdown", "group"], ["medium", "expensive"], ["Comfort Food"], 1),
  food("Wings", ["comfort"], ["quick", "group"], ["cheap", "medium"], ["Comfort Food"], 1),
  food("Southern", ["comfort"], ["sitdown", "group"], ["medium"], ["Comfort Food"], 1),
  food("Mac & Cheese", ["comfort"], ["quick", "sitdown"], ["cheap", "medium"], ["Comfort Food"], 1),

  food("Mediterranean", ["healthy", "safe"], ["quick", "sitdown", "date"], ["cheap", "medium"], ["Healthy"], 5),
  food("Greek", ["healthy", "safe"], ["quick", "sitdown", "date"], ["cheap", "medium"], ["Healthy"], 5),
  food("Poke Bowls", ["healthy"], ["quick", "sitdown", "date"], ["medium"], ["Healthy"], 5),
  food("Salads", ["healthy", "safe"], ["quick", "sitdown", "date"], ["cheap", "medium"], ["Healthy"], 5),
  food("Vegan", ["healthy", "adventurous"], ["quick", "sitdown", "date"], ["medium"], ["Healthy"], 5),
  food("Healthy Bowls", ["healthy", "safe"], ["quick", "sitdown", "date"], ["cheap", "medium"], ["Healthy"], 5),
  food("Smoothies", ["healthy", "safe"], ["quick"], ["cheap", "medium"], ["Healthy"], 4),

  food("Chinese", ["comfort", "safe"], ["quick", "group"], ["cheap", "medium"], ["Asian"], 2),
  food("Japanese", ["healthy", "adventurous"], ["sitdown", "date"], ["medium"], ["Asian"], 4),
  food("Sushi", ["healthy", "adventurous"], ["sitdown", "date"], ["medium", "expensive"], ["Asian", "Date Night"], 4),
  food("Ramen", ["comfort", "adventurous"], ["sitdown", "date"], ["medium"], ["Asian"], 2),
  food("Korean", ["adventurous", "comfort"], ["sitdown", "group", "date"], ["medium"], ["Asian"], 2),
  food("Korean BBQ", ["adventurous", "comfort"], ["sitdown", "group", "date"], ["expensive"], ["Asian"], 1),
  food("Thai", ["adventurous", "comfort"], ["sitdown", "group", "date"], ["medium"], ["Asian"], 3),
  food("Vietnamese", ["healthy", "adventurous"], ["quick", "sitdown", "date"], ["cheap", "medium"], ["Asian"], 4),
  food("Pho", ["healthy", "comfort"], ["quick", "sitdown", "date"], ["cheap", "medium"], ["Asian"], 4),
  food("Indian", ["adventurous", "comfort"], ["sitdown", "group", "date"], ["medium"], ["Asian"], 2),

  food("Mexican", ["comfort", "safe"], ["quick", "group"], ["cheap", "medium"], ["Latin"], 2),
  food("Tacos", ["comfort", "safe"], ["quick", "group", "date"], ["cheap", "medium"], ["Latin"], 2),
  food("Burritos", ["comfort", "safe"], ["quick"], ["cheap"], ["Latin"], 2),
  food("Tex-Mex", ["comfort", "safe"], ["quick", "group"], ["cheap", "medium"], ["Latin"], 1),
  food("Brazilian", ["adventurous"], ["sitdown", "date", "group"], ["medium", "expensive"], ["Latin"], 2),
  food("Argentinian", ["adventurous"], ["sitdown", "date"], ["expensive"], ["Latin"], 2),

  food("Sandwiches", ["safe"], ["quick"], ["cheap", "medium"], ["Casual"], 2),
  food("Deli", ["safe"], ["quick"], ["cheap", "medium"], ["Casual"], 2),
  food("Breakfast", ["comfort", "safe"], ["quick", "sitdown"], ["cheap", "medium"], ["Casual"], 2),
  food("Brunch", ["comfort", "safe"], ["sitdown", "date", "group"], ["medium"], ["Casual"], 2),
  food("Bagels", ["safe"], ["quick"], ["cheap"], ["Casual"], 2),
  food("Coffee Shop", ["safe"], ["quick", "date"], ["cheap", "medium"], ["Casual"], 2),

  food("Steakhouse", ["comfort", "safe"], ["sitdown", "date"], ["expensive"], ["Date Night"], 1),
  food("French", ["adventurous"], ["sitdown", "date"], ["expensive"], ["Date Night"], 2),
  food("Seafood", ["healthy"], ["sitdown", "date"], ["medium", "expensive"], ["Date Night"], 4),
  food("Italian", ["comfort", "safe"], ["sitdown", "date", "group"], ["medium", "expensive"], ["Date Night"], 2),

  food("Middle Eastern", ["healthy", "adventurous"], ["quick", "sitdown", "date"], ["cheap", "medium"], ["Healthy"], 5),
  food("Turkish", ["healthy", "adventurous"], ["sitdown", "date"], ["medium"], ["Healthy"], 4),
  food("Lebanese", ["healthy", "adventurous"], ["sitdown", "date"], ["medium"], ["Healthy"], 5),
  food("Hawaiian", ["healthy", "adventurous"], ["quick", "sitdown"], ["medium"], ["Casual"], 4),
  food("Soup", ["healthy", "comfort"], ["quick", "sitdown"], ["cheap", "medium"], ["Casual"], 4),
  food("Dumplings", ["comfort", "adventurous"], ["quick", "sitdown"], ["cheap", "medium"], ["Asian"], 2),
  food("Noodles", ["comfort", "safe"], ["quick", "sitdown"], ["cheap", "medium"], ["Asian"], 2),
  food("Boba", ["safe"], ["quick", "date"], ["cheap", "medium"], ["Casual"], 2)
];

function food(name, moods, situations, budgets, groups, healthScore) {
  return {
    name,
    moods,
    situations,
    budgets,
    groups,
    healthScore,
    search: `${name} near me`
  };
}

const moodSelect = document.getElementById("mood");
const situationSelect = document.getElementById("situation");
const budgetSelect = document.getElementById("budget");
const pickBtn = document.getElementById("pickBtn");
const result = document.getElementById("result");

pickBtn.addEventListener("click", pickFood);

function pickFood() {
  const mood = moodSelect.value;
  const situation = situationSelect.value;
  const budget = budgetSelect.value;

  const rankedFoods = foodIdeas
    .filter((food) => {
      const budgetMatch = budget === "any" || food.budgets.includes(budget);

      if (mood === "healthy") {
        return budgetMatch && food.healthScore >= 4;
      }

      return budgetMatch;
    })
    .map((food) => {
      let score = 0;

      if (food.moods.includes(mood)) score += 4;
      if (food.situations.includes(situation)) score += 3;
      if (food.budgets.includes(budget)) score += 5;

      if (mood === "healthy") {
        score += food.healthScore;
      }

      if (mood === "comfort" && food.healthScore <= 2) {
        score += 2;
      }

      return { ...food, score };
    })
    .sort((a, b) => b.score - a.score);

  showResults(rankedFoods.slice(0, 3));
}

function showResults(foods) {
  result.classList.remove("hidden");

  if (foods.length === 0) {
    result.innerHTML = `
      <h2>No good match</h2>
      <p>Try changing your budget or situation.</p>
    `;
    return;
  }

  result.innerHTML = `
    <h2>Your top picks</h2>
    <div class="results-list">
      ${foods
        .map((food, index) => {
          const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(food.search)}`;

          return `
            <article class="food-result">
              <p class="rank">#${index + 1}</p>
              <h3>${food.name}</h3>

              <div class="tags">
                ${food.groups.map((group) => `<span class="tag">${group}</span>`).join("")}
                ${food.budgets.map((budget) => `<span class="tag">${budget}</span>`).join("")}
              </div>

              <a class="map-link" href="${mapsUrl}" target="_blank">
                Find ${food.name} near me
              </a>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}