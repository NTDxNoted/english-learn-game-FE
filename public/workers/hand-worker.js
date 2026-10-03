/* Hand landmarks run away from the page's animation and interaction thread. */
importScripts("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.js");

let landmarker;

self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      const fileset = await Vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
      );
      landmarker = await Vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
      });
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({ type: "error", message: error?.message || String(error) });
    }
    return;
  }

  if (data.type === "frame") {
    const bitmap = data.bitmap;
    try {
      if (!landmarker) throw new Error("Hand model is not ready");
      const result = landmarker.detectForVideo(bitmap, data.timestamp);
      const labels = result.handedness?.map(categories => {
        const best = categories?.[0];
        return best?.score >= 0.65 ? best.categoryName || null : null;
      }) || [];
      self.postMessage({ type: "result", landmarks: result.landmarks, labels, timestamp: data.timestamp });
    } catch (error) {
      self.postMessage({ type: "error", message: error?.message || String(error) });
    } finally {
      bitmap.close();
    }
  }
};
