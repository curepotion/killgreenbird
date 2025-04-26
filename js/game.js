// Game initialization
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game variables
const birds = [];
const bullets = [];
const particles = [];
const explosions = [];
const blueMen = []; // Array to store blue muscular men
const gravity = 0.5;
let autoFire = false;

// Set initial game state
window.gameState = 'playing';

// Track permanent blood splatters on ground
window.permanentBloodSplatters = [];

// Weapon selection system (replaces upgrade system)
const weaponSystem = {
  currentWeapon: 1,
  weaponNames: ["小刀", "手槍", "機關槍", "飛彈", "巨型鐵球", "變身藥劑"],
  
  setWeapon: function(weaponNumber) {
    if (weaponNumber >= 1 && weaponNumber <= 6) {
      this.currentWeapon = weaponNumber;
      this.updateWeaponDisplay();
    }
  },
  
  updateWeaponDisplay: function() {
    const weaponMessage = "目前武器: " + this.weaponNames[this.currentWeapon - 1];
    document.getElementById("weaponDisplay").innerText = weaponMessage;
  },
  
  // Track bird kills for statistics only, not for upgrades
  birdsKilled: 0,
  
  addKill: function() {
    this.birdsKilled++;
  }
};

// Expose weaponSystem to the global scope
window.weaponSystem = weaponSystem;

// Game difficulty settings
const gameDifficulty = {
  maxBirds: Infinity, // No limit on maximum birds
  birdSpawnRate: 0.16667,  // 0.5 / 3 = 0.16667 seconds between spawns (3x faster)
  lastBirdSpawn: 0,
};

// Character variables
const character = {
  x: canvas.width / 2,
  y: 50, // Position at top
  width: 40,
  height: 60,
  gunLength: 30,
  gunWidth: 8,
  aimAngle: 0 // Angle to aim the gun
};

// Mouse position tracking
const mouse = {
  x: canvas.width / 2,
  y: canvas.height / 2
};

// Game functions
function spawnBird() {
  const size = 18 + Math.random() * 30;
  
  // Determine if this bird will have a speech bubble (1 in 4 chance)
  const hasSpeech = Math.random() < 0.25;
  
  // Select a random speech phrase if the bird has speech
  let speechText = '';
  if (hasSpeech) {
    const phrases = [
      "清徳宗萬歲 !!!",
      "肅清國民黨 !!!",
      "我才不要台積電 !!!",
      "美國把拔我愛你!!",
      "中共同路人 !!!",
      "戰爭算什麼? 反正死的不是我! 哈哈哈哈!!",
      "我們的共諜要好好保護阿!! 20萬交保即可",
      "白蓮教去死!!",
      "我要戰爭!! 反正死的不是我! 哈哈哈哈!!",
      "法西斯主義萬歲 !!!"
    ];
    speechText = phrases[Math.floor(Math.random() * phrases.length)];
  }
  
  birds.push({
    x: Math.random() * (canvas.width - size),
    y: canvas.height - size,
    width: size,
    height: size,
    vy: -Math.random() * 8 - 5,
    jumpCooldown: 0,
    hp: 2, // Changed to 2 so birds explode after 2 hits
    hitCount: 0, // Track hits for explosion logic
    bloodMarks: [],
    hasSpeech: hasSpeech,
    speechText: speechText,
    speechTimer: 200 + Math.floor(Math.random() * 300), // How long the speech bubble stays visible
    speechVisible: true,
    speechToggleTime: 0 // For blinking speech bubbles
  });
}

function createExplosion(x, y, radius) {
  // Flag to reduce particle creation during explosions
  window.explosionInProgress = true;
  
  // Set a timer to clear the flag after a short delay
  setTimeout(() => {
    window.explosionInProgress = false;
  }, 100);
  
  explosions.push({
    x: x,
    y: y,
    radius: 10,
    maxRadius: radius,
    growSpeed: 5,
    alpha: 1,
    damage: 20
  });
}

function fireWeapon(targetX, targetY) {
  // Calculate angle between character gun position and target
  const gunPosX = character.x;
  const gunPosY = character.y + character.height / 3;
  const angle = Math.atan2(targetY - gunPosY, targetX - gunPosX);
  
  // Starting position at the end of gun barrel
  const startX = gunPosX + Math.cos(angle) * character.gunLength;
  const startY = gunPosY + Math.sin(angle) * character.gunLength;
  
  // Different weapon behaviors based on selected weapon
  switch(weaponSystem.currentWeapon) {
    case 1: // Basic bullets
      bullets.push({
        x: startX,
        y: startY,
        width: 4,
        height: 4,
        speed: 12,
        angle: angle,
        type: 'bullet'
      });
      break;
      
    case 2: // Missile that explodes on impact
      bullets.push({
        x: startX,
        y: startY,
        width: 8,
        height: 12,
        speed: 8,
        angle: angle,
        type: 'missile',
        explosionRadius: 80
      });
      break;
      
    case 3: // Multiple missiles
      for (let i = -1; i <= 1; i++) {
        const spreadAngle = angle + (i * 0.1);
        bullets.push({
          x: startX,
          y: startY,
          width: 10,
          height: 14,
          speed: 7,
          angle: spreadAngle,
          type: 'missile',
          explosionRadius: 100
        });
      }
      break;
      
    case 4: // Flying knives
      // Create 3 spinning knives
      for (let i = -1; i <= 1; i++) {
        const spreadAngle = angle + (i * 0.15);
        bullets.push({
          x: startX,
          y: startY,
          width: 20,
          height: 5,
          speed: 15,
          angle: spreadAngle,
          type: 'knife',
          rotation: 0,
          rotationSpeed: 0.5 + Math.random() * 0.3,
          piercing: true, // Knives can go through multiple birds
          hitCount: 0,
          maxHits: 3 // Each knife can hit up to 3 birds
        });
      }
      break;
      
    case 5: // Giant Iron Ball - Updated physics
      bullets.push({
        x: startX,
        y: startY,
        width: 60, // Large ball
        height: 60,
        speed: 8,
        angle: angle,
        type: 'ironball',
        rotation: 0,
        rotationSpeed: 0.05 + Math.random() * 0.05,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        gravity: 0.4,
        bounceCount: 0,
        maxBounces: 4,
        bounceStrength: 0.75, // Bounce at 75% of the previous velocity
        damaged: false, // Ball gets damaged with each bounce
        damageStage: 0, // Increases with each bounce (visual effect)
        shatterWaveRadius: 0,
        maxShatterRadius: 200,
        shatterWaveActive: false,
        shatterSpeed: 10,
        damageRadius: 180
      });
      break;
      
    case 6: // Transformation serum
      bullets.push({
        x: startX,
        y: startY,
        width: 10,
        height: 15,
        speed: 10,
        angle: angle,
        type: 'serum',
        rotation: 0,
        rotationSpeed: 0.1,
        effects: {
          glow: true,
          trail: true,
          trailColor: '#3498db', // Blue trail
          pulseRate: 0.05
        }
      });
      break;
  }
}

function drawCharacter() {
  // Center the character at top
  character.x = canvas.width / 2;
  
  // Body
  ctx.fillStyle = '#3366cc';
  ctx.fillRect(character.x - character.width / 2, character.y, character.width, character.height);
  
  // Head
  ctx.fillStyle = '#ffcc99';
  ctx.beginPath();
  ctx.arc(character.x, character.y - 5, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // Calculate gun angle based on mouse position
  const gunPosX = character.x;
  const gunPosY = character.y + character.height / 3;
  character.aimAngle = Math.atan2(mouse.y - gunPosY, mouse.x - gunPosX);
  
  // Draw different weapons based on level
  ctx.save();
  ctx.translate(gunPosX, gunPosY);
  ctx.rotate(character.aimAngle);
  
  switch(weaponSystem.currentWeapon) {
    case 1: // Machine gun
      ctx.fillStyle = '#333';
      ctx.fillRect(0, -character.gunWidth / 2, character.gunLength, character.gunWidth);
      break;
      
    case 2: // Missile launcher - level 2
      ctx.fillStyle = '#444';
      ctx.fillRect(0, -character.gunWidth * 1.5, character.gunLength, character.gunWidth * 3);
      // Missile end cap
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(character.gunLength, 0, character.gunWidth * 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 3: // Advanced Missile launcher - level 3
      ctx.fillStyle = '#660000';
      ctx.fillRect(0, -character.gunWidth * 2, character.gunLength, character.gunWidth * 4);
      // Triple barrel
      ctx.fillStyle = 'black';
      ctx.fillRect(character.gunLength - 5, -character.gunWidth * 1.8, 10, character.gunWidth * 1.2);
      ctx.fillRect(character.gunLength - 5, -character.gunWidth * 0.6, 10, character.gunWidth * 1.2);
      ctx.fillRect(character.gunLength - 5, character.gunWidth * 0.6, 10, character.gunWidth * 1.2);
      break;
      
    case 4: // Knife thrower
      ctx.fillStyle = '#222222';
      ctx.fillRect(0, -character.gunWidth, character.gunLength * 0.7, character.gunWidth * 2);
      
      // Knife magazine/holder
      ctx.fillStyle = '#555555';
      ctx.beginPath();
      ctx.rect(character.gunLength * 0.7, -character.gunWidth * 1.5, character.gunWidth * 3, character.gunWidth * 3);
      ctx.fill();
      
      // Knife tips visible in the holder
      ctx.fillStyle = 'silver';
      ctx.beginPath();
      ctx.moveTo(character.gunLength * 0.7 + character.gunWidth * 3, -character.gunWidth);
      ctx.lineTo(character.gunLength * 0.7 + character.gunWidth * 3 + 10, 0);
      ctx.lineTo(character.gunLength * 0.7 + character.gunWidth * 3, character.gunWidth);
      ctx.fill();
      break;
  }
  
  ctx.restore();
}

function spawnJuice(x, y) {
  const amount = 60 + Math.floor(Math.random() * 40);
  for (let i = 0; i < amount; i++) {
    const size = 2 + Math.random() * 4;
    particles.push({
      x: x,
      y: y,
      size,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 40 + Math.random() * 40
    });
  }
}

// Drawing functions
function drawBird(b) {
  const { x, y, width: w, height: h } = b;
  
  // Draw the bird
  ctx.fillStyle = 'limegreen';
  ctx.fillRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.6);
  ctx.fillStyle = 'green';
  ctx.fillRect(x + w * 0.05, y + h * 0.4, w * 0.2, h * 0.2);
  ctx.fillRect(x + w * 0.75, y + h * 0.4, w * 0.2, h * 0.2);
  ctx.fillStyle = 'black';
  ctx.fillRect(x + w * 0.35, y + h * 0.35, 2, 2);
  ctx.fillStyle = 'gold';
  ctx.fillRect(x + w * 0.55, y + h * 0.45, 3, 2);
  
  // Draw blood marks
  for (let mark of b.bloodMarks) {
    ctx.fillStyle = 'darkred';
    ctx.fillRect(x + mark.x * w, y + mark.y * h, mark.size, mark.size);
  }
  
  // Draw speech bubble if this bird has one and it's visible
  if (b.hasSpeech && b.speechVisible && b.speechTimer > 0) {
    drawSpeechBubble(b, x, y, w, h);
  }
  
  // Update speech timer and toggle visibility for blinking effect
  if (b.hasSpeech) {
    b.speechTimer--;
    
    // Make speech bubble blink every 40 frames
    if (Date.now() - b.speechToggleTime > 2000) {
      b.speechVisible = !b.speechVisible;
      b.speechToggleTime = Date.now();
    }
    
    // Reset speech timer occasionally to make it reappear
    if (b.speechTimer <= 0 && Math.random() < 0.01) {
      b.speechTimer = 200 + Math.floor(Math.random() * 300);
    }
  }
}

function drawBullet(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  
  if (b.type === 'knife') {
    // For knives, we apply an additional rotation effect for spinning
    ctx.rotate(b.angle + b.rotation);
    b.rotation += b.rotationSpeed;
    
    // Draw knife blade
    ctx.fillStyle = 'silver';
    ctx.beginPath();
    ctx.moveTo(b.width, 0);
    ctx.lineTo(0, b.height);
    ctx.lineTo(-b.width * 0.3, 0);
    ctx.lineTo(0, -b.height);
    ctx.closePath();
    ctx.fill();
    
    // Draw knife handle
    ctx.fillStyle = 'saddlebrown';
    ctx.fillRect(-b.width * 0.3, -b.height * 0.6, -b.width * 0.5, b.height * 1.2);
  } else if (b.type === 'ironball') {
    // Draw giant iron ball with metallic effect
    ctx.rotate(b.rotation || 0);
    const radius = b.width / 2;
    
    // Create metallic gradient
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    
    // Change gradient based on damage level
    if (b.damageStage >= 3) {
      // Heavily damaged
      gradient.addColorStop(0, '#999999');
      gradient.addColorStop(0.5, '#777777');
      gradient.addColorStop(0.8, '#333333');
      gradient.addColorStop(1, '#111111');
    } else if (b.damageStage >= 2) {
      // Moderately damaged
      gradient.addColorStop(0, '#AAAAAA');
      gradient.addColorStop(0.5, '#888888');
      gradient.addColorStop(0.8, '#444444');
      gradient.addColorStop(1, '#222222');
    } else if (b.damageStage >= 1) {
      // Slightly damaged
      gradient.addColorStop(0, '#BBBBBB');
      gradient.addColorStop(0.5, '#888888');
      gradient.addColorStop(0.8, '#444444');
      gradient.addColorStop(1, '#222222');
    } else {
      // Not damaged
      gradient.addColorStop(0, '#CCCCCC');
      gradient.addColorStop(0.5, '#888888');
      gradient.addColorStop(0.8, '#444444');
      gradient.addColorStop(1, '#222222');
    }
    
    // Draw the main ball
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add metallic highlights
    if (b.damageStage < 3) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add some texture - spikes or studs
    const spikes = 12;
    const spikeLength = radius * 0.2;
    ctx.fillStyle = '#333';
    
    for (let i = 0; i < spikes; i++) {
      // Skip some spikes based on damage stage (they break off)
      if (b.damageStage >= 1 && i % 4 === 0) continue;
      if (b.damageStage >= 2 && i % 3 === 0) continue;
      if (b.damageStage >= 3 && i % 2 === 0) continue;
      
      const angle = (i / spikes) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(x, y, spikeLength, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add cracks based on damage stage
    if (b.damageStage >= 1) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      
      // First crack
      ctx.beginPath();
      ctx.moveTo(-radius * 0.3, -radius * 0.7);
      ctx.lineTo(radius * 0.1, -radius * 0.2);
      ctx.stroke();
    }
    
    if (b.damageStage >= 2) {
      // Second crack
      ctx.beginPath();
      ctx.moveTo(radius * 0.5, radius * 0.2);
      ctx.lineTo(-radius * 0.2, radius * 0.5);
      ctx.stroke();
    }
    
    if (b.damageStage >= 3) {
      // Third crack - more severe
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.6, -radius * 0.3);
      ctx.lineTo(radius * 0.7, radius * 0.6);
      ctx.stroke();
      
      // Fourth crack
      ctx.beginPath();
      ctx.moveTo(-radius * 0.5, radius * 0.5);
      ctx.lineTo(radius * 0.3, -radius * 0.4);
      ctx.stroke();
    }
  } else if (b.type === 'serum') {
    // Transformation serum syringe
    ctx.rotate(b.angle + b.rotation);
    b.rotation += b.rotationSpeed;
    
    // Glowing effect
    if (b.effects && b.effects.glow) {
      const glowRadius = 10 + Math.sin(Date.now() * b.effects.pulseRate) * 3;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
      glow.addColorStop(0, 'rgba(52, 152, 219, 0.8)');
      glow.addColorStop(1, 'rgba(52, 152, 219, 0)');
      
      ctx.fillStyle = glow;
      ctx.fillRect(-glowRadius, -glowRadius, glowRadius*2, glowRadius*2);
    }
    
    // Syringe body
    ctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
    ctx.fillRect(-b.width/2, -b.height/2, b.width, b.height);
    
    // Syringe content (blue liquid)
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-b.width/3, -b.height/2, b.width*0.6, b.height*0.7);
    
    // Syringe needle
    ctx.fillStyle = 'silver';
    ctx.fillRect(b.width/2, -b.height/8, b.width*0.4, b.height/4);
    
    // Syringe plunger
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(-b.width/2, -b.height/4, -b.width*0.2, b.height/2);
    
    // Draw trail particles if moving
    if (b.effects && b.effects.trail) {
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: b.x - Math.cos(b.angle) * (5 + Math.random() * 10),
          y: b.y - Math.sin(b.angle) * (5 + Math.random() * 10),
          size: 2 + Math.random() * 3,
          vx: (Math.random() - 0.5) * 1,
          vy: (Math.random() - 0.5) * 1,
          life: 10 + Math.random() * 15,
          color: b.effects.trailColor || '#3498db',
          alpha: 0.7,
          fadeSpeed: 0.05
        });
      }
    }
  } else if (b.type === 'bullet') {
    // Basic bullet
    ctx.rotate(b.angle);
    ctx.fillStyle = 'yellow';
    ctx.fillRect(0, -b.height/2, b.width*2, b.height);
  } else if (b.type === 'missile') {
    // Missile
    ctx.rotate(b.angle);
    ctx.fillStyle = '#333';
    ctx.fillRect(0, -b.height/2, b.width*2, b.height);
    
    // Missile head
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(b.width*2, 0);
    ctx.lineTo(b.width*2 - 5, -b.height/2);
    ctx.lineTo(b.width*2 - 5, b.height/2);
    ctx.fill();
    
    // Missile trail - random flame effect
    ctx.fillStyle = 'orange';
    const flameLength = Math.random() * 10 + 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-flameLength, -b.height/3);
    ctx.lineTo(-flameLength/2, 0);
    ctx.lineTo(-flameLength, b.height/3);
    ctx.fill();
  }
  
  ctx.restore();
}

function drawExplosion(e) {
  // Draw explosion as a gradient circle
  const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
  gradient.addColorStop(0, `rgba(255, 255, 0, ${e.alpha})`);
  gradient.addColorStop(0.3, `rgba(255, 120, 0, ${e.alpha})`);
  gradient.addColorStop(1, `rgba(255, 0, 0, ${e.alpha * 0.5})`);
  
  ctx.beginPath();
  ctx.fillStyle = gradient;
  ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawWeaponSelection() {
  // Draw weapon selection UI at top right
  const padding = 10;
  const titleHeight = 30;
  const spacing = 5;
  const buttonHeight = 40;
  const buttonWidth = 150;
  
  const startX = canvas.width - buttonWidth - padding;
  const startY = padding;
  
  // Store button positions for click detection
  if (!window.weaponButtons) {
    window.weaponButtons = [];
    } else {
    window.weaponButtons.length = 0;
  }
  
  // Draw title: "想怎麼殺?"
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(startX, startY, buttonWidth, titleHeight);
  
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('想怎麼殺?', startX + buttonWidth/2, startY + titleHeight/2);
  
  // Draw weapon buttons - updated to show 6 weapons instead of 5
  for (let i = 0; i < 6; i++) {
    const weaponNum = i + 1;
    const isSelected = weaponSystem.currentWeapon === weaponNum;
    
    const buttonY = startY + titleHeight + spacing + i * (buttonHeight + spacing);
    
    // Store button position for click detection
    window.weaponButtons.push({
      x: startX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      weapon: weaponNum
    });
    
    // Button background
    ctx.fillStyle = isSelected ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(startX, buttonY, buttonWidth, buttonHeight);
    
    // Button border
    ctx.strokeStyle = isSelected ? '#ffcc00' : '#666';
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.strokeRect(startX, buttonY, buttonWidth, buttonHeight);
    
    // Button text
    ctx.fillStyle = isSelected ? '#ffffff' : '#cccccc';
    ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
    
    // Number + weapon name
    ctx.textAlign = 'left';
    ctx.fillText(`${weaponNum}. ${weaponSystem.weaponNames[i]}`, startX + 15, buttonY + buttonHeight/2);
  }
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function isInExplosionRadius(explosion, target) {
  const dx = explosion.x - (target.x + target.width/2);
  const dy = explosion.y - (target.y + target.height/2);
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance < explosion.radius;
}

// Event listeners
// Track mouse movement for aiming
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

// Fire on click
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Check if clicking on a weapon button
  if (window.weaponButtons) {
    for (const button of window.weaponButtons) {
      if (mouseX >= button.x && mouseX <= button.x + button.width &&
          mouseY >= button.y && mouseY <= button.y + button.height) {
        weaponSystem.setWeapon(button.weapon);
        return; // Don't fire if clicked on a button
      }
    }
  }
  
  // Otherwise fire weapon
  fireWeapon(mouseX, mouseY);
});

// Keyboard controls for weapon selection
document.addEventListener('keydown', (e) => {
  // 1-6 keys for weapon selection - updated to include 6
  if (e.key >= '1' && e.key <= '6') {
    weaponSystem.setWeapon(parseInt(e.key));
  }
});

// Change weapon function for UI buttons
function changeWeapon(weaponNum) {
  weaponSystem.setWeapon(weaponNum);
}

// Game loop
function update() {
  try {
  const now = Date.now();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Make sure critical arrays are initialized
    if (!window.birdParts) window.birdParts = [];
    if (!window.permanentBloodSplatters) window.permanentBloodSplatters = [];
    
    // Draw in the correct order:
    // 1. Permanent blood splatters (on ground)
    drawPermanentBloodSplatters();
    
    // 2. Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      let explosion = explosions[i];
      
      // Grow explosion
      if (explosion.radius < explosion.maxRadius) {
        explosion.radius += explosion.growSpeed;
      } else {
        // Fade out
        explosion.alpha -= 0.05;
        if (explosion.alpha <= 0) {
          explosions.splice(i, 1);
          continue;
        }
      }
      
      drawExplosion(explosion);
      
      // Area damage to birds
      for (let j = birds.length - 1; j >= 0; j--) {
        let bird = birds[j];
        if (isInExplosionRadius(explosion, bird)) {
          bird.hp -= 1;
          if (bird.hp <= 0) {
            spawnJuice(bird.x + bird.width / 2, bird.y + bird.height / 2);
            // Create dismembered parts when killed by explosion
            createBirdParts(bird.x + bird.width/2, bird.y + bird.height/2, bird.width);
            
            // Add blood effect and splatters
            createStandardizedBloodEffect(bird.x + bird.width/2, bird.y + bird.height/2, bird.width, 6);
            
            // Add blood directly on ground
            for (let i = 0; i < 3; i++) {
              addPermanentBloodSplatter(
                bird.x + (Math.random() - 0.5) * bird.width * 2, 
                canvas.height, // Explicitly use canvas.height to ensure it's on the ground
                bird.width * (0.2 + Math.random() * 0.4)
              );
            }
            
            birds.splice(j, 1);
            weaponSystem.addKill();
          }
        }
      }
    }
    
    // 3. Update bird parts (they should be below birds but above ground)
    updateBirdParts();
    
    // 4. Update particles (blood, etc.)
    updateParticles();
    
    // 5. Update birds
  for (let b of birds) {
    b.vy += gravity;
    b.y += b.vy;
    if (b.y >= canvas.height - b.height) {
      b.y = canvas.height - b.height;
      if (b.jumpCooldown <= 0) {
        b.vy = -Math.random() * 12;
        b.jumpCooldown = 60;
      } else {
        b.jumpCooldown--;
      }
    }
    b.x += Math.sin(Date.now() * 0.002 + b.y) * 1.5;
    b.x = Math.max(0, Math.min(canvas.width - b.width, b.x));
    drawBird(b);
  }

    // 5.5 Update blue muscular men
    updateBlueMen();
    
    // 6. Spawn new birds
    if (now - gameDifficulty.lastBirdSpawn > gameDifficulty.birdSpawnRate * 1000) {
      // Remove the conditional check for maximum birds
      spawnBird();
      gameDifficulty.lastBirdSpawn = now;
    }
    
    // 7. Update bullets and check collisions
  for (let i = bullets.length - 1; i >= 0; i--) {
    let blt = bullets[i];
      
      // Special handling for ironball - completely different physics
      if (blt.type === 'ironball') {
        // Apply gravity and update position
        blt.vy += blt.gravity;
        blt.x += blt.vx;
        blt.y += blt.vy;
        
        // Apply rotation
        blt.rotation = (blt.rotation || 0) + (blt.rotationSpeed || 0);
        
        // Handle wall bounces
        if (blt.x < blt.width/2) {
          blt.x = blt.width/2;
          blt.vx = -blt.vx * blt.bounceStrength;
          blt.bounceCount++;
          blt.damageStage = Math.min(3, blt.bounceCount);
        } else if (blt.x > canvas.width - blt.width/2) {
          blt.x = canvas.width - blt.width/2;
          blt.vx = -blt.vx * blt.bounceStrength;
          blt.bounceCount++;
          blt.damageStage = Math.min(3, blt.bounceCount);
        }
        
        // Handle ground bounce
        if (blt.y > canvas.height - blt.height/2) {
          blt.y = canvas.height - blt.height/2;
          blt.vy = -blt.vy * blt.bounceStrength;
          blt.bounceCount++;
          blt.damageStage = Math.min(3, blt.bounceCount);
          
          // Create shatter wave on ground impact
          blt.shatterWaveActive = true;
          blt.shatterWaveRadius = 0;
          
          // Create debris effects at impact point
          for (let j = 0; j < 20; j++) {
            particles.push({
              x: blt.x,
              y: blt.y + blt.height/2,
              size: 2 + Math.random() * 4,
              vx: (Math.random() - 0.5) * 8,
              vy: -Math.random() * 10,
              life: 30 + Math.random() * 20,
              color: Math.random() < 0.5 ? '#888' : '#555',
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.2
            });
          }
          
          // Add ground cracks effect - Fix size to be more reasonable
          addPermanentBloodSplatter(blt.x, canvas.height, Math.min(40, 20 + Math.random() * 20));
        }
        
        // Remove if max bounces reached
        if (blt.bounceCount >= blt.maxBounces) {
          // Create final explosion effect
          for (let j = 0; j < 50; j++) {
            particles.push({
              x: blt.x,
              y: blt.y,
              size: 3 + Math.random() * 6,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              life: 40 + Math.random() * 30,
              color: Math.random() < 0.5 ? '#555' : '#888',
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.4
            });
          }
          
          bullets.splice(i, 1);
          continue;
        }
        
        // Update shatter wave if active
        if (blt.shatterWaveActive) {
          blt.shatterWaveRadius += blt.shatterSpeed;
          
          // Draw the shatter wave
          const gradient = ctx.createRadialGradient(blt.x, canvas.height, 0, blt.x, canvas.height, blt.shatterWaveRadius);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
          gradient.addColorStop(0.3, 'rgba(200, 200, 200, 0.3)');
          gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
          
          ctx.beginPath();
          ctx.fillStyle = gradient;
          ctx.arc(blt.x, canvas.height, blt.shatterWaveRadius, 0, Math.PI, true);
          ctx.fill();
          
          // Check for birds affected by the shatter wave
          for (let j = birds.length - 1; j >= 0; j--) {
            const bird = birds[j];
            const birdCenterX = bird.x + bird.width/2;
            const birdBottom = bird.y + bird.height;
            const distanceX = Math.abs(blt.x - birdCenterX);
            
            // Only affect birds on or near the ground
            if (birdBottom > canvas.height - 100 && distanceX < blt.shatterWaveRadius) {
              // Calculate vertical affect based on distance (more power near the center)
              const power = 1 - (distanceX / blt.shatterWaveRadius);
              
              // Apply impulse to bird
              bird.vy -= power * 12;
              
              // Chance to instantly kill birds hit by the wave
              if (power > 0.7 || bird.hp <= 1) {
                // Create a massive shatter effect on this bird
                createBirdExplosion(bird.x + bird.width/2, bird.y + bird.height/2, bird.width);
                createBirdParts(bird.x + bird.width/2, bird.y + bird.height/2, bird.width);
                
                spawnJuice(bird.x + bird.width/2, bird.y + bird.height/2);
                birds.splice(j, 1);
                weaponSystem.addKill();
              } else {
                // Damage bird
                bird.hp -= Math.ceil(power * 2);
                
                // Add blood marks
                bird.bloodMarks.push({
                  x: Math.random() * 0.6 + 0.2,
                  y: Math.random() * 0.6 + 0.2,
                  size: 2 + Math.random() * 2
                });
              }
            }
          }
          
          // Disable shatter wave when it reaches max size
          if (blt.shatterWaveRadius >= blt.maxShatterRadius) {
            blt.shatterWaveActive = false;
          }
        }
        
        // Check for direct collisions with birds
        for (let j = birds.length - 1; j >= 0; j--) {
          const bird = birds[j];
          if (isColliding(blt, bird)) {
            // Create a massive shatter effect on this bird
            createBirdParts(bird.x + bird.width/2, bird.y + bird.height/2, bird.width);
            createBirdParts(bird.x + bird.width/2, bird.y + bird.height/2, bird.width);
            
            // Create standardized blood effect for massive impact
            createStandardizedBloodEffect(bird.x + bird.width/2, bird.y + bird.height/2, bird.width * 2, 10);
            
            // Spawn extra fluids
            spawnJuice(bird.x + bird.width/2, bird.y + bird.height/2);
            
            // Create extra blood splatters
            for (let k = 0; k < 5; k++) {
              addPermanentBloodSplatter(
                bird.x + (Math.random() - 0.5) * bird.width * 3, 
                canvas.height,
                bird.width * (0.3 + Math.random() * 0.5)
              );
            }
            
            // Remove bird and count kill
            birds.splice(j, 1);
            weaponSystem.addKill();
            
            // Transfer some momentum from ball to simpler physics
            const hitPower = 0.2 + Math.random() * 0.1;
            blt.vx *= (1 - hitPower);
            blt.vy *= (1 - hitPower);
          }
        }
        
        drawBullet(blt);
      } else {
        // Regular non-ironball bullet update
    blt.x += Math.cos(blt.angle) * blt.speed;
    blt.y += Math.sin(blt.angle) * blt.speed;
    
    drawBullet(blt);
    
    // Remove bullets that go off screen
    if (blt.x < 0 || blt.x > canvas.width || blt.y < 0 || blt.y > canvas.height) {
      bullets.splice(i, 1);
      continue;
    }

    // Check collisions with birds
    for (let j = birds.length - 1; j >= 0; j--) {
      let bird = birds[j];
      if (isColliding(blt, bird)) {
            // Special case for transformation serum
            if (blt.type === 'serum') {
              // Transform the bird into a blue muscular man
              transformBirdToBlueMan(bird);
              
              // Remove the bird and the bullet
              birds.splice(j, 1);
              bullets.splice(i, 1);
              
              // Don't count as a kill, it's a transformation
              break;
            }
            
        // For knives, slice birds in half with more blood
        if (blt.type === 'knife') {
          // Create a dramatic slicing effect
              slashBird(bird, blt.angle + blt.rotation, {x: mouse.x, y: mouse.y});
              
              // Create even more blood for knife kills
              createStandardizedBloodEffect(bird.x + bird.width/2, bird.y + bird.height/2, bird.width, 10);
              
              // Add extra blood splatters on ground
              for (let i = 0; i < 5; i++) {
                addPermanentBloodSplatter(
                  bird.x + (Math.random() - 0.5) * bird.width * 3, 
                  canvas.height, // Explicitly use canvas.height to ensure it's on the ground
                  bird.width * (0.3 + Math.random() * 0.6)
                );
              }
          
          // Remove bird immediately
          spawnJuice(bird.x + bird.width / 2, bird.y + bird.height / 2);
          birds.splice(j, 1);
              weaponSystem.addKill();
          
          // Increment knife hit counter
          blt.hitCount++;
          
          // Only remove knife if it has hit max targets
          if (blt.hitCount >= blt.maxHits) {
            bullets.splice(i, 1);
          }
          
          break;
        }
        
        // Regular weapons behavior
        bird.hp -= blt.type === 'missile' ? 10 : 1; // Missiles do more damage
        bird.hitCount++; // Increment hit counter
        
        // Add blood marks for any weapon
        bird.bloodMarks.push({
          x: Math.random() * 0.6 + 0.2,
          y: Math.random() * 0.6 + 0.2,
          size: 2 + Math.random() * 2
        });
        
        // Create small blood splatter for normal gun (more subtle)
        if (blt.type === 'bullet') {
              if (typeof createStandardizedBloodEffect === 'function') {
                createStandardizedBloodEffect(bird.x + bird.width/2, bird.y + bird.height/2, 5 + Math.random() * 5, 3);
              }
        }
        
        // Create explosion ONLY if it's a missile or if weapon level is 2+ and bird was hit twice
            if (blt.type === 'missile' || (weaponSystem.currentWeapon >= 2 && bird.hitCount >= 2)) {
          const explosionRadius = blt.type === 'missile' ? blt.explosionRadius : 50;
          createExplosion(bird.x + bird.width/2, bird.y + bird.height/2, explosionRadius);
        }
        
        bullets.splice(i, 1);
        
        if (bird.hp <= 0) {
          // Always create a bigger explosion when bird dies
              if (weaponSystem.currentWeapon >= 2) {
            createBirdExplosion(bird.x + bird.width/2, bird.y + bird.height/2, bird.width);
          } else {
            // For level 1 weapon, just create a larger blood effect without explosion
                createStandardizedBloodEffect(bird.x + bird.width/2, bird.y + bird.height/2, bird.width * 1.5, 7);
            spawnJuice(bird.x + bird.width/2, bird.y + bird.height/2);
                // Add dismembered parts
                createBirdParts(bird.x + bird.width/2, bird.y + bird.height/2, bird.width);
          }
          
          birds.splice(j, 1);
              weaponSystem.addKill();
        }
        break;
          }
        }
      }
    }
    
    // 8. Draw interface elements (character and upgrade progress) last so they're on top
    drawCharacter();
    drawWeaponSelection();
    
    requestAnimationFrame(update);
  } catch (err) {
    console.error('Error in update:', err);
    requestAnimationFrame(update);
  }
}

// Add a special bird explosion function
function createBirdExplosion(x, y, size) {
  try {
    // Create main explosion
    createExplosion(x, y, size * 2.5);
    
    // Create blood particles
    spawnJuice(x, y);
    
    // Create bird parts that will stay on ground
    createBirdParts(x, y, size);
    
    // Create standardized blood effect
    createStandardizedBloodEffect(x, y, size, 9);
    
    // Always add blood splatters on ground
    for (let i = 0; i < 4; i++) {
      addPermanentBloodSplatter(
        x + (Math.random() - 0.5) * size * 3, 
        canvas.height, // Explicitly use canvas.height to ensure it's on the ground
        size * (0.3 + Math.random() * 0.5)
      );
    }
    
    // Create feather particles
    const featherCount = 20 + Math.floor(Math.random() * 20);
    for (let i = 0; i < featherCount; i++) {
      particles.push({
        x: x,
        y: y,
        size: 3 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2, // Slightly upward bias
        life: 60 + Math.random() * 60,
        color: Math.random() > 0.3 ? 'lightgreen' : 'green',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  } catch (err) {
    console.error('Error creating bird explosion:', err);
  }
}

// Create bird parts that will stay on ground
function createBirdParts(x, y, size) {
  // Create random number of parts (6-10), limit for explosions
  const maxParts = window.explosionInProgress ? 4 : (6 + Math.floor(Math.random() * 5));
  const numParts = Math.min(maxParts, 6 + Math.floor(Math.random() * 5));
  
  // Meat colors - various shades of red, pink, and darker tones
  const meatColors = [
    '#ff6b6b', '#c92a2a', '#a61c1c', // Reds
    '#e03131', '#801414', '#5c0000', // Dark reds
    '#ffa8a8', '#ffc9c9', '#b25252', // Pink tones
    '#451e1e', '#38040e', '#640d14'  // Darker tones
  ];
  
  for (let i = 0; i < numParts; i++) {
    // Make parts significantly smaller and more irregular
    const partWidth = Math.max(2, size * (0.05 + Math.random() * 0.15));
    const partHeight = Math.max(2, size * (0.05 + Math.random() * 0.15));
    
    // Randomly make some parts longer (tendons, intestines, etc.)
    const isLongPart = Math.random() < 0.3;
    const finalWidth = isLongPart ? partWidth * (1.5 + Math.random() * 1.5) : partWidth;
    const finalHeight = isLongPart ? partHeight * 0.6 : partHeight;
    
    // Choose if this part has exposed bone
    const hasBone = Math.random() < 0.25; // Reduce bone frequency
    
    if (!window.birdParts) window.birdParts = [];
    
    // Prevent too many parts
    if (window.birdParts.length >= 100) {
      // Remove oldest parts when there are too many
      window.birdParts.splice(0, 10); // Remove 10 oldest parts
    }
    
    // Random meat color from palette
    const meatColor = meatColors[Math.floor(Math.random() * meatColors.length)];
    
    window.birdParts.push({
      x: x - finalWidth/2 + (Math.random() - 0.5) * size * 0.7, // More scattered
      y: y - finalHeight/2 + (Math.random() - 0.5) * size * 0.7,
      width: finalWidth,
      height: finalHeight,
      vx: (Math.random() - 0.5) * 5, // More velocity variation
      vy: -2 - Math.random() * 4, // Initial upward velocity
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3, // More rotation
      onGround: false,
      groundY: canvas.height - finalHeight/2, // Where it should stop on ground
      color: meatColor,
      hasBone: hasBone,
      boneOffset: {x: (Math.random() - 0.5) * 0.6, y: (Math.random() - 0.5) * 0.6},
      boneWidth: finalWidth * (0.2 + Math.random() * 0.2),
      boneColor: Math.random() < 0.5 ? '#f8f9fa' : '#e9ecef', // Bone colors (white/offwhite)
      bloodMarks: [],
      partType: Math.floor(Math.random() * 5), // More varied shapes
      shadowOffset: 2,
      isLongPart: isLongPart,
      // Add some blood drips initially
      bloodDrips: Array(1 + Math.floor(Math.random() * 3)).fill().map(() => ({
        x: (Math.random() - 0.5) * 0.8,
        y: (Math.random() - 0.5) * 0.8,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.7 + Math.random() * 0.3
      }))
    });
  }
  
  // Add more variety of organ-like parts
  if (Math.random() < 0.6 && size > 15) {
    const organSize = size * (0.15 + Math.random() * 0.1);
    const organColor = Math.random() < 0.5 ? '#5c0000' : '#801414';
    
    window.birdParts.push({
      x: x - organSize/2 + (Math.random() - 0.5) * 10,
      y: y - organSize/2 + (Math.random() - 0.5) * 10,
      width: organSize,
      height: organSize * (0.6 + Math.random() * 0.4),
      vx: (Math.random() - 0.5) * 3,
      vy: -2 - Math.random() * 2, // Lower jump for heavier organ
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.15, // Slower rotation
      onGround: false,
      groundY: canvas.height - organSize/2,
      color: organColor,
      hasBone: false,
      isOrgan: true,
      organType: Math.floor(Math.random() * 3), // Different organ types
      shadowOffset: 3,
      bloodDrips: Array(2 + Math.floor(Math.random() * 3)).fill().map(() => ({
        x: (Math.random() - 0.5) * 0.8,
        y: (Math.random() - 0.5) * 0.8,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.7 + Math.random() * 0.3
      }))
    });
  }
}

// Update and render bird parts
function updateBirdParts() {
  try {
    // Initialize birdParts array if not exists
    if (!window.birdParts) window.birdParts = [];
    
    if (window.birdParts.length === 0) return;
    
    // Physics and animation update for each part
    for (let i = window.birdParts.length - 1; i >= 0; i--) {
      try {
        const part = window.birdParts[i];
        if (!part) continue; // Skip invalid parts
        
        // Apply gravity and air resistance
        part.vy += 0.2; // Gravity
        part.vx *= 0.98; // Air resistance
        
        // Move the part
        part.x += part.vx;
        part.y += part.vy;
        
        // Apply rotation
        if (part.rotSpeed !== undefined) {
          part.rotation += part.rotSpeed;
        }
        
        // Check for floor collision
        if (!part.onGround && part.groundY && part.y + part.height/2 > part.groundY) {
          part.onGround = true;
          part.y = part.groundY - part.height/2;
          part.vy = -part.vy * 0.2; // Small bounce
          part.vx *= 0.7; // Friction
          part.rotSpeed *= 0.5; // Slow rotation
          
          // Generate blood splat when hitting ground
          if (typeof createBloodSplat === 'function') {
            createBloodSplat(part.x, part.groundY, 3 + Math.random() * 5);
          }
        }
        
        // Remove parts that go off-screen
        if (part.x < -100 || part.x > canvas.width + 100 || part.y > canvas.height + 100) {
          window.birdParts.splice(i, 1);
          continue;
        }
        
        // Render the part
        renderBirdPart(part);
      } catch (err) {
        console.error('Error updating bird part:', err);
        // Remove problematic part
        window.birdParts.splice(i, 1);
      }
    }
  } catch (err) {
    console.error('Error in updateBirdParts:', err);
  }
}

// Separate function to render a bird part
function renderBirdPart(part) {
  try {
    ctx.save();
    ctx.translate(part.x, part.y);
    ctx.rotate(part.rotation || 0);
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    if (part.isOrgan) {
      // Oval shadow for organs
      ctx.beginPath();
      ctx.ellipse(0, part.groundY - part.y + 5, part.width * 0.6, part.height * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (part.isLongPart) {
      // Curved line shadow for long parts
      ctx.beginPath();
      ctx.ellipse(0, part.groundY - part.y + 5, part.width * 0.7, part.height * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Irregular shadow for meat chunks
      ctx.beginPath();
      ctx.ellipse(0, part.groundY - part.y + 5, part.width * 0.5, part.height * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw the part based on its type
    ctx.fillStyle = part.color || '#a50e0e';
    
    if (part.isOrgan) {
      // Draw different organ shapes
      switch (part.organType) {
        case 0: // Heart-like shape
          drawHeartLikeOrgan(ctx, part);
          break;
        case 1: // Kidney-like shape
          drawKidneyLikeOrgan(ctx, part);
          break;
        case 2: // Liver-like shape
          drawLiverLikeOrgan(ctx, part);
          break;
        default:
          // Fallback for unknown organ type
          ctx.beginPath();
          ctx.ellipse(0, 0, part.width * 0.5, part.height * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
      }
      
      // Add highlights to organs to make them look wet/shiny
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.ellipse(-part.width * 0.25, -part.height * 0.25, part.width * 0.15, part.height * 0.1, Math.PI/4, 0, Math.PI * 2);
      ctx.fill();
      
    } else if (part.isLongPart) {
      // Draw intestine or tendon-like part (curved)
      drawLongOrganicPart(ctx, part);
      
    } else {
      // Draw irregular meat chunk
      drawMeatChunk(ctx, part);
      
      // Draw bone if this part has one
      if (part.hasBone) {
        ctx.fillStyle = part.boneColor || '#ffffff';
        ctx.beginPath();
        
        // Position the bone with offset values
        const boneOffset = part.boneOffset || {x: 0, y: 0};
        const boneX = part.width * boneOffset.x;
        const boneY = part.height * boneOffset.y;
        
        // Draw rounded bone shape
        ctx.ellipse(
          boneX, 
          boneY, 
          part.boneWidth * 0.5 || 2, 
          part.boneWidth * 0.3 || 1, 
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
    
    // Draw blood drips
    ctx.fillStyle = '#a00';
    if (part.bloodDrips) {
      for (const drip of part.bloodDrips) {
        if (!drip) continue;
        ctx.globalAlpha = drip.alpha || 0.7; // Default alpha if missing
        ctx.beginPath();
        ctx.ellipse(
          drip.x || 0, 
          drip.y || 0, 
          drip.size || 1, 
          (drip.size || 1) * 1.5, 
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;
    
    ctx.restore();
  } catch (err) {
    console.error('Error rendering bird part:', err);
  }
}

// Helper function to draw a heart-like organ
function drawHeartLikeOrgan(ctx, part) {
  if (!part || !ctx) return;
  
  try {
    // Base shape
    ctx.beginPath();
    ctx.moveTo(0, -part.height * 0.3);
    ctx.bezierCurveTo(
      part.width * 0.5, -part.height * 0.6, 
      part.width * 0.5, part.height * 0.3, 
      0, part.height * 0.4
    );
    ctx.bezierCurveTo(
      -part.width * 0.5, part.height * 0.3, 
      -part.width * 0.5, -part.height * 0.6, 
      0, -part.height * 0.3
    );
    
    ctx.fill();
    
    // Darker color for depth
    ctx.fillStyle = shadeColor(part.color || '#800000', -20);
    ctx.beginPath();
    ctx.ellipse(part.width * 0.2, 0, part.width * 0.3, part.height * 0.25, Math.PI/3, 0, Math.PI * 2);
    ctx.fill();
  } catch (err) {
    console.error('Error drawing heart organ:', err);
  }
}

// Helper function to draw a kidney-like organ
function drawKidneyLikeOrgan(ctx, part) {
  if (!part || !ctx) return;
  
  try {
    // Bean shape
    ctx.beginPath();
    ctx.ellipse(0, 0, part.width * 0.5, part.height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Indent
    ctx.fillStyle = shadeColor(part.color || '#800000', -30);
    ctx.beginPath();
    ctx.ellipse(part.width * 0.3, 0, part.width * 0.2, part.height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  } catch (err) {
    console.error('Error drawing kidney organ:', err);
  }
}

// Helper function to draw a liver-like organ
function drawLiverLikeOrgan(ctx, part) {
  if (!part || !ctx) return;
  
  try {
    // Main lobe
    ctx.beginPath();
    ctx.ellipse(0, 0, part.width * 0.5, part.height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Secondary lobe
    ctx.beginPath();
    ctx.ellipse(part.width * 0.25, -part.height * 0.1, part.width * 0.35, part.height * 0.3, Math.PI/6, 0, Math.PI * 2);
    ctx.fill();
  } catch (err) {
    console.error('Error drawing liver organ:', err);
  }
}

// Helper function to draw long parts like intestines or tendons
function drawLongOrganicPart(ctx, part) {
  if (!part || !ctx) return;
  
  try {
    // Draw curved tube-like shape
    ctx.beginPath();
    ctx.moveTo(-part.width * 0.5, 0);
    
    // Create a wavy pattern
    ctx.bezierCurveTo(
      -part.width * 0.3, -part.height * 0.3,
      part.width * 0.3, part.height * 0.3,
      part.width * 0.5, 0
    );
    
    ctx.lineTo(part.width * 0.5, part.height * 0.3);
    
    ctx.bezierCurveTo(
      part.width * 0.3, part.height * 0.6,
      -part.width * 0.3, 0,
      -part.width * 0.5, part.height * 0.3
    );
    
    ctx.closePath();
    ctx.fill();
    
    // Add texture details
    ctx.fillStyle = shadeColor(part.color || '#800000', -20);
    ctx.beginPath();
    ctx.ellipse(0, 0, part.width * 0.1, part.height * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(part.width * 0.3, part.height * 0.1, part.width * 0.1, part.height * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  } catch (err) {
    console.error('Error drawing long part:', err);
  }
}

// Helper function to draw irregular meat chunks
function drawMeatChunk(ctx, part) {
  if (!part || !ctx) return;
  
  try {
    // Create irregular meat shape using bezier curves
    ctx.beginPath();
    
    // Start at top
    ctx.moveTo(0, -part.height * 0.5);
    
    // Random control points for irregular shape
    const cp1x = part.width * (0.2 + Math.random() * 0.3);
    const cp1y = -part.height * (0.3 + Math.random() * 0.2);
    const cp2x = part.width * (0.3 + Math.random() * 0.2);
    const cp2y = part.height * (0.1 + Math.random() * 0.2);
    
    // Right side curve
    ctx.bezierCurveTo(
      cp1x, cp1y,
      cp2x, cp2y,
      0, part.height * 0.5
    );
    
    // Left side with different control points
    const cp3x = -part.width * (0.3 + Math.random() * 0.2);
    const cp3y = part.height * (0.3 + Math.random() * 0.2);
    const cp4x = -part.width * (0.2 + Math.random() * 0.3);
    const cp4y = -part.height * (0.2 + Math.random() * 0.3);
    
    ctx.bezierCurveTo(
      cp3x, cp3y,
      cp4x, cp4y,
      0, -part.height * 0.5
    );
    
    ctx.closePath();
    ctx.fill();
    
    // Add texture/details with slightly darker color
    ctx.fillStyle = shadeColor(part.color || '#800000', -15);
    
    // Small organic details
    for (let i = 0; i < 3; i++) {
      const dx = (Math.random() - 0.5) * part.width * 0.6;
      const dy = (Math.random() - 0.5) * part.height * 0.6;
      const size = part.width * (0.05 + Math.random() * 0.1);
      
      ctx.beginPath();
      ctx.ellipse(dx, dy, size, size * 0.8, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } catch (err) {
    console.error('Error drawing meat chunk:', err);
  }
}

// Create blood splat effect when parts hit the ground
function createBloodSplat(x, y, size) {
  try {
    const particleCount = 3 + Math.floor(Math.random() * 5);
    
    // Add blood particles for immediate effect
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * size * 3;
      const splatterSize = 1 + Math.random() * 3;
      
    particles.push({
        x: x + Math.cos(angle) * distance,
        y: y - 2, // Slightly above ground
        size: splatterSize,
        vx: 0,
        vy: 0,
        life: 100 + Math.random() * 600, // Long-lasting splatter
        color: '#a50e0e',
        type: 'splat',
        alpha: 0.7 + Math.random() * 0.3
      });
    }
    
    // Add permanent blood splatters that will stay on the ground forever
    // Force y position to be at ground level
    addPermanentBloodSplatter(x, canvas.height, size);
  } catch (err) {
    console.error('Error creating blood splat:', err);
  }
}

// Standardized blood effect function that works across all levels
function createStandardizedBloodEffect(x, y, size, intensity) {
  try {
    // Adjust size and amount based on intensity (1-10)
    intensity = Math.max(1, Math.min(10, intensity || 5));
    
    // Create flying blood droplets
    const particleCount = Math.floor(intensity * 3 + Math.random() * intensity * 2);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * intensity;
      const particleSize = 1 + Math.random() * (intensity / 2);
      
      particles.push({
        x: x + (Math.random() - 0.5) * size * 0.5,
        y: y + (Math.random() - 0.5) * size * 0.5,
        size: particleSize,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 2, // Add slight upward bias
        life: 30 + Math.random() * 60,
        color: Math.random() < 0.3 ? '#450a0a' : '#a50e0e',
      rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        type: 'blood'
      });
    }
    
    // Always create permanent blood splatters on the ground, never at the bird's position
    if (size > 5) {
      // Create blood directly on the ground, using x position but forcing y to ground level
      for (let i = 0; i < 2 + Math.floor(intensity/3); i++) {
        addPermanentBloodSplatter(
          x + (Math.random() - 0.5) * size * 2, 
          canvas.height, // Always on ground
          size * (0.2 + Math.random() * 0.4)
        );
      }
    }
  } catch (err) {
    console.error('Error creating standardized blood effect:', err);
  }
}

// Add permanent blood splatter that stays on ground
function addPermanentBloodSplatter(x, y, size) {
  try {
    if (!window.permanentBloodSplatters) {
      window.permanentBloodSplatters = [];
    }
    
    // Limit size to prevent giant splatters
    size = Math.min(size, 60); // Cap the maximum size to prevent giant red circles
    
    // Limit the number of permanent splatters for performance
    if (window.permanentBloodSplatters.length > 200) {
      window.permanentBloodSplatters.splice(0, 50); // Remove oldest 50 splatters
    }
    
    const splatCount = 1 + Math.floor(Math.random() * 3);
    
    // Always use ground level Y position regardless of what was passed
    const groundY = canvas.height - 5;
    
    for (let i = 0; i < splatCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * size;
      
      window.permanentBloodSplatters.push({
        x: x + Math.cos(angle) * distance,
        y: groundY + Math.random() * 5, // Always on ground (with small variations)
        size: size * (0.3 + Math.random() * 0.4), // More consistent sizing
        alpha: 0.4 + Math.random() * 0.3,
        color: Math.random() < 0.3 ? '#450a0a' : '#a50e0e',
        // Use different shapes for more organic look
        shape: Math.floor(Math.random() * 3)
      });
    }
  } catch (err) {
    console.error('Error adding permanent blood splatter:', err);
  }
}

// Update and render particles
function updateParticles() {
  if (!particles || particles.length === 0) return;
  
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    
    // Update particle position
    p.x += p.vx;
    p.y += p.vy;
    
    // Apply gravity to particles except splats
    if (p.type !== 'splat') {
      p.vy += 0.1;
    }
    
    // Apply air resistance
    p.vx *= 0.99;
    p.vy *= 0.99;
    
    // Decrease life
    p.life--;
    
    // Remove dead particles
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    
    // Update rotation if applicable
    if (p.rotSpeed !== undefined) {
      p.rotation += p.rotSpeed;
    }
    
    // Calculate alpha based on remaining life
    const alpha = Math.min(1, p.life / 20);
    
    // Draw the particle
      ctx.save();
    
    if (p.rotation !== undefined) {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.translate(-p.x, -p.y);
    }
    
    // Set color and alpha
    ctx.fillStyle = p.color || '#a50e0e';
    ctx.globalAlpha = p.alpha !== undefined ? p.alpha * alpha : alpha;
    
    // Draw based on type
    if (p.type === 'splat') {
      // Draw a permanent blood splat
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size, p.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'blood') {
      // Draw blood droplet
      if (p.rotation !== undefined) {
        // Draw elongated blood droplet
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 1.3, p.rotation, 0, Math.PI * 2);
    } else {
        // Draw circular blood droplet
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
      
      // Add small trail effect
      if (p.vx !== 0 || p.vy !== 0) {
        ctx.globalAlpha *= 0.3;
        ctx.beginPath();
        ctx.arc(p.x - p.vx * 0.5, p.y - p.vy * 0.5, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Draw regular particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
}

// Helper to shade a color (positive amt = lighter, negative = darker)
function shadeColor(color, percent) {
  try {
    if (!color || typeof color !== 'string' || !color.startsWith('#')) {
      return color || '#800000'; // Return default color if invalid
    }
    
    let R = parseInt(color.substring(1,3), 16);
    let G = parseInt(color.substring(3,5), 16);
    let B = parseInt(color.substring(5,7), 16);

    // Handle invalid color format
    if (isNaN(R) || isNaN(G) || isNaN(B)) {
      return '#800000';
    }

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;  
    G = (G < 255) ? G : 255;  
    B = (B < 255) ? B : 255;  

    R = Math.max(0, R);
    G = Math.max(0, G);
    B = Math.max(0, B);

    const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
  } catch (err) {
    console.error('Error in shadeColor:', err);
    return '#800000'; // Fallback color
  }
}

// Slash a bird when player makes a slashing motion
function slashBird(bird, slashAngle, mouseVelocity) {
  // Check if bird can be slashed
  if (!bird || bird.dead || bird.slashed || 
      (window.gameState !== undefined && window.gameState !== 'playing')) return false;
  
  // Mark the bird as slashed
  bird.slashed = true;
  bird.dead = true;
  
  // Calculate slash endpoints based on angle and velocity
  // Ensure mouseVelocity is valid
  const velocity = mouseVelocity && typeof mouseVelocity === 'object' ? 
    Math.sqrt((mouseVelocity.x || 0)**2 + (mouseVelocity.y || 0)**2) : 5;
    
  const slashLength = Math.min(150, Math.max(50, velocity * 10));
  const slashStartX = bird.x - Math.cos(slashAngle) * slashLength/2;
  const slashStartY = bird.y - Math.sin(slashAngle) * slashLength/2;
  const slashEndX = bird.x + Math.cos(slashAngle) * slashLength/2;
  const slashEndY = bird.y + Math.sin(slashAngle) * slashLength/2;
  
  // Add a slash visual effect
  if (!window.slashLines) window.slashLines = [];
  window.slashLines.push({
    x1: slashStartX,
    y1: slashStartY,
    x2: slashEndX,
    y2: slashEndY,
    life: 10,
    alpha: 1.0
  });
  
  // Give a slight upward motion when slashed
  bird.vy -= 3;
  
  // Create blood particles
  const bloodCount = 10 + Math.floor(Math.random() * 15);
  for (let i = 0; i < bloodCount; i++) {
    const angle = slashAngle + (Math.random() - 0.5) * Math.PI * 0.8;
    const speed = 2 + Math.random() * 6;
    
    particles.push({
      x: bird.x + (Math.random() - 0.5) * bird.width * 0.8,
      y: bird.y + (Math.random() - 0.5) * bird.height * 0.8,
      size: 2 + Math.random() * 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // Add slight upward motion
      life: 20 + Math.random() * 40,
      color: Math.random() < 0.3 ? '#450a0a' : '#a50e0e',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      type: 'blood'
    });
  }
  
  // Create standardized blood effect for slashed birds
  createStandardizedBloodEffect(bird.x + bird.width/2, bird.y + bird.height/2, bird.width, 8);
  
  // Add more blood splatters on ground directly
  for (let i = 0; i < 3; i++) {
    addPermanentBloodSplatter(
      bird.x + (Math.random() - 0.5) * bird.width * 2, 
      canvas.height, // Explicitly use canvas.height to ensure it's on the ground
      bird.width * (0.3 + Math.random() * 0.5)
    );
  }
  
  // Create bird parts
  if (!window.birdParts) window.birdParts = [];
  
  // Create a random number of parts (more than before)
  const numParts = 6 + Math.floor(Math.random() * 5);
  
  // Define meat colors - internal vs external
  const meatColors = [
    '#cc3333', // Regular meat
    '#aa2222', // Darker meat
    '#dd4444', // Lighter meat
    '#882222', // Deep muscle
    '#ee5555'  // Fresh meat
  ];
  
  // Define bone-like colors
  const boneColors = [
    '#ffffff', // White bone
    '#efefef', // Off-white
    '#f5f5dc'  // Beige
  ];
  
  // Calculate ground level based on current wave
  const groundY = canvas.height - 50;
  
  // Create varied bird parts
  for (let i = 0; i < numParts; i++) {
    // Smaller size range for more organic feel
    const partWidth = bird.width * (0.15 + Math.random() * 0.25);
    const partHeight = bird.height * (0.15 + Math.random() * 0.25);
    
    // Random velocity, stronger along the slash direction
    const velMultiplier = 1 + Math.random() * 2;
    let partVX = (Math.random() - 0.5) * 5;
    let partVY = -2 - Math.random() * 4; // Initial upward motion
    
    // Add influence from slash direction
    partVX += Math.cos(slashAngle) * velMultiplier;
    partVY += Math.sin(slashAngle) * velMultiplier;
    
    // Random rotation speed
    const rotSpeed = (Math.random() - 0.5) * 0.2;
    
    // Randomize what type of part this is
    const meatColor = meatColors[Math.floor(Math.random() * meatColors.length)];
    const boneColor = boneColors[Math.floor(Math.random() * boneColors.length)];
    
    // Chance this is an organ rather than a normal meat chunk
    const isOrgan = Math.random() < 0.25;
    
    // Chance this is a long part (intestine, tendon, etc)
    const isLongPart = !isOrgan && Math.random() < 0.2;
    
    // Chance piece has a bone in it
    const hasBone = !isOrgan && !isLongPart && Math.random() < 0.3;
    
    // Create blood drips on the part
    const numDrips = 2 + Math.floor(Math.random() * 4);
    const bloodDrips = [];
    
    for (let j = 0; j < numDrips; j++) {
      bloodDrips.push({
        x: (Math.random() - 0.5) * partWidth,
        y: (Math.random() - 0.5) * partHeight,
        size: 1 + Math.random() * 2,
        alpha: 0.7 + Math.random() * 0.3
      });
    }
    
    // Create varied part types
    window.birdParts.push({
      x: bird.x + (Math.random() - 0.5) * bird.width * 0.3, 
      y: bird.y + (Math.random() - 0.5) * bird.height * 0.3,
      width: partWidth, 
      height: partHeight,
      vx: partVX, 
      vy: partVY,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: rotSpeed,
      color: meatColor,
      groundY: groundY,
      onGround: false,
      partType: Math.floor(Math.random() * 5), // More varied shapes
      isOrgan: isOrgan,
      isLongPart: isLongPart,
      organType: isOrgan ? Math.floor(Math.random() * 3) : 0,
      hasBone: hasBone,
      boneColor: boneColor,
      boneWidth: partWidth * (0.3 + Math.random() * 0.3),
      boneOffset: { 
        x: (Math.random() - 0.5) * 0.6, 
        y: (Math.random() - 0.5) * 0.6 
      },
      bloodDrips: bloodDrips
    });
  }
  
  // Handle speech bubble if bird had one
  if (bird.speech) {
    if (!window.floatingSpeech) window.floatingSpeech = [];
    
    window.floatingSpeech.push({
      text: bird.speech,
      x: bird.x,
      y: bird.y - bird.height,
      vx: (Math.random() - 0.5) * 2,
      vy: -2 - Math.random() * 2,
      life: 60,
      alpha: 1.0
    });
  }
  
  // Play sound effect
  if (typeof playSound === 'function') {
    playSound('slash');
  }
  
  return true;
}

// Function to draw a speech bubble with text
function drawSpeechBubble(bird, x, y, width, height) {
  const text = bird.speechText;
  const bubbleWidth = ctx.measureText(text).width + 20;
  const bubbleHeight = 30;
  const bubbleX = x + width / 2 - bubbleWidth / 2;
  const bubbleY = y - bubbleHeight - 10;
  
  // Only draw if the bubble would be visible on screen
  if (bubbleY > 0 && bubbleX > 0 && bubbleX + bubbleWidth < canvas.width) {
    // Draw bubble background
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 5);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw pointer triangle
    ctx.beginPath();
    ctx.moveTo(x + width / 2 - 10, bubbleY + bubbleHeight);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width / 2 + 10, bubbleY + bubbleHeight);
    ctx.fill();
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2);
  }
}

// Add a polyfill for roundRect if not supported
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
    if (radius === undefined) {
      radius = 5;
    }
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    return this;
  };
}

// Simple implementation of createBloodEffect if not defined elsewhere
if (typeof createBloodEffect !== 'function') {
  function createBloodEffect(x, y, size) {
    const count = Math.floor(size / 2);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * size;
      const particleSize = 1 + Math.random() * 3;
      
      particles.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        size: particleSize,
        vx: Math.cos(angle) * (1 + Math.random() * 2),
        vy: Math.sin(angle) * (1 + Math.random() * 2) - 1,
        life: 20 + Math.random() * 40,
        color: '#a50e0e',
        alpha: 1.0
      });
    }
  }
  window.createBloodEffect = createBloodEffect;
}

// Draw permanent blood splatters on the ground
function drawPermanentBloodSplatters() {
  try {
    if (!window.permanentBloodSplatters || window.permanentBloodSplatters.length === 0) return;
    
    for (const splat of window.permanentBloodSplatters) {
      if (!splat || typeof splat.size !== 'number' || splat.size <= 0 || splat.size > 100) {
        continue; // Skip invalid splatters or ones with extreme sizes
      }
      
      ctx.save();
      ctx.globalAlpha = splat.alpha || 0.5;
      ctx.fillStyle = splat.color || '#a50e0e';
      
      // Draw different splat shapes for variety
      switch (splat.shape) {
        case 0: // Circular splat
          ctx.beginPath();
          ctx.arc(splat.x, splat.y, splat.size, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 1: // Elongated splat
          ctx.beginPath();
          ctx.ellipse(
            splat.x, 
            splat.y, 
            splat.size * 1.5, 
            splat.size * 0.7, 
            Math.random() * Math.PI, 
            0, Math.PI * 2
          );
          ctx.fill();
          break;
          
        case 2: // Irregular splat with "fingers"
          const centerX = splat.x;
          const centerY = splat.y;
          const radius = splat.size;
          
          ctx.beginPath();
          ctx.moveTo(centerX + radius, centerY);
          
          // Create an irregular shape with 5-7 points
          const points = 5 + Math.floor(Math.random() * 3);
          for (let i = 1; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const distance = radius * (0.7 + Math.random() * 0.6);
            const controlDist = radius * (0.8 + Math.random() * 0.4);
            const controlAngle1 = angle - (0.4 / points) * Math.PI * 2;
            const controlAngle2 = angle + (0.4 / points) * Math.PI * 2;
            
            const controlX1 = centerX + Math.cos(controlAngle1) * controlDist;
            const controlY1 = centerY + Math.sin(controlAngle1) * controlDist;
            const controlX2 = centerX + Math.cos(controlAngle2) * controlDist;
            const controlY2 = centerY + Math.sin(controlAngle2) * controlDist;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, x, y);
          }
          
          ctx.closePath();
          ctx.fill();
          break;
      }
      
      ctx.restore();
    }
  } catch (err) {
    console.error('Error drawing permanent blood splatters:', err);
  }
}

// Setup weapon system
const weapons = [
  { name: "小刀", type: "knife", bulletSize: 20, damage: 10, fireRate: 100, ammoCount: 200 },
  { name: "手槍", type: "bullet", bulletSize: 5, damage: 5, fireRate: 10, ammoCount: 100 },
  { name: "機關槍", type: "bullet", bulletSize: 5, damage: 2, fireRate: 3, ammoCount: 300 },
  { name: "飛彈", type: "missile", bulletSize: 10, damage: 20, fireRate: 40, ammoCount: 10 },
  { name: "巨型鐵球", type: "ironball", bulletSize: 60, damage: 30, fireRate: 150, ammoCount: 5 }
];
let selectedWeaponIndex = 0;
let lastFireTime = 0;

// Function to transform a bird into a blue muscular man
function transformBirdToBlueMan(bird) {
  // Create the blue muscular man
  const blueMan = {
    x: bird.x,
    y: bird.y,
    width: bird.width * 1.2,
    height: bird.height * 1.5,
    vx: 0,
    vy: 0,
    hp: 20,
    jumpCooldown: 0,
    jumpPower: 12,
    speed: 3,
    target: null,
    attackCooldown: 0,
    attackRange: 80,
    attackDamage: 10,
    slashAngle: 0,
    slashAnimation: 0,
    isAttacking: false,
    creationTime: Date.now(),
    lifespan: 20000, // 20 seconds lifespan
    kills: 0
  };
  
  // Add the blue man to the array
  blueMen.push(blueMan);
  
  // Create transformation effect
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: bird.x + bird.width/2,
      y: bird.y + bird.height/2,
      size: 3 + Math.random() * 5,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 30 + Math.random() * 20,
      color: '#3498db', // Blue color
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3
    });
  }
  
  // Flash effect for transformation
  window.transformFlash = {
    x: bird.x + bird.width/2,
    y: bird.y + bird.height/2,
    radius: 0,
    maxRadius: 100,
    growSpeed: 5,
    alpha: 1
  };
}

// Draw the blue muscular man
function drawBlueMan(man) {
  // Head
  ctx.fillStyle = '#3498db'; // Blue color
  ctx.beginPath();
  ctx.arc(man.x + man.width/2, man.y + man.height*0.2, man.width*0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(man.x + man.width*0.4, man.y + man.height*0.18, man.width*0.08, 0, Math.PI * 2);
  ctx.arc(man.x + man.width*0.6, man.y + man.height*0.18, man.width*0.08, 0, Math.PI * 2);
  ctx.fill();
  
  // Pupils (look towards target if any)
  ctx.fillStyle = 'black';
  let eyeDirectionX = 0;
  let eyeDirectionY = 0;
  
  if (man.target) {
    const targetCenterX = man.target.x + man.target.width/2;
    const targetCenterY = man.target.y + man.target.height/2;
    const manCenterX = man.x + man.width/2;
    const manCenterY = man.y + man.height*0.18;
    
    const angle = Math.atan2(targetCenterY - manCenterY, targetCenterX - manCenterX);
    eyeDirectionX = Math.cos(angle) * man.width*0.03;
    eyeDirectionY = Math.sin(angle) * man.width*0.03;
  }
  
  ctx.beginPath();
  ctx.arc(man.x + man.width*0.4 + eyeDirectionX, man.y + man.height*0.18 + eyeDirectionY, man.width*0.04, 0, Math.PI * 2);
  ctx.arc(man.x + man.width*0.6 + eyeDirectionX, man.y + man.height*0.18 + eyeDirectionY, man.width*0.04, 0, Math.PI * 2);
  ctx.fill();
  
  // Angry expression
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(man.x + man.width*0.35, man.y + man.height*0.12);
  ctx.lineTo(man.x + man.width*0.45, man.y + man.height*0.08);
  ctx.moveTo(man.x + man.width*0.55, man.y + man.height*0.08);
  ctx.lineTo(man.x + man.width*0.65, man.y + man.height*0.12);
  ctx.stroke();
  
  // Mouth
  ctx.beginPath();
  ctx.moveTo(man.x + man.width*0.4, man.y + man.height*0.25);
  ctx.lineTo(man.x + man.width*0.6, man.y + man.height*0.25);
  ctx.stroke();
  
  // Muscular body
  ctx.fillStyle = '#3498db';
  
  // Torso
  ctx.beginPath();
  ctx.moveTo(man.x + man.width*0.3, man.y + man.height*0.3);
  ctx.lineTo(man.x + man.width*0.7, man.y + man.height*0.3);
  ctx.lineTo(man.x + man.width*0.65, man.y + man.height*0.7);
  ctx.lineTo(man.x + man.width*0.35, man.y + man.height*0.7);
  ctx.closePath();
  ctx.fill();
  
  // Chest muscles
  ctx.beginPath();
  ctx.moveTo(man.x + man.width*0.5, man.y + man.height*0.3);
  ctx.lineTo(man.x + man.width*0.5, man.y + man.height*0.55);
  ctx.stroke();
  
  // Six-pack abs
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.arc(man.x + man.width*(0.4 + i*0.2), man.y + man.height*(0.4 + j*0.08), man.width*0.05, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  
  // Arms (change position based on attacking state)
  ctx.fillStyle = '#3498db';
  
  if (man.isAttacking) {
    // Right arm raised for attack
    const attackProgress = man.slashAnimation / 10;
    const armAngle = Math.PI * 0.5 - attackProgress * Math.PI;
    
    // Right shoulder
    ctx.beginPath();
    ctx.arc(man.x + man.width*0.7, man.y + man.height*0.35, man.width*0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Right arm
    ctx.save();
    ctx.translate(man.x + man.width*0.7, man.y + man.height*0.35);
    ctx.rotate(armAngle);
    ctx.fillRect(-man.width*0.07, 0, man.width*0.14, man.height*0.3);
    
    // Draw sword/knife
    ctx.fillStyle = '#95a5a6'; // Blade color
    ctx.fillRect(-man.width*0.05, man.height*0.3, man.width*0.1, man.height*0.3);
    ctx.fillStyle = '#7f8c8d'; // Handle color
    ctx.fillRect(-man.width*0.04, man.height*0.28, man.width*0.08, man.height*0.05);
    ctx.restore();
    
    // Left arm steady
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(man.x + man.width*0.3, man.y + man.height*0.35, man.width*0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(man.x + man.width*0.15, man.y + man.height*0.35, man.width*0.15, man.height*0.2);
  } else {
    // Normal position for both arms
    // Right arm
    ctx.beginPath();
    ctx.arc(man.x + man.width*0.7, man.y + man.height*0.35, man.width*0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(man.x + man.width*0.7, man.y + man.height*0.35, man.width*0.15, man.height*0.2);
    
    // Left arm
    ctx.beginPath();
    ctx.arc(man.x + man.width*0.3, man.y + man.height*0.35, man.width*0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(man.x + man.width*0.15, man.y + man.height*0.35, man.width*0.15, man.height*0.2);
  }
  
  // Legs
  ctx.fillRect(man.x + man.width*0.38, man.y + man.height*0.7, man.width*0.1, man.height*0.3);
  ctx.fillRect(man.x + man.width*0.52, man.y + man.height*0.7, man.width*0.1, man.height*0.3);
  
  // Slash effect when attacking
  if (man.isAttacking && man.slashAnimation > 0) {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    
    const slashProgress = man.slashAnimation / 10;
    const startAngle = man.slashAngle - Math.PI * 0.3;
    const endAngle = startAngle + Math.PI * 0.6 * slashProgress;
    
    ctx.beginPath();
    ctx.arc(
      man.x + man.width/2 + Math.cos(man.slashAngle) * man.width, 
      man.y + man.height/2 + Math.sin(man.slashAngle) * man.width,
      man.width * 0.8, 
      startAngle, 
      endAngle
    );
    ctx.stroke();
  }
  
  // Show a number above indicating kills
  if (man.kills > 0) {
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${man.kills}`, man.x + man.width/2, man.y - 10);
  }
  
  // Show remaining lifespan as a progress bar
  const remainingLife = Math.max(0, 1 - (Date.now() - man.creationTime) / man.lifespan);
  const barWidth = man.width * 1.2;
  const barHeight = 5;
  
  // Bar background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(man.x - barWidth * 0.1, man.y - 20, barWidth, barHeight);
  
  // Life remaining
  ctx.fillStyle = remainingLife > 0.5 ? '#2ecc71' : (remainingLife > 0.25 ? '#f39c12' : '#e74c3c');
  ctx.fillRect(man.x - barWidth * 0.1, man.y - 20, barWidth * remainingLife, barHeight);
}

// Update function for blue muscular men
function updateBlueMen() {
  // Process each blue man
  for (let i = blueMen.length - 1; i >= 0; i--) {
    const man = blueMen[i];
    
    // Check if lifespan is over
    if (Date.now() - man.creationTime > man.lifespan) {
      // Create smoke effect when disappearing
      for (let j = 0; j < 20; j++) {
        particles.push({
          x: man.x + man.width/2,
          y: man.y + man.height/2,
          size: 3 + Math.random() * 5,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4 - 1,
          life: 30 + Math.random() * 20,
          color: '#3498db', // Blue color
          alpha: 0.7,
          fadeSpeed: 0.02
        });
      }
      
      blueMen.splice(i, 1);
      continue;
    }
    
    // Apply gravity
    man.vy += gravity;
    
    // Update position
    man.y += man.vy;
    
    // Floor collision
    if (man.y > canvas.height - man.height) {
      man.y = canvas.height - man.height;
      man.vy = 0;
      
      // Jump if cooldown is over
      if (man.jumpCooldown <= 0) {
        // Only jump if there's a target or randomly
        if (man.target || Math.random() < 0.02) {
          man.vy = -man.jumpPower;
          man.jumpCooldown = 60;
        }
      } else {
        man.jumpCooldown--;
      }
    }
    
    // Update attacking state
    if (man.isAttacking) {
      man.slashAnimation--;
      if (man.slashAnimation <= 0) {
        man.isAttacking = false;
      }
    }
    
    // Reduce attack cooldown
    if (man.attackCooldown > 0) {
      man.attackCooldown--;
    }
    
    // Find a target if none exists or current target is dead
    if (!man.target || man.target.dead || man.target.slashed) {
      man.target = findNearestBird(man);
    }
    
    // Move towards target if exists
    if (man.target) {
      const targetX = man.target.x + man.target.width/2;
      const manX = man.x + man.width/2;
      
      // Move towards target
      if (Math.abs(targetX - manX) > 10) {
        man.vx = targetX < manX ? -man.speed : man.speed;
      } else {
        man.vx = 0;
      }
      
      // Update position
      man.x += man.vx;
      man.x = Math.max(0, Math.min(canvas.width - man.width, man.x));
      
      // Attack if in range and cooldown is over
      if (man.attackCooldown <= 0) {
        const dx = targetX - manX;
        const dy = (man.target.y + man.target.height/2) - (man.y + man.height/2);
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < man.attackRange) {
          // Start attack animation
          man.isAttacking = true;
          man.slashAnimation = 10;
          man.slashAngle = Math.atan2(dy, dx);
          man.attackCooldown = 30;
          
          // Check if attack hits
          if (isColliding({
            x: manX + Math.cos(man.slashAngle) * man.width * 0.5,
            y: man.y + man.height * 0.4 + Math.sin(man.slashAngle) * man.width * 0.5,
            width: man.width,
            height: man.height * 0.3
          }, man.target)) {
            // Use enhanced slashing for blue men
            blueManSlashBird(man.target, man);
            man.kills++;
          }
        }
      }
    } else {
      // Random movement if no target
      if (Math.random() < 0.02) {
        man.vx = (Math.random() - 0.5) * man.speed * 2;
      }
      
      // Update position
      man.x += man.vx;
      man.x = Math.max(0, Math.min(canvas.width - man.width, man.x));
    }
    
    // Draw the blue man
    drawBlueMan(man);
  }
  
  // Draw transformation flash if active
  if (window.transformFlash) {
    const flash = window.transformFlash;
    
    // Grow the flash
    flash.radius += flash.growSpeed;
    flash.alpha -= 0.05;
    
    // Draw the flash
    const gradient = ctx.createRadialGradient(
      flash.x, flash.y, 0,
      flash.x, flash.y, flash.radius
    );
    gradient.addColorStop(0, `rgba(52, 152, 219, ${flash.alpha})`);
    gradient.addColorStop(0.7, `rgba(52, 152, 219, ${flash.alpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(52, 152, 219, 0)');
    
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Remove flash when complete
    if (flash.radius >= flash.maxRadius || flash.alpha <= 0) {
      window.transformFlash = null;
    }
  }
}

// Helper function to find the nearest bird for targeting
function findNearestBird(man) {
  let nearestBird = null;
  let minDistance = Infinity;
  
  for (const bird of birds) {
    if (bird.dead || bird.slashed) continue;
    
    const dx = (bird.x + bird.width/2) - (man.x + man.width/2);
    const dy = (bird.y + bird.height/2) - (man.y + man.height/2);
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestBird = bird;
    }
  }
  
  return nearestBird;
}

// Create a special function for blue man to slash birds with enhanced gore
function blueManSlashBird(bird, man) {
  // First use the regular slashBird but with enhanced parameters
  slashBird(bird, man.slashAngle, {x: 20, y: 0});
  
  // Then add extra gore effects specific to blue man attacks
  
  // Double the number of bird parts
  createBirdParts(bird.x + bird.width/2, bird.y + bird.height/2, bird.width);
  createBirdParts(bird.x + bird.width/2, bird.y + bird.height/2, bird.width);
  
  // Create additional organ parts with special details
  for (let i = 0; i < 4; i++) {
    const organSize = bird.width * (0.1 + Math.random() * 0.1);
    const organColor = Math.random() < 0.5 ? '#5c0000' : '#801414';
    
    const organType = Math.floor(Math.random() * 3);
    const isHeart = organType === 0;
    const isLiver = organType === 1;
    const isKidney = organType === 2;
    
    // Adjust velocity based on slash angle for realistic physics
    const velMultiplier = 3 + Math.random() * 3; // Stronger throw
    const partVX = Math.cos(man.slashAngle) * velMultiplier;
    const partVY = Math.sin(man.slashAngle) * velMultiplier - 4; // Extra upward force
    
    window.birdParts.push({
      x: bird.x + (Math.random() - 0.5) * bird.width,
      y: bird.y + (Math.random() - 0.5) * bird.height,
      width: organSize * (isHeart ? 1.2 : 1),
      height: organSize * (isHeart ? 1.1 : (isLiver ? 1.3 : 0.8)),
      vx: partVX + (Math.random() - 0.5) * 2,
      vy: partVY + (Math.random() - 0.5) * 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.4,
      onGround: false,
      groundY: canvas.height - organSize/2,
      color: organColor,
      hasBone: false,
      isOrgan: true,
      organType: organType,
      shadowOffset: 3,
      pulsingEffect: Math.random() < 0.5, // Some organs still pulsate
      pulseRate: 0.05 + Math.random() * 0.03,
      pulseSize: 0,
      initialScale: 1,
      bloodDrips: Array(3 + Math.floor(Math.random() * 4)).fill().map(() => ({
        x: (Math.random() - 0.5) * 0.8,
        y: (Math.random() - 0.5) * 0.8,
        size: 1 + Math.random() * 2,
        alpha: 0.7 + Math.random() * 0.3
      }))
    });
  }
  
  // Create more spectacular blood effects
  createStandardizedBloodEffect(bird.x + bird.width/2, bird.y + bird.height/2, bird.width * 3, 15);
  
  // Add a sliced-in-half bird body part
  const halfHeight = bird.height * 0.6;
  const cutAngle = man.slashAngle;
  
  // Top half of bird body
  window.birdParts.push({
    x: bird.x,
    y: bird.y,
    width: bird.width,
    height: halfHeight,
    vx: -Math.cos(cutAngle) * 2 + (Math.random() - 0.5),
    vy: -Math.sin(cutAngle) * 2 - 3 - Math.random() * 2,
    rotation: Math.random() * Math.PI * 0.5 - Math.PI * 0.25,
    rotSpeed: (Math.random() - 0.5) * 0.2,
    onGround: false,
    groundY: canvas.height - halfHeight/2,
    color: 'limegreen',
    hasBone: true,
    isHalfBody: true, // Special flag for half bodies
    isTopHalf: true,
    boneColor: '#f8f9fa',
    boneOffset: {x: 0, y: 0.2},
    boneWidth: bird.width * 0.3,
    bloodDrips: Array(5 + Math.floor(Math.random() * 6)).fill().map(() => ({
      x: (Math.random() - 0.5) * 0.8,
      y: 0.3 + Math.random() * 0.5, // Concentrated at the cut area
      size: 1.5 + Math.random() * 2.5,
      alpha: 0.9
    }))
  });
  
  // Bottom half of bird body
  window.birdParts.push({
    x: bird.x,
    y: bird.y + halfHeight * 0.7,
    width: bird.width,
    height: halfHeight,
    vx: Math.cos(cutAngle) * 2 + (Math.random() - 0.5),
    vy: Math.sin(cutAngle) * 3 + Math.random() * 2,
    rotation: Math.random() * Math.PI * 0.5 - Math.PI * 0.25,
    rotSpeed: (Math.random() - 0.5) * 0.2,
    onGround: false,
    groundY: canvas.height - halfHeight/2,
    color: 'limegreen',
    hasBone: true,
    isHalfBody: true,
    isTopHalf: false,
    boneColor: '#f8f9fa',
    boneOffset: {x: 0, y: -0.2},
    boneWidth: bird.width * 0.3,
    bloodDrips: Array(5 + Math.floor(Math.random() * 6)).fill().map(() => ({
      x: (Math.random() - 0.5) * 0.8,
      y: -0.3 - Math.random() * 0.5, // Concentrated at the cut area
      size: 1.5 + Math.random() * 2.5,
      alpha: 0.9
    }))
  });
  
  // Add many blood splatters
  for (let i = 0; i < 8; i++) {
    addPermanentBloodSplatter(
      bird.x + (Math.random() - 0.5) * bird.width * 5, 
      canvas.height,
      bird.width * (0.4 + Math.random() * 0.7)
    );
  }
  
  // Create trail of blood in the direction of slash
  for (let i = 0; i < 15; i++) {
    const distance = 30 + Math.random() * 100;
    const x = bird.x + bird.width/2 + Math.cos(man.slashAngle) * distance * (0.5 + Math.random() * 0.8);
    const y = bird.y + bird.height/2 + Math.sin(man.slashAngle) * distance * (0.3 + Math.random() * 0.5);
    
    particles.push({
      x: x,
      y: y,
      size: 2 + Math.random() * 5,
      vx: Math.cos(man.slashAngle) * (2 + Math.random() * 3),
      vy: Math.sin(man.slashAngle) * (2 + Math.random() * 3) - Math.random() * 3,
      life: 30 + Math.random() * 60,
      color: Math.random() < 0.3 ? '#450a0a' : '#a50e0e',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      type: 'blood'
    });
  }
}

// Now update the renderBirdPart function to handle the half-body special case
function renderBirdPart(part) {
  try {
    ctx.save();
    ctx.translate(part.x, part.y);
    ctx.rotate(part.rotation || 0);
    
    // Handle special case for half-bodies
    if (part.isHalfBody) {
      // Draw shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, part.groundY - part.y + 5, part.width * 0.6, part.height * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw the half bird body
      ctx.fillStyle = part.color || 'limegreen';
      
      if (part.isTopHalf) {
        // Top half with bones showing at bottom
        ctx.fillRect(-part.width/2, -part.height/2, part.width, part.height);
        
        // Draw bones and inside meat at the cut area
        ctx.fillStyle = '#cc3333'; // Inside meat
        ctx.beginPath();
        ctx.rect(-part.width/2, part.height/2 - 3, part.width, 6);
        ctx.fill();
        
        // Draw a few exposed bones
        ctx.fillStyle = part.boneColor || '#ffffff';
        for (let i = 0; i < 3; i++) {
          const boneX = -part.width/2 + part.width * (0.25 + i * 0.25);
          ctx.beginPath();
          ctx.rect(boneX - 2, part.height/2 - 6, 4, 9);
          ctx.fill();
        }
      } else {
        // Bottom half with bones showing at top
        ctx.fillRect(-part.width/2, -part.height/2, part.width, part.height);
        
        // Draw bones and inside meat at the cut area
        ctx.fillStyle = '#cc3333'; // Inside meat
        ctx.beginPath();
        ctx.rect(-part.width/2, -part.height/2 - 3, part.width, 6);
        ctx.fill();
        
        // Draw a few exposed bones
        ctx.fillStyle = part.boneColor || '#ffffff';
        for (let i = 0; i < 3; i++) {
          const boneX = -part.width/2 + part.width * (0.25 + i * 0.25);
          ctx.beginPath();
          ctx.rect(boneX - 2, -part.height/2 - 3, 4, 9);
          ctx.fill();
        }
      }
      
      // Add some details to the half-body
      if (part.isTopHalf) {
        // Draw eyes
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-part.width * 0.2, -part.height * 0.2, 2, 0, Math.PI * 2);
        if (Math.random() < 0.5) {
          ctx.arc(part.width * 0.2, -part.height * 0.2, 2, 0, Math.PI * 2);
        } else {
          // One eye popped out
          ctx.fill();
          
          // Popped out eye with string attached
          ctx.beginPath();
          const eyeX = part.width * 0.2 + (Math.random() - 0.5) * 10;
          const eyeY = -part.height * 0.2 + (Math.random() - 0.5) * 10;
          ctx.arc(eyeX, eyeY, 2, 0, Math.PI * 2);
          
          // String to eye
          ctx.moveTo(part.width * 0.2, -part.height * 0.2);
          ctx.lineTo(eyeX, eyeY);
          ctx.stroke();
        }
        ctx.fill();
      } else {
        // Draw legs
        ctx.fillStyle = 'green';
        ctx.fillRect(-part.width * 0.3, part.height * 0.2, part.width * 0.15, part.height * 0.3);
        ctx.fillRect(part.width * 0.15, part.height * 0.2, part.width * 0.15, part.height * 0.3);
      }
    } else {
      // Original renderBirdPart code
      // Draw shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      if (part.isOrgan) {
        // Oval shadow for organs
        ctx.beginPath();
        ctx.ellipse(0, part.groundY - part.y + 5, part.width * 0.6, part.height * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (part.isLongPart) {
        // Curved line shadow for long parts
        ctx.beginPath();
        ctx.ellipse(0, part.groundY - part.y + 5, part.width * 0.7, part.height * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Irregular shadow for meat chunks
        ctx.beginPath();
        ctx.ellipse(0, part.groundY - part.y + 5, part.width * 0.5, part.height * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Handle pulsing organs
      let scale = 1;
      if (part.isOrgan && part.pulsingEffect) {
        part.pulseSize = Math.sin(Date.now() * part.pulseRate) * 0.1;
        scale = 1 + part.pulseSize;
        ctx.scale(scale, scale);
      }
      
      // Draw the part based on its type
      ctx.fillStyle = part.color || '#a50e0e';
      
      if (part.isOrgan) {
        // Draw different organ shapes
        switch (part.organType) {
          case 0: // Heart-like shape
            drawHeartLikeOrgan(ctx, part);
            break;
          case 1: // Kidney-like shape
            drawKidneyLikeOrgan(ctx, part);
            break;
          case 2: // Liver-like shape
            drawLiverLikeOrgan(ctx, part);
            break;
          default:
            // Fallback for unknown organ type
            ctx.beginPath();
            ctx.ellipse(0, 0, part.width * 0.5, part.height * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add highlights to organs to make them look wet/shiny
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(-part.width * 0.25, -part.height * 0.25, part.width * 0.15, part.height * 0.1, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        
      } else if (part.isLongPart) {
        // Draw intestine or tendon-like part (curved)
        drawLongOrganicPart(ctx, part);
        
      } else {
        // Draw irregular meat chunk
        drawMeatChunk(ctx, part);
        
        // Draw bone if this part has one
        if (part.hasBone) {
          ctx.fillStyle = part.boneColor || '#ffffff';
          ctx.beginPath();
          
          // Position the bone with offset values
          const boneOffset = part.boneOffset || {x: 0, y: 0};
          const boneX = part.width * boneOffset.x;
          const boneY = part.height * boneOffset.y;
          
          // Draw rounded bone shape
          ctx.ellipse(
            boneX, 
            boneY, 
            part.boneWidth * 0.5 || 2, 
            part.boneWidth * 0.3 || 1, 
            0, 0, Math.PI * 2
          );
          ctx.fill();
        }
      }
    }
    
    // Draw blood drips on any type of part
    ctx.fillStyle = '#a00';
    if (part.bloodDrips) {
      for (const drip of part.bloodDrips) {
        if (!drip) continue;
        ctx.globalAlpha = drip.alpha || 0.7; // Default alpha if missing
        ctx.beginPath();
        ctx.ellipse(
          (drip.x || 0) * (part.width || 10), 
          (drip.y || 0) * (part.height || 10), 
          drip.size || 1, 
          (drip.size || 1) * 1.5, 
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;
    
    ctx.restore();
  } catch (err) {
    console.error('Error rendering bird part:', err);
  }
}

// Start the game
update(); 