import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius } from "./theme";

export type MediaItem = { uri: string; type: "image" | "video"; durationMs?: number };

const duration = (ms?: number) => {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Thumb({ m, size, onPress }: { m: MediaItem; size: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: size, height: size, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.raised }}>
      {m.type === "image" ? (
        <Image source={{ uri: m.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4 }}>
          <Ionicons name="play-circle" size={size * 0.38} color={colors.text} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.muted }}>{duration(m.durationMs)}</Text>
        </View>
      )}
    </Pressable>
  );
}

function VideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={{ width: "100%", height: "100%" }} contentFit="contain" nativeControls />;
}

/** Full-screen viewer; `actions` render under the media (share, delete…). */
export function MediaViewer({ item, onClose, actions }: { item: MediaItem | null; onClose: () => void; actions?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!item} animationType="fade" onRequestClose={onClose} transparent>
      <View style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top, paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={onClose} hitSlop={12} style={{ alignSelf: "flex-end", padding: 16 }}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          {item?.type === "video" ? <VideoPlayer uri={item.uri} /> : item ? <Image source={{ uri: item.uri }} style={{ flex: 1 }} contentFit="contain" /> : null}
        </View>
        {actions ? <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>{actions}</View> : null}
      </View>
    </Modal>
  );
}

/** Horizontal strip of photos/videos. */
export function MediaStrip({ media, size = 96, onOpen, trailing }: { media: MediaItem[]; size?: number; onOpen: (m: MediaItem) => void; trailing?: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {media.map((m) => (
        <Thumb key={m.uri} m={m} size={size} onPress={() => onOpen(m)} />
      ))}
      {trailing}
    </ScrollView>
  );
}
