/**
 * Common supplements with what one serving provides. Doses are typical label
 * amounts; people can log several servings. Cautions are matched to the
 * conditions in someone's health profile.
 */

const s = (id, name, serving, o) => ({
  id,
  name,
  serving,
  category: o.category,
  per: { kcal: o.kcal ?? 0, protein: o.protein ?? 0, carbs: o.carbs ?? 0, fat: o.fat ?? 0, fiber: 0 },
  micros: o.micros ?? {},
  diet: o.diet ?? "plant",
  allergens: o.allergens ?? [],
  about: o.about,
  cautions: o.cautions ?? {},
  general: o.general,
});

export const SUPPLEMENTS = [
  s("whey", "Whey protein", "1 scoop (30 g)", {
    category: "Protein",
    kcal: 120, protein: 24, carbs: 3, fat: 1.5,
    micros: { calcium: 120, sodium: 50, potassium: 150, sugar: 2 },
    diet: "dairy", allergens: ["dairy"],
    about: "Fast-digesting milk protein. Handy for hitting your protein target — food works just as well.",
    cautions: { kidney: "Counts toward your doctor's protein limit.", uric_acid: "Dairy protein is a good low-purine choice — still counts toward any protein limit." },
  }),
  s("casein", "Casein protein", "1 scoop (30 g)", {
    category: "Protein",
    kcal: 110, protein: 24, carbs: 3, fat: 0.5,
    micros: { calcium: 200, sodium: 60 },
    diet: "dairy", allergens: ["dairy"],
    about: "Slow-digesting milk protein, often taken before bed.",
    cautions: { kidney: "Counts toward your doctor's protein limit." },
  }),
  s("plant_protein", "Plant protein (pea/rice)", "1 scoop (30 g)", {
    category: "Protein",
    kcal: 115, protein: 24, carbs: 2, fat: 2,
    micros: { iron: 6, sodium: 300 },
    about: "Vegan protein blend; pea + rice gives a complete amino acid profile.",
    cautions: { kidney: "Counts toward your doctor's protein limit.", hypertension: "Some brands are high in sodium — check the label." },
  }),
  s("collagen", "Collagen peptides", "1 scoop (10 g)", {
    category: "Protein",
    kcal: 36, protein: 9,
    diet: "meat",
    about: "Supports skin and connective tissue; an incomplete protein, so it shouldn't replace whey or food protein.",
  }),
  s("creatine", "Creatine monohydrate", "5 g", {
    category: "Performance",
    about: "The best-researched performance supplement: more strength and muscle over time. 3–5 g daily, any time of day; no loading needed.",
    cautions: { kidney: "Avoid unless your doctor approves — creatine raises creatinine, which can confuse kidney tests." },
  }),
  s("caffeine", "Caffeine / pre-workout", "1 serving (200 mg)", {
    category: "Performance",
    micros: { caffeine: 200 },
    about: "Improves performance 30–60 minutes before training. Avoid late in the day — it hurts sleep.",
    cautions: {
      hypertension: "Can raise blood pressure — check with your doctor.",
      heart: "Check with your doctor before using stimulants.",
      pregnancy: "Keep total caffeine under 200 mg a day, including coffee and tea.",
    },
  }),
  s("beta_alanine", "Beta-alanine", "3.2 g", {
    category: "Performance",
    about: "Helps with hard efforts of 1–4 minutes. Tingling skin is harmless.",
  }),
  s("electrolytes", "Electrolytes", "1 serving", {
    category: "Performance",
    kcal: 10, carbs: 2,
    micros: { sodium: 500, potassium: 200, magnesium: 50 },
    about: "Useful for long or sweaty sessions (over 60–90 min).",
    cautions: { hypertension: "Adds sodium — save it for long, sweaty sessions.", kidney: "Potassium and sodium need your doctor's OK." },
  }),
  s("fish_oil", "Fish oil (omega-3)", "2 capsules", {
    category: "Health",
    kcal: 20, fat: 2,
    micros: { omega3: 0.6 },
    diet: "fish", allergens: ["fish"],
    about: "EPA + DHA for heart health — worth it if you rarely eat oily fish.",
    general: "Check with your doctor if you take blood thinners.",
    cautions: { uric_acid: "Fish oil capsules are purified — they don't carry the purines of fish itself." },
  }),
  s("algae_omega", "Algae omega-3 (vegan)", "1 capsule", {
    category: "Health",
    kcal: 5, fat: 0.5,
    micros: { omega3: 0.3 },
    about: "Plant-based EPA/DHA from algae — the vegan alternative to fish oil.",
  }),
  s("multivitamin", "Multivitamin", "1 tablet", {
    category: "Vitamins",
    micros: { vitA: 750, vitC: 90, vitD: 25, vitE: 15, vitK: 30, vitB6: 2, vitB12: 6, folate: 400, calcium: 200, iron: 8, magnesium: 50, zinc: 11 },
    about: "Insurance for gaps in your diet — food first, but useful when eating is limited.",
    cautions: { kidney: "Ask your doctor — some vitamins and minerals need limiting." },
  }),
  s("vitamin_d", "Vitamin D3 (1000 IU)", "1 capsule (25 µg)", {
    category: "Vitamins",
    micros: { vitD: 25 },
    about: "Most people get too little vitamin D without regular sun. 1000–2000 IU a day is common; take with a meal.",
  }),
  s("vitamin_b12", "Vitamin B12", "1 tablet (500 µg)", {
    category: "Vitamins",
    micros: { vitB12: 500 },
    about: "Essential for vegans and vegetarians — B12 is found almost only in animal foods.",
  }),
  s("vitamin_c", "Vitamin C", "1 tablet (500 mg)", {
    category: "Vitamins",
    micros: { vitC: 500 },
    about: "Most diets with fruit and veg already cover vitamin C.",
    cautions: { uric_acid: "Vitamin C may modestly lower uric acid — a reasonable add-on.", kidney: "High doses aren't advised with kidney disease — ask your doctor." },
  }),
  s("magnesium", "Magnesium glycinate", "1 serving (200 mg)", {
    category: "Minerals",
    micros: { magnesium: 200 },
    about: "Often low in diets; may help sleep and cramps. Glycinate is gentle on the stomach.",
    cautions: { kidney: "Magnesium can build up with kidney disease — doctor's OK first." },
  }),
  s("zinc", "Zinc", "1 tablet (15 mg)", {
    category: "Minerals",
    micros: { zinc: 15 },
    about: "Supports immunity; don't exceed 40 mg a day long-term.",
  }),
  s("iron", "Iron", "1 tablet (18 mg)", {
    category: "Minerals",
    micros: { iron: 18 },
    about: "Only if a blood test or your doctor says you need it — extra iron isn't harmless.",
    general: "Take apart from tea, coffee and calcium, which block absorption.",
  }),
  s("calcium", "Calcium", "1 tablet (500 mg)", {
    category: "Minerals",
    micros: { calcium: 500 },
    about: "Useful if you eat little dairy. Split doses over 500 mg.",
    cautions: { kidney: "Ask your doctor before taking calcium supplements." },
  }),
  s("ashwagandha", "Ashwagandha", "1 capsule (600 mg)", {
    category: "Other",
    about: "May help stress and sleep; evidence is moderate.",
    cautions: { pregnancy: "Not recommended in pregnancy.", thyroid: "Can affect thyroid hormones — ask your doctor." },
  }),
];

export const SUPPLEMENT_BY_ID = Object.fromEntries(SUPPLEMENTS.map((x) => [x.id, x]));

/** Cautions that apply to this person. */
export function supplementWarnings(supp, conditions = []) {
  const w = Object.entries(supp.cautions ?? {})
    .filter(([c]) => conditions.includes(c))
    .map(([, text]) => text);
  if (supp.general) w.push(supp.general);
  return w;
}
