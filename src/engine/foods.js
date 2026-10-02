/**
 * Built-in food database (works offline). Values per 100 g, approximate
 * (USDA-style averages; home-cooked dishes vary). Branded and packaged foods
 * come from Open Food Facts instead.
 *
 * diet:     "plant" | "dairy" | "egg" | "fish" | "meat"  — what the food contains at most
 * purine:   "low" | "moderate" | "high"  — for gout / high uric acid
 * flags:    "fructose" (sugary drinks), "alcohol", "red_meat", "organ", "high_sodium"
 */

const f = (id, name, category, kcal, protein, carbs, fat, fiber, o = {}) => ({
  id,
  name,
  category,
  per100: { kcal, protein, carbs, fat, fiber },
  servings: o.s ?? [],
  diet: o.diet ?? "plant",
  allergens: o.al ?? [],
  purine: o.pu ?? "low",
  flags: o.fl ?? [],
  aliases: o.aka ?? [],
  sodium: o.na, // mg per 100 g when notable
});

export const FOODS = [
  // ── Protein ──
  f("chicken_breast", "Chicken breast, cooked", "protein", 165, 31, 0, 3.6, 0, { diet: "meat", pu: "moderate", s: [["1 breast", 150], ["100 g", 100]] }),
  f("chicken_thigh", "Chicken thigh, cooked", "protein", 209, 26, 0, 10.9, 0, { diet: "meat", pu: "moderate", s: [["1 thigh", 90]] }),
  f("beef_lean", "Lean beef mince, cooked", "protein", 217, 26, 0, 11.8, 0, { diet: "meat", pu: "moderate", fl: ["red_meat"], s: [["1 portion", 120]] }),
  f("goat_meat", "Goat / mutton, cooked", "protein", 143, 27, 0, 3, 0, { diet: "meat", pu: "moderate", fl: ["red_meat"], aka: ["mutton"], s: [["1 portion", 120]] }),
  f("chicken_liver", "Chicken liver, cooked", "protein", 167, 24.5, 0.9, 6.5, 0, { diet: "meat", pu: "high", fl: ["organ"], s: [["1 portion", 100]] }),
  f("salmon", "Salmon, cooked", "protein", 206, 22, 0, 12, 0, { diet: "fish", al: ["fish"], pu: "moderate", s: [["1 fillet", 140]] }),
  f("tuna_canned", "Tuna, canned in water", "protein", 116, 25.5, 0, 0.8, 0, { diet: "fish", al: ["fish"], pu: "moderate", s: [["1 can (drained)", 120]] }),
  f("sardines", "Sardines, canned", "protein", 208, 24.6, 0, 11.5, 0, { diet: "fish", al: ["fish"], pu: "high", s: [["1 can", 90]] }),
  f("shrimp", "Shrimp / prawns, cooked", "protein", 99, 24, 0.2, 0.3, 0, { diet: "fish", al: ["shellfish"], pu: "moderate", s: [["1 portion", 100]] }),
  f("egg", "Egg, whole", "protein", 143, 12.6, 0.7, 9.5, 0, { diet: "egg", al: ["egg"], s: [["1 large egg", 50], ["2 eggs", 100]] }),
  f("egg_white", "Egg white", "protein", 52, 10.9, 0.7, 0.2, 0, { diet: "egg", al: ["egg"], s: [["1 white", 33]] }),
  f("paneer", "Paneer", "protein", 265, 18.3, 1.2, 20.8, 0, { diet: "dairy", al: ["dairy"], aka: ["cottage cheese (Indian)"], s: [["1 portion", 100], ["1 cube", 20]] }),
  f("tofu", "Tofu, firm", "protein", 144, 17.3, 2.8, 8.7, 2.3, { al: ["soy"], pu: "moderate", s: [["1/2 block", 150]] }),
  f("tempeh", "Tempeh", "protein", 192, 20.3, 7.6, 10.8, 0, { al: ["soy"], pu: "moderate", s: [["1 portion", 100]] }),
  f("soy_chunks", "Soy chunks, dry", "protein", 345, 52, 33, 0.5, 13, { al: ["soy"], pu: "moderate", aka: ["nutrela", "TVP"], s: [["1 portion (dry)", 30]] }),
  f("edamame", "Edamame", "protein", 121, 11.9, 8.9, 5.2, 5.2, { al: ["soy"], pu: "moderate", s: [["1 cup", 155]] }),
  f("whey", "Whey protein powder", "protein", 380, 78, 8, 5, 0, { diet: "dairy", al: ["dairy"], s: [["1 scoop", 30]] }),
  f("pea_protein", "Pea protein powder", "protein", 380, 80, 5, 6, 2, { s: [["1 scoop", 30]] }),
  f("greek_yogurt", "Greek yogurt, non-fat", "dairy", 59, 10.2, 3.6, 0.4, 0, { diet: "dairy", al: ["dairy"], s: [["1 cup", 200], ["1 pot", 150]] }),
  f("curd", "Curd / plain yogurt, whole", "dairy", 61, 3.5, 4.7, 3.3, 0, { diet: "dairy", al: ["dairy"], aka: ["dahi"], s: [["1 bowl", 150]] }),
  f("cottage_cheese", "Cottage cheese", "dairy", 98, 11.1, 3.4, 4.3, 0, { diet: "dairy", al: ["dairy"], s: [["1/2 cup", 113]] }),
  f("milk_whole", "Milk, whole", "dairy", 61, 3.2, 4.8, 3.3, 0, { diet: "dairy", al: ["dairy"], aka: ["milk", "doodh"], s: [["1 glass", 250]] }),
  f("milk_skim", "Milk, skim / toned", "dairy", 34, 3.4, 5, 0.1, 0, { diet: "dairy", al: ["dairy"], s: [["1 glass", 250]] }),
  f("soy_milk", "Soy milk, unsweetened", "dairy", 33, 2.9, 1.7, 1.6, 0.4, { al: ["soy"], s: [["1 glass", 250]] }),
  f("cheddar", "Cheddar cheese", "dairy", 403, 25, 1.3, 33, 0, { diet: "dairy", al: ["dairy"], na: 620, s: [["1 slice", 20]] }),

  // ── Legumes ──
  f("lentils", "Lentils, cooked", "legume", 116, 9, 20, 0.4, 7.9, { pu: "moderate", aka: ["masoor", "moong", "toor"], s: [["1 bowl", 200]] }),
  f("dal_tadka", "Dal tadka (home-style)", "legume", 120, 6, 14, 4.5, 3, { pu: "moderate", aka: ["dal"], s: [["1 bowl", 200]] }),
  f("chickpeas", "Chickpeas, cooked", "legume", 164, 8.9, 27.4, 2.6, 7.6, { pu: "moderate", aka: ["chana"], s: [["1 cup", 164]] }),
  f("chole", "Chole (chickpea curry)", "legume", 140, 6, 17, 5.5, 5, { pu: "moderate", s: [["1 bowl", 200]] }),
  f("kidney_beans", "Kidney beans, cooked", "legume", 127, 8.7, 22.8, 0.5, 6.4, { pu: "moderate", aka: ["rajma"], s: [["1 cup", 177]] }),
  f("rajma_curry", "Rajma curry", "legume", 125, 5.5, 16, 4.5, 5, { pu: "moderate", s: [["1 bowl", 200]] }),
  f("hummus", "Hummus", "legume", 166, 7.9, 14.3, 9.6, 6, { s: [["2 tbsp", 30]] }),

  // ── Grains & starches ──
  f("white_rice", "White rice, cooked", "grain", 130, 2.7, 28.2, 0.3, 0.4, { aka: ["rice", "chawal", "steamed rice"], s: [["1 cup", 160], ["1 bowl", 200]] }),
  f("brown_rice", "Brown rice, cooked", "grain", 123, 2.7, 25.6, 1, 1.6, { s: [["1 cup", 160]] }),
  f("roti", "Roti / chapati, whole wheat", "grain", 297, 9.8, 46.4, 7.5, 4.9, { al: ["gluten"], aka: ["chapati", "phulka"], s: [["1 roti", 40]] }),
  f("wholewheat_bread", "Whole-wheat bread", "grain", 247, 13, 41, 3.4, 7, { al: ["gluten"], na: 450, s: [["1 slice", 30]] }),
  f("white_bread", "White bread", "grain", 265, 9, 49, 3.2, 2.7, { al: ["gluten"], na: 490, s: [["1 slice", 28]] }),
  f("oats", "Oats, dry", "grain", 389, 16.9, 66.3, 6.9, 10.6, { al: ["gluten"], s: [["1/2 cup", 40]] }),
  f("oatmeal_cooked", "Oatmeal, cooked with water", "grain", 71, 2.5, 12, 1.5, 1.7, { al: ["gluten"], s: [["1 bowl", 240]] }),
  f("pasta", "Pasta, cooked", "grain", 158, 5.8, 30.9, 0.9, 1.8, { al: ["gluten"], s: [["1 plate", 200]] }),
  f("quinoa", "Quinoa, cooked", "grain", 120, 4.4, 21.3, 1.9, 2.8, { s: [["1 cup", 185]] }),
  f("potato", "Potato, boiled", "grain", 87, 1.9, 20.1, 0.1, 1.8, { s: [["1 medium", 170]] }),
  f("sweet_potato", "Sweet potato, baked", "grain", 90, 2, 20.7, 0.2, 3.3, { s: [["1 medium", 150]] }),
  f("idli", "Idli", "grain", 132, 4.5, 27, 0.5, 1.5, { s: [["1 idli", 40]] }),
  f("dosa", "Dosa, plain", "grain", 168, 3.9, 29, 3.7, 1.5, { s: [["1 dosa", 90]] }),
  f("poha", "Poha", "grain", 130, 2.6, 26, 2, 1.5, { s: [["1 plate", 180]] }),
  f("upma", "Upma", "grain", 145, 3.5, 22, 5, 2, { al: ["gluten"], s: [["1 bowl", 200]] }),
  f("granola", "Granola", "grain", 471, 10, 64, 20, 7, { al: ["gluten", "nuts"], s: [["1/2 cup", 60]] }),
  f("cornflakes", "Corn flakes", "grain", 357, 7.5, 84, 0.4, 3.3, { na: 700, s: [["1 bowl", 30]] }),
  f("fried_rice", "Fried rice", "grain", 163, 4, 25, 5, 1, { diet: "egg", al: ["egg", "soy"], na: 400, s: [["1 plate", 250]] }),

  // ── Fruit ──
  f("banana", "Banana", "fruit", 89, 1.1, 22.8, 0.3, 2.6, { s: [["1 medium", 118]] }),
  f("apple", "Apple", "fruit", 52, 0.3, 13.8, 0.2, 2.4, { s: [["1 medium", 182]] }),
  f("orange", "Orange", "fruit", 47, 0.9, 11.8, 0.1, 2.4, { s: [["1 medium", 131]] }),
  f("mango", "Mango", "fruit", 60, 0.8, 15, 0.4, 1.6, { s: [["1 cup", 165]] }),
  f("grapes", "Grapes", "fruit", 69, 0.7, 18, 0.2, 0.9, { s: [["1 cup", 150]] }),
  f("strawberries", "Strawberries", "fruit", 32, 0.7, 7.7, 0.3, 2, { s: [["1 cup", 150]] }),
  f("cherries", "Cherries", "fruit", 63, 1.1, 16, 0.2, 2.1, { s: [["1 cup", 140]] }),
  f("watermelon", "Watermelon", "fruit", 30, 0.6, 7.6, 0.2, 0.4, { s: [["1 cup", 152]] }),
  f("papaya", "Papaya", "fruit", 43, 0.5, 10.8, 0.3, 1.7, { s: [["1 cup", 145]] }),
  f("dates", "Dates", "fruit", 282, 2.5, 75, 0.4, 8, { s: [["2 dates", 16]] }),

  // ── Vegetables ──
  f("broccoli", "Broccoli", "veg", 34, 2.8, 6.6, 0.4, 2.6, { s: [["1 cup", 90]] }),
  f("spinach", "Spinach", "veg", 23, 2.9, 3.6, 0.4, 2.2, { pu: "moderate", aka: ["palak"], s: [["1 cup", 30]] }),
  f("salad", "Mixed salad (lettuce, cucumber, tomato)", "veg", 15, 0.9, 3, 0.2, 1.2, { aka: ["salad", "kachumber"], s: [["1 bowl", 150]] }),
  f("carrot", "Carrot", "veg", 41, 0.9, 9.6, 0.2, 2.8, { s: [["1 medium", 60]] }),
  f("mushrooms", "Mushrooms", "veg", 22, 3.1, 3.3, 0.3, 1, { pu: "moderate", s: [["1 cup", 70]] }),
  f("peas", "Green peas", "veg", 81, 5.4, 14.5, 0.4, 5.1, { s: [["1/2 cup", 80]] }),
  f("cauliflower", "Cauliflower", "veg", 25, 1.9, 5, 0.3, 2, { aka: ["gobi"], s: [["1 cup", 100]] }),
  f("sabzi", "Mixed veg curry (sabzi)", "veg", 100, 2.5, 9, 6, 3, { s: [["1 bowl", 150]] }),
  f("palak_paneer", "Palak paneer", "veg", 160, 7, 6, 12, 2, { diet: "dairy", al: ["dairy"], s: [["1 bowl", 200]] }),

  // ── Fats, nuts, seeds ──
  f("olive_oil", "Olive oil", "fat", 884, 0, 0, 100, 0, { s: [["1 tbsp", 13.5], ["1 tsp", 4.5]] }),
  f("ghee", "Ghee", "fat", 900, 0, 0, 99.5, 0, { diet: "dairy", al: ["dairy"], s: [["1 tsp", 5], ["1 tbsp", 13]] }),
  f("butter", "Butter", "fat", 717, 0.9, 0.1, 81, 0, { diet: "dairy", al: ["dairy"], s: [["1 tsp", 5]] }),
  f("peanut_butter", "Peanut butter", "fat", 588, 25, 20, 50, 6, { al: ["peanuts"], s: [["1 tbsp", 16]] }),
  f("almonds", "Almonds", "fat", 579, 21, 22, 50, 12.5, { al: ["nuts"], s: [["10 almonds", 12], ["1 handful", 28]] }),
  f("peanuts", "Peanuts", "fat", 567, 25.8, 16, 49, 8.5, { al: ["peanuts"], s: [["1 handful", 28]] }),
  f("walnuts", "Walnuts", "fat", 654, 15.2, 13.7, 65.2, 6.7, { al: ["nuts"], s: [["1 handful", 28]] }),
  f("chia", "Chia seeds", "fat", 486, 16.5, 42, 30.7, 34, { s: [["1 tbsp", 12]] }),
  f("avocado", "Avocado", "fat", 160, 2, 8.5, 14.7, 6.7, { s: [["1/2 avocado", 100]] }),
  f("dark_chocolate", "Dark chocolate 70%", "snack", 598, 7.8, 45.9, 42.6, 10.9, { s: [["2 squares", 20]] }),

  // ── Meals & snacks ──
  f("butter_chicken", "Butter chicken", "meal", 190, 13, 6, 13, 1, { diet: "meat", al: ["dairy"], pu: "moderate", s: [["1 bowl", 200]] }),
  f("chicken_biryani", "Chicken biryani", "meal", 160, 8, 20, 5.5, 1, { diet: "meat", pu: "moderate", s: [["1 plate", 300]] }),
  f("pizza", "Pizza, cheese", "meal", 266, 11.4, 33, 10.4, 2.3, { diet: "dairy", al: ["gluten", "dairy"], na: 600, s: [["1 slice", 107]] }),
  f("burger", "Burger, fast food", "meal", 254, 13, 25, 11, 1.5, { diet: "meat", al: ["gluten"], fl: ["red_meat"], pu: "moderate", na: 500, s: [["1 burger", 220]] }),
  f("fries", "French fries", "snack", 312, 3.4, 41, 15, 3.8, { na: 210, s: [["1 medium", 117]] }),
  f("samosa", "Samosa", "snack", 262, 4, 30, 14, 2.5, { al: ["gluten"], s: [["1 samosa", 80]] }),
  f("biscuits", "Biscuits / cookies", "snack", 480, 6, 65, 22, 2, { al: ["gluten"], s: [["2 biscuits", 20]] }),
  f("protein_bar", "Protein bar", "snack", 350, 30, 40, 10, 5, { diet: "dairy", al: ["dairy"], s: [["1 bar", 60]] }),

  // ── More home-style dishes (approximate home recipes) ──
  f("paratha", "Paratha, plain", "grain", 260, 6, 36, 10, 4, { al: ["gluten"], s: [["1 paratha", 80]] }),
  f("naan", "Naan", "grain", 290, 9, 50, 5.5, 2, { diet: "dairy", al: ["gluten", "dairy"], s: [["1 naan", 90]] }),
  f("khichdi", "Khichdi", "meal", 120, 4.5, 20, 2.5, 2.5, { pu: "moderate", s: [["1 bowl", 250]] }),
  f("sambar", "Sambar", "legume", 60, 3, 8, 2, 2.5, { pu: "moderate", s: [["1 bowl", 200]] }),
  f("dal_makhani", "Dal makhani", "legume", 150, 6, 14, 8, 4, { diet: "dairy", al: ["dairy"], pu: "moderate", s: [["1 bowl", 200]] }),
  f("paneer_butter_masala", "Paneer butter masala", "meal", 220, 8, 9, 17, 1.5, { diet: "dairy", al: ["dairy"], aka: ["shahi paneer", "paneer makhani"], s: [["1 bowl", 200]] }),
  f("egg_curry", "Egg curry", "meal", 150, 9, 5, 10, 1, { diet: "egg", al: ["egg"], s: [["1 bowl", 200]] }),
  f("chicken_curry", "Chicken curry", "meal", 140, 14, 5, 7, 1, { diet: "meat", pu: "moderate", s: [["1 bowl", 200]] }),
  f("raita", "Raita", "dairy", 60, 3, 5, 3, 0.5, { diet: "dairy", al: ["dairy"], s: [["1 katori", 100]] }),

  // ── Drinks & extras ──
  f("coffee", "Coffee, black", "drink", 2, 0.3, 0, 0, 0, { s: [["1 cup", 240]] }),
  f("chai", "Masala chai with milk & sugar", "drink", 45, 1.4, 6.5, 1.5, 0, { diet: "dairy", al: ["dairy"], aka: ["tea"], s: [["1 cup", 150]] }),
  f("lassi", "Lassi, sweet", "drink", 75, 2.9, 11, 2.2, 0, { diet: "dairy", al: ["dairy"], s: [["1 glass", 250]] }),
  f("chaas", "Chaas / buttermilk", "drink", 19, 1, 2.4, 0.6, 0, { diet: "dairy", al: ["dairy"], aka: ["buttermilk", "mattha"], s: [["1 glass", 250]] }),
  f("orange_juice", "Orange juice", "drink", 45, 0.7, 10.4, 0.2, 0.2, { s: [["1 glass", 250]] }),
  f("cola", "Cola / soft drink", "drink", 42, 0, 10.6, 0, 0, { fl: ["fructose"], s: [["1 can", 330]] }),
  f("sports_drink", "Sports drink", "drink", 26, 0, 6.4, 0, 0, { s: [["1 bottle", 500]] }),
  f("beer", "Beer", "drink", 43, 0.5, 3.6, 0, 0, { pu: "high", fl: ["alcohol"], s: [["1 pint", 568], ["1 can", 330]] }),
  f("honey", "Honey", "extra", 304, 0.3, 82.4, 0, 0, { s: [["1 tbsp", 21]] }),
  f("sugar", "Sugar", "extra", 387, 0, 100, 0, 0, { s: [["1 tsp", 4]] }),
];

export const FOOD_BY_ID = Object.fromEntries(FOODS.map((x) => [x.id, x]));

export function searchFoods(query, foods = FOODS) {
  const q = query.trim().toLowerCase();
  if (!q) return foods;
  return foods
    .map((x) => {
      const name = x.name.toLowerCase();
      const alias = x.aliases.some((a) => a.toLowerCase().includes(q));
      const score = name.startsWith(q) ? 3 : name.includes(q) ? 2 : alias ? 1 : 0;
      return { x, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.x);
}
