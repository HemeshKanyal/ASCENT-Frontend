import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";

import { cachedMe, getClubs, shareSession, type Club } from "../../src/services/community";
import { getSession, type LoggedSession } from "../../src/services/trainingStore";
import { Button, Card, Chip, Label, Loading, Note, Row, Screen, Title, Wrap } from "../../src/ui/components";
import { MediaStrip } from "../../src/ui/MediaStrip";
import { Input } from "../../src/ui/social";
import { colors, type } from "../../src/ui/theme";

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row style={{ justifyContent: "space-between" }}>
      <View style={{ flex: 1 }}>
        <Text style={type.body}>{label}</Text>
        {sub ? <Text style={type.small}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={value ? colors.bg : colors.muted} />
    </Row>
  );
}

export default function ShareActivity() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<LoggedSession | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"friends" | "private">("friends");
  const [picked, setPicked] = useState<string[]>([]);
  const [hideEnds, setHideEnds] = useState(true);
  const [includeRoute, setIncludeRoute] = useState(true);
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!(await cachedMe())) {
        router.replace({ pathname: "/account", params: { mode: "signup" } });
        return;
      }
      const s = await getSession(id);
      setSession(s);
      setMediaUris((s?.media ?? []).map((m) => m.uri));
      getClubs()
        .then((r) => setClubs(r.clubs))
        .catch((e) => setError((e as Error).message));
    })();
  }, [id]);

  if (!session) return <Loading />;
  const media = session.media ?? [];

  const post = async () => {
    setError("");
    setBusy("Posting…");
    try {
      const p = await shareSession(session, { caption: caption.trim(), visibility, clubs: picked, hideEnds, includeRoute, mediaUris }, setBusy);
      router.replace({ pathname: "/post/[id]", params: { id: p.id } });
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  };

  return (
    <Screen
      footer={
        <Row>
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} disabled={!!busy} />
          <Button title={busy || (session.postId ? "Update post" : "Post")} onPress={post} style={{ flex: 2 }} disabled={!!busy} />
        </Row>
      }
    >
      <Title kicker="Share">{session.title ?? session.dayName ?? "Activity"}</Title>

      <Label>Caption</Label>
      <Input value={caption} onChangeText={setCaption} placeholder="How did it go?" multiline maxLength={2000} style={{ minHeight: 90, textAlignVertical: "top" }} />

      <Card>
        <Label>Who can see it</Label>
        <Wrap>
          <Chip label="Friends" selected={visibility === "friends"} onPress={() => setVisibility("friends")} />
          <Chip label="Only me" selected={visibility === "private"} onPress={() => setVisibility("private")} />
        </Wrap>
        {visibility === "friends" && clubs.length ? (
          <>
            <Text style={type.small}>Also post to:</Text>
            <Wrap>
              {clubs.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  selected={picked.includes(c.id)}
                  onPress={() => setPicked(picked.includes(c.id) ? picked.filter((x) => x !== c.id) : [...picked, c.id])}
                />
              ))}
            </Wrap>
          </>
        ) : null}
      </Card>

      {session.hasRoute ? (
        <Card>
          <Label>Map</Label>
          <Toggle label="Include route" value={includeRoute} onChange={setIncludeRoute} />
          {includeRoute ? (
            <Toggle label="Hide start and end" sub="Trims 200 m at each end so your home stays private" value={hideEnds} onChange={setHideEnds} />
          ) : null}
        </Card>
      ) : null}

      {media.length && !session.postId ? (
        <Card>
          <Label>Photos & videos</Label>
          <Text style={type.small}>Tap to leave one out.</Text>
          <MediaStrip
            media={media}
            size={84}
            onOpen={(m) => setMediaUris(mediaUris.includes(m.uri) ? mediaUris.filter((u) => u !== m.uri) : [...mediaUris, m.uri])}
          />
          <Text style={type.small}>
            {mediaUris.length} of {media.length} selected
          </Text>
        </Card>
      ) : null}

      {error ? <Note>{error}</Note> : null}
    </Screen>
  );
}
