import { GoogleGenAI, Modality } from '@google/genai';

/**
 * Voice Controller
 * 
 * Does exactly 3 things:
 * 1. Uses Gemini to recognize what the user says
 * 2. Maps the speech to simple commands using Gemini
 * 3. Returns the command to the game
 * 
 * Usage:
 * const controller = new VoiceController(game);
 * await controller.init();
 * controller.start();
 */
export class MenuVoiceController {
  constructor(menu) {
    this.menu = menu;
    this.isListening = false;
    
    // Simple command map - what Gemini should return
    this.commands = {
      'start': 'startGame',
      'exit': 'exitGame'
    };
  }

  /**
   * Initialize Gemini AI for voice recognition
   */
  async init() {
    // Create Gemini client
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Connect to Gemini for voice recognition
    this.session = await this.client.live.connect({
      model: 'gemini-2.5-flash-preview-native-audio-dialog',
      callbacks: {
        // When Gemini recognizes speech, handle it
        onmessage: (message) => this.handleSpeech(message)
      },
      config: {
        responseModalities: [Modality.TEXT]  // We only want text back
      }
    });
  }

  /**
   * Start listening for voice input
   */
  async start() {
    // Get microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Set up audio processing
    this.audioContext = new AudioContext();
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(256, 1, 1);
    
    // Send audio to Gemini when we get it
    this.processor.onaudioprocess = (event) => {
      if (this.isListening) {
        const audio = event.inputBuffer.getChannelData(0);
        this.session?.sendRealtimeInput({ media: this.toBlob(audio) });
      }
    };
    
    // Connect audio pipeline
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.isListening = true;
  }

  /**
   * Stop listening
   */
  stop() {
    this.isListening = false;
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.processor?.disconnect();
    this.source?.disconnect();
  }

  /**
   * Handle speech recognized by Gemini
   */
  handleSpeech(message) {
    // Get the text Gemini recognized
    const recognizedText = message.serverContent?.modelTurn?.parts[0]?.text;
    if (!recognizedText) return;
    
    // Use Gemini to map speech to a command
    this.mapSpeechToCommand(recognizedText);
  }

  /**
   * Use Gemini to map speech to a command
   */
  async mapSpeechToCommand(speech) {
    // Create a simple prompt for Gemini
    const availableCommands = Object.keys(this.commands).join(', ');
    const prompt = `The user said: "${speech}"

Available commands: ${availableCommands}

Return only the exact command name from the list above, or "none" if no match.

Examples:
- "start" "begin" "go" "start game" → "start"
- "exit" "quit" "end" "stop" → "exit"
- "what's the weather" → "none"

Command:`;

    try {
      // Ask Gemini to map the speech to a command
      const model = this.client.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const command = result.response.text().trim().toLowerCase();
      
      // If Gemini returned a valid command, execute it
      if (this.commands[command]) {
        this.menu[this.commands[command]]?.();
        console.log(`Executed: ${speech} → ${command}`);
      }
    } catch (error) {
      console.error('Error mapping speech to command:', error);
    }
  }

  /**
   * Convert audio data to blob for Gemini
   */
  toBlob(pcmData) {
    const buffer = new ArrayBuffer(pcmData.length * 2);
    const view = new DataView(buffer);
    
    // Convert audio samples to 16-bit format
    for (let i = 0; i < pcmData.length; i++) {
      const sample = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }
} 