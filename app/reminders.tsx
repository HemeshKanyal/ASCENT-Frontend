import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import {
  REMINDERS_SUPPORTED,
  REMINDERS_UNAVAILABLE_TEXT,
  getReminders,
  permissionStatus,
  requestPermission,
  saveReminders,
  sendTestReminder,
  syncReminders,
  type Reminders,
} from "../src/services/reminders";
import { loadProgress } from "../src/services/streakStore";
import { WEEKDAYS, loadToday } from "../src/services/trainingStore";
import { Button, Card, Chip, Loading, Note, Row, Screen, Title, Wrap } from "../src/ui/components";
import { colors, fonts, radius, space, type } from "../src/ui/theme";

const shift = (t: string, minutes: number) => {
  const [h, m] = t.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

function Time({ label, value, onChange }: { label: string; value: string; onChange: (t: string) => void }) {
  const step = (d: number) => (
    <Pressable
      onPress={() => onChange(shift(value, d))}
      hitSlop={8}
      style={{ width: 36, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={type.strong}>{d < 0 ? "−" : "+"}</Text>
    </Pressable>
  );
  return (
    <Row style={{ justifyContent: "space-between" }}>
      <Text style={type.body}>{label}</Text>
      <Row gap={space.md}>
        {step(-15)}
        <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.text, width: 54, textAlign: "center" }}>{value}</Text>
        {step(15)}
      </Row>
    </Row>
  );
}

function Section({
  title,
  sub,
  on,
  onToggle,
  children,
}: {
  title: string;
  sub: string;
  on: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <Card active={on}>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.h3}>{title}</Text>
          <Text style={type.small}>{sub}</Text>
        </View>
        <Switch value={on} onValueChange={onToggle} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={on ? colors.bg : colors.muted} />
      </Row>
      {on ? children : null}
    </Card>
  );
}

export default function RemindersScreen() {
  const [r, setR] = useState<Reminders | null>(null);
  const [perm, setPerm] = useState<string>("undetermined");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getReminders().then(setR);
    permissionStatus().then(setPerm);
  }, []);

  if (!r) return <Loading />;

  const update = <K extends keyof Reminders>(k: K, patch: Partial<Reminders[K]>) => setR({ ...r, [k]: { ...r[k], ...patch } });

  const save = async () => {
    await saveReminders(r);
    if (!REMINDERS_SUPPORTED) return router.back();
    const ok = perm === "granted" || (await requestPermission());
    setPerm(ok ? "granted" : "denied");
    if (!ok) return setMsg("Notifications are off for ASCENT — turn them on in your phone's Settings, then save again.");
    const [today, progress] = await Promise.all([loadToday(), loadProgress()]);
    if (today) {
      await syncReminders({ weekPlan: today.weekPlan, trainingDays: today.profile.trainingDays, streaks: progress?.streaks, doneToday: today.doneToday.length > 0 });
    }
    router.back();
  };

  return (
    <Screen
      footer={
        <Row>
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button title="Save" onPress={save} style={{ flex: 2 }} />
        </Row>
      }
    >
      <Title kicker="Profile" sub="Reminders follow your plan: rest days stay quiet, and a day you've already trained gets no nagging.">
        Reminders
      </Title>
      {!REMINDERS_SUPPORTED ? <Note>{REMINDERS_UNAVAILABLE_TEXT}</Note> : null}
      {perm === "denied" ? <Note>Notifications are blocked for ASCENT. Turn them on in your phone&apos;s Settings.</Note> : null}

      <Section title="Workout" sub="On training days, with what's planned" on={r.workout.on} onToggle={(on) => update("workout", { on })}>
        <Time label="Remind me at" value={r.workout.time} onChange={(time) => update("workout", { time })} />
      </Section>
      <Section title="Streak saver" sub="Evening nudge only if you haven't trained yet" on={r.streak.on} onToggle={(on) => update("streak", { on })}>
        <Time label="Remind me at" value={r.streak.time} onChange={(time) => update("streak", { time })} />
      </Section>
      <Section title="Meals" sub="A nudge to snap or log each meal" on={r.meals.on} onToggle={(on) => update("meals", { on })}>
        <Time label="Breakfast" value={r.meals.breakfast} onChange={(breakfast) => update("meals", { breakfast })} />
        <Time label="Lunch" value={r.meals.lunch} onChange={(lunch) => update("meals", { lunch })} />
        <Time label="Dinner" value={r.meals.dinner} onChange={(dinner) => update("meals", { dinner })} />
      </Section>
      <Section title="Water" sub="Regular sips through the day" on={r.water.on} onToggle={(on) => update("water", { on })}>
        <Time label="From" value={r.water.from} onChange={(from) => update("water", { from })} />
        <Time label="Until" value={r.water.to} onChange={(to) => update("water", { to })} />
        <Wrap>
          {[1, 2, 3].map((h) => (
            <Chip key={h} label={`Every ${h} h`} selected={r.water.everyHours === h} onPress={() => update("water", { everyHours: h })} />
          ))}
        </Wrap>
      </Section>
      <Section title="Supplements" sub="Daily, for your stack" on={r.supplements.on} onToggle={(on) => update("supplements", { on })}>
        <Time label="Remind me at" value={r.supplements.time} onChange={(time) => update("supplements", { time })} />
      </Section>
      <Section title="Weekly weigh-in" sub="Same day and time each week" on={r.weighIn.on} onToggle={(on) => update("weighIn", { on })}>
        <Wrap>
          {WEEKDAYS.map((d) => (
            <Chip key={d.id} label={d.short} selected={r.weighIn.day === d.id} onPress={() => update("weighIn", { day: d.id })} />
          ))}
        </Wrap>
        <Time label="At" value={r.weighIn.time} onChange={(time) => update("weighIn", { time })} />
      </Section>

      {REMINDERS_SUPPORTED ? (
        <Button
          title="Send a test reminder"
          variant="ghost"
          onPress={async () => {
            const ok = perm === "granted" || (await requestPermission());
            setPerm(ok ? "granted" : "denied");
            if (ok) {
              await sendTestReminder();
              setMsg("Sent — it arrives in a few seconds.");
            }
          }}
        />
      ) : null}
      {msg ? <Text style={[type.small, { color: colors.text }]}>{msg}</Text> : null}
    </Screen>
  );
}
