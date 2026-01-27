import { Platform } from "react-native";

const LOCAL_IP = "10.12.149.39"; // ← YOUR WIFI IP

export const BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:5000/api"
    : `http://${LOCAL_IP}:5000/api`;

export const getAllExercises = async () => {
  const url = `${BASE_URL}/exercises`;
  console.log("Fetching:", url);
  try {
    const res = await fetch(url);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error. URL:", url);
      console.error("Response Text:", text.slice(0, 500)); // Log first 500 chars
      throw e;
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
};

export const getAllSplits = async () => {
  const res = await fetch(`${BASE_URL}/splits`);
  return res.json();
};

export const getRecommendedSplits = async (params) => {
  const res = await fetch(`${BASE_URL}/splits/recommend?${params}`);
  return res.json();
};
