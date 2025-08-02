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
        
        // Set up label container (but don't display predictions)
        labelContainer = document.getElementById("label-container");
        
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
        
        // Find the pose with highest confidence (don't display predictions under webcam)
        let highestConfidence = 0;
        let detectedPose = "";
        
        for (let i = 0; i < maxPredictions; i++) {
            if (prediction[i].probability > highestConfidence) {
                highestConfidence = prediction[i].probability;
                detectedPose = prediction[i].className;
            }
        }
        
        // Update the game canvas pose display
        updatePoseDisplay(detectedPose, highestConfidence);
        
        // Log detected pose if confidence is high enough
        if (highestConfidence > 0.7) {
            console.log(`Detected pose: ${detectedPose} (${(highestConfidence * 100).toFixed(1)}% confidence)`);
        }
        
    } catch (error) {
        console.error("Prediction error:", error);
    }
}

// Update the pose display in the game canvas
function updatePoseDisplay(pose, confidence) {
    const poseTextElement = document.querySelector('.pose-text');
    const confidenceTextElement = document.querySelector('.confidence-text');
    
    if (!poseTextElement || !confidenceTextElement) return;
    
    // Update text content
    if (confidence > 0.5) {
        poseTextElement.textContent = pose;
        confidenceTextElement.textContent = `${(confidence * 100).toFixed(1)}% Confidence`;
    } else {
        poseTextElement.textContent = "No Pose Detected";
        confidenceTextElement.textContent = "0% Confidence";
    }
    
    // Define colors for different poses
    const poseColors = {
        'Squat': '#FF4444',      // Red
        'Lunges': '#44FF44',     // Green  
        'Toe touch': '#4444FF',  // Blue
        'Standing': '#FFFF44',   // Yellow
        'Jumping': '#FF44FF',    // Magenta
        'Plank': '#44FFFF',      // Cyan
        'Push-up': '#FF8844',    // Orange
        'default': '#FFFFFF'     // White
    };
    
    // Set color based on pose (case-insensitive)
    const normalizedPose = pose.toLowerCase();
    let color = poseColors['default'];
    
    for (const [poseName, poseColor] of Object.entries(poseColors)) {
        if (normalizedPose.includes(poseName.toLowerCase())) {
            color = poseColor;
            break;
        }
    }
    
    // Apply color with confidence-based intensity
    if (confidence > 0.5) {
        poseTextElement.style.color = color;
        confidenceTextElement.style.color = color;
    } else {
        poseTextElement.style.color = '#666666'; // Gray for low confidence
        confidenceTextElement.style.color = '#666666';
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing camera and pose detection...');
    await initTeachableMachine();
}); 