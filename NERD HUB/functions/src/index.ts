import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

interface SyncSummaryInput {
  duoId: string;
}

interface SyncSummaryOutput {
  duoId: string;
  syncPercent: number;
  pendingActions: number;
}

export const getSyncSummary = onCall<SyncSummaryInput>(async (request): Promise<SyncSummaryOutput> => {
  if (!request.auth) {
    throw new Error("unauthenticated");
  }

  const duoId = request.data?.duoId?.trim();
  if (!duoId) {
    throw new Error("invalid-duo-id");
  }

  const summaryRef = db.collection("duo_sync").doc(duoId);
  const snapshot = await summaryRef.get();
  const data = snapshot.data() || {};

  return {
    duoId,
    syncPercent: Number(data.syncPercent ?? 0),
    pendingActions: Number(data.pendingActions ?? 0),
  };
});

