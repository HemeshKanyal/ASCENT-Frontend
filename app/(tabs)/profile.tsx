import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import { ALLERGENS, DIET_TYPES, SPLITS, getExercise } from "../../src/engine";
import { goalById } from "../../src/data/goals";
import { conditionById, healthModifiers, needsClearance } from "../../src/data/health";
import { placeById } from "../../src/data/places";
import {
  WEEKDAYS,
  getProfile,
  getSessions,
  resetAllData,
  saveProfile,
  startNewBlock,
  type LoggedSession,
  type Profile,
} from "../../src/services/trainingStore";
import { cachedMe, deleteAccount, signOut, type Me } from "../../src/services/community";
import { clearProfilePhoto, getLocalPhoto, pickProfilePhoto } from "../../src/services/profilePhoto";
import { loadProgress, resetStreakData, type Progress } from "../../src/services/streakStore";
import { Button, Card, Chip, Label, Loading, Row, Screen, Title, Wrap } from "../../src/ui/components";
import { LEVEL_OPTIONS } from "../../src/ui/editors";
import { Heatmap } from "../../src/ui/Heatmap";
import { Avatar } from "../../src/ui/social";
import { StreakSummary } from "../../src/ui/Streaks";
import { colors, space, type } from "../../src/ui/theme";

function Section({ label, summary, href }: { label: string; summary: string; href: Href }) {
  return (
    <Card onPress={() => router.push(href)} style={{ paddingVertical: space.md }}>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Label>{label}</Label>
          <Text style={type.body}>{summary}</Text>
        </View>
        <Text style={[type.h3, { color: colors.faint }]}>›</Text>
      </Row>
    </Card>
  );
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<LoggedSession[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile);
      getSessions().then(setSessions);
      loadProgress().then(setProgress);
      cachedMe().then(setMe);
      getLocalPhoto().then(setPhoto);
    }, [])
  );

  if (!profile) return <Loading />;

  const level = LEVEL_OPTIONS.find((l) => l.id === profile.level)?.label;
  const goals = profile.goals.map((g) => (g === profile.primaryGoal ? `${goalById(g)?.label} (main)` : goalById(g)?.label));
  const places = profile.places.map((p) => placeById(p)?.label ?? p);
  const days = WEEKDAYS.filter((d) => profile.trainingDays.includes(d.id)).map((d) => d.label.slice(0, 3));
  const mods = healthModifiers(profile.health);
  const clearance = needsClearance(profile.health);
  const conditions = profile.health.conditions.map((c) => conditionById(c)?.label).filter(Boolean);
  const healthSummary = [
    conditions.length ? conditions.join(", ") : "No conditions",
    profile.injuries.length ? `protecting ${profile.injuries.length} joint${profile.injuries.length > 1 ? "s" : ""}` : null,
    mods.conservative ? "gentle mode on" : null,
    clearance.recommended && !profile.health.cleared ? "doctor's OK pending" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const { sex, birthYear, heightCm, weightKg } = profile.body;
  const bodySummary =
    [birthYear ? `${new Date().getFullYear() - birthYear} yrs` : null, heightCm ? `${heightCm} cm` : null, weightKg ? `${weightKg} kg` : null, sex && sex !== "other" ? sex : null]
      .filter(Boolean)
      .join(" · ") || "Add height, weight and age for nutrition targets";

  return (
    <Screen>
      <Row gap={space.lg}>
        <Avatar name={me?.name ?? "You"} uri={photo ?? me?.avatarUrl} size={76} />
        <View style={{ flex: 1, gap: 6 }}>
          <Title kicker="Profile">{me?.name ?? "Your training"}</Title>
          <Text style={[type.small, { color: colors.text, textDecorationLine: "underline" }]} onPress={() => setPhotoMenu(!photoMenu)}>
            {photo || me?.avatarUrl ? "Change photo" : "Add profile photo"}
          </Text>
        </View>
      </Row>
      {photoMenu ? (
        <Row>
          {(["camera", "library"] as const).map((src) => (
            <Button
              key={src}
              title={src === "camera" ? "Take photo" : "Choose photo"}
              variant="secondary"
              style={{ flex: 1 }}
              onPress={async () => {
                setPhotoMenu(false);
                try {
                  const r = await pickProfilePhoto(src);
                  if (r) {
                    setPhoto(r.uri);
                    setNotice(r.synced ? "Photo updated — friends will see it too." : "Photo saved. Sign in to Crew to show it to friends.");
                  }
                } catch (e) {
                  setNotice((e as Error).message === "camera_denied" ? "Camera access is off — allow it in Settings." : "Couldn't update the photo — try again.");
                }
              }}
            />
          ))}
          {photo || me?.avatarUrl ? (
            <Button
              title="Remove"
              variant="ghost"
              onPress={async () => {
                setPhotoMenu(false);
                await clearProfilePhoto().catch(() => {});
                setPhoto(null);
                setMe(await cachedMe());
              }}
            />
          ) : null}
        </Row>
      ) : null}

      {progress ? <StreakSummary s={progress.streaks} badges={progress.badges} onPress={() => router.push("/achievements")} /> : null}

      <Card>
        <Label>Recent months</Label>
        <Heatmap sessions={sessions} />
      </Card>

      {notice ? <Text style={[type.small, { color: colors.text }]}>{notice}</Text> : null}

      <Section label="Experience" summary={level ?? profile.level} href="/edit/level" />
      <Section label="Your body" summary={bodySummary} href="/edit/body" />
      <Section label="Goals" summary={goals.join(", ")} href="/edit/goals" />
      <Section label="Where you train" summary={places.join(", ")} href="/edit/places" />
      <Section label="Schedule" summary={`${days.join(" · ")} · ${profile.sessionMinutes} min`} href="/edit/schedule" />
      <Section label="Split" summary={SPLITS[profile.splitId]?.name ?? profile.splitId} href="/edit/split" />
      <Section label="Health" summary={healthSummary} href="/edit/health" />
      <Section label="Reminders" summary="Workouts, streak saver, meals, water, weigh-in" href="/reminders" />
      <Section label="Connected devices" summary="Apple Watch, Garmin, WHOOP, Strava…" href={"/devices" as Href} />
      <Section
        label="Food preferences"
        summary={[DIET_TYPES[profile.food.dietType], ...profile.food.allergies.map((a) => `no ${ALLERGENS[a]?.toLowerCase() ?? a}`)].join(" · ")}
        href="/edit/food"
      />

      {profile.disliked.length ? (
        <Card>
          <Label>Never suggest</Label>
          <Text style={type.small}>Tap to allow again.</Text>
          <Wrap>
            {profile.disliked.map((id) => (
              <Chip
                key={id}
                label={`${getExercise(id)?.name ?? id}  ✕`}
                onPress={async () => {
                  const next = { ...profile, disliked: profile.disliked.filter((x) => x !== id) };
                  setProfile(next);
                  await saveProfile(next);
                }}
              />
            ))}
          </Wrap>
        </Card>
      ) : null}

      <Card>
        <Label>Training block</Label>
        <Text style={type.small}>
          Blocks end on their own after a few weeks. Start one early if your anchors feel stale or you&apos;re coming back from a break.
        </Text>
        <Button
          title="Start a new block now"
          variant="secondary"
          onPress={async () => {
            await startNewBlock();
            setNotice("New block started with fresh anchors.");
          }}
        />
      </Card>

      <Card>
        <Label>Community account</Label>
        {me ? (
          <>
            <Text style={type.body}>
              {me.name} · @{me.handle}
            </Text>
            <Text style={type.small}>
              {me.email} · friend code {me.friendCode}
            </Text>
            <Row>
              <Button
                title="Sign out"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={async () => {
                  await signOut();
                  setMe(null);
                }}
              />
              <Button
                title={confirmDeleteAccount ? "Tap again" : "Delete account"}
                variant="danger"
                style={{ flex: 1 }}
                onPress={async () => {
                  if (!confirmDeleteAccount) return setConfirmDeleteAccount(true);
                  try {
                    await deleteAccount();
                    setMe(null);
                    setNotice("Account and everything you shared were deleted. Your training stays on this phone.");
                  } catch (e) {
                    setNotice((e as Error).message);
                  }
                }}
              />
            </Row>
          </>
        ) : (
          <>
            <Text style={type.small}>Sign in to share activities, add friends and join clubs. Optional.</Text>
            <Button title="Sign in or create account" variant="secondary" onPress={() => router.push({ pathname: "/account", params: { mode: "signup" } })} />
          </>
        )}
      </Card>

      <Button
        title={confirmReset ? "Tap again to erase everything" : "Reset all data"}
        variant="danger"
        onPress={async () => {
          if (!confirmReset) return setConfirmReset(true);
          await resetAllData();
          await resetStreakData();
          router.replace("/onboarding");
        }}
      />
    </Screen>
  );
}
