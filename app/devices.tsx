import { router } from "expo-router";
import { Text, View } from "react-native";

import { Badge, Button, Card, Label, Note, Row, Screen, Title } from "../src/ui/components";
import { space, type } from "../src/ui/theme";

type Status = "build" | "keys" | "via_strava" | "approval";

const STATUS: Record<Status, string> = {
  build: "NEEDS FULL APP BUILD",
  keys: "NEEDS API KEYS",
  via_strava: "VIA STRAVA",
  approval: "NEEDS APPROVAL",
};

const DEVICES: { name: string; brings: string; status: Status; how: string }[] = [
  {
    name: "Apple Health / Apple Watch",
    brings: "Workouts, heart rate, steps, sleep, resting HR and weight — automatically.",
    status: "build",
    how: "Apple's HealthKit only works in a full app build (not Expo Go). Planned for the first installable version.",
  },
  {
    name: "Health Connect (Android)",
    brings: "The same for Android phones and watches (Samsung, Pixel, Wear OS).",
    status: "build",
    how: "Like HealthKit, it needs a full app build.",
  },
  {
    name: "Strava",
    brings: "Runs, rides and swims from almost any watch that syncs to Strava — routes, pace, heart rate.",
    status: "keys",
    how: "Needs a free Strava API app (client ID + secret) and the ASCENT backend to keep the secret safe.",
  },
  {
    name: "WHOOP",
    brings: "Recovery, strain, sleep and heart rate — could steer your daily training load.",
    status: "keys",
    how: "Needs a WHOOP developer app (OAuth) and the backend for tokens.",
  },
  {
    name: "Fitbit",
    brings: "Steps, heart rate, sleep and workouts.",
    status: "keys",
    how: "Needs a Fitbit Web API app (OAuth) and the backend.",
  },
  {
    name: "Garmin",
    brings: "Activities, heart rate, Body Battery, sleep.",
    status: "via_strava",
    how: "Garmin's official API is for approved business partners. Easiest route: turn on Garmin → Strava sync, then connect Strava here.",
  },
  {
    name: "Polar, Coros, Suunto, Amazfit",
    brings: "Activities and heart rate.",
    status: "via_strava",
    how: "All can auto-sync to Strava, which ASCENT can import from.",
  },
  {
    name: "Bluetooth heart-rate strap",
    brings: "Live heart rate during runs and guided sessions (chest straps and many watches can broadcast).",
    status: "build",
    how: "Bluetooth needs a full app build.",
  },
];

export default function Devices() {
  return (
    <Screen footer={<Button title="Back" variant="secondary" onPress={() => router.back()} />}>
      <Title kicker="Profile">Connected devices</Title>
      <Note>
        None of these are connected yet. Each needs one of: a full app build (instead of Expo Go), developer API keys plus the ASCENT backend, or a partner approval. Until then, record activities with your phone&apos;s GPS and type in heart rate after a session.
      </Note>
      {DEVICES.map((d) => (
        <Card key={d.name}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Text style={[type.h3, { flex: 1 }]}>{d.name}</Text>
            <Badge label={STATUS[d.status]} />
          </Row>
          <Text style={type.body}>{d.brings}</Text>
          <Text style={type.small}>{d.how}</Text>
        </Card>
      ))}
      <View style={{ gap: space.xs }}>
        <Label>Recommended order</Label>
        <Text style={type.small}>1. Strava — covers most watches today. 2. Apple Health / Health Connect with the first full build. 3. WHOOP for recovery-based training.</Text>
      </View>
    </Screen>
  );
}
