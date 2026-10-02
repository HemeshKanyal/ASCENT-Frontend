import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  cachedMe,
  getClubs,
  getFeed,
  getLeaderboard,
  getUnread,
  pushWeeklyStats,
  type BoardRow,
  type Club,
  type Me,
  type Metric,
  type Post,
} from "../../src/services/community";
import { loadProgress } from "../../src/services/streakStore";
import { getSessions } from "../../src/services/trainingStore";
import { Button, Card, Chip, Empty, Label, Loading, Note, Row, Screen, Title, Wrap } from "../../src/ui/components";
import { Avatar, PostCard } from "../../src/ui/social";
import { colors, fonts, space, type } from "../../src/ui/theme";

const METRICS: { id: Metric; label: string; fmt: (r: BoardRow) => string }[] = [
  { id: "time", label: "Time", fmt: (r) => `${Math.floor(r.minutes / 60)}h ${r.minutes % 60}m` },
  { id: "distance", label: "Distance", fmt: (r) => `${r.distanceKm.toFixed(1)} km` },
  { id: "sessions", label: "Sessions", fmt: (r) => String(r.sessions) },
  { id: "days", label: "Active days", fmt: (r) => `${r.activeDays}/7` },
];

function IconButton({ icon, onPress, badge }: { icon: React.ComponentProps<typeof Ionicons>["name"]; onPress: () => void; badge?: number }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ padding: 6 }}>
      <Ionicons name={icon} size={24} color={colors.text} />
      {badge ? (
        <View style={{ position: "absolute", top: 0, right: 0, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.onAccent }}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SignedOut() {
  return (
    <Screen>
      <Title kicker="Community">Train together</Title>
      <Card active>
        {[
          ["people", "Add friends with a code — no public profiles, no strangers"],
          ["images", "Share runs, lifts and flows with photos and short clips"],
          ["thumbs-up", "Kudos and comments keep each other going"],
          ["trophy", "Weekly leaderboards with friends and in clubs"],
          ["lock-closed", "Your route's start and end are hidden by default"],
        ].map(([icon, text]) => (
          <Row key={text} gap={space.md}>
            <Ionicons name={icon as never} size={22} color={colors.text} />
            <Text style={[type.body, { flex: 1 }]}>{text}</Text>
          </Row>
        ))}
      </Card>
      <Text style={type.small}>Everything else in ASCENT works without an account. Nothing is shared until you choose to post it.</Text>
      <Button title="Create account" onPress={() => router.push({ pathname: "/account", params: { mode: "signup" } })} />
      <Button title="I have an account" variant="secondary" onPress={() => router.push({ pathname: "/account", params: { mode: "signin" } })} />
    </Screen>
  );
}

export default function FeedScreen() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [tab, setTab] = useState<"feed" | "board">("feed");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [metric, setMetric] = useState<Metric>("time");
  const [scope, setScope] = useState<string>("");
  const [board, setBoard] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  const loadBoard = useCallback(async (m: Metric, club: string) => {
    setBoard(null);
    try {
      setBoard((await getLeaderboard(m, club || undefined)).rows);
    } catch (e) {
      setError((e as Error).message);
      setBoard([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        const user = await cachedMe();
        if (!live) return;
        setMe(user);
        if (!user) return;
        setError("");
        setNow(Date.now());
        try {
          // Keep the leaderboard current with what's been logged on this phone.
          const [sessions, progress] = await Promise.all([getSessions(), loadProgress()]);
          pushWeeklyStats(sessions, progress?.streaks.week.current ?? 0).catch(() => {});
          const [feed, u, c] = await Promise.all([getFeed(), getUnread(), getClubs()]);
          if (!live) return;
          setPosts(feed.posts);
          setNext(feed.next);
          setUnread(u.unread);
          setClubs(c.clubs);
        } catch (e) {
          if (!live) return;
          setError((e as Error).message);
          setPosts([]);
          setMe(await cachedMe());
        }
      })();
      return () => {
        live = false;
      };
    }, [])
  );

  if (me === undefined) return <Loading />;
  if (!me) return <SignedOut />;

  const metricDef = METRICS.find((m) => m.id === metric)!;
  const pickScope = (club: string) => {
    setScope(club);
    loadBoard(metric, club);
  };
  const pickMetric = (m: Metric) => {
    setMetric(m);
    loadBoard(m, scope);
  };

  return (
    <Screen>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <Title kicker="Community">Your crew</Title>
        </View>
        <Row gap={space.xs} style={{ paddingBottom: space.sm }}>
          <IconButton icon="notifications-outline" badge={unread} onPress={() => router.push("/inbox")} />
          <IconButton icon="person-add-outline" onPress={() => router.push("/friends")} />
          <IconButton icon="flag-outline" onPress={() => router.push("/clubs")} />
        </Row>
      </Row>

      <Wrap>
        <Chip label="Feed" selected={tab === "feed"} onPress={() => setTab("feed")} />
        <Chip
          label="Leaderboard"
          selected={tab === "board"}
          onPress={() => {
            setTab("board");
            loadBoard(metric, scope);
          }}
        />
      </Wrap>
      {error ? <Note>{error}</Note> : null}

      {tab === "feed" ? (
        posts === null ? (
          <Loading />
        ) : posts.length ? (
          <>
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                now={now}
                onOpen={() => router.push({ pathname: "/post/[id]", params: { id: p.id } })}
                onOpenUser={() => router.push({ pathname: "/user/[id]", params: { id: p.owner.id, name: p.owner.name } })}
              />
            ))}
            {next ? (
              <Button
                title="Load more"
                variant="ghost"
                onPress={async () => {
                  const page = await getFeed(next);
                  setPosts([...posts, ...page.posts]);
                  setNext(page.next);
                }}
              />
            ) : null}
          </>
        ) : (
          <Empty
            title="Quiet in here"
            body={`Share your code ${me.friendCode} with friends, or post an activity from its page — tap any session under "Done today".`}
            action={<Button title="Add friends" onPress={() => router.push("/friends")} />}
          />
        )
      ) : (
        <>
          <Wrap>
            <Chip label="Friends" selected={!scope} onPress={() => pickScope("")} />
            {clubs.map((c) => (
              <Chip key={c.id} label={c.name} selected={scope === c.id} onPress={() => pickScope(c.id)} />
            ))}
          </Wrap>
          <Wrap>
            {METRICS.map((m) => (
              <Chip key={m.id} label={m.label} selected={metric === m.id} onPress={() => pickMetric(m.id)} />
            ))}
          </Wrap>
          <Card>
            <Label>This week · Mon–Sun</Label>
            {board === null ? (
              <Loading />
            ) : (
              board.map((r, i) => (
                <Row key={r.user.id} gap={space.md}>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: i < 3 ? colors.text : colors.faint, width: 26 }}>{i + 1}</Text>
                  <Avatar name={r.user.name} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.strong, r.me && { textDecorationLine: "underline" }]}>{r.me ? "You" : r.user.name}</Text>
                    {r.streakWeeks ? <Text style={type.small}>{r.streakWeeks}-week streak</Text> : null}
                  </View>
                  <Text style={type.strong}>{metricDef.fmt(r)}</Text>
                </Row>
              ))
            )}
            <Text style={[type.small, { color: colors.faint }]}>Counts everything you log, shared or not — only the weekly totals leave your phone.</Text>
          </Card>
        </>
      )}
    </Screen>
  );
}
