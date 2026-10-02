/** Profile editors shared by onboarding and the Profile tab. All controlled components. */
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { ALLERGENS, DIET_TYPES, EQUIPMENT, JOINTS, SPLITS, recommendSplit } from "../engine";
import { GOAL_GROUPS, GOALS, goalById } from "../data/goals";
import { CONDITIONS, SCREENING, conditionById, needsClearance, type HealthProfile } from "../data/health";
import { EQUIPMENT_GROUPS, EQUIPMENT_INFO, PLACES, placeById } from "../data/places";
import { WEEKDAYS, type Body, type FoodPrefs, type Level, type Sex, type Weekday } from "../services/trainingStore";
import { Card, Chip, Label, Note, Option, Row, Wrap } from "./components";
import { colors, fonts, radius, space, type } from "./theme";

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

// ── Level ─────────────────────────────────────────────────────────────────

export const LEVEL_OPTIONS: { id: Level; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner", hint: "New, or under ~1 year of consistent training" },
  { id: "intermediate", label: "Intermediate", hint: "1–3 years, comfortable with the main lifts" },
  { id: "advanced", label: "Advanced", hint: "3+ years, progress comes slowly now" },
];

export function LevelPicker({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  return (
    <>
      {LEVEL_OPTIONS.map((o) => (
        <Option key={o.id} label={o.label} hint={o.hint} selected={value === o.id} onPress={() => onChange(o.id)} />
      ))}
    </>
  );
}

// ── Goals ─────────────────────────────────────────────────────────────────

export function GoalPicker({
  goals,
  primaryGoal,
  onChange,
}: {
  goals: string[];
  primaryGoal: string;
  onChange: (goals: string[], primaryGoal: string) => void;
}) {
  const pick = (id: string) => {
    const next = toggle(goals, id);
    onChange(next, next.includes(primaryGoal) ? primaryGoal : next[0] ?? "");
  };
  const extras = goals.map(goalById).filter((g) => g && (g.disciplines || g.mobilityStyle));

  return (
    <View style={{ gap: space.md }}>
      <Text style={type.small}>Pick everything that matters to you — then choose your main focus.</Text>
      {GOAL_GROUPS.map((group) => (
        <View key={group} style={{ gap: space.sm }}>
          <Label>{group}</Label>
          {GOALS.filter((g) => g.group === group).map((g) => (
            <Option key={g.id} label={g.label} hint={g.hint} selected={goals.includes(g.id)} onPress={() => pick(g.id)} />
          ))}
        </View>
      ))}

      {goals.length > 1 ? (
        <Card>
          <Label>Main focus</Label>
          <Text style={type.small}>Your programme is built around this one; the others shape the details.</Text>
          <Wrap>
            {goals.map((id) => (
              <Chip key={id} label={goalById(id)?.label ?? id} selected={primaryGoal === id} onPress={() => onChange(goals, id)} />
            ))}
          </Wrap>
        </Card>
      ) : null}

      {extras.length ? (
        <Note>
          {extras.map((g) => g!.label).join(", ")} add their own sessions to your week — runs, rides, swims, station work or
          flows — balanced against your lifting so you recover. Your main focus decides how the days are shared.
        </Note>
      ) : null}
    </View>
  );
}

// ── Places & equipment ────────────────────────────────────────────────────

function EquipmentEditor({ value, onChange }: { value: string[]; onChange: (eq: string[]) => void }) {
  return (
    <View style={{ gap: space.md }}>
      {EQUIPMENT_GROUPS.map((group) => (
        <View key={group} style={{ gap: 6 }}>
          <Label>{group}</Label>
          {Object.entries(EQUIPMENT_INFO)
            .filter(([, info]) => info.group === group)
            .map(([id, info]) => {
              const on = value.includes(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => onChange(toggle(value, id))}
                  style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start", paddingVertical: 6 }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      marginTop: 1,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: on ? colors.accent : colors.borderStrong,
                      backgroundColor: on ? colors.accent : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {on ? <Text style={{ color: colors.onAccent, fontFamily: fonts.black, fontSize: 11 }}>✓</Text> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.strong}>{EQUIPMENT[id as keyof typeof EQUIPMENT]}</Text>
                    <Text style={type.small}>{info.info}</Text>
                  </View>
                </Pressable>
              );
            })}
        </View>
      ))}
    </View>
  );
}

export function PlacePicker({
  places,
  placeEquipment,
  onChange,
}: {
  places: string[];
  placeEquipment: Record<string, string[]>;
  onChange: (places: string[], placeEquipment: Record<string, string[]>) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  const pick = (id: string) => {
    const next = toggle(places, id);
    const eq = { ...placeEquipment };
    if (next.includes(id)) eq[id] ??= placeById(id)?.equipment ?? [];
    onChange(next, eq);
  };

  return (
    <View style={{ gap: space.sm }}>
      <Text style={type.small}>
        Pick every place you train. Each keeps its own equipment, and you can switch where you are on any day — the workout
        adapts.
      </Text>
      {PLACES.map((p) => {
        const selected = places.includes(p.id);
        const count = placeEquipment[p.id]?.length ?? p.equipment.length;
        return (
          <View key={p.id} style={{ gap: space.sm }}>
            <Option
              label={p.label}
              hint={selected ? `${p.hint} · ${count} items` : p.hint}
              selected={selected}
              onPress={() => pick(p.id)}
            />
            {selected ? (
              <Pressable onPress={() => setEditing(editing === p.id ? null : p.id)} style={{ paddingLeft: space.lg }}>
                <Text style={[type.small, { color: colors.text, textDecorationLine: "underline" }]}>
                  {editing === p.id ? "Done editing" : "What's there? Customise equipment"}
                </Text>
              </Pressable>
            ) : null}
            {editing === p.id ? (
              <Card>
                <EquipmentEditor
                  value={placeEquipment[p.id] ?? p.equipment}
                  onChange={(eq) => onChange(places, { ...placeEquipment, [p.id]: eq })}
                />
              </Card>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ── Schedule ──────────────────────────────────────────────────────────────

const MINUTE_OPTIONS = [30, 45, 60, 75, 90];

export function SchedulePicker({
  days,
  minutes,
  level,
  onChange,
}: {
  days: Weekday[];
  minutes: number;
  level: Level;
  onChange: (days: Weekday[], minutes: number) => void;
}) {
  const split = days.length ? recommendSplit({ daysPerWeek: days.length, level }) : null;
  const ordered = (list: Weekday[]) => WEEKDAYS.map((d) => d.id).filter((d) => list.includes(d));

  // Back-to-back days are fine with a split; flag 3+ in a row for beginners.
  const consecutive = WEEKDAYS.reduce(
    (acc, d) => {
      const run = days.includes(d.id) ? acc.run + 1 : 0;
      return { run, max: Math.max(acc.max, run) };
    },
    { run: 0, max: 0 }
  ).max;

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.sm }}>
        <Label>Which days?</Label>
        <Row style={{ justifyContent: "space-between" }}>
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.id);
            return (
              <Pressable
                key={d.id}
                accessibilityLabel={d.label}
                onPress={() => onChange(ordered(toggle(days, d.id)), minutes)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: on ? colors.accent : colors.border,
                  backgroundColor: on ? colors.accent : colors.surface,
                }}
              >
                <Text style={{ fontFamily: fonts.heavy, color: on ? colors.onAccent : colors.muted }}>{d.short}</Text>
              </Pressable>
            );
          })}
        </Row>
        {split ? (
          <Text style={type.small}>
            {days.length} {days.length === 1 ? "day" : "days"} a week → <Text style={{ color: colors.text }}>{split.name}</Text>
            {split.days.length !== days.length ? ` (${split.days.length}-day rotation that carries over week to week)` : ""}
          </Text>
        ) : (
          <Text style={type.small}>Pick at least one day.</Text>
        )}
        {level === "beginner" && consecutive >= 3 ? (
          <Note>Three or more days in a row is tough when you&apos;re starting out — a rest day in between helps recovery.</Note>
        ) : null}
      </View>

      <View style={{ gap: space.sm }}>
        <Label>How long per session?</Label>
        <Wrap>
          {MINUTE_OPTIONS.map((m) => (
            <Chip key={m} label={`${m} min`} selected={minutes === m} onPress={() => onChange(days, m)} />
          ))}
        </Wrap>
        <Text style={type.small}>Shorter sessions get fewer exercises, not a rushed version of a long one.</Text>
      </View>
    </View>
  );
}

// ── Health ────────────────────────────────────────────────────────────────

function YesNo({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  const seg = (label: string, v: boolean) => (
    <Pressable
      onPress={() => onChange(v)}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: value === v ? colors.accent : "transparent",
      }}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: value === v ? colors.onAccent : colors.muted }}>{label}</Text>
    </Pressable>
  );
  return (
    <Row gap={2} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, padding: 2 }}>
      {seg("No", false)}
      {seg("Yes", true)}
    </Row>
  );
}

export function ScreeningForm({ health, onChange }: { health: HealthProfile; onChange: (h: HealthProfile) => void }) {
  const { urgent, recommended } = needsClearance(health);
  return (
    <View style={{ gap: space.sm }}>
      <Text style={type.small}>
        The standard questions trainers ask before anyone starts. Answering yes doesn&apos;t stop you training — it helps ASCENT
        start you safely.
      </Text>
      {SCREENING.map((q) => (
        <Card key={q.id} style={{ paddingVertical: space.md }}>
          <Text style={type.body}>{q.text}</Text>
          <YesNo value={health.screening[q.id]} onChange={(v) => onChange({ ...health, screening: { ...health.screening, [q.id]: v } })} />
        </Card>
      ))}
      {recommended ? <ClearanceCard health={health} urgent={urgent} onChange={onChange} /> : null}
    </View>
  );
}

function ClearanceCard({ health, urgent, onChange }: { health: HealthProfile; urgent: boolean; onChange: (h: HealthProfile) => void }) {
  return (
    <Card active>
      <Text style={type.h3}>{urgent ? "Please see a doctor before you start" : "Worth a quick check with your doctor"}</Text>
      <Text style={type.small}>
        {urgent
          ? "Chest pain, fainting or a supervision order need a doctor's OK first. Until you confirm you're cleared, ASCENT keeps every session gentle."
          : "Based on your answers, a doctor's OK is recommended. Until then ASCENT keeps intensity moderate — no max efforts."}
      </Text>
      <Option
        label="My doctor has cleared me to exercise"
        selected={health.cleared}
        onPress={() => onChange({ ...health, cleared: !health.cleared })}
      />
    </Card>
  );
}

export function ConditionsForm({
  health,
  injuries,
  onChange,
}: {
  health: HealthProfile;
  injuries: string[];
  onChange: (h: HealthProfile, injuries: string[]) => void;
}) {
  const selected = health.conditions.map(conditionById).filter(Boolean);
  const askProtein = selected.some((c) => c!.askProteinLimit);
  const { urgent, recommended } = needsClearance(health);

  return (
    <View style={{ gap: space.md }}>
      <Text style={type.small}>
        Tell us about anything a doctor is managing. ASCENT changes your training (and later your nutrition) to fit — and your
        doctor&apos;s instructions always win.
      </Text>

      <Label>Conditions</Label>
      {CONDITIONS.map((c) => {
        const on = health.conditions.includes(c.id);
        return (
          <View key={c.id} style={{ gap: space.sm }}>
            <Option label={c.label} selected={on} onPress={() => onChange({ ...health, conditions: toggle(health.conditions, c.id) }, injuries)} />
            {on ? (
              <View style={{ paddingLeft: space.lg, gap: 4 }}>
                <Text style={type.small}>
                  <Text style={{ color: colors.text, fontFamily: fonts.bold }}>Training: </Text>
                  {c.training}
                </Text>
                {c.diet ? (
                  <Text style={type.small}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bold }}>Nutrition: </Text>
                    {c.diet}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      {askProtein ? (
        <Card>
          <Label>Protein limit from your doctor</Label>
          <Text style={type.small}>Grams per day. Leave empty if they didn&apos;t give a number — we&apos;ll stay moderate.</Text>
          <TextInput
            value={health.proteinLimitG ? String(health.proteinLimitG) : ""}
            onChangeText={(v) => onChange({ ...health, proteinLimitG: Number(v.replace(/\D/g, "")) || undefined }, injuries)}
            keyboardType="number-pad"
            placeholder="e.g. 60"
            placeholderTextColor={colors.faint}
            style={inputStyle}
          />
        </Card>
      ) : null}

      <Label>Joints to protect</Label>
      <Text style={type.small}>Sore, injured or flaring right now — exercises that load them are left out.</Text>
      <Wrap>
        {Object.entries(JOINTS).map(([id, label]) => (
          <Chip key={id} label={label} selected={injuries.includes(id)} onPress={() => onChange(health, toggle(injuries, id))} />
        ))}
      </Wrap>

      <Label>Doctor&apos;s instructions or anything else</Label>
      <TextInput
        value={health.doctorNotes}
        onChangeText={(v) => onChange({ ...health, doctorNotes: v }, injuries)}
        placeholder="e.g. No heavy lifting overhead; limit protein to 60 g/day"
        placeholderTextColor={colors.faint}
        multiline
        style={[inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
      />

      {recommended ? <ClearanceCard health={health} urgent={urgent} onChange={(h) => onChange(h, injuries)} /> : null}

      <Text style={[type.small, { color: colors.faint }]}>
        ASCENT is a training tool, not medical advice. If something feels wrong during a workout — chest pain, dizziness,
        sharp pain — stop and get checked.
      </Text>
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  padding: space.md,
  fontSize: 15,
  fontFamily: fonts.regular,
};

// ── Split ─────────────────────────────────────────────────────────────────

export function SplitPicker({ value, recommended, onChange }: { value: string; recommended: string; onChange: (id: string) => void }) {
  return (
    <>
      {Object.values(SPLITS).map((s) => (
        <Option
          key={s.id}
          label={`${s.name}${s.id === recommended ? " · recommended" : ""}`}
          hint={s.days.map((d) => d.name).join(" → ")}
          selected={value === s.id}
          onPress={() => onChange(s.id)}
        />
      ))}
    </>
  );
}


// ── Body ──────────────────────────────────────────────────────────────────

const SEX_OPTIONS: { id: Sex; label: string }[] = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "other", label: "Prefer not to say" },
];

function NumberField({ label, value, unit, onChange, placeholder }: { label: string; value?: number; unit: string; onChange: (v?: number) => void; placeholder: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <Row>
        <TextInput
          value={value != null ? String(value) : ""}
          onChangeText={(v) => {
            const n = Number(v.replace(",", "."));
            onChange(v.trim() && Number.isFinite(n) ? n : undefined);
          }}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          style={[inputStyle, { flex: 1, minWidth: 0 }]}
        />
        <Text style={[type.strong, { width: 48 }]}>{unit}</Text>
      </Row>
    </View>
  );
}

export function BodyForm({ body, onChange }: { body: Body; onChange: (b: Body) => void }) {
  const age = body.birthYear ? new Date().getFullYear() - body.birthYear : null;
  return (
    <View style={{ gap: space.md }}>
      <Text style={type.small}>
        Used for calorie and protein targets and heart-rate zones. It stays on your phone. Skip anything you&apos;d rather not share.
      </Text>
      <Label>Sex (for calorie maths)</Label>
      <Wrap>
        {SEX_OPTIONS.map((s) => (
          <Chip key={s.id} label={s.label} selected={body.sex === s.id} onPress={() => onChange({ ...body, sex: s.id })} />
        ))}
      </Wrap>
      <NumberField label={`Birth year${age ? ` · ${age} years old` : ""}`} value={body.birthYear} unit="" placeholder="e.g. 1998" onChange={(birthYear) => onChange({ ...body, birthYear })} />
      <NumberField label="Height" value={body.heightCm} unit="cm" placeholder="e.g. 175" onChange={(heightCm) => onChange({ ...body, heightCm })} />
      <NumberField label="Weight" value={body.weightKg} unit="kg" placeholder="e.g. 72" onChange={(weightKg) => onChange({ ...body, weightKg })} />
    </View>
  );
}

// ── Food preferences ──────────────────────────────────────────────────────

const DIET_HINTS: Record<string, string> = {
  none: "Everything's on the menu",
  pescatarian: "Vegetarian plus fish and seafood",
  eggetarian: "Vegetarian plus eggs",
  vegetarian: "No meat, fish or eggs; dairy is fine",
  vegan: "Plants only",
};

export function FoodPrefsForm({ food, onChange }: { food: FoodPrefs; onChange: (f: FoodPrefs) => void }) {
  return (
    <View style={{ gap: space.md }}>
      <Text style={type.small}>Suggestions and search results respect these. You can still log anything you like.</Text>
      {Object.entries(DIET_TYPES).map(([id, label]) => (
        <Option key={id} label={label} hint={DIET_HINTS[id]} selected={food.dietType === id} onPress={() => onChange({ ...food, dietType: id })} />
      ))}
      <Label>Allergies & intolerances</Label>
      <Wrap>
        {Object.entries(ALLERGENS).map(([id, label]) => (
          <Chip key={id} label={label} selected={food.allergies.includes(id)} onPress={() => onChange({ ...food, allergies: toggle(food.allergies, id) })} />
        ))}
      </Wrap>
    </View>
  );
}
