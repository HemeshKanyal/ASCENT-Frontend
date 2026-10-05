import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { getProfile } from "../src/services/trainingStore";
import { signIn, signUp } from "../src/services/community";
import { syncPhotoAfterSignIn } from "../src/services/profilePhoto";
import { Button, Chip, Label, Note, Row, Screen, Title, Wrap } from "../src/ui/components";
import { Input } from "../src/ui/social";
import { colors, type } from "../src/ui/theme";

export default function Account() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"signup" | "signin">(params.mode === "signin" ? "signin" : "signup");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!email.includes("@")) return setError("Enter your email.");
    if (mode === "signup" && !name.trim()) return setError("Add your name — it's what friends see.");
    if (mode === "signup" && password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    try {
      const me =
        mode === "signup"
          ? await signUp({ name: name.trim(), email: email.trim(), password, handle: handle.trim() || undefined })
          : await signIn({ email: email.trim(), password });
      await syncPhotoAfterSignIn(me).catch(() => {});
      // Onboarding may not be done yet on a fresh install.
      if (!(await getProfile())) router.replace("/onboarding");
      else if (router.canGoBack()) router.back();
      else router.replace("/feed");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <Row>
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button title={busy ? "…" : mode === "signup" ? "Create account" : "Sign in"} disabled={busy} onPress={submit} style={{ flex: 2 }} />
        </Row>
      }
    >
      <Title kicker="Community" sub="Only needed for friends, the feed and leaderboards. Your training data stays on this phone.">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </Title>
      <Wrap>
        <Chip label="New here" selected={mode === "signup"} onPress={() => setMode("signup")} />
        <Chip label="I have an account" selected={mode === "signin"} onPress={() => setMode("signin")} />
      </Wrap>

      {mode === "signup" ? (
        <>
          <Label>Name</Label>
          <Input value={name} onChangeText={setName} placeholder="What friends call you" autoCapitalize="words" textContentType="name" />
          <Label>Handle (optional)</Label>
          <Input
            value={handle}
            onChangeText={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
            placeholder="e.g. hemesh.runs"
            autoCapitalize="none"
          />
        </>
      ) : null}
      <Label>Email</Label>
      <Input value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" />
      <Label>Password</Label>
      <Input
        value={password}
        onChangeText={setPassword}
        placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
        secureTextEntry
        textContentType={mode === "signup" ? "newPassword" : "password"}
        onSubmitEditing={submit}
      />
      {error ? <Note>{error}</Note> : null}
      <Text style={[type.small, { color: colors.faint }]}>
        Friends find you only by your code or handle. You can delete your account and everything you shared from Profile at any time.
      </Text>
    </Screen>
  );
}
