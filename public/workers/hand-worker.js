/* Hand landmarks run away from the page's animation and interaction thread. */
importScripts("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.js");

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let landmarker = null;
let activeDelegate = "CPU";
let lastVideoTimestamp = 0;

async function createLandmarkerWithDelegate(fileset, delegate) {
  return Vision.HandLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.52,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.58,
  });
}

self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      const fileset = await Vision.FilesetResolver.forVisionTasks(WASM_ROOT);
      lastVideoTimestamp = 0;
      try {
        landmarker = await createLandmarkerWithDelegate(fileset, "GPU");
        activeDelegate = "GPU";
      } catch {
        landmarker = await createLandmarkerWithDelegate(fileset, "CPU");
        activeDelegate = "CPU";
      }
      self.postMessage({ type: "ready", delegate: activeDelegate });
    } catch (error) {
      self.postMessage({ type: "error", message: error?.message || String(error) });
    }
    return;
  }

  if (data.type === "frame") {
    const bitmap = data.bitmap;
    try {
      if (!landmarker) throw new Error("Hand model is not ready");
      const rawTs = Number.isFinite(data.timestamp) ? Math.round(data.timestamp) : Math.round(performance.now());
      const safeTimestamp = Math.max(lastVideoTimestamp + 1, rawTs);
      lastVideoTimestamp = safeTimestamp;

      const result = landmarker.detectForVideo(bitmap, safeTimestamp);
      const labels =
        result.handedness?.map((categories) => {
          const best = categories?.[0];
          return best?.score >= 0.62 ? best.categoryName || null : null;
        }) || [];
      self.postMessage({
        type: "result",
        landmarks: result.landmarks,
        labels,
        timestamp: data.timestamp,
        delegate: activeDelegate,
      });
    } catch (error) {
      self.postMessage({ type: "error", message: error?.message || String(error) });
    } finally {
      bitmap.close();
    }
  }
};
