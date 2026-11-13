import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { CustomMapConfig, MapObject, MapObjectType } from '../types/game';
import {
  createFloorTexture,
  createWallTexture,
  createWoodPlankTexture,
  createPerkMachineTexture,
  createPackAPunchTexture,
  createMysteryBoxTexture,
} from '../utils/proceduralTextures';
import { createCustomPropMesh } from './GameEngine';
import { WALL_BUY_CONFIG } from '../data/weapons';
import { deviceManager, OPTIMIZATION_SPECS, type OptimizationProfile } from '../utils/deviceMode';

export class MapEditorEngine {
  public container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  public transformControls: TransformControls;
  public transformGizmoHelper: THREE.Object3D | null = null;
  public currentTransformMode: 'translate' | 'rotate' | 'scale' = 'translate';
  private clock: THREE.Clock;
  private animFrameId: number = 0;

  public mapConfig: CustomMapConfig;
  public selectedObjectId: string | null = null;
  private objectMeshMap: Map<string, THREE.Object3D> = new Map();
  private selectionBoxHelper: THREE.BoxHelper | null = null;

  public optimizationProfile: OptimizationProfile = deviceManager.getState().effectiveOptimization;
  public isTouchMode: boolean = deviceManager.getState().effectiveMode !== 'computer';
  public lastImportError: string | null = null;

  // Callbacks
  public onSelectObject?: (id: string | null) => void;
  public onConfigChange?: (config: CustomMapConfig) => void;

  private resizeObserver: ResizeObserver | null = null;
  private dragStartScale: THREE.Vector3 | null = null;
  private dragStartPosition: THREE.Vector3 | null = null;
  private editorAmbientLight!: THREE.AmbientLight;
  private editorHemiLight!: THREE.HemisphereLight;
  private editorDirLight!: THREE.DirectionalLight;
  public isDarknessPreview: boolean = false;

  // Shared GPU resources so block edits/slider drags never leak 512x512 CanvasTextures
  private sharedUnitBoxGeo: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
  private cachedTextures: {
    concrete?: THREE.CanvasTexture;
    brick?: THREE.CanvasTexture;
    wood?: THREE.CanvasTexture;
    perk_juggernog?: THREE.CanvasTexture;
    perk_speedcola?: THREE.CanvasTexture;
    perk_doubletap?: THREE.CanvasTexture;
    pap?: THREE.CanvasTexture;
    box?: THREE.CanvasTexture;
  } = {};

  constructor(container: HTMLDivElement, initialConfig: CustomMapConfig) {
    this.container = container;
    this.mapConfig = JSON.parse(JSON.stringify(initialConfig));
    this.clock = new THREE.Clock();

    const devState = deviceManager.getState();
    this.optimizationProfile = devState.effectiveOptimization;
    this.isTouchMode = devState.effectiveMode !== 'computer';
    const spec = OPTIMIZATION_SPECS[this.optimizationProfile];

    const width = this.container.clientWidth || Math.max(280, window.innerWidth);
    const height = this.container.clientHeight || Math.max(240, window.innerHeight - 56);

    // 1. Scene & Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0c1017');
    this.scene.fog = new THREE.Fog('#0c1017', 25, Math.min(80, spec.cameraFar * 0.45));

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, spec.cameraFar);
    this.camera.position.set(0, 14, 20);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer (skip MSAA on phone for tile-GPU performance & cap DPR per device profile)
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.optimizationProfile !== 'phone_performance',
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, spec.maxPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.optimizationProfile === 'phone_performance' ? 1.32 : 1.2;
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls (1-finger orbit, 2-finger pinch zoom & pan on phone/tablet)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 65;
    this.controls.target.set(0, 2, 0);
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // 5. Interactive 3D Transform Gizmos (Move, Scale, Rotate)
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.setMode(this.currentTransformMode);
    this.transformControls.setSpace('world');
    this.updateGizmoSize();
    this.transformGizmoHelper = this.transformControls.getHelper();
    if (this.transformGizmoHelper) {
      this.scene.add(this.transformGizmoHelper);
    }

    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value;
      if (event.value) {
        if (this.selectedObjectId) {
          const mesh = this.objectMeshMap.get(this.selectedObjectId);
          if (mesh) {
            this.dragStartScale = mesh.scale.clone();
            this.dragStartPosition = mesh.position.clone();
          }
        }
      } else {
        this.dragStartScale = null;
        this.dragStartPosition = null;
      }
    });

    this.transformControls.addEventListener('change', () => {
      if (this.selectedObjectId) {
        const mesh = this.objectMeshMap.get(this.selectedObjectId);
        const obj = this.mapConfig.objects.find((o) => o.id === this.selectedObjectId);
        if (mesh && obj) {
          obj.position.x = Number(mesh.position.x.toFixed(2));
          obj.position.y = Number(mesh.position.y.toFixed(2));
          obj.position.z = Number(mesh.position.z.toFixed(2));

          obj.rotation.x = Number(mesh.rotation.x.toFixed(2));
          obj.rotation.y = Number(mesh.rotation.y.toFixed(2));
          obj.rotation.z = Number(mesh.rotation.z.toFixed(2));

          obj.scale.x = Number(mesh.scale.x.toFixed(2));
          obj.scale.y = Number(mesh.scale.y.toFixed(2));
          obj.scale.z = Number(mesh.scale.z.toFixed(2));

          this.onConfigChange?.(this.mapConfig);
        }
      }
    });

    // 6. Lighting (bright, balanced fill for desktop + mobile screens)
    this.editorAmbientLight = new THREE.AmbientLight('#ffffff', 0.65);
    this.scene.add(this.editorAmbientLight);
    this.editorHemiLight = new THREE.HemisphereLight('#dce8f8', '#687382', 0.85);
    this.scene.add(this.editorHemiLight);
    this.editorDirLight = new THREE.DirectionalLight('#ffffff', 1.2);
    this.editorDirLight.position.set(15, 25, 15);
    this.scene.add(this.editorDirLight);

    this.applyEditorOptimization();

    // 7. Grid Helper Floor
    const grid = new THREE.GridHelper(40, 40, '#dc2626', '#334155');
    grid.position.y = 0;
    this.scene.add(grid);

    // 8. Event listeners
    this.setupEventListeners();

    // 9. Load Objects
    this.rebuildScene();

    // 10. Start Loop
    this.animate();
  }

  private getSharedTexture(
    key: keyof MapEditorEngine['cachedTextures'],
    factory: () => THREE.CanvasTexture
  ): THREE.CanvasTexture {
    if (!this.cachedTextures[key]) {
      const tex = factory();
      const spec = OPTIMIZATION_SPECS[this.optimizationProfile];
      const hwMax = this.renderer?.capabilities?.getMaxAnisotropy?.() || 4;
      tex.anisotropy = Math.min(hwMax, spec.maxAnisotropy);
      this.cachedTextures[key] = tex;
    }
    return this.cachedTextures[key]!;
  }

  private updateGizmoSize() {
    if (!this.transformControls) return;
    if (this.isTouchMode) {
      this.transformControls.setSize(this.optimizationProfile === 'phone_performance' ? 1.4 : 1.25);
    } else {
      this.transformControls.setSize(1.0);
    }
  }

  public setDeviceAndOptimization(isTouch: boolean, profile: OptimizationProfile) {
    this.isTouchMode = isTouch;
    this.optimizationProfile = profile;
    this.updateGizmoSize();
    this.applyEditorOptimization();
    this.onResize();
  }

  private applyEditorOptimization() {
    if (!this.renderer || !this.camera || !this.scene) return;
    const spec = OPTIMIZATION_SPECS[this.optimizationProfile];

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, spec.maxPixelRatio));
    if (this.camera.far !== spec.cameraFar) {
      this.camera.far = spec.cameraFar;
      this.camera.updateProjectionMatrix();
    }

    const hwMax = this.renderer.capabilities?.getMaxAnisotropy?.() || 4;
    const targetAniso = Math.min(hwMax, spec.maxAnisotropy);
    Object.values(this.cachedTextures).forEach((tex) => {
      if (tex) {
        tex.anisotropy = targetAniso;
        tex.needsUpdate = true;
      }
    });

    const isPhone = this.optimizationProfile === 'phone_performance';
    const isTablet = this.optimizationProfile === 'tablet_balanced';
    this.renderer.toneMappingExposure = isPhone ? 1.32 : isTablet ? 1.24 : 1.2;

    if (this.isDarknessPreview) {
      this.editorAmbientLight.intensity = isPhone ? 0.08 : 0.04;
      this.editorHemiLight.intensity = isPhone ? 0.35 : isTablet ? 0.18 : 0.0;
      this.editorDirLight.intensity = isPhone ? 0.2 : 0.0;
      this.scene.background = new THREE.Color('#030508');
      this.scene.fog = new THREE.Fog('#030508', 18, 65);
    } else {
      this.editorAmbientLight.intensity = isPhone ? 1.15 : isTablet ? 0.85 : 0.65;
      this.editorHemiLight.intensity = isPhone ? 1.35 : isTablet ? 1.05 : 0.75;
      this.editorDirLight.intensity = isPhone ? 1.35 : isTablet ? 1.25 : 1.15;
      this.scene.background = new THREE.Color('#0c1017');
      this.scene.fog = new THREE.Fog('#0c1017', 25, 80);
    }

    // Adjust PointLight decay on mobile so Darkness Preview & Light Blocks match mobile gameplay
    this.objectMeshMap.forEach((group) => {
      group.traverse((child) => {
        if ((child as THREE.PointLight).isPointLight) {
          const pLight = child as THREE.PointLight;
          if (pLight.userData.baseDecay === undefined) {
            pLight.userData.baseDecay = pLight.decay;
          }
          pLight.decay = isPhone
            ? Math.min(pLight.userData.baseDecay, 1.0)
            : isTablet
            ? Math.min(pLight.userData.baseDecay, 1.35)
            : pLight.userData.baseDecay;
        }
      });
    });
  }

  private pointerDownPos: { x: number; y: number; isTouch: boolean } | null = null;
  private pointerDownOnGizmo: boolean = false;

  private setupEventListeners() {
    window.addEventListener('resize', this.onResize);
    if (typeof ResizeObserver !== 'undefined' && this.container) {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }

    this.renderer.domElement.addEventListener('pointerdown', this.onCanvasPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onCanvasPointerUp);
  }

  private onCanvasPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.pointerDownPos = { x: e.clientX, y: e.clientY, isTouch: e.pointerType === 'touch' };
    this.pointerDownOnGizmo =
      Boolean(this.transformControls.dragging) ||
      (Boolean((this.transformControls as any).object) && (this.transformControls as any).axis !== null);
  };

  private onCanvasPointerUp = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const downPos = this.pointerDownPos;
    const wasGizmo = this.pointerDownOnGizmo;
    this.pointerDownPos = null;
    this.pointerDownOnGizmo = false;

    if (wasGizmo || this.transformControls.dragging) return;

    // Allow slightly more finger-jitter tolerance on touch screens than mouse clicks
    if (downPos) {
      const dx = e.clientX - downPos.x;
      const dy = e.clientY - downPos.y;
      const maxSq = downPos.isTouch ? 196 : 36;
      if (dx * dx + dy * dy > maxSq) return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const selectableMeshes: THREE.Object3D[] = [];
    this.objectMeshMap.forEach((mesh) => selectableMeshes.push(mesh));

    const intersects = raycaster.intersectObjects(selectableMeshes, true);

    if (intersects.length > 0) {
      let topObj: THREE.Object3D | null = intersects[0].object;
      while (topObj && topObj.parent && topObj.parent !== this.scene) {
        topObj = topObj.parent;
      }

      if (topObj) {
        for (const [id, mesh] of this.objectMeshMap.entries()) {
          if (mesh === topObj) {
            this.selectObject(id);
            return;
          }
        }
      }
    } else {
      this.selectObject(null);
    }
  };

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public selectObject(id: string | null) {
    this.selectedObjectId = id;
    this.updateSelectionHelper();

    if (id) {
      const mesh = this.objectMeshMap.get(id);
      if (mesh && mesh.parent) {
        this.transformControls.attach(mesh);
      } else {
        this.transformControls.detach();
      }
    } else {
      this.transformControls.detach();
    }

    this.onSelectObject?.(id);
  }

  public focusObject(id: string) {
    const obj = this.mapConfig.objects.find((o) => o.id === id);
    if (!obj) return;
    const target = new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z);
    const offset = this.camera.position.clone().sub(this.controls.target);
    if (offset.lengthSq() < 1) offset.set(0, 10, 14);
    offset.clampLength(6, 26);
    this.controls.target.copy(target);
    this.camera.position.copy(target).add(offset);
    this.controls.update();
  }

  public resetCamera() {
    this.controls.target.set(0, 2, 0);
    this.camera.position.set(0, 14, 20);
    this.controls.update();
  }

  public zoomCamera(factor: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const nextLen = Math.max(this.controls.minDistance, Math.min(this.controls.maxDistance, offset.length() * factor));
    offset.setLength(nextLen);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  public setTransformMode(mode: 'translate' | 'rotate' | 'scale') {
    this.currentTransformMode = mode;
    this.transformControls.setMode(mode);
  }

  public setDarknessPreview(enabled: boolean) {
    this.isDarknessPreview = enabled;
    this.applyEditorOptimization();
  }

  private updateSelectionHelper() {
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.geometry.dispose();
      this.selectionBoxHelper = null;
    }

    if (this.selectedObjectId) {
      const mesh = this.objectMeshMap.get(this.selectedObjectId);
      if (mesh && mesh.parent) {
        this.selectionBoxHelper = new THREE.BoxHelper(mesh, 0x00f0ff);
        this.scene.add(this.selectionBoxHelper);
      }
    }
  }

  private disposeObject3D(root: THREE.Object3D) {
    const cachedTexSet = new Set(Object.values(this.cachedTextures).filter(Boolean));
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry && mesh.geometry !== this.sharedUnitBoxGeo) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (std.map && !cachedTexSet.has(std.map as THREE.CanvasTexture)) {
            std.map.dispose();
          }
          m.dispose();
        });
      }
    });
  }

  public rebuildScene() {
    this.transformControls.detach();

    this.objectMeshMap.forEach((mesh) => {
      this.scene.remove(mesh);
      this.disposeObject3D(mesh);
    });
    this.objectMeshMap.clear();

    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.geometry.dispose();
      this.selectionBoxHelper = null;
    }

    this.mapConfig.objects.forEach((obj) => {
      const mesh = this.createMeshForObject(obj);
      this.scene.add(mesh);
      this.objectMeshMap.set(obj.id, mesh);
    });

    this.applyEditorOptimization();
    this.updateSelectionHelper();

    if (this.selectedObjectId) {
      const mesh = this.objectMeshMap.get(this.selectedObjectId);
      if (mesh && mesh.parent) {
        this.transformControls.attach(mesh);
      } else {
        this.selectedObjectId = null;
        this.onSelectObject?.(null);
      }
    }
  }

  private createMeshForObject(obj: MapObject): THREE.Object3D {
    const group = new THREE.Group();
    group.position.set(obj.position.x, obj.position.y, obj.position.z);
    group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    group.scale.set(obj.scale?.x || 1, obj.scale?.y || 1, obj.scale?.z || 1);
    group.userData.objectType = obj.type;
    group.userData.texturePattern = obj.texturePattern;

    if (obj.type === 'block') {
      let mat: THREE.MeshStandardMaterial;
      if (obj.texturePattern === 'concrete') {
        mat = new THREE.MeshStandardMaterial({
          map: this.getSharedTexture('concrete', createFloorTexture),
          color: obj.color,
          roughness: 0.8,
        });
      } else if (obj.texturePattern === 'brick') {
        mat = new THREE.MeshStandardMaterial({
          map: this.getSharedTexture('brick', createWallTexture),
          color: obj.color,
          roughness: 0.6,
        });
      } else if (obj.texturePattern === 'wood') {
        mat = new THREE.MeshStandardMaterial({
          map: this.getSharedTexture('wood', createWoodPlankTexture),
          color: obj.color,
          roughness: 0.7,
        });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.5 });
      }

      const mesh = new THREE.Mesh(this.sharedUnitBoxGeo, mat);
      mesh.userData.isBlockMesh = true;
      group.add(mesh);
    } else if (obj.type === 'light') {
      const lightLevel = Math.max(0, obj.intensity ?? 0);

      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.22, 0.56),
        new THREE.MeshStandardMaterial({ color: '#181e29', roughness: 0.5, metalness: 0.7 })
      );
      housing.position.y = 0.14;
      group.add(housing);

      const coreMat = new THREE.MeshStandardMaterial({
        color: lightLevel > 0 ? obj.color : '#1f2937',
        emissive: obj.color,
        emissiveIntensity: lightLevel > 0 ? Math.min(4.0, 0.35 + lightLevel * 0.4) : 0,
        roughness: 0.2,
      });
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.44), coreMat);
      core.position.y = -0.04;
      core.userData.isLightCore = true;
      group.add(core);

      const cageMat = new THREE.MeshBasicMaterial({ color: obj.color, wireframe: true, opacity: 0.35, transparent: true });
      const cage = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), cageMat);
      cage.userData.isLightCage = true;
      group.add(cage);

      const pLight = new THREE.PointLight(obj.color, lightLevel * 6, obj.distance || 20, 1.0);
      pLight.userData.baseDecay = 1.0;
      pLight.userData.isLightPoint = true;
      group.add(pLight);
    } else if (obj.type === 'perk_juggernog' || obj.type === 'perk_speedcola' || obj.type === 'perk_doubletap') {
      const perkKey =
        obj.type === 'perk_juggernog'
          ? 'perk_juggernog'
          : obj.type === 'perk_speedcola'
          ? 'perk_speedcola'
          : 'perk_doubletap';
      const perkType =
        obj.type === 'perk_juggernog' ? 'juggernog' : obj.type === 'perk_speedcola' ? 'speedCola' : 'doubleTap';
      const bodyGeo = new THREE.BoxGeometry(1.4, 2.6, 1.2);
      const tex = this.getSharedTexture(perkKey, () => createPerkMachineTexture(perkType));
      const frontMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
      const sideMat = new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.4 });

      const body = new THREE.Mesh(bodyGeo, [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]);
      body.position.y = 1.3;
      group.add(body);

      const pLight = new THREE.PointLight(obj.color, 2, 6);
      pLight.position.set(0, 2.5, 0.6);
      group.add(pLight);
    } else if (obj.type === 'pack_a_punch') {
      const baseGeo = new THREE.BoxGeometry(2.4, 2.8, 1.2);
      const papTex = this.getSharedTexture('pap', createPackAPunchTexture);
      const frontMat = new THREE.MeshStandardMaterial({ map: papTex, roughness: 0.3 });
      const metalMat = new THREE.MeshStandardMaterial({ color: '#1c2432', roughness: 0.4, metalness: 0.8 });
      const base = new THREE.Mesh(baseGeo, [metalMat, metalMat, metalMat, metalMat, frontMat, metalMat]);
      base.position.y = 1.4;
      group.add(base);

      const pLight = new THREE.PointLight('#00ffff', 2, 6);
      pLight.position.set(0, 1.6, 0.7);
      group.add(pLight);
    } else if (obj.type === 'mystery_box') {
      const boxTex = this.getSharedTexture('box', createMysteryBoxTexture);
      const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.5 });
      const woodMat = new THREE.MeshStandardMaterial({ color: '#3b2210', roughness: 0.7 });
      const chestGeo = new THREE.BoxGeometry(2.2, 0.9, 1.1);
      const chest = new THREE.Mesh(chestGeo, [boxMat, boxMat, woodMat, woodMat, boxMat, boxMat]);
      chest.position.y = 0.45;
      group.add(chest);

      const pLight = new THREE.PointLight('#ffaa22', 1.8, 6);
      pLight.position.set(0, 1.2, 0);
      group.add(pLight);
    } else if (obj.type === 'window_barrier') {
      const plankTex = this.getSharedTexture('wood', createWoodPlankTexture);
      const plankMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.7 });
      const frameMat = new THREE.MeshStandardMaterial({ color: '#2a3240', metalness: 0.6 });

      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.6, 0.6), frameMat);
      frameL.position.set(-1.6, 0, 0);
      const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.6, 0.6), frameMat);
      frameR.position.set(1.6, 0, 0);
      group.add(frameL);
      group.add(frameR);

      [-0.8, -0.4, 0, 0.4, 0.8].forEach((yOff) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.28, 0.08), plankMat);
        p.position.set(0, yOff, 0);
        group.add(p);
      });
    } else if (
      obj.type in WALL_BUY_CONFIG ||
      obj.type === 'ammo_crate' ||
      obj.type === 'explosive_barrel' ||
      obj.type === 'teleporter' ||
      obj.type === 'crate_cover' ||
      obj.type === 'sandbag_wall' ||
      obj.type === 'pillar'
    ) {
      const propMesh = createCustomPropMesh(obj.type, obj.color);
      if (propMesh) {
        group.add(propMesh);
      }
    } else if (obj.type === 'player_spawn') {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.15, 16),
        new THREE.MeshBasicMaterial({ color: '#10b981', wireframe: true })
      );
      base.position.y = 0.08;
      group.add(base);

      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 8), new THREE.MeshBasicMaterial({ color: '#10b981' }));
      arrow.position.set(0, 0.8, 0);
      arrow.rotation.x = Math.PI;
      group.add(arrow);
    } else if (obj.type === 'zombie_spawn') {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.15, 16),
        new THREE.MeshBasicMaterial({ color: '#ef4444', wireframe: true })
      );
      base.position.y = 0.08;
      group.add(base);

      const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), new THREE.MeshBasicMaterial({ color: '#ef4444' }));
      skull.position.set(0, 0.8, 0);
      group.add(skull);

      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: '#ffcc00' }));
      eyes.position.set(0, 0.85, -0.2);
      group.add(eyes);
    }

    return group;
  }

  // Update a single object dynamically (in-place fast path prevents GPU lag/leaks on slider drags!)
  public updateObject(updated: MapObject) {
    const idx = this.mapConfig.objects.findIndex((o) => o.id === updated.id);
    const prevObj = idx !== -1 ? this.mapConfig.objects[idx] : null;
    if (idx !== -1) {
      this.mapConfig.objects[idx] = JSON.parse(JSON.stringify(updated));
    }

    const existing = this.objectMeshMap.get(updated.id);
    if (existing && prevObj && prevObj.type === updated.type) {
      const canFastUpdateBlock = updated.type === 'block' && prevObj.texturePattern === updated.texturePattern;
      const canFastUpdateLight = updated.type === 'light';
      const canFastUpdateTransformOnly =
        prevObj.color === updated.color &&
        prevObj.texturePattern === updated.texturePattern &&
        updated.type !== 'light';

      if (canFastUpdateBlock || canFastUpdateLight || canFastUpdateTransformOnly) {
        existing.position.set(updated.position.x, updated.position.y, updated.position.z);
        existing.rotation.set(updated.rotation.x, updated.rotation.y, updated.rotation.z);
        existing.scale.set(updated.scale?.x || 1, updated.scale?.y || 1, updated.scale?.z || 1);

        if (canFastUpdateBlock) {
          existing.traverse((c) => {
            if (c.userData.isBlockMesh) {
              const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
              mat.color.set(updated.color);
            }
          });
        } else if (canFastUpdateLight) {
          const lightLevel = Math.max(0, updated.intensity ?? 0);
          existing.traverse((c) => {
            if (c.userData.isLightCore) {
              const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
              mat.color.set(lightLevel > 0 ? updated.color : '#1f2937');
              mat.emissive.set(updated.color);
              mat.emissiveIntensity = lightLevel > 0 ? Math.min(4.0, 0.35 + lightLevel * 0.4) : 0;
            } else if (c.userData.isLightCage) {
              const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
              mat.color.set(updated.color);
            } else if (c.userData.isLightPoint) {
              const pLight = c as THREE.PointLight;
              pLight.color.set(updated.color);
              pLight.intensity = lightLevel * 6;
              pLight.distance = updated.distance || 20;
            }
          });
        }

        if (this.selectionBoxHelper && this.selectedObjectId === updated.id) {
          this.selectionBoxHelper.update();
        }
        this.onConfigChange?.(this.mapConfig);
        return;
      }
    }

    const isSelected = this.selectedObjectId === updated.id;
    if (isSelected) {
      this.transformControls.detach();
    }

    if (existing) {
      this.scene.remove(existing);
      this.disposeObject3D(existing);
    }

    const newMesh = this.createMeshForObject(updated);
    this.scene.add(newMesh);
    this.objectMeshMap.set(updated.id, newMesh);
    this.applyEditorOptimization();

    if (isSelected && newMesh.parent) {
      this.transformControls.attach(newMesh);
    }

    this.updateSelectionHelper();
    this.onConfigChange?.(this.mapConfig);
  }

  public addObject(newObj: MapObject) {
    this.mapConfig.objects.push(JSON.parse(JSON.stringify(newObj)));
    const mesh = this.createMeshForObject(newObj);
    this.scene.add(mesh);
    this.objectMeshMap.set(newObj.id, mesh);
    this.applyEditorOptimization();
    this.selectObject(newObj.id);
    this.onConfigChange?.(this.mapConfig);
  }

  public removeObject(id: string) {
    if (this.selectedObjectId === id) {
      this.selectObject(null);
    }
    this.mapConfig.objects = this.mapConfig.objects.filter((o) => o.id !== id);
    const mesh = this.objectMeshMap.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      this.disposeObject3D(mesh);
      this.objectMeshMap.delete(id);
    }
    this.onConfigChange?.(this.mapConfig);
  }

  public duplicateObject(id: string) {
    const original = this.mapConfig.objects.find((o) => o.id === id);
    if (!original) return;

    const copy: MapObject = JSON.parse(JSON.stringify(original));
    copy.id = 'obj_' + Math.random().toString(36).substring(2, 9);
    copy.name = copy.name + ' (Copy)';
    copy.position.x += 1.5;
    copy.position.z += 1.5;

    this.addObject(copy);
  }

  public exportTrackCode(): string {
    const minified = this.mapConfig.objects.map((obj) => ({
      t: obj.type,
      p: [Number(obj.position.x.toFixed(2)), Number(obj.position.y.toFixed(2)), Number(obj.position.z.toFixed(2))],
      r: [Number(obj.rotation.x.toFixed(2)), Number(obj.rotation.y.toFixed(2)), Number(obj.rotation.z.toFixed(2))],
      s: [Number(obj.scale.x.toFixed(2)), Number(obj.scale.y.toFixed(2)), Number(obj.scale.z.toFixed(2))],
      c: obj.color,
      tp: obj.texturePattern,
      n: obj.name,
      i: obj.intensity,
      d: obj.distance,
    }));

    const trackData = {
      name: this.mapConfig.name || 'Custom Track',
      ambientColor: this.mapConfig.ambientColor || '#3d4b64',
      floorSize: this.mapConfig.floorSize || { width: 24, depth: 24 },
      blocks: minified,
    };

    const jsonStr = JSON.stringify(trackData);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  }

  public importTrackCode(codeString: string): boolean {
    this.lastImportError = null;
    try {
      const trimmed = (codeString || '').trim();
      if (!trimmed) {
        this.lastImportError = 'Please paste a valid track code.';
        return false;
      }

      let decodedJson = '';
      try {
        decodedJson = decodeURIComponent(escape(atob(trimmed)));
      } catch {
        decodedJson = atob(trimmed);
      }

      const parsed = JSON.parse(decodedJson);
      const rawBlocks = Array.isArray(parsed) ? parsed : parsed.blocks || parsed.objects || [];
      if (!Array.isArray(rawBlocks)) {
        throw new Error('No blocks array found in the code.');
      }

      const importedObjects: MapObject[] = rawBlocks.map((item: any, idx: number) => {
        const type: MapObjectType = item.t || item.type || 'block';
        const pos = Array.isArray(item.p)
          ? { x: Number(item.p[0]) || 0, y: Number(item.p[1]) || 0, z: Number(item.p[2]) || 0 }
          : { x: Number(item.position?.x) || 0, y: Number(item.position?.y) || 0, z: Number(item.position?.z) || 0 };
        const rot = Array.isArray(item.r)
          ? { x: Number(item.r[0]) || 0, y: Number(item.r[1]) || 0, z: Number(item.r[2]) || 0 }
          : { x: Number(item.rotation?.x) || 0, y: Number(item.rotation?.y) || 0, z: Number(item.rotation?.z) || 0 };
        const scale = Array.isArray(item.s)
          ? { x: Number(item.s[0]) || 1, y: Number(item.s[1]) || 1, z: Number(item.s[2]) || 1 }
          : { x: Number(item.scale?.x) || 1, y: Number(item.scale?.y) || 1, z: Number(item.scale?.z) || 1 };

        return {
          id: `obj_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          name: item.n || item.name || `${type.replace('_', ' ')} ${idx + 1}`,
          type,
          position: pos,
          rotation: rot,
          scale,
          color: item.c || item.color || '#222a36',
          texturePattern: item.tp || item.texturePattern || 'plain',
          intensity: item.i ?? item.intensity ?? 3.0,
          distance: item.d ?? item.distance ?? 20,
        };
      });

      this.selectObject(null);
      this.mapConfig.name = parsed.name || this.mapConfig.name || 'Imported Custom Track';
      if (parsed.ambientColor) this.mapConfig.ambientColor = parsed.ambientColor;
      if (parsed.floorSize) this.mapConfig.floorSize = parsed.floorSize;
      this.mapConfig.objects = importedObjects;

      this.rebuildScene();
      this.onConfigChange?.(this.mapConfig);
      return true;
    } catch (err: any) {
      this.lastImportError = 'Invalid or corrupted track code: ' + (err?.message || 'Could not parse data');
      return false;
    }
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    this.controls.update();

    if (this.selectionBoxHelper) {
      this.selectionBoxHelper.update();
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    this.transformControls.detach();
    this.transformControls.dispose();
    if (this.transformGizmoHelper) {
      this.scene.remove(this.transformGizmoHelper);
      this.transformGizmoHelper = null;
    }
    this.objectMeshMap.forEach((mesh) => {
      this.scene.remove(mesh);
      this.disposeObject3D(mesh);
    });
    this.objectMeshMap.clear();
    this.sharedUnitBoxGeo.dispose();
    Object.values(this.cachedTextures).forEach((tex) => tex?.dispose());
    this.cachedTextures = {};

    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    if (this.renderer.domElement) {
      this.renderer.domElement.removeEventListener('pointerdown', this.onCanvasPointerDown);
      this.renderer.domElement.removeEventListener('pointerup', this.onCanvasPointerUp);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}

export function exportTrackCode(objects: MapObject[], mapName?: string): string {
  const minified = objects.map((obj) => ({
    t: obj.type,
    p: [Number(obj.position.x.toFixed(2)), Number(obj.position.y.toFixed(2)), Number(obj.position.z.toFixed(2))],
    r: [Number(obj.rotation.x.toFixed(2)), Number(obj.rotation.y.toFixed(2)), Number(obj.rotation.z.toFixed(2))],
    s: [Number(obj.scale.x.toFixed(2)), Number(obj.scale.y.toFixed(2)), Number(obj.scale.z.toFixed(2))],
    c: obj.color,
    tp: obj.texturePattern,
    n: obj.name,
    i: obj.intensity,
    d: obj.distance,
  }));
  const data = {
    name: mapName || 'Custom Track',
    blocks: minified,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function importTrackCode(codeString: string): { name: string; objects: MapObject[] } {
  const trimmed = (codeString || '').trim();
  if (!trimmed) throw new Error('Code is empty');
  let decoded = '';
  try {
    decoded = decodeURIComponent(escape(atob(trimmed)));
  } catch {
    decoded = atob(trimmed);
  }
  const data = JSON.parse(decoded);
  const rawList = Array.isArray(data) ? data : data.blocks || data.objects || [];
  if (!Array.isArray(rawList)) throw new Error('No blocks found in code');

  const objects: MapObject[] = rawList.map((item: any, idx: number) => {
    const type: MapObjectType = item.t || item.type || 'block';
    const pos = Array.isArray(item.p)
      ? { x: Number(item.p[0]) || 0, y: Number(item.p[1]) || 0, z: Number(item.p[2]) || 0 }
      : { x: Number(item.position?.x) || 0, y: Number(item.position?.y) || 0, z: Number(item.position?.z) || 0 };
    const rot = Array.isArray(item.r)
      ? { x: Number(item.r[0]) || 0, y: Number(item.r[1]) || 0, z: Number(item.r[2]) || 0 }
      : { x: Number(item.rotation?.x) || 0, y: Number(item.rotation?.y) || 0, z: Number(item.rotation?.z) || 0 };
    const scale = Array.isArray(item.s)
      ? { x: Number(item.s[0]) || 1, y: Number(item.s[1]) || 1, z: Number(item.s[2]) || 1 }
      : { x: Number(item.scale?.x) || 1, y: Number(item.scale?.y) || 1, z: Number(item.scale?.z) || 1 };

    return {
      id: `obj_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      name: item.n || item.name || `${type.replace('_', ' ')} ${idx + 1}`,
      type,
      position: pos,
      rotation: rot,
      scale,
      color: item.c || item.color || '#222a36',
      texturePattern: item.tp || item.texturePattern || 'plain',
      intensity: item.i ?? item.intensity ?? 3.0,
      distance: item.d ?? item.distance ?? 20,
    };
  });

  return {
    name: data.name || 'Imported Custom Track',
    objects,
  };
}
