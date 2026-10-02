/** The strength workout view: split day, places, balance, warm-up, exercises, cool-down. */
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import type { Flow } from "../engine";
import { placeById } from "../data/places";
import { removeExercise, reshuffle, setActivePlace, type GuidedMode, type Today, type WorkoutExercise } from "../services/trainingStore";
import { BalanceCard } from "./BalanceCard";
import { Badge, Button, Card, Chip, Label, Note, Row, Wrap } from "./components";
import { clock, muscle, range } from "./format";
import { colors, fonts, space, type } from "./theme";

// ── Strength ──────────────────────────────────────────────────────────────

function ExerciseCard({ item, index, onRemove }: { item: WorkoutExercise; index: number; onRemove: () => void }) {
  const isAnchor = item.role === "anchor";
  const [confirm, setConfirm] = useState(false);
  return (
    <Card onPress={() => router.push({ pathname: "/exercise/[id]", params: { id: item.exerciseId } })}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <Row gap={space.md} style={{ flex: 1, alignItems: "flex-start" }}>
          <Text style={[type.h2, { color: colors.faint, width: 26 }]}>{index + 1}</Text>
          <View style={{ flex: 1, gap: 6 }}>
            <Row gap={6}>
              <Badge label={isAnchor ? "ANCHOR" : item.role === "custom" ? "ADDED" : "ROTATION"} solid={isAnchor} />
              {item.substitutedFor ? <Badge label="SWAPPED" /> : null}
            </Row>
            <Text style={type.h3}>{item.name}</Text>
          </View>
        </Row>
        <Button title="Swap" compact variant="secondary" onPress={() => router.push({ pathname: "/swap", params: { index: String(index) } })} />
      </Row>

      <View style={{ paddingLeft: 26 + space.md, gap: 4 }}>
        <Text style={type.strong}>
          {item.sets} × {range(item.repRange)} · {item.rir} RIR · rest {clock(item.restSeconds)}
        </Text>
        {item.suggestedWeight != null ? (
          <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.text }}>Try {item.suggestedWeight} kg</Text>
        ) : null}
        <Text style={type.small}>{item.loadNote}</Text>
        {item.technique ? <Text style={[type.small, { color: colors.text }]}>⚡ {item.technique.label}</Text> : null}
        {item.tempo ? <Text style={[type.small, { color: colors.text }]}>⏱ Tempo: {item.tempo}</Text> : null}
        <Text style={[type.small, { color: colors.faint, fontStyle: "italic" }]}>{item.why}</Text>
        <Button
          title={confirm ? "Tap again to remove" : "Remove for today"}
          compact
          variant={confirm ? "danger" : "ghost"}
          style={{ alignSelf: "flex-start", marginLeft: -12 }}
          onPress={() => (confirm ? onRemove() : setConfirm(true))}
        />
      </View>
    </Card>
  );
}

export function FlowCard({ flow, label, onStart }: { flow: Flow; label: string; onStart: () => void }) {
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Label>{label}</Label>
          <Text style={type.h3}>{flow.summary}</Text>
        </View>
        <Button title="Start" compact variant="secondary" onPress={onStart} />
      </Row>
      <Text style={type.small} numberOfLines={2}>
        {[...new Set(flow.steps.map((s) => s.label.replace(/ · (left|right)$/, "")))].join(" · ")}
      </Text>
    </Card>
  );
}

export function StrengthView({ today, load, guide }: { today: Today; load: () => void; guide: (mode: GuidedMode, s: Flow) => void }) {
  const { workout, split, profile, warmup, cooldown } = today;
  const totalSets = workout.exercises.reduce((n, e) => n + e.sets, 0);

  const shuffle = async (dayName?: string) => {
    await reshuffle(dayName ?? workout.dayName);
    load();
  };

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {split.days.map((d) => (
          <Chip key={d.name} label={d.name} selected={d.name === workout.dayName} onPress={() => shuffle(d.name)} />
        ))}
      </ScrollView>

      {profile.places.length > 1 ? (
        <View style={{ gap: space.sm }}>
          <Label>Training at</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {profile.places.map((p) => (
              <Chip
                key={p}
                label={placeById(p)?.label ?? p}
                selected={p === profile.activePlace}
                onPress={async () => {
                  await setActivePlace(p);
                  load();
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {workout.deload ? (
        <Card active>
          <Text style={type.h2}>Deload week</Text>
          <Text style={type.small}>Fewer sets and lighter effort so you recover and start the next block fresh.</Text>
        </Card>
      ) : null}

      <Wrap>
        {workout.muscles.map((m) => (
          <Chip key={m} label={`${muscle(m)} · ${workout.planned[m] ?? 0}`} />
        ))}
      </Wrap>
      <Text style={type.small}>
        {workout.exercises.length} exercises · {totalSets} sets · ~{profile.sessionMinutes} min. Anchors stay all block; rotations change every session.
      </Text>
      {workout.uncovered.length ? (
        <Note>Not enough options for {workout.uncovered.map(muscle).join(", ")} with this equipment. Add equipment in Profile → Where you train.</Note>
      ) : null}

      <BalanceCard items={today.balance} />

      <FlowCard flow={warmup} label="Warm-up first" onStart={() => guide("warmup", warmup)} />

      {workout.exercises.map((e, i) => (
        <ExerciseCard
          key={`${e.exerciseId}-${i}`}
          item={e}
          index={i}
          onRemove={async () => {
            await removeExercise(i);
            load();
          }}
        />
      ))}
      <Button title="+ Add exercise" variant="secondary" onPress={() => router.push("/pick-exercise")} />

      {cooldown ? <FlowCard flow={cooldown} label="Cool-down" onStart={() => guide("cooldown", cooldown)} /> : null}
      <Button title="Shuffle rotations" variant="ghost" onPress={() => shuffle()} />
    </>
  );
}

