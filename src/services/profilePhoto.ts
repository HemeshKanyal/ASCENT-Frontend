/**
 * Profile photo: kept on the device (works without an account) and mirrored to
 * the community server when signed in, so friends see it next to your posts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { cachedMe, removeAvatar, uploadAvatar, type Me } from "./community";

const KEY = "PROFILE_PHOTO";

export const getLocalPhoto = () => AsyncStorage.getItem(KEY);

/** Square-crop, shrink to 512 px and save. Returns null if cancelled. */
export async function pickProfilePhoto(source: "camera" | "library"): Promise<{ uri: string; synced: boolean } | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 };
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("camera_denied");
  }
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;

  const image = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: 512 }).renderAsync();
  const saved = await image.saveAsync({ base64: true, compress: 0.75, format: SaveFormat.JPEG });
  if (!saved.base64) throw new Error("resize_failed");
  const uri = `data:image/jpeg;base64,${saved.base64}`;
  await AsyncStorage.setItem(KEY, uri);

  let synced = false;
  if (await cachedMe()) {
    await uploadAvatar(saved.base64);
    synced = true;
  }
  return { uri, synced };
}

export async function clearProfilePhoto() {
  await AsyncStorage.removeItem(KEY);
  if (await cachedMe()) await removeAvatar();
}

/** After signing in: push a photo picked while signed out, if the account has none. */
export async function syncPhotoAfterSignIn(me: Me) {
  const local = await getLocalPhoto();
  if (local && !me.avatarUrl) await uploadAvatar(local.replace(/^data:image\/\w+;base64,/, ""));
}
