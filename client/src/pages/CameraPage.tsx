import React from "react";

const CameraPage: React.FC = () => {
  return (
    <div>
      <h1>Camera Page</h1>
      <video
        id="camera"
        autoPlay
        playsInline
        style={{ width: "100%", height: "auto" }}
      ></video>
      <button onClick={startCamera}>Start Camera</button>
    </div>
  );
};

// Function to start the camera
function startCamera() {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      const video = document.getElementById("camera") as HTMLVideoElement;
      if (video) {
        video.srcObject = stream;
      }
    })
    .catch((err) => {
      console.error("Error accessing camera: ", err);
    });
}

export default CameraPage;