import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  buildAmbulance,
  buildFireEngine,
  buildPoliceCruiser,
  buildIncidentZone,
  createAsphaltTexture,
  VehicleAssembly
} from '../components/three/proceduralModels';
import {
  Radio,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Sunset,
  Camera,
  Activity,
  Shield,
  Truck,
  Flame,
  Siren,
  Maximize2,
  Minimize2,
  RefreshCw,
  Layers,
  Compass
} from 'lucide-react';

// Scratch vectors outside render loop (Zero GC)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3();

type VehicleType = 'ambulance' | 'fire_engine' | 'police_cruiser';
type TimeOfDay = 'night' | 'dusk' | 'day';
type CameraPreset = 'orbit' | 'iso' | 'drone' | 'chase';

export const Tactical3DPage: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  // UI state
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('ambulance');
  const [explodedAmount, setExplodedAmount] = useState<number>(0);
  const [strobesEnabled, setStrobesEnabled] = useState<boolean>(true);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('night');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('orbit');
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const [showIncidentPerimeter, setShowIncidentPerimeter] = useState<boolean>(true);

  // Mutable refs for Three.js animation loop access
  const targetExplodedRef = useRef<number>(0);
  const currentExplodedRef = useRef<number>(0);
  const strobesEnabledRef = useRef<boolean>(true);
  const timeOfDayRef = useRef<TimeOfDay>('night');
  const cameraTransitionActiveRef = useRef<boolean>(false);

  // Sync ref values
  useEffect(() => {
    targetExplodedRef.current = explodedAmount;
  }, [explodedAmount]);

  useEffect(() => {
    strobesEnabledRef.current = strobesEnabled;
  }, [strobesEnabled]);

  useEffect(() => {
    timeOfDayRef.current = timeOfDay;
  }, [timeOfDay]);

  // Keyboard shortcut: 'H' toggles dock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
        setIsControlsVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Set camera target preset
  const applyCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    cameraTransitionActiveRef.current = true;
    switch (preset) {
      case 'orbit':
        _targetCamPos.set(6, 4, 7);
        _targetLookAt.set(0, 1.2, 0);
        break;
      case 'iso':
        _targetCamPos.set(8, 7, 8);
        _targetLookAt.set(0, 1, 0);
        break;
      case 'drone':
        _targetCamPos.set(0.1, 14, 0.1);
        _targetLookAt.set(0, 0, 0);
        break;
      case 'chase':
        _targetCamPos.set(0, 2, -6.5);
        _targetLookAt.set(0, 1.2, 1);
        break;
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // 1. Software WebGL Guard (read from renderer string, never user agent)
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.018);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    camera.position.set(6, 4, 7);
    _targetCamPos.copy(camera.position);
    _targetLookAt.set(0, 1.2, 0);
    _currentLookAt.copy(_targetLookAt);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Mandatory Studio Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. OrbitControls with smooth exponential damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going beneath ground
    controls.minDistance = 2.5;
    controls.maxDistance = 35;
    controls.target.copy(_currentLookAt);

    controls.addEventListener('start', () => {
      cameraTransitionActiveRef.current = false;
    });

    // 5. Studio Lighting Rig (Warm Key Light + Cool Hemisphere Fill)
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.5);
    keyLight.position.set(12, 16, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = isSoftwareGl ? 512 : 2048;
    keyLight.shadow.mapSize.height = isSoftwareGl ? 512 : 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 45;
    const shadowFrustum = 12;
    keyLight.shadow.camera.left = -shadowFrustum;
    keyLight.shadow.camera.right = shadowFrustum;
    keyLight.shadow.camera.top = shadowFrustum;
    keyLight.shadow.camera.bottom = -shadowFrustum;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020617, 0.9);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Dynamic strobe point lights
    const strobeLightRed = new THREE.PointLight(0xff0022, 0, 15);
    strobeLightRed.position.set(-0.8, 2.5, 0);
    scene.add(strobeLightRed);

    const strobeLightBlue = new THREE.PointLight(0x0088ff, 0, 15);
    strobeLightBlue.position.set(0.8, 2.5, 0);
    scene.add(strobeLightBlue);

    // 6. Ground Asphalt Plane & Grid
    const asphaltTexture = createAsphaltTexture();
    asphaltTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const groundGeom = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      map: asphaltTexture,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);

    // Subtle tactical coordinate grid on top of asphalt
    const grid = new THREE.GridHelper(50, 50, 0x06b6d4, 0x1e293b);
    grid.position.y = 0.01;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.25;
    scene.add(grid);

    // 7. Incident Perimeter Zone (Hazard Cones, Barrier)
    const incidentZone = buildIncidentZone();
    scene.add(incidentZone);

    // 8. Vehicle Assemblies Group
    const vehicleContainer = new THREE.Group();
    scene.add(vehicleContainer);

    let activeAssembly: VehicleAssembly | null = null;

    const loadVehicleModel = (type: VehicleType) => {
      // Clear previous vehicle
      while (vehicleContainer.children.length > 0) {
        vehicleContainer.remove(vehicleContainer.children[0]);
      }

      if (type === 'ambulance') {
        activeAssembly = buildAmbulance();
      } else if (type === 'fire_engine') {
        activeAssembly = buildFireEngine();
      } else {
        activeAssembly = buildPoliceCruiser();
      }

      vehicleContainer.add(activeAssembly.group);
    };

    loadVehicleModel(selectedVehicle);

    // Pre-warm shaders
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 9. Lossless 60fps Animation Loop with exponential damping & software guard
    let frameId = 0;
    const clock = new THREE.Clock();

    function updateLightingEnvironment(timeState: TimeOfDay) {
      if (timeState === 'night') {
        scene.background = new THREE.Color(0x020617);
        scene.fog = new THREE.FogExp2(0x020617, 0.02);
        keyLight.color.setHex(0x93c5fd);
        keyLight.intensity = 1.0;
        hemiLight.intensity = 0.4;
      } else if (timeState === 'dusk') {
        scene.background = new THREE.Color(0x181024);
        scene.fog = new THREE.FogExp2(0x181024, 0.015);
        keyLight.color.setHex(0xf97316);
        keyLight.intensity = 2.2;
        hemiLight.intensity = 0.8;
      } else {
        scene.background = new THREE.Color(0x0f172a);
        scene.fog = new THREE.FogExp2(0x0f172a, 0.012);
        keyLight.color.setHex(0xfff4e6);
        keyLight.intensity = 3.2;
        hemiLight.intensity = 1.2;
      }
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth exploded view damping: 1 - Math.exp(-6 * delta)
      const dampFactor = 1 - Math.exp(-6 * delta);
      currentExplodedRef.current +=
        (targetExplodedRef.current - currentExplodedRef.current) * dampFactor;

      if (activeAssembly) {
        const factor = currentExplodedRef.current;
        activeAssembly.explodedParts.forEach((part) => {
          part.mesh.position.x =
            part.originalPosition.x + part.targetOffset.x * factor;
          part.mesh.position.y =
            part.originalPosition.y + part.targetOffset.y * factor;
          part.mesh.position.z =
            part.originalPosition.z + part.targetOffset.z * factor;
        });

        // Alternating emergency strobes simulation
        if (strobesEnabledRef.current) {
          const strobeCycle = Math.sin(time * 16);
          const flashRed = strobeCycle > 0.1;
          const flashBlue = strobeCycle < -0.1;

          activeAssembly.strobeMeshes.forEach((mesh, idx) => {
            const isRed = idx % 2 === 0;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (isRed) {
              mat.emissiveIntensity = flashRed ? 3.5 : 0.2;
            } else {
              mat.emissiveIntensity = flashBlue ? 3.5 : 0.2;
            }
          });

          strobeLightRed.intensity = flashRed ? 4.0 : 0.0;
          strobeLightBlue.intensity = flashBlue ? 4.0 : 0.0;
        } else {
          activeAssembly.strobeMeshes.forEach((mesh) => {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 0.0;
          });
          strobeLightRed.intensity = 0.0;
          strobeLightBlue.intensity = 0.0;
        }
      }

      // Smooth camera preset interpolation
      if (cameraTransitionActiveRef.current) {
        camera.position.lerp(_targetCamPos, dampFactor * 1.5);
        _currentLookAt.lerp(_targetLookAt, dampFactor * 1.5);
        controls.target.copy(_currentLookAt);

        if (camera.position.distanceTo(_targetCamPos) < 0.08) {
          cameraTransitionActiveRef.current = false;
        }
      }

      controls.update();
      updateLightingEnvironment(timeOfDayRef.current);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Save cleanup & dynamic model updater to DOM node
    (container as any).__loadVehicleModel = loadVehicleModel;
    (container as any).__toggleIncidentPerimeter = (visible: boolean) => {
      incidentZone.visible = visible;
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      if (isSoftwareGl) {
        clearTimeout(frameId);
      } else {
        cancelAnimationFrame(frameId);
      }
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync vehicle type changes to the Three.js scene
  useEffect(() => {
    if (mountRef.current && (mountRef.current as any).__loadVehicleModel) {
      (mountRef.current as any).__loadVehicleModel(selectedVehicle);
    }
  }, [selectedVehicle]);

  // Sync incident perimeter toggle
  useEffect(() => {
    if (mountRef.current && (mountRef.current as any).__toggleIncidentPerimeter) {
      (mountRef.current as any).__toggleIncidentPerimeter(showIncidentPerimeter);
    }
  }, [showIncidentPerimeter]);

  // Vehicle Telemetry Info
  const vehicleStats = {
    ambulance: {
      name: 'Medic Unit 1',
      classification: 'Type-I Modular Advanced Life Support (ALS)',
      chassis: 'Freightliner M2 Custom Heavy Chassis',
      power: '320 HP Turbo-Diesel / Dual Inverter Aux Power',
      crew: '2 Paramedics, 1 EMT-Advanced',
      status: 'ON STANDBY / DIGITAL TWIN SYNCED',
      telemetry: {
        fuel: '94%',
        oxygenReserve: '2200 PSI (Nominal)',
        defibrillator: 'Diagnostic Self-Test Passed',
        latLong: '37.7749° N, 122.4194° W'
      }
    },
    fire_engine: {
      name: 'Engine 3 Heavy Pumper',
      classification: 'Class-A Structural & Tactical Fire Tender',
      chassis: 'Pierce Enforcer 6x4 Dual Rear Axle',
      power: '500 HP Cummins X12 / 1500 GPM Water Pump',
      crew: '1 Captain, 1 Engineer, 2 Firefighters',
      status: 'DEPLOYED / DISPATCH ACTIVE',
      telemetry: {
        fuel: '88%',
        waterTank: '750 Gal (Full)',
        foamConcentrate: '50 Gal Class A',
        latLong: '37.7812° N, 122.4120° W'
      }
    },
    police_cruiser: {
      name: 'Patrol 101 Interceptor',
      classification: 'Tactical Pursuit & Highway Enforcement Unit',
      chassis: 'Ford Police Interceptor Utility AWD',
      power: '400 HP Twin-Turbo EcoBoost V6',
      crew: '2 Highway Patrol Officers',
      status: 'RAPID TRIAGE PATROL',
      telemetry: {
        fuel: '76%',
        dashRadar: 'Front/Rear Stalker DSR Active',
        perimeterLidar: 'Calibrated (150m)',
        latLong: '37.7690° N, 122.4250° W'
      }
    }
  }[selectedVehicle];

  return (
    <div className="relative w-full h-[calc(100vh-68px)] overflow-hidden bg-slate-950 select-none">
      {/* 100% Unobstructed Full-Bleed 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Tactical Status Overlay (Minimal footprint) */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="pointer-events-auto px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 shadow-xl max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h1 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              3D Tactical Command Twin
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              PBR REAL-TIME
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-mono">
            {vehicleStats.name} • {vehicleStats.classification}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-mono border-t border-slate-800/80 pt-2">
            <span>FUEL: <strong className="text-emerald-400">{vehicleStats.telemetry.fuel}</strong></span>
            <span>CREW: <strong className="text-slate-200">{vehicleStats.crew.split(',')[0]}</strong></span>
            <span>STATUS: <strong className="text-cyan-400">{vehicleStats.status.split('/')[0]}</strong></span>
          </div>
        </div>
      </div>

      {/* Top-Right Quick View Shortcuts */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => setShowIncidentPerimeter(!showIncidentPerimeter)}
          className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold border transition shadow-lg flex items-center gap-1.5 ${
            showIncidentPerimeter
              ? 'bg-slate-900 text-amber-300 border-amber-500/40'
              : 'bg-slate-900/90 text-slate-400 border-slate-800'
          }`}
          title="Toggle perimeter cones and warning barricades"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Perimeter Cones</span>
        </button>

        <button
          type="button"
          onClick={() => setStrobesEnabled(!strobesEnabled)}
          className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold border transition shadow-lg flex items-center gap-1.5 ${
            strobesEnabled
              ? 'bg-slate-900 text-rose-300 border-rose-500/40'
              : 'bg-slate-900/90 text-slate-400 border-slate-800'
          }`}
        >
          <Siren className="w-3.5 h-3.5" />
          <span>{strobesEnabled ? 'Strobes ON' : 'Strobes OFF'}</span>
        </button>
      </div>

      {/* Unified Bottom Control Dock (Consolidated <= 15% Viewport Footprint) */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 ease-in-out pointer-events-auto"
        style={{
          width: 'min(940px, 94vw)',
          transform: `translateX(-50%) translateY(${isControlsVisible ? '0%' : 'calc(100% - 36px)'})`
        }}
      >
        {/* Dock Header & Collapse/Expand Button */}
        <div className="flex justify-center -mb-px">
          <button
            type="button"
            onClick={() => setIsControlsVisible(!isControlsVisible)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-t-xl bg-slate-900 text-slate-300 border-t border-x border-slate-800 text-[11px] font-mono tracking-wider hover:text-white transition shadow-lg hover:bg-slate-850"
          >
            {isControlsVisible ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>▾ Hide Dock (Press H)</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>▴ Expand Tactical Controls (Press H)</span>
              </>
            )}
          </button>
        </div>

        {/* Solid Control Surface (NO backdrop-filter to protect WebGL performance) */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-2xl text-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* 1. Vehicle Selection */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-400 font-semibold mb-1.5">
                Fleet Unit Selection
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedVehicle('ambulance')}
                  className={`py-2 px-2 rounded-lg text-[11px] font-mono font-bold border transition text-center flex flex-col items-center gap-1 ${
                    selectedVehicle === 'ambulance'
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Medic 1</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVehicle('fire_engine')}
                  className={`py-2 px-2 rounded-lg text-[11px] font-mono font-bold border transition text-center flex flex-col items-center gap-1 ${
                    selectedVehicle === 'fire_engine'
                      ? 'bg-rose-950 border-rose-500 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Engine 3</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVehicle('police_cruiser')}
                  className={`py-2 px-2 rounded-lg text-[11px] font-mono font-bold border transition text-center flex flex-col items-center gap-1 ${
                    selectedVehicle === 'police_cruiser'
                      ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Patrol 101</span>
                </button>
              </div>
            </div>

            {/* 2. Exploded-View Inspection Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Exploded View</span>
                </label>
                <span className="text-[10px] font-mono font-bold text-cyan-300">
                  {Math.round(explodedAmount * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodedAmount}
                onChange={(e) => setExplodedAmount(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-950 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                <span>Assembled</span>
                <span>Expanded Assemblies</span>
              </div>
            </div>

            {/* 3. Camera Presets */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-400 font-semibold mb-1.5">
                Camera Angle
              </label>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => applyCameraPreset('orbit')}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-semibold border transition ${
                    cameraPreset === 'orbit'
                      ? 'bg-slate-800 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Orbit
                </button>
                <button
                  type="button"
                  onClick={() => applyCameraPreset('iso')}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-semibold border transition ${
                    cameraPreset === 'iso'
                      ? 'bg-slate-800 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Isometric
                </button>
                <button
                  type="button"
                  onClick={() => applyCameraPreset('drone')}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-semibold border transition ${
                    cameraPreset === 'drone'
                      ? 'bg-slate-800 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Drone
                </button>
                <button
                  type="button"
                  onClick={() => applyCameraPreset('chase')}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-semibold border transition ${
                    cameraPreset === 'chase'
                      ? 'bg-slate-800 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Chase
                </button>
              </div>
            </div>

            {/* 4. Time of Day Atmosphere */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-400 font-semibold mb-1.5">
                Atmosphere & Time
              </label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setTimeOfDay('night')}
                  className={`py-1.5 px-1.5 rounded-lg text-[10px] font-mono font-semibold border transition flex items-center justify-center gap-1 ${
                    timeOfDay === 'night'
                      ? 'bg-slate-800 border-indigo-400 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>Night</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeOfDay('dusk')}
                  className={`py-1.5 px-1.5 rounded-lg text-[10px] font-mono font-semibold border transition flex items-center justify-center gap-1 ${
                    timeOfDay === 'dusk'
                      ? 'bg-slate-800 border-amber-400 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Sunset className="w-3 h-3" />
                  <span>Dusk</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeOfDay('day')}
                  className={`py-1.5 px-1.5 rounded-lg text-[10px] font-mono font-semibold border transition flex items-center justify-center gap-1 ${
                    timeOfDay === 'day'
                      ? 'bg-slate-800 border-yellow-400 text-yellow-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  <span>Day</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
