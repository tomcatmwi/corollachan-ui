<script lang="ts" setup>
import { onBeforeMount, onMounted, ref, watch } from 'vue';
import type { Ref } from 'vue';

//  Pinia
import { useIdoruStore } from '@pinia';

//  VR related
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { gsap } from 'gsap';
import { loadMixamoAnimation } from '@utils';

//  Three.js objects
import { PerspectiveCamera } from 'three/addons/cameras/PerspectiveCamera.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//  Text to speech
import { TextToSpeech } from '@capacitor-community/text-to-speech';

//  Assets
import TestGirl from '@assets/models/Test Girl.vrm';
import background from '@assets/backgrounds/blue_gradient.jpg';
import faces from '@assets/faces/faces.json';
import lipsync from '@assets/faces/lipsync.json';
import settings from '@assets/settings.json';

//  Animations
import Animations from '@assets/animations/animations';

interface Lipsync {
    p: string[],
    aa?: number;
    ee?: number;
    ih?: number;
    oh?: number;
    ou?: number;
}

console.log('segg');
const idoruStore = useIdoruStore();
console.log('segg 2');

//  DOM element refs
const vr = ref(null);
const loadedPercent = ref(0);

const renderer = new THREE.WebGLRenderer();

const light = new THREE.DirectionalLight(0xffffff, Math.PI);
const loader = new GLTFLoader();
const clock = new THREE.Clock();

let animationMixer;
let previousAnimationClip;
let animationQueue = [];

const emotionNames: string[] = Object.values(VRMExpressionPresetName);

let camera: PerspectiveCamera;
let controls: OrbitControls;
let currentVrm: any;

//  ------------ Animation flags ---------------------------------------------------------------------

//  Divergence of eyes (random micromovements)
const eyeDivergence = [0, 0];

//  Disable automatic eye movements (including subtle eye movements)
let overrideEyeMovements = false;

//  ------------ Text to speech values ---------------------------------------------------------------

//  Currently spoken string & speaking queue
const speaking: Ref<string> = ref(null as unknown as string);
const speakQueue: string[] = [];

//  Subtitles to be shown on screen
const subtitle: Ref<string> = ref(null as unknown as string);

//  Index of the last word shown in the subtitle 
let subtitleEnd = -1;

const phonemeDuration = 0.1 / settings.speech.rate;

//  The currently spoken text broken into words
let words: string[] = [];

//  The currently spoken text broken into facial expression values
let visemes: Record<string, number>[][] = [];

//  The currently spoken word's index
let wordCounter = 0;

//  --------------------------------------------------------------------------------------------

//  Create scene and set background
const scene = new THREE.Scene();
const textureLoader = new THREE.TextureLoader();
scene.background = textureLoader.load(background);

//  -------------- Pinia watchers --------------------------------------------------------------
watch(() => idoruStore.cameraPosition, (newPosition) => moveCamera(newPosition));

//  -------------- Pinia watchers --------------------------------------------------------------

//  Moves the camera to a predefined location (animated)
const moveCamera = (position: string = 'full') => {
    console.log('Moving camera');

    if (!(position in settings.cameraPositions))
        return;

    console.log('Really moving camera');

    gsap.to(camera.position, {
        x: settings.cameraPositions[position][0],
        y: settings.cameraPositions[position][1],
        z: settings.cameraPositions[position][2],
        duration: 1,
        ease: "power2.inOut",
        onComplete: () => idoruStore.changeCameraPosition(position)
    });    
}

//  Gets the current emotions on the model's face
const getEmotions = () => {
    const states: Record<string, number> = {};
    for (const emotion of emotionNames)
        states[emotion] = currentVrm.expressionManager.getValue(emotion) || 0;
    return states;
};

//  Gets the current angle of eyes
const getEyeRotation = (eye: 'leftEye' | 'rightEye') => {
    if (!currentVrm) return null;

    const eyeBone = currentVrm.humanoid.getNormalizedBoneNode(eye);
    if (!eyeBone) return null;

    // Return the rotation as an object with x, y, and z in degrees
    return {
        x: THREE.MathUtils.radToDeg(eyeBone.rotation.x),
        y: THREE.MathUtils.radToDeg(eyeBone.rotation.y),
        z: THREE.MathUtils.radToDeg(eyeBone.rotation.z),
    };
};

//  Applies a predefined facial expression
const applyFace = (expression: string, duration: number = 0.5, ease: string = 'power2.inOut') => {
    if (!currentVrm || !(expression in faces)) return;

    const targetExpression = faces[expression];
    
    //  Stop blinking
    currentVrm.expressionManager.overrideBlink = targetExpression?.overrideBlink || false;
    overrideEyeMovements = targetExpression?.overrideEyeMovements || false;

    //  Get eye movements
    const eyes = {
        leftEye: [
            targetExpression?.leftEye?.[0] || null,
            targetExpression?.leftEye?.[1] || null,
            targetExpression?.leftEye?.[2] || null
        ],
        rightEye: [
            targetExpression?.rightEye?.[0] || null,
            targetExpression?.rightEye?.[1] || null,
            targetExpression?.rightEye?.[2] || null
        ]
    }

    if ('lookUp' in targetExpression) {
        eyes.leftEye[0] = -targetExpression.lookUp;
        eyes.rightEye[0] = -targetExpression.lookUp;
    }

    if ('lookDown' in targetExpression) {
        eyes.leftEye[0] = +targetExpression.lookDown;
        eyes.rightEye[0] = +targetExpression.lookDown;
    }

    if ('lookLeft' in targetExpression) {
        eyes.leftEye[1] = targetExpression.lookLeft;
        eyes.rightEye[1] = targetExpression.lookLeft;
    }

    if ('lookRight' in targetExpression) {
        eyes.leftEye[1] = -targetExpression.lookRight;
        eyes.rightEye[1] = -targetExpression.lookRight;
    }

    ['leftEye', 'rightEye'].forEach(eye => {
        const eyeBone = currentVrm.humanoid.getNormalizedBoneNode(eye)

        gsap.to(eyeBone.rotation, {
            x: eyes?.[eye]?.[0] !== null ? THREE.MathUtils.degToRad(eyes[eye][0]) : eyeBone.rotation.x,
            y: eyes?.[eye]?.[1] !== null ? THREE.MathUtils.degToRad(eyes[eye][1]) : eyeBone.rotation.y,
            z: eyes?.[eye]?.[2] !== null ? THREE.MathUtils.degToRad(eyes[eye][2]) : eyeBone.rotation.z,
            duration: 0.3,
            ease: "power2.inOut",
        });
    });

    const keys = targetExpression?.keys;
    if (!keys) 
        return;

    //  The current animation state (at any point)
    const animatedExpression = { ...getEmotions() };

    gsap.to(animatedExpression, {
        duration,
        ease,
        onUpdate: function () {
            for (const key of Object.keys(targetExpression.keys)) {
                const value = animatedExpression[key];
                currentVrm.expressionManager.setValue(key, value);
            }
        },
        ...targetExpression.keys
    });
};

//  Loads and applies a pose/animation from a Mixamo FBX file
const applyAnimation = (animation, loop: number = 1, mixing: boolean = false) => {
    if (!currentVrm) return;

    if (!animationMixer) {
        animationMixer = new THREE.AnimationMixer(currentVrm.scene);
        animationMixer.timeScale = settings.animations.timeScale || 10;

        // Detect when the animation ends and add idle
        animationMixer.addEventListener('finished', e => {
            animationMixer.existingAction(previousAnimationClip).fadeOut(0.5);

            if (animationQueue.length > 0) {
                applyAnimation(animationQueue[animationQueue.length - 1]);
                animationQueue.length--;
            } else {

                let idleAnimation = Animations.Idle;
                const random = Math.floor(Math.random() * 5) + 1;

                switch(random) {
                    case 1: idleAnimation = Animations.Bored; break;
                    case 2: idleAnimation = Animations.Happy_Idle; break;
                    case 3: idleAnimation = Animations.Look_Around_3; break;
                    case 4: idleAnimation = Animations.Weight_Shift; break;
                }
                applyAnimation(idleAnimation);
            }
        });        
    }

    const clip = loadMixamoAnimation(Animations[animation], currentVrm);

    if (previousAnimationClip)
        animationMixer.existingAction(previousAnimationClip).fadeOut(0.5);

    previousAnimationClip = clip;

    const action = animationMixer.clipAction(clip);
    action.clampWhenFinished = true;

    action
        .setLoop(THREE.LoopOnce)
        .reset()
        .fadeIn(0.5)
        .play();      

}

onBeforeMount(() => {

    //  Renderer --------------------------------------------------------------------------
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    //  Camera ----------------------------------------------------------------------------
    camera = new THREE.PerspectiveCamera(30.0, window.innerWidth / window.innerHeight, 0.1, 20.0);
    camera.position.set(...settings.cameraPositions.full);

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
    loader.register((parser: any) => new VRMLoaderPlugin(parser));

    loader.load(

        TestGirl,

        gltf => {
            console.log('Girl loaded');
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
        progress => {
            loadedPercent.value = 100 * (progress.loaded / progress.total);
        },

        //  Error handler
        error => console.error(error)
    );

    //  Helpers ---------------------------------------------------------------------------
    //scene.add(new THREE.GridHelper(10, 10));
    //scene.add(new THREE.AxesHelper(5));

    //  Animations ------------------------------------------------------------------------

    // Blinking ---------------------------------------------------------
    if (!!settings.eyes.blinkRate)
        gsap.to({}, {
            repeat: -1,                     // Infinite repeats
            repeatDelay: 1,                 
            onRepeat: () => {
                if (!currentVrm || currentVrm.expressionManager.overrideBlink || Math.floor(Math.random() * 10) < settings.eyes.blinkRate) 
                    return;
                
                gsap.to({ blink: 0 }, {
                    blink: 1,                // Fully closed eyes
                    duration: 0.1,           // Closing duration
                    onUpdate: function () {
                        currentVrm.expressionManager.setValue('blink', this.targets()[0].blink);
                    },
                    onComplete: () => {

                        //  Open eyes after closing
                        gsap.to({ blink: 1 }, {
                            blink: 0,        // Fully open eyes
                            duration: 0.1,   // Opening duration
                            onUpdate: function () {
                                currentVrm.expressionManager.setValue('blink', this.targets()[0].blink);
                            },
                        });
                    },
                });
            }
        });

    //  Subtle eye movements
    if (settings.eyes.subtleEyeMovements)
        gsap.to({}, {
            repeat: -1,
            repeatDelay: 0.3,
            onRepeat: () => {
                if (!currentVrm || !!overrideEyeMovements)
                    return;

                const faceCamera = ['face'].includes(idoruStore.cameraPosition);

                //  Move eyeball only if the camera is in "face" mode
                //  If we aren't in "face" mode, reset divergence
                if (!faceCamera && eyeDivergence[0] === 0 && eyeDivergence[1] === 0)
                    return;

                let moveX: number = 0;
                let moveY: number = 0;

                if (faceCamera) {
                    moveX = (Math.round((Math.random() * 2 - 1) * 1000) / 1000) / 100;
                    moveY = (Math.round((Math.random() * 2 - 1) * 1000) / 1000) / 40;
                }

                const rightEye = currentVrm.humanoid.getNormalizedBoneNode('rightEye');
                const leftEye = currentVrm.humanoid.getNormalizedBoneNode('leftEye');

                const newX = rightEye.rotation.x - eyeDivergence[0] + moveX;
                const newY = rightEye.rotation.y - eyeDivergence[1] + moveY;
                eyeDivergence[0] = moveX;
                eyeDivergence[1] = moveY;

                gsap.to(leftEye.rotation, {
                    x: newX,
                    y: newY,
                    duration: 0.25
                });

                gsap.to(rightEye.rotation, {
                    x: newX,
                    y: newY,
                    duration: 0.25
                });
                
            }
        }); 

    clock.start();

    //  Animation loop - animations are handled by gsap
    function animate() {
        requestAnimationFrame(animate);

        if (!currentVrm)
            return;

        //  Animation loop
        currentVrm.update(clock.getDelta());

        const rootBone = currentVrm.humanoid?.getNormalizedBoneNode('hips') || currentVrm.scene.children.find((child) => child.isBone);
        rootBone.position.x = 0;
        rootBone.position.y = 1;
        rootBone.position.z = 0;

        // Update the animation mixer
       if (animationMixer)
           animationMixer.update(clock.getDelta());

        renderer.render(scene, camera);        
    }

    animate();

});

onMounted(() => {

    if (!!vr.value)
        vr.value.appendChild(renderer.domElement);

    //  TextToSpeech lipsync tracking -------------------------------------------------------------------------
    TextToSpeech.addListener('onRangeStart', () => {

        //  Generate the next subtitle
        if (settings.subtitles.on && subtitleEnd <= wordCounter) {
            let sub = '';
            let counter = wordCounter;
            while (sub.length <= settings.subtitles.length && counter < words.length) {
                if (!!sub)
                    sub += ' ';
                sub += words[counter];
                counter++;
            }
            subtitle.value = sub;
            subtitleEnd = counter;
        }

        //  Choose current visemes
        //  Fallback is for words without visemes (ie. numbers)
        let currentVisemes = visemes[wordCounter];
        wordCounter++;

        //  Sequentially show all lip sync phases for the current word
        const animateNext = (cursor: number = 0) => {

            const targetExpression = currentVisemes?.[cursor];
            if (!targetExpression)
                return;

            const animatedExpression = { ...getEmotions() };

            gsap.to(animatedExpression, {
                duration: phonemeDuration,
                onUpdate: function () {
                    for (const key of Object.keys(targetExpression)) {
                        const value = animatedExpression[key];
                        currentVrm.expressionManager.setValue(key, value);
                    }
                },
                onComplete: function() {
                    if (cursor + 1 < currentVisemes.length)
                        animateNext(cursor + 1)
                },            
                ...targetExpression
            });        
        }

        animateNext();            
    });
});

const speak = (text: string) => {

    if (!text || text.length === 0)
        return;

    //  If already speaking, put the current text in the queue
    if (speaking.value)
        return speakQueue.push(text);

    speaking.value = text;

    //  Break down text into words and visemes
    words = text.split(/[-\s]/);
    visemes = [];

    words.forEach(word => {
        word = word.toLowerCase();
        const tempVisemes: Record<string, number>[] = [];
        let cursor = 0;

        //  Numbers get special treatment
        if (!isNaN(Number(word))) {
            for (let x = 0; x < word.length; x++) {
                tempVisemes.push({ aa: 0.75, ee: 0, ih: 0, ou: 0, oh: 0 } as any);
                tempVisemes.push({ aa: 0.05, ee: 1, ih: 0.1, ou: 0, oh: 0 } as any);
            }
            visemes.push(tempVisemes);
            return;
        }

        while (cursor <= word.length) {

            let found = false;
            for(let t = 3; t > 0; t--) {

                if (cursor + t <= word.length) {
                    const viseme: Lipsync = lipsync[idoruStore.language]
                        .find((value: Lipsync) => value.p.includes(word.substring(cursor, cursor + t)));

                    if (!!viseme) {
                        tempVisemes.push({
                            aa: viseme?.aa || 0,
                            ee: viseme?.ee || 0,
                            ih: viseme?.ih || 0,
                            ou: viseme?.ou || 0,
                            oh: viseme?.oh || 0
                        });

                        found = true;
                        cursor += t;
                    }
                }
            }

            if (!found)
                cursor++;
        }

        visemes.push(tempVisemes);
    });

    wordCounter = 0;

    //  Run text to speech
    TextToSpeech.speak({
        text,
        lang: idoruStore.language,
        category: 'ambient',
        queueStrategy: 1,
        ...settings.speech
    })
    .then(() => {
        const animatedExpression = { ...getEmotions() };
        
        //  Close mouth when finished speaking        
        gsap.to(animatedExpression, {
            duration: phonemeDuration,
            onUpdate: function () {
                for (const key of Object.keys(faces.stfu.keys)) {
                    const value = animatedExpression[key];
                    currentVrm.expressionManager.setValue(key, value);
                }
            },
            onComplete: function() {
                speaking.value = null as unknown as string;
                subtitle.value = null as unknown as string;
                subtitleEnd = -1;

                if (!speakQueue.length)
                    return;

                const newSpeaking = speakQueue[speakQueue.length-1];
                speakQueue.length -= 1;
                speak(newSpeaking);
            },   
            ...faces.stfu.keys
        });
    });
}

</script>
<template>

    <!-- Subtitles -->
    <div v-if="settings.subtitles.on && !!subtitle" class="subtitles">
        <div class="text">{{ subtitle }}</div>
    </div>
    
    <!-- VR canvas -->
    <div id="vr" ref="vr" class="idoru"></div>
</template>
