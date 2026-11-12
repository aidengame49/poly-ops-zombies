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
  createWallBuyChalkTexture,
} from '../utils/proceduralTextures';
import { createWeapon3DModel } from './GameEngine';

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

  // Callbacks
  public onSelectObject?: (id: string | null) => void;
  public onConfigChange?: (config: CustomMapConfig) => void;

  private resizeObserver: ResizeObserver | null = null;
  private dragStartScale: THREE.Vector3 | null = null;
  private dragStartPosition: THREE.Vector3 | null = null;

  constructor(container: HTMLDivElement, initialConfig: CustomMapConfig) {
    this.container = container;
    this.mapConfig = JSON.parse(JSON.stringify(initialConfig));
    this.clock = new THREE.Clock();

    const width = this.container.clientWidth || Math.max(300, window.innerWidth - 608);
    const height = this.container.clientHeight || Math.max(300, window.innerHeight - 56);

    // 1. Scene & Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0c1017');
    this.scene.fog = new THREE.Fog('#0c1017', 25, 80);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      1000
    );
    this.camera.position.set(0, 14, 20);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls (Unity-like 3D manipulation)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01; // Don't go below ground
    this.controls.minDistance = 2;
    this.controls.maxDistance = 60;
    this.controls.target.set(0, 2, 0);

    // 5. Interactive 3D Transform Gizmos (Move, Scale, Rotate)
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.setMode(this.currentTransformMode);
    this.transformControls.setSpace('world');
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

    // 6. Lighting
    const amb = new THREE.AmbientLight('#ffffff', 0.6);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight('#ffffff', 1.2);
    dir.position.set(15, 25, 15);
    this.scene.add(dir);

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

  private setupEventListeners() {
    window.addEventListener('resize', this.onResize);
    if (typeof ResizeObserver !== 'undefined' && this.container) {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }

    // Raycast click-to-select in 3D viewport
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      // Only handle primary left click
      if (e.button !== 0) return;

      // Ignore raycasts if user is dragging transform gizmo
      if (this.transformControls.dragging) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

      // Check if click hit transformControls gizmo
      if (this.transformGizmoHelper) {
        const gizmoIntersects = raycaster.intersectObjects([this.transformGizmoHelper], true);
        if (gizmoIntersects.length > 0) return;
      }

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
      }
    });
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth || Math.max(300, window.innerWidth - 608);
    const height = this.container.clientHeight || Math.max(300, window.innerHeight - 56);
    if (width === 0 || height === 0) return;
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

  public setTransformMode(mode: 'translate' | 'rotate' | 'scale') {
    this.currentTransformMode = mode;
    this.transformControls.setMode(mode);
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

  public rebuildScene() {
    this.transformControls.detach();

    // Clear old object meshes
    this.objectMeshMap.forEach((mesh) => this.scene.remove(mesh));
    this.objectMeshMap.clear();

    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper = null;
    }

    // Build meshes for each object in config
    this.mapConfig.objects.forEach((obj) => {
      const mesh = this.createMeshForObject(obj);
      this.scene.add(mesh);
      this.objectMeshMap.set(obj.id, mesh);
    });

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

    if (obj.type === 'block') {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      
      let mat: THREE.Material;
      if (obj.texturePattern === 'concrete') {
        mat = new THREE.MeshStandardMaterial({ map: createFloorTexture(), color: obj.color, roughness: 0.8 });
      } else if (obj.texturePattern === 'brick') {
        mat = new THREE.MeshStandardMaterial({ map: createWallTexture(), color: obj.color, roughness: 0.6 });
      } else if (obj.texturePattern === 'wood') {
        mat = new THREE.MeshStandardMaterial({ map: createWoodPlankTexture(), color: obj.color, roughness: 0.7 });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.5 });
      }

      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
    } else if (obj.type === 'light') {
      // Light Bulb / Cube indicator + Actual PointLight
      const bulbGeo = new THREE.SphereGeometry(0.3, 12, 12);
      const bulbMat = new THREE.MeshBasicMaterial({ color: obj.color });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      group.add(bulb);

      const cage = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: obj.color, wireframe: true }));
      group.add(cage);

      const pLight = new THREE.PointLight(obj.color, obj.intensity, obj.distance);
      group.add(pLight);
    } else if (obj.type === 'perk_juggernog' || obj.type === 'perk_speedcola' || obj.type === 'perk_doubletap') {
      const perkType = obj.type === 'perk_juggernog' ? 'juggernog' : obj.type === 'perk_speedcola' ? 'speedCola' : 'doubleTap';
      const bodyGeo = new THREE.BoxGeometry(1.4, 2.6, 1.2);
      const tex = createPerkMachineTexture(perkType);
      const frontMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
      const sideMat = new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.4 });

      const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat];
      const body = new THREE.Mesh(bodyGeo, materials);
      body.position.y = 1.3;
      group.add(body);

      const pLight = new THREE.PointLight(obj.color, 2, 6);
      pLight.position.set(0, 2.5, 0.6);
      group.add(pLight);
    } else if (obj.type === 'pack_a_punch') {
      const baseGeo = new THREE.BoxGeometry(2.4, 2.8, 1.2);
      const papTex = createPackAPunchTexture();
      const frontMat = new THREE.MeshStandardMaterial({ map: papTex, roughness: 0.3 });
      const metalMat = new THREE.MeshStandardMaterial({ color: '#1c2432', roughness: 0.4, metalness: 0.8 });
      const materials = [metalMat, metalMat, metalMat, metalMat, frontMat, metalMat];
      const base = new THREE.Mesh(baseGeo, materials);
      base.position.y = 1.4;
      group.add(base);

      const pLight = new THREE.PointLight('#00ffff', 2, 6);
      pLight.position.set(0, 1.6, 0.7);
      group.add(pLight);
    } else if (obj.type === 'mystery_box') {
      const boxTex = createMysteryBoxTexture();
      const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.5 });
      const woodMat = new THREE.MeshStandardMaterial({ color: '#3b2210', roughness: 0.7 });
      const chestGeo = new THREE.BoxGeometry(2.2, 0.9, 1.1);
      const materials = [boxMat, boxMat, woodMat, woodMat, boxMat, boxMat];
      const chest = new THREE.Mesh(chestGeo, materials);
      chest.position.y = 0.45;
      group.add(chest);

      const pLight = new THREE.PointLight('#ffaa22', 1.8, 6);
      pLight.position.set(0, 1.2, 0);
      group.add(pLight);
    } else if (obj.type === 'window_barrier') {
      const plankTex = createWoodPlankTexture();
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
    } else if (obj.type === 'wall_buy_smg' || obj.type === 'wall_buy_ar' || obj.type === 'wall_buy_shotgun') {
      const name = obj.type === 'wall_buy_smg' ? 'MP40' : obj.type === 'wall_buy_ar' ? 'KN-44' : 'KRM-262';
      const price = obj.type === 'wall_buy_smg' ? 1000 : obj.type === 'wall_buy_ar' ? 1500 : 1200;
      const wepType = obj.type === 'wall_buy_smg' ? 'smg' : obj.type === 'wall_buy_ar' ? 'ar' : 'shotgun';

      const tex = createWallBuyChalkTexture(name, price);
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.08), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
      group.add(plaque);

      const gunModel = createWeapon3DModel(wepType, false);
      gunModel.scale.set(1.1, 1.1, 1.1);
      gunModel.position.set(0, 0.18, 0.1);
      gunModel.rotation.y = Math.PI / 2;
      group.add(gunModel);
    } else if (obj.type === 'player_spawn') {
      // Spawn pedestal & arrow
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 16), new THREE.MeshBasicMaterial({ color: '#10b981', wireframe: true }));
      base.position.y = 0.08;
      group.add(base);

      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 8), new THREE.MeshBasicMaterial({ color: '#10b981' }));
      arrow.position.set(0, 0.8, 0);
      arrow.rotation.x = Math.PI;
      group.add(arrow);
    } else if (obj.type === 'zombie_spawn') {
      // Zombie Spawn Pedestal & Skull Marker
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 16), new THREE.MeshBasicMaterial({ color: '#ef4444', wireframe: true }));
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

  // Update a single object dynamically
  public updateObject(updated: MapObject) {
    const isSelected = this.selectedObjectId === updated.id;
    if (isSelected) {
      this.transformControls.detach();
    }

    const idx = this.mapConfig.objects.findIndex((o) => o.id === updated.id);
    if (idx !== -1) {
      this.mapConfig.objects[idx] = JSON.parse(JSON.stringify(updated));
    }

    const oldMesh = this.objectMeshMap.get(updated.id);
    if (oldMesh) {
      this.scene.remove(oldMesh);
    }

    const newMesh = this.createMeshForObject(updated);
    this.scene.add(newMesh);
    this.objectMeshMap.set(updated.id, newMesh);

    if (isSelected && newMesh.parent) {
      this.transformControls.attach(newMesh);
    }

    this.updateSelectionHelper();
    this.onConfigChange?.(this.mapConfig);
  }

  // Add object
  public addObject(newObj: MapObject) {
    this.mapConfig.objects.push(JSON.parse(JSON.stringify(newObj)));
    const mesh = this.createMeshForObject(newObj);
    this.scene.add(mesh);
    this.objectMeshMap.set(newObj.id, mesh);
    this.selectObject(newObj.id);
    this.onConfigChange?.(this.mapConfig);
  }

  // Remove object
  public removeObject(id: string) {
    if (this.selectedObjectId === id) {
      this.selectObject(null);
    }
    this.mapConfig.objects = this.mapConfig.objects.filter((o) => o.id !== id);
    const mesh = this.objectMeshMap.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      this.objectMeshMap.delete(id);
    }
    this.onConfigChange?.(this.mapConfig);
  }

  // Duplicate object
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

  // --------------------------------------------------------------------------
  // PolyTrack-Style Custom World Track Export & Import System
  // --------------------------------------------------------------------------

  /**
   * Data Compression (Export):
   * Converts placed objects/blocks array into a clean, minified JSON string
   * saving essential properties (block type, x, y, z coords, rotation, scale, etc.)
   * and encodes into a Base64 text string using btoa().
   */
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

  /**
   * Data Loading (Import):
   * Decodes the Base64 string using atob(), parses the JSON safely inside a try/catch,
   * clears the current track, and spawns all the blocks into the game world.
   */
  public importTrackCode(codeString: string): boolean {
    try {
      const trimmed = (codeString || '').trim();
      if (!trimmed) {
        alert('Please paste a valid track code.');
        return false;
      }

      let decodedJson = '';
      try {
        decodedJson = decodeURIComponent(escape(atob(trimmed)));
      } catch {
        decodedJson = atob(trimmed);
      }

      const parsed = JSON.parse(decodedJson);
      const rawBlocks = Array.isArray(parsed) ? parsed : (parsed.blocks || parsed.objects || []);
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

      // Clear current track and replace with newly imported track
      this.selectObject(null);
      this.mapConfig.name = parsed.name || this.mapConfig.name || 'Imported Custom Track';
      if (parsed.ambientColor) this.mapConfig.ambientColor = parsed.ambientColor;
      if (parsed.floorSize) this.mapConfig.floorSize = parsed.floorSize;
      this.mapConfig.objects = importedObjects;

      this.rebuildScene();
      this.onConfigChange?.(this.mapConfig);
      return true;
    } catch (err: any) {
      alert('Invalid or corrupted track code: ' + (err?.message || 'Could not parse data'));
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
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
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

// Standalone Helper functions matching exact naming requirements
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
  try {
    const trimmed = (codeString || '').trim();
    if (!trimmed) throw new Error('Code is empty');
    let decoded = '';
    try {
      decoded = decodeURIComponent(escape(atob(trimmed)));
    } catch {
      decoded = atob(trimmed);
    }
    const data = JSON.parse(decoded);
    const rawList = Array.isArray(data) ? data : (data.blocks || data.objects || []);
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
  } catch (err: any) {
    alert('Invalid or corrupted track code: ' + (err?.message || 'Could not parse data'));
    throw err;
  }
}
