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
    window.objLoader = new OBJLoader(); // Global instance

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
let cubePosition = { x: 0.5, y: 0, z: 0 };
let moveDir = 0; // 0: forward (z+), 1: right (x+), 3: game over, 4: win
let oldPos = 0;
let gameSpeed = 0.05;
let cameraDistance = 10;
// 新增：cube line逻辑相关
let distanceMoved = 0;
// 新增：方向向量
let currentDirection = null;
// 新增：cube大小
let cubeSize = 1;

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

// 新增全局变量
let pathPoints = [];
let turnPoints = [];
let currentPathIndex = 0;
let currentTurnIndex = 0;
let autoMovement = true; // Toggle for automatic vs manual control
let allowTurn = false;
let playerHasTurned = false;
let pathDirection = new THREE.Vector3(0, 0, 1); // 初始方向z+
let pathStepSize = 0.5;
let pathStartPoint = null;
let currentSegmentIndex = 0;
let segmentProgress = 0;

if (typeof window.lastCubePos === 'undefined') {
  window.lastCubePos = null;
}

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
  if (musicGain) {
    musicGain.gain.setValueAtTime(musicVolume, audioContext.currentTime);
  }
  if (dieSoundGain) {
    dieSoundGain.gain.setValueAtTime(musicVolume, audioContext.currentTime);
  }
  const volumeDisplay = document.getElementById('volumeDisplay');
  if (volumeDisplay) {
    volumeDisplay.textContent = `${Math.round(volume * 100)}%`;
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
  // 初始摄像机位置绑定cube
  camera.position.set(cubePosition.x, cubePosition.y + 5, cubePosition.z + cameraDistance);
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
    pointer-events: auto;
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
      🎯 IGNITE YOUR DANCE! 🎯
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
        <p><strong style="color: #00ffff;">A/Left Arrow:</strong> Move left along X-axis.</p>
        <p><strong style="color: #00ffff;">D/Right Arrow:</strong> Move right along X-axis.</p>
        <p><strong style="color: #00ffff;">W/Up Arrow:</strong> Move forward along Z-axis.</p>
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
        <p>🔥 <strong>Keep moving!</strong> Leave a trail of cubes!</p>
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
        You've claimed the Crown!
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
  createPlatform(THREE, objLoader, 0, 0, 0, 20, 0.2, 20);
  generateLevel(THREE, objLoader, mtlLoader);
}

function findTurnPoints(points, minAngleDeg) {
  const turns = [];
  for (let i = 1; i < points.length - 1; i++) {
    const v1 = points[i].clone().sub(points[i - 1]).normalize();
    const v2 = points[i + 1].clone().sub(points[i]).normalize();
    const angle = v1.angleTo(v2) * 180 / Math.PI;
    if (angle > minAngleDeg) turns.push(i);
  }
  return turns;
}

function extractMainPathFromTerrain(terrainMesh) {
  let zToGroup = {};
  terrainMesh.traverse(child => {
    if (child.isMesh && child.geometry && child.geometry.attributes.position) {
      const pos = child.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const zKey = Math.round(z * 10) / 10; // Increased precision
        if (!zToGroup[zKey]) zToGroup[zKey] = [];
        zToGroup[zKey].push({x, y, z});
      }
    }
  });
  let pathPoints = [];
  Object.keys(zToGroup).map(Number).sort((a, b) => a - b).forEach(zKey => {
    let group = zToGroup[zKey];
    group.sort((a, b) => a.x - b.x);
    let mid = Math.floor(group.length / 2);
    let pt = group[mid];
    let maxY = Math.max(...group.map(p => p.y));
    pathPoints.push(new THREE.Vector3(pt.x, maxY + 0.5, pt.z));
  });
  return pathPoints;
}

function createPlatform(THREE, objLoader, x, y, z, width, height, depth) {
  const platformMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });

  window.objLoader.load(
    'https://raw.githubusercontent.com/ShiruiPENG-CHERRY/DancingLine-sample-demo/main/lib/Mesh/map03.obj',
    (obj) => {
      const platform = obj;
      platform.traverse((child) => {
        if (child.isMesh) {
          child.material = platformMaterial;
          child.receiveShadow = true;
        }
      });
      platform.position.set(x, y, z);
      platform.scale.set(width / 10, height / 10, depth / 10);
      scene.add(platform);
      platforms.push(platform);
      pathPoints = extractMainPathFromTerrain(platform);
      console.log('Main path point count:', pathPoints.length, pathPoints);
      if (pathPoints.length < 2) {
        alert('Not enough main path points in the terrain to generate a path!');
        return;
      }
      turnPoints = findTurnPoints(pathPoints, 10);
      currentPathIndex = 0;
      currentTurnIndex = 0;
      distanceMoved = 0;
      cubePosition = { x: pathPoints[0].x, y: pathPoints[0].y, z: pathPoints[0].z };
      currentDirection = pathPoints.length > 1
        ? pathPoints[1].clone().sub(pathPoints[0]).normalize()
        : new THREE.Vector3(0, 0, 1);
      // 摄像机初始位置绑定cube
      camera.position.set(cubePosition.x, cubePosition.y + 5, cubePosition.z + cameraDistance);
      camera.lookAt(cubePosition.x, cubePosition.y, cubePosition.z);
      generateTreesAlongPath(THREE, objLoader);
    },
    undefined,
    (err) => {
      console.error("Error loading map03.obj for platform:", err);
      const fallbackGeometry = new THREE.BoxGeometry(width, height, depth);
      const fallbackPlatform = new THREE.Mesh(fallbackGeometry, platformMaterial);
      fallbackPlatform.position.set(x, y, z);
      fallbackPlatform.receiveShadow = true;
      scene.add(fallbackPlatform);
      platforms.push(fallbackPlatform);
    }
  );
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
      const side = Math.random() > 0.5 ? 1 : -1;
      obj.position.set(side * (10 + Math.random() * 2), cubePosition.y + y + 1, cubePosition.z + z);
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
      const side = Math.random() > 0.5 ? 1 : -1;
      fallbackTree.position.set(side * (10 + Math.random() * 2), cubePosition.y + y + 1, cubePosition.z + z);
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
      const fallbackCrown = new THREE.Mesh(fallbackGeometry, cubeMaterial);
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
  const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

  // 记录上一次 cube 的位置
  if (!window.lastCubePos) {
    window.lastCubePos = { x: cubePosition.x, y: cubePosition.y, z: cubePosition.z };
  }

  // 只支持沿x或z方向的直线补轨迹
  let steps = 0;
  let maxSteps = 100; // 防止死循环
  let pos = { ...window.lastCubePos };
  const dx = cubePosition.x - window.lastCubePos.x;
  const dz = cubePosition.z - window.lastCubePos.z;
  const stepX = dx === 0 ? 0 : (dx > 0 ? cubeSize : -cubeSize);
  const stepZ = dz === 0 ? 0 : (dz > 0 ? cubeSize : -cubeSize);

  // 只支持单轴移动
  while ((pos.x !== cubePosition.x || pos.z !== cubePosition.z) && steps < maxSteps) {
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(pos.x, cubePosition.y, pos.z);
    cube.castShadow = true;
    scene.add(cube);
    cubes.push(cube);

    // 碰撞检测
    for (let obj of collidableMeshList) {
      if (cube.position.distanceTo(obj.position) < cubeSize * 0.5 + 0.05) {
        moveDir = 3;
        gameOver();
        return;
      }
    }

    // 物品检测
    checkDiamond(cube, THREE);
    checkCrown(cube, THREE);

    // 步进
    if (pos.x !== cubePosition.x) {
      pos.x += stepX;
      if ((stepX > 0 && pos.x > cubePosition.x) || (stepX < 0 && pos.x < cubePosition.x)) pos.x = cubePosition.x;
    }
    if (pos.z !== cubePosition.z) {
      pos.z += stepZ;
      if ((stepZ > 0 && pos.z > cubePosition.z) || (stepZ < 0 && pos.z < cubePosition.z)) pos.z = cubePosition.z;
    }
    steps++;
  }

  // 最终目标点也补一个
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(cubePosition.x, cubePosition.y, cubePosition.z);
  cube.castShadow = true;
  scene.add(cube);
  cubes.push(cube);

  // 控制最大cube数量
  if (cubes.length > 200) {
    const oldestCube = cubes.shift();
    scene.remove(oldestCube);
  }
  // 摄像机跟随cube
  if (camera) {
    camera.position.set(cubePosition.x, cubePosition.y + 5, cubePosition.z + cameraDistance);
    camera.lookAt(cubePosition.x, cubePosition.y, cubePosition.z);
  }
  updateCamera();

  // 更新 lastCubePos
  window.lastCubePos = { x: cubePosition.x, y: cubePosition.y, z: cubePosition.z };
}

function updateCubePositionAlongPath() {
  if (!pathPoints || pathPoints.length < 2) {
    console.warn("No path points available");
    return;
  }

  if (!allowTurn) {
    // Continuous movement along current direction
    const moveDistance = gameSpeed;
    distanceMoved += moveDistance;
    cubePosition.x += currentDirection.x * moveDistance;
    cubePosition.y = pathPoints[currentPathIndex].y; // Follow path height
    cubePosition.z += currentDirection.z * moveDistance;

    // Check if we've reached or passed the next path point
    if (currentPathIndex < pathPoints.length - 1) {
      const nextPoint = pathPoints[currentPathIndex + 1];
      const distanceToNext = new THREE.Vector3(cubePosition.x, 0, cubePosition.z)
        .distanceTo(new THREE.Vector3(nextPoint.x, 0, nextPoint.z));
      if (distanceMoved >= pathPoints[currentPathIndex].distanceTo(pathPoints[currentPathIndex + 1]) || distanceToNext < pathStepSize) {
        currentPathIndex++;
        distanceMoved = 0;
        checkForTurn();
      }
    } else if (cubePosition.z > pathPoints[pathPoints.length - 1].z) {
      levelComplete();
    }

    // Boundary and collision check
    if (cubePosition.x < -10 || cubePosition.x > 10 || cubePosition.z > 20 || cubePosition.z < -50 || cubePosition.y < -5) {
      moveDir = 3;
      gameOver();
      return;
    }

    // Check collision with trees
    const latestCube = cubes[cubes.length - 1];
    if (latestCube) {
      for (let tree of collidableMeshList) {
        const distance = latestCube.position.distanceTo(tree.position);
        if (distance < 0.5) {
          moveDir = 3;
          gameOver();
          return;
        }
      }
    }

    // Draw cube at new position
    if (distanceMoved >= pathStepSize) {
      drawCube(THREE);
      distanceMoved = 0; // Reset to place next cube after step size
    }
  }
}

function checkForTurn() {
  if (currentTurnIndex < turnPoints.length && currentPathIndex >= turnPoints[currentTurnIndex]) {
    allowTurn = true;
    playerHasTurned = false;
    display("Press SPACE to turn!");
  }
}

function updateCamera() {
  const targetCameraX = cubePosition.x;
  const targetCameraY = cubePosition.y + 5;
  const targetCameraZ = cubePosition.z + cameraDistance;
  const lerpFactor = 0.1;
  camera.position.x = lerp(camera.position.x, targetCameraX, lerpFactor);
  camera.position.y = lerp(camera.position.y, targetCameraY, lerpFactor);
  camera.position.z = lerp(camera.position.z, targetCameraZ, lerpFactor);
  camera.lookAt(cubePosition.x, cubePosition.y, cubePosition.z);
}

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function handleInput(event) {
  if (gameState !== 'playing') {
    if (event.code === 'KeyP') pauseGame();
    if (event.code === 'Escape') startMenuState();
    return;
  }

  if (event.code === 'Space' && allowTurn) {
    event.preventDefault();
    if (currentPathIndex < pathPoints.length - 1) {
      const nextDirection = pathPoints[currentPathIndex + 1].clone().sub(pathPoints[currentPathIndex]).normalize();
      currentDirection = nextDirection;
      allowTurn = false;
      playerHasTurned = true;
      currentTurnIndex++;
      cubePosition = { x: pathPoints[currentPathIndex].x, y: pathPoints[currentPathIndex].y, z: pathPoints[currentPathIndex].z };
      drawCube(THREE);
      currentPathIndex++;
      distanceMoved = 0;
      display("Turn successful!");
    }
  } else if (event.code === 'Space' && !allowTurn) {
    moveDir = 3;
    gameOver();
    display("Wrong time to turn!");
  }

  if (event.code === 'KeyP') pauseGame();
  if (event.code === 'Escape') startMenuState();
}

function resetPathFollowing() {
  currentPathIndex = 0;
  currentTurnIndex = 0;
  distanceMoved = 0;
  allowTurn = false;
  playerHasTurned = false;
  currentDirection = pathPoints.length > 1
    ? pathPoints[1].clone().sub(pathPoints[0]).normalize()
    : new THREE.Vector3(0, 0, 1);
  // 摄像机重置跟随cube
  if (camera) {
    camera.position.set(cubePosition.x, cubePosition.y + 5, cubePosition.z + cameraDistance);
    camera.lookAt(cubePosition.x, cubePosition.y, cubePosition.z);
  }
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
      createTree(THREE, objLoader, Math.random() * 4 - 2, 0, gem.position.z - cubePosition.z);
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
      if (crowns.length === 0) {
        levelComplete();
      }
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

  cubePosition = { x: 0.5, y: 0, z: 0 };
  moveDir = 0;
  oldPos = 0;

  createPlatform(THREE, OBJLoader, 0, 0, 0, 20, 0.2, 20);

  for (let i = 1; i <= 20; i++) {
    const z = i * 3;
    if (Math.random() > 0.5) {
      createGem(THREE, Math.random() * 4 - 2, 0.5, z);
    }
  }

  createCrown(THREE, Math.random() * 4 - 2, 0.5, 0, 20);
  createCrown(THREE, Math.random() * 4 - 2, 0.5, 0, 40);
  createCrown(THREE, Math.random() * 4 - 2, 0.5, 0, 60);
  resetPathFollowing();
}

/* ---------------------------------------------------------------
    🎮  Game Control Functions
---------------------------------------------------------------- */
function startGame() {
  gameState = 'playing';
  menuElement.style.display = 'none';
  score = 0;
  level = 1;
  cubePosition = { x: 0.5, y: 0, z: 0 };
  moveDir = 0;
  oldPos = 0;
  stopMusic();
  playMusic();
  updateScore();
  generateLevel(THREE, null, null);
  display("🎮 Game started! Use A/D/W or Arrow keys to move!");
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
  document.addEventListener('keydown', handleInput);
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
  if (gameState === 'playing') {
    changeTree();
    updateGameLogic();
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
