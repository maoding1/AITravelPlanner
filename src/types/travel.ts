export type TravelPreference = {
  interestTags: string[];
  pace: "relaxed" | "balanced" | "intensive";
  transport: "public" | "self-drive" | "mixed";
  accommodation: "budget" | "mid" | "luxury";
  dietary: string[];
};

export type TravelerProfile = {
  id: string;
  userId: string;
  displayName: string;
  language: string;
  homeAirport?: string;
  preferences: TravelPreference;
};

export type DayActivity = {
  id: string;
  day: number;
  title: string;
  description: string;
  category?: "transport" | "accommodation" | "sightseeing" | "dining" | "experience" | "shopping" | "other" | string;
  location?: {
    name: string;
    lat: number;
    lng: number;
  };
  startTime?: string;
  endTime?: string;
  estimatedCost?: number;
  bookingUrl?: string;
};

export type ItineraryDay = {
  date: string;
  summary: string;
  activities: DayActivity[];
};

export type BudgetLineItem = {
  id: string;
  category: "transport" | "accommodation" | "dining" | "activities" | "shopping" | "misc";
  title: string;
  amount: number;
  currency: string;
  day?: number;
  notes?: string;
};

export type Itinerary = {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  preferences: TravelPreference;
  days: ItineraryDay[];
  budgetItems: BudgetLineItem[];
  createdAt: string;
  updatedAt: string;
};

export type VoiceTranscript = {
  transcript: string;
  confidence: number;
  language: string;
};

export type AIPlannerRequest = {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelers: number;
  currency?: string;
  preferences: TravelPreference;
  notes?: string;
};

export type AIPlannerResponse = {
  itinerary: ItineraryDay[];
  budget: BudgetLineItem[];
  tips: string[];
};
