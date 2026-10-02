import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Share, Text, View } from "react-native";

import { getClub, getClubFeed, getLeaderboard, leaveClub, type BoardRow, type Club, type Post } from "../../src/services/community";
import { Button, Card, Label, Loading, Note, Row, Screen, Title } from "../../src/ui/components";
import { Avatar, PostCard } from "../../src/ui/social";
import { colors, fonts, space, type } from "../../src/ui/theme";

export default function ClubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [club, setClub] = useState<Club | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [error, setError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [now, setNow] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setNow(Date.now());
        try {
          const [c, f, b] = await Promise.all([getClub(id), getClubFeed(id), getLeaderboard("time", id)]);
          setClub(c.club);
          setPosts(f.posts);
          setBoard(b.rows);
        } catch (e) {
          setError((e as Error).message);
        }
      })();
    }, [id])
  );

  if (error && !club) {
    return (
      <Screen footer={<Button title="Back" variant="secondary" onPress={() => router.back()} />}>
        <Note>{error}</Note>
      </Screen>
    );
  }
  if (!club) return <Loading />;

  return (
    <Screen footer={<Button title="Back" variant="secondary" onPress={() => router.back()} />}>
      <Title kicker={`Club · ${club.memberCount} member${club.memberCount === 1 ? "" : "s"}`} sub={club.description || undefined}>
        {club.name}
      </Title>

      <Card active>
        <Label>Invite code</Label>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 28, letterSpacing: 4, color: colors.text }}>{club.code}</Text>
        <Button
          title="Invite people"
          variant="secondary"
          onPress={() => Share.share({ message: `Join "${club.name}" on ASCENT — Crew → Clubs → code ${club.code}` }).catch(() => {})}
        />
      </Card>

      <Card>
        <Label>This week · time trained</Label>
        {board.slice(0, 10).map((r, i) => (
          <Row key={r.user.id} gap={space.md}>
            <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: i < 3 ? colors.text : colors.faint, width: 24 }}>{i + 1}</Text>
            <Avatar name={r.user.name} size={30} />
            <Text style={[type.strong, { flex: 1 }]}>{r.me ? "You" : r.user.name}</Text>
            <Text style={type.small}>{`${Math.floor(r.minutes / 60)}h ${r.minutes % 60}m`}</Text>
          </Row>
        ))}
      </Card>

      <Label>Shared to the club</Label>
      {posts.length ? (
        posts.map((p) => <PostCard key={p.id} post={p} now={now} onOpen={() => router.push({ pathname: "/post/[id]", params: { id: p.id } })} />)
      ) : (
        <Text style={type.small}>Nothing yet. When you share an activity, tick this club to post it here.</Text>
      )}

      {club.members?.length ? (
        <Card>
          <Label>Members</Label>
          <View style={{ gap: space.sm }}>
            {club.members.map((m) => (
              <Row key={m.id} gap={space.md}>
                <Avatar name={m.name} size={30} />
                <Text style={type.body}>{m.name}</Text>
                <Text style={type.small}>@{m.handle}</Text>
              </Row>
            ))}
          </View>
        </Card>
      ) : null}

      <Button
        title={confirmLeave ? "Tap again to leave" : "Leave club"}
        variant="danger"
        onPress={async () => {
          if (!confirmLeave) return setConfirmLeave(true);
          await leaveClub(club.id);
          router.back();
        }}
      />
    </Screen>
  );
}
