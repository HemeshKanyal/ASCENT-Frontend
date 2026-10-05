import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";

import { getUserPosts, type Post } from "../../src/services/community";
import { Button, Empty, Loading, Note, Row, Screen, Title } from "../../src/ui/components";
import { Avatar, PostCard } from "../../src/ui/social";
import { space, type } from "../../src/ui/theme";

export default function UserScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    (async () => {
      setNow(Date.now());
      try {
        const page = await getUserPosts(id);
        setPosts(page.posts);
        setNext(page.next);
      } catch (e) {
        setError((e as Error).message);
        setPosts([]);
      }
    })();
  }, [id]);

  if (!posts) return <Loading />;
  const who = posts[0]?.owner.name ?? name ?? "Athlete";

  return (
    <Screen footer={<Button title="Back" variant="secondary" onPress={() => router.back()} />}>
      <Row gap={space.md}>
        <Avatar name={who} uri={posts[0]?.owner.avatarUrl} size={56} />
        <Title kicker={posts[0] ? `@${posts[0].owner.handle}` : "Profile"}>{who}</Title>
      </Row>
      {error ? <Note>{error}</Note> : null}
      {posts.length ? (
        <>
          <Text style={type.small}>Recent activities</Text>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} now={now} onOpen={() => router.push({ pathname: "/post/[id]", params: { id: p.id } })} />
          ))}
          {next ? (
            <Button
              title="Load more"
              variant="ghost"
              onPress={async () => {
                const page = await getUserPosts(id, next);
                setPosts([...posts, ...page.posts]);
                setNext(page.next);
              }}
            />
          ) : null}
        </>
      ) : (
        <Empty title="No shared activities" body="Only posts you're allowed to see appear here." />
      )}
    </Screen>
  );
}
