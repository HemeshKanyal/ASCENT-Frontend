/**
 * Health screening. Plain-language versions of the standard pre-exercise
 * readiness questions (PAR-Q+ style) plus conditions that change how we
 * train or eat. The app adapts but never replaces a doctor.
 */

export type ScreeningQuestion = { id: string; text: string; urgent?: boolean };

export const SCREENING: ScreeningQuestion[] = [
  { id: "heart_bp", text: "Has a doctor ever said you have a heart condition or high blood pressure?" },
  { id: "chest_pain", text: "Do you get chest pain at rest, in daily life, or when active?", urgent: true },
  { id: "dizziness", text: "Have you lost balance from dizziness or fainted in the last 12 months?", urgent: true },
  { id: "chronic", text: "Do you have another long-term medical condition?" },
  { id: "medication", text: "Do you take prescribed medication for a long-term condition?" },
  { id: "bone_joint", text: "Do you have a bone, joint or muscle problem that activity could make worse?" },
  { id: "supervised", text: "Has a doctor said you should only exercise under medical supervision?", urgent: true },
];

export type Condition = {
  id: string;
  label: string;
  /** What the app does about it in training. */
  training: string;
  /** What the diet tracker will do (Phase 2). */
  diet?: string;
  needsClearance?: boolean;
  conservative?: boolean;
  noSpinalFlexion?: boolean;
  /** Joints to protect automatically. */
  joints?: string[];
  /** Ask for a doctor-set daily protein limit. */
  askProteinLimit?: boolean;
};

export const CONDITIONS: Condition[] = [
  {
    id: "uric_acid",
    label: "High uric acid / gout",
    training: "You can train normally — it usually helps. We'll remind you to hydrate. During a flare, mark the sore joint so we skip it.",
    diet: "Protein will come from low-purine sources (dairy, eggs, tofu, lentils in moderation) and stay within any limit your doctor gave. Organ meats, red meat, some seafood, beer and sugary drinks get flagged. No crash diets — they raise uric acid.",
    askProteinLimit: true,
  },
  {
    id: "hypertension",
    label: "High blood pressure",
    training: "No max-effort grinders, always 2–3 reps in reserve, and keep breathing through every rep (no breath-holding).",
    diet: "Sodium awareness and potassium-rich foods.",
    conservative: true,
  },
  {
    id: "heart",
    label: "Heart condition",
    training: "Conservative training only after your doctor clears you. Stop if you get chest pain, unusual breathlessness or dizziness.",
    needsClearance: true,
    conservative: true,
  },
  {
    id: "diabetes",
    label: "Diabetes",
    training: "Check glucose before and after training and keep fast carbs nearby. Strength training improves insulin sensitivity.",
    diet: "Carb timing around workouts and steady meals.",
  },
  {
    id: "kidney",
    label: "Kidney disease",
    training: "Moderate training after your doctor clears you.",
    diet: "Protein, potassium and phosphorus stay within your doctor's limits — we never push protein targets on you.",
    needsClearance: true,
    conservative: true,
    askProteinLimit: true,
  },
  {
    id: "asthma",
    label: "Asthma",
    training: "Longer warm-ups and keep your inhaler with you. Lifting is usually well tolerated.",
  },
  {
    id: "osteoporosis",
    label: "Low bone density / osteoporosis",
    training: "Strength training helps bones. We skip loaded crunches and twisting and avoid max-effort spinal loading.",
    diet: "Calcium, vitamin D and enough protein.",
    conservative: true,
    noSpinalFlexion: true,
  },
  {
    id: "pregnancy",
    label: "Pregnant",
    training: "Moderate training with your doctor's OK. No max efforts or crunches; skip lying flat on your back later in pregnancy.",
    needsClearance: true,
    conservative: true,
    noSpinalFlexion: true,
  },
  {
    id: "postpartum",
    label: "Postpartum",
    training: "Gradual return after clearance. No loaded crunches while your core and pelvic floor recover.",
    needsClearance: true,
    conservative: true,
    noSpinalFlexion: true,
  },
  {
    id: "thyroid",
    label: "Thyroid condition",
    training: "Train normally; energy may vary, so effort targets stay flexible.",
    diet: "Calorie targets adjust slowly and are easy to override.",
  },
  {
    id: "pcos",
    label: "PCOS",
    training: "Strength training is especially helpful for insulin sensitivity.",
    diet: "Protein- and fibre-forward meals.",
  },
  {
    id: "back_pain",
    label: "Chronic back pain",
    training: "We protect your lower back by skipping heavily loaded hinges and choosing supported variations.",
    joints: ["lower_back"],
  },
  {
    id: "surgery",
    label: "Recent surgery or injury",
    training: "Only after your surgeon or physio clears you. Mark the affected joint below so we work around it.",
    needsClearance: true,
    conservative: true,
  },
];

export const conditionById = (id: string) => CONDITIONS.find((c) => c.id === id);

export type HealthProfile = {
  screening: Record<string, boolean>;
  conditions: string[];
  cleared: boolean;
  doctorNotes: string;
  proteinLimitG?: number;
};

export const EMPTY_HEALTH: HealthProfile = { screening: {}, conditions: [], cleared: false, doctorNotes: "" };

/** Does anything here say "see a doctor first"? */
export function needsClearance(health: HealthProfile) {
  const urgent = SCREENING.some((q) => q.urgent && health.screening[q.id]);
  const anyYes = Object.values(health.screening).some(Boolean);
  const conditionNeeds = health.conditions.some((c) => conditionById(c)?.needsClearance);
  return { urgent, recommended: anyYes || conditionNeeds };
}

/** Training modifiers implied by health answers. */
export function healthModifiers(health: HealthProfile) {
  const conditions = health.conditions.map(conditionById).filter(Boolean) as Condition[];
  const clearance = needsClearance(health);
  return {
    conservative: conditions.some((c) => c.conservative) || (clearance.recommended && !health.cleared),
    noSpinalFlexion: conditions.some((c) => c.noSpinalFlexion),
    joints: [...new Set(conditions.flatMap((c) => c.joints ?? []))],
  };
}
