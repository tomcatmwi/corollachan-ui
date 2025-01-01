<script setup lang="ts">
import { onBeforeMount, onMounted, ref } from 'vue';

//  VR related
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

//  Assets
import TestGirl from '@assets/models/Test Girl.vrm';
import background from '@assets/backgrounds/blue_gradient.jpg';

const vr = ref(null);
const ui = ref(null);

const renderer = new THREE.WebGLRenderer();

const light = new THREE.DirectionalLight(0xffffff, Math.PI);
const loader = new GLTFLoader();
const clock = new THREE.Clock();

let camera;
let controls;
let currentVrm;

//  Create scene and set background
const scene = new THREE.Scene();
const textureLoader = new THREE.TextureLoader();
scene.background = textureLoader.load(background);

onBeforeMount(() => {

    //  Renderer --------------------------------------------------------------------------
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    //  Camera ----------------------------------------------------------------------------
    camera = new THREE.PerspectiveCamera(30.0, window.innerWidth / window.innerHeight, 0.1, 20.0);
    camera.position.set(0.0, 1.0, 5.0);

    //  Camera controls -------------------------------------------------------------------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.target.set(0.0, 1.0, 0.0);
    controls.update();

    //  Lights  ---------------------------------------------------------------------------
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    //  Loader ----------------------------------------------------------------------------
    loader.crossOrigin = 'anonymous';
    loader.register(parser => new VRMLoaderPlugin(parser));

    loader.load(

        // URL of the VRM you want to load
        TestGirl,

        // called when the resource is loaded
        gltf => {
            const vrm = gltf.userData.vrm;

            // Calling these functions greatly improves the performance
            VRMUtils.removeUnnecessaryVertices(gltf.scene);
            VRMUtils.combineSkeletons(gltf.scene);
            VRMUtils.combineMorphs(vrm);

            // Disable frustum culling
            vrm.scene.traverse(obj => obj.frustumCulled = false);

            currentVrm = vrm;
            scene.add(vrm.scene);
        },

        //  Progressbar
        progress => console.log(`Loading model: ${100.0 * ( progress.loaded / progress.total )}%`),

        //  Error handler
        error => console.error(error)
    );

    //  Helpers ---------------------------------------------------------------------------
    //  scene.add(new THREE.GridHelper(10, 10));
    //  scene.add(new THREE.AxesHelper(5));

    //  Animations ------------------------------------------------------------------------
    
    clock.start();

    function animate() {
        requestAnimationFrame(animate);
        if (currentVrm)
            currentVrm.update(clock.getDelta());

        renderer.render(scene, camera);        
    }

    animate();
});

onMounted(() => {
    vr.value.appendChild(renderer.domElement);    
});

</script>

<template>

    <!-- UI components -->
    <div id="ui" ref="ui">
        Corolla-chan
    </div>
    
    <!-- VR canvas -->
    <div id="vr" ref="vr"></div>
    
</template>
