import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";

import { acceptFriend, addFriend, cachedMe, getFriends, removeFriend, type FriendRow, type Friends, type Me } from "../src/services/community";
import { Button, Card, Label, Loading, Row, Screen, Title } from "../src/ui/components";
import { Avatar, Input } from "../src/ui/social";
import { colors, fonts, space, type } from "../src/ui/theme";

function Person({ row, children }: { row: FriendRow; children?: React.ReactNode }) {
  return (
    <Row gap={space.md}>
      <Pressable
        style={{ flexDirection: "row", alignItems: "center", gap: space.md, flex: 1 }}
        onPress={() => router.push({ pathname: "/user/[id]", params: { id: row.user.id, name: row.user.name } })}
      >
        <Avatar name={row.user.name} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={type.strong}>{row.user.name}</Text>
          <Text style={type.small}>@{row.user.handle}</Text>
        </View>
      </Pressable>
      {children}
    </Row>
  );
}

export default function FriendsScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [data, setData] = useState<Friends | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMe(await cachedMe());
    try {
      setData(await getFriends());
    } catch (e) {
      setMsg((e as Error).message);
      setData({ friends: [], incoming: [], outgoing: [] });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data || !me) return <Loading />;

  const add = async () => {
    if (!code.trim()) return;
    setMsg("");
    try {
      const r = await addFriend(code.trim());
      setMsg(r.status === "accepted" ? `You and ${r.user.name} are now friends.` : `Request sent to ${r.user.name}.`);
      setCode("");
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <Screen footer={<Button title="Done" variant="secondary" onPress={() => router.back()} />}>
      <Title kicker="Community">Friends</Title>

      <Card active>
        <Label>Your friend code</Label>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 30, letterSpacing: 4, color: colors.text }}>{me.friendCode}</Text>
        <Text style={type.small}>Or they can search @{me.handle}.</Text>
        <Button
          title="Invite a friend"
          variant="secondary"
          onPress={() =>
            Share.share({ message: `Train with me on ASCENT — add me with code ${me.friendCode} (or @${me.handle}).` }).catch(() => {})
          }
        />
      </Card>

      <Card>
        <Label>Add a friend</Label>
        <Input value={code} onChangeText={setCode} placeholder="Friend code or @handle" autoCapitalize="none" onSubmitEditing={add} />
        <Button title="Add" onPress={add} disabled={!code.trim()} />
        {msg ? <Text style={[type.small, { color: colors.text }]}>{msg}</Text> : null}
      </Card>

      {data.incoming.length ? (
        <Card>
          <Label>Requests</Label>
          {data.incoming.map((r) => (
            <Person key={r.id} row={r}>
              <Button
                title="Accept"
                onPress={async () => {
                  await acceptFriend(r.id);
                  load();
                }}
              />
              <Button
                title="✕"
                variant="ghost"
                onPress={async () => {
                  await removeFriend(r.id);
                  load();
                }}
              />
            </Person>
          ))}
        </Card>
      ) : null}

      <Card>
        <Label>{`Friends · ${data.friends.length}`}</Label>
        {data.friends.length ? (
          data.friends.map((r) => (
            <Person key={r.id} row={r}>
              <Button
                title={confirm === r.id ? "Remove?" : "···"}
                variant={confirm === r.id ? "danger" : "ghost"}
                onPress={async () => {
                  if (confirm !== r.id) return setConfirm(r.id);
                  await removeFriend(r.id);
                  setConfirm(null);
                  load();
                }}
              />
            </Person>
          ))
        ) : (
          <Text style={type.small}>No friends yet — share your code above.</Text>
        )}
      </Card>

      {data.outgoing.length ? (
        <Card>
          <Label>Waiting for them</Label>
          {data.outgoing.map((r) => (
            <Person key={r.id} row={r}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={async () => {
                  await removeFriend(r.id);
                  load();
                }}
              />
            </Person>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
