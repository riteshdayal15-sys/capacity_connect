"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface NodeData {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  focus: string;
  instruments: string[];
  telemetryStatus: string;
  color: string;
}

const NODES: NodeData[] = [
  {
    code: "IMD",
    name: "India Meteorological Department",
    city: "New Delhi",
    lat: 28.6139,
    lng: 77.2090,
    focus: "Doppler Weather Radars, Cyclone Forecasting & Agromet Services",
    instruments: ["37 S-Band Doppler Radars", "Automatic Weather Stations", "INSAT-3D Receiver"],
    telemetryStatus: "Active Stream (0.4s sync)",
    color: "#2563eb",
  },
  {
    code: "INCOIS",
    name: "Indian National Centre for Ocean Information Services",
    city: "Hyderabad",
    lat: 17.5348,
    lng: 78.3845,
    focus: "Indian Ocean Tsunami Early Warning System (ITEWS) & Ocean Modeling",
    instruments: ["Bottom Pressure Recorders", "Coastal Tide Gauges", "Argo Float Array"],
    telemetryStatus: "Seismic Telemetry Synced",
    color: "#0891b2",
  },
  {
    code: "NIOT",
    name: "National Institute of Ocean Technology",
    city: "Chennai",
    lat: 12.9348,
    lng: 80.2245,
    focus: "Deep Ocean Mission & Submersible Engineering (Matsya-6000)",
    instruments: ["Human Submersible 6000m", "Ocean Thermal Energy", "ORV Sagar Nidhi"],
    telemetryStatus: "Bathymetry Sensor Synced",
    color: "#0d9488",
  },
  {
    code: "IITM",
    name: "Indian Institute of Tropical Meteorology",
    city: "Pune",
    lat: 18.5376,
    lng: 73.8052,
    focus: "Monsoon Mission Coupled Climate Dynamics & HPC Modeling",
    instruments: ["Pratyush & Mihir HPC", "Stratosphere-Troposphere Radar", "Cloud Aerosol Lab"],
    telemetryStatus: "HPC Model Cluster Online",
    color: "#4f46e5",
  },
  {
    code: "NCMRWF",
    name: "National Centre for Medium Range Weather Forecasting",
    city: "Noida",
    lat: 28.6253,
    lng: 77.3685,
    focus: "Global Ensemble Forecasting System (GEFS) & Numerical NWP",
    instruments: ["Global NWP Array", "Coupled Atmospheric Models", "Satellite Assimilation"],
    telemetryStatus: "NWP Grid Cycle #00Z Active",
    color: "#7c3aed",
  },
  {
    code: "NCPOR",
    name: "National Centre for Polar and Ocean Research",
    city: "Goa",
    lat: 15.4026,
    lng: 73.8080,
    focus: "Polar Exploration, Cryospheric Ice Drilling & Ocean Sciences",
    instruments: ["Maitri & Bharati (Antarctica)", "Himadri (Arctic, Svalbard)", "Ice Core Vault"],
    telemetryStatus: "Satellite Link Direct",
    color: "#0284c7",
  },
  {
    code: "BHARATI",
    name: "Bharati Antarctic Research Station",
    city: "Larsemann Hills, Antarctica",
    lat: -69.4072,
    lng: 76.1878,
    focus: "Southern Ocean Boundary Layer, Atmospheric Physics & Geomagnetism",
    instruments: ["Seismological Observatory", "Brewer Spectrophotometer", "Ionospheric Radar"],
    telemetryStatus: "Deep-Polar Telemetry Synced",
    color: "#38bdf8",
  },
];

// Convert Lat/Lng to 3D Cartesian coordinates on sphere of given radius
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!(window.WebGLRenderingContext && gl);
  } catch {
    return false;
  }
}

export function EarthGlobe3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData>(NODES[0]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  useEffect(() => {
    // 0. Pre-flight check: if browser explicitly has WebGL disabled, switch to Canvas 3D directly
    if (!isWebGLAvailable()) {
      setWebglSupported(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "default",
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 26);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Globe Group
    const globeGroup = new THREE.Group();
    // Default tilt towards India (latitude ~20N, longitude ~77E)
    globeGroup.rotation.x = 0.35;
    globeGroup.rotation.y = -1.35;
    scene.add(globeGroup);

    const globeRadius = 9.5;

    // 2. Base Sphere (Solid subtle porcelain)
    const baseSphereGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
    const baseSphereMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.85,
      metalness: 0.1,
    });
    const baseSphere = new THREE.Mesh(baseSphereGeo, baseSphereMat);
    globeGroup.add(baseSphere);

    // 3. Coordinate Grid Wireframe (Latitude & Longitude Lines)
    const wireframeGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(globeRadius + 0.02, 36, 18));
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.7,
    });
    const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    globeGroup.add(wireframe);

    // 4. Continents & Ocean Current Point Cloud
    const dotCount = 1800;
    const dotPositions = new Float32Array(dotCount * 3);
    const dotColors = new Float32Array(dotCount * 3);

    for (let i = 0; i < dotCount; i++) {
      // Golden spiral distribution across sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / dotCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const r = globeRadius + 0.05;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      dotPositions[i * 3] = x;
      dotPositions[i * 3 + 1] = y;
      dotPositions[i * 3 + 2] = z;

      // Subtle slate / charcoal dot colors
      dotColors[i * 3] = 0.6;
      dotColors[i * 3 + 1] = 0.65;
      dotColors[i * 3 + 2] = 0.72;
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    dotGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));

    const dotMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
    });
    const dotPoints = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(dotPoints);

    // 5. Node Pins & Pulsing Rings
    const nodeObjects: { mesh: THREE.Mesh; ring: THREE.Mesh; data: NodeData }[] = [];
    const pinGroup = new THREE.Group();
    globeGroup.add(pinGroup);

    NODES.forEach((node) => {
      const pos = latLngToVector3(node.lat, node.lng, globeRadius);

      // Pin Head (Solid sphere)
      const pinGeo = new THREE.SphereGeometry(0.28, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(node.color) });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.copy(pos);
      pinGroup.add(pin);

      // Telemetry Beacon Stem
      const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
      const stemMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(node.color) });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.copy(pos.clone().multiplyScalar(1.02));
      stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      pinGroup.add(stem);

      // Pulsing Radar Ring
      const ringGeo = new THREE.RingGeometry(0.2, 0.45, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos.clone().multiplyScalar(1.025));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
      pinGroup.add(ring);

      nodeObjects.push({ mesh: pin, ring, data: node });
    });

    // 6. Orbiting Satellites (INSAT-3DR & Oceansat-3)
    const satelliteGroup = new THREE.Group();
    globeGroup.add(satelliteGroup);

    // Orbit Ring 1 (INSAT geostationary plane)
    const orbit1Geo = new THREE.RingGeometry(13.4, 13.45, 64);
    const orbit1Mat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const orbit1 = new THREE.Mesh(orbit1Geo, orbit1Mat);
    orbit1.rotation.x = Math.PI / 2;
    satelliteGroup.add(orbit1);

    // Orbit Ring 2 (Oceansat polar orbit)
    const orbit2Geo = new THREE.RingGeometry(12.2, 12.24, 64);
    const orbit2Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const orbit2 = new THREE.Mesh(orbit2Geo, orbit2Mat);
    orbit2.rotation.y = Math.PI / 4;
    orbit2.rotation.x = 0.2;
    satelliteGroup.add(orbit2);

    // Satellite 1 Object
    const sat1Geo = new THREE.BoxGeometry(0.4, 0.2, 0.25);
    const sat1Mat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const sat1 = new THREE.Mesh(sat1Geo, sat1Mat);
    satelliteGroup.add(sat1);

    // Satellite Solar Panels
    const panelGeo = new THREE.BoxGeometry(0.8, 0.02, 0.3);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    sat1.add(panel);

    // 7. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(20, 25, 20);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xdbeafe, 0.8);
    backLight.position.set(-20, -10, -15);
    scene.add(backLight);

    // 8. Interaction (Drag to rotate, click to inspect)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let velocityX = 0;
    let velocityY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      velocityX = 0;
      velocityY = 0;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      velocityX = deltaX * 0.005;
      velocityY = deltaY * 0.005;

      globeGroup.rotation.y += velocityX;
      globeGroup.rotation.x += velocityY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Touch support for mobile
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;

      globeGroup.rotation.y += deltaX * 0.005;
      globeGroup.rotation.x += deltaY * 0.005;
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    const canvasEl = renderer.domElement;
    canvasEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvasEl.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    // Click Raycaster to select node
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = nodeObjects.map((no) => no.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const match = nodeObjects.find((no) => no.mesh === hitMesh);
        if (match) {
          setSelectedNode(match.data);
        }
      }
    };
    canvasEl.addEventListener("click", onClick);

    // 9. Resize Listener
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // 10. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Damping / Inertia
      if (!isDragging) {
        velocityX *= 0.95;
        velocityY *= 0.95;
        globeGroup.rotation.y += velocityX;
        globeGroup.rotation.x += velocityY;

        // Auto-rotation when not actively dragged
        if (autoRotate && Math.abs(velocityX) < 0.001 && Math.abs(velocityY) < 0.001) {
          globeGroup.rotation.y += 0.0022;
        }
      }

      // Pulse node radar rings
      nodeObjects.forEach((no, idx) => {
        const pulse = (Math.sin(elapsedTime * 3 + idx * 0.8) + 1) / 2;
        no.ring.scale.set(1 + pulse * 0.8, 1 + pulse * 0.8, 1);
        (no.ring.material as THREE.MeshBasicMaterial).opacity = 0.8 - pulse * 0.6;
      });

      // Orbit Satellite
      const satAngle = elapsedTime * 0.45;
      sat1.position.x = 13.4 * Math.cos(satAngle);
      sat1.position.z = 13.4 * Math.sin(satAngle);
      sat1.rotation.y = -satAngle + Math.PI / 2;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (canvasEl) {
        canvasEl.removeEventListener("mousedown", onMouseDown);
        canvasEl.removeEventListener("touchstart", onTouchStart);
        canvasEl.removeEventListener("click", onClick);
      }
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      if (renderer) {
        try {
          renderer.forceContextLoss();
          renderer.dispose();
        } catch {}
      }
      baseSphereGeo.dispose();
      baseSphereMat.dispose();
      wireframeGeo.dispose();
      wireframeMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
    };
  }, [autoRotate]);

  if (!webglSupported) {
    return (
      <CanvasGlobe3D
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        autoRotate={autoRotate}
        setAutoRotate={setAutoRotate}
      />
    );
  }

  return (
    <div className="relative w-full rounded-xl bg-white border border-zinc-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* 3D Canvas Container */}
      <div className="relative w-full h-[480px] sm:h-[540px] bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Top Floating Control Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-zinc-200 text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            <span className="font-mono font-semibold text-zinc-900 text-[11px]">
              3D EARTH SCIENCES OBSERVATORY
            </span>
            <span className="text-zinc-300">|</span>
            <span className="text-[11px] font-mono text-zinc-600">{NODES.length} Telemetry Nodes</span>
          </div>

          <div className="pointer-events-auto flex items-center space-x-2">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
                autoRotate
                  ? "bg-zinc-950 text-white border-zinc-950"
                  : "bg-white/90 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              {autoRotate ? "Orbit: ON" : "Orbit: PAUSED"}
            </button>
            <div className="hidden sm:block text-[10px] font-mono text-zinc-500 bg-white/80 px-2 py-1 rounded border border-zinc-200">
              Drag to Rotate &bull; Click Node to Inspect
            </div>
          </div>
        </div>

        {/* Floating Active Node Telemetry HUD */}
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-lg border border-zinc-200 shadow-md space-y-2.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <span className="font-mono font-bold text-xs text-zinc-950">{selectedNode.code}</span>
                <span className="text-[10px] font-mono text-zinc-500">{selectedNode.city}</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {selectedNode.telemetryStatus}
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-zinc-950 leading-snug">{selectedNode.name}</h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed">{selectedNode.focus}</p>
            </div>

            <div className="pt-1 border-t border-zinc-100">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                Active Observational Sensors:
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedNode.instruments.map((inst, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200"
                  >
                    {inst}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Node Switcher Strip */}
        <div className="absolute bottom-4 left-4 hidden lg:flex items-center space-x-1.5 pointer-events-auto bg-white/90 backdrop-blur-md p-1 rounded-md border border-zinc-200 shadow-sm">
          {NODES.map((n) => (
            <button
              key={n.code}
              onClick={() => setSelectedNode(n)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all ${
                selectedNode.code === n.code
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
              }`}
            >
              {n.code}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CanvasGlobe3D: Software 3D Vector Sphere Renderer
// Guaranteed 60fps rotating 3D earth sphere on any device without WebGL requirement.
// ─────────────────────────────────────────────────────────────────────────────
interface CanvasGlobe3DProps {
  selectedNode: NodeData;
  setSelectedNode: (node: NodeData) => void;
  autoRotate: boolean;
  setAutoRotate: React.Dispatch<React.SetStateAction<boolean>>;
}

function CanvasGlobe3D({
  selectedNode,
  setSelectedNode,
  autoRotate,
  setAutoRotate,
}: CanvasGlobe3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rotation angles (centered over India: lat ~20N, lng ~77E)
  const rotXRef = useRef(0.25);
  const rotYRef = useRef(-1.35);
  const isDraggingRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const nodesScreenPosRef = useRef<{ node: NodeData; x: number; y: number; z: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    // Precalculate 400 dots across sphere surface (Fibonacci spiral)
    const dotCount = 420;
    const dots: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < dotCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / dotCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      dots.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
      });
    }

    const render = () => {
      animId = requestAnimationFrame(render);

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth || 600;
      const height = container.clientHeight || 500;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.38;

      // Update rotation with physics damping
      if (!isDraggingRef.current) {
        velocityRef.current.x *= 0.94;
        velocityRef.current.y *= 0.94;
        rotYRef.current += velocityRef.current.x;
        rotXRef.current += velocityRef.current.y;

        if (autoRotate && Math.abs(velocityRef.current.x) < 0.001) {
          rotYRef.current += 0.0028;
        }
      }

      // Clamp X tilt
      rotXRef.current = Math.max(-1.1, Math.min(1.1, rotXRef.current));

      const rx = rotXRef.current;
      const ry = rotYRef.current;
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);

      // 3D rotation projection helper
      const project = (x0: number, y0: number, z0: number) => {
        // Rotate around Y
        const x1 = x0 * cosY + z0 * sinY;
        const z1 = -x0 * sinY + z0 * cosY;
        // Rotate around X
        const y2 = y0 * cosX - z1 * sinX;
        const z2 = y0 * sinX + z1 * cosX;

        const pDistance = 600;
        const scale = pDistance / (pDistance + z2 * radius);
        return {
          px: cx + x1 * radius * scale,
          py: cy - y2 * radius * scale,
          depth: z2,
        };
      };

      // 1. Draw Globe Base Shaded Sphere
      const grad = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.7, "#f8fafc");
      grad.addColorStop(1, "#e2e8f0");

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "#cbd5e1";
      ctx.stroke();

      // 2. Draw Latitude Parallels
      const latitudes = [-60, -30, 0, 30, 60];
      latitudes.forEach((lat) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const yCircle = Math.cos(phi);
        const rCircle = Math.sin(phi);

        ctx.beginPath();
        let first = true;
        const steps = 48;
        for (let s = 0; s <= steps; s++) {
          const theta = (s / steps) * Math.PI * 2;
          const pt = project(
            rCircle * Math.cos(theta),
            yCircle,
            rCircle * Math.sin(theta)
          );
          if (first) {
            ctx.moveTo(pt.px, pt.py);
            first = false;
          } else {
            ctx.lineTo(pt.px, pt.py);
          }
        }
        ctx.strokeStyle = lat === 0 ? "rgba(148, 163, 184, 0.45)" : "rgba(203, 213, 225, 0.35)";
        ctx.lineWidth = lat === 0 ? 1.2 : 0.8;
        ctx.stroke();
      });

      // 3. Draw Longitude Meridians
      for (let m = 0; m < 12; m++) {
        const theta = (m / 12) * Math.PI * 2;
        ctx.beginPath();
        let first = true;
        const steps = 36;
        for (let s = 0; s <= steps; s++) {
          const phi = (s / steps) * Math.PI;
          const pt = project(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta)
          );
          if (first) {
            ctx.moveTo(pt.px, pt.py);
            first = false;
          } else {
            ctx.lineTo(pt.px, pt.py);
          }
        }
        ctx.strokeStyle = "rgba(203, 213, 225, 0.35)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // 4. Draw Ocean Point Cloud
      dots.forEach((d) => {
        const p = project(d.x, d.y, d.z);
        if (p.depth > -0.05) {
          const alpha = 0.2 + (p.depth + 0.05) * 0.6;
          ctx.fillStyle = `rgba(100, 116, 139, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.px, p.py, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 5. Draw Orbiting Satellite
      const now = Date.now();
      const satAngle = (now * 0.0006) % (Math.PI * 2);
      const orbitR = 1.32;
      const satP = project(
        orbitR * Math.cos(satAngle),
        orbitR * Math.sin(satAngle) * 0.3,
        orbitR * Math.sin(satAngle)
      );

      // Satellite Orbit Ellipse
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const opt = project(
          orbitR * Math.cos(a),
          orbitR * Math.sin(a) * 0.3,
          orbitR * Math.sin(a)
        );
        if (i === 0) ctx.moveTo(opt.px, opt.py);
        else ctx.lineTo(opt.px, opt.py);
      }
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Satellite Craft
      if (satP.depth > -0.4) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(satP.px - 3, satP.py - 2, 6, 4);
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(satP.px - 8, satP.py - 1, 4, 2);
        ctx.fillRect(satP.px + 4, satP.py - 1, 4, 2);
      }

      // 6. Draw MoES Telemetry Nodes
      const updatedNodes: { node: NodeData; x: number; y: number; z: number }[] = [];

      NODES.forEach((node, idx) => {
        const phi = (90 - node.lat) * (Math.PI / 180);
        const theta = (node.lng + 180) * (Math.PI / 180);
        const nx = -(Math.sin(phi) * Math.cos(theta));
        const nz = Math.sin(phi) * Math.sin(theta);
        const ny = Math.cos(phi);

        const pt = project(nx, ny, nz);
        updatedNodes.push({ node, x: pt.px, y: pt.py, z: pt.depth });

        if (pt.depth > -0.15) {
          const isSelected = selectedNode.code === node.code;
          const pulse = (now * 0.002 + idx * 0.7) % 1;

          // Pulsing Radar Ring
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, 4 + pulse * 14, 0, Math.PI * 2);
          ctx.strokeStyle = node.color;
          ctx.globalAlpha = Math.max(0, 1 - pulse) * 0.8;
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Solid Pin
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, isSelected ? 4.5 : 3.2, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          // Code Label Tag
          ctx.font = "bold 9px monospace";
          const metrics = ctx.measureText(node.code);
          const tagW = metrics.width + 6;
          const tagH = 13;
          const tagX = pt.px + 6;
          const tagY = pt.py - 6;

          ctx.fillStyle = isSelected ? "#09090b" : "rgba(255, 255, 255, 0.92)";
          ctx.fillRect(tagX, tagY - tagH + 2, tagW, tagH);
          ctx.strokeStyle = isSelected ? "#09090b" : "#cbd5e1";
          ctx.lineWidth = 1;
          ctx.strokeRect(tagX, tagY - tagH + 2, tagW, tagH);

          ctx.fillStyle = isSelected ? "#ffffff" : "#0f172a";
          ctx.fillText(node.code, tagX + 3, tagY - 2);
        }
      });

      nodesScreenPosRef.current = updatedNodes;
      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [autoRotate, selectedNode]);

  // Pointer Drag & Click Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - mousePosRef.current.x;
    const deltaY = e.clientY - mousePosRef.current.y;
    mousePosRef.current = { x: e.clientX, y: e.clientY };

    velocityRef.current = { x: deltaX * 0.005, y: -deltaY * 0.005 };
    rotYRef.current += deltaX * 0.005;
    rotXRef.current -= deltaY * 0.005;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Hit test on nodes
    for (const item of nodesScreenPosRef.current) {
      if (item.z > -0.15) {
        const dx = clickX - item.x;
        const dy = clickY - item.y;
        if (Math.hypot(dx, dy) < 22) {
          setSelectedNode(item.node);
          return;
        }
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      mousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - mousePosRef.current.x;
    const deltaY = e.touches[0].clientY - mousePosRef.current.y;
    mousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    rotYRef.current += deltaX * 0.005;
    rotXRef.current -= deltaY * 0.005;
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative w-full rounded-xl bg-white border border-zinc-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full h-[480px] sm:h-[540px] bg-gradient-to-b from-slate-50/60 via-white to-slate-50/40 select-none"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />

        {/* Top Floating Control Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-zinc-200 text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            <span className="font-mono font-semibold text-zinc-900 text-[11px]">
              3D EARTH SCIENCES OBSERVATORY
            </span>
            <span className="text-zinc-300">|</span>
            <span className="text-[11px] font-mono text-zinc-600">{NODES.length} Telemetry Nodes</span>
          </div>

          <div className="pointer-events-auto flex items-center space-x-2">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
                autoRotate
                  ? "bg-zinc-950 text-white border-zinc-950"
                  : "bg-white/90 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              {autoRotate ? "Orbit: ON" : "Orbit: PAUSED"}
            </button>
            <div className="hidden sm:block text-[10px] font-mono text-zinc-500 bg-white/80 px-2 py-1 rounded border border-zinc-200">
              Drag to Rotate &bull; Click Node to Inspect
            </div>
          </div>
        </div>

        {/* Floating Active Node Telemetry HUD */}
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-lg border border-zinc-200 shadow-md space-y-2.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <span className="font-mono font-bold text-xs text-zinc-950">{selectedNode.code}</span>
                <span className="text-[10px] font-mono text-zinc-500">{selectedNode.city}</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {selectedNode.telemetryStatus}
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-zinc-950 leading-snug">{selectedNode.name}</h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed">{selectedNode.focus}</p>
            </div>

            <div className="pt-1 border-t border-zinc-100">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                Active Observational Sensors:
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedNode.instruments.map((inst, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200"
                  >
                    {inst}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Node Switcher Strip */}
        <div className="absolute bottom-4 left-4 hidden lg:flex items-center space-x-1.5 pointer-events-auto bg-white/90 backdrop-blur-md p-1 rounded-md border border-zinc-200 shadow-sm">
          {NODES.map((n) => (
            <button
              key={n.code}
              onClick={() => setSelectedNode(n)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all ${
                selectedNode.code === n.code
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
              }`}
            >
              {n.code}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
