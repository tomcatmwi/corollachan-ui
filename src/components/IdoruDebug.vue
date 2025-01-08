<script lang="ts" setup>
import settings from '@assets/settings.json';
import faces from '@assets/faces/faces.json';
import Animations from '@assets/animations/animations';

import { useIdoruStore } from '@pinia';

const idoruStore = useIdoruStore();

const moveCamera = (position: string) => {
    idoruStore.changeCameraPosition(position);
}

const applyFace = (expression: string, duration: number = 0.5, ease: string = 'power2.inOut') => {
}

const applyAnimation = (animation, loop: number = 1, mixing: boolean = false) => {
}

const getEmotions = () => {
}

const changeExpression = (key: string, value: number) => {
}

const speak = (text: string) => {   
}

const speakTest = () => {

    if (idoruStore.language === 'de-DE')
        switch(Math.floor(Math.random() * 10)) {
            case 0: speak('Ich habe nichts zu sagen.'); break;
            case 1: speak('Servus! Ich bin Corolla-chan, eine Virtuell-Loli!'); break;
            case 2: speak('Die Herren in Berlin scheinen nur noch damit beschäftigt zu sein, sich neue Schimpfwörter für Churchill auszudenken. Wie ist das neueste? Trunkenbold, Saufbold, Paralytiker.'); break;
            case 3: speak('Torpedos, das Stück für 20.000 Mark und was wir brauchen ist für 50 Pfennig alter Draht!'); break;
            case 4: speak('Wir haben einen Gast an Bord. Leutnant Werner, Marinekriegsberichtserstatter. Will sich bei uns ein bisschen umsehen. Er will anständige deutsche Helden sehen.'); break;
            case 5: speak('Seit Monaten leiden wir alle unter der Qual eines Problems, das uns auch der Versailler Vertrag, d.h. das Versailler Diktat, einst beschert hat, eines Problems, das in seiner Ausartung und Entartung für uns unerträglich geworden war. Danzig war und ist eine deutsche Stadt! Der Korridor war und ist deutsch!'); break;
            case 6: speak('Vor 40 Jahren wurde der erste sozialistische Staat auf deutschem Boden, die Deutsche Demokratische Republik, gegründet. Jeder, der das Glück hatte, an diesem historisch bedeutsamen Ereignis beteiligt zu sein, denkt nicht ohne Bewegung an die Tage zurück, in denen die Arbeiter und Bauern im Bunde mit der Intelligenz und allen Werktätigen im wahrsten Sinne des Wortes ihre Macht errichteten.'); break;
            case 7: speak('Victor jagt zwölf Boxkämpfer quer über den großen Sylter Deich.'); break;
            case 8: speak('Der Opel vor dem Haus gehört Jens.'); break;
            case 9: speak('Lass mich deine Träne reiten übers Kinn nach Afrika, wieder in dem Schoss der Löwin wo ich eins zu Hause war.'); break;
            case 10: speak('Einmal ein Jahr kommt Nikolaus, dreimal ein Tag kommt Holocaust.'); break;
            default: speak('Ich liebe meine Schweinehund!');
        }     

    if (idoruStore.language === 'hu-HU')
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

    if (idoruStore.language === 'en-US')
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
<div class="idoru-debug">

    <div>
        <input 
            v-for="position in Object.keys(settings.cameraPositions)"
            type="button"
            :value="position" 
            @click="() => moveCamera(position)" />

        <input type="button" value="Talk" @click="speakTest" />
    </div>

    <div>
        <select @change="e => applyFace((e.target as any)?.value)">
            <option v-for="face in Object.keys(faces)">
                {{ face }}
            </option>
        </select>

        <select @change="e => applyAnimation((e.target as any)?.value)">
            <option v-for="animation in Object.keys(Animations)">
                {{ animation }}
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
                @input="e => changeExpression(key, (e?.target as any)?.value || 0)" 
                @change="e => changeExpression(key, (e?.target as any)?.value || 0)" 
            />
        </div>
    </div>

</div>

</template>

