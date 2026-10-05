import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { AREAS, AREA_MUSCLES, JOINTS, MOVE_BY_ID } from "../../src/engine";
import { BodyMap } from "../../src/ui/BodyMap";
import { Button, Card, Chip, Empty, Label, Note, Screen, Title, Wrap } from "../../src/ui/components";
import { clock } from "../../src/ui/format";
import { type } from "../../src/ui/theme";
import { WatchButton, youtubeQuery } from "../../src/ui/youtube";

const STYLE_LABEL: Record<string, string> = { dynamic: "Dynamic warm-up", static: "Stretch", yoga: "Yoga pose", pilates: "Pilates", breath: "Breathing" };

export default function MoveDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const move = MOVE_BY_ID[id];
  if (!move) {
    return (
      <Screen>
        <Empty title="Move not found" action={<Button title="Back" onPress={() => router.back()} />} />
      </Screen>
    );
  }
  const cautions = [
    move.flexion ? "Bends or twists the spine — skipped automatically with low bone density, pregnancy or postpartum." : null,
    move.supine ? "Done lying on your back — skipped automatically later in pregnancy." : null,
    move.prone ? "Done lying face down." : null,
    move.joints.length ? `Loads the ${move.joints.map((j) => JOINTS[j]?.toLowerCase() ?? j).join(" and ")}.` : null,
  ].filter(Boolean) as string[];
  const worked = [...new Set(move.areas.flatMap((a) => AREA_MUSCLES[a] ?? []))];

  return (
    <Screen footer={<Button title="Back" variant="secondary" onPress={() => router.back()} />}>
      <Title kicker={STYLE_LABEL[move.style] ?? move.style}>{move.name}</Title>
      <Card>
        <Label>How to</Label>
        <Text style={type.body}>{move.cue}</Text>
        <Text style={type.small}>
          Hold {clock(move.seconds)}
          {move.perSide ? " each side" : ""}
          {move.level !== "beginner" ? ` · ${move.level}` : ""}
        </Text>
      </Card>
      <Card>
        <Label>Targets</Label>
        <Wrap>
          {move.areas.map((a) => (
            <Chip key={a} label={AREAS[a] ?? a} selected />
          ))}
        </Wrap>
        {worked.length ? <BodyMap primary={worked} /> : null}
      </Card>
      <WatchButton id={move.id} query={youtubeQuery("move", move.name, move.style)} />
      {cautions.map((c) => (
        <Note key={c}>{c}</Note>
      ))}
    </Screen>
  );
}
