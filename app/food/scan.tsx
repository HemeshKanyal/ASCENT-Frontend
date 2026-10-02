import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Platform, Text, View } from "react-native";

import { selectFood } from "../../src/services/foodSelection";
import type { Meal } from "../../src/services/nutritionStore";
import { lookupBarcode } from "../../src/services/openFoodFacts";
import { Button, Empty, Screen, Title } from "../../src/ui/components";
import { colors, radius, space, type } from "../../src/ui/theme";

export default function ScanFood() {
  const params = useLocalSearchParams<{ meal: Meal; day: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<"scanning" | "looking" | "not_found" | "error">("scanning");
  const busy = useRef(false);

  if (Platform.OS === "web") {
    return (
      <Screen footer={<Button title="Back" variant="secondary" onPress={() => router.back()} />}>
        <Empty title="Scanning works in the phone app" body="Open ASCENT in Expo Go on your phone to scan barcodes. On the web, search by name instead." />
      </Screen>
    );
  }

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (!permission.granted) {
    return (
      <Screen footer={<Button title="Back" variant="secondary" onPress={() => router.back()} />}>
        <Title kicker="Barcode">Camera access</Title>
        <Text style={type.body}>ASCENT uses the camera only to read food barcodes. Nothing is recorded or uploaded except the barcode number.</Text>
        <Button title="Allow camera" onPress={requestPermission} />
      </Screen>
    );
  }

  const onScan = async ({ data }: BarcodeScanningResult) => {
    if (busy.current) return;
    busy.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setStatus("looking");
    try {
      const food = await lookupBarcode(data);
      if (food) {
        selectFood(food);
        router.replace({ pathname: "/food/portion", params });
        return;
      }
      setStatus("not_found");
    } catch {
      setStatus("error");
    }
  };

  const retry = () => {
    busy.current = false;
    setStatus("scanning");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
        onBarcodeScanned={status === "scanning" ? onScan : undefined}
      />
      <View style={{ position: "absolute", left: space.lg, right: space.lg, bottom: space.xxl, gap: space.sm }}>
        <View style={{ backgroundColor: "rgba(0,0,0,0.75)", borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
          <Text style={type.h3}>
            {status === "scanning"
              ? "Point at a barcode"
              : status === "looking"
                ? "Looking it up…"
                : status === "not_found"
                  ? "Not in Open Food Facts yet"
                  : "Couldn't look that up — check your connection"}
          </Text>
          {status === "not_found" || status === "error" ? (
            <>
              <Button title="Scan again" onPress={retry} />
              <Button title="Add it manually" variant="secondary" onPress={() => router.replace({ pathname: "/food/custom", params })} />
            </>
          ) : null}
          <Button title="Close" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}
