import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import {
  addComment,
  deleteComment,
  deletePost,
  getComments,
  getPost,
  updatePost,
  type Comment,
  type Post,
  type PublicUser,
} from "../../src/services/community";
import { Button, Card, Label, Loading, Note, Row, Screen } from "../../src/ui/components";
import { Avatar, Input, PostCard, timeAgo } from "../../src/ui/social";
import { colors, space, type } from "../../src/ui/theme";

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [kudos, setKudos] = useState<PublicUser[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    (async () => {
      setNow(Date.now());
      try {
        const [p, c] = await Promise.all([getPost(id), getComments(id)]);
        setPost(p.post);
        setKudos(p.kudos);
        setComments(c.comments);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [id]);

  if (error && !post) {
    return (
      <Screen footer={<Button title="Back" variant="secondary" onPress={() => router.back()} />}>
        <Note>{error}</Note>
      </Screen>
    );
  }
  if (!post) return <Loading />;

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      const { comment } = await addComment(post.id, t);
      setComments([...comments, comment]);
    } catch (e) {
      setText(t);
      setError((e as Error).message);
    }
  };

  return (
    <Screen
      footer={
        <Row>
          <Input value={text} onChangeText={setText} placeholder="Add a comment" style={{ flex: 1 }} onSubmitEditing={send} maxLength={1000} />
          <Button title="Send" onPress={send} disabled={!text.trim()} />
        </Row>
      }
    >
      <Button title="‹ Back" variant="ghost" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />
      <PostCard post={{ ...post, commentCount: comments.length }} now={now} />

      {kudos.length ? <Text style={type.small}>Kudos from {kudos.map((k) => k.name).join(", ")}</Text> : null}

      {post.exercises.length ? (
        <Card>
          <Label>Exercises</Label>
          {post.exercises.map((e, i) => (
            <Row key={`${e.name}${i}`} style={{ justifyContent: "space-between" }}>
              <Text style={[type.body, { flex: 1 }]}>{e.name}</Text>
              <Text style={type.small}>
                {e.sets} sets{e.best ? ` · top ${e.best}` : ""}
              </Text>
            </Row>
          ))}
        </Card>
      ) : null}

      <Card>
        <Label>{`Comments · ${comments.length}`}</Label>
        {comments.length ? (
          comments.map((c) => (
            <Row key={c.id} gap={space.md} style={{ alignItems: "flex-start" }}>
              <Avatar name={c.author.name} uri={c.author.avatarUrl} size={30} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.small}>
                  <Text style={{ color: colors.text }}>{c.mine ? "You" : c.author.name}</Text> · {timeAgo(c.date, now)}
                </Text>
                <Text style={type.body}>{c.text}</Text>
              </View>
              {c.mine || post.mine ? (
                <Button
                  title="✕"
                  variant="ghost"
                  onPress={async () => {
                    await deleteComment(post.id, c.id);
                    setComments(comments.filter((x) => x.id !== c.id));
                  }}
                />
              ) : null}
            </Row>
          ))
        ) : (
          <Text style={type.small}>{post.mine ? "No comments yet." : "Be the first to say something nice."}</Text>
        )}
      </Card>
      {error ? <Note>{error}</Note> : null}

      {post.mine ? (
        <Card>
          <Label>Your post</Label>
          {editing !== null ? (
            <>
              <Input value={editing} onChangeText={setEditing} multiline style={{ minHeight: 80 }} maxLength={2000} />
              <Button
                title="Save caption"
                onPress={async () => {
                  const r = await updatePost(post.id, { caption: editing });
                  setPost(r.post);
                  setEditing(null);
                }}
              />
            </>
          ) : (
            <Row>
              <Button title="Edit caption" variant="secondary" onPress={() => setEditing(post.caption)} style={{ flex: 1 }} />
              <Button
                title={post.visibility === "private" ? "Show friends" : "Make private"}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={async () => setPost((await updatePost(post.id, { visibility: post.visibility === "private" ? "friends" : "private" })).post)}
              />
            </Row>
          )}
          <Button
            title={confirmDelete ? "Tap again — removes it for everyone" : "Delete post"}
            variant="danger"
            onPress={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              await deletePost(post.id, post.clientId);
              router.back();
            }}
          />
          <Text style={[type.small, { color: colors.faint }]}>Deleting the post keeps the activity on your phone.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
