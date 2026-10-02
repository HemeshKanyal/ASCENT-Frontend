/**
 * Photos and videos attached to a logged session. Files are copied into the
 * app's own documents folder so they survive the picker's temp files being cleared.
 */
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import { getSessions, updateSession, type LoggedSession, type SessionMedia } from "./trainingStore";

export const MEDIA_SUPPORTED = Platform.OS !== "web";
export const MAX_MEDIA = 8;
export const MAX_VIDEO_SECONDS = 60;

const mediaDir = () => {
  const dir = new Directory(Paths.document, "media");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
};

/** Let the person pick photos/videos (or shoot one) and attach them to a session. */
export async function addMedia(sessionId: string, source: "library" | "camera"): Promise<SessionMedia[] | null> {
  if (!MEDIA_SUPPORTED) return null;
  const session = (await getSessions()).find((s) => s.id === sessionId);
  if (!session) return null;
  const room = MAX_MEDIA - (session.media?.length ?? 0);
  if (room <= 0) return session.media ?? [];

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images", "videos"],
    quality: 0.8,
    videoMaxDuration: MAX_VIDEO_SECONDS,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
    allowsMultipleSelection: source === "library",
    selectionLimit: room,
  };
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("camera_denied");
  }
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return session.media ?? [];

  const dir = mediaDir();
  const added: SessionMedia[] = [];
  for (const [i, a] of result.assets.slice(0, room).entries()) {
    const video = a.type === "video";
    if (video && a.duration && a.duration / 1000 > MAX_VIDEO_SECONDS + 1) continue;
    const ext = (a.fileName?.split(".").pop() ?? a.uri.split(".").pop() ?? (video ? "mp4" : "jpg")).toLowerCase().slice(0, 5);
    const dest = new File(dir, `${sessionId}_${Date.now()}_${i}.${ext}`);
    await new File(a.uri).copy(dest);
    added.push({
      uri: dest.uri,
      type: video ? "video" : "image",
      width: a.width,
      height: a.height,
      durationMs: video ? (a.duration ?? undefined) : undefined,
      mimeType: a.mimeType ?? (video ? "video/mp4" : "image/jpeg"),
    });
  }
  const media = [...(session.media ?? []), ...added];
  await updateSession(sessionId, { media });
  return media;
}

export async function removeMedia(sessionId: string, uri: string) {
  const session = (await getSessions()).find((s) => s.id === sessionId);
  if (!session) return [];
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone — just drop the reference.
  }
  const media = (session.media ?? []).filter((m) => m.uri !== uri);
  await updateSession(sessionId, { media });
  return media;
}

/** Delete every file belonging to a session (when the session itself is deleted). */
export function deleteSessionMedia(session: LoggedSession) {
  if (!MEDIA_SUPPORTED) return;
  for (const m of session.media ?? []) {
    try {
      const f = new File(m.uri);
      if (f.exists) f.delete();
    } catch {
      // ignore
    }
  }
}
