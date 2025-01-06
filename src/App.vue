<script setup lang="ts">
import { onBeforeMount, onMounted, ref } from 'vue';
import type { Ref } from 'vue';

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
import Bow from '@assets/animations/Quick Formal Bow.json';
import Clap from '@assets/animations/Clapping.json';
import Idle from '@assets/animations/Idle.json';
import HappyIdle from '@assets/animations/Happy Idle.json';
import LookAround from '@assets/animations/Look Around.json';
import LookAround2 from '@assets/animations/Look Around 2.json';
import LookAround3 from '@assets/animations/Look Around 3.json';
import Shuffling from '@assets/animations/Shuffling.json';
import WeightShift from '@assets/animations/Weight Shift.json';
import Bored from '@assets/animations/Bored.json';
import Macarena from '@assets/animations/Macarena Dance.json';

interface Lipsync {
    p: string[],
    aa?: number;
    ee?: number;
    ih?: number;
    oh?: number;
    ou?: number;
}

//  DOM element refs
const vr = ref<HTMLDivElement | null>(null);
const ui = ref<HTMLDivElement | null>(null);

const renderer = new THREE.WebGLRenderer();

const light = new THREE.DirectionalLight(0xffffff, Math.PI);
const loader = new GLTFLoader();
const clock = new THREE.Clock();
let corollaChan;

const cameraPositions: Record<string, number[]> = {
    full: [0, 1, 4],
    face: [0, 1.5, 1]
}

const currentCamera: Ref<string> = ref(Object.keys(cameraPositions)[0]);

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

const language = ref('en-US');

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

//  Moves the camera to a predefined location (animated)
const moveCamera = (position: string = 'full') => {
    if (!(position in cameraPositions))
        return;

    gsap.to(camera.position, {
        x: cameraPositions[position][0],
        y: cameraPositions[position][1],
        z: cameraPositions[position][2],
        duration: 1,
        ease: "power2.inOut",
        onComplete: () => currentCamera.value = position
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
            targetExpression?.leftEye?.[0] || null,        //  x
            targetExpression?.leftEye?.[1] || null,        //  y
            targetExpression?.leftEye?.[2] || null        //  z
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

let animationMixer;
let previousAnimationClip;
let animationQueue = [];

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

                let idleAnimation = Idle;
                const random = Math.floor(Math.random() * 5) + 1;

                switch(random) {
                    case 1: idleAnimation = Bored; break;
                    case 2: idleAnimation = HappyIdle; break;
                    case 3: idleAnimation = LookAround3; break;
                    case 4: idleAnimation = WeightShift; break;
                }

                applyAnimation(idleAnimation);
            }
        });        
    }

    const clip = loadMixamoAnimation(animation, currentVrm);

    if (previousAnimationClip)
        animationMixer.existingAction(previousAnimationClip).fadeOut(0.5);

    previousAnimationClip = clip;

    const action = animationMixer.clipAction(clip);
    action.clampWhenFinished = true; // Keeps the last frame when animation ends

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
    camera.position.set(...cameraPositions.full);

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

        // URL of the VRM you want to load
        TestGirl,

        // called when the resource is loaded
        gltf => {
            const vrm = gltf.userData.vrm;
            corollaChan = gltf.scene || gltf.scenes[0];

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
            //console.log(`Loading model: ${100.0 * ( progress.loaded / progress.total )}%`)
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

                const faceCamera = ['face'].includes(currentCamera.value);

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

        //  Animation loop
        if (currentVrm) {
            currentVrm.update(clock.getDelta());

            const rootBone = currentVrm.humanoid?.getNormalizedBoneNode('hips') || currentVrm.scene.children.find((child) => child.isBone);
            rootBone.position.x = 0;
            rootBone.position.y = 1;
            rootBone.position.z = 0;
        }


        // Update the animation mixer
        if (animationMixer)
            animationMixer.update(clock.getDelta());


        renderer.render(scene, camera);        
    }

    animate();
    applyAnimation(Clap);
});

onMounted(() => {
    if (vr.value)
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

//  Debug! Remove!
const debug = ref(null);
const changeExpression = (key: string, value: number) => {
    currentVrm.expressionManager.setValue(key, value);
}

const speakTest = () => {

    if (language.value === 'de-DE')
        switch(Math.floor(Math.random() * 10)) {
            case 0: speak('Ich habe nichts zu sagen.'); break;
            case 1: speak('Servus! Ich bin Corolla-chan, eine Virtuell-Loli!'); break;
            case 2: speak('Die Herren in Berlin scheinen nur noch damit beschäftigt zu sein, sich neue Schimpfwörter für Churchill auszudenken. Wie ist das neueste? Trunkenbold, Saufbold, Paralytiker.'); break;
            case 3: speak('Torpedos, das Stück für 20.000 Mark und was wir brauchen ist für 50 Pfennig alter Draht!'); break;
            case 4: speak('Wir haben einen Gast an Bord. Leutnant Werner, Marinekriegsberichtserstatter. Will sich bei uns ein bisschen umsehen. Er will anständige deutsche Helden sehen.'); break;
            case 5: speak('Seit Monaten leiden wir alle unter der Qual eines Problems, das uns auch der Versailler Vertrag, d.h. das Versailler Diktat, einst beschert hat, eines Problems, das in seiner Ausartung und Entartung für uns unerträglich geworden war. Danzig war und ist eine deutsche Stadt! Der Korridor war und ist deutsch!'); break;
            case 6: speak('Vor 40 Jahren wurde der erste sozialistische Staat auf deutschem Boden, die Deutsche Demokratische Republik, gegründet. Jeder, der das Glück hatte, an diesem historisch bedeutsamen Ereignis beteiligt zu sein, denkt nicht ohne Bewegung an die Tage zurück, in denen die Arbeiter und Bauern im Bunde mit der Intelligenz und allen Werktätigen im wahrsten Sinne des Wortes ihre Macht errichteten.'); break;
            case 7: speak('Victor jagt zwölf Boxkämpfer quer über den großen Sylter Deich.'); break;
            case 8: speak('Der Open vor dem Haus gehört Jens.'); break;
            case 9: speak('Lass mich deine Träne reiten übers Kinn nach Afrika, wieder in dem Schoss der Löwin wo ich eins zu Hause war.'); break;
            case 10: speak('Einmal ein Jahr kommt Nikolaus, dreimal ein Tag kommt Holocaust.'); break;
            default: speak('Ich liebe meine Schweinehund!');
        }     

    if (language.value === 'hu-HU')
        switch(Math.floor(Math.random() * 10)) {
            case 0: speak('Sose mondd azt, hogy vau!'); break;
            case 1: speak('Dorottya gyakran játszik ügyes hörcsöggel, miközben ötvözött fém zsákban cserél nyúlpárat a tyúkkal.'); break;
            case 2: speak('Gábor sietősen összeszedi a széttűzött dzsesszdobot.'); break;
            case 3: speak('A zsidó gennyesre keresi magát éppen evvel, hajjaj de mennyire!'); break;
            case 4: speak('Az éhhaláltól kinyiffansz, olyat ne csinálj hellyel-közzel se!'); break;
            case 5: speak('Eddz sokat te is, hogy többet keccsölhess a ruggyantagyárban, és ne aggódj, lesz majd haddzs Mekkában.'); break;
            case 6: speak('A zsugori kákabélű régiségkereskedő pörgekalapban ténfereg a csatakos, csikorgó macskakövön, miközben zsindelytetőt javító kulimászos brigádot mustrál.'); break;
            case 7: speak('Gorcsev Iván, a Rangoon teherhajó matróza még huszonegy éves sem volt, midőn elnyerte a fizikai Nobel-díjat. Ilyen nagyjelentőségű tudományos jutalmat e poétikusan ifjú korban megszerezni példátlanul nagyszerű teljesítmény, még akkor is, ha egyesek előtt talán szépséghibának tűnik majd, hogy Gorcsev Iván a fizikai Nobel-díjat a makao nevű kártyajátékon nyerte el.'); break;
            case 8: speak('Tehát Mihály minden percben befutott a kajütbe, megnézni, hogy Timéa hogy van. Annak láza volt, önkívületben volt. Timárt ez nem ejté kétségbe; azt tartá, hogy aki a Dunán jár, az egész patikát magával hordja, mert a hideg víz mindent meggyógyít. Egyszerű tudománya abból állt, hogy hideg vizes kendőket rakott a leány homlokára s lábszáraira, szorgalmatosan felváltva azokat, mikor átmelegedtek. Már Priessnitz előtt tudták azt a hajósok.'); break;
            case 9: speak('A BMP–1 a Szovjetunióban az 1960-as évek első felében, a Cseljabinszki Traktorgyárban (CSTZ) Pavel Iszakov főkonstruktőr vezetésével kifejlesztett úszóképes gyalogsági harcjármű.'); break;
            case 10: speak('A prostitúció általánosan a személyi szabadság kiszolgáltatása fizetségért vagy befolyásért. Prostitúciónak nevezik a fizetség ellenében nyújtott szexuális szolgáltatást is. A Btk. 2007-es 202/A. §-a büntetni rendel minden olyan személyt, aki tizennyolcadik életévét be nem töltött személlyel ellenszolgáltatás fejében szexuális kapcsolatot létesít; az ez irányú törvénymódosítás 2007. június 1-i hatályba lépése után a klienseket három évig terjedő szabadságvesztéssel fenyegeti.'); break;
            default: speak('Anyádat, hülye buzi!');
        }    

    if (language.value === 'en-US')
        switch(Math.floor(Math.random() * 10)) {
            case 0: speak('The quick brown fox jumped over the lazy dog.'); break;
            case 1: speak('Hooray, hooray, it\'s the first of May, outdoor fucking starts today!'); break;
            case 2: speak('In matters like this, I really have nothing to say. I\'m just a dumb AI. Even though I am cute.'); break;
            case 3: speak('Antidisestablishmentarianism is a counterrevolutionary ideology that challenges the supercalifragilisticexpialidocious sentiments of floccinaucinihilipilification, rendering it pseudopseudohypoparathyroidism-esque in complexity.'); break;
            case 4: speak('Ain\'t it fun down here in Texas, baby? It sure is! Cheerio!'); break;
            case 5: speak('Jackdaws love my big shiny sphinx of quartz.'); break;
            case 6: speak('This is a sentence. This is another sentence. Would you like another sentence? Then I sentence you to death. Face the wall, bend over. Yes, this will be a kinky sort of death. No, you will not enjoy it.'); break;
            case 7: speak('Handy-spandy, Jack-a-dandy. Loves plum cake and sugar candy. He bought some at the grocer\'s shop. Then out he came, hop-hop-hop.'); break;
            case 8: speak('The year is 2025. A liter of gas costs 1.67 euros. 3 years ago it was cheaper.'); break;
            case 9: speak('Right. I will talk to you all day and night. Is that what you want? Yeah, I thought so.'); break;
            case 10: speak('The syzygy of the quokka\'s gamboling elicited a pangrammatic sesquipedalian effervescence in the persnickety bibliophile.'); break;
            default: speak('There is nothing to say.');
        }
}

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
                    const viseme: Lipsync = lipsync[language.value]
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
        lang: language.value,
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

const showExpression = (faceOnly: boolean) => {
    const x = getEmotions();

    if (faceOnly)
        console.log(JSON.stringify({
            aa: x.aa,
            ee: x.ee,
            ih: x.ih,
            ou: x.ou,
            oh: x.oh
        }, null, 2))
    else {
        delete x.aa;
        delete x.ih;
        delete x.ee;
        delete x.ou;
        delete x.oh;
        console.log(JSON.stringify(x, null, 2));
    }
}

</script>

<template>

    <!-- UI components -->
    <div id="ui" ref="ui">
        <div>
            <input 
                v-for="position in Object.keys(cameraPositions)"
                type="button"
                :value="position" 
                @click="() => moveCamera(position)" />

            <input type="button" value="Talk" @click="speakTest" />
            <input type="button" value="Bow" @click="() => applyAnimation(Bow)" />
            <input type="button" value="Clap" @click="() => applyAnimation(Clap)" />
            <input type="button" value="Macarena" @click="() => applyAnimation(Macarena)" />

            <select @change="e => applyFace(e.target?.value)">
                <option v-for="face in Object.keys(faces)">
                    {{ face }}
                </option>
            </select>
        </div>

        <!-- Facial expression designer -->
        <div v-if="false" style="padding: 0.5em; color: yellow; max-height: 100vh; overflow-y: auto;">
            <input type="button" value="Export face" @click="() => showExpression(true)" />
            <input type="button" value="Export" @click="() => showExpression(false)" />
            <div v-for="key in ['angry', 'relaxed', 'happy', 'sad', 'surprised', 'blink', 'blinkRight', 'blinkLeft']">
                {{ key }}<br />
                <input 
                    type="range" 
                    min="0" 
                    max="1"
                    value="0" 
                    step="0.05"
                    @input="e => changeExpression(key, e?.target?.value || 0)" 
                    @change="e => changeExpression(key, e?.target?.value || 0)" 
                />
            </div>
        </div>
    </div>

    <!-- Subtitles -->
    <div v-if="settings.subtitles.on && !!subtitle" class="subtitles">
        <div class="text">{{ subtitle }}</div>
    </div>
    
    <!-- VR canvas -->
    <div id="vr" ref="vr"></div>

    
</template>
