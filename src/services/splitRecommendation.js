import { getRecommendedSplits } from "./api";
import { getUserProfile } from "./userProfile";

export const recommendSplits = async () => {
  const profile = await getUserProfile();
  if (!profile) throw new Error("No user profile found");

  const params = new URLSearchParams({
    experience: profile.experienceLevel,
    days: profile.daysPerWeek.toString(),
    goal: profile.goal,
    type: profile.trainingType,
  }).toString();

  const splits = await getRecommendedSplits(params);

  return {
    profile,
    splits,
    generatedAt: new Date().toISOString(),
  };
};
