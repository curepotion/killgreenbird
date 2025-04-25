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
const bears = [];
const bullets = [];
const particles = [];
const explosions = [];
const gravity = 0.5;
let autoFire = false;

// Game difficulty settings that will scale with level
const gameDifficulty = {
  maxBirds: 30,
  maxBears: 5,
  birdSpawnRate: 0.8,  // Seconds between spawns
  bearSpawnRate: 0.02, // Chance per interval
  lastBirdSpawn: 0,
  lastBearCheck: 0
};

// Upgrade system
const upgradeSystem = {
  birdsKilled: 0,
  bearsKilled: 0,
  totalBirdsKilled: 0, // Track total birds killed for special upgrades
  level: 1,
  maxLevel: 4, // Increased max level to include knife upgrade
  requireBirdsToUpgrade: 5,
  requireBearsToUpgrade: 1,
  
  addKill: function(type) {
    if (type === 'bird') {
      this.birdsKilled++;
      this.totalBirdsKilled++;
      
      // Check for special knife upgrade based on total birds killed
      if (this.totalBirdsKilled >= 50 && this.level === 3) {
        this.level = 4;
        this.birdsKilled = 0;
        this.bearsKilled = 0;
        
        // Double the number of birds and bears when leveling up
        this.doubleDifficulty();
        
        // Display special upgrade message
        const upgradeMsg = document.getElementById('upgradeMessage');
        upgradeMsg.textContent = `ULTIMATE POWER!`;
        upgradeMsg.style.opacity = 1;
        
        setTimeout(() => {
          upgradeMsg.style.opacity = 0;
        }, 4000);
      }
    } else if (type === 'bear') {
      this.bearsKilled++;
    }
    
    // Check for regular upgrade
    if (this.birdsKilled >= this.requireBirdsToUpgrade || 
        this.bearsKilled >= this.requireBearsToUpgrade) {
      this.upgrade();
    }
  },
  
  upgrade: function() {
    if (this.level < this.maxLevel && this.level < 3) { // Only upgrade to level 3 through normal means
      this.level++;
      this.birdsKilled = 0;
      this.bearsKilled = 0;
      
      // Double the number of birds and bears when leveling up
      this.doubleDifficulty();
      
      // Display upgrade message
      const upgradeMsg = document.getElementById('upgradeMessage');
      upgradeMsg.textContent = `POWERED UP!`;
      upgradeMsg.style.opacity = 1;
      
      setTimeout(() => {
        upgradeMsg.style.opacity = 0;
      }, 3000);
      
      // Update wave display immediately
      const waveNumber = document.getElementById('waveNumber');
      if (waveNumber) {
        waveNumber.textContent = this.level;
      }
    }
  },
  
  doubleDifficulty: function() {
    // Double the maximum birds and bears
    gameDifficulty.maxBirds *= 2;
    gameDifficulty.maxBears *= 2;
    
    // Increase spawn rates (decrease time between spawns)
    gameDifficulty.birdSpawnRate /= 1.5;
    gameDifficulty.bearSpawnRate *= 1.5;
    
    // Spawn a bunch of new birds and bears immediately to show the increased numbers
    const newBirdsToSpawn = Math.min(20, gameDifficulty.maxBirds - birds.length);
    const newBearsToSpawn = Math.min(5, gameDifficulty.maxBears - bears.length);
    
    // Spawn new birds in random positions
    for (let i = 0; i < newBirdsToSpawn; i++) {
      setTimeout(() => {
        if (birds.length < gameDifficulty.maxBirds) {
          spawnBird();
        }
      }, i * 100); // Stagger the spawns for visual effect
    }
    
    // Spawn new bears
    for (let i = 0; i < newBearsToSpawn; i++) {
      setTimeout(() => {
        if (bears.length < gameDifficulty.maxBears) {
          spawnBear();
        }
      }, i * 300); // Bigger delay for bears
    }
  },
  
  reset: function() {
    this.birdsKilled = 0;
    this.bearsKilled = 0;
    this.totalBirdsKilled = 0;
    this.level = 1;
    
    // Reset difficulty settings
    gameDifficulty.maxBirds = 30;
    gameDifficulty.maxBears = 5;
    gameDifficulty.birdSpawnRate = 0.8;
    gameDifficulty.bearSpawnRate = 0.02;
  }
};

// Expose upgradeSystem to the global scope so HTML can access it
window.upgradeSystem = upgradeSystem;

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

function spawnBear() {
  const size = 60 + Math.random() * 40;
  bears.push({
    x: Math.random() * (canvas.width - size),
    y: canvas.height - size,
    width: size,
    height: size,
    speed: 0.3 + Math.random() * 0.3,
    hp: 30,
    bloodMarks: []
  });
}

function createExplosion(x, y, radius) {
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
  
  // Different weapon behaviors based on upgrade level
  switch(upgradeSystem.level) {
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
  
  switch(upgradeSystem.level) {
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

function drawBear(b) {
  const { x, y, width: w, height: h } = b;
  ctx.fillStyle = '#333';
  ctx.fillRect(x + w * 0.2, y + h * 0.3, w * 0.6, h * 0.6); // Body

  // Head
  ctx.fillStyle = '#222';
  ctx.fillRect(x + w * 0.3, y + h * 0.1, w * 0.4, h * 0.3);

  // Ears
  ctx.fillStyle = '#111';
  ctx.fillRect(x + w * 0.25, y + h * 0.05, w * 0.1, h * 0.1);
  ctx.fillRect(x + w * 0.65, y + h * 0.05, w * 0.1, h * 0.1);

  // Eyes
  ctx.fillStyle = 'white';
  ctx.fillRect(x + w * 0.35, y + h * 0.18, 3, 3);
  ctx.fillRect(x + w * 0.55, y + h * 0.18, 3, 3);
  ctx.fillStyle = 'black';
  ctx.fillRect(x + w * 0.36, y + h * 0.19, 1, 1);
  ctx.fillRect(x + w * 0.56, y + h * 0.19, 1, 1);

  // Nose
  ctx.fillStyle = 'darkred';
  ctx.fillRect(x + w * 0.47, y + h * 0.25, 4, 3);

  // Feet
  ctx.fillStyle = '#111';
  ctx.fillRect(x + w * 0.25, y + h * 0.9, w * 0.15, h * 0.1);
  ctx.fillRect(x + w * 0.6, y + h * 0.9, w * 0.15, h * 0.1);

  for (let mark of b.bloodMarks) {
    ctx.fillStyle = 'darkred';
    ctx.fillRect(x + mark.x * w, y + mark.y * h, mark.size, mark.size);
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

function drawUpgradeProgress() {
  // Draw progress bar at top right
  const barWidth = 150;
  const barHeight = 20;
  const x = canvas.width - barWidth - 20;
  const y = 20;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x, y, barWidth, barHeight);
  
  // Progress
  let progress;
  if (upgradeSystem.level < upgradeSystem.maxLevel) {
    if (upgradeSystem.level === 3) {
      // For level 3, show progress toward knife upgrade
      progress = Math.min(1, upgradeSystem.totalBirdsKilled / 50);
    } else {
      progress = Math.max(
        upgradeSystem.birdsKilled / upgradeSystem.requireBirdsToUpgrade,
        upgradeSystem.bearsKilled / upgradeSystem.requireBearsToUpgrade
      );
    }
  } else {
    progress = 1; // Max level reached
  }
  
  ctx.fillStyle = upgradeSystem.level >= upgradeSystem.maxLevel ? 'gold' : 'lime';
  ctx.fillRect(x, y, barWidth * progress, barHeight);
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
  fireWeapon(mouseX, mouseY);
});

// Game loop
function update() {
  const now = Date.now();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw character
  drawCharacter();
  
  // Draw upgrade progress
  drawUpgradeProgress();

  // Spawn birds based on spawn rate
  if (now - gameDifficulty.lastBirdSpawn > gameDifficulty.birdSpawnRate * 1000) {
    if (birds.length < gameDifficulty.maxBirds) {
      spawnBird();
    }
    gameDifficulty.lastBirdSpawn = now;
  }
  
  // Spawn bears based on chance
  if (now - gameDifficulty.lastBearCheck > 800) { // Check every 800ms
    if (bears.length < gameDifficulty.maxBears && Math.random() < gameDifficulty.bearSpawnRate) {
      spawnBear();
    }
    gameDifficulty.lastBearCheck = now;
  }

  // Update birds
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

  // Update bears
  for (let bear of bears) {
    bear.x += bear.speed;
    if (bear.x > canvas.width) bear.x = -bear.width;
    drawBear(bear);
  }

  // Update bird parts from slashing
  updateBirdParts();

  // Update bullets and check collisions
  for (let i = bullets.length - 1; i >= 0; i--) {
    let blt = bullets[i];
    // Update bullet position based on angle
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
        // For knives, slice birds in half with more blood
        if (blt.type === 'knife') {
          // Create a dramatic slicing effect
          slashBird(bird, blt.angle + blt.rotation);
          
          // Remove bird immediately
          spawnJuice(bird.x + bird.width / 2, bird.y + bird.height / 2);
          birds.splice(j, 1);
          upgradeSystem.addKill('bird');
          
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
          createBloodEffect(bird.x + bird.width/2, bird.y + bird.height/2, 5 + Math.random() * 5);
        }
        
        // Create explosion ONLY if it's a missile or if weapon level is 2+ and bird was hit twice
        if (blt.type === 'missile' || (upgradeSystem.level >= 2 && bird.hitCount >= 2)) {
          const explosionRadius = blt.type === 'missile' ? blt.explosionRadius : 50;
          createExplosion(bird.x + bird.width/2, bird.y + bird.height/2, explosionRadius);
        }
        
        bullets.splice(i, 1);
        
        if (bird.hp <= 0) {
          // Always create a bigger explosion when bird dies
          if (upgradeSystem.level >= 2) {
            createBirdExplosion(bird.x + bird.width/2, bird.y + bird.height/2, bird.width);
          } else {
            // For level 1 weapon, just create a larger blood effect without explosion
            createBloodEffect(bird.x + bird.width/2, bird.y + bird.height/2, bird.width * 1.5);
            spawnJuice(bird.x + bird.width/2, bird.y + bird.height/2);
          }
          
          birds.splice(j, 1);
          upgradeSystem.addKill('bird');
        }
        break;
      }
    }

    // Check collisions with bears
    if (i >= 0) { // Make sure bullet still exists after bird collision checks
      for (let k = bears.length - 1; k >= 0; k--) {
        let bear = bears[k];
        if (isColliding(blt, bear)) {
          bear.hp -= blt.type === 'missile' ? 15 : 1; // Missiles do more damage
          bear.bloodMarks.push({
            x: Math.random(),
            y: Math.random(),
            size: 2 + Math.random() * 4
          });
          
          // Create explosion if it's a missile
          if (blt.type === 'missile') {
            createExplosion(blt.x, blt.y, blt.explosionRadius);
          }
          
          bullets.splice(i, 1);
          
          if (bear.hp <= 0) {
            spawnJuice(bear.x + bear.width / 2, bear.y + bear.height / 2);
            bears.splice(k, 1);
            upgradeSystem.addKill('bear');
          }
          break;
        }
      }
    }
  }
  
  // Update explosions and check for area damage
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
          birds.splice(j, 1);
          upgradeSystem.addKill('bird');
        }
      }
    }
    
    // Area damage to bears
    for (let k = bears.length - 1; k >= 0; k--) {
      let bear = bears[k];
      if (isInExplosionRadius(explosion, bear)) {
        bear.hp -= 0.5;
        if (bear.hp <= 0) {
          spawnJuice(bear.x + bear.width / 2, bear.y + bear.height / 2);
          bears.splice(k, 1);
          upgradeSystem.addKill('bear');
        }
      }
    }
  }

  // Update particles
  updateParticles();

  requestAnimationFrame(update);
}

// Add a special bird explosion function
function createBirdExplosion(x, y, size) {
  // Create main explosion
  createExplosion(x, y, size * 2.5);
  
  // Create blood particles
  spawnJuice(x, y);
  
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
}

// Update the particle drawing to handle feathers
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15; // Slower gravity for feathers
    p.life--;
    
    if (p.color) {
      // This is a feather
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      p.rotation += p.rotSpeed;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size/2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // This is a blood particle
      ctx.fillStyle = 'red';
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// Add a function to create blood effects without explosions
function createBloodEffect(x, y, size) {
  const bloodCount = Math.floor(size * 1.5);
  for (let i = 0; i < bloodCount; i++) {
    particles.push({
      x: x,
      y: y,
      size: 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5 - 1,
      life: 30 + Math.random() * 20,
      color: 'red',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.1
    });
  }
}

// Create a function for slashing birds in half
function slashBird(bird, angle) {
  // Create a slashing line to visually cut the bird
  const slashLine = {
    x1: bird.x,
    y1: bird.y + bird.height / 2 + Math.sin(angle) * bird.height,
    x2: bird.x + bird.width,
    y2: bird.y + bird.height / 2 - Math.sin(angle) * bird.height,
    life: 10,
    alpha: 1.0
  };
  
  // Add the slash line to a new array for rendering
  if (!window.slashLines) window.slashLines = [];
  window.slashLines.push(slashLine);
  
  // Create extra blood for the slash
  const slashBloodCount = Math.floor(bird.width * 2);
  for (let i = 0; i < slashBloodCount; i++) {
    const xPos = bird.x + (i / slashBloodCount) * bird.width;
    const yPos = bird.y + bird.height / 2 + Math.sin(angle + i) * (bird.height / 2);
    
    // Directional blood spray perpendicular to slash angle
    const perpAngle = angle + Math.PI / 2;
    const speed = 1 + Math.random() * 3;
    const vx = Math.cos(perpAngle) * speed + (Math.random() - 0.5) * 2;
    const vy = Math.sin(perpAngle) * speed + (Math.random() - 0.5) * 2;
    
    particles.push({
      x: xPos,
      y: yPos,
      size: 2 + Math.random() * 3,
      vx: vx,
      vy: vy,
      life: 40 + Math.random() * 60,
      color: 'darkred',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.1
    });
  }
  
  // If the bird had a speech bubble, create a floating text that slowly fades
  if (bird.hasSpeech && bird.speechVisible) {
    const speechBubble = {
      text: bird.speechText,
      x: bird.x + bird.width / 2,
      y: bird.y - 30,
      vx: -1 + Math.random() * 2,
      vy: -2 - Math.random() * 2,
      alpha: 1.0,
      life: 60
    };
    
    if (!window.floatingSpeech) window.floatingSpeech = [];
    window.floatingSpeech.push(speechBubble);
  }
  
  // Create two halves of the bird that fall apart
  const topHalf = {
    x: bird.x,
    y: bird.y,
    width: bird.width,
    height: bird.height / 2,
    vx: -1 + Math.random() * 2,
    vy: -4 - Math.random() * 2,
    rotation: -0.1,
    rotSpeed: -0.05 - Math.random() * 0.1,
    life: 60
  };
  
  const bottomHalf = {
    x: bird.x,
    y: bird.y + bird.height / 2,
    width: bird.width,
    height: bird.height / 2,
    vx: 1 + Math.random() * 2,
    vy: 2 + Math.random() * 3,
    rotation: 0.1,
    rotSpeed: 0.05 + Math.random() * 0.1,
    life: 60
  };
  
  if (!window.birdParts) window.birdParts = [];
  window.birdParts.push(topHalf, bottomHalf);
}

// Update the bird parts and floating speech in the animation loop
function updateBirdParts() {
  if (!window.birdParts) window.birdParts = [];
  if (!window.slashLines) window.slashLines = [];
  if (!window.floatingSpeech) window.floatingSpeech = [];
  
  // Update slash lines
  for (let i = window.slashLines.length - 1; i >= 0; i--) {
    const slash = window.slashLines[i];
    slash.life--;
    slash.alpha -= 0.1;
    
    // Draw slash line
    ctx.strokeStyle = `rgba(255, 255, 255, ${slash.alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(slash.x1, slash.y1);
    ctx.lineTo(slash.x2, slash.y2);
    ctx.stroke();
    
    if (slash.life <= 0) {
      window.slashLines.splice(i, 1);
    }
  }
  
  // Update floating speech bubbles
  for (let i = window.floatingSpeech.length - 1; i >= 0; i--) {
    const speech = window.floatingSpeech[i];
    speech.x += speech.vx;
    speech.y += speech.vy;
    speech.life--;
    speech.alpha = speech.life / 60; // Fade out
    
    // Draw the floating text
    ctx.fillStyle = `rgba(255, 255, 255, ${speech.alpha})`;
    ctx.beginPath();
    ctx.roundRect(speech.x - ctx.measureText(speech.text).width/2 - 10, speech.y - 15, 
                 ctx.measureText(speech.text).width + 20, 30, 5);
    ctx.fill();
    
    ctx.fillStyle = `rgba(0, 0, 0, ${speech.alpha})`;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(speech.text, speech.x, speech.y);
    
    if (speech.life <= 0) {
      window.floatingSpeech.splice(i, 1);
    }
  }
  
  // Update bird parts
  for (let i = window.birdParts.length - 1; i >= 0; i--) {
    const part = window.birdParts[i];
    part.x += part.vx;
    part.y += part.vy;
    part.vy += 0.2; // gravity
    part.rotation += part.rotSpeed;
    part.life--;
    
    // Draw bird part
    ctx.save();
    ctx.translate(part.x + part.width / 2, part.y + part.height / 2);
    ctx.rotate(part.rotation);
    ctx.fillStyle = 'limegreen';
    ctx.fillRect(-part.width / 2, -part.height / 2, part.width, part.height);
    ctx.restore();
    
    // Create blood drips
    if (Math.random() < 0.3) {
      particles.push({
        x: part.x + part.width / 2,
        y: part.y + part.height / 2,
        size: 2 + Math.random() * 2,
        vx: part.vx * 0.5,
        vy: 1 + Math.random() * 2,
        life: 20 + Math.random() * 20,
        color: 'red',
        rotation: 0,
        rotSpeed: 0
      });
    }
    
    if (part.life <= 0) {
      window.birdParts.splice(i, 1);
    }
  }
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

// Start the game
update(); 