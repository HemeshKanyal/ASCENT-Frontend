import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { getInbox, markInboxRead, type Inbox } from "../src/services/community";
import { Button, Empty, Loading, Note, Row, Screen, Title } from "../src/ui/components";
import { Avatar, timeAgo } from "../src/ui/social";
import { colors, space, type } from "../src/ui/theme";

const VERB: Record<Inbox["items"][number]["type"], string> = {
  kudos: "gave you kudos",
  comment: "commented",
  friend_request: "wants to be friends",
  friend_accept: "accepted your friend request",
  club_join: "joined your club",
};

export default function InboxScreen() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setNow(Date.now());
        try {
          const data = await getInbox();
          setInbox(data);
          if (data.unread) markInboxRead().catch(() => {});
        } catch (e) {
          setError((e as Error).message);
          setInbox({ unread: 0, items: [] });
        }
      })();
    }, [])
  );

  if (!inbox) return <Loading />;

  return (
    <Screen footer={<Button title="Done" variant="secondary" onPress={() => router.back()} />}>
      <Title kicker="Community">Activity</Title>
      {error ? <Note>{error}</Note> : null}
      {inbox.items.length ? (
        inbox.items.map((n) => {
          const target: Href | null = n.post
            ? { pathname: "/post/[id]", params: { id: n.post } }
            : n.club
              ? { pathname: "/club/[id]", params: { id: n.club.id } }
              : n.type.startsWith("friend")
                ? "/friends"
                : null;
          return (
            <Pressable key={n.id} onPress={() => target && router.push(target)}>
              <Row gap={space.md} style={{ alignItems: "flex-start", paddingVertical: space.sm, opacity: n.read ? 0.7 : 1 }}>
                <Avatar name={n.actor.name} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.body}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>{n.actor.name}</Text> {VERB[n.type]}
                    {n.club ? ` ${n.club.name}` : ""}
                  </Text>
                  {n.text ? (
                    <Text style={type.small} numberOfLines={2}>
                      “{n.text}”
                    </Text>
                  ) : null}
                  <Text style={[type.small, { color: colors.faint }]}>{timeAgo(n.date, now)}</Text>
                </View>
                {!n.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 8 }} /> : null}
              </Row>
            </Pressable>
          );
        })
      ) : (
        <Empty title="Nothing yet" body="Kudos, comments and friend requests show up here." />
      )}
    </Screen>
  );
}
