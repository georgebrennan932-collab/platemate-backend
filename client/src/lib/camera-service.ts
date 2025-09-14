// client/src/lib/camera-service.ts
export async function startCamera(videoElement: HTMLVideoElement) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    await videoElement.play();
  } catch (err) {
    console.error("Camera error:", err);
    alert("Unable to access camera. Please allow camera permissions.");
  }
}

export function stopCamera(videoElement: HTMLVideoElement) {
  const stream = videoElement.srcObject as MediaStream | null;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  videoElement.srcObject = null;
}