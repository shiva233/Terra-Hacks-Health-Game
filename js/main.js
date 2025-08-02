// Teachable Machine model URL - replace with your model URL
const URL = "https://teachablemachine.withgoogle.com/models/A3XU72N3c/";
let model, webcam, ctx, labelContainer, maxPredictions;

// Initialize Teachable Machine model and webcam
async function initTeachableMachine() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        // Load the model and metadata
        model = await tmPose.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Set up webcam
        const size = 400;
        const flip = true; // whether to flip the webcam
        webcam = new tmPose.Webcam(size, size, flip);
        await webcam.setup();
        await webcam.play();
        
        // Append webcam element
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        
        // Set up label container
        labelContainer = document.getElementById("label-container");
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }

        // Start prediction loop
        window.requestAnimationFrame(loop);
        
        console.log("Camera and pose detection initialized successfully!");
        
    } catch (error) {
        console.error("Error initializing Teachable Machine:", error);
        document.getElementById("webcam-container").innerHTML = 
            "<p style='color: red;'>Error loading pose detection model. Please check the model URL.</p>";
    }
}

// Main prediction loop
async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

// Predict pose from webcam feed
async function predict() {
    try {
        const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
        const prediction = await model.predict(posenetOutput);
        
        // Display predictions
        for (let i = 0; i < maxPredictions; i++) {
            const classPrediction = prediction[i].className + ": " + 
                                  (prediction[i].probability * 100).toFixed(1) + "%";
            labelContainer.childNodes[i].innerHTML = classPrediction;
        }
        
        // Find the pose with highest confidence
        let highestConfidence = 0;
        let detectedPose = "";
        
        for (let i = 0; i < maxPredictions; i++) {
            if (prediction[i].probability > highestConfidence) {
                highestConfidence = prediction[i].probability;
                detectedPose = prediction[i].className;
            }
        }
        
        // Log detected pose if confidence is high enough
        if (highestConfidence > 0.7) {
            console.log(`Detected pose: ${detectedPose} (${(highestConfidence * 100).toFixed(1)}% confidence)`);
        }
        
    } catch (error) {
        console.error("Prediction error:", error);
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing camera and pose detection...');
    await initTeachableMachine();
}); 