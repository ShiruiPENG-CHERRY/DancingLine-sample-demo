/* ---------------------------------------------------------------
    🌟  Module Imports and Initialization
---------------------------------------------------------------- */
const importMap = {
  imports: {
    "three": "https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.js",
    "three/examples/jsm/": "https://cdn.jsdelivr.net/npm/three@0.178.0/examples/jsm/"
  }
};
const mapScript = document.createElement("script");
mapScript.type = "importmap";
mapScript.textContent = JSON.stringify(importMap);
document.head.appendChild(mapScript);

(async function () {
  try {
    const threeModule = await import("three");
    const THREE = threeModule.default || threeModule;
    window.THREE = THREE;

    const loaderMod = await import("three/examples/jsm/loaders/OBJLoader.js");
    const OBJLoader = loaderMod.OBJLoader || loaderMod.default?.OBJLoader || THREE.OBJLoader;
    window.objLoader = new OBJLoader();

    const mtlLoaderMod = await import("three/examples/jsm/loaders/MTLLoader.js");
    const MTLLoader = mtlLoaderMod.MTLLoader || mtlLoaderMod.default?.MTLLoader || THREE.MTLLoader;
    window.mtlLoader = new MTLLoader();

    initDancingLine(THREE, OBJLoader, MTLLoader);
  } catch (err) {
    console.error("Module load failed:", err);
  }
})();

/* ---------------------------------------------------------------
    🎮  Global Variables
---------------------------------------------------------------- */
let scene = null;
let camera = null;
let renderer = null;
let container = null;
let gameContainer = null;

// Game objects
let dancingLine = null;
let cubes = [];
let obstacles = [];
let gems = [];
let crowns = [];
let platforms = [];
let trees = [];
let treeSizes = [];
let treeCount = 0;
let collidableMeshList = [];

// Game state
let gameState = 'menu';
let score = 0;
let level = 1;
let cubePosition = { x: 0, y: 0, z: 0 };
let moveDir = 1; // 1: x-axis, 2: z-axis
let isStopped = false;
let hasWon = false;
let gameSpeed = 2; // Adjusted to match doc's movement speed (2 units per second)
let cameraDistance = 5;
let movingDir = 1; // Direction for cube movement (1: x+, 2: z+)

// Audio system
let audioContext = null;
let backgroundMusic = null;
let dieSound = null;
let musicGain = null;
let dieSoundGain = null;
let musicSource = null;
let isMusicPlaying = false;
let musicVolume = 0.5;

// UI elements
let uiOverlay = null;
let scoreElement = null;
let menuElement = null;
let musicControls = null;
let instructionModal = null;
let volumeModal = null;
let successModal = null;

// Path-related variables
let pathPoints = [];
let currentPathIndex = 0;

/* ---------------------------------------------------------------
    🚀  Initialization
---------------------------------------------------------------- */
function initDancingLine(THREE, OBJLoader, MTLLoader) {
  createGameContainer();
  setupThreeJS(THREE);
  setupAudio();
  createUI();
  createGameWorld(THREE, OBJLoader, MTLLoader);
  setupControls();
  startMenuState();
  animate();

  display("🎮 Dancing Line 3D loaded! Click the game area to play!");
}

/* ---------------------------------------------------------------
    🎵  Audio Setup
---------------------------------------------------------------- */
async function setupAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    musicGain = audioContext.createGain();
    musicGain.gain.value = musicVolume;
    musicGain.connect(audioContext.destination);
    
    dieSoundGain = audioContext.createGain();
    dieSoundGain.gain.value = musicVolume;
    dieSoundGain.connect(audioContext.destination);

    await loadBackgroundMusic();
    await loadDieSound();
  } catch (error) {
    console.log("Audio setup failed:", error);
    display("⚠️ Audio not supported on this browser.");
  }
}

async function loadBackgroundMusic() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/ShiruiPENG-CHERRY/DancingLine-sample-demo/main/music.mp3');
    const arrayBuffer = await response.arrayBuffer();
    backgroundMusic = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.log("Failed to load background music:", error);
  }
}

async function loadDieSound() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/ShiruiPENG-CHERRY/DancingLine-sample-demo/main/lib/Audioclip/die_sound.wav');
    const arrayBuffer = await response.arrayBuffer();
    dieSound = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.log("Failed to load die sound:", error);
  }
}

function toggleMusic() {
  if (!audioContext || !backgroundMusic) return;

  if (isMusicPlaying) {
    stopMusic();
  } else {
    playMusic();
  }
}

function playMusic() {
  if (!audioContext || !backgroundMusic) return;

  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    musicSource = audioContext.createBufferSource();
    musicSource.buffer = backgroundMusic;
    musicSource.loop = true;
    musicSource.connect(musicGain);
    musicSource.start();
    isMusicPlaying = true;
    musicGain.gain.setValueAtTime(musicVolume, audioContext.currentTime);
    const musicBtn = document.getElementById('musicToggle');
    if (musicBtn) musicBtn.textContent = '🔊';
  } catch (error) {
    console.log("Error playing music:", error);
  }
}

function stopMusic() {
  if (!musicSource) return;

  try {
    musicSource.stop();
    musicSource = null;
    isMusicPlaying = false;

    const musicBtn = document.getElementById('musicToggle');
    if (musicBtn) musicBtn.textContent = '🔇';
  } catch (error) {
    console.log("Error stopping music:", error);
  }
}

function playDieSound() {
  if (!audioContext || !dieSound) return;

  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = dieSound;
    source.connect(dieSoundGain);
    source.start();
  } catch (error) {
    console.log("Error playing die sound:", error);
  }
}

function setMusicVolume(volume) {
  musicVolume = Math.max(0, Math.min(1, volume));
  if (musicVolume > 0) {
    isMuted = false;
    previousVolume = musicVolume; // Store non-zero volume for unmuting
  } else {
    isMuted = true;
  }
  if (musicGain) {
    musicGain.gain.setValueAtTime(musicVolume, audioContext.currentTime);
  }
  if (dieSoundGain) {
    dieSoundGain.gain.setValueAtTime(musicVolume, audioContext.currentTime);
  }
  const volumeDisplay = document.getElementById('volumeDisplay');
  if (volumeDisplay) {
    volumeDisplay.textContent = `${Math.round(musicVolume * 100)}%`;
  }
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.textContent = isMuted ? '🔊 UNMUTE' : '🔇 MUTE';
  }
}

/* ---------------------------------------------------------------
    🖼️  Scene Setup
---------------------------------------------------------------- */
function createGameContainer() {
  container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100%';
  container.style.height = '100vh';
  container.style.zIndex = '9999';
  container.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
  document.body.appendChild(container);

  gameContainer = document.createElement('div');
  gameContainer.style.position = 'absolute';
  gameContainer.style.left = '0';
  gameContainer.style.top = '0';
  gameContainer.style.width = '100%';
  gameContainer.style.height = '100%';
  container.appendChild(gameContainer);
}

function setupThreeJS(THREE) {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a1a2e, 50, 100);

  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(cubePosition.x - 0.2 * cameraDistance, cubePosition.y + 5, cubePosition.z - 0.707 * cameraDistance);
  camera.lookAt(cubePosition.x, cubePosition.y, cubePosition.z);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x1a1a2e, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  gameContainer.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  window.addEventListener('resize', onWindowResize);
}

/* ---------------------------------------------------------------
    🖥️  UI Elements
---------------------------------------------------------------- */
function createUI() {
  uiOverlay = document.createElement('div');
  uiOverlay.style.position = 'absolute';
  uiOverlay.style.top = '0';
  uiOverlay.style.left = '0';
  uiOverlay.style.width = '100%';
  uiOverlay.style.height = '100%';
  uiOverlay.style.pointerEvents = 'none';
  uiOverlay.style.fontFamily = 'Arial, sans-serif';
  uiOverlay.style.color = '#00ffff';
  container.appendChild(uiOverlay);

  scoreElement = document.createElement('div');
  scoreElement.style.position = 'absolute';
  scoreElement.style.top = '20px';
  scoreElement.style.left = '20px';
  scoreElement.style.fontSize = '24px';
  scoreElement.style.fontWeight = 'bold';
  scoreElement.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.8)';
  scoreElement.innerHTML = 'Score: 0<br>Level: 1';
  uiOverlay.appendChild(scoreElement);

  createMusicControls();
  createMenu();
  createInstructionModal();
  createVolumeModal();
  createSuccessModal();
}

function createMusicControls() {
  musicControls = document.createElement('div');
  musicControls.style.position = 'absolute';
  musicControls.style.top = '20px';
  musicControls.style.right = '20px';
  musicControls.style.pointerEvents = 'auto';
  musicControls.style.display = 'flex';
  musicControls.style.gap = '15px';
  musicControls.style.alignItems = 'center';

  const musicToggle = document.createElement('button');
  musicToggle.id = 'musicToggle';
  musicToggle.textContent = '🔇';
  musicToggle.style.cssText = `
    background: linear-gradient(145deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.1));
    border: 2px solid #ffd700;
    color: #ffd700;
    padding: 10px;
    font-size: 1.5rem;
    border-radius: 50%;
    cursor: pointer;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  `;

  musicToggle.addEventListener('click', toggleMusic);
  musicToggle.addEventListener('mouseenter', () => {
    musicToggle.style.transform = 'scale(1.1)';
    musicToggle.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)';
  });
  musicToggle.addEventListener('mouseleave', () => {
    musicToggle.style.transform = 'scale(1)';
    musicToggle.style.boxShadow = 'none';
  });

  const volumeButton = document.createElement('button');
  volumeButton.id = 'volumeButton';
  volumeButton.textContent = '🎵';
  volumeButton.style.cssText = `
    background: linear-gradient(145deg, rgba(0, 255, 255, 0.3), rgba(0, 255, 255, 0.1));
    border: 2px solid #00ffff;
    color: #00ffff;
    padding: 10px;
    font-size: 1.5rem;
    border-radius: 50%;
    cursor: pointer;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  `;

  volumeButton.addEventListener('click', showVolumeModal);
  volumeButton.addEventListener('mouseenter', () => {
    volumeButton.style.transform = 'scale(1.1)';
    volumeButton.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.5)';
  });
  volumeButton.addEventListener('mouseleave', () => {
    volumeButton.style.transform = 'scale(1)';
    volumeButton.style.boxShadow = 'none';
  });

  musicControls.appendChild(musicToggle);
  musicControls.appendChild(volumeButton);
  uiOverlay.appendChild(musicControls);
}

function createMenu() {
  menuElement = document.createElement('div');
  menuElement.style.position = 'absolute';
  menuElement.style.top = '50%';
  menuElement.style.left = '50%';
  menuElement.style.transform = 'translate(-50%, -50%)';
  menuElement.style.textAlign = 'center';
  menuElement.style.pointerEvents = 'auto';
  menuElement.innerHTML = `
    <h1 style="font-size: 4rem; margin-bottom: 20px; text-shadow: 0 0 20px rgba(0, 255, 255, 0.8);">
      DANCING LINE
    </h1>
    <p style="font-size: 1.2rem; margin-bottom: 40px; color: #ff6b9d;">
      3D Edition - Source Academy
    </p>
    <button id="startBtn" style="
      background: linear-gradient(145deg, rgba(255, 107, 157, 0.3), rgba(255, 107, 157, 0.1));
      border: 2px solid #ff6b9d;
      color: #ff6b9d;
      padding: 15px 30px;
      font-size: 1.5rem;
      border-radius: 10px;
      cursor: pointer;
      margin: 10px;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    ">START GAME</button>
    <br>
    <button id="instructionsBtn" style="
      background: linear-gradient(145deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.1));
      border: 2px solid #00ffff;
      color: #00ffff;
      padding: 10px 20px;
      font-size: 1rem;
      border-radius: 10px;
      cursor: pointer;
      margin: 10px;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    ">INSTRUCTIONS</button>
  `;
  uiOverlay.appendChild(menuElement);

  const startBtn = menuElement.querySelector('#startBtn');
  const instructionsBtn = menuElement.querySelector('#instructionsBtn');

  startBtn.addEventListener('mouseenter', () => {
    startBtn.style.transform = 'scale(1.05)';
    startBtn.style.boxShadow = '0 0 20px rgba(255, 107, 157, 0.5)';
  });

  startBtn.addEventListener('mouseleave', () => {
    startBtn.style.transform = 'scale(1)';
    startBtn.style.boxShadow = 'none';
  });

  instructionsBtn.addEventListener('mouseenter', () => {
    instructionsBtn.style.transform = 'scale(1.05)';
    instructionsBtn.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
  });

  instructionsBtn.addEventListener('mouseleave', () => {
    instructionsBtn.style.transform = 'scale(1)';
    instructionsBtn.style.boxShadow = 'none';
  });

  startBtn.addEventListener('click', startGame);
  instructionsBtn.addEventListener('click', showInstructions);
}

function createInstructionModal() {
  instructionModal = document.createElement('div');
  instructionModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(20px);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    pointerEvents: auto;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95));
    border: 3px solid #00ffff;
    border-radius: 25px;
    padding: 50px;
    max-width: 800px;
    max-height: 85vh;
    overflow-y: auto;
    text-align: center;
    box-shadow: 0 0 60px rgba(0, 255, 255, 0.4);
    animation: modalPulse 2s ease-in-out infinite alternate;
    position: relative;
  `;

  modalContent.innerHTML = `
    <button id="closeModalX" style="
      position: absolute;
      top: 15px;
      right: 20px;
      background: none;
      border: none;
      color: #ff6b9d;
      font-size: 2rem;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    ">×</button>
    
    <h2 style="
      font-size: 3.5rem; 
      margin-bottom: 30px; 
      background: linear-gradient(45deg, #ff6b9d, #00ffff, #ffd700);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: gradientShift 3s ease-in-out infinite;
      text-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
    ">
      🎯IGNITE YOUR DANCE🎯
    </h2>
    
    <div style="
      font-size: 1.4rem; 
      line-height: 1.9; 
      margin-bottom: 40px; 
      color: #ffffff;
      text-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
    ">
      <div style="
        background: linear-gradient(45deg, rgba(255, 107, 157, 0.15), rgba(0, 255, 255, 0.15));
        border-left: 4px solid #ff6b9d;
        border-radius: 15px;
        padding: 25px;
        margin: 25px 0;
        text-align: left;
      ">
        <h3 style="color: #ffd700; margin-bottom: 15px; font-size: 1.6rem;">🚀 COMMAND THE COSMOS!</h3>
        <p><strong style="color: #00ffff;">A:</strong> Move along X-axis.</p>
        <p><strong style="color: #00ffff;">D:</strong> Move along Z-axis.</p>
        <p><strong style="color: #00ffff;">W:</strong> Reset game when stopped.</p>
        <p><strong style="color: #00ffff;">P:</strong> Pause to strategize your next move!</p>
        <p><strong style="color: #00ffff;">ESC:</strong> Return to menu.</p>
      </div>
      
      <div style="
        background: linear-gradient(45deg, rgba(255, 215, 0, 0.15), rgba(255, 107, 157, 0.15));
        border-left: 4px solid #ffd700;
        border-radius: 15px;
        padding: 25px;
        margin: 25px 0;
        text-align: left;
      ">
        <h3 style="color: #ff6b9d; margin-bottom: 15px; font-size: 1.6rem;">💥 RISE TO GLORY!</h3>
        <p>🌲 <strong>Collect diamonds!</strong> Each spawns a growing tree!</p>
        <p>👑 <strong>Find the crown!</strong> Reach it to win!</p>
        <p>⚡ <strong>Avoid trees!</strong> Collision ends the game!</p>
        <p>🔥 <strong>Keep moving!</strong> Follow the path to victory!</p>
      </div>
      
      <div style="
        background: linear-gradient(45deg, rgba(0, 255, 255, 0.2), rgba(255, 215, 0, 0.2));
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-radius: 20px;
        padding: 30px;
        margin: 30px 0;
        animation: challengePulse 2s ease-in-out infinite alternate;
      ">
        <h3 style="
          color: #00ffff; 
          font-size: 2rem; 
          margin-bottom: 15px;
          text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
        ">
          ⚔️ YOUR LEGEND BEGINS NOW! ⚔️
        </h3>
        <p style="font-size: 1.3rem; color: #ffd700; font-weight: bold;">
          Are you ready to carve your path among the stars?<br>
          Embrace the challenge and <span style="color: #ff6b9d;">DANCE TO VICTORY!</span>
        </p>
      </div>
    </div>
    
    <button id="closeModal" style="
      background: linear-gradient(145deg, rgba(255, 107, 157, 0.5), rgba(255, 107, 157, 0.3));
      border: 3px solid #ff6b9d;
      color: #ff6b9d;
      padding: 20px 50px;
      font-size: 1.4rem;
      font-weight: bold;
      border-radius: 30px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      box-shadow: 0 0 25px rgba(255, 107, 157, 0.4);
      text-shadow: 0 0 10px rgba(255, 107, 157, 0.8);
    ">
      🎮 LET'S CONQUER THE PATH! 🎮
    </button>
    
    <style>
      @keyframes modalPulse {
        0% { transform: scale(1); }
        100% { transform: scale(1.01); }
      }
      
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      @keyframes challengePulse {
        0% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
        100% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.6); }
      }
    </style>
  `;

  const closeBtn = modalContent.querySelector('#closeModal');
  const closeXBtn = modalContent.querySelector('#closeModalX');

  closeBtn.addEventListener('click', hideInstructions);
  closeXBtn.addEventListener('click', hideInstructions);

  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.transform = 'scale(1.1)';
    closeBtn.style.boxShadow = '0 0 40px rgba(255, 107, 157, 0.8)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.transform = 'scale(1)';
    closeBtn.style.boxShadow = '0 0 25px rgba(255, 107, 157, 0.4)';
  });

  closeXBtn.addEventListener('mouseenter', () => {
    closeXBtn.style.background = 'rgba(255, 107, 157, 0.2)';
    closeXBtn.style.transform = 'scale(1.2)';
  });
  closeXBtn.addEventListener('mouseleave', () => {
    closeXBtn.style.background = 'none';
    closeXBtn.style.transform = 'scale(1)';
  });

  instructionModal.addEventListener('click', (e) => {
    if (e.target === instructionModal) {
      hideInstructions();
    }
  });

  instructionModal.appendChild(modalContent);
  container.appendChild(instructionModal);
}

function createVolumeModal() {
  volumeModal = document.createElement('div');
  volumeModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(15px);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 10001;
    pointer-events: auto;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95));
    border: 3px solid #00ffff;
    border-radius: 25px;
    padding: 40px;
    max-width: 500px;
    text-align: center;
    box-shadow: 0 0 50px rgba(0, 255, 255, 0.4);
    animation: modalPulse 2s ease-in-out infinite alternate;
    position: relative;
  `;

  modalContent.innerHTML = `
    <button id="closeVolumeModalX" style="
      position: absolute;
      top: 15px;
      right: 20px;
      background: none;
      border: none;
      color: #ff6b9d;
      font-size: 2rem;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    ">×</button>
    
    <h2 style="
      font-size: 2.5rem; 
      margin-bottom: 30px; 
      color: #00ffff;
      text-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
    ">
      🎵 AUDIO CONTROL
    </h2>
    
    <div style="
      background: linear-gradient(45deg, rgba(0, 255, 255, 0.1), rgba(255, 215, 0, 0.1));
      border: 2px solid rgba(0, 255, 255, 0.3);
      border-radius: 15px;
      padding: 30px;
      margin: 20px 0;
    ">
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        margin-bottom: 20px;
      ">
        <span style="font-size: 1.5rem;">🔈</span>
        <input type="range" id="volumeSlider" min="0" max="100" value="50" style="
          width: 200px;
          height: 8px;
          background: linear-gradient(to right, #00ffff, #ffd700);
          outline: none;
          border-radius: 4px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
        ">
        <span style="font-size: 1.5rem;">🔊</span>
      </div>
      
      <div style="
        font-size: 1.2rem;
        color: #ffd700;
        margin-bottom: 20px;
      ">
        Volume: <span id="volumeDisplay">50%</span>
      </div>
      
      <div style="
        display: flex;
        justify-content: center;
        gap: 15px;
      ">
        <button id="muteBtn" style="
          background: linear-gradient(145deg, rgba(255, 107, 157, 0.3), rgba(255, 107, 157, 0.1));
          border: 2px solid #ff6b9d;
          color: #ff6b9d;
          padding: 10px 20px;
          font-size: 1rem;
          border-radius: 15px;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        ">🔇 MUTE</button>
        
        <button id="maxVolumeBtn" style="
          background: linear-gradient(145deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.1));
          border: 2px solid #ffd700;
          color: #ffd700;
          padding: 10px 20px;
          font-size: 1rem;
          border-radius: 15px;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        ">🔊 MAX</button>
      </div>
    </div>
    
    <button id="closeVolumeModal" style="
      background: linear-gradient(145deg, rgba(255, 107, 157, 0.5), rgba(255, 107, 157, 0.3));
      border: 3px solid #ff6b9d;
      color: #ff6b9d;
      padding: 20px 50px;
      font-size: 1.4rem;
      font-weight: bold;
      border-radius: 30px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      box-shadow: 0 0 25px rgba(255, 107, 157, 0.4);
      text-shadow: 0 0 10px rgba(255, 107, 157, 0.8);
    ">
      SAVE & CLOSE
    </button>
    
    <style>
      @keyframes modalPulse {
        0% { transform: scale(1); }
        100% { transform: scale(1.01); }
      }
      
      #volumeSlider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        background: #00ffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
      }
      
      #volumeSlider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: #00ffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
      }
    </style>
  `;

  volumeModal.appendChild(modalContent);
  container.appendChild(volumeModal);

  const closeBtn = modalContent.querySelector('#closeVolumeModal');
  const closeXBtn = modalContent.querySelector('#closeVolumeModalX');
  const volumeSlider = modalContent.querySelector('#volumeSlider');
  const muteBtn = modalContent.querySelector('#muteBtn');
  const maxVolumeBtn = modalContent.querySelector('#maxVolumeBtn');

  closeBtn.addEventListener('click', hideVolumeModal);
  closeXBtn.addEventListener('click', hideVolumeModal);

  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.transform = 'scale(1.1)';
    closeBtn.style.boxShadow = '0 0 40px rgba(255, 107, 157, 0.8)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.transform = 'scale(1)';
    closeBtn.style.boxShadow = '0 0 25px rgba(255, 107, 157, 0.4)';
  });

  closeXBtn.addEventListener('mouseenter', () => {
    closeXBtn.style.background = 'rgba(255, 107, 157, 0.2)';
    closeXBtn.style.transform = 'scale(1.2)';
  });
  closeXBtn.addEventListener('mouseleave', () => {
    closeXBtn.style.background = 'none';
    closeXBtn.style.transform = 'scale(1)';
  });

  volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value / 100;
    setMusicVolume(volume);
  });

  muteBtn.addEventListener('click', () => {
    setMusicVolume(0);
    volumeSlider.value = '0';
  });

  if (maxVolumeBtn) {
    maxVolumeBtn.addEventListener('click', () => {
      setMusicVolume(1);
      volumeSlider.value = '100';
    });
  }

  volumeModal.addEventListener('click', (e) => {
    if (e.target === volumeModal) {
      hideVolumeModal();
    }
  });
}

function createSuccessModal() {
  successModal = document.createElement('div');
  successModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(20px);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    pointer-events: auto;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95));
    border: 3px solid #ffd700;
    border-radius: 25px;
    padding: 50px;
    max-width: 600px;
    text-align: center;
    box-shadow: 0 0 60px rgba(255, 215, 0, 0.4);
    animation: modalPulse 2s ease-in-out infinite alternate;
    position: relative;
  `;

  modalContent.innerHTML = `
    <button id="closeSuccessModalX" style="
      position: absolute;
      top: 15px;
      right: 20px;
      background: none;
      border: none;
      color: #ff6b9d;
      font-size: 2rem;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    ">×</button>
    
    <h2 style="
      font-size: 3.5rem; 
      margin-bottom: 30px; 
      background: linear-gradient(45deg, #ffd700, #00ffff, #ff6b9d);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: gradientShift 3s ease-in-out infinite;
      text-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
    ">
      🎉 VICTORY ACHIEVED! 🎉
    </h2>
    
    <div style="
      font-size: 1.4rem; 
      line-height: 1.9; 
      margin-bottom: 40px; 
      color: #ffffff;
      text-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
    ">
      <p style="font-size: 1.8rem; color: #ffd700; font-weight: bold;">
        You've reached the end!
      </p>
      <p style="margin: 20px 0;">
        Your score: <span id="successScore">${score}</span><br>
        You're a pathfinding legend!
      </p>
      
      <div style="
        background: linear-gradient(45deg, rgba(255, 215, 0, 0.15), rgba(0, 255, 255, 0.15));
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-radius: 20px;
        padding: 30px;
        margin: 30px 0;
        animation: challengePulse 2s ease-in-out infinite alternate;
      ">
        <p style="font-size: 1.3rem; color: #00ffff; font-weight: bold;">
          Your journey has forged a legend among the stars!
        </p>
      </div>
    </div>
    
    <button id="continueBtn" style="
      background: linear-gradient(145deg, rgba(255, 215, 0, 0.5), rgba(255, 215, 0, 0.3));
      border: 3px solid #ffd700;
      color: #ffd700;
      padding: 20px 50px;
      font-size: 1.4rem;
      font-weight: bold;
      border-radius: 30px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      box-shadow: 0 0 25px rgba(255, 215, 0, 0.4);
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
    ">
      🌟 RETURN TO MENU! 🌟
    </button>
    
    <style>
      @keyframes modalPulse {
        0% { transform: scale(1); }
        100% { transform: scale(1.01); }
      }
      
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      @keyframes challengePulse {
        0% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
        100% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.6); }
      }
    </style>
  `;

  const closeBtn = modalContent.querySelector('#continueBtn');
  const closeXBtn = modalContent.querySelector('#closeSuccessModalX');

  closeBtn.addEventListener('click', () => {
    hideSuccessModal();
    startMenuState();
  });
  closeXBtn.addEventListener('click', () => {
    hideSuccessModal();
    startMenuState();
  });

  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.transform = 'scale(1.1)';
    closeBtn.style.boxShadow = '0 0 40px rgba(255, 215, 0, 0.8)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.transform = 'scale(1)';
    closeBtn.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.4)';
  });

  closeXBtn.addEventListener('mouseenter', () => {
    closeXBtn.style.background = 'rgba(255, 107, 157, 0.2)';
    closeXBtn.style.transform = 'scale(1.2)';
  });
  closeXBtn.addEventListener('mouseleave', () => {
    closeXBtn.style.background = 'none';
    closeXBtn.style.transform = 'scale(1)';
  });

  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
      hideSuccessModal();
      startMenuState();
    }
  });

  successModal.appendChild(modalContent);
  container.appendChild(successModal);
}

function showInstructions() {
  instructionModal.style.display = 'flex';
  if (!isMusicPlaying) {
    playMusic();
  }
}

function hideInstructions() {
  instructionModal.style.display = 'none';
}

function showVolumeModal() {
  volumeModal.style.display = 'flex';
}

function hideVolumeModal() {
  volumeModal.style.display = 'none';
}

function showSuccessModal() {
  gameState = 'success';
  const successScore = document.getElementById('successScore');
  if (successScore) successScore.textContent = score;
  successModal.style.display = 'flex';
  stopMusic();
}

function hideSuccessModal() {
  successModal.style.display = 'none';
}

/* ---------------------------------------------------------------
    🌍  Game World Creation
---------------------------------------------------------------- */
function createGameWorld(THREE, OBJLoader, MTLLoader) {
  const objLoader = new OBJLoader();
  window.objLoader = objLoader;
  createPlatforms(THREE);
  generateLevel(THREE, objLoader, mtlLoader);
}

function createPlatforms(THREE) {
  const platformMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
  const roadData = [
    { scale: [4, 0.1, 2], position: [2, -0.55, 0] },
    { scale: [2, 0.1, 3], position: [3, -0.55, 1.5] },
    { scale: [4, 0.1, 2], position: [4, -0.55, 2] },
    { scale: [2, 0.1, 3], position: [5, -0.55, 3.5] },
    { scale: [4, 0.1, 2], position: [6, -0.55, 4] },
    { scale: [2, 0.1, 3], position: [7, -0.55, 5.5] },
    { scale: [4, 0.1, 2], position: [8, -0.55, 6] },
    { scale: [2, 0.1, 3], position: [9, -0.55, 7.5] },
    { scale: [4, 0.1, 2], position: [10, -0.55, 8] },
    { scale: [2, 0.1, 3], position: [11, -0.55, 9.5] },
    { scale: [4, 0.1, 2], position: [12, -0.55, 10] },
    { scale: [2, 0.1, 3], position: [13, -0.55, 11.5] },
    { scale: [4, 0.1, 2], position: [14, -0.55, 12] },
    { scale: [2, 0.1, 3], position: [15, -0.55, 13.5] },
    { scale: [4, 0.1, 2], position: [16, -0.55, 14] },
    { scale: [2, 0.1, 3], position: [17, -0.55, 15.5] },
    { scale: [4, 0.1, 2], position: [18, -0.55, 16] },
    { scale: [2, 0.1, 3], position: [19, -0.55, 17.5] },
    { scale: [4, 0.1, 2], position: [20, -0.55, 18] },
    { scale: [2, 0.1, 3], position: [21, -0.55, 19.5] },
    { scale: [4, 0.1, 2], position: [22, -0.55, 20] },
    { scale: [2, 0.1, 3], position: [23, -0.55, 21.5] },
    { scale: [4, 0.1, 2], position: [24, -0.55, 22] },
    { scale: [2, 0.1, 3], position: [25, -0.55, 23.5] },
    { scale: [1, 0.1, 1.5], position: [25.5, -0.55, 23.75] },
    { scale: [2, 0.1, 1], position: [26, -0.55, 24.5] },
    { scale: [1, 0.1, 1.5], position: [26.5, -0.55, 24.75] },
    { scale: [2, 0.1, 1], position: [27, -0.55, 25.5] },
    { scale: [1, 0.1, 1.5], position: [27.5, -0.55, 25.75] },
    { scale: [2, 0.1, 1], position: [28, -0.55, 26.5] },
    { scale: [1, 0.1, 1.5], position: [28.5, -0.55, 26.75] },
    { scale: [2, 0.1, 1], position: [29, -0.55, 27.5] },
    { scale: [1, 0.1, 1.5], position: [29.5, -0.55, 27.75] },
    { scale: [2, 0.1, 1], position: [30, -0.55, 28.5] },
    { scale: [1, 0.1, 1.5], position: [30.5, -0.55, 28.75] },
    { scale: [2, 0.1, 1], position: [31, -0.55, 29.5] },
    { scale: [1, 0.1, 1.5], position: [31.5, -0.55, 29.75] },
    { scale: [2, 0.1, 1], position: [32, -0.55, 30.5] },
    { scale: [1, 0.1, 1.5], position: [32.5, -0.55, 30.75] },
    { scale: [2, 0.1, 1], position: [33, -0.55, 31.5] },
    { scale: [1, 0.1, 1.5], position: [33.5, -0.55, 31.75] },
    { scale: [2, 0.1, 1], position: [34, -0.55, 32.5] },
    { scale: [1, 0.1, 1.5], position: [34.5, -0.55, 32.75] },
    { scale: [2, 0.1, 1], position: [35, -0.55, 33.5] },
    { scale: [1, 0.1, 1.5], position: [35.5, -0.55, 33.75] },
    { scale: [2, 0.1, 1], position: [36, -0.55, 34.5] },
    { scale: [1, 0.1, 1.5], position: [36.5, -0.55, 34.75] },
    { scale: [2, 0.1, 1], position: [37, -0.55, 35.5] },
    { scale: [1, 0.1, 1.5], position: [37.5, -0.55, 35.75] },
    { scale: [2, 0.1, 1], position: [38, -0.55, 36.5] },
    { scale: [1, 0.1, 1.5], position: [38.5, -0.55, 36.75] },
    { scale: [2, 0.1, 1], position: [39, -0.55, 37.5] },
    { scale: [1, 0.1, 1.5], position: [39.5, -0.55, 37.75] },
    { scale: [2, 0.1, 1], position: [40, -0.55, 38.5] },
    { scale: [1, 0.1, 1.5], position: [40.5, -0.55, 38.75] },
    { scale: [2, 0.1, 1], position: [41, -0.55, 39.5] },
    { scale: [2, 0.1, 3], position: [42, -0.55, 41] },
    { scale: [4, 0.1, 2], position: [43, -0.55, 41.5] },
    { scale: [2, 0.1, 3], position: [44, -0.55, 43] },
    { scale: [4, 0.1, 2], position: [45, -0.55, 43.5] },
    { scale: [2, 0.1, 3], position: [46, -0.55, 45] },
    { scale: [4, 0.1, 2], position: [47, -0.55, 45.5] },
    { scale: [2, 0.1, 3], position: [48, -0.55, 47] },
    { scale: [4, 0.1, 2], position: [49, -0.55, 47.5] },
    { scale: [2, 0.1, 3], position: [50, -0.55, 49] },
    { scale: [4, 0.1, 2], position: [51, -0.55, 49.5] },
    { scale: [2, 0.1, 3], position: [52, -0.55, 51] },
    { scale: [4, 0.1, 2], position: [53, -0.55, 51.5] },
    { scale: [2, 0.1, 3], position: [54, -0.55, 53] },
    { scale: [4, 0.1, 2], position: [55, -0.55, 53.5] },
    { scale: [2, 0.1, 3], position: [56, -0.55, 55] },
    { scale: [4, 0.1, 2], position: [57, -0.55, 55.5] },
  ];

  roadData.forEach((data, index) => {
    const geometry = new THREE.BoxGeometry(data.scale[0], data.scale[1], data.scale[2]);
    const platform = new THREE.Mesh(geometry, platformMaterial);
    platform.position.set(data.position[0], data.position[1], data.position[2]);
    platform.receiveShadow = true;
    scene.add(platform);
    platforms.push(platform);
  });

  // Generate path points for cube movement
  pathPoints = roadData.map(data => new THREE.Vector3(data.position[0], data.position[1] + 0.5, data.position[2]));
}

function generateTreesAlongPath(THREE, objLoader) {
  const offset = 2.5;
  for (let i = 0; i < pathPoints.length; i += 6) {
    const pt = pathPoints[i];
    createTree(THREE, objLoader, pt.x + offset, pt.y, pt.z);
    createTree(THREE, objLoader, pt.x - offset, pt.y, pt.z);
  }
}

function createTree(THREE, objLoader, x, y, z) {
  const treeModels = [
    'Tree_Apple_01.obj',
    'Tree_Apple_02.obj',
    'Tree_Apple_03.obj',
    'Tree_Asian_Shaped_01.obj',
    'Tree_Asian_Shaped_03.obj',
    'Tree_Asian_Shaped_04.obj',
    'Tree_Bamboo_02.obj',
    'Tree_Bamboo_10.obj',
    'Tree_Common_01.obj',
    'Tree_Common_02.obj'
  ];
  const randomTree = treeModels[Math.floor(Math.random() * treeModels.length)];
  const treeMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(Math.random(), Math.random(), Math.random())
  });

  window.objLoader.load(
    `https://raw.githubusercontent.com/ShiruiPENG-CHERRY/DancingLine-sample-demo/main/lib/Mesh/${randomTree}`,
    (obj) => {
      obj.scale.set(0.15, 0.15, 0.15);
      obj.traverse((child) => {
        if (child.isMesh) {
          child.material = treeMaterial;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      obj.position.set(x, y + 1, z);
      scene.add(obj);
      trees[treeCount] = obj;
      treeSizes[treeCount] = 0;
      collidableMeshList.push(obj);
      treeCount++;
    },
    undefined,
    (err) => {
      console.error(`Error loading ${randomTree}:`, err);
      const fallbackGeometry = new THREE.CylinderGeometry(0.2, 0.5, 2, 8);
      const fallbackTree = new THREE.Mesh(fallbackGeometry, treeMaterial);
      fallbackTree.position.set(x, y + 1, z);
      fallbackTree.scale.set(0.15, 0.15, 0.15);
      fallbackTree.castShadow = true;
      fallbackTree.receiveShadow = true;
      scene.add(fallbackTree);
      trees[treeCount] = fallbackTree;
      treeSizes[treeCount] = 0;
      collidableMeshList.push(fallbackTree);
      treeCount++;
    }
  );
}

function changeTree() {
  for (let i = 0; i < treeCount; i++) {
    if (treeSizes[i] < 10) {
      treeSizes[i]++;
      trees[i].scale.set(0.15 * treeSizes[i], 0.15 * treeSizes[i], 0.15 * treeSizes[i]);
    }
  }
}

function createGem(THREE, x, y, z) {
  const gemGeometry = new THREE.OctahedronGeometry(0.3);
  const gemMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  const gem = new THREE.Mesh(gemGeometry, gemMaterial);
  gem.position.set(x, y, z);
  gem.castShadow = true;
  scene.add(gem);
  gems.push(gem);
  return gem;
}

function createCrown(THREE, objLoader, x, y, z, soundIndex) {
  const crownMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

  window.objLoader.load(
    'https://raw.githubusercontent.com/ShiruiPENG-CHERRY/DancingLine-sample-demo/main/lib/Mesh/Crown_0.obj',
    (obj) => {
      obj.scale.set(0.5, 0.5, 0.5);
      obj.traverse((child) => {
        if (child.isMesh) {
          child.material = crownMaterial;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      obj.position.set(x, y, z);
      obj.userData = { soundIndex };
      scene.add(obj);
      crowns.push(obj);
    },
    undefined,
    (err) => {
      console.error("Error loading Crown_0.obj:", err);
      const fallbackGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const fallbackCrown = new THREE.Mesh(fallbackGeometry, crownMaterial);
      fallbackCrown.position.set(x, y, z);
      fallbackCrown.castShadow = true;
      fallbackCrown.userData = { soundIndex };
      scene.add(fallbackCrown);
      crowns.push(fallbackCrown);
    }
  );
}

function drawCube(THREE) {
  const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x5C3A21 });
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(cubePosition.x, cubePosition.y, cubePosition.z);
  cube.castShadow = true;
  scene.add(cube);
  cubes.push(cube);

  // Control maximum cube quantity
  if (cubes.length > 200) {
    const oldestCube = cubes.shift();
    scene.remove(oldestCube);
  }

  // Update camera
  updateCamera();

  // Check collisions and items
  checkDiamond(cube, THREE);
  checkCrown(cube, THREE);
}

function updateCamera() {
  const offsetDist = cameraDistance;
  const offsetUp = 5;
  const camX = cubePosition.x - offsetDist * 0.2;
  const camZ = cubePosition.z - offsetDist * 0.707;
  camera.position.set(camX, cubePosition.y + offsetUp, camZ);
  camera.lookAt(cubePosition.x, cubePosition.y, cubePosition.z);
}

function onRoad(x, z) {
  return (
    (x >= 0 && x <= 4 && z >= -1 && z <= 1) ||
    (x >= 2 && x <= 4 && z >= 0 && z <= 3) ||
    (x >= 2 && x <= 6 && z >= 1 && z <= 3) ||
    (x >= 4 && x <= 6 && z >= 2 && z <= 5) ||
    (x >= 4 && x <= 8 && z >= 3 && z <= 5) ||
    (x >= 6 && x <= 8 && z >= 4 && z <= 7) ||
    (x >= 6 && x <= 10 && z >= 5 && z <= 7) ||
    (x >= 8 && x <= 10 && z >= 6 && z <= 9) ||
    (x >= 8 && x <= 12 && z >= 7 && z <= 9) ||
    (x >= 10 && x <= 12 && z >= 8 && z <= 11) ||
    (x >= 10 && x <= 14 && z >= 9 && z <= 11) ||
    (x >= 12 && x <= 14 && z >= 10 && z <= 13) ||
    (x >= 12 && x <= 16 && z >= 11 && z <= 13) ||
    (x >= 14 && x <= 16 && z >= 12 && z <= 15) ||
    (x >= 14 && x <= 18 && z >= 13 && z <= 15) ||
    (x >= 16 && x <= 18 && z >= 14 && z <= 17) ||
    (x >= 16 && x <= 20 && z >= 15 && z <= 17) ||
    (x >= 18 && x <= 20 && z >= 16 && z <= 19) ||
    (x >= 18 && x <= 22 && z >= 17 && z <= 19) ||
    (x >= 20 && x <= 22 && z >= 18 && z <= 21) ||
    (x >= 20 && x <= 24 && z >= 19 && z <= 21) ||
    (x >= 22 && x <= 24 && z >= 20 && z <= 23) ||
    (x >= 22 && x <= 26 && z >= 21 && z <= 23) ||
    (x >= 24 && x <= 26 && z >= 22 && z <= 25) ||
    (x >= 25 && x <= 26 && z >= 23 && z <= 24.5) ||
    (x >= 25 && x <= 27 && z >= 24 && z <= 25) ||
    (x >= 26 && x <= 27 && z >= 24 && z <= 25.5) ||
    (x >= 26 && x <= 28 && z >= 25 && z <= 26) ||
    (x >= 27 && x <= 28 && z >= 25 && z <= 26.5) ||
    (x >= 27 && x <= 29 && z >= 26 && z <= 27) ||
    (x >= 28 && x <= 29 && z >= 26 && z <= 27.5) ||
    (x >= 28 && x <= 30 && z >= 27 && z <= 28) ||
    (x >= 29 && x <= 30 && z >= 27 && z <= 28.5) ||
    (x >= 29 && x <= 31 && z >= 28 && z <= 29) ||
    (x >= 30 && x <= 31 && z >= 28 && z <= 29.5) ||
    (x >= 30 && x <= 32 && z >= 29 && z <= 30) ||
    (x >= 31 && x <= 32 && z >= 29 && z <= 30.5) ||
    (x >= 31 && x <= 33 && z >= 30 && z <= 31) ||
    (x >= 32 && x <= 33 && z >= 30 && z <= 31.5) ||
    (x >= 32 && x <= 34 && z >= 31 && z <= 32) ||
    (x >= 33 && x <= 34 && z >= 31 && z <= 32.5) ||
    (x >= 33 && x <= 35 && z >= 32 && z <= 33) ||
    (x >= 34 && x <= 35 && z >= 32 && z <= 33.5) ||
    (x >= 34 && x <= 36 && z >= 33 && z <= 34) ||
    (x >= 35 && x <= 36 && z >= 33 && z <= 34.5) ||
    (x >= 35 && x <= 37 && z >= 34 && z <= 35) ||
    (x >= 36 && x <= 37 && z >= 34 && z <= 35.5) ||
    (x >= 36 && x <= 38 && z >= 35 && z <= 36) ||
    (x >= 37 && x <= 38 && z >= 35 && z <= 36.5) ||
    (x >= 37 && x <= 39 && z >= 36 && z <= 37) ||
    (x >= 38 && x <= 39 && z >= 36 && z <= 37.5) ||
    (x >= 38 && x <= 40 && z >= 37 && z <= 38) ||
    (x >= 39 && x <= 40 && z >= 37 && z <= 38.5) ||
    (x >= 39 && x <= 41 && z >= 38 && z <= 39) ||
    (x >= 40 && x <= 41 && z >= 38 && z <= 39.5) ||
    (x >= 40 && x <= 42 && z >= 39 && z <= 40) ||
    (x >= 41 && x <= 43 && z >= 39.5 && z <= 42.5) ||
    (x >= 41 && x <= 45 && z >= 40.5 && z <= 42.5) ||
    (x >= 43 && x <= 45 && z >= 41.5 && z <= 44.5) ||
    (x >= 43 && x <= 47 && z >= 42.5 && z <= 44.5) ||
    (x >= 45 && x <= 47 && z >= 43.5 && z <= 46.5) ||
    (x >= 45 && x <= 49 && z >= 44.5 && z <= 46.5) ||
    (x >= 47 && x <= 49 && z >= 45.5 && z <= 48.5) ||
    (x >= 47 && x <= 51 && z >= 46.5 && z <= 48.5) ||
    (x >= 49 && x <= 51 && z >= 47.5 && z <= 50.5) ||
    (x >= 49 && x <= 53 && z >= 48.5 && z <= 50.5) ||
    (x >= 51 && x <= 53 && z >= 49.5 && z <= 52.5) ||
    (x >= 51 && x <= 55 && z >= 50.5 && z <= 52.5) ||
    (x >= 53 && x <= 55 && z >= 51.5 && z <= 54.5) ||
    (x >= 53 && x <= 57 && z >= 52.5 && z <= 54.5) ||
    (x >= 55 && x <= 57 && z >= 53.5 && z <= 56.5) ||
    (x >= 55 && x <= 59 && z >= 54.5 && z <= 56.5)
  );
}

function atWin(x, z) {
  return x >= 59 && x <= 61 && z >= 54.5;
}

function updateCubePosition(THREE, deltaTime) {
  if (isStopped) return;

  const moveDistance = gameSpeed * deltaTime;
  if (movingDir === 1) {
    cubePosition.x += moveDistance;
  } else {
    cubePosition.z += moveDistance;
  }

  // Check if on road
  if (!onRoad(cubePosition.x, cubePosition.z) && !hasWon) {
    isStopped = true;
    gameOver();
    display("Exited road. Press W to reset.");
    stopMusic();
    return;
  }

  // Check if at win condition
  if (atWin(cubePosition.x, cubePosition.z) && !hasWon) {
    hasWon = true;
    isStopped = true;
    levelComplete();
    display("You win!");
    stopMusic();
    return;
  }

  drawCube(THREE);
}

function handleInput(event) {
  if (gameState !== 'playing') {
    if (event.code === 'KeyP') pauseGame();
    if (event.code === 'Escape') startMenuState();
    if (event.code === 'KeyW' && isStopped) resetGame();
    return;
  }

  if (event.code === 'KeyA') {
    event.preventDefault();
    movingDir = 1;
    display("Moving along X-axis");
  } else if (event.code === 'KeyD') {
    event.preventDefault();
    movingDir = 2;
    display("Moving along Z-axis");
  } else if (event.code === 'KeyP') {
    pauseGame();
  } else if (event.code === 'Escape') {
    startMenuState();
  } else if (event.code === 'KeyW' && isStopped) {
    resetGame();
  }
}

function resetGame() {
  cubePosition = { x: 0, y: 0, z: 0 };
  movingDir = 1;
  isStopped = false;
  hasWon = false;
  score = 0;
  level = 1;
  cubes.forEach(cube => scene.remove(cube));
  cubes = [];
  stopMusic();
  playMusic();
  updateScore();
  drawCube(THREE);
  display("Game reset!");
}

async function playCrownSound(soundIndex) {
  const crownSounds = [
    'https://raw.githubusercontent.com/ShiruiPENG-CHERRY/DancingLine-sample-demo/main/lib/Audioclip/crown_get_1.wav',
    'https://raw.githubusercontent.com/ShiruiPENG-CHERRY/DancingLine-sample-demo/main/lib/Audioclip/crown_get_2.wav',
    'https://raw.githubusercontent.com/ShiruiPENG-CHERRY/DancingLine-sample-demo/main/lib/Audioclip/crown_get_3.wav'
  ];
  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    const response = await fetch(crownSounds[soundIndex]);
    const arrayBuffer = await response.arrayBuffer();
    const soundBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = soundBuffer;
    source.connect(dieSoundGain);
    source.start();
  } catch (error) {
    console.error(`Error playing crown sound ${soundIndex + 1}:`, error);
  }
}

function checkDiamond(cube, THREE) {
  for (let i = 0; i < gems.length; i++) {
    const gem = gems[i];
    const distance = cube.position.distanceTo(gem.position);
    if (distance < 0.8) {
      scene.remove(gem);
      gems.splice(i, 1);
      score += 10;
      createTree(THREE, objLoader, Math.random() * 4 - 2, 0, gem.position.z);
      display("💎 Gem collected! +10 points");
      break;
    }
  }
}

function checkCrown(cube, THREE) {
  for (let i = 0; i < crowns.length; i++) {
    const crown = crowns[i];
    const distance = cube.position.distanceTo(crown.position);
    if (distance < 0.8) {
      scene.remove(crown);
      const soundIndex = crown.userData.soundIndex;
      crowns.splice(i, 1);
      score += 50;
      updateScore();
      playCrownSound(soundIndex);
      display("👑 Crown collected! +50 points");
      break;
    }
  }
}

function generateLevel(THREE, OBJLoader, MTLLoader) {
  cubes.forEach(cube => scene.remove(cube));
  gems.forEach(gem => scene.remove(gem));
  crowns.forEach(crown => scene.remove(crown));
  trees.forEach(tree => scene.remove(tree));
  platforms.forEach(platform => scene.remove(platform));
  cubes = [];
  gems = [];
  crowns = [];
  trees = [];
  treeSizes = [];
  treeCount = 0;
  collidableMeshList = [];

  createPlatforms(THREE);

  for (let i = 1; i <= 20; i++) {
    const z = i * 3;
    if (Math.random() > 0.5) {
      createGem(THREE, Math.random() * 4 - 2, 0.5, z);
    }
  }

  createCrown(THREE, objLoader, 60, 0.5, 55, 0);
  cubePosition = { x: 0, y: 0, z: 0 };
  movingDir = 1;
  isStopped = false;
  hasWon = false;
  drawCube(THREE);
}

/* ---------------------------------------------------------------
    🎮  Game Control Functions
---------------------------------------------------------------- */
async function startGame() {
  gameState = 'playing';
  menuElement.style.display = 'none';
  isStopped = false;
  hasWon = false;
  score = 0;
  level = 1;
  cubePosition = { x: 0, y: 0, z: 0 };
  movingDir = 1; // Start moving along X-axis
  cubes.forEach(cube => scene.remove(cube));
  cubes = [];
  updateScore();
  drawCube(THREE);

  // Stop any existing music and load/play game music
  stopMusic();
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  await loadBackgroundMusic();
  playMusic();

  display("Game started! Use A to move along X-axis, D to move along Z-axis.");
}

function gameOver() {
  gameState = 'gameOver';
  playDieSound();
  stopMusic();
  display("💀 GAME OVER! Final Score: " + score);
  setTimeout(() => {
    menuElement.style.display = 'block';
    menuElement.querySelector('h1').textContent = 'GAME OVER';
    menuElement.querySelector('p').textContent = 'Final Score: ' + score;
    startMenuState();
  }, 2000);
}
  function levelComplete() {
    gameState = 'success';
    display("🎉 LEVEL " + level + " COMPLETED! Score: " + score);
    showSuccessModal();
  }
  
function pauseGame() {
    if (gameState === 'playing') {
      gameState = 'paused';
      display("⏸️ GAME PAUSED - Press P to resume");
    } else if (gameState === 'paused') {
      gameState = 'playing';
      display("▶️ GAME RESUMED");
    }
  }
  
function updateScore() {
  scoreElement.innerHTML = `Score: ${score}<br>Level: ${level}`;
}
/* ---------------------------------------------------------------
    Game Physics & Collision Detection
  ---------------------------------------------------------------- */
  function updateGameLogic() {
    if (gameState !== 'playing') return;

    // 自动推进
    if (currentPathIndex < pathPoints.length - 1) {
      if (!allowTurn) {
        // 检查是否到达转折点
        if (turnPoints.includes(currentPathIndex)) {
          allowTurn = true;
          return; // 等待玩家按空格
        }
        // 自动前进到下一个点
        cubePosition = { x: pathPoints[currentPathIndex].x, y: pathPoints[currentPathIndex].y, z: pathPoints[currentPathIndex].z };
        drawCube(THREE);
        currentPathIndex++;
      } else if (playerHasTurned) {
        // 玩家已转向，继续前进
        allowTurn = false;
        playerHasTurned = false;
        cubePosition = { x: pathPoints[currentPathIndex].x, y: pathPoints[currentPathIndex].y, z: pathPoints[currentPathIndex].z };
        drawCube(THREE);
        currentPathIndex++;
      }
    }
    // 检查碰撞、掉落等
    const latestCube = cubes[cubes.length - 1];
    if (!latestCube) return;
    if (latestCube.position.y < -5) {
      moveDir = 3;
      gameOver();
    }
    if (currentPathIndex >= pathPoints.length - 1) {
      level++;
      score += 100;
      gameSpeed += 0.01;
      updateScore();
      generateLevel(THREE, objLoader, null);
      levelComplete();
    }
    gems.forEach(gem => {
      gem.rotation.y += 0.05;
      gem.position.y += Math.sin(Date.now() * 0.001 + gem.position.x) * 0.01;
    });
  }
  
/* ---------------------------------------------------------------
    🎮  Input Controls
---------------------------------------------------------------- */
function setupControls() {
  // Remove any existing keydown listeners to prevent duplicates
  document.removeEventListener('keydown', handleInput);
  // Add keydown listener for game controls
  document.addEventListener('keydown', handleInput, { capture: true });
  // Ensure the game container is focused to receive inputs
  gameContainer.tabIndex = 0;
  gameContainer.focus();
  // Add click handler to ensure focus on game start
  gameContainer.addEventListener('click', () => {
    gameContainer.focus();
    if (gameState === 'menu') {
      display("Click 'START GAME' or press instructions to begin!");
    }
  });
}
/* ---------------------------------------------------------------
    🎮  Menu State
---------------------------------------------------------------- */
function startMenuState() {
  gameState = 'menu';
  menuElement.style.display = 'block';
  menuElement.querySelector('h1').textContent = 'DANCING LINE';
  menuElement.querySelector('p').textContent = '3D Edition - Source Academy';
  stopMusic();
}

/* ---------------------------------------------------------------
    🖼️  Window Resize Handler
---------------------------------------------------------------- */
function onWindowResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;

  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* ---------------------------------------------------------------
    🎥  Main Animation Loop
---------------------------------------------------------------- */

function animate() {
  requestAnimationFrame(animate);
  if (gameState === 'playing' && !isStopped) {
    const deltaTime = 1 / 60; // Assume 60 FPS for consistent movement
    updateCubePosition(THREE, deltaTime);
    changeTree();
  }
  renderer.render(scene, camera);
}

/* ---------------------------------------------------------------
    🌟  Public API for Source Academy
---------------------------------------------------------------- */
function dancing_line_3d() {
  display("🎮 Loading Dancing Line 3D...");
  return "Dancing Line 3D initialization started!";
}

function start_dancing_line() {
  if (gameState === 'menu') {
    startGame();
  } else {
    display("Game is already running!");
  }
}

function close_game() {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
    display("🎮 Dancing Line 3D closed");
  }
  return "Game closed";
}

/* ---------------------------------------------------------------
    📜  Auto-start message
---------------------------------------------------------------- */
display("🎮 Dancing Line 3D loaded successfully!");
display("Commands:");
display("• dancing_line_3d() - Show game info");
display("• start_dancing_line() - Start game");
display("• close_game() - Close the game");
display("");
display("🎯 The game will load automatically with full 3D graphics!");

dancing_line_3d();