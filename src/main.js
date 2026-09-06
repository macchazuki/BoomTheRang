import * as THREE from 'three';
import { GAME_NAME } from './game.js';
import './style.css';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('The game root element was not found.');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1220);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.setAttribute('aria-label', `${GAME_NAME} background scene`);
app.appendChild(renderer.domElement);

const geometry = new THREE.TorusKnotGeometry(0.7, 0.22, 96, 16);
const material = new THREE.MeshStandardMaterial({
  color: 0xff6b35,
  metalness: 0.25,
  roughness: 0.45,
});
const playerMarker = new THREE.Mesh(geometry, material);
scene.add(playerMarker);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(2, 3, 4);
scene.add(keyLight);
scene.add(new THREE.AmbientLight(0x7c8db5, 1.2));

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  playerMarker.rotation.x = elapsed * 0.45;
  playerMarker.rotation.y = elapsed * 0.8;
  renderer.render(scene, camera);
});

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', resize);
