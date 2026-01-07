import { Platform } from "react-native";

const LOCAL_IP = "172.20.10.3"; // ← YOUR WIFI IP

export const BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:5000/api"
    : `http://${LOCAL_IP}:5000/api`;

export const getAllExercises = async () => {
  const res = await fetch(`${BASE_URL}/exercises`);
  return res.json();
};

export const getAllSplits = async () => {
  const res = await fetch(`${BASE_URL}/splits`);
  return res.json();
};

export const getRecommendedSplits = async (params) => {
  const res = await fetch(`${BASE_URL}/splits/recommend?${params}`);
  return res.json();
};
