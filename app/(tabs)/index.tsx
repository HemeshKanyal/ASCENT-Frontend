import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState, type ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

import { ACTIVITIES, ACTIVITY_CATEGORIES, DISCIPLINE_ACTIVITY, type EnduranceSession, type Flow, type PlannedDay } from "../../src/engine";
import { needsClearance } from "../../src/data/health";
import { syncReminders } from "../../src/services/reminders";
import { loadProgress, markBadgesSeen, type Progress } from "../../src/services/streakStore";
import { loadToday, recoveryFlow, setGuided, type GuidedMode, type Today } from "../../src/services/trainingStore";
import { Button, Card, Label, Loading, Note, Row, Screen, Title } from "../../src/ui/components";
import { dayIcon, dayLabel } from "../../src/ui/sessionMeta";
import { Badge, StreakBar } from "../../src/ui/Streaks";
import { colors, fonts, radius, space, type } from "../../src/ui/theme";
import { WeekStrip } from "../../src/ui/WeekStrip";

type Icon = ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<string, Icon> = {
  strength: "barbell", run: "walk", trail_run: "trail-sign", walk: "footsteps", hike: "triangle", ride: "bicycle", indoor_ride: "bicycle",
  swim_pool: "water", swim_open: "water", row: "boat", hiit: "flash", hyrox: "flame", yoga: "leaf", pilates: "body", mobility: "accessibility",
  breathwork: "cloud", football: "football", cricket: "baseball", basketball: "basketball", tennis: "tennisball", badminton: "tennisball",
  martial_arts: "hand-left", climbing: "trending-up", dance: "musical-notes", jump_rope: "infinite",
};

function Tile({ id, label, onPress }: { id: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "31%",
        aspectRatio: 1,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.raised : colors.surface,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 6,
      })}
    >
      <Ionicons name={ICONS[id] ?? "pulse"} size={26} color={colors.text} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.text, textAlign: "center" }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Where tapping an activity goes. */
function openActivity(id: string) {
  if (id === "strength") return router.push("/strength");
  const a = ACTIVITIES.find((x) => x.id === id);
  if (a?.flow) return router.push({ pathname: "/guide/[id]", params: { id } });
  router.push({ pathname: "/record", params: { activity: id } });
}

export default function TodayScreen() {
  const [today, setToday] = useState<Today | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const load = useCallback(async () => {
    const data = await loadToday();
    if (!data) {
      router.replace("/onboarding");
      return;
    }
    setToday(data);
    const p = await loadProgress();
    setProgress(p);
    syncReminders({ weekPlan: data.weekPlan, trainingDays: data.profile.trainingDays, streaks: p?.streaks, doneToday: data.doneToday.length > 0 }).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!today) return <Loading />;
  const { todayPlan, session, block, workout, profile, engine, weekPlan, sessions, age, doneToday, active } = today;

  const guide = async (mode: GuidedMode, s: EnduranceSession | Flow) => {
    await setGuided({ mode, session: s, age });
    router.push("/guided");
  };

  /** Start what the plan suggests. */
  const startPlan = (day: PlannedDay) => {
    if (day.kind === "strength") return router.push("/strength");
    if (day.kind === "mobility") return session && session.kind === "mobility" ? guide("mobility", session) : undefined;
    if (day.discipline === "hyrox" || day.discipline === "conditioning") return session && session.kind === "endurance" ? guide("endurance", session) : undefined;
    router.push({ pathname: "/record", params: { activity: DISCIPLINE_ACTIVITY[day.discipline], type: day.type } });
  };

  const clearance = needsClearance(profile.health);
  const dateText = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
  const planLabel = todayPlan ? (todayPlan.kind === "strength" ? `Strength · ${workout.dayName}` : dayLabel(todayPlan)) : "Rest day";
  const categories = Object.entries(ACTIVITY_CATEGORIES) as [keyof typeof ACTIVITY_CATEGORIES, string][];

  return (
    <Screen>
      <Title kicker={`${dateText} · Block ${block.number} · Week ${workout.blockWeek}/${block.weeks}`}>What do you want to do today?</Title>
      <WeekStrip plan={weekPlan} sessions={sessions} />
      {progress ? <StreakBar s={progress.streaks} onPress={() => router.push("/achievements")} /> : null}

      {progress?.fresh.length ? (
        <Card active>
          <Label>{progress.fresh.length > 1 ? "New badges" : "New badge"}</Label>
          <Row gap={0}>
            {progress.fresh.slice(0, 4).map((b) => (
              <Badge key={b.id} b={b} size={52} />
            ))}
          </Row>
          <Text style={type.small}>{progress.fresh.map((b) => b.desc).join(" · ")}</Text>
          <Button
            title="Nice"
            variant="secondary"
            onPress={async () => {
              await markBadgesSeen(progress.fresh.map((b) => b.id));
              setProgress({ ...progress, fresh: [] });
            }}
          />
        </Card>
      ) : null}

      {clearance.urgent && !profile.health.cleared ? (
        <Note>Please get a doctor&apos;s OK before training hard. Sessions are kept gentle until then.</Note>
      ) : engine.conservative ? (
        <Note>Gentle mode: no max efforts, 2–3 reps in reserve, breathe through every rep.</Note>
      ) : null}

      {active ? (
        <Card active>
          <Text style={type.h3}>Workout in progress · {active.dayName}</Text>
          <Button title="Resume" onPress={() => router.push("/workout-session")} />
        </Card>
      ) : null}

      <Card active={!doneToday.length}>
        <Label>Your plan suggests</Label>
        <Row style={{ justifyContent: "space-between" }}>
          <Row gap={space.md} style={{ flex: 1 }}>
            <Ionicons name={dayIcon(todayPlan)} size={26} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={type.h2}>{planLabel}</Text>
              {todayPlan && session ? <Text style={type.small}>{session.summary}</Text> : null}
              {!todayPlan ? <Text style={type.small}>Recovery is training too — or pick anything below.</Text> : null}
            </View>
          </Row>
        </Row>
        {todayPlan ? (
          <Button title="Start" onPress={() => startPlan(todayPlan)} />
        ) : (
          <Button
            title="15-min recovery flow"
            variant="secondary"
            onPress={async () => {
              const flow = await recoveryFlow(15);
              if (flow) guide("mobility", flow);
            }}
          />
        )}
      </Card>

      {doneToday.length ? (
        <Card>
          <Label>Done today</Label>
          {doneToday.map((s) => (
            <Pressable key={s.id} onPress={() => router.push({ pathname: "/activity/[id]", params: { id: s.id } })}>
              <Text style={type.body}>
                ✓ {s.title ?? s.dayName ?? "Session"}
                {s.distanceKm ? ` · ${s.distanceKm} km` : ""}
                {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Label>Or choose anything</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: "3.5%", rowGap: space.md }}>
        <Tile id="strength" label="Strength" onPress={() => openActivity("strength")} />
        {ACTIVITIES.filter((a) => a.category === "cardio" || a.category === "outdoor").map((a) => (
          <Tile key={a.id} id={a.id} label={a.name} onPress={() => openActivity(a.id)} />
        ))}
      </View>
      {categories
        .filter(([c]) => c !== "cardio" && c !== "outdoor")
        .map(([c, label]) => (
          <View key={c} style={{ gap: space.sm }}>
            <Label>{label}</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: "3.5%", rowGap: space.md }}>
              {ACTIVITIES.filter((a) => a.category === c).map((a) => (
                <Tile key={a.id} id={a.id} label={a.name} onPress={() => openActivity(a.id)} />
              ))}
            </View>
          </View>
        ))}
    </Screen>
  );
}
