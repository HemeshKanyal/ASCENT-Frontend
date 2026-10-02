import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { MEALS, addEntry, type Meal } from "../../src/services/nutritionStore";
import { AI_ERROR_TEXT, analyzeMeal, toLoggable, type AIError } from "../../src/services/mealAI";
import { getProfile } from "../../src/services/trainingStore";
import { Button, Chip, Label, Note, Row, Screen, Title, Wrap } from "../../src/ui/components";
import { MealReview, totalsOf, type ReviewItem } from "../../src/ui/MealReview";
import { colors, fonts, radius, space, type } from "../../src/ui/theme";

type Picked = { uri: string; base64: string; mimeType: string };

async function pick(source: "camera" | "library"): Promise<Picked | null | "denied"> {
  const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return "denied";
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.5, base64: true };
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  const a = res.canceled ? null : res.assets[0];
  if (!a?.base64) return null;
  return { uri: a.uri, base64: a.base64, mimeType: a.mimeType ?? "image/jpeg" };
}

export default function MealPhoto() {
  const params = useLocalSearchParams<{ meal?: Meal; day: string; source?: "camera" | "library" }>();
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [hint, setHint] = useState("");
  const [state, setState] = useState<"idle" | "denied" | "working">("idle");
  const [error, setError] = useState<AIError | null>(null);
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [notes, setNotes] = useState("");
  const [meal, setMeal] = useState<Meal>(params.meal ?? "lunch");
  const [conditions, setConditions] = useState<string[]>([]);

  const choose = async (source: "camera" | "library") => {
    const r = await pick(source);
    if (r === "denied") setState("denied");
    else if (r) {
      setPhoto(r);
      setItems(null);
      setError(null);
    }
  };

  useEffect(() => {
    getProfile().then((p) => setConditions(p?.health.conditions ?? []));
  }, []);
  const first = params.source === "library" ? "library" : "camera";

  const analyze = async () => {
    if (!photo) return;
    setState("working");
    setError(null);
    const r = await analyzeMeal({ image: photo.base64, mediaType: photo.mimeType, hint });
    setState("idle");
    if (!r.ok) return setError(r.error);
    if (!r.result.is_food || !r.result.items.length) {
      setNotes(r.result.notes || "No food found in this photo.");
      return setItems([]);
    }
    setNotes(r.result.notes);
    setItems(toLoggable(r.result.items).map((i) => ({ ...i, on: true })));
  };

  const addAll = async () => {
    for (const i of (items ?? []).filter((x) => x.on)) await addEntry(params.day, i.food, i.grams, meal, i.label === "adjusted" ? undefined : i.label);
    router.dismissTo("/fuel");
  };

  const total = items ? totalsOf(items) : null;

  return (
    <Screen
      footer={
        items?.length ? (
          <Row>
            <Button title="Retake" variant="secondary" onPress={() => choose(params.source ?? "camera")} style={{ flex: 1 }} />
            <Button title={`Add · ${Math.round(total!.kcal)} kcal`} onPress={addAll} style={{ flex: 2 }} />
          </Row>
        ) : photo ? (
          <Button title={state === "working" ? "Looking at your plate…" : "Estimate this meal"} disabled={state === "working"} onPress={analyze} />
        ) : (
          <Row>
            <Button title="Take photo" variant={first === "camera" ? "primary" : "secondary"} onPress={() => choose("camera")} style={{ flex: 1 }} />
            <Button title="Upload" variant={first === "library" ? "primary" : "secondary"} onPress={() => choose("library")} style={{ flex: 1 }} />
          </Row>
        )
      }
    >
      <Title kicker="Fuel · photo">What&apos;s on your plate?</Title>
      {state === "denied" ? <Note>ASCENT needs camera or photo access for this — allow it in Settings, or use Describe instead.</Note> : null}

      {photo ? (
        <Image source={{ uri: photo.uri }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.surface }} contentFit="cover" />
      ) : (
        <Text style={type.small}>Snap your meal from above with the whole plate in frame. AI identifies each dish and estimates how much — no weighing needed.</Text>
      )}

      {photo && !items ? (
        <>
          <Label>Anything the photo can&apos;t show? (optional)</Label>
          <TextInput
            value={hint}
            onChangeText={setHint}
            placeholder="e.g. 4 rotis, lassi not in the photo"
            placeholderTextColor={colors.faint}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              padding: space.md,
              fontSize: 15,
              fontFamily: fonts.regular,
            }}
          />
          {state === "working" ? (
            <Row>
              <ActivityIndicator color={colors.accent} />
              <Text style={type.small}>Identifying dishes and estimating portions…</Text>
            </Row>
          ) : null}
        </>
      ) : null}

      {error ? <Note>{AI_ERROR_TEXT[error]}</Note> : null}

      {items ? (
        <>
          {notes ? <Note>{notes}</Note> : null}
          {items.length ? <MealReview items={items} onChange={setItems} conditions={conditions} /> : null}
          {items.length ? (
            <View style={{ gap: space.sm }}>
              <Label>Meal</Label>
              <Wrap>
                {MEALS.map((m) => (
                  <Chip key={m.id} label={m.label} selected={meal === m.id} onPress={() => setMeal(m.id)} />
                ))}
              </Wrap>
              <Text style={[type.small, { color: colors.faint }]}>AI estimates from a photo can be off by 20–30% — nudge portions with − / + if you know better.</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
