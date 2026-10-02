import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text } from "react-native";

import { createClub, getClubs, joinClub, type Club } from "../src/services/community";
import { Button, Card, Empty, Label, Loading, Row, Screen, Title } from "../src/ui/components";
import { Input } from "../src/ui/social";
import { colors, type } from "../src/ui/theme";

export default function Clubs() {
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      setClubs((await getClubs()).clubs);
    } catch (e) {
      setMsg((e as Error).message);
      setClubs([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!clubs) return <Loading />;
  const open = (id: string) => router.push({ pathname: "/club/[id]", params: { id } });

  return (
    <Screen footer={<Button title="Done" variant="secondary" onPress={() => router.back()} />}>
      <Title kicker="Community" sub="Clubs are for groups — a running crew, your gym, a HYROX team. Anyone with the code can join.">
        Clubs
      </Title>

      {clubs.length ? (
        clubs.map((c) => (
          <Card key={c.id} onPress={() => open(c.id)}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={type.h2}>{c.name}</Text>
              <Text style={type.small}>{c.memberCount} ›</Text>
            </Row>
            {c.description ? <Text style={type.small}>{c.description}</Text> : null}
          </Card>
        ))
      ) : (
        <Empty title="No clubs yet" body="Join one with a code from a friend, or start your own." />
      )}

      <Card>
        <Label>Join with a code</Label>
        <Input value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="e.g. 7KQ2MX" autoCapitalize="characters" />
        <Button
          title="Join"
          disabled={code.trim().length < 4}
          onPress={async () => {
            setMsg("");
            try {
              const { club } = await joinClub(code.trim());
              setCode("");
              open(club.id);
            } catch (e) {
              setMsg((e as Error).message);
            }
          }}
        />
      </Card>

      {creating ? (
        <Card active>
          <Label>New club</Label>
          <Input value={name} onChangeText={setName} placeholder="Name" maxLength={60} />
          <Input value={about} onChangeText={setAbout} placeholder="What's it for? (optional)" maxLength={280} multiline style={{ minHeight: 70 }} />
          <Button
            title="Create club"
            disabled={name.trim().length < 2}
            onPress={async () => {
              setMsg("");
              try {
                const { club } = await createClub(name.trim(), about.trim());
                setCreating(false);
                open(club.id);
              } catch (e) {
                setMsg((e as Error).message);
              }
            }}
          />
        </Card>
      ) : (
        <Button title="Start a club" variant="secondary" onPress={() => setCreating(true)} />
      )}
      {msg ? <Text style={[type.small, { color: colors.text }]}>{msg}</Text> : null}
    </Screen>
  );
}
