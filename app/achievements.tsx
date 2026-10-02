import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import { loadProgress, markBadgesSeen, type Progress } from "../src/services/streakStore";
import { Button, Card, Label, Loading, ProgressBar, Screen, Title } from "../src/ui/components";
import { Badge, StreakSummary } from "../src/ui/Streaks";
import { space, type } from "../src/ui/theme";

export default function Achievements() {
  const [data, setData] = useState<Progress | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProgress().then((p) => {
        setData(p);
        if (p?.fresh.length) markBadgesSeen(p.fresh.map((b) => b.id));
      });
    }, [])
  );

  if (!data) return <Loading />;
  const groups = [...new Set(data.badges.map((b) => b.group))];

  return (
    <Screen footer={<Button title="Back" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))} />}>
      <Title kicker="Profile" sub="Rest days in your plan never break a streak — only a skipped training day does.">
        Streaks & badges
      </Title>
      <StreakSummary s={data.streaks} badges={data.badges} />
      {groups.map((g) => (
        <Card key={g}>
          <Label>{g}</Label>
          {data.badges
            .filter((b) => b.group === g)
            .map((b) => (
              <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Badge b={b} size={44} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={type.strong}>{b.title}</Text>
                  <Text style={type.small}>
                    {b.desc}
                    {b.earnedAt ? ` · ${new Date(b.earnedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </Text>
                  {!b.earnedAt ? <ProgressBar value={b.progress} /> : null}
                </View>
              </View>
            ))}
        </Card>
      ))}
    </Screen>
  );
}
