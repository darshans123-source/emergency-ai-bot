import * as THREE from 'three';

// -------------------------------------------------------------
// Procedural Textures (Zero External File Dependencies)
// -------------------------------------------------------------

/**
 * Procedural asphalt texture with subtle road noise and white/yellow lane markings
 */
export function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base asphalt dark grey
  ctx.fillStyle = '#171c26';
  ctx.fillRect(0, 0, 512, 512);

  // Noise flecks
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const gray = Math.floor(18 + Math.random() * 22);
    ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
    ctx.fillRect(x, y, Math.random() > 0.8 ? 2 : 1, Math.random() > 0.8 ? 2 : 1);
  }

  // Tactical lane stripes
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(16, 240, 480, 8); // White shoulder line
  ctx.fillRect(16, 264, 480, 8);

  // Yellow dashed centerline
  ctx.fillStyle = '#f59e0b';
  for (let x = 20; x < 500; x += 60) {
    ctx.fillRect(x, 252, 35, 6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural hazard stripe texture (diagonal black & safety yellow)
 */
export function createHazardStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f59e0b'; // Amber yellow
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#0f172a'; // Slate black
  const stripeWidth = 32;
  for (let i = -256; i < 512; i += stripeWidth * 2) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + stripeWidth, 0);
    ctx.lineTo(i + stripeWidth + 256, 256);
    ctx.lineTo(i + 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Soft radial contact shadow texture
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
  gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.1)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// -------------------------------------------------------------
// Contact Shadow Mesh Helper
// -------------------------------------------------------------
export function createContactShadow(width: number, length: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, length);
  const material = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const shadow = new THREE.Mesh(geometry, material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015; // Flush with ground, zero Z-fighting
  shadow.renderOrder = 1;
  return shadow;
}

// -------------------------------------------------------------
// Composite Procedural Models (3 to 12 Distinct Parts)
// -------------------------------------------------------------

export interface ExplodedPart {
  mesh: THREE.Object3D;
  originalPosition: THREE.Vector3;
  targetOffset: THREE.Vector3;
}

export interface VehicleAssembly {
  group: THREE.Group;
  explodedParts: ExplodedPart[];
  strobeMeshes: THREE.Mesh[];
  headlights: THREE.Mesh[];
}

/**
 * 1. ALS Ambulance (Medic Unit 1)
 * 8 distinct sub-assemblies:
 * - Chassis / frame
 * - Driver cab & hood
 * - Tinted windshield & side windows
 * - Medical modular box bay with side doors
 * - Front push-bumper & grille
 * - Aerodynamic rooftop emergency strobe lightbar
 * - Front & rear wheels with silver alloy rims
 * - Contact shadow
 */
export function buildAmbulance(): VehicleAssembly {
  const group = new THREE.Group();
  const explodedParts: ExplodedPart[] = [];
  const strobeMeshes: THREE.Mesh[] = [];
  const headlights: THREE.Mesh[] = [];

  // PBR Materials
  const paintWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.15,
  });
  const paintOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48, // Emergency fluorescent red/orange
    roughness: 0.3,
    metalness: 0.1,
  });
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.8,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.2,
    transmission: 0.6,
    transparent: true,
    opacity: 0.85,
    ior: 1.5,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.95,
  });
  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.85,
    metalness: 0.05,
  });
  const strobeRedMat = new THREE.MeshStandardMaterial({
    color: 0xff0033,
    emissive: 0xff0022,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });
  const strobeBlueMat = new THREE.MeshStandardMaterial({
    color: 0x0088ff,
    emissive: 0x0066ff,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 2.0,
    roughness: 0.1,
  });

  // 1. Chassis
  const chassisGeom = new THREE.BoxGeometry(2.0, 0.35, 4.8);
  const chassis = new THREE.Mesh(chassisGeom, chassisMat);
  chassis.position.set(0, 0.45, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);
  explodedParts.push({
    mesh: chassis,
    originalPosition: chassis.position.clone(),
    targetOffset: new THREE.Vector3(0, -0.2, 0),
  });

  // 2. Driver Cab
  const cabGeom = new THREE.BoxGeometry(2.1, 1.25, 1.8);
  const cab = new THREE.Mesh(cabGeom, paintWhiteMat);
  cab.position.set(0, 1.25, 1.3);
  cab.castShadow = true;
  cab.receiveShadow = true;
  group.add(cab);
  explodedParts.push({
    mesh: cab,
    originalPosition: cab.position.clone(),
    targetOffset: new THREE.Vector3(0, 0.8, 1.2),
  });

  // 3. Windshield & Cab Windows
  const windshieldGeom = new THREE.BoxGeometry(1.95, 0.65, 0.25);
  const windshield = new THREE.Mesh(windshieldGeom, glassMat);
  windshield.position.set(0, 1.45, 2.2);
  windshield.rotation.x = -Math.PI / 12;
  windshield.castShadow = true;
  group.add(windshield);
  explodedParts.push({
    mesh: windshield,
    originalPosition: windshield.position.clone(),
    targetOffset: new THREE.Vector3(0, 1.2, 1.8),
  });

  // 4. Medical Bay Modular Box
  const boxGeom = new THREE.BoxGeometry(2.25, 1.75, 3.1);
  const box = new THREE.Mesh(boxGeom, paintWhiteMat);
  box.position.set(0, 1.5, -0.9);
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  // Red/Orange Medical Chevron Stripe on Box sides
  const stripeGeom = new THREE.BoxGeometry(2.27, 0.35, 3.12);
  const stripe = new THREE.Mesh(stripeGeom, paintOrangeMat);
  stripe.position.set(0, 1.35, -0.9);
  group.add(stripe);

  const boxAssembly = new THREE.Group();
  boxAssembly.add(box);
  boxAssembly.add(stripe);
  group.add(boxAssembly);
  explodedParts.push({
    mesh: boxAssembly,
    originalPosition: boxAssembly.position.clone(),
    targetOffset: new THREE.Vector3(0, 1.4, -1.0),
  });

  // 5. Front Bumper & Chrome Grille
  const bumperGeom = new THREE.BoxGeometry(2.2, 0.4, 0.4);
  const bumper = new THREE.Mesh(bumperGeom, chromeMat);
  bumper.position.set(0, 0.5, 2.45);
  bumper.castShadow = true;
  group.add(bumper);

  // Headlights
  const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), headlightMat);
  hlLeft.position.set(-0.75, 0.65, 2.48);
  const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), headlightMat);
  hlRight.position.set(0.75, 0.65, 2.48);
  group.add(hlLeft);
  group.add(hlRight);
  headlights.push(hlLeft, hlRight);

  // 6. Emergency Strobe Lightbar on Cab & Box
  const lightbarGeom = new THREE.BoxGeometry(1.6, 0.18, 0.35);
  const lightbarBase = new THREE.Mesh(lightbarGeom, chromeMat);
  lightbarBase.position.set(0, 1.95, 1.25);
  group.add(lightbarBase);

  const strobeL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.25), strobeRedMat);
  strobeL.position.set(-0.4, 1.96, 1.25);
  const strobeR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.25), strobeBlueMat);
  strobeR.position.set(0.4, 1.96, 1.25);
  group.add(strobeL);
  group.add(strobeR);
  strobeMeshes.push(strobeL, strobeR);

  // Rear roof beacons
  const rearBeaconL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), strobeRedMat);
  rearBeaconL.position.set(-0.95, 2.45, -2.4);
  const rearBeaconR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), strobeBlueMat);
  rearBeaconR.position.set(0.95, 2.45, -2.4);
  group.add(rearBeaconL);
  group.add(rearBeaconR);
  strobeMeshes.push(rearBeaconL, rearBeaconR);

  const lightbarGroup = new THREE.Group();
  lightbarGroup.add(lightbarBase);
  lightbarGroup.add(strobeL);
  lightbarGroup.add(strobeR);
  group.add(lightbarGroup);
  explodedParts.push({
    mesh: lightbarGroup,
    originalPosition: lightbarGroup.position.clone(),
    targetOffset: new THREE.Vector3(0, 2.2, 1.2),
  });

  // 7. Wheels & Rims (4 wheels)
  const wheelPositions = [
    [-1.05, 0.42, 1.5],  // Front Left
    [1.05, 0.42, 1.5],   // Front Right
    [-1.05, 0.42, -1.5], // Rear Left
    [1.05, 0.42, -1.5],  // Rear Right
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheelGroup = new THREE.Group();
    // Tire
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 24), rubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.33, 16), chromeMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    wheelGroup.position.set(x, y, z);
    group.add(wheelGroup);

    explodedParts.push({
      mesh: wheelGroup,
      originalPosition: wheelGroup.position.clone(),
      targetOffset: new THREE.Vector3(x > 0 ? 0.7 : -0.7, 0, 0),
    });
  });

  // 8. Contact Shadow
  const shadow = createContactShadow(2.8, 5.4);
  group.add(shadow);

  return { group, explodedParts, strobeMeshes, headlights };
}

/**
 * 2. Heavy Fire Engine (Engine 3)
 * Heavy cabin, equipment body, roof ladder, water cannon monitor, dual rear axles
 */
export function buildFireEngine(): VehicleAssembly {
  const group = new THREE.Group();
  const explodedParts: ExplodedPart[] = [];
  const strobeMeshes: THREE.Mesh[] = [];
  const headlights: THREE.Mesh[] = [];

  const paintRedMat = new THREE.MeshStandardMaterial({
    color: 0xd91616,
    roughness: 0.22,
    metalness: 0.2,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.1,
    metalness: 0.95,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    roughness: 0.1,
    metalness: 0.3,
    transmission: 0.6,
    transparent: true,
    opacity: 0.85,
  });
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.7,
    metalness: 0.7,
  });
  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.9,
    metalness: 0.05,
  });
  const strobeRedMat = new THREE.MeshStandardMaterial({
    color: 0xff0022,
    emissive: 0xff0022,
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });
  const strobeAmberMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xff8800,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 2.0,
  });

  // Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.45, 6.8), chassisMat);
  chassis.position.set(0, 0.55, 0);
  chassis.castShadow = true;
  group.add(chassis);
  explodedParts.push({
    mesh: chassis,
    originalPosition: chassis.position.clone(),
    targetOffset: new THREE.Vector3(0, -0.25, 0),
  });

  // Heavy Snub-Nose Crew Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.6, 2.4), paintRedMat);
  cab.position.set(0, 1.55, 2.0);
  cab.castShadow = true;
  group.add(cab);
  explodedParts.push({
    mesh: cab,
    originalPosition: cab.position.clone(),
    targetOffset: new THREE.Vector3(0, 0.9, 1.5),
  });

  // Cab Glass
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 0.3), glassMat);
  windshield.position.set(0, 1.75, 3.1);
  group.add(windshield);
  explodedParts.push({
    mesh: windshield,
    originalPosition: windshield.position.clone(),
    targetOffset: new THREE.Vector3(0, 1.3, 2.2),
  });

  // Water Tender & Equipment Body
  const bodyGroup = new THREE.Group();
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.38, 1.75, 4.2), paintRedMat);
  mainBody.position.set(0, 1.65, -1.2);
  mainBody.castShadow = true;
  bodyGroup.add(mainBody);

  // Roll-up shutter compartments (chrome doors)
  const shutterL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 3.6), chromeMat);
  shutterL.position.set(-1.18, 1.5, -1.2);
  const shutterR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 3.6), chromeMat);
  shutterR.position.set(1.18, 1.5, -1.2);
  bodyGroup.add(shutterL);
  bodyGroup.add(shutterR);
  group.add(bodyGroup);
  explodedParts.push({
    mesh: bodyGroup,
    originalPosition: bodyGroup.position.clone(),
    targetOffset: new THREE.Vector3(0, 1.4, -1.2),
  });

  // Telescopic Roof Ladder
  const ladderGroup = new THREE.Group();
  const ladderRailL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 4.4), chromeMat);
  ladderRailL.position.set(-0.35, 2.65, -0.9);
  const ladderRailR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 4.4), chromeMat);
  ladderRailR.position.set(0.35, 2.65, -0.9);
  ladderGroup.add(ladderRailL, ladderRailR);
  for (let z = -2.8; z <= 1.0; z += 0.35) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), chromeMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, 2.65, z);
    ladderGroup.add(rung);
  }
  group.add(ladderGroup);
  explodedParts.push({
    mesh: ladderGroup,
    originalPosition: ladderGroup.position.clone(),
    targetOffset: new THREE.Vector3(0, 2.6, 0),
  });

  // Water Monitor / Cannon Turret
  const turretGroup = new THREE.Group();
  const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.25, 16), chromeMat);
  turretBase.position.set(0, 2.6, 1.2);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.7, 12), chromeMat);
  nozzle.rotation.x = Math.PI / 3;
  nozzle.position.set(0, 2.8, 1.45);
  turretGroup.add(turretBase, nozzle);
  group.add(turretGroup);
  explodedParts.push({
    mesh: turretGroup,
    originalPosition: turretGroup.position.clone(),
    targetOffset: new THREE.Vector3(0, 2.2, 1.4),
  });

  // Strobe Lightbar on Fire Engine Roof
  const fireStrobeL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.3), strobeRedMat);
  fireStrobeL.position.set(-0.6, 2.45, 2.0);
  const fireStrobeR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.3), strobeAmberMat);
  fireStrobeR.position.set(0.6, 2.45, 2.0);
  group.add(fireStrobeL, fireStrobeR);
  strobeMeshes.push(fireStrobeL, fireStrobeR);

  // Front Winch & Headlights
  const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 16), chromeMat);
  winch.rotation.z = Math.PI / 2;
  winch.position.set(0, 0.65, 3.4);
  group.add(winch);

  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.1), headlightMat);
  hlL.position.set(-0.85, 0.7, 3.25);
  const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.1), headlightMat);
  hlR.position.set(0.85, 0.7, 3.25);
  group.add(hlL, hlR);
  headlights.push(hlL, hlR);

  // 6 Heavy Wheels (Dual Rear Axle)
  const engineWheels = [
    [-1.15, 0.52, 2.0],   // Front L
    [1.15, 0.52, 2.0],    // Front R
    [-1.15, 0.52, -1.2],  // Mid Rear L
    [1.15, 0.52, -1.2],   // Mid Rear R
    [-1.15, 0.52, -2.4],  // Far Rear L
    [1.15, 0.52, -2.4],   // Far Rear R
  ];

  engineWheels.forEach(([x, y, z]) => {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.38, 24), rubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 16), chromeMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    wheelGroup.position.set(x, y, z);
    group.add(wheelGroup);

    explodedParts.push({
      mesh: wheelGroup,
      originalPosition: wheelGroup.position.clone(),
      targetOffset: new THREE.Vector3(x > 0 ? 0.8 : -0.8, 0, 0),
    });
  });

  // Contact Shadow
  const shadow = createContactShadow(3.0, 7.4);
  group.add(shadow);

  return { group, explodedParts, strobeMeshes, headlights };
}

/**
 * 3. Police Patrol Interceptor (Patrol 101)
 * Aerodynamic cruiser body, push bumper, alloy rims, roof LED lightbar
 */
export function buildPoliceCruiser(): VehicleAssembly {
  const group = new THREE.Group();
  const explodedParts: ExplodedPart[] = [];
  const strobeMeshes: THREE.Mesh[] = [];
  const headlights: THREE.Mesh[] = [];

  const paintBlackMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.2,
    metalness: 0.3,
  });
  const paintWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.2,
    metalness: 0.2,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.95,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x020617,
    roughness: 0.05,
    metalness: 0.4,
    transmission: 0.7,
    transparent: true,
    opacity: 0.9,
  });
  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.85,
    metalness: 0.05,
  });
  const strobeRedMat = new THREE.MeshStandardMaterial({
    color: 0xff0022,
    emissive: 0xff0022,
    emissiveIntensity: 3.0,
  });
  const strobeBlueMat = new THREE.MeshStandardMaterial({
    color: 0x0066ff,
    emissive: 0x0066ff,
    emissiveIntensity: 3.0,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 2.2,
  });

  // Lower Chassis & Body (Black)
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 4.4), paintBlackMat);
  lowerBody.position.set(0, 0.45, 0);
  lowerBody.castShadow = true;
  group.add(lowerBody);
  explodedParts.push({
    mesh: lowerBody,
    originalPosition: lowerBody.position.clone(),
    targetOffset: new THREE.Vector3(0, -0.2, 0),
  });

  // Mid Body Doors (White police doors)
  const doors = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.4, 2.2), paintWhiteMat);
  doors.position.set(0, 0.65, -0.1);
  group.add(doors);

  // Cabin Canopy & Roof
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), paintBlackMat);
  canopy.position.set(0, 1.05, -0.25);
  canopy.castShadow = true;
  group.add(canopy);
  explodedParts.push({
    mesh: canopy,
    originalPosition: canopy.position.clone(),
    targetOffset: new THREE.Vector3(0, 0.9, 0),
  });

  // Windshield & Rear Window
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.45, 0.7), glassMat);
  windshield.position.set(0, 0.95, 0.85);
  windshield.rotation.x = -Math.PI / 7;
  group.add(windshield);

  // Push Bumper / Bull Bar
  const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.2), chromeMat);
  pushBar.position.set(0, 0.5, 2.3);
  group.add(pushBar);

  // Headlights
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), headlightMat);
  hlL.position.set(-0.65, 0.55, 2.22);
  const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), headlightMat);
  hlR.position.set(0.65, 0.55, 2.22);
  group.add(hlL, hlR);
  headlights.push(hlL, hlR);

  // Tactical Rooftop LED Lightbar
  const barGroup = new THREE.Group();
  const barMount = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.15), chromeMat);
  barMount.position.set(0, 1.38, -0.25);
  const policeStrobeL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.14), strobeRedMat);
  policeStrobeL.position.set(-0.3, 1.4, -0.25);
  const policeStrobeR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.14), strobeBlueMat);
  policeStrobeR.position.set(0.3, 1.4, -0.25);
  barGroup.add(barMount, policeStrobeL, policeStrobeR);
  group.add(barGroup);
  strobeMeshes.push(policeStrobeL, policeStrobeR);
  explodedParts.push({
    mesh: barGroup,
    originalPosition: barGroup.position.clone(),
    targetOffset: new THREE.Vector3(0, 1.6, 0),
  });

  // Cruiser Wheels & Rims
  const wheels = [
    [-0.95, 0.35, 1.3],
    [0.95, 0.35, 1.3],
    [-0.95, 0.35, -1.3],
    [0.95, 0.35, -1.3],
  ];

  wheels.forEach(([x, y, z]) => {
    const wGroup = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.28, 24), rubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.29, 16), chromeMat);
    rim.rotation.z = Math.PI / 2;
    wGroup.add(rim);

    wGroup.position.set(x, y, z);
    group.add(wGroup);

    explodedParts.push({
      mesh: wGroup,
      originalPosition: wGroup.position.clone(),
      targetOffset: new THREE.Vector3(x > 0 ? 0.65 : -0.65, 0, 0),
    });
  });

  // Contact Shadow
  const shadow = createContactShadow(2.4, 4.8);
  group.add(shadow);

  return { group, explodedParts, strobeMeshes, headlights };
}

/**
 * 4. Procedural Incident Perimeter Elements:
 * Hazard cones with reflective white stripes, road barricade, and asphalt ground
 */
export function buildIncidentZone(): THREE.Group {
  const zoneGroup = new THREE.Group();

  const orangeMat = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    roughness: 0.3,
    metalness: 0.1,
  });
  const whiteReflectMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.2,
  });
  const blackBaseMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.8,
  });

  // Cone generator (base + cone + reflective ring)
  const createCone = (x: number, z: number) => {
    const coneGroup = new THREE.Group();
    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), blackBaseMat);
    base.position.y = 0.025;
    coneGroup.add(base);

    // Cone body
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.65, 16), orangeMat);
    body.position.y = 0.35;
    body.castShadow = true;
    coneGroup.add(body);

    // Reflective ring
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.14, 16), whiteReflectMat);
    ring.position.y = 0.4;
    coneGroup.add(ring);

    coneGroup.position.set(x, 0, z);
    return coneGroup;
  };

  // Place hazard perimeter cones
  const coneCoords = [
    [-3.2, 2.5],
    [-2.2, 3.2],
    [-1.0, 3.6],
    [1.0, 3.6],
    [2.2, 3.2],
    [3.2, 2.5],
    [-3.5, -2.8],
    [3.5, -2.8],
  ];

  coneCoords.forEach(([x, z]) => {
    zoneGroup.add(createCone(x, z));
  });

  // Road Barricade with hazard stripes
  const barricadeGroup = new THREE.Group();
  const legGeom = new THREE.BoxGeometry(0.1, 0.9, 0.1);
  const legL = new THREE.Mesh(legGeom, whiteReflectMat);
  legL.position.set(-1.4, 0.45, 0);
  const legR = new THREE.Mesh(legGeom, whiteReflectMat);
  legR.position.set(1.4, 0.45, 0);
  barricadeGroup.add(legL, legR);

  const plankGeom = new THREE.BoxGeometry(3.0, 0.35, 0.08);
  const plankMat = new THREE.MeshStandardMaterial({
    map: createHazardStripeTexture(),
    roughness: 0.4,
  });
  const plank = new THREE.Mesh(plankGeom, plankMat);
  plank.position.set(0, 0.65, 0);
  plank.castShadow = true;
  barricadeGroup.add(plank);

  barricadeGroup.position.set(0, 0, 4.4);
  zoneGroup.add(barricadeGroup);

  return zoneGroup;
}
